import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

interface Campaign {
  id: string;
  target_type: string;
  reform_title: string | null;
  description: string;
  support_count: number;
  status: string;
  mechanism_type: string;
  is_binding: boolean;
  politician_name: string | null;
  politician_id: string | null;
}

interface Pathway {
  id: string;
  mechanism_type: string;
  is_binding: boolean;
  legal_citation: string;
  office_title: string | null;
}

interface Politician {
  id: string;
  full_name: string;
  party: string | null;
  office_title: string;
  jurisdiction_name: string;
}

interface SimilarCampaign {
  id: string;
  label: string;
  description: string;
  supportCount: number;
}

export default function AccountabilityScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const MECH_LABEL: Record<string, string> = {
    charter_amendment_petition: d.mech_charter,
    recall_petition: d.mech_recall,
    next_election_defeat: d.mech_defeat,
    no_removal_mechanism_exists: d.mech_none,
  };
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [pathways, setPathways] = useState<Pathway[] | null>(null);
  const [politicians, setPoliticians] = useState<Politician[] | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pathwayId, setPathwayId] = useState<string | null>(null);
  const [politicianId, setPoliticianId] = useState<string | null>(null);
  const [politicianDescription, setPoliticianDescription] = useState('');
  const [politicianCitation, setPoliticianCitation] = useState('');
  const [reformTitle, setReformTitle] = useState('');
  const [reformDescription, setReformDescription] = useState('');
  const [reformCitation, setReformCitation] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const [res, who] = await Promise.all([
            get<{ campaigns: Campaign[]; pathways: Pathway[]; politicians: Politician[] }>('/api/accountability'),
            get<{ tier: string }>('/api/whoami'),
          ]);
          if (cancelled) return;
          setCampaigns(res.campaigns);
          setPathways(res.pathways);
          setPoliticians(res.politicians);
          setTier(who.tier);
        } catch (e) {
          console.error('Accountability load failed:', e);
          if (!cancelled) setError(d.accountability_load_error);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [d.accountability_load_error]),
  );

  const officePathways = pathways?.filter((p) => p.mechanism_type !== 'charter_amendment_petition') ?? [];
  const petitionPathway = pathways?.find((p) => p.mechanism_type === 'charter_amendment_petition');
  const verified = tier !== null && tier !== 'unverified';
  // See no_coverage_in_area's own i18n comment: both lists empty means no
  // curated accountability_pathways data exists anywhere in this resident's
  // jurisdiction stack, not that no campaign is possible. pathways === null
  // means still loading -- don't flash this before data arrives.
  const hasCoverage = officePathways.length > 0 || !!petitionPathway;

  // Grouped by jurisdiction, then office (2026-08-23, owner asked directly:
  // "group by the offices across the ecosystem the address belongs to") --
  // the same stack the Ballot screen already groups by (county -> state ->
  // country), not a second scheme. politicians arrives pre-sorted
  // local-to-national (see ownOfficeholders()), so Map insertion order
  // alone keeps that order here.
  const politiciansByJurisdiction = new Map<string, Map<string, Politician[]>>();
  for (const p of politicians ?? []) {
    const byOffice = politiciansByJurisdiction.get(p.jurisdiction_name) ?? new Map<string, Politician[]>();
    const group = byOffice.get(p.office_title) ?? [];
    group.push(p);
    byOffice.set(p.office_title, group);
    politiciansByJurisdiction.set(p.jurisdiction_name, byOffice);
  }

  // Duplicate-campaign suggestions (2026-08-23) -- suggest, never block,
  // same spirit as the debates composer's claim heuristic. Real incident:
  // 3 byte-identical reform campaigns from repeated testing (see
  // db/migrations/089_campaign_similarity.sql). Politician campaigns have
  // no free-text title to debounce -- checked immediately once both
  // pickers are set instead (see accountability.ts's similarCampaigns()
  // on the web side for why that's an exact match, not fuzzy).
  const [similarReform, setSimilarReform] = useState<SimilarCampaign[]>([]);
  const [similarPolitician, setSimilarPolitician] = useState<SimilarCampaign[]>([]);

  useEffect(() => {
    if (!petitionPathway || reformTitle.trim().length < 3) {
      setSimilarReform([]);
      return;
    }
    const timer = setTimeout(() => {
      get<{ matches: SimilarCampaign[] }>(
        `/api/accountability/similar?targetType=charter_or_law_change&pathwayId=${petitionPathway.id}&q=${encodeURIComponent(reformTitle)}`,
      )
        .then((res) => setSimilarReform(res.matches ?? []))
        .catch(() => setSimilarReform([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [reformTitle, petitionPathway]);

  useEffect(() => {
    if (!pathwayId || !politicianId) {
      setSimilarPolitician([]);
      return;
    }
    get<{ matches: SimilarCampaign[] }>(
      `/api/accountability/similar?targetType=politician&pathwayId=${pathwayId}&politicianId=${politicianId}`,
    )
      .then((res) => setSimilarPolitician(res.matches ?? []))
      .catch(() => setSimilarPolitician([]));
  }, [pathwayId, politicianId]);

  async function submitPoliticianCampaign() {
    if (!pathwayId || !politicianId || politicianDescription.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await post<{ ok: boolean; id?: string }>('/api/accountability', {
        targetType: 'politician',
        pathwayId,
        politicianId,
        description: politicianDescription,
        citationUrl: politicianCitation || undefined,
      });
      if (res.ok && res.id) router.push({ pathname: '/accountability/[id]', params: { id: res.id } });
    } catch (e) {
      console.error('Campaign create failed:', e);
    } finally {
      setBusy(false);
    }
  }

  async function submitReformCampaign() {
    if (!petitionPathway || reformTitle.trim().length === 0 || reformDescription.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await post<{ ok: boolean; id?: string }>('/api/accountability', {
        targetType: 'charter_or_law_change',
        pathwayId: petitionPathway.id,
        reformTitle,
        description: reformDescription,
        citationUrl: reformCitation || undefined,
      });
      if (res.ok && res.id) router.push({ pathname: '/accountability/[id]', params: { id: res.id } });
    } catch (e) {
      console.error('Campaign create failed:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        {d.accountability_title}
      </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.accountability_sub}
        </ThemedText>

        {!campaigns && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {campaigns?.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {d.no_campaigns_yet}
          </ThemedText>
        )}
        {campaigns?.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: '/accountability/[id]', params: { id: c.id } })}
            style={[styles.card, { backgroundColor: colors.backgroundElement }]}
          >
            <ThemedText type="small">{c.target_type === 'politician' ? c.politician_name : c.reform_title}</ThemedText>
            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {MECH_LABEL[c.mechanism_type] ?? c.mechanism_type} · {tf(d.supporters_word, { n: c.support_count })}
              </ThemedText>
              <View style={[styles.chip, { borderColor: c.is_binding ? colors.evidence : colors.textSecondary }]}>
                <ThemedText type="small">{c.is_binding ? d.binding_chip : d.organizing_chip}</ThemedText>
              </View>
            </View>
          </Pressable>
        ))}

        {verified ? (
          <>
            <ThemedText type="smallBold">{d.start_campaign_h}</ThemedText>

            {!hasCoverage && (
              <ThemedText type="small" themeColor="textSecondary">
                {d.no_coverage_in_area}
              </ThemedText>
            )}

            {officePathways.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small">{d.target_politician_h}</ThemedText>
              <View style={styles.pickerRow}>
                {officePathways.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setPathwayId(p.id)}
                    style={[
                      styles.pickerChip,
                      {
                        borderColor: pathwayId === p.id ? colors.evidence : colors.textSecondary,
                        backgroundColor: pathwayId === p.id ? colors.backgroundSelected : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText type="small">
                      {p.office_title ?? ''} — {MECH_LABEL[p.mechanism_type] ?? p.mechanism_type}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.pickerGroups}>
                {[...politiciansByJurisdiction.entries()].map(([jurisdictionName, byOffice]) => (
                  <View key={jurisdictionName} style={styles.pickerJurisdiction}>
                    <ThemedText type="smallBold">{jurisdictionName}</ThemedText>
                    {[...byOffice.entries()].map(([officeTitle, group]) => (
                      <View key={officeTitle} style={styles.pickerGroup}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {officeTitle}
                        </ThemedText>
                        <View style={styles.pickerRow}>
                          {group.map((p) => (
                            <Pressable
                              key={p.id}
                              onPress={() => setPoliticianId(p.id)}
                              style={[
                                styles.pickerChip,
                                {
                                  borderColor: politicianId === p.id ? colors.evidence : colors.textSecondary,
                                  backgroundColor: politicianId === p.id ? colors.backgroundSelected : 'transparent',
                                },
                              ]}
                            >
                              <ThemedText type="small">
                                {p.full_name}
                                {p.party ? ` (${p.party})` : ''}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <TextInput
                value={politicianDescription}
                onChangeText={setPoliticianDescription}
                placeholder={d.why_campaign_placeholder}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
              />
              <TextInput
                value={politicianCitation}
                onChangeText={setPoliticianCitation}
                placeholder={d.source_url_placeholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="url"
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
              />
              {similarPolitician.length > 0 && (
                <View style={[styles.similarBox, { borderColor: colors.textSecondary }]}>
                  <ThemedText type="small" themeColor="textSecondary">{d.similar_h}</ThemedText>
                  {similarPolitician.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push({ pathname: '/accountability/[id]', params: { id: m.id } })}
                      style={styles.rowBetween}
                    >
                      <ThemedText type="small" style={styles.flexOne} numberOfLines={1}>
                        {m.label} · {tf(d.supporters_word, { n: m.supportCount })}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: colors.evidence }}>
                        {d.similar_support_cta}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable
                disabled={busy || !pathwayId || !politicianId || politicianDescription.trim().length === 0}
                onPress={submitPoliticianCampaign}
                style={[styles.submitBtn, { backgroundColor: colors.evidence }]}
              >
                <ThemedText type="smallBold">{d.start_campaign_politician_btn}</ThemedText>
              </Pressable>
            </View>
            )}

            {petitionPathway && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small">{d.target_reform_h}</ThemedText>
                <TextInput
                  value={reformTitle}
                  onChangeText={setReformTitle}
                  placeholder={d.reform_title_placeholder}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                />
                {similarReform.length > 0 && (
                  <View style={[styles.similarBox, { borderColor: colors.textSecondary }]}>
                    <ThemedText type="small" themeColor="textSecondary">{d.similar_h}</ThemedText>
                    {similarReform.map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => router.push({ pathname: '/accountability/[id]', params: { id: m.id } })}
                        style={styles.rowBetween}
                      >
                        <ThemedText type="small" style={styles.flexOne} numberOfLines={1}>
                          {m.label} · {tf(d.supporters_word, { n: m.supportCount })}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: colors.evidence }}>
                          {d.similar_support_cta}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
                <TextInput
                  value={reformDescription}
                  onChangeText={setReformDescription}
                  placeholder={d.why_campaign_placeholder}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                />
                <TextInput
                  value={reformCitation}
                  onChangeText={setReformCitation}
                  placeholder={d.source_url_placeholder}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                />
                <Pressable
                  disabled={busy || reformTitle.trim().length === 0 || reformDescription.trim().length === 0}
                  onPress={submitReformCampaign}
                  style={[styles.submitBtn, { backgroundColor: colors.evidence }]}
                >
                  <ThemedText type="smallBold">{d.start_campaign_reform_btn}</ThemedText>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Pressable onPress={() => router.push('/verify')} style={[styles.submitBtn, { backgroundColor: colors.evidence }]}>
            <ThemedText type="smallBold">{d.verify_to_start_campaign}</ThemedText>
          </Pressable>
        )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
  pickerGroups: { gap: Spacing.three },
  pickerJurisdiction: { gap: Spacing.two },
  pickerGroup: { gap: Spacing.half },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pickerChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  similarBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Spacing.two, padding: Spacing.two, gap: Spacing.half },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  flexOne: { flex: 1 },
});

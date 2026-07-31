import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, useColorScheme, View } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';

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
}

const MECH_LABEL: Record<string, string> = {
  charter_amendment_petition: 'Charter amendment petition',
  recall_petition: 'Recall petition',
  next_election_defeat: 'Defeat at next election',
  no_removal_mechanism_exists: 'No removal mechanism',
};

export default function AccountabilityScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [pathways, setPathways] = useState<Pathway[] | null>(null);
  const [politicians, setPoliticians] = useState<Politician[] | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pathwayId, setPathwayId] = useState<string | null>(null);
  const [politicianId, setPoliticianId] = useState<string | null>(null);
  const [politicianDescription, setPoliticianDescription] = useState('');
  const [reformTitle, setReformTitle] = useState('');
  const [reformDescription, setReformDescription] = useState('');
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
          if (!cancelled) setError('Could not load accountability campaigns. Pull down to try again.');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const officePathways = pathways?.filter((p) => p.mechanism_type !== 'charter_amendment_petition') ?? [];
  const petitionPathway = pathways?.find((p) => p.mechanism_type === 'charter_amendment_petition');
  const verified = tier !== null && tier !== 'unverified';

  async function submitPoliticianCampaign() {
    if (!pathwayId || !politicianId || politicianDescription.trim().length === 0) return;
    setBusy(true);
    try {
      const res = await post<{ ok: boolean; id?: string }>('/api/accountability', {
        targetType: 'politician',
        pathwayId,
        politicianId,
        description: politicianDescription,
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
        Accountability
      </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Organize around real mechanisms — not signature petitions. In-app support has no legal effect.
        </ThemedText>

        {!campaigns && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {campaigns?.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No campaigns yet.
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
                {MECH_LABEL[c.mechanism_type] ?? c.mechanism_type} · {c.support_count} supporters
              </ThemedText>
              <View style={[styles.chip, { borderColor: c.is_binding ? colors.evidence : colors.textSecondary }]}>
                <ThemedText type="small">{c.is_binding ? 'Binding' : 'Organizing'}</ThemedText>
              </View>
            </View>
          </Pressable>
        ))}

        {verified ? (
          <>
            <ThemedText type="smallBold">Start a campaign</ThemedText>

            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="small">Target a politician</ThemedText>
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
              <View style={styles.pickerRow}>
                {politicians?.map((p) => (
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
              <TextInput
                value={politicianDescription}
                onChangeText={setPoliticianDescription}
                placeholder="Why this campaign?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
              />
              <Pressable
                disabled={busy || !pathwayId || !politicianId || politicianDescription.trim().length === 0}
                onPress={submitPoliticianCampaign}
                style={[styles.submitBtn, { backgroundColor: colors.evidence }]}
              >
                <ThemedText type="smallBold">Start campaign</ThemedText>
              </Pressable>
            </View>

            {petitionPathway && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small">Target a charter or law change</ThemedText>
                <TextInput
                  value={reformTitle}
                  onChangeText={setReformTitle}
                  placeholder="Reform title"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                />
                <TextInput
                  value={reformDescription}
                  onChangeText={setReformDescription}
                  placeholder="Why this campaign?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                />
                <Pressable
                  disabled={busy || reformTitle.trim().length === 0 || reformDescription.trim().length === 0}
                  onPress={submitReformCampaign}
                  style={[styles.submitBtn, { backgroundColor: colors.evidence }]}
                >
                  <ThemedText type="smallBold">Start campaign</ThemedText>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Pressable onPress={() => router.push('/verify')} style={[styles.submitBtn, { backgroundColor: colors.evidence }]}>
            <ThemedText type="smallBold">Verify to start a campaign</ThemedText>
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
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pickerChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

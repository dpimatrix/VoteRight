import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { canonicalAccountabilitySupportPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { ensureSession, get, hasSession, post } from '@/services/api';

interface CampaignDetail {
  id: string;
  target_type: string;
  reform_title: string | null;
  description: string;
  disclosure_text: string;
  support_count: number;
  status: string;
  external_petition_status: string;
  date: string;
  mechanism_type: string;
  is_binding: boolean;
  legal_citation: string;
  signature_requirement_note: string | null;
  pathway_description: string;
  politician_name: string | null;
  politician_id: string | null;
  supported: boolean;
}

const MECH_LABEL: Record<string, string> = {
  charter_amendment_petition: 'Charter amendment petition',
  recall_petition: 'Recall petition',
  next_election_defeat: 'Defeat at next election',
  no_removal_mechanism_exists: 'No removal mechanism',
};

const EXT_STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  gathering_signatures: 'Gathering signatures',
  submitted: 'Submitted',
  certified: 'Certified',
  not_applicable: 'Not applicable',
};

export default function CampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const [res, who] = await Promise.all([
        get<CampaignDetail>(`/api/accountability/${id}`),
        get<{ tier: string }>('/api/whoami'),
      ]);
      setC(res);
      setTier(who.tier);
    } catch (e) {
      console.error('Campaign load failed:', e);
      setError('Could not load this campaign. Pull down to try again.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) await load();
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  async function support() {
    if (!c) return;
    setBusy(true);
    try {
      let signature: { signature: string; publicKeyFingerprint: string } | undefined;
      try {
        await ensureSigningKey();
        const userId = await currentUserIdForSigning();
        signature = await signPayload(canonicalAccountabilitySupportPayload({ userId, campaignId: c.id }));
      } catch (e) {
        console.error('Signing failed, supporting unsigned:', e);
      }
      await post(`/api/accountability/${c.id}/support`, {
        signature: signature?.signature,
        publicKeyFingerprint: signature?.publicKeyFingerprint,
      });
      await load();
    } catch (e) {
      console.error('Support failed:', e);
    } finally {
      setBusy(false);
    }
  }

  const verified = tier !== null && tier !== 'unverified';

  if (!c && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !c) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ThemedText type="small" style={styles.centerPad}>
          {error}
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{c.target_type === 'politician' ? c.politician_name : c.reform_title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {MECH_LABEL[c.mechanism_type] ?? c.mechanism_type}
        </ThemedText>

        <View style={[styles.disclosure, { borderColor: colors.textSecondary }]}>
          <ThemedText type="small">{c.disclosure_text}</ThemedText>
        </View>

        <ThemedText type="small">{c.description}</ThemedText>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.rowBetween}>
            <View style={[styles.chip, { borderColor: c.is_binding ? colors.evidence : colors.textSecondary }]}>
              <ThemedText type="small">{c.is_binding ? 'Binding' : 'Organizing'}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              ▣ {c.legal_citation}
            </ThemedText>
          </View>
          <ThemedText type="small">{c.pathway_description}</ThemedText>
          {c.signature_requirement_note && (
            <ThemedText type="small" themeColor="textSecondary">
              Signature requirement: {c.signature_requirement_note}
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {c.support_count} supporters · {c.date}
          </ThemedText>
          {c.mechanism_type === 'charter_amendment_petition' && (
            <ThemedText type="small" themeColor="textSecondary">
              Petition status: {EXT_STATUS_LABEL[c.external_petition_status] ?? c.external_petition_status}
            </ThemedText>
          )}
          {c.supported ? (
            <ThemedText type="small">You've supported this campaign.</ThemedText>
          ) : verified && c.status === 'gathering_support' ? (
            <Pressable disabled={busy} onPress={support} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
              <ThemedText type="smallBold">Support this campaign</ThemedText>
            </Pressable>
          ) : !verified ? (
            <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
              <ThemedText type="smallBold">Verify to support</ThemedText>
            </Pressable>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Public and attributed — not a legal petition signature.
          </ThemedText>
        </View>

        {c.politician_id && (
          <Pressable onPress={() => router.push({ pathname: '/candidates/[id]', params: { id: c.politician_id! } })}>
            <ThemedText type="linkPrimary">→ {c.politician_name}</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  spinner: { marginTop: Spacing.five },
  centerPad: { padding: Spacing.four },
  disclosure: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
  actionBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

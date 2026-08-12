import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';

interface Commitment {
  id: string;
  stance: string;
  statement: string | null;
  date: string;
  politician_id: string;
  full_name: string;
  party: string | null;
  cycle: string;
  publisher: string | null;
  cit_title: string | null;
  became_promise: boolean;
}

interface Tally {
  counts: { choice: string; n: number }[];
  total: number;
}

interface MandateDetail {
  id: string;
  mandate_summary: string;
  turnout_count: number;
  margin_pct: number;
  turnout_pct: number | null;
  threshold_pct: number;
  overlay_status: string;
  office: string | null;
  referendum_id: string;
  question_text: string;
  commitments: Commitment[];
  results: Tally;
}

export default function MandateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const OPT_LABEL: Record<string, string> = { yes: d.opt_yes, no: d.opt_no };
  const STANCE: Record<string, { label: string; icon: string }> = {
    commit: { label: d.stance_committed, icon: '✓' },
    decline: { label: d.stance_declined, icon: '✗' },
    no_response: { label: d.stance_no_response, icon: '—' },
  };
  const [m, setM] = useState<MandateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<MandateDetail>(`/api/mandates/${id}`);
          if (!cancelled) setM(res);
        } catch (e) {
          console.error('Mandate load failed:', e);
          if (!cancelled) setError(d.mandate_load_error);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, d.mandate_load_error]),
  );

  if (!m && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !m) {
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
        <ThemedText type="subtitle">{m.mandate_summary}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {m.office ?? ''} · {m.question_text}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">{d.results_h}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {m.turnout_count.toLocaleString()}
            {m.turnout_pct !== null ? ` (${m.turnout_pct}%)` : ''} · +{m.margin_pct}%
          </ThemedText>
          {m.results.total > 0 &&
            m.results.counts.map((c) => (
              <View key={c.choice} style={styles.resultRow}>
                <ThemedText type="small">
                  {OPT_LABEL[c.choice] ?? c.choice} · {c.n.toLocaleString()} ({Math.round((c.n / m.results.total) * 1000) / 10}%)
                </ThemedText>
                <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[styles.barFill, { backgroundColor: colors.evidence, width: `${(c.n / m.results.total) * 100}%` }]}
                  />
                </View>
              </View>
            ))}
          <Pressable onPress={() => router.push({ pathname: '/referenda/[id]', params: { id: m.referendum_id } })}>
            <ThemedText type="linkPrimary">{d.see_referendum_link}</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="smallBold">{d.candidate_commitments_h}</ThemedText>
        {m.commitments.map((c) => {
          const s = STANCE[c.stance] ?? STANCE.no_response;
          return (
            <View key={c.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.rowBetween}>
                <Pressable
                  style={styles.flexOne}
                  onPress={() => router.push({ pathname: '/candidates/[id]', params: { id: c.politician_id } })}
                >
                  <ThemedText type="small">
                    {c.full_name} {c.party ? `(${c.party})` : ''}
                  </ThemedText>
                </Pressable>
                <View style={[styles.chip, { borderColor: colors.evidence }]}>
                  <ThemedText type="small" style={{ color: colors.evidence }}>
                    {s.icon} {s.label}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {c.cycle}
              </ThemedText>
              {c.statement && <ThemedText type="small">“{c.statement}”</ThemedText>}
              {c.publisher && (
                <ThemedText type="small" themeColor="textSecondary">
                  ▣ {c.publisher} · {c.cit_title} · {c.date}
                </ThemedText>
              )}
              {c.became_promise && (
                <ThemedText type="small" themeColor="textSecondary">
                  {d.became_promise_note}
                </ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  spinner: { marginTop: Spacing.five },
  centerPad: { padding: Spacing.four },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  resultRow: { gap: Spacing.one },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  flexOne: { flex: 1 },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
});

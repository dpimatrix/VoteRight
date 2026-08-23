import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PolAvatar } from '@/components/pol-avatar';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';
import { bandChipStyle } from '@/lib/score-colors';

interface PriorityWithAxis {
  axisId: string;
  direction: 1 | -1;
  weight: 1 | 2 | 3 | 4 | 5;
  statement: string;
  question: string;
  negativePole: string;
  positivePole: string;
}

interface EvidenceItem {
  statement: string;
  sourceType: string;
  publisher: string | null;
  title: string | null;
  date: string | null;
  archived: boolean;
}

interface CandidateScore {
  overall: 'strong' | 'good' | 'mixed' | 'weak' | 'insufficient';
  answered: number;
  total: number;
  dealbreaker: boolean;
  perAxis: Record<string, { agreement: number | null; conflict: boolean }>;
  algorithmVersion: string;
}

interface MatchResult {
  politicianId: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  score: CandidateScore;
  evidence: Record<string, EvidenceItem[]>;
}

interface MatchesResponse {
  priorities: PriorityWithAxis[];
  results: MatchResult[];
}

/** Compare two candidates from the Matches screen side by side, one row per
    priority (2026-08-23). Re-fetches /api/matches rather than taking the
    already-loaded data as navigation params -- expo-router params are
    strings, and re-fetching is simpler and more robust to a cold start
    (e.g. a deep link) than trying to serialize the whole response through
    the URL. */
export default function CompareScreen() {
  const { race, a: aId, b: bId } = useLocalSearchParams<{ race: string; a: string; b: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const OVERALL_LABEL: Record<CandidateScore['overall'], string> = {
    strong: d.band_strong,
    good: d.band_good,
    mixed: d.band_mixed,
    weak: d.band_weak,
    insufficient: d.band_insufficient,
  };
  const AGREEMENT_LABEL: Record<string, string> = {
    '2': d.agree_strongly,
    '1': d.agree_yes,
    '0': d.agree_neutral,
    '-1': d.agree_no,
    '-2': d.agree_strongly_no,
  };
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ axisId: string; side: 'a' | 'b' } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<MatchesResponse>(`/api/matches?race=${race}`);
          if (!cancelled) setData(res);
        } catch (e) {
          console.error('Compare load failed:', e);
          if (!cancelled) setError(d.compare_not_found);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [race, d.compare_not_found]),
  );

  const a = data?.results.find((r) => r.politicianId === aId);
  const b = data?.results.find((r) => r.politicianId === bId);

  if (!data && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !a || !b) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ThemedText type="small" style={styles.centerPad}>
          {error ?? d.compare_not_found}
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headRow}>
          {[a, b].map((r) => (
            <View key={r.politicianId} style={[styles.headCand, { backgroundColor: colors.backgroundElement }]}>
              <PolAvatar name={r.fullName} photoUrl={r.photoUrl} size={48} />
              <ThemedText type="smallBold" style={styles.centerText} numberOfLines={2}>
                {r.fullName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                ({r.party ?? d.nonpartisan})
              </ThemedText>
              <View style={[styles.chip, { borderColor: colors.evidence }]}>
                <ThemedText type="small" style={{ color: colors.evidence }}>
                  {OVERALL_LABEL[r.score.overall]}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {data!.priorities.map((p) => {
          const scoreA = a.score.perAxis[p.axisId]?.agreement ?? null;
          const scoreB = b.score.perAxis[p.axisId]?.agreement ?? null;
          const openSide = open?.axisId === p.axisId ? open.side : null;
          const openMatch = openSide === 'a' ? a : openSide === 'b' ? b : null;
          const chipStyleA = bandChipStyle(scoreA, colors);
          const chipStyleB = bandChipStyle(scoreB, colors);
          return (
            <View key={p.axisId} style={[styles.compareRow, { borderColor: colors.textSecondary }]}>
              <ThemedText type="smallBold">{p.question}</ThemedText>
              <View style={styles.compareCells}>
                <Pressable
                  onPress={() => setOpen(openSide === 'a' ? null : { axisId: p.axisId, side: 'a' })}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openSide === 'a' }}
                  style={[
                    styles.bandChip,
                    { backgroundColor: chipStyleA.backgroundColor, borderColor: chipStyleA.borderColor, borderStyle: chipStyleA.dashed ? 'dashed' : 'solid' },
                  ]}
                >
                  <ThemedText type="small" style={{ color: chipStyleA.textColor }}>
                    {AGREEMENT_LABEL[String(scoreA)] ?? d.no_position}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setOpen(openSide === 'b' ? null : { axisId: p.axisId, side: 'b' })}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openSide === 'b' }}
                  style={[
                    styles.bandChip,
                    { backgroundColor: chipStyleB.backgroundColor, borderColor: chipStyleB.borderColor, borderStyle: chipStyleB.dashed ? 'dashed' : 'solid' },
                  ]}
                >
                  <ThemedText type="small" style={{ color: chipStyleB.textColor }}>
                    {AGREEMENT_LABEL[String(scoreB)] ?? d.no_position}
                  </ThemedText>
                </Pressable>
              </View>
              {openMatch && (
                <View style={[styles.axisPanel, { borderColor: colors.textSecondary }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {tf(d.you_said, { statement: p.statement })}
                  </ThemedText>
                  {(openMatch.evidence[p.axisId] ?? []).length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.no_position}
                    </ThemedText>
                  ) : (
                    (openMatch.evidence[p.axisId] ?? []).map((e, i) => (
                      <View key={i} style={styles.evidenceRow}>
                        <ThemedText type="small">{e.statement}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {e.sourceType} · {e.title ?? e.publisher} · {e.date}
                          {e.archived ? d.archived_suffix : ''}
                        </ThemedText>
                      </View>
                    ))
                  )}
                  {openMatch.score.perAxis[p.axisId]?.conflict && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {d.conflict_note}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <ThemedText type="small" themeColor="textSecondary">
          {d.method} {a.score.algorithmVersion}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  spinner: { marginTop: Spacing.five },
  centerPad: { padding: Spacing.four, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  headRow: { flexDirection: 'row', gap: Spacing.two },
  headCand: { flex: 1, alignItems: 'center', gap: Spacing.half, borderRadius: Spacing.two, padding: Spacing.three },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
  compareRow: { gap: Spacing.two, borderTopWidth: 1, paddingTop: Spacing.three },
  compareCells: { flexDirection: 'row', gap: Spacing.two },
  bandChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: Spacing.two, paddingVertical: Spacing.two },
  axisPanel: { gap: Spacing.half, borderTopWidth: 1, paddingTop: Spacing.two },
  evidenceRow: { gap: Spacing.half },
});

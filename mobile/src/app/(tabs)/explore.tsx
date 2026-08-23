import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PolAvatar } from '@/components/pol-avatar';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, type ThemeColor } from '@/constants/theme';
import { ApiError, ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

interface Race {
  id: string;
  title: string;
}

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
  coverage: number;
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

// Per-axis agreement -> dot fill/border. Mirrors app/src/app/globals.css's
// .dots i.d2/.d1/.d0/.dm1/.dm2/.dnull so the two platforms read the same way.
function dotColors(a: number | null, colors: Record<ThemeColor, string>) {
  if (a === null) return { backgroundColor: 'transparent', borderColor: colors.textSecondary };
  if (a >= 2) return { backgroundColor: colors.evidence, borderColor: colors.evidence };
  if (a === 1) return { backgroundColor: colors.agreeSoft, borderColor: colors.evidence };
  if (a === 0) return { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected };
  if (a === -1) return { backgroundColor: colors.differSoft, borderColor: colors.differ };
  return { backgroundColor: colors.differ, borderColor: colors.differ };
}

export default function MatchesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const BAND_LABEL: Record<CandidateScore['overall'], string> = {
    strong: d.band_strong,
    good: d.band_good,
    mixed: d.band_mixed,
    weak: d.band_weak,
    insufficient: d.band_insufficient,
  };
  // Same five labels the candidate profile screen already uses for its full
  // per-topic breakdown (see app/candidates/[id].tsx) -- reused rather than
  // re-worded so a dot means the same thing whichever screen you saw it on.
  const AGREEMENT_LABEL: Record<string, string> = {
    '2': d.agree_strongly,
    '1': d.agree_yes,
    '0': d.agree_neutral,
    '-1': d.agree_no,
    '-2': d.agree_strongly_no,
  };
  const [races, setRaces] = useState<Race[] | null>(null);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ politicianId: string; axisId: string } | null>(null);

  const loadRaces = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const res = await get<{ races: Race[] }>('/api/races');
      setRaces(res.races);
      if (res.races[0]) setRaceId(res.races[0].id);
    } catch (e) {
      console.error('Races load failed:', e);
      setError(d.races_load_error);
    }
  }, [d.races_load_error]);

  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  useFocusEffect(
    useCallback(() => {
      if (!raceId) return;
      setMatches(null);
      setError(null);
      setExpanded(null);
      get<MatchesResponse>(`/api/matches?race=${raceId}`)
        .then(setMatches)
        .catch((e) => {
          if (!(e instanceof ApiError && e.status === 409)) {
            console.error('Matches load failed:', e);
          }
          setError(d.need_priorities_error);
        });
    }, [raceId, d.need_priorities_error]),
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {d.matches_title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.matches_sub}
        </ThemedText>

        {!races && !error && <ActivityIndicator style={styles.spinner} />}

        {races && (
          <View style={styles.raceRow}>
            {races.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRaceId(r.id)}
                style={[
                  styles.raceChip,
                  {
                    borderColor: r.id === raceId ? colors.evidence : colors.textSecondary,
                    backgroundColor: r.id === raceId ? colors.backgroundElement : 'transparent',
                  },
                ]}
              >
                <ThemedText type="small">{r.title}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {error && <ThemedText type="small">{error}</ThemedText>}

        {raceId && !matches && !error && <ActivityIndicator style={styles.spinner} />}

        {matches && (
          <View style={styles.grid}>
            {matches.results.map((m) => (
              <Pressable
                key={m.politicianId}
                onPress={() => router.push({ pathname: '/candidates/[id]', params: { id: m.politicianId } })}
                style={[styles.cand, { backgroundColor: colors.backgroundElement }]}
              >
                <PolAvatar name={m.fullName} photoUrl={m.photoUrl} />
                <ThemedText style={styles.candName} numberOfLines={2}>
                  {m.fullName} ({m.party ?? d.nonpartisan})
                </ThemedText>
                <View style={[styles.chip, { borderColor: colors.evidence }]}>
                  <ThemedText type="small" style={{ color: colors.evidence }}>
                    {BAND_LABEL[m.score.overall]}
                  </ThemedText>
                </View>
                {m.score.dealbreaker && (
                  <View style={[styles.chip, styles.dealbreakerChip]}>
                    <ThemedText type="small" style={styles.dealbreakerText}>
                      {d.dealbreaker_chip}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.dotsRow}>
                  {matches.priorities.map((p) => {
                    const a = m.score.perAxis[p.axisId]?.agreement ?? null;
                    const isOpen = expanded?.politicianId === m.politicianId && expanded?.axisId === p.axisId;
                    return (
                      <Pressable
                        key={p.axisId}
                        onPress={() =>
                          setExpanded(isOpen ? null : { politicianId: m.politicianId, axisId: p.axisId })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${p.question} — ${a === null ? d.no_position : AGREEMENT_LABEL[String(a)]}`}
                        accessibilityState={{ expanded: isOpen }}
                        hitSlop={6}
                        style={[styles.dot, dotColors(a, colors), isOpen && { borderColor: colors.text, borderWidth: 2 }]}
                      />
                    );
                  })}
                </View>

                {expanded?.politicianId === m.politicianId &&
                  (() => {
                    const p = matches.priorities.find((pp) => pp.axisId === expanded.axisId);
                    if (!p) return null;
                    const pa = m.score.perAxis[p.axisId];
                    const items = m.evidence[p.axisId] ?? [];
                    return (
                      <View style={[styles.axisPanel, { borderColor: colors.textSecondary }]}>
                        <View style={styles.rowBetween}>
                          <ThemedText type="smallBold" style={styles.flexOne}>
                            {p.question}
                          </ThemedText>
                          {pa?.agreement !== null && pa?.agreement !== undefined && (
                            <View style={[styles.chip, { borderColor: colors.evidence }]}>
                              <ThemedText type="small" style={{ color: colors.evidence }}>
                                {AGREEMENT_LABEL[String(pa.agreement)]}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {tf(d.you_said, { statement: p.statement })}
                        </ThemedText>
                        {items.length === 0 ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {d.no_position}
                          </ThemedText>
                        ) : (
                          items.map((e, i) => (
                            <View key={i} style={styles.evidenceRow}>
                              <ThemedText type="small">{e.statement}</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {e.sourceType} · {e.title ?? e.publisher} · {e.date}
                                {e.archived ? d.archived_suffix : ''}
                              </ThemedText>
                            </View>
                          ))
                        )}
                        {pa?.conflict && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {d.conflict_note}
                          </ThemedText>
                        )}
                      </View>
                    );
                  })()}

                <View style={[styles.covbar, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.covbarFill, { backgroundColor: colors.evidence, width: `${Math.round(m.score.coverage * 100)}%` }]} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.based_on} {m.score.answered}/{m.score.total} {d.of_your}
                </ThemedText>
                {m.score.overall === 'insufficient' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {d.insuff_note}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {matches && matches.results.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {d.method} {matches.results[0]?.score.algorithmVersion}
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  raceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  raceChip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cand: {
    width: '48%',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  candName: {},
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  dealbreakerChip: { borderColor: '#C0392B' },
  dealbreakerText: { color: '#C0392B' },
  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dot: { width: 16, height: 16, borderRadius: 4, borderWidth: 1 },
  axisPanel: { borderTopWidth: 1, paddingTop: Spacing.two, gap: Spacing.half },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flexOne: { flex: 1 },
  evidenceRow: { gap: Spacing.half },
  covbar: { height: 4, borderRadius: 999, overflow: 'hidden' },
  covbarFill: { height: '100%', borderRadius: 999 },
});

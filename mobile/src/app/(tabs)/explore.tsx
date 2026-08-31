import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PolAvatar } from '@/components/pol-avatar';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, type ThemeColor } from '@/constants/theme';
import { ApiError, ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useRetryOnForeground } from '@/hooks/use-retry-on-foreground';
import { t, tf } from '@/lib/i18n';
import { bandChipStyle } from '@/lib/score-colors';

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
  const [selected, setSelected] = useState<string[]>([]);
  const toggleCompare = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)));
  const nameOf = (id: string) => matches?.results.find((r) => r.politicianId === id)?.fullName ?? '';

  // Monotonic generation counter -- guards a loadMatches() call's own async
  // response against a stale, out-of-order resolution (e.g. a manual chip
  // tap superseded moments later by a focus-triggered reload) clobbering a
  // fresher one.
  const loadGeneration = useRef(0);

  // Takes the race id explicitly rather than closing over `raceId` state --
  // see the useFocusEffect below for why: that was the actual root cause of
  // a real double-fetch/wrong-data-flash bug found by independent code
  // review shortly after this file's own district-narrowing fix shipped
  // (2026-08-31).
  const loadMatches = useCallback((id: string) => {
    const gen = ++loadGeneration.current;
    setMatches(null);
    setError(null);
    setExpanded(null);
    setSelected([]);
    get<MatchesResponse>(`/api/matches?race=${id}`)
      .then((res) => {
        if (loadGeneration.current === gen) setMatches(res);
      })
      .catch((e) => {
        // Real bug found live testing (2026-08-23): this used to set
        // need_priorities_error ("set 3 priorities") for EVERY failure, not
        // just the real 409 case -- a canceled fetch (switching race chips
        // or tabs mid-request) or a genuine network error showed the same
        // "go set your priorities" message even though that was never the
        // actual problem. The generation check also means a stale response
        // from a superseded request (raceId changed, screen lost focus, or
        // a newer retry started) can no longer set error state for a
        // request nobody's waiting on anymore.
        if (loadGeneration.current !== gen) return;
        if (e instanceof ApiError && e.status === 409) {
          setError(d.need_priorities_error);
          return;
        }
        console.error('Matches load failed:', e);
        setError(d.matches_load_error);
      });
  }, [d.need_priorities_error, d.matches_load_error]);

  // Re-fetches match scores for whichever race is CURRENTLY selected --
  // what the manual "Try again" button and background/foreground
  // auto-retry both actually want (re-attempt the score fetch, not a fresh
  // /api/races round trip).
  const retryMatches = useCallback(() => {
    if (raceId) loadMatches(raceId);
  }, [raceId, loadMatches]);
  // Gated to the generic load error specifically, not need_priorities_error
  // -- that one means "you haven't set priorities yet," which resuming
  // from the background doesn't change; retrying would just 409 again.
  useRetryOnForeground(error === d.matches_load_error, retryMatches);

  // Real gaps found live testing (2026-08-31), both stemming from the same
  // root cause: loadRaces (the race/office pill list) and loadMatches (the
  // score results for whichever race is selected) used to be two
  // INDEPENDENT focus-triggered effects, with loadMatches's own effect
  // re-firing whenever loadRaces changed `raceId`. That's a real
  // dependency, not a mistake on its own -- but expo-router's useFocusEffect
  // re-invokes its callback on ANY identity change while the screen stays
  // focused, not only on a genuine focus/blur transition (confirmed
  // directly against its own source -- see mobile/AGENTS.md's warning
  // against trusting training data for Expo specifics). That meant a
  // SINGLE tab-focus could fire loadMatches TWICE: once immediately with
  // whatever raceId was left over from before this focus, and again
  // moments later once the races fetch resolved and corrected it --
  // wasting a request every time, and if the first (stale) response landed
  // after the second had already started, briefly flashing the wrong
  // race's results on screen right after a residence narrowed the ballot.
  // Two more gaps in loadRaces itself, also found by that same review: no
  // generation-style guard against two overlapping calls resolving out of
  // order (unlike loadMatches, which always had one), and its own error
  // state was never cleared on a later success, so one transient failure
  // could leave the error banner stuck indefinitely even once everything
  // was working again.
  //
  // Fixed by sequencing instead of racing: this single focus effect awaits
  // the races fetch for the CURRENT list/id, then calls loadMatches with
  // that exact id directly -- loadMatches no longer independently reacts
  // to raceId changing (it takes an explicit parameter now), so it can
  // only ever fire once per focus, with data already confirmed fresh
  // moments earlier. The `cancelled` flag is this effect's own staleness
  // guard, playing the same role loadGeneration plays for loadMatches --
  // a superseded focus event's response can no longer clobber a newer
  // one's state. Deliberately has no `raceId` in its own dependency array
  // (manually tapping a different chip below calls loadMatches directly
  // instead of going through this effect) -- otherwise every manual chip
  // tap would also trigger a full, unnecessary /api/races re-fetch.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<{ races: Race[] }>('/api/races');
          if (cancelled) return;
          setRaces(res.races);
          setError(null);
          // Keep the user's current chip selected across this
          // focus-triggered refresh if it's still a valid race -- only
          // default to the first one when there's no prior selection, or
          // the previously selected race dropped out of a newly-narrowed
          // list. Otherwise every tab-switch-and-back would yank the user
          // back to the first chip even when nothing about their own
          // ballot changed. Read via the functional setState form rather
          // than closing over `raceId` state, so this effect's own
          // identity doesn't depend on it either (same reasoning as above).
          let nextId: string | null = null;
          setRaceId((cur) => {
            nextId = cur && res.races.some((r) => r.id === cur) ? cur : (res.races[0]?.id ?? null);
            return nextId;
          });
          if (nextId) {
            loadMatches(nextId);
          } else {
            // No races on this resident's own ballot right now (a real,
            // reachable state) -- clear any previously-loaded matches/
            // selection/expanded-panel state instead of leaving a stale
            // race's candidate grid rendered with no chip selected to
            // explain it.
            setMatches(null);
            setExpanded(null);
            setSelected([]);
          }
        } catch (e) {
          if (cancelled) return;
          console.error('Races load failed:', e);
          setError(d.races_load_error);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadMatches, d.races_load_error]),
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
                onPress={() => {
                  setRaceId(r.id);
                  loadMatches(r.id);
                }}
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

        {error && (
          <View style={styles.rowWrap}>
            <ThemedText type="small">{error}</ThemedText>
            {error === d.matches_load_error && (
              <Pressable onPress={retryMatches}>
                <ThemedText type="small" style={{ color: colors.evidence }}>
                  {d.try_again}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {raceId && !matches && !error && <ActivityIndicator style={styles.spinner} />}

        {matches && selected.length > 0 && (
          <View style={[styles.compareBar, { backgroundColor: colors.backgroundElement }]}>
            {selected.length === 1 ? (
              <ThemedText type="small" style={styles.flexOne}>
                {tf(d.compare_pick_one_more, { name: nameOf(selected[0]) })}
              </ThemedText>
            ) : (
              <Pressable
                style={styles.flexOne}
                onPress={() =>
                  router.push({ pathname: '/compare', params: { race: raceId ?? '', a: selected[0], b: selected[1] } })
                }
              >
                <ThemedText type="smallBold" style={{ color: colors.evidence }}>
                  {tf(d.compare_cta, { a: nameOf(selected[0]), b: nameOf(selected[1]) })}
                </ThemedText>
              </Pressable>
            )}
            <Pressable onPress={() => setSelected([])}>
              <ThemedText type="small" themeColor="textSecondary">
                {d.compare_clear}
              </ThemedText>
            </Pressable>
          </View>
        )}

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
                <View style={styles.rowWrap}>
                  <View style={[styles.chip, { borderColor: colors.evidence }]}>
                    <ThemedText type="small" style={{ color: colors.evidence }}>
                      {BAND_LABEL[m.score.overall]}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => toggleCompare(m.politicianId)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selected.includes(m.politicianId) }}
                    style={[
                      styles.chip,
                      {
                        borderColor: colors.textSecondary,
                        backgroundColor: selected.includes(m.politicianId) ? colors.backgroundSelected : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText type="small">
                      {selected.includes(m.politicianId) ? d.compare_selected : d.compare_add}
                    </ThemedText>
                  </Pressable>
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
                            <View
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: bandChipStyle(pa.agreement, colors).backgroundColor,
                                  borderColor: bandChipStyle(pa.agreement, colors).borderColor,
                                },
                              ]}
                            >
                              <ThemedText type="small" style={{ color: bandChipStyle(pa.agreement, colors).textColor }}>
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
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  compareBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
});

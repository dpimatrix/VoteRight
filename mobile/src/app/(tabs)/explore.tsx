import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ApiError, ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Race {
  id: string;
  title: string;
}

interface CandidateScore {
  overall: 'strong' | 'good' | 'mixed' | 'weak' | 'insufficient';
  answered: number;
  total: number;
  dealbreaker: boolean;
}

interface MatchResult {
  politicianId: string;
  fullName: string;
  party: string | null;
  score: CandidateScore;
}

interface MatchesResponse {
  priorities: unknown[];
  results: MatchResult[];
}

const BAND_LABEL: Record<CandidateScore['overall'], string> = {
  strong: 'Strong match',
  good: 'Good match',
  mixed: 'Mixed',
  weak: 'Leans opposed',
  insufficient: 'Not enough data',
};

export default function MatchesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [races, setRaces] = useState<Race[] | null>(null);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRaces = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const res = await get<{ races: Race[] }>('/api/races');
      setRaces(res.races);
      if (res.races[0]) setRaceId(res.races[0].id);
    } catch (e) {
      console.error('Races load failed:', e);
      setError('Could not load races. Pull down to try again.');
    }
  }, []);

  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  useFocusEffect(
    useCallback(() => {
      if (!raceId) return;
      setMatches(null);
      setError(null);
      get<MatchesResponse>(`/api/matches?race=${raceId}`)
        .then(setMatches)
        .catch((e) => {
          if (!(e instanceof ApiError && e.status === 409)) {
            console.error('Matches load failed:', e);
          }
          setError('Set at least 3 priorities on the Priorities tab to see matches.');
        });
    }, [raceId]),
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Matches
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
                <ThemedText style={styles.candName} numberOfLines={2}>
                  {m.fullName} {m.party ? `(${m.party})` : ''}
                </ThemedText>
                <View style={[styles.chip, { borderColor: colors.evidence }]}>
                  <ThemedText type="small" style={{ color: colors.evidence }}>
                    {BAND_LABEL[m.score.overall]}
                  </ThemedText>
                </View>
                {m.score.dealbreaker && (
                  <View style={[styles.chip, styles.dealbreakerChip]}>
                    <ThemedText type="small" style={styles.dealbreakerText}>
                      ⚠ Dealbreaker issue
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
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
});

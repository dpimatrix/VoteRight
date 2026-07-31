import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Referendum {
  id: string;
  question_text: string;
  status: string;
  opens: string;
  closes: string;
  proposal_title: string;
  topic: string;
  ballots: number;
  voted: boolean;
  certified: boolean;
}

interface Mandate {
  id: string;
  mandate_summary: string;
  turnout_count: number;
  margin_pct: number;
  turnout_pct: number | null;
  threshold_pct: number;
  overlay_status: string;
  office: string | null;
  question_text: string;
  commits: number;
  declines: number;
  no_responses: number;
}

export default function MandatesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [referenda, setReferenda] = useState<Referendum[] | null>(null);
  const [mandates, setMandates] = useState<Mandate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<{ referenda: Referendum[]; mandates: Mandate[] }>('/api/mandates');
          if (cancelled) return;
          setReferenda(res.referenda);
          setMandates(res.mandates);
        } catch (e) {
          console.error('Mandates load failed:', e);
          if (!cancelled) setError('Could not load mandates. Pull down to try again.');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const open = referenda?.filter((r) => r.status === 'open') ?? [];
  const scheduled = referenda?.filter((r) => r.status === 'scheduled') ?? [];
  const awaiting = referenda?.filter((r) => r.status === 'closed' && !r.certified) ?? [];
  const published = mandates?.filter((m) => m.overlay_status !== 'below_threshold_unpublished') ?? [];
  const below = mandates?.filter((m) => m.overlay_status === 'below_threshold_unpublished') ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Mandates
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Advisory referenda become public voter mandates candidates are asked to answer on the record.
        </ThemedText>

        {!referenda && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {open.length > 0 && (
          <View style={styles.group}>
            <ThemedText type="smallBold">Open referenda</ThemedText>
            {open.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: '/referenda/[id]', params: { id: r.id } })}
                style={[styles.card, { backgroundColor: colors.backgroundElement }]}
              >
                <ThemedText type="small">{r.question_text}</ThemedText>
                <View style={styles.metaRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.topic} · {r.ballots} ballots · closes {r.closes}
                  </ThemedText>
                  <View style={[styles.chip, { borderColor: r.voted ? colors.evidence : colors.textSecondary }]}>
                    <ThemedText type="small">{r.voted ? '✓ Voted' : 'Cast ballot'}</ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {scheduled.length > 0 && (
          <View style={styles.group}>
            <ThemedText type="smallBold">Scheduled</ThemedText>
            {scheduled.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: '/referenda/[id]', params: { id: r.id } })}
                style={[styles.card, { backgroundColor: colors.backgroundElement }]}
              >
                <ThemedText type="small">{r.question_text}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {r.topic} · opens {r.opens}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {awaiting.length > 0 && (
          <View style={styles.group}>
            <ThemedText type="smallBold">Awaiting certification</ThemedText>
            {awaiting.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: '/referenda/[id]', params: { id: r.id } })}
                style={[styles.card, { backgroundColor: colors.backgroundElement }]}
              >
                <ThemedText type="small">{r.question_text}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {r.topic} · {r.ballots} ballots
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.group}>
          <ThemedText type="smallBold">Published mandates</ThemedText>
          {published.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              None yet.
            </ThemedText>
          )}
          {published.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push({ pathname: '/mandates/[id]', params: { id: m.id } })}
              style={[styles.card, { backgroundColor: colors.backgroundElement }]}
            >
              <ThemedText type="small">{m.mandate_summary}</ThemedText>
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {m.office ?? ''} · {m.turnout_count.toLocaleString()} voters · +{m.margin_pct}% margin
                </ThemedText>
                <View style={[styles.chip, { borderColor: colors.evidence }]}>
                  <ThemedText type="small" style={{ color: colors.evidence }}>
                    ✓{m.commits} ✗{m.declines} —{m.no_responses}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.push('/accountability/list')}>
          <ThemedText type="linkPrimary">Accountability campaigns →</ThemedText>
        </Pressable>

        {below.length > 0 && (
          <View style={styles.group}>
            <ThemedText type="smallBold">Below publication threshold</ThemedText>
            {below.map((m) => (
              <View key={m.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="small">{m.question_text}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Turnout didn't meet the publication threshold ({m.turnout_pct ?? 0}% &lt; {m.threshold_pct}%).
                </ThemedText>
              </View>
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
  group: { gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
});

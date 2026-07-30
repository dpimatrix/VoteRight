import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';

interface Topic {
  topic_id: string;
  name: string;
  axis_id: string;
  question: string;
  negative_pole: string;
  positive_pole: string;
}

interface Selection {
  direction: 1 | -1;
  weight: number;
  statement: string;
}

interface SavedPriority {
  axisId: string;
  direction: 1 | -1;
  weight: number;
  statement: string;
}

export default function PrioritiesScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [sel, setSel] = useState<Record<string, Selection>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = Object.keys(sel).length;
  const seededRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<{ topics: Topic[] }>('/api/topics');
          if (cancelled) return;
          setTopics(res.topics);
          if (!seededRef.current) {
            seededRef.current = true;
            const saved = await get<{ priorities: SavedPriority[] }>('/api/priorities');
            if (!cancelled && saved.priorities.length > 0) {
              setSel(
                Object.fromEntries(
                  saved.priorities.map((p) => [
                    p.axisId,
                    { direction: p.direction, weight: p.weight, statement: p.statement },
                  ]),
                ),
              );
            }
          }
        } catch (e) {
          console.error('Topics load failed:', e);
          if (!cancelled) setError('Could not load issues. Pull down to try again.');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function pick(axisId: string, direction: 1 | -1, poleText: string) {
    setSel((s) => {
      const cur = s[axisId];
      if (cur && cur.direction === direction) {
        const { [axisId]: _drop, ...rest } = s;
        return rest;
      }
      return { ...s, [axisId]: { direction, weight: cur?.weight ?? 3, statement: poleText } };
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const items = Object.entries(sel).map(([axisId, v]) => ({
      axisId,
      direction: v.direction,
      weight: v.weight,
      statement: v.statement,
    }));
    try {
      await post('/api/priorities', { items });
      router.replace('/explore');
    } catch (e) {
      console.error('Priorities save failed:', e);
      setError('Could not save your priorities. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Your priorities
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pick a side on at least 3 issues to see how candidates match you.
        </ThemedText>

        {!topics && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {topics?.map((tp) => {
          const s = sel[tp.axis_id];
          return (
            <View key={tp.axis_id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">{tp.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.question}>
                {tp.question}
              </ThemedText>
              <View style={styles.poles}>
                <Pressable
                  onPress={() => pick(tp.axis_id, -1, tp.negative_pole)}
                  style={[
                    styles.poleBtn,
                    {
                      borderColor: s?.direction === -1 ? colors.evidence : colors.textSecondary,
                      backgroundColor: s?.direction === -1 ? colors.backgroundSelected : 'transparent',
                    },
                  ]}
                >
                  <ThemedText type="small">{tp.negative_pole}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => pick(tp.axis_id, 1, tp.positive_pole)}
                  style={[
                    styles.poleBtn,
                    {
                      borderColor: s?.direction === 1 ? colors.evidence : colors.textSecondary,
                      backgroundColor: s?.direction === 1 ? colors.backgroundSelected : 'transparent',
                    },
                  ]}
                >
                  <ThemedText type="small">{tp.positive_pole}</ThemedText>
                </Pressable>
              </View>
              {s && (
                <View style={styles.weightRow}>
                  <Pressable
                    onPress={() =>
                      setSel((x) => ({ ...x, [tp.axis_id]: { ...s, weight: Math.max(1, s.weight - 1) } }))
                    }
                  >
                    <ThemedText type="smallBold">−</ThemedText>
                  </Pressable>
                  <ThemedText type="small">
                    {'●'.repeat(s.weight)}
                    {'○'.repeat(5 - s.weight)}
                  </ThemedText>
                  <Pressable
                    onPress={() =>
                      setSel((x) => ({ ...x, [tp.axis_id]: { ...s, weight: Math.min(5, s.weight + 1) } }))
                    }
                  >
                    <ThemedText type="smallBold">+</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        <Pressable
          disabled={count < 3 || busy}
          onPress={submit}
          style={[
            styles.submitBtn,
            { backgroundColor: count < 3 || busy ? colors.backgroundElement : colors.evidence },
          ]}
        >
          <ThemedText type="smallBold" themeColor={count < 3 || busy ? 'textSecondary' : undefined}>
            {count >= 3 ? 'See matches' : `Pick ${3 - count} more`}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  question: { marginTop: -Spacing.one },
  poles: { flexDirection: 'row', gap: Spacing.two },
  poleBtn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

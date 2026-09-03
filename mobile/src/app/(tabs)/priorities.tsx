import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useRetryOnForeground } from '@/hooks/use-retry-on-foreground';
import { t, tf } from '@/lib/i18n';

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
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [sel, setSel] = useState<Record<string, Selection>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = Object.keys(sel).length;
  const seededRef = useRef(false);

  // Priority-Wishes (2026-09-03): a resident suggests a new priority axis
  // that isn't on the list yet. Independent of the topics/selection state
  // above -- this is a one-off suggestion, not part of what gets POSTed
  // to /api/priorities.
  const [wishText, setWishText] = useState('');
  const [wishBusy, setWishBusy] = useState(false);
  const [wishSent, setWishSent] = useState(false);
  const [wishError, setWishError] = useState(false);
  async function submitWish() {
    if (!wishText.trim()) return;
    setWishBusy(true);
    setWishError(false);
    try {
      if (!hasSession()) await ensureSession();
      await post('/api/priority-wishes', { statement: wishText.trim() });
      setWishText('');
      setWishSent(true);
    } catch (e) {
      console.error('Priority wish submit failed:', e);
      setWishError(true);
    } finally {
      setWishBusy(false);
    }
  }

  // Ref-based generation guard, not a plain closure `cancelled` boolean --
  // loadTopics is also called directly by the "Try again" button below, so
  // a stale in-flight call needs to know it's been superseded even while
  // the screen stays focused (same fix already applied to Matches).
  const loadGeneration = useRef(0);
  const loadTopics = useCallback(() => {
    const gen = ++loadGeneration.current;
    setError(null);
    (async () => {
      try {
        if (!hasSession()) await ensureSession();
        const res = await get<{ topics: Topic[] }>('/api/topics');
        if (loadGeneration.current !== gen) return;
        setTopics(res.topics);
        if (!seededRef.current) {
          seededRef.current = true;
          const saved = await get<{ priorities: SavedPriority[] }>('/api/priorities');
          if (loadGeneration.current === gen && saved.priorities.length > 0) {
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
        if (loadGeneration.current !== gen) return;
        console.error('Topics load failed:', e);
        setError(d.topics_load_error);
      }
    })();
  }, [d.topics_load_error]);

  useFocusEffect(useCallback(() => { loadTopics(); }, [loadTopics]));
  // Gated to the load error specifically, not priorities_save_error --
  // a failed save shouldn't silently retry as a topics reload on resume.
  useRetryOnForeground(error === d.topics_load_error, loadTopics);

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
      setError(d.priorities_save_error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {d.priorities_title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.priorities_sub}
        </ThemedText>

        {!topics && !error && <ActivityIndicator style={styles.spinner} />}
        {error && (
          <View style={styles.rowWrap}>
            <ThemedText type="small">{error}</ThemedText>
            {error === d.topics_load_error && (
              <Pressable onPress={loadTopics}>
                <ThemedText type="small" style={{ color: colors.evidence }}>
                  {d.try_again}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

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
            {count >= 3 ? d.see_matches : tf(d.pick_more, { n: 3 - count })}
          </ThemedText>
        </Pressable>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">{d.priority_wish_h}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {d.priority_wish_sub}
          </ThemedText>
          {wishSent ? (
            <ThemedText type="small" style={{ color: colors.evidence }}>
              {d.priority_wish_sent}
            </ThemedText>
          ) : (
            <>
              <TextInput
                value={wishText}
                onChangeText={setWishText}
                placeholder={d.priority_wish_ph}
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.wishInput, { borderColor: colors.textSecondary, color: colors.text }]}
              />
              {wishError && <ThemedText type="small">{d.priority_wish_error}</ThemedText>}
              <Pressable
                disabled={!wishText.trim() || wishBusy}
                onPress={submitWish}
                style={[
                  styles.wishSubmitBtn,
                  { borderColor: !wishText.trim() || wishBusy ? colors.textSecondary : colors.evidence },
                ]}
              >
                <ThemedText type="small" themeColor={!wishText.trim() || wishBusy ? 'textSecondary' : undefined}>
                  {d.priority_wish_submit}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  question: { marginTop: -Spacing.one },
  poles: { flexDirection: 'row', gap: Spacing.two },
  poleBtn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  wishInput: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, minHeight: 60, textAlignVertical: 'top' },
  wishSubmitBtn: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
});

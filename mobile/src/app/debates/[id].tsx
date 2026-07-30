import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebateComposer } from '@/components/DebateComposer';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { canonicalSecondPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { ensureSession, get, hasSession, post } from '@/services/api';

interface Citation {
  publisher: string;
  title: string;
}

interface Arg {
  id: string;
  side: string;
  body_text: string;
  moderation_status: string;
  date: string;
  agree_count: number;
  disagree_count: number;
  pass_count: number;
  display_name: string;
  mine: boolean;
  citations: Citation[];
  my_vote: string | null;
}

interface Ctq {
  active: number;
  votes: number;
  eligible: boolean;
  voted: boolean;
}

interface DebateDetail {
  id: string;
  title: string;
  body: string;
  status: string;
  second_threshold: number;
  topic: string;
  seconds: number;
  has_seconded: boolean;
  thread_id: string | null;
  closes: string | null;
  thread_status: string | null;
  ctq_pct: number | null;
  args: Arg[];
  ctq: Ctq | null;
}

const SIDE_LABEL: Record<string, string> = { for: 'For', against: 'Against', neutral_info: 'Neutral' };

export default function DebateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [detail, setDetail] = useState<DebateDetail | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const [d, who] = await Promise.all([
        get<DebateDetail>(`/api/debates/${id}`),
        get<{ tier: string }>('/api/whoami'),
      ]);
      setDetail(d);
      setTier(who.tier);
    } catch (e) {
      console.error('Debate load failed:', e);
      setError('Could not load this debate. Pull down to try again.');
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

  async function second() {
    if (!detail) return;
    setBusy(true);
    try {
      let signature: { signature: string; publicKeyFingerprint: string } | undefined;
      try {
        await ensureSigningKey();
        const userId = await currentUserIdForSigning();
        signature = await signPayload(canonicalSecondPayload({ userId, proposalId: detail.id }));
      } catch (e) {
        console.error('Signing failed, seconding unsigned:', e);
      }
      await post(`/api/debates/${detail.id}/second`, {
        signature: signature?.signature,
        publicKeyFingerprint: signature?.publicKeyFingerprint,
      });
      await load();
    } catch (e) {
      console.error('Second failed:', e);
    } finally {
      setBusy(false);
    }
  }

  async function ctqVote() {
    if (!detail?.thread_id) return;
    setBusy(true);
    try {
      await post(`/api/debates/${detail.thread_id}/ctq`, {});
      await load();
    } catch (e) {
      console.error('Call-the-question vote failed:', e);
    } finally {
      setBusy(false);
    }
  }

  async function agree(argumentId: string, response: 'agree' | 'disagree' | 'pass') {
    try {
      await post(`/api/arguments/${argumentId}/agree`, { response });
      await load();
    } catch (e) {
      console.error('Agreement vote failed:', e);
    }
  }

  const verified = tier !== null && tier !== 'unverified';

  if (!detail && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !detail) {
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
        <ThemedText type="subtitle">{detail.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail.topic}
        </ThemedText>
        <ThemedText type="small">{detail.body}</ThemedText>

        {detail.status === 'seconding' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.chip, { borderColor: colors.evidence, alignSelf: 'flex-start' }]}>
              <ThemedText type="small" style={{ color: colors.evidence }}>
                {detail.seconds}/{detail.second_threshold} seconds
              </ThemedText>
            </View>
            {detail.has_seconded ? (
              <ThemedText type="small">You've already seconded this proposal.</ThemedText>
            ) : verified ? (
              <Pressable
                disabled={busy}
                onPress={second}
                style={[styles.actionBtn, { backgroundColor: colors.evidence }]}
              >
                <ThemedText type="smallBold">Second this proposal</ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                <ThemedText type="smallBold">Verify to second</ThemedText>
              </Pressable>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Seconding is public and attributed.
            </ThemedText>
          </View>
        )}

        {detail.thread_id && (
          <>
            {detail.thread_status === 'open' && detail.ctq && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">Call the question</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {detail.ctq.votes} / {detail.ctq.active} active participants
                  {detail.closes ? ` · closes ${detail.closes}` : ''}
                </ThemedText>
                {detail.ctq.voted ? (
                  <ThemedText type="small">You've voted to close debate early.</ThemedText>
                ) : detail.ctq.eligible && verified ? (
                  <Pressable
                    disabled={busy}
                    onPress={ctqVote}
                    style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold">Call the question</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Post an argument or vote on 2+ arguments to become eligible.
                  </ThemedText>
                )}
              </View>
            )}
            {detail.thread_status !== 'open' && (
              <ThemedText type="small" themeColor="textSecondary">
                This debate thread is closed.
              </ThemedText>
            )}

            {detail.args.map((a) => (
              <View
                key={a.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.backgroundElement },
                  a.moderation_status === 'pending' && styles.pendingCard,
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={[styles.chip, { borderColor: colors.evidence }]}>
                    <ThemedText type="small" style={{ color: colors.evidence }}>
                      {SIDE_LABEL[a.side] ?? a.side}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {a.display_name} · {a.date}
                  </ThemedText>
                </View>
                <ThemedText type="small">{a.body_text}</ThemedText>
                {a.citations.map((c, i) => (
                  <ThemedText key={i} type="small" themeColor="textSecondary">
                    ▣ {c.publisher} · {c.title}
                  </ThemedText>
                ))}
                {a.moderation_status === 'pending' ? (
                  <ThemedText type="small">⟳ Pending moderation review</ThemedText>
                ) : detail.thread_status === 'open' && verified ? (
                  <View style={styles.voteRow}>
                    {(['agree', 'disagree', 'pass'] as const).map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => agree(a.id, r)}
                        style={[
                          styles.chip,
                          { borderColor: a.my_vote === r ? colors.evidence : colors.textSecondary },
                        ]}
                      >
                        <ThemedText type="small">
                          {r === 'agree' ? `Agree ${a.agree_count}` : r === 'disagree' ? `Disagree ${a.disagree_count}` : 'Pass'}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Agree {a.agree_count} · Disagree {a.disagree_count}
                  </ThemedText>
                )}
              </View>
            ))}

            {detail.thread_status === 'open' &&
              (verified ? (
                <DebateComposer threadId={detail.thread_id} onPosted={load} />
              ) : (
                <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                  <ThemedText type="smallBold">Verify to argue</ThemedText>
                </Pressable>
              ))}
          </>
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
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  pendingCard: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#888' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
  actionBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  voteRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebateComposer } from '@/components/DebateComposer';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { canonicalSecondPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { ensureSession, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

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
  is_author: boolean;
  seconds: number;
  has_seconded: boolean;
  thread_id: string | null;
  closes: string | null;
  thread_status: string | null;
  ctq_pct: number | null;
  args: Arg[];
  ctq: Ctq | null;
}

export default function DebateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const SIDE_LABEL: Record<string, string> = { for: d.side_for, against: d.side_against, neutral_info: d.side_neutral };
  const [detail, setDetail] = useState<DebateDetail | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const [dd, who] = await Promise.all([
        get<DebateDetail>(`/api/debates/${id}`),
        get<{ tier: string }>('/api/whoami'),
      ]);
      setDetail(dd);
      setTier(who.tier);
    } catch (e) {
      console.error('Debate load failed:', e);
      setError(d.debate_load_error);
    }
  }, [id, d.debate_load_error]);

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
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{detail.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail.topic}
        </ThemedText>
        <ThemedText type="small">{detail.body}</ThemedText>

        {detail.status === 'seconding' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.chip, { borderColor: colors.evidence, alignSelf: 'flex-start' }]}>
              <ThemedText type="small" style={{ color: colors.evidence }}>
                {tf(d.seconds_progress, { have: detail.seconds, need: detail.second_threshold })}
              </ThemedText>
            </View>
            {detail.is_author ? (
              <ThemedText type="small" themeColor="textSecondary">
                {d.author_cant_second}
              </ThemedText>
            ) : detail.has_seconded ? (
              <ThemedText type="small">{d.already_seconded}</ThemedText>
            ) : verified ? (
              <Pressable
                disabled={busy}
                onPress={second}
                style={[styles.actionBtn, { backgroundColor: colors.evidence }]}
              >
                <ThemedText type="smallBold">{d.second_proposal_btn}</ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                <ThemedText type="smallBold">{d.verify_to_second}</ThemedText>
              </Pressable>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {d.seconding_attrib_note}
            </ThemedText>
          </View>
        )}

        {detail.thread_id && (
          <>
            {detail.thread_status === 'open' && detail.ctq && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">{d.call_the_question}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {tf(d.ctq_progress, { votes: detail.ctq.votes, active: detail.ctq.active })}
                  {detail.closes ? tf(d.closes_suffix, { date: detail.closes }) : ''}
                </ThemedText>
                {detail.ctq.voted ? (
                  <ThemedText type="small">{d.already_ctq_voted}</ThemedText>
                ) : detail.ctq.eligible && verified ? (
                  <Pressable
                    disabled={busy}
                    onPress={ctqVote}
                    style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold">{d.call_the_question}</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {d.ctq_eligibility_note}
                  </ThemedText>
                )}
              </View>
            )}
            {detail.thread_status !== 'open' && (
              <ThemedText type="small" themeColor="textSecondary">
                {d.thread_closed}
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
                  <ThemedText type="small">{d.pending_moderation}</ThemedText>
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
                          {r === 'agree'
                            ? tf(d.agree_count, { n: a.agree_count })
                            : r === 'disagree'
                              ? tf(d.disagree_count, { n: a.disagree_count })
                              : d.pass}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {tf(d.agree_disagree_readonly, { agree: a.agree_count, disagree: a.disagree_count })}
                  </ThemedText>
                )}
              </View>
            ))}

            {detail.thread_status === 'open' &&
              (verified ? (
                <DebateComposer threadId={detail.thread_id} onPosted={load} />
              ) : (
                <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                  <ThemedText type="smallBold">{d.verify_to_argue}</ThemedText>
                </Pressable>
              ))}
          </>
        )}
    </KeyboardAwareScreen>
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

import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DebateComposer } from '@/components/DebateComposer';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { API_URL } from '@/constants/Config';
import { Colors, Spacing, type ThemeColor } from '@/constants/theme';
import { canonicalSecondPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { ensureSession, errorCode, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf, type Dict } from '@/lib/i18n';

// arguments.video_url/audio_url are stored root-relative (mirrors
// politicians.photo_url -- see pol-avatar.tsx's own resolvePhotoUrl for the
// same reasoning): free on web via a same-origin <video src>/<audio src>,
// but React Native's players need an absolute URI.
const resolveMediaUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${API_URL}${url}`);

interface Citation {
  publisher: string;
  title: string;
}

interface Arg {
  id: string;
  side: string;
  body_text: string | null;
  format: string;
  audio_url: string | null;
  video_url: string | null;
  transcript_text: string | null;
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
  floorsMet: boolean;
  minActive: number;
  minOpenHours: number;
  hoursOpen: number;
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
  closed_reason: string | null;
  reported: boolean;
  ctq_pct: number | null;
  ctq: Ctq | null;
  args: Arg[];
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
  // Separate from `error` above -- that one replaces the ENTIRE page (only
  // used for the initial load failing), too heavy-handed for "one action
  // among several on this page failed." Cleared at the start of every
  // action below so a stale message from a previous attempt doesn't linger.
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

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

  // Debate participation (2026-08-19) needs payment_verified specifically,
  // not just an address on file -- see web's anon.ts's paymentVerifiedUserId()
  // doc comment. An address-verified-but-unpaid user goes to /verify-payment,
  // not back through address verification they've already done; a fully
  // unverified user still goes to /verify.
  // Found live 2026-08-29: any code other than 'pay'/'verify' (e.g. the
  // report endpoint's 'closed'/'invalid') was silently dropped here --
  // every call site below just cleared its busy state with zero feedback,
  // as if nothing had been submitted at all. Falls back to a generic
  // inline error for anything unrecognized, rather than special-casing
  // every current and future error code this shared helper's four call
  // sites can return.
  function routeToVerification(code: string | null) {
    if (code === 'pay') router.push('/verify-payment');
    else if (code === 'verify') router.push('/verify');
    else setActionError(d.generic_error);
  }

  async function second() {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
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
      // Defense in depth: the button itself is only shown when paymentVerified
      // is already true, but tier can lapse between load() and this tap (e.g.
      // a refund) -- route to the right screen instead of failing silently.
      routeToVerification(errorCode(e));
    } finally {
      setBusy(false);
    }
  }

  // "Call the question" (migration 094, restored with real floors -- see
  // debates.ts's ctqVote() header comment). detail.ctq.floorsMet gates
  // whether this whole section renders at all, so this function never gets
  // called before both floors are met.
  async function ctqVote() {
    if (!detail?.thread_id) return;
    setBusy(true);
    setActionError(null);
    try {
      await post(`/api/debates/${detail.thread_id}/ctq`, {});
      await load();
    } catch (e) {
      console.error('Call-the-question vote failed:', e);
      routeToVerification(errorCode(e));
    } finally {
      setBusy(false);
    }
  }

  // Member abuse reports (2026-08-24, migration 093) -- the SECOND early-
  // closure path, alongside calling the question above: a human
  // moderator's own judgment, for cases (spam, harassment) that aren't
  // about debate being "settled" and so wouldn't be solved by any
  // participant-vote mechanism no matter how it's floored.
  async function submitReport() {
    if (!detail?.thread_id || !reportReason.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await post(`/api/debates/${detail.thread_id}/report`, { reason: reportReason.trim() });
      setReportReason('');
      setReportOpen(false);
      await load();
    } catch (e) {
      console.error('Report failed:', e);
      routeToVerification(errorCode(e));
    } finally {
      setBusy(false);
    }
  }

  async function agree(argumentId: string, response: 'agree' | 'disagree' | 'pass') {
    setActionError(null);
    try {
      await post(`/api/arguments/${argumentId}/agree`, { response });
      await load();
    } catch (e) {
      console.error('Agreement vote failed:', e);
      routeToVerification(errorCode(e));
    }
  }

  const paymentVerified = tier === 'payment_verified';
  const payHref = tier === 'unverified' ? ('/verify' as const) : ('/verify-payment' as const);

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

        {actionError && <ThemedText type="small">{actionError}</ThemedText>}

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
            ) : paymentVerified ? (
              <Pressable
                disabled={busy}
                onPress={second}
                style={[styles.actionBtn, { backgroundColor: colors.evidence }]}
              >
                <ThemedText type="smallBold">{d.second_proposal_btn}</ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push(payHref)} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                <ThemedText type="smallBold">{tier === 'unverified' ? d.verify_to_second : d.pay_to_second}</ThemedText>
              </Pressable>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {d.seconding_attrib_note}
            </ThemedText>
          </View>
        )}

        {detail.thread_id && detail.ctq && (
          <>
            {detail.thread_status === 'open' && detail.ctq.floorsMet && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">{d.call_the_question}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {tf(d.ctq_progress, { votes: detail.ctq.votes, active: detail.ctq.active })}
                  {detail.closes ? tf(d.closes_suffix, { date: detail.closes }) : ''}
                </ThemedText>
                {detail.ctq.voted ? (
                  <ThemedText type="small">{d.already_ctq_voted}</ThemedText>
                ) : detail.ctq.eligible && paymentVerified ? (
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
            {detail.thread_status === 'open' && !detail.ctq.floorsMet && (
              <ThemedText type="small" themeColor="textSecondary">
                {tf(d.ctq_floors_note, {
                  active: detail.ctq.active,
                  minActive: detail.ctq.minActive,
                  hours: detail.ctq.hoursOpen,
                  minHours: detail.ctq.minOpenHours,
                })}
              </ThemedText>
            )}
            {detail.thread_status !== 'open' && (
              <ThemedText type="small" themeColor="textSecondary">
                {d.thread_closed}
                {detail.closed_reason ? ` — ${detail.closed_reason}` : ''}
              </ThemedText>
            )}

            {detail.args.map((a) => (
              <ArgumentCard
                key={a.id}
                a={a}
                d={d}
                colors={colors}
                sideLabel={SIDE_LABEL[a.side] ?? a.side}
                voteEnabled={detail.thread_status === 'open' && paymentVerified}
                onVote={agree}
              />
            ))}

            {detail.thread_status === 'open' &&
              (paymentVerified ? (
                <DebateComposer threadId={detail.thread_id} onPosted={load} />
              ) : (
                <Pressable onPress={() => router.push(payHref)} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                  <ThemedText type="smallBold">{tier === 'unverified' ? d.verify_to_argue : d.pay_to_argue}</ThemedText>
                </Pressable>
              ))}

            {detail.thread_status === 'open' && paymentVerified && (
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">{d.report_h}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.report_note}
                </ThemedText>
                {detail.reported ? (
                  <ThemedText type="small">{d.report_done}</ThemedText>
                ) : reportOpen ? (
                  <>
                    <TextInput
                      value={reportReason}
                      onChangeText={setReportReason}
                      placeholder={d.report_ph}
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
                    />
                    <Pressable
                      disabled={busy || !reportReason.trim()}
                      onPress={submitReport}
                      style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]}
                    >
                      <ThemedText type="smallBold">{d.report_btn}</ThemedText>
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => setReportOpen(true)}>
                    <ThemedText type="linkPrimary">{d.report_open_btn}</ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
    </KeyboardAwareScreen>
  );
}

type ArgumentCardProps = {
  a: Arg;
  d: Dict;
  colors: Record<ThemeColor, string>;
  sideLabel: string;
  voteEnabled: boolean;
  onVote: (argumentId: string, response: 'agree' | 'disagree' | 'pass') => void;
};

// Dispatches by a.format, which is fixed per argument and never changes
// across this row's own re-renders -- an ordinary conditional render of two
// different component types, not a hook called a variable number of times
// (that would break the Rules of Hooks; this doesn't, since React tracks
// hooks per mounted component instance, and each instance here always
// renders as the same one of the two below for its whole lifetime). Replaces
// the earlier single-component version that called expo-video's
// useVideoPlayer/expo-audio's useAudioPlayer unconditionally on every card
// including plain-text ones, purely to keep hook-call count fixed.
function ArgumentCard(props: ArgumentCardProps) {
  return props.a.format === 'text' ? <TextArgumentCard {...props} /> : <MediaArgumentCard {...props} />;
}

function TextArgumentCard({ a, d, colors, sideLabel, voteEnabled, onVote }: ArgumentCardProps) {
  return (
    <ArgumentCardShell a={a} colors={colors} sideLabel={sideLabel}>
      <ThemedText type="small">{a.body_text}</ThemedText>
      <ArgumentCardFooter a={a} d={d} colors={colors} voteEnabled={voteEnabled} onVote={onVote} />
    </ArgumentCardShell>
  );
}

// The only variant that touches expo-video/expo-audio's hooks -- text-only
// arguments (the common case) no longer allocate a video+audio player pair
// for a media type they'll never use. Also the fallback for any format
// other than 'text'/'video'/'audio', same as the original single-component
// version: videoUrl/audioUrl both resolve to null there too, so it renders
// identically (header + citations + footer only).
function MediaArgumentCard({ a, d, colors, sideLabel, voteEnabled, onVote }: ArgumentCardProps) {
  const videoUrl = a.format === 'video' && a.video_url ? resolveMediaUrl(a.video_url) : null;
  const audioUrl = a.format === 'audio' && a.audio_url ? resolveMediaUrl(a.audio_url) : null;
  const videoPlayer = useVideoPlayer(videoUrl);
  const { isPlaying: videoPlaying } = useEvent(videoPlayer, 'playingChange', { isPlaying: videoPlayer.playing });
  const audioPlayer = useAudioPlayer(audioUrl);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  return (
    <ArgumentCardShell a={a} colors={colors} sideLabel={sideLabel}>
      {videoUrl && <VideoView player={videoPlayer} style={styles.videoPreview} contentFit="contain" />}
      {(videoUrl || audioUrl) && (
        <View style={styles.sideRow}>
          <Pressable
            onPress={() => {
              if (videoUrl) {
                if (videoPlaying) videoPlayer.pause();
                else videoPlayer.play();
              } else if (audioStatus.playing) audioPlayer.pause();
              else audioPlayer.play();
            }}
          >
            <ThemedText type="linkPrimary">
              {(videoUrl ? videoPlaying : audioStatus.playing) ? d.pause_btn : d.play_btn}
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {a.transcript_text || d.transcript_soon}
          </ThemedText>
        </View>
      )}
      <ArgumentCardFooter a={a} d={d} colors={colors} voteEnabled={voteEnabled} onVote={onVote} />
    </ArgumentCardShell>
  );
}

// Chrome shared by both variants above -- header row + citations, wrapping
// whatever format-specific body each variant passes as children.
function ArgumentCardShell({
  a,
  colors,
  sideLabel,
  children,
}: {
  a: Arg;
  colors: Record<ThemeColor, string>;
  sideLabel: string;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement },
        a.moderation_status === 'pending' && styles.pendingCard,
      ]}
    >
      <View style={styles.rowBetween}>
        <View style={[styles.chip, { borderColor: colors.evidence }]}>
          <ThemedText type="small" style={{ color: colors.evidence }}>
            {sideLabel}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {a.display_name} · {a.date}
        </ThemedText>
      </View>

      {children}

      {a.citations.map((c, i) => (
        <ThemedText key={i} type="small" themeColor="textSecondary">
          ▣ {c.publisher} · {c.title}
        </ThemedText>
      ))}
    </View>
  );
}

// Moderation/vote footer shared by both variants above.
function ArgumentCardFooter({
  a,
  d,
  colors,
  voteEnabled,
  onVote,
}: {
  a: Arg;
  d: Dict;
  colors: Record<ThemeColor, string>;
  voteEnabled: boolean;
  onVote: (argumentId: string, response: 'agree' | 'disagree' | 'pass') => void;
}) {
  if (a.moderation_status === 'pending') return <ThemedText type="small">{d.pending_moderation}</ThemedText>;
  if (voteEnabled) {
    return (
      <View style={styles.voteRow}>
        {(['agree', 'disagree', 'pass'] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => onVote(a.id, r)}
            style={[styles.chip, { borderColor: a.my_vote === r ? colors.evidence : colors.textSecondary }]}
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
    );
  }
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {tf(d.agree_disagree_readonly, { agree: a.agree_count, disagree: a.disagree_count })}
    </ThemedText>
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
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  actionBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  voteRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  sideRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
  videoPreview: { width: '100%', height: 200, borderRadius: Spacing.two, backgroundColor: '#000' },
});

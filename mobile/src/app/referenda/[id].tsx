import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

interface TallyCount {
  choice: string;
  n: number;
}

interface Tally {
  counts: TallyCount[];
  total: number;
}

interface ReferendumDetail {
  id: string;
  question_text: string;
  options: string[];
  status: string;
  disclosure_text: string;
  opens: string;
  closes: string;
  proposal_id: string;
  proposal_title: string;
  proposal_body: string;
  topic: string;
  ballots: number;
  my_token: string | null;
  voted: boolean;
  mandate_id: string | null;
  overlay_status: string | null;
  results: Tally | null;
}

export default function ReferendumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const OPT_LABEL: Record<string, string> = { yes: d.opt_yes, no: d.opt_no };
  const [ref, setRef] = useState<ReferendumDetail | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notEligible, setNotEligible] = useState(false);
  const [tooRecent, setTooRecent] = useState(false);

  const load = useCallback(async () => {
    try {
      if (!hasSession()) await ensureSession();
      const [r, who] = await Promise.all([
        get<ReferendumDetail>(`/api/referenda/${id}`),
        get<{ tier: string }>('/api/whoami'),
      ]);
      setRef(r);
      setTier(who.tier);
    } catch (e) {
      console.error('Referendum load failed:', e);
      setError(d.referendum_load_error);
    }
  }, [id, d.referendum_load_error]);

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

  async function getBallot() {
    setBusy(true);
    setNotEligible(false);
    setTooRecent(false);
    try {
      const res = await post<{ outcome: 'ok' | 'not_open' | 'not_eligible' | 'too_recent' }>(
        `/api/referenda/${id}/ballot`,
        {},
      );
      if (res.outcome === 'not_eligible') setNotEligible(true);
      if (res.outcome === 'too_recent') setTooRecent(true);
      await load();
    } catch (e) {
      console.error('Ballot request failed:', e);
    } finally {
      setBusy(false);
    }
  }

  // §10.1: this vote() function and the /vote request it sends are the only
  // places on this screen that ever see a (user, choice) pair together — it
  // must never be logged, stored in state longer than the request, or sent
  // anywhere but this one endpoint.
  async function vote(choice: string) {
    setBusy(true);
    try {
      await post(`/api/referenda/${id}/vote`, { choice });
      await load();
    } catch (e) {
      console.error('Vote failed:', e);
    } finally {
      setBusy(false);
    }
  }

  const verified = tier !== null && tier !== 'unverified';

  if (!ref && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !ref) {
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
        <ThemedText type="subtitle">{ref.question_text}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {ref.topic} · {ref.proposal_title}
        </ThemedText>

        <View style={[styles.disclosure, { borderColor: colors.textSecondary }]}>
          <ThemedText type="small">{ref.disclosure_text}</ThemedText>
        </View>

        <ThemedText type="small">{ref.proposal_body}</ThemedText>
        <Pressable onPress={() => router.push({ pathname: '/debates/[id]', params: { id: ref.proposal_id } })}>
          <ThemedText type="linkPrimary">{d.see_debate_link}</ThemedText>
        </Pressable>

        {ref.status === 'scheduled' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {tf(d.opens_closes, { opens: ref.opens, closes: ref.closes })}
            </ThemedText>
          </View>
        )}

        {ref.status === 'open' && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {tf(d.ballots_cast_closes, { n: ref.ballots, date: ref.closes })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {d.results_hidden_note}
            </ThemedText>
            {notEligible && <ThemedText type="small">{d.not_eligible_note}</ThemedText>}
            {tooRecent && <ThemedText type="small">{d.too_recent_note}</ThemedText>}
            {!verified ? (
              <Pressable onPress={() => router.push('/verify')} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                <ThemedText type="smallBold">{d.verify_to_vote}</ThemedText>
              </Pressable>
            ) : ref.voted ? (
              <ThemedText type="small">{d.already_voted}</ThemedText>
            ) : !ref.my_token ? (
              <>
                <Pressable disabled={busy} onPress={getBallot} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
                  <ThemedText type="smallBold">{d.get_ballot_btn}</ThemedText>
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.one_ballot_note}
                </ThemedText>
              </>
            ) : (
              <View style={styles.choiceGroup}>
                {ref.options.map((o) => (
                  <Pressable
                    key={o}
                    disabled={busy}
                    onPress={() => vote(o)}
                    style={[styles.choiceBtn, { borderColor: colors.textSecondary }]}
                  >
                    <ThemedText type="smallBold">{OPT_LABEL[o] ?? o}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.privRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {d.secret_ballot_note}
              </ThemedText>
            </View>
          </View>
        )}

        {(ref.status === 'closed' || ref.status === 'published') && ref.results && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{d.results_h}</ThemedText>
            {ref.results.counts.map((c) => (
              <View key={c.choice} style={styles.resultRow}>
                <ThemedText type="small">
                  {OPT_LABEL[c.choice] ?? c.choice} · {c.n.toLocaleString()}
                  {ref.results!.total > 0 ? ` (${Math.round((c.n / ref.results!.total) * 1000) / 10}%)` : ''}
                </ThemedText>
                <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.evidence,
                        width: `${ref.results!.total > 0 ? (c.n / ref.results!.total) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              {tf(d.ballots_cast_total, { n: ref.results.total.toLocaleString() })}
            </ThemedText>
            {ref.mandate_id && ref.overlay_status !== 'below_threshold_unpublished' && (
              <Pressable
                onPress={() => router.push({ pathname: '/mandates/[id]', params: { id: ref.mandate_id! } })}
                style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]}
              >
                <ThemedText type="smallBold">{d.see_commitments_btn}</ThemedText>
              </Pressable>
            )}
          </View>
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
  disclosure: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  actionBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  choiceGroup: { gap: Spacing.two },
  choiceBtn: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  privRow: { flexDirection: 'row' },
  resultRow: { gap: Spacing.one },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8 },
});

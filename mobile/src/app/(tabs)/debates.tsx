import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

interface Proposal {
  id: string;
  title: string;
  status: string;
  second_threshold: number;
  topic: string;
  seconds: number;
  thread_id: string | null;
  closes: string | null;
  args: number;
}

export default function DebatesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const STATUS_LABEL: Record<string, string> = { debating: d.status_debating, seconding: d.status_seconding };
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const [res, who] = await Promise.all([
            get<{ proposals: Proposal[] }>('/api/debates'),
            get<{ tier: string }>('/api/whoami'),
          ]);
          if (cancelled) return;
          setProposals(res.proposals);
          setTier(who.tier);
        } catch (e) {
          console.error('Debates load failed:', e);
          if (!cancelled) setError(d.debates_load_error);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [d.debates_load_error]),
  );

  const groups = proposals && [
    { key: 'debating', label: d.status_debating, items: proposals.filter((p) => p.status === 'debating') },
    { key: 'seconding', label: d.status_seconding, items: proposals.filter((p) => p.status === 'seconding') },
    {
      key: 'other',
      label: d.status_closed_other,
      items: proposals.filter((p) => !['debating', 'seconding'].includes(p.status)),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {d.debates_title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.debates_sub}
        </ThemedText>

        {/* Debate participation (2026-08-19) needs payment_verified specifically
            -- see web's anon.ts's paymentVerifiedUserId() doc comment. Someone
            who's only address_verified goes straight to /verify-payment, not
            back through address verification they've already done. */}
        {tier !== null && tier !== 'payment_verified' && (
          <Pressable
            onPress={() => router.push(tier === 'unverified' ? '/verify' : '/verify-payment')}
            style={[styles.verifyBtn, { borderColor: colors.evidence }]}
          >
            <ThemedText type="small" style={{ color: colors.evidence }}>
              {tier === 'unverified' ? d.verify_to_participate : d.pay_to_participate}
            </ThemedText>
          </Pressable>
        )}

        {!proposals && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {groups?.map(
          (g) =>
            g.items.length > 0 && (
              <View key={g.key} style={styles.group}>
                <ThemedText type="smallBold">{g.label}</ThemedText>
                {g.items.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push({ pathname: '/debates/[id]', params: { id: p.id } })}
                    style={[styles.card, { backgroundColor: colors.backgroundElement }]}
                  >
                    <ThemedText type="small">{p.title}</ThemedText>
                    <View style={styles.metaRow}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.status === 'seconding'
                          ? tf(d.seconds_progress, { have: p.seconds, need: p.second_threshold })
                          : tf(d.arguments_count, { n: p.args }) + (p.closes ? tf(d.closes_suffix, { date: p.closes }) : '')}
                      </ThemedText>
                      <View
                        style={[
                          styles.chip,
                          {
                            borderColor:
                              p.status === 'debating' || p.status === 'seconding'
                                ? colors.evidence
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        <ThemedText type="small">{STATUS_LABEL[p.status] ?? p.status}</ThemedText>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ),
        )}

        {tier === 'payment_verified' && (
          <Pressable
            onPress={() => router.push('/debates/new')}
            style={[styles.newBtn, { backgroundColor: colors.evidence }]}
          >
            <ThemedText type="smallBold">{d.propose_issue_btn}</ThemedText>
          </Pressable>
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
  verifyBtn: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  group: { gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
  newBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

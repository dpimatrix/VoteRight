import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

const STATUS_LABEL: Record<string, string> = {
  debating: 'Debating',
  seconding: 'Seconding',
};

export default function DebatesScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
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
          if (!cancelled) setError('Could not load debates. Pull down to try again.');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const groups = proposals && [
    { key: 'debating', label: 'Debating', items: proposals.filter((p) => p.status === 'debating') },
    { key: 'seconding', label: 'Seconding', items: proposals.filter((p) => p.status === 'seconding') },
    {
      key: 'other',
      label: 'Closed / other',
      items: proposals.filter((p) => !['debating', 'seconding'].includes(p.status)),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Debates
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Advisory — residents propose, second, and debate issues; the county isn't bound by outcomes.
        </ThemedText>

        {tier === 'unverified' && (
          <Pressable
            onPress={() => router.push('/verify')}
            style={[styles.verifyBtn, { borderColor: colors.evidence }]}
          >
            <ThemedText type="small" style={{ color: colors.evidence }}>
              Verify your address to participate
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
                          ? `${p.seconds}/${p.second_threshold} seconds`
                          : `${p.args} arguments${p.closes ? ` · closes ${p.closes}` : ''}`}
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

        {tier && tier !== 'unverified' && (
          <Pressable
            onPress={() => router.push('/debates/new')}
            style={[styles.newBtn, { backgroundColor: colors.evidence }]}
          >
            <ThemedText type="smallBold">Propose an issue</ThemedText>
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

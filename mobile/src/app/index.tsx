import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';

interface StackedOffice {
  id: string;
  title: string;
  level: string;
  seat_count: number;
  race_id: string | null;
  jurisdiction_id: string;
  jurisdiction_name: string;
}

interface BallotResponse {
  jurisdictionId: string;
  jurisdictions: { id: string; name: string }[];
  offices: StackedOffice[];
}

export default function BallotScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [data, setData] = useState<BallotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (!hasSession()) await ensureSession();
      const res = await get<BallotResponse>('/api/ballot');
      setData(res);
    } catch {
      setError('Could not load the ballot. Pull down to try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Your ballot
        </ThemedText>
        {!data && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}
        {data?.jurisdictions.map((j) => {
          const rows = data.offices.filter((o) => o.jurisdiction_id === j.id);
          return (
            <View key={j.id} style={styles.section}>
              <ThemedText type="smallBold" style={styles.groupHeading}>
                {j.name}
              </ThemedText>
              {rows.map((o) => (
                <View
                  key={o.id}
                  style={[styles.seatRow, { backgroundColor: colors.backgroundElement }]}
                >
                  <ThemedText style={styles.seatTitle}>{o.title}</ThemedText>
                  <View
                    style={[
                      styles.chip,
                      { borderColor: o.race_id ? colors.evidence : colors.textSecondary },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: o.race_id ? colors.evidence : colors.textSecondary }}
                    >
                      {o.race_id ? 'Tracked' : 'Not yet tracked'}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  section: { gap: Spacing.two },
  groupHeading: { marginTop: Spacing.two },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  seatTitle: { flex: 1, marginRight: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
});

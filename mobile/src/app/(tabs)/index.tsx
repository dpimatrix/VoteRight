import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';
import { ensureSession, get, hasSession } from '@/services/api';

const VISIT_KEY = 'voteright_visit_jurisdiction';

interface StackedOffice {
  id: string;
  title: string;
  level: string;
  seat_count: number;
  race_id: string | null;
  jurisdiction_id: string;
  jurisdiction_name: string;
}

interface Jurisdiction {
  ocdId: string;
  name: string;
}

interface BallotResponse {
  jurisdictionId: string | null;
  residenceId: string | null;
  residenceName: string | null;
  residenceLevel: string | null;
  jurisdictions: { id: string; name: string }[];
  offices: StackedOffice[];
  hasUnnarrowedDistrictSeats: boolean;
  visiting: Jurisdiction | null;
  browsable: {
    ocd_id: string;
    name: string;
    level: string;
    group_name: string;
    sort_key: string;
    isCurrent: boolean;
  }[];
}

export default function BallotScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const [data, setData] = useState<BallotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (!hasSession()) await ensureSession();
      const visitId = await AsyncStorage.getItem(VISIT_KEY);
      const res = await get<BallotResponse>(`/api/ballot${visitId ? `?visit=${visitId}` : ''}`);
      setData(res);
    } catch (e) {
      console.error('Ballot load failed:', e);
      setError(d.ballot_load_error);
    }
  }, [d.ballot_load_error]);

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

  async function visit(ocdId: string | null) {
    if (ocdId) await AsyncStorage.setItem(VISIT_KEY, ocdId);
    else await AsyncStorage.removeItem(VISIT_KEY);
    setShowPicker(false);
    setData(null);
    await load();
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>
            {d.ballot_title}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.settingsBtn, { backgroundColor: colors.backgroundElement }]}
          >
            <ThemedText type="smallBold">⚙</ThemedText>
          </Pressable>
        </View>
        {!data && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {data?.residenceId && data.residenceName && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/verify',
                params: { currentResidence: data.residenceName ?? '' },
              })
            }
          >
            <ThemedText type="small" themeColor="textSecondary">
              {d.verified_as} {data.residenceName} · <ThemedText type="linkPrimary">{d.change_address}</ThemedText>
            </ThemedText>
          </Pressable>
        )}

        {data && !data.jurisdictionId && (
          <View style={[styles.visitBanner, { borderColor: colors.evidence }]}>
            <ThemedText type="small">{d.no_residence_note}</ThemedText>
            <Pressable onPress={() => router.push('/verify')}>
              <ThemedText type="linkPrimary">{d.verify_address_btn}</ThemedText>
            </Pressable>
          </View>
        )}

        {data?.visiting && (
          <View style={[styles.visitBanner, { borderColor: colors.evidence }]}>
            <ThemedText type="small">{tf(d.visitor_note, { name: data.visiting.name })}</ThemedText>
            <Pressable onPress={() => visit(null)}>
              <ThemedText type="linkPrimary">{d.return_to_ballot}</ThemedText>
            </Pressable>
          </View>
        )}

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
                      {o.race_id ? d.seat_tracked : d.seat_not_tracked}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {data && <ThemedText type="small" themeColor="textSecondary">{d.ballot_unscored_note}</ThemedText>}
        {data && !data.visiting && data.residenceLevel === 'state' && (
          <ThemedText type="small" themeColor="textSecondary">
            {d.ballot_state_only_note}
          </ThemedText>
        )}
        {data && data.hasUnnarrowedDistrictSeats && (
          <ThemedText type="small" themeColor="textSecondary">
            {d.ballot_districts_note}
          </ThemedText>
        )}
        {data && <ThemedText type="small" themeColor="textSecondary">{d.ballot_addr_note}</ThemedText>}

        {data && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Pressable onPress={() => setShowPicker((s) => !s)}>
              <ThemedText type="smallBold">{d.browse_jurisdiction_h}</ThemedText>
            </Pressable>
            {showPicker && (
              <View style={{ gap: Spacing.two }}>
                <ThemedText type="small" style={{ opacity: 0.7 }}>{d.united_states}</ThemedText>
                {Object.entries(
                  data.browsable.reduce<Record<string, typeof data.browsable>>((groups, j) => {
                    (groups[j.group_name] ??= []).push(j);
                    return groups;
                  }, {}),
                ).map(([groupName, items]) => (
                  <View key={groupName} style={{ gap: Spacing.two }}>
                    <ThemedText type="small" style={{ opacity: 0.55, marginLeft: Spacing.two }}>
                      {groupName}
                    </ThemedText>
                    <View style={styles.pickerRow}>
                      {items.map((j) => (
                        <Pressable
                          key={j.ocd_id}
                          disabled={j.isCurrent}
                          onPress={() => visit(j.ocd_id)}
                          style={[
                            styles.pickerChip,
                            { borderColor: colors.textSecondary },
                            j.level === "municipal" && { marginLeft: Spacing.three },
                            j.isCurrent && { opacity: 0.4 },
                          ]}
                        >
                          <ThemedText type="small">
                            {j.level === "municipal" ? `↳ ${j.name}` : j.name}
                            {j.isCurrent ? d.current_suffix : ""}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginBottom: Spacing.two },
  settingsBtn: { borderRadius: Spacing.four, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginTop: Spacing.five },
  visitBanner: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
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
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pickerChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
});

import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: "Follow your device's setting" },
  { value: 'light', label: 'Light', description: 'Always use the light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
];

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const { preference, setPreference } = useThemePreference();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ThemedText type="smallBold">Appearance</ThemedText>
        <View style={styles.group}>
          {OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setPreference(o.value)}
              style={[
                styles.row,
                { backgroundColor: colors.backgroundElement, borderColor: colors.evidence },
                preference === o.value && styles.rowSelected,
              ]}
            >
              <View style={styles.rowText}>
                <ThemedText type="small">{o.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {o.description}
                </ThemedText>
              </View>
              {preference === o.value && (
                <ThemedText type="smallBold" style={{ color: colors.evidence }}>
                  ✓
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  group: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: { borderWidth: 1 },
  rowText: { gap: Spacing.half },
});

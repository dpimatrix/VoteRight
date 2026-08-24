import type { Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { WEB_URL } from '@/constants/Config';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference, type ThemePreference } from '@/hooks/theme-preference';
import { useLanguagePreference, type LanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const { preference, setPreference } = useThemePreference();
  const { preference: langPreference, setPreference: setLangPreference, lang } = useLanguagePreference();
  const d = t(lang);

  const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
    { value: 'system', label: d.theme_system, description: d.theme_system_desc },
    { value: 'light', label: d.theme_light, description: d.theme_light_desc },
    { value: 'dark', label: d.theme_dark, description: d.theme_dark_desc },
  ];

  const LANG_OPTIONS: { value: LanguagePreference; label: string; description: string }[] = [
    { value: 'system', label: d.lang_system, description: d.lang_system_desc },
    { value: 'en', label: d.lang_en, description: d.lang_en_desc },
    { value: 'es', label: d.lang_es, description: d.lang_es_desc },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ThemedText type="smallBold">{d.appearance_h}</ThemedText>
        <View style={styles.group}>
          {THEME_OPTIONS.map((o) => (
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

        <ThemedText type="smallBold">{d.language_h}</ThemedText>
        <View style={styles.group}>
          {LANG_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => setLangPreference(o.value)}
              style={[
                styles.row,
                { backgroundColor: colors.backgroundElement, borderColor: colors.evidence },
                langPreference === o.value && styles.rowSelected,
              ]}
            >
              <View style={styles.rowText}>
                <ThemedText type="small">{o.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {o.description}
                </ThemedText>
              </View>
              {langPreference === o.value && (
                <ThemedText type="smallBold" style={{ color: colors.evidence }}>
                  ✓
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>

        {/* Membership/donations (2026-08-24, owner's explicit call: open
            web's existing Stripe Billing checkout in-app rather than build
            a native payment sheet -- avoids Apple's In-App Purchase
            requirement for this category, which VoteRight likely can't
            cleanly exempt from without confirmed nonprofit status,
            ARCHITECTURE.md §13 item 2, still open). Real, deliberately
            unsolved gap: this in-app browser sheet is a SEPARATE cookie
            jar from the native app's own X-VoteRight-Session identity, so
            a subscription bought here is tied to whatever new anonymous
            web session gets minted, not this device's own app identity --
            mobile has no way to show "you're a Patron" or manage the
            subscription in-app as a result. Fine for the ask actually
            made (get a working, compliant path to pay at all); real
            identity unification would be its own separate piece of work. */}
        <ThemedText type="smallBold">{d.sub_h}</ThemedText>
        <View style={styles.group}>
          <ExternalLink href={`${WEB_URL}/subscribe?lang=${lang}` as Href & string} style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small">{d.sub_h}</ThemedText>
          </ExternalLink>
        </View>

        {/* Web's /verify already links to /privacy right under the address
            form; mobile had no reference to the privacy policy anywhere at
            all until now (found 2026-08-24 auditing web/mobile parity) --
            both app stores generally expect an in-app privacy-policy link
            for an app collecting address data, so this isn't just a UX
            nicety. Opens the same web page (ExternalLink's in-app browser
            sheet on native) rather than duplicating the policy text
            natively -- one copy to keep accurate, not two. */}
        <ThemedText type="smallBold">{d.about_h}</ThemedText>
        <View style={styles.group}>
          {/* Runtime-built external URL -- expo-router's typed routes only
              statically recognize literal href strings, not one built from
              WEB_URL at runtime, even though it's a perfectly valid href. */}
          <ExternalLink href={`${WEB_URL}/privacy?lang=${lang}` as Href & string} style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="small">{d.privacy_link}</ThemedText>
          </ExternalLink>
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

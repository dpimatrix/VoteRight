import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

export default function VerifyScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const { currentResidence } = useLocalSearchParams<{ currentResidence?: string }>();
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ outcome: 'ok' | 'bad_format' | 'no_match' | 'outside' | 'resolver_unavailable' }>(
        '/api/verify',
        { address },
      );
      if (res.outcome === 'ok') {
        router.back();
      } else if (res.outcome === 'outside') {
        setError(d.outside_error);
      } else if (res.outcome === 'resolver_unavailable') {
        setError(d.resolver_unavailable_error);
      } else {
        setError(d.no_match_error);
      }
    } catch (e) {
      console.error('Verify failed:', e);
      setError(d.generic_error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        {d.verify_title}
      </ThemedText>
      {currentResidence ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {tf(d.currently_verified_as, { name: currentResidence })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {d.reverify_note}
          </ThemedText>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {d.unverified_note}
        </ThemedText>
      )}
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder={d.address_placeholder}
        placeholderTextColor={colors.textSecondary}
        autoComplete="street-address"
        // Belt-and-suspenders (2026-08-22): autoComplete alone is documented as
        // sufficient cross-platform, but real-device testing found iOS QuickType
        // suggestions not appearing -- textContentType is iOS's own native prop
        // for this and takes precedence when both are set, so this is a safe,
        // free hedge against a version-specific autoComplete->iOS mapping gap
        // rather than a guess at the "right" prop. If suggestions still don't
        // appear after this, the device itself likely has no saved address data
        // (Contacts/Safari/Apple ID) for iOS to offer -- a device-data issue,
        // not a code one.
        textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
        style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
      />
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      <Pressable
        disabled={busy || address.trim().length < 12}
        onPress={submit}
        style={[
          styles.submitBtn,
          { backgroundColor: busy || address.trim().length < 12 ? colors.backgroundElement : colors.evidence },
        ]}
      >
        <ThemedText type="smallBold">{d.verify_btn}</ThemedText>
      </Pressable>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  error: { color: '#C0392B' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

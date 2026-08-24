import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { WEB_URL } from '@/constants/Config';
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
  // Set on a successful verify, holding the address just typed -- never
  // sent anywhere beyond the one /api/verify call already made, never
  // stored (the resolver only ever persists the resolved jurisdiction,
  // see jurisdictions.ts's own "raw address is still never stored" note).
  // Shown once here, this screen only, then gone -- the Ballot tab's
  // persistent label only ever shows the jurisdiction + verified date,
  // by design (owner's own call, 2026-08-24, over storing it durably).
  const [justVerified, setJustVerified] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ outcome: 'ok' | 'bad_format' | 'no_match' | 'outside' | 'resolver_unavailable' }>(
        '/api/verify',
        { address },
      );
      if (res.outcome === 'ok') {
        setJustVerified(address);
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

  if (justVerified) {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {d.verify_success_h}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {justVerified}
        </ThemedText>
        <Pressable onPress={() => router.back()} style={[styles.submitBtn, { backgroundColor: colors.evidence }]}>
          <ThemedText type="smallBold">{d.continue_btn}</ThemedText>
        </Pressable>
      </KeyboardAwareScreen>
    );
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
      <View style={styles.inputWrap}>
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
        {/* Owner-requested (2026-08-23): the native placeholder disappears the
            moment typing starts, losing the format example right when it's
            most useful -- kept as a persistent hint anchored inside the
            bottom of the field instead, shown once there's real text so it
            never overlaps the native placeholder itself. pointerEvents:
            'none' (via style, not the deprecated prop) so taps here still
            focus the input underneath. */}
        {address.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.inlineHint}>
            {d.address_placeholder}
          </ThemedText>
        )}
      </View>
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
      {/* Matches web's /verify, which links to /privacy right under this
          same form -- mobile had no reference to the privacy policy
          anywhere until now (2026-08-24). Also on /settings for a durable
          home outside this one moment. */}
      <ExternalLink href={`${WEB_URL}/privacy?lang=${lang}` as Href & string}>
        <ThemedText type="small" themeColor="textSecondary">
          {d.privacy_link}
        </ThemedText>
      </ExternalLink>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  inputWrap: { position: 'relative' },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: 34, // extra room below the typed text for inlineHint
    fontSize: 16,
  },
  inlineHint: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 10,
    fontSize: 12,
    pointerEvents: 'none',
  },
  error: { color: '#C0392B' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});

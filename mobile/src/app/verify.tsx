import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function VerifyScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ outcome: 'ok' | 'bad_format' | 'no_match' | 'outside' }>('/api/verify', { address });
      if (res.outcome === 'ok') {
        router.back();
      } else if (res.outcome === 'outside') {
        setError('That address is outside Montgomery County.');
      } else {
        setError('Could not match that address — check the street number, name, and "MD".');
      }
    } catch (e) {
      console.error('Verify failed:', e);
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Verify your address
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Proposing, seconding, and arguing are limited to Montgomery County residents. Your address is used only
        to confirm your jurisdiction — never matched against any voter file.
      </ThemedText>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St, Rockville, MD"
        placeholderTextColor={colors.textSecondary}
        autoComplete="street-address"
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
        <ThemedText type="smallBold">Verify</ThemedText>
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

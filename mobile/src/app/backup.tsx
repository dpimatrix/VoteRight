import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';
import {
  ensureSigningKey,
  exportEncryptedBackup,
  importEncryptedBackup,
  type EncryptedBackup,
} from '@/lib/signing';

/* Native counterpart to web's KeySettings.tsx -- same underlying mechanism
   (see signing.ts's own header comment), a different UI shape because
   mobile has no window.confirm()/<input type=file>/browser download.
   Revoke/rotate and the anomaly-review banner are NOT ported here --
   web's own scope for this pass was specifically the reinstall-wipes-
   your-identity gap, not the full KeySettings surface; those stay a
   real, separate follow-up. */
export default function BackupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);

  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'export' | 'import'>('idle');
  const [passphrase, setPassphrase] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSigningKey().then(({ fingerprint: fp }) => setFingerprint(fp));
  }, []);

  function resetForm() {
    setMode('idle');
    setPassphrase('');
    setPickedFile(null);
    setError(null);
  }

  async function doExport() {
    setBusy(true);
    setError(null);
    try {
      const backup = await exportEncryptedBackup(passphrase);
      // Written to cache, not kept there -- Sharing.shareAsync hands it to
      // the OS share sheet immediately below so the user picks where it
      // actually ends up (Files, Drive, email, etc.). It can't just live
      // in this app's own storage; that's exactly what a reinstall wipes.
      const file = new File(Paths.cache, `voteright-key-backup-${Date.now()}.json`);
      file.create();
      file.write(JSON.stringify(backup));
      // Only claim success if the file actually had somewhere to go --
      // sharing being unavailable (rare on a real device, but real on some
      // simulators/emulators) would otherwise leave the backup stranded
      // in this app's own cache with no way for the user to retrieve it,
      // while still seeing "Backup ready."
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable on this device');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: d.key_export_share_title });
      setMessage(d.key_export_ok);
      resetForm();
    } catch (e) {
      console.error('Backup export failed:', e);
      setError(d.err_processing_failed);
    } finally {
      setBusy(false);
    }
  }

  async function pickImportFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    setPickedFile({ uri: result.assets[0].uri, name: result.assets[0].name });
  }

  async function doImport() {
    if (!pickedFile) return;
    setBusy(true);
    setError(null);
    try {
      const backup = (await new File(pickedFile.uri).json()) as EncryptedBackup;
      const { recovered } = await importEncryptedBackup(backup, passphrase);
      const { fingerprint: fp } = await ensureSigningKey();
      setFingerprint(fp);
      if (recovered) {
        // The recovered identity's priorities/debate history/subscription
        // now live under a different user id than this screen loaded
        // with -- same reasoning as web's own full-page reload after a
        // real recovery (KeySettings.tsx). Routing back to the Ballot tab
        // (which already re-fetches on focus, see use-retry-on-foreground
        // and every (tabs) screen's own useFocusEffect) is mobile's
        // equivalent of that reload, not a shortcut around it.
        setMessage(d.key_import_recovered_ok);
        resetForm();
        setTimeout(() => router.replace('/'), 1500);
        return;
      }
      setMessage(d.key_import_ok);
      resetForm();
    } catch (e) {
      console.error('Backup import failed:', e);
      setError(d.key_import_wrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        {d.key_h}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {d.key_p}
      </ThemedText>
      {fingerprint && (
        <ThemedText type="small" themeColor="textSecondary">
          {d.key_fingerprint_label}: {fingerprint}
        </ThemedText>
      )}
      {message && <ThemedText type="small">{message}</ThemedText>}
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {mode === 'idle' && (
        // Neutral border, not colors.evidence -- same fix as DebateComposer's
        // video Record/Choose buttons earlier this pass: these are two
        // independent one-tap actions (each opens its own sub-form), not a
        // persistent toggle, so neither should look "selected" while idle.
        // Missed here on first pass despite fixing the identical pattern
        // elsewhere in the same session -- caught on review, not live.
        <View style={styles.row}>
          <Pressable onPress={() => setMode('export')} style={[styles.btn, { borderColor: colors.textSecondary }]}>
            <ThemedText type="small">{d.key_export_btn}</ThemedText>
          </Pressable>
          <Pressable onPress={() => setMode('import')} style={[styles.btn, { borderColor: colors.textSecondary }]}>
            <ThemedText type="small">{d.key_import_btn}</ThemedText>
          </Pressable>
        </View>
      )}

      {mode === 'export' && (
        <View style={styles.group}>
          <ThemedText type="small" themeColor="textSecondary">
            {d.key_export_p}
          </ThemedText>
          <TextInput
            value={passphrase}
            onChangeText={setPassphrase}
            placeholder={d.key_passphrase_ph}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
          />
          <Pressable
            disabled={busy || passphrase.length < 8}
            onPress={doExport}
            style={[
              styles.submitBtn,
              { backgroundColor: busy || passphrase.length < 8 ? colors.backgroundElement : colors.evidence },
            ]}
          >
            {busy ? <ActivityIndicator /> : <ThemedText type="smallBold">{d.key_export_go}</ThemedText>}
          </Pressable>
        </View>
      )}

      {mode === 'import' && (
        <View style={styles.group}>
          <Pressable onPress={pickImportFile} style={[styles.btn, { borderColor: colors.textSecondary }]}>
            <ThemedText type="small">{pickedFile ? pickedFile.name : d.key_import_file_label}</ThemedText>
          </Pressable>
          <TextInput
            value={passphrase}
            onChangeText={setPassphrase}
            placeholder={d.key_passphrase_ph}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
          />
          <Pressable
            disabled={busy || !pickedFile || passphrase.length === 0}
            onPress={doImport}
            style={[
              styles.submitBtn,
              {
                backgroundColor:
                  busy || !pickedFile || passphrase.length === 0 ? colors.backgroundElement : colors.evidence,
              },
            ]}
          >
            {busy ? <ActivityIndicator /> : <ThemedText type="smallBold">{d.key_import_go}</ThemedText>}
          </Pressable>
        </View>
      )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  group: { gap: Spacing.two },
  btn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  error: { color: '#C0392B' },
});

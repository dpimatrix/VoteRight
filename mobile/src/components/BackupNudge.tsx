import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Dict } from '@/lib/i18n';

const DISMISSED_KEY = 'voteright_backup_prompt_dismissed';

/* Proactive nudge (2026-08-24) -- mobile counterpart to web's
   BackupPrompt.tsx, same reasoning: the backup/recovery screen (backup.tsx)
   already existed, but nothing told a user to actually use it before
   losing everything to a reinstall. Shown right after payment_verified
   succeeds -- see verify-payment.tsx's own call site -- since that's the
   moment the stakes (a real charge) are concrete and freshest.

   Dismissal is a plain AsyncStorage flag, not tracked server-side, for the
   same reason web's isn't: there's no server-side signal for "did this
   device actually complete a backup" to begin with (the passphrase and
   the resulting file both stay client-side, by design). This only ever
   tracks "has this device seen and dismissed the nudge" -- a genuinely
   new device (a real reinstall, or a second phone) correctly sees it
   again, which is exactly the case where a backup matters most. */
export function BackupNudge({
  d,
}: {
  d: Pick<Dict, 'backup_nudge_h' | 'backup_nudge_p' | 'backup_nudge_btn' | 'backup_nudge_dismiss'>;
}) {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [dismissed, setDismissed] = useState(true); // hidden until the AsyncStorage check below resolves, avoiding a flash

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, []);

  function dismiss() {
    AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => {});
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <View style={[styles.box, { borderColor: colors.evidence, backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold">{d.backup_nudge_h}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {d.backup_nudge_p}
      </ThemedText>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            dismiss();
            router.push('/backup' as Href);
          }}
        >
          <ThemedText type="linkPrimary">{d.backup_nudge_btn}</ThemedText>
        </Pressable>
        <Pressable onPress={dismiss}>
          <ThemedText type="linkPrimary">{d.backup_nudge_dismiss}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
});

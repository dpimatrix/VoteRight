import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf } from '@/lib/i18n';

interface NotificationRow {
  id: string;
  type: 'thread_closed' | 'ctq_eligible';
  proposal_id: string | null;
  proposal_title: string | null;
  thread_id: string | null;
  detail: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: NotificationRow[];
  unread: number;
  email: string | null;
  emailVerified: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!hasSession()) await ensureSession();
    const res = await get<NotificationsResponse>('/api/notifications');
    setData(res);
    setEmailInput(res.email ?? '');
  }, []);

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

  async function saveEmail() {
    setBusy(true);
    try {
      await post('/api/notifications/email', { email: emailInput.trim() });
      await load();
    } catch (e) {
      console.error('Saving notification email failed:', e);
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      await post(`/api/notifications/${id}/read`, {});
      await load();
    } catch (e) {
      console.error('Marking notification read failed:', e);
    }
  }

  async function markAllRead() {
    try {
      await post('/api/notifications/read-all', {});
      await load();
    } catch (e) {
      console.error('Marking all notifications read failed:', e);
    }
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="smallBold">{d.notif_email_h}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.notif_email_note}
        </ThemedText>
        {data.email && data.emailVerified && (
          <ThemedText type="small">{tf(d.notif_email_verified, { email: data.email })}</ThemedText>
        )}
        {data.email && !data.emailVerified && (
          <ThemedText type="small">{tf(d.notif_email_pending, { email: data.email })}</ThemedText>
        )}
        <View style={styles.sideRow}>
          <TextInput
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder={d.notif_email_ph}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
          />
          <Pressable disabled={busy} onPress={saveEmail} style={[styles.actionBtn, { backgroundColor: colors.evidence }]}>
            <ThemedText type="smallBold">{d.notif_email_save}</ThemedText>
          </Pressable>
        </View>
      </View>

      {data.notifications.length > 0 && (
        <Pressable onPress={markAllRead}>
          <ThemedText type="linkPrimary">{d.notif_mark_all}</ThemedText>
        </Pressable>
      )}

      {data.notifications.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {d.notif_empty}
        </ThemedText>
      )}
      {data.notifications.map((n) => (
        <View key={n.id} style={[styles.card, { backgroundColor: colors.backgroundElement, opacity: n.read_at ? 0.7 : 1 }]}>
          <ThemedText type="small">
            {n.type === 'thread_closed'
              ? tf(d.notif_thread_closed, { title: n.proposal_title ?? '' })
              : tf(d.notif_ctq_eligible, { title: n.proposal_title ?? '' })}
          </ThemedText>
          {n.detail && (
            <ThemedText type="small" themeColor="textSecondary">
              {n.detail}
            </ThemedText>
          )}
          <View style={styles.sideRow}>
            {n.proposal_id && (
              <Pressable onPress={() => router.push(`/debates/${n.proposal_id}` as Href)}>
                <ThemedText type="linkPrimary">{d.notif_view_debate} →</ThemedText>
              </Pressable>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {new Date(n.created_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US')}
            </ThemedText>
            {!n.read_at && (
              <Pressable onPress={() => markRead(n.id)}>
                <ThemedText type="linkPrimary">{d.notif_mark_read}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  spinner: { marginTop: Spacing.five },
  content: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  sideRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
  input: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  actionBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, alignItems: 'center' },
});

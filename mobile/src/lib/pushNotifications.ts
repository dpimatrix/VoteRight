import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureSession, hasSession, post } from '@/services/api';

/* Mobile push registration (2026-08-24) -- Expo's own free push service,
   no third-party vendor, no new env var to configure: the project's own
   EAS projectId (already set in app.json's extra.eas) is all
   getExpoPushTokenAsync needs. Best-effort throughout -- called once from
   the root layout on boot; a permission denial, a simulator with no real
   push capability, or a network hiccup here must never block app startup,
   so every failure path is a silent early return, not a thrown error. */
export async function registerForPushNotifications(): Promise<void> {
  try {
    // Simulators/emulators have no real push capability -- Device.isDevice
    // is Expo's own documented way to detect that before even asking for
    // permission, which would otherwise just fail confusingly later.
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      // Android requires a notification channel to exist before a
      // notification can actually show -- harmless to call on every boot,
      // Expo's own docs note it's idempotent.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      // Only the first denial shows the OS's own rationale dialog -- same
      // "repeat request silently returns denied" behavior DebateComposer's
      // mic/camera permission handling already documents; this call is
      // still safe to make unconditionally since a granted/already-denied
      // status just returns immediately.
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return; // local/dev builds without EAS config -- push simply isn't available
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    // Same "ensure a session exists before the first authenticated call"
    // pattern every other screen's load() already follows -- this runs
    // from the root layout on boot, potentially before anything else has
    // had a chance to mint one on a truly fresh install.
    if (!hasSession()) await ensureSession();
    await post('/api/notifications/push-token', { token });
  } catch (e) {
    console.error('Push notification registration failed:', e);
  }
}

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
/** Shared by the initial boot registration, the rotation listener below, and
    reassociatePushToken() -- every caller ends the same way, posting
    whichever Expo token it has for whichever identity is CURRENT right now
    (services/api.ts's post() reads the session id dynamically at call time,
    not once at import time). */
async function submitPushToken(token: string): Promise<void> {
  // Same "ensure a session exists before the first authenticated call"
  // pattern every other screen's load() already follows -- this can run
  // from the root layout on boot, potentially before anything else has had
  // a chance to mint one on a truly fresh install.
  if (!hasSession()) await ensureSession();
  await post('/api/notifications/push-token', { token });
}

// Last Expo push token this device successfully registered, if any --
// lets reassociatePushToken() re-POST it under a newly-adopted identity
// without needing to ask Expo for a token again.
let lastToken: string | null = null;

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
    lastToken = token;
    await submitPushToken(token);
  } catch (e) {
    console.error('Push notification registration failed:', e);
  }
}

/** Re-POSTs this device's last-known Expo push token under whatever
    identity is current RIGHT NOW -- for call sites (signing.ts's
    importEncryptedBackup, on a successful recovery) that switch the active
    session WITHOUT an app restart. Without this, push_tokens.user_id stays
    pointed at the pre-switch identity until the app happens to fully
    relaunch and registerForPushNotifications() runs again from scratch --
    silently breaking push delivery for the actual current identity in the
    meantime. A no-op if this device never obtained a token to begin with
    (no permission, simulator, no EAS project id, etc.) -- same best-effort
    posture as registration itself. */
export async function reassociatePushToken(): Promise<void> {
  if (!lastToken) return;
  try {
    await submitPushToken(lastToken);
  } catch (e) {
    console.error('Push token re-association failed:', e);
  }
}

/** Expo can rotate a device's underlying native push token at any time
    (documented behavior) -- without reacting to that, an app instance that
    stays alive across a rotation keeps this device's server-side record
    pointed at a now-stale token until the user happens to fully relaunch.
    addPushTokenListener fires with the raw native DevicePushToken, NOT an
    Expo-formatted one (confirmed against the installed SDK's own
    TokenEmitter/getExpoPushTokenAsync source -- see mobile/AGENTS.md's
    warning that Expo's API shouldn't be assumed from training data) -- it
    must be exchanged for a real Expo token via getExpoPushTokenAsync's
    devicePushToken option before this app's backend (which talks to
    Expo's push service, not raw FCM/APNs) can use it. Call once from the
    root layout alongside the initial registration; safe even if that
    initial registration never actually got a token, since the listener
    simply never fires in that case. */
export function subscribeToPushTokenRotation(): () => void {
  const sub = Notifications.addPushTokenListener(async (devicePushToken) => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId, devicePushToken });
      lastToken = token;
      await submitPushToken(token);
    } catch (e) {
      console.error('Push token rotation re-registration failed:', e);
    }
  });
  return () => sub.remove();
}

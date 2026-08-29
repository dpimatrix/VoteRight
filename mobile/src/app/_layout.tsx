import '@/lib/crypto-polyfill';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemePreferenceProvider } from '@/hooks/theme-preference';
import { LanguagePreferenceProvider, useLanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';
import { registerForPushNotifications, subscribeToPushTokenRotation } from '@/lib/pushNotifications';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { lang } = useLanguagePreference();
  const d = t(lang);

  // Once per app boot, best-effort (see pushNotifications.ts's own header
  // comment for why every failure path there is a silent return, never a
  // thrown error that could affect startup). The rotation subscription
  // (2026-08-29) reacts to Expo's own documented token-rotation behavior --
  // without it, a long-running app instance would keep this device's
  // server-side record pointed at a stale token indefinitely. Cleanup on
  // unmount for correctness even though the root layout never actually
  // unmounts in practice.
  useEffect(() => {
    void registerForPushNotifications();
    return subscribeToPushTokenRotation();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="candidates/[id]" options={{ headerShown: true, title: d.title_candidate }} />
        <Stack.Screen name="debates/[id]" options={{ headerShown: true, title: d.title_debate }} />
        <Stack.Screen name="debates/new" options={{ headerShown: true, title: d.title_propose }} />
        <Stack.Screen name="verify" options={{ headerShown: true, title: d.title_verify }} />
        <Stack.Screen name="verify-payment" options={{ headerShown: true, title: d.title_verify_payment }} />
        <Stack.Screen name="referenda/[id]" options={{ headerShown: true, title: d.title_referendum }} />
        <Stack.Screen name="mandates/[id]" options={{ headerShown: true, title: d.title_mandate }} />
        <Stack.Screen name="accountability/list" options={{ headerShown: true, title: d.title_accountability }} />
        <Stack.Screen name="accountability/[id]" options={{ headerShown: true, title: d.title_campaign }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: d.title_settings }} />
        <Stack.Screen name="compare" options={{ headerShown: true, title: d.title_compare }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: d.title_notifications }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguagePreferenceProvider>
      <ThemePreferenceProvider>
        <RootLayoutNav />
      </ThemePreferenceProvider>
    </LanguagePreferenceProvider>
  );
}

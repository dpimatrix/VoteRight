import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="candidates/[id]" options={{ headerShown: true, title: 'Candidate' }} />
        <Stack.Screen name="debates/[id]" options={{ headerShown: true, title: 'Debate' }} />
        <Stack.Screen name="debates/new" options={{ headerShown: true, title: 'Propose an issue' }} />
        <Stack.Screen name="verify" options={{ headerShown: true, title: 'Verify' }} />
        <Stack.Screen name="referenda/[id]" options={{ headerShown: true, title: 'Referendum' }} />
        <Stack.Screen name="mandates/[id]" options={{ headerShown: true, title: 'Mandate' }} />
        <Stack.Screen name="accountability/list" options={{ headerShown: true, title: 'Accountability' }} />
        <Stack.Screen name="accountability/[id]" options={{ headerShown: true, title: 'Campaign' }} />
      </Stack>
    </ThemeProvider>
  );
}

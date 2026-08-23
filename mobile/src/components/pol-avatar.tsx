import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { API_URL } from '@/constants/Config';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// politicians.photo_url is stored root-relative (e.g. "/politicians/glass.png")
// -- the web app resolves that against its own origin for free via <img>, but
// React Native's image loader needs an absolute URI. Resolve it against the
// same API host the app already talks to (see services/api.ts).
const resolvePhotoUrl = (photoUrl: string) =>
  /^https?:\/\//.test(photoUrl) ? photoUrl : `${API_URL}${photoUrl}`;

/** Politician avatar: official portrait when we have one (re-hosted locally,
    same source as web -- see app/public/politicians/ATTRIBUTION.md), monogram
    fallback otherwise. Mirrors app/src/components/PolAvatar.tsx on web so both
    platforms show the same thing. Officeholders get official government
    portraits; challengers stay on the monogram until they provide a photo via
    the D4 questionnaire. */
export function PolAvatar({
  name,
  photoUrl,
  size = 42,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  if (photoUrl) {
    return (
      <Image
        source={{ uri: resolvePhotoUrl(photoUrl) }}
        style={[
          styles.photo,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.textSecondary },
        ]}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[styles.monogram, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.backgroundSelected }]}
      accessible={false}
    >
      <ThemedText type="smallBold">{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

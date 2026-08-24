export default ({ config }) => {
  const isLocal = process.env.APP_ENV === "local";

  return {
    ...config,
    plugins: [...(config.plugins ?? []), "expo-secure-store"],
    name: isLocal ? "VoteRight Local" : "VoteRight",
    android: {
      ...config.android,
      package: isLocal ? "com.dpimatrix.voteright.mobile.local" : "com.dpimatrix.voteright.mobile",
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isLocal ? "com.dpimatrix.voteright.local" : "com.dpimatrix.voteright",
    },
    extra: {
      ...config.extra,
      apiUrl: isLocal ? "http://192.168.86.235:3000" : "https://voteright.dpimatrix.com",
      webUrl: isLocal ? "http://192.168.86.235:3000" : "https://voteright.dpimatrix.com",
      // Own key, separate from web's NEXT_PUBLIC_GOOGLE_PLACES_API_KEY --
      // see Config.ts's own note on why a browser-restricted key can't be
      // reused for a native app. Optional: AddressAutocomplete falls back
      // to a plain text input if this isn't set, same as web's component
      // does. Read from the shell env at `expo start`/`eas build` time,
      // same as EXPO_PUBLIC_* vars would be, just plumbed through `extra`
      // to match this file's own existing apiUrl/webUrl convention
      // instead of introducing a second mechanism.
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY_MOBILE ?? null,
    },
  };
};

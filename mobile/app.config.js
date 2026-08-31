export default ({ config }) => {
  const isLocal = process.env.APP_ENV === "local";

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      "expo-secure-store",
      // Audio/video debate arguments (2026-08-24, closing a real
      // web/mobile parity gap -- web already supported both via a plain
      // <input type="file" capture>). Custom permission strings instead
      // of each plugin's generic default, explaining the actual VoteRight
      // reason rather than a bare "access your microphone/camera".
      ["expo-audio", { microphonePermission: "VoteRight needs microphone access to record an audio debate argument." }],
      [
        "expo-image-picker",
        {
          cameraPermission: "VoteRight needs camera access to record a video debate argument.",
          microphonePermission: "VoteRight needs microphone access to record a video debate argument.",
          photosPermission: "VoteRight needs photo library access to choose an existing video for a debate argument.",
        },
      ],
      // In-composer preview playback (2026-08-24, owner feedback: no way to
      // review a video before posting it). No config options needed for
      // plain local-file playback -- only background playback/PiP would
      // need any, neither of which applies to a short preview.
      "expo-video",
      // Identity backup/recovery (2026-08-24, closing the reinstall-wipes-
      // your-identity gap the owner ran into directly). expo-sharing hands
      // the encrypted backup file to the OS share sheet so it can leave
      // the device (Files/Drive/email/etc.) -- it can't just live in
      // app storage, that's exactly what gets wiped on a reinstall too.
      "expo-sharing",
      // Debate notifications (2026-08-24) -- Expo's own free push service,
      // no third-party vendor. No custom icon/sound config: the platform
      // defaults are fine for a first pass, and a mis-sized/missing custom
      // icon silently fails on Android in a way that's hard to debug
      // remotely, not worth the risk for this.
      "expo-notifications",
    ],
    name: isLocal ? "VoteRight Local" : "VoteRight",
    android: {
      ...config.android,
      package: isLocal ? "com.dpimatrix.voteright.mobile.local" : "com.dpimatrix.voteright.mobile",
      // FCM push credentials (2026-08-31) -- closes a real gap found live
      // testing notifications on Android: registerForPushNotifications()
      // failed every single time with "Unable to get Firebase Messaging
      // instance... Default FirebaseApp is not initialized", because this
      // project never had Firebase/FCM configured at all -- no
      // google-services.json anywhere, no reference to it in any config
      // file. The error was caught (pushNotifications.ts's own try/catch),
      // so it couldn't crash the app outright, but RN's dev-mode LogBox
      // turns any console.error into a full-screen overlay, which is
      // functionally indistinguishable from a crash on every single launch.
      // Kept out of git (see mobile/.gitignore) on the owner's own call,
      // even though Google's own guidance is that this file is safe for
      // public repos (client identifiers, not a private key) -- matches
      // this project's general preference for config over commits. Sourced
      // from an EAS file-type environment variable for cloud builds
      // (`eas env:create --type file --name GOOGLE_SERVICES_JSON`),
      // falling back to a real local copy in the project root for
      // `expo start`/local builds. Only registered in Firebase under the
      // PRODUCTION package name above -- a `development-local`
      // (APP_ENV=local) build's own `.mobile.local` package won't match
      // this file's package_name and would need its own separate Firebase
      // Android app registration if local push testing is ever needed.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
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

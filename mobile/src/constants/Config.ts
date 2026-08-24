import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  webUrl?: string;
  googlePlacesApiKey?: string;
};

export const API_URL = extra.apiUrl ?? "https://voteright-dpimatrix.vercel.app";
export const WEB_URL = extra.webUrl ?? API_URL;
// Separate key from web's own NEXT_PUBLIC_GOOGLE_PLACES_API_KEY -- a
// browser key is normally restricted by HTTP referrer, which has no
// equivalent for a native app (Android needs package name + SHA-1
// fingerprint, iOS needs bundle ID); reusing web's key here wouldn't
// actually work even if it were wired through. Optional -- AddressAutocomplete
// degrades to a plain text input if unset, same as web's own component
// does for NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.
export const GOOGLE_PLACES_API_KEY = extra.googlePlacesApiKey ?? null;

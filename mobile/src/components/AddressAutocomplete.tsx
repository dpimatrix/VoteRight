import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GOOGLE_PLACES_API_KEY } from '@/constants/Config';
import { Spacing, type ThemeColor } from '@/constants/theme';

/* Predictive address autocomplete on /verify -- mobile counterpart to
   app/src/components/AddressAutocomplete.tsx (web), built 2026-08-24 to
   close a real web/mobile parity gap (web had this, mobile's address
   field was a plain TextInput with OS-level autofill only). Same narrow
   blast-radius design as web's: this ONLY drives the on-screen typing
   experience. Verification's actual authority is completely unchanged --
   resolveJurisdiction's Census geocoder call still happens server-side at
   submit, exactly as before; picking a suggestion here just fills the
   same controlled `value` the parent's own submit already sends.

   Renders as a plain TextInput (identical to what verify.tsx had before
   this) if GOOGLE_PLACES_API_KEY isn't configured -- verification still
   works either way, this is a pure UX layer, never a hard dependency.
   Unlike web, mobile has no CORS restriction to work around (native fetch
   isn't browser-sandboxed), so this hits the same Places API (New) REST
   endpoints directly with no extra plumbing.

   Session-token pricing note carried over from web verbatim: Places API
   (New) autocomplete keystroke requests are free for a session as long as
   it terminates in a paid follow-up call (Place Details) -- an abandoned
   session instead bills every individual autocomplete request. The
   Details call's formattedAddress is used only to fill the text field
   with a clean string, never treated as authoritative (Census remains the
   real source of truth).

   crypto.randomUUID() is NOT used for the session token -- Hermes (RN's
   JS engine) has no native Web Crypto, and this project's own
   crypto-polyfill.ts only installs getRandomValues, not randomUUID (a
   real gap found live 2026-08-23 building signing.ts's own key
   generation). expo-crypto's own Crypto.randomUUID() is called directly
   instead, sidestepping the gap entirely rather than assuming the
   global polyfill covers this too. */

const API_KEY = GOOGLE_PLACES_API_KEY;
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DEBOUNCE_MS = 250;
const MIN_CHARS = 4;

interface Suggestion {
  placeId: string;
  text: string;
}

async function fetchPlaceDetails(placeId: string, sessionToken: string): Promise<string | null> {
  try {
    const u = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
    u.searchParams.set('sessionToken', sessionToken);
    const res = await fetch(u.toString(), {
      headers: { 'X-Goog-Api-Key': API_KEY!, 'X-Goog-FieldMask': 'formattedAddress' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { formattedAddress?: string };
    return data.formattedAddress ?? null;
  } catch {
    return null; // never block submission on a suggestion-service hiccup
  }
}

export function AddressAutocomplete({
  value,
  onChangeText,
  placeholder,
  colors,
  inputStyle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: Record<ThemeColor, string>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionToken = useRef<string>(Crypto.randomUUID());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (!API_KEY) {
    // Graceful degradation: same controlled field, no suggestions --
    // resolveJurisdiction is unaffected either way.
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoComplete="street-address"
        textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
        style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }, inputStyle]}
      />
    );
  }

  function onChange(v: string) {
    onChangeText(v);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (v.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(AUTOCOMPLETE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY!,
            'X-Goog-FieldMask': 'suggestions.placePrediction.text.text,suggestions.placePrediction.placeId',
          },
          body: JSON.stringify({ input: v, sessionToken: sessionToken.current, includedRegionCodes: ['us'] }),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[];
        };
        const parsed = (data.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is { placeId: string; text: { text: string } } => !!p?.placeId && !!p?.text?.text)
          .map((p) => ({ placeId: p.placeId, text: p.text.text }));
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
      } catch {
        // A suggestion-fetch failure just means no dropdown this keystroke
        // -- the user can keep typing normally, submission is unaffected.
      }
    }, DEBOUNCE_MS);
  }

  async function pick(s: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    const formatted = await fetchPlaceDetails(s.placeId, sessionToken.current);
    onChangeText(formatted ?? s.text);
    sessionToken.current = Crypto.randomUUID(); // next typing session gets its own token
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        // No blur-delay hack needed here the way web's onMouseDown workaround
        // was (see web's own AddressAutocomplete.tsx) -- the parent
        // KeyboardAwareScreen's ScrollView already sets
        // keyboardShouldPersistTaps="handled", which is RN's own built-in
        // fix for exactly this blur-before-tap ordering problem: a
        // suggestion's onPress still fires correctly even though this
        // closes the dropdown on blur first.
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoComplete="street-address"
        textContentType={Platform.OS === 'ios' ? 'fullStreetAddress' : undefined}
        style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }, inputStyle]}
      />
      {open && suggestions.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.textSecondary }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s.placeId}
              onPress={() => pick(s)}
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.backgroundElement }]}
            >
              <ThemedText type="small">{s.text}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.half,
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    zIndex: 2,
    // A real dropdown needs to render above whatever's below it in the
    // scroll content -- elevation is Android's own equivalent of iOS's
    // shadow-based stacking, RN's zIndex alone isn't reliably enough
    // there.
    elevation: 4,
  },
  suggestion: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

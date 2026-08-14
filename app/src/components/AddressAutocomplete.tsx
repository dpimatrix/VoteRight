"use client";

import { useEffect, useRef, useState } from "react";

/* Predictive address autocomplete on /verify -- owner-approved reversal of
   the original browser-native-only privacy decision (see lib/debates.ts'
   own comment on that history), after real testing showed the bare field
   felt incomplete. Deliberately narrow blast radius: this component ONLY
   drives the on-screen typing experience. The actual address resolution
   this project treats as authoritative is completely unchanged -- it still
   goes through resolveJurisdiction's Census geocoder + Montgomery ArcGIS
   lookups server-side at submit, exactly as before. Selecting a suggestion
   here just fills the same `name="address"` text field the native
   <form method="post" action="/api/verify"> already posts, so submission
   itself needed zero changes either.

   Renders as a PLAIN text input (no fetch calls at all) if
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY isn't set -- verification still works
   either way, this is a pure UX enhancement layered on top, never a hard
   dependency. */

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DEBOUNCE_MS = 250;
const MIN_CHARS = 4;

interface Suggestion {
  placeId: string;
  text: string;
}

// Places API (New) autocomplete session pricing (docs, verified live this
// session): all the keystroke-driven Autocomplete requests in a session are
// free as long as the session terminates in a paid follow-up call (Place
// Details or Address Validation) -- an ABANDONED session (never terminated)
// instead bills every individual Autocomplete request. This project's own
// resolveJurisdiction doesn't need anything from Google's Place Details at
// all (the Census geocoder remains the real source of truth), so this
// terminating call is fired purely to close out the session at the cheap
// rate -- its formattedAddress result is used only to fill the text field
// with a clean, complete string, not treated as authoritative data.
async function fetchPlaceDetails(placeId: string, sessionToken: string): Promise<string | null> {
  try {
    const u = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
    u.searchParams.set("sessionToken", sessionToken);
    const res = await fetch(u, {
      headers: { "X-Goog-Api-Key": API_KEY!, "X-Goog-FieldMask": "formattedAddress" },
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
  placeholder,
  ariaLabel,
}: {
  placeholder: string;
  ariaLabel: string;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  if (!API_KEY) {
    // Graceful degradation: same field, same name, no suggestions --
    // resolveJurisdiction is unaffected either way.
    return (
      <input
        type="text"
        name="address"
        autoComplete="street-address"
        placeholder={placeholder}
        aria-label={ariaLabel}
        required
      />
    );
  }

  function onChange(v: string) {
    setValue(v);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (v.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(AUTOCOMPLETE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY!,
            "X-Goog-FieldMask": "suggestions.placePrediction.text.text,suggestions.placePrediction.placeId",
          },
          body: JSON.stringify({
            input: v,
            sessionToken: sessionToken.current,
            includedRegionCodes: ["us"],
          }),
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
    setValue(formatted ?? s.text);
    sessionToken.current = crypto.randomUUID(); // next typing session gets its own token
  }

  return (
    <div className="addr-autocomplete">
      <input
        type="text"
        name="address"
        autoComplete="street-address"
        placeholder={placeholder}
        aria-label={ariaLabel}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          // Delay so a click on a suggestion (which also blurs the input)
          // registers before the dropdown disappears.
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="addr-suggestions" role="listbox">
          {suggestions.map((s) => (
            <li key={s.placeId} className="addr-suggestion" role="option" aria-selected="false" onMouseDown={() => pick(s)}>
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

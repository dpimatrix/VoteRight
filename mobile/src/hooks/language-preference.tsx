import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type LanguagePreference = 'system' | 'en' | 'es';
export type Lang = 'en' | 'es';
const STORAGE_KEY = 'voteright_language_preference';

/** Device locale, resolved once at module load via the JS engine's own Intl
 *  support (Hermes has shipped full ICU/Intl for several RN versions now) --
 *  deliberately NOT a new native dependency (e.g. expo-localization) since
 *  that would need a rebuild; a bare-language-subtag check ("es-MX" -> "es")
 *  is enough to pick a sensible "system" default, same fallback posture as
 *  everywhere else in this app: never throw, just fall back to English. */
function systemLanguage(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

interface LanguagePreferenceContextValue {
  preference: LanguagePreference;
  setPreference: (p: LanguagePreference) => void;
  lang: Lang;
}

const LanguagePreferenceContext = createContext<LanguagePreferenceContextValue | null>(null);

/** Same shape as ThemePreferenceProvider (hooks/theme-preference.tsx) --
 *  wraps the whole app so every screen's language respects a user override
 *  (Settings -> Language), not just the device's own setting. */
export function LanguagePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'en' || v === 'es' || v === 'system') setPreferenceState(v);
    });
  }, []);

  const setPreference = (p: LanguagePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const lang: Lang = preference === 'system' ? systemLanguage() : preference;

  return (
    <LanguagePreferenceContext.Provider value={{ preference, setPreference, lang }}>
      {children}
    </LanguagePreferenceContext.Provider>
  );
}

export function useLanguagePreference(): LanguagePreferenceContextValue {
  const ctx = useContext(LanguagePreferenceContext);
  if (!ctx) throw new Error('useLanguagePreference must be used within LanguagePreferenceProvider');
  return ctx;
}

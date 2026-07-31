import { useThemePreference } from './theme-preference';

export function useColorScheme(): 'light' | 'dark' {
  return useThemePreference().resolvedScheme;
}

import { useEffect, useState } from 'react';

import { useThemePreference } from './theme-preference';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { resolvedScheme } = useThemePreference();

  return hasHydrated ? resolvedScheme : 'light';
}

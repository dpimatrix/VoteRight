import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Automatically re-runs a failed load when the app returns to the
 * foreground, no tap needed.
 *
 * Built after real Mandates/Debates/Matches/Priorities failures
 * (2026-08-23 screenshots) all landed at the same moment -- the likely
 * cause is the app getting backgrounded while multiple tabs had a fetch
 * in flight: React Native's JS timers are throttled while backgrounded,
 * so several of services/api.ts's 15s abort timeouts fire in a burst on
 * resume, all "Fetch request has been canceled". Each affected screen
 * already grew a manual "Try again" button for this (see explore.tsx,
 * mandates.tsx, debates.tsx, priorities.tsx); this hook fires that same
 * retry the moment `AppState` transitions into 'active' from anything
 * else, so a resumed app self-heals without the user having to notice
 * and tap anything.
 *
 * `shouldRetry`/`retry` are read through a ref on each fire rather than
 * captured in the effect's closure -- callers pass a fresh `retry`
 * function and a `shouldRetry` boolean on every render (matching how
 * `error === d.x_load_error` is already computed inline at each call
 * site) without needing to memoize either one, and the AppState
 * subscription itself is only ever created once per mount.
 *
 * Each tab screen in this app stays mounted while other tabs are
 * focused (React Navigation's default), so this fires per-screen
 * regardless of which tab is actually visible when the app resumes --
 * deliberate, not just tolerated: a screen with a lingering error
 * quietly clears it in the background too, so the user never lands on a
 * dead error just because they weren't looking at that tab when the app
 * came back.
 */
export function useRetryOnForeground(shouldRetry: boolean, retry: () => void) {
  const shouldRetryRef = useRef(shouldRetry);
  shouldRetryRef.current = shouldRetry;
  const retryRef = useRef(retry);
  retryRef.current = retry;

  useEffect(() => {
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev !== 'active' && next === 'active' && shouldRetryRef.current) {
        retryRef.current();
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);
}

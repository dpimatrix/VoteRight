// Real bug found live testing (2026-08-23): lib/signing.ts's @noble/curves
// ed25519 keygen needs a genuine Web Crypto crypto.getRandomValues to
// generate keys -- Hermes (RN's JS engine) doesn't provide one, so every
// debate argument/proposal/second was silently failing to sign and posting
// unsigned instead (caught by signing.ts's own try/catch, so nothing
// visibly broke -- the non-repudiation feature from ARCHITECTURE.md
// Section 10 was just quietly never running on mobile).
//
// expo-crypto ships a native-backed CSPRNG (the same thing
// react-native-get-random-values would add, but via this project's existing
// expo-* convention instead of a third-party native module) -- this installs
// it as the Web Crypto global @noble/curves expects. Must run before any
// signing call ever happens, which in practice means: import this as the
// very first line of app/_layout.tsx, before anything else.
import * as Crypto from 'expo-crypto';

// Guarded (2026-09-02, investigating the iOS 1.1.5/build-9 launch-crash
// rejection): this runs at MODULE LOAD TIME -- the first line of
// app/_layout.tsx, before React renders a single component -- so an
// unguarded throw here is the hardest possible crash-on-launch: earlier
// than any error boundary, earlier than the splash screen even having a
// screen to sit on top of. If globalThis.crypto already exists on a given
// platform's JS engine but as a non-configurable/non-writable object
// (iOS and Android engine globals aren't guaranteed identical -- this
// project has hit exactly this kind of platform divergence before, see
// this file's own header comment on Hermes lacking getRandomValues at
// all), the assignment below throws a TypeError. Prime suspect, not
// confirmed against an actual device crash log (none available -- no
// iOS test device on hand right now). Matches the tolerance the rest of
// this feature already has: signing.ts's own calls are already
// try/caught (per this file's header comment, "nothing visibly broke"
// when getRandomValues was simply missing) -- if this installer fails,
// signing degrades the same already-tolerated way instead of taking the
// whole app down.
try {
  if (typeof globalThis.crypto === 'undefined') {
    // @ts-expect-error -- RN's global object type doesn't declare `crypto`
    globalThis.crypto = {};
  }
  if (typeof globalThis.crypto.getRandomValues === 'undefined') {
    globalThis.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T =>
      Crypto.getRandomValues(array as never) as T;
  }
} catch (e) {
  console.error('crypto polyfill installation failed:', e);
}

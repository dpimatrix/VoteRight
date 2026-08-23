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

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error -- RN's global object type doesn't declare `crypto`
  globalThis.crypto = {};
}
if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  globalThis.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T =>
    Crypto.getRandomValues(array as never) as T;
}

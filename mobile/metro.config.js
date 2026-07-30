const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @noble/curves and @noble/hashes (mobile Ed25519 signing, see src/lib/signing.ts)
// ship only package.json "exports" subpaths (e.g. "@noble/hashes/sha2.js") —
// Metro doesn't honor package "exports" maps unless this is explicitly enabled.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

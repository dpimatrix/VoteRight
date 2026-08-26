import type { NextConfig } from "next";

// Real production build failure (2026-08-26): the bare __dirname global this
// file used to reference below doesn't exist in whatever module scope Next
// 16's config loader actually runs this in (confirmed live -- a
// ReferenceError thrown from inside the compiled config itself, "__dirname
// is not defined in ES module scope"). Deliberately NOT replaced with an
// import.meta.url-based equivalent -- adding node:url/node:path imports here
// was tried and confirmed live to change how the compiler emits this file
// (shifts to CJS-style output referencing `exports`, which fails the exact
// same way under the same loader). process.cwd() needs no new import and is
// equivalent here regardless: docs/DEPLOY.md documents (and enforces, via
// the ENOENT failure mode it describes) that Next is always invoked with
// this directory (app/) as the working directory, in dev and production
// alike -- that's also fundamentally how its CLI finds this very file.
const nextConfig: NextConfig = {
  // Next 16 blocks dev-server assets for non-localhost origins (403 on /_next/*),
  // which leaves LAN devices with server-rendered HTML and zero interactivity.
  // Allow phone testing over the local network in dev. .205 was stale --
  // confirmed live 2026-08-23 via ipconfig that this machine's actual LAN
  // IP is .235 (matches mobile/app.config.js's own isLocal apiUrl, which
  // was already correct); .205 was presumably this machine's address on
  // an earlier DHCP lease and never got updated here when it changed.
  allowedDevOrigins: ["192.168.86.235", "localhost"],
  // Found live 2026-08-23: a real crash, not a hypothetical. Turbopack
  // infers the project root by walking up from the compiled file looking
  // for a lockfile (package-lock.json et al) -- normally lands on this
  // directory (app/) fine, but this project's own folder is *named*
  // "app", the same name as the App Router's own src/app/ convention one
  // level down, and an `npm install` running concurrently with a live
  // dev server (rewriting app/package-lock.json mid-request) raced that
  // inference and it locked in the wrong root
  // ("...\\app\\src\\app", one level too deep, no next/package.json
  // reachable from there) for the rest of the process's life --
  // confirmed live: every request hung forever afterward (20s+, zero
  // bytes) until the process was killed and restarted, which is what
  // actually broke every mobile screen at once ("Ballot load failed, all
  // screens not fetching") -- not app backgrounding, a dev-server root
  // mis-inference. Hardcoding the real root removes the inference step
  // (and this whole race) entirely, per Turbopack's own docs for
  // non-standard structures.
  turbopack: { root: process.cwd() },
  // geoip-lite (anomalyDetection.ts) bundles its own binary data file and
  // locates it via a __dirname-relative path -- Turbopack's build-time
  // bundling/tracing rewrites that path incorrectly (confirmed live
  // 2026-08-15: it resolved to the nonsense "C:\ROOT\node_modules\..." and
  // failed at runtime with ENOENT). pg and sharp already ship on Next's own
  // built-in serverExternalPackages allowlist, which is why they never hit
  // this; geoip-lite isn't on that list, so it needs adding here --
  // excludes it from bundling entirely and uses a plain Node require()
  // instead, which resolves __dirname correctly.
  serverExternalPackages: ["geoip-lite"],
};

export default nextConfig;

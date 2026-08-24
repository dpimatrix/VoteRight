import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks dev-server assets for non-localhost origins (403 on /_next/*),
  // which leaves LAN devices with server-rendered HTML and zero interactivity.
  // Allow phone testing over the local network in dev.
  allowedDevOrigins: ["192.168.86.205", "localhost"],
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
  turbopack: { root: __dirname },
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

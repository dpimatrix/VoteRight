import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks dev-server assets for non-localhost origins (403 on /_next/*),
  // which leaves LAN devices with server-rendered HTML and zero interactivity.
  // Allow phone testing over the local network in dev.
  allowedDevOrigins: ["192.168.86.205", "localhost"],
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

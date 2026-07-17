import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks dev-server assets for non-localhost origins (403 on /_next/*),
  // which leaves LAN devices with server-rendered HTML and zero interactivity.
  // Allow phone testing over the local network in dev.
  allowedDevOrigins: ["192.168.86.205", "localhost"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright', '@sparticuz/chromium'],
};

export default nextConfig;

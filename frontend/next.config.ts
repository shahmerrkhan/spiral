import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI/CD friendly: standalone output lets production hosts deploy the bundled server artifact.
  output: "standalone",
  poweredByHeader: false,
  compress: true,

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Remote product/media hosts will be added here once object storage/CDN
    // is introduced (see TRENDS_PROJECT_CONTEXT.md §9 / §3 Infrastructure).
    remotePatterns: [],
  },
};

export default nextConfig;

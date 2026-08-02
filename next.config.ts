import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side Router Cache — cache dynamic page data for 30s so
    // navigating back to a recently visited page is instant.
    // Server Actions calling revalidatePath() still invalidate immediately.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;

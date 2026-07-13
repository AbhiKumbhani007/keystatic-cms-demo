import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone build for a small Docker image running `next start` on ECS/EC2.
  output: 'standalone',
  images: {
    // Allow serving doc images committed to the GitHub repo directly (so newly
    // uploaded images appear after revalidation without a rebuild).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;

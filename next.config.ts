import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Opciono: Ako ti css ili slike ne budu radile, otkomentariši liniju ispod
  // basePath: '/ko-sam-ja-kviz', 
};

export default nextConfig;

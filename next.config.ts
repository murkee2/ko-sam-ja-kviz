import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/ko-sam-ja-kviz', // Obavezno dodaj ovo
};

export default nextConfig;

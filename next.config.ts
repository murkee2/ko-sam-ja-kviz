import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const basePath = isDev ? "" : "/ko-sam-ja-kviz";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

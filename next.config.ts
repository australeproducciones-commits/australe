import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNextImageRemotePatterns } from "@/lib/utils/imageHosts";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: getNextImageRemotePatterns(),
  },
};

export default nextConfig;

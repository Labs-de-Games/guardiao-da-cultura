import { resolve } from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;

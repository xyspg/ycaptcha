import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";
import "./lib/env";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);

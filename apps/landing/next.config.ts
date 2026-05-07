import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import "./lib/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  turbopack: {
    // Workspace root. In Docker the build context only includes apps/landing
    // (no monolith proxy.ts at the workspace root), so this is safe.
    root: path.resolve(import.meta.dirname, "../.."),
  },
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

export default withNextIntl(withMDX(nextConfig));

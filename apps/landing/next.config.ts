import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import "./lib/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // Pin the project root to apps/landing so Turbopack does NOT walk up to the
  // monorepo root and pick up the legacy monolith's `proxy.ts` as middleware.
  turbopack: {
    root: import.meta.dirname,
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

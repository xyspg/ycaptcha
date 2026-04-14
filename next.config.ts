import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import "./lib/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const captchaJsHash = createHash("sha384")
  .update(readFileSync(path.join(process.cwd(), "public/captcha.js")))
  .digest("base64");

const nextConfig: NextConfig = {
  env: {
    CAPTCHA_JS_INTEGRITY: `sha384-${captchaJsHash}`,
  },
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
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

export default withSentryConfig(withNextIntl(withMDX(nextConfig)), {
  org: "xyspg-8610361aa",
  project: "ycaptcha",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

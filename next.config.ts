import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { defaultLocale, locales } from "./i18n/config";
import { SESSION_COOKIES } from "./lib/auth/cookies";
import "./lib/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Mirrors i18n/request.ts: locale cookie first, then the primary
// Accept-Language tag (`has` values are matched as ^...$ regexes).
function landingRewrites(source: string) {
  return [
    {
      source,
      has: [
        {
          type: "cookie" as const,
          key: "locale",
          value: `(?<locale>${locales.join("|")})`,
        },
      ],
      destination: "/landing/:locale",
    },
    {
      source,
      has: [
        {
          type: "header" as const,
          key: "accept-language",
          value: "[zZ][hH].*",
        },
      ],
      destination: "/landing/zh-CN",
    },
    {
      source,
      has: [
        {
          type: "header" as const,
          key: "accept-language",
          value: "[jJ][aA].*",
        },
      ],
      destination: "/landing/ja",
    },
    { source, destination: `/landing/${defaultLocale}` },
  ];
}

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
  // Routing for the static landing page runs on the edge so `/` never hits a
  // function. The session check is optimistic (cookie presence only); the
  // dashboard proxy still validates the session.
  async redirects() {
    return SESSION_COOKIES.map((key) => ({
      source: "/",
      has: [{ type: "cookie" as const, key }],
      destination: "/dashboard",
      permanent: false,
    }));
  },
  async rewrites() {
    return {
      beforeFiles: [...landingRewrites("/"), ...landingRewrites("/home")],
      afterFiles: [
        {
          source: "/docs/:path*.mdx",
          destination: "/llms.mdx/docs/:path*",
        },
      ],
    };
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

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { defaultLocale, locales } from "./i18n/config";
import { SESSION_COOKIES } from "./lib/auth/constants";
import "./lib/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Rewrites `source` to the static page prerendered per locale at
// /landing/{locale}{page}. Approximates i18n/request.ts: locale cookie first,
// then only the primary Accept-Language tag, where request.ts also weighs
// later tags (`fr, ja;q=0.9` negotiates ja there, en here). `has` values are
// matched as ^...$ regexes.
function localeRewrites(source: string, page = "") {
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
      destination: `/landing/:locale${page}`,
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
      destination: `/landing/zh-CN${page}`,
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
      destination: `/landing/ja${page}`,
    },
    { source, destination: `/landing/${defaultLocale}${page}` },
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
  // Routing for the static landing and gallery pages runs on the edge so `/`
  // and `/gallery` never hit a function. The session check is optimistic
  // (cookie presence only); the dashboard validates it via requireSession(),
  // which clears stale cookies.
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
      beforeFiles: [
        ...localeRewrites("/"),
        ...localeRewrites("/home"),
        ...localeRewrites("/gallery", "/gallery"),
      ],
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

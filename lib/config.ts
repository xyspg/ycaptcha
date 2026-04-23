import { env } from "@/lib/env";

const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export const config = {
  siteUrl,
  siteHostname: new URL(siteUrl).hostname,
  getSiteUrl(path = "") {
    if (!path) return siteUrl;
    return new URL(path.replace(/^\/+/, ""), `${siteUrl}/`).toString();
  },
} as const;

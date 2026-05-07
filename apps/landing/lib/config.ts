import { env } from "@/lib/env";

const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export const config = {
  siteUrl,
  appUrl,
  siteHostname: new URL(siteUrl).hostname,
  getSiteUrl(path = "") {
    if (!path) return siteUrl;
    return new URL(path.replace(/^\/+/, ""), `${siteUrl}/`).toString();
  },
  getAppUrl(path = "") {
    if (!path) return appUrl;
    return new URL(path.replace(/^\/+/, ""), `${appUrl}/`).toString();
  },
} as const;

import { env } from "../env";

const siteUrl = env.SITE_URL.replace(/\/$/, "");

export const config = {
  siteUrl,
  siteHostname: new URL(siteUrl).hostname,
  getSiteUrl(path = "") {
    if (!path) return siteUrl;
    return new URL(path.replace(/^\/+/, ""), `${siteUrl}/`).toString();
  },
} as const;

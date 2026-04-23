import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale, locales } from "./config";

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;

  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="))?.split("=")[1];
      return {
        tag: tag.trim().toLowerCase(),
        q: q ? Number.parseFloat(q) : 1,
      };
    })
    .filter((e) => !Number.isNaN(e.q))
    .sort((a, b) => b.q - a.q);

  const supported = locales.map((l) => l.toLowerCase());

  for (const { tag } of entries) {
    const exact = supported.indexOf(tag);
    if (exact !== -1) return locales[exact];
    const prefix = tag.split("-")[0];
    const match = supported.findIndex(
      (l) => l === prefix || l.split("-")[0] === prefix,
    );
    if (match !== -1) return locales[match];
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("locale")?.value;

  let locale: Locale;
  if (locales.includes(raw as Locale)) {
    locale = raw as Locale;
  } else {
    const hdrs = await headers();
    locale = parseAcceptLanguage(hdrs.get("accept-language"));
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

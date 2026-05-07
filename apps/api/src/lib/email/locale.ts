import { defaultLocale, type Locale, locales } from "../../i18n/config";
import { parseAcceptLanguage } from "../../i18n/parse-accept-language";

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function getLocaleFromRequest(request: Request | undefined): Locale {
  if (!request) return defaultLocale;

  const cookieLocale = readCookie(request.headers.get("cookie"), "locale");
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  return parseAcceptLanguage(request.headers.get("accept-language"));
}

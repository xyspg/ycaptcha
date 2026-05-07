import { defaultLocale, type Locale, locales } from "./config";

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;

  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="))?.split("=")[1];
      return {
        tag: (tag ?? "").trim().toLowerCase(),
        q: q ? Number.parseFloat(q) : 1,
      };
    })
    .filter((e) => !Number.isNaN(e.q))
    .sort((a, b) => b.q - a.q);

  const supported = locales.map((l) => l.toLowerCase());

  for (const { tag } of entries) {
    const exact = supported.indexOf(tag);
    if (exact !== -1) return locales[exact] as Locale;
    const prefix = tag.split("-")[0] ?? "";
    const match = supported.findIndex(
      (l) => l === prefix || (l.split("-")[0] ?? "") === prefix,
    );
    if (match !== -1) return locales[match] as Locale;
  }

  return defaultLocale;
}

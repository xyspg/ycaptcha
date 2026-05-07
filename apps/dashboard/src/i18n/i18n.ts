import { i18n } from "@lingui/core";

export const supportedLocales = ["en", "ja", "zh-CN"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "en";

export async function activateLocale(locale: Locale) {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.loadAndActivate({ locale, messages });
}

export function detectLocale(): Locale {
  const stored = localStorage.getItem("locale");
  if (stored && (supportedLocales as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  const nav = navigator.language;
  const exact = (supportedLocales as readonly string[]).find(
    (l) => l.toLowerCase() === nav.toLowerCase(),
  );
  if (exact) return exact as Locale;
  const prefix = nav.split("-")[0];
  const partial = (supportedLocales as readonly string[]).find(
    (l) => l.split("-")[0] === prefix,
  );
  return (partial as Locale) ?? defaultLocale;
}

export { i18n };

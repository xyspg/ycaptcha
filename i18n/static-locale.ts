import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { type Locale, locales } from "./config";

// Call first in every page and layout under app/(landing)/landing/[locale].
// They render in parallel, so the root layout's check alone doesn't stop a
// page from doing its work (DB queries, shiki) for a bogus locale before the
// 404 wins.
export function setStaticLocale(locale: string): Locale {
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

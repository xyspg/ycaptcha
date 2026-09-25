import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { RootDocument } from "@/components/root-document";
import { locales } from "@/i18n/config";

// Prerendered per locale and served from the CDN. `/`, `/home` and `/gallery`
// are rewritten here in next.config.ts based on the locale cookie or
// Accept-Language, so these pages never wait on a function cold start.
//
// Unknown locales 404 via notFound() rather than `dynamicParams = false`: with
// that set, a page invalidated by revalidatePath (the gallery) counts as never
// prerendered and 404s under `next start` until the next build.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
  };
}

export default async function LandingLayout({ children, params }: Props) {
  const { locale } = await params;
  // before anything reads the locale: an unknown one would fall back to
  // cookies and turn this into a dynamic render
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <RootDocument locale={locale} messages={messages}>
      <div className="relative min-h-screen bg-[oklch(0.98_0.006_95)] text-foreground dark:bg-[oklch(0.17_0.004_270)]">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.06] dark:opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {children}
      </div>
    </RootDocument>
  );
}

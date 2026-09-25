import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fontVariables } from "@/app/fonts";
import { Providers } from "@/components/providers";
import { config } from "@/lib/config";
import "@/app/globals.css";

// Shared <html> shell for the (main) and (landing) root layouts.
export function RootDocument({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${fontVariables} flex min-h-screen flex-col font-sans antialiased`}
      >
        <Script
          defer
          src="https://mizuki.xyspg.moe/akiyama"
          data-website-id="31902df6-c1da-4e2a-93fd-d5f2a84b2bc3"
          data-domains={config.siteHostname}
          strategy="afterInteractive"
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            {children}
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

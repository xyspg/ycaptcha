import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { GalleryAccountButton, GalleryMineLink } from "./gallery-auth";

// Header and footer shared by the static browse page (under the landing root
// layout) and the dynamic item and "mine" pages (under the main one). Both
// parents supply the grid background.
export async function GalleryShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("gallery");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-[oklch(0.98_0.006_95)]/80 backdrop-blur-md dark:bg-[oklch(0.17_0.004_270)]/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <div className="flex items-center gap-6">
            {/* Plain <a> for /gallery: a router navigation from /gallery?... back to
                the bare rewrite gets dropped (see gallery-browser.tsx) */}
            <a
              href="/gallery"
              className="inline-flex items-center gap-2 font-semibold tracking-tight"
            >
              <Image
                src="/favicon.ico"
                alt="yCAPTCHA"
                width={28}
                height={28}
                className="size-7 rounded-md"
                unoptimized
              />
              <span className="text-[15px]">
                <span className="font-bold">yCAPTCHA</span>
                <span className="ml-1.5 text-muted-foreground">
                  {t("galleryLabel")}
                </span>
              </span>
            </a>
            <nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
              <Button asChild variant="ghost" size="sm">
                <a href="/gallery">{t("navBrowse")}</a>
              </Button>
              <GalleryMineLink />
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
            >
              <Link href="/">{t("navMainSite")}</Link>
            </Button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeSwitcher />
            <GalleryAccountButton />
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>

      <footer className="relative border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground lg:px-8">
          <span>{t("footerCopyright")}</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground">
              {t("footerDocs")}
            </Link>
            <Link
              href="/legal/privacy-policy"
              className="hover:text-foreground"
            >
              {t("footerPrivacy")}
            </Link>
            <Link
              href="/legal/acceptable-use-policy"
              className="hover:text-foreground"
            >
              {t("footerAcceptableUse")}
            </Link>
            <Link
              href={env.NEXT_PUBLIC_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <GitHubLogoIcon />
              {t("footerSource")}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

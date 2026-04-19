import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export default async function GalleryShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="relative min-h-screen bg-[oklch(0.98_0.006_95)] text-foreground dark:bg-[oklch(0.17_0.004_270)]">
      {/* Faint paper-texture grid — visually separates gallery from the main app */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-border bg-[oklch(0.98_0.006_95)]/80 backdrop-blur-md dark:bg-[oklch(0.17_0.004_270)]/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
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
                <span className="ml-1.5 text-muted-foreground">Gallery</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/gallery">Browse</Link>
              </Button>
              {session && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/gallery/mine">My items</Link>
                </Button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
            >
              <Link href="/">← Main site</Link>
            </Button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeSwitcher />
            {session ? (
              <Button asChild size="sm" className="ml-1 rounded-full px-3">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="ml-1 rounded-full px-3">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>

      <footer className="relative border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground lg:px-8">
          <span>© 2026 yCAPTCHA Gallery</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link
              href="/legal/privacy-policy"
              className="hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/legal/acceptable-use-policy"
              className="hover:text-foreground"
            >
              Acceptable use
            </Link>
            <Link
              href={env.NEXT_PUBLIC_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <GitHubLogoIcon />
              source
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

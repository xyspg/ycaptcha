import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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

      <header className="sticky top-0 z-40 border-b border-border bg-[oklch(0.98_0.006_95)]/80 backdrop-blur-md dark:bg-[oklch(0.17_0.004_270)]/80">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <span className="text-[15px]">
              <span className="font-bold">yCAPTCHA</span>
              <span className="ml-1.5 text-muted-foreground">Legal</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/legal/privacy-policy">Privacy</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/legal/acceptable-use-policy">Acceptable use</Link>
            </Button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeSwitcher />
          </nav>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        {children}
      </main>

      <footer className="relative border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 text-xs text-muted-foreground lg:px-8">
          <span>© 2026 yCAPTCHA</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground">
              Docs
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

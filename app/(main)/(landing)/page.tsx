import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { codeToHtml } from "shiki";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { DemoShowcase } from "./demo-showcase";

const highlight = cache(async (code: string, lang: string) =>
  codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  }),
);

const EMBED_SNIPPET = `<script
  src="https://ycaptcha.xyspg.moe/captcha.js"
  async
  defer
></script>

<div
  class="y-captcha"
  data-sitekey="pk_..."
></div>`;

const VERIFY_SNIPPET = `const res = await fetch(
  "https://ycaptcha.xyspg.moe/api/v0/captcha/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      secretKey: process.env.YCAPTCHA_SECRET_KEY!,
    }),
  },
);
const { success } = await res.json();`;

const COMMUNITY_THEMES = [
  { name: "dev-tools", hue: "bg-violet-500" },
  { name: "new-york-subways", hue: "bg-sky-500" },
  { name: "maimai-charts", hue: "bg-fuchsia-500" },
  // { name: "mech-keyboards", hue: "bg-orange-500" },
  // { name: "anime-frames", hue: "bg-violet-500" },
  // { name: "trading-cards", hue: "bg-rose-500" },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <HomePage />;
}

export async function HomePage() {
  const t = await getTranslations("landing");
  const [embedHtml, verifyHtml] = await Promise.all([
    highlight(EMBED_SNIPPET, "html"),
    highlight(VERIFY_SNIPPET, "ts"),
  ]);

  return (
    <>
      {/* Nav */}
      <header className="relative z-30 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold tracking-tight"
        >
          <Image
            src="/favicon.ico"
            alt=""
            width={24}
            height={24}
            unoptimized
            aria-hidden
          />
          <span className="text-base">yCAPTCHA</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/docs">{t("navDocs")}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/gallery">{t("navGallery")}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link
              href={env.NEXT_PUBLIC_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
            >
              <GitHubLogoIcon className="mr-1" />
              {t("navGitHub")}
            </Link>
          </Button>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <ThemeSwitcher />
          <Button asChild size="sm" className="ml-1 rounded-full px-3">
            <Link href="/login">
              {t("navDashboard")}
              <span aria-hidden className="ml-0.5">
                →
              </span>
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-10 pt-4 lg:px-12 lg:pb-20 lg:pt-12">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col">
            {/* Logo */}
            <Image
              src="/ycaptcha.webp"
              alt="yCAPTCHA"
              width={420}
              height={126}
              sizes="(max-width: 640px) 230px, (max-width: 1024px) 300px, 380px"
              className="mb-8 -ml-1 -rotate-3 h-auto w-[230px] max-w-full sm:w-[300px] lg:w-[380px]"
              priority
            />

            {/* Headline */}
            <h1 className="font-heading text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-balance lg:text-[60px]">
              {t("heroHeadlineA")}
              <br />
              <em className="italic text-[#4285f4] dark:text-[#8ab4f8]">
                {t("heroHeadlineB")}
              </em>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
              {t("tagline")}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-5">
                <Link href="/login">
                  {t("startFree")}
                  <span aria-hidden className="ml-1">
                    →
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-5"
              >
                <Link href="/gallery">{t("seeGallery")}</Link>
              </Button>
            </div>

            {/* Community themes pill row */}
            <div className="mt-9">
              <div
                className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {t("communityThemesLabel")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMUNITY_THEMES.map((c) => (
                  <Link
                    key={c.name}
                    href="/gallery"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs text-foreground/70 backdrop-blur-sm transition-colors hover:border-foreground/30 hover:bg-background hover:text-foreground"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${c.hue}`}
                    />
                    {c.name}
                  </Link>
                ))}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {t("bringYourOwn")}
                </Link>
              </div>
            </div>
          </div>

          {/* Demo */}
          <div className="hidden justify-center lg:flex">
            <DemoShowcase />
          </div>
        </div>
      </section>

      {/* Mobile demo */}
      <section className="relative z-10 flex flex-col items-center px-4 pb-16 lg:hidden">
        <DemoShowcase />
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="mb-12 max-w-2xl">
          <div
            className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#4285f4] dark:text-[#8ab4f8]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {t("howItWorksEyebrow")}
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance lg:text-[40px]">
            {t("howItWorksTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StepCard
            n="01"
            title={t("step1Title")}
            body={t("step1Body")}
            visual={<UploadVisual />}
          />
          <StepCard
            n="02"
            title={t("step2Title")}
            body={t("step2Body")}
            snippetHtml={embedHtml}
          />
          <StepCard
            n="03"
            title={t("step3Title")}
            body={t("step3Body")}
            snippetHtml={verifyHtml}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20 lg:px-10 lg:pb-28">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-950 px-8 py-14 text-center text-neutral-100 lg:px-16 lg:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full opacity-40 blur-3xl"
            style={{ background: "oklch(0.62 0.22 290)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-16 size-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "oklch(0.72 0.18 50)" }}
          />
          <h2 className="relative font-heading text-3xl font-bold leading-tight tracking-tight text-balance lg:text-[44px]">
            {t("ctaTitle")}
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-neutral-300 lg:text-base">
            {t("ctaSub")}
          </p>
          <div className="relative mt-8 inline-flex">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-6 text-neutral-950 [a]:hover:bg-neutral-200"
            >
              <Link href="/login">
                {t("ctaButton")}
                <span aria-hidden className="ml-1">
                  →
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground lg:px-10"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        <span>© 2026 yCAPTCHA</span>
        <div className="flex items-center gap-4">
          <Link href="/legal/privacy-policy" className="hover:text-foreground">
            privacy
          </Link>
          <Link
            href="/legal/acceptable-use-policy"
            className="hover:text-foreground"
          >
            acceptable use
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
      </footer>
    </>
  );
}

function StepCard({
  n,
  title,
  body,
  snippetHtml,
  visual,
}: {
  n: string;
  title: string;
  body: string;
  snippetHtml?: string | null;
  visual?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-6 backdrop-blur-sm">
      <div
        className="text-xl font-bold text-[#4285f4] dark:text-[#8ab4f8]"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        {n}
      </div>
      <div className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      {visual ? (
        <div className="mt-2">{visual}</div>
      ) : snippetHtml ? (
        <HighlightedSnippet html={snippetHtml} />
      ) : null}
    </div>
  );
}

function HighlightedSnippet({ html }: { html: string }) {
  return (
    <div
      className="shiki-embed mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-[11.5px] leading-relaxed"
      style={{ fontFamily: "var(--font-geist-mono)" }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output from hardcoded module-level snippet constants, no user input
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function UploadVisual() {
  return (
    <div
      className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 p-2"
      aria-hidden
    >
      {[
        "bg-fuchsia-300",
        "bg-sky-300",
        "bg-emerald-300",
        "bg-orange-300",
        "bg-violet-300",
        "bg-rose-300",
      ].map((c, i) => {
        const correct = i === 0 || i === 3;
        return (
          <div
            key={c}
            className={`relative aspect-square rounded ${c} dark:opacity-70`}
          >
            {correct && (
              <div className="absolute inset-0 rounded ring-2 ring-inset ring-[#4285f4]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { dismissOnboarding } from "@/app/(main)/dashboard/onboarding-actions";
import type { OnboardingProgress } from "@/app/(main)/dashboard/onboarding-progress";
import { Button } from "@/components/ui/button";

const TOTAL_STEPS = 4;

type StepRowProps = {
  done: boolean;
  locked?: boolean;
  label: string;
  hint?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

function StepRow({
  done,
  locked,
  label,
  hint,
  ctaLabel,
  ctaHref,
}: StepRowProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
        locked ? "opacity-50" : ""
      }`}
    >
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-foreground bg-foreground text-background"
            : "border-muted-foreground/40"
        }`}
      >
        {done && <Check className="size-2.5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate ${done ? "text-muted-foreground line-through" : "font-medium"}`}
        >
          {label}
        </span>
        {hint && !done && (
          <span className="truncate text-[10px] text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {!done && ctaHref && !locked && (
        <Button asChild size="xs" variant="outline">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowUpRight className="size-3" />
          </Link>
        </Button>
      )}
      {!done && locked && (
        <Button size="xs" variant="outline" disabled>
          {ctaLabel}
          <ArrowUpRight className="size-3" />
        </Button>
      )}
    </div>
  );
}

export function SidebarOnboardingChecklist({
  progress,
}: {
  progress: OnboardingProgress;
}) {
  const t = useTranslations("onboarding");
  const [expanded, setExpanded] = useState(true);

  const { hasSite, hasContent, hasPuzzle, firstSiteId } = progress;
  const completedSteps =
    (hasSite ? 1 : 0) + (hasContent ? 1 : 0) + (hasPuzzle ? 1 : 0);
  const readyForEmbed = hasSite && hasContent && hasPuzzle && !!firstSiteId;

  return (
    <div className="mx-2 mt-auto mb-2 rounded-lg border bg-card text-card-foreground">
      <div className="flex items-center pr-1.5 text-sm">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 rounded-l-lg px-3 py-2 text-left hover:bg-muted/50"
          aria-label={expanded ? t("collapse") : t("expand")}
        >
          <span className="font-medium">{t("title")}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {t("progressLabel", {
              completed: completedSteps,
              total: TOTAL_STEPS,
            })}
          </span>
          <ChevronDown
            className={`ml-auto size-3.5 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <form action={dismissOnboarding}>
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            aria-label={t("dismiss")}
          >
            <X className="size-3" />
          </Button>
        </form>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5 border-t p-1">
          <StepRow
            done={hasSite}
            label={t("step1Title")}
            ctaLabel={t("step1Cta")}
            ctaHref="/dashboard/sites"
          />
          <StepRow
            done={hasContent}
            label={t("step2Title")}
            ctaLabel={t("step2CtaImages")}
            ctaHref="/dashboard/image-sets"
          />
          <StepRow
            done={hasPuzzle}
            locked={!hasSite}
            label={t("step3Title")}
            hint={!hasSite ? t("step3LockedHint") : undefined}
            ctaHref="/dashboard/puzzles/new"
          />
          <StepRow
            done={false}
            locked={!readyForEmbed}
            label={t("step4Title")}
            hint={!readyForEmbed ? t("step4LockedHint") : undefined}
            ctaLabel={t("step4Cta")}
            ctaHref={
              firstSiteId ? `/dashboard/sites/${firstSiteId}` : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

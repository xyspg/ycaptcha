import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { api, unwrap } from "@/lib/api-client";

const TOTAL_STEPS = 4;

export type OnboardingProgress = {
  hasSite: boolean;
  hasContent: boolean;
  hasPuzzle: boolean;
  firstSiteId: string | null;
};

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
  const { setOpenMobile } = useSidebar();
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
          <Link to={ctaHref} onClick={() => setOpenMobile(false)}>
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
  const { t } = useLingui();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  const dismiss = useMutation({
    mutationFn: () =>
      unwrap<{ message: string }>(api.api.onboarding.dismiss.$post()),
    onSuccess: () =>
      qc.setQueryData(["onboarding"], { dismissed: true, progress: null }),
  });

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
          aria-label={expanded ? t`Collapse` : t`Expand`}
        >
          <span className="font-medium">
            <Trans>Get started</Trans>
          </span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {completedSteps}/{TOTAL_STEPS}
          </span>
          <ChevronDown
            className={`ml-auto size-3.5 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t`Dismiss`}
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
        >
          <X className="size-3" />
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5 border-t p-1">
          <StepRow
            done={hasSite}
            label={t`Create your first site`}
            ctaLabel={t`Create`}
            ctaHref="/dashboard/sites"
          />
          <StepRow
            done={hasContent}
            label={t`Upload images or audio`}
            ctaLabel={t`Upload`}
            ctaHref="/dashboard/image-sets"
          />
          <StepRow
            done={hasPuzzle}
            locked={!hasSite}
            label={t`Create a puzzle`}
            hint={!hasSite ? t`Add a site first` : undefined}
            ctaLabel={t`Create`}
            ctaHref="/dashboard/puzzles/new"
          />
          <StepRow
            done={false}
            locked={!readyForEmbed}
            label={t`Embed the widget`}
            hint={!readyForEmbed ? t`Finish prior steps first` : undefined}
            ctaLabel={t`Embed`}
            ctaHref={
              firstSiteId ? `/dashboard/sites/${firstSiteId}` : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

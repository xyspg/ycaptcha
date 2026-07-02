"use client";

import { Check, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import type { QuizLinkExpiry } from "@/lib/types";
import { QUIZ_LINK_EXPIRY_OPTIONS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createQuizLink, deleteQuizLink } from "./actions";

export interface QuizAttemptView {
  id: string;
  passed: boolean;
  autoFailed: boolean;
  mode: string;
  selectedCount: number;
  correctSelections: number;
  wrongSelections: number;
  createdAt: Date;
}

export interface QuizLinkView {
  id: string;
  url: string;
  expiresAt: Date | null;
  expired: boolean;
  challengeCount: number;
  attempts: number;
  passes: number;
  passRate: number | null;
  recentAttempts: QuizAttemptView[];
}

interface QuizLinksCardProps {
  puzzleId: string;
  links: QuizLinkView[];
}

export function QuizLinksCard({ puzzleId, links }: QuizLinksCardProps) {
  const t = useTranslations("puzzles.quizLinks");
  const [expiry, setExpiry] = useState<QuizLinkExpiry>("7d");
  const [createState, createAction, isCreating] = useActionState(
    createQuizLink,
    null,
  );

  return (
    <Card className="lg:max-w-[calc(100%-394px)]">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={createAction} className="flex items-center gap-2">
          <input type="hidden" name="puzzleId" value={puzzleId} />
          <NativeSelect
            name="expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value as QuizLinkExpiry)}
            className="w-auto"
          >
            {QUIZ_LINK_EXPIRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`expiry_${option}`)}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="sm" disabled={isCreating}>
            <Plus className="size-3.5" />
            {isCreating ? t("creating") : t("create")}
          </Button>
        </form>
        {createState?.errors?.puzzleId && (
          <p className="text-xs text-destructive">
            {createState.errors.puzzleId[0]}
          </p>
        )}

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <QuizLinkRow key={link.id} puzzleId={puzzleId} link={link} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuizLinkRow({
  puzzleId,
  link,
}: {
  puzzleId: string;
  link: QuizLinkView;
}) {
  const t = useTranslations("puzzles.quizLinks");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [, deleteAction, isDeleting] = useActionState(deleteQuizLink, null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            link.expired && "text-muted-foreground line-through",
          )}
        >
          {link.url}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          aria-label={t("copy")}
        >
          {copied ? (
            <Check className="size-3.5 text-green-600" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
        <form action={deleteAction}>
          <input type="hidden" name="quizLinkId" value={link.id} />
          <input type="hidden" name="puzzleId" value={puzzleId} />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isDeleting}
            aria-label={t("delete")}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {link.expired
            ? t("expired")
            : link.expiresAt
              ? t("expiresOn", {
                  date: format.dateTime(link.expiresAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("permanent")}
        </span>
        <span>{t("requests", { count: link.challengeCount })}</span>
        <span>{t("attempts", { count: link.attempts })}</span>
        <span>{t("passes", { count: link.passes })}</span>
        {link.passRate !== null && (
          <span>
            {t("passRate", { rate: Math.round(link.passRate * 100) })}
          </span>
        )}
      </div>

      {link.recentAttempts.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowAttempts((prev) => !prev)}
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                showAttempts && "rotate-180",
              )}
            />
            {showAttempts ? t("hideAttempts") : t("showAttempts")}
          </button>
          {showAttempts && (
            <div className="flex flex-col divide-y text-xs">
              {link.recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span
                    className={cn(
                      "w-20 shrink-0 font-medium",
                      attempt.passed ? "text-green-600" : "text-destructive",
                    )}
                  >
                    {attempt.autoFailed
                      ? t("attemptAutoFailed")
                      : attempt.passed
                        ? t("attemptPassed")
                        : t("attemptFailed")}
                  </span>
                  <span className="w-12 shrink-0 text-muted-foreground">
                    {attempt.mode}
                  </span>
                  {attempt.mode === "image" && !attempt.autoFailed && (
                    <span className="text-muted-foreground">
                      {t("attemptDetail", {
                        correct: attempt.correctSelections,
                        selected: attempt.selectedCount,
                      })}
                    </span>
                  )}
                  <span className="ml-auto text-muted-foreground">
                    {format.dateTime(attempt.createdAt, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

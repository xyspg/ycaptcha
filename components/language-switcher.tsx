"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setLocale } from "@/i18n/actions";
import { type Locale, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("languageSwitcher");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleChange = (newLocale: string) => {
    setOpen(false);
    startTransition(async () => {
      await setLocale(newLocale);
      window.location.reload();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          aria-label={t("label")}
          className="gap-1.5"
        >
          <Languages className="size-4" />
          <span>{t(locale as Locale)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-48 flex-col gap-0.5 p-1">
        <p className="p-2 text-xs font-medium text-muted-foreground">
          {t("label")}
        </p>
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => handleChange(l)}
            className={cn(
              "rounded-md px-2 py-1.5 text-start text-sm transition-colors",
              locale === l
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(l as Locale)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

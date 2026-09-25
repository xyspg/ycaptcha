"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type Locale, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("languageSwitcher");
  const [open, setOpen] = useState(false);

  // Written client-side rather than via a server action: the landing page is
  // static, and next.config.ts rewrites `/` on this cookie at the edge.
  const handleChange = (newLocale: Locale) => {
    setOpen(false);
    // biome-ignore lint/suspicious/noDocumentCookie: a one-off write; Cookie Store API lacks older Safari support
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // Direct /landing/{locale}/... URLs pin the locale from params, so the
    // cookie alone can't change them.
    const { pathname, search } = window.location;
    if (pathname.startsWith("/landing/")) {
      window.location.assign(
        pathname.replace(/^\/landing\/[^/]+/, `/landing/${newLocale}`) + search,
      );
    } else {
      window.location.reload();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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

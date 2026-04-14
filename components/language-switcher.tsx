"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";

export function LanguageSwitcher() {
	const locale = useLocale();
	const t = useTranslations("languageSwitcher");
	const [isPending, startTransition] = useTransition();

	const handleChange = (newLocale: string) => {
		startTransition(async () => {
			await setLocale(newLocale);
			window.location.reload();
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					disabled={isPending}
					className="w-full justify-start gap-2"
				>
					<Languages className="size-4" />
					<span>{t(locale as "en" | "zh-CN")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{locales.map((l) => (
					<DropdownMenuItem
						key={l}
						onClick={() => handleChange(l)}
						className={locale === l ? "font-medium" : ""}
					>
						{t(l as "en" | "zh-CN")}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

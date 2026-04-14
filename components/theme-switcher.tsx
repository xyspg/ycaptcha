"use client";

import { Half2Icon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useHasMounted } from "@/hooks/use-has-mounted";

const themes = [
	{ value: "system", icon: Half2Icon, labelKey: "systemTheme" },
	{ value: "light", icon: SunIcon, labelKey: "lightTheme" },
	{ value: "dark", icon: MoonIcon, labelKey: "darkTheme" },
] as const;

export function ThemeSwitcher() {
	const t = useTranslations("settings.appearance");
	const { theme, setTheme } = useTheme();
	const mounted = useHasMounted();

	return (
		<div className="flex w-fit items-center rounded-full border bg-muted/50 p-1">
			{themes.map(({ value, icon: Icon, labelKey }) => (
				<button
					key={value}
					type="button"
					onClick={() => setTheme(value)}
					className={`rounded-full p-1.5 transition-colors ${
						mounted && theme === value
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					aria-label={t(labelKey)}
				>
					<Icon className="size-3.5" />
				</button>
			))}
		</div>
	);
}

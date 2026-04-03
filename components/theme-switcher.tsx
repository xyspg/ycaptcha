"use client";

import { Half2Icon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

const themes = [
	{ value: "system", icon: Half2Icon },
	{ value: "light", icon: SunIcon },
	{ value: "dark", icon: MoonIcon },
] as const;

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex w-fit items-center rounded-full border bg-muted/50 p-1">
			{themes.map(({ value, icon: Icon }) => (
				<button
					key={value}
					type="button"
					onClick={() => setTheme(value)}
					className={`rounded-full p-1.5 transition-colors ${
						theme === value
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					aria-label={`${value} theme`}
				>
					<Icon className="size-3.5" />
				</button>
			))}
		</div>
	);
}

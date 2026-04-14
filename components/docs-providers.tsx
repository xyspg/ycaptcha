"use client";

import type { I18nProviderProps } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/next";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";

export function DocsProviders({
	i18n,
	children,
}: {
	i18n: Omit<I18nProviderProps, "children">;
	children: React.ReactNode;
}) {
	const [, startTransition] = useTransition();
	return (
		<RootProvider
			i18n={{
				...i18n,
				onLocaleChange: (newLocale) => {
					startTransition(async () => {
						await setLocale(newLocale);
						window.location.reload();
					});
				},
			}}
		>
			{children}
		</RootProvider>
	);
}

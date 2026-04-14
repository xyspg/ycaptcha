"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	const t = useTranslations("dashboard");
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-20">
			<h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
			<p className="text-sm text-muted-foreground">
				{error.message || t("genericError")}
			</p>
			<Button variant="outline" onClick={() => unstable_retry()}>
				{t("tryAgain")}
			</Button>
		</div>
	);
}

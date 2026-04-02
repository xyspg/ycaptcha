"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-20">
			<h2 className="text-lg font-semibold">Something went wrong</h2>
			<p className="text-sm text-muted-foreground">
				{error.message || "An unexpected error occurred."}
			</p>
			<Button variant="outline" onClick={() => unstable_retry()}>
				Try again
			</Button>
		</div>
	);
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CaptchaCheckbox } from "./captcha-checkbox";
import { type CaptchaImage, CaptchaWidget } from "./captcha-widget";

type Phase = "idle" | "loading" | "challenge" | "verified" | "failed";

interface CaptchaContainerProps {
	prompt: string;
	images: CaptchaImage[];
	onVerify: (selectedIndices: number[]) => boolean | Promise<boolean>;
	onRefresh: () => void | Promise<void>;
	onCompleted?: () => void;
	/** Fatal error (e.g. invalid siteKey). Disables the widget. */
	error?: string | null;
	/** Called when the widget phase changes (for iframe resize etc.) */
	onPhaseChange?: (phase: Phase) => void;
}

// component for dashboard preview only
export function CaptchaContainer({
	prompt,
	images,
	onVerify,
	onRefresh,
	onCompleted,
	error,
	onPhaseChange,
}: CaptchaContainerProps) {
	const tw = useTranslations("widget");
	const [phase, setPhase] = useState<Phase>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const updatePhase = (next: Phase) => {
		setPhase(next);
		onPhaseChange?.(next);
	};

	const handleRequestChallenge = async () => {
		updatePhase("loading");
		await onRefresh();
		setTimeout(() => {
			setPhase((prev) => {
				if (prev === "loading") {
					onPhaseChange?.("challenge");
					return "challenge";
				}
				return prev;
			});
		}, 800);
	};

	const handleVerify = async (selectedIndices: number[]) => {
		const pass = await onVerify(selectedIndices);

		if (pass) {
			updatePhase("verified");
			onCompleted?.();
		} else {
			setErrorMessage(tw("pleaseRetry"));
			onRefresh();
		}
	};

	const handleDismiss = () => {
		updatePhase("idle");
		setErrorMessage(null);
	};

	const widget = (
		<CaptchaWidget
			key={images[0]?.url}
			prompt={prompt}
			images={images}
			onVerify={handleVerify}
			onRefresh={onRefresh}
			errorMessage={errorMessage}
		/>
	);

	return (
		<div className="relative inline-block">
			<CaptchaCheckbox
				onRequestChallenge={handleRequestChallenge}
				state={error ? "error" : phase === "challenge" ? "challenge" : phase}
				errorText={error}
			/>

			{phase === "challenge" && !error && (
				<>
					{/* Mobile: fullscreen backdrop + centered widget */}
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:hidden"
						onClick={handleDismiss}
					>
						<div onClick={(e) => e.stopPropagation()}>{widget}</div>
					</div>

					{/* Desktop: transparent backdrop + float widget to the right */}
					<div
						className="fixed inset-0 z-40 hidden md:block"
						onClick={handleDismiss}
					/>
					<div className="absolute top-0 left-full z-50 ml-2 hidden md:block">
						{widget}
					</div>
				</>
			)}
		</div>
	);
}

export { CaptchaCheckbox } from "./captcha-checkbox";
export { type CaptchaImage, CaptchaWidget } from "./captcha-widget";

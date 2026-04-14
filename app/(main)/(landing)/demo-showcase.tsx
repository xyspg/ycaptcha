"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SAMPLE_SETS, type SampleSet } from "@/lib/samples";
import { CAPTCHA_GRID_SIZE } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { DemoCaptchaWidget } from "./demo-captcha-widget";

interface Demo {
	prompt: string;
	images: { contentHash: string; url: string }[];
}

// deterministic to avoid hydration mismatch
function buildSingleDemo(set: SampleSet, deterministic = false): Demo {
	const correctSet = new Set(set.correctHashes);
	const correct = (deterministic ? set.images : shuffle(set.images)).filter(
		(img) => correctSet.has(img.contentHash),
	);
	const incorrect = (deterministic ? set.images : shuffle(set.images)).filter(
		(img) => !correctSet.has(img.contentHash),
	);
	const correctCount = deterministic ? 3 : 3 + Math.floor(Math.random() * 3); // 3–5
	const combined = [
		...correct.slice(0, correctCount),
		...incorrect.slice(0, CAPTCHA_GRID_SIZE - correctCount),
	];
	const picked = deterministic ? combined : shuffle(combined);
	return {
		prompt: set.name,
		images: picked.map((img) => ({
			contentHash: img.contentHash,
			url: img.url,
		})),
	};
}

function buildDemos(deterministic = false): Demo[] {
	return SAMPLE_SETS.map((set) => buildSingleDemo(set, deterministic));
}

const DESKTOP_POSITIONS = [
	{ x: 0, y: 0, rotate: -6, scale: 0.9 },
	{ x: 60, y: 40, rotate: -3, scale: 0.95 },
	{ x: 120, y: 80, rotate: 0, scale: 1 },
];

export function DemoShowcase() {
	const t = useTranslations("landing");
	const [demos, setDemos] = useState(() => buildDemos(true));
	const [order, setOrder] = useState([0, 1, 2]);
	const [hovered, setHovered] = useState(false);
	const [errorMessages, setErrorMessages] = useState<(string | null)[]>([
		null,
		null,
		null,
	]);

	const [slideDir, setSlideDir] = useState(1);
	const justSwitchedRef = useRef(false);

	const reshuffleSingle = (demoIndex: number) => {
		setDemos((prev) => {
			const next = [...prev];
			next[demoIndex] = buildSingleDemo(SAMPLE_SETS[demoIndex]);
			return next;
		});
	};

	const bringToFront = (demoIndex: number) => {
		if (order[2] === demoIndex) return;
		justSwitchedRef.current = true;
		const rest = order.filter((o) => o !== demoIndex);
		setOrder([rest[0], rest[1], demoIndex]);
		setTimeout(() => {
			justSwitchedRef.current = false;
		}, 400);
	};

	const cycleForward = () => {
		setSlideDir(1);
		setOrder((prev) => [prev[2], prev[0], prev[1]]);
	};

	const cycleBackward = () => {
		setSlideDir(-1);
		setOrder((prev) => [prev[1], prev[2], prev[0]]);
	};

	const handleVerify = (demoIndex: number, selectedIndices: number[]) => {
		if (justSwitchedRef.current) return;
		if (selectedIndices.length === 0) return;

		const correctSet = new Set(SAMPLE_SETS[demoIndex].correctHashes);
		const selectedHashes = selectedIndices.map(
			(i) => demos[demoIndex].images[i].contentHash,
		);
		const correctCount = selectedHashes.filter((h) => correctSet.has(h)).length;
		const totalCorrectInGrid = demos[demoIndex].images.filter((img) =>
			correctSet.has(img.contentHash),
		).length;
		const allSelected = selectedIndices.length === CAPTCHA_GRID_SIZE;

		if (
			!allSelected &&
			correctCount >= totalCorrectInGrid &&
			selectedIndices.length === totalCorrectInGrid
		) {
			setErrorMessages((prev) => {
				const next = [...prev];
				next[demoIndex] = null;
				return next;
			});
			toast.success(t("verificationPassed"));
			cycleForward();
		} else {
			setErrorMessages((prev) => {
				const next = [...prev];
				next[demoIndex] = t("pleaseRetry");
				return next;
			});
			reshuffleSingle(demoIndex);
		}
	};

	const handleRefresh = (demoIndex: number) => {
		if (justSwitchedRef.current) return;
		setErrorMessages((prev) => {
			const next = [...prev];
			next[demoIndex] = null;
			return next;
		});
		reshuffleSingle(demoIndex);
	};

	const frontDemo = order[2];

	const dotIndicators = (
		<div className="flex gap-2">
			{demos.map((_, i) => (
				<button
					key={i}
					type="button"
					onClick={() => {
						setSlideDir(i > frontDemo ? 1 : -1);
						bringToFront(i);
					}}
					className={`size-2 rounded-full transition-colors ${
						frontDemo === i
							? "bg-foreground"
							: "bg-foreground/20 hover:bg-foreground/40"
					}`}
					aria-label={t("showDemo", { number: i + 1 })}
				/>
			))}
		</div>
	);

	return (
		<div
			className="relative flex flex-col items-center gap-4"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{/* Desktop: stacked cards */}
			<div className="hidden lg:block">
				<div className="relative h-[600px] w-[490px]">
					<div className="absolute -left-20 -top-12 z-40 select-none">
						<span
							className="block text-2xl text-foreground/70 rotate-[-6deg]"
							style={{ fontFamily: "var(--font-caveat)" }}
						>
							{t("tryItOut")}
						</span>
						{/* Hand-drawn arrow curving down-right */}
						<svg
							width="80"
							height="60"
							viewBox="0 0 80 60"
							fill="none"
							className="ml-6 -mt-1 text-foreground/50"
						>
							<path
								d="M4 4 C 20 8, 40 10, 55 30 C 62 40, 65 48, 68 52"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								fill="none"
							/>
							{/* Arrowhead */}
							<path
								d="M62 44 L 68 52 L 58 50"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
					</div>
					{order.map((demoIndex, stackPos) => (
						<motion.div
							key={demoIndex}
							animate={{
								x: DESKTOP_POSITIONS[stackPos].x,
								y: DESKTOP_POSITIONS[stackPos].y,
								rotate: DESKTOP_POSITIONS[stackPos].rotate,
								scale: DESKTOP_POSITIONS[stackPos].scale,
							}}
							transition={{
								type: "spring",
								stiffness: 300,
								damping: 25,
							}}
							className="absolute origin-bottom-left rounded-lg shadow-xl"
							style={{ zIndex: stackPos * 10 }}
						>
							{stackPos < 2 && (
								<div
									className="absolute inset-0 z-10 cursor-pointer"
									onClick={() => bringToFront(demoIndex)}
								/>
							)}
							<DemoCaptchaWidget
								prompt={demos[demoIndex].prompt}
								images={demos[demoIndex].images}
								onVerify={(indices) => handleVerify(demoIndex, indices)}
								onRefresh={() => handleRefresh(demoIndex)}
								errorMessage={errorMessages[demoIndex]}
								idleHighlight={stackPos === 2}
							/>
						</motion.div>
					))}

					{/* Desktop arrow buttons — show on hover */}
					<button
						type="button"
						onClick={cycleBackward}
						className={`absolute -left-18 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/80 p-2 text-muted-foreground shadow-md backdrop-blur transition-opacity hover:text-foreground ${hovered ? "opacity-100" : "opacity-0"}`}
						aria-label={t("previousDemo")}
					>
						<ChevronLeft className="size-5" />
					</button>
					<button
						type="button"
						onClick={cycleForward}
						className={`absolute -right-12 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/80 p-2 text-muted-foreground shadow-md backdrop-blur transition-opacity hover:text-foreground ${hovered ? "opacity-100" : "opacity-0"}`}
						aria-label={t("nextDemo")}
					>
						<ChevronRight className="size-5" />
					</button>
				</div>
			</div>

			{/* Mobile: single card with horizontal slide transition */}
			<div className="relative lg:hidden">
				<div className="relative overflow-hidden">
					<AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
						<motion.div
							key={frontDemo}
							custom={slideDir}
							initial={{ x: slideDir * 350, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: slideDir * -350, opacity: 0 }}
							transition={{ type: "spring", stiffness: 300, damping: 30 }}
						>
							<DemoCaptchaWidget
								prompt={demos[frontDemo].prompt}
								images={demos[frontDemo].images}
								onVerify={(ids) => handleVerify(frontDemo, ids)}
								onRefresh={() => handleRefresh(frontDemo)}
								errorMessage={errorMessages[frontDemo]}
							/>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Mobile nav: arrows + dots in one row */}
				<div className="mt-3 flex items-center justify-center gap-4">
					<button
						type="button"
						onClick={cycleBackward}
						className="rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-md backdrop-blur hover:text-foreground"
						aria-label={t("previousDemo")}
					>
						<ChevronLeft className="size-4" />
					</button>
					{dotIndicators}
					<button
						type="button"
						onClick={cycleForward}
						className="rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-md backdrop-blur hover:text-foreground"
						aria-label={t("nextDemo")}
					>
						<ChevronRight className="size-4" />
					</button>
				</div>
			</div>

			{/* Desktop dot indicators */}
			<div className="hidden lg:block">{dotIndicators}</div>
		</div>
	);
}

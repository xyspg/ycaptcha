"use client";

import { Check, RotateCw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

export interface DemoCaptchaImage {
	url: string;
}

interface DemoCaptchaWidgetProps {
	prompt: string;
	images: DemoCaptchaImage[];
	onVerify: (selectedIndices: number[]) => void;
	onRefresh: () => void;
	errorMessage?: string | null;
	/** Enable periodic ghost-click animation to hint interactivity */
	idleHighlight?: boolean;
}

export function DemoCaptchaWidget({
	prompt,
	images,
	onVerify,
	onRefresh,
	errorMessage,
	idleHighlight,
}: DemoCaptchaWidgetProps) {
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [ghostCell, setGhostCell] = useState<number | null>(null);
	const ghostTimeout = useRef<ReturnType<typeof setTimeout>>(null);
	const interactedRef = useRef(false);
	const idleHighlightRef = useRef(idleHighlight);
	idleHighlightRef.current = idleHighlight;

	// Timer is external system sync — set up once on mount, read props via ref
	useMountEffect(() => {
		const interval = setInterval(() => {
			if (!idleHighlightRef.current || interactedRef.current) return;
			const idx = Math.floor(Math.random() * images.length);
			setGhostCell(idx);
			ghostTimeout.current = setTimeout(() => setGhostCell(null), 500);
		}, 2000);
		return () => {
			clearInterval(interval);
			if (ghostTimeout.current) clearTimeout(ghostTimeout.current);
		};
	});

	const toggleSelect = useCallback((index: number) => {
		interactedRef.current = true;
		setGhostCell(null);
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	const handleVerify = () => {
		if (selected.size === 0) return;
		onVerify(Array.from(selected));
		setSelected(new Set());
	};

	const handleRefresh = () => {
		setSelected(new Set());
		onRefresh();
	};

	return (
		<div
			className="w-[350px] select-none overflow-hidden rounded border bg-white shadow-md"
			style={{ fontFamily: "Roboto, Helvetica, Arial, sans-serif" }}
		>
			{/* Header */}
			<div className="bg-[#4285f4] px-4 py-[14px]">
				<p className="text-[14px] leading-snug text-white/90">
					Select all images with
				</p>
				<p className="text-[24px] font-bold leading-tight text-white">
					{prompt}
				</p>
			</div>

			{/* Image grid */}
			<div className="relative">
				<div className="grid grid-cols-3 gap-px bg-[#e0e0e0]">
					{images.map((img, index) => {
						const isSelected = selected.has(index);
						const isGhost = ghostCell === index && !isSelected;
						const showSelected = isSelected || isGhost;
						return (
							<button
								key={index}
								type="button"
								onClick={() => toggleSelect(index)}
								className="relative aspect-square cursor-pointer overflow-hidden bg-white outline-none"
							>
								<img
									src={img.url}
									alt=""
									draggable={false}
									className={cn(
										"pointer-events-none h-full w-full object-cover transition-transform duration-200 ease-out",
										showSelected && "scale-[0.8] rounded-sm",
									)}
								/>
								{showSelected && (
									<div
										className={cn(
											"absolute top-0.5 left-0.5 flex size-[26px] items-center justify-center rounded-full bg-[#4285f4] shadow transition-opacity duration-200",
											isGhost && "opacity-70",
										)}
									>
										<Check className="size-4 text-white" strokeWidth={3} />
									</div>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* Error message */}
			{errorMessage && (
				<p className="py-2 text-center text-[13px] text-[#e53935]">
					{errorMessage}
				</p>
			)}

			{/* Footer */}
			<div className="flex items-center justify-between border-t border-[#e0e0e0] bg-[#f9f9f9] px-2 py-2">
				<button
					type="button"
					onClick={handleRefresh}
					className="rounded p-2 text-[#9b9b9b] transition-colors hover:text-[#4285f4]"
					aria-label="Get a new challenge"
				>
					<RotateCw className="size-[18px]" />
				</button>
				<button
					type="button"
					onClick={handleVerify}
					disabled={selected.size === 0}
					className={cn(
						"rounded-sm px-7 py-[9px] text-[14px] font-bold uppercase tracking-wide text-white transition-colors",
						selected.size === 0
							? "cursor-not-allowed bg-[#4285f4]/40"
							: "bg-[#4285f4] shadow-sm hover:bg-[#3367d6] active:bg-[#2a56c6]",
					)}
				>
					Verify
				</button>
			</div>
		</div>
	);
}

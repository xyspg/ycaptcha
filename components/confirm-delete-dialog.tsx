"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	/** If provided, user must type this to confirm (for destructive deletes like sites) */
	confirmText?: string;
	onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText,
	onConfirm,
}: ConfirmDeleteDialogProps) {
	const t = useTranslations("confirmDelete");
	const tc = useTranslations("common");
	const [typed, setTyped] = useState("");
	const [isPending, startTransition] = useTransition();

	const canConfirm = confirmText ? typed === confirmText : true;

	const handleConfirm = () => {
		startTransition(async () => {
			await onConfirm();
			onOpenChange(false);
		});
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(v) => {
				if (!v) setTyped("");
				onOpenChange(v);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				{confirmText && (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-muted-foreground">
							{t.rich("typeToConfirm", {
								bold: (chunks) => (
									<span className="font-medium text-foreground">{chunks}</span>
								),
								text: confirmText,
							})}
						</p>
						<Input
							value={typed}
							onChange={(e) => setTyped(e.target.value)}
							placeholder={confirmText}
							autoFocus
						/>
					</div>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>
						{tc("cancel")}
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={!canConfirm || isPending}
						onClick={(e) => {
							e.preventDefault();
							handleConfirm();
						}}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isPending ? tc("deleting") : tc("delete")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

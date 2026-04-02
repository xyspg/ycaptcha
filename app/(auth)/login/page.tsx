"use client";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { FingerprintPattern } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { authClient } from "@/lib/auth/client";

function getSafeRedirect(value: string | null): string {
	if (value?.startsWith("/") && !value.startsWith("//")) return value;
	return "/dashboard";
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	);
}

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = getSafeRedirect(searchParams.get("redirect"));
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useMountEffect(() => {
		authClient.signIn.passkey({ autoFill: true }).then(({ error: err }) => {
			// don't log error bc user silently rejected
			if (err) return;
			router.push(redirectTo);
		});
	});

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		await authClient.signIn.email(
			{
				email: formData.get("email") as string,
				password: formData.get("password") as string,
			},
			{
				onRequest: () => {
					setLoading(true);
					setError(null);
				},
				onSuccess: () => {
					router.push(redirectTo);
				},
				onError: (ctx) => {
					setLoading(false);
					// TODO(sentry)
					setError(ctx.error.message);
				},
			},
		);
	}

	async function handlePasskeySignIn() {
		setLoading(true);
		setError(null);
		const { error: err } = await authClient.signIn.passkey();
		if (err) {
			setLoading(false);
			if (
				err.message?.includes("aborted") ||
				err.message?.includes("cancelled")
			)
				return;
			//TODO(sentry)
			setError(err.message ?? "Passkey sign-in failed");
			return;
		}
		router.push(redirectTo);
	}

	return (
		<div className="w-full max-w-sm">
			<div className="mb-8 flex justify-center">
				<Image
					src="/ycaptcha.webp"
					alt="yCAPTCHA"
					width={200}
					height={60}
					style={{ height: "auto" }}
					priority
				/>
			</div>

			<Card className="bg-background ring-0 md:ring-1">
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Welcome back</CardTitle>
					<CardDescription>Sign in to your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="you@example.com"
								autoComplete="username webauthn"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								placeholder="••••••••"
								autoComplete="current-password"
								required
							/>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Signing in..." : "Sign In"}
						</Button>
					</form>

					<div className="relative my-6">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
							or
						</span>
					</div>

					<div className="flex flex-col gap-3">
						<Button
							variant="outline"
							className="w-full"
							disabled={loading}
							onClick={handlePasskeySignIn}
						>
							<FingerprintPattern className="mr-2 h-4 w-4" />
							Sign in with Passkey
						</Button>

						<Button
							variant="outline"
							className="w-full"
							onClick={() =>
								authClient.signIn.social({
									provider: "github",
									callbackURL: redirectTo,
								})
							}
						>
							<GitHubLogoIcon className="mr-1" />
							Continue with GitHub
						</Button>
					</div>
				</CardContent>
				<CardFooter className="bg-background md:bg-muted/50 justify-center">
					<p className="text-sm text-muted-foreground">
						Don&apos;t have an account?{" "}
						<Link
							href={
								redirectTo !== "/dashboard"
									? `/signup?redirect=${encodeURIComponent(redirectTo)}`
									: "/signup"
							}
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Sign up
						</Link>
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}

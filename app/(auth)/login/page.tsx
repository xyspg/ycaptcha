"use client";

import { FingerprintPattern } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useMountEffect(() => {
		authClient.signIn.passkey({ autoFill: true }).then(({ error: err }) => {
			if (err) return;
			router.push("/dashboard");
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
					router.push("/dashboard");
				},
				onError: (ctx) => {
					setLoading(false);
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
			setError(err.message ?? "Passkey sign-in failed");
			return;
		}
		router.push("/dashboard");
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

			<Card>
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
									callbackURL: "/dashboard",
								})
							}
						>
							<svg
								viewBox="0 0 24 24"
								className="mr-2 h-4 w-4"
								fill="currentColor"
							>
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							Continue with GitHub
						</Button>
					</div>
				</CardContent>
				<CardFooter className="justify-center">
					<p className="text-sm text-muted-foreground">
						Don&apos;t have an account?{" "}
						<Link
							href="/signup"
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

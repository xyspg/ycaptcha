"use client";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
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
import { authClient } from "@/lib/auth/client";

function getSafeRedirect(value: string | null): string {
	if (value?.startsWith("/") && !value.startsWith("//")) return value;
	return "/dashboard";
}

export default function SignupPage() {
	return (
		<Suspense>
			<SignupForm />
		</Suspense>
	);
}

function SignupForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectTo = getSafeRedirect(searchParams.get("redirect"));
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		await authClient.signUp.email(
			{
				email: formData.get("email") as string,
				password,
				name: formData.get("name") as string,
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
					setError(ctx.error.message);
				},
			},
		);
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
					<CardTitle className="text-xl">Create an account</CardTitle>
					<CardDescription>Get started with yCAPTCHA</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="Your name"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="you@example.com"
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
								minLength={8}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								placeholder="••••••••"
								minLength={8}
								required
							/>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Creating account..." : "Sign Up"}
						</Button>
					</form>

					<div className="relative my-6">
						<Separator />
						<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
							or
						</span>
					</div>

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
				</CardContent>
				<CardFooter className="bg-background md:bg-muted/50 justify-center">
					<p className="text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							href={
								redirectTo !== "/dashboard"
									? `/login?redirect=${encodeURIComponent(redirectTo)}`
									: "/login"
							}
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Sign in
						</Link>
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}

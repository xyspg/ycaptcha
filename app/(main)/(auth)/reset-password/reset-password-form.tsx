"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { authClient } from "@/lib/auth/client";

export default function ResetPasswordPageClient() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const hasValidToken = Boolean(token) && errorParam !== "INVALID_TOKEN";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setError(t("invalidDescription"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } = await authClient.resetPassword({
      token,
      newPassword,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message ?? t("genericError"));
      return;
    }

    setIsComplete(true);
  }

  if (!hasValidToken) {
    return <InvalidLinkCard />;
  }

  if (isComplete) {
    return <ResetSuccessCard />;
  }

  return (
    <div className="w-full max-w-sm">
      <AuthLogo />

      <Card className="bg-background ring-0 md:ring-1">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t("passwordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("resetting") : t("submit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-background md:bg-muted/50 justify-center">
          <p className="text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function InvalidLinkCard() {
  const t = useTranslations("auth.resetPassword");

  return (
    <div className="w-full max-w-sm">
      <AuthLogo />

      <Card className="bg-background ring-0 md:ring-1">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("invalidTitle")}</CardTitle>
          <CardDescription>{t("invalidDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t("requestNewLink")}</Link>
          </Button>
        </CardContent>
        <CardFooter className="bg-background md:bg-muted/50 justify-center">
          <p className="text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function ResetSuccessCard() {
  const t = useTranslations("auth.resetPassword");

  return (
    <div className="w-full max-w-sm">
      <AuthLogo />

      <Card className="bg-background ring-0 md:ring-1">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
          <CardDescription>{t("successDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthLogo() {
  return (
    <div className="mb-8 flex justify-center">
      <Link href="/">
        <Image
          src="/ycaptcha.webp"
          alt="yCAPTCHA"
          width={200}
          height={60}
          style={{ width: "auto", height: "auto" }}
          priority
        />
      </Link>
    </div>
  );
}

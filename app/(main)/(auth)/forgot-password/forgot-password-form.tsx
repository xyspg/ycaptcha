"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPageClient() {
  const t = useTranslations("auth.forgotPassword");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const redirectTo = new URL(
      "/reset-password",
      window.location.origin,
    ).toString();

    setLoading(true);
    setError(null);

    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo,
    });

    setLoading(false);

    if (requestError) {
      setError(requestError.message ?? t("genericError"));
      return;
    }

    setSubmittedEmail(email);
  }

  if (submittedEmail) {
    return <RequestSentCard email={submittedEmail} />;
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
              <Label htmlFor="email">{tc("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("sending") : t("submit")}
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

function RequestSentCard({ email }: { email: string }) {
  const t = useTranslations("auth.forgotPassword");

  return (
    <div className="w-full max-w-sm">
      <AuthLogo />

      <Card className="bg-background ring-0 md:ring-1">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("successTitle")}</CardTitle>
          <CardDescription className="pt-2">
            {t("successDescription", { email })}
          </CardDescription>
        </CardHeader>
        <CardContent />
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

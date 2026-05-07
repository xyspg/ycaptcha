import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fingerprint, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: Login,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type LoginInput = z.infer<typeof loginSchema>;

function Login() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [magicSent, setMagicSent] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    // zod 4.4 vs resolver's bundled 4.3 — minor type-version mismatch; runtime is fine
    resolver: zodResolver(loginSchema as never),
    defaultValues: { email: "", password: "" },
  });

  const signIn = useMutation({
    mutationFn: async (input: LoginInput) => {
      const result = await authClient.signIn.email(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => navigate({ to: "/dashboard" }),
  });

  const passkey = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.passkey();
      if (result?.error) throw new Error(result.error.message);
      return result?.data;
    },
    onSuccess: () => navigate({ to: "/dashboard" }),
  });

  const magic = useMutation({
    mutationFn: async () => {
      const email = form.getValues("email");
      if (!email) throw new Error("Enter your email first");
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
      });
      if (result.error) throw new Error(result.error.message);
      return email;
    },
    onSuccess: (email) => setMagicSent(email),
  });

  const error =
    signIn.error ?? passkey.error ?? magic.error ?? form.formState.errors.root;
  const errorMsg =
    error instanceof Error ? error.message : (error?.message ?? null);

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Sign in to yCAPTCHA</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Use your email, a magic link, or a registered passkey.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            onSubmit={form.handleSubmit((v) => signIn.mutate(v))}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                <Trans>Email</Trans>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...form.register("email")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">
                <Trans>Password</Trans>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
            </div>
            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? (
                <Trans>Signing in…</Trans>
              ) : (
                <Trans>Sign in</Trans>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              <Trans>or</Trans>
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => magic.mutate()}
              disabled={magic.isPending}
            >
              <Mail />
              {magic.isPending ? (
                <Trans>Sending…</Trans>
              ) : (
                <Trans>Email me a magic link</Trans>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => passkey.mutate()}
              disabled={passkey.isPending}
            >
              <Fingerprint />
              <Trans>Sign in with passkey</Trans>
            </Button>
          </div>

          {magicSent && (
            <p className="text-sm text-muted-foreground">
              <Trans>Magic link sent to {magicSent}. Check your inbox.</Trans>
            </p>
          )}
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

          <p className="text-center text-sm text-muted-foreground">
            <Trans>
              No account?{" "}
              <Link to="/signup" className="underline hover:text-foreground">
                Sign up
              </Link>
            </Trans>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Trans>
              Forgot password?{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={async () => {
                  const email = form.getValues("email");
                  if (!email) {
                    form.setError("root", {
                      message: t`Enter your email first.`,
                    });
                    return;
                  }
                  await authClient.requestPasswordReset({
                    email,
                    redirectTo: `${window.location.origin}/reset`,
                  });
                  form.setError("root", {
                    message: t`Reset link sent to ${email}.`,
                  });
                }}
              >
                Reset it
              </button>
            </Trans>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

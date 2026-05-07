import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const signupSchema = z.object({
  name: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
});
type SignupInput = z.infer<typeof signupSchema>;

function SignupPage() {
  const { t } = useLingui();
  const navigate = useNavigate();

  const form = useForm<SignupInput>({
    // zod 4.4 vs resolver's bundled 4.3 — minor type-version mismatch; runtime is fine
    resolver: zodResolver(signupSchema as never),
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUp = useMutation({
    mutationFn: async (input: SignupInput) => {
      const result = await authClient.signUp.email(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => navigate({ to: "/dashboard" }),
    onError: (err: Error) => form.setError("root", { message: err.message }),
  });

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Create an account</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>You can add a passkey or magic-link sign-in later.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => signUp.mutate(v))}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                <Trans>Name</Trans>
              </Label>
              <Input
                id="name"
                placeholder={t`Your name`}
                autoComplete="name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
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
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">
                <Trans>Password</Trans>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={signUp.isPending}>
              {signUp.isPending ? (
                <Trans>Creating account…</Trans>
              ) : (
                <Trans>Sign up</Trans>
              )}
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Trans>
              Already have an account?{" "}
              <Link to="/login" className="underline hover:text-foreground">
                Sign in
              </Link>
            </Trans>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

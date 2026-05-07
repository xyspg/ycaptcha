import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
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

export const Route = createFileRoute("/reset")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: ResetPage,
});

const resetSchema = z.object({
  password: z.string().min(8, "At least 8 characters"),
});
type ResetInput = z.infer<typeof resetSchema>;

function ResetPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const form = useForm<ResetInput>({
    // zod 4.4 vs resolver's bundled 4.3 — minor type-version mismatch; runtime is fine
    resolver: zodResolver(resetSchema as never),
    defaultValues: { password: "" },
  });

  const reset = useMutation({
    mutationFn: async (input: ResetInput) => {
      if (!token) throw new Error("Missing reset token");
      const result = await authClient.resetPassword({
        newPassword: input.password,
        token,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => navigate({ to: "/login" }),
    onError: (err: Error) => form.setError("root", { message: err.message }),
  });

  if (!token) {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Invalid reset link</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                This page must be opened via the link in the reset email.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login" className="text-sm underline">
              <Trans>Back to sign in</Trans>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Choose a new password</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => reset.mutate(v))}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">
                <Trans>New password</Trans>
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
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending ? (
                <Trans>Saving…</Trans>
              ) : (
                <Trans>Set new password</Trans>
              )}
            </Button>
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

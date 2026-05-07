import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => navigate({ to: "/dashboard" }),
  });

  return (
    <main
      style={{ maxWidth: 360, margin: "64px auto", fontFamily: "system-ui" }}
    >
      <h1>
        <Trans>Sign in</Trans>
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn.mutate();
        }}
        style={{ display: "grid", gap: 12 }}
      >
        <label>
          <Trans>Email</Trans>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>
        <label>
          <Trans>Password</Trans>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%" }}
          />
        </label>
        <button type="submit" disabled={signIn.isPending}>
          {signIn.isPending ? (
            <Trans>Signing in…</Trans>
          ) : (
            <Trans>Sign in</Trans>
          )}
        </button>
        {signIn.error && (
          <p style={{ color: "crimson" }}>{(signIn.error as Error).message}</p>
        )}
      </form>
    </main>
  );
}

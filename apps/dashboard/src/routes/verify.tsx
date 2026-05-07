import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Check your email</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              We sent you a verification link. Click it to activate your
              account, then sign in.
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

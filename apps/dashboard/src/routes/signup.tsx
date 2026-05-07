import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <section style={{ maxWidth: 360, margin: "60px auto" }}>
      <h1>
        <Trans>Sign up</Trans>
      </h1>
      <p>
        <Trans>Account creation flow lands in the auth-flows step.</Trans>
      </p>
      <p>
        <Link to="/login">
          <Trans>Back to login</Trans>
        </Link>
      </p>
    </section>
  );
}

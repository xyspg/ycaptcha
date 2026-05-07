import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>
        <Trans>yCAPTCHA Dashboard</Trans>
      </h1>
      <p>
        <Trans>
          Phase 3 scaffold ready. Pages port in over the next iterations.
        </Trans>
      </p>
      <ul>
        <li>
          <Link to="/login">Login</Link>
        </li>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
      </ul>
    </main>
  );
}

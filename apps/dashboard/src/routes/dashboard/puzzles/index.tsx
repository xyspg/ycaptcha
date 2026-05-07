import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/puzzles/")({
  component: PuzzlesPage,
});

function PuzzlesPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">
        <Trans>Puzzles</Trans>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Trans>Coming soon.</Trans>
      </p>
    </section>
  );
}

import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/audio/")({
  component: AudioPage,
});

function AudioPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">
        <Trans>Audio</Trans>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Trans>Coming soon.</Trans>
      </p>
    </section>
  );
}

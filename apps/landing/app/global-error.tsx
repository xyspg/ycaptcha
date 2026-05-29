"use client";

import NextError from "next/error";

// NOTE: Sentry error reporting was stripped from apps/landing during the
// monorepo port and is not yet re-wired (tracked in apps/CUTOVER.md
// "Post-cutover hardening"). Re-add error capture here once the landing error
// sink is configured, so top-level render crashes are not silently dropped.
export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}

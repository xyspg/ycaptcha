import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://60c6ac0d0461c7f38c056441e6b61f60@o4505754532642816.ingest.us.sentry.io/4511154203852800",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

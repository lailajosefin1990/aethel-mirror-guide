import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("VITE_SENTRY_DSN not set — Sentry disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: "aethel-mirror@1.0.0",

    // 10% of transactions — sufficient for small app, keeps costs low
    tracesSampleRate: 0.1,

    // Record full session replay on errors
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Filter noisy errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection",
    ],

    beforeSend(event) {
      // Add app context to every error
      event.contexts = {
        ...event.contexts,
        app: {
          environment: import.meta.env.MODE,
          version: "1.0.0",
        },
      };
      return event;
    },
  });
}

// Re-export for use in error handlers
export { Sentry };

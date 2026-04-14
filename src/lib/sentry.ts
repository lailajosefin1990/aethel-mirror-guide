import * as Sentry from "@sentry/react";

export function initSentry() {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      console.warn("VITE_SENTRY_DSN not set — Sentry disabled");
      return;
    }

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: "aethel-mirror@1.0.0",
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0,

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],

      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "Non-Error promise rejection",
      ],

      beforeSend(event) {
        event.contexts = {
          ...event.contexts,
          app: { environment: import.meta.env.MODE, version: "1.0.0" },
        };
        return event;
      },
    });
  } catch (err) {
    console.warn("Sentry init failed:", err);
  }
}

// Re-export for use in error handlers
export { Sentry };

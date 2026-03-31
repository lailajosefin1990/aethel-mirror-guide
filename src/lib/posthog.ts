import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

export const initPostHog = () => {
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    autocapture: false,
  });
};

export const identifyUser = (userId: string, email?: string) => {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, email ? { email } : {});
};

export const resetUser = () => {
  if (!POSTHOG_KEY) return;
  posthog.reset();
};

export const track = (event: string, properties?: Record<string, unknown>) => {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
};

export default posthog;

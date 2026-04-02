import { describe, it, expect } from "vitest";
import { appReducer, initialState, type AppState } from "@/context/appReducer";
import { CONFIDENCE_MESSAGES } from "@/lib/reading";
import { STRIPE_TIERS, type SubscriptionTier } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { EVENTS, trackEvent } from "@/lib/analytics";

// ─── cn() utility ──────────────────────────────────────────────────
describe("cn() utility", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates tailwind classes", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });
});

// ─── reading.ts exports ────────────────────────────────────────────
describe("CONFIDENCE_MESSAGES", () => {
  it("has entries for low, medium, high", () => {
    expect(CONFIDENCE_MESSAGES.low).toBeDefined();
    expect(CONFIDENCE_MESSAGES.medium).toBeDefined();
    expect(CONFIDENCE_MESSAGES.high).toBeDefined();
  });

  it("returns non-empty strings", () => {
    expect(CONFIDENCE_MESSAGES.low.length).toBeGreaterThan(0);
    expect(CONFIDENCE_MESSAGES.medium.length).toBeGreaterThan(0);
    expect(CONFIDENCE_MESSAGES.high.length).toBeGreaterThan(0);
  });
});

// ─── stripe.ts exports ─────────────────────────────────────────────
describe("STRIPE_TIERS", () => {
  it("has mirror, mirror_pro, and practitioner tiers", () => {
    expect(STRIPE_TIERS.mirror).toBeDefined();
    expect(STRIPE_TIERS.mirror_pro).toBeDefined();
    expect(STRIPE_TIERS.practitioner).toBeDefined();
  });

  it("each tier has required fields", () => {
    for (const tier of Object.values(STRIPE_TIERS)) {
      expect(tier.price_id).toMatch(/^price_/);
      expect(tier.product_id).toMatch(/^prod_/);
      expect(tier.name).toBeTruthy();
      expect(tier.price).toBeTruthy();
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });

  it("SubscriptionTier type includes free", () => {
    const tier: SubscriptionTier = "free";
    expect(tier).toBe("free");
  });
});

// ─── analytics.ts ──────────────────────────────────────────────────
describe("analytics EVENTS registry", () => {
  it("has all expected event names", () => {
    expect(EVENTS.READING_GENERATED).toBe("reading_generated");
    expect(EVENTS.READING_REGENERATED).toBe("reading_regenerated");
    expect(EVENTS.ANONYMOUS_READING_STARTED).toBe("anonymous_reading_started");
    expect(EVENTS.CRISIS_SIGNAL_DETECTED).toBe("crisis_signal_detected");
    expect(EVENTS.JOURNAL_ENTRY_DELETED).toBe("journal_entry_deleted");
    expect(EVENTS.ACCOUNT_DELETED).toBe("account_deleted");
  });

  it("all event values are lowercase snake_case strings", () => {
    for (const [key, value] of Object.entries(EVENTS)) {
      expect(typeof value).toBe("string");
      expect(value).toMatch(/^[a-z][a-z_]*[a-z]$/);
    }
  });
});

// ─── appReducer — remaining uncovered actions ──────────────────────
describe("appReducer — remaining actions", () => {
  it("SET_TAB changes active tab", () => {
    const next = appReducer(initialState, { type: "SET_TAB", tab: "calendar" });
    expect(next.activeTab).toBe("calendar");
    expect(next.view).toBe("home"); // unchanged
  });

  it("SET_QUESTION stores question data", () => {
    const q = { domain: "Love & people", question: "Is this right?", mode: "Reflect with me" };
    const next = appReducer(initialState, { type: "SET_QUESTION", data: q });
    expect(next.questionData).toEqual(q);
  });

  it("SET_READING_DATA stores reading data", () => {
    const r = {
      astrology_reading: "test",
      design_insights: ["a", "b", "c"],
      third_way: "test way",
      journal_prompt: "test?",
      confidence_level: "high" as const,
      is_fallback: false,
    };
    const next = appReducer(initialState, { type: "SET_READING_DATA", data: r });
    expect(next.readingData).toEqual(r);
  });

  it("SET_PROFILE_BIRTH stores profile birth data", () => {
    const b = { birth_date: "1994-05-29", birth_time: "00:15", birth_place: "Barcelona", birth_lat: 41.39, birth_lng: 2.17, birth_timezone: "Europe/Madrid" };
    const next = appReducer(initialState, { type: "SET_PROFILE_BIRTH", data: b });
    expect(next.profileBirthData).toEqual(b);
  });

  it("SET_JOURNAL_ENTRIES replaces all entries", () => {
    const entries = [{ id: "1", domain: "Work", date: "1 Jan", createdAt: "2026-01-01", thirdWay: "x", question: "y?" }];
    const next = appReducer(initialState, { type: "SET_JOURNAL_ENTRIES", entries });
    expect(next.journalEntries).toEqual(entries);
  });

  it("UPDATE_JOURNAL_ENTRY updates outcome on matching entry", () => {
    const entries = [
      { id: "a", domain: "Work", date: "1", createdAt: "2026-01-01", thirdWay: "x", question: "q?" },
      { id: "b", domain: "Love", date: "2", createdAt: "2026-01-02", thirdWay: "y", question: "q2?" },
    ];
    const state: AppState = { ...initialState, journalEntries: entries };
    const outcome = { followed: "yes" as const, note: "It worked" };
    const next = appReducer(state, { type: "UPDATE_JOURNAL_ENTRY", id: "a", outcome });
    expect(next.journalEntries[0].outcome).toEqual(outcome);
    expect(next.journalEntries[1].outcome).toBeUndefined();
  });

  it("SET_LOADING_ERROR sets and clears error", () => {
    let state = appReducer(initialState, { type: "SET_LOADING_ERROR", error: "Network failed" });
    expect(state.loadingError).toBe("Network failed");
    state = appReducer(state, { type: "SET_LOADING_ERROR", error: null });
    expect(state.loadingError).toBeNull();
  });

  it("SET_PROFILE_LOADED marks profile as loaded", () => {
    const next = appReducer(initialState, { type: "SET_PROFILE_LOADED", loaded: true });
    expect(next.profileLoaded).toBe(true);
  });

  it("SET_PENDING_SAVE toggles pending save", () => {
    let state = appReducer(initialState, { type: "SET_PENDING_SAVE", pending: true });
    expect(state.pendingSave).toBe(true);
    state = appReducer(state, { type: "SET_PENDING_SAVE", pending: false });
    expect(state.pendingSave).toBe(false);
  });

  it("SET_PUSH_SHEET opens and closes push sheet", () => {
    const next = appReducer(initialState, { type: "SET_PUSH_SHEET", open: true });
    expect(next.pushSheetOpen).toBe(true);
  });

  it("PUSH_PROMPT_SHOWN sets hasShownPushPrompt to true", () => {
    const next = appReducer(initialState, { type: "PUSH_PROMPT_SHOWN" });
    expect(next.hasShownPushPrompt).toBe(true);
  });

  it("SET_CONSENT_GATE shows/hides consent gate", () => {
    const next = appReducer(initialState, { type: "SET_CONSENT_GATE", show: true });
    expect(next.showConsentGate).toBe(true);
  });

  it("SET_CRISIS shows crisis interstitial", () => {
    const next = appReducer(initialState, { type: "SET_CRISIS", show: true });
    expect(next.showCrisis).toBe(true);
  });

  it("START_ANONYMOUS_READING clears error and sets view to loading", () => {
    const state: AppState = { ...initialState, loadingError: "old error", view: "question" };
    const next = appReducer(state, { type: "START_ANONYMOUS_READING" });
    expect(next.loadingError).toBeNull();
    expect(next.view).toBe("loading");
  });

  it("SET_BIRTH_DATA stores birth data", () => {
    const bd = {
      date: new Date("1994-05-29"),
      time: "00:15",
      unknownTime: false,
      birthPlace: "Barcelona",
      birthLat: 41.39,
      birthLng: 2.17,
      birthTimezone: "Europe/Madrid",
    };
    const next = appReducer(initialState, { type: "SET_BIRTH_DATA", data: bd });
    expect(next.birthData).toEqual(bd);
  });

  it("SAVE_COMPLETE defaults tab to journey when not specified", () => {
    const next = appReducer(initialState, { type: "SAVE_COMPLETE" });
    expect(next.activeTab).toBe("journey");
    expect(next.view).toBe("dashboard");
  });

  it("unknown action returns state unchanged", () => {
    const state = { ...initialState, view: "reading" as const };
    // @ts-expect-error — testing unknown action
    const next = appReducer(state, { type: "NONEXISTENT" });
    expect(next).toEqual(state);
  });
});

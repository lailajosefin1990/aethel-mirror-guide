import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React, { useReducer } from "react";
import { appReducer, initialState, type AppState, type AppAction } from "@/context/appReducer";

// ─── Hoisted Mocks ─────────────────────────────────────────────────
const { mockUser, mockSupabase, mockInvoke } = vi.hoisted(() => {
  const mockUser = { id: "user-hook-test", email: "hook@aethel.com" };
  const mockInvoke = vi.fn((..._args: any[]) =>
    Promise.resolve({
      data: {
        astrology_reading: "Hook test transit.",
        design_insights: ["— A", "— B", "— C"],
        third_way: "Hook test third way.",
        journal_prompt: "Hook test prompt?",
        confidence_level: "high",
        is_fallback: false,
      },
      error: null,
    })
  );
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "r-1" }, error: null })),
          order: vi.fn(() => ({ data: [] })),
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "r-1", created_at: new Date().toISOString() }, error: null })),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    functions: { invoke: mockInvoke },
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: mockUser } }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() })),
  };
  return { mockUser, mockSupabase, mockInvoke };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => mockSupabase) }));
vi.mock("@/lib/posthog", () => ({ track: vi.fn(), identify: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/push", () => ({ subscribeToPush: vi.fn(), wasPushDismissedRecently: vi.fn(() => true), dismissPushPrompt: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, loading: false, subscriptionTier: "free", monthlyReadingCount: 0, refreshReadingCount: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en", changeLanguage: vi.fn() } }) }));

// ─── Test Helpers ──────────────────────────────────────────────────
const profileWithBirth = {
  birth_date: "1994-05-29",
  birth_time: "00:15",
  birth_place: "Barcelona",
  birth_lat: 41.39,
  birth_lng: 2.17,
  birth_timezone: "Europe/Madrid",
};

const profileNoBirth = {
  birth_date: null, birth_time: null, birth_place: null,
  birth_lat: null, birth_lng: null, birth_timezone: null,
};

const sampleQuestion = { domain: "Work & money", question: "Should I quit?", mode: "Coach me" };

const sampleReading = {
  astrology_reading: "Test transit.",
  design_insights: ["— A", "— B", "— C"],
  third_way: "Test third way.",
  journal_prompt: "Test?",
  confidence_level: "high" as const,
  is_fallback: false,
};

// ─── 1. appReducer unit tests ──────────────────────────────────────
describe("appReducer", () => {
  it("REGENERATE increments count, sets feedback, clears error, switches to loading", () => {
    const state: AppState = { ...initialState, view: "reading", regenerationCount: 1 };
    const next = appReducer(state, { type: "REGENERATE", feedback: "Too generic" });
    expect(next.regenerationCount).toBe(2);
    expect(next.regenerationFeedback).toBe("Too generic");
    expect(next.loadingError).toBeNull();
    expect(next.view).toBe("loading");
  });

  it("REGENERATE with null feedback still increments and clears error", () => {
    const state: AppState = { ...initialState, regenerationCount: 0, loadingError: "old error" };
    const next = appReducer(state, { type: "REGENERATE", feedback: null });
    expect(next.regenerationCount).toBe(1);
    expect(next.regenerationFeedback).toBeNull();
    expect(next.loadingError).toBeNull();
    expect(next.view).toBe("loading");
  });

  it("RESET_REGENERATION sets count to 0 without changing view", () => {
    const state: AppState = { ...initialState, regenerationCount: 3, view: "reading" };
    const next = appReducer(state, { type: "RESET_REGENERATION" });
    expect(next.regenerationCount).toBe(0);
    expect(next.view).toBe("reading");
  });

  it("AUTH_REDIRECT_FOR_SAVE sets pendingSave=true and view=auth", () => {
    const next = appReducer(initialState, { type: "AUTH_REDIRECT_FOR_SAVE" });
    expect(next.pendingSave).toBe(true);
    expect(next.view).toBe("auth");
  });

  it("SAVE_COMPLETE sets view=dashboard, tab to given value, clears pendingSave", () => {
    const state: AppState = { ...initialState, pendingSave: true, view: "reading" };
    const next = appReducer(state, { type: "SAVE_COMPLETE", tab: "journey" });
    expect(next.view).toBe("dashboard");
    expect(next.activeTab).toBe("journey");
    expect(next.pendingSave).toBe(false);
  });

  it("CRISIS_RETURN clears crisis, clears question, sets view to question", () => {
    const state: AppState = { ...initialState, showCrisis: true, questionData: sampleQuestion, view: "loading" };
    const next = appReducer(state, { type: "CRISIS_RETURN" });
    expect(next.showCrisis).toBe(false);
    expect(next.questionData).toBeNull();
    expect(next.view).toBe("question");
  });

  it("ADD_JOURNAL_ENTRY prepends to existing entries", () => {
    const existing = { id: "old", domain: "Love", date: "1 Jan", createdAt: "2026-01-01", thirdWay: "old", question: "old?" };
    const newEntry = { id: "new", domain: "Work", date: "2 Apr", createdAt: "2026-04-02", thirdWay: "new", question: "new?" };
    const state: AppState = { ...initialState, journalEntries: [existing] };
    const next = appReducer(state, { type: "ADD_JOURNAL_ENTRY", entry: newEntry });
    expect(next.journalEntries).toHaveLength(2);
    expect(next.journalEntries[0].id).toBe("new");
    expect(next.journalEntries[1].id).toBe("old");
  });

  it("DELETE_JOURNAL_ENTRY removes the entry by id", () => {
    const entries = [
      { id: "a", domain: "Work", date: "1", createdAt: "2026-01-01", thirdWay: "a", question: "a?" },
      { id: "b", domain: "Love", date: "2", createdAt: "2026-01-02", thirdWay: "b", question: "b?" },
    ];
    const state: AppState = { ...initialState, journalEntries: entries };
    const next = appReducer(state, { type: "DELETE_JOURNAL_ENTRY", id: "a" });
    expect(next.journalEntries).toHaveLength(1);
    expect(next.journalEntries[0].id).toBe("b");
  });

  it("SET_VIEW only changes view, nothing else", () => {
    const state: AppState = { ...initialState, questionData: sampleQuestion, regenerationCount: 2 };
    const next = appReducer(state, { type: "SET_VIEW", view: "dashboard" });
    expect(next.view).toBe("dashboard");
    expect(next.questionData).toEqual(sampleQuestion);
    expect(next.regenerationCount).toBe(2);
  });

  it("CONSENT_ACCEPTED clears gate and sets checked", () => {
    const state: AppState = { ...initialState, showConsentGate: true, consentChecked: false };
    const next = appReducer(state, { type: "CONSENT_ACCEPTED" });
    expect(next.showConsentGate).toBe(false);
    expect(next.consentChecked).toBe(true);
  });
});

// ─── 2. proceedAfterAuth logic tests ───────────────────────────────
describe("proceedAfterAuth via reducer state transitions", () => {
  it("with birth data on profile → sets birth data + view=loading", () => {
    let state: AppState = { ...initialState, profileBirthData: profileWithBirth };
    state = appReducer(state, {
      type: "SET_BIRTH_DATA",
      data: {
        date: new Date(profileWithBirth.birth_date),
        time: profileWithBirth.birth_time,
        unknownTime: false,
        birthPlace: profileWithBirth.birth_place,
        birthLat: profileWithBirth.birth_lat,
        birthLng: profileWithBirth.birth_lng,
        birthTimezone: profileWithBirth.birth_timezone,
      },
    });
    state = appReducer(state, { type: "SET_LOADING_ERROR", error: null });
    state = appReducer(state, { type: "SET_VIEW", view: "loading" });
    
    expect(state.birthData).not.toBeNull();
    expect(state.birthData?.birthPlace).toBe("Barcelona");
    expect(state.loadingError).toBeNull();
    expect(state.view).toBe("loading");
  });

  it("without birth data on profile → view=birth", () => {
    let state: AppState = { ...initialState, profileBirthData: profileNoBirth };
    state = appReducer(state, { type: "SET_VIEW", view: "birth" });
    expect(state.view).toBe("birth");
    expect(state.birthData).toBeNull();
  });

  it("free user at reading limit → opens paywall", () => {
    let state: AppState = { ...initialState };
    state = appReducer(state, { type: "SET_PAYWALL", open: true });
    expect(state.paywallOpen).toBe(true);
    expect(state.view).toBe("home");
  });
});

// ─── 3. OAuth restore path ─────────────────────────────────────────
describe("OAuth restore path via reducer", () => {
  it("sessionStorage question + user returns → proceedAfterAuth fires", () => {
    sessionStorage.setItem("aethel_pending_question", JSON.stringify(sampleQuestion));

    const restored = JSON.parse(sessionStorage.getItem("aethel_pending_question")!);
    let state: AppState = { ...initialState, profileBirthData: profileWithBirth, profileLoaded: true };
    state = appReducer(state, { type: "SET_QUESTION", data: restored });

    state = appReducer(state, {
      type: "SET_BIRTH_DATA",
      data: {
        date: new Date(profileWithBirth.birth_date),
        time: profileWithBirth.birth_time,
        unknownTime: false,
        birthPlace: profileWithBirth.birth_place,
        birthLat: profileWithBirth.birth_lat,
        birthLng: profileWithBirth.birth_lng,
        birthTimezone: profileWithBirth.birth_timezone,
      },
    });
    state = appReducer(state, { type: "SET_VIEW", view: "loading" });

    expect(state.questionData).toEqual(restored);
    expect(state.view).toBe("loading");
    expect(state.birthData?.birthPlace).toBe("Barcelona");

    sessionStorage.removeItem("aethel_pending_question");
  });

  it("sessionStorage question + user returns + NO birth data → goes to birth", () => {
    sessionStorage.setItem("aethel_pending_question", JSON.stringify(sampleQuestion));
    const restored = JSON.parse(sessionStorage.getItem("aethel_pending_question")!);

    let state: AppState = { ...initialState, profileBirthData: profileNoBirth, profileLoaded: true };
    state = appReducer(state, { type: "SET_QUESTION", data: restored });
    state = appReducer(state, { type: "SET_VIEW", view: "birth" });

    expect(state.questionData).toEqual(restored);
    expect(state.view).toBe("birth");

    sessionStorage.removeItem("aethel_pending_question");
  });
});

// ─── 4. Regeneration cap via reducer ───────────────────────────────
describe("Regeneration cap via reducer", () => {
  it("allows 3 regenerations then state reflects the cap", () => {
    let state: AppState = { ...initialState, view: "reading" };

    state = appReducer(state, { type: "REGENERATE", feedback: "Feedback 1" });
    expect(state.regenerationCount).toBe(1);
    expect(state.view).toBe("loading");

    state = appReducer(state, { type: "SET_VIEW", view: "reading" });
    state = appReducer(state, { type: "REGENERATE", feedback: "Feedback 2" });
    expect(state.regenerationCount).toBe(2);

    state = appReducer(state, { type: "SET_VIEW", view: "reading" });
    state = appReducer(state, { type: "REGENERATE", feedback: "Feedback 3" });
    expect(state.regenerationCount).toBe(3);

    expect(state.regenerationCount).toBe(3);
    expect(state.view).toBe("loading");
  });

  it("RESET_REGENERATION allows starting over", () => {
    let state: AppState = { ...initialState, regenerationCount: 3 };
    state = appReducer(state, { type: "RESET_REGENERATION" });
    expect(state.regenerationCount).toBe(0);
    
    state = appReducer(state, { type: "REGENERATE", feedback: "Fresh feedback" });
    expect(state.regenerationCount).toBe(1);
    expect(state.regenerationFeedback).toBe("Fresh feedback");
  });

  it("each REGENERATE carries its specific feedback text", () => {
    let state: AppState = { ...initialState };
    
    state = appReducer(state, { type: "REGENERATE", feedback: "Too vague" });
    expect(state.regenerationFeedback).toBe("Too vague");
    
    state = appReducer(state, { type: "REGENERATE", feedback: "Not actionable" });
    expect(state.regenerationFeedback).toBe("Not actionable");
    
    state = appReducer(state, { type: "REGENERATE", feedback: null });
    expect(state.regenerationFeedback).toBeNull();
    expect(state.regenerationCount).toBe(3);
  });
});

// ─── 5. Anonymous save → auth redirect flow ────────────────────────
describe("Anonymous save → auth redirect flow", () => {
  it("AUTH_REDIRECT_FOR_SAVE → pendingSave=true, view=auth", () => {
    let state: AppState = { ...initialState, view: "reading", readingData: sampleReading, questionData: sampleQuestion };
    state = appReducer(state, { type: "AUTH_REDIRECT_FOR_SAVE" });
    expect(state.pendingSave).toBe(true);
    expect(state.view).toBe("auth");
    expect(state.readingData).toEqual(sampleReading);
    expect(state.questionData).toEqual(sampleQuestion);
  });

  it("after auth success with birth data → SAVE_COMPLETE clears pending", () => {
    let state: AppState = {
      ...initialState,
      pendingSave: true,
      view: "auth",
      readingData: sampleReading,
      questionData: sampleQuestion,
      profileBirthData: profileWithBirth,
      profileLoaded: true,
    };
    state = appReducer(state, { type: "SET_PENDING_SAVE", pending: false });
    state = appReducer(state, { type: "SAVE_COMPLETE", tab: "journey" });
    expect(state.pendingSave).toBe(false);
    expect(state.view).toBe("dashboard");
    expect(state.activeTab).toBe("journey");
  });

  it("after auth success WITHOUT birth data → goes to birth first", () => {
    let state: AppState = {
      ...initialState,
      pendingSave: true,
      view: "auth",
      profileBirthData: profileNoBirth,
      profileLoaded: true,
    };
    state = appReducer(state, { type: "SET_VIEW", view: "birth" });
    expect(state.view).toBe("birth");
    expect(state.pendingSave).toBe(true);
  });
});

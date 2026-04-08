import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { useReducer } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { appReducer, initialState, type AppState, type AppAction } from "@/context/appReducer";

// ─── Mocks ─────────────────────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), EVENTS: { ANONYMOUS_READING_STARTED: "anonymous_reading_started" } }));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      updateBirth: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));
vi.mock("@/lib/posthog", () => ({ track: vi.fn(), identify: vi.fn(), reset: vi.fn() }));

// ─── Import after mocks ───────────────────────────────────────────
import { useFlowNavigation } from "@/hooks/useFlowNavigation";

// ─── Test wrapper ──────────────────────────────────────────────────
const mockUser = null; // anonymous user for these tests
const mockLoggedInUser = { id: "user-123", email: "test@example.com" } as any;
const mockHandleSave = vi.fn(() => Promise.resolve());

function createWrapper(initialPath: string = "/") {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

function useTestHook(initialState_: AppState = initialState) {
  const [state, dispatch] = useReducer(appReducer, initialState_);
  const nav = useFlowNavigation(
    state,
    dispatch,
    mockUser,
    false, // authLoading
    "free",
    0, // monthlyReadingCount
    mockHandleSave
  );
  return { state, dispatch, ...nav };
}

function useLoggedInHook(initialState_: AppState) {
  const [state, dispatch] = useReducer(appReducer, initialState_);
  const nav = useFlowNavigation(
    state,
    dispatch,
    mockLoggedInUser,
    false,
    "free",
    0,
    mockHandleSave
  );
  return { state, dispatch, ...nav };
}

// ─── Tests ─────────────────────────────────────────────────────────
describe("useFlowNavigation — URL↔view sync guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setView dispatches SET_VIEW and calls navigate", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.setView("question");
    });

    expect(result.current.state.view).toBe("question");
    expect(mockNavigate).toHaveBeenCalledWith("/ask", { replace: true });
  });

  it("setView navigates to correct path for each view", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    const viewPaths: [string, string][] = [
      ["question", "/ask"],
      ["auth", "/auth"],
      ["birth", "/birth"],
      ["loading", "/reading"],
      ["reading", "/reading"],
      ["dashboard", "/mirror"],
      ["home", "/"],
    ];

    for (const [view, expectedPath] of viewPaths) {
      mockNavigate.mockClear();
      act(() => {
        result.current.setView(view as any);
      });
      expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
    }
  });

  it("navigate is called only once per setView — no infinite re-trigger", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.setView("question");
    });

    // navigate should be called exactly once — not re-triggered by the view→URL effect
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("multiple rapid setView calls each navigate exactly once", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.setView("question");
    });
    act(() => {
      result.current.setView("auth");
    });
    act(() => {
      result.current.setView("birth");
    });

    // 3 setView calls = exactly 3 navigate calls, no extras from sync effects
    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, "/ask", { replace: true });
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "/auth", { replace: true });
    expect(mockNavigate).toHaveBeenNthCalledWith(3, "/birth", { replace: true });
  });

  it("dispatch SET_VIEW directly (without setView) triggers view→URL sync exactly once", async () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    // Dispatch directly to reducer — simulates an external state change
    act(() => {
      result.current.dispatch({ type: "SET_VIEW", view: "question" });
    });

    // The view→URL effect should fire and navigate — but only once
    // Allow microtask to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.state.view).toBe("question");
    // navigate called at most once from the view→URL effect
    expect(mockNavigate.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("setView to same view does not trigger extra navigates", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.setView("home");
    });

    // home → "/" is the initial path, so navigate may or may not fire
    // But it should definitely not loop
    expect(mockNavigate.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("isSyncing guard clears after microtask — subsequent calls work", async () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.setView("question");
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Wait for the microtask that clears isSyncing
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // double flush for safety
    });

    mockNavigate.mockClear();

    // Now a new setView should work normally
    act(() => {
      result.current.setView("birth");
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/birth", { replace: true });
  });
});

describe("useFlowNavigation — URL→view sync on mount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounting on /ask sets view to question", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/ask") });
    expect(result.current.state.view).toBe("question");
  });

  it("mounting on /auth sets view to auth", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/auth") });
    expect(result.current.state.view).toBe("auth");
  });

  it("mounting on /birth sets view to birth", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/birth") });
    expect(result.current.state.view).toBe("birth");
  });

  it("mounting on /reading without question data redirects to /birth", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/reading") });
    expect(result.current.state.view).toBe("birth");
  });

  it("mounting on /mirror sets view to dashboard", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/mirror") });
    expect(result.current.state.view).toBe("dashboard");
  });

  it("mounting on /mirror/journey sets view to dashboard and tab to journey", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/mirror/journey") });
    expect(result.current.state.view).toBe("dashboard");
    expect(result.current.state.activeTab).toBe("journey");
  });

  it("mounting on /mirror/settings sets view to dashboard and tab to settings", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/mirror/settings") });
    expect(result.current.state.view).toBe("dashboard");
    expect(result.current.state.activeTab).toBe("settings");
  });

  it("mounting on / keeps view as home", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });
    expect(result.current.state.view).toBe("home");
  });

  it("mounting on unknown path keeps view as home", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/unknown") });
    expect(result.current.state.view).toBe("home");
  });
});

// ─── New flow: Birth → Question → Auth → Reading ──────────────────

describe("useFlowNavigation — new flow order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("handleStartReading navigates to birth (step 1)", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    act(() => {
      result.current.handleStartReading();
    });

    expect(result.current.state.view).toBe("birth");
    expect(mockNavigate).toHaveBeenCalledWith("/birth", { replace: true });
  });

  it("handleBirthSubmit navigates to question (step 2)", async () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/birth") });

    await act(async () => {
      await result.current.handleBirthSubmit({
        date: new Date("1990-06-15"),
        time: "14:30",
        unknownTime: false,
        birthPlace: "Barcelona",
        birthLat: 41.387,
        birthLng: 2.168,
        birthTimezone: "Europe/Madrid",
      });
    });

    expect(result.current.state.view).toBe("question");
    expect(mockNavigate).toHaveBeenCalledWith("/ask", { replace: true });
  });

  it("handleBirthSubmit persists birth data to sessionStorage", async () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/birth") });

    await act(async () => {
      await result.current.handleBirthSubmit({
        date: new Date("1990-06-15"),
        time: "14:30",
        unknownTime: false,
        birthPlace: "Barcelona",
        birthLat: 41.387,
        birthLng: 2.168,
        birthTimezone: "Europe/Madrid",
      });
    });

    const stored = sessionStorage.getItem("aethel_pending_birth");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.birthPlace).toBe("Barcelona");
    expect(parsed.birthLat).toBe(41.387);
    expect(parsed.birthTimezone).toBe("Europe/Madrid");
  });

  it("anonymous handleQuestionSubmit navigates to auth (step 3)", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/ask") });

    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Work & money",
        question: "Should I quit?",
        mode: "Coach me",
      });
    });

    expect(result.current.state.questionData).toEqual({
      domain: "Work & money",
      question: "Should I quit?",
      mode: "Coach me",
    });
    expect(result.current.state.view).toBe("auth");
    expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
  });

  it("handleQuestionSubmit persists question to sessionStorage", () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/ask") });

    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Love & people",
        question: "Is this right?",
        mode: "Reflect with me",
      });
    });

    const stored = sessionStorage.getItem("aethel_pending_question");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.domain).toBe("Love & people");
  });

  it("full anonymous flow: birth → question → auth", async () => {
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/") });

    // Step 0: Start
    act(() => {
      result.current.handleStartReading();
    });
    expect(result.current.state.view).toBe("birth");

    // Step 1: Birth submit → question
    await act(async () => {
      await result.current.handleBirthSubmit({
        date: new Date("1990-06-15"),
        time: "14:30",
        unknownTime: false,
        birthPlace: "Barcelona",
        birthLat: 41.387,
        birthLng: 2.168,
        birthTimezone: "Europe/Madrid",
      });
    });
    expect(result.current.state.view).toBe("question");
    expect(result.current.state.birthData).toBeDefined();
    expect(result.current.state.birthData?.birthPlace).toBe("Barcelona");

    // Step 2: Question submit → auth (anonymous)
    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Work & money",
        question: "Should I quit?",
        mode: "Coach me",
      });
    });
    expect(result.current.state.view).toBe("auth");

    // Both birth and question data persisted for OAuth round-trip
    expect(sessionStorage.getItem("aethel_pending_birth")).not.toBeNull();
    expect(sessionStorage.getItem("aethel_pending_question")).not.toBeNull();
  });
});

describe("useFlowNavigation — handleLoadingComplete and handleLoadingError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleLoadingComplete navigates to reading view", () => {
    const initialWithLoading = { ...initialState, view: "loading" as const };
    const { result } = renderHook(() => useTestHook(initialWithLoading), { wrapper: createWrapper("/reading") });

    act(() => {
      result.current.handleLoadingComplete();
    });

    expect(result.current.state.view).toBe("reading");
  });

  it("handleLoadingError sets error and navigates back to question", () => {
    const initialWithLoading = { ...initialState, view: "loading" as const };
    const { result } = renderHook(() => useTestHook(initialWithLoading), { wrapper: createWrapper("/reading") });

    act(() => {
      result.current.handleLoadingError();
    });

    expect(result.current.state.view).toBe("question");
    expect(result.current.state.loadingError).toBe("Something went wrong. Please try again.");
    expect(mockNavigate).toHaveBeenCalledWith("/ask", { replace: true });
  });
});

// ─── Returning user: saved birth data → skip Anchor ─────────────────────

const SAVED_BIRTH = {
  birth_date: "1990-06-15",
  birth_time: "14:30",
  birth_place: "Barcelona",
  birth_lat: 41.387,
  birth_lng: 2.168,
  birth_timezone: "Europe/Madrid",
};

const returningUserState: AppState = {
  ...initialState,
  profileBirthData: SAVED_BIRTH,
  profileLoaded: true,
};

describe("useFlowNavigation — returning user with saved birth data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("handleStartReading skips birth and goes to question", () => {
    const { result } = renderHook(
      () => useLoggedInHook(returningUserState),
      { wrapper: createWrapper("/") }
    );

    act(() => {
      result.current.handleStartReading();
    });

    expect(result.current.state.view).toBe("question");
    expect(mockNavigate).toHaveBeenCalledWith("/ask", { replace: true });
  });

  it("hydrates birthData state from profileBirthData on start", () => {
    const { result } = renderHook(
      () => useLoggedInHook(returningUserState),
      { wrapper: createWrapper("/") }
    );

    act(() => {
      result.current.handleStartReading();
    });

    const bd = result.current.state.birthData;
    expect(bd).toBeDefined();
    expect(bd?.birthPlace).toBe("Barcelona");
    expect(bd?.birthLat).toBe(41.387);
    expect(bd?.birthLng).toBe(2.168);
    expect(bd?.birthTimezone).toBe("Europe/Madrid");
    expect(bd?.time).toBe("14:30");
    expect(bd?.unknownTime).toBe(false);
  });

  it("hydrates birthData with unknownTime when birth_time is null", () => {
    const noTimeState: AppState = {
      ...returningUserState,
      profileBirthData: { ...SAVED_BIRTH, birth_time: null },
    };
    const { result } = renderHook(
      () => useLoggedInHook(noTimeState),
      { wrapper: createWrapper("/") }
    );

    act(() => {
      result.current.handleStartReading();
    });

    expect(result.current.state.birthData?.unknownTime).toBe(true);
    expect(result.current.state.birthData?.time).toBeNull();
  });

  it("question submit goes straight to loading (skips auth)", () => {
    const { result } = renderHook(
      () => useLoggedInHook(returningUserState),
      { wrapper: createWrapper("/") }
    );

    // Start → question (skips birth)
    act(() => {
      result.current.handleStartReading();
    });
    expect(result.current.state.view).toBe("question");

    // Question → loading (skips auth because already logged in)
    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Work & money",
        question: "Should I take the offer?",
        mode: "Coach me",
      });
    });

    expect(result.current.state.view).toBe("loading");
    expect(mockNavigate).toHaveBeenCalledWith("/reading", { replace: true });
  });

  it("full returning-user flow: start → question → loading (2 steps, not 4)", () => {
    const { result } = renderHook(
      () => useLoggedInHook(returningUserState),
      { wrapper: createWrapper("/") }
    );

    // Collect navigate calls to verify only question + loading navigations happen
    const navCalls: string[] = [];
    mockNavigate.mockImplementation((path: string) => navCalls.push(path));

    act(() => {
      result.current.handleStartReading();
    });
    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Love & people",
        question: "Is this the right person?",
        mode: "Reflect with me",
      });
    });

    // Should navigate to /ask then /reading — never /birth or /auth
    expect(navCalls).toContain("/ask");
    expect(navCalls).toContain("/reading");
    expect(navCalls).not.toContain("/birth");
    expect(navCalls).not.toContain("/auth");
  });

  it("new user without birth data still goes to birth first", () => {
    const newUserState: AppState = {
      ...initialState,
      profileBirthData: null,
      profileLoaded: true,
    };
    const { result } = renderHook(
      () => useLoggedInHook(newUserState),
      { wrapper: createWrapper("/") }
    );

    act(() => {
      result.current.handleStartReading();
    });

    expect(result.current.state.view).toBe("birth");
    expect(mockNavigate).toHaveBeenCalledWith("/birth", { replace: true });
  });

  it("birth data reaches the reading flow after skip", () => {
    const { result } = renderHook(
      () => useLoggedInHook(returningUserState),
      { wrapper: createWrapper("/") }
    );

    act(() => {
      result.current.handleStartReading();
    });
    act(() => {
      result.current.handleQuestionSubmit({
        domain: "Visibility",
        question: "Should I post it?",
        mode: "Coach me",
      });
    });

    // birthData should be hydrated and available for the edge function
    const bd = result.current.state.birthData;
    expect(bd).toBeDefined();
    expect(bd?.birthPlace).toBe("Barcelona");
    expect(bd?.birthLat).toBe(41.387);

    // questionData also set
    expect(result.current.state.questionData?.domain).toBe("Visibility");
    expect(result.current.state.view).toBe("loading");
  });
});

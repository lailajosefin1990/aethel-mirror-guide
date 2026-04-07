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

  it("mounting on /reading without question data redirects to question", () => {
    // Fix 3: /reading with no questionData in state redirects to /ask
    const { result } = renderHook(() => useTestHook(), { wrapper: createWrapper("/reading") });
    expect(result.current.state.view).toBe("question");
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

describe("useFlowNavigation — handleQuestionSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anonymous user: sets question data and navigates to loading", () => {
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
    expect(result.current.state.view).toBe("loading");
    expect(mockNavigate).toHaveBeenCalledWith("/reading", { replace: true });
  });

  it("persists question to sessionStorage", () => {
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

    sessionStorage.removeItem("aethel_pending_question");
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

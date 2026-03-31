import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ─── Hoisted Mocks ─────────────────────────────────────────────────

const { mockUser, mockSupabase, mockOAuthRedirect } = vi.hoisted(() => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  const mockOAuthRedirect = vi.fn(() => Promise.resolve({ error: null }));

  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              birth_date: "1990-06-15",
              birth_time: "14:30",
              birth_place: "London",
              birth_lat: 51.5,
              birth_lng: -0.1,
              birth_timezone: "Europe/London",
              consent_accepted: true,
              preferred_language: "en",
            },
          })),
          order: vi.fn(() => ({ data: [] })),
          maybeSingle: vi.fn(() => ({ data: null })),
          gt: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "reading-1" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() =>
        Promise.resolve({
          data: {
            astrology_reading: "Test reading",
            design_insights: ["Insight 1"],
            third_way: "Take the leap",
            journal_prompt: "Reflect on this",
            confidence_level: "high",
            is_crisis: false,
            is_fallback: false,
          },
          error: null,
        })
      ),
    },
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  };

  return { mockUser, mockSupabase, mockOAuthRedirect };
});

// ─── Mutable auth state ─────────────────────────────────────────────

let mockAuthState = {
  user: null as typeof mockUser | null,
  loading: false,
  subscriptionTier: "free",
  monthlyReadingCount: 0,
  refreshReadingCount: vi.fn(),
  signOut: vi.fn(),
};

// ─── vi.mock calls ──────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuthState }));
vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: mockOAuthRedirect } },
}));
vi.mock("@/lib/posthog", () => ({ track: vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));
vi.mock("@/lib/push", () => ({
  subscribeToPush: vi.fn(),
  wasPushDismissedRecently: vi.fn(() => true),
  dismissPushPrompt: vi.fn(),
  isPushActive: vi.fn(() => Promise.resolve(false)),
  unsubscribeFromPush: vi.fn(),
}));

// Filter out framer-motion-specific props that shouldn't reach the DOM
function filterDomProps(props: Record<string, any>) {
  const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
  return rest;
}

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  const motionProxy = new Proxy({}, {
    get: (_target, prop) => {
      return ({ children, ...props }: any) => {
        const Tag = prop as any;
        return <Tag {...filterDomProps(props)}>{children}</Tag>;
      };
    },
  });
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => children,
    motion: motionProxy,
  };
});

vi.mock("@/components/VoiceRecorder", () => ({
  default: () => <button data-testid="voice-recorder">Voice</button>,
}));
vi.mock("@/components/VoicePlayer", () => ({
  default: () => <div data-testid="voice-player">Voice Player</div>,
}));
vi.mock("@/components/DrumRoller", () => ({
  default: ({ value, onChange }: any) => (
    <select data-testid="drum-roller" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      <option value={value}>{value}</option>
    </select>
  ),
}));
vi.mock("@/components/LocationAutocomplete", () => ({
  default: ({ onChange }: any) => (
    <button
      data-testid="location-autocomplete"
      onClick={() => onChange({ name: "London, UK", lat: 51.5, lng: -0.1, timezone: "Europe/London" })}
    >
      Select Location
    </button>
  ),
}));
vi.mock("@/components/TransitCalendar", () => ({ default: () => <div>Transit Calendar</div> }));
vi.mock("@/hooks/useOgImage", () => ({ default: () => {} }));
vi.mock("@/lib/cardGenerator", () => ({ generateThirdWayCard: vi.fn() }));
vi.mock("@/lib/reading", () => ({
  CONFIDENCE_MESSAGES: {
    high: "High confidence reading",
    medium: "Medium confidence reading",
    low: "Low confidence reading",
  },
}));

// ─── Import the component under test ────────────────────────────────

import Index from "@/pages/Index";

// ─── Helper ─────────────────────────────────────────────────────────

function renderIndex() {
  return render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Google OAuth round-trip: questionData persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockAuthState = {
      user: null,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("persists questionData to sessionStorage when user submits a question", async () => {
    const user = userEvent.setup();
    renderIndex();

    const cta = await screen.findByText(/Get my Third Way/i);
    await user.click(cta);

    const domainButton = await screen.findByText("Work & money");
    await user.click(domainButton);

    const textarea = screen.getByPlaceholderText(/Describe your decision/i);
    fireEvent.change(textarea, { target: { value: "Should I accept the new job offer?" } });

    const submitButton = screen.getByText(/Find my Third Way/i);
    await user.click(submitButton);

    const stored = sessionStorage.getItem("aethel_pending_question");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.domain).toBe("Work & money");
    expect(parsed.question).toBe("Should I accept the new job offer?");
    expect(parsed.mode).toBe("Both");
  });

  it("restores questionData from sessionStorage on mount (simulating OAuth return)", async () => {
    const pendingQuestion = {
      domain: "Love & people",
      question: "Should I move in with my partner?",
      mode: "Coach me",
    };
    sessionStorage.setItem("aethel_pending_question", JSON.stringify(pendingQuestion));

    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    await waitFor(
      () => {
        const loadingIndicators = [
          screen.queryByText(/Reading your chart/i),
          screen.queryByText(/Checking your design/i),
          screen.queryByText(/Finding the pattern/i),
          screen.queryByText(/Forming your Third Way/i),
          screen.queryByText(/A E T H E L/i),
        ];
        expect(loadingIndicators.some((el) => el !== null)).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
  });

  it("sessionStorage is cleaned up after a question is persisted and then used", async () => {
    sessionStorage.setItem(
      "aethel_pending_question",
      JSON.stringify({ domain: "Visibility", question: "Should I launch my newsletter?", mode: "Both" })
    );

    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    await waitFor(() => {
      expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
    });
  });

  it("does NOT auto-proceed if there is no pending question data after OAuth return", async () => {
    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    await waitFor(() => {
      expect(screen.queryByText(/Reading your chart/i)).toBeNull();
    });
  });

  it("handles corrupted sessionStorage data gracefully", async () => {
    sessionStorage.setItem("aethel_pending_question", "not-valid-json{{{");

    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    expect(() => renderIndex()).not.toThrow();

    await waitFor(() => {
      expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
    });
  });

  it("sets aethel_oauth_pending flag when Google OAuth is initiated", async () => {
    const user = userEvent.setup();
    renderIndex();

    const cta = await screen.findByText(/Get my Third Way/i);
    await user.click(cta);

    const domainButton = await screen.findByText("Work & money");
    await user.click(domainButton);

    const textarea = screen.getByPlaceholderText(/Describe your decision/i);
    await user.type(textarea, "Should I quit my job?");

    const submitButton = screen.getByText(/Find my Third Way/i);
    await user.click(submitButton);

    const googleButton = await screen.findByText("Google");
    await user.click(googleButton);

    expect(sessionStorage.getItem("aethel_oauth_pending")).toBe("true");
    expect(mockOAuthRedirect).toHaveBeenCalledWith("google", {
      redirect_uri: window.location.origin,
    });
  });
});

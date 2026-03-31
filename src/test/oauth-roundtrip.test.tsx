import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ──────────────────────────────────────────────────────────

// Hoist mock variables so they're available in vi.mock factories
const { mockUser, mockSupabaseRef, mockOAuthRedirect, mockAuthStateRef } = vi.hoisted(() => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

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
          order: vi.fn(() => ({
            data: [],
          })),
          maybeSingle: vi.fn(() => ({ data: null })),
          gt: vi.fn(() => ({
            maybeSingle: vi.fn(() => ({ data: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "reading-1" },
            error: null,
          })),
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

  const mockAuthStateRef = {
    current: {
      user: null as typeof mockUser | null,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    },
  };

  return { mockUser, mockSupabaseRef: { current: mockSupabase }, mockOAuthRedirect, mockAuthStateRef };
});

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
        order: vi.fn(() => ({
          data: [],
        })),
        maybeSingle: vi.fn(() => ({ data: null })),
        gt: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: "reading-1" },
          error: null,
        })),
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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

// Mock useAuth hook — starts with no user, then simulates return
let mockAuthState = {
  user: null as typeof mockUser | null,
  loading: false,
  subscriptionTier: "free",
  monthlyReadingCount: 0,
  refreshReadingCount: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

// Mock Lovable OAuth
const mockOAuthRedirect = vi.fn(() =>
  Promise.resolve({ error: null })
);
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: mockOAuthRedirect,
    },
  },
}));

// Mock PostHog tracking
vi.mock("@/lib/posthog", () => ({
  track: vi.fn(),
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

// Mock push notification helpers
vi.mock("@/lib/push", () => ({
  subscribeToPush: vi.fn(),
  wasPushDismissedRecently: vi.fn(() => true),
  dismissPushPrompt: vi.fn(),
  isPushActive: vi.fn(() => Promise.resolve(false)),
  unsubscribeFromPush: vi.fn(),
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => children,
    motion: {
      div: ({ children, ...props }: any) => <div {...filterDomProps(props)}>{children}</div>,
      p: ({ children, ...props }: any) => <p {...filterDomProps(props)}>{children}</p>,
      button: ({ children, ...props }: any) => <button {...filterDomProps(props)}>{children}</button>,
      form: ({ children, ...props }: any) => <form {...filterDomProps(props)}>{children}</form>,
    },
  };
});

// Filter out framer-motion-specific props that shouldn't reach the DOM
function filterDomProps(props: Record<string, any>) {
  const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
  return rest;
}

// Mock child components that aren't relevant to this test
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
      onClick={() =>
        onChange({
          name: "London, UK",
          lat: 51.5,
          lng: -0.1,
          timezone: "Europe/London",
        })
      }
    >
      Select Location
    </button>
  ),
}));

vi.mock("@/components/TransitCalendar", () => ({
  default: () => <div>Transit Calendar</div>,
}));

vi.mock("@/hooks/useOgImage", () => ({
  default: () => {},
}));

vi.mock("@/lib/cardGenerator", () => ({
  generateThirdWayCard: vi.fn(),
}));

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

    // 1. Click CTA on hero to go to question screen
    const cta = await screen.findByText(/Get my Third Way/i);
    await user.click(cta);

    // 2. Select a domain
    const domainButton = await screen.findByText("Work & money");
    await user.click(domainButton);

    // 3. Type a question
    const textarea = screen.getByPlaceholderText(/Describe your decision/i);
    await user.type(textarea, "Should I accept the new job offer?");

    // 4. Submit the question
    const submitButton = screen.getByText(/Find my Third Way/i);
    await user.click(submitButton);

    // 5. Verify sessionStorage was populated
    const stored = sessionStorage.getItem("aethel_pending_question");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.domain).toBe("Work & money");
    expect(parsed.question).toBe("Should I accept the new job offer?");
    expect(parsed.mode).toBe("Both"); // default mode
  });

  it("restores questionData from sessionStorage on mount (simulating OAuth return)", async () => {
    // 1. Pre-seed sessionStorage as if the user had submitted a question before OAuth redirect
    const pendingQuestion = {
      domain: "Love & people",
      question: "Should I move in with my partner?",
      mode: "Coach me",
    };
    sessionStorage.setItem(
      "aethel_pending_question",
      JSON.stringify(pendingQuestion)
    );

    // 2. Simulate user returning from OAuth (now logged in, with birth data on profile)
    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    // 3. The app should restore questionData, detect the user is logged in with
    //    pending question data, and auto-proceed past auth.
    //    Since the mock profile has birth_date, it should skip birth screen
    //    and go to loading view.
    await waitFor(
      () => {
        // Look for the loading screen phrases
        const loadingIndicators = [
          screen.queryByText(/Reading your chart/i),
          screen.queryByText(/Checking your design/i),
          screen.queryByText(/Finding the pattern/i),
          screen.queryByText(/Forming your Third Way/i),
          screen.queryByText(/A E T H E L/i),
        ];
        const isOnLoadingOrReading = loadingIndicators.some((el) => el !== null);
        expect(isOnLoadingOrReading).toBe(true);
      },
      { timeout: 5000 }
    );

    // 4. Verify sessionStorage was cleaned up
    expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
  });

  it("sessionStorage is cleaned up after a question is persisted and then used", async () => {
    const pendingQuestion = {
      domain: "Visibility",
      question: "Should I launch my newsletter?",
      mode: "Both",
    };
    sessionStorage.setItem(
      "aethel_pending_question",
      JSON.stringify(pendingQuestion)
    );

    // Mount with a logged-in user
    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    // After the component processes the stored question, sessionStorage should be cleared
    await waitFor(() => {
      expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
    });
  });

  it("does NOT auto-proceed if there is no pending question data after OAuth return", async () => {
    // No sessionStorage set — clean return
    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    renderIndex();

    // Should stay on home/dashboard, NOT jump to loading
    await waitFor(() => {
      const loadingPhrases = screen.queryByText(/Reading your chart/i);
      expect(loadingPhrases).toBeNull();
    });
  });

  it("handles corrupted sessionStorage data gracefully", async () => {
    // Seed with invalid JSON
    sessionStorage.setItem("aethel_pending_question", "not-valid-json{{{" );

    mockAuthState = {
      user: mockUser,
      loading: false,
      subscriptionTier: "free",
      monthlyReadingCount: 0,
      refreshReadingCount: vi.fn(),
      signOut: vi.fn(),
    };

    // Should not throw — component should render normally
    expect(() => renderIndex()).not.toThrow();

    // sessionStorage should be cleaned up
    await waitFor(() => {
      expect(sessionStorage.getItem("aethel_pending_question")).toBeNull();
    });
  });

  it("sets aethel_oauth_pending flag when Google OAuth is initiated", async () => {
    const user = userEvent.setup();
    renderIndex();

    // Navigate to question screen
    const cta = await screen.findByText(/Get my Third Way/i);
    await user.click(cta);

    // Fill in question
    const domainButton = await screen.findByText("Work & money");
    await user.click(domainButton);

    const textarea = screen.getByPlaceholderText(/Describe your decision/i);
    await user.type(textarea, "Should I quit my job?");

    // Submit (not logged in, so goes to auth screen)
    const submitButton = screen.getByText(/Find my Third Way/i);
    await user.click(submitButton);

    // Now on auth screen — click Google button
    const googleButton = await screen.findByText("Google");
    await user.click(googleButton);

    // Verify the OAuth pending flag was set
    expect(sessionStorage.getItem("aethel_oauth_pending")).toBe("true");

    // Verify the OAuth function was called
    expect(mockOAuthRedirect).toHaveBeenCalledWith("google", {
      redirect_uri: window.location.origin,
    });
  });
});

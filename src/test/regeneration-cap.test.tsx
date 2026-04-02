import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Polyfill IntersectionObserver for jsdom
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// ─── Hoisted Mocks ─────────────────────────────────────────────────
const { mockUser, mockSupabase, mockInvoke } = vi.hoisted(() => {
  const mockUser = { id: "user-cap-test", email: "cap@aethel.com" };

  const mockInvoke = vi.fn((..._args: any[]) =>
    Promise.resolve({
      data: {
        astrology_reading: "Transit reading for cap test.",
        design_insights: ["— Cap insight one", "— Cap insight two", "— Cap insight three"],
        third_way: "Cap test third way.",
        journal_prompt: "Cap test journal prompt?",
        confidence_level: "medium",
        is_fallback: false,
      },
      error: null,
    })
  );

  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              birth_date: "1992-03-10",
              birth_time: "09:00",
              birth_place: "Madrid",
              birth_lat: 40.42,
              birth_lng: -3.7,
              birth_timezone: "Europe/Madrid",
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
          single: vi.fn(() => ({ data: { id: "reading-cap" }, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    functions: { invoke: mockInvoke },
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { user: mockUser, access_token: "tok" } },
          error: null,
        })
      ),
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOAuth: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  };

  return { mockUser, mockSupabase, mockInvoke };
});

// ─── Module Mocks ──────────────────────────────────────────────────
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/posthog", () => ({
  track: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    subscriptionTier: "free",
    monthlyReadingCount: 0,
    refreshReadingCount: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOgImage", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/cardGenerator", () => ({
  generateThirdWayCard: vi.fn(() =>
    Promise.resolve(new Blob(["img"], { type: "image/png" }))
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

// ─── Import Component Under Test ───────────────────────────────────
import ReadingOutput from "@/components/ReadingOutput";
import React from "react";

// ─── Test Data ─────────────────────────────────────────────────────
const makeReading = (suffix: string) => ({
  astrology_reading: `Mercury transiting sector ${suffix}.`,
  design_insights: [
    `— Insight A ${suffix}`,
    `— Insight B ${suffix}`,
    `— Insight C ${suffix}`,
  ],
  third_way: `Third way recommendation ${suffix}.`,
  journal_prompt: `What matters about ${suffix}?`,
  confidence_level: "high" as const,
  is_fallback: false,
});

// ─── Wrapper to simulate Index.tsx regeneration state machine ──────
const RegenerationHarness = () => {
  const MAX_REGENERATIONS = 3;
  const [regenerationCount, setRegenerationCount] = React.useState(0);
  const [reading, setReading] = React.useState(makeReading("initial"));
  const [invokeCount, setInvokeCount] = React.useState(0);

  const handleRegenerate = React.useCallback(
    (feedbackText?: string) => {
      if (regenerationCount >= MAX_REGENERATIONS) return;
      const newCount = regenerationCount + 1;
      setRegenerationCount(newCount);

      // Simulate what Index.tsx does: call generate-reading
      mockSupabase.functions.invoke("generate-reading", {
        body: {
          domain: "Work & money",
          question: "Should I change career?",
          mode: "Coach me",
          birthDate: "10/03/1992",
          birthPlace: "Madrid",
          birthTime: "09:00",
          birthLat: 40.42,
          birthLng: -3.7,
          birthTimezone: "Europe/Madrid",
          language: "en",
          regenerationFeedback: feedbackText || null,
        },
      });

      setInvokeCount((c) => c + 1);
      setReading(makeReading(`regen-${newCount}`));
    },
    [regenerationCount]
  );

  return (
    <div>
      <div data-testid="regen-count">{regenerationCount}</div>
      <div data-testid="invoke-count">{invokeCount}</div>
      <ReadingOutput
        domain="Work & money"
        question="Should I change career?"
        reading={reading}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onRegenerate={
          regenerationCount < MAX_REGENERATIONS ? handleRegenerate : undefined
        }
        regenerationCount={regenerationCount}
      />
    </div>
  );
};

// ─── Tests ─────────────────────────────────────────────────────────
describe("Regeneration Cap — Full Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows exactly 3 regenerations then locks out further attempts", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegenerationHarness />
      </MemoryRouter>
    );

    // ── Regeneration 1 ──
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Too vague on career timing"
    );
    await user.click(screen.getByText("reading_regenerate"));

    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("invoke-count")).toHaveTextContent("1");

    // "That doesn't fit" should reappear (count < 3)
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();

    // ── Regeneration 2 ──
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Third way not actionable"
    );
    await user.click(screen.getByText("reading_regenerate"));

    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("invoke-count")).toHaveTextContent("2");
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();

    // ── Regeneration 3 (final allowed) ──
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Still doesn't resonate"
    );
    await user.click(screen.getByText("reading_regenerate"));

    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("3");
    });
    expect(screen.getByTestId("invoke-count")).toHaveTextContent("3");

    // ── After 3: button gone, "three paths" message shown ──
    expect(screen.queryByText("reading_doesnt_fit")).not.toBeInTheDocument();
    expect(
      screen.getByText("reading_regen_cap")
    ).toBeInTheDocument();

    // ── Verify exactly 3 edge function calls were made ──
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it("sends correct regenerationFeedback for each attempt", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegenerationHarness />
      </MemoryRouter>
    );

    // Regen 1
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Feedback one"
    );
    await user.click(screen.getByText("reading_regenerate"));
    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("1");
    });

    // Regen 2
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Feedback two"
    );
    await user.click(screen.getByText("reading_regenerate"));
    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("2");
    });

    // Regen 3
    await user.click(screen.getByText("reading_doesnt_fit"));
    await user.type(
      await screen.findByPlaceholderText("reading_feedback_placeholder"),
      "Feedback three"
    );
    await user.click(screen.getByText("reading_regenerate"));
    await waitFor(() => {
      expect(screen.getByTestId("regen-count")).toHaveTextContent("3");
    });

    // Verify each call had the correct feedback
    expect(mockInvoke).toHaveBeenCalledTimes(3);

    const call1Body = mockInvoke.mock.calls[0][1].body;
    expect(call1Body.regenerationFeedback).toBe("Feedback one");

    const call2Body = mockInvoke.mock.calls[1][1].body;
    expect(call2Body.regenerationFeedback).toBe("Feedback two");

    const call3Body = mockInvoke.mock.calls[2][1].body;
    expect(call3Body.regenerationFeedback).toBe("Feedback three");
  });

  it("does not call edge function when onRegenerate is undefined (cap reached)", async () => {
    // Render directly at cap
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Should I change career?"
          reading={makeReading("capped")}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onRegenerate={undefined}
          regenerationCount={3}
        />
      </MemoryRouter>
    );

    // "That doesn't fit" should not be present
    expect(screen.queryByText("reading_doesnt_fit")).not.toBeInTheDocument();

    // "Three paths" message should be shown
    expect(
      screen.getByText("reading_regen_cap")
    ).toBeInTheDocument();

    // No edge function calls
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows 'That doesn't fit' button at counts 0, 1, 2 but not at 3", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={makeReading("test")}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onRegenerate={vi.fn()}
          regenerationCount={0}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={makeReading("test")}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onRegenerate={vi.fn()}
          regenerationCount={1}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={makeReading("test")}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onRegenerate={vi.fn()}
          regenerationCount={2}
        />
      </MemoryRouter>
    );
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={makeReading("test")}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onRegenerate={undefined}
          regenerationCount={3}
        />
      </MemoryRouter>
    );
    expect(screen.queryByText("reading_doesnt_fit")).not.toBeInTheDocument();
    expect(screen.getByText("reading_regen_cap")).toBeInTheDocument();
  });
});

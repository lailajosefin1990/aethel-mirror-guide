import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Polyfill IntersectionObserver
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

// ─── Mocks ─────────────────────────────────────────────────────────
const { mockUser, mockSupabase } = vi.hoisted(() => {
  const mockUser = { id: "user-order-test", email: "order@aethel.com" };
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null })),
          order: vi.fn(() => ({ data: [] })),
          maybeSingle: vi.fn(() => ({ data: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "r-1" }, error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) },
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };
  return { mockUser, mockSupabase };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => mockSupabase) }));
vi.mock("@/lib/posthog", () => ({ track: vi.fn(), identify: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: { READING_REACTION: "reading_reaction", SHARE_CARD_OPENED: "share_card_opened" },
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
vi.mock("@/hooks/useOgImage", () => ({ default: vi.fn() }));
vi.mock("@/lib/cardGenerator", () => ({
  generateThirdWayCard: vi.fn(() => Promise.resolve(new Blob(["img"], { type: "image/png" }))),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

import ReadingOutput from "@/components/ReadingOutput";

// ─── Test data ─────────────────────────────────────────────────────
const reading = {
  astrology_reading: "Mercury transiting your career sector this week.",
  design_insights: ["— Insight alpha", "— Insight beta", "— Insight gamma"],
  third_way: "Send the counter-offer by Friday.",
  journal_prompt: "What are you avoiding?",
  confidence_level: "high" as const,
  is_fallback: false,
};

// Birth date: May 29, 1994 — should produce:
// Sun sign: Gemini
// Life path: 1+9+9+4+0+5+2+9 = 39 → 3+9 = 12 → 1+2 = 3
// Gene Key from gate: gate based on day-of-year
const birthDate = new Date(1994, 4, 29); // May 29, 1994

// ─── Tests ─────────────────────────────────────────────────────────
describe("ReadingOutput — YOUR DATA before WHAT YOUR STARS SAY", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders YOUR DATA section before the stars section in DOM order", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Should I take the offer?"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    // Find both section headers — use regex for flexible whitespace matching
    const yourDataHeader = screen.getByText(/Y\s*O\s*U\s*R\s+D\s*A\s*T\s*A/);
    const starsHeader = screen.getByText("reading_stars_label");

    expect(yourDataHeader).toBeInTheDocument();
    expect(starsHeader).toBeInTheDocument();

    // Verify DOM order: YOUR DATA comes BEFORE the stars section
    const position = yourDataHeader.compareDocumentPosition(starsHeader);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders sun sign value when birth date is provided", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    // May 29 = Gemini
    expect(screen.getByText("Gemini")).toBeInTheDocument();
  });

  it("renders life path number when birth date is provided", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    // 1994-05-29: 1+9+9+4+0+5+2+9 = 39 → 3+9 = 12 → 1+2 = 3
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders Gene Key gift when birth date is provided", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    // Gene Key is derived from sun gate (day of year). May 29 = day 149.
    // Gate = ((149-1) % 64) + 1 = 148 % 64 + 1 = 20 + 1 = 21
    // Gene Key 21 gift = "Authority"
    expect(screen.getByText("Authority")).toBeInTheDocument();
  });

  it("renders personal year value when birth date is provided", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    // Personal year uses current year + birth month/day
    // This value changes yearly so just verify a number renders in the grid
    const personalYearLabel = screen.getByText("Personal year");
    expect(personalYearLabel).toBeInTheDocument();

    // The value should be a sibling element — a number between 1-33
    const valueEl = personalYearLabel.parentElement?.querySelector(".font-display");
    expect(valueEl).not.toBeNull();
    const value = parseInt(valueEl!.textContent || "0");
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(33);
  });

  it("renders the data labels: sun sign, life path, personal year, Gene Key gift", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Your sun sign")).toBeInTheDocument();
    expect(screen.getByText("Life path")).toBeInTheDocument();
    expect(screen.getByText("Personal year")).toBeInTheDocument();
    expect(screen.getByText("Gene Key gift")).toBeInTheDocument();
  });

  it("renders current sun position (☉ Sun in ...)", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("☉ Sun in")).toBeInTheDocument();
  });

  it("renders transit energy text instead of data grid when no birth date", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={null}
        />
      </MemoryRouter>
    );

    // Without birth date, should show general transit energy (italic text)
    // and NOT show the data grid labels
    expect(screen.queryByText("Your sun sign")).not.toBeInTheDocument();
    expect(screen.queryByText("Life path")).not.toBeInTheDocument();
    // But the YOUR DATA header and sun position should still render
    expect(screen.getByText("☉ Sun in")).toBeInTheDocument();
  });

  it("YOUR DATA section comes before the astrology reading text", () => {
    render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDate}
        />
      </MemoryRouter>
    );

    const dataHeader = screen.getByText(/Y\s*O\s*U\s*R\s+D\s*A\s*T\s*A/);
    const readingText = screen.getByText(/Mercury transiting your career sector/);

    const position = dataHeader.compareDocumentPosition(readingText);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

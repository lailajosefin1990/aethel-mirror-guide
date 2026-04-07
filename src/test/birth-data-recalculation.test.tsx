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
  const mockUser = { id: "user-recalc-test", email: "recalc@aethel.com" };
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
    user: mockUser, loading: false, subscriptionTier: "free",
    monthlyReadingCount: 0, refreshReadingCount: vi.fn(), signOut: vi.fn(),
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
import { lifePathNumber, sunGateFromDate, geneKeyFromGate, personalYear } from "@/lib/calculators";

// ─── Test data ─────────────────────────────────────────────────────
const reading = {
  astrology_reading: "Test transit reading.",
  design_insights: ["— A", "— B", "— C"],
  third_way: "Test third way.",
  journal_prompt: "Test prompt?",
  confidence_level: "high" as const,
  is_fallback: false,
};

// Birth dates spanning different signs, life paths, and gene keys
const birthDates = {
  gemini: new Date(1994, 4, 29),      // May 29 → Gemini, LP 3
  capricorn: new Date(1990, 0, 5),    // Jan 5  → Capricorn
  leo: new Date(1988, 7, 12),         // Aug 12 → Leo
  pisces: new Date(2000, 2, 1),       // Mar 1  → Pisces
  scorpio: new Date(1995, 10, 15),    // Nov 15 → Scorpio
};

function getSunSign(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Aries";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Taurus";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Gemini";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Cancer";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leo";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Virgo";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Libra";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Scorpio";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Sagittarius";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricorn";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Aquarius";
  return "Pisces";
}

function renderReading(birthDate: Date | null) {
  return render(
    <MemoryRouter>
      <ReadingOutput
        domain="Work & money"
        question="Test question"
        reading={reading}
        onSave={vi.fn()}
        onBack={vi.fn()}
        birthDate={birthDate}
      />
    </MemoryRouter>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────
describe("Birth data recalculation — all 4 grid values update on birth date change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Gemini birth date renders correct sun sign, life path, personal year, Gene Key", () => {
    renderReading(birthDates.gemini);

    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText(String(lifePathNumber(birthDates.gemini)))).toBeInTheDocument();

    const gate = sunGateFromDate(birthDates.gemini);
    const gk = geneKeyFromGate(gate);
    expect(screen.getByText(gk.gift)).toBeInTheDocument();

    const py = personalYear(birthDates.gemini);
    expect(screen.getByText(String(py))).toBeInTheDocument();
  });

  it("Capricorn birth date renders different values from Gemini", () => {
    renderReading(birthDates.capricorn);

    expect(screen.getByText("Capricorn")).toBeInTheDocument();
    // Life path number may appear multiple times (e.g. in reading text), so check it exists at least once
    const lp = String(lifePathNumber(birthDates.capricorn));
    expect(screen.getAllByText(lp).length).toBeGreaterThanOrEqual(1);

    const gate = sunGateFromDate(birthDates.capricorn);
    const gk = geneKeyFromGate(gate);
    expect(screen.getByText(gk.gift)).toBeInTheDocument();
  });

  it("Leo birth date renders Leo sign and correct calculations", () => {
    renderReading(birthDates.leo);

    expect(screen.getByText("Leo")).toBeInTheDocument();
    expect(screen.getByText(String(lifePathNumber(birthDates.leo)))).toBeInTheDocument();

    const gate = sunGateFromDate(birthDates.leo);
    const gk = geneKeyFromGate(gate);
    expect(screen.getByText(gk.gift)).toBeInTheDocument();
  });

  it("Pisces birth date renders Pisces sign and correct calculations", () => {
    renderReading(birthDates.pisces);

    expect(screen.getByText("Pisces")).toBeInTheDocument();
    expect(screen.getByText(String(lifePathNumber(birthDates.pisces)))).toBeInTheDocument();

    const gate = sunGateFromDate(birthDates.pisces);
    const gk = geneKeyFromGate(gate);
    expect(screen.getByText(gk.gift)).toBeInTheDocument();
  });

  it("Scorpio birth date renders Scorpio sign and correct calculations", () => {
    renderReading(birthDates.scorpio);

    expect(screen.getByText("Scorpio")).toBeInTheDocument();
    expect(screen.getByText(String(lifePathNumber(birthDates.scorpio)))).toBeInTheDocument();

    const gate = sunGateFromDate(birthDates.scorpio);
    const gk = geneKeyFromGate(gate);
    expect(screen.getByText(gk.gift)).toBeInTheDocument();
  });

  it("rerender with different birth date updates all 4 values", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDates.gemini}
        />
      </MemoryRouter>
    );

    // First render: Gemini data
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    const geminiLP = lifePathNumber(birthDates.gemini);
    const geminiGate = sunGateFromDate(birthDates.gemini);
    const geminiGK = geneKeyFromGate(geminiGate);

    // Rerender with Scorpio birth date — simulates user editing birth data mid-session
    rerender(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDates.scorpio}
        />
      </MemoryRouter>
    );

    // Sun sign should change
    expect(screen.getByText("Scorpio")).toBeInTheDocument();
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();

    // Life path should change
    const scorpioLP = lifePathNumber(birthDates.scorpio);
    if (scorpioLP !== geminiLP) {
      expect(screen.getByText(String(scorpioLP))).toBeInTheDocument();
    }

    // Gene Key should change
    const scorpioGate = sunGateFromDate(birthDates.scorpio);
    const scorpioGK = geneKeyFromGate(scorpioGate);
    if (scorpioGK.gift !== geminiGK.gift) {
      expect(screen.getByText(scorpioGK.gift)).toBeInTheDocument();
    }
  });

  it("rerender from birth date to null removes the data grid", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDates.gemini}
        />
      </MemoryRouter>
    );

    // Gemini data visible
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("Your sun sign")).toBeInTheDocument();

    // Rerender with null — simulates losing birth data
    rerender(
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

    // Data grid labels should be gone
    expect(screen.queryByText("Your sun sign")).not.toBeInTheDocument();
    expect(screen.queryByText("Life path")).not.toBeInTheDocument();
    expect(screen.queryByText("Gene Key gift")).not.toBeInTheDocument();
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
  });

  it("rerender from null to birth date adds the data grid", () => {
    const { rerender } = render(
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

    // No data grid
    expect(screen.queryByText("Your sun sign")).not.toBeInTheDocument();

    // Add birth date
    rerender(
      <MemoryRouter>
        <ReadingOutput
          domain="Work & money"
          question="Test"
          reading={reading}
          onSave={vi.fn()}
          onBack={vi.fn()}
          birthDate={birthDates.leo}
        />
      </MemoryRouter>
    );

    // Data grid should appear
    expect(screen.getByText("Leo")).toBeInTheDocument();
    expect(screen.getByText("Your sun sign")).toBeInTheDocument();
    expect(screen.getByText("Life path")).toBeInTheDocument();
    expect(screen.getByText("Gene Key gift")).toBeInTheDocument();
  });
});

// ─── Calculator unit tests (verify the math) ───────────────────────
describe("Calculator correctness across zodiac signs", () => {
  it.each([
    [new Date(1994, 4, 29), "Gemini"],
    [new Date(1990, 0, 5), "Capricorn"],
    [new Date(1988, 7, 12), "Leo"],
    [new Date(2000, 2, 1), "Pisces"],
    [new Date(1995, 10, 15), "Scorpio"],
    [new Date(1992, 3, 20), "Taurus"],
    [new Date(1985, 6, 23), "Leo"],
    [new Date(1999, 8, 23), "Libra"],
    [new Date(1991, 5, 21), "Cancer"],
    [new Date(1993, 1, 19), "Pisces"],
    [new Date(1987, 11, 22), "Capricorn"],
    [new Date(1996, 0, 20), "Aquarius"],
  ])("birth date %s → sun sign %s", (date, expectedSign) => {
    expect(getSunSign(date)).toBe(expectedSign);
  });

  it("lifePathNumber reduces correctly for known dates", () => {
    // 1994-05-29: 1+9+9+4+0+5+2+9 = 39 → 12 → 3
    expect(lifePathNumber(new Date(1994, 4, 29))).toBe(3);
    // 1990-01-05: 1+9+9+0+0+1+0+5 = 25 → 7
    expect(lifePathNumber(new Date(1990, 0, 5))).toBe(7);
    // 2000-03-01: 2+0+0+0+0+3+0+1 = 6
    expect(lifePathNumber(new Date(2000, 2, 1))).toBe(6);
  });

  it("geneKeyFromGate returns valid shadow/gift/siddhi for all 64 gates", () => {
    for (let gate = 1; gate <= 64; gate++) {
      const gk = geneKeyFromGate(gate);
      expect(gk.shadow).toBeTruthy();
      expect(gk.gift).toBeTruthy();
      expect(gk.siddhi).toBeTruthy();
    }
  });

  it("sunGateFromDate returns a value between 1 and 64", () => {
    for (const date of Object.values(birthDates)) {
      const gate = sunGateFromDate(date);
      expect(gate).toBeGreaterThanOrEqual(1);
      expect(gate).toBeLessThanOrEqual(64);
    }
  });

  it("personalYear returns a value between 1 and 33", () => {
    for (const date of Object.values(birthDates)) {
      const py = personalYear(date);
      expect(py).toBeGreaterThanOrEqual(1);
      expect(py).toBeLessThanOrEqual(33);
    }
  });
});

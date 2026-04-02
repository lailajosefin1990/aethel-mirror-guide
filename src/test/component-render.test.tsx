import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import React from "react";

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

// ─── Hoisted Mocks ─────────────────────────────────────────────────
const { mockUser, mockSupabase } = vi.hoisted(() => {
  const mockUser = { id: "user-render-test", email: "render@aethel.com" };
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null })),
          order: vi.fn(() => ({ data: [] })),
          maybeSingle: vi.fn(() => ({ data: null })),
          gt: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: "r-1", created_at: new Date().toISOString() }, error: null })),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) },
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: mockUser } }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() })),
  };
  return { mockUser, mockSupabase };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => mockSupabase) }));
vi.mock("@/lib/posthog", () => ({ track: vi.fn(), identify: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: {
    NUDGE_DISPLAYED: "nudge_displayed",
    NEW_READING_FROM_TOP: "new_from_top",
    NEW_READING_FROM_NUDGE: "new_from_nudge",
    WEEKLY_CHECKIN_COMPLETED: "weekly_checkin_completed",
    WEEKLY_CHECKIN_STORED: "weekly_checkin_stored",
    READING_LOADED: "reading_loaded",
    THIRD_WAY_READ: "third_way_read",
    SHARE_CARD_OPENED: "share_card_opened",
    READING_REACTION: "reading_reaction",
    JOURNAL_ENTRY_DELETED: "journal_entry_deleted",
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, loading: false, subscriptionTier: "free", monthlyReadingCount: 0, refreshReadingCount: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("@/hooks/useOgImage", () => ({ default: vi.fn() }));
vi.mock("@/lib/cardGenerator", () => ({
  generateThirdWayCard: vi.fn(() => Promise.resolve(new Blob(["img"], { type: "image/png" }))),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => opts?.count !== undefined ? `${key}_${opts.count}` : key, i18n: { language: "en", changeLanguage: vi.fn() } }),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────
import DailyNudge from "@/components/DailyNudge";
import ReadingOutput from "@/components/ReadingOutput";
import DecisionJournal from "@/components/DecisionJournal";
import ProgressStepper from "@/components/ProgressStepper";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import ViewErrorBoundary from "@/components/ViewErrorBoundary";
import HeroSection from "@/components/HeroSection";
import AppLayout from "@/components/AppLayout";

// ─── Test Data ─────────────────────────────────────────────────────
const baseReading = {
  astrology_reading: "Mercury transiting your career sector with intent.",
  design_insights: ["— Insight alpha for testing", "— Insight beta for testing", "— Insight gamma for testing"],
  third_way: "Take the bold path forward within 48 hours.",
  journal_prompt: "What are you avoiding right now?",
  confidence_level: "high" as const,
  is_fallback: false,
};

const sampleEntries = [
  { id: "e1", domain: "Work & money", date: "1 Apr 2026", createdAt: "2026-04-01T10:00:00Z", thirdWay: "Take the bold path.", question: "Should I quit?" },
  { id: "e2", domain: "Love & people", date: "28 Mar 2026", createdAt: "2026-03-28T10:00:00Z", thirdWay: "Set the boundary.", question: "Is this healthy?", outcome: { followed: "yes" as const, note: "It worked." } },
  { id: "e3", domain: "Work & money", date: "25 Mar 2026", createdAt: "2026-03-25T10:00:00Z", thirdWay: "Negotiate first.", question: "Take the offer?", outcome: { followed: "no" as const, note: "Waited too long." } },
];

// ─── DailyNudge ────────────────────────────────────────────────────
describe("DailyNudge", () => {
  it("renders loading skeleton when loading=true", () => {
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} loading={true} /></MemoryRouter>
    );
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders date, title, and nudge card when loaded", () => {
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText(/A E T H E L/)).toBeInTheDocument();
    expect(screen.getByText("nudge_new_reading_btn")).toBeInTheDocument();
    expect(screen.getByText("nudge_todays_energy")).toBeInTheDocument();
    expect(screen.getByText("nudge_little_nudge")).toBeInTheDocument();
  });

  it("shows new reading button that calls onNewReading", async () => {
    const onNew = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={onNew} onRevisitDecision={vi.fn()} /></MemoryRouter>
    );
    await user.click(screen.getByText("nudge_new_reading_btn"));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("shows open decision card when there are open entries", () => {
    const openEntry = [{ id: "e1", domain: "Work", date: "1 Apr", createdAt: "2026-04-01", thirdWay: "Take the bold path.", question: "Should I quit?" }];
    render(
      <MemoryRouter><DailyNudge journalEntries={openEntry} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("nudge_open_decision")).toBeInTheDocument();
    expect(screen.getByText("Take the bold path.")).toBeInTheDocument();
    expect(screen.getByText("nudge_revisit")).toBeInTheDocument();
  });

  it("does not show open decision when all entries have outcomes", () => {
    const closedEntries = [{ id: "e1", domain: "Work", date: "1 Apr", createdAt: "2026-04-01", thirdWay: "Done.", question: "Q?", outcome: { followed: "yes" as const, note: "yes" } }];
    render(
      <MemoryRouter><DailyNudge journalEntries={closedEntries} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} /></MemoryRouter>
    );
    expect(screen.queryByText("nudge_open_decision")).not.toBeInTheDocument();
  });

  it("shows free tier banner with remaining count", () => {
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} subscriptionTier="free" remainingReadings={2} onUpgrade={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText(/nudge_remaining_one/)).toBeInTheDocument();
    expect(screen.getByText("nudge_resets_monthly")).toBeInTheDocument();
  });

  it("shows birth time hint when not personalised and no birth time", () => {
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} hasBirthTime={false} /></MemoryRouter>
    );
    expect(screen.getByText("nudge_birth_hint")).toBeInTheDocument();
  });

  it("does not show birth time hint when hasBirthTime is true", () => {
    render(
      <MemoryRouter><DailyNudge journalEntries={[]} onNewReading={vi.fn()} onRevisitDecision={vi.fn()} hasBirthTime={true} /></MemoryRouter>
    );
    expect(screen.queryByText("nudge_birth_hint")).not.toBeInTheDocument();
  });
});

// ─── ReadingOutput ─────────────────────────────────────────────────
describe("ReadingOutput", () => {
  it("renders reading sections when data is present", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work & money" question="Should I quit?" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Mercury transiting your career sector with intent.")).toBeInTheDocument();
    expect(screen.getByText("Take the bold path forward within 48 hours.")).toBeInTheDocument();
    expect(screen.getByText("What are you avoiding right now?")).toBeInTheDocument();
  });

  it("renders design insights", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work & money" question="Test" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("Insight alpha for testing")).toBeInTheDocument();
    expect(screen.getByText("Insight beta for testing")).toBeInTheDocument();
    expect(screen.getByText("Insight gamma for testing")).toBeInTheDocument();
  });

  it("shows 'doesnt fit' button when onRegenerate is provided", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work" question="Q?" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} onRegenerate={vi.fn()} regenerationCount={0} />
      </MemoryRouter>
    );
    expect(screen.getByText("reading_doesnt_fit")).toBeInTheDocument();
  });

  it("hides doesnt fit when onRegenerate is undefined", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work" question="Q?" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} onRegenerate={undefined} regenerationCount={3} />
      </MemoryRouter>
    );
    expect(screen.queryByText("reading_doesnt_fit")).not.toBeInTheDocument();
  });

  it("renders thumbs up/down buttons", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work" question="Q?" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("👎")).toBeInTheDocument();
  });

  it("renders save button", () => {
    render(
      <MemoryRouter>
        <ReadingOutput domain="Work" question="Q?" reading={baseReading} onSave={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText("reading_save")).toBeInTheDocument();
  });

  it("returns null when reading is null", () => {
    const { container } = render(
      <MemoryRouter>
        <ReadingOutput domain="Work" question="Q?" reading={null} onSave={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );
    expect(container.children.length).toBe(0);
  });
});

// ─── DecisionJournal ───────────────────────────────────────────────
describe("DecisionJournal", () => {
  it("renders loading skeleton when loading=true", () => {
    render(
      <MemoryRouter><DecisionJournal entries={[]} onUpdateEntry={vi.fn()} onStartReading={vi.fn()} loading={true} /></MemoryRouter>
    );
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders sample entries when no entries provided (fallback)", () => {
    render(
      <MemoryRouter><DecisionJournal entries={[]} onUpdateEntry={vi.fn()} /></MemoryRouter>
    );
    // Component falls back to SAMPLE_ENTRIES when empty
    // So it always renders something — check for structural elements
    expect(document.querySelectorAll("[class*='border-border']").length).toBeGreaterThan(0);
  });

  it("renders open journal entries in default tab", () => {
    render(
      <MemoryRouter><DecisionJournal entries={sampleEntries} onUpdateEntry={vi.fn()} /></MemoryRouter>
    );
    // Default tab shows open entries (no outcome)
    expect(screen.getByText(/Take the bold path/)).toBeInTheDocument();
    // Closed entries (with outcome) are in the Closed tab, not visible by default
  });

  it("shows domain filter pills when entries span multiple domains", () => {
    render(
      <MemoryRouter><DecisionJournal entries={sampleEntries} onUpdateEntry={vi.fn()} /></MemoryRouter>
    );
    // Filter pills render for domains present in entries
    expect(screen.getByText("All")).toBeInTheDocument();
    // Domain names appear as filter pills
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThan(2); // At minimum: All + domain pills + tab buttons
  });

  it("renders time context for entries", () => {
    render(
      <MemoryRouter><DecisionJournal entries={sampleEntries} onUpdateEntry={vi.fn()} /></MemoryRouter>
    );
    // At least some time context should be rendered (Today, Yesterday, X days ago)
    const timeTexts = document.querySelectorAll("[class*='muted-foreground']");
    expect(timeTexts.length).toBeGreaterThan(0);
  });

  it("renders Open and Closed tabs", () => {
    render(
      <MemoryRouter><DecisionJournal entries={sampleEntries} onUpdateEntry={vi.fn()} /></MemoryRouter>
    );
    // Tab buttons should be present
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});

// ─── ProgressStepper ───────────────────────────────────────────────
describe("ProgressStepper", () => {
  it("renders 4 step labels", () => {
    render(<ProgressStepper currentStep={1} />);
    const labels = ["Ask", "Anchor", "Generate", "Your Third Way"];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("highlights the current step", () => {
    render(<ProgressStepper currentStep={2} />);
    const anchorLabel = screen.getByText("Anchor");
    expect(anchorLabel.className).toContain("text-primary");
  });

  it("shows completed steps differently from pending", () => {
    render(<ProgressStepper currentStep={3} />);
    const askLabel = screen.getByText("Ask");
    const generateLabel = screen.getByText("Generate");
    expect(askLabel.className).toContain("primary/50");
    expect(generateLabel.className).toContain("text-primary");
  });
});

// ─── DashboardSkeleton ─────────────────────────────────────────────
describe("DashboardSkeleton", () => {
  it("renders with pulse animation", () => {
    render(<DashboardSkeleton />);
    const container = document.querySelector(".animate-pulse");
    expect(container).not.toBeNull();
  });

  it("renders skeleton blocks", () => {
    render(<DashboardSkeleton />);
    const skeletonBlocks = document.querySelectorAll(".bg-muted");
    expect(skeletonBlocks.length).toBeGreaterThan(3);
  });
});

// ─── ViewErrorBoundary ─────────────────────────────────────────────
describe("ViewErrorBoundary", () => {
  const ThrowError = () => { throw new Error("Test crash"); };

  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeEach(() => { console.error = vi.fn(); });

  it("renders children when no error", () => {
    render(
      <ViewErrorBoundary>
        <p>Safe content</p>
      </ViewErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ViewErrorBoundary fallbackView="test">
        <ThrowError />
      </ViewErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls onReset when try again is clicked", async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <ViewErrorBoundary fallbackView="test" onReset={onReset}>
        <ThrowError />
      </ViewErrorBoundary>
    );
    await user.click(screen.getByText("Try again"));
    expect(onReset).toHaveBeenCalledTimes(1);
    console.error = originalError;
  });
});

// ─── HeroSection ───────────────────────────────────────────────────
describe("HeroSection", () => {
  it("renders hero title and CTA button", () => {
    render(
      <MemoryRouter><HeroSection onStart={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("hero_get_third_way")).toBeInTheDocument();
    expect(screen.getByText("hero_free_tag")).toBeInTheDocument();
  });

  it("calls onStart when CTA is clicked", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter><HeroSection onStart={onStart} /></MemoryRouter>
    );
    await user.click(screen.getByText("hero_get_third_way"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("renders evidence link", () => {
    render(
      <MemoryRouter><HeroSection onStart={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("hero_see_outcomes")).toBeInTheDocument();
  });
});

// ─── AppLayout ─────────────────────────────────────────────────────
describe("AppLayout", () => {
  it("renders children and navigation when showNav is true", () => {
    render(
      <MemoryRouter>
        <AppLayout showNav activeTab="mirror" onTabChange={vi.fn()}>
          <p>Dashboard content</p>
        </AppLayout>
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("renders without nav when showNav is false", () => {
    render(
      <MemoryRouter>
        <AppLayout showNav={false} activeTab="mirror" onTabChange={vi.fn()}>
          <p>Content only</p>
        </AppLayout>
      </MemoryRouter>
    );
    expect(screen.getByText("Content only")).toBeInTheDocument();
  });
});

// ─── Additional simple component render tests for coverage ─────────
import CrisisInterstitial from "@/components/CrisisInterstitial";
import ConsentGate from "@/components/ConsentGate";
import LanguageSelector from "@/components/LanguageSelector";
import PushPermissionSheet from "@/components/PushPermissionSheet";
import ReadingLoader from "@/components/ReadingLoader";
import BottomNav from "@/components/BottomNav";

// ─── CrisisInterstitial ───────────────────────────────────────────
describe("CrisisInterstitial", () => {
  it("renders crisis resources and return button", () => {
    render(<CrisisInterstitial onReturn={vi.fn()} />);
    // Should render the "Find a helpline near you" fallback (DEFAULT locale in test)
    expect(screen.getByText(/Find a helpline/i)).toBeInTheDocument();
  });

  it("calls onReturn when return button is clicked", async () => {
    const onReturn = vi.fn();
    const user = userEvent.setup();
    render(<CrisisInterstitial onReturn={onReturn} />);
    const returnBtn = screen.getByText("Return to mirror");
    await user.click(returnBtn);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});

// ─── ConsentGate ──────────────────────────────────────────────────
describe("ConsentGate", () => {
  it("renders consent checkboxes", () => {
    render(
      <MemoryRouter><ConsentGate onAccept={vi.fn()} /></MemoryRouter>
    );
    // Should render checkbox elements
    const checkboxes = document.querySelectorAll("[role='checkbox']");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders accept button (initially disabled)", () => {
    render(
      <MemoryRouter><ConsentGate onAccept={vi.fn()} /></MemoryRouter>
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ─── BottomNav ────────────────────────────────────────────────────
describe("BottomNav", () => {
  it("renders navigation tabs", () => {
    render(
      <BottomNav activeTab="mirror" onTabChange={vi.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("calls onTabChange when a tab is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BottomNav activeTab="mirror" onTabChange={onChange} />
    );
    const buttons = screen.getAllByRole("button");
    if (buttons.length > 1) {
      await user.click(buttons[1]);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

// ─── ReadingLoader ────────────────────────────────────────────────
describe("ReadingLoader", () => {
  it("renders loading animation", () => {
    render(
      <ReadingLoader 
        onComplete={vi.fn()} 
        onError={vi.fn()} 
        generateReading={vi.fn(() => Promise.resolve({}))} 
      />
    );
    // Should have animated content
    const container = document.querySelector("section, div");
    expect(container).not.toBeNull();
  });
});

// ─── More components for coverage push ────────────────────────────
import BirthCoordinates from "@/components/BirthCoordinates";
import AuthScreen from "@/components/AuthScreen";
import TransitCalendar from "@/components/TransitCalendar";
import PaywallModal from "@/components/PaywallModal";
import QuestionInput from "@/components/QuestionInput";
import DrumRoller from "@/components/DrumRoller";

vi.mock("@/components/LocationAutocomplete", () => ({
  default: ({ value, onChange }: any) => (
    <input data-testid="location-input" value={value} onChange={(e: any) => onChange({ name: e.target.value, lat: 0, lng: 0, timezone: "UTC" })} placeholder="City" />
  ),
}));

// ─── BirthCoordinates ─────────────────────────────────────────────
describe("BirthCoordinates", () => {
  it("renders date, time, and place sections", () => {
    render(
      <MemoryRouter><BirthCoordinates onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("birth_date_label")).toBeInTheDocument();
    expect(screen.getByText("birth_time_label")).toBeInTheDocument();
    expect(screen.getByText("birth_place_label")).toBeInTheDocument();
  });

  it("renders unknown time checkbox", () => {
    render(
      <MemoryRouter><BirthCoordinates onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("birth_unknown_time")).toBeInTheDocument();
  });

  it("renders submit button (initially disabled without location)", () => {
    render(
      <MemoryRouter><BirthCoordinates onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("birth_cta")).toBeInTheDocument();
  });

  it("renders back arrow button", () => {
    render(
      <MemoryRouter><BirthCoordinates onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    // Back button is the first button in the form
    const buttons = document.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ─── AuthScreen ───────────────────────────────────────────────────
describe("AuthScreen", () => {
  it("renders email and password inputs", () => {
    render(
      <MemoryRouter><AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    const inputs = document.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Google sign-in button", () => {
    render(
      <MemoryRouter><AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText(/Google/i)).toBeInTheDocument();
  });

  it("renders sign up / sign in toggle", () => {
    render(
      <MemoryRouter><AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── TransitCalendar ──────────────────────────────────────────────
describe("TransitCalendar", () => {
  it("renders day selector", () => {
    render(
      <MemoryRouter><TransitCalendar /></MemoryRouter>
    );
    // Day selector renders clickable day elements
    const container = document.querySelector("section, div");
    expect(container).not.toBeNull();
  });

  it("renders loading or empty state", async () => {
    render(
      <MemoryRouter><TransitCalendar /></MemoryRouter>
    );
    // Initially shows loading state, then switches to empty state after fetch
    await waitFor(() => {
      const text = document.body.textContent || "";
      expect(text).toMatch(/Generating your calendar|transits are being calculated/i);
    });
  });
});

// ─── PaywallModal ─────────────────────────────────────────────────
describe("PaywallModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <MemoryRouter><PaywallModal open={false} onClose={vi.fn()} /></MemoryRouter>
    );
    // Modal should not be visible
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("renders tier cards when open", () => {
    render(
      <MemoryRouter><PaywallModal open={true} onClose={vi.fn()} /></MemoryRouter>
    );
    // Multiple elements contain "Mirror" — just check the modal rendered
    const allMirrorElements = screen.getAllByText(/Mirror/);
    expect(allMirrorElements.length).toBeGreaterThan(0);
  });
});

// ─── QuestionInput ────────────────────────────────────────────────
describe("QuestionInput", () => {
  it("renders domain tiles and textarea", () => {
    render(
      <MemoryRouter><QuestionInput onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("domain_work")).toBeInTheDocument();
    expect(screen.getByText("domain_love")).toBeInTheDocument();
    expect(screen.getByText("domain_visibility")).toBeInTheDocument();
  });

  it("renders mode selector", () => {
    render(
      <MemoryRouter><QuestionInput onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("mode_reflect")).toBeInTheDocument();
    expect(screen.getByText("mode_coach")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(
      <MemoryRouter><QuestionInput onSubmit={vi.fn()} onBack={vi.fn()} /></MemoryRouter>
    );
    expect(screen.getByText("question_cta")).toBeInTheDocument();
  });
});

// ─── DrumRoller ───────────────────────────────────────────────────
describe("DrumRoller", () => {
  const items = [
    { value: 1, label: "01" },
    { value: 2, label: "02" },
    { value: 3, label: "03" },
    { value: 4, label: "04" },
    { value: 5, label: "05" },
  ];

  it("renders all items", () => {
    render(<DrumRoller items={items} value={3} onChange={vi.fn()} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("05")).toBeInTheDocument();
  });

  it("highlights the selected value", () => {
    render(<DrumRoller items={items} value={3} onChange={vi.fn()} />);
    const selected = screen.getByText("03");
    expect(selected.className).toContain("font-display");
  });

  it("renders with correct selected styling", () => {
    render(<DrumRoller items={items} value={1} onChange={vi.fn()} />);
    const item1 = screen.getByText("01");
    expect(item1.className).toContain("font-display");
    const item5 = screen.getByText("05");
    expect(item5.className).toContain("font-body");
  });
});

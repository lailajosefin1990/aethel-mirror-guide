import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ─── Hoisted Mocks ─────────────────────────────────────────────────
const { mockUser, mockSupabase, mockInvoke } = vi.hoisted(() => {
  const mockUser = { id: "user-123", email: "test@aethel.com" };

  const mockInvoke = vi.fn(() =>
    Promise.resolve({
      data: {
        astrology_reading: "Test transit reading.",
        design_insights: ["— Insight one", "— Insight two", "— Insight three"],
        third_way: "Test third way recommendation.",
        journal_prompt: "What matters most right now?",
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
          single: vi.fn(() => ({
            data: {
              birth_date: "1990-06-15",
              birth_time: "14:30",
              birth_place: "Barcelona",
              birth_lat: 41.39,
              birth_lng: 2.17,
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
          single: vi.fn(() => ({ data: { id: "reading-1" }, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    functions: { invoke: mockInvoke },
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { user: mockUser, access_token: "tok" } }, error: null })
      ),
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
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

vi.mock("@/hooks/useOgImage", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/cardGenerator", () => ({
  generateThirdWayCard: vi.fn(() => Promise.resolve(new Blob(["img"], { type: "image/png" }))),
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

// ─── Test Data ─────────────────────────────────────────────────────
const baseReading = {
  astrology_reading: "Mercury is transiting your career sector.",
  design_insights: ["— Insight alpha", "— Insight beta", "— Insight gamma"],
  third_way: "Take the bold path forward.",
  journal_prompt: "What are you avoiding?",
  confidence_level: "high" as const,
  is_fallback: false,
};

// ─── Tests ─────────────────────────────────────────────────────────
describe("Regeneration Feedback Pipeline", () => {
  let onRegenerateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onRegenerateSpy = vi.fn();
  });

  // ── 1. ReadingOutput passes feedbackText through onRegenerate ────
  describe("ReadingOutput → onRegenerate callback", () => {
    it("passes user feedback text to onRegenerate when Regenerate is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ReadingOutput
            domain="Work & money"
            question="Should I take the new role?"
            reading={baseReading}
            onSave={vi.fn()}
            onBack={vi.fn()}
            onRegenerate={onRegenerateSpy}
            regenerationCount={0}
          />
        </MemoryRouter>
      );

      // Open feedback modal
      const doesntFitBtn = screen.getByText("That doesn't fit");
      await user.click(doesntFitBtn);

      // Type feedback
      const textarea = await screen.findByPlaceholderText("What felt off?");
      await user.type(textarea, "The career advice felt too generic");

      // Click Regenerate
      const regenBtn = screen.getByText("Regenerate");
      await user.click(regenBtn);

      // Verify onRegenerate was called WITH the feedback text
      expect(onRegenerateSpy).toHaveBeenCalledTimes(1);
      expect(onRegenerateSpy).toHaveBeenCalledWith("The career advice felt too generic");
    });

    it("passes empty string when user clicks Regenerate without typing feedback", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ReadingOutput
            domain="Love & people"
            question="Is this the right relationship?"
            reading={baseReading}
            onSave={vi.fn()}
            onBack={vi.fn()}
            onRegenerate={onRegenerateSpy}
            regenerationCount={1}
          />
        </MemoryRouter>
      );

      const doesntFitBtn = screen.getByText("That doesn't fit");
      await user.click(doesntFitBtn);

      const regenBtn = screen.getByText("Regenerate");
      await user.click(regenBtn);

      expect(onRegenerateSpy).toHaveBeenCalledTimes(1);
      expect(onRegenerateSpy).toHaveBeenCalledWith("");
    });

    it("does not render 'That doesn't fit' button when regenerationCount >= 3", () => {
      render(
        <MemoryRouter>
          <ReadingOutput
            domain="Visibility"
            question="Should I launch publicly?"
            reading={baseReading}
            onSave={vi.fn()}
            onBack={vi.fn()}
            onRegenerate={undefined}
            regenerationCount={3}
          />
        </MemoryRouter>
      );

      expect(screen.queryByText("That doesn't fit")).not.toBeInTheDocument();
      expect(screen.getByText(/three paths/i)).toBeInTheDocument();
    });

    it("closes the feedback modal after clicking Regenerate", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ReadingOutput
            domain="Work & money"
            question="Test question"
            reading={baseReading}
            onSave={vi.fn()}
            onBack={vi.fn()}
            onRegenerate={onRegenerateSpy}
            regenerationCount={0}
          />
        </MemoryRouter>
      );

      await user.click(screen.getByText("That doesn't fit"));
      expect(screen.getByText("Tell us what missed the mark")).toBeInTheDocument();

      await user.click(screen.getByText("Regenerate"));

      await waitFor(() => {
        expect(screen.queryByText("Tell us what missed the mark")).not.toBeInTheDocument();
      });
    });

    it("clears feedbackText state after Regenerate is clicked", async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <ReadingOutput
            domain="Work & money"
            question="Test question"
            reading={baseReading}
            onSave={vi.fn()}
            onBack={vi.fn()}
            onRegenerate={onRegenerateSpy}
            regenerationCount={0}
          />
        </MemoryRouter>
      );

      // First regeneration with feedback
      await user.click(screen.getByText("That doesn't fit"));
      const textarea = await screen.findByPlaceholderText("What felt off?");
      await user.type(textarea, "Too vague");
      await user.click(screen.getByText("Regenerate"));

      expect(onRegenerateSpy).toHaveBeenCalledWith("Too vague");
    });
  });

  // ── 2. Edge function body includes regenerationFeedback ──────────
  describe("generateReading edge function call", () => {
    it("includes regenerationFeedback in the body when feedback is provided", async () => {
      mockInvoke.mockClear();

      await mockSupabase.functions.invoke("generate-reading", {
        body: {
          domain: "Work & money",
          question: "Should I take the new role?",
          mode: "Coach me",
          birthDate: "15/06/1990",
          birthPlace: "Barcelona",
          birthTime: "14:30",
          birthLat: 41.39,
          birthLng: 2.17,
          birthTimezone: "Europe/Madrid",
          language: "en",
          regenerationFeedback: "The career advice felt too generic",
        },
      });

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      const callArgs = mockInvoke.mock.calls[0];
      expect(callArgs[0]).toBe("generate-reading");
      expect(callArgs[1].body.regenerationFeedback).toBe("The career advice felt too generic");
    });

    it("does NOT include regenerationFeedback (or sets it to null) on fresh readings", async () => {
      mockInvoke.mockClear();

      await mockSupabase.functions.invoke("generate-reading", {
        body: {
          domain: "Love & people",
          question: "Is this the right relationship?",
          mode: "Reflect with me",
          birthDate: "15/06/1990",
          birthPlace: "Barcelona",
          birthTime: "14:30",
          birthLat: 41.39,
          birthLng: 2.17,
          birthTimezone: "Europe/Madrid",
          language: "en",
          regenerationFeedback: null,
        },
      });

      const callArgs = mockInvoke.mock.calls[0];
      expect(callArgs[1].body.regenerationFeedback).toBeNull();
    });
  });
});

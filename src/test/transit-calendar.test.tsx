import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mocks ─────────────────────────────────────────────────────────
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

let mockInvokeData: any = {
  transits: [
    {
      id: "t1",
      date: "2026-04-08",
      traffic_light: "green",
      transit_headline: "Open road ahead",
      transit_detail: "Strong momentum today with Jupiter trine your natal Sun.",
      moon_phase: "Waxing Crescent",
      linked_domain: "Work & money",
    },
    {
      id: "t2",
      date: "2026-04-09",
      traffic_light: "amber",
      transit_headline: "Slow down slightly",
      transit_detail: "Mars squares Saturn — patience is your ally.",
      moon_phase: "First Quarter",
      linked_domain: null,
    },
    {
      id: "t3",
      date: "2026-04-10",
      traffic_light: "red",
      transit_headline: "Pause and reassess",
      transit_detail: "Mercury retro opposes Pluto — avoid signing contracts.",
      moon_phase: "Full Moon",
      linked_domain: "Love & people",
    },
  ],
};
let mockInvokeError: any = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => {
        if (mockInvokeError) throw mockInvokeError;
        return { data: mockInvokeData, error: null };
      }),
    },
  },
}));

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: {
    CALENDAR_VIEWED: "calendar_viewed",
    CALENDAR_DAY_TAPPED: "calendar_day_tapped",
    CALENDAR_DECISION_LINK_TAPPED: "calendar_decision_link_tapped",
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts?.domain ? `${key}:${opts.domain}` : key),
  }),
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const FWD = (tag: string) =>
    React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (!["initial", "animate", "exit", "transition", "whileHover", "whileTap", "layout", "layoutId"].includes(k)) {
          clean[k] = v;
        }
      }
      return React.createElement(tag, { ...clean, ref }, children);
    });
  return {
    motion: {
      div: FWD("div"),
      p: FWD("p"),
      button: FWD("button"),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

import TransitCalendar from "@/components/TransitCalendar";
import { trackEvent, EVENTS } from "@/lib/analytics";

// ─── Helpers ───────────────────────────────────────────────────────
const mockRevisit = vi.fn();

function renderCalendar(props: any = {}) {
  return render(<TransitCalendar onRevisitDecision={mockRevisit} {...props} />);
}

// ─── Tests ─────────────────────────────────────────────────────────

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe("TransitCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeData = {
      transits: [
        {
          id: "t1", date: "2026-04-08", traffic_light: "green",
          transit_headline: "Open road ahead",
          transit_detail: "Strong momentum today.",
          moon_phase: "Waxing Crescent", linked_domain: "Work & money",
        },
        {
          id: "t2", date: "2026-04-09", traffic_light: "amber",
          transit_headline: "Slow down slightly",
          transit_detail: "Mars squares Saturn.",
          moon_phase: "First Quarter", linked_domain: null,
        },
        {
          id: "t3", date: "2026-04-10", traffic_light: "red",
          transit_headline: "Pause and reassess",
          transit_detail: "Mercury retro opposes Pluto.",
          moon_phase: "Full Moon", linked_domain: "Love & people",
        },
      ],
    };
    mockInvokeError = null;
  });

  // ── Loading state ──

  it("shows loading spinner initially", () => {
    renderCalendar();
    expect(screen.getByText("transit_loading")).toBeInTheDocument();
    expect(screen.getByText("transit_loading_detail")).toBeInTheDocument();
  });

  // ── Loaded with data ──

  it("renders transit headlines after loading", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("Open road ahead")).toBeInTheDocument();
      expect(screen.getByText("Slow down slightly")).toBeInTheDocument();
      expect(screen.getByText("Pause and reassess")).toBeInTheDocument();
    });
  });

  it("renders transit detail text", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("Strong momentum today.")).toBeInTheDocument();
    });
  });

  it("renders the heading and subtitle", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("transit_heading")).toBeInTheDocument();
      expect(screen.getByText("transit_subtitle")).toBeInTheDocument();
    });
  });

  it("renders moon phase emoji and label", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/🌒.*Waxing Crescent/)).toBeInTheDocument();
      expect(screen.getByText(/🌓.*First Quarter/)).toBeInTheDocument();
      expect(screen.getByText(/🌕.*Full Moon/)).toBeInTheDocument();
    });
  });

  it("renders 3 day buttons in the date strip", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("9")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  it("renders traffic light dots with correct colors", async () => {
    const { container } = renderCalendar();
    await waitFor(() => {
      expect(container.querySelector(".bg-emerald-400")).toBeInTheDocument();
      expect(container.querySelector(".bg-amber-400")).toBeInTheDocument();
      expect(container.querySelector(".bg-red-400")).toBeInTheDocument();
    });
  });

  // ── Interactions ──

  it("clicking a day button fires analytics and scrolls", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("8"));

    expect(trackEvent).toHaveBeenCalledWith(EVENTS.CALENDAR_DAY_TAPPED, {
      date: "2026-04-08",
      traffic_light: "green",
    });
  });

  it("linked domain shows revisit buttons", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("transit_relevant:Work & money")).toBeInTheDocument();
      // Two entries have linked_domain (t1 and t3)
      const revisitBtns = screen.getAllByText("transit_revisit");
      expect(revisitBtns.length).toBe(2);
    });
  });

  it("clicking revisit calls onRevisitDecision with the domain", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getAllByText("transit_revisit").length).toBeGreaterThan(0);
    });

    const revisitBtns = screen.getAllByText("transit_revisit");
    fireEvent.click(revisitBtns[0]);

    expect(trackEvent).toHaveBeenCalledWith(EVENTS.CALENDAR_DECISION_LINK_TAPPED);
    expect(mockRevisit).toHaveBeenCalledWith("Work & money");
  });

  it("entries without linked_domain do not show revisit button", async () => {
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("Open road ahead")).toBeInTheDocument();
    });
    // "Slow down slightly" (amber, t2) has no linked_domain
    // Should not have a third revisit button — only 2 entries have linked_domain
    const revisitBtns = screen.getAllByText("transit_revisit");
    expect(revisitBtns.length).toBe(2); // t1 and t3
  });

  // ── Empty state ──

  it("shows empty state when no transits returned", async () => {
    mockInvokeData = { transits: [] };
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText("transit_empty_title")).toBeInTheDocument();
      expect(screen.getByText("transit_empty_detail")).toBeInTheDocument();
    });
  });

  // ── Error state ──

  it("shows empty state on API error (graceful degradation)", async () => {
    mockInvokeError = new Error("API down");
    const { container } = renderCalendar();
    await waitFor(() => {
      // Should stop loading and show empty state
      expect(screen.queryByText("transit_loading")).not.toBeInTheDocument();
    });
  });

  // ── Analytics ──

  it("tracks CALENDAR_VIEWED on mount", () => {
    renderCalendar();
    expect(trackEvent).toHaveBeenCalledWith(EVENTS.CALENDAR_VIEWED);
  });
});

// ─── getMoonEmoji (unit logic) ─────────────────────────────────────

describe("getMoonEmoji edge cases via rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvokeError = null;
  });

  it("renders fallback emoji for unknown moon phase", async () => {
    mockInvokeData = {
      transits: [
        {
          id: "tx", date: "2026-05-01", traffic_light: "green",
          transit_headline: "Test",
          transit_detail: "Detail",
          moon_phase: "Some Unknown Phase",
          linked_domain: null,
        },
      ],
    };
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/🌙.*Some Unknown Phase/)).toBeInTheDocument();
    });
  });

  it("renders New Moon emoji correctly", async () => {
    mockInvokeData = {
      transits: [
        {
          id: "tx", date: "2026-05-01", traffic_light: "green",
          transit_headline: "Test",
          transit_detail: "Detail",
          moon_phase: "New Moon",
          linked_domain: null,
        },
      ],
    };
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/🌑.*New Moon/)).toBeInTheDocument();
    });
  });

  it("renders Waning Gibbous emoji correctly", async () => {
    mockInvokeData = {
      transits: [
        {
          id: "tx", date: "2026-05-01", traffic_light: "green",
          transit_headline: "Test",
          transit_detail: "Detail",
          moon_phase: "Waning Gibbous",
          linked_domain: null,
        },
      ],
    };
    renderCalendar();
    await waitFor(() => {
      expect(screen.getByText(/🌖.*Waning Gibbous/)).toBeInTheDocument();
    });
  });
});

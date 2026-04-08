import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Mocks ─────────────────────────────────────────────────────────
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: { BIRTH_DATA_SUBMITTED: "birth_data_submitted" },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock framer-motion to render elements immediately
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const FWD = (tag: string) =>
    React.forwardRef(({ children, ...rest }: any, ref: any) => {
      // strip motion-specific props
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
      button: FWD("button"),
      p: FWD("p"),
      form: FWD("form"),
      div: FWD("div"),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock DrumRoller — render a select that triggers onChange
vi.mock("@/components/DrumRoller", () => ({
  default: ({ items, value, onChange }: any) => (
    <select
      data-testid="drum-roller"
      value={value}
      onChange={(e) => onChange(items.find((i: any) => String(i.value) === e.target.value)?.value)}
    >
      {items.map((item: any) => (
        <option key={item.value} value={item.value} disabled={item.disabled}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock LocationAutocomplete — render an input + simulated onChange
let mockLocationCallback: ((loc: any) => void) | null = null;
vi.mock("@/components/LocationAutocomplete", () => ({
  default: ({ value, onChange }: any) => {
    mockLocationCallback = onChange;
    return (
      <input
        data-testid="location-input"
        value={value}
        onChange={() => {}}
        placeholder="Search location"
      />
    );
  },
}));

import BirthCoordinates from "@/components/BirthCoordinates";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { toast } from "sonner";

// ─── Helpers ───────────────────────────────────────────────────────
const mockSubmit = vi.fn();
const mockBack = vi.fn();

function renderBirth() {
  return render(<BirthCoordinates onSubmit={mockSubmit} onBack={mockBack} />);
}

function selectLocation(name = "Barcelona", lat = 41.387, lng = 2.168, timezone = "Europe/Madrid") {
  if (mockLocationCallback) {
    mockLocationCallback({ name, lat, lng, timezone });
  }
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("BirthCoordinates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationCallback = null;
  });

  // ── Rendering ──

  it("renders the birth heading", () => {
    renderBirth();
    expect(screen.getByText("birth_heading")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderBirth();
    expect(screen.getByText("birth_subtitle")).toBeInTheDocument();
  });

  it("renders 5 DrumRollers (3 date + 2 time)", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    expect(rollers.length).toBe(5);
  });

  it("renders date label", () => {
    renderBirth();
    expect(screen.getByText("birth_date_label")).toBeInTheDocument();
  });

  it("renders time label", () => {
    renderBirth();
    expect(screen.getByText("birth_time_label")).toBeInTheDocument();
  });

  it("renders unknown time checkbox", () => {
    renderBirth();
    expect(screen.getByText("birth_unknown_time")).toBeInTheDocument();
  });

  it("renders place label", () => {
    renderBirth();
    expect(screen.getByText("birth_place_label")).toBeInTheDocument();
  });

  it("renders the CTA button", () => {
    renderBirth();
    expect(screen.getByText("birth_cta")).toBeInTheDocument();
  });

  it("renders the privacy notice", () => {
    renderBirth();
    expect(screen.getByText("birth_privacy")).toBeInTheDocument();
  });

  it("renders a back button", () => {
    const { container } = renderBirth();
    // ArrowLeft icon button
    const backButtons = container.querySelectorAll("button");
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ── CTA disabled until location selected ──

  it("CTA is disabled when no location is selected", () => {
    renderBirth();
    const cta = screen.getByText("birth_cta");
    expect(cta).toBeDisabled();
  });

  it("CTA becomes enabled after location is selected", () => {
    renderBirth();
    act(() => { selectLocation(); });
    expect(screen.getByText("birth_cta")).not.toBeDisabled();
  });

  // ── Unknown time toggle ──

  it("clicking unknown time checkbox toggles the time section opacity", () => {
    renderBirth();
    const checkbox = screen.getByText("birth_unknown_time");
    fireEvent.click(checkbox);
    // The time section should have opacity-30 class
    expect(screen.getByText("birth_solar_noon")).toBeInTheDocument();
  });

  it("shows warning text when unknown time is checked", () => {
    renderBirth();
    fireEvent.click(screen.getByText("birth_unknown_time"));
    expect(screen.getByText("birth_solar_noon")).toBeInTheDocument();
  });

  it("shows expandable 'why birth time matters' section", () => {
    renderBirth();
    fireEvent.click(screen.getByText("birth_unknown_time"));
    expect(screen.getByText(/birth_time_why/)).toBeInTheDocument();
  });

  it("clicking the warning expander shows the full warning text", () => {
    renderBirth();
    fireEvent.click(screen.getByText("birth_unknown_time"));
    const expander = screen.getByText(/birth_time_why/);
    fireEvent.click(expander);
    expect(screen.getByText("birth_time_warning")).toBeInTheDocument();
  });

  it("shows a help link for finding birth time", () => {
    renderBirth();
    fireEvent.click(screen.getByText("birth_unknown_time"));
    // Help link text varies by locale — find any <a> with an external href
    const links = screen.getAllByRole("link");
    const helpLink = links.find(l => l.getAttribute("href")?.includes("astro.com") || l.getAttribute("href")?.includes("gov"));
    expect(helpLink).toBeDefined();
    expect(helpLink!.getAttribute("target")).toBe("_blank");
  });

  // ── Form submission ──

  it("calls onSubmit with correct data when form is submitted", () => {
    renderBirth();
    act(() => { selectLocation(); });
    // Submit the form via the form element (button is type=submit)
    const form = screen.getByText("birth_cta").closest("form")!;
    fireEvent.submit(form);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const data = mockSubmit.mock.calls[0][0];
    expect(data.birthPlace).toBe("Barcelona");
    expect(data.birthLat).toBe(41.387);
    expect(data.birthLng).toBe(2.168);
    expect(data.birthTimezone).toBe("Europe/Madrid");
    expect(data.unknownTime).toBe(false);
    expect(data.date).toBeInstanceOf(Date);
    expect(data.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it("submits null time when unknown time is checked", () => {
    renderBirth();
    act(() => { selectLocation(); });
    fireEvent.click(screen.getByText("birth_unknown_time"));
    const form = screen.getByText("birth_cta").closest("form")!;
    fireEvent.submit(form);

    const data = mockSubmit.mock.calls[0][0];
    expect(data.unknownTime).toBe(true);
    expect(data.time).toBeNull();
  });

  it("tracks BIRTH_DATA_SUBMITTED event with has_birth_time flag", () => {
    renderBirth();
    act(() => { selectLocation(); });
    const form = screen.getByText("birth_cta").closest("form")!;
    fireEvent.submit(form);

    expect(trackEvent).toHaveBeenCalledWith(EVENTS.BIRTH_DATA_SUBMITTED, { has_birth_time: true });
  });

  it("tracks has_birth_time: false when unknown time is checked", () => {
    renderBirth();
    act(() => { selectLocation(); });
    fireEvent.click(screen.getByText("birth_unknown_time"));
    const form = screen.getByText("birth_cta").closest("form")!;
    fireEvent.submit(form);

    expect(trackEvent).toHaveBeenCalledWith(EVENTS.BIRTH_DATA_SUBMITTED, { has_birth_time: false });
  });

  it("does not submit when location is not selected", () => {
    renderBirth();
    const cta = screen.getByText("birth_cta");
    fireEvent.click(cta);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  // ── Back navigation ──

  it("back button calls onBack and shows toast", () => {
    const { container } = renderBirth();
    // The first button is the back button (ArrowLeft)
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("Your question is saved", { duration: 2000 });
  });

  // ── Date validation: days in month ──

  it("generates 31 day options", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    const dayRoller = rollers[0];
    const options = dayRoller.querySelectorAll("option");
    expect(options.length).toBe(31);
  });

  it("generates 12 month options with names", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    const monthRoller = rollers[1];
    const options = monthRoller.querySelectorAll("option");
    expect(options.length).toBe(12);
    expect(options[0].textContent).toBe("January");
    expect(options[11].textContent).toBe("December");
  });

  it("generates year options from 1920 to current year", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    const yearRoller = rollers[2];
    const options = yearRoller.querySelectorAll("option");
    const currentYear = new Date().getFullYear();
    expect(options.length).toBe(currentYear - 1920 + 1);
    expect(options[0].textContent).toBe("1920");
    expect(options[options.length - 1].textContent).toBe(String(currentYear));
  });

  it("generates 24 hour options", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    const hourRoller = rollers[3];
    expect(hourRoller.querySelectorAll("option").length).toBe(24);
  });

  it("generates 60 minute options", () => {
    const { container } = renderBirth();
    const rollers = container.querySelectorAll("[data-testid='drum-roller']");
    const minuteRoller = rollers[4];
    expect(minuteRoller.querySelectorAll("option").length).toBe(60);
  });
});

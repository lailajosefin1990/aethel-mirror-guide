import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// ─── Mocks ─────────────────────────────────────────────────────────
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: {
    READING_GENERATING: "reading_generating",
    READING_WAIT_CANCELLED: "reading_wait_cancelled",
  },
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      p: React.forwardRef(({ children, ...props }: any, ref: any) => <p ref={ref} {...props}>{children}</p>),
      div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    },
  };
});

import ReadingLoader from "@/components/ReadingLoader";
import { trackEvent, EVENTS } from "@/lib/analytics";

// ─── Tests ─────────────────────────────────────────────────────────

describe("ReadingLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = () => ({
    onComplete: vi.fn(),
    onError: vi.fn(),
    generateReading: vi.fn().mockResolvedValue(undefined),
  });

  // ── Render ──

  it("renders the loading section with aria label", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(screen.getByLabelText("Loading your reading")).toBeInTheDocument();
  });

  it("renders the brand name", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(screen.getByText(/A E T H E L/)).toBeInTheDocument();
  });

  it("shows the first phrase on load", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(screen.getByText("Reading your chart...")).toBeInTheDocument();
  });

  it("renders 4 progress dots", () => {
    const props = defaultProps();
    const { container } = render(<ReadingLoader {...props} />);
    const dots = container.querySelectorAll(".rounded-full.w-1\\.5");
    expect(dots.length).toBe(4);
  });

  it("renders a cancel button", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("has a live region for accessibility", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  // ── API call ──

  it("calls generateReading on mount", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(props.generateReading).toHaveBeenCalledTimes(1);
  });

  it("does not call generateReading twice on re-render", () => {
    const props = defaultProps();
    const { rerender } = render(<ReadingLoader {...props} />);
    rerender(<ReadingLoader {...props} />);
    expect(props.generateReading).toHaveBeenCalledTimes(1);
  });

  it("tracks READING_GENERATING event on mount", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(trackEvent).toHaveBeenCalledWith(EVENTS.READING_GENERATING);
  });

  // ── Phrase animation ──

  it("advances phrases on 2-second intervals", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);
    expect(screen.getByText("Reading your chart...")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Checking your design...")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Finding the pattern...")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Forming your Third Way...")).toBeInTheDocument();
  });

  it("stops advancing after the last phrase", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);

    // Advance through all 4 phrases
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.getByText("Forming your Third Way...")).toBeInTheDocument();

    // Additional time should not break
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText("Forming your Third Way...")).toBeInTheDocument();
  });

  // ── Completion ──

  it("onComplete requires both API success and animation end (not just one)", async () => {
    // This test verifies the dual-gate: onComplete only fires when
    // both apiDone AND animDone are true. We test each alone.
    const props = defaultProps();
    render(<ReadingLoader {...props} />);

    // API resolves immediately
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Advance only 2 intervals — animation is NOT done
    act(() => { vi.advanceTimersByTime(4000); });

    // apiDone=true but animDone=false → no call yet
    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("does not call onComplete if API resolves but animation is not done", async () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);

    await act(async () => { await Promise.resolve(); });

    // Only advance through 2 phrases — animation not finished
    act(() => { vi.advanceTimersByTime(4000); });

    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("does not call onComplete if animation finishes but API is still pending", () => {
    let resolveApi: () => void;
    const apiPromise = new Promise<void>((r) => { resolveApi = r; });
    const props = { ...defaultProps(), generateReading: vi.fn(() => apiPromise) };
    render(<ReadingLoader {...props} />);

    // Finish all animation
    act(() => { vi.advanceTimersByTime(8000); });

    expect(props.onComplete).not.toHaveBeenCalled();
  });

  // ── Error handling ──

  it("shows error state when API fails", async () => {
    const props = {
      ...defaultProps(),
      generateReading: vi.fn().mockRejectedValue(new Error("API failure")),
    };
    render(<ReadingLoader {...props} />);

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(screen.getByText("Your mirror needs a moment.")).toBeInTheDocument();
    expect(screen.getByText("Try again.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls onError when API fails", async () => {
    const props = {
      ...defaultProps(),
      generateReading: vi.fn().mockRejectedValue(new Error("fail")),
    };
    render(<ReadingLoader {...props} />);

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(props.onError).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete when in error state", async () => {
    const props = {
      ...defaultProps(),
      generateReading: vi.fn().mockRejectedValue(new Error("fail")),
    };
    render(<ReadingLoader {...props} />);

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { vi.advanceTimersByTime(10000); });

    expect(props.onComplete).not.toHaveBeenCalled();
  });

  it("retry button resets error state and shows loading UI again", async () => {
    const genFn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(undefined);

    const props = { ...defaultProps(), generateReading: genFn };
    render(<ReadingLoader {...props} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByText("Your mirror needs a moment.")).toBeInTheDocument();

    // Click retry — clears error, resets state
    await act(async () => {
      fireEvent.click(screen.getByText("Retry"));
    });

    // Should show loading UI again (brand name visible, error text gone)
    expect(screen.getByText(/A E T H E L/)).toBeInTheDocument();
    expect(screen.queryByText("Your mirror needs a moment.")).not.toBeInTheDocument();
  });

  // ── Cancel ──

  it("cancel button calls onError and tracks event", () => {
    const props = defaultProps();
    render(<ReadingLoader {...props} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(trackEvent).toHaveBeenCalledWith(EVENTS.READING_WAIT_CANCELLED);
    expect(props.onError).toHaveBeenCalledTimes(1);
  });
});

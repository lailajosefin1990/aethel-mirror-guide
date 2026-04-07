import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ─────────────────────────────────────────────────────────
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };
  return { mockSupabase };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => mockSupabase) }));
vi.mock("@/lib/posthog", () => ({ track: vi.fn(), identify: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), EVENTS: {} }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

import AuthScreen from "@/components/AuthScreen";

// ─── Tests ─────────────────────────────────────────────────────────
describe("AuthScreen — visual regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Google button ABOVE the email form", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    // Find the Google button and the email input
    const googleButton = screen.getByText("Google").closest("button")!;
    const emailInput = screen.getByPlaceholderText("auth_email");

    // Verify both exist
    expect(googleButton).not.toBeNull();
    expect(emailInput).toBeInTheDocument();

    // Verify DOM order: Google button comes BEFORE email input
    // compareDocumentPosition returns a bitmask; bit 4 (DOCUMENT_POSITION_FOLLOWING) means
    // the argument follows the reference node in the DOM
    const position = googleButton.compareDocumentPosition(emailInput);
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(position & FOLLOWING).toBe(FOLLOWING);
  });

  it("renders the divider between Google button and email form", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const dividerText = screen.getByText("auth_or_continue");
    expect(dividerText).toBeInTheDocument();

    // Divider should be between Google and email
    const googleButton = screen.getByText("Google").closest("button")!;
    const emailInput = screen.getByPlaceholderText("auth_email");

    const dividerPosition = googleButton.compareDocumentPosition(dividerText);
    const emailPosition = dividerText.compareDocumentPosition(emailInput);
    expect(dividerPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(emailPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders the Continue button with primary/gold background", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeInTheDocument();

    // The button should have bg-primary class (which maps to the gold colour)
    expect(continueButton.className).toMatch(/bg-primary/);
    // And primary-foreground text (dark text on gold)
    expect(continueButton.className).toMatch(/text-primary-foreground/);
  });

  it("renders 'Keep your reading' heading, not 'Save your mirror'", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Keep your reading")).toBeInTheDocument();
    expect(screen.queryByText("Save your mirror")).not.toBeInTheDocument();
  });

  it("renders 'free' highlighted in the subtitle", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const freeSpan = screen.getByText("free");
    expect(freeSpan).toBeInTheDocument();
    // "free" should be styled with primary colour and medium weight
    expect(freeSpan.className).toMatch(/text-primary/);
    expect(freeSpan.className).toMatch(/font-medium/);
  });

  it("renders back arrow at top of the page, not at the bottom", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    // Find all buttons — the back arrow should be the first button in the DOM
    const allButtons = container.querySelectorAll("button");
    expect(allButtons.length).toBeGreaterThan(0);

    // The first button should be the back arrow (it contains an ArrowLeft SVG)
    const firstButton = allButtons[0];
    const svg = firstButton.querySelector("svg");
    expect(svg).not.toBeNull();

    // The Google button should come after the back arrow
    const googleButton = screen.getByText("Google").closest("button")!;
    const position = firstButton.compareDocumentPosition(googleButton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders email and password input fields with visible borders", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("auth_email");
    const passwordInput = screen.getByPlaceholderText("auth_password");

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    // Inputs should have border classes for visibility
    expect(emailInput.className).toMatch(/border/);
    expect(passwordInput.className).toMatch(/border/);
  });

  it("renders password hint on sign-up mode", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    // Default mode is sign-up, should show password hint
    expect(screen.getByText("auth_password_hint")).toBeInTheDocument();
  });

  it("renders sign-in toggle link", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("auth_sign_in")).toBeInTheDocument();
  });

  it("renders the AETHEL MIRROR wordmark", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    // The wordmark uses spaced letters — check for the text content
    const bodyText = container.textContent || "";
    expect(bodyText).toContain("A E T H E L");
    expect(bodyText).toContain("M I R R O R");
  });

  it("Google button has transparent background and visible border", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const googleButton = screen.getByText("Google").closest("button")!;
    expect(googleButton.className).toMatch(/bg-transparent/);
    expect(googleButton.className).toMatch(/border/);
  });

  it("Continue button is inside a form element", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    const continueButton = within(form!).getByText("Continue");
    expect(continueButton).toBeInTheDocument();
    expect(continueButton.getAttribute("type")).toBe("submit");
  });
});

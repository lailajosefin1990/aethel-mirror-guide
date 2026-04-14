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

    const googleButton = screen.getByText("Google").closest("button")!;
    const emailInput = screen.getByPlaceholderText("auth_email");

    expect(googleButton).not.toBeNull();
    expect(emailInput).toBeInTheDocument();

    const position = googleButton.compareDocumentPosition(emailInput);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders the divider between Google button and email form", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const dividerText = screen.getByText("auth_or_continue");
    expect(dividerText).toBeInTheDocument();

    const googleButton = screen.getByText("Google").closest("button")!;
    const emailInput = screen.getByPlaceholderText("auth_email");

    const dividerPosition = googleButton.compareDocumentPosition(dividerText);
    const emailPosition = dividerText.compareDocumentPosition(emailInput);
    expect(dividerPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(emailPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders the CONTINUE button with foreground/background colors", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const continueButton = screen.getByText("CONTINUE");
    expect(continueButton).toBeInTheDocument();

    // White bg on dark text — monochrome style
    expect(continueButton.className).toMatch(/bg-foreground/);
    expect(continueButton.className).toMatch(/text-background/);
  });

  it("renders 'Keep your reading' heading", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Keep your reading")).toBeInTheDocument();
  });

  it("renders the free account subtitle", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/free account/i)).toBeInTheDocument();
  });

  it("renders back arrow at top of the page", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const allButtons = container.querySelectorAll("button");
    expect(allButtons.length).toBeGreaterThan(0);

    const firstButton = allButtons[0];
    const svg = firstButton.querySelector("svg");
    expect(svg).not.toBeNull();

    const googleButton = screen.getByText("Google").closest("button")!;
    const position = firstButton.compareDocumentPosition(googleButton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders email and password input fields with border styling", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("auth_email");
    const passwordInput = screen.getByPlaceholderText("auth_password");

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    expect(emailInput.className).toMatch(/border/);
    expect(passwordInput.className).toMatch(/border/);
  });

  it("renders password hint on sign-up mode", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

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

    const bodyText = container.textContent || "";
    expect(bodyText).toContain("AETHEL MIRROR");
  });

  it("Google button has white background (monochrome CTA)", () => {
    render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const googleButton = screen.getByText("Google").closest("button")!;
    expect(googleButton.className).toMatch(/bg-foreground/);
    expect(googleButton.className).toMatch(/text-background/);
  });

  it("CONTINUE button is inside a form element", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthScreen onSuccess={vi.fn()} onBack={vi.fn()} />
      </MemoryRouter>
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    const continueButton = within(form!).getByText("CONTINUE");
    expect(continueButton).toBeInTheDocument();
    expect(continueButton.getAttribute("type")).toBe("submit");
  });
});

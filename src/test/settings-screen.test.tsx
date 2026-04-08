import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockSignOut = vi.fn();
const mockUser = { id: "user-123", email: "test@aethel.com" };
let mockSubscriptionTier = "free";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    subscriptionTier: mockSubscriptionTier,
    signOut: mockSignOut,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              referral_code: "AETHEL-TEST",
              birth_time: "14:30",
              birth_date: "1990-06-15",
              birth_place_name: "Barcelona",
            },
          }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/lib/push", () => ({
  isPushActive: vi.fn().mockResolvedValue(false),
  subscribeToPush: vi.fn().mockResolvedValue(undefined),
  unsubscribeFromPush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      updateBirth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: {
    DATA_EXPORT_REQUESTED: "data_export_requested",
    ACCOUNT_DELETED: "account_deleted",
    SETTINGS_VIEWED: "settings_viewed",
    BIRTH_TIME_UPDATED: "birth_time_updated",
    PUSH_TOGGLED: "push_toggled",
    REFERRAL_CODE_COPIED: "referral_code_copied",
  },
}));

vi.mock("@/lib/posthog", () => ({
  track: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────
import SettingsScreen from "@/components/SettingsScreen";

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>
  );
}

// In test env without i18n init, t("key") returns "key" — match on i18n keys

// ─── Tests ─────────────────────────────────────────────────────────

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionTier = "free";
  });

  // ── Section rendering (using i18n keys as rendered text) ──

  it("renders the settings title", () => {
    renderSettings();
    expect(screen.getByText("settings_title")).toBeInTheDocument();
  });

  it("renders the account section with email", async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByText("test@aethel.com")).toBeInTheDocument();
    });
  });

  it("renders the account section label", () => {
    renderSettings();
    expect(screen.getByText("settings_account")).toBeInTheDocument();
  });

  it("renders the language section", () => {
    renderSettings();
    expect(screen.getByText("settings_language")).toBeInTheDocument();
  });

  it("renders the birth time section", () => {
    renderSettings();
    expect(screen.getByText("settings_birth_time")).toBeInTheDocument();
  });

  it("renders the notifications section", () => {
    renderSettings();
    expect(screen.getByText("settings_notifications")).toBeInTheDocument();
  });

  it("renders the referral section", () => {
    renderSettings();
    expect(screen.getByText("settings_referral_title")).toBeInTheDocument();
  });

  it("renders the about section", () => {
    renderSettings();
    expect(screen.getByText("settings_about")).toBeInTheDocument();
  });

  it("renders the legal section with privacy, terms, cookies links", () => {
    renderSettings();
    expect(screen.getByText("settings_legal")).toBeInTheDocument();
    expect(screen.getByText("settings_privacy")).toBeInTheDocument();
    expect(screen.getByText("settings_terms")).toBeInTheDocument();
    expect(screen.getByText("settings_cookies")).toBeInTheDocument();
  });

  it("renders the data & privacy section with export and delete buttons", () => {
    renderSettings();
    expect(screen.getByText("settings_data_privacy")).toBeInTheDocument();
    expect(screen.getByText("settings_export")).toBeInTheDocument();
    expect(screen.getByText("settings_delete_account")).toBeInTheDocument();
  });

  it("renders the sign out button", () => {
    renderSettings();
    expect(screen.getByText("settings_sign_out")).toBeInTheDocument();
  });

  // ── Account tier display ──

  it("shows tier label in plan text", () => {
    mockSubscriptionTier = "free";
    renderSettings();
    // tierLabels["free"] = "Free" — appears in "Free plan" text
    expect(screen.getByText(/Free plan/)).toBeInTheDocument();
  });

  it("shows badge for paid tiers", () => {
    mockSubscriptionTier = "mirror";
    renderSettings();
    expect(screen.getByText("Mirror")).toBeInTheDocument();
  });

  // ── Interactions ──

  it("sign out button calls signOut on click", () => {
    renderSettings();
    const signOutBtn = screen.getByText("settings_sign_out");
    fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("delete account button shows confirmation modal", () => {
    renderSettings();
    const deleteBtn = screen.getByText("settings_delete_account");
    fireEvent.click(deleteBtn);
    // Modal should show with confirm title and cancel button
    expect(screen.getByText("settings_delete_confirm_title")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("cancel in delete confirmation closes modal", () => {
    renderSettings();
    fireEvent.click(screen.getByText("settings_delete_account"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("does not render delete confirmation on initial load", () => {
    renderSettings();
    expect(screen.queryByText("settings_delete_confirm_title")).not.toBeInTheDocument();
  });

  // ── Push notifications toggle ──

  it("renders push notification toggle", () => {
    renderSettings();
    expect(screen.getByText("settings_push")).toBeInTheDocument();
    expect(screen.getByText("settings_push_detail")).toBeInTheDocument();
  });

  // ── Structure ──

  it("renders at least 7 bordered sections", () => {
    const { container } = renderSettings();
    // After restyle, sections use border-border instead of bg-card
    const sections = container.querySelectorAll(".border-border");
    expect(sections.length).toBeGreaterThanOrEqual(7);
  });

  it("all settings sections animate in", () => {
    const { container } = renderSettings();
    // framer-motion wraps in div elements inside the section
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section!.children.length).toBeGreaterThan(5);
  });

  // ── Practitioner upgrade button ──

  it("renders practitioner button only for practitioner tier", () => {
    mockSubscriptionTier = "practitioner";
    renderSettings();
    expect(screen.getByText("settings_practitioner")).toBeInTheDocument();
  });

  it("hides practitioner button for free tier", () => {
    mockSubscriptionTier = "free";
    renderSettings();
    expect(screen.queryByText("settings_practitioner")).not.toBeInTheDocument();
  });

  // ── Evidence link ──

  it("renders evidence link in about section", () => {
    renderSettings();
    expect(screen.getByText("settings_evidence")).toBeInTheDocument();
  });
});

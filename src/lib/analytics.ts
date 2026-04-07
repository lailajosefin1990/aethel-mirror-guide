import { track as posthogTrack } from "@/lib/posthog";

export const EVENTS = {
  // Reading flow
  READING_GENERATED: "reading_generated",
  READING_REGENERATED: "reading_regenerated",
  READING_SAVED: "reading_saved",
  READING_REACTION: "reading_reaction",
  READING_SHARED: "reading_shared",
  READING_CARD_DOWNLOADED: "reading_card_downloaded",
  READING_VOICE_PLAYED: "reading_voice_played",
  READING_WAIT_COMPLETED: "reading_wait_completed",
  READING_WAIT_CANCELLED: "reading_wait_cancelled",
  READING_GENERATING: "reading_generating",

  // Anonymous
  ANONYMOUS_READING_STARTED: "anonymous_reading_started",
  ANONYMOUS_READING_GENERATED: "anonymous_reading_generated",
  ANONYMOUS_SAVE_PROMPTED: "anonymous_save_prompted",

  // Birth & question
  BIRTH_DATA_SUBMITTED: "birth_data_submitted",
  BIRTH_DETAILS_UPDATED: "birth_details_updated_settings",
  QUESTION_SUBMITTED: "question_submitted",
  QUESTION_DOMAIN_SELECTED: "question_domain_selected",

  // Crisis
  CRISIS_SIGNAL_DETECTED: "crisis_signal_detected",
  CRISIS_RESOURCE_TAPPED: "crisis_resource_tapped",

  // Fallback
  FALLBACK_READING_SERVED: "fallback_reading_served",

  // Push
  PUSH_PERMISSION_GRANTED: "push_permission_granted",
  PUSH_PERMISSION_DISMISSED: "push_permission_dismissed",
  PUSH_ENABLED_SETTINGS: "push_enabled_settings",
  PUSH_DISABLED_SETTINGS: "push_disabled_settings",

  // Journal
  JOURNAL_VIEWED: "journal_viewed",
  JOURNAL_ENTRY_DELETED: "journal_entry_deleted",
  OUTCOME_SUBMITTED: "outcome_submitted",
  OUTCOME_LOG_OPENED: "outcome_log_opened",

  // Dashboard
  NUDGE_DISPLAYED: "nudge_displayed",
  NEW_READING_FROM_NUDGE: "new_reading_from_nudge",
  NEW_READING_FROM_TOP: "new_reading_from_top",
  WEEKLY_CHECKIN_COMPLETED: "weekly_checkin_completed",
  WEEKLY_CHECKIN_STORED: "weekly_checkin_stored",

  // Calendar
  CALENDAR_VIEWED: "calendar_viewed",
  CALENDAR_DAY_TAPPED: "calendar_day_tapped",
  CALENDAR_DECISION_LINK_TAPPED: "calendar_decision_link_tapped",

  // Paywall
  PAYWALL_SHOWN: "paywall_shown",
  PAYWALL_UPGRADE_CLICKED: "paywall_upgrade_clicked",
  PAYWALL_DISMISSED: "paywall_dismissed",
  PAYWALL_PRACTITIONER_CLICKED: "paywall_practitioner_clicked",
  RESTORE_PURCHASE_TAPPED: "restore_purchase_tapped",

  // Settings & account
  DATA_EXPORT_REQUESTED: "data_export_requested",
  ACCOUNT_DELETED: "account_deleted",
  REFERRAL_LINK_COPIED: "referral_link_copied",
  LANGUAGE_CHANGED: "language_changed",

  // Evidence & Hero
  EVIDENCE_PAGE_VIEWED: "evidence_page_viewed",
  EVIDENCE_LINK_HERO_CLICKED: "evidence_link_hero_clicked",
  EVIDENCE_LINK_CLICKED: "evidence_link_clicked",

  // Hero & landing
  LANDING_VIEWED: "landing_viewed",
  CTA_GET_THIRD_WAY_CLICKED: "cta_get_third_way_clicked",
  HOW_IT_WORKS_OPENED: "how_it_works_opened",

  // Reading output
  READING_LOADED: "reading_loaded",
  THIRD_WAY_READ: "third_way_read",
  SHARE_CARD_OPENED: "share_card_opened",
  SHARE_CARD_DOWNLOADED: "share_card_downloaded",

  // Settings
  BIRTH_DETAILS_UPDATED_SETTINGS: "birth_details_updated_settings",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export function trackEvent(
  event: EventName,
  properties?: Record<string, unknown>
) {
  posthogTrack(event, properties);
}

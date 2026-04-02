import type { QuestionData } from "@/components/QuestionInput";
import type { BirthData } from "@/components/BirthCoordinates";
import type { JournalEntry } from "@/components/DecisionJournal";
import type { ReadingData } from "@/lib/reading";

export type View = "home" | "question" | "auth" | "birth" | "loading" | "reading" | "dashboard";

export type ProfileBirthData = {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
};

export interface AppState {
  view: View;
  activeTab: string;
  questionData: QuestionData | null;
  birthData: BirthData | null;
  readingData: ReadingData | null;
  profileBirthData: ProfileBirthData | null;
  journalEntries: JournalEntry[];
  regenerationCount: number;
  regenerationFeedback: string | null;
  loadingError: string | null;
  profileLoaded: boolean;
  pendingSave: boolean;
  paywallOpen: boolean;
  pushSheetOpen: boolean;
  hasShownPushPrompt: boolean;
  showConsentGate: boolean;
  consentChecked: boolean;
  showCrisis: boolean;
}

export const initialState: AppState = {
  view: "home",
  activeTab: "mirror",
  questionData: null,
  birthData: null,
  readingData: null,
  profileBirthData: null,
  journalEntries: [],
  regenerationCount: 0,
  regenerationFeedback: null,
  loadingError: null,
  profileLoaded: false,
  pendingSave: false,
  paywallOpen: false,
  pushSheetOpen: false,
  hasShownPushPrompt: false,
  showConsentGate: false,
  consentChecked: false,
  showCrisis: false,
};

export type AppAction =
  | { type: "SET_VIEW"; view: View }
  | { type: "SET_TAB"; tab: string }
  | { type: "SET_QUESTION"; data: QuestionData }
  | { type: "SET_BIRTH_DATA"; data: BirthData }
  | { type: "SET_READING_DATA"; data: ReadingData }
  | { type: "SET_PROFILE_BIRTH"; data: ProfileBirthData }
  | { type: "SET_JOURNAL_ENTRIES"; entries: JournalEntry[] }
  | { type: "ADD_JOURNAL_ENTRY"; entry: JournalEntry }
  | { type: "UPDATE_JOURNAL_ENTRY"; id: string; outcome: JournalEntry["outcome"] }
  | { type: "DELETE_JOURNAL_ENTRY"; id: string }
  | { type: "REGENERATE"; feedback: string | null }
  | { type: "RESET_REGENERATION" }
  | { type: "SET_LOADING_ERROR"; error: string | null }
  | { type: "SET_PROFILE_LOADED"; loaded: boolean }
  | { type: "SET_PENDING_SAVE"; pending: boolean }
  | { type: "SET_PAYWALL"; open: boolean }
  | { type: "SET_PUSH_SHEET"; open: boolean }
  | { type: "PUSH_PROMPT_SHOWN" }
  | { type: "SET_CONSENT_GATE"; show: boolean }
  | { type: "CONSENT_ACCEPTED" }
  | { type: "SET_CRISIS"; show: boolean }
  | { type: "CRISIS_RETURN" }
  | { type: "START_ANONYMOUS_READING" }
  | { type: "SAVE_COMPLETE"; tab?: string }
  | { type: "AUTH_REDIRECT_FOR_SAVE" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_QUESTION":
      return { ...state, questionData: action.data };
    case "SET_BIRTH_DATA":
      return { ...state, birthData: action.data };
    case "SET_READING_DATA":
      return { ...state, readingData: action.data };
    case "SET_PROFILE_BIRTH":
      return { ...state, profileBirthData: action.data };
    case "SET_JOURNAL_ENTRIES":
      return { ...state, journalEntries: action.entries };
    case "ADD_JOURNAL_ENTRY":
      return { ...state, journalEntries: [action.entry, ...state.journalEntries] };
    case "UPDATE_JOURNAL_ENTRY":
      return {
        ...state,
        journalEntries: state.journalEntries.map((e) =>
          e.id === action.id ? { ...e, outcome: action.outcome } : e
        ),
      };
    case "DELETE_JOURNAL_ENTRY":
      return {
        ...state,
        journalEntries: state.journalEntries.filter((e) => e.id !== action.id),
      };
    case "REGENERATE":
      return {
        ...state,
        regenerationFeedback: action.feedback,
        regenerationCount: state.regenerationCount + 1,
        loadingError: null,
        view: "loading",
      };
    case "RESET_REGENERATION":
      return { ...state, regenerationCount: 0 };
    case "SET_LOADING_ERROR":
      return { ...state, loadingError: action.error };
    case "SET_PROFILE_LOADED":
      return { ...state, profileLoaded: action.loaded };
    case "SET_PENDING_SAVE":
      return { ...state, pendingSave: action.pending };
    case "SET_PAYWALL":
      return { ...state, paywallOpen: action.open };
    case "SET_PUSH_SHEET":
      return { ...state, pushSheetOpen: action.open };
    case "PUSH_PROMPT_SHOWN":
      return { ...state, hasShownPushPrompt: true };
    case "SET_CONSENT_GATE":
      return { ...state, showConsentGate: action.show };
    case "CONSENT_ACCEPTED":
      return { ...state, showConsentGate: false, consentChecked: true };
    case "SET_CRISIS":
      return { ...state, showCrisis: action.show };
    case "CRISIS_RETURN":
      return { ...state, showCrisis: false, questionData: null, view: "question" };
    case "START_ANONYMOUS_READING":
      return { ...state, loadingError: null, view: "loading" };
    case "SAVE_COMPLETE":
      return { ...state, activeTab: action.tab || "journey", view: "dashboard", pendingSave: false };
    case "AUTH_REDIRECT_FOR_SAVE":
      return { ...state, pendingSave: true, view: "auth" };
    default:
      return state;
  }
}

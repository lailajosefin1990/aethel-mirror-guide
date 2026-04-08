import { useCallback, useEffect, useRef, Dispatch } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { db } from "@/lib/db";
import type { User } from "@supabase/supabase-js";
import type { QuestionData } from "@/components/QuestionInput";
import type { BirthData } from "@/components/BirthCoordinates";
import type { AppState, AppAction, View } from "@/context/appReducer";
import type { SubscriptionTier } from "@/lib/stripe";

const FREE_READING_LIMIT = 3;

const VIEW_TO_PATH: Record<View, string> = {
  home: "/",
  question: "/ask",
  auth: "/auth",
  birth: "/birth",
  loading: "/reading",
  reading: "/reading",
  dashboard: "/mirror",
};

const PATH_TO_VIEW: Record<string, View> = {
  "/": "home",
  "/ask": "question",
  "/auth": "auth",
  "/birth": "birth",
  "/reading": "reading",
  "/mirror": "dashboard",
};

// ─── SessionStorage helpers for OAuth round-trip ───────────────────
const BIRTH_STORAGE_KEY = "aethel_pending_birth";

function persistBirth(data: BirthData) {
  sessionStorage.setItem(
    BIRTH_STORAGE_KEY,
    JSON.stringify({
      date: data.date instanceof Date ? data.date.toISOString() : data.date,
      time: data.time,
      unknownTime: data.unknownTime,
      birthPlace: data.birthPlace,
      birthLat: data.birthLat,
      birthLng: data.birthLng,
      birthTimezone: data.birthTimezone,
    })
  );
}

function restoreBirth(): BirthData | null {
  try {
    const raw = sessionStorage.getItem(BIRTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { ...parsed, date: new Date(parsed.date) };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────

export function useFlowNavigation(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  user: User | null,
  authLoading: boolean,
  subscriptionTier: SubscriptionTier,
  monthlyReadingCount: number,
  handleSave: () => Promise<void>
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { view, profileBirthData, profileLoaded, questionData, pendingSave, journalEntries } = state;

  // Guard against URL ↔ view sync infinite loop
  const isSyncing = useRef(false);

  // Helper to dispatch view + navigate — uses refs to avoid stale closures
  const setView = useCallback(
    (v: View) => {
      isSyncing.current = true;
      dispatch({ type: "SET_VIEW", view: v });
      const path = VIEW_TO_PATH[v];
      if (path) {
        navigate(path, { replace: true });
      }
      // Clear the sync guard after the current microtask
      Promise.resolve().then(() => { isSyncing.current = false; });
    },
    [dispatch, navigate]
  );

  // Sync URL → view on mount / popstate (browser back/forward)
  useEffect(() => {
    if (isSyncing.current) return;
    const pathname = location.pathname;
    // Handle /mirror/:tab
    if (pathname.startsWith("/mirror")) {
      const tab = pathname.split("/")[2];
      if (tab && tab !== state.activeTab) {
        dispatch({ type: "SET_TAB", tab });
      }
      if (view !== "dashboard") {
        isSyncing.current = true;
        dispatch({ type: "SET_VIEW", view: "dashboard" });
        Promise.resolve().then(() => { isSyncing.current = false; });
      }
      return;
    }
    const mapped = PATH_TO_VIEW[pathname];
    // Guard: if refreshing on /reading without question data, redirect to /birth (start of flow)
    if (mapped === "reading" && !questionData) {
      isSyncing.current = true;
      dispatch({ type: "SET_VIEW", view: "birth" });
      navigate("/birth", { replace: true });
      Promise.resolve().then(() => { isSyncing.current = false; });
      return;
    }
    if (mapped && mapped !== view) {
      isSyncing.current = true;
      dispatch({ type: "SET_VIEW", view: mapped });
      Promise.resolve().then(() => { isSyncing.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Sync view → URL when view changes from reducer (e.g. proceedAfterAuth)
  useEffect(() => {
    if (isSyncing.current) return;
    let targetPath = VIEW_TO_PATH[view];
    if (view === "dashboard") {
      const tab = state.activeTab;
      if (tab && tab !== "mirror") {
        targetPath = `/mirror/${tab}`;
      }
    }
    if (targetPath && location.pathname !== targetPath) {
      isSyncing.current = true;
      navigate(targetPath, { replace: true });
      Promise.resolve().then(() => { isSyncing.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, state.activeTab]);

  // ─── proceedAfterAuth ────────────────────────────────────────────
  // Called after auth succeeds. Birth data should already be in state
  // (collected at step 1), so we go straight to loading.
  const proceedAfterAuth = useCallback(() => {
    if (subscriptionTier === "free" && monthlyReadingCount >= FREE_READING_LIMIT) {
      dispatch({ type: "SET_PAYWALL", open: true });
      return;
    }

    // Restore birth data from sessionStorage if lost during OAuth redirect
    if (!state.birthData) {
      const restored = restoreBirth();
      if (restored) {
        dispatch({ type: "SET_BIRTH_DATA", data: restored });
      } else if (profileBirthData?.birth_date) {
        dispatch({
          type: "SET_BIRTH_DATA",
          data: {
            date: new Date(profileBirthData.birth_date),
            time: profileBirthData.birth_time,
            unknownTime: !profileBirthData.birth_time,
            birthPlace: profileBirthData.birth_place || "",
            birthLat: profileBirthData.birth_lat ?? undefined,
            birthLng: profileBirthData.birth_lng ?? undefined,
            birthTimezone: profileBirthData.birth_timezone ?? undefined,
          },
        });
      }
    }

    dispatch({ type: "SET_LOADING_ERROR", error: null });
    setView("loading");
  }, [subscriptionTier, monthlyReadingCount, profileBirthData, state.birthData, dispatch, setView]);

  // Auto-navigate to dashboard when user is loaded with readings (initial load only)
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!isInitialLoad.current) return;
    if (user && !authLoading && profileLoaded && view === "home" && journalEntries.length > 0) {
      isInitialLoad.current = false;
      setView("dashboard");
    }
    if (!authLoading) {
      isInitialLoad.current = false;
    }
  }, [user, authLoading, profileLoaded, journalEntries.length, view, setView]);

  // OAuth return flow — user lands back on home with question + birth in sessionStorage
  useEffect(() => {
    if (user && !authLoading && questionData && view === "home") {
      proceedAfterAuth();
    }
  }, [user, authLoading, questionData, view, proceedAfterAuth]);

  // Service worker push click handler
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_CLICK") {
        dispatch({ type: "SET_TAB", tab: "journey" });
        setView("dashboard");
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [dispatch, setView]);

  // ─── Step 1: Start → Birth (or skip to Question if birth data exists) ──
  const handleStartReading = useCallback(() => {
    if (profileBirthData?.birth_date) {
      // Returning user with saved birth data → hydrate state and skip to Ask
      dispatch({
        type: "SET_BIRTH_DATA",
        data: {
          date: new Date(profileBirthData.birth_date),
          time: profileBirthData.birth_time,
          unknownTime: !profileBirthData.birth_time,
          birthPlace: profileBirthData.birth_place || "",
          birthLat: profileBirthData.birth_lat ?? undefined,
          birthLng: profileBirthData.birth_lng ?? undefined,
          birthTimezone: profileBirthData.birth_timezone ?? undefined,
        },
      });
      setView("question");
    } else {
      setView("birth");
    }
  }, [profileBirthData, dispatch, setView]);

  // ─── Step 1→2: Birth submit → Question ──────────────────────────
  const handleBirthSubmit = useCallback(
    async (data: BirthData) => {
      dispatch({ type: "SET_BIRTH_DATA", data });
      // Persist to sessionStorage so it survives the OAuth redirect
      persistBirth(data);

      // If user is already logged in, save to DB immediately
      if (user) {
        await db.profiles.updateBirth(user.id, {
          birth_date: data.date.toISOString().split("T")[0],
          birth_time: data.unknownTime ? null : data.time,
          birth_place: data.birthPlace,
          birth_lat: data.birthLat ?? null,
          birth_lng: data.birthLng ?? null,
          birth_timezone: data.birthTimezone ?? null,
        });
        dispatch({
          type: "SET_PROFILE_BIRTH",
          data: {
            birth_date: data.date.toISOString().split("T")[0],
            birth_time: data.unknownTime ? null : data.time || null,
            birth_place: data.birthPlace,
            birth_lat: data.birthLat ?? null,
            birth_lng: data.birthLng ?? null,
            birth_timezone: data.birthTimezone ?? null,
          },
        });
      }

      // Handle save-pending flow (user came back to add birth data to save a reading)
      if (pendingSave && state.readingData) {
        dispatch({ type: "SET_PENDING_SAVE", pending: false });
        setTimeout(() => handleSave(), 0);
        return;
      }

      // Normal flow: proceed to question
      setView("question");
    },
    [user, pendingSave, state.readingData, handleSave, dispatch, setView]
  );

  // ─── Step 2→3: Question submit → Auth (or Loading if already signed in) ──
  const handleQuestionSubmit = useCallback(
    (data: QuestionData) => {
      dispatch({ type: "SET_QUESTION", data });
      sessionStorage.setItem("aethel_pending_question", JSON.stringify(data));

      if (!user) {
        trackEvent(EVENTS.ANONYMOUS_READING_STARTED);
        // Not signed in → go to auth (step 3)
        setView("auth");
        return;
      }

      // Already signed in → skip auth, go to loading
      proceedAfterAuth();
    },
    [user, dispatch, setView, proceedAfterAuth]
  );

  // ─── Step 3→4: Auth success → Loading ───────────────────────────
  const handleAuthSuccess = useCallback(async () => {
    // Handle save-pending flow
    if (pendingSave && profileLoaded && profileBirthData?.birth_date) {
      dispatch({ type: "SET_PENDING_SAVE", pending: false });
      handleSave();
      return;
    }
    if (pendingSave) {
      setView("birth");
      return;
    }

    // Restore birth data from sessionStorage (collected before OAuth redirect)
    const birthFromSession = restoreBirth();
    if (birthFromSession) {
      dispatch({ type: "SET_BIRTH_DATA", data: birthFromSession });

      // Persist to DB now that we have an authenticated user
      if (user) {
        const isoDate = birthFromSession.date instanceof Date
          ? birthFromSession.date.toISOString().split("T")[0]
          : new Date(birthFromSession.date).toISOString().split("T")[0];
        db.profiles.updateBirth(user.id, {
          birth_date: isoDate,
          birth_time: birthFromSession.unknownTime ? null : birthFromSession.time,
          birth_place: birthFromSession.birthPlace,
          birth_lat: birthFromSession.birthLat ?? null,
          birth_lng: birthFromSession.birthLng ?? null,
          birth_timezone: birthFromSession.birthTimezone ?? null,
        }).then(({ error: e }) => { if (e) console.warn("Failed to save birth data after auth:", e); });
        dispatch({
          type: "SET_PROFILE_BIRTH",
          data: {
            birth_date: isoDate,
            birth_time: birthFromSession.unknownTime ? null : birthFromSession.time || null,
            birth_place: birthFromSession.birthPlace,
            birth_lat: birthFromSession.birthLat ?? null,
            birth_lng: birthFromSession.birthLng ?? null,
            birth_timezone: birthFromSession.birthTimezone ?? null,
          },
        });
      }
    }

    // Birth data was collected in step 1 → go straight to loading
    proceedAfterAuth();
  }, [user, pendingSave, profileLoaded, profileBirthData, proceedAfterAuth, handleSave, dispatch, setView]);

  const handleLoadingComplete = useCallback(() => {
    setView("reading");
  }, [setView]);

  const handleLoadingError = useCallback(() => {
    dispatch({ type: "SET_LOADING_ERROR", error: "Something went wrong. Please try again." });
    setView("question");
  }, [dispatch, setView]);

  return {
    setView,
    handleQuestionSubmit,
    handleAuthSuccess,
    handleBirthSubmit,
    handleLoadingComplete,
    handleLoadingError,
    handleStartReading,
    proceedAfterAuth,
  };
}

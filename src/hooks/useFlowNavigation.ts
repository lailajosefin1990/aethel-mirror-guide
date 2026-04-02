import { useCallback, useEffect, Dispatch } from "react";
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

  // Helper to dispatch view + navigate
  const setView = useCallback(
    (v: View) => {
      dispatch({ type: "SET_VIEW", view: v });
      const path = VIEW_TO_PATH[v];
      if (path && location.pathname !== path) {
        navigate(path, { replace: true });
      }
    },
    [dispatch, navigate, location.pathname]
  );

  // Sync URL → view on mount / popstate
  useEffect(() => {
    const pathname = location.pathname;
    // Handle /mirror/:tab
    if (pathname.startsWith("/mirror")) {
      const tab = pathname.split("/")[2];
      if (tab) {
        dispatch({ type: "SET_TAB", tab });
      }
      if (view !== "dashboard") {
        dispatch({ type: "SET_VIEW", view: "dashboard" });
      }
      return;
    }
    const mapped = PATH_TO_VIEW[pathname];
    if (mapped && mapped !== view) {
      dispatch({ type: "SET_VIEW", view: mapped });
    }
  }, [location.pathname]);

  // Sync view → URL when view changes from reducer
  useEffect(() => {
    let targetPath = VIEW_TO_PATH[view];
    if (view === "dashboard") {
      const tab = state.activeTab;
      if (tab && tab !== "mirror") {
        targetPath = `/mirror/${tab}`;
      }
    }
    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [view, state.activeTab, navigate, location.pathname]);

  const proceedAfterAuth = useCallback(() => {
    if (subscriptionTier === "free" && monthlyReadingCount >= FREE_READING_LIMIT) {
      dispatch({ type: "SET_PAYWALL", open: true });
      return;
    }
    if (profileBirthData?.birth_date) {
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
      dispatch({ type: "SET_LOADING_ERROR", error: null });
      setView("loading");
    } else {
      setView("birth");
    }
  }, [subscriptionTier, monthlyReadingCount, profileBirthData, dispatch, setView]);

  // Auto-navigate to dashboard when user is loaded with readings
  useEffect(() => {
    if (user && !authLoading && profileLoaded && view === "home" && journalEntries.length > 0) {
      setView("dashboard");
    }
  }, [user, authLoading, profileLoaded, journalEntries.length, view, setView]);

  // OAuth return flow
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

  const handleQuestionSubmit = useCallback(
    (data: QuestionData) => {
      dispatch({ type: "SET_QUESTION", data });
      sessionStorage.setItem("aethel_pending_question", JSON.stringify(data));
      if (!user) {
        trackEvent(EVENTS.ANONYMOUS_READING_STARTED);
        dispatch({ type: "SET_LOADING_ERROR", error: null });
        setView("loading");
        return;
      }
      proceedAfterAuth();
    },
    [user, dispatch, setView, proceedAfterAuth]
  );

  const handleAuthSuccess = useCallback(() => {
    if (pendingSave && profileLoaded && profileBirthData?.birth_date) {
      dispatch({ type: "SET_PENDING_SAVE", pending: false });
      handleSave();
      return;
    }
    if (pendingSave) {
      setView("birth");
      return;
    }
    if (profileLoaded && profileBirthData?.birth_date) {
      proceedAfterAuth();
    } else {
      setView("birth");
    }
  }, [pendingSave, profileLoaded, profileBirthData, proceedAfterAuth, handleSave, dispatch, setView]);

  const handleBirthSubmit = useCallback(
    async (data: BirthData) => {
      dispatch({ type: "SET_BIRTH_DATA", data });
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

      if (pendingSave && state.readingData) {
        dispatch({ type: "SET_PENDING_SAVE", pending: false });
        setTimeout(() => handleSave(), 0);
        return;
      }

      dispatch({ type: "SET_LOADING_ERROR", error: null });
      setView("loading");
    },
    [user, pendingSave, state.readingData, handleSave, dispatch, setView]
  );

  const handleLoadingComplete = useCallback(() => {
    setView("reading");
  }, [setView]);

  const handleLoadingError = useCallback(() => {
    dispatch({ type: "SET_LOADING_ERROR", error: "Something went wrong. Please try again." });
    setView("question");
  }, [dispatch, setView]);

  const handleStartReading = useCallback(() => {
    setView("question");
  }, [setView]);

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

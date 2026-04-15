import React, { Suspense, useReducer, useMemo, useCallback, useEffect, useRef } from "react";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { db } from "@/lib/db";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QuestionInput from "@/components/QuestionInput";
import BirthCoordinates from "@/components/BirthCoordinates";
import ReadingLoader from "@/components/ReadingLoader";
import ReadingOutput from "@/components/ReadingOutput";
import AppLayout from "@/components/AppLayout";
import DecisionJournal from "@/components/DecisionJournal";
import DailyNudge from "@/components/DailyNudge";
import AuthScreen from "@/components/AuthScreen";
import PaywallModal from "@/components/PaywallModal";
import ProgressStepper from "@/components/ProgressStepper";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import PushPermissionSheet from "@/components/PushPermissionSheet";
import ConsentGate from "@/components/ConsentGate";
import CrisisInterstitial from "@/components/CrisisInterstitial";
import ViewErrorBoundary from "@/components/ViewErrorBoundary";
import TransitPreview from "@/components/TransitPreview";
import { subscribeToPush, dismissPushPrompt } from "@/lib/push";
import { useAuth } from "@/hooks/useAuth";
import { appReducer, initialState } from "@/context/appReducer";
import { useProfileData } from "@/hooks/useProfileData";
import { useReadingFlow } from "@/hooks/useReadingFlow";
import { useFlowNavigation } from "@/hooks/useFlowNavigation";
import type { View } from "@/context/appReducer";

const TransitCalendar = React.lazy(() => import("@/components/TransitCalendar"));
const SettingsScreen = React.lazy(() => import("@/components/SettingsScreen"));

const FREE_READING_LIMIT = 3;
const MAX_REGENERATIONS = 3;

const slideTransition = { duration: 0.35, ease: "easeOut" as const };

const Index = () => {
  const { i18n } = useTranslation();
  const { user, loading: authLoading, subscriptionTier, isTrialing, trialDaysLeft, monthlyReadingCount, refreshReadingCount } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  useProfileData(user, i18n, dispatch);

  const { generateReading, handleSave, handleUpdateEntry } = useReadingFlow(
    state, dispatch, user, i18n.language, refreshReadingCount
  );

  const {
    setView,
    handleQuestionSubmit,
    handleAuthSuccess,
    handleBirthSubmit,
    handleLoadingComplete,
    handleLoadingError,
    handleStartReading,
  } = useFlowNavigation(state, dispatch, user, authLoading, subscriptionTier, monthlyReadingCount, handleSave);

  const { view, activeTab, questionData, readingData, profileBirthData, journalEntries,
    regenerationCount, paywallOpen, pushSheetOpen, showConsentGate, showCrisis } = state;

  useEffect(() => {
    const titles: Record<string, string> = {
      home: "Guidance Journal — Decision Clarity Through Six Ancient Systems",
      question: "Ask Your Question | Guidance Journal",
      auth: "Sign In | Guidance Journal",
      birth: "Your Coordinates | Guidance Journal",
      loading: "Generating Your Reading | Guidance Journal",
      reading: "Your Third Way | Guidance Journal",
      dashboard: "Your Mirror | Guidance Journal",
    };
    document.title = titles[view] || "Guidance Journal";
  }, [view]);

  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [view]);

  
  const remainingReadings = Math.max(0, FREE_READING_LIMIT - monthlyReadingCount);

  const readingBackTarget = useMemo(() => {
    return profileBirthData?.birth_date ? "question" : "birth";
  }, [profileBirthData]);

  const birthTimeUnknown = useMemo(() => {
    if (state.birthData) return !!state.birthData.unknownTime;
    if (profileBirthData) return !profileBirthData.birth_time;
    return true;
  }, [state.birthData, profileBirthData]);

  // ─── Memoized handlers ────────────────────────────────────────────
  const handleBack = useCallback(() => setView("home"), [setView]);
  const handleBackToQuestion = useCallback(() => setView("question"), [setView]);
  const handleReadingBack = useCallback(() => setView(readingBackTarget as View), [setView, readingBackTarget]);
  const handleDeleteEntry = useCallback((id: string) => dispatch({ type: "DELETE_JOURNAL_ENTRY", id }), [dispatch]);
  const handleClosePaywall = useCallback(() => dispatch({ type: "SET_PAYWALL", open: false }), [dispatch]);
  const handleRestorePurchase = useCallback(() => dispatch({ type: "SET_TAB", tab: "settings" }), [dispatch]);
  const handleTabChange = useCallback((tab: string) => dispatch({ type: "SET_TAB", tab }), [dispatch]);
  const handleRevisitDecision = useCallback(() => dispatch({ type: "SET_TAB", tab: "journey" }), [dispatch]);
  const handleUpgrade = useCallback(() => dispatch({ type: "SET_PAYWALL", open: true }), [dispatch]);
  const handleCrisisReturn = useCallback(() => dispatch({ type: "CRISIS_RETURN" }), [dispatch]);

  const handleSaveReading = useCallback(() => {
    dispatch({ type: "RESET_REGENERATION" });
    handleSave();
  }, [dispatch, handleSave]);

  const handleRegenerate = useMemo(() => {
    if (regenerationCount >= MAX_REGENERATIONS) return undefined;
    return (feedback?: string) => {
      dispatch({ type: "REGENERATE", feedback: feedback || null });
    };
  }, [regenerationCount, dispatch]);

  const handleConsentAccept = useCallback(async () => {
    if (user) {
      await db.profiles.updateConsent(user.id);
    }
    dispatch({ type: "CONSENT_ACCEPTED" });
  }, [user, dispatch]);

  const handlePushAccept = useCallback(async () => {
    dispatch({ type: "SET_PUSH_SHEET", open: false });
    if (user) {
      const ok = await subscribeToPush(user.id);
      if (ok) trackEvent(EVENTS.PUSH_PERMISSION_GRANTED);
    }
  }, [dispatch, user]);

  const handlePushDismiss = useCallback(() => {
    dispatch({ type: "SET_PUSH_SHEET", open: false });
    dismissPushPrompt();
    trackEvent(EVENTS.PUSH_PERMISSION_DISMISSED);
  }, [dispatch]);

  // ─── Error boundary resets ────────────────────────────────────────
  const resetToQuestion = useCallback(() => dispatch({ type: "SET_VIEW", view: "question" }), [dispatch]);
  const resetToDashboard = useCallback(() => dispatch({ type: "SET_VIEW", view: "dashboard" }), [dispatch]);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-sm">
        Skip to content
      </a>
      {showConsentGate && <ConsentGate onAccept={handleConsentAccept} />}
      {showCrisis && <CrisisInterstitial onReturn={handleCrisisReturn} />}
      {["question", "auth", "birth", "loading", "reading"].includes(view) && (
        profileBirthData?.birth_date && view !== "birth" ? (
          // Returning user: birth already saved — show 3-step stepper
          <ProgressStepper
            labels={["Ask", "Generate", "Third Way"]}
            currentStep={
              view === "question" ? 1 :
              view === "auth" || view === "loading" ? 2 : 3
            }
          />
        ) : (
          // New user: full 4-step stepper
          <ProgressStepper
            labels={["Anchor", "Ask", "Sign in", "Third Way"]}
            currentStep={
              view === "birth" ? 1 :
              view === "question" ? 2 :
              view === "auth" ? 3 :
              view === "loading" ? 3 : 4
            }
          />
        )
      )}
      <div ref={mainRef} id="main-content" tabIndex={-1} className="outline-none">
      <AnimatePresence mode="wait">
        {view === "home" && !user && !authLoading && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <HeroSection onStart={handleStartReading} />
          </motion.div>
        )}
        {view === "home" && (authLoading || user) && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <DashboardSkeleton />
          </motion.div>
        )}
        {view === "question" && (
          <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            {state.profileBirthData?.birth_date && (
              <TransitPreview birthDate={new Date(state.profileBirthData.birth_date)} />
            )}
            <QuestionInput onSubmit={handleQuestionSubmit} onBack={handleBack} />
          </motion.div>
        )}
        {view === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ViewErrorBoundary fallbackView="auth" onReset={resetToQuestion}>
              <AuthScreen onSuccess={handleAuthSuccess} onBack={handleBackToQuestion} />
            </ViewErrorBoundary>
          </motion.div>
        )}
        {view === "birth" && (
          <motion.div key="birth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ViewErrorBoundary fallbackView="birth" onReset={resetToQuestion}>
              <BirthCoordinates onSubmit={handleBirthSubmit} onBack={handleBackToQuestion} />
            </ViewErrorBoundary>
          </motion.div>
        )}
        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ViewErrorBoundary fallbackView="loading" onReset={resetToQuestion}>
              <ReadingLoader
                onComplete={handleLoadingComplete}
                onError={handleLoadingError}
                generateReading={generateReading}
              />
            </ViewErrorBoundary>
          </motion.div>
        )}
        {view === "reading" && (
          <motion.div key="reading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ViewErrorBoundary fallbackView="reading" onReset={resetToQuestion}>
              <ReadingOutput
                domain={questionData?.domain ?? "General"}
                question={questionData?.question ?? ""}
                reading={readingData}
                onSave={handleSaveReading}
                onBack={handleReadingBack}
                regenerationCount={regenerationCount}
                birthTimeUnknown={birthTimeUnknown}
                onRegenerate={handleRegenerate}
                birthDate={state.birthData?.date || (state.profileBirthData?.birth_date ? new Date(state.profileBirthData.birth_date) : null)}
              />
            </ViewErrorBoundary>
          </motion.div>
        )}
        {view === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <AppLayout showNav activeTab={activeTab} onTabChange={handleTabChange} subscriptionTier={subscriptionTier}>
              {activeTab === "mirror" && (
                <ViewErrorBoundary fallbackView="mirror" onReset={resetToDashboard}>
                  <DailyNudge
                    journalEntries={journalEntries}
                    onNewReading={handleStartReading}
                    onRevisitDecision={handleRevisitDecision}
                    subscriptionTier={subscriptionTier}
                    remainingReadings={remainingReadings}
                    onUpgrade={handleUpgrade}
                    hasBirthTime={!!profileBirthData?.birth_time}
                    loading={!state.profileLoaded}
                    isTrialing={isTrialing}
                    trialDaysLeft={trialDaysLeft}
                  />
                </ViewErrorBoundary>
              )}
              {activeTab === "journey" && (
                <ViewErrorBoundary fallbackView="journey" onReset={resetToDashboard}>
                  <DecisionJournal
                    entries={journalEntries}
                    onUpdateEntry={handleUpdateEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onStartReading={handleStartReading}
                    loading={!state.profileLoaded}
                  />
                </ViewErrorBoundary>
              )}
              {activeTab === "calendar" && (
                <ViewErrorBoundary fallbackView="calendar" onReset={resetToDashboard}>
                  <Suspense fallback={<div className="min-h-[60vh]" />}>
                    <TransitCalendar onRevisitDecision={handleRevisitDecision} />
                  </Suspense>
                </ViewErrorBoundary>
              )}
              {activeTab === "settings" && (
                <ViewErrorBoundary fallbackView="settings" onReset={resetToDashboard}>
                  <Suspense fallback={<div className="min-h-[60vh]" />}>
                    <SettingsScreen />
                  </Suspense>
                </ViewErrorBoundary>
              )}
            </AppLayout>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <PaywallModal open={paywallOpen} onClose={handleClosePaywall} onRestorePurchase={handleRestorePurchase} />

      <PushPermissionSheet
        open={pushSheetOpen}
        onAccept={handlePushAccept}
        onDismiss={handlePushDismiss}
      />
    </>
  );
};

export default Index;

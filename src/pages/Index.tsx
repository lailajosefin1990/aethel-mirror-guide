import { useReducer, useMemo, useCallback } from "react";
import { track } from "@/lib/posthog";
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
import TransitCalendar from "@/components/TransitCalendar";
import AuthScreen from "@/components/AuthScreen";
import PaywallModal from "@/components/PaywallModal";
import ProgressStepper from "@/components/ProgressStepper";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import SettingsScreen from "@/components/SettingsScreen";
import PushPermissionSheet from "@/components/PushPermissionSheet";
import ConsentGate from "@/components/ConsentGate";
import CrisisInterstitial from "@/components/CrisisInterstitial";
import { subscribeToPush, dismissPushPrompt } from "@/lib/push";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { appReducer, initialState } from "@/context/appReducer";
import { useProfileData } from "@/hooks/useProfileData";
import { useReadingFlow } from "@/hooks/useReadingFlow";
import { useFlowNavigation } from "@/hooks/useFlowNavigation";
import type { View } from "@/context/appReducer";

const FREE_READING_LIMIT = 3;
const MAX_REGENERATIONS = 3;

const slideTransition = { duration: 0.35, ease: "easeOut" as const };

const Index = () => {
  const { i18n } = useTranslation();
  const { user, loading: authLoading, subscriptionTier, monthlyReadingCount, refreshReadingCount } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load profile, readings, referral data
  useProfileData(user, i18n, dispatch);

  // Reading generation, saving, outcome updates
  const { generateReading, handleSave, handleUpdateEntry } = useReadingFlow(
    state, dispatch, user, i18n.language, refreshReadingCount
  );

  // View navigation, route sync, auth flow
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
    regenerationCount, paywallOpen, pushSheetOpen, showConsentGate, showCrisis, pendingSave } = state;

  const dashboardLoading = user && !authLoading && (!state.profileLoaded || (state.profileLoaded && view === "home" && journalEntries.length === 0 && !profileBirthData));
  const remainingReadings = Math.max(0, FREE_READING_LIMIT - monthlyReadingCount);

  const readingBackTarget = useMemo(() => {
    return profileBirthData?.birth_date ? "question" : "birth";
  }, [profileBirthData]);

  const birthTimeUnknown = useMemo(() => {
    if (state.birthData) return !!state.birthData.unknownTime;
    if (profileBirthData) return !profileBirthData.birth_time;
    return true;
  }, [state.birthData, profileBirthData]);

  const handleConsentAccept = useCallback(async () => {
    if (user) {
      await supabase.from("profiles").update({
        consent_accepted: true,
        consent_date: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
    dispatch({ type: "CONSENT_ACCEPTED" });
  }, [user, dispatch]);

  return (
    <>
      {showConsentGate && <ConsentGate onAccept={handleConsentAccept} />}
      {showCrisis && <CrisisInterstitial onReturn={() => dispatch({ type: "CRISIS_RETURN" })} />}
      {["question", "auth", "birth", "loading", "reading"].includes(view) && (
        <ProgressStepper currentStep={
          view === "question" ? 1 :
          view === "auth" || view === "birth" ? 2 :
          view === "loading" ? 3 : 4
        } />
      )}
      <AnimatePresence mode="wait">
        {view === "home" && !dashboardLoading && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <HeroSection onStart={() => setView("question")} />
          </motion.div>
        )}
        {view === "home" && dashboardLoading && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <DashboardSkeleton />
          </motion.div>
        )}
        {view === "question" && (
          <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <QuestionInput onSubmit={handleQuestionSubmit} onBack={() => setView("home")} />
          </motion.div>
        )}
        {view === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <AuthScreen onSuccess={handleAuthSuccess} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "birth" && (
          <motion.div key="birth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <BirthCoordinates onSubmit={handleBirthSubmit} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ReadingLoader
              onComplete={handleLoadingComplete}
              onError={handleLoadingError}
              generateReading={generateReading}
            />
          </motion.div>
        )}
        {view === "reading" && (
          <motion.div key="reading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={slideTransition}>
            <ReadingOutput
              domain={questionData?.domain ?? "General"}
              question={questionData?.question ?? ""}
              reading={readingData}
              onSave={() => { dispatch({ type: "RESET_REGENERATION" }); handleSave(); }}
              onBack={() => setView(readingBackTarget as View)}
              regenerationCount={regenerationCount}
              birthTimeUnknown={birthTimeUnknown}
              onRegenerate={regenerationCount < MAX_REGENERATIONS ? (feedback?: string) => {
                dispatch({ type: "REGENERATE", feedback: feedback || null });
              } : undefined}
            />
          </motion.div>
        )}
        {view === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={slideTransition}>
            <AppLayout showNav activeTab={activeTab} onTabChange={(tab) => dispatch({ type: "SET_TAB", tab })} subscriptionTier={subscriptionTier}>
              {activeTab === "mirror" && (
                <DailyNudge
                  journalEntries={journalEntries}
                  onNewReading={handleStartReading}
                  onRevisitDecision={() => dispatch({ type: "SET_TAB", tab: "journey" })}
                  subscriptionTier={subscriptionTier}
                  remainingReadings={remainingReadings}
                  onUpgrade={() => dispatch({ type: "SET_PAYWALL", open: true })}
                  hasBirthTime={!!profileBirthData?.birth_time}
                />
              )}
              {activeTab === "journey" && (
                <DecisionJournal
                  entries={journalEntries}
                  onUpdateEntry={handleUpdateEntry}
                  onDeleteEntry={(id) => dispatch({ type: "DELETE_JOURNAL_ENTRY", id })}
                  onStartReading={handleStartReading}
                />
              )}
              {activeTab === "calendar" && (
                <TransitCalendar onRevisitDecision={() => dispatch({ type: "SET_TAB", tab: "journey" })} />
              )}
              {activeTab === "settings" && <SettingsScreen />}
            </AppLayout>
          </motion.div>
        )}
      </AnimatePresence>

      <PaywallModal open={paywallOpen} onClose={() => dispatch({ type: "SET_PAYWALL", open: false })} onRestorePurchase={() => dispatch({ type: "SET_TAB", tab: "settings" })} />

      <PushPermissionSheet
        open={pushSheetOpen}
        onAccept={async () => {
          dispatch({ type: "SET_PUSH_SHEET", open: false });
          if (user) {
            const ok = await subscribeToPush(user.id);
            if (ok) track("push_permission_granted");
          }
        }}
        onDismiss={() => {
          dispatch({ type: "SET_PUSH_SHEET", open: false });
          dismissPushPrompt();
          track("push_permission_dismissed");
        }}
      />
    </>
  );
};

export default Index;

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QuestionInput, { type QuestionData } from "@/components/QuestionInput";
import BirthCoordinates, { type BirthData } from "@/components/BirthCoordinates";
import ReadingLoader from "@/components/ReadingLoader";
import ReadingOutput from "@/components/ReadingOutput";
import AppLayout from "@/components/AppLayout";
import DecisionJournal, { type JournalEntry } from "@/components/DecisionJournal";
import DailyNudge from "@/components/DailyNudge";
import AuthScreen from "@/components/AuthScreen";
import PaywallModal from "@/components/PaywallModal";
import SettingsScreen from "@/components/SettingsScreen";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type View = "home" | "question" | "auth" | "birth" | "loading" | "reading" | "dashboard";

const FREE_READING_LIMIT = 1;

const Index = () => {
  const { user, loading: authLoading, subscriptionTier, monthlyReadingCount, refreshReadingCount } = useAuth();
  const [view, setView] = useState<View>("home");
  const [activeTab, setActiveTab] = useState("mirror");
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const transition = { duration: 0.3, ease: "easeInOut" as const };

  // Load journal entries from Supabase
  useEffect(() => {
    if (!user) return;
    const loadEntries = async () => {
      const { data: readings } = await supabase
        .from("readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!readings) return;

      const { data: outcomes } = await supabase
        .from("outcomes")
        .select("*")
        .eq("user_id", user.id);

      const outcomeMap = new Map(
        (outcomes ?? []).map((o: any) => [o.reading_id, { followed: o.followed, note: o.outcome_text }])
      );

      const entries: JournalEntry[] = readings.map((r: any) => ({
        id: r.id,
        domain: r.domain,
        date: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        thirdWay: r.third_way_text || "",
        question: r.question,
        outcome: outcomeMap.get(r.id) as JournalEntry["outcome"] | undefined,
      }));

      setJournalEntries(entries);
    };
    loadEntries();
  }, [user]);

  // Auto-redirect to dashboard if user is logged in and has readings
  useEffect(() => {
    if (user && !authLoading && view === "home" && journalEntries.length > 0) {
      setView("dashboard");
    }
  }, [user, authLoading, journalEntries.length]);

  const handleQuestionSubmit = (data: QuestionData) => {
    setQuestionData(data);
    // If not logged in, go to auth screen
    if (!user) {
      setView("auth");
      return;
    }
    proceedAfterAuth();
  };

  const proceedAfterAuth = () => {
    // Check paywall: free users on 2nd+ reading attempt
    if (subscriptionTier === "free" && monthlyReadingCount >= FREE_READING_LIMIT) {
      setPaywallOpen(true);
      return;
    }
    setView("birth");
  };

  const handleAuthSuccess = () => {
    // After auth, check if we need birth coords or paywall
    proceedAfterAuth();
  };

  const handleBirthSubmit = async (data: BirthData) => {
    setBirthData(data);
    // Save birth data to profile
    if (user) {
      await supabase.from("profiles").update({
        birth_date: data.date.toISOString().split("T")[0],
        birth_time: data.unknownTime ? null : data.time,
        birth_place: data.birthPlace,
      }).eq("user_id", user.id);
    }
    setView("loading");
  };

  const handleLoadingComplete = useCallback(() => {
    setView("reading");
  }, []);

  const handleSave = async () => {
    if (!user || !questionData) return;

    // Save reading to Supabase
    const { data: reading, error } = await supabase.from("readings").insert({
      user_id: user.id,
      domain: questionData.domain,
      question: questionData.question,
      mode: questionData.mode,
      third_way_text: "Send the counter-offer by Friday. Name your non-negotiable and one thing you'll let go of. That's the move.",
      journal_prompt: "What would you do if you knew the other person was already leaning toward yes?",
      confidence_level: "strong",
    }).select().single();

    if (!error && reading) {
      const newEntry: JournalEntry = {
        id: reading.id,
        domain: questionData.domain,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        thirdWay: reading.third_way_text || "",
        question: questionData.question,
      };
      setJournalEntries((prev) => [newEntry, ...prev]);
      await refreshReadingCount();
    }

    setActiveTab("journey");
    setView("dashboard");
  };

  const handleUpdateEntry = async (id: string, outcome: JournalEntry["outcome"]) => {
    if (!user || !outcome) return;

    await supabase.from("outcomes").insert({
      reading_id: id,
      user_id: user.id,
      followed: outcome.followed,
      outcome_text: outcome.note,
    });

    setJournalEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, outcome } : e))
    );
  };

  const handleStartReading = () => {
    setView("question");
  };

  const remainingReadings = Math.max(0, FREE_READING_LIMIT - monthlyReadingCount);

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <HeroSection onStart={() => setView("question")} />
          </motion.div>
        )}
        {view === "question" && (
          <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <QuestionInput onSubmit={handleQuestionSubmit} onBack={() => setView("home")} />
          </motion.div>
        )}
        {view === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <AuthScreen onSuccess={handleAuthSuccess} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "birth" && (
          <motion.div key="birth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <BirthCoordinates onSubmit={handleBirthSubmit} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <ReadingLoader onComplete={handleLoadingComplete} />
          </motion.div>
        )}
        {view === "reading" && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <ReadingOutput
              domain={questionData?.domain ?? "General"}
              question={questionData?.question ?? ""}
              onSave={handleSave}
              onBack={() => setView("birth")}
            />
          </motion.div>
        )}
        {view === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <AppLayout showNav activeTab={activeTab} onTabChange={setActiveTab}>
              {activeTab === "mirror" && (
                <DailyNudge
                  journalEntries={journalEntries}
                  onNewReading={handleStartReading}
                  onRevisitDecision={() => setActiveTab("journey")}
                  subscriptionTier={subscriptionTier}
                  remainingReadings={remainingReadings}
                  onUpgrade={() => setPaywallOpen(true)}
                />
              )}
              {activeTab === "journey" && (
                <DecisionJournal
                  entries={journalEntries}
                  onUpdateEntry={handleUpdateEntry}
                  onStartReading={handleStartReading}
                />
              )}
              {activeTab === "settings" && <SettingsScreen />}
            </AppLayout>
          </motion.div>
        )}
      </AnimatePresence>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
};

export default Index;

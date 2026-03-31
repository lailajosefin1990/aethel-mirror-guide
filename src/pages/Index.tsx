import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QuestionInput, { type QuestionData } from "@/components/QuestionInput";
import BirthCoordinates, { type BirthData } from "@/components/BirthCoordinates";
import ReadingLoader from "@/components/ReadingLoader";
import ReadingOutput from "@/components/ReadingOutput";
import AppLayout from "@/components/AppLayout";
import DecisionJournal, { type JournalEntry } from "@/components/DecisionJournal";

type View = "home" | "question" | "birth" | "loading" | "reading" | "dashboard";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [activeTab, setActiveTab] = useState("mirror");
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const transition = { duration: 0.3, ease: "easeInOut" as const };

  const handleQuestionSubmit = (data: QuestionData) => {
    setQuestionData(data);
    setView("birth");
  };

  const handleBirthSubmit = (data: BirthData) => {
    setBirthData(data);
    setView("loading");
  };

  const handleLoadingComplete = useCallback(() => {
    setView("reading");
  }, []);

  const handleSave = () => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      domain: questionData?.domain ?? "General",
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      thirdWay: "Send the counter-offer by Friday. Name your non-negotiable and one thing you'll let go of. That's the move.",
      question: questionData?.question ?? "",
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
    setActiveTab("journey");
    setView("dashboard");
  };

  const handleUpdateEntry = (id: string, outcome: JournalEntry["outcome"]) => {
    setJournalEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, outcome } : e))
    );
  };

  const handleStartReading = () => {
    setView("question");
  };

  return (
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
              <div className="py-16 text-center">
                <p className="font-display text-[14px] tracking-[0.45em] text-primary mb-6">
                  A E T H E L &nbsp; M I R R O R
                </p>
                <p className="font-body text-[14px] text-muted-foreground mb-8">
                  Your mirror is ready.
                </p>
                <button
                  onClick={handleStartReading}
                  className="h-[48px] px-8 rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300"
                >
                  New reading →
                </button>
              </div>
            )}
            {activeTab === "journey" && (
              <DecisionJournal
                entries={journalEntries}
                onUpdateEntry={handleUpdateEntry}
                onStartReading={handleStartReading}
              />
            )}
            {activeTab === "settings" && (
              <div className="py-16 text-center">
                <p className="font-body text-[14px] text-muted-foreground">
                  Settings — coming soon
                </p>
              </div>
            )}
          </AppLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;

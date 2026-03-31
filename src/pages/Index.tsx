import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QuestionInput, { type QuestionData } from "@/components/QuestionInput";
import BirthCoordinates, { type BirthData } from "@/components/BirthCoordinates";
import ReadingLoader from "@/components/ReadingLoader";
import ReadingOutput from "@/components/ReadingOutput";

type View = "home" | "question" | "birth" | "loading" | "reading";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [birthData, setBirthData] = useState<BirthData | null>(null);

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
    console.log("Saved reading", { questionData, birthData });
    // TODO: navigate to dashboard / journal
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
    </AnimatePresence>
  );
};

export default Index;

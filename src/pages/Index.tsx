import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import HeroSection from "@/components/HeroSection";
import QuestionInput, { type QuestionData } from "@/components/QuestionInput";

type View = "home" | "question" | "birth";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);

  const transition = { duration: 0.3, ease: "easeInOut" as const };

  const handleQuestionSubmit = (data: QuestionData) => {
    setQuestionData(data);
    setView("birth");
  };

  return (
    <AnimatePresence mode="wait">
      {view === "home" && (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <HeroSection onStart={() => setView("question")} />
        </motion.div>
      )}
      {view === "question" && (
        <motion.div
          key="question"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <QuestionInput
            onSubmit={handleQuestionSubmit}
            onBack={() => setView("home")}
          />
        </motion.div>
      )}
      {view === "birth" && (
        <motion.div
          key="birth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
              <p className="font-body text-sm text-muted-foreground">
                Birth coordinates screen — coming soon
              </p>
            </div>
          </AppLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;

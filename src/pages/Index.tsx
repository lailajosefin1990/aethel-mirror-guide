import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import GenesisIntake from "@/components/GenesisIntake";

const Index = () => {
  const [view, setView] = useState<"home" | "intake">("home");

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === "home" ? (
          <motion.div
            key="home"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <HeroSection onStart={() => setView("intake")} />
          </motion.div>
        ) : (
          <motion.div
            key="intake"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <GenesisIntake onBack={() => setView("home")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;

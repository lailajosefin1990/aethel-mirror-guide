import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import GenesisIntake from "@/components/GenesisIntake";
import BlueprintPreview from "@/components/BlueprintPreview";
import ThirdWayInput from "@/components/ThirdWayInput";
import ThirdWayResult from "@/components/ThirdWayResult";

const Index = () => {
  const [view, setView] = useState<"home" | "intake" | "blueprint" | "thirdway" | "result">("home");

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div key="home" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <HeroSection onStart={() => setView("intake")} />
          </motion.div>
        )}
        {view === "intake" && (
          <motion.div key="intake" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <GenesisIntake onBack={() => setView("home")} onSubmit={() => setView("blueprint")} />
          </motion.div>
        )}
        {view === "blueprint" && (
          <motion.div key="blueprint" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <BlueprintPreview onGetThirdWay={() => setView("thirdway")} onBack={() => setView("intake")} />
          </motion.div>
        )}
        {view === "thirdway" && (
          <motion.div key="thirdway" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <ThirdWayInput onSubmit={() => setView("result")} onBack={() => setView("blueprint")} />
          </motion.div>
        )}
        {view === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
            <ThirdWayResult
              onSave={() => console.log("Saved")}
              onReject={() => setView("thirdway")}
              onBack={() => setView("thirdway")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;

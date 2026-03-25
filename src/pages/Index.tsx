import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import GenesisIntake from "@/components/GenesisIntake";
import BlueprintPreview from "@/components/BlueprintPreview";
import ThirdWayInput from "@/components/ThirdWayInput";
import ThirdWayResult from "@/components/ThirdWayResult";
import MirrorToday from "@/components/MirrorToday";

type View = "home" | "intake" | "blueprint" | "thirdway" | "result" | "dashboard";

const Index = () => {
  const [view, setView] = useState<View>("home");
  const [activeTab, setActiveTab] = useState("mirror");

  const transition = { duration: 0.5 };
  const enter = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div key="home" exit={{ opacity: 0, y: -20 }} transition={transition}>
            <HeroSection onStart={() => setView("intake")} />
          </motion.div>
        )}
        {view === "intake" && (
          <motion.div key="intake" {...enter}>
            <GenesisIntake onBack={() => setView("home")} onSubmit={() => setView("blueprint")} />
          </motion.div>
        )}
        {view === "blueprint" && (
          <motion.div key="blueprint" {...enter}>
            <BlueprintPreview onGetThirdWay={() => setView("thirdway")} onBack={() => setView("intake")} />
          </motion.div>
        )}
        {view === "thirdway" && (
          <motion.div key="thirdway" {...enter}>
            <ThirdWayInput onSubmit={() => setView("result")} onBack={() => setView("blueprint")} />
          </motion.div>
        )}
        {view === "result" && (
          <motion.div key="result" {...enter}>
            <ThirdWayResult
              onSave={() => setView("dashboard")}
              onReject={() => setView("thirdway")}
              onBack={() => setView("thirdway")}
            />
          </motion.div>
        )}
        {view === "dashboard" && (
          <motion.div key="dashboard" {...enter}>
            <MirrorToday activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;

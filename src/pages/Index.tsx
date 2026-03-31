import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import HeroSection from "@/components/HeroSection";

type View = "home" | "intake";

const Index = () => {
  const [view, setView] = useState<View>("home");

  const transition = { duration: 0.3, ease: "easeInOut" };

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
          <HeroSection onStart={() => setView("intake")} />
        </motion.div>
      )}
      {view === "intake" && (
        <motion.div
          key="intake"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          <AppLayout>
            <div className="flex items-center justify-center min-h-screen">
              <p className="font-body text-sm text-muted-foreground">
                Question input screen — coming soon
              </p>
            </div>
          </AppLayout>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { track } from "@/lib/posthog";

interface ConsentUpgradeSheetProps {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

const ConsentUpgradeSheet = ({ open, onAccept, onDismiss }: ConsentUpgradeSheetProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-app bg-card border-t border-border rounded-t-lg p-6 relative"
          >
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <p className="font-display text-[18px] text-card-foreground mb-3">
              Help the mirror get better.
            </p>

            <p className="font-body text-[14px] text-muted-foreground leading-relaxed mb-6">
              Your outcomes are anonymised and never linked to you personally. Sharing them helps the mirror give more accurate Third Ways to everyone — including you.
            </p>

            <button
              onClick={() => {
                track("consent_upgrade_accepted");
                onAccept();
              }}
              className="w-full h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300 mb-3"
            >
              Yes, share anonymously
            </button>

            <button
              onClick={() => {
                track("consent_upgrade_declined");
                onDismiss();
              }}
              className="w-full h-[40px] rounded-sm text-muted-foreground font-body text-[13px] hover:text-foreground/70 transition-colors"
            >
              Keep private
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConsentUpgradeSheet;

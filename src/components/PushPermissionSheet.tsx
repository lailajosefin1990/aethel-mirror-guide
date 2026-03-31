import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PushPermissionSheetProps {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

const PushPermissionSheet = ({ open, onAccept, onDismiss }: PushPermissionSheetProps) => {
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

            <p className="font-display text-[20px] text-card-foreground mb-3">
              Get your 48-hour check-in
            </p>
            <p className="font-body text-[14px] text-muted-foreground mb-6 leading-relaxed">
              We'll nudge you in 48 hours to log what happened.
              That's when the mirror gets personal.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={onAccept}
                className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300"
              >
                Yes, remind me
              </button>
              <button
                onClick={onDismiss}
                className="w-full h-[48px] rounded-sm bg-transparent border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushPermissionSheet;

import { motion } from "framer-motion";

interface ProgressStepperProps {
  currentStep: number; // 1-based: 1=Anchor, 2=Ask, 3=Sign in, 4=Your Third Way
  totalSteps?: number;
}

const STEP_LABELS = ["Anchor", "Ask", "Sign in", "Third Way"];

const ProgressStepper = ({ currentStep, totalSteps = 4 }: ProgressStepperProps) => (
  <div className="w-full max-w-app mx-auto px-5 pt-4 pb-2">
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-[2px] rounded-full overflow-hidden bg-border">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: isCompleted || isActive ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className={`font-body text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 ${
              isActive ? "text-primary" : isCompleted ? "text-primary/50" : "text-muted-foreground/40"
            }`}>
              {STEP_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export default ProgressStepper;

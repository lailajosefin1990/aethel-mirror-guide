interface ProgressStepperProps {
  currentStep: number;
  totalSteps?: number;
}

const STEP_LABELS = ["Anchor", "Ask", "Sign in", "Third Way"];

const ProgressStepper = ({ currentStep, totalSteps = 4 }: ProgressStepperProps) => (
  <div className="w-full max-w-app mx-auto px-5 pt-4 pb-2">
    <div className="flex items-center gap-0">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;
        return (
          <div key={step} className="flex items-center">
            <span className={`font-body text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 ${
              isActive ? "text-foreground" : isCompleted ? "text-foreground/50" : "text-foreground/20"
            }`}>
              {STEP_LABELS[i]}
            </span>
            {i < totalSteps - 1 && (
              <span className="mx-2 text-foreground/20 font-body text-[10px]">—</span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default ProgressStepper;

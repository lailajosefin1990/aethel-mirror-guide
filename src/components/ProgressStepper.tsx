interface ProgressStepperProps {
  currentStep: number; // 1-based
  totalSteps?: number;
  labels?: string[];
}

const DEFAULT_LABELS = ["Anchor", "Ask", "Sign in", "Third Way"];
const RETURNING_LABELS = ["Ask", "Generate", "Third Way"];

const ProgressStepper = ({
  currentStep,
  totalSteps,
  labels,
}: ProgressStepperProps) => {
  const stepLabels = labels || DEFAULT_LABELS;
  const steps = totalSteps || stepLabels.length;

  return (
    <div className="w-full max-w-app mx-auto px-5 pt-4 pb-2">
      <div className="flex items-center gap-0">
        {Array.from({ length: steps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <div key={step} className="flex items-center">
              <span className={`font-body text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 ${
                isActive ? "text-foreground" : isCompleted ? "text-foreground/50" : "text-foreground/35"
              }`}>
                {stepLabels[i]}
              </span>
              {i < steps - 1 && (
                <span className="mx-2 text-foreground/30 font-body text-[10px]">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { DEFAULT_LABELS, RETURNING_LABELS };
export default ProgressStepper;

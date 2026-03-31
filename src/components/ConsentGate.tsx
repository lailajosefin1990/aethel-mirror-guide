import { useState } from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface ConsentGateProps {
  onAccept: () => void;
}

const ConsentGate = ({ onAccept }: ConsentGateProps) => {
  const [age, setAge] = useState(false);
  const [guidance, setGuidance] = useState(false);
  const [terms, setTerms] = useState(false);

  const allChecked = age && guidance && terms;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-3">
          B E F O R E  Y O U  B E G I N
        </p>
        <p className="font-body text-sm text-muted-foreground mb-8">
          Please confirm the following to continue.
        </p>

        <div className="space-y-5 mb-10">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={age}
              onCheckedChange={(c) => setAge(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              I am 18 or over
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={guidance}
              onCheckedChange={(c) => setGuidance(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              I understand this app provides reflective guidance, not professional advice of any kind
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={terms}
              onCheckedChange={(c) => setTerms(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              I agree to the{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              {" "}and{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            </span>
          </label>
        </div>

        <button
          onClick={onAccept}
          disabled={!allChecked}
          className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body text-[14px] tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-300"
        >
          I understand, continue →
        </button>
      </motion.div>
    </div>
  );
};

export default ConsentGate;

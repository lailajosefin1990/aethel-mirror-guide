import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface GenesisIntakeProps {
  onBack: () => void;
}

const GenesisIntake = ({ onBack }: GenesisIntakeProps) => {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: process intake
    console.log({ dob, tob: unknownTime ? "unknown" : tob, birthPlace });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6">
      {/* Subtle bg glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h2 className="text-4xl sm:text-5xl font-display font-light text-gold-gradient mb-3">
          Set up your mirror
        </h2>
        <p className="text-base text-muted-foreground font-body mb-10">
          We only need this once to generate your blueprint.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date of birth */}
          <div className="space-y-2">
            <label className="text-sm font-body font-medium text-foreground/80">
              Date of birth
            </label>
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Time of birth */}
          <div className="space-y-2">
            <label className="text-sm font-body font-medium text-foreground/80">
              Time of birth
            </label>
            <input
              type="text"
              placeholder="--:--"
              value={tob}
              onChange={(e) => setTob(e.target.value)}
              disabled={unknownTime}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-40"
            />
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={unknownTime}
                onChange={(e) => setUnknownTime(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-muted accent-primary"
              />
              <span className="text-xs text-muted-foreground font-body">
                I don't know the exact time
              </span>
            </label>
          </div>

          {/* Birth place */}
          <div className="space-y-2">
            <label className="text-sm font-body font-medium text-foreground/80">
              Birth place
            </label>
            <input
              type="text"
              placeholder="City, Country"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Reassurance */}
          <p className="text-xs text-muted-foreground font-body text-center pt-2">
            Precise data = sharper guidance. Approximate is still okay.
          </p>

          {/* Submit */}
          <button
            type="submit"
            className="w-full px-8 py-4 bg-primary text-primary-foreground font-body font-medium text-base tracking-wide rounded-lg glow-gold hover:brightness-110 transition-all duration-300 hover:scale-[1.01]"
          >
            See my blueprint
          </button>
        </form>
      </motion.div>
    </section>
  );
};

export default GenesisIntake;

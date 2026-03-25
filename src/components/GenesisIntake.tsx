import { useState } from "react";
import { motion } from "framer-motion";

interface GenesisIntakeProps {
  onBack: () => void;
  onSubmit: () => void;
}

const GenesisIntake = ({ onBack, onSubmit }: GenesisIntakeProps) => {
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ dob, tob: unknownTime ? "unknown" : tob, birthPlace });
    onSubmit();
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <button
          onClick={onBack}
          className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mb-6"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="bg-foreground p-8 sm:p-10 rounded-none">
          {/* Header */}
          <p className="font-body text-[11px] uppercase tracking-[0.25em] text-background/60 mb-6">
            Your Coordinates
          </p>

          {/* Intro */}
          <p className="font-display text-[16px] leading-relaxed text-background mb-8">
            We anchor your mirror
            <br />
            in the moment you arrived.
            <br />
            We only ask this once.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date of birth */}
            <div className="space-y-1.5">
              <label className="font-body text-[12px] text-background/70">
                Date of birth
              </label>
              <input
                type="text"
                placeholder="dd / mm / yyyy"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 bg-[#FFF7F0] border border-[hsl(30,60%,50%)] rounded-none font-body text-[14px] text-background placeholder:text-background/40 focus:outline-none focus:border-[hsl(14,55%,42%)] transition-colors"
              />
            </div>

            {/* Time of birth */}
            <div className="space-y-1.5">
              <label className="font-body text-[12px] text-background/70">
                Time of birth
              </label>
              <input
                type="text"
                placeholder="--:--"
                value={tob}
                onChange={(e) => setTob(e.target.value)}
                disabled={unknownTime}
                className="w-full px-4 py-3 bg-[#FFF7F0] border border-[hsl(30,60%,50%)] rounded-none font-body text-[14px] text-background placeholder:text-background/40 focus:outline-none focus:border-[hsl(14,55%,42%)] transition-colors disabled:opacity-40"
              />
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={(e) => setUnknownTime(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-none border-background/30 accent-[hsl(14,55%,42%)]"
                />
                <span className="font-body text-[12px] text-background/70">
                  I don't know exactly.
                </span>
              </label>
              {unknownTime && (
                <p className="font-body text-[11px] text-background/50 mt-1 pl-5">
                  We'll work with an approximate mirror. It still holds.
                </p>
              )}
            </div>

            {/* Birth place */}
            <div className="space-y-1.5">
              <label className="font-body text-[12px] text-background/70">
                Birth place
              </label>
              <input
                type="text"
                placeholder="City, Country"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                className="w-full px-4 py-3 bg-[#FFF7F0] border border-[hsl(30,60%,50%)] rounded-none font-body text-[14px] text-background placeholder:text-background/40 focus:outline-none focus:border-[hsl(14,55%,42%)] transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full h-[52px] bg-background text-foreground font-body font-medium text-[14px] tracking-wide rounded-none hover:brightness-110 transition-all duration-200 mt-4"
            >
              Generate my mirror
            </button>
          </form>
        </div>
      </motion.div>
    </section>
  );
};

export default GenesisIntake;

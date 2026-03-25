import { motion } from "framer-motion";

interface ThirdWayResultProps {
  onSave: () => void;
  onReject: () => void;
  onBack: () => void;
}

// Placeholder AI content — will be replaced with real AI output
const mockResult = {
  stars: "Mercury is stationing direct in your 10th house this week, clearing the fog around career decisions. Mars in your 2nd house says your energy for earning is high — but it wants a focused channel, not a scatter. The Moon's nodes suggest this pivot has been building for 18 months. The timing isn't perfect, but it's ripe.",
  design: [
    "Your Sacral authority says wait for the body's yes — if it lit up when you read the offer, that's data.",
    "Gate 21 (Control) is active: you need ownership of the outcome, not a 50/50 split.",
    "Your 1/3 Profile means you'll research deeply then learn by doing — stop researching and start the experiment.",
  ],
  thirdWay: "Send the counter-offer by Friday. Name your non-negotiable (ownership) and one thing you'll let go of. That's the move.",
  journal: "What am I afraid will happen if I actually get what I want?",
};

const ThirdWayResult = ({ onSave, onReject, onBack }: ThirdWayResultProps) => {
  return (
    <section className="min-h-screen px-6 py-12">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mb-10"
        >
          ← Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-0"
        >
          {/* Section 1 — Stars */}
          <div className="border-t border-[hsl(30,60%,50%)] pt-6 pb-8">
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-[hsl(60,35%,35%)] mb-1">
              What Your Stars Say
            </p>
            <p className="font-body text-[11px] uppercase tracking-[0.15em] text-foreground/40 mb-5">
              (When)
            </p>
            <p className="font-display text-[16px] leading-[1.6] text-foreground">
              {mockResult.stars}
            </p>
          </div>

          {/* Section 2 — Design */}
          <div className="border-t border-[hsl(30,60%,50%)] pt-6 pb-8">
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-[hsl(60,35%,35%)] mb-1">
              What Your Design Says
            </p>
            <p className="font-body text-[11px] uppercase tracking-[0.15em] text-foreground/40 mb-5">
              (How · Tone · Why · Path · Heart)
            </p>
            <ul className="space-y-3">
              {mockResult.design.map((bullet, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[hsl(14,55%,42%)] font-body text-[16px] leading-[1.6] shrink-0">—</span>
                  <span className="font-display text-[16px] leading-[1.6] text-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3 — Third Way */}
          <div className="border-t border-[hsl(30,60%,50%)] pt-6 pb-8">
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-[hsl(60,35%,35%)] mb-5">
              Your Third Way
            </p>
            <p className="font-display text-[20px] leading-[1.5] font-bold text-foreground mb-8">
              {mockResult.thirdWay}
            </p>

            <div className="border-t border-foreground/10 pt-6">
              <p className="font-body text-[11px] uppercase tracking-[0.15em] text-foreground/40 mb-3">
                Journal:
              </p>
              <p className="font-display text-[16px] leading-[1.6] italic text-foreground">
                {mockResult.journal}
              </p>
            </div>
          </div>

          {/* Sovereignty line */}
          <div className="border-t border-[hsl(30,60%,50%)] pt-8 pb-8">
            <p className="font-body text-[12px] text-foreground/50 text-center leading-relaxed">
              Your faith and your body get the final say.
              <br />
              I'm a mirror, not a master.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onSave}
              className="flex-1 h-[52px] bg-secondary text-background font-body font-medium text-[14px] tracking-wide rounded-none hover:brightness-110 transition-all duration-200"
            >
              Save to my mirror
            </button>
            <button
              onClick={onReject}
              className="flex-1 h-[52px] bg-transparent text-[hsl(14,55%,42%)] border border-[hsl(14,55%,42%)] font-body font-medium text-[14px] tracking-wide rounded-none hover:bg-[hsl(14,55%,42%)]/10 transition-all duration-200"
            >
              That doesn't fit
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ThirdWayResult;

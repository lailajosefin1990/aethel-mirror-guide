import { motion } from "framer-motion";

interface BlueprintPreviewProps {
  onGetThirdWay: () => void;
  onBack: () => void;
}

const systems = [
  { label: "WHEN", system: "Astrology", body: "Your natural timing\nand cosmic weather." },
  { label: "HOW", system: "Human Design", body: "How your energy\nactually wants to move." },
  { label: "TONE", system: "Numerology", body: "The underlying math\nof your life path." },
  { label: "WHY", system: "Gene Keys", body: "The shadows you're here\nto turn into gifts." },
  { label: "PATH", system: "Destiny Matrix", body: "The karmic curriculum\nlife keeps handing you." },
  { label: "HEART", system: "Faith", body: "The ground you stand on\nwhen everything else moves." },
];

const BlueprintPreview = ({ onGetThirdWay, onBack }: BlueprintPreviewProps) => {
  return (
    <section className="min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mb-8"
        >
          ← Back
        </button>

        {/* Breadcrumb */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="font-body text-[11px] uppercase tracking-[0.25em] text-foreground/60 text-center mb-8"
        >
          Step 2 · Your Blueprint
        </motion.p>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {systems.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="bg-foreground rounded-none p-5 border-b border-[hsl(30,60%,50%)]"
            >
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-[hsl(14,55%,42%)] mb-3">
                {s.label} · {s.system}
              </p>
              <p className="font-display text-[15px] leading-[1.5] text-background whitespace-pre-line">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="font-display italic text-[16px] leading-[1.5] text-foreground text-center max-w-sm mx-auto mb-10"
        >
          This isn't about more information.
          <br />
          It's the Third Way—the move you can
          <br />
          actually make in the next 48 hours.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="max-w-md mx-auto"
        >
          <button
            onClick={onGetThirdWay}
            className="w-full h-[52px] bg-secondary text-background font-body font-medium text-[14px] tracking-wide rounded-none hover:brightness-110 transition-all duration-200"
          >
            Get my Third Way →
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default BlueprintPreview;

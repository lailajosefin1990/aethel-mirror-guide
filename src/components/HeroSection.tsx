import { motion } from "framer-motion";

interface HeroSectionProps {
  onStart: () => void;
}

const steps = [
  { number: "01", text: "We anchor your mirror\nin your birth moment." },
  { number: "02", text: "We read your six systems\ntogether, not in pieces." },
  { number: "03", text: "We give you one Third Way—\na clear next move, today." },
];

const HeroSection = ({ onStart }: HeroSectionProps) => {
  return (
    <>
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center flex flex-col items-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-display text-[14px] uppercase tracking-[0.35em] text-foreground mb-16"
          >
            Aethel Mirror
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mb-16"
          >
            <p className="font-display text-[32px] sm:text-[36px] leading-[1.3] font-normal text-foreground">
              You've done the readings.
            </p>
            <p className="font-display text-[32px] sm:text-[36px] leading-[1.3] font-normal text-foreground">
              You've pulled the cards.
            </p>
            <p className="font-display text-[32px] sm:text-[36px] leading-[1.3] font-normal text-foreground/60 mt-6">
              You're still not sure
            </p>
            <p className="font-display text-[32px] sm:text-[36px] leading-[1.3] font-normal text-foreground/60">
              what to do next.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="font-display italic text-[32px] sm:text-[36px] leading-[1.3] text-foreground mb-16"
          >
            This is for that moment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <button
              onClick={onStart}
              className="w-full h-[52px] bg-secondary text-background font-body font-medium text-sm tracking-wide rounded-none hover:brightness-110 transition-all duration-200"
            >
              Start my mirror
            </button>

            <a
              href="#how-it-works"
              className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors no-underline"
            >
              How it works ↓
            </a>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-24 pt-12">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-foreground text-background px-6 py-5 rounded-none"
            >
              <p className="font-body text-[14px] leading-relaxed text-background">
                <span className="text-background/50">{step.number} / </span>
                {step.text.split("\n").map((line, j) => (
                  <span key={j}>
                    {j > 0 && <><br /><span className="inline-block w-[38px]" /></>}
                    {line}
                  </span>
                ))}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
};

export default HeroSection;

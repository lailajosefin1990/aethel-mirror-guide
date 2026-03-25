import { motion } from "framer-motion";

interface HeroSectionProps {
  onStart: () => void;
}

const HeroSection = ({ onStart }: HeroSectionProps) => {
  const handleScrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto px-6 text-center flex flex-col items-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-xs font-body tracking-[0.35em] uppercase text-primary mb-10"
        >
          Aethel Mirror
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="space-y-1 mb-10"
        >
          <p className="text-lg sm:text-xl font-display font-light text-foreground/90">
            You've done the readings.
          </p>
          <p className="text-lg sm:text-xl font-display font-light text-foreground/90">
            You've pulled the cards.
          </p>
          <p className="text-lg sm:text-xl font-display font-light text-foreground/70 mt-4">
            You're still not sure
          </p>
          <p className="text-lg sm:text-xl font-display font-light text-foreground/70">
            what to do next.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-sm font-display italic text-primary/80 mb-14"
        >
          This is for that moment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="flex flex-col items-center gap-8"
        >
          <button
            onClick={onStart}
            className="px-10 py-4 bg-primary text-primary-foreground font-body font-medium text-sm tracking-wide rounded-lg glow-gold hover:brightness-110 transition-all duration-300 hover:scale-[1.02]"
          >
            Start my mirror
          </button>

          <button
            onClick={handleScrollDown}
            className="text-xs font-body text-muted-foreground hover:text-foreground/60 transition-colors flex items-center gap-1.5"
          >
            How it works <span className="text-sm">↓</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

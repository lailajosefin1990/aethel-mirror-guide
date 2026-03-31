import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  "Reading your chart...",
  "Checking your design...",
  "Finding the pattern...",
  "Forming your Third Way...",
];

interface ReadingLoaderProps {
  onComplete: () => void;
}

const ReadingLoader = ({ onComplete }: ReadingLoaderProps) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => {
        if (prev >= phrases.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 1800);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-5">
      {/* Pulsing logo */}
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="font-display text-[14px] tracking-[0.45em] text-primary mb-12"
      >
        A E T H E L &nbsp; M I R R O R
      </motion.p>

      {/* Rotating text */}
      <div className="h-6 relative">
        <AnimatePresence mode="wait">
          <motion.p
            key={phraseIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="font-body text-[14px] text-muted-foreground"
          >
            {phrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ReadingLoader;

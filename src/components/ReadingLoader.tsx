import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { track } from "@/lib/posthog";

const phrases = [
  "Reading your chart...",
  "Checking your design...",
  "Finding the pattern...",
  "Forming your Third Way...",
];

interface ReadingLoaderProps {
  onComplete: () => void;
  onError?: () => void;
  generateReading: () => Promise<void>;
}

const ReadingLoader = ({ onComplete, onError, generateReading }: ReadingLoaderProps) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [error, setError] = useState(false);
  const started = useRef(false);

  // Start API call
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track("reading_generating");
    generateReading()
      .then(() => setApiDone(true))
      .catch(() => {
        setError(true);
        onError?.();
      });
  }, [generateReading, onError]);

  // Animate phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => {
        if (prev >= phrases.length - 1) {
          clearInterval(interval);
          setTimeout(() => setAnimDone(true), 1800);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Complete when both API and animation are done
  useEffect(() => {
    if (apiDone && animDone && !error) {
      onComplete();
    }
  }, [apiDone, animDone, error, onComplete]);

  if (error) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-md bg-card border border-border rounded-md p-6 text-center">
          <p className="font-display text-[18px] text-card-foreground mb-3">
            Your mirror needs a moment.
          </p>
          <p className="font-body text-[14px] text-muted-foreground mb-6">
            Try again.
          </p>
          <button
            onClick={() => {
              setError(false);
              setApiDone(false);
              setPhraseIndex(0);
              started.current = false;
            }}
            className="h-[48px] px-8 rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-5" aria-label="Loading your reading">
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="font-display text-[14px] tracking-[0.45em] text-primary mb-12"
      >
        A E T H E L &nbsp; M I R R O R
      </motion.p>

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

      <div className="flex items-center justify-center gap-2 mt-6">
        {phrases.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            i <= phraseIndex ? "bg-primary" : "bg-border"
          }`} />
        ))}
      </div>

      <button
        onClick={() => { track("reading_wait_cancelled"); onError?.(); }}
        className="font-body text-[12px] text-muted-foreground/50 hover:text-muted-foreground mt-8 transition-colors"
      >
        Cancel
      </button>
    </section>
  );
};

export default ReadingLoader;

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { trackEvent, EVENTS } from "@/lib/analytics";

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

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackEvent(EVENTS.READING_GENERATING);
    generateReading()
      .then(() => setApiDone(true))
      .catch(() => {
        setError(true);
        onError?.();
      });
  }, [generateReading, onError]);

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

  useEffect(() => {
    if (apiDone && animDone && !error) {
      onComplete();
    }
  }, [apiDone, animDone, error, onComplete]);

  const progress = ((phraseIndex + 1) / phrases.length) * 100;

  if (error) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-md border border-border p-6 text-center">
          <p className="font-display text-[18px] text-foreground mb-3">
            Your mirror needs a moment.
          </p>
          <p className="font-body text-[13px] text-muted-foreground mb-6">
            Try again.
          </p>
          <button
            onClick={() => {
              setError(false);
              setApiDone(false);
              setPhraseIndex(0);
              started.current = false;
            }}
            className="h-[48px] px-8 bg-foreground text-background font-body font-medium text-[13px] uppercase tracking-[0.15em] hover:opacity-85 transition-opacity duration-300"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-5" aria-label="Loading your reading">
      {/* Expanding line */}
      <div className="w-64 h-px bg-border mb-12 overflow-hidden">
        <motion.div
          className="h-full bg-foreground/60"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="h-6 relative" role="status" aria-live="polite">
        <motion.p
          key={phraseIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-body text-[13px] text-foreground/60"
        >
          {phrases[phraseIndex]}
        </motion.p>
      </div>

      <button
        onClick={() => { trackEvent(EVENTS.READING_WAIT_CANCELLED); onError?.(); }}
        className="font-body text-[12px] text-foreground/40 hover:text-foreground/60 mt-8 transition-colors"
      >
        Cancel
      </button>
    </section>
  );
};

export default ReadingLoader;

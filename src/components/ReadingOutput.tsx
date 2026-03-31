import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { ReadingData } from "@/lib/reading";
import { CONFIDENCE_MESSAGES } from "@/lib/reading";

interface ReadingOutputProps {
  domain: string;
  question: string;
  reading: ReadingData | null;
  onSave: () => void;
  onBack: () => void;
}

const ExpandableText = ({ text }: { text: string }) => {
  return (
    <p className="font-display text-[16px] leading-[1.6] text-foreground">
      {text}
    </p>
  );
};

const ExpandableBullet = ({ text }: { text: string }) => {
  return (
    <div className="flex items-start gap-3">
      <span className="text-primary mt-1 shrink-0">—</span>
      <span className="font-display text-[16px] leading-[1.6] text-foreground">
        {text.replace(/^—\s*/, "")}
      </span>
    </div>
  );
};

const ReadingOutput = ({ domain, question, reading, onSave, onBack }: ReadingOutputProps) => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-4";

  if (!reading) return null;

  const confidenceText = CONFIDENCE_MESSAGES[reading.confidence_level] || CONFIDENCE_MESSAGES.medium;

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        {/* Back */}
        <button
          onClick={onBack}
          className="mb-8 text-foreground/50 hover:text-foreground/70 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Domain breadcrumb */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-body text-[11px] uppercase tracking-[0.2em] text-primary mb-10"
        >
          {domain}
        </motion.p>

        {/* Stars section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <p className={sectionLabel}>
            W H A T &nbsp; Y O U R &nbsp; S T A R S &nbsp; S A Y &nbsp; ( W H E N )
          </p>
          <ExpandableText text={reading.astrology_reading} />
        </motion.div>

        {/* Design section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <p className={sectionLabel}>
            W H A T &nbsp; Y O U R &nbsp; D E S I G N &nbsp; S A Y S &nbsp; ( H O W )
          </p>
          <div className="space-y-4">
            {reading.design_insights.map((item, i) => (
              <ExpandableBullet key={i} text={item} />
            ))}
          </div>
        </motion.div>

        {/* Confidence */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="font-body text-[13px] italic text-primary/80 mb-10"
        >
          {confidenceText}
        </motion.p>

        {/* Divider + Third Way */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="border-t-2 border-primary/40 pt-8 mb-10"
        >
          <p className={`${sectionLabel} text-center`}>
            Y O U R &nbsp; T H I R D &nbsp; W A Y
          </p>
          <p className="font-display text-[22px] sm:text-[24px] leading-[1.4] text-foreground text-center font-medium">
            {reading.third_way}
          </p>
        </motion.div>

        {/* Journal prompt */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card border border-border rounded-md p-5 mb-6"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            J O U R N A L
          </p>
          <p className="font-display text-[16px] leading-[1.6] text-card-foreground">
            {reading.journal_prompt}
          </p>
        </motion.div>

        {/* Mirror disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="font-body text-[12px] italic text-foreground/50 text-center mb-8"
        >
          I'm a mirror, not a master.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col gap-3 pb-10"
        >
          <button
            onClick={onSave}
            className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300"
          >
            Save to my mirror
          </button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="w-full h-[48px] rounded-sm bg-transparent border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
          >
            That doesn't fit
          </button>
        </motion.div>
      </div>

      {/* Feedback modal */}
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-app bg-card border border-border rounded-md p-6 relative"
            >
              <button
                onClick={() => setFeedbackOpen(false)}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors"
              >
                <ChevronDown className="w-4 h-4 rotate-45" strokeWidth={1.5} />
              </button>
              <p className="font-display text-[18px] text-card-foreground mb-2">
                Tell us what missed the mark
              </p>
              <p className="font-body text-[13px] text-muted-foreground mb-4">
                This helps us refine your mirror.
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What felt off?"
                rows={3}
                className="w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none mb-4"
              />
              <button
                onClick={() => {
                  console.log("Regenerate with feedback:", feedbackText);
                  setFeedbackOpen(false);
                  setFeedbackText("");
                }}
                className="w-full h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300"
              >
                Regenerate
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ReadingOutput;

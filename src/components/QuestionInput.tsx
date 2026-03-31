import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/posthog";

export interface QuestionData {
  domain: string;
  question: string;
  mode: string;
}

interface QuestionInputProps {
  onSubmit: (data: QuestionData) => void;
  onBack: () => void;
}

const domains = [
  "Work & money",
  "Love & people",
  "Visibility",
  "Body & health",
  "Spiritual path",
  "Everything at once",
];

const modes = ["Reflect with me", "Coach me", "Both"];

const MAX_CHARS = 300;

const QuestionInput = ({ onSubmit, onBack }: QuestionInputProps) => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [selectedMode, setSelectedMode] = useState("Both");

  const isValid = selectedDomain !== null && question.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedDomain) return;
    onSubmit({ domain: selectedDomain, question, mode: selectedMode });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setQuestion(e.target.value);
    }
  };

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={onBack}
          className="mb-10 text-foreground/50 hover:text-foreground/70 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </motion.button>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-[28px] sm:text-[32px] leading-[1.2] font-normal text-foreground mb-3"
        >
          What are you sitting with
          <br />
          right now?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="font-body text-[14px] text-muted-foreground leading-relaxed mb-10"
        >
          One decision. One knot. The mirror does the rest.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Domain tiles — 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {domains.map((domain) => {
              const isSelected = selectedDomain === domain;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-4 py-3.5 rounded-sm font-body text-[13px] border transition-all duration-300 text-left ${
                    isSelected
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border text-foreground/70 bg-card hover:border-foreground/30"
                  }`}
                >
                  {domain}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={question}
              onChange={handleTextChange}
              placeholder="Describe your decision or situation... e.g. Should I go all-in on this opportunity?"
              rows={4}
              className="w-full px-4 py-3 rounded-sm bg-card text-foreground font-body text-[14px] leading-relaxed border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none"
            />
            <span className="absolute bottom-3 right-3 font-body text-[11px] text-muted-foreground">
              {question.length}/{MAX_CHARS}
            </span>
          </div>

          {/* Mode toggles */}
          <div className="flex gap-2">
            {modes.map((mode) => {
              const isSelected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={`flex-1 py-2.5 rounded-sm font-body text-[12px] sm:text-[13px] border transition-all duration-300 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-foreground/60 border-border hover:border-foreground/30"
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!isValid}
            className="w-full h-[52px] rounded-sm font-body font-medium text-[14px] tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:brightness-110"
          >
            Find my Third Way →
          </button>
        </motion.form>
      </div>
    </section>
  );
};

export default QuestionInput;

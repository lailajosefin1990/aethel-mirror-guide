import { useState } from "react";
import { motion } from "framer-motion";

interface ThirdWayInputProps {
  onSubmit: () => void;
  onBack: () => void;
}

const topics = [
  "Work & money",
  "Love & people",
  "Visibility",
  "Body & health",
  "Spiritual path",
  "Life direction",
];

const tones = ["Reflect with me", "Coach me", "Both"];

const ThirdWayInput = ({ onSubmit, onBack }: ThirdWayInputProps) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [selectedTone, setSelectedTone] = useState("Both");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ selectedTopic, question, selectedTone });
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
        {/* Back */}
        <button
          onClick={onBack}
          className="font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mb-10"
        >
          ← Back
        </button>

        {/* Prompt */}
        <h1 className="font-display text-[32px] leading-[1.15] font-normal text-foreground mb-6">
          What are you
          <br />
          sitting with
          <br />
          right now?
        </h1>

        <p className="font-body text-[14px] text-foreground/60 leading-relaxed mb-10">
          One decision. One knot.
          <br />
          The mirror does the rest.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Topic chips */}
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-4 py-2.5 font-body text-[13px] rounded-none border transition-all duration-150 ${
                  selectedTopic === topic
                    ? "bg-secondary text-background border-secondary"
                    : "bg-foreground text-background border-[hsl(14,55%,42%)]"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., 'Should I go all‑in on my business this year?'"
            rows={4}
            className="w-full px-4 py-3 bg-foreground text-background font-body text-[14px] leading-relaxed rounded-none border border-[hsl(30,60%,50%)] placeholder:text-background/40 focus:outline-none focus:border-[hsl(14,55%,42%)] transition-colors resize-none"
          />

          {/* Tone selector */}
          <div className="flex items-center gap-1 justify-center">
            {tones.map((tone, i) => (
              <span key={tone} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTone(tone)}
                  className={`font-body text-[13px] transition-all duration-150 pb-0.5 ${
                    selectedTone === tone
                      ? "text-foreground/90 border-b border-secondary"
                      : "text-foreground/50 hover:text-foreground/70 border-b border-transparent"
                  }`}
                >
                  {tone}
                </button>
                {i < tones.length - 1 && (
                  <span className="text-foreground/30 text-[13px] mx-1">/</span>
                )}
              </span>
            ))}
          </div>

          {/* CTA */}
          <button
            type="submit"
            className="w-full h-[52px] bg-secondary text-background font-body font-medium text-[14px] tracking-wide rounded-none hover:brightness-110 transition-all duration-200"
          >
            Find my Third Way →
          </button>
        </form>
      </motion.div>
    </section>
  );
};

export default ThirdWayInput;

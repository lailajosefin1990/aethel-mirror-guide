import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface JournalEntry {
  id: string;
  domain: string;
  date: string;
  thirdWay: string;
  question: string;
  outcome?: {
    followed: "yes" | "no" | "partially";
    note: string;
  };
}

interface DecisionJournalProps {
  entries: JournalEntry[];
  onUpdateEntry: (id: string, outcome: JournalEntry["outcome"]) => void;
  onStartReading: () => void;
}

const SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    domain: "Work & money",
    date: "28 Mar 2026",
    thirdWay: "Send the counter-offer by Friday. Name your non-negotiable and one thing you'll let go of. That's the move.",
    question: "Should I accept the new job offer?",
  },
  {
    id: "2",
    domain: "Love & people",
    date: "22 Mar 2026",
    thirdWay: "Have the conversation before the weekend. Lead with what you need, not what they did wrong. One sentence is enough to open it.",
    question: "Should I bring up the issue with my partner?",
  },
  {
    id: "3",
    domain: "Visibility",
    date: "15 Mar 2026",
    thirdWay: "Post the thing you've been sitting on. Don't edit it again. The version that's 80% ready is the one that lands.",
    question: "Should I launch my newsletter?",
    outcome: { followed: "yes", note: "I posted it and got 40 subscribers in the first week. The imperfect version resonated more than I expected." },
  },
  {
    id: "4",
    domain: "Work & money",
    date: "8 Mar 2026",
    thirdWay: "Say no to the project but offer a smaller scope you can do brilliantly. Protect your energy for the thing that's coming in April.",
    question: "Should I take on the freelance project?",
    outcome: { followed: "partially", note: "I negotiated a smaller scope. It worked out — freed up time for the bigger opportunity." },
  },
  {
    id: "5",
    domain: "Spiritual path",
    date: "1 Mar 2026",
    thirdWay: "Commit to 10 minutes a day for two weeks. Not an hour, not a retreat. Consistency over intensity is your pattern right now.",
    question: "Should I start a meditation practice?",
    outcome: { followed: "yes", note: "The 10-minute commitment stuck. I haven't missed a day in 3 weeks." },
  },
];

const FollowedBadge = ({ followed }: { followed: string }) => {
  const label = followed === "yes" ? "Followed" : followed === "partially" ? "Partially followed" : "Didn't follow";
  return (
    <span className="inline-block px-2 py-0.5 rounded-sm bg-primary/10 font-body text-[11px] text-primary">
      {label}
    </span>
  );
};

const DecisionJournal = ({ entries: propEntries, onUpdateEntry, onStartReading }: DecisionJournalProps) => {
  const entries = propEntries.length > 0 ? propEntries : SAMPLE_ENTRIES;
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sheetEntryId, setSheetEntryId] = useState<string | null>(null);
  const [followedChoice, setFollowedChoice] = useState<"yes" | "no" | "partially" | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");

  const openEntries = entries.filter((e) => !e.outcome);
  const closedEntries = entries.filter((e) => e.outcome);
  const displayedEntries = tab === "open" ? openEntries : closedEntries;

  const handleLogSubmit = () => {
    if (!sheetEntryId || !followedChoice) return;
    onUpdateEntry(sheetEntryId, { followed: followedChoice, note: outcomeNote });
    setSheetEntryId(null);
    setFollowedChoice(null);
    setOutcomeNote("");
  };

  return (
    <section className="pt-8 pb-4">
      {/* Header */}
      <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-8">
        Y O U R &nbsp; M I R R O R &nbsp; J O U R N E Y
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-sm font-body text-[13px] border transition-all duration-300 ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-foreground/60 border-border"
            }`}
          >
            {t === "open" ? "Open" : "Closed"}
            <span className="ml-1.5 text-[11px] opacity-60">
              ({t === "open" ? openEntries.length : closedEntries.length})
            </span>
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {displayedEntries.length === 0 && tab === "open" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="font-body text-[14px] text-muted-foreground mb-6">
                No open decisions yet.
              </p>
              <button
                onClick={onStartReading}
                className="h-[48px] px-8 rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300"
              >
                Start your first reading →
              </button>
            </motion.div>
          )}

          {displayedEntries.length === 0 && tab === "closed" && (
            <motion.div key="empty-closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <p className="font-body text-[14px] text-muted-foreground">No closed decisions yet.</p>
            </motion.div>
          )}

          {displayedEntries.map((entry) => {
            const isExpanded = expanded === entry.id;
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="border border-border rounded-md p-4 bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-sm bg-primary/15 font-body text-[11px] uppercase tracking-wider text-primary">
                    {entry.domain}
                  </span>
                  <span className="font-body text-[11px] text-muted-foreground">
                    {entry.date}
                  </span>
                </div>

                <button
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                  className="text-left w-full"
                >
                  <p
                    className={`font-display text-[15px] leading-[1.5] text-card-foreground transition-all duration-300 ${
                      isExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {entry.thirdWay}
                  </p>
                </button>

                {entry.outcome ? (
                  <div className="mt-3 pt-3 border-t border-border">
                    <FollowedBadge followed={entry.outcome.followed} />
                    <p className="font-body text-[13px] text-muted-foreground mt-2 leading-relaxed">
                      {entry.outcome.note}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setSheetEntryId(entry.id)}
                    className="mt-3 font-body text-[13px] text-primary hover:text-primary/80 transition-colors duration-300"
                  >
                    Log what happened →
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pattern insight */}
      {tab === "closed" && closedEntries.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 bg-card border border-border rounded-md p-5"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
            P A T T E R N
          </p>
          <p className="font-display text-[15px] leading-[1.6] text-card-foreground">
            You've logged {closedEntries.length} decisions. You tend to act on
            readings about work and sit longer on ones about people.
          </p>
        </motion.div>
      )}

      {/* Bottom sheet for logging outcome */}
      <AnimatePresence>
        {sheetEntryId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-app bg-card border-t border-border rounded-t-lg p-6 relative"
            >
              <button
                onClick={() => { setSheetEntryId(null); setFollowedChoice(null); setOutcomeNote(""); }}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <p className="font-display text-[18px] text-card-foreground mb-5">
                Did you follow the Third Way?
              </p>

              <div className="flex gap-2 mb-5">
                {(["yes", "no", "partially"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFollowedChoice(opt)}
                    className={`flex-1 py-2.5 rounded-sm font-body text-[13px] border capitalize transition-all duration-300 ${
                      followedChoice === opt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-foreground/60 border-border"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <textarea
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="What happened?"
                rows={3}
                className="w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none mb-4"
              />

              <button
                onClick={handleLogSubmit}
                disabled={!followedChoice}
                className="w-full h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Save outcome
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default DecisionJournal;

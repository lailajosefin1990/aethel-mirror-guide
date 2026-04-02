import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal } from "lucide-react";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { toast } from "sonner";
import { db } from "@/lib/db";

export interface JournalEntry {
  id: string;
  domain: string;
  date: string;
  thirdWay: string;
  question: string;
  createdAt?: string;
  outcome?: {
    followed: "yes" | "no" | "partially";
    note: string;
  };
}

interface DecisionJournalProps {
  entries: JournalEntry[];
  onUpdateEntry: (id: string, outcome: JournalEntry["outcome"], consentToShare?: boolean) => void;
  onDeleteEntry?: (id: string) => void;
  onStartReading: () => void;
  loading?: boolean;
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

const DecisionJournal = ({ entries: propEntries, onUpdateEntry, onDeleteEntry, onStartReading, loading }: DecisionJournalProps) => {
  const entries = propEntries.length > 0 ? propEntries : SAMPLE_ENTRIES;
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const domains = useMemo(() => [...new Set(entries.map((e) => e.domain))], [entries]);
  const filtered = filterDomain ? entries.filter((e) => e.domain === filterDomain) : entries;
  const openEntries = filtered.filter((e) => !e.outcome);
  const closedEntries = filtered.filter((e) => e.outcome);

  const patternInsight = useMemo(() => {
    if (closedEntries.length < 3) {
      return "Keep logging outcomes — after a few more, your patterns will emerge here.";
    }

    const closedByDomain: Record<string, number> = {};
    const openByDomain: Record<string, number> = {};

    closedEntries.forEach((e) => {
      closedByDomain[e.domain] = (closedByDomain[e.domain] || 0) + 1;
    });
    openEntries.forEach((e) => {
      openByDomain[e.domain] = (openByDomain[e.domain] || 0) + 1;
    });

    const topClosedDomain = Object.entries(closedByDomain).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topOpenDomain = Object.entries(openByDomain).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (!topOpenDomain || topClosedDomain === topOpenDomain) {
      return `Your mirror sees a strong focus on ${topClosedDomain}. Patterns across domains will emerge as you explore more areas.`;
    }

    return `You tend to act quickly on ${topClosedDomain} readings and sit longer with ${topOpenDomain} ones.`;
  }, [closedEntries, openEntries]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sheetEntryId, setSheetEntryId] = useState<string | null>(null);
  const [followedChoice, setFollowedChoice] = useState<"yes" | "no" | "partially" | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [consentToShare, setConsentToShare] = useState(false);

  useEffect(() => {
    trackEvent(EVENTS.JOURNAL_VIEWED);
  }, []);

  const displayedEntries = tab === "open" ? openEntries : closedEntries;

  if (loading) {
    return (
      <section className="pt-8 pb-4">
        <div className="h-5 w-48 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-md p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }


  const handleLogSubmit = async () => {
    if (!sheetEntryId || !followedChoice) return;
    try {
      trackEvent(EVENTS.OUTCOME_SUBMITTED, { followed: followedChoice, has_text: outcomeNote.length > 0, consent_to_share: consentToShare });
      await onUpdateEntry(sheetEntryId, { followed: followedChoice, note: outcomeNote }, consentToShare);
      setSheetEntryId(null);
      setFollowedChoice(null);
      setOutcomeNote("");
      setConsentToShare(false);
    } catch (err) {
      console.error("Outcome logging failed:", err);
      toast.error("Couldn't save your outcome. Please try again.");
    }
  };

  return (
    <section className="pt-8 pb-4">
      {/* Header */}
      <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-8">
        Y O U R &nbsp; M I R R O R &nbsp; J O U R N E Y
      </p>

      {/* Domain filter pills */}
      {domains.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button onClick={() => setFilterDomain(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-body border transition-colors ${
              !filterDomain ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>All</button>
          {domains.map((d) => (
            <button key={d} onClick={() => setFilterDomain(d)}
              className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-body border transition-colors ${
                filterDomain === d ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}>{d}</button>
          ))}
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    {entry.createdAt && !entry.outcome && (() => {
                      const daysSince = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      const timeText = daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`;
                      return <span className="font-body text-[11px] text-muted-foreground">{timeText}</span>;
                    })()}
                    <span className="font-body text-[11px] text-muted-foreground">
                      {entry.date}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === entry.id ? null : entry.id); }}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      {menuOpen === entry.id && (
                        <div className="absolute right-0 top-7 z-20 bg-card border border-border rounded-md shadow-lg py-1 min-w-[140px]">
                          {entry.outcome && (
                            <button
                              onClick={() => { setMenuOpen(null); setSheetEntryId(entry.id); setFollowedChoice(entry.outcome!.followed); setOutcomeNote(entry.outcome!.note); }}
                              className="w-full text-left px-3 py-2 font-body text-[13px] text-foreground hover:bg-muted transition-colors"
                            >
                              Edit outcome
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              setMenuOpen(null);
                              if (!confirm("Remove this entry?")) return;
                              try {
                                const { error } = await supabase.from("readings").delete().eq("id", entry.id);
                                if (error) throw error;
                                onDeleteEntry?.(entry.id);
                                toast.success("Entry removed");
                                trackEvent(EVENTS.JOURNAL_ENTRY_DELETED);
                              } catch {
                                toast.error("Couldn't delete entry");
                              }
                            }}
                            className="w-full text-left px-3 py-2 font-body text-[13px] text-destructive hover:bg-muted transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
                    onClick={() => { trackEvent(EVENTS.OUTCOME_LOG_OPENED, { reading_id: entry.id }); setSheetEntryId(entry.id); }}
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
            {patternInsight}
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
                className="w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none mb-3"
              />

              <label className="flex items-start gap-2.5 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={consentToShare}
                  onChange={(e) => setConsentToShare(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary shrink-0"
                />
                <span className="font-body text-[12px] text-muted-foreground leading-relaxed">
                  Share this anonymously to help others trust their mirror
                </span>
              </label>

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

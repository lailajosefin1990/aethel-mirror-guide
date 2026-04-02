import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { motion, AnimatePresence } from "framer-motion";
import { type JournalEntry } from "./DecisionJournal";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface DailyNudgeProps {
  journalEntries: JournalEntry[];
  onNewReading: () => void;
  onRevisitDecision: () => void;
  subscriptionTier?: string;
  remainingReadings?: number;
  onUpgrade?: () => void;
  hasBirthTime?: boolean;
  loading?: boolean;
}

const nudges = [
  {
    transit: "The Moon moves into Taurus today, grounding scattered energy. Your body knows the answer before your mind catches up. Pay attention to what feels heavy and what feels light.",
    nudge: "Before making any decision today, take three slow breaths and notice where your body tenses.",
  },
  {
    transit: "Mercury squares Neptune this morning — words may slip past their meaning. Miscommunication is likely, especially in text. Clarify before you commit.",
    nudge: "Re-read your last important message before sending. Say it simpler.",
  },
  {
    transit: "Venus enters your house of values. What you want and what you need are starting to align, but only if you stop performing for other people's timelines.",
    nudge: "Name one thing you're doing for someone else's approval. Then set it down for today.",
  },
  {
    transit: "Mars trine Jupiter brings a burst of momentum — but it's not a sprint. The energy favours the long game, not the quick fix. Build something that lasts past Friday.",
    nudge: "Take one action today that your future self will thank you for.",
  },
  {
    transit: "Saturn is holding your plans in place, not blocking them. The delay you're feeling is structural, not personal. Something needs to set before you pour the next layer.",
    nudge: "Write down what you're waiting for. Then ask: is it ready, or am I rushing?",
  },
  {
    transit: "The Sun opposes Pluto today — power dynamics are surfacing. You may feel the pull to control or be controlled. Neither is the move. The Third Way is honest transparency.",
    nudge: "Say one true thing you've been avoiding. Keep it to one sentence.",
  },
  {
    transit: "Jupiter sextile Uranus opens a window for unexpected insight. The answer you've been looking for might come from a direction you weren't watching. Stay loose.",
    nudge: "Talk to someone outside your usual circle today. Fresh perspective is closer than you think.",
  },
];

const weeklyOptions = [
  { emoji: "🌑", label: "Foggy" },
  { emoji: "🌓", label: "Clearer" },
  { emoji: "🌕", label: "Clear" },
];

const DailyNudge = ({ journalEntries, onNewReading, onRevisitDecision, subscriptionTier = "free", remainingReadings = 1, onUpgrade, hasBirthTime = false, loading }: DailyNudgeProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const today = new Date();
  const isSunday = today.getDay() === 0;
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const fallbackNudge = nudges[dayOfYear % nudges.length];

  const [transitNudge, setTransitNudge] = useState<{ transit: string; nudge: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadTransit = async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("transit_cache")
        .select("transit_headline, transit_detail")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (data) {
        setTransitNudge({
          transit: data.transit_headline,
          nudge: data.transit_detail,
        });
      }
    };
    loadTransit().catch(() => {
      toast.error("Couldn't load today's transit. Showing default nudge.");
    });
  }, [user]);

  const isPersonalised = !!transitNudge;
  const todayNudge = transitNudge || fallbackNudge;

  useEffect(() => {
    trackEvent(EVENTS.NUDGE_DISPLAYED, { type: isPersonalised ? "personalised" : "general" });
  }, [isPersonalised]);

  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const openDecisions = journalEntries.filter((e) => !e.outcome);
  const latestOpen = openDecisions.length > 0 ? openDecisions[0] : null;

  const [weeklyRating, setWeeklyRating] = useState<string | null>(null);
  const [weeklyLogged, setWeeklyLogged] = useState(false);

  const handleWeeklyRating = async (label: string) => {
    setWeeklyRating(label);
    setWeeklyLogged(true);
    trackEvent(EVENTS.WEEKLY_CHECKIN_COMPLETED, { rating: label });

    if (user) {
      try {
        await db.weeklyCheckins.save({
          user_id: user.id,
          rating: label,
          checked_in_at: new Date().toISOString(),
        });
        trackEvent(EVENTS.WEEKLY_CHECKIN_STORED, { rating: label });
      } catch (err) {
        Sentry.captureException(err);
      }
    }
  };

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3";

  const [showWelcome, setShowWelcome] = useState(() => {
    const key = `aethel_welcome_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  });

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  if (loading) {
    return (
      <section className="pt-8 pb-4 space-y-5">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="h-5 w-56 bg-muted rounded animate-pulse" />
        <div className="border border-border rounded-md p-5 bg-card space-y-4">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="border border-border rounded-md p-5 bg-card space-y-3">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section className="pt-8 pb-4">
      {/* Date */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="font-body text-[12px] tracking-[0.15em] text-muted-foreground mb-2"
      >
        {dateStr}
      </motion.p>

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="font-display text-[14px] tracking-[0.35em] text-primary mb-4"
      >
        A E T H E L &nbsp; M I R R O R &nbsp; · &nbsp; T O D A Y
      </motion.p>

      {/* Welcome back */}
      <AnimatePresence>
        {showWelcome && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-display text-[14px] text-primary/70 mb-4 italic"
          >
            {t("nudge_welcome")}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Prominent new reading button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        onClick={() => { trackEvent(EVENTS.NEW_READING_FROM_TOP); onNewReading(); }}
        className="w-full p-4 rounded-md border-2 border-dashed border-primary/30 hover:border-primary/60 text-primary font-body text-[14px] transition-all duration-200 mb-6"
      >
        {t("nudge_new_reading_btn")}
      </motion.button>

      {/* Main nudge card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
        aria-label="Today's nudge"
      >
        <p className={sectionLabel}>
          {isPersonalised
            ? t("nudge_your_transit")
            : t("nudge_todays_energy")}
        </p>
        <p className="font-display text-[16px] leading-[1.6] text-card-foreground mb-5">
          {todayNudge.transit}
        </p>

        <div className="border-t border-primary/30 pt-4">
          <p className={sectionLabel}>
            {t("nudge_little_nudge")}
          </p>
          <p className="font-display text-[15px] leading-[1.6] italic text-card-foreground/90">
            {todayNudge.nudge}
          </p>
        </div>

        {!isPersonalised && !hasBirthTime && (
          <p className="font-body text-[11px] text-muted-foreground italic mt-2">
            {t("nudge_birth_hint")}
          </p>
        )}
      </motion.div>

      {/* Open decision card */}
      {latestOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-card border border-border rounded-md p-5 mb-5"
          aria-label="Open decision to revisit"
        >
          <p className={sectionLabel}>
            {t("nudge_open_decision")}
          </p>
          <p className="font-display text-[15px] leading-[1.6] text-card-foreground line-clamp-2 mb-3">
            {latestOpen.thirdWay}
          </p>
          <button
            onClick={onRevisitDecision}
            className="font-body text-[13px] text-primary hover:text-primary/80 transition-colors duration-300"
          >
            {t("nudge_revisit")}
          </button>
        </motion.div>
      )}

      {/* Weekly check-in (Sundays only) */}
      {isSunday && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-card border border-border rounded-md p-5 mb-5"
        >
          <p className={sectionLabel}>
            {t("nudge_weekly_checkin")}
          </p>
          <p className="font-display text-[15px] leading-[1.6] text-card-foreground mb-4">
            {t("nudge_weekly_question")}
          </p>

          {weeklyLogged ? (
            <p className="font-body text-[13px] text-primary">
              {t("nudge_weekly_logged", { rating: weeklyRating })}
            </p>
          ) : (
            <div className="flex gap-2">
              {weeklyOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleWeeklyRating(opt.label)}
                  className="flex-1 py-3 rounded-sm border border-border bg-transparent hover:border-primary/40 transition-all duration-300 flex flex-col items-center gap-1"
                >
                  <span className="text-[20px]">{opt.emoji}</span>
                  <span className="font-body text-[11px] text-foreground/60">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Free tier banner */}
      {subscriptionTier === "free" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="bg-card border border-border rounded-md p-4 mb-4"
        >
          <p className="font-body text-[13px] text-muted-foreground text-center">
            {remainingReadings > 0
              ? t("nudge_remaining_one", { count: remainingReadings })
              : t("nudge_remaining_zero")}
            {" · "}
            <button onClick={onUpgrade} className="text-primary hover:text-primary/80 transition-colors">
              {t("nudge_upgrade")}
            </button>
          </p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5 text-center">{t("nudge_resets_monthly")}</p>
        </motion.div>
      )}

      {/* New reading CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="pt-2"
      >
        <button
          onClick={() => { trackEvent(EVENTS.NEW_READING_FROM_NUDGE); onNewReading(); }}
          className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300"
        >
          {t("nudge_new_reading")} →
        </button>
      </motion.div>
    </section>
  );
};

export default DailyNudge;

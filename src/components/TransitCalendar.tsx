import { useState, useEffect, useRef, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TransitEntry {
  id: string;
  date: string;
  traffic_light: "green" | "amber" | "red";
  transit_headline: string;
  transit_detail: string;
  moon_phase: string;
  linked_domain: string | null;
}

interface TransitCalendarProps {
  onRevisitDecision?: (domain: string) => void;
}

const TRAFFIC_DOTS: Record<string, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
};

const MOON_EMOJI: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

function getMoonEmoji(moonPhase: string): string {
  for (const [key, emoji] of Object.entries(MOON_EMOJI)) {
    if (moonPhase.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "🌙";
}

const TransitCalendar = ({ onRevisitDecision }: TransitCalendarProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transits, setTransits] = useState<TransitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stripRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    trackEvent(EVENTS.CALENDAR_VIEWED);

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-transit-calendar");
        if (error) throw error;
        if (data?.transits) {
          setTransits(data.transits as TransitEntry[]);
        }
      } catch (err) {
        Sentry.captureException(err);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const scrollToCard = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    trackEvent(EVENTS.CALENDAR_DAY_TAPPED, {
      date: dateStr,
      traffic_light: transits.find((t) => t.date === dateStr)?.traffic_light,
    });
    const el = cardRefs.current[dateStr];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [transits]);

  if (loading) {
    return (
      <section className="pt-8 pb-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
        <p className="font-body text-[14px] text-muted-foreground mb-1">{t("transit_loading")}</p>
        <p className="font-body text-[12px] text-muted-foreground/60">{t("transit_loading_detail")}</p>
      </section>
    );
  }

  if (transits.length === 0) {
    return (
      <section className="pt-8 pb-4 text-center py-12">
        <p className="font-display text-[16px] text-foreground/70 mb-2">{t("transit_empty_title")}</p>
        <p className="font-body text-[13px] text-muted-foreground">{t("transit_empty_detail")}</p>
      </section>
    );
  }

  return (
    <section className="pt-8 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-2">
          {t("transit_heading")}
        </p>
        <p className="font-body text-[13px] text-muted-foreground">
          {t("transit_subtitle")}
        </p>
      </motion.div>

      {/* Horizontal date strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {transits.map((tr) => {
            const d = new Date(tr.date + "T00:00:00");
            const isToday = tr.date === todayStr;
            const isSelected = tr.date === selectedDate;
            return (
              <button
                key={tr.date}
                onClick={() => scrollToCard(tr.date)}
                className={`shrink-0 flex flex-col items-center gap-1 rounded-md px-2.5 py-2 transition-all duration-200 ${
                  isToday
                    ? "bg-primary/15 border border-primary/30 min-w-[48px]"
                    : isSelected
                    ? "bg-card border border-border"
                    : "bg-transparent border border-transparent hover:bg-card/50"
                }`}
              >
                <span className="font-body text-[10px] text-muted-foreground uppercase">
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span
                  className={`font-body text-[14px] ${
                    isToday ? "text-primary font-semibold" : "text-foreground"
                  }`}
                >
                  {d.getDate()}
                </span>
                <span className={`w-2 h-2 rounded-full ${TRAFFIC_DOTS[tr.traffic_light]}`} />
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Day cards */}
      <div className="space-y-4 pb-20">
        {transits.map((tr, i) => {
          const d = new Date(tr.date + "T00:00:00");
          const isToday = tr.date === todayStr;
          const moonEmoji = getMoonEmoji(tr.moon_phase);

          return (
            <motion.div
              key={tr.date}
              ref={(el) => { cardRefs.current[tr.date] = el; }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.5) }}
              className={`bg-card border rounded-md p-5 ${
                isToday ? "border-primary/40" : "border-border"
              }`}
            >
              {/* Date line */}
              <div className="flex items-center justify-between mb-3">
                <p className="font-body text-[13px] text-foreground font-medium">
                  {d.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-sm bg-primary/15 font-body text-[10px] uppercase tracking-wider text-primary">
                    {t("transit_today")}
                  </span>
                )}
              </div>

              {/* Moon phase */}
              <span className="inline-block px-2.5 py-1 rounded-full bg-muted font-body text-[11px] text-muted-foreground mb-3">
                {moonEmoji} {tr.moon_phase}
              </span>

              {/* Traffic light + headline */}
              <div className="flex items-start gap-2.5 mb-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TRAFFIC_DOTS[tr.traffic_light]}`}
                />
                <p className="font-display text-[15px] leading-[1.5] text-card-foreground font-medium">
                  {tr.transit_headline}
                </p>
              </div>

              {/* Detail */}
              <p className="font-body text-[13px] leading-[1.6] text-muted-foreground mb-3 pl-5">
                {tr.transit_detail}
              </p>

              {/* Linked decision */}
              {tr.linked_domain && (
                <button
                  onClick={() => {
                    trackEvent(EVENTS.CALENDAR_DECISION_LINK_TAPPED);
                    onRevisitDecision?.(tr.linked_domain!);
                  }}
                  className="flex items-center gap-2 pl-5"
                >
                  <span className="px-2 py-0.5 rounded-sm bg-primary/15 font-body text-[11px] uppercase tracking-wider text-primary">
                    {t("transit_relevant", { domain: tr.linked_domain })}
                  </span>
                  <span className="font-body text-[12px] text-primary hover:text-primary/80 transition-colors">
                    {t("transit_revisit")}
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TransitCalendar;

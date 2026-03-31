import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/posthog";
import { Loader2 } from "lucide-react";

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
  const { user } = useAuth();
  const [transits, setTransits] = useState<TransitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stripRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    track("calendar_viewed");

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-transit-calendar");
        if (error) throw error;
        if (data?.transits) {
          setTransits(data.transits as TransitEntry[]);
        }
      } catch (err) {
        console.error("Calendar load error:", err);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const scrollToCard = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    track("calendar_day_tapped", {
      date: dateStr,
      traffic_light: transits.find((t) => t.date === dateStr)?.traffic_light,
    });
    const el = cardRefs.current[dateStr];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [transits]);

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3";

  if (loading) {
    return (
      <section className="pt-8 pb-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
        <p className="font-body text-[14px] text-muted-foreground mb-1">Generating your calendar...</p>
        <p className="font-body text-[12px] text-muted-foreground/60">This may take a moment on first load.</p>
      </section>
    );
  }

  if (transits.length === 0) {
    return (
      <section className="pt-8 pb-4 text-center">
        <p className="font-body text-[14px] text-muted-foreground">
          Couldn't load your calendar. Please try again later.
        </p>
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
          Y O U R &nbsp; 3 0 &nbsp; D A Y S
        </p>
        <p className="font-body text-[13px] text-muted-foreground">
          Personalised to your chart.
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
          {transits.map((t) => {
            const d = new Date(t.date + "T00:00:00");
            const isToday = t.date === todayStr;
            const isSelected = t.date === selectedDate;
            return (
              <button
                key={t.date}
                onClick={() => scrollToCard(t.date)}
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
                <span className={`w-2 h-2 rounded-full ${TRAFFIC_DOTS[t.traffic_light]}`} />
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Day cards */}
      <div className="space-y-4 pb-20">
        {transits.map((t, i) => {
          const d = new Date(t.date + "T00:00:00");
          const isToday = t.date === todayStr;
          const moonEmoji = getMoonEmoji(t.moon_phase);

          return (
            <motion.div
              key={t.date}
              ref={(el) => { cardRefs.current[t.date] = el; }}
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
                    Today
                  </span>
                )}
              </div>

              {/* Moon phase */}
              <span className="inline-block px-2.5 py-1 rounded-full bg-muted font-body text-[11px] text-muted-foreground mb-3">
                {moonEmoji} {t.moon_phase}
              </span>

              {/* Traffic light + headline */}
              <div className="flex items-start gap-2.5 mb-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TRAFFIC_DOTS[t.traffic_light]}`}
                />
                <p className="font-display text-[15px] leading-[1.5] text-card-foreground font-medium">
                  {t.transit_headline}
                </p>
              </div>

              {/* Detail */}
              <p className="font-body text-[13px] leading-[1.6] text-muted-foreground mb-3 pl-5">
                {t.transit_detail}
              </p>

              {/* Linked decision */}
              {t.linked_domain && (
                <button
                  onClick={() => {
                    track("calendar_decision_link_tapped");
                    onRevisitDecision?.(t.linked_domain!);
                  }}
                  className="flex items-center gap-2 pl-5"
                >
                  <span className="px-2 py-0.5 rounded-sm bg-primary/15 font-body text-[11px] uppercase tracking-wider text-primary">
                    Relevant to: {t.linked_domain}
                  </span>
                  <span className="font-body text-[12px] text-primary hover:text-primary/80 transition-colors">
                    Revisit this decision →
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

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CalendarIcon, Clock, ChevronDown, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { track } from "@/lib/posthog";
import { useTranslation } from "react-i18next";

export interface BirthData {
  date: Date;
  time: string | null;
  unknownTime: boolean;
  birthPlace: string;
}

interface BirthCoordinatesProps {
  onSubmit: (data: BirthData) => void;
  onBack: () => void;
}

const BirthCoordinates = ({ onSubmit, onBack }: BirthCoordinatesProps) => {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [birthPlace, setBirthPlace] = useState("");
  const [warningExpanded, setWarningExpanded] = useState(false);

  const isValid = date !== undefined && birthPlace.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !date) return;
    track("birth_data_submitted", { has_birth_time: !unknownTime });
    onSubmit({
      date,
      time: unknownTime ? null : time || null,
      unknownTime,
      birthPlace,
    });
  };

  const inputClass =
    "w-full h-12 px-4 rounded-sm bg-card text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300";

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={onBack}
          className="mb-10 text-foreground/50 hover:text-foreground/70 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </motion.button>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-[14px] tracking-[0.4em] text-primary mb-4"
        >
          {t("birth_heading")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-body text-[14px] text-muted-foreground leading-relaxed mb-10"
        >
          {t("birth_subtitle")}
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Date of birth */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_date_label")}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    inputClass,
                    "flex items-center justify-between text-left",
                    !date && "text-muted-foreground"
                  )}
                >
                  <span>{date ? format(date, "dd/MM/yyyy") : "dd/mm/yyyy"}</span>
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time of birth */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_time_label")}
            </label>
            <div className="relative">
              <input
                type="time"
                value={unknownTime ? "" : time}
                onChange={(e) => setTime(e.target.value)}
                disabled={unknownTime}
                placeholder="HH:MM"
                className={cn(
                  inputClass,
                  "pr-10",
                  unknownTime && "opacity-40 cursor-not-allowed"
                )}
              />
              <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Unknown time toggle */}
            <button
              type="button"
              onClick={() => setUnknownTime(!unknownTime)}
              className="flex items-center gap-2.5 mt-1"
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-sm border transition-all duration-300 flex items-center justify-center",
                  unknownTime
                    ? "bg-primary border-primary"
                    : "border-border bg-transparent"
                )}
              >
                {unknownTime && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="hsl(226,50%,7%)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="font-body text-[13px] text-foreground/60">
                {t("birth_unknown_time")}
              </span>
            </button>

            {/* Warning card when unknown time toggled */}
            <AnimatePresence>
              {unknownTime && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="font-body text-[12px] text-muted-foreground ml-6.5 italic mb-2">
                    {t("birth_solar_noon")}
                  </p>

                  {/* Expandable warning card */}
                  <div className="border border-amber-500/40 bg-amber-500/5 rounded-md p-4 ml-0">
                    <button
                      type="button"
                      onClick={() => setWarningExpanded(!warningExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="font-body text-[13px] text-amber-400/90 font-medium">
                        ⚠ Why birth time matters
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-amber-400/70 transition-transform duration-200",
                          warningExpanded && "rotate-180"
                        )}
                        strokeWidth={1.5}
                      />
                    </button>
                    <AnimatePresence>
                      {warningExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="font-body text-[12px] text-foreground/60 leading-relaxed mt-3 whitespace-pre-line">
                            {t("birth_time_warning")}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Find birth time link */}
                  <a
                    href="https://www.gov.uk/order-copy-birth-certificate"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-3 ml-0 font-body text-[13px] text-primary hover:text-primary/80 transition-colors"
                  >
                    {t("birth_find_time")}
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Birth place */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_place_label")}
            </label>
            <input
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="City, Country"
              className={inputClass}
            />
          </div>

          {/* CTA */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!isValid}
              className="w-full h-[52px] rounded-sm font-body font-medium text-[14px] tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:brightness-110"
            >
              {t("birth_cta")}
            </button>
          </div>

          {/* Privacy note */}
          <p className="font-body text-[12px] text-foreground/50 text-center pt-2">
            {t("birth_privacy")}
          </p>
        </motion.form>
      </div>
    </section>
  );
};

export default BirthCoordinates;

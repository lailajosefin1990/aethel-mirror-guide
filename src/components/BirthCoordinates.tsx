import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/posthog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DrumRoller from "@/components/DrumRoller";
import LocationAutocomplete, { type LocationResult } from "@/components/LocationAutocomplete";

export interface BirthData {
  date: Date;
  time: string | null;
  unknownTime: boolean;
  birthPlace: string;
  birthLat?: number;
  birthLng?: number;
  birthTimezone?: string;
}

interface BirthCoordinatesProps {
  onSubmit: (data: BirthData) => void;
  onBack: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const BIRTH_TIME_HELP: Record<string, { text: string; url: string }> = {
  GB: { text: "Order your birth certificate (UK)", url: "https://www.gov.uk/order-copy-birth-death-marriage-certificate" },
  US: { text: "Request your birth record (US)", url: "https://www.cdc.gov/nchs/w2w/index.htm" },
  ES: { text: "Solicitar certificado de nacimiento", url: "https://www.mjusticia.gob.es/es/ciudadania/tramites/certificado-nacimiento" },
  DEFAULT: { text: "How to find your birth time", url: "https://astro.com/faq/fq_faq_birthtimee.htm" },
};

const BirthCoordinates = ({ onSubmit, onBack }: BirthCoordinatesProps) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [day, setDay] = useState<number>(15);
  const [month, setMonth] = useState<number>(6);
  const [year, setYear] = useState<number>(1995);
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [unknownTime, setUnknownTime] = useState(false);
  const [warningExpanded, setWarningExpanded] = useState(false);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [locationName, setLocationName] = useState("");

  const maxDay = daysInMonth(month, year);

  // Day items
  const dayItems = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => ({
      value: i + 1,
      label: String(i + 1).padStart(2, "0"),
      disabled: i + 1 > maxDay,
    }));
  }, [maxDay]);

  // Month items
  const monthItems = useMemo(() => {
    return MONTHS.map((name, i) => ({
      value: i + 1,
      label: name,
    }));
  }, []);

  // Year items
  const yearItems = useMemo(() => {
    const items = [];
    for (let y = 1920; y <= currentYear; y++) {
      items.push({ value: y, label: String(y) });
    }
    return items;
  }, [currentYear]);

  // Hour items
  const hourItems = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: String(i).padStart(2, "0"),
    }));
  }, []);

  // Minute items (1-min intervals)
  const minuteItems = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      value: i,
      label: String(i).padStart(2, "0"),
    }));
  }, []);

  // Clamp day if month/year changes
  const effectiveDay = Math.min(day, maxDay);

  const isValid = location !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !location) return;

    const date = new Date(year, month - 1, effectiveDay);
    const timeStr = unknownTime ? null : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    track("birth_data_submitted", { has_birth_time: !unknownTime });

    onSubmit({
      date,
      time: timeStr,
      unknownTime,
      birthPlace: location.name,
      birthLat: location.lat,
      birthLng: location.lng,
      birthTimezone: location.timezone,
    });
  };

  const handleLocationChange = (loc: LocationResult) => {
    setLocation(loc);
    setLocationName(loc.name);
  };

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => { toast("Your question is saved", { duration: 2000 }); onBack(); }}
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
          {/* Date of birth — Drum Roller */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_date_label")}
            </label>
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-border">
                <DrumRoller
                  items={dayItems}
                  value={effectiveDay}
                  onChange={(v) => setDay(v as number)}
                />
                <DrumRoller
                  items={monthItems}
                  value={month}
                  onChange={(v) => setMonth(v as number)}
                />
                <DrumRoller
                  items={yearItems}
                  value={year}
                  onChange={(v) => setYear(v as number)}
                />
              </div>
            </div>
          </div>

          {/* Time of birth — Drum Roller */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_time_label")}
            </label>
            <div
              className={cn(
                "bg-card border border-border rounded-md overflow-hidden transition-opacity duration-300",
                unknownTime && "opacity-30 pointer-events-none"
              )}
            >
              <div className="grid grid-cols-2 divide-x divide-border">
                <DrumRoller
                  items={hourItems}
                  value={hour}
                  onChange={(v) => setHour(v as number)}
                  height={160}
                />
                <DrumRoller
                  items={minuteItems}
                  value={minute}
                  onChange={(v) => setMinute(v as number)}
                  height={160}
                />
              </div>
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

            {/* Warning when unknown time */}
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

                  <div className="border border-amber-500/40 bg-amber-500/5 rounded-md p-4 ml-0">
                    <button
                      type="button"
                      onClick={() => setWarningExpanded(!warningExpanded)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="font-body text-[13px] text-amber-400/90 font-medium">
                        ⚠ {t("birth_time_why") || "Why birth time matters"}
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

                  {(() => {
                    const locale = navigator.language?.split("-")[1]?.toUpperCase() || "DEFAULT";
                    const helpLink = BIRTH_TIME_HELP[locale] || BIRTH_TIME_HELP.DEFAULT;
                    return (
                      <a
                        href={helpLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-3 ml-0 font-body text-[13px] text-primary hover:text-primary/80 transition-colors"
                      >
                        {helpLink.text}
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Birth place — Smart Autocomplete */}
          <div className="space-y-2">
            <label className="font-body text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
              {t("birth_place_label")}
            </label>
            <LocationAutocomplete
              value={locationName}
              onChange={handleLocationChange}
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

          <p className="font-body text-[12px] text-foreground/50 text-center pt-2">
            {t("birth_privacy")}
          </p>
        </motion.form>
      </div>
    </section>
  );
};

export default BirthCoordinates;

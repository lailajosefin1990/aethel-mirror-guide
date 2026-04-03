import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  lifePathNumber,
  personalYear,
  sunGateFromDate,
  geneKeyFromGate,
} from "@/lib/calculators";

function getSunSign(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Aries";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Taurus";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return "Gemini";
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return "Cancer";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Leo";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Virgo";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return "Libra";
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return "Scorpio";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Sagittarius";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Capricorn";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Aquarius";
  return "Pisces";
}

function getTodayTransitEnergy(date: Date): string {
  const day = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const energies = [
    "Mercury is in a communicative phase — good for negotiations and honest conversations.",
    "Venus is amplifying connection energy — relationships and creative work are favoured.",
    "Mars is lending directness — action over deliberation today.",
    "Jupiter's expansive energy supports big-picture thinking and bold moves.",
    "Saturn asks for structure — commit to one strategy, not three.",
    "The moon phase favours planting seeds, not harvesting results.",
    "Uranus is electrifying change — stay open to unexpected paths.",
  ];
  return energies[day % energies.length];
}

interface TransitPreviewProps {
  birthDate?: Date | null;
}

const TransitPreview = ({ birthDate }: TransitPreviewProps) => {
  const { t } = useTranslation();
  const today = new Date();

  const data = useMemo(() => {
    const currentSunSign = getSunSign(today);
    const transitEnergy = getTodayTransitEnergy(today);

    if (birthDate) {
      const sunSign = getSunSign(birthDate);
      const lifePath = lifePathNumber(birthDate);
      const persYear = personalYear(birthDate);
      const gate = sunGateFromDate(birthDate);
      const geneKey = geneKeyFromGate(gate);

      return {
        personalised: true,
        sunSign,
        lifePath,
        personalYear: persYear,
        geneKey,
        transitEnergy,
        currentSunSign,
      };
    }

    return { personalised: false, transitEnergy, currentSunSign };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-app mx-auto px-5 mb-6"
    >
      <div className="rounded-md border border-primary/20 bg-card/50 p-5 space-y-4">
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-primary/60">
          {data.personalised
            ? t("transit_preview_your_systems")
            : t("transit_preview_todays_energy")}
        </p>

        <p className="font-body text-[13px] text-muted-foreground leading-relaxed italic">
          {data.transitEnergy}
        </p>

        <div className="flex items-center gap-2">
          <span className="font-body text-[11px] text-muted-foreground/60">
            ☉ Sun in
          </span>
          <span className="font-display text-[13px] text-foreground">
            {data.currentSunSign}
          </span>
        </div>

        {data.personalised && (
          <>
            <div className="h-px bg-border my-2" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-body text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Your sun sign
                </p>
                <p className="font-display text-[14px] text-foreground">
                  {data.sunSign}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Life path
                </p>
                <p className="font-display text-[14px] text-foreground">
                  {data.lifePath}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Personal year
                </p>
                <p className="font-display text-[14px] text-foreground">
                  {data.personalYear}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  Gene Key gift
                </p>
                <p className="font-display text-[14px] text-foreground">
                  {data.geneKey?.gift}
                </p>
              </div>
            </div>
            <p className="font-body text-[11px] text-muted-foreground/40 italic mt-1">
              {t("transit_preview_add_birth")}
            </p>
          </>
        )}

        {!data.personalised && (
          <p className="font-body text-[11px] text-muted-foreground/40 italic">
            {t("transit_preview_generic_hint")}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default TransitPreview;

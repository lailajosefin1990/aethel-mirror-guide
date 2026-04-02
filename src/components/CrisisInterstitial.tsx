import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { useTranslation } from "react-i18next";

interface CrisisInterstitialProps {
  onReturn: () => void;
}

const CRISIS_RESOURCES: Record<string, { name: string; phone?: string; text?: string; url: string }[]> = {
  GB: [
    { name: "Samaritans", phone: "116 123", url: "https://www.samaritans.org" },
    { name: "SHOUT", text: "Text SHOUT to 85258", url: "https://giveusashout.org" },
  ],
  US: [
    { name: "988 Suicide & Crisis Lifeline", phone: "988", url: "https://988lifeline.org" },
    { name: "Crisis Text Line", text: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  ],
  ES: [
    { name: "Teléfono de la Esperanza", phone: "717 003 717", url: "https://www.telefonodelaesperanza.org" },
    { name: "Línea de Atención a la Conducta Suicida", phone: "024", url: "https://www.sanidad.gob.es" },
  ],
  SE: [
    { name: "Mind Självmordslinjen", phone: "90101", url: "https://mind.se" },
  ],
  FR: [
    { name: "SOS Amitié", phone: "09 72 39 40 50", url: "https://www.sos-amitie.com" },
  ],
  BR: [
    { name: "CVV", phone: "188", url: "https://www.cvv.org.br" },
  ],
  DEFAULT: [
    { name: "Find a helpline near you", url: "https://findahelpline.com" },
    { name: "International Association for Suicide Prevention", url: "https://www.iasp.info/resources/Crisis_Centres/" },
  ],
};

const CrisisInterstitial = ({ onReturn }: CrisisInterstitialProps) => {
  const { t } = useTranslation();
  const locale = navigator.language?.split("-")[1]?.toUpperCase() || "DEFAULT";
  const localResources = CRISIS_RESOURCES[locale] || [];
  const defaultResources = CRISIS_RESOURCES.DEFAULT;
  const resources = locale !== "DEFAULT" && localResources.length > 0
    ? [...localResources, ...defaultResources]
    : defaultResources;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-5 overflow-y-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md text-center"
      >
        <Heart className="w-8 h-8 text-primary mx-auto mb-6" />

        <h2 className="font-display text-2xl text-foreground mb-4">{t("crisis_heading")}</h2>
        <p className="font-body text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
          {t("crisis_body")}
        </p>

        <div className="space-y-3 mb-8">
          {resources.map((r, i) => (
            <a
              key={i}
              href={r.phone ? `tel:${r.phone.replace(/\s/g, "")}` : r.url}
              target={r.phone ? undefined : "_blank"}
              rel="noopener"
              onClick={() => trackEvent(EVENTS.CRISIS_RESOURCE_TAPPED, { resource: r.name, type: r.phone ? "phone" : "text_or_web" })}
              className="block w-full p-4 rounded-md border border-border hover:border-primary/40 transition-colors text-left"
            >
              <p className="font-display text-[16px] text-foreground">{r.name}</p>
              {r.phone && <p className="font-body text-[14px] text-primary mt-1">{r.phone}</p>}
              {r.text && <p className="font-body text-[13px] text-muted-foreground mt-1">{r.text}</p>}
            </a>
          ))}
        </div>

        <p className="font-body text-xs text-muted-foreground mb-6 italic">
          {t("crisis_footer")}
        </p>

        <button
          onClick={onReturn}
          className="w-full h-[48px] rounded-sm border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300"
        >
          {t("crisis_return")}
        </button>
      </motion.div>
    </div>
  );
};

export default CrisisInterstitial;

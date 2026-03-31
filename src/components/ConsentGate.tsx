import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ConsentGateProps {
  onAccept: () => void;
}

const ConsentGate = ({ onAccept }: ConsentGateProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [age, setAge] = useState(false);
  const [guidance, setGuidance] = useState(false);
  const [terms, setTerms] = useState(false);

  const allChecked = age && guidance && terms;

  const handleLanguageChange = async (lang: string) => {
    if (user) {
      await supabase.from("profiles").update({ preferred_language: lang }).eq("user_id", user.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-5">
      <div className="absolute top-6 right-6">
        <LanguageSelector onLanguageChange={handleLanguageChange} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-3">
          {t("consent_heading")}
        </p>
        <p className="font-body text-sm text-muted-foreground mb-8">
          {t("consent_subtitle")}
        </p>

        <div className="space-y-5 mb-10">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={age}
              onCheckedChange={(c) => setAge(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              {t("consent_age")}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={guidance}
              onCheckedChange={(c) => setGuidance(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              {t("consent_guidance")}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={terms}
              onCheckedChange={(c) => setTerms(!!c)}
              className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="font-body text-sm text-foreground/80">
              {t("consent_terms")}{" "}
              <Link to="/privacy" className="text-primary hover:underline">{t("consent_privacy_link")}</Link>
              {" "}&{" "}
              <Link to="/terms" className="text-primary hover:underline">{t("consent_terms_link")}</Link>
            </span>
          </label>
        </div>

        <button
          onClick={onAccept}
          disabled={!allChecked}
          className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body text-[14px] tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-300"
        >
          {t("consent_cta")}
        </button>
      </motion.div>
    </div>
  );
};

export default ConsentGate;

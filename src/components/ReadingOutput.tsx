import { useState, useCallback, useEffect, useRef } from "react";
import * as Sentry from "@sentry/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Download, Link2, Share2, X } from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import type { ReadingData } from "@/lib/reading";
import { CONFIDENCE_MESSAGES } from "@/lib/reading";
import { generateThirdWayCard } from "@/lib/cardGenerator";
import { useAuth } from "@/hooks/useAuth";
import useOgImage from "@/hooks/useOgImage";
import { toast } from "sonner";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { useTranslation } from "react-i18next";

interface ReadingOutputProps {
  domain: string;
  question: string;
  reading: ReadingData | null;
  onSave: () => void;
  onBack: () => void;
  onRegenerate?: (feedbackText?: string) => void;
  regenerationCount?: number;
  birthTimeUnknown?: boolean;
}

const ExpandableText = ({ text }: { text: string }) => (
  <p className="font-display text-[16px] leading-[1.6] text-foreground">{text}</p>
);

const ExpandableBullet = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-primary mt-1 shrink-0">—</span>
    <span className="font-display text-[16px] leading-[1.6] text-foreground">
      {text.replace(/^—\s*/, "")}
    </span>
  </div>
);

const ReadingOutput = ({ domain, question, reading, onSave, onBack, onRegenerate, regenerationCount = 0, birthTimeUnknown = false }: ReadingOutputProps) => {
  const { t } = useTranslation();
  const { subscriptionTier } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reaction, setReaction] = useState<"positive" | "negative" | null>(null);
  const [saved, setSaved] = useState(false);
  const thirdWayRef = useRef<HTMLDivElement>(null);

  const isPro = subscriptionTier === "mirror_pro" || subscriptionTier === "practitioner";

  // Track reading loaded
  useEffect(() => {
    if (reading) {
      trackEvent(EVENTS.READING_LOADED, { confidence_level: reading.confidence_level });
    }
  }, [reading]);

  // Track Third Way scroll into view
  useEffect(() => {
    const el = thirdWayRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackEvent(EVENTS.THIRD_WAY_READ);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reading]);

  // Set OG image meta tags for social sharing
  useOgImage({ thirdWay: reading?.third_way || "", domain });

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.35em] text-muted-foreground mb-4";

  const handleShare = useCallback(async () => {
    if (!reading) return;
    setGenerating(true);
    trackEvent(EVENTS.SHARE_CARD_OPENED, { is_pro: isPro });
    try {
      const blob = await generateThirdWayCard(reading.third_way, domain, isPro);
      setCardBlob(blob);
      const url = URL.createObjectURL(blob);
      setCardUrl(url);
      setShareOpen(true);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Failed to generate card");
    } finally {
      setGenerating(false);
    }
  }, [reading, domain, isPro]);

  const handleDownload = useCallback(() => {
    if (!cardUrl || !cardBlob) return;
    trackEvent(EVENTS.SHARE_CARD_DOWNLOADED);
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = "aethel-third-way.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image downloaded");
  }, [cardUrl, cardBlob]);

  const handleCopyLink = useCallback(() => {
    if (!reading) return;
    const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-card?text=${encodeURIComponent(reading.third_way)}&domain=${encodeURIComponent(domain)}`;
    navigator.clipboard.writeText(ogUrl).then(() => {
      toast.success("Link copied to clipboard");
    });
  }, [reading, domain]);

  const handleNativeShare = useCallback(async () => {
    if (!cardBlob || !reading) return;
    try {
      const file = new File([cardBlob], "aethel-third-way.png", { type: "image/png" });
      await navigator.share({
        title: "My Third Way",
        text: "My Third Way from Aethel Mirror",
        files: [file],
      });
    } catch {
      // User cancelled or not supported — fall back to download
      handleDownload();
    }
  }, [cardBlob, reading, handleDownload]);

  if (!reading) return null;

  const confidenceText = CONFIDENCE_MESSAGES[reading.confidence_level] || CONFIDENCE_MESSAGES.medium;

  return (
    <section className="min-h-screen px-5 py-8">
      <div className="w-full max-w-app mx-auto">
        {/* Back */}
        <button onClick={onBack} className="mb-8 text-foreground/50 hover:text-foreground/70 transition-colors duration-300">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Domain breadcrumb */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
          className="font-body text-[11px] uppercase tracking-[0.2em] text-primary mb-10">
          {domain}
        </motion.p>

        {/* Stars section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-10">
          <p className={sectionLabel}>{t("reading_stars_label")}</p>
          <ExpandableText text={reading.astrology_reading} />
        </motion.div>

        {/* Design section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-10">
          <p className={sectionLabel}>{t("reading_design_label")}</p>
          <div className="space-y-4">
            {reading.design_insights.map((item, i) => (
              <ExpandableBullet key={i} text={item} />
            ))}
          </div>
          {birthTimeUnknown && (
            <p className="font-body text-[12px] italic text-muted-foreground mt-4">
              {t("birth_time_disclaimer")}
            </p>
          )}
        </motion.div>

        {/* Confidence */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="font-body text-[13px] italic text-primary/80 mb-10">
          {confidenceText}
        </motion.p>

        {/* Divider + Third Way */}
        <motion.div ref={thirdWayRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
          className="border-t-2 border-primary/40 pt-8 mb-10">
          <p className={`${sectionLabel} text-center`}>{t("reading_third_way_label")}</p>
          <p className="font-display text-[22px] sm:text-[24px] leading-[1.4] text-foreground text-center font-medium">
            {reading.third_way}
          </p>
        </motion.div>

        {/* Journal prompt */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card border border-border rounded-md p-5 mb-6">
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{t("reading_journal_label")}</p>
          <p className="font-display text-[16px] leading-[1.6] text-card-foreground">{reading.journal_prompt}</p>
        </motion.div>

        {/* Mirror disclaimer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}
          className="font-body text-[12px] italic text-foreground/50 text-center mb-2">
          {t("reading_mirror_disclaimer")}
        </motion.p>

        {/* Health disclaimer */}
        <p className="font-body text-[11px] text-muted-foreground/50 text-center mb-4">
          {t("reading_health_disclaimer")}
        </p>

        {/* Fallback banner */}
        {reading.is_fallback && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.48 }}
            className="font-body text-[11px] text-muted-foreground text-center mb-8">
            {t("reading_fallback_banner")}
          </motion.p>
        )}

        {/* Thumbs reaction */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.47 }}
          className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={() => { trackEvent(EVENTS.READING_REACTION, { reaction: "positive" }); setReaction("positive"); }}
            className={`p-2 rounded-full border transition-all duration-200 ${
              reaction === "positive" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>
            <span className="text-[16px]">👍</span>
          </button>
          <button
            onClick={() => { trackEvent(EVENTS.READING_REACTION, { reaction: "negative" }); setReaction("negative"); }}
            className={`p-2 rounded-full border transition-all duration-200 ${
              reaction === "negative" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}>
            <span className="text-[16px]">👎</span>
          </button>
        </motion.div>

        {!reading.is_fallback && <div className="mb-8" />}

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col gap-3 pb-10">
          <button
            onClick={() => {
              if (saved) return;
              setSaved(true);
              toast.success(t("reading_saved_toast"));
              trackEvent(EVENTS.READING_SAVED);
              onSave();
            }}
            disabled={saved}
            className={`w-full h-[52px] rounded-sm font-body font-medium text-[14px] tracking-wide transition-all duration-300 ${
              saved
                ? "bg-primary/60 text-primary-foreground cursor-default"
                : "bg-primary text-primary-foreground hover:brightness-110"
            }`}>
            {saved ? t("reading_saved_btn") : t("reading_save")}
          </button>

          {saved && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onBack}
              className="w-full h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300">
              {t("reading_go_mirror")}
            </motion.button>
          )}

          <VoicePlayer
            text={`${reading.astrology_reading}\n\n${reading.design_insights.join("\n")}\n\nYour Third Way: ${reading.third_way}\n\nJournal prompt: ${reading.journal_prompt}`}
          />

          {/* Share Third Way button */}
          <button onClick={handleShare} disabled={generating}
            className="w-full h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
            <Share2 className="w-4 h-4" strokeWidth={1.5} />
            {generating ? "Generating..." : t("reading_share")}
          </button>

          {regenerationCount >= 3 ? (
            <p className="font-body text-[13px] italic text-primary text-center py-3">
              {t("reading_regen_cap")}
            </p>
          ) : (
            <button onClick={() => setFeedbackOpen(true)}
              className="w-full h-[48px] rounded-sm bg-transparent border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300">
              {t("reading_doesnt_fit")}
            </button>
          )}
        </motion.div>
      </div>

      {/* Share card modal */}
      <AnimatePresence>
        {shareOpen && cardUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-app bg-card border-t border-border rounded-t-lg p-6 relative">
              <button onClick={() => { setShareOpen(false); if (cardUrl) URL.revokeObjectURL(cardUrl); }}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <p className="font-display text-[18px] text-card-foreground mb-4">{t("reading_your_card")}</p>

              {/* Card preview */}
              <div className="mb-5 rounded-md overflow-hidden border border-border">
                <img src={cardUrl} alt="Third Way card" className="w-full h-auto" />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleDownload}
                  className="flex-1 h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  Download
                </button>
                {typeof navigator.share === "function" ? (
                  <button onClick={handleNativeShare}
                    className="flex-1 h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300 flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                    Share
                  </button>
                ) : (
                  <button onClick={handleCopyLink}
                    className="flex-1 h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300 flex items-center justify-center gap-2">
                    <Link2 className="w-4 h-4" strokeWidth={1.5} />
                    Copy link
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback modal */}
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-5">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }} className="w-full max-w-app bg-card border border-border rounded-md p-6 relative">
              <button onClick={() => setFeedbackOpen(false)}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground/70 transition-colors">
                <ChevronDown className="w-4 h-4 rotate-45" strokeWidth={1.5} />
              </button>
              <p className="font-display text-[18px] text-card-foreground mb-2">{t("reading_feedback_title")}</p>
              <p className="font-body text-[13px] text-muted-foreground mb-4">{t("reading_feedback_subtitle")}</p>
              <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t("reading_feedback_placeholder")} rows={3}
                className="w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none mb-4" />
              <button onClick={() => { 
                  const feedback = feedbackText;
                  trackEvent(EVENTS.READING_REGENERATED, { regeneration_number: (regenerationCount || 0) + 1 }); 
                  setFeedbackOpen(false); 
                  setFeedbackText(""); 
                  onRegenerate?.(feedback); 
                }}
                className="w-full h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300">
                {t("reading_regenerate")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ReadingOutput;

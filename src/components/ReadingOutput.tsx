import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Lock, Download, Link2, Share2, X } from "lucide-react";
import type { ReadingData } from "@/lib/reading";
import { CONFIDENCE_MESSAGES } from "@/lib/reading";
import { generateThirdWayCard } from "@/lib/cardGenerator";
import { useAuth } from "@/hooks/useAuth";
import useOgImage from "@/hooks/useOgImage";
import { toast } from "sonner";
import { track } from "@/lib/posthog";

interface ReadingOutputProps {
  domain: string;
  question: string;
  reading: ReadingData | null;
  onSave: () => void;
  onBack: () => void;
  onRegenerate?: () => void;
  regenerationCount?: number;
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

const ReadingOutput = ({ domain, question, reading, onSave, onBack }: ReadingOutputProps) => {
  const { subscriptionTier } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const thirdWayRef = useRef<HTMLDivElement>(null);

  const isPro = subscriptionTier === "mirror_pro";

  // Track reading loaded
  useEffect(() => {
    if (reading) {
      track("reading_loaded", { confidence_level: reading.confidence_level });
    }
  }, [reading]);

  // Track Third Way scroll into view
  useEffect(() => {
    const el = thirdWayRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          track("third_way_read");
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
    if (!reading || !isPro) return;
    setGenerating(true);
    track("share_card_opened");
    try {
      const blob = await generateThirdWayCard(reading.third_way, domain);
      setCardBlob(blob);
      const url = URL.createObjectURL(blob);
      setCardUrl(url);
      setShareOpen(true);
    } catch (err) {
      console.error("Card generation error:", err);
      toast.error("Failed to generate card");
    } finally {
      setGenerating(false);
    }
  }, [reading, domain, isPro]);

  const handleDownload = useCallback(() => {
    if (!cardUrl || !cardBlob) return;
    track("share_card_downloaded");
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
          <p className={sectionLabel}>W H A T &nbsp; Y O U R &nbsp; S T A R S &nbsp; S A Y &nbsp; ( W H E N )</p>
          <ExpandableText text={reading.astrology_reading} />
        </motion.div>

        {/* Design section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-10">
          <p className={sectionLabel}>W H A T &nbsp; Y O U R &nbsp; D E S I G N &nbsp; S A Y S &nbsp; ( H O W )</p>
          <div className="space-y-4">
            {reading.design_insights.map((item, i) => (
              <ExpandableBullet key={i} text={item} />
            ))}
          </div>
        </motion.div>

        {/* Confidence */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="font-body text-[13px] italic text-primary/80 mb-10">
          {confidenceText}
        </motion.p>

        {/* Divider + Third Way */}
        <motion.div ref={thirdWayRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
          className="border-t-2 border-primary/40 pt-8 mb-10">
          <p className={`${sectionLabel} text-center`}>Y O U R &nbsp; T H I R D &nbsp; W A Y</p>
          <p className="font-display text-[22px] sm:text-[24px] leading-[1.4] text-foreground text-center font-medium">
            {reading.third_way}
          </p>
        </motion.div>

        {/* Journal prompt */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-card border border-border rounded-md p-5 mb-6">
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">J O U R N A L</p>
          <p className="font-display text-[16px] leading-[1.6] text-card-foreground">{reading.journal_prompt}</p>
        </motion.div>

        {/* Mirror disclaimer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}
          className="font-body text-[12px] italic text-foreground/50 text-center mb-4">
          I'm a mirror, not a master.
        </motion.p>

        {/* Fallback banner */}
        {reading.is_fallback && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.48 }}
            className="font-body text-[11px] text-muted-foreground text-center mb-8">
            This reading is from our curated library — your personalised mirror will be ready on your next session.
          </motion.p>
        )}

        {!reading.is_fallback && <div className="mb-8" />}

        {/* Buttons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col gap-3 pb-10">
          <button onClick={() => { track("reading_saved"); onSave(); }}
            className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300">
            Save to my mirror
          </button>

          {/* Share Third Way button */}
          {isPro ? (
            <button onClick={handleShare} disabled={generating}
              className="w-full h-[48px] rounded-sm border border-primary text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50">
              <Share2 className="w-4 h-4" strokeWidth={1.5} />
              {generating ? "Generating..." : "Share my Third Way ↗"}
            </button>
          ) : (
            <div className="relative group">
              <button disabled
                className="w-full h-[48px] rounded-sm border border-border text-foreground/30 font-body text-[14px] cursor-not-allowed flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                Share my Third Way ↗
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-card border border-border font-body text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Unlock with Mirror Pro
              </div>
            </div>
          )}

          <button onClick={() => setFeedbackOpen(true)}
            className="w-full h-[48px] rounded-sm bg-transparent border border-border text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300">
            That doesn't fit
          </button>
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

              <p className="font-display text-[18px] text-card-foreground mb-4">Your Third Way card</p>

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
              <p className="font-display text-[18px] text-card-foreground mb-2">Tell us what missed the mark</p>
              <p className="font-body text-[13px] text-muted-foreground mb-4">This helps us refine your mirror.</p>
              <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What felt off?" rows={3}
                className="w-full px-4 py-3 rounded-sm bg-background text-foreground font-body text-[14px] border border-border placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors duration-300 resize-none mb-4" />
              <button onClick={() => { track("reading_regenerated"); setFeedbackOpen(false); setFeedbackText(""); }}
                className="w-full h-[48px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] hover:brightness-110 transition-all duration-300">
                Regenerate
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ReadingOutput;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_TIERS } from "@/lib/stripe";
import { track } from "@/lib/posthog";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

const PaywallModal = ({ open, onClose }: PaywallModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) track("paywall_shown", { trigger: "fourth_reading" });
  }, [open]);

  const handleCheckout = async (priceId: string, tierName: string) => {
    setLoading(tierName);
    track("paywall_upgrade_clicked", { tier: tierName });
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-app relative"
          >
            <button
              onClick={onClose}
              className="absolute -top-2 right-0 text-foreground/50 hover:text-foreground/70 transition-colors z-10"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <p className="font-display text-[14px] tracking-[0.35em] text-primary mb-3 text-center">
              A E T H E L &nbsp; M I R R O R
            </p>

            <h2 className="font-display text-[24px] sm:text-[28px] leading-[1.2] text-foreground text-center mb-2">
              Your mirror is ready to go deeper.
            </h2>
            <p className="font-body text-[14px] text-muted-foreground text-center mb-8">
              Unlock unlimited readings and your full decision journal.
            </p>

            <div className="space-y-4 mb-6">
              {(["mirror", "mirror_pro"] as const).map((key) => {
                const tier = STRIPE_TIERS[key];
                const isPro = key === "mirror_pro";
                return (
                  <div
                    key={key}
                    className={`border rounded-md p-5 ${
                      isPro
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="font-display text-[18px] text-foreground">
                        {tier.name}
                      </h3>
                      <span className="font-body text-[14px] text-primary font-medium">
                        {tier.price}
                      </span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                          <span className="font-body text-[13px] text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleCheckout(tier.price_id, tier.name)}
                      disabled={loading !== null}
                      className={`w-full h-[44px] rounded-sm font-body font-medium text-[14px] transition-all duration-300 disabled:opacity-50 ${
                        isPro
                          ? "bg-primary text-primary-foreground hover:brightness-110"
                          : "border border-primary text-primary hover:bg-primary/10"
                      }`}
                    >
                      {loading === tier.name ? "..." : `Start ${tier.name} — ${tier.price}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { track("paywall_dismissed"); onClose(); }}
              className="w-full font-body text-[13px] text-foreground/50 hover:text-foreground/70 transition-colors mb-3"
            >
              Maybe later
            </button>

            <button
              onClick={() => {
                track("paywall_practitioner_clicked");
                onClose();
                navigate("/practitioner");
              }}
              className="w-full font-body text-[13px] text-primary hover:text-primary/80 transition-colors mb-3"
            >
              For practitioners →
            </button>

            <p className="font-body text-[11px] text-foreground/40 text-center">
              Cancel anytime. No hidden fees.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallModal;

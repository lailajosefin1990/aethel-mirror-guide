import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const tierLabels: Record<string, string> = {
  free: "Free",
  mirror: "Mirror",
  mirror_pro: "Pro",
};

const SettingsScreen = () => {
  const { user, subscriptionTier, signOut } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const sectionLabel = "font-body text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3";

  return (
    <section className="pt-8 pb-4">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-display text-[14px] tracking-[0.35em] text-primary mb-8"
      >
        S E T T I N G S
      </motion.p>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>A C C O U N T</p>
        <div className="flex items-center gap-3 mb-1">
          <p className="font-body text-[14px] text-card-foreground">
            {user?.email}
          </p>
          {subscriptionTier !== "free" && (
            <Badge
              variant="default"
              className="font-body text-[10px] uppercase tracking-wider"
            >
              {tierLabels[subscriptionTier]}
            </Badge>
          )}
        </div>
        <p className="font-body text-[12px] text-muted-foreground">
          {tierLabels[subscriptionTier]} plan
        </p>
      </motion.div>

      {/* Subscription management */}
      {subscriptionTier !== "free" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-5"
        >
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="w-full h-[48px] rounded-sm border border-border bg-card text-foreground/70 font-body text-[14px] hover:border-foreground/30 transition-all duration-300 disabled:opacity-50"
          >
            {portalLoading ? "..." : "Manage subscription"}
          </button>
        </motion.div>
      )}

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <button
          onClick={signOut}
          className="w-full h-[48px] rounded-sm border border-destructive/30 text-destructive font-body text-[14px] hover:bg-destructive/10 transition-all duration-300"
        >
          Sign out
        </button>
      </motion.div>
    </section>
  );
};

export default SettingsScreen;

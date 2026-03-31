import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { isPushActive, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { track } from "@/lib/posthog";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

const tierLabels: Record<string, string> = {
  free: "Free",
  mirror: "Mirror",
  mirror_pro: "Pro",
  practitioner: "Practitioner",
};

const SettingsScreen = () => {
  const { user, subscriptionTier, signOut } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    isPushActive(user.id).then((active) => {
      setPushEnabled(active);
      setPushLoading(false);
    });
  }, [user]);

  // Load referral data
  useEffect(() => {
    if (!user) return;
    const loadReferralData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .single();
      if (profile?.referral_code) setReferralCode(profile.referral_code);

      const { data: referrals } = await supabase
        .from("referrals")
        .select("id, status, reward_granted")
        .eq("referrer_user_id", user.id);
      if (referrals) {
        setReferralCount(referrals.length);
        setRewardsEarned(referrals.filter((r: any) => r.reward_granted).length);
      }
    };
    loadReferralData();
  }, [user]);

  const handleCopyReferral = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      track("referral_link_copied");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePushToggle = async (checked: boolean) => {
    if (!user) return;
    setPushLoading(true);
    if (checked) {
      const ok = await subscribeToPush(user.id);
      setPushEnabled(ok);
      if (ok) track("push_enabled_settings");
    } else {
      await unsubscribeFromPush(user.id);
      setPushEnabled(false);
      track("push_disabled_settings");
    }
    setPushLoading(false);
  };

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

      {/* Push notifications toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>N O T I F I C A T I O N S</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-[14px] text-card-foreground">Push notifications</p>
            <p className="font-body text-[12px] text-muted-foreground">48-hour check-ins & daily nudges</p>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={handlePushToggle}
            disabled={pushLoading}
          />
        </div>
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

      {/* Practitioner Portal link */}
      {subscriptionTier === "practitioner" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-5"
        >
          <button
            onClick={() => navigate("/practitioner")}
            className="w-full h-[48px] rounded-sm border border-primary bg-primary/5 text-primary font-body text-[14px] hover:bg-primary/10 transition-all duration-300"
          >
            Practitioner Portal →
          </button>
        </motion.div>
      )}

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>A B O U T</p>
        <button
          onClick={() => navigate("/evidence")}
          className="font-body text-[14px] text-primary hover:text-primary/80 transition-colors"
        >
          Evidence →
        </button>
      </motion.div>

      {/* Legal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>L E G A L</p>
        <div className="space-y-2">
          <button onClick={() => navigate("/privacy")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            Privacy Policy →
          </button>
          <button onClick={() => navigate("/terms")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            Terms of Service →
          </button>
          <button onClick={() => navigate("/cookies")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            Cookie Policy →
          </button>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
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

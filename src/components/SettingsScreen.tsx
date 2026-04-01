import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { isPushActive, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { track } from "@/lib/posthog";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

const tierLabels: Record<string, string> = {
  free: "Free",
  mirror: "Mirror",
  mirror_pro: "Pro",
  practitioner: "Practitioner",
};

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { user, subscriptionTier, signOut } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [rewardsEarned, setRewardsEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editingBirthTime, setEditingBirthTime] = useState(false);
  const [birthTimeValue, setBirthTimeValue] = useState("");
  const [currentBirthTime, setCurrentBirthTime] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    isPushActive(user.id).then((active) => {
      setPushEnabled(active);
      setPushLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code, birth_time")
        .eq("user_id", user.id)
        .single();
      if (profile?.referral_code) setReferralCode(profile.referral_code);
      if (profile?.birth_time) {
        setCurrentBirthTime(profile.birth_time);
        setBirthTimeValue(profile.birth_time);
      }

      const { data: referrals } = await supabase
        .from("referrals")
        .select("id, status, reward_granted")
        .eq("referrer_user_id", user.id);
      if (referrals) {
        setReferralCount(referrals.length);
        setRewardsEarned(referrals.filter((r: any) => r.reward_granted).length);
      }
    };
    loadData();
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Couldn't open subscription settings. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSaveBirthTime = async () => {
    if (!user || !birthTimeValue) return;
    try {
      const { error } = await supabase.from("profiles").update({ birth_time: birthTimeValue }).eq("user_id", user.id);
      if (error) throw error;
      setCurrentBirthTime(birthTimeValue);
      setEditingBirthTime(false);
      toast.success("Birth time updated");
      track("birth_time_updated_settings");
    } catch (err) {
      console.error("Birth time update failed:", err);
      toast.error("Couldn't update birth time. Please try again.");
    }
  };

  const handleLanguageChange = async (lang: string) => {
    if (user) {
      try {
        const { error } = await supabase.from("profiles").update({ preferred_language: lang }).eq("user_id", user.id);
        if (error) throw error;
        track("language_changed", { language: lang });
      } catch (err) {
        console.error("Language change failed:", err);
        toast.error("Couldn't update language. Please try again.");
      }
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
        {t("settings_title")}
      </motion.p>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_account")}</p>
        <div className="flex items-center gap-3 mb-1">
          <p className="font-body text-[14px] text-card-foreground">{user?.email}</p>
          {subscriptionTier !== "free" && (
            <Badge variant="default" className="font-body text-[10px] uppercase tracking-wider">
              {tierLabels[subscriptionTier]}
            </Badge>
          )}
        </div>
        <p className="font-body text-[12px] text-muted-foreground">
          {tierLabels[subscriptionTier]} plan
        </p>
      </motion.div>

      {/* Language */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_language")}</p>
        <LanguageSelector onLanguageChange={handleLanguageChange} />
      </motion.div>

      {/* Birth time */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.13 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_birth_time")}</p>
        {editingBirthTime ? (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="time"
                value={birthTimeValue}
                onChange={(e) => setBirthTimeValue(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-sm bg-background text-foreground font-body text-[14px] border border-border focus:outline-none focus:border-primary/60 transition-colors"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={handleSaveBirthTime}
              disabled={!birthTimeValue}
              className="h-10 px-4 rounded-sm bg-primary text-primary-foreground font-body text-[13px] disabled:opacity-30 hover:brightness-110 transition-all"
            >
              Save
            </button>
            <button
              onClick={() => setEditingBirthTime(false)}
              className="h-10 px-3 rounded-sm border border-border text-foreground/60 font-body text-[13px] hover:border-foreground/30 transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="font-body text-[14px] text-card-foreground">
              {currentBirthTime || "Not set"}
            </p>
            <button
              onClick={() => setEditingBirthTime(true)}
              className="font-body text-[13px] text-primary hover:text-primary/80 transition-colors"
            >
              {t("settings_edit_birth_time")} →
            </button>
          </div>
        )}
      </motion.div>

      {/* Push notifications toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_notifications")}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-[14px] text-card-foreground">{t("settings_push")}</p>
            <p className="font-body text-[12px] text-muted-foreground">{t("settings_push_detail")}</p>
          </div>
          <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} disabled={pushLoading} />
        </div>
      </motion.div>

      {/* Referral programme */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.17 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_referral_title")}</p>
        <p className="font-body text-[13px] text-muted-foreground mb-4">
          {t("settings_referral_body")}
        </p>
        {referralCode && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-body text-[13px] text-foreground/80 truncate">
              {window.location.origin}/?ref={referralCode}
            </div>
            <button
              onClick={handleCopyReferral}
              className="h-[36px] w-[36px] rounded-sm border border-border flex items-center justify-center text-foreground/60 hover:text-primary hover:border-primary/30 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
        <div className="flex gap-4">
          <p className="font-body text-[12px] text-muted-foreground">
            You've referred <span className="text-foreground">{referralCount}</span> friend{referralCount !== 1 ? "s" : ""}
          </p>
          {rewardsEarned > 0 ? (
            <p className="font-body text-[12px] text-primary">
              Free month{rewardsEarned !== 1 ? "s" : ""} earned: {rewardsEarned}
            </p>
          ) : (
            <p className="font-body text-[12px] text-muted-foreground">
              Next reward: refer {Math.max(1, 1 - referralCount)} more friend{referralCount === 0 ? "" : "s"}
            </p>
          )}
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
            {portalLoading ? "..." : t("settings_manage_sub")}
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
            {t("settings_practitioner")}
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
        <p className={sectionLabel}>{t("settings_about")}</p>
        <button
          onClick={() => navigate("/evidence")}
          className="font-body text-[14px] text-primary hover:text-primary/80 transition-colors"
        >
          {t("settings_evidence")}
        </button>
      </motion.div>

      {/* Legal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-card border border-border rounded-md p-5 mb-5"
      >
        <p className={sectionLabel}>{t("settings_legal")}</p>
        <div className="space-y-2">
          <button onClick={() => navigate("/privacy")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            {t("settings_privacy")}
          </button>
          <button onClick={() => navigate("/terms")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            {t("settings_terms")}
          </button>
          <button onClick={() => navigate("/cookies")} className="block font-body text-[14px] text-primary hover:text-primary/80 transition-colors">
            {t("settings_cookies")}
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
          {t("settings_sign_out")}
        </button>
      </motion.div>
    </section>
  );
};

export default SettingsScreen;

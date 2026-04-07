import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useTranslation } from "react-i18next";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

const AuthScreen = ({ onSuccess, onBack }: AuthScreenProps) => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setShowEmailConfirmation(true);
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      sessionStorage.setItem("aethel_oauth_pending", "true");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Google sign-in failed");
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  const inputClass =
    "w-full h-12 px-4 rounded-sm bg-[hsl(228_30%_8%/0.5)] text-foreground font-body text-[14px] border border-foreground/15 placeholder:text-foreground/30 focus:outline-none focus:border-primary transition-colors duration-300";

  if (showEmailConfirmation) {
    return (
      <section className="min-h-screen px-5 pt-4 pb-8 flex flex-col">
        <button onClick={onBack} className="mb-8 text-foreground/40 hover:text-foreground/70 transition-colors duration-300">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-app mx-auto text-center py-8"
        >
          <p className="font-display text-[14px] tracking-[0.4em] text-primary mb-6">
            A E T H E L &nbsp; M I R R O R
          </p>
          <p className="font-display text-[18px] text-foreground mb-2">{t("auth_check_email")}</p>
          <p className="font-body text-[13px] text-muted-foreground mb-6">
            {t("auth_confirmation_sent")} <span className="text-foreground">{email}</span>{t("auth_tap_activate")}
          </p>
          <button
            onClick={() => { setShowEmailConfirmation(false); setIsSignUp(false); }}
            className="font-body text-[13px] text-primary hover:text-primary/80 transition-colors"
          >
            {t("auth_already_confirmed")}
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="min-h-screen px-5 pt-4 pb-8 flex flex-col">
      <button onClick={onBack} className="mb-8 text-foreground/40 hover:text-foreground/70 transition-colors duration-300">
        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-app mx-auto"
      >
        <p className="font-display text-[14px] tracking-[0.4em] text-primary mb-4 text-center">
          A E T H E L &nbsp; M I R R O R
        </p>

        <h2 className="font-display text-[24px] leading-[1.3] text-foreground text-center mb-2">
          Keep your reading
        </h2>
        <p className="font-body text-[14px] text-foreground/60 text-center mb-8">
          Create a <span className="text-primary font-medium">free</span> account to keep your readings
        </p>

        {/* Google button — primary action */}
        <button
          onClick={handleGoogle}
          className="w-full h-[52px] rounded-sm border border-foreground/30 bg-transparent text-foreground font-body text-[14px] flex items-center justify-center gap-3 hover:border-primary/60 hover:bg-foreground/5 transition-all duration-300 mb-6"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" />
          </svg>
          Google
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-foreground/15" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-background text-foreground/40 font-body text-[12px]">
              {t("auth_or_continue")}
            </span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth_email")}
            required
            className={inputClass}
          />
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth_password")}
              required
              minLength={6}
              className={inputClass}
            />
            {isSignUp && (
              <p className="font-body text-[11px] text-destructive/60 mt-1">{t("auth_password_hint")}</p>
            )}
          </div>

          {error && (
            <p className="font-body text-[13px] text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] rounded-sm bg-primary text-primary-foreground font-body font-medium text-[14px] tracking-wide hover:brightness-110 transition-all duration-300 disabled:opacity-30"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : "Continue"}
          </button>
        </form>

        <p className="font-body text-[13px] text-muted-foreground text-center">
          {isSignUp ? t("auth_already_account") : t("auth_no_account")}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="text-destructive font-medium hover:text-primary transition-colors"
          >
            {isSignUp ? t("auth_sign_in") : t("auth_sign_up")}
          </button>
        </p>
      </motion.div>
    </section>
  );
};

export default AuthScreen;

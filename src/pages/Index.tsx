import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { track } from "@/lib/posthog";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import QuestionInput, { type QuestionData } from "@/components/QuestionInput";
import BirthCoordinates, { type BirthData } from "@/components/BirthCoordinates";
import ReadingLoader from "@/components/ReadingLoader";
import ReadingOutput from "@/components/ReadingOutput";
import AppLayout from "@/components/AppLayout";
import DecisionJournal, { type JournalEntry } from "@/components/DecisionJournal";
import DailyNudge from "@/components/DailyNudge";
import TransitCalendar from "@/components/TransitCalendar";
import AuthScreen from "@/components/AuthScreen";
import PaywallModal from "@/components/PaywallModal";
import SettingsScreen from "@/components/SettingsScreen";
import PushPermissionSheet from "@/components/PushPermissionSheet";
import ConsentGate from "@/components/ConsentGate";
import CrisisInterstitial from "@/components/CrisisInterstitial";
import { subscribeToPush, wasPushDismissedRecently, dismissPushPrompt } from "@/lib/push";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ReadingData } from "@/lib/reading";

type View = "home" | "question" | "auth" | "birth" | "loading" | "reading" | "dashboard";

type ProfileBirthData = {
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
};

const FREE_READING_LIMIT = 3;
const MAX_REGENERATIONS = 3;

const transition = { duration: 0.3, ease: "easeInOut" as const };

const Index = () => {
  const { i18n } = useTranslation();
  const { user, loading: authLoading, subscriptionTier, monthlyReadingCount, refreshReadingCount } = useAuth();
  const [view, setView] = useState<View>("home");
  const [activeTab, setActiveTab] = useState("mirror");
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [readingData, setReadingData] = useState<ReadingData | null>(null);
  const [profileBirthData, setProfileBirthData] = useState<ProfileBirthData | null>(null);
  const [pushSheetOpen, setPushSheetOpen] = useState(false);
  const [hasShownPushPrompt, setHasShownPushPrompt] = useState(false);
  const [showConsentGate, setShowConsentGate] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [regenerationFeedback, setRegenerationFeedback] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const referralLinked = useRef(false);

  // Restore questionData from sessionStorage (survives OAuth redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem("aethel_pending_question");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuestionData(parsed);
        sessionStorage.removeItem("aethel_pending_question");
      } catch {
        sessionStorage.removeItem("aethel_pending_question");
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("aethel_ref", ref);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (referralLinked.current) return;
    const ref = localStorage.getItem("aethel_ref");
    if (!ref) return;

    referralLinked.current = true;

    const linkReferral = async () => {
      const { data: existing } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_user_id", user.id)
        .maybeSingle();

      if (existing) {
        localStorage.removeItem("aethel_ref");
        return;
      }

      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", ref)
        .maybeSingle();

      if (referrerProfile && referrerProfile.user_id !== user.id) {
        await supabase.from("referrals").insert({
          referrer_user_id: referrerProfile.user_id,
          referred_email: user.email,
          referred_user_id: user.id,
          status: "signed_up",
        });
        localStorage.removeItem("aethel_ref");
      }
    };
    linkReferral().catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("birth_date, birth_time, birth_place, birth_lat, birth_lng, birth_timezone, consent_accepted, preferred_language")
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      if (profile) {
        setProfileBirthData(profile);
        if (profile.preferred_language && profile.preferred_language !== i18n.language) {
          i18n.changeLanguage(profile.preferred_language);
        }
        if (!profile.consent_accepted) {
          setShowConsentGate(true);
        } else {
          setConsentChecked(true);
        }
      }
      setProfileLoaded(true);

      const { data: readings } = await supabase
        .from("readings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (!readings) return;

      const { data: outcomes } = await supabase
        .from("outcomes")
        .select("*")
        .eq("user_id", user.id);

      if (cancelled) return;

      const outcomeMap = new Map(
        (outcomes ?? []).map((o: any) => [o.reading_id, { followed: o.followed, note: o.outcome_text }])
      );

      const entries: JournalEntry[] = readings.map((r: any) => ({
        id: r.id,
        domain: r.domain,
        date: new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        thirdWay: r.third_way_text || "",
        question: r.question,
        outcome: outcomeMap.get(r.id) as JournalEntry["outcome"] | undefined,
      }));

      setJournalEntries(entries);
    };

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (user && !authLoading && profileLoaded && view === "home" && journalEntries.length > 0) {
      setView("dashboard");
    }
  }, [user, authLoading, profileLoaded, journalEntries.length]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_CLICK") {
        setActiveTab("journey");
        setView("dashboard");
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []);

  const handleQuestionSubmit = (data: QuestionData) => {
    setQuestionData(data);
    // Persist question so it survives OAuth page redirects
    sessionStorage.setItem("aethel_pending_question", JSON.stringify(data));
    if (!user) {
      setView("auth");
      return;
    }
    proceedAfterAuth();
  };

  const proceedAfterAuth = useCallback(() => {
    if (subscriptionTier === "free" && monthlyReadingCount >= FREE_READING_LIMIT) {
      setPaywallOpen(true);
      return;
    }
    if (profileBirthData?.birth_date) {
      setBirthData({
        date: new Date(profileBirthData.birth_date),
        time: profileBirthData.birth_time,
        unknownTime: !profileBirthData.birth_time,
        birthPlace: profileBirthData.birth_place || "",
        birthLat: profileBirthData.birth_lat ?? undefined,
        birthLng: profileBirthData.birth_lng ?? undefined,
        birthTimezone: profileBirthData.birth_timezone ?? undefined,
      });
      setLoadingError(null);
      setView("loading");
    } else {
      setView("birth");
    }
  }, [subscriptionTier, monthlyReadingCount, profileBirthData]);

  // Auto-proceed after OAuth redirect if we have pending question data
  useEffect(() => {
    if (user && !authLoading && questionData && view === "home") {
      proceedAfterAuth();
    }
  }, [user, authLoading, questionData, view, proceedAfterAuth]);

  const handleAuthSuccess = () => {
    if (profileLoaded && profileBirthData?.birth_date) {
      proceedAfterAuth();
    } else {
      setView("birth");
    }
  };

  const handleBirthSubmit = async (data: BirthData) => {
    setBirthData(data);
    if (user) {
      await supabase.from("profiles").update({
        birth_date: data.date.toISOString().split("T")[0],
        birth_time: data.unknownTime ? null : data.time,
        birth_place: data.birthPlace,
        birth_lat: data.birthLat ?? null,
        birth_lng: data.birthLng ?? null,
        birth_timezone: data.birthTimezone ?? null,
        birth_place_name: data.birthPlace,
      }).eq("user_id", user.id);
      setProfileBirthData({
        birth_date: data.date.toISOString().split("T")[0],
        birth_time: data.unknownTime ? null : (data.time || null),
        birth_place: data.birthPlace,
        birth_lat: data.birthLat ?? null,
        birth_lng: data.birthLng ?? null,
        birth_timezone: data.birthTimezone ?? null,
      });
    }
    setLoadingError(null);
    setView("loading");
  };

  const generateReading = useCallback(async () => {
    const bd = birthData;
    const qd = questionData;
    if (!qd) throw new Error("No question data");

    const { data, error } = await supabase.functions.invoke("generate-reading", {
      body: {
        domain: qd.domain,
        question: qd.question,
        mode: qd.mode,
        birthDate: bd?.date ? new Date(bd.date).toLocaleDateString("en-GB") : "unknown",
        birthPlace: bd?.birthPlace || "unknown",
        birthTime: bd?.unknownTime ? "unknown" : (bd?.time || "unknown"),
        birthLat: bd?.birthLat ?? null,
        birthLng: bd?.birthLng ?? null,
        birthTimezone: bd?.birthTimezone ?? null,
        language: i18n.language,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    if (data?.is_crisis) {
      track("crisis_signal_detected", { domain: data.domain, confidence: data.confidence });
      setShowCrisis(true);
      return null;
    }

    setReadingData(data as ReadingData);
    return data;
  }, [birthData, questionData, i18n.language]);

  const handleLoadingComplete = useCallback(() => {
    setView("reading");
  }, []);

  const handleLoadingError = useCallback(() => {
    setLoadingError("Something went wrong. Please try again.");
    setView("question");
  }, []);

  const handleSave = async () => {
    if (!user || !questionData || !readingData) return;

    if (readingData.is_fallback) {
      track("fallback_reading_served", {
        domain: questionData.domain,
        reason: readingData.fallback_reason || "api_error",
      });
    }

    try {
      const { data: reading, error } = await supabase.from("readings").insert({
        user_id: user.id,
        domain: questionData.domain,
        question: questionData.question,
        mode: questionData.mode,
        reading_text: readingData.astrology_reading,
        third_way_text: readingData.third_way,
        journal_prompt: readingData.journal_prompt,
        confidence_level: readingData.confidence_level,
      }).select().single();

      if (error) throw error;

      const newEntry: JournalEntry = {
        id: reading.id,
        domain: questionData.domain,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        thirdWay: readingData.third_way,
        question: questionData.question,
      };
      setJournalEntries((prev) => [newEntry, ...prev]);

      // Clean up persisted question data
      sessionStorage.removeItem("aethel_pending_question");

      if (!readingData.is_fallback) {
        await refreshReadingCount();
      }

      supabase.functions.invoke("extract-memory", {
        body: {
          user_id: user.id,
          domain: questionData.domain,
          question: questionData.question,
          third_way: readingData.third_way,
        },
      }).catch((err) => console.error("Memory extraction failed:", err));

      setActiveTab("journey");
      setView("dashboard");

      if (
        !hasShownPushPrompt &&
        "PushManager" in window &&
        Notification.permission === "default" &&
        !wasPushDismissedRecently()
      ) {
        setHasShownPushPrompt(true);
        setTimeout(() => setPushSheetOpen(true), 800);
      }
    } catch (err) {
      console.error("Failed to save reading:", err);
      setActiveTab("journey");
      setView("dashboard");
    }
  };

  const handleUpdateEntry = async (id: string, outcome: JournalEntry["outcome"], consentToShare?: boolean) => {
    if (!user || !outcome) return;

    await supabase.from("outcomes").insert({
      reading_id: id,
      user_id: user.id,
      followed: outcome.followed,
      outcome_text: outcome.note,
      consent_to_share: consentToShare ?? false,
    });

    setJournalEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, outcome } : e))
    );
  };

  const handleStartReading = () => {
    setView("question");
  };

  const remainingReadings = Math.max(0, FREE_READING_LIMIT - monthlyReadingCount);

  const handleConsentAccept = async () => {
    if (user) {
      await supabase.from("profiles").update({
        consent_accepted: true,
        consent_date: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
    setShowConsentGate(false);
    setConsentChecked(true);
  };

  const handleCrisisReturn = () => {
    setShowCrisis(false);
    setQuestionData(null);
    setView("question");
  };

  const readingBackTarget = useMemo(() => {
    return profileBirthData?.birth_date ? "question" : "birth";
  }, [profileBirthData]);

  const birthTimeUnknown = useMemo(() => {
    if (birthData) return !!birthData.unknownTime;
    if (profileBirthData) return !profileBirthData.birth_time;
    return true;
  }, [birthData, profileBirthData]);

  return (
    <>
      {showConsentGate && <ConsentGate onAccept={handleConsentAccept} />}
      {showCrisis && <CrisisInterstitial onReturn={handleCrisisReturn} />}
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <HeroSection onStart={() => setView("question")} />
          </motion.div>
        )}
        {view === "question" && (
          <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <QuestionInput onSubmit={handleQuestionSubmit} onBack={() => setView("home")} />
          </motion.div>
        )}
        {view === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <AuthScreen onSuccess={handleAuthSuccess} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "birth" && (
          <motion.div key="birth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <BirthCoordinates onSubmit={handleBirthSubmit} onBack={() => setView("question")} />
          </motion.div>
        )}
        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <ReadingLoader
              onComplete={handleLoadingComplete}
              onError={handleLoadingError}
              generateReading={generateReading}
            />
          </motion.div>
        )}
        {view === "reading" && (
          <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <ReadingOutput
              domain={questionData?.domain ?? "General"}
              question={questionData?.question ?? ""}
              reading={readingData}
              onSave={() => { setRegenerationCount(0); handleSave(); }}
              onBack={() => setView(readingBackTarget as View)}
              regenerationCount={regenerationCount}
              birthTimeUnknown={birthTimeUnknown}
              onRegenerate={regenerationCount < MAX_REGENERATIONS ? () => {
                setRegenerationCount((c) => c + 1);
                setLoadingError(null);
                setView("loading");
              } : undefined}
            />
          </motion.div>
        )}
        {view === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}>
            <AppLayout showNav activeTab={activeTab} onTabChange={setActiveTab} subscriptionTier={subscriptionTier}>
              {activeTab === "mirror" && (
                <DailyNudge
                  journalEntries={journalEntries}
                  onNewReading={handleStartReading}
                  onRevisitDecision={() => setActiveTab("journey")}
                  subscriptionTier={subscriptionTier}
                  remainingReadings={remainingReadings}
                  onUpgrade={() => setPaywallOpen(true)}
                />
              )}
              {activeTab === "journey" && (
                <DecisionJournal
                  entries={journalEntries}
                  onUpdateEntry={handleUpdateEntry}
                  onStartReading={handleStartReading}
                />
              )}
              {activeTab === "calendar" && (
                <TransitCalendar onRevisitDecision={() => setActiveTab("journey")} />
              )}
              {activeTab === "settings" && <SettingsScreen />}
            </AppLayout>
          </motion.div>
        )}
      </AnimatePresence>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />

      <PushPermissionSheet
        open={pushSheetOpen}
        onAccept={async () => {
          setPushSheetOpen(false);
          if (user) {
            const ok = await subscribeToPush(user.id);
            if (ok) track("push_permission_granted");
          }
        }}
        onDismiss={() => {
          setPushSheetOpen(false);
          dismissPushPrompt();
          track("push_permission_dismissed");
        }}
      />
    </>
  );
};

export default Index;

import { useEffect, useRef, Dispatch } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { i18n as I18nType } from "i18next";
import type { JournalEntry } from "@/components/DecisionJournal";
import type { AppAction } from "@/context/appReducer";

export function useProfileData(
  user: User | null,
  i18n: I18nType,
  dispatch: Dispatch<AppAction>
) {
  const referralLinked = useRef(false);

  // Restore questionData from sessionStorage (survives OAuth redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem("aethel_pending_question");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: "SET_QUESTION", data: parsed });
        sessionStorage.removeItem("aethel_pending_question");
      } catch {
        sessionStorage.removeItem("aethel_pending_question");
      }
    }
  }, [dispatch]);

  // Store referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("aethel_ref", ref);
    }
  }, []);

  // Link referral when user logs in
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
    linkReferral().catch(() => {});
  }, [user]);

  // Load profile, readings, and outcomes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "birth_date, birth_time, birth_place, birth_lat, birth_lng, birth_timezone, consent_accepted, preferred_language"
        )
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      if (profile) {
        dispatch({ type: "SET_PROFILE_BIRTH", data: profile });
        if (profile.preferred_language && profile.preferred_language !== i18n.language) {
          i18n.changeLanguage(profile.preferred_language);
        }
        if (!profile.consent_accepted) {
          dispatch({ type: "SET_CONSENT_GATE", show: true });
        } else {
          dispatch({ type: "CONSENT_ACCEPTED" });
        }
      }
      dispatch({ type: "SET_PROFILE_LOADED", loaded: true });

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
        (outcomes ?? []).map((o: any) => [
          o.reading_id,
          { followed: o.followed, note: o.outcome_text },
        ])
      );

      const entries: JournalEntry[] = readings.map((r: any) => ({
        id: r.id,
        domain: r.domain,
        date: new Date(r.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        createdAt: r.created_at,
        thirdWay: r.third_way_text || "",
        question: r.question,
        outcome: outcomeMap.get(r.id) as JournalEntry["outcome"] | undefined,
      }));

      dispatch({ type: "SET_JOURNAL_ENTRIES", entries });
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user, dispatch, i18n]);
}

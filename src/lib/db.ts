import { supabase } from "@/integrations/supabase/client";

export const db = {
  profiles: {
    get: (userId: string) =>
      supabase
        .from("profiles")
        .select(
          "birth_date, birth_time, birth_place, birth_lat, birth_lng, birth_timezone, consent_accepted, preferred_language, referral_code"
        )
        .eq("user_id", userId)
        .single(),
    updateBirth: (
      userId: string,
      data: {
        birth_date: string;
        birth_time: string | null;
        birth_place: string;
        birth_lat: number | null;
        birth_lng: number | null;
        birth_timezone: string | null;
      }
    ) =>
      supabase
        .from("profiles")
        .update({ ...data, birth_place_name: data.birth_place })
        .eq("user_id", userId),
    updateConsent: (userId: string) =>
      supabase
        .from("profiles")
        .update({
          consent_accepted: true,
          consent_date: new Date().toISOString(),
        })
        .eq("user_id", userId),
    updateLanguage: (userId: string, lang: string) =>
      supabase
        .from("profiles")
        .update({ preferred_language: lang })
        .eq("user_id", userId),
  },
  readings: {
    save: (data: {
      user_id: string;
      domain: string;
      question: string;
      mode: string;
      reading_text: string;
      third_way_text: string;
      journal_prompt: string;
      confidence_level: string;
    }) => supabase.from("readings").insert(data).select().single(),
    getByUser: (userId: string) =>
      supabase
        .from("readings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    delete: (id: string) => supabase.from("readings").delete().eq("id", id),
  },
  outcomes: {
    save: (data: {
      reading_id: string;
      user_id: string;
      followed: string;
      outcome_text: string;
      consent_to_share: boolean;
    }) => supabase.from("outcomes").insert(data),
    getByUser: (userId: string) =>
      supabase.from("outcomes").select("*").eq("user_id", userId),
  },
  referrals: {
    check: (userId: string) =>
      supabase
        .from("referrals")
        .select("id")
        .eq("referred_user_id", userId)
        .maybeSingle(),
    findReferrer: (code: string) =>
      supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", code)
        .maybeSingle(),
    create: (data: {
      referrer_user_id: string;
      referred_email: string;
      referred_user_id: string;
      status: string;
    }) => supabase.from("referrals").insert(data),
    getByReferrer: (userId: string) =>
      supabase
        .from("referrals")
        .select("id, status, reward_granted")
        .eq("referrer_user_id", userId),
  },
  weeklyCheckins: {
    save: (data: {
      user_id: string;
      rating: string;
      checked_in_at: string;
    }) => supabase.from("weekly_checkins").insert(data),
  },
  transitCache: {
    getToday: (userId: string, dateStr: string) =>
      supabase
        .from("transit_cache")
        .select("transit_headline, transit_detail")
        .eq("user_id", userId)
        .eq("date", dateStr)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
  },
};

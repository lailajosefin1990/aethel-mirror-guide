import { useCallback, Dispatch } from "react";
import { track } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { JournalEntry } from "@/components/DecisionJournal";
import type { ReadingData } from "@/lib/reading";
import type { AppState, AppAction } from "@/context/appReducer";
import { wasPushDismissedRecently } from "@/lib/push";
import { toast } from "sonner";

export function useReadingFlow(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  user: User | null,
  i18nLanguage: string,
  refreshReadingCount: () => Promise<void>
) {
  const { birthData, questionData, readingData, regenerationFeedback, hasShownPushPrompt, pendingSave } = state;

  const generateReading = useCallback(async () => {
    const bd = birthData;
    const qd = questionData;
    if (!qd) throw new Error("No question data");

    const { data, error } = await supabase.functions.invoke("generate-reading", {
      body: {
        domain: qd.domain,
        question: qd.question,
        mode: qd.mode,
        birthDate: bd?.date
          ? new Date(bd.date).toLocaleDateString("en-GB")
          : "unknown",
        birthPlace: bd?.birthPlace || "unknown",
        birthTime: bd?.unknownTime ? "unknown" : bd?.time || "unknown",
        birthLat: bd?.birthLat ?? null,
        birthLng: bd?.birthLng ?? null,
        birthTimezone: bd?.birthTimezone ?? null,
        language: i18nLanguage,
        regenerationFeedback: regenerationFeedback,
      },
    });

    if (regenerationFeedback) dispatch({ type: "REGENERATE", feedback: null });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    if (data?.is_crisis) {
      track("crisis_signal_detected", {
        domain: data.domain,
        confidence: data.confidence,
      });
      dispatch({ type: "SET_CRISIS", show: true });
      return null;
    }

    dispatch({ type: "SET_READING_DATA", data: data as ReadingData });
    if (!user) {
      track("anonymous_reading_generated", { domain: qd.domain });
    }
    return data;
  }, [birthData, questionData, i18nLanguage, regenerationFeedback, user, dispatch]);

  const handleSave = useCallback(async () => {
    if (!questionData || !readingData) return;

    if (!user) {
      track("anonymous_save_prompted");
      dispatch({ type: "AUTH_REDIRECT_FOR_SAVE" });
      return;
    }

    if (readingData.is_fallback) {
      track("fallback_reading_served", {
        domain: questionData.domain,
        reason: readingData.fallback_reason || "api_error",
      });
    }

    try {
      const { data: reading, error } = await supabase
        .from("readings")
        .insert({
          user_id: user.id,
          domain: questionData.domain,
          question: questionData.question,
          mode: questionData.mode,
          reading_text: readingData.astrology_reading,
          third_way_text: readingData.third_way,
          journal_prompt: readingData.journal_prompt,
          confidence_level: readingData.confidence_level,
        })
        .select()
        .single();

      if (error) throw error;

      const newEntry: JournalEntry = {
        id: reading.id,
        domain: questionData.domain,
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        createdAt: reading.created_at,
        thirdWay: readingData.third_way,
        question: questionData.question,
      };
      dispatch({ type: "ADD_JOURNAL_ENTRY", entry: newEntry });

      sessionStorage.removeItem("aethel_pending_question");

      if (!readingData.is_fallback) {
        await refreshReadingCount();
      }

      supabase.functions
        .invoke("extract-memory", {
          body: {
            user_id: user.id,
            domain: questionData.domain,
            question: questionData.question,
            third_way: readingData.third_way,
          },
        })
        .catch(() => {});

      dispatch({ type: "SAVE_COMPLETE", tab: "journey" });

      if (
        !hasShownPushPrompt &&
        "PushManager" in window &&
        Notification.permission === "default" &&
        !wasPushDismissedRecently()
      ) {
        dispatch({ type: "PUSH_PROMPT_SHOWN" });
        setTimeout(() => dispatch({ type: "SET_PUSH_SHEET", open: true }), 800);
      }
    } catch (err) {
      console.error("Failed to save reading:", err);
      toast.error("Couldn't save your reading. Please try again.");
      dispatch({ type: "SAVE_COMPLETE", tab: "journey" });
    }
  }, [questionData, readingData, user, hasShownPushPrompt, refreshReadingCount, dispatch]);

  const handleUpdateEntry = useCallback(
    async (id: string, outcome: JournalEntry["outcome"], consentToShare?: boolean) => {
      if (!user || !outcome) return;

      await supabase.from("outcomes").insert({
        reading_id: id,
        user_id: user.id,
        followed: outcome.followed,
        outcome_text: outcome.note,
        consent_to_share: consentToShare ?? false,
      });

      dispatch({ type: "UPDATE_JOURNAL_ENTRY", id, outcome });
    },
    [user, dispatch]
  );

  return { generateReading, handleSave, handleUpdateEntry };
}

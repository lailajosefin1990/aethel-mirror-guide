import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { outcome_id } = await req.json();
    if (!outcome_id) throw new Error("outcome_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: outcome, error } = await supabase
      .from("outcomes")
      .select("*")
      .eq("id", outcome_id)
      .maybeSingle();

    if (error) throw error;
    if (!outcome) throw new Error("Outcome not found");

    let score = 0;

    // Followed scoring
    if (outcome.followed === "yes") score += 40;
    else if (outcome.followed === "partially") score += 20;

    // Sentiment scoring
    if (outcome.outcome_sentiment === "positive") score += 30;
    else if (outcome.outcome_sentiment === "neutral") score += 10;
    else if (outcome.outcome_sentiment === "negative") score -= 20;

    // Time to outcome scoring
    if (outcome.time_to_outcome && outcome.time_to_outcome < 72) score += 10;

    // Clamp
    score = Math.max(0, Math.min(100, score));

    await supabase
      .from("outcomes")
      .update({ quality_score: score })
      .eq("id", outcome_id);

    // Check if training_ready_outcomes crossed 500
    const { count } = await supabase
      .from("outcomes")
      .select("id", { count: "exact", head: true })
      .eq("consent_to_share", true)
      .not("outcome_sentiment", "is", null)
      .not("followed", "is", null);

    if (count && count >= 500) {
      // Check if we already sent the alert
      const { data: emailLog } = await supabase
        .from("email_log")
        .select("id")
        .eq("email_type", "training_milestone_500")
        .maybeSingle();

      if (!emailLog) {
        // Send milestone email via Resend
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Aethel Mirror <noreply@updates.aethelmirror.com>",
              to: ["admin@aethelmirror.com"],
              subject: "🪞 Aethel: 500 training examples ready",
              html: `<p>Your fine-tuning dataset has crossed the 500 example threshold.</p>
<p>Download your training data at /admin and begin the fine-tuning process on Mistral 7B or Llama 3 via HuggingFace.</p>
<p><strong>This is the moment the moat begins.</strong></p>`,
            }),
          });

          // Log so we don't send again
          await supabase.from("email_log").insert({
            user_id: "00000000-0000-0000-0000-000000000000",
            email_type: "training_milestone_500",
          });
        }
      }
    }

    return new Response(JSON.stringify({ quality_score: score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Score error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

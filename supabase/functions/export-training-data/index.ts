import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check admin key
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = Deno.env.get("ADMIN_EXPORT_KEY");
    if (!expectedKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("training_ready_outcomes")
      .select("*");

    if (error) throw error;

    // Convert to JSONL
    const jsonl = (data || [])
      .map((row: any) => {
        const record = {
          input: {
            domain: row.domain,
            birth_date: row.birth_date,
            birth_place: row.birth_place,
            transit_context: row.transit_context,
            memory_context: row.memory_context,
            question_summary: row.question_summary,
            mode: row.mode,
          },
          output: {
            third_way_text: row.third_way_text,
            confidence_level: row.confidence_level,
          },
          outcome: {
            followed: row.followed,
            outcome_sentiment: row.outcome_sentiment,
            time_to_outcome: row.time_to_outcome,
          },
        };
        return JSON.stringify(record);
      })
      .join("\n");

    return new Response(jsonl, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/jsonl",
        "Content-Disposition": "attachment; filename=training_data.jsonl",
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

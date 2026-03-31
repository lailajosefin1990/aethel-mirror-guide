import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSITIVE_KEYWORDS = [
  "worked",
  "helped",
  "clarity",
  "better",
  "decided",
  "moved",
  "good",
  "right",
  "yes",
  "did it",
];

function hasPositiveSentiment(text: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return POSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all outcomes with their reading's domain
    const { data: outcomes, error } = await supabase
      .from("outcomes")
      .select("id, followed, outcome_text, consent_to_share, created_at, reading_id");

    if (error) throw error;
    if (!outcomes || outcomes.length === 0) {
      return new Response(
        JSON.stringify({ total_outcomes: 0, insufficient_data: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get domains from readings table for the outcome reading_ids
    const readingIds = [...new Set(outcomes.map((o: any) => o.reading_id).filter(Boolean))];
    const { data: readings } = await supabase
      .from("readings")
      .select("id, domain")
      .in("id", readingIds);

    const domainMap: Record<string, string> = {};
    if (readings) {
      for (const r of readings) {
        domainMap[r.id] = r.domain;
      }
    }

    const totalOutcomes = outcomes.length;

    // Positive rate
    const positiveOutcomes = outcomes.filter(
      (o: any) =>
        (o.followed === "yes" || o.followed === "partially") &&
        hasPositiveSentiment(o.outcome_text)
    );
    const positiveRate = totalOutcomes > 0
      ? Math.round((positiveOutcomes.length / totalOutcomes) * 100)
      : 0;

    // Followed rate
    const followedYes = outcomes.filter((o: any) => o.followed === "yes").length;
    const followedPartially = outcomes.filter((o: any) => o.followed === "partially").length;
    const followedNo = outcomes.filter((o: any) => o.followed === "no").length;
    const followedRate = {
      yes: totalOutcomes > 0 ? Math.round((followedYes / totalOutcomes) * 100) : 0,
      partially: totalOutcomes > 0 ? Math.round((followedPartially / totalOutcomes) * 100) : 0,
      no: totalOutcomes > 0 ? Math.round((followedNo / totalOutcomes) * 100) : 0,
    };

    // By domain (only domains with 10+ outcomes)
    const domainCounts: Record<string, { total: number; positive: number }> = {};
    for (const o of outcomes) {
      const domain = domainMap[(o as any).reading_id] || "Unknown";
      if (!domainCounts[domain]) domainCounts[domain] = { total: 0, positive: 0 };
      domainCounts[domain].total++;
      if (
        ((o as any).followed === "yes" || (o as any).followed === "partially") &&
        hasPositiveSentiment((o as any).outcome_text)
      ) {
        domainCounts[domain].positive++;
      }
    }

    const byDomain: Record<string, number> = {};
    for (const [domain, counts] of Object.entries(domainCounts)) {
      if (counts.total >= 10) {
        byDomain[domain] = Math.round((counts.positive / counts.total) * 100);
      }
    }

    // Recent consented quotes
    const consentedPositive = outcomes
      .filter(
        (o: any) =>
          o.consent_to_share === true &&
          o.followed === "yes" &&
          o.outcome_text &&
          o.outcome_text.length > 20
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 5)
      .map((o: any) => ({
        text: o.outcome_text,
        domain: domainMap[o.reading_id] || "Unknown",
      }));

    const result = {
      total_outcomes: totalOutcomes,
      positive_rate: positiveRate,
      followed_rate: followedRate,
      by_domain: byDomain,
      recent_quotes: consentedPositive,
      insufficient_data: totalOutcomes < 20,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Evidence error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

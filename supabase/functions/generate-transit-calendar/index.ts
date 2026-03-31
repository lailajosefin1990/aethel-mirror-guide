import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are an astrologer calculating personalised daily transits. Given a birth chart context and a specific date, return a daily guidance entry.

Return valid JSON only, no markdown:
{
  "traffic_light": "green" | "amber" | "red",
  "transit_headline": "string (max 80 chars, specific transit e.g. 'Venus trine your natal Sun')",
  "transit_detail": "string (max 200 chars, practical implication for this person)",
  "moon_phase": "string (e.g. 'Waxing Gibbous in Scorpio')"
}`;

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    // Get user's birth data
    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date, birth_time, birth_place")
      .eq("user_id", userId)
      .single();

    if (!profile?.birth_date) {
      return new Response(
        JSON.stringify({ error: "Birth data required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check existing cache
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 29);

    const { data: cached } = await supabase
      .from("transit_cache")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .gt("expires_at", new Date().toISOString())
      .order("date", { ascending: true });

    // If we have all 30 days cached, return them
    if (cached && cached.length >= 30) {
      return new Response(JSON.stringify({ transits: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find which dates need generating
    const cachedDates = new Set((cached || []).map((c: any) => c.date));
    const datesToGenerate: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      if (!cachedDates.has(dateStr)) {
        datesToGenerate.push(d);
      }
    }

    // Get user's open decisions for linking
    const { data: readings } = await supabase
      .from("readings")
      .select("id, domain")
      .eq("user_id", userId);

    const { data: outcomes } = await supabase
      .from("outcomes")
      .select("reading_id")
      .eq("user_id", userId);

    const outcomeIds = new Set((outcomes || []).map((o: any) => o.reading_id));
    const openDecisions = (readings || [])
      .filter((r: any) => !outcomeIds.has(r.id))
      .map((r: any) => r.domain);

    const birthDate = profile.birth_date;
    const birthTime = profile.birth_time || "unknown";
    const birthPlace = profile.birth_place || "unknown";

    // Generate missing days
    const newTransits: any[] = [];

    for (const date of datesToGenerate) {
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = DAYS_OF_WEEK[date.getDay()];

      try {
        const response = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: `Birth date: ${birthDate}\nBirth place: ${birthPlace}\nBirth time: ${birthTime}\nDate to read: ${dateStr}\nDay of week: ${dayOfWeek}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`AI error for ${dateStr}:`, response.status, errText);
          continue;
        }

        const result = await response.json();
        let content = result.choices?.[0]?.message?.content;
        if (!content) continue;

        // Strip markdown code fences if present
        content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

        const parsed = JSON.parse(content);

        const transit = {
          user_id: userId,
          date: dateStr,
          traffic_light: parsed.traffic_light || "amber",
          transit_headline: (parsed.transit_headline || "Transit active").slice(0, 80),
          transit_detail: (parsed.transit_detail || "Pay attention to the energy today.").slice(0, 200),
          moon_phase: parsed.moon_phase || "Unknown",
          linked_domain: null as string | null,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        newTransits.push(transit);
      } catch (err) {
        console.error(`Failed to generate for ${dateStr}:`, err);
      }

      // 200ms delay between calls
      if (datesToGenerate.indexOf(date) < datesToGenerate.length - 1) {
        await delay(200);
      }
    }

    // Link open decisions to green days
    if (openDecisions.length > 0 && newTransits.length > 0) {
      const usedDomains = new Set<string>();
      for (const transit of newTransits) {
        if (transit.traffic_light === "green" && !transit.linked_domain) {
          for (const domain of openDecisions) {
            if (!usedDomains.has(domain)) {
              transit.linked_domain = domain;
              usedDomains.add(domain);
              break;
            }
          }
        }
      }
    }

    // Upsert new transits
    if (newTransits.length > 0) {
      const { error: insertError } = await supabase
        .from("transit_cache")
        .upsert(newTransits, { onConflict: "user_id,date" });

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    // Fetch all transits for the period
    const { data: allTransits } = await supabase
      .from("transit_cache")
      .select("*")
      .eq("user_id", userId)
      .gte("date", today.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    return new Response(JSON.stringify({ transits: allTransits || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Transit calendar error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

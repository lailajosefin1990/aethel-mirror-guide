import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ASPECT_NAMES: Record<number, string> = {
  0: "conjunction", 60: "sextile", 90: "square", 120: "trine", 180: "opposition",
};
const ASPECT_KEYWORDS: Record<string, string> = {
  conjunction: "intensifying",
  sextile: "easing",
  square: "challenging",
  trine: "harmonising",
  opposition: "polarising",
};
const PLANET_NAMES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

const SYSTEM_PROMPT = `You are an astrologer calculating personalised daily transits. You will be given REAL calculated natal chart data and real transit aspects for a specific date. Use ONLY the provided data — do not guess planetary positions.

Return valid JSON only, no markdown:
{
  "traffic_light": "green" | "amber" | "red",
  "transit_headline": "string (max 80 chars, reference the EXACT transit aspect provided, e.g. 'Venus trine your natal Sun')",
  "transit_detail": "string (max 200 chars, practical implication for this person based on the house themes)",
  "moon_phase": "string (e.g. 'Waxing Gibbous in Scorpio')"
}`;

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeAspects(transitPlanets: any, natalPlanets: any): string[] {
  const aspects: string[] = [];
  for (const tName of PLANET_NAMES) {
    if (!transitPlanets[tName]) continue;
    for (const nName of PLANET_NAMES) {
      if (!natalPlanets[nName]) continue;
      const diff = Math.abs(transitPlanets[tName].longitude - natalPlanets[nName].longitude) % 360;
      const angle = diff > 180 ? 360 - diff : diff;
      for (const [target, aspectName] of Object.entries(ASPECT_NAMES)) {
        const orb = Math.abs(angle - Number(target));
        if (orb <= 6) {
          const house = natalPlanets[nName].house || "unknown";
          const keyword = ASPECT_KEYWORDS[aspectName] || aspectName;
          aspects.push(
            `Transit ${tName} ${aspectName} natal ${nName} (orb ${orb.toFixed(1)}°): ${keyword} your ${house} house themes`
          );
        }
      }
    }
  }
  return aspects;
}

const ASTRO_BASE = "https://api.astrology-api.io/api/v3";

async function fetchNatalChart(apiKey: string, birthData: any, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ASTRO_BASE}/charts/natal`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ subject: { name: "user", birth_data: birthData } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function fetchTransitChart(apiKey: string, birthData: any, transitDate: Date, lat: number, lng: number, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ASTRO_BASE}/charts/transit`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: { name: "user", birth_data: birthData },
        transit_time: {
          datetime: {
            year: transitDate.getFullYear(), month: transitDate.getMonth() + 1, day: transitDate.getDate(),
            hour: 12, minute: 0, latitude: lat, longitude: lng, timezone: "UTC",
          },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const ASTROLOGY_API_KEY = Deno.env.get("ASTROLOGY_API_KEY");

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
      .select("birth_date, birth_time, birth_place, birth_lat, birth_lng")
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

    // ─── Fetch natal chart data once ───
    const birthDate = profile.birth_date;
    const birthTime = profile.birth_time || "12:00";
    const birthPlace = profile.birth_place || "unknown";
    const birthLat = profile.birth_lat;
    const birthLng = profile.birth_lng;

    // Build birth data for astrology-api.io v3
    const [bYear, bMonth, bDay] = birthDate.split("-").map(Number);
    const [bHour, bMinute] = birthTime.split(":").map(Number);
    const apiBirthData = ASTROLOGY_API_KEY && birthLat && birthLng ? {
      year: bYear, month: bMonth, day: bDay,
      hour: bHour || 12, minute: bMinute || 0, second: 0,
      latitude: parseFloat(String(birthLat)),
      longitude: parseFloat(String(birthLng)),
      timezone: "UTC",
    } : null;

    let natalChartData: any = null;
    if (ASTROLOGY_API_KEY && apiBirthData) {
      natalChartData = await fetchNatalChart(ASTROLOGY_API_KEY, apiBirthData);
    }

    // Build natal context string (reused for every day)
    let natalContext = "";
    if (natalChartData?.subject_data) {
      const sd = natalChartData.subject_data;
      const KEYS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
      const lines = KEYS
        .filter(k => sd[k])
        .map(k => {
          const p = sd[k];
          const retro = p.retrograde ? " RETROGRADE" : "";
          const house = p.house ? ` (${p.house.replace("_House","")} house)` : "";
          return `${p.name}: ${p.position?.toFixed(1)}° ${p.sign}${house}${retro}`;
        });
      const asc = sd.first_house;
      const mc = sd.tenth_house;
      if (asc) lines.push(`Ascendant: ${asc.position?.toFixed(1)}° ${asc.sign}`);
      if (mc) lines.push(`Midheaven: ${mc.position?.toFixed(1)}° ${mc.sign}`);

      natalContext = `\nNATAL CHART (Swiss Ephemeris):\n${lines.join("\n")}`;
    }

    // Generate missing days
    const newTransits: any[] = [];

    for (const date of datesToGenerate) {
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = DAYS_OF_WEEK[date.getDay()];

      // Fetch transit positions for this specific date
      let transitAspects = "";
      if (ASTROLOGY_API_KEY && apiBirthData && birthLat && birthLng) {
        const transitData = await fetchTransitChart(ASTROLOGY_API_KEY, apiBirthData, date, birthLat, birthLng);

        if (transitData?.chart_data) {
          const positions: any[] = transitData.chart_data.planetary_positions || [];
          const transitPlanets = positions
            .filter((p: any) => p.name?.endsWith("_transit"))
            .map((p: any) => {
              const retro = p.is_retrograde ? " RETROGRADE" : "";
              return `${p.name.replace("_transit","")}: ${p.degree?.toFixed(1)}° ${p.sign}${retro}`;
            });

          const aspects: any[] = (transitData.chart_data.aspects || []).slice(0, 8);
          const aspectLines = aspects.map((a: any) =>
            `${a.point1.replace("_transit"," transit")} ${a.aspect_type} ${a.point2.replace("_natal"," natal")} (orb ${a.orb?.toFixed(1)}°)`
          );

          transitAspects = `

TODAY'S KEY TRANSITS (real, calculated):
${transitPlanets.join("\n")}

ASPECTS TO NATAL CHART:
${aspectLines.length > 0 ? aspectLines.join("\n") : "No major aspects."}`;
        }
      }

      try {
        const userContent = `Birth date: ${birthDate}
Birth place: ${birthPlace}
Date to read: ${dateStr}
Day of week: ${dayOfWeek}${natalContext}${transitAspects}

IMPORTANT: Reference the EXACT transit aspects provided above in your headline and detail. Do not invent planetary positions.`;

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
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!response.ok) {
          console.error(`AI error for ${dateStr}:`, response.status);
          continue;
        }

        const result = await response.json();
        let content = result.choices?.[0]?.message?.content;
        if (!content) continue;

        content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(content);

        newTransits.push({
          user_id: userId,
          date: dateStr,
          traffic_light: parsed.traffic_light || "amber",
          transit_headline: (parsed.transit_headline || "Transit active").slice(0, 80),
          transit_detail: (parsed.transit_detail || "Pay attention to the energy today.").slice(0, 200),
          moon_phase: parsed.moon_phase || "Unknown",
          linked_domain: null as string | null,
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
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
      if (insertError) console.error("Insert error:", insertError);
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

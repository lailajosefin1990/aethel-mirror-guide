import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const FROM_EMAIL = "hello@aethelmirror.com";
const APP_URL = "https://aethelmirror.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEEKLY_TEMPLATES = [
  {
    transit: "Mars moves into a new sign this week, sharpening your instinct for what needs to change. Don't force it — the tension you're feeling is your signal, not your enemy. Let the clarity come through action, not overthinking.",
    nudge: "Make one decision you've been avoiding. Small is fine. Movement is the point.",
  },
  {
    transit: "Venus trines Neptune this week, softening the edges of old conflicts. If you've been holding a grudge or avoiding a conversation, the energy is right for repair. Not forgiveness-on-demand — just honesty without armour.",
    nudge: "Name the thing you haven't said. Write it down even if you don't send it.",
  },
  {
    transit: "Mercury retrograde shadow begins mid-week. Contracts, commitments, and conversations deserve a second look before you sign or send. It's not about fear — it's about precision. The extra beat of patience pays off by Friday.",
    nudge: "Re-read before you respond. One slow pass changes everything.",
  },
  {
    transit: "The Sun squares Pluto, surfacing a power dynamic you've been tolerating. Whether it's at work, in a relationship, or inside your own patterns — something is asking to be named. The Third Way here is rarely confrontation or silence. It's clarity without performance.",
    nudge: "Ask yourself: where am I playing small to keep the peace?",
  },
  {
    transit: "Jupiter sextile Uranus opens a window for insight from unexpected directions. The answer you've been looking for may come from outside your usual channels — a stranger's comment, a book that falls open, a pattern in your numbers. Stay loose and receptive.",
    nudge: "Break one routine today. Take a different path — literally or metaphorically.",
  },
  {
    transit: "Saturn holds steady in your long-game sector. The delay you feel isn't punishment — it's structure setting. Like concrete, some things need time to cure before you can build on them. Trust the timeline even when your ego wants speed.",
    nudge: "Write down what you're building. Not what you're chasing — what you're building.",
  },
  {
    transit: "The Moon cycles through an emotional reset this week. Old feelings may surface without obvious triggers. This isn't regression — it's integration. Your body is processing what your mind skipped over last month.",
    nudge: "Give yourself 20 minutes this week with no input. No phone, no podcast. Just you.",
  },
  {
    transit: "A Grand Trine in earth signs this week favours tangible progress over abstract planning. The stars aren't asking you to dream bigger — they're asking you to start smaller. One concrete step matters more than ten inspired ideas.",
    nudge: "Convert one idea into one action. Something you can finish by Sunday.",
  },
];

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `Aethel Mirror <${FROM_EMAIL}>`, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${res.status} ${err}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    console.log("[WEEKLY-TRANSIT] Starting weekly transit email send");

    // Get current week number for template rotation
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const template = WEEKLY_TEMPLATES[weekNumber % WEEKLY_TEMPLATES.length];

    // Week date range
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const dateRange = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

    // Email log key for this week
    const weekKey = `weekly_transit_${now.getFullYear()}_w${weekNumber}`;

    // Get paid users
    const { data: paidProfiles } = await supabase
      .from("profiles")
      .select("user_id, subscription_tier")
      .in("subscription_tier", ["mirror", "mirror_pro"]);

    if (!paidProfiles || paidProfiles.length === 0) {
      console.log("[WEEKLY-TRANSIT] No paid users found");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u.email]));

    let sent = 0;
    for (const profile of paidProfiles) {
      // Check duplicate for this week
      const { data: logged } = await supabase
        .from("email_log")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("email_type", weekKey)
        .limit(1);

      if (logged && logged.length > 0) continue;

      const email = userMap.get(profile.user_id);
      if (!email) continue;

      // Check open decisions
      const { data: readings } = await supabase
        .from("readings")
        .select("id")
        .eq("user_id", profile.user_id);

      const readingIds = (readings ?? []).map((r: any) => r.id);
      let openCount = readingIds.length;
      if (readingIds.length > 0) {
        const { data: outcomes } = await supabase
          .from("outcomes")
          .select("reading_id")
          .eq("user_id", profile.user_id);
        const closedIds = new Set((outcomes ?? []).map((o: any) => o.reading_id));
        openCount = readingIds.filter((id: string) => !closedIds.has(id)).length;
      }

      const openDecisionBlock = openCount > 0
        ? `<p style="font-size: 14px; color: #C9A84C; margin-bottom: 24px;">You have ${openCount} open decision${openCount > 1 ? "s" : ""} in your mirror.</p>
           <div style="text-align: center; margin-bottom: 40px;">
             <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background-color: #C9A84C; color: #0A0E1A; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">Revisit your mirror →</a>
           </div>`
        : `<div style="text-align: center; margin-bottom: 40px;">
             <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background-color: #C9A84C; color: #0A0E1A; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">Start a new reading →</a>
           </div>`;

      const html = `
<div style="font-family: 'Cormorant Garamond', Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #F5F0E8; background-color: #0A0E1A;">
  <p style="font-size: 12px; letter-spacing: 0.4em; color: #C9A84C; text-align: center; margin-bottom: 40px;">
    A E T H E L &nbsp; M I R R O R
  </p>

  <p style="font-size: 12px; letter-spacing: 0.15em; color: #F5F0E866; text-align: center; margin-bottom: 32px;">
    ${dateRange}
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 28px; color: #F5F0E8cc;">
    ${template.transit}
  </p>

  <div style="border-top: 1px solid #C9A84C40; padding-top: 20px; margin-bottom: 28px;">
    <p style="font-size: 11px; letter-spacing: 0.3em; color: #F5F0E866; margin-bottom: 12px;">L I T T L E &nbsp; N U D G E :</p>
    <p style="font-size: 15px; font-style: italic; line-height: 1.6; color: #F5F0E8cc;">
      ${template.nudge}
    </p>
  </div>

  ${openDecisionBlock}

  <p style="font-size: 13px; font-style: italic; color: #F5F0E866; text-align: center;">
    I'm a mirror, not a master.
  </p>
</div>`;

      await sendEmail(email, "Your week, through the mirror.", html);
      await supabase.from("email_log").insert({
        user_id: profile.user_id,
        email_type: weekKey,
      });
      sent++;
    }

    console.log(`[WEEKLY-TRANSIT] Sent ${sent} weekly transit emails`);
    return new Response(JSON.stringify({ processed: paidProfiles.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEEKLY-TRANSIT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

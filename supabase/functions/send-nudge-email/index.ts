import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "hello@aethelmirror.com";
const APP_URL = "https://aethelmirror.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    console.log("[NUDGE-EMAIL] Starting 24h signup nudge check");

    // Find users who signed up ~24h ago with no readings
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);

    // Get profiles created in the 24-26h window
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, created_at")
      .gte("created_at", twentySixHoursAgo.toISOString())
      .lte("created_at", twentyFourHoursAgo.toISOString());

    if (!profiles || profiles.length === 0) {
      console.log("[NUDGE-EMAIL] No eligible users found");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const profile of profiles) {
      // Check if already sent
      const { data: logged } = await supabase
        .from("email_log")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("email_type", "first_reading_nudge")
        .limit(1);

      if (logged && logged.length > 0) continue;

      // Check readings count
      const { data: readingCount } = await supabase.rpc("get_monthly_reading_count", {
        p_user_id: profile.user_id,
      });

      // Also check total readings
      const { count } = await supabase
        .from("readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      if ((count ?? 0) > 0) continue;

      // Get user email
      const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers();
      const user = users?.find((u: any) => u.id === profile.user_id);
      if (!user?.email) continue;

      const html = `
<div style="font-family: 'Cormorant Garamond', Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #F5F0E8; background-color: #0A0E1A;">
  <p style="font-size: 12px; letter-spacing: 0.4em; color: #C9A84C; text-align: center; margin-bottom: 40px;">
    A E T H E L &nbsp; M I R R O R
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 24px; color: #F5F0E8cc;">
    Most people spend weeks sitting with a decision before they're ready to ask.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 32px; color: #F5F0E8cc;">
    When you are — your mirror is here.
  </p>

  <div style="text-align: center; margin-bottom: 40px;">
    <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background-color: #C9A84C; color: #0A0E1A; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">
      Get my Third Way →
    </a>
  </div>

  <p style="font-size: 13px; font-style: italic; color: #F5F0E866; text-align: center;">
    I'm a mirror, not a master.
  </p>
</div>`;

      await sendEmail(user.email, "You haven't started your mirror yet.", html);
      await supabase.from("email_log").insert({
        user_id: profile.user_id,
        email_type: "first_reading_nudge",
      });
      sent++;
    }

    console.log(`[NUDGE-EMAIL] Sent ${sent} nudge emails`);
    return new Response(JSON.stringify({ processed: profiles.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[NUDGE-EMAIL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

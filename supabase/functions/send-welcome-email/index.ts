import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use Resend's default domain until aethelmirror.com is verified
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Guidance Journal <onboarding@resend.dev>";
const APP_URL = "https://aethelmirror.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("[WELCOME-EMAIL] RESEND_API_KEY not set — email not sent");
      return new Response(JSON.stringify({ skipped: true, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { user_id, email, name, thirdWay } = await req.json();
    if (!user_id || !email) throw new Error("Missing user_id or email");

    // Check duplicate
    const { data: existing } = await supabase
      .from("email_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("email_type", "welcome")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
<div style="font-family: 'Cormorant Garamond', Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #F5F0E8; background-color: #0A0E1A;">
  <p style="font-size: 12px; letter-spacing: 0.4em; color: #C9A84C; text-align: center; margin-bottom: 40px;">
    A E T H E L &nbsp; M I R R O R
  </p>

  <h1 style="font-size: 24px; font-weight: 400; line-height: 1.3; margin-bottom: 24px;">
    Welcome${name ? `, ${name}` : ""}.
  </h1>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 24px; color: #F5F0E8cc;">
    Your mirror is anchored. From now on, every decision gets clearer.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 32px; color: #F5F0E8cc;">
    You now have a mirror that reads six systems together — astrology, Human Design, numerology, Gene Keys, and more — and gives you one clear next move called the Third Way.
  </p>

  ${thirdWay ? `<div style="border-left: 2px solid #C9A84C; padding-left: 16px; margin: 24px 0;">
    <p style="font-size: 16px; line-height: 1.6; font-style: italic; color: #F5F0E8cc;">${thirdWay}</p>
  </div>` : ""}

  <div style="text-align: center; margin-bottom: 40px;">
    <a href="${APP_URL}" style="display: inline-block; padding: 14px 32px; background-color: #C9A84C; color: #0A0E1A; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; border-radius: 4px;">
      Open your mirror →
    </a>
  </div>

  <p style="font-size: 13px; font-style: italic; color: #F5F0E866; text-align: center;">
    I'm a mirror, not a master.
  </p>
</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Your mirror is ready ✦",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      // Treat auth failures (invalid/missing key) as non-fatal — don't crash the app
      if (res.status === 401 || res.status === 403) {
        console.warn(`[WELCOME-EMAIL] Resend auth failed (${res.status}) — email not sent`);
        return new Response(JSON.stringify({ skipped: true, reason: "resend_auth_failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Resend error: ${res.status} ${err}`);
    }

    await supabase.from("email_log").insert({
      user_id,
      email_type: "welcome",
    });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WELCOME-EMAIL]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

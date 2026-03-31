import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "hello@aethelmirror.com";

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

    const body = await req.json();
    console.log("[CHURN-RECOVERY] Received webhook event:", body.type);

    // Only handle subscription deleted events
    if (body.type !== "customer.subscription.deleted") {
      return new Response(JSON.stringify({ ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscription = body.data.object;
    const customerId = subscription.customer;
    const periodEnd = new Date(subscription.current_period_end * 1000);
    const periodEndStr = periodEnd.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Get customer email from Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !("email" in customer) || !customer.email) {
      console.log("[CHURN-RECOVERY] Customer not found or has no email");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = customer.email;

    // Find user by email
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users?.find((u: any) => u.email === email);
    if (!user) {
      console.log("[CHURN-RECOVERY] No matching Supabase user for:", email);
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate
    const churnKey = `churn_recovery_${subscription.id}`;
    const { data: logged } = await supabase
      .from("email_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_type", churnKey)
      .limit(1);

    if (logged && logged.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create customer portal link
    const origin = req.headers.get("origin") || "https://aethelmirror.com";
    let portalUrl = origin;
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: origin,
      });
      portalUrl = portalSession.url;
    } catch {
      // Fall back to app URL
    }

    const html = `
<div style="font-family: 'Cormorant Garamond', Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #F5F0E8; background-color: #0A0E1A;">
  <p style="font-size: 12px; letter-spacing: 0.4em; color: #C9A84C; text-align: center; margin-bottom: 40px;">
    A E T H E L &nbsp; M I R R O R
  </p>

  <h1 style="font-size: 22px; font-weight: 400; line-height: 1.3; margin-bottom: 24px;">
    Before you go.
  </h1>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 24px; color: #F5F0E8cc;">
    Your mirror will stay open until ${periodEndStr}.
  </p>

  <p style="font-size: 16px; line-height: 1.7; margin-bottom: 32px; color: #F5F0E8cc;">
    If something didn't land right, reply to this email — we read every one.
  </p>

  <div style="text-align: center; margin-bottom: 40px;">
    <a href="${portalUrl}" style="display: inline-block; padding: 12px 28px; border: 1px solid #C9A84C40; color: #C9A84C; text-decoration: none; font-size: 14px; letter-spacing: 0.05em;">
      Keep your mirror active →
    </a>
  </div>

  <p style="font-size: 13px; font-style: italic; color: #F5F0E866; text-align: center;">
    I'm a mirror, not a master.
  </p>
</div>`;

    await sendEmail(email, "Before you go.", html);
    await supabase.from("email_log").insert({
      user_id: user.id,
      email_type: churnKey,
    });

    console.log("[CHURN-RECOVERY] Sent churn recovery email to:", email);
    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CHURN-RECOVERY] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

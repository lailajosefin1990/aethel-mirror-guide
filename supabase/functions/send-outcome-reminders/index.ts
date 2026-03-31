import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID / Web Push helpers
async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlToBytes(base64url);
  // Import as raw ECDSA private key (32 bytes) via JWK
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: bytesToBase64url(raw),
    x: "", // will be filled
    y: "",
  };
  // Derive public key from private
  // We need to compute the public point - import as JWK with only d
  // Actually for VAPID JWT signing we can use a simpler approach
  return await crypto.subtle.importKey(
    "jwk",
    { ...jwk, x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", y: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(() => {
    // Fallback: try raw import approach
    throw new Error("VAPID key import failed");
  });
}

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(b64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJwt(audience: string, subject: string, privateKeyBase64url: string, publicKeyBase64url: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 86400, sub: subject };

  const headerB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key as JWK
  const privateKeyBytes = base64urlToBytes(privateKeyBase64url);
  const publicKeyBytes = base64urlToBytes(publicKeyBase64url);

  // Public key is 65 bytes (uncompressed point), x = bytes[1..33], y = bytes[33..65]
  const x = bytesToBase64url(publicKeyBytes.slice(1, 33));
  const y = bytesToBase64url(publicKeyBytes.slice(33, 65));
  const d = bytesToBase64url(privateKeyBytes);

  const jwk = { kty: "EC", crv: "P-256", x, y, d };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert from DER-like format to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // Web Crypto returns raw r||s for ECDSA
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32);
  }
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsignedToken}.${bytesToBase64url(rawSig)}`;
}

// Simplified web push — send without payload encryption (notification data via push event)
// For encrypted payloads we need aes128gcm which is complex; using unencrypted for now
// and including data in the JWT claims visible to push service
// Actually, web push REQUIRES encryption. Let's implement aes128gcm.

async function encryptPayload(
  payload: string,
  p256dhBase64url: string,
  authBase64url: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const authSecret = base64urlToBytes(authBase64url);
  const clientPublicKeyBytes = base64urlToBytes(p256dhBase64url);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  const ikm = await hkdf(authSecret, sharedSecret, buildInfo("WebPush: info\0", clientPublicKeyBytes, localPublicKey), 32);
  const prk = await hkdf(salt, ikm, buildContentInfo("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, buildContentInfo("Content-Encoding: nonce\0"), 12);

  // Encrypt with AES-128-GCM
  const payloadBytes = new TextEncoder().encode(payload);
  // Add padding: 1 byte delimiter + padding
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes);
  padded[payloadBytes.length] = 2; // padding delimiter

  const aesKey = await crypto.subtle.importKey("raw", prk, "AES-GCM", false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    padded
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const ciphertext = new Uint8Array(header.length + encrypted.byteLength);
  ciphertext.set(header, 0);
  ciphertext.set(new Uint8Array(encrypted), header.length);

  return { ciphertext, salt, localPublicKey };
}

function buildInfo(prefix: string, clientPublic: Uint8Array, serverPublic: Uint8Array): Uint8Array {
  const prefixBytes = new TextEncoder().encode(prefix);
  const result = new Uint8Array(prefixBytes.length + clientPublic.length + serverPublic.length);
  result.set(prefixBytes, 0);
  result.set(clientPublic, prefixBytes.length);
  result.set(serverPublic, prefixBytes.length + clientPublic.length);
  return result;
}

function buildContentInfo(label: string): Uint8Array {
  return new TextEncoder().encode(label);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status: number }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const subject = "mailto:hello@aethelmirror.com";

  const jwt = await createVapidJwt(audience, subject, vapidPrivateKey, vapidPublicKey);

  const payloadStr = JSON.stringify(payload);
  const { ciphertext } = await encryptPayload(payloadStr, p256dh, auth);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      TTL: "86400",
      Urgency: "normal",
    },
    body: ciphertext,
  });

  return { success: response.ok, status: response.status };
}

// Daily nudge messages (one per day of week)
const DAILY_NUDGES = [
  { day: 1, body: "What's the one thing you've been putting off? Today is ripe for it." },
  { day: 2, body: "Clarity follows action. What's the smallest move?" },
  { day: 3, body: "Midweek mirror check: are you choosing or drifting?" },
  { day: 4, body: "The pattern you keep noticing? That's the one to break." },
  { day: 5, body: "Before the weekend — what do you want to walk into Monday having done?" },
  { day: 6, body: "Stillness reveals what noise conceals. Take five minutes." },
  { day: 0, body: "New week incoming. What's the one decision that would change everything?" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const sb = createClient(supabaseUrl, serviceKey);

    const results = { outcome_reminders: 0, daily_nudges: 0, errors: 0, deactivated: 0 };

    // --- 1. Outcome reminders (readings 47-49 hours old without outcomes) ---
    const now = new Date();
    const from = new Date(now.getTime() - 49 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() - 47 * 60 * 60 * 1000).toISOString();

    const { data: readings } = await sb
      .from("readings")
      .select("id, user_id")
      .gte("created_at", from)
      .lte("created_at", to);

    if (readings && readings.length > 0) {
      // Get outcomes for these readings
      const readingIds = readings.map((r: any) => r.id);
      const { data: outcomes } = await sb
        .from("outcomes")
        .select("reading_id")
        .in("reading_id", readingIds);
      const outcomeDone = new Set((outcomes ?? []).map((o: any) => o.reading_id));

      // Get already-sent notifications
      const { data: sent } = await sb
        .from("notification_log")
        .select("reading_id")
        .in("reading_id", readingIds)
        .eq("type", "outcome_reminder");
      const alreadySent = new Set((sent ?? []).map((s: any) => s.reading_id));

      for (const reading of readings) {
        if (outcomeDone.has(reading.id) || alreadySent.has(reading.id)) continue;

        const { data: subs } = await sb
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", reading.user_id)
          .eq("is_active", true);

        for (const sub of subs ?? []) {
          try {
            const { success, status } = await sendWebPush(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              {
                title: "How did it go?",
                body: "You saved a Third Way 48 hours ago. Take a moment to log what happened.",
                data: { reading_id: reading.id, url: "/journey" },
                tag: `outcome-${reading.id}`,
              },
              vapidPublicKey,
              vapidPrivateKey
            );

            if (status === 410 || status === 404) {
              await sb.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
              results.deactivated++;
            } else if (success) {
              results.outcome_reminders++;
            }
          } catch (err) {
            console.error("Push error:", err);
            results.errors++;
          }
        }

        // Log notification
        await sb.from("notification_log").insert({
          reading_id: reading.id,
          user_id: reading.user_id,
          type: "outcome_reminder",
        });
      }
    }

    // --- 2. Daily nudge (8am UTC check) ---
    const hour = now.getUTCHours();
    if (hour === 8) {
      const dayOfWeek = now.getUTCDay();
      const nudge = DAILY_NUDGES.find((n) => n.day === dayOfWeek) || DAILY_NUDGES[0];

      // Check if we already sent today
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const { data: todaySent } = await sb
        .from("notification_log")
        .select("id")
        .eq("type", "daily_nudge")
        .gte("sent_at", todayStart.toISOString())
        .limit(1);

      if (!todaySent || todaySent.length === 0) {
        const { data: allSubs } = await sb
          .from("push_subscriptions")
          .select("*")
          .eq("is_active", true);

        const sentUsers = new Set<string>();
        for (const sub of allSubs ?? []) {
          if (sentUsers.has(sub.user_id)) continue;
          sentUsers.add(sub.user_id);

          try {
            const { success, status } = await sendWebPush(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              {
                title: "Your mirror, today.",
                body: nudge.body,
                data: { url: "/" },
                tag: "daily-nudge",
              },
              vapidPublicKey,
              vapidPrivateKey
            );

            if (status === 410 || status === 404) {
              await sb.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
              results.deactivated++;
            } else if (success) {
              results.daily_nudges++;
            }
          } catch (err) {
            console.error("Daily nudge push error:", err);
            results.errors++;
          }

          await sb.from("notification_log").insert({
            user_id: sub.user_id,
            type: "daily_nudge",
          });
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("send-outcome-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

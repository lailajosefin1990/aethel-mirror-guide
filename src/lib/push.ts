import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

const VAPID_PUBLIC_KEY = "BLkvTDgNqxWxT88ZO1SUlaVHG7doaEJqeYu4pSgcqL0bRyDjVp3BSAi-5o7RmHgoBCJWKxSD84sunKvpipnD6UM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  // Don't register in iframes or preview hosts
  try {
    if (window.self !== window.top) return null;
  } catch {
    return null;
  }
  if (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  ) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  // Upsert: deactivate old ones, insert new
  await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    is_active: true,
  });

  return !error;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId);

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    // ignore
  }
}

export async function isPushActive(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

const DISMISS_KEY = "push_prompt_dismissed_at";

export function wasPushDismissedRecently(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const dismissed = new Date(val).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - dismissed < sevenDays;
}

export function dismissPushPrompt(): void {
  localStorage.setItem(DISMISS_KEY, new Date().toISOString());
}

"use client";

import { createClient } from "@/lib/supabase/client";

// Phone notifications (web push): the service worker in public/sw.js receives them,
// and the subscription is saved so /api/notify knows where to send.

export type PushState = "unsupported" | "needs-install" | "blocked" | "off" | "on";

// iPhones only allow notifications for apps added to the home screen.
function isIPhoneBrowserTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIPhoneBrowserTab()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "on" : "off";
}

// The VAPID public key, as the bytes pushManager.subscribe wants.
function applicationServerKey() {
  const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Asks for permission, subscribes this device, and saves it to this account.
export async function turnOnPush(): Promise<PushState> {
  if ((await Notification.requestPermission()) !== "granted") return "blocked";
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey() }));
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys?.p256dh,
    p_auth: keys?.auth,
  });
  if (error) {
    await subscription.unsubscribe();
    throw error;
  }
  return "on";
}

export async function turnOffPush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await createClient().from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  return "off";
}

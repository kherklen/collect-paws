"use client";

import { getDeviceLocation, UB_CENTER, type LatLng } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";

// Sample (demo) accounts "live" in central Ulaanbaatar wherever the tester really is,
// so the sample animals, alerts, and vet list are all nearby. Remembered per account.
let known: { userId: string; isDemo: boolean } | null = null;

export async function isDemoAccount(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  if (known?.userId !== userId) {
    const { data: profile } = await supabase.from("profiles").select("is_demo").eq("id", userId).single();
    known = { userId, isDemo: !!profile?.is_demo };
  }
  return known.isDemo;
}

// Where the person is: the phone's location, or central Ulaanbaatar for demo accounts.
// Null if the phone's location is refused or unavailable.
export async function getLocation(timeoutMs?: number): Promise<LatLng | null> {
  if (await isDemoAccount()) return UB_CENTER;
  return getDeviceLocation(timeoutMs);
}

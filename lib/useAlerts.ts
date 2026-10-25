"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { alertsFor, getLocation, UB_CENTER } from "@/lib/geo";
import type { LostPet } from "@/lib/types";

const POLL_MS = 30000;
const DISMISSED_KEY = "dismissedAlerts";

// Dismissed alert IDs live in this browser only; losing them just means an alert shows again.
function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked (private window etc.): the alert just comes back next time.
  }
}

// The newest open lost-pet report that should alert this person, if any.
async function fetchAlert(): Promise<LostPet | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data }, spot] = await Promise.all([
    supabase
      .from("lost_pets")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    getLocation(),
  ]);
  // Location refused: judge "nearby" from central Ulaanbaatar, like the map does.
  const matches = alertsFor((data as LostPet[]) ?? [], {
    id: auth.user.id,
    spot: spot ?? UB_CENTER,
    dismissed: readDismissed(),
  });
  return matches[0] ?? null;
}

// How many sightings on my lost-pet reports I haven't opened yet (the bell's badge).
async function fetchUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const { count } = await supabase
    .from("sightings")
    .select("id, lost_pets!inner(owner_id)", { count: "exact", head: true })
    .eq("lost_pets.owner_id", auth.user.id)
    .is("read_at", null);
  return count ?? 0;
}

// Checks every 30 seconds, and whenever the app comes back into view, for open
// lost-pet reports near this person (the newest is the corner pop-up) and for
// new sightings on their own reports.
export function useAlerts() {
  const [alert, setAlert] = useState<LostPet | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () => {
      fetchAlert().then(setAlert);
      fetchUnreadCount().then(setUnread);
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    saveDismissed([...readDismissed(), id]);
    setAlert(null);
    fetchAlert().then(setAlert);
  }, []);

  return { alert, dismiss, unread };
}

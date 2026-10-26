"use client";

import { useCallback, useEffect, useState } from "react";
import { commentsOnMyPosts, type CommentOnMine } from "@/lib/comments";
import { createClient } from "@/lib/supabase/client";
import { alertsFor, redAlertsFor, UB_CENTER } from "@/lib/geo";
import { getLocation } from "@/lib/location";
import type { Capture, LostPet } from "@/lib/types";
import { MAY_BE_GONE_DAYS, urgencyNow } from "@/lib/urgency";
import { getTemperature } from "@/lib/weather";

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

// The newest unhelped SOS animal near this person that is red right now: tagged
// red, or amber that waited too long. Pins older than "may be gone" don't alert.
async function fetchRedAlert(): Promise<Capture | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const since = new Date(Date.now() - MAY_BE_GONE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const spot = (await getLocation()) ?? UB_CENTER;
  const [{ data }, celsius] = await Promise.all([
    supabase
      .from("captures")
      .select("*")
      .eq("mode", "sos")
      .is("helped_at", null)
      .gt("created_at", since)
      .order("created_at", { ascending: false }),
    getTemperature(spot),
  ]);
  const now = Date.now();
  const red = ((data as Capture[]) ?? []).filter((c) => urgencyNow(c, now, celsius).level === "red");
  return redAlertsFor(red, { id: auth.user.id, spot, dismissed: readDismissed() })[0] ?? null;
}

// What the bell counts: sightings on my lost-pet reports and comments on my posts
// that I haven't opened yet. The newest unread comment (not dismissed) is also a pop-up.
async function fetchUnread(): Promise<{ count: number; comment: CommentOnMine | null }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { count: 0, comment: null };
  const [{ count }, comments] = await Promise.all([
    supabase
      .from("sightings")
      .select("id, lost_pets!inner(owner_id)", { count: "exact", head: true })
      .eq("lost_pets.owner_id", auth.user.id)
      .is("read_at", null),
    commentsOnMyPosts(supabase, auth.user.id, true),
  ]);
  const dismissed = readDismissed();
  return {
    count: (count ?? 0) + comments.length,
    comment: comments.find((c) => !dismissed.includes(c.id)) ?? null,
  };
}

// Checks every 30 seconds, and whenever the app comes back into view, for open
// lost-pet reports near this person and red animals near them (the newest of each
// is a corner pop-up), and for new sightings and comments on their own posts.
export function useAlerts() {
  const [alert, setAlert] = useState<LostPet | null>(null);
  const [redAlert, setRedAlert] = useState<Capture | null>(null);
  const [commentAlert, setCommentAlert] = useState<CommentOnMine | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () => {
      fetchAlert().then(setAlert);
      fetchRedAlert().then(setRedAlert);
      fetchUnread().then(({ count, comment }) => {
        setUnread(count);
        setCommentAlert(comment);
      });
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

  // Lost-pet, capture, and comment IDs are all UUIDs, so one dismissed list serves them all.
  const dismiss = useCallback((id: string) => {
    saveDismissed([...readDismissed(), id]);
    setAlert(null);
    setRedAlert(null);
    setCommentAlert(null);
    fetchAlert().then(setAlert);
    fetchRedAlert().then(setRedAlert);
    fetchUnread().then(({ comment }) => setCommentAlert(comment));
  }, []);

  return { alert, redAlert, commentAlert, dismiss, unread };
}

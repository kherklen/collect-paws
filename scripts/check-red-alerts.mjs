// Slice 12 check: red animals (tagged red, or amber that waited too long) alert people
// within 3 km, never their own capturer, and stop once someone helps.
// Run: node --env-file=.env.local scripts/check-red-alerts.mjs
import { createClient } from "@supabase/supabase-js";
import { check, finish, newAccount, SUPABASE_URL, TINY_JPEG } from "./helpers.mjs";
import { redAlertsFor } from "../lib/geo.ts";
import { MAY_BE_GONE_DAYS, urgencyNow } from "../lib/urgency.ts";

// A quiet spot on the edge of Ulaanbaatar, nudged each run.
const P = { lat: 47.86 + Math.random() * 0.01, lng: 106.78 + Math.random() * 0.01 };
const north = (km) => ({ lat: P.lat + km / 111, lng: P.lng });

const A = await newAccount("Red capturer");
const B = await newAccount("Neighbor");

async function capture(urgency, extra = {}) {
  const path = `${A.id}/${crypto.randomUUID()}.jpg`;
  await A.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
  return { photo_path: path, mode: "sos", need: "vet", urgency, lat: P.lat, lng: P.lng, ...extra };
}
const { data: red, error } = await A.client.from("captures").insert(await capture("red")).select().single();
if (error) throw error;
// Amber that has waited 30 hours (only the secret key can backdate).
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: waited } = await admin
  .from("captures")
  .insert({ ...(await capture("amber")), user_id: A.id, created_at: new Date(Date.now() - 30 * 3600e3).toISOString() })
  .select()
  .single();
const { data: fresh } = await A.client.from("captures").insert(await capture("amber")).select().single();

// What a person's alert poller sees (same query and rules as lib/useAlerts.ts).
async function redAlertsSeenBy({ client, id }, spot) {
  const since = new Date(Date.now() - MAY_BE_GONE_DAYS * 86400e3).toISOString();
  const { data } = await client.from("captures").select("*").eq("mode", "sos").is("helped_at", null).gt("created_at", since);
  const now = Date.now();
  return redAlertsFor(data.filter((c) => urgencyNow(c, now, 5).level === "red"), { id, spot, dismissed: [] }).map((c) => c.id);
}

const nearB = await redAlertsSeenBy(B, north(2));
check("B 2 km away is alerted about the red animal", nearB.includes(red.id));
check("…and about the amber one that waited 30 h", nearB.includes(waited.id));
check("…but not about a fresh amber one", !nearB.includes(fresh.id));
check("someone 5 km away isn't alerted", !(await redAlertsSeenBy(B, north(5))).includes(red.id));
check("the capturer isn't alerted about their own", !(await redAlertsSeenBy(A, P)).includes(red.id));
check("a dismissed alert stays hidden", redAlertsFor([red], { id: B.id, spot: north(2), dismissed: [red.id] }).length === 0);

await B.client.rpc("mark_helped", { capture_id: red.id });
check("once helped, it no longer alerts", !(await redAlertsSeenBy(B, north(2))).includes(red.id));

await finish();

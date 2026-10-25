// Slice 7 check: lost-pet reports are readable by everyone, changeable only by
// their owner, and the alert filter keeps nearby and no-place reports.
import { check, finish, newAccount } from "./helpers.mjs";
import { alertsFor } from "../lib/geo.ts";

// ── The alert filter (lib/geo.ts), no database needed ──
const me = { lat: 47.9186, lng: 106.9176 };
// 0.018° of latitude ≈ 2 km, 0.045° ≈ 5 km.
const report = (id, lat, lng, owner_id = "someone") => ({ id, owner_id, last_seen_lat: lat, last_seen_lng: lng });
const reports = [
  report("2km", me.lat + 0.018, me.lng),
  report("5km", me.lat + 0.045, me.lng),
  report("noplace", null, null),
  report("mine", me.lat, me.lng, "me"),
  report("dismissed", me.lat, me.lng),
];
const kept = alertsFor(reports, { id: "me", spot: me, dismissed: ["dismissed"] }).map((r) => r.id);
check("a report 2 km away is kept", kept.includes("2km"));
check("a report 5 km away is dropped", !kept.includes("5km"));
check("a report with no place is always kept", kept.includes("noplace"));
check("your own report never alerts you", !kept.includes("mine"));
check("a dismissed report stays hidden", !kept.includes("dismissed"));
const noSpot = alertsFor(reports, { id: "me", spot: null, dismissed: [] }).map((r) => r.id);
check("with no location, only no-place reports match", noSpot.join() === "noplace", noSpot.join());

// ── The database rules ──
const A = await newAccount("Owner");
const B = await newAccount("Neighbor");

const base = { photo_path: `${A.id}/lost-test.jpg`, description: "Grey tabby, red collar" };
const withPlace = await A.client
  .from("lost_pets")
  .insert({ ...base, last_seen_lat: me.lat, last_seen_lng: me.lng, last_seen_address: "Test street" })
  .select()
  .single();
const noPlace = await A.client.from("lost_pets").insert(base).select().single();
check("A files a report with a place", !withPlace.error && withPlace.data?.status === "open", withPlace.error?.message);
check("A files a report without a place", !noPlace.error && noPlace.data?.last_seen_lat === null, noPlace.error?.message);

const asOther = await B.client.from("lost_pets").insert({ ...base, owner_id: A.id });
check("B cannot file a report as A", !!asOther.error);
const preFound = await A.client.from("lost_pets").insert({ ...base, status: "found" });
check("a report can't start out found", !!preFound.error);
const blank = await A.client.from("lost_pets").insert({ ...base, description: "   " });
check("a report needs a description", !!blank.error);

const ids = [withPlace.data.id, noPlace.data.id];
const bRead = await B.client.from("lost_pets").select("id").in("id", ids);
check("B reads both of A's reports", bRead.data?.length === 2);

const bEdit = await B.client
  .from("lost_pets")
  .update({ status: "found" }, { count: "exact" })
  .eq("id", withPlace.data.id);
check("B cannot update A's report", (bEdit.count ?? 0) === 0);

const found = await A.client
  .from("lost_pets")
  .update({ status: "found", found_at: new Date().toISOString() })
  .eq("id", withPlace.data.id)
  .select()
  .single();
check("A marks one report found", found.data?.status === "found" && !!found.data?.found_at, found.error?.message);

// The alert's query (lib/useAlerts.ts): open reports only.
const open = await B.client.from("lost_pets").select("id").eq("status", "open").in("id", ids);
const openIds = open.data?.map((r) => r.id) ?? [];
check("the found report is no longer returned as open", !openIds.includes(withPlace.data.id));
check("the other report is still open", openIds.includes(noPlace.data.id));

await finish();

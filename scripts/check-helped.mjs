// Slice 3 check: anyone can mark an SOS capture helped, but nothing else,
// and the map query drops helped pins after a day.
import { check, finish, newAccount } from "./helpers.mjs";

const A = await newAccount("Capturer");
const B = await newAccount("Helper");

const base = { photo_path: `${A.id}/test.jpg`, lat: 47.9186, lng: 106.9176 };
const { data: sos } = await A.client.from("captures").insert({ ...base, mode: "sos", need: "water" }).select().single();
const { data: collect } = await A.client.from("captures").insert({ ...base, mode: "collect" }).select().single();

const edit = await B.client.from("captures").update({ breed: "changed" }, { count: "exact" }).eq("id", sos.id);
check("B cannot edit A's capture directly", (edit.count ?? 0) === 0);

const helped = await B.client.rpc("mark_helped", { capture_id: sos.id });
check(
  "B marks A's SOS capture helped",
  !helped.error && !!helped.data?.helped_at && helped.data?.helped_by === B.id,
  helped.error?.message,
);
check("marking helped changes nothing else", helped.data?.need === "water" && helped.data?.breed === null);

const twice = await B.client.rpc("mark_helped", { capture_id: sos.id });
check("an already-helped capture can't be marked again", !!twice.error);

const onCollect = await B.client.rpc("mark_helped", { capture_id: collect.id });
check("a Collect capture can't be marked helped", !!onCollect.error);

const { data: aView } = await A.client.from("captures").select("helped_at").eq("id", sos.id).single();
check("A sees their capture as helped", !!aView?.helped_at);

// The map's query (components/MapView.tsx): SOS or mine, and not helped more than a day ago.
const mapQuery = (client, userId, cutoff) =>
  client
    .from("captures")
    .select("id")
    .or(`mode.eq.sos,user_id.eq.${userId}`)
    .or(`helped_at.is.null,helped_at.gt.${cutoff.toISOString()}`)
    .eq("id", sos.id);

const now = await mapQuery(B.client, B.id, new Date(Date.now() - 24 * 3600e3));
check("a pin helped just now still shows on the map", now.data?.length === 1);

// Pretend it's 25 hours later: the cutoff moves past the helped time.
const later = await mapQuery(B.client, B.id, new Date(Date.now() + 3600e3));
check("a pin helped over a day ago is gone from the map", later.data?.length === 0);

finish();

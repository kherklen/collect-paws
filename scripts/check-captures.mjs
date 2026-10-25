// Slice 2 check: captures and photo uploads respect who can see and do what.
import { check, finish, newAccount, SUPABASE_URL, TINY_JPEG } from "./helpers.mjs";

const A = await newAccount("Capturer");
const B = await newAccount("Neighbor");

const path = `${A.id}/${crypto.randomUUID()}.jpg`;
const up = await A.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
check("A uploads a photo into their own folder", !up.error, up.error?.message);

const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/photos/${path}`);
check("photo's public URL loads", res.status === 200, `status ${res.status}`);

const sneaky = await B.client.storage
  .from("photos")
  .upload(`${A.id}/${crypto.randomUUID()}.jpg`, TINY_JPEG, { contentType: "image/jpeg" });
check("B cannot upload into A's folder", !!sneaky.error);

const base = { photo_path: path, lat: 47.9186, lng: 106.9176 };
const sos = await A.client
  .from("captures")
  .insert({ ...base, breed: "Tabby", mode: "sos", need: "food" })
  .select()
  .single();
check("A saves an SOS capture", !sos.error, sos.error?.message);

const collect = await A.client
  .from("captures")
  .insert({ ...base, breed: "Husky mix", mode: "collect" })
  .select()
  .single();
check("A saves a Collect capture", !collect.error, collect.error?.message);

const ids = [sos.data?.id, collect.data?.id];
const aSees = await A.client.from("captures").select("id").in("id", ids);
check("A sees both of their captures", aSees.data?.length === 2);

const bSees = await B.client.from("captures").select("id, mode").in("id", ids);
check(
  "B sees only A's SOS capture, never the Collect one",
  bSees.data?.length === 1 && bSees.data[0].mode === "sos",
  `B sees ${bSees.data?.length} row(s)`,
);

const asA = await B.client.from("captures").insert({ ...base, user_id: A.id, mode: "collect" });
check("B cannot save a capture as A", !!asA.error);

const noNeed = await A.client.from("captures").insert({ ...base, mode: "sos" });
check("an SOS capture without a need is rejected", !!noNeed.error);

const preHelped = await A.client
  .from("captures")
  .insert({ ...base, mode: "sos", need: "vet", helped_at: new Date().toISOString() });
check("a capture cannot start out already helped", !!preHelped.error);

await finish();

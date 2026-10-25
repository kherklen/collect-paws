// Delete check: you can delete your own captures and photos, never someone else's.
import { check, finish, newAccount, SUPABASE_URL, TINY_JPEG } from "./helpers.mjs";

const A = await newAccount("Capturer");
const B = await newAccount("Neighbor");
const publicUrl = (p) => `${SUPABASE_URL}/storage/v1/object/public/photos/${p}`;

const path = `${A.id}/${crypto.randomUUID()}.jpg`;
await A.client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
const { data: sos } = await A.client
  .from("captures")
  .insert({ photo_path: path, lat: 47.9186, lng: 106.9176, mode: "sos", need: "food" })
  .select()
  .single();

const bDelete = await B.client.from("captures").delete({ count: "exact" }).eq("id", sos.id);
check("B cannot delete A's SOS capture", (bDelete.count ?? 0) === 0);

await B.client.storage.from("photos").remove([path]);
const stillThere = await fetch(publicUrl(path), { cache: "no-store" });
check("B cannot delete A's photo", stillThere.status === 200, `status ${stillThere.status}`);

const aDelete = await A.client.from("captures").delete({ count: "exact" }).eq("id", sos.id);
check("A deletes their own capture", !aDelete.error && aDelete.count === 1, aDelete.error?.message);

const { data: gone } = await B.client.from("captures").select("id").eq("id", sos.id);
check("the deleted SOS pin is gone for everyone", gone?.length === 0);

const removed = await A.client.storage.from("photos").remove([path]);
check("A deletes their own photo", !removed.error && removed.data?.length === 1, removed.error?.message);

await finish();

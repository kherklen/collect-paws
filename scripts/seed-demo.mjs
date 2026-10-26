// Creates the two sample logins if needed ("Demo" and "Demo neighbor", same password,
// so a tester can report on one and receive on the other), wipes everything they have
// posted (including what testers added), and puts the sample animals, a lost-pet
// report, and comments back around central Ulaanbaatar.
// Run again any time for a clean demo:
//   node --env-file=.env.local scripts/seed-demo.mjs
// Needs SUPABASE_SECRET_KEY and DEMO_PASSWORD in .env.local. Photos and credits are
// in scripts/demo-photos/.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { DEMO_EMAIL, DEMO_NEIGHBOR_EMAIL, SUPABASE_URL } from "./helpers.mjs";
import { placeName } from "../lib/place.ts";

const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
if (!process.env.SUPABASE_SECRET_KEY || !process.env.DEMO_PASSWORD) {
  console.error("Add SUPABASE_SECRET_KEY and DEMO_PASSWORD to .env.local first.");
  process.exit(1);
}

// Sample posts must stay out of real people's maps. That separation lives in the
// database (same_world in supabase/schema.sql), so don't seed without it.
const sandbox = await admin.rpc("same_world", { other: randomUUID() });
if (sandbox.error) {
  console.error("Run supabase/schema.sql in Supabase first (it keeps sample posts away from real users).");
  process.exit(1);
}

// ── Accounts ───────────────────────────────────────────────────────────────
async function sampleAccount(email, password, name) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = data.users.find((u) => u.email === email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    // Keep the password in step with DEMO_PASSWORD, so both logins always work.
    const updated = await admin.auth.admin.updateUserById(user.id, { password });
    if (updated.error) throw updated.error;
  }
  const marked = await admin.from("profiles").update({ is_demo: true }).eq("id", user.id);
  if (marked.error) throw marked.error;
  return user.id;
}
const demo = await sampleAccount(DEMO_EMAIL, process.env.DEMO_PASSWORD, "Demo");
const neighbor = await sampleAccount(DEMO_NEIGHBOR_EMAIL, process.env.DEMO_PASSWORD, "Demo neighbor");

// ── Wipe ───────────────────────────────────────────────────────────────────
for (const id of [demo, neighbor]) {
  await admin.from("comments").delete().eq("author_id", id);
  await admin.from("sightings").delete().eq("reporter_id", id);
  await admin.from("captures").delete().eq("user_id", id);
  await admin.from("lost_pets").delete().eq("owner_id", id);
  await admin.from("push_subscriptions").delete().eq("user_id", id);
  const { data: files } = await admin.storage.from("photos").list(id, { limit: 1000 });
  if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${id}/${f.name}`));
}

// ── Helpers ────────────────────────────────────────────────────────────────
// Sample spots are measured from central Ulaanbaatar, where demo accounts "stand",
// in meters north and east. They're kept within the first screen of the map, mostly
// below and left of the corner pop-ups.
const CENTER = { lat: 47.9186, lng: 106.9176 };
const at = (north, east) => ({
  lat: CENTER.lat + north / 111_000,
  lng: CENTER.lng + east / (111_000 * Math.cos((CENTER.lat * Math.PI) / 180)),
});
const ago = (hours) => new Date(Date.now() - hours * 3600e3).toISOString();

// The same privacy-safe place names the app uses (closest named place or street, plus area).
async function placeAt(spot) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${spot.lat}&lon=${spot.lng}&accept-language=mn,en`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "CollectSavar/0.1 (demo seed)" } });
    return placeName(await res.json(), false);
  } catch {
    return null;
  } finally {
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim allows one request a second
  }
}

async function photo(owner, file) {
  const path = `${owner}/demo-${file}`;
  const body = await readFile(new URL(`./demo-photos/${file}`, import.meta.url));
  const { error } = await admin.storage.from("photos").upload(path, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

async function capture({ owner, file, spot, hoursAgo, urgency, need = null, breed, animal = "cat", animalId, helpedHoursAgo }) {
  const sos = urgency !== "green";
  const { data, error } = await admin
    .from("captures")
    .insert({
      user_id: owner,
      photo_path: await photo(owner, file),
      breed,
      animal,
      mode: sos ? "sos" : "collect",
      urgency,
      need: sos ? need : null,
      lat: spot.lat,
      lng: spot.lng,
      address: await placeAt(spot),
      created_at: ago(hoursAgo),
      ...(animalId ? { animal_id: animalId } : {}),
      ...(helpedHoursAgo !== undefined ? { helped_at: ago(helpedHoursAgo), helped_by: demo } : {}),
    })
    .select("id, animal_id")
    .single();
  if (error) throw error;
  return data;
}

async function comment(author, post, body, minutesAgo) {
  const { error } = await admin.from("comments").insert({ author_id: author, ...post, body, created_at: ago(minutesAgo / 60) });
  if (error) throw error;
}

// ── The demo account's own captures ────────────────────────────────────────
await capture({ owner: demo, file: "tuxedo-cat.jpg", spot: at(-150, -250), hoursAgo: 50, urgency: "green", breed: "Tuxedo shorthair" });
await capture({ owner: demo, file: "grey-tabby.jpg", spot: at(-420, 150), hoursAgo: 5, urgency: "green", breed: "Grey tabby" });
// Larry: captured by the demo account, then again by the neighbor — one animal, "Seen 2 times".
const larry = await capture({ owner: demo, file: "larry-1.jpg", spot: at(-300, -120), hoursAgo: 72, urgency: "green", breed: "Tabby and white" });
const hungry = await capture({
  owner: demo, file: "ear-tipped-tabby.jpg", spot: at(-80, 220), hoursAgo: 3, urgency: "amber", need: "food", breed: "Brown tabby (ear-tipped)",
});

// ── The neighbor's SOS posts (what a tester finds nearby) ──────────────────
await capture({
  owner: neighbor, file: "larry-2.jpg", spot: at(-280, -100), hoursAgo: 20, urgency: "amber", need: "food", breed: "Tabby and white", animalId: larry.animal_id,
});
const hurt = await capture({
  owner: neighbor, file: "tan-dog.jpg", spot: at(200, -250), hoursAgo: 0.7, urgency: "red", need: "vet", breed: "Tan mixed-breed dog", animal: "dog",
});
// Tagged amber 30 h ago with no help, so it shows as red ("No help yet, so it's urgent now").
await capture({ owner: neighbor, file: "sleeping-tabby.jpg", spot: at(-520, -230), hoursAgo: 30, urgency: "amber", need: "food", breed: "Tabby" });
const thirsty = await capture({ owner: neighbor, file: "calico.jpg", spot: at(-250, 270), hoursAgo: 2, urgency: "amber", need: "water", breed: "Calico" });
// Four days with no help: the pin fades and says it might not be there anymore.
await capture({
  owner: neighbor, file: "sleeping-dog.jpg", spot: at(80, -290), hoursAgo: 100, urgency: "amber", need: "food", breed: "Yellow mixed-breed dog", animal: "dog",
});
// Already helped (by the demo account), so it's blue.
await capture({
  owner: neighbor, file: "cats-in-tube.jpg", spot: at(-480, 300), hoursAgo: 8, urgency: "amber", need: "food", breed: "Calico and tabby", helpedHoursAgo: 3,
});

// ── A lost pet near the tester ─────────────────────────────────────────────
const lastSeen = at(350, -200);
const { data: lost, error: lostError } = await admin
  .from("lost_pets")
  .insert({
    owner_id: neighbor,
    photo_path: await photo(neighbor, "lost-palmerston.jpg"),
    description: "Black and white cat with a red collar. Answers to Bars. Very friendly.",
    last_seen_lat: lastSeen.lat,
    last_seen_lng: lastSeen.lng,
    last_seen_address: await placeAt(lastSeen),
    created_at: ago(2),
  })
  .select("id")
  .single();
if (lostError) throw lostError;

// ── Comments ───────────────────────────────────────────────────────────────
// Unread on the demo account's post, so the tester gets the comment pop-up.
await comment(neighbor, { capture_id: hungry.id }, "I can bring food after work 🍖", 25);
await comment(neighbor, { capture_id: hurt.id }, "Its back leg looks hurt, it can't walk far.", 35);
await comment(demo, { capture_id: thirsty.id }, "Brought warm water this morning, the bowl was frozen 💧", 60);
await comment(neighbor, { lost_pet_id: lost.id }, "Please comment here if you see him!", 110);

console.log(`Sample content ready around central Ulaanbaatar.
Logins (both use DEMO_PASSWORD from .env.local):
  ${DEMO_EMAIL}
  ${DEMO_NEIGHBOR_EMAIL}`);

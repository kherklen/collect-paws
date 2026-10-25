// Slice 10 check: /api/match finds the same animal nearby, never shows someone else's
// private photo, ignores animals over 500 m away, and joined captures share one profile.
// Run with the app running: node --env-file=.env.local scripts/check-match.mjs <photo-folder> [base-url]
// The folder needs larry2.jpg and larry3.jpg (same cat), palmerston.jpg and palmerston2.jpg
// (same cat), gladstone.jpg (a different black cat), and cat.jpg (an orange cat).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { check, cookieFor, finish, newAccount } from "./helpers.mjs";

const [folder, base = "http://localhost:3000"] = process.argv.slice(2);

// A quiet spot on the edge of Ulaanbaatar, nudged each run so runs don't see each other.
const P = { lat: 47.86 + Math.random() * 0.01, lng: 106.78 + Math.random() * 0.01 };
const near = (meters) => ({ lat: P.lat + meters / 111_000, lng: P.lng });

async function capture({ client, id }, file, spot, mode = "collect", animalId) {
  const path = `${id}/${crypto.randomUUID()}.jpg`;
  const upload = await client.storage.from("photos").upload(path, await readFile(join(folder, file)), { contentType: "image/jpeg" });
  if (upload.error) throw upload.error;
  const { data, error } = await client
    .from("captures")
    .insert({
      photo_path: path, mode, need: mode === "sos" ? "food" : null, animal: "cat",
      lat: spot.lat, lng: spot.lng, ...(animalId ? { animal_id: animalId } : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function match(cookie, file, spot) {
  const started = Date.now();
  const res = await fetch(`${base}/api/match?lat=${spot.lat}&lng=${spot.lng}&animal=cat`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", ...(cookie ? { Cookie: cookie } : {}) },
    body: await readFile(join(folder, file)),
  });
  return { status: res.status, match: (await res.json()).match ?? null, ms: Date.now() - started };
}

const A = await newAccount("Larry spotter");
const C = await newAccount("Palmerston spotter");
const D = await newAccount("Orange spotter");
const B = await newAccount("Newcomer");
const [cookieA, cookieB] = [await cookieFor(A.client), await cookieFor(B.client)];

const larry = await capture(A, "larry3.jpg", P);                 // private (Collect)
const palmerston = await capture(C, "palmerston.jpg", near(100), "sos");
await capture(D, "cat.jpg", near(50));

const anon = await match(null, "larry2.jpg", P);
check("logged-out request is refused", anon.status === 401, `status ${anon.status}`);

const r1 = await match(cookieB, "larry2.jpg", near(30));
check("another photo of Larry matches Larry", r1.match?.animal_id === larry.animal_id, `${JSON.stringify(r1.match)} in ${r1.ms} ms`);
check("…without showing A's private photo", r1.match?.photo_url === null && r1.match?.mine === false);

const r2 = await match(cookieA, "larry2.jpg", near(30));
check("A sees their own photo in the match", r2.match?.animal_id === larry.animal_id && !!r2.match?.photo_url && r2.match?.mine === true, `${JSON.stringify(r2.match)} in ${r2.ms} ms`);

const r3 = await match(cookieB, "palmerston2.jpg", near(80));
check("another photo of Palmerston matches, with its SOS photo", r3.match?.animal_id === palmerston.animal_id && !!r3.match?.photo_url, `${JSON.stringify(r3.match)} in ${r3.ms} ms`);

const r4 = await match(cookieB, "gladstone.jpg", near(40));
check("a different black cat doesn't match", r4.match === null, `${JSON.stringify(r4.match)} in ${r4.ms} ms`);

const r5 = await match(cookieB, "larry2.jpg", near(900));
check("animals over 500 m away are never matched", r5.match === null, `${JSON.stringify(r5.match)} in ${r5.ms} ms`);

// B confirms "Same animal": the new capture joins Larry's profile.
const joined = await capture(B, "larry2.jpg", near(30), "collect", larry.animal_id);
check("the joined capture shares Larry's animal_id", joined.animal_id === larry.animal_id);
const { data: summary } = await B.client.rpc("animal_summary", { target: larry.animal_id }).single();
check("Larry's profile counts 2 captures, private one included", summary?.times_seen === 2, JSON.stringify(summary));
const { data: visible } = await B.client.from("captures").select("id").eq("animal_id", larry.animal_id);
check("B can only list their own capture of Larry", visible?.length === 1 && visible[0].id === joined.id);

await finish();

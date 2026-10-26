// Shared helpers for the check-*.mjs scripts. Run scripts with:
//   node --env-file=.env.local scripts/check-<name>.mjs
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The sample accounts (scripts/seed-demo.mjs): the demo login and its "neighbor".
export const DEMO_EMAIL = "collectsavar.check+demo@gmail.com";
export const DEMO_NEIGHBOR_EMAIL = "collectsavar.check+demoneighbor@gmail.com";

export const anonClient = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

let failures = 0;
export function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// Test accounts made by this run, so finish() can tidy up what they left behind.
const accounts = [];

// Removes everything a test account can see on the shared map or in alerts:
// its captures and photos are deleted, and its lost-pet reports are marked found.
export async function cleanUp({ client, id }) {
  await client.from("captures").delete().eq("user_id", id);
  await client.from("lost_pets").update({ status: "found", found_at: new Date().toISOString() }).eq("owner_id", id).eq("status", "open");
  const { data: files } = await client.storage.from("photos").list(id);
  if (files?.length) await client.storage.from("photos").remove(files.map((f) => `${id}/${f.name}`));
}

export async function finish() {
  for (const account of accounts) await cleanUp(account);
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

// Signs up a fresh test account and returns its logged-in client and user id.
export async function newAccount(name) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    email: `collectsavar.check+${stamp}@gmail.com`,
    password: `check-${stamp}`,
    options: { data: { display_name: `${name} ${stamp}` } },
  });
  if (error || !data.session) throw new Error(`Couldn't create test account: ${error?.message}`);
  const account = { client, id: data.user.id };
  accounts.push(account);
  return account;
}

// The smallest valid JPEG (1×1 white pixel), for upload checks.
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

// The cookie header a browser would send for this account, for calling the app's /api routes.
export async function cookieFor(client) {
  const { data } = await client.auth.getSession();
  const jar = new Map();
  const ssr = createServerClient(SUPABASE_URL, KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await ssr.auth.setSession(data.session);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

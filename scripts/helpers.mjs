// Shared helpers for the check-*.mjs scripts. Run scripts with:
//   node --env-file=.env.local scripts/check-<name>.mjs
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const anonClient = () => createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

let failures = 0;
export function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

export function finish() {
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
  return { client, id: data.user.id };
}

// The smallest valid JPEG (1×1 white pixel), for upload checks.
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

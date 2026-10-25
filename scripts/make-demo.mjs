// Creates the demo account (or confirms it exists and can log in).
// Run: node --env-file=.env.local scripts/make-demo.mjs
// The password comes from DEMO_PASSWORD in .env.local. The account becomes a
// demo account when supabase/schema.sql runs (it matches this email).
import { anonClient, DEMO_EMAIL } from "./helpers.mjs";

const password = process.env.DEMO_PASSWORD;
if (!password) {
  console.error("Add DEMO_PASSWORD=... to .env.local first.");
  process.exit(1);
}

const client = anonClient();
const login = await client.auth.signInWithPassword({ email: DEMO_EMAIL, password });
if (login.data.user) {
  const { data } = await client.from("profiles").select("display_name, is_demo").eq("id", login.data.user.id).single();
  console.log(`Demo account exists: ${DEMO_EMAIL} (${data?.display_name}, is_demo = ${data?.is_demo})`);
  process.exit(0);
}

const { data, error } = await client.auth.signUp({
  email: DEMO_EMAIL,
  password,
  options: { data: { display_name: "Demo" } },
});
if (error || !data.session) {
  console.error(`Couldn't create the demo account: ${error?.message ?? "no session"}`);
  process.exit(1);
}
console.log(`Created ${DEMO_EMAIL}. Now run supabase/schema.sql to mark it as the demo account.`);

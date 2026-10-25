// Slice 9 check: only the demo account is a demo account, and nobody can make themselves one.
// Run: node --env-file=.env.local scripts/check-demo.mjs
import { anonClient, check, DEMO_EMAIL, finish, newAccount } from "./helpers.mjs";

const { client, id } = await newAccount("Sneaky");

const own = await client.from("profiles").select("is_demo").eq("id", id).single();
check("a new account is not a demo account", own.data?.is_demo === false, JSON.stringify(own.data ?? own.error));

const sneak = await client.from("profiles").update({ is_demo: true }).eq("id", id);
const after = await client.from("profiles").select("is_demo").eq("id", id).single();
check("an account can't make itself a demo account", !!sneak.error && after.data?.is_demo === false, sneak.error?.message);

const rename = await client.from("profiles").update({ display_name: "Renamed" }).eq("id", id);
check("an account can still change its display name", !rename.error, rename.error?.message);

const demo = anonClient();
const login = await demo.auth.signInWithPassword({ email: DEMO_EMAIL, password: process.env.DEMO_PASSWORD });
const demoProfile = login.data.user
  ? await demo.from("profiles").select("is_demo").eq("id", login.data.user.id).single()
  : { data: null };
check("the demo account logs in and is a demo account", demoProfile.data?.is_demo === true, login.error?.message ?? JSON.stringify(demoProfile.data));

await finish();

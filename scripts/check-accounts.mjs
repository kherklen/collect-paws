// Slice 1 check: sign up → profile row with display name → sign out → sign back in → same profile.
// Run: node --env-file=.env.local scripts/check-accounts.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const stamp = Date.now();
const email = `collectsavar.check+${stamp}@gmail.com`;
const password = `check-${stamp}`;
const displayName = `Checker ${stamp}`;

const a = client();
const { data: signUp, error: signUpErr } = await a.auth.signUp({
  email,
  password,
  options: { data: { display_name: displayName } },
});
check("sign up returns a session (email confirmation off)", !signUpErr && !!signUp.session, signUpErr?.message);

const userId = signUp.user?.id;
const { data: profile, error: profileErr } = await a
  .from("profiles")
  .select("id, display_name")
  .eq("id", userId)
  .single();
check("profile row created with display name", profile?.display_name === displayName, profileErr?.message);

await a.auth.signOut();
const { data: signedOut } = await a.auth.getSession();
check("signed out", !signedOut.session);

const b = client();
const { data: login, error: loginErr } = await b.auth.signInWithPassword({ email, password });
check("log back in", !loginErr && login.user?.id === userId, loginErr?.message);

const { data: again } = await b.from("profiles").select("display_name").eq("id", userId).single();
check("same profile after logging back in", again?.display_name === displayName);

const { error: otherErr, count } = await b
  .from("profiles")
  .update({ display_name: "hacked" }, { count: "exact" })
  .neq("id", userId);
check("cannot rename someone else's profile", !otherErr && count === 0, otherErr?.message);

const { data: anonRows } = await client().from("profiles").select("id");
check("logged-out visitors cannot read profiles", (anonRows ?? []).length === 0, `${anonRows?.length ?? 0} rows visible`);

console.log(failures ?`\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

// Slices 5 and 9: /api/breed needs a login, recognizes cats and dogs, turns away other photos,
// and flags photos of pictures (real: false).
// Run with the app running: node --env-file=.env.local scripts/check-breed.mjs <photo-folder> [base-url]
// The folder needs cat.jpg, dog.jpg, a non-animal banana.jpg, a cat on a screen (screen.jpg),
// and a screenshot of a cat post (screenshot.jpg).
// Pass EXPECT_UNAVAILABLE=1 when the server runs with a broken OpenAI key.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { check, finish, newAccount } from "./helpers.mjs";

const [folder, base = "http://localhost:3000"] = process.argv.slice(2);
const expectUnavailable = process.env.EXPECT_UNAVAILABLE === "1";

// Sign in through @supabase/ssr so the session lands in cookies, like the browser app.
const { client } = await newAccount("Breeder");
const { data: session } = await client.auth.getSession();
const jar = new Map();
const ssr = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
  },
});
await ssr.auth.setSession(session.session);
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");

async function ask(file, withLogin = true) {
  const started = Date.now();
  const res = await fetch(`${base}/api/breed`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", ...(withLogin ? { Cookie: cookie } : {}) },
    body: await readFile(join(folder, file)),
  });
  return { status: res.status, body: await res.json(), ms: Date.now() - started };
}

const anon = await ask("cat.jpg", false);
check("logged-out request is refused", anon.status === 401, `status ${anon.status}`);

const cases = [
  ["cat.jpg", "cat", true],
  ["dog.jpg", "dog", true],
  ["banana.jpg", "other", null],
  ["screen.jpg", "cat", false],
  ["screenshot.jpg", "cat", false],
];
for (const [file, animal, real] of cases) {
  const r = await ask(file);
  if (expectUnavailable) {
    check(`${file}: AI unavailable → "couldn't check"`, r.body.animal === null && r.body.breed === null && r.body.real === null, JSON.stringify(r.body));
  } else {
    const breedOk = animal === "other" ? r.body.breed === null : !!r.body.breed;
    const realOk = real === null || r.body.real === real;
    check(`${file} → ${animal}${real === null ? "" : real ? ", real" : ", not real"}`, r.body.animal === animal && breedOk && realOk, `${JSON.stringify(r.body)} in ${r.ms} ms`);
  }
}

await finish();

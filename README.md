# Collect Savar

A playful, map-first web app for Ulaanbaatar: "capture" the stray cats and dogs you spot. Each capture goes into **My Collection**, and when an animal needs something (food, water, a vet, or its owner), it raises an **SOS** pin on a shared map so people nearby can help and mark it **helped**.

Built with Next.js 16, Tailwind CSS, Supabase (accounts, database, photos), Leaflet + OpenStreetMap, and OpenAI (breed guess).

## Run it locally

1. Install Node.js (LTS) and run `npm install`.
2. Create a [Supabase](https://supabase.com) project:
   - **Authentication → Sign In / Providers → Email:** turn off **Confirm email**.
   - **SQL Editor:** paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it. Safe to re-run.
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **publishable** key (`sb_publishable_…`), never the secret one
   - `OPENAI_API_KEY` — for the breed guess (server-only)
4. `npm run dev` and open http://localhost:3000. On desktop, the camera falls back to a file picker.

## Try it on a phone

Phones only allow the camera and location on `https://`. Deploy to [Vercel](https://vercel.com) (import this GitHub repo, add the same three environment variables), then open the `https://…vercel.app` link on your phone.

## Checks

Small scripts in [`scripts/`](scripts/) verify the database rules against your Supabase project using throwaway test accounts:

```bash
node --env-file=.env.local scripts/check-accounts.mjs
node --env-file=.env.local scripts/check-captures.mjs
node --env-file=.env.local scripts/check-helped.mjs
```

To remove the test accounts and their captures afterwards, run this in the SQL Editor:

```sql
delete from auth.users where email like 'collectsavar.check+%';
```

## Map data

Map tiles and street addresses come from © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, via the tile server and Nominatim, following their usage policies.

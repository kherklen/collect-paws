---
doc: spec
status: approved
---

# Collect Paw — Technical Spec

## How This Works, In Plain Language

Collect Paw is a **Next.js** web app styled with **Tailwind**. It runs in the phone's browser, and you open it from a link. There are three kinds of pieces:

1. **The app itself (Next.js).** The screens: the map, My Collection, the capture flow, and the lost-pet pages. It also has a few **server routes**, small bits of code that run on the server, not on the phone. We use them for anything that needs a secret key.
2. **Supabase, the app's memory.** It does three jobs:
   - **Accounts**: sign up, log in, and remembering who you are.
   - **The database**: tables (like spreadsheets) for captures, lost-pet reports, and sightings. Every phone reads the same tables, which is why your SOS cat shows up on your friend's map.
   - **Photo storage**: a folder in the cloud where every captured photo is kept.
3. **Outside helpers:**
   - **OpenAI** looks at a photo and guesses the breed. It's called only from our server route, so the OpenAI key never reaches the phone.
   - **OpenStreetMap** draws the map (through the **Leaflet** library) and turns a capture's location into a street address.
   - **A built-in vet list** (`vets.json`) of Ulaanbaatar vets. The phone works out which one is closest.

The app is hosted on **Vercel**, which gives it a real `https://` link. Phones only allow the camera and location on `https://` sites, so this is how you can capture a real stray outside.

**Why this shape:** Supabase covers accounts, data, and photos with one service, so we don't wire up three. Things that would usually need "live" machinery are done the simple way instead:
- The app **checks for new lost-pet alerts and sightings every 30 seconds**.
- "Helped pins disappear after a day" is just a rule in the map's database question, with no background timer.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. **Sign up / log in.** You enter an email, password, and display name. Supabase Auth creates the account and keeps you logged in. A `profiles` row stores your display name. Logged-out visitors are always sent to `/login`.
2. **Land on Nearby Friends.** The browser asks for your location.
   - If you allow it, the map centers on you.
   - If you refuse, it centers on central Ulaanbaatar.

   The app asks Supabase for *every SOS capture plus your own Collect captures, except anything helped more than a day ago*. Each one becomes a square photo pin.
3. **Tap Capture.** The `/capture` page opens the phone camera.
4. **Take a photo.**
   - The phone **shrinks it** (longest side 1024 px, JPEG) so uploading is quick on mobile data.
   - The small photo goes to our `/api/breed` server route, which asks OpenAI for the breed. The answer fills an editable field.
   - If OpenAI fails or isn't sure, the field stays empty and you type a breed.
5. **Choose Collect or SOS.** SOS asks for one need: food, water, vet, or "might be lost / looking for owner."
6. **Save.**
   - The photo is uploaded to Supabase Storage.
   - `/api/address` turns your location into a street address using OpenStreetMap.
   - A row is saved in `captures` with: who, photo, breed, mode, need, lat/lng, address, and time.

   You return to the map with the new pin, and the card is at the top of My Collection.
7. **Someone else helps.**
   - Their map shows your SOS pin. Tapping it opens the **pin card** (photo, breed, address, status).
   - Ticking **helped** calls a small database function that saves `helped_at = now` and who helped.
   - Every map then draws the pin in the "helped" color. Once 24 hours have passed, the map's database question no longer returns it.
8. **Vet button.** The phone measures the distance from you to every vet in `vets.json`. It shows the closest vet's name and distance, highlights its pin, and offers a **Directions** link that opens Google Maps.
9. **Report a lost pet.** The owner fills in `/lost/new`: photo, description, and an optional last-seen place picked on a map. A row is saved in `lost_pets` with `status = open`.
10. **The alert reaches people.**
    - Every 30 seconds (and when the app comes back into view), each phone asks for open lost-pet reports.
    - The phone keeps the ones within **3 km** of you, plus the ones with no place. Those show as the corner pop-up.
    - Tapping the pop-up opens `/lost/[id]`. From there you send **"I see it now"** (photo) or **"Report a sighting"** (when, where, what it looked like). Either one is saved as a row in `sightings`.
11. **The owner is notified.**
    - The same 30-second check counts sightings on the owner's reports that they haven't opened yet. That number is the badge on the top-left icon.
    - Opening `/notifications` lists them and marks them as seen.
    - `/profile` shows everything you've posted with the sightings received on each.

## Stack

All choices below were agreed in the `4-spec` conversation. Check the version numbers when the project is created at the start of `5-build`. They weren't looked up during planning.

| Piece | Choice | Why | Docs |
|---|---|---|---|
| Framework | **Next.js** (App Router, latest stable) | Learner is familiar with it | https://nextjs.org/docs |
| Language | **TypeScript** (create-next-app default) | Derived default, not discussed. Switch to JavaScript if you prefer (see Decisions) | https://nextjs.org/docs/app/getting-started/installation |
| Styling | **Tailwind CSS** | Learner's choice | https://tailwindcss.com/docs |
| Accounts, database, photos | **Supabase** (Auth, Postgres, Storage), via `@supabase/supabase-js` and `@supabase/ssr` | Learner has used it, and it's one service for three jobs | https://supabase.com/docs/guides/auth/server-side/nextjs |
| Map | **Leaflet** + **react-leaflet**, OpenStreetMap tiles | Free, no key. Tradeoff: plainer than Google Maps | https://react-leaflet.js.org/ · https://leafletjs.com/reference.html |
| Breed guess | **OpenAI** vision model via the `openai` npm package | Learner's choice. Tradeoff: needs a billed API key, small cost per photo | https://platform.openai.com/docs/guides/images-vision |
| Address lookup | **Nominatim** (OpenStreetMap reverse geocoding) | Free, no key, called once per capture | https://nominatim.org/release-docs/latest/api/Reverse/ |
| Vets | Built-in `vets.json` (seeded from OpenStreetMap) | Agreed after a live check showed sparse, flaky data for UB | — |
| Hosting | **Vercel** | Agreed so the phone gets `https://` for camera and location | https://vercel.com/docs/frameworks/nextjs |

**Note for the build:** Leaflet needs the browser's `window`, so the map component must load on the client only, using `next/dynamic` with `ssr: false`.

## Where It Runs and How Someone Tries It

- **Develop locally:** `npm run dev` → open http://localhost:3000. Desktop browsers allow location on `localhost`, and the capture "camera" there falls back to a file picker. That's fine for building.
- **Try it on a phone:** push to GitHub and Vercel deploys automatically. Open the Vercel `https://…vercel.app` link on the phone.
- **Needs:** Node.js LTS, a Supabase project, an OpenAI API key with billing, and a Vercel account linked to the GitHub repo.
- **Environment variables** go in `.env.local` locally and in Vercel → Project → Settings → Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase may call this the "publishable" key)
  - `OPENAI_API_KEY` (server-only, never `NEXT_PUBLIC_`)

  A `.env.example` with empty values is committed, and the real `.env.local` is already ignored by `.gitignore`.
- **Database setup:** paste `supabase/schema.sql` into the Supabase SQL Editor and run it. This creates the tables, access rules, the `photos` storage bucket, and the `mark_helped` function. You don't need the Supabase CLI.
- **Supabase setting:** turn **off** "Confirm email" (Authentication → Providers → Email) so new accounts work right away during the demo.
- **For the demo recording** (required, along with a public GitHub repo):
  1. Screen-record the phone outside: capture a real stray, see the pin and the collection card, tap Vet, then mark it helped.
  2. Use a second account (on a laptop or second phone) to report a lost pet. Send a sighting from the first phone, and show the owner's badge and notification.

## Look and Feel

Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. **Decided in `5-build`:** the learner kept the soft pastel lavender direction.

What's settled:
- **Fun and playful first**, never dark, even for SOS animals.
- **Mobile-first.** Design for a phone-width screen (the wireframe is an iPhone 16, ~393 px wide). Large touch targets and a round Capture button at the bottom center.
- **Direction (changed after the final review):** the learner shared a playful pet-app reference (cream background, forest green, coral, lime tiles, italic serif titles). Tokens in `app/globals.css`: brand coral `#f47c57` (buttons, paw, active tab), brand-dark forest `#1f4b40` (links, accent text), brand-soft sand `#ebe4d4`, lime `#d4e88f` (playful tiles), SOS red `#e5484d` (a true red so it doesn't blend with the coral buttons), Collect leafy green `#7fb539`, helped sky blue `#4ea8de` (kept apart from "doing fine" green), vet forest `#1f4b40`, ink `#1d3a33`, canvas cream `#f6f1e7`. Fonts: **Manrope** for text and **Playfair Display italic** (`font-display`) for page titles; both cover Cyrillic.
- **Earlier direction (replaced):** soft pastel lavender, rounded cards, lots of white space, photo pins on a light map. Font: **Nunito** (rounded, friendly; covers Cyrillic). Tokens in `app/globals.css`: brand `#8b7cf6`, SOS coral `#ff7e6b`, Collect lavender `#8b7cf6`, helped mint `#5ccb9a`, vet teal `#4fb3bf`, ink `#2b2541`, canvas `#faf8ff`.
- **Pins must be told apart at a glance:**
  - SOS (with a small need badge)
  - your own Collect
  - helped (faded/green)
- **In Tailwind:** define the agreed colors once as theme tokens (e.g. `--color-sos`, `--color-collect`, `--color-helped`, `--color-brand`) and use them everywhere. Pins are Leaflet `divIcon`s styled with the same classes.

## Components

### Language (added after the final review)
- All text lives in `lib/i18n/dictionaries.ts` (`en` and `mn`, same shape, checked by TypeScript). Screens read it with `useI18n()` from `lib/i18n/index.tsx`.
- The root layout picks the starting language with `getLang()` (`lib/i18n/server.ts`): the `lang` cookie if the person tapped a flag, otherwise Vercel's `x-vercel-ip-country` header (MN → Mongolian, anything else → English), and Mongolian when there's no header (localhost).
- `LanguageSwitcher` (flags) sits on the login screen and in the profile; it saves the `lang` cookie for a year.
- Dates use `Intl` with the chosen locale; distances switch m/km ↔ м/км; `/api/breed?lang=` asks OpenAI for the breed in that language.

### Auth and session
- `/login` page with sign up (email, password, display name) and log in.
- Supabase Auth handles sessions.
- `proxy.ts` (Next.js 16's name for middleware) refreshes the session and sends logged-out visitors to `/login`.
- A database trigger creates the `profiles` row from the display name sent with sign up.
- Log out is in the profile.

PRD ref: `prd.md > Accounts`.

### Main screen shell
- The shared frame for both tabs: the top-center **Nearby Friends | My Collection** toggle (underline on the active tab), the top-left **notification icon** with its badge, the top-right **My profile** button (added at the final review — the profile was hard to find behind the bell), and the bottom-center **Capture** button with the **Vet** button beside it.
- A **Report lost pet** icon button at the bottom left of Capture, mirroring the Vet button (decided by the learner in `5-build`; also a menu item in the profile), and the **lost-pet alert** pop-up in the top-right corner.
- The active tab is kept in the URL (`/?tab=collection`), so going back returns to the same tab.

PRD ref: `prd.md > Screens and Layout`.

### Map view (Nearby Friends)
- A full-screen Leaflet map centered on the person's location (default: central Ulaanbaatar, 47.9186, 106.9176).
- Loads captures with one query:
  - `mode = 'sos' OR user_id = me`
  - AND (`helped_at IS NULL` OR `helped_at > now() - 1 day`)

  The access rules already hide other people's Collect captures.
- Draws square photo pins. They may overlap.
- (Added after the final review) Keeps only the newest capture per `animal_id` (`lib/types.ts > newestPerAnimal`).
- (Added after the final review) Pin borders show the urgency *right now* (`lib/urgency.ts > urgencyNow`): green, amber, or red, with amber turning red after 24 h unhelped (12 h at −10°C or colder) and pins fading after 3 days unhelped. One Open-Meteo temperature for the area on screen (`lib/weather.ts`, cached 30 min).
- Reloads after a capture is saved and when the app comes back into view.

PRD ref: `prd.md > Map (Nearby Friends)`.

### Pin card
- A bottom sheet with the photo, breed, address, mode/need, and status.
- For SOS pins that aren't helped yet, a **helped** tick calls `mark_helped(capture_id)` and then refreshes the map.
- Collect pins show no helped tick (see Decisions).
- (Added after the final review) When the animal has 2+ captures, shows "Seen N times · first seen …" from `animal_summary(animal_id)` (counts private captures too, numbers only) and a strip of the other captures' photos that the row rules let this person read.

- (Added after the final review) Unhelped SOS cards show the urgency chip with the need, "⏳ Waiting 30 h", the temperature at the pin with a tip for its need when it's freezing (or hot, for water), and "might not be there anymore" after 3 days.

PRD ref: `prd.md > Marking Helped`.

### Capture flow
The round **paw** button on the main screen *is* the camera input, so one tap opens the camera (phones only open it from a direct tap). The shrunk photo is handed to `/capture` in memory (`lib/pendingPhoto.ts`). Opening `/capture` directly still shows a "Take a photo" button.

`/capture` steps:
1. Photo, using `<input type="file" accept="image/*" capture="environment">`, which opens the phone camera directly.
2. Shrink the photo in the browser (canvas, max 1024 px, JPEG ~0.8).
3. `POST /api/breed` → fill the editable breed field.
4. Collect / SOS → (SOS) pick one need.
5. Save:
   - upload the photo to `photos/{user_id}/{uuid}.jpg`
   - `POST /api/address` for the street address
   - insert into `captures`
   - return to the map

**Location:** read at save time.
- If location was refused, ask again.
- If still refused, show a small map where the person taps to drop the pin.

PRD ref: `prd.md > Capture`, `prd.md > States and Boundaries` (location refused).

### Breed route (`/api/breed`)
- A server route. Checks that the caller is logged in (so strangers can't spend OpenAI credit).
- Sends the image to OpenAI with a short prompt asking for JSON: `{ "animal": "cat" | "dog" | "other", "breed": string | null }`.
- Returns `{ animal, breed }`. On any error or timeout it returns `{ animal: null, breed: null }`, meaning "couldn't check."
- `/capture` blocks saving only when `animal` is `"other"`, with "Hmm, no cat or dog in this picture 🐾" and a Retake button. When `animal` is null, capture continues (`prd.md > States and Boundaries`).
- (Changed after the final review) The JSON asks for `breeds` (up to 3, most likely first) instead of one `breed`; the route returns `breeds` and `breed` (the first). `/capture` shows them as chips and leaves the field empty until one is tapped.
- (Added after the final review) The JSON also has `source`: `live | screen | print | screenshot | drawing`, and the route returns `real: source === "live"`. The prompt tells the model to answer `live` unless it can see the evidence, because blocking a real photo is worse than missing a fake. `/capture` also turns away a photo whose file is older than 10 minutes (`lib/image.ts > isFreshPhoto`, from the file's `lastModified`). The demo account (`profiles.is_demo`) skips both checks, gets an "Upload from gallery" button, and always drops its pin on a map.

PRD ref: `prd.md > Capture`.

### Address route (`/api/address`)
- (Changed after the final review, for privacy) Returns the closest named place when Nominatim's nearest object is a shop, amenity, leisure, tourism, historic, railway, highway (bus stop), or office, otherwise the road, plus the area (suburb, neighbourhood, quarter, or district). Never a house number or building name. `areaOnly: true` (the "I'm at home" option) returns just the area; `/capture` also moves that pin 100–200 m (`lib/geo.ts > nudge`). Checked against live Nominatim results with `scripts/check-privacy.mjs`.
- A server route.
- Calls Nominatim reverse geocoding with a proper `User-Agent` (their usage policy requires one).
- Returns a short address string, or `null`.
- Called once per capture or lost-pet report, and the result is stored. It's never called again when someone views a pin.

PRD ref: `prd.md > Map (Nearby Friends)` (address on the pin card).

### My Collection grid
- (Added after the final review) "＋ Add from gallery" links to `/capture?gallery=1`: gallery picker only, urgency fixed to green (buttons replaced by a privacy note), pin dropped on a map centered on the person, no age check (the screen/screenshot check stays), and it returns to the collection.
- (Added after the final review) Header shows animals and breeds (`lib/breeds.ts > breedCount`). After a save, `/capture` reads the person's capture breeds and, if this is the first of its breed (`isNewBreed`), shows the celebration screen instead of returning straight to the map.
- A three-column grid of the person's own captures, newest first.
- Each card shows the image and "breed / date".
- Helped animals stay in the grid with a distinct look (e.g. a colored ring or a "helped" tag).
- Empty state: "No friends yet!" with a nudge to tap the paw button.
- Tapping a card opens the same bottom sheet as a pin (`PinCard`). For your own captures it has **Delete**, with a confirm step. Deleting removes the `captures` row, then the photo file.

PRD ref: `prd.md > My Collection`.

### Vet finder
- Opened by the Vet button.
- Uses the person's location (or the map center if location was refused).
- Computes the straight-line distance (the haversine formula) to every entry in `vets.json`.
- Shows the closest vet's name and distance, highlights its pin on the map, and offers a **Directions** link: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
- (Added after the final review) The sheet opens compact (chosen vet + Directions); "All vets (N)" expands the list, the handle shrinks it to one row, × closes it. Lists every vet nearest first (`lib/geo.ts > byDistance`). Tapping a row or a vet pin makes it the shown vet, fits it and the person on the map, and shows its address and hours in the current language. Directions opens the vet's own Google Maps page when it has one (`lib/vets.ts > directionsUrl`), or directions to its coordinates.

PRD ref: `prd.md > Closest Vet`.

### Lost-pet report form
- `/lost/new`, reached from the main-screen button and the profile menu.
- Fields: photo (shrunk the same way as captures), a description, and an optional last-seen place (tap on a small map, or use my location).
- Saving inserts into `lost_pets` with `status = 'open'`.

PRD ref: `prd.md > Lost-Pet Reports`.

### Alert poller and pop-up
A client hook, `useAlerts`, runs on the main screen every 30 seconds and whenever the window comes back into view. Each run:
- fetches open `lost_pets`
- keeps those with no place, or within **3 km** of the person (haversine, computed on the phone)
- excludes the person's own reports and any they've dismissed (dismissed IDs stay in the browser's `localStorage`)

The newest match shows as the corner pop-up, and tapping it opens `/lost/[id]`. The same hook also fetches the unread-sighting count for the badge.

PRD ref: `prd.md > Lost-Pet Reports`, `prd.md > Notifications and Profile`.

- (Added after the final review) The poller also looks for **red animals**: unhelped SOS captures from the last 3 days that are red right now (tagged red, or amber that waited too long; `lib/urgency.ts`), within 3 km, not your own, not dismissed (`lib/geo.ts > redAlertsFor`). The newest shows as a red-bordered pop-up (`components/RedAlert.tsx`) above the lost-pet one. Tapping opens `/?pin=<id>`, which centers the map on the pin and opens its card.

### Lost-pet detail and sightings
- `/lost/[id]` shows the photo, description, and last-seen place, with two actions:
  - **"I see it now"**: take a photo. The person's current location is attached.
  - **"Report a sighting"**: when, where (tap on a map or type a place), and what it looked like. The description is required.
- Both insert into `sightings`.
- If the viewer is the owner, the page shows **Mark found** instead. It sets `status = 'found'`, and the alert stops showing for everyone.

PRD ref: `prd.md > Sightings`, `prd.md > Lost-Pet Reports`.

### Comments (added after the final review)
- `comments` table: exactly one of `capture_id` / `lost_pet_id`; `body` 1–500 characters; `read_at`. Row rules: read and insert on SOS captures and lost-pet reports (`is_commentable`), insert as yourself only, delete your own, and only the post's owner (`owns_post`) can update, and only `read_at` (column grant).
- `components/Comments.tsx` on `PinCard` (SOS only) and `/lost/[id]`: labels authors "Poster" / "Neighbor N" instead of names, marks others' comments read when the owner opens it, and calls `/api/notify` after sending (slice 15).
- `lib/comments.ts > commentsOnMyPosts` feeds `useAlerts` (bell count = unread sightings + unread comments; newest undismissed comment is a pop-up, `components/CommentAlert.tsx`) and `/notifications`.

### Phone notifications (added after the final review)
- `public/sw.js` (service worker) shows pushes and opens their link on tap; it picks the English or Mongolian text from the payload by the phone's language. `app/manifest.ts`, `public/icon-192.png`, `public/icon-512.png`, `app/apple-icon.png` make the app installable (iPhones need that for push). `proxy.ts` lets `sw.js` and the manifest load without a login.
- `lib/push.ts` + `components/PushToggle.tsx` (profile): subscribe with the VAPID public key and save via `save_push_subscription` (a phone that switches accounts moves with it), or unsubscribe and delete.
- `/api/notify` (`web-push`): given `{ comment_id }` or `{ sighting_id }`, checks with the secret key that it's the caller's, made within the last 2 minutes, and not already sent; pushes to the post owner's devices (never the author's own), deleting subscriptions the push service reports gone (404/410). VAPID subject is the project URL, not a personal email. Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
- Verified with a fake push service (local HTTPS with real Web Push keys) that decrypted the exact payload, because Chrome refuses push subscriptions in automated browsers. The real-phone test is the learner check.

### Notifications page
- `/notifications` lists sightings on the person's reports, newest first, each with its photo or details.
- Opening the page sets `read_at = now` on the unread ones, which clears the badge.

PRD ref: `prd.md > Notifications and Profile`.

### Profile
- `/profile` shows the display name, then everything the person has posted (captures and lost-pet reports), with the sightings received on each lost-pet report.
- Has "Report lost pet" and "Log out".

PRD ref: `prd.md > Notifications and Profile`.

### Sample content (added after the final review)
- `lib/location.ts > getLocation` returns central Ulaanbaatar for demo accounts (`isDemoAccount`, cached per account) and the phone's location (`lib/geo.ts > getDeviceLocation`) for everyone else; every screen uses it.
- `same_world(other)` (SQL) is true when both accounts are demo or both are real. It's part of the read rules for captures and lost pets and of `is_commentable`, and `/api/match` filters candidates the same way.
- `scripts/seed-demo.mjs` (secret key): creates or finds the demo account and a "Demo neighbor" (both logins use `DEMO_PASSWORD`, kept in step on every run), marks both `is_demo`, wipes their posts and photos, and inserts the sample captures (backdated where the story needs it), lost-pet report, and comments, with place names from Nominatim via `lib/place.ts > placeName`. It refuses to run until `same_world` exists. Photos and credits: `scripts/demo-photos/` (Wikimedia Commons, CC0 / OGL v3 / CC BY 2.0).

## Data Model

All tables live in Supabase Postgres. Supabase **row-level security (RLS)** is turned on for every table. RLS rules are access rules the database itself checks: "who may read or change this row." That's how "Collect pins are private" is enforced, rather than relying on the app to hide them. Everything here persists between sessions (`prd.md > States and Boundaries > Persists`).

### `profiles`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | = `auth.users.id` |
| `display_name` | text | set at sign up |
| `created_at` | timestamptz | default `now()` |
| `is_demo` | boolean | default false; set only by `schema.sql` for the demo account (added after the final review) |

**Rules:** any logged-in person can read profiles (to show who sent a sighting). People can only insert and update their own, and only the `display_name` column (column grants), so nobody can turn on `is_demo`.

### `captures`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid → profiles | the capturer |
| `photo_path` | text | path in the `photos` bucket |
| `breed` | text, nullable | AI guess or typed |
| `mode` | text | `'collect'` or `'sos'` |
| `need` | text, nullable | `'food' \| 'water' \| 'vet' \| 'owner'`; only when `mode = 'sos'` |
| `lat`, `lng` | double precision | where the capturer stood (or dropped the pin) |
| `address` | text, nullable | from Nominatim, stored once |
| `created_at` | timestamptz | default `now()` |
| `helped_at` | timestamptz, nullable | set by `mark_helped` |
| `helped_by` | uuid, nullable | who ticked it |
| `animal` | text, nullable | `'cat' \| 'dog'` from the AI check (added after the final review) |
| `animal_id` | uuid | captures of the same animal share it; a new capture gets a fresh one unless the person confirms a match (added after the final review) |
| `urgency` | text | `'green'` (Collect) or `'amber' \| 'red'` (SOS), checked against `mode`; a trigger fills it for older app versions (added after the final review) |

**Rules:**
- **Read:** `mode = 'sos'` OR `user_id = auth.uid()`.
- **Insert:** own rows only.
- **Helped:** done only through the `mark_helped(capture_id)` database function. It sets `helped_at` and `helped_by` on an SOS capture that isn't helped yet. This lets anyone mark helped without letting them edit other fields.
- **Delete:** own rows only (`user_id = auth.uid()`).

**Leaving and coming back:** the map and collection re-query on load, so they always show what's in the table.

### `lost_pets`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `owner_id` | uuid → profiles | |
| `photo_path` | text | |
| `description` | text | |
| `last_seen_lat`, `last_seen_lng` | double precision, nullable | null → alert goes to everyone |
| `last_seen_address` | text, nullable | |
| `status` | text | `'open'` or `'found'` |
| `created_at`, `found_at` | timestamptz | |

**Rules:** any logged-in person can read. Owners can only insert their own and update their own (mark found).

### `sightings`

| column | type | notes |
|---|---|---|
| `id` | uuid, PK | |
| `lost_pet_id` | uuid → lost_pets | |
| `reporter_id` | uuid → profiles | |
| `kind` | text | `'now'` (photo) or `'report'` |
| `photo_path` | text, nullable | for `'now'` |
| `seen_at` | timestamptz | `now()` for `'now'`, entered for `'report'` |
| `lat`, `lng` | double precision, nullable | |
| `place_text` | text, nullable | typed place, if any |
| `description` | text, nullable | required for `'report'` |
| `created_at` | timestamptz | |
| `read_at` | timestamptz, nullable | set when the owner opens notifications |

**Rules:**
- **Insert:** any logged-in person, as themselves.
- **Read:** the reporter, or the owner of the lost pet.
- **Update `read_at`:** the owner of the lost pet.

### Storage bucket `photos`
- **Public read**, so pins and cards can show images with a plain URL. Uploads, listing, and deletes are allowed only in your own `{user_id}/` folder.
- Holds capture, lost-pet, and sighting photos.

### Kept in the browser only
- **Dismissed alert IDs** in `localStorage`. This is a per-phone convenience, and losing it just means an alert shows again.
- **The active tab** is kept in the URL.

## File Structure

```
collect-savar/
├── app/
│   ├── layout.tsx              # root layout, fonts, Leaflet CSS import
│   ├── globals.css             # Tailwind + theme color tokens
│   ├── page.tsx                # main screen: tab toggle, map or collection, buttons, alert pop-up
│   ├── login/page.tsx          # sign up / log in
│   ├── capture/page.tsx        # photo → breed → Collect/SOS → save
│   ├── lost/
│   │   ├── new/page.tsx        # report a lost pet
│   │   └── [id]/page.tsx       # lost-pet detail, sighting forms, owner "mark found"
│   ├── notifications/page.tsx  # sightings received; marks them read
│   ├── profile/page.tsx        # my posts + sightings received, log out
│   └── api/
│       ├── breed/route.ts      # photo → OpenAI → { breed }
│       └── address/route.ts    # lat/lng → Nominatim → address
├── components/
│   ├── MainShell.tsx           # top bar (tabs, notification icon) + bottom buttons
│   ├── MapView.tsx             # Leaflet map + photo pins (client-only)
│   ├── PinCard.tsx             # bottom sheet with helped tick
│   ├── CollectionGrid.tsx      # 3-column grid
│   ├── VetFinder.tsx           # closest vet sheet + directions link
│   ├── LostPetAlert.tsx        # corner pop-up
│   ├── LocationPicker.tsx      # small map to tap a spot (manual pin, last-seen, sighting place)
│   └── PhotoInput.tsx          # camera input + in-browser shrink
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # browser Supabase client
│   │   └── server.ts           # server Supabase client (cookies)
│   ├── geo.ts                  # haversine distance, closestTo, UB default center, getLocation, address lookup
│   ├── image.ts                # shrink photo to 1024px JPEG
│   ├── useAlerts.ts            # 30s poll: nearby lost pets + unread sighting count
│   ├── types.ts                # Capture, LostPet, Sighting types
│   ├── vets.json               # built-in Ulaanbaatar vet list
│   ├── vets.ts                 # typed VETS export
│   └── pendingPhoto.ts         # hands the paw-button photo to /capture
├── supabase/
│   └── schema.sql              # tables, RLS rules, mark_helped(), photos bucket — run in SQL Editor
├── proxy.ts                    # session refresh + redirect to /login (Next.js 16's name for middleware)
├── scripts/                    # check-*.mjs: verification scripts run against Supabase
├── public/                     # icons, empty-state art
├── .env.example                # the three variable names, no values
├── devpost/                    # Devpost learning workspace
├── package.json
└── README.md                   # what it is, setup, env vars, how to run
```

## External Services and Dependencies

### Supabase
- **What:** Auth (email + password), Postgres, Storage. Docs: https://supabase.com/docs
- **Keys:** project URL + anon/publishable key (safe in the browser *because* RLS is on).
- **Calls (via `supabase-js`):**
  - `auth.signUp` / `signInWithPassword` / `signOut`
  - `from('captures').select().or(...)`, `.insert()`
  - `rpc('mark_helped', { capture_id })`
  - `storage.from('photos').upload(path, file)` and `.getPublicUrl(path)`
- **Cost:** the free tier is enough for a POC. Free projects pause after about a week of no use, so **open the project before recording the demo**. Check current free-tier limits at https://supabase.com/pricing.

### OpenAI
- **What:** vision model for the breed guess. Docs: https://platform.openai.com/docs/guides/images-vision
- **Key:** `OPENAI_API_KEY`, server only. Requires billing on the OpenAI account.
- **Call:** from `/api/breed`, send one user message containing the instruction text and the image as a base64 `data:image/jpeg;base64,...` URL. Ask for JSON output `{ animal, breed }`.
- **Model:** **`gpt-5.4-nano`** via the Responses API, with `reasoning.effort: "none"`, the image at `detail: "low"`, and a strict JSON schema output. Checked in `5-build` (Oct 2026): $0.20 per 1M input tokens and $1.25 per 1M output, so each photo costs a fraction of a cent. Answers took about 2 seconds in testing. If breed guesses are weak, `gpt-5.4-mini` ($0.75 / $4.50 per 1M) is the step up.
- **Cost:** small per photo, since photos are already shrunk to 1024 px. Set a monthly spending limit in the OpenAI dashboard.
- **(Added after the final review) Real-photo check:** `/api/breed` now sends the image at `detail: "high"`. At `"low"` about 1 in 4 photos of a screen got through; at `"high"`, 11 of 12 were caught and 16 of 16 real photos passed.
- **(Added after the final review) Re-identification, `/api/match`:** `gpt-5.4-mini`, `reasoning.effort: "low"`, all images at `detail: "high"`, sent as base64 (the server downloads the candidate photos itself; letting OpenAI fetch the URLs caused random failures). Up to 6 animals within 500 m, found with `SUPABASE_SECRET_KEY` (`lib/supabase/admin.ts`, server only) so private captures count. The response only carries a photo URL when the person may see that capture. Testing showed no false matches between different cats, but about 1 real match in 8 was missed at random, so the route asks twice in parallel and takes a match from either answer. About 3–5 seconds per save.

### OpenStreetMap tiles (map drawing)
- (Changed after the final review) `components/MapTiles.tsx` picks the map by app language: Mongolian uses `tile.openstreetmap.org` (local names, Cyrillic in Ulaanbaatar); English uses `tile.openstreetmap.de`, which adds Latin-letter spellings (German-style, e.g. "Süchbaatar") and stops at zoom 18. A tester from Korea couldn't read the Cyrillic labels; CARTO's English-label tiles now need a paid key.
- **Tile URL:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with the required attribution "© OpenStreetMap contributors".
- **Usage:** OK for light use like a demo. Policy: https://operations.osmfoundation.org/policies/tiles/
- No key needed.

### Nominatim (address lookup)
- **Call:** `GET https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}&accept-language=mn,en`, with header `User-Agent: CollectPaw/0.1 (contact email)`.
- **Response:** use `display_name`, or build a short form from `address.road` + `address.suburb`.
- **Limit:** max 1 request/second. We call it once per save. Policy: https://operations.osmfoundation.org/policies/nominatim/
- No key needed.

### Vet list (`lib/vets.json`)

Seeded from an OpenStreetMap query run during planning (vets within 20 km of central UB, data timestamp 2026-07-24). It returned only 10 entries. Duplicates, a pharmacy, and two unnamed points are left out:

| name | lat, lng | note |
|---|---|---|
| Энэрэх мал эмнэлэг (Enereh Animal Hospital) | 47.91051, 106.90878 | |
| SOS Малын Эмнэлэг | 47.92179, 106.88945 | |
| Амар мал эмнэлэг | 47.91272, 106.89788 | |
| Сонор амьтны эмнэлэг (Sonor Animal Hospital) | 47.91650, 106.94564 | listed twice in OSM ~100 m apart; kept one |
| ХААИС Мал эмнэлгийн сургууль (ULSM Veterinary Medicine) | 47.88322, 106.91016 | a university school; learner to confirm it treats animals |

**Shape:** `[{ "name": "...", "lat": 0, "lng": 0, "maps"?: "Google Maps link", "address"?: { "en", "mn" }, "hours"?: { "en", "mn" } }]`.

(Added after the final review) The learner sent 11 vets with addresses, hours, and Google Maps links. Coordinates were read from each link's place page (headless browser, the `!3d…!4d…` part of the settled URL), so the list is now 11 learner vets plus the ULSM school from the OSM seed. Three OSM spots were noticeably off (Энэрэх about 2 km, SOS about 1 km, Сонор about 500 m). Each vet's `maps` link is what Directions opens. Mongolian address and hours text was drafted by the agent for the learner to review.

### Nominatim vet search (vets outside Mongolia, added after the final review)
- `/api/vets?lat&lng&lang` (logged-in) asks Nominatim for "veterinary surgery" (OpenStreetMap's search phrase for `amenity=veterinary`) inside a ~5 km box around the person, then ~30 km if that finds fewer than 3; names come in the app's language where OpenStreetMap has them. The spot is rounded to ~1 km, requests queue at one a second (Nominatim's limit), and answers are cached a day per spot and language. `lib/vets.ts > inMongolia` decides built-in list vs. this route.
- Overpass was built first, but all public Overpass servers kept timing out for days (a tester in Korea saw "Couldn't reach the vet map"); Nominatim answered in about a second (Seoul 18 vets, Berlin 40). Checked with `scripts/check-vets-abroad.mjs`.

### Vercel
- **What:** hosting, auto-deploys on push to GitHub. Docs: https://vercel.com/docs
- **Cost:** the free Hobby tier.
- **Setup:** set the three environment variables in the project settings.

## Important Failure Modes

- **OpenAI is slow, errors, or the key runs out** → after ~10 seconds, the breed field is left empty with "Couldn't guess — type it in." Capture always continues (`prd.md > Capture`).
- **Location refused or unavailable** → the map opens on central Ulaanbaatar. At capture, the app asks again, then shows the tap-to-drop map (`prd.md > States and Boundaries`). The vet finder uses the map center and says so.
- **Weak mobile data while saving** → photos are already shrunk. A "Saving…" state blocks double taps. On failure, the form keeps everything and shows "Couldn't save — try again."
- **Nominatim fails** → the capture saves with `address = null`, and the pin card shows "Near {lat}, {lng}".
- **Supabase project paused** (free tier, after inactivity) → nothing loads. Open the Supabase dashboard to wake it before demo day.

## What Was Simplified and Why

- **Checking every 30 seconds** instead of instant live updates. Agreed: a delay of up to 30 seconds is barely noticeable in the demo, and it's much easier to debug. The fuller version would use Supabase Realtime subscriptions.
- **Built-in vet list** instead of a live map search. Agreed after OpenStreetMap returned only ~10 vets for UB and its server failed once. The fuller version would use Google Places with a billing account.
- **"Helped disappears after a day" is a filter in the map query**, not a scheduled cleanup job. Same result for the person, nothing running in the background.
- **Fetch all visible pins and filter distances on the phone** instead of database geo-queries (PostGIS). At POC scale, with tens or hundreds of pins, this is instant. The fuller version would query only pins inside the map's visible area.
- **The phone's built-in camera picker** (`capture="environment"`) instead of a live in-app camera view. One line of code and reliable on phones. A custom viewfinder could come later.
- **Public photo bucket.** Photo URLs are unguessable but not access-checked, so a private Collect photo can be seen by someone who has its exact link. Fine for a POC. The fuller version would use signed URLs.
- **Email confirmation turned off** so demo accounts work instantly.
- **In-app badge and pop-up** instead of push notifications (already set in `prd.md > Deferred From the POC`).

## Decisions and Open Issues

### Decided in this conversation (learner)
- **Next.js + Tailwind.** The learner knows Next.js well.
- **Supabase** for accounts, database, and photos. The learner has used it before.
- **Deploy to Vercel**, so the phone gets `https://` for the camera and location outdoors.
- **OpenAI for the breed guess.** This was the learner's own pick over the two options offered (Claude vision or an in-browser model). Tradeoff accepted: a billed key and a small cost per photo.
- **Demo city: Ulaanbaatar, Mongolia.** It's the default map area and the vet list region.
- **Alerts and notifications check every 30 seconds**, not instant.
- **"Near" = 3 km** from the last-seen place (adjustable constant in `lib/geo.ts`).
- **Built-in vet list** seeded from OpenStreetMap, plus vets the learner adds.
- **Vet button shows** the closest vet's name and distance, a highlighted pin, and a Google Maps Directions link. This resolves the PRD's vet-finder open question.

### Derived implementation details (agent, from the choices above)
- **TypeScript**, since it's the create-next-app default. Not discussed, so the learner can switch to JavaScript.
- Email + password sign-in with a display name.
- `mark_helped` as a database function, so anyone can mark helped but no one can edit others' captures.
- **Helped applies to SOS pins only.** Collect animals are "fine" by definition (`prd.md > Product Decisions`), so their pin card has no helped tick.
- Dismissed alerts are remembered per phone in `localStorage`.
- Photos are shrunk to 1024 px before uploading and before the AI call.

### Learner uncertainty
When asked which part of the plan they were least sure about, the learner said it was fine for now. No specific uncertainty came up. Likely first-time areas to watch during the build are Supabase RLS rules and Storage upload policies. `5-build` should explain these when it writes `schema.sql`.

### Still open
- **Tab name** "Nearby Friends" vs "Nearby Paws": can wait for the build. The app name was settled after the final review: **Collect Paw** (the project folder keeps its old name, `collect-savar`).
- **Placement of the Report lost pet button** on the main screen: in the build.
- **Vet list completeness:** the learner adds known UB vets and confirms whether the ULSM school entry belongs.
- ~~**OpenAI model name and price.**~~ *Settled in `5-build`: `gpt-5.4-nano` (see External Services).*
- ~~**Next.js middleware vs `proxy.ts` naming.**~~ *Settled in `5-build`: Next.js 16.4 uses `proxy.ts`.*

---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can sign up, log in, and land on a map centered on you**
  Becomes usable: A running Next.js app where a new person signs up (email, password, display name), lands on the Nearby Friends map centered on their location (or central Ulaanbaatar if refused), switches to an empty My Collection tab, and logs out from a simple profile page. Logged-out visitors are always sent to `/login`.
  Why now: Proves the whole foundation end to end on the first step: scaffold, Tailwind theme, Supabase connection, sessions, and the client-only Leaflet map. Every later slice lands inside this frame. The visual direction is asked before this slice because it's the first UI work.
  PRD ref: `prd.md > The Core Journey` (steps 1–2), `prd.md > Accounts`, `prd.md > Screens and Layout`, `prd.md > States and Boundaries` (first open, location refused), `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > Components > Auth and session`, `spec.md > Components > Main screen shell`, `spec.md > Components > Map view (Nearby Friends)`, `spec.md > Data Model > profiles`, `spec.md > File Structure`
  Build: Ask the learner for colors, font feel, references, and the tab name, then record them in `spec.md > Look and Feel` and `prd.md > Look and Feel`. Scaffold Next.js (App Router, TypeScript, Tailwind) in the project root; verify current versions and whether the session file is `middleware.ts` or `proxy.ts`. Install `@supabase/supabase-js`, `@supabase/ssr`, `leaflet`, `react-leaflet`. Add `.env.example`, `lib/supabase/client.ts` and `server.ts`, the session/redirect file, `/login` (sign up + log in), `supabase/schema.sql` with the `profiles` table and its RLS rules, `MainShell` (tab toggle in the URL, notification icon placeholder linking to `/profile`, Capture and Vet buttons as placeholders), client-only `MapView` with OSM tiles and attribution, `lib/geo.ts` (UB default center, getLocation), a minimal `/profile` with display name and log out, and theme color tokens in `globals.css`. The learner creates the Supabase project, turns off "Confirm email", runs `schema.sql`, and fills `.env.local`.
  Verify (mechanical): `npm run build` and `npm run lint` pass. With the dev server running, `curl -I localhost:3000/` redirects to `/login` and `/login` returns 200. A script in `scripts/` signs up a test account through Supabase, confirms its `profiles` row exists with the display name, signs out, signs back in, and reads the same profile.
  Learner check: Run `npm run dev`, open http://localhost:3000, sign up with a display name, allow location, and see the map centered near you. Switch to My Collection and back, then open the profile, log out, and log back in. Say whether the colors and feel look the way you pictured.
  Commit: `Add sign up, log in, and the main map screen`

- [x] **2. You can capture an animal and see it pop up as a pin and in My Collection**
  Becomes usable: Tapping Capture opens the camera (a file picker on desktop). The person takes a photo, types a breed, chooses Collect or SOS (and a need for SOS), and saves. They return to the map with a new square photo pin, where SOS and own-Collect pins look different. The card appears at the top of the three-column My Collection grid with "breed / date". Another account sees the SOS pin but never the Collect one.
  Why now: This is the unique kernel — collecting that also puts animals in need on a shared map. It is also where the riskiest new pieces live (Storage uploads, RLS privacy rules, photo pins), so finding problems here is cheap. The breed field is typed by hand for now; the AI guess slots in later without changing this flow.
  PRD ref: `prd.md > The Core Journey` (steps 3–6), `prd.md > Capture`, `prd.md > Map (Nearby Friends)`, `prd.md > My Collection`, `prd.md > States and Boundaries` (location refused, empty collection, who can do what)
  Spec ref: `spec.md > Components > Capture flow`, `spec.md > Components > Map view (Nearby Friends)`, `spec.md > Components > My Collection grid`, `spec.md > Data Model > captures`, `spec.md > Data Model > Storage bucket photos`, `spec.md > Look and Feel`, `spec.md > Important Failure Modes` (weak data while saving, location refused)
  Build: Add the `captures` table, its RLS rules, and the public `photos` bucket with own-folder upload rules to `schema.sql` (explain RLS and storage rules to the learner as it's written). Build `PhotoInput` and `lib/image.ts` (shrink to 1024 px JPEG), `/capture` (photo → breed text field → Collect/SOS → need → save with "Saving…" and retry-on-failure), location at save time with a re-ask and the `LocationPicker` tap-to-drop fallback, `lib/types.ts`, photo pins as Leaflet `divIcon`s in the agreed theme colors with a small need badge on SOS pins, map reload after save and when the app returns to view, and `CollectionGrid` with an empty state.
  Verify (mechanical): `npm run build` and `npm run lint` pass. A script with two test accounts: A uploads a photo and inserts one SOS and one Collect capture; A reads both; B reads only the SOS one; B cannot upload into A's photo folder; the photo's public URL returns 200.
  Learner check: Capture one animal as Collect and one as SOS ("needs food"). See both pins on the map looking different, and both cards at the top of My Collection. Log in as a second account in a private window and confirm only the SOS pin shows.
  Commit: `Capture animals as pins and collection cards`

- [x] **3. You can tap a pin and mark an animal helped**
  Becomes usable: Tapping any pin opens a bottom sheet with the photo, breed, street address, mode/need, and status. On an SOS pin that isn't helped yet, anyone can tick **helped**. The pin turns the helped color for everyone, drops off the map a day later, and stays in the capturer's collection with a distinct helped look.
  Why now: Completes the "it also helps them" half of the kernel, the step that turns a collection into community help. Together with slice 2, this is the whole core loop the demo is built around.
  PRD ref: `prd.md > The Core Journey` (step 7), `prd.md > Marking Helped`, `prd.md > Map (Nearby Friends)` (pin card), `prd.md > My Collection` (helped look)
  Spec ref: `spec.md > Components > Pin card`, `spec.md > Components > Address route (/api/address)`, `spec.md > Data Model > captures` (`mark_helped`), `spec.md > External Services and Dependencies > Nominatim (address lookup)`, `spec.md > Important Failure Modes` (Nominatim fails)
  Build: Add `/api/address` (Nominatim reverse lookup with a proper User-Agent, short address or null) and call it once when saving a capture. Add the `mark_helped(capture_id)` function to `schema.sql`. Build `PinCard` (helped tick only on unhelped SOS pins, "Near {lat}, {lng}" fallback), apply the one-day helped filter in the map query, a helped pin style, and the helped look in `CollectionGrid`.
  Verify (mechanical): `npm run build` and `npm run lint` pass. `curl` to `/api/address` with UB coordinates returns a short address. A script: B calls `mark_helped` on A's SOS capture and it sets `helped_at`/`helped_by`; B cannot update any other field or mark a Collect capture; a capture with `helped_at` set to 25 hours ago is excluded by the map query while a fresh one is included.
  Learner check: Tap your SOS pin and check the photo, breed, and address. From the second account, tick helped and watch the pin change color on both screens. Confirm the animal still shows in your collection with the helped look.
  Commit: `Add pin card, addresses, and marking helped`

- [x] **4. You can capture a real stray on your phone, outside**
  Becomes usable: The app runs at a public `https://…vercel.app` link. On a phone, Capture opens the real camera, location works, and a stray captured outside appears as a pin and a collection card.
  Why now: Phones only allow the camera and location on `https://`, and the demo happens outdoors on a phone. Doing this right after the core loop catches phone-only problems (camera input, location prompts, photo size, mobile layout) while there's still time to fix them, and it's the early hands-on checkpoint.
  PRD ref: `prd.md > The Core Journey` (Success), `prd.md > Capture`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > External Services and Dependencies > Vercel`, `spec.md > Look and Feel` (mobile-first)
  Build: With the learner's agreement, they create a GitHub repo and push; the learner links it to Vercel and sets the environment variables. Add a short `README.md` with setup and run steps. Fix any phone-specific issues they find (layout at ~393 px, touch targets, camera/location behavior).
  Verify (mechanical): `npm run build` passes locally. `curl -I` on the deployed URL returns a redirect to `/login`, and `/login` returns 200 over `https://`. After the learner's phone capture, a script confirms the new row exists in `captures` with a photo URL that returns 200.
  Learner check: On your phone, open the Vercel link, log in, go outside, and capture a real stray. See its pin on the map and its card in My Collection, then tap it and check the address. Tell me what felt off on the phone.
  Commit: `Deploy to Vercel and fix phone capture`

- [x] **5. The app guesses the breed for you**
  Becomes usable: After taking a photo, the breed field fills in with an AI guess that the person can fix. If the photo clearly shows no cat or dog, the app says "Hmm, no cat or dog in this picture" and asks for a retake. If the AI fails or is slow, the field stays empty with "Couldn't guess — type it in" and capture continues.
  Why now: This makes collecting more fun, but it can't block anything, since capture already works with a typed breed. It's after the phone check so the guess is tested on real phone photos. It depends on the learner's billed OpenAI key.
  PRD ref: `prd.md > Capture` (breed guess), `prd.md > Product Decisions` (AI breed guess)
  Spec ref: `spec.md > Components > Breed route (/api/breed)`, `spec.md > External Services and Dependencies > OpenAI`, `spec.md > Important Failure Modes` (OpenAI slow or errors)
  Build: Verify the current low-cost OpenAI vision model name and price, and record it in `spec.md`. Install `openai`. Add `/api/breed` (logged-in check, JSON `{ animal, breed }` prompt, `{ animal: null, breed: null }` on error or timeout), and call it from `/capture` with a ~10 second timeout that leaves the field editable. Block saving with a retake prompt only when `animal` is `"other"`.
  Verify (mechanical): `npm run build` and `npm run lint` pass. `/api/breed` without a session returns 401. With a session, a cat photo returns `animal: "cat"` and a breed, and a non-animal image returns `animal: "other"`. A forced timeout or bad key returns `{ animal: null, breed: null }`.
  Learner check: Capture a cat or dog photo and see the breed fill in. Fix it if it's wrong, and save. Then try a photo of something that isn't an animal and confirm the app says there's no cat or dog and asks for another photo.
  Commit: `Add AI breed guess to capture`

- [x] **6. You can find the closest vet**
  Becomes usable: Tapping the Vet button shows the closest Ulaanbaatar vet's name and distance, highlights its pin on the map, and offers a Directions link that opens Google Maps. If location was refused, it uses the map center and says so.
  Why now: It's the last piece of the core demo ("displaying the closest vet") and self-contained, so it goes after the riskier parts are proven. The learner adds vets they know are missing.
  PRD ref: `prd.md > The Core Journey` (step 8), `prd.md > Closest Vet`
  Spec ref: `spec.md > Components > Vet finder`, `spec.md > External Services and Dependencies > Vet list (lib/vets.json)`, `spec.md > Important Failure Modes` (location refused)
  Build: Create `lib/vets.json` from the spec's seeded list plus vets the learner adds, and confirm whether the ULSM school entry stays. Add haversine to `lib/geo.ts`, then build `VetFinder` (closest vet sheet, distance, Directions link) and the highlighted vet pin.
  Verify (mechanical): `npm run build` and `npm run lint` pass. A small script checks haversine against a known distance and confirms that, for a point next to each vet in `vets.json`, the closest vet returned is that one.
  Learner check: Tap Vet and check the vet name and distance make sense for where you are. Tap Directions and confirm Google Maps opens to that vet.
  Commit: `Add closest vet finder`

- [x] **7. An owner can report a lost pet, and people nearby see an alert**
  Becomes usable: From a Report lost pet button on the main screen (or the profile), an owner posts a photo, a description, and an optional last-seen place. Within about 30 seconds, other people within 3 km of that place (or everyone, if no place was given) see a corner pop-up. Tapping it opens the lost pet's details. The owner can mark it found, and the alert stops showing.
  Why now: The owner flow comes after the core loop (`prd.md > Product Decisions > Build order`). Alerts come before sightings because sightings start from the alert.
  PRD ref: `prd.md > The Core Journey` (step 9), `prd.md > Lost-Pet Reports`, `prd.md > States and Boundaries` (lost pet found)
  Spec ref: `spec.md > Components > Lost-pet report form`, `spec.md > Components > Alert poller and pop-up`, `spec.md > Components > Lost-pet detail and sightings` (detail and mark found), `spec.md > Data Model > lost_pets`, `spec.md > Data Model > Kept in the browser only`
  Build: Decide the Report lost pet button placement with the learner. Add `lost_pets` and its RLS rules to `schema.sql`. Build `/lost/new` (reusing `PhotoInput`, `LocationPicker`, and `/api/address`), `lib/useAlerts.ts` (30 s poll plus on return to view, 3 km filter, excludes own and dismissed), `LostPetAlert`, and `/lost/[id]` with details and the owner's Mark found.
  Verify (mechanical): `npm run build` and `npm run lint` pass. A script: A creates a report with a place and one without; B reads both; B cannot update A's report; A marks one found and it's no longer returned as open. A unit check of the alert filter: a point 2 km away is kept, 5 km away is dropped, and a no-place report is always kept.
  Learner check: As the second account, report a lost pet with a last-seen place near you. As your main account, wait up to 30 seconds for the pop-up, open it, and check the details. Then mark it found from the owner account and confirm the pop-up stops.
  Commit: `Add lost-pet reports and nearby alerts`

- [x] **8. People can send sightings, and the owner gets notified**
  Becomes usable: From a lost pet's page, someone sends "I see it now" (a photo, with their location) or "Report a sighting" (when, where, and a required description). The owner's top-left icon shows a count of new sightings. Tapping it lists them with photos or details and clears the count. The profile lists everything the person has posted, with sightings received on each lost-pet report.
  Why now: It closes the owner loop that slice 7 opens, and finishes everything in `prd.md > What We're Building`.
  PRD ref: `prd.md > The Core Journey` (steps 10–11), `prd.md > Sightings`, `prd.md > Notifications and Profile`
  Spec ref: `spec.md > Components > Lost-pet detail and sightings`, `spec.md > Components > Notifications page`, `spec.md > Components > Profile`, `spec.md > Components > Alert poller and pop-up` (badge count), `spec.md > Data Model > sightings`
  Build: Add `sightings` and its RLS rules to `schema.sql`. Add both sighting forms to `/lost/[id]`, the unread count to `useAlerts` and the badge on the notification icon, `/notifications` (list, then set `read_at`), and the full `/profile` (captures, lost-pet reports with sightings received, Report lost pet, Log out).
  Verify (mechanical): `npm run build` and `npm run lint` pass. A script with three test accounts: B sends a "now" sighting and C sends a "report" sighting on A's lost pet; a "report" without a description is rejected; A reads both and sees an unread count of 2; C cannot read B's sighting; A sets `read_at` and the count drops to 0.
  Learner check: As your main account, open the lost pet's alert and send one "I see it now" and one "Report a sighting". On the owner account, see the badge count, open notifications, check both sightings, and confirm the count clears. Open the profile and check your posts and the sightings on them.
  Commit: `Add sightings, notification badge, and profile history`

### Additions after the final review

- [x] **9. Capture only accepts real, fresh photos, and a demo account can upload**
  Becomes usable: The AI check that already turns away non-animal photos also turns away photos of a screen, a printed picture, a screenshot, or a drawing ("This looks like a photo of a picture — snap the animal itself"). A photo older than 10 minutes (picked from the gallery or a computer's files) is also turned away. Both checks are best effort: if the AI is down, capture still works. One demo account (marked in the database, so nobody can switch it on for themselves) skips both checks, gets "Upload from gallery" on the capture screen, and can drop each capture's pin anywhere on the map.
  Why now: The demo account is how the learner tests every later slice without finding real strays, so it comes first; the photo checks and the demo bypass are two sides of one rule.
  PRD ref: `prd.md > Features and Behavior > Capture`, `prd.md > Accounts`
  Spec ref: `spec.md > Components > Capture flow`, `spec.md > Components > Breed route (/api/breed)`, `spec.md > Data Model > profiles`
  Build: Paste-once SQL for all of slices 9–12 in `schema.sql` (`profiles.is_demo`, profile updates limited to `display_name`, capture columns for slices 10–11). `/api/breed` returns a `real` verdict alongside `animal`/`breed`. `/capture` checks the file's age and the verdict, and reads `is_demo` to show the upload button and the map drop. `scripts/make-demo.mjs` creates the demo account.
  Verify (mechanical): `npm run build` and `npm run lint` pass. `scripts/check-breed.mjs` with a real cat photo, a photo of a cat on a screen, and a non-animal photo: real → accepted, screen → `real: false`, banana → `other`. A script confirms a normal account can't set its own `is_demo`, and the demo account reads `is_demo = true`.
  Learner check: On your phone, try photographing a cat picture on your laptop screen: it's turned away. Log in as the demo account on your computer, upload a few animal photos from your files, and drop each one somewhere on the map.
  Commit: `Turn away photos of pictures and add a demo account`

- [x] **10. The same animal gets one profile instead of duplicates**
  Becomes usable: When you save a capture, the AI compares it with animals captured within about 500 m (coat pattern, face, ear-tip marks). If it finds a likely match, it asks "This might be an animal already captured nearby": it shows the match's photo when you're allowed to see it (yours, or an SOS pin), and otherwise just says someone already collected a similar animal. You choose **Same animal** (joins its profile), **Different animal** (new profile), or **Don't save**. The pin card shows "Seen N times · first seen …" with the photos you're allowed to see, and the map shows one pin per animal (its newest capture). The AI only ever suggests a match; it never merges on its own.
  Why now: It's the riskiest addition (lookalike animals, AI accuracy), so it's built while there's still room to adjust, and slice 9's demo uploads let the learner test it with several photos of the same animal.
  PRD ref: `prd.md > Features and Behavior > Capture`, `prd.md > Features and Behavior > Map (Nearby Friends)`
  Spec ref: `spec.md > Components > Capture flow`, `spec.md > Components > Pin card`, `spec.md > Components > Map view (Nearby Friends)`, `spec.md > Data Model > captures`, `spec.md > External Services and Dependencies > OpenAI`
  Build: `captures.animal_id` (each new capture starts its own animal) and `captures.animal`. New `/api/match` route that uses a server-only Supabase secret key to see nearby captures, including private ones, and returns only what the person may see. Duplicate prompt in `/capture`, the profile strip in `PinCard`, and one pin per animal in `MapView`.
  Verify (mechanical): Build and lint pass. A script with two accounts: A captures cat photo 1; B sends a second photo of the same cat nearby → match returned with no photo or name (A's capture is private); B sends a different cat → no match; a match beyond 500 m is never returned; joining sets B's `animal_id` to A's, and the count reads 2.
  Learner check: As the demo account, upload two photos of the same cat near each other: the second one asks if it's the same animal. Choose Same animal, then open the pin and check "Seen 2 times". Upload a clearly different cat and check that it isn't matched.
  Commit: `Recognize the same animal across captures`

- [ ] **11. Captures carry an urgency color that rises with time and cold**
  Becomes usable: Instead of Collect / SOS, capture offers 🟢 **Doing fine** (fed or fine, private like Collect), 🟠 **Needs a hand** (hungry or limping), and 🔴 **Urgent** (injured or trapped). Amber and red still pick a need. Pins, cards, and the collection use the color. Every SOS card shows how long the animal has been waiting ("waiting 2 days") and the current temperature there with a tip for its need ("🥶 −18°C — bring warm water, bowls freeze"). Amber turns red after 24 hours with no help, or after 12 hours at −10°C or colder. After 3 days with no help, the pin fades and says it might not be there anymore. Red captures still appear in your own collection as your record.
  Why now: Red alerts (slice 12) depend on knowing when a pin is red, including pins that turned red over time.
  PRD ref: `prd.md > Features and Behavior > Capture`, `prd.md > Features and Behavior > Map (Nearby Friends)`, `prd.md > Features and Behavior > My Collection`
  Spec ref: `spec.md > Components > Capture flow`, `spec.md > Components > Pin card`, `spec.md > Components > Map view (Nearby Friends)`, `spec.md > Components > My Collection grid`, `spec.md > Data Model > captures`
  Build: `captures.urgency` (existing SOS rows become amber). `lib/urgency.ts` works out the color now from urgency, waiting time, and temperature. `lib/weather.ts` fetches the current temperature from Open-Meteo (free, no key) once per screen. Update `/capture`, `PinCard`, `MapView`, `CollectionGrid`, and both languages.
  Verify (mechanical): Build and lint pass. A script checks the urgency rules (amber at 23 h stays amber, 25 h turns red, 13 h at −12°C turns red, and 3 days unhelped counts as "may be gone") and that the database rejects a red Collect capture. A live Open-Meteo call for Ulaanbaatar returns a temperature.
  Learner check: As the demo account, capture one of each color and check the pins and cards. Open an SOS card and check the waiting time, temperature, and tip.
  Commit: `Add urgency colors that rise with time and cold`

- [ ] **12. Red animals alert people nearby**
  Becomes usable: When an animal near you (within 3 km) is red, whether tagged red or turned red after waiting, you get a red-bordered pop-up like the lost-pet one: "🚨 Needs help now", the address, and how long it's been waiting. Tapping it opens that pin on the map; × hides it on this phone. Never for your own captures or helped ones. If a lost pet and a red animal both apply, both pop-ups show, red on top.
  Why now: It needs slice 11's urgency, and it reuses the lost-pet alert poller, so it's small.
  PRD ref: `prd.md > Features and Behavior > Lost-Pet Reports` (alert behavior it mirrors)
  Spec ref: `spec.md > Components > Alert poller and pop-up`, `spec.md > Components > Map view (Nearby Friends)`
  Build: Extend `useAlerts` with nearby red captures, add a red-bordered variant of the alert pop-up, and open a pin from `/?pin=<id>`.
  Verify (mechanical): Build and lint pass. A script: A captures a red animal; B within 3 km sees it as an alert candidate, C 5 km away doesn't, and A doesn't see their own; after B marks it helped, it no longer alerts. A headless browser opens `/?pin=<id>` and the pin card shows.
  Learner check: As the demo account, capture a red animal near you. On your main account, check the red pop-up appears, tap it, and the pin card opens.
  Commit: `Alert people nearby about red animals`

- [ ] **13. Your vets are on the map**
  Becomes usable: The vets the learner lists are added to the built-in vet list, so they appear on the map and can be the "closest vet."
  Why now: It's only data and doesn't depend on anything else, so it can go in whenever the learner sends the vets.
  PRD ref: `prd.md > Features and Behavior > Closest Vet`
  Spec ref: `spec.md > External Services and Dependencies > Vet list (lib/vets.json)`
  Build: Add each vet (name, latitude, longitude) to `lib/vets.json`.
  Verify (mechanical): Build passes; `scripts/check-vets.mjs` passes, and each new vet is inside Ulaanbaatar and closest to its own spot.
  Learner check: Tap the vet button near one of your vets and check that it shows up as the closest.
  Commit: `Add the learner's vets`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 4, on the phone: capture, pin, card, helped. Feedback: open the camera straight from the paw (done), delete own captures (done), turn away non-animal photos (moved into slice 5). Learner confirmed it works on the phone; their captures were Collect (private), so the DB check confirmed the live site, key type, and rules rather than reading their row.
- [ ] Additions: early check after slice 10 — the learner tries the demo uploads and duplicate matching, and their feedback shapes slices 11–13.
- [ ] Additions: final kick-the-tires after slice 13.
- [x] Final kick-the-tires exploration and feedback completed — learner tried lost-pet reports, alerts, and sightings with two accounts; feedback: a broken test report (fixed), profile hard to find (fixed), report/sighting not showing (account and test-data mix-up, confirmed working).

## Final Review

- [x] Check scripts left test lost-pet reports (broken photos) and test SOS pins visible to everyone — scripts now clean up after themselves; leftovers removed. Confirmed by the learner.
- [x] My profile was hard to find (only via the bell → Notifications) — added a profile button in the top-right corner; the bell now means Notifications only. Confirmed by the learner.
- [x] Learner couldn't see their report in the profile or their sighting in notifications — reproduced in a browser and both work; the sighting had gone to the script's leftover "Test" report, and reports only show for the account that filed them. Learner retried with their own accounts: working.
- [ ] Mongolian + English — location picks the first language, flags switch it (login screen and profile); Mongolian text drafted by the agent for the learner to review.
- [x] Final review complete — feedback resolved and learner confirms ready to ship. The learner plans a design refresh later and will raise it separately; nothing else requested now.

- [ ] Additions (slices 9–13) final review complete — feedback resolved and learner confirms ready.

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Prior practice connected, as a brief recap — the learner wanted to wrap up. Their goal (identifying the problem and solving it) was practiced at the final review: "it's not working" was narrowed by testing three causes in turn (the exact queries in a throwaway script, the real pages in a headless browser, then the data and accounts). The evidence showed the code worked and the cause was a leftover test report plus an account mix-up, and it exposed a real bug in `scripts/helpers.mjs` (test data not cleaned up), which was fixed.
Route and stops: Reference-only route in the map (not toured): `app/lost/new/page.tsx` `save` → `lib/useAlerts.ts` `fetchAlert` + `lib/geo.ts` `alertsFor` → `components/MainShell.tsx` `<LostPetAlert` / `components/LostPetAlert.tsx`.
Edit outcome: Not applicable — wrap-up kept to a recap at the learner's request; the learner plans their own design changes next (the map points at `app/globals.css` `@theme`).
Reflection: Offered as optional in the hand-off message.
Activity mode: Prior practice connected (brief recap).

## Revisions

- Session file is `proxy.ts`, not `middleware.ts` — Next.js 16.4 renamed middleware to proxy.
- Turned off the scaffold's `cacheComponents` / `partialPrefetching` flags — screens are per-user and load data in the browser through Supabase, so prerendering adds Suspense/caching rules without benefit for this POC.
- Profile rows are created by a database trigger on sign up — more reliable than a second insert from the browser, and keeps `profiles: insert own` as the only client path.
- Added `scripts/check-*.mjs` for mechanical verification against Supabase — the first run caught a secret key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS was being bypassed); swapped for the publishable key before anything was built for others.
- The paw button is now the camera input itself, and the photo is handed to `/capture` in memory — at the first phone checkpoint the learner wanted the camera to open instantly; phones only open the camera from a direct tap, so `/capture` couldn't open it on load. `/capture` still offers "Take a photo" if opened directly.
- Added deleting your own captures (tap a card or your pin → Delete → confirm) — requested by the learner at the first phone checkpoint; new `captures: delete own` and own-folder photo read/delete rules.
- Non-animal photos are now turned away in slice 5 instead of always letting capture continue — the learner worried about people uploading things that aren't cats or dogs. The block applies only when the AI check ran and said "other"; if the AI is down, capture still works.
- Report lost pet is an icon button at the bottom left (mirroring Vet) plus a profile menu item, and the alert pop-up sits top-right — the learner's placement choice in slice 7. When location is refused, alerts judge "nearby" from central Ulaanbaatar, matching the map's default.
- The bell now opens `/notifications`, which links to the profile (it used to open the profile directly) — tapping the icon has to list sightings, and the profile stays one tap away.
- Sightings can only change their `read_at` column (column-level grant), and can't be sent once a pet is found — tighter than the spec's "owner can update read_at", so a sighting's content can't be rewritten by anyone.
- The `scripts/check-*.mjs` runs now delete their test captures and photos and mark their test reports found when they finish — at the final review the learner opened a test report from a script (broken photo), and six test SOS pins were on the shared map in central Ulaanbaatar.
- Added Mongolian and English after the final review — the learner noticed the app targets Mongolian people. First language follows Vercel's visitor-country header (no GPS prompt), flags switch it; Mongolian tab labels shortened to "Ойролцоо" / "Цуглуулга" so the top bar fits on phones.
- Added slices 9–13 after the final review, at the learner's request: real-photo check plus demo account, re-identification, urgency colors with waiting time and weather, red alerts, and the learner's vets. Red ("injured or trapped") partly reverses `scope.md > Explicitly Cut` (emergency rescue). The learner chose to include it, and red reuses the lost-pet alert rather than adding a rescue flow.
- Slice 9's photo check sends the image at high detail, because at low detail about 1 in 4 photos of a screen got through. Slice 10's matching asks the AI twice in parallel and sends photos as data rather than links, because single answers missed about 1 real match in 8 and link fetching failed at random. Both were found by repeated check runs.
- All SQL for slices 9–12 went into one paste at the start of slice 9, so the learner only runs `schema.sql` once. A trigger fills in `urgency` for SOS captures saved by the older live app.

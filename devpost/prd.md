---
doc: prd
status: approved
---

# Collect Paw — Product Requirements

A playful, map-first web app where people "capture" the stray cats and dogs they spot. Each capture goes into their collection and, when the animal needs it, puts an SOS on a shared map so people nearby can help. Owners of lost pets can also raise an alert and get sighting reports from the community.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey

Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. Someone opens the app and signs up or logs in.
2. They land on the **Nearby Friends** tab: a full-screen map centered on where they are. It shows SOS animals from everyone, plus their own collected animals.
3. They spot a stray and tap the round **Capture** button at the bottom center.
4. They take a photo. The app guesses the breed, and they can fix it if it's wrong.
5. They choose a mode:
   - **Collect**: the animal is fine and they're just collecting it for fun.
   - **SOS**: it needs something. They pick what: **needs help** (food, water, vet) or **might be lost / looking for owner**.
6. The animal pops up as a pin and is saved to **My Collection**. An SOS pin shows on everyone's map. A Collect pin shows only on the capturer's own map.
7. Someone else taps an SOS pin and sees its photo, breed, address, and status. If they help the animal, they tick **helped**. The pin changes color and disappears from the map after a day.
8. When an animal needs a vet, anyone can tap the **Vet** button next to Capture to find the closest vet.
9. Lost pets: an owner reports their lost pet (photo, description, and an optional last-seen place). A small alert pops up in the corner for other people: near the last-seen place if one was given, otherwise everyone.
10. Someone who thinks they've seen it responds, either with a photo if they're looking at it now, or with a report (when, where, and what it looked like).
11. The owner sees a count on the notification icon in the top-left corner. Tapping it shows the sighting details, which are also kept in their profile history.

**Success:** going outside, capturing a real stray, seeing it appear as a pin and in My Collection with its breed and status, finding the closest vet, and marking it helped. Then, with a second account, reporting a lost pet, sending a sighting, and watching the owner receive it.

## Language

Added after the final review: the app is for people in Mongolia, so it speaks **Mongolian and English**.
- The first language follows where the person is: Mongolian in Mongolia, English elsewhere.
- Flag buttons (🇲🇳 / 🇬🇧) switch it, on the login screen and in the profile. The choice is remembered and wins over location.
- The AI breed guess answers in the chosen language. Street addresses already come back in Mongolian.

## Screens and Layout

- **Sign up / Log in**: shown before anything else.
- **Main screen** (both tabs share this frame):
  - Top center: a tab toggle, **Nearby Friends** | **My Collection**. The underline marks the active tab.
  - Top left: the **notification icon** with a count badge, which also leads to the **profile**.
  - Bottom center: the round **Capture** button.
  - Next to Capture: the **Vet** button.
  - A **Report lost pet** button (exact placement decided in the build).
  - Corner: the **lost-pet alert** pop-up, when there is one.
- **Nearby Friends tab**: a full-screen map with square photo pins: everyone's SOS animals plus your own collected ones. The two kinds of pins look different. Pins may overlap when animals are close together.
- **My Collection tab**: the map is replaced by a grid of cards, three per row. Each card shows the animal's image with "breed / date" underneath.
- **Pin card**: opens when a pin is tapped. It shows the photo, breed, address, status, and a **helped** tick.
- **Capture flow**: camera → photo → breed guess (editable) → Collect or SOS → (if SOS) pick the need → save.
- **Vet finder**: shows the closest vet.
- **Report lost pet**: a form for owners.
- **Lost-pet alert detail**: opened from the corner pop-up. It offers **"I see it now"** (photo) or **"Report a sighting"** (when, where, what it looked like).
- **Notifications**: a list of sightings received, opened from the top-left icon.
- **Profile / history**: a menu listing everything the person has posted (captures, lost-pet reports) and the details received on each.

Reference wireframe: two iPhone frames, "iPhone 16 - 1" (map tab) and "iPhone 16 - 2" (collection tab), shared during the PRD interview.

## Look and Feel

The learner chose to decide the visual direction during the build, and in `5-build` kept the pastel lavender reference below (details in `spec.md > Look and Feel`).
- Tone: **fun and playful first**. Not dark, even for SOS animals (`scope.md > Inspiration & Identity`).
- Reference shared: a location-sharing app with soft pastel lavender, rounded cards, lots of white space, and round photo pins on a light map. **Confirmed as the direction.**
- Inspirations: Pokémon Go (map-first, the satisfaction of capturing) and a cat-collecting web app seen on Instagram.
- (Changed after the final review) The learner swapped the lavender look for a more playful pet-app reference: warm cream background, forest green, coral, and lime, with italic serif titles. The layout stays the same.


## Features and Behavior

### Accounts
- [ ] (Added after the final review) The first time the map opens, three welcome screens explain the app (collect with the paw, green/amber/red, help and get help), with Next/Skip and "Let's go!". The profile's "How it works" replays them.
Develops `scope.md > The POC Boundary` ("My Collection").
- [ ] A new person can sign up, and a returning person can log in.
- [ ] After logging out and back in, the same person sees the same collection.
- [ ] (Added after the final review) One **demo account** skips the real-photo checks, can upload photos from the gallery, and drops each pin wherever it likes on the map. Only the database can mark an account as demo.

### Map (Nearby Friends)
Develops `scope.md > The Core Loop` step 1.
- [ ] The map opens centered on the person's current location.
- [ ] SOS animals from every account show as photo pins at the spot where they were captured, until they expire.
- [ ] The person's own Collect animals also show as pins, but only on their own map.
- [ ] Another account's Collect animals never appear.
- [ ] SOS pins and own collected pins look different from each other.
- [ ] Tapping a pin opens the pin card with photo, breed, address, and status.
- [ ] (Added after the final review) An animal captured more than once shows as one pin (its newest capture). Its card says "Seen N times · first seen …" with the other photos the person may see.

### Capture
Develops `scope.md > The Core Loop` step 2 and `scope.md > The POC Boundary` ("Capture: photo + need tag").
- [ ] Tapping Capture opens the camera, and the person can take a photo.
- [ ] After the photo, a breed guess appears in an editable field. The person can change it or type their own.
- [ ] (Changed after the final review) Instead of filling the field, the AI offers up to 3 breed suggestions as chips under it; tapping one fills the field, or the person types their own.
- [ ] If the breed can't be guessed, the field is empty and the person can type one. Capture still works.
- [ ] If the photo clearly shows no cat or dog, the app says so ("no cat or dog in this picture") and asks for another photo. If the check itself can't run, capture still works.
- [ ] (Added after the final review) A photo of a screen, a printed picture, a screenshot, or a drawing is turned away ("This looks like a photo of a picture"), and so is a photo older than 10 minutes. Both are best effort: if the AI check can't run, capture still works.
- [ ] The person chooses **Collect** or **SOS**.
- [ ] (Changed after the final review) The choice is now three colors: 🟢 **Doing fine** (fed or fine; private, like Collect), 🟠 **Needs a hand** (hungry or limping), 🔴 **Urgent** (injured or trapped). Amber and red are SOS and still pick a need. An amber animal nobody helps turns red after 24 hours, or 12 hours at −10°C or colder; SOS cards show how long it has waited and the temperature with a tip; after 3 days the pin fades with "might not be there anymore".
- [ ] Choosing SOS asks for one need: needs help (food / water / vet) or might be lost / looking for owner.
- [ ] Saving creates a pin on the map at the person's location and adds a card to My Collection.
- [ ] If location is still refused after asking again, the person drops the pin on the map by hand.
- [ ] (Added after the final review) On save, if the AI thinks an animal captured within 500 m is the same one, the app asks "Seen this one before?". It shows that capture's photo only if it's the person's own or an SOS pin; for someone else's private capture it just says a similar animal was already collected. The person chooses **Same animal** (joins its profile), **Different animal**, or **Don't save**. The AI never merges on its own, and if the check can't run the capture is saved as a new animal.

### My Collection
- [ ] (Added after the final review) **Add from gallery** (on My Collection, including when it's empty) adds an animal met earlier: a photo from the gallery, always green and private, placed by tapping the map. The "taken just now" check is skipped, but the cat-or-dog and photo-of-a-picture checks still apply, so internet pictures can't fill a collection.
- [ ] (Added after the final review) Saving the first capture of a breed shows "🎉 New breed unlocked!" with the breed and how many breeds you've found; the collection header counts breeds too. Breeds match ignoring capital letters and spacing.
Develops `scope.md > The POC Boundary` ("My Collection").
- [ ] It shows only the logged-in person's own captures, as a three-column grid.
- [ ] (Added after the final review) One card per animal: capturing the same animal again adds "×2" to its card instead of a new card.
- [ ] Each card shows the animal image and "breed / date".
- [ ] A new capture appears here right after saving.
- [ ] A helped animal stays in the grid and looks visibly different from the others.
- [ ] Tapping a card opens it, and the person can delete their own capture after confirming. Deleting an SOS capture removes its pin from everyone's map.

### Marking Helped
Develops `scope.md > The Core Loop` step 4.
- [ ] Anyone can tick **helped** on a pin card.
- [ ] Once ticked, the pin changes color on the map for everyone.
- [ ] One day after being marked helped, the pin no longer shows on the map.

### Closest Vet
Develops `scope.md > The Core Loop` step 5.
- [ ] Tapping the Vet button (next to Capture) shows the closest vet to the person's location, with its name and how far away it is.
- [ ] (Added after the final review) In Mongolia the vet list is the learner's built-in list; elsewhere it's the vets near the person from OpenStreetMap (10 km, widening to 30 km), with "Couldn't reach the vet map" when that service is down.
- [ ] (Added after the final review) The vet sheet starts compact and can be shrunk to one row or closed. "All vets" opens every vet listed nearest first with its distance. Tapping one (in the list or on the map) shows its name, distance, address, opening hours, and Directions. Directions opens the vet's Google Maps page.

### Lost-Pet Reports
- [ ] (Changed after the final review) The pet's photo can come from the phone's gallery or the camera, since the pet usually isn't there to photograph.
Develops `scope.md > Later` ("Lost-pet matching"), pulled into the POC by the learner.
- [ ] An owner can start a lost-pet report from the **Report lost pet** button on the main screen or from the profile menu.
- [ ] An owner can report a lost pet with a photo, a description, and an optional last-seen place.
- [ ] If a last-seen place was given, the alert pop-up appears only for people near that area.
- [ ] If no place was given, the alert appears for everyone.
- [ ] Tapping the pop-up opens the lost pet's details.
- [ ] The owner can mark the pet **found**, and the alert stops appearing.

### Red Alerts (added after the final review)
- [ ] When an animal within 3 km is red (tagged red, or amber that waited too long), people nearby get a red-bordered pop-up like the lost-pet one: "🚨 Needs help now", the address, and how long it has waited. Tapping it opens the pin; × hides it on this phone. Never for your own captures or helped ones; if both apply, the red pop-up sits above the lost-pet one.

### Comments (added after the final review)
- [ ] SOS pin cards and lost-pet report pages have a comment section (up to 500 characters each). Collect captures are private, so they have none.
- [ ] Nobody is shown by name: the post's owner is "Poster", everyone else "Neighbor 1, 2…" in the order they first commented on that post. You can delete your own comments.
- [ ] When someone comments on your post, you get a pop-up ("💬 New comment on your post") and your bell count goes up. The notifications page lists comments on your posts; opening the post or that page marks them read.

### Phone Notifications (added after the final review)
- [ ] In the profile, "Phone notifications → Turn on" asks for permission. After that, a new comment on your post or a sighting of your lost pet arrives as a phone notification even with the app closed; tapping it opens the post. Turn off any time.
- [ ] On iPhone it only works after Share → Add to Home Screen; the profile says so instead of showing the button.

### Sightings
- [ ] From the alert, someone can send **"I see it now"** with a photo.
- [ ] Or they can send **"Report a sighting"** with when they saw it, where, and what it looked like. The description helps the owner rule out false alarms.

### Notifications and Profile
Develops `scope.md > Later` ("Notifications"), pulled into the POC by the learner.
- [ ] When a sighting is sent, the owner's top-left icon shows a count of new items.
- [ ] Tapping the icon lists the sightings, each with its photo or details.
- [ ] The profile lists everything the person has posted (captures and lost-pet reports), with the details received on each.

## Privacy (added after the final review)
The learner asked whether the app may expose people's home addresses. It shouldn't without clear consent (Mongolia's Personal Data Protection Law treats a location tied to an identifiable person as personal data). Decisions:
- [ ] Public posts (SOS pins, lost-pet reports) show **no names**, only how long ago: "Spotted 5 min ago" / "Reported 2 h ago". Your own say "You spotted it…". Sightings stay private between the sender and the owner, so they keep names.
- [ ] Places never include a **house number**: the closest named place (shop, market, bus stop…) or the street, plus the area.
- [ ] Posting SOS shows a warning ("Everyone nearby can see where this pin is. Avoid posting from inside your home.") and an option **"🏠 I'm at home: hide the exact spot"**, which moves the pin 100–200 m and shows only the area. Hiding just the text wouldn't help, because the pin itself shows the spot.
- Photos never carry the phone's hidden GPS tag (shrinking re-encodes them), and Collect captures stay private.

## Sample Content for Testers (added after the final review)
Testers (like hackathon judges) may be far from Ulaanbaatar. Decisions:
- [ ] Demo accounts see a small banner above the paw on the map: "🧪 Demo: you're in central Ulaanbaatar", so testers far away aren't surprised.
- [ ] Demo accounts "live" in central Ulaanbaatar: the map, nearby alerts, duplicate matching, and the vet list all work from there, wherever the tester really is.
- [ ] Built-in sample content around central Ulaanbaatar: the demo account's own captures (green ones, an amber one with an unread comment, Larry captured twice), a hidden "Demo neighbor" account's SOS animals (a red one, an amber one that waited 30 h, one with a water need, a 4-day-old faded one, a helped one), a lost-pet report, and comments.
- [ ] Sample and real content never mix: demo accounts only see demo posts, real accounts only see real posts, and they never match each other as the same animal.
- [ ] Two sample logins share one password: "Demo" and "Demo neighbor". A tester can report on one (SOS, lost pet, comment, sighting) and receive it on the other (alerts, pop-ups, bell, phone notifications).
- [ ] `scripts/seed-demo.mjs` wipes and recreates the sample content for a clean demo.

## States and Boundaries

- **First open**: the sign up / log in screen, then a request to use the person's location.
- **Location refused**: the map still loads on a general default area, the way Google Maps does, and the person can browse pins. When they capture, the app asks again to turn location on. If they still say no, they drop the pin on the map by hand.
- **No animals nearby**: the map shows the person's area with no pins.
- **Empty collection**: the My Collection tab has no cards yet. *(What it says is to be decided in the build.)*
- **Breed guess fails or is wrong**: the person types or fixes it. Capture is not blocked.
- **Photo has no cat or dog**: the app says so and asks for another photo. This is the only case that blocks a capture, and only when the AI check actually ran.
- **Helped**: the pin changes color, then drops off the map after one day.
- **No new notifications**: the icon shows no count.
- **Lost pet found**: the owner marks the report found, and its alert stops showing for everyone.
- **Persists**: accounts, captures, collections, lost-pet reports, sightings, and helped status are all saved between sessions.
- **Who can do what**: anyone logged in sees every SOS pin and can mark any SOS pin helped. Collect pins are private to the person who captured them. Only the owner who filed a lost-pet report receives its sightings.

## Product Decisions

- **Tab named "Nearby Friends"**: "friends" means the animals, a cute name that fits the playful tone. The learner also floated "Nearby Paws".
- **Collect vs. SOS mode**: most strays people see are fine. Splitting the two lets people collect for fun and only raise an SOS when an animal actually needs something. This changes the scope's assumption that every capture carries a need.
- **AI breed guess, fixable by the person** (moved from `scope.md > Later`): the learner sees rarity and different breeds as what makes collecting fun. Letting the person fix it covers wrong guesses.
- **Lost-pet reports, sightings, and notifications included** (moved from `scope.md > Later`): the learner wants the POC to be as functional as possible and sees the owner flow as important.
- **Sign-in required**: needed so each person has their own collection, and so owners can be reached.
- **Helped pins fade, then disappear after a day**: the map stays current without instantly hiding that help happened.
- **Map shows SOS pins from everyone, Collect pins only to their owner**: the shared map stays focused on animals that need help, and your own finds still fill your map so it doesn't feel empty.
- **Anyone can mark helped**: no restriction by distance.
- **Sightings ask for a description**: this filters out false alarms for owners.
- **Lost-pet alerts are location-targeted when possible**: they go to people near the last-seen place, or to everyone if no place was given.
- **Location refused → ask again, then drop the pin by hand**: capture still works without location.
- **Owners can mark a lost pet found**: this ends the alert.
- **Vet finder is its own button** next to Capture, not tied to a pin.
- **Build order**: features 1–6 (map, capture, SOS, collection, helped, vet) first, then the owner flow. All of it is in the POC.
- **Visual direction decided during the build**, not now.

- **Pin goes where the capturer is standing** at the time of capture.
- **Non-animal photos are turned away** (added at the first phone checkpoint in `5-build`): the learner worried about people uploading things that aren't cats or dogs. It uses the same AI call as the breed guess. If the AI is down, capture still works so the app never gets stuck.
- **People can delete their own captures** (added at the first phone checkpoint in `5-build`) by tapping the card, with an "are you sure?" step.
- **Helped animals stay in My Collection** after their pin leaves the map, marked so they look different (e.g. a different color).
- **"Report lost pet" has its own button on the main screen** and is also in the profile menu.

## What We're Building

1. Sign up and log in
2. Map with animal photo pins (Nearby Friends tab)
3. Capture: photo, editable AI breed guess, Collect or SOS with a need
4. My Collection grid
5. Pin card with a "helped" tick, color change, and removal after a day
6. Closest vet button
7. Lost-pet reports with location-targeted alerts
8. Sightings (photo now, or a report with a description)
9. Notification icon with count, plus profile history

Build order: 1–6 first, then 7–9.

## Deferred From the POC

- **Rarity, coins, and badges**: what would make collecting feel rewarding. It needs breed data and a reward system first.
- **Donating food with coins**: depends on coins existing.
- **Detecting and grouping similar or duplicate animals** (for example, the same cat captured by three people): needs AI photo comparison. Duplicate pins are allowed for now.
- **Showing characteristics for possible adopters** (`scope.md > Later`).
- **Push notifications outside the app**: owners see sightings inside the web app for now.

## Possible Later Enhancements

- Rarity tiers that make unusual breeds exciting to find.
- A coin system that rewards helping and could fund food donations.
- Stacking similar animals in the collection, Pokédex-style.
- Filtering My Collection (for example, by helped / SOS / collected).
- More condition categories (`scope.md > Later`).

## Non-Goals

- **Emergency rescue for badly injured animals** (`scope.md > Explicitly Cut`): a much heavier problem than a playful collecting app should take on.
- **Trophy cards for hurt animals** (`scope.md > Explicitly Cut`): it feels wrong. The collection stays a simple grid.
- **Friend lists between people**: "Friends" refers to animals, not a social graph.

## Open Questions

- ~~**What the vet finder shows.**~~ *Settled in `4-spec`: the closest vet's name and distance, its pin highlighted, and a Google Maps Directions link (`spec.md > Vet finder`).*
- **Tab name.** "Nearby Friends" or "Nearby Paws"? *Can wait for the build.* (App name decided after the final review: **Collect Paw**, replacing the working name "Collect Savar".)
- ~~**Visual direction.**~~ *Settled in `5-build`: pastel lavender, Nunito.*

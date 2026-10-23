---
doc: prd
status: approved
---

# Collect Savar — Product Requirements

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

The learner chose to decide the visual direction during the build. What's established so far:
- Tone: **fun and playful first**. Not dark, even for SOS animals (`scope.md > Inspiration & Identity`).
- Reference shared: a location-sharing app with soft pastel lavender, rounded cards, lots of white space, and round photo pins on a light map. Not yet confirmed as the direction.
- Inspirations: Pokémon Go (map-first, the satisfaction of capturing) and a cat-collecting web app seen on Instagram.

Ask the learner for colors, font feel, and references at the start of the UI work in `5-build`.

## Features and Behavior

### Accounts
Develops `scope.md > The POC Boundary` ("My Collection").
- [ ] A new person can sign up, and a returning person can log in.
- [ ] After logging out and back in, the same person sees the same collection.

### Map (Nearby Friends)
Develops `scope.md > The Core Loop` step 1.
- [ ] The map opens centered on the person's current location.
- [ ] SOS animals from every account show as photo pins at the spot where they were captured, until they expire.
- [ ] The person's own Collect animals also show as pins, but only on their own map.
- [ ] Another account's Collect animals never appear.
- [ ] SOS pins and own collected pins look different from each other.
- [ ] Tapping a pin opens the pin card with photo, breed, address, and status.

### Capture
Develops `scope.md > The Core Loop` step 2 and `scope.md > The POC Boundary` ("Capture: photo + need tag").
- [ ] Tapping Capture opens the camera, and the person can take a photo.
- [ ] After the photo, a breed guess appears in an editable field. The person can change it or type their own.
- [ ] If the breed can't be guessed, the field is empty and the person can type one. Capture still works.
- [ ] The person chooses **Collect** or **SOS**.
- [ ] Choosing SOS asks for one need: needs help (food / water / vet) or might be lost / looking for owner.
- [ ] Saving creates a pin on the map at the person's location and adds a card to My Collection.
- [ ] If location is still refused after asking again, the person drops the pin on the map by hand.

### My Collection
Develops `scope.md > The POC Boundary` ("My Collection").
- [ ] It shows only the logged-in person's own captures, as a three-column grid.
- [ ] Each card shows the animal image and "breed / date".
- [ ] A new capture appears here right after saving.
- [ ] A helped animal stays in the grid and looks visibly different from the others.

### Marking Helped
Develops `scope.md > The Core Loop` step 4.
- [ ] Anyone can tick **helped** on a pin card.
- [ ] Once ticked, the pin changes color on the map for everyone.
- [ ] One day after being marked helped, the pin no longer shows on the map.

### Closest Vet
Develops `scope.md > The Core Loop` step 5.
- [ ] Tapping the Vet button (next to Capture) shows the closest vet to the person's location, with its name and how far away it is.

### Lost-Pet Reports
Develops `scope.md > Later` ("Lost-pet matching"), pulled into the POC by the learner.
- [ ] An owner can start a lost-pet report from the **Report lost pet** button on the main screen or from the profile menu.
- [ ] An owner can report a lost pet with a photo, a description, and an optional last-seen place.
- [ ] If a last-seen place was given, the alert pop-up appears only for people near that area.
- [ ] If no place was given, the alert appears for everyone.
- [ ] Tapping the pop-up opens the lost pet's details.
- [ ] The owner can mark the pet **found**, and the alert stops appearing.

### Sightings
- [ ] From the alert, someone can send **"I see it now"** with a photo.
- [ ] Or they can send **"Report a sighting"** with when they saw it, where, and what it looked like. The description helps the owner rule out false alarms.

### Notifications and Profile
Develops `scope.md > Later` ("Notifications"), pulled into the POC by the learner.
- [ ] When a sighting is sent, the owner's top-left icon shows a count of new items.
- [ ] Tapping the icon lists the sightings, each with its photo or details.
- [ ] The profile lists everything the person has posted (captures and lost-pet reports), with the details received on each.

## States and Boundaries

- **First open**: the sign up / log in screen, then a request to use the person's location.
- **Location refused**: the map still loads on a general default area, the way Google Maps does, and the person can browse pins. When they capture, the app asks again to turn location on. If they still say no, they drop the pin on the map by hand.
- **No animals nearby**: the map shows the person's area with no pins.
- **Empty collection**: the My Collection tab has no cards yet. *(What it says is to be decided in the build.)*
- **Breed guess fails or is wrong**: the person types or fixes it. Capture is never blocked.
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
- **Tab name.** "Nearby Friends" or "Nearby Paws"? Also, is "Collect Savar" the final app name? *Can wait for the build.*
- **Visual direction.** Colors, font feel, and references. *At the start of UI work in `5-build`.*

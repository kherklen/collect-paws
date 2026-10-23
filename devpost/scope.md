---
doc: scope
status: approved
---

# Collect Savar (working name, from the project folder)

A Pokémon Go-style web app: you spot and "capture" stray cats and dogs on a map, and each capture also tells the community what that animal needs.

## The Unique Kernel
**Collecting animals that also helps them.** Other collecting apps (like the cat-collecting app the learner saw on Instagram) are only for fun. Here, every capture carries what the animal needs, so building your collection also puts strays on a shared map where people can help them.

## Who It's For
People in the learner's community who already notice strays and post about them in Facebook groups ("someone help, there's this one here"), plus the people who see those posts and sometimes take the animal to a vet themselves. Today those posts are scattered "there and here." Most people just comment, and posts get buried.

## The Core Loop
1. Open the app and see a map that starts at your location, showing how many animals have been spotted nearby.
2. See a stray, then capture it with the camera and mark what it needs (food, water, vet, owner, home).
3. It "pops up in the map" as a pin and is saved to **My Collection**.
4. Someone nearby sees the pin, helps the animal, and marks it **helped**.
5. Find the **closest vet** when an animal needs one.

You come back to grow your collection and to see who nearby needs help.

## Inspiration & Identity
- Pokémon Go: map-first, location-based, the satisfaction of capturing.
- An Instagram post or reel of someone's cat-collecting web app (URL not captured). The learner wants it "more socially helpful."
- Tone: fun and playful first. Badly injured animals are not the focus, so the app shouldn't feel dark.

## Why This Matters to the Learner
They see these stray and lost-pet posts in their feed all the time and believe nothing like this exists in their country. They hope people will actually use it, and they're using it "to experiment and learn," especially to get better at identifying the problem and solving it.

## What "Working" Looks Like
The learner's demo, in their words: an intro explaining the problem, then "me outside registers an animal, collecting it," and displaying the closest vet.

Proof it works: going outside, capturing a real stray, and watching it appear as a pin on the map and in My Collection with its need attached. Then the closest vet is shown and the pin can be marked as helped.

## The POC Boundary
- Map centered on the user's location, with pins for spotted animals
- Capture: photo + need tag, which creates a pin
- My Collection: a grid of the animals you've captured
- Mark a pin as "helped"
- Show the closest vet

## Later
- Badges or rewards for helping
- Breed detection, and showing characteristics for possible adopters
- Lost-pet / "is there an owner for this?" matching
- Notifications that alert helpers nearby
- More condition categories

## Explicitly Cut
- **Emergency rescue for badly injured animals.** The learner doesn't picture it as part of the app, and it's a much heavier problem than a playful collecting app should take on.
- **Collection cards as trophies for hurt animals.** The learner flagged that collecting a badly injured animal as a card feels wrong. The collection stays a simple grid of spotted animals.

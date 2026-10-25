// Breeds in a collection, for "New breed unlocked!". Breeds are free text (typed or
// an AI suggestion), so they match ignoring capital letters and extra spaces.
export function normalizeBreed(breed: string | null | undefined) {
  return (breed ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

// How many different breeds these captures cover (blank breeds don't count).
export function breedCount(breeds: (string | null)[]) {
  return new Set(breeds.map(normalizeBreed).filter(Boolean)).size;
}

// After saving a capture with `breed`, is it the first of that breed? `all` includes
// the new capture, so "new" means exactly one capture has it.
export function isNewBreed(breed: string | null, all: (string | null)[]) {
  const name = normalizeBreed(breed);
  return !!name && all.filter((b) => normalizeBreed(b) === name).length === 1;
}

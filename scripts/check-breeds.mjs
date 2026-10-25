// Slice 16 check: "New breed unlocked!" rules — breeds match ignoring capitals and
// spacing, blank breeds never count, and only the first of a breed is "new".
// Run: node scripts/check-breeds.mjs
import { check, finish } from "./helpers.mjs";
import { breedCount, isNewBreed, normalizeBreed } from "../lib/breeds.ts";

check("capitals and spaces don't matter", normalizeBreed("  Tabby   Cat ") === normalizeBreed("tabby cat"));
check("Mongolian breeds match too", normalizeBreed("Судалтай  Муур") === normalizeBreed("судалтай муур"));
check("first of a breed is new", isNewBreed("Husky mix", ["Tabby cat", "Husky mix"]));
check("second of a breed isn't", !isNewBreed("husky MIX", ["Husky mix", "husky mix"]));
check("a blank breed is never new", !isNewBreed("  ", ["  "]) && !isNewBreed(null, [null]));
check("breed count ignores blanks and repeats", breedCount(["Tabby cat", "tabby cat", null, "", "Husky mix"]) === 2);

await finish();

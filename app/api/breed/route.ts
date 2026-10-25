import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// Low-cost OpenAI model that accepts images (checked at build time, Oct 2026).
const MODEL = "gpt-5.4-nano";

const PROMPT = `Look at this photo. Is the main subject a cat, a dog, or something else?
If it is a cat or dog, give up to 3 likely breeds, most likely first, each in a few words
(e.g. "Tabby cat", "Husky mix", "Mixed-breed dog"). Give fewer if you're sure; no duplicates.
Also say where the photo came from. Pick something other than "live" only when you can clearly see the evidence;
when unsure, answer "live" (blocking a real photo is worse than missing a fake one):
"screen" = a photo of a phone, monitor, or TV screen (visible bezel or screen edge, pixel grid, moiré, glare on glass),
"print" = a photo of a printed picture, poster, or book page (paper edges, print texture),
"screenshot" = a screenshot (app interface, status bar, buttons, overlaid captions),
"drawing" = a drawing, cartoon, toy, or statue,
"live" = anything else.
Answer only with the JSON format requested.`;

// The breed is shown to the person, so it comes back in their language.
const BREED_LANGUAGE = {
  en: "Write the breeds in English.",
  mn: 'Write the breeds in Mongolian (Cyrillic), e.g. "Судалтай муур", "Хаски эрлийз". Keep "animal" in English.',
};

type BreedResult = {
  animal: "cat" | "dog" | "other" | null;
  // Up to 3 suggestions, most likely first ([] when there's no cat or dog, or no guess).
  breeds: string[];
  breed: string | null;
  // False when the photo is of a screen, a print, a screenshot, or a drawing.
  real: boolean | null;
};

// "Couldn't check" — the capture page lets the person carry on and type a breed.
const UNKNOWN: BreedResult = { animal: null, breeds: [], breed: null, real: null };

// Photo (JPEG body) → { animal, breeds, breed (the first), real }, with ?lang=mn|en for the breeds' language.
// Logged-in only, so strangers can't spend OpenAI credit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "mn";
  const photo = Buffer.from(await request.arrayBuffer());
  if (photo.length === 0 || photo.length > 4_000_000) {
    return NextResponse.json(UNKNOWN, { status: 400 });
  }

  try {
    const openai = new OpenAI({ timeout: 9000, maxRetries: 0 });
    const response = await openai.responses.create({
      model: MODEL,
      reasoning: { effort: "none" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${PROMPT}\n${BREED_LANGUAGE[lang]}` },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${photo.toString("base64")}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "animal_guess",
          strict: true,
          schema: {
            type: "object",
            properties: {
              animal: { type: "string", enum: ["cat", "dog", "other"] },
              breeds: { type: "array", items: { type: "string" } },
              source: { type: "string", enum: ["live", "screen", "print", "screenshot", "drawing"] },
            },
            required: ["animal", "breeds", "source"],
            additionalProperties: false,
          },
        },
      },
    });

    const guess = JSON.parse(response.output_text) as { animal: BreedResult["animal"]; breeds: string[]; source: string };
    const breeds =
      guess.animal === "other"
        ? []
        : [...new Set(guess.breeds.map((b) => b.trim()).filter(Boolean))].slice(0, 3);
    return NextResponse.json({
      animal: guess.animal,
      breeds,
      breed: breeds[0] ?? null,
      real: guess.source === "live",
    } satisfies BreedResult);
  } catch {
    return NextResponse.json(UNKNOWN);
  }
}

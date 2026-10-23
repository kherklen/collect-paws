import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

// Low-cost OpenAI model that accepts images (checked at build time, Oct 2026).
const MODEL = "gpt-5.4-nano";

const PROMPT = `Look at this photo. Is the main subject a cat, a dog, or something else?
If it is a cat or dog, give its most likely breed in a few words (e.g. "Tabby cat", "Husky mix", "Mixed-breed dog").
Answer only with the JSON format requested.`;

type BreedResult = { animal: "cat" | "dog" | "other" | null; breed: string | null };

// "Couldn't check" — the capture page lets the person carry on and type a breed.
const UNKNOWN: BreedResult = { animal: null, breed: null };

// Photo (JPEG body) → { animal, breed }. Logged-in only, so strangers can't spend OpenAI credit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

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
            { type: "input_text", text: PROMPT },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${photo.toString("base64")}`,
              detail: "low",
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
              breed: { type: ["string", "null"] },
            },
            required: ["animal", "breed"],
            additionalProperties: false,
          },
        },
      },
    });

    const guess = JSON.parse(response.output_text) as BreedResult;
    return NextResponse.json({
      animal: guess.animal,
      breed: guess.animal === "other" ? null : guess.breed?.trim() || null,
    });
  } catch {
    return NextResponse.json(UNKNOWN);
  }
}

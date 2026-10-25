import { NextResponse } from "next/server";
import OpenAI from "openai";
import { distanceMeters, MATCH_RADIUS_METERS } from "@/lib/geo";
import { createAdminClient } from "@/lib/supabase/admin";
import { photoUrl } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { newestPerAnimal, type AnimalMatch } from "@/lib/types";

// Telling two individual animals apart is harder than guessing a breed,
// so this uses the bigger "mini" model (checked at build time, Oct 2026).
const MODEL = "gpt-5.4-mini";

// The closest few animals are compared; more would be slow and costly.
const MAX_CANDIDATES = 6;

const prompt = (animal: string, count: number) => `The first image is a new photo of a stray ${animal}.
The next ${count} images are animals already captured nearby, numbered 1 to ${count}.
Is the animal in the new photo the same individual as one of them?
Compare individual markings, not just breed or color: coat pattern and patches, face markings,
eye color, ear shape and ear-tip clips (a notched or cut ear tip), scars, collars.
Many strays look alike (for example several plain black cats), so only say they are the same
when distinctive markings agree. If you can't tell, answer null.
Answer only with the JSON format requested.`;

type Candidate = {
  user_id: string;
  animal_id: string;
  animal: "cat" | "dog" | null;
  mode: "collect" | "sos";
  photo_path: string;
  lat: number;
  lng: number;
  created_at: string;
};

// Photo (JPEG body) + ?lat=&lng=&animal=cat|dog → { match: AnimalMatch | null }.
// Looks at everyone's captures within 500 m (private ones too, with the secret key),
// but only sends back a photo the person is allowed to see. Any failure → no match,
// so capture carries on as a new animal.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const me = data.user.id;

  const params = new URL(request.url).searchParams;
  const spot = { lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  const animal = params.get("animal") === "dog" ? "dog" : params.get("animal") === "cat" ? "cat" : null;
  const photo = Buffer.from(await request.arrayBuffer());
  if (!Number.isFinite(spot.lat) || !Number.isFinite(spot.lng) || photo.length === 0 || photo.length > 4_000_000) {
    return NextResponse.json({ match: null }, { status: 400 });
  }

  try {
    // A box around the spot first (cheap for the database), then the exact distance.
    const dLat = MATCH_RADIUS_METERS / 111_000;
    const dLng = dLat / Math.cos((spot.lat * Math.PI) / 180);
    const { data: rows, error } = await createAdminClient()
      .from("captures")
      .select("user_id, animal_id, animal, mode, photo_path, lat, lng, created_at")
      .gte("lat", spot.lat - dLat)
      .lte("lat", spot.lat + dLat)
      .gte("lng", spot.lng - dLng)
      .lte("lng", spot.lng + dLng)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const candidates = newestPerAnimal(
      (rows as Candidate[]).filter(
        (c) => (!animal || !c.animal || c.animal === animal) && distanceMeters(spot, c) <= MATCH_RADIUS_METERS,
      ),
    )
      .sort((a, b) => distanceMeters(spot, a) - distanceMeters(spot, b))
      .slice(0, MAX_CANDIDATES);
    if (candidates.length === 0) return NextResponse.json({ match: null });

    // The AI misses about one real match in eight at random but almost never
    // invents one, so ask twice at once and take a match from either answer.
    // The person confirms every match anyway.
    // Send the photos themselves rather than links, so OpenAI never has to fetch them.
    const photos = await Promise.all(candidates.map((c) => fetchAsDataUrl(photoUrl(c.photo_path))));
    const answers = await Promise.allSettled([1, 2].map(() => askWhichMatches(photo, photos, animal)));
    const index = answers.map((a) => (a.status === "fulfilled" ? a.value : null)).find((i) => i !== null);
    if (index == null) return NextResponse.json({ match: null });
    const found = candidates[index];

    const mine = found.user_id === me;
    return NextResponse.json({
      match: {
        animal_id: found.animal_id,
        photo_url: mine || found.mode === "sos" ? photoUrl(found.photo_path) : null,
        mine,
      } satisfies AnimalMatch,
    });
  } catch {
    return NextResponse.json({ match: null });
  }
}

async function fetchAsDataUrl(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`);
  return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

// Which candidate photo (0-based) the AI thinks is the same animal, or null.
async function askWhichMatches(photo: Buffer, candidates: string[], animal: string | null) {
  const openai = new OpenAI({ timeout: 15000, maxRetries: 0 });
  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt(animal ?? "cat or dog", candidates.length) },
          // "high" detail so coat patterns and ear tips survive.
          { type: "input_image", image_url: `data:image/jpeg;base64,${photo.toString("base64")}`, detail: "high" },
          ...candidates.flatMap((image_url, i) => [
            { type: "input_text" as const, text: `${i + 1}:` },
            { type: "input_image" as const, image_url, detail: "high" as const },
          ]),
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "animal_match",
        strict: true,
        schema: {
          type: "object",
          properties: {
            match: { type: ["integer", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["match", "confidence"],
          additionalProperties: false,
        },
      },
    },
  });

  const answer = JSON.parse(response.output_text) as { match: number | null; confidence: string };
  const index = answer.match !== null && answer.confidence !== "low" ? answer.match - 1 : -1;
  return index >= 0 && index < candidates.length ? index : null;
}

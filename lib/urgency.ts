import type { Capture, Urgency } from "@/lib/types";

// An amber animal nobody has helped turns red after this long…
export const AMBER_TO_RED_HOURS = 24;
// …or this long when it's this cold or colder.
export const COLD_AMBER_TO_RED_HOURS = 12;
export const COLD_CELSIUS = -10;
// After this long with no help, the pin fades: the animal may have moved on.
export const MAY_BE_GONE_DAYS = 3;

const HOUR = 60 * 60 * 1000;

export type UrgencyNow = {
  level: Urgency;
  // Tagged amber, but red now because nobody helped in time.
  escalated: boolean;
  // How long an SOS animal has been waiting for help (0 for Collect or helped).
  waitingMs: number;
  mayBeGone: boolean;
};

// The color a capture shows right now, from what it was tagged, how long it has
// waited, and the temperature (null when unknown, which counts as not cold).
export function urgencyNow(
  capture: Pick<Capture, "mode" | "urgency" | "created_at" | "helped_at">,
  now: number,
  celsius: number | null,
): UrgencyNow {
  if (capture.mode === "collect" || capture.helped_at) {
    return { level: capture.urgency, escalated: false, waitingMs: 0, mayBeGone: false };
  }
  const waitingMs = Math.max(0, now - new Date(capture.created_at).getTime());
  const cold = celsius !== null && celsius <= COLD_CELSIUS;
  const limit = (cold ? COLD_AMBER_TO_RED_HOURS : AMBER_TO_RED_HOURS) * HOUR;
  const escalated = capture.urgency === "amber" && waitingMs >= limit;
  return {
    level: escalated ? "red" : capture.urgency,
    escalated,
    waitingMs,
    mayBeGone: waitingMs >= MAY_BE_GONE_DAYS * 24 * HOUR,
  };
}

// "3 h" / "2 days"-style pieces for the waiting label (the words live in the dictionaries).
export function waitingParts(ms: number): { unit: "minutes" | "hours" | "days"; n: number } {
  const hours = ms / HOUR;
  if (hours < 1) return { unit: "minutes", n: Math.max(1, Math.round(ms / 60000)) };
  if (hours < 48) return { unit: "hours", n: Math.floor(hours) };
  return { unit: "days", n: Math.floor(hours / 24) };
}

// Theme color for each level (map pins use the CSS variable, cards the Tailwind class).
export const URGENCY_COLOR = {
  green: { cssVar: "var(--color-collect)", border: "border-collect", chip: "bg-collect/15 text-brand-dark" },
  amber: { cssVar: "var(--color-amber)", border: "border-amber", chip: "bg-amber/15 text-amber-dark" },
  red: { cssVar: "var(--color-sos)", border: "border-sos", chip: "bg-sos/15 text-sos" },
} as const;

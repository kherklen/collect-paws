import { cookies, headers } from "next/headers";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";

export const LANG_COOKIE = "lang";

// The language a page starts in: the person's saved choice if they tapped a flag,
// otherwise where they are — Mongolian in Mongolia, English elsewhere.
// Vercel adds the visitor's country as a header; on localhost there's none, so Mongolian.
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (LANGS.includes(saved as Lang)) return saved as Lang;
  const country = (await headers()).get("x-vercel-ip-country");
  if (!country) return "mn";
  return country === "MN" ? "mn" : "en";
}

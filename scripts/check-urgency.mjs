// Slice 11 check: urgency rises with time and cold, the database keeps colors
// and modes consistent, and the weather service answers for Ulaanbaatar.
// Run: node --env-file=.env.local scripts/check-urgency.mjs
import { check, finish, newAccount, TINY_JPEG } from "./helpers.mjs";
import { urgencyNow, waitingParts } from "../lib/urgency.ts";

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600e3).toISOString();
const sos = (urgency, h, helped = null) => ({ mode: "sos", urgency, created_at: hoursAgo(h), helped_at: helped });

check("amber at 23 h stays amber", urgencyNow(sos("amber", 23), now, 5).level === "amber");
check("amber at 25 h turns red", urgencyNow(sos("amber", 25), now, 5).level === "red" && urgencyNow(sos("amber", 25), now, 5).escalated);
check("amber at 13 h turns red at −12°C", urgencyNow(sos("amber", 13), now, -12).level === "red");
check("amber at 13 h stays amber at −5°C", urgencyNow(sos("amber", 13), now, -5).level === "amber");
check("unknown weather counts as not cold", urgencyNow(sos("amber", 13), now, null).level === "amber");
check("red stays red and isn't 'escalated'", urgencyNow(sos("red", 1), now, 5).level === "red" && !urgencyNow(sos("red", 1), now, 5).escalated);
check("helped animals never escalate", urgencyNow(sos("amber", 100, hoursAgo(1)), now, -30).level === "amber");
check("Collect is always green", urgencyNow({ mode: "collect", urgency: "green", created_at: hoursAgo(500), helped_at: null }, now, -30).level === "green");
check("3 days unhelped counts as 'may be gone'", urgencyNow(sos("amber", 72), now, 5).mayBeGone && !urgencyNow(sos("amber", 70), now, 5).mayBeGone);
check("waiting labels", JSON.stringify([waitingParts(20 * 60e3), waitingParts(5 * 3600e3), waitingParts(50 * 3600e3)]) === JSON.stringify([{ unit: "minutes", n: 20 }, { unit: "hours", n: 5 }, { unit: "days", n: 2 }]));

const { client, id } = await newAccount("Urgent");
const path = `${id}/${crypto.randomUUID()}.jpg`;
await client.storage.from("photos").upload(path, TINY_JPEG, { contentType: "image/jpeg" });
const base = { photo_path: path, lat: 47.86, lng: 106.78 };
const redCollect = await client.from("captures").insert({ ...base, mode: "collect", urgency: "red" });
check("the database rejects a red Collect capture", !!redCollect.error, redCollect.error?.message);
const greenSos = await client.from("captures").insert({ ...base, mode: "sos", need: "food", urgency: "green" });
check("the database rejects a green SOS capture", !!greenSos.error);
const old = await client.from("captures").insert({ ...base, mode: "sos", need: "food" }).select("urgency").single();
check("an SOS saved without urgency (older app) becomes amber", old.data?.urgency === "amber", JSON.stringify(old.data ?? old.error));
const red = await client.from("captures").insert({ ...base, mode: "sos", need: "vet", urgency: "red" }).select("urgency").single();
check("a red SOS capture saves", red.data?.urgency === "red");
const backdated = await client.from("captures").insert({ ...base, mode: "sos", need: "food", created_at: hoursAgo(30) });
check("a backdated capture is rejected", !!backdated.error, backdated.error?.message);

const weather = await fetch("https://api.open-meteo.com/v1/forecast?latitude=47.9186&longitude=106.9176&current=temperature_2m").then((r) => r.json());
check("Open-Meteo returns Ulaanbaatar's temperature", typeof weather?.current?.temperature_2m === "number", `${weather?.current?.temperature_2m}°C`);

await finish();

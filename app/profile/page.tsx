"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PushToggle from "@/components/PushToggle";
import SightingCard, { type SightingWithReporter } from "@/components/SightingCard";
import { formatDay, useI18n } from "@/lib/i18n";
import { createClient, photoUrl } from "@/lib/supabase/client";
import type { Capture, LostPet } from "@/lib/types";

type Report = LostPet & { sightings: SightingWithReporter[] };

// Profile: display name, everything I've posted (captures and lost-pet reports)
// with the sightings received on each report, Report lost pet, and log out.
export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [profile, myCaptures, myReports] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", auth.user.id).single(),
        supabase
          .from("captures")
          .select("*")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("lost_pets")
          .select("*, sightings(*, profiles(display_name))")
          .eq("owner_id", auth.user.id)
          .order("created_at", { ascending: false })
          .order("created_at", { referencedTable: "sightings", ascending: false }),
      ]);
      setName(profile.data?.display_name ?? "Friend");
      setCaptures((myCaptures.data as Capture[]) ?? []);
      setReports((myReports.data as Report[]) ?? []);
    })();
  }, []);

  async function logOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-12 pt-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-brand-dark">
        {t.common.backToMap}
      </Link>

      <section className="mt-6 flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm shadow-brand/10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl">
          🐾
        </div>
        <div>
          <p className="text-sm text-muted">{t.profile.hiThere}</p>
          <h1 className="text-2xl font-display font-bold italic">{name ?? "…"}</h1>
        </div>
      </section>

      <nav className="mt-6 flex flex-col gap-3">
        <MenuLink href="/notifications" emoji="🔔" tint="bg-brand-soft">
          {t.notifications.title}
        </MenuLink>
        <MenuLink href="/lost/new" emoji="🔍" tint="bg-sos/10">
          {t.lostNew.title}
        </MenuLink>
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 font-bold shadow-sm shadow-brand/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-xl">🌐</span>
          {t.language.label}
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
        <PushToggle />
      </nav>

      <section className="mt-8">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="font-display font-bold italic">{t.profile.myCaptures} {captures && `(${captures.length})`}</h2>
          <Link href="/?tab=collection" className="text-sm font-bold text-brand-dark">
            {t.profile.seeAll}
          </Link>
        </div>
        {captures?.length === 0 ? (
          <p className="mt-2 px-1 text-sm text-muted">{t.profile.noCaptures}</p>
        ) : (
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {(captures ?? []).slice(0, 12).map((c) => (
              <li key={c.id} className="w-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(c.photo_path)}
                  alt={c.breed ?? t.pin.capturedAnimal}
                  className={`aspect-square w-full rounded-2xl border-[3px] object-cover ${
                    c.helped_at ? "border-helped opacity-75" : c.mode === "sos" ? "border-sos" : "border-collect"
                  }`}
                />
                <p className="mt-1 truncate text-[11px]">
                  <span className="font-bold">{c.breed ?? t.common.unknown}</span>
                  <span className="text-muted"> / {formatDay(t, c.created_at)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="px-1 font-display font-bold italic">{t.profile.myReports} {reports && `(${reports.length})`}</h2>
        {reports?.length === 0 ? (
          <p className="mt-2 px-1 text-sm text-muted">{t.profile.noReports}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {(reports ?? []).map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-3xl bg-brand-soft/50 p-3">
                <Link href={`/lost/${r.id}`} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(r.photo_path)} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{r.description}</p>
                    <p className="text-xs text-muted">
                      {formatDay(t, r.created_at)} · {t.profile.sightingCount(r.sightings.length)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold text-white ${
                      r.status === "found" ? "bg-helped" : "bg-sos"
                    }`}
                  >
                    {r.status === "found" ? t.lost.found : t.lost.lost}
                  </span>
                </Link>
                {r.sightings.map((s) => (
                  <SightingCard key={s.id} sighting={s} />
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={logOut}
        className="mt-8 w-full rounded-full border-2 border-brand-soft bg-white py-3 font-bold text-brand-dark transition active:scale-[0.98]"
      >
        {t.profile.logOut}
      </button>
    </main>
  );
}

function MenuLink({
  href,
  emoji,
  tint,
  children,
}: {
  href: string;
  emoji: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-3xl bg-white p-4 font-bold shadow-sm shadow-brand/10 transition active:scale-[0.98]"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${tint}`}>{emoji}</span>
      {children}
      <span className="ml-auto text-muted">›</span>
    </Link>
  );
}

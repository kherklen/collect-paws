"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CollectionGrid from "@/components/CollectionGrid";
import CommentAlert from "@/components/CommentAlert";
import LostPetAlert from "@/components/LostPetAlert";
import RedAlert from "@/components/RedAlert";
import { shrinkPhoto } from "@/lib/image";
import { useI18n } from "@/lib/i18n";
import { setPendingPhoto } from "@/lib/pendingPhoto";
import { createClient } from "@/lib/supabase/client";
import { useAlerts } from "@/lib/useAlerts";

// Leaflet needs the browser's `window`, so the map only loads on the client.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-brand-soft" />,
});

type Tab = "map" | "collection";

export default function MainShell() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const tab: Tab = params.get("tab") === "collection" ? "collection" : "map";

  const [shrinking, setShrinking] = useState(false);
  // The demo account's paw also offers the photo library, not just the camera.
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("profiles").select("is_demo").eq("id", auth.user.id).single();
      setIsDemo(!!data?.is_demo);
    })();
  }, []);
  const [showVet, setShowVet] = useState(false);
  const { alert, redAlert, commentAlert, dismiss, unread } = useAlerts();
  // `/?pin=<id>` (from a red alert) opens that pin on the map.
  const pinId = tab === "map" ? params.get("pin") : null;
  const clearPinParam = useCallback(() => router.replace("/", { scroll: false }), [router]);

  function openVetFinder() {
    if (tab !== "map") selectTab("map");
    setShowVet(true);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setShrinking(true);
    try {
      setPendingPhoto(await shrinkPhoto(file));
    } catch {
      setPendingPhoto(null);
    }
    router.push("/capture");
  }

  function selectTab(next: Tab) {
    router.replace(next === "collection" ? "/?tab=collection" : "/", { scroll: false });
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Content: full-screen map, or the collection grid */}
      <div className="absolute inset-0">
        {tab === "map" ? (
          <MapView
            showVet={showVet}
            onCloseVet={() => setShowVet(false)}
            openPinId={pinId}
            onPinOpened={clearPinParam}
          />
        ) : (
          <CollectionGrid />
        )}
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-2 px-3 pt-4">
        <Link
          href="/notifications"
          aria-label={unread ? t.shell.newNotifications(unread) : t.shell.notifications}
          className="pointer-events-auto relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-md shadow-brand/15"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-sos px-1 text-[10px] font-extrabold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <nav className="pointer-events-auto flex min-w-0 gap-1 rounded-full bg-white/95 p-1 shadow-md shadow-brand/15 backdrop-blur">
          <TabButton active={tab === "map"} onClick={() => selectTab("map")}>
            {t.shell.nearbyFriends}
          </TabButton>
          <TabButton active={tab === "collection"} onClick={() => selectTab("collection")}>
            {t.shell.myCollection}
          </TabButton>
        </nav>

        <Link
          href="/profile"
          aria-label={t.shell.myProfile}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark shadow-md shadow-brand/15"
        >
          <ProfileIcon />
        </Link>
      </header>

      {/* Corner pop-ups: a red animal near you first, then a lost pet, then a comment on your post. */}
      <div className="pointer-events-none absolute right-4 top-20 z-[1100] flex flex-col gap-2">
        {redAlert && <RedAlert capture={redAlert} onDismiss={() => dismiss(redAlert.id)} />}
        {alert && <LostPetAlert pet={alert} onDismiss={() => dismiss(alert.id)} />}
        {commentAlert && <CommentAlert comment={commentAlert} onDismiss={() => dismiss(commentAlert.id)} />}
      </div>

      {/* Bottom buttons */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative flex items-center">
          <Link
            href="/lost/new"
            aria-label={t.shell.reportLost}
            className="pointer-events-auto absolute right-full mr-3 flex w-16 flex-col items-center gap-1 transition active:scale-95"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sos shadow-md shadow-brand/15">
              <LostIcon />
            </span>
            <SideLabel>{t.shell.lostShort}</SideLabel>
          </Link>
          {/* The paw is the camera input itself: phones only open the camera straight from a tap.
              For the demo account it's a plain photo picker (camera or library). */}
          <label
            aria-label={t.shell.capture}
            className="pointer-events-auto flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-lg shadow-brand/40 transition active:scale-95"
          >
            {shrinking ? <span className="text-3xl">⏳</span> : <PawIcon />}
            <input
              type="file"
              accept="image/*"
              capture={isDemo ? undefined : "environment"}
              onChange={handlePhoto}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            aria-label={t.shell.findVet}
            onClick={openVetFinder}
            className="pointer-events-auto absolute left-full ml-3 flex w-16 flex-col items-center gap-1 transition active:scale-95"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-vet shadow-md shadow-brand/15">
              <VetIcon />
            </span>
            <SideLabel>{t.shell.vetsShort}</SideLabel>
          </button>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative whitespace-nowrap rounded-full px-2.5 py-2 text-sm min-[380px]:px-3 font-bold transition ${
        active ? "text-brand-dark" : "text-muted"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-brand" aria-hidden />
      )}
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <ellipse cx="6" cy="9" rx="2" ry="2.6" />
      <ellipse cx="10" cy="5.5" rx="2" ry="2.6" />
      <ellipse cx="14.5" cy="5.5" rx="2" ry="2.6" />
      <ellipse cx="18.5" cy="9" rx="2" ry="2.6" />
      <path d="M12.2 11c-3 0-6.2 4.2-6.2 6.6 0 1.8 1.4 2.6 3 2.6 1.3 0 2.1-.6 3.2-.6s1.9.6 3.2.6c1.6 0 3-.8 3-2.6 0-2.4-3.2-6.6-6.2-6.6z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

// A magnifying glass with a paw: "looking for my pet".
function LostIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M15.5 15.5 21 21" />
      <g fill="currentColor" stroke="none">
        <circle cx="8" cy="9" r="1.1" />
        <circle cx="10.5" cy="7.6" r="1.1" />
        <circle cx="13" cy="9" r="1.1" />
        <path d="M10.5 10.4c-1.3 0-2.6 1.6-2.6 2.6 0 .8.6 1.1 1.3 1.1.5 0 .8-.3 1.3-.3s.8.3 1.3.3c.7 0 1.3-.3 1.3-1.1 0-1-1.3-2.6-2.6-2.6z" />
      </g>
    </svg>
  );
}

// The small name under the side buttons, on a pill so it reads over the map.
function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink shadow-sm">
      {children}
    </span>
  );
}

// A stethoscope: "vets".
function VetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3v5a4 4 0 0 0 8 0V3" />
      <path d="M9 12v2a5 5 0 0 0 10 0v-2" />
      <circle cx="19" cy="10" r="2" />
    </svg>
  );
}

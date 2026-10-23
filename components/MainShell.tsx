"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import CollectionGrid from "@/components/CollectionGrid";
import { shrinkPhoto } from "@/lib/image";
import { setPendingPhoto } from "@/lib/pendingPhoto";

// Leaflet needs the browser's `window`, so the map only loads on the client.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-brand-soft" />,
});

type Tab = "map" | "collection";

export default function MainShell() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "collection" ? "collection" : "map";

  const [shrinking, setShrinking] = useState(false);
  const [showVet, setShowVet] = useState(false);

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
          <MapView showVet={showVet} onCloseVet={() => setShowVet(false)} />
        ) : (
          <CollectionGrid />
        )}
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-center px-4 pt-4">
        <Link
          href="/profile"
          aria-label="Notifications and profile"
          className="pointer-events-auto absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-md shadow-brand/15"
        >
          <BellIcon />
        </Link>

        <nav className="pointer-events-auto flex gap-1 rounded-full bg-white/95 p-1 shadow-md shadow-brand/15 backdrop-blur">
          <TabButton active={tab === "map"} onClick={() => selectTab("map")}>
            Nearby Friends
          </TabButton>
          <TabButton active={tab === "collection"} onClick={() => selectTab("collection")}>
            My Collection
          </TabButton>
        </nav>
      </header>

      {/* Bottom buttons */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative flex items-center">
          {/* The paw is the camera input itself: phones only open the camera straight from a tap. */}
          <label
            aria-label="Capture an animal"
            className="pointer-events-auto flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-lg shadow-brand/40 transition active:scale-95"
          >
            {shrinking ? <span className="text-3xl">⏳</span> : <PawIcon />}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            aria-label="Find the closest vet"
            onClick={openVetFinder}
            className="pointer-events-auto absolute left-full ml-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-vet shadow-md shadow-brand/15 transition active:scale-95"
          >
            <VetIcon />
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
      className={`relative rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? "text-brand-dark" : "text-muted"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-brand" aria-hidden />
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

function VetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

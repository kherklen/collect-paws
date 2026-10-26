"use client";

import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";

// Three short welcome screens explaining the app, shown once per browser the first
// time the map opens (and again from the profile's "How it works").
const SEEN_KEY = "welcomeSeen";
const CHANGED = "welcome-seen-changed";

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage blocked: don't keep showing it.
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage blocked: it just shows again next time.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// True when this browser hasn't seen the welcome yet (false on the server).
export function useWelcomeNeeded() {
  return !useSyncExternalStore(subscribe, readSeen, () => true);
}

export default function Welcome({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const slides = t.welcome.slides;
  const last = step === slides.length - 1;

  function finish() {
    markSeen();
    onDone?.();
  }

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-canvas px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
      <div className="flex justify-end">
        {!last && (
          <button type="button" onClick={finish} className="py-2 text-sm font-bold text-muted">
            {t.welcome.skip}
          </button>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-lime text-6xl shadow-lg shadow-brand/15">
          {slides[step].emoji}
        </div>
        <h1 className="font-display text-3xl font-bold italic leading-tight">{slides[step].title}</h1>
        <p className="text-muted">{slides[step].text}</p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
        <div className="flex gap-2" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-brand" : "w-2 bg-brand-soft"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? finish() : setStep(step + 1))}
          className="w-full rounded-full bg-brand py-4 text-lg font-extrabold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98]"
        >
          {last ? t.welcome.start : t.welcome.next}
        </button>
      </div>
    </div>
  );
}

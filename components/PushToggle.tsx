"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { pushState, turnOffPush, turnOnPush, type PushState } from "@/lib/push";

// Profile row: turn phone notifications (comments and sightings on my posts) on or off.
export default function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pushState().then(setState);
  }, []);

  async function toggle() {
    setBusy(true);
    setFailed(false);
    try {
      setState(state === "on" ? await turnOffPush() : await turnOnPush());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const note =
    state === "needs-install"
      ? t.push.needsInstall
      : state === "blocked"
        ? t.push.blocked
        : state === "unsupported"
          ? t.push.unsupported
          : failed
            ? t.push.failed
            : t.push.what;

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-sm shadow-brand/10">
      <div className="flex items-center gap-3 font-bold">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-xl">📲</span>
        {t.push.label}
        {(state === "on" || state === "off") && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`ml-auto rounded-full px-4 py-1.5 text-sm font-extrabold transition disabled:opacity-60 ${
              state === "on" ? "bg-brand-dark text-white" : "bg-brand text-white"
            }`}
          >
            {busy ? "…" : state === "on" ? t.push.turnOff : t.push.turnOn}
          </button>
        )}
      </div>
      {state && <p className="text-xs text-muted">{state === "on" && !failed ? t.push.isOn : note}</p>}
    </div>
  );
}

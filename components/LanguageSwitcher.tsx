"use client";

import { useI18n } from "@/lib/i18n";
import { LANG_LABELS, LANGS } from "@/lib/i18n/dictionaries";

// Flag buttons for switching the app's language. Compact (flags only) for the
// login screen corner; full (flag + name) for the profile.
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, t, setLang } = useI18n();

  return (
    <div role="group" aria-label={t.language.switchTo} className="flex gap-1 rounded-full bg-white p-1 shadow-sm shadow-brand/15">
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            aria-label={LANG_LABELS[code].name}
            className={`flex items-center gap-1.5 rounded-full font-bold transition ${
              compact ? "h-9 w-9 justify-center text-lg" : "px-3 py-1.5 text-sm"
            } ${active ? "bg-brand-soft text-brand-dark" : "text-muted opacity-60"}`}
          >
            <span aria-hidden>{LANG_LABELS[code].flag}</span>
            {!compact && LANG_LABELS[code].name}
          </button>
        );
      })}
    </div>
  );
}

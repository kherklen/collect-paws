"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Dict, type Lang } from "@/lib/i18n/dictionaries";

type I18n = { lang: Lang; t: Dict; setLang: (lang: Lang) => void };

const I18nContext = createContext<I18n | null>(null);

// Gives every screen the current language's text. The starting language comes
// from the server (saved choice, or the visitor's country).
export function LanguageProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initial);

  function setLang(next: Lang) {
    // Remembered for a year, and it wins over the visitor's country from now on.
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setLangState(next);
    router.refresh();
  }

  return <I18nContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n must be used inside LanguageProvider");
  return i18n;
}

// Short date ("Oct 25" / "10-р сарын 25") in the current language.
export function formatDay(t: Dict, date: string | Date) {
  return new Intl.DateTimeFormat(t.locale, { month: "short", day: "numeric" }).format(new Date(date));
}

// Date and time ("Oct 25, 1:39 PM" / "10-р сарын 25 13:39").
export function formatDayTime(t: Dict, date: string | Date) {
  return new Intl.DateTimeFormat(t.locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(date),
  );
}

// "Near 47.9186, 106.9176" when there's no street address.
export function formatSpot(t: Dict, spot: { lat: number; lng: number }) {
  return t.common.nearSpot(spot.lat.toFixed(4), spot.lng.toFixed(4));
}

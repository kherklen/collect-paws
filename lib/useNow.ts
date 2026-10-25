"use client";

import { useEffect, useState } from "react";

// The current time, refreshed every minute, so "waiting 3 h" and urgency colors keep up.
export function useNow(everyMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

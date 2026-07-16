import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "big_timer.lastDurationSeconds";
export const DEFAULT_DURATION_SECONDS = 5 * 60;
// Matches the wheel picker's 0-59 range for both minutes and seconds.
const MAX_DURATION_SECONDS = 59 * 60 + 59;

function sanitize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DURATION_SECONDS;
  // Floor before checking positivity — a fractional value like 0.5 would
  // otherwise pass a `value > 0` check but floor to 0 afterwards, silently
  // producing the one duration this function is supposed to never return.
  const floored = Math.floor(value);
  return floored > 0 ? Math.min(MAX_DURATION_SECONDS, floored) : DEFAULT_DURATION_SECONDS;
}

export async function getLastDuration(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_DURATION_SECONDS;
    return sanitize(Number(stored));
  } catch {
    return DEFAULT_DURATION_SECONDS;
  }
}

export function useLastDuration() {
  const [totalSeconds, setTotalSecondsState] = useState(DEFAULT_DURATION_SECONDS);
  // SetupScreen's wheel picker auto-scrolls to its initial value only once
  // on mount, so callers should wait for `loaded` before rendering it —
  // otherwise it scrolls to the default and won't re-scroll once the
  // persisted value arrives a moment later.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getLastDuration().then((value) => {
      setTotalSecondsState(value);
      setLoaded(true);
    });
  }, []);

  const setTotalSeconds = useCallback((value: number) => {
    const clamped = sanitize(value);
    setTotalSecondsState(clamped);
    AsyncStorage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
  }, []);

  return { totalSeconds, setTotalSeconds, loaded };
}

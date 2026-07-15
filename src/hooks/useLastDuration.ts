import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "big_timer.lastDurationSeconds";
export const DEFAULT_DURATION_SECONDS = 5 * 60;
// Matches the wheel picker's 0-59 range for both minutes and seconds.
const MAX_DURATION_SECONDS = 59 * 60 + 59;

function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.min(MAX_DURATION_SECONDS, Math.floor(value))
    : DEFAULT_DURATION_SECONDS;
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

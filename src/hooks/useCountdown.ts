import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export type CountdownStatus = "idle" | "running" | "paused" | "finished";

interface UseCountdownOptions {
  onFinish?: () => void;
}

const TICK_INTERVAL_MS = 50;
// The display only resolves to deciseconds, so ticks that don't change the
// displayed bucket are skipped — halves render churn with no visual cost.
const DISPLAY_BUCKET_MS = 100;
// Keeps the "MM:SS.D" format (and CountdownDisplay's 2-digit-minute
// calibration) valid even after repeated +1min adjustments.
const MAX_REMAINING_MS = 99 * 60 * 1000 + 59 * 1000 + 900;

export function useCountdown(totalSeconds: number, options: UseCountdownOptions = {}) {
  const totalMs = totalSeconds * 1000;
  const [remainingMs, setRemainingMsState] = useState(totalMs);
  const [status, setStatusState] = useState<CountdownStatus>("idle");

  // Wall-clock deadline rather than a decrementing counter, so drift from
  // JS timer throttling (e.g. while the screen is locked) can't accumulate.
  // Only meaningful while "running" — cleared whenever the countdown isn't
  // actively counting down, so a stale deadline can't be misread later.
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinishRef = useRef(options.onFinish);
  onFinishRef.current = options.onFinish;
  const lastBucketRef = useRef<number | null>(null);

  // Refs mirror the state so pause/resume/reset/adjust can branch on the
  // *current* value as plain statements — not inside a setState updater,
  // which React may invoke more than once and must stay a pure function.
  const remainingMsRef = useRef(totalMs);
  const statusRef = useRef<CountdownStatus>("idle");

  const setRemainingMs = useCallback((value: number) => {
    remainingMsRef.current = value;
    setRemainingMsState(value);
  }, []);

  const setStatus = useCallback((value: CountdownStatus) => {
    statusRef.current = value;
    setStatusState(value);
  }, []);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Finishes the countdown: shows 0, marks finished, stops ticking, fires
  // the alarm. Shared by tick() (while running) and adjust() (while paused)
  // so both paths always land in the exact same terminal state.
  const finish = useCallback(() => {
    lastBucketRef.current = 0;
    setRemainingMs(0);
    setStatus("finished");
    clearTick();
    onFinishRef.current?.();
  }, [clearTick, setRemainingMs, setStatus]);

  const tick = useCallback(() => {
    // Guards against the AppState "active" catch-up call firing while
    // paused/idle/finished, when endTimeRef may still hold a stale deadline.
    if (statusRef.current !== "running" || endTimeRef.current === null) return;
    const remaining = endTimeRef.current - Date.now();
    if (remaining <= 0) {
      finish();
      return;
    }
    const bucket = Math.ceil(remaining / DISPLAY_BUCKET_MS);
    if (bucket !== lastBucketRef.current) {
      lastBucketRef.current = bucket;
      setRemainingMs(remaining);
    }
  }, [finish, setRemainingMs]);

  const start = useCallback(() => {
    endTimeRef.current = Date.now() + totalMs;
    lastBucketRef.current = null;
    setRemainingMs(totalMs);
    setStatus("running");
    clearTick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  }, [totalMs, tick, clearTick, setRemainingMs, setStatus]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") return;
    clearTick();
    if (endTimeRef.current !== null) {
      setRemainingMs(Math.max(0, endTimeRef.current - Date.now()));
    }
    endTimeRef.current = null;
    setStatus("paused");
  }, [clearTick, setRemainingMs, setStatus]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    endTimeRef.current = Date.now() + remainingMsRef.current;
    lastBucketRef.current = null;
    clearTick();
    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    setStatus("running");
  }, [clearTick, tick, setStatus]);

  const reset = useCallback(() => {
    clearTick();
    endTimeRef.current = null;
    lastBucketRef.current = null;
    setRemainingMs(totalMs);
    setStatus("idle");
  }, [totalMs, clearTick, setRemainingMs, setStatus]);

  // Nudges the remaining time by deltaMs (positive to add, negative to
  // subtract) without resetting the timer, for quick +1min/-30s style
  // adjustments while running or paused. Clamped on both ends so it can
  // never leave the countdown stuck at/below zero without finishing, nor
  // grow past what the display format is calibrated for.
  const adjust = useCallback(
    (deltaMs: number) => {
      if (statusRef.current === "running" && endTimeRef.current !== null) {
        const currentRemaining = endTimeRef.current - Date.now();
        const nextRemaining = Math.min(MAX_REMAINING_MS, Math.max(0, currentRemaining + deltaMs));
        endTimeRef.current = Date.now() + nextRemaining;
        lastBucketRef.current = null;
        if (nextRemaining <= 0) {
          finish();
        } else {
          tick();
        }
      } else if (statusRef.current === "paused") {
        const nextRemaining = Math.min(MAX_REMAINING_MS, Math.max(0, remainingMsRef.current + deltaMs));
        if (nextRemaining <= 0) {
          finish();
        } else {
          setRemainingMs(nextRemaining);
        }
      }
    },
    [tick, finish, setRemainingMs]
  );

  useEffect(() => clearTick, [clearTick]);

  // JS timers can be throttled/suspended while the app is backgrounded
  // (Android Doze, app standby). Re-check the wall-clock deadline the
  // instant the app returns to foreground so a missed tick doesn't leave
  // the countdown showing stale time or delay the alarm any longer than
  // necessary. tick() itself no-ops unless status is "running", so this
  // can't incorrectly fire while paused/idle/finished.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        tick();
      }
    });
    return () => subscription.remove();
  }, [tick]);

  return { remainingMs, status, start, pause, resume, reset, adjust };
}

export function formatRemaining(remainingMs: number): string {
  const totalDeciseconds = Math.ceil(remainingMs / 100);
  const minutes = Math.floor(totalDeciseconds / 600);
  const seconds = Math.floor(totalDeciseconds / 10) % 60;
  const tenths = totalDeciseconds % 10;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

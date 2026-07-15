import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "big_timer.alarmVolume";
export const DEFAULT_ALARM_VOLUME = 1.0;

export async function getAlarmVolume(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_ALARM_VOLUME;
    const value = Number(stored);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_ALARM_VOLUME;
  } catch {
    return DEFAULT_ALARM_VOLUME;
  }
}

export function useAlarmVolume() {
  const [volume, setVolumeState] = useState(DEFAULT_ALARM_VOLUME);

  useEffect(() => {
    getAlarmVolume().then(setVolumeState);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value)).catch(() => {});
  }, []);

  return { volume, setVolume };
}

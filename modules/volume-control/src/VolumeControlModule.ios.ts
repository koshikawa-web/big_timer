// VolumeControlModule has no iOS native implementation (see
// expo-module.config.json's "platforms": ["android"]). Importing the
// Android-only native module directly on iOS would call
// requireNativeModule('VolumeControl') at JS bundle evaluation time, which
// throws synchronously and crashes the whole app before anything mounts.
// This stub keeps the same call-site shape (used by TimerScreen.tsx inside
// try/catch) while explicitly signaling unavailability instead.
export default {
  getMusicVolume(): number {
    throw new Error("VolumeControl is not supported on iOS");
  },
  setMusicVolume(_value: number): void {
    // no-op: not supported on iOS
  },
};

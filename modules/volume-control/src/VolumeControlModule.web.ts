import { registerWebModule, NativeModule } from 'expo';

// VolumeControlModule is not available on the web platform: the browser
// has no API to read/set the OS output volume. Implement both methods
// explicitly (throw / no-op) rather than leaving them undefined — an
// undefined method call throws an incidental TypeError that call sites
// can't distinguish from a real bug, whereas this signals unavailability
// on purpose, the same way the native Android module does when it can't
// read the volume.
class VolumeControlModule extends NativeModule<{}> {
  getMusicVolume(): number {
    throw new Error('VolumeControl is not supported on web');
  }
  setMusicVolume(_value: number): void {
    // no-op: not supported on web
  }
}

export default registerWebModule(VolumeControlModule, 'VolumeControlModule');

import { NativeModule, requireNativeModule } from 'expo';

declare class VolumeControlModule extends NativeModule<{}> {
  getMusicVolume(): number;
  setMusicVolume(value: number): void;
}

export default requireNativeModule<VolumeControlModule>('VolumeControl');

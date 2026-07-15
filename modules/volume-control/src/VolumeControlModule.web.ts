import { registerWebModule, NativeModule } from 'expo';

// VolumeControlModule is not available on the web platform.
class VolumeControlModule extends NativeModule<{}> {}

export default registerWebModule(VolumeControlModule, 'VolumeControlModule');

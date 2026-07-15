// Re-export the native module. On web, it will be resolved to VolumeControlModule.web.ts
// and on native platforms to VolumeControlModule.ts
export { default } from './src/VolumeControlModule';

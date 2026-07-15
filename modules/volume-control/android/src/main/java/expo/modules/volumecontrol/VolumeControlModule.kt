package expo.modules.volumecontrol

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

class VolumeControlModule : Module() {
  // Safe cast: the reactContext can momentarily be null (e.g. activity
  // recreation), in which case callers get a sensible default instead of
  // an uncaught native crash.
  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("VolumeControl")

    Function("getMusicVolume") {
      val manager = audioManager ?: return@Function 0.0
      val max = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      if (max <= 0) return@Function 0.0
      manager.getStreamVolume(AudioManager.STREAM_MUSIC).toDouble() / max.toDouble()
    }

    Function("setMusicVolume") { value: Double ->
      val manager = audioManager ?: return@Function
      val max = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val clamped = value.coerceIn(0.0, 1.0)
      manager.setStreamVolume(AudioManager.STREAM_MUSIC, (clamped * max).roundToInt(), 0)
    }
  }
}

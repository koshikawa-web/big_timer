package expo.modules.volumecontrol

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

// 0.0 is a real, valid volume reading, so it can't double as a "couldn't
// read the volume" sentinel — callers (TimerScreen's baseline capture)
// need to be able to tell "silent" apart from "unavailable" to know
// whether it's safe to write the value back later.
class MusicVolumeUnavailableException :
  CodedException("Unable to read or set the device's music volume right now")

class VolumeControlModule : Module() {
  // Safe cast: the reactContext can momentarily be null (e.g. activity
  // recreation), in which case callers get a thrown error instead of an
  // uncaught native crash — and, critically, instead of a misleading 0.0
  // that looks like a real (silent) volume reading.
  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("VolumeControl")

    Function("getMusicVolume") {
      val manager = audioManager ?: throw MusicVolumeUnavailableException()
      val max = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      if (max <= 0) throw MusicVolumeUnavailableException()
      manager.getStreamVolume(AudioManager.STREAM_MUSIC).toDouble() / max.toDouble()
    }

    Function("setMusicVolume") { value: Double ->
      val manager = audioManager ?: throw MusicVolumeUnavailableException()
      val max = manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val clamped = value.coerceIn(0.0, 1.0)
      manager.setStreamVolume(AudioManager.STREAM_MUSIC, (clamped * max).roundToInt(), 0)
    }
  }
}

import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useKeepAwake } from "expo-keep-awake";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import VolumeControl from "../../modules/volume-control";
import { DEFAULT_ALARM_VOLUME, getAlarmVolume } from "../hooks/useAlarmVolume";
import { useCountdown } from "../hooks/useCountdown";
import CountdownDisplay from "./CountdownDisplay";

interface TimerScreenProps {
  totalSeconds: number;
  onExit: () => void;
}

const INVERT_INTERVAL_MS = 400;

const ADJUST_STEPS = [
  { label: "-1分", deltaMs: -60_000 },
  { label: "-30秒", deltaMs: -30_000 },
  { label: "-10秒", deltaMs: -10_000 },
  { label: "+10秒", deltaMs: 10_000 },
  { label: "+30秒", deltaMs: 30_000 },
  { label: "+1分", deltaMs: 60_000 },
];
// Split once — the partition never changes, so no need to re-filter the
// same static array on every render.
const MINUS_STEPS = ADJUST_STEPS.filter((step) => step.deltaMs < 0);
const PLUS_STEPS = ADJUST_STEPS.filter((step) => step.deltaMs > 0);

export default function TimerScreen({ totalSeconds, onExit }: TimerScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const playerRef = useRef<AudioPlayer | null>(null);
  const alarmVolumeRef = useRef(1.0);
  const previousSystemVolumeRef = useRef<number | null>(null);
  // Set true the instant the countdown finishes, even if the player isn't
  // ready yet — the preload effect checks this and plays as soon as it can,
  // so the alarm is never silently skipped on very short timers.
  const shouldPlayRef = useRef(false);
  const [inverted, setInverted] = useState(false);

  const applyVolumeAndPlay = useCallback((player: AudioPlayer) => {
    // Only force the system volume if we captured a baseline to restore to
    // later (see stopAlarm) — otherwise leave the user's volume alone
    // rather than risk permanently overriding it with no way back.
    if (previousSystemVolumeRef.current !== null) {
      try {
        VolumeControl.setMusicVolume(alarmVolumeRef.current);
      } catch (error) {
        // best-effort; keep ringing even if volume couldn't be forced
        console.warn("[TimerScreen] failed to force alarm volume", error);
      }
    }
    // This runs from useCountdown's setInterval tick (via onFinish), where
    // nothing further up the call stack can catch a thrown error — on some
    // devices an uncaught exception here takes down the whole app instead
    // of just failing to ring, so a native playback failure must not crash
    // the countdown itself.
    try {
      player.play();
    } catch (error) {
      // best-effort; the countdown still reaches "finished" and shows the
      // dismiss screen even if the alarm sound couldn't start
      console.warn("[TimerScreen] failed to start alarm playback", error);
    }
  }, []);

  // Prepared ahead of time (audio mode + player creation are async and can
  // take a noticeable moment), so the only thing left to do at zero is the
  // near-instant player.play() call — otherwise there's an audible lag
  // between the countdown hitting zero and the alarm actually starting.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let previousVolume: number | null = null;
      try {
        previousVolume = VolumeControl.getMusicVolume();
      } catch (error) {
        previousVolume = null;
        console.warn("[TimerScreen] failed to capture baseline volume", error);
      }
      let volume = DEFAULT_ALARM_VOLUME;
      try {
        [volume] = await Promise.all([
          getAlarmVolume(),
          setAudioModeAsync({
            interruptionMode: "doNotMix",
            shouldPlayInBackground: true,
            playsInSilentMode: true,
          }),
        ]);
      } catch (error) {
        // best-effort; still try to create the player below with defaults
        // rather than leaving the alarm silently unprepared
        console.warn("[TimerScreen] failed to load alarm volume / set audio mode", error);
      }
      if (cancelled) return;
      alarmVolumeRef.current = volume;
      previousSystemVolumeRef.current = previousVolume;
      try {
        const player = createAudioPlayer(require("../../assets/sounds/alarm.wav"));
        player.loop = true;
        player.volume = 1.0;
        playerRef.current = player;
        if (shouldPlayRef.current) {
          applyVolumeAndPlay(player);
        }
      } catch (error) {
        // best-effort; if the player can't be created at all, the countdown
        // still finishes and the dismiss screen still works without sound
        console.warn("[TimerScreen] failed to create alarm player", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyVolumeAndPlay]);

  const playAlarm = useCallback(() => {
    shouldPlayRef.current = true;
    if (playerRef.current) {
      applyVolumeAndPlay(playerRef.current);
    }
  }, [applyVolumeAndPlay]);

  const stopAlarm = useCallback(() => {
    shouldPlayRef.current = false;
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch (error) {
        // player may already be released
        console.warn("[TimerScreen] failed to stop/release alarm player", error);
      }
    }
    if (previousSystemVolumeRef.current !== null) {
      try {
        VolumeControl.setMusicVolume(previousSystemVolumeRef.current);
      } catch (error) {
        // best-effort restore
        console.warn("[TimerScreen] failed to restore system volume", error);
      }
      previousSystemVolumeRef.current = null;
    }
  }, []);

  const { remainingMs, status, start, pause, resume, reset, adjust } = useCountdown(totalSeconds, {
    onFinish: playAlarm,
  });

  useEffect(() => {
    start();
    NavigationBar.setHidden(true);
    return () => {
      stopAlarm();
      NavigationBar.setHidden(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "finished") {
      setInverted(false);
      return;
    }
    const id = setInterval(() => setInverted((current) => !current), INVERT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  const handleDismiss = useCallback(() => {
    stopAlarm();
    reset();
    onExit();
  }, [stopAlarm, reset, onExit]);

  const handleReset = useCallback(() => {
    reset();
    onExit();
  }, [reset, onExit]);

  const renderAdjustButton = useCallback(
    (step: (typeof ADJUST_STEPS)[number]) => (
      <Pressable
        key={step.label}
        style={styles.adjustButton}
        onPress={() => adjust(step.deltaMs)}
        accessibilityLabel={`${step.label}調整`}
      >
        <Text style={styles.adjustButtonText}>{step.label}</Text>
      </Pressable>
    ),
    [adjust]
  );

  // TimerScreen re-renders up to 10x/sec while running (see useCountdown's
  // decisecond tick), but none of these buttons depend on remainingMs —
  // memoize so they only rebuild when what they actually depend on changes.
  // Kept above the "finished" early return below (and every other hook must
  // be too) — React requires the exact same hooks to run on every render of
  // a given component, and status flips to "finished" mid-lifetime, so any
  // hook placed after that return would stop running at exactly that
  // transition and crash with "Rendered fewer hooks than expected."
  const minusButtons = useMemo(() => MINUS_STEPS.map(renderAdjustButton), [renderAdjustButton]);
  const plusButtons = useMemo(() => PLUS_STEPS.map(renderAdjustButton), [renderAdjustButton]);

  const pauseResetButtons = useMemo(
    () => (
      <>
        <Pressable
          style={styles.iconButton}
          onPress={status === "running" ? pause : resume}
          accessibilityLabel={status === "running" ? "一時停止" : "再開"}
        >
          <FontAwesome5 name={status === "running" ? "pause" : "play"} size={18} color="#fff" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={handleReset} accessibilityLabel="リセット">
          <FontAwesome5 name="redo-alt" size={18} color="#fff" />
        </Pressable>
      </>
    ),
    [status, pause, resume, handleReset]
  );

  if (status === "finished") {
    const backgroundColor = inverted ? "#fff" : "#000";
    const foregroundColor = inverted ? "#000" : "#fff";
    return (
      <Pressable style={[styles.fill, styles.center, { backgroundColor }]} onPress={handleDismiss}>
        <StatusBar hidden />
        <CountdownDisplay
          remainingMs={0}
          color={foregroundColor}
          containerWidth={width}
          containerHeight={height * 0.85}
        />
        <Text style={[styles.dismissHint, { color: foregroundColor }]}>タップして停止</Text>
      </Pressable>
    );
  }

  const controls = isLandscape ? (
    <View style={styles.controlsRowLandscape}>
      {minusButtons}
      {pauseResetButtons}
      {plusButtons}
    </View>
  ) : (
    <View style={styles.controlsColumnPortrait}>
      <View style={styles.adjustRow}>
        <View style={styles.adjustGroup}>{minusButtons}</View>
        <View style={styles.adjustGroup}>{plusButtons}</View>
      </View>
      <View style={styles.pauseResetRow}>{pauseResetButtons}</View>
    </View>
  );

  return (
    <View style={[styles.fill, styles.idleBackground, styles.center]}>
      <StatusBar hidden />
      <CountdownDisplay remainingMs={remainingMs} containerWidth={width} containerHeight={height} />
      {controls}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  idleBackground: {
    backgroundColor: "#000",
  },
  controlsColumnPortrait: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
  },
  controlsRowLandscape: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  // Both rows stretch to the full width (the default cross-axis behavior
  // once the parent no longer centers them individually) and center their
  // own content within that same width, so the two rows' centers always
  // line up regardless of how many buttons — or how wide each label — is
  // in each row.
  adjustRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 8,
    // Wider gap between the minus and plus groups, matching pauseResetRow's
    // gap — the tight spacing within each group uses adjustGroup instead.
    gap: 12,
    marginBottom: 16,
  },
  adjustGroup: {
    flexDirection: "row",
    gap: 6,
  },
  pauseResetRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  adjustButton: {
    // Fixed (not content-hugging) width: "-1分" and "+1分" etc. can render
    // at very slightly different pixel widths depending on the font, which
    // would otherwise shift the whole row's center by that difference.
    width: 46,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissHint: {
    fontSize: 22,
    marginTop: 24,
  },
});

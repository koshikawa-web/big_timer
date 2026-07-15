import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useAlarmVolume } from "../hooks/useAlarmVolume";
import SettingsModal from "./SettingsModal";
import TimeWheelPicker from "./TimeWheelPicker";

interface SetupScreenProps {
  initialTotalSeconds: number;
  onStart: (totalSeconds: number) => void;
}

export default function SetupScreen({ initialTotalSeconds, onStart }: SetupScreenProps) {
  const [minutes, setMinutes] = useState(Math.floor(initialTotalSeconds / 60));
  const [seconds, setSeconds] = useState(initialTotalSeconds % 60);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { volume, setVolume } = useAlarmVolume();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const totalSeconds = minutes * 60 + seconds;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <Pressable
        style={styles.settingsButton}
        onPress={() => setSettingsVisible(true)}
        accessibilityLabel="設定"
        hitSlop={12}
      >
        <FontAwesome5 name="cog" size={22} color="#fff" />
      </Pressable>

      <Text style={[styles.title, isLandscape && styles.titleLandscape]}>タイマー設定</Text>
      <TimeWheelPicker
        minutes={minutes}
        seconds={seconds}
        onChange={(time) => {
          setMinutes(time.minutes);
          setSeconds(time.seconds);
        }}
      />
      <Pressable
        style={[
          styles.startButton,
          isLandscape && styles.startButtonLandscape,
          totalSeconds === 0 && styles.startButtonDisabled,
        ]}
        disabled={totalSeconds === 0}
        onPress={() => onStart(totalSeconds)}
      >
        <Text style={styles.startButtonText}>スタート</Text>
      </Pressable>

      <SettingsModal
        visible={settingsVisible}
        volume={volume}
        onChangeVolume={setVolume}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  containerLandscape: {
    paddingVertical: 16,
  },
  settingsButton: {
    position: "absolute",
    top: 24,
    right: 24,
    zIndex: 1,
    padding: 8,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 32,
  },
  titleLandscape: {
    fontSize: 16,
    marginBottom: 12,
  },
  startButton: {
    marginTop: 48,
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 12,
    backgroundColor: "#2e7d32",
  },
  startButtonLandscape: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 40,
  },
  startButtonDisabled: {
    backgroundColor: "#333",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
});

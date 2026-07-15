import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Slider from "@react-native-community/slider";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface SettingsModalProps {
  visible: boolean;
  volume: number;
  onChangeVolume: (value: number) => void;
  onClose: () => void;
}

export default function SettingsModal({ visible, volume, onChangeVolume, onClose }: SettingsModalProps) {
  // Live value for smooth dragging feedback; only persisted (via
  // onChangeVolume) once the user releases the slider, instead of writing
  // to storage on every drag frame.
  const [liveVolume, setLiveVolume] = useState(volume);

  useEffect(() => {
    if (visible) setLiveVolume(volume);
  }, [volume, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>設定</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome5 name="times" size={20} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.label}>アラーム音量</Text>
          <View style={styles.sliderRow}>
            <FontAwesome5 name="volume-down" size={18} color="#aaa" />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={liveVolume}
              onValueChange={setLiveVolume}
              onSlidingComplete={onChangeVolume}
              minimumTrackTintColor="#2e7d32"
              maximumTrackTintColor="#444"
              thumbTintColor="#2e7d32"
            />
            <FontAwesome5 name="volume-up" size={18} color="#aaa" />
          </View>
          <Text style={styles.value}>{Math.round(liveVolume * 100)}%</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "82%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    color: "#ccc",
    fontSize: 15,
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
});

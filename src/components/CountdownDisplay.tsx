import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { formatRemaining } from "../hooks/useCountdown";

interface CountdownDisplayProps {
  remainingMs: number;
  color?: string;
  containerWidth: number;
  containerHeight: number;
}

// Any MM:SS.D value has this same character pattern, so measuring it once
// (rather than the live-changing text) gives stable metrics to fit the box.
const CALIBRATION_TEXT = "00:00.0";
// Digits only, used to size digit cells without punctuation diluting the
// average — ":" and "." are much narrower than a digit in most fonts.
const CALIBRATION_DIGITS = "00000";
const CALIBRATION_FONT_SIZE = 100;

// Shrinks the fitted size a bit below the absolute max the box allows.
const FIT_SCALE = 0.95;
// Small safety margin so bold glyph ink never clips against the cell edge.
const DIGIT_CELL_MARGIN = 1;

interface Metrics {
  fontSize: number;
  digitCellWidth: number;
}

export default function CountdownDisplay({
  remainingMs,
  color = "#fff",
  containerWidth,
  containerHeight,
}: CountdownDisplayProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [digitsWidthAt100, setDigitsWidthAt100] = useState<number | null>(null);

  useEffect(() => {
    setMetrics(null);
  }, [containerWidth, containerHeight]);

  if (containerWidth === 0 || containerHeight === 0) {
    return null;
  }

  const handleDigitsCalibrationLayout = (event: LayoutChangeEvent) => {
    if (digitsWidthAt100 !== null) return;
    const { width } = event.nativeEvent.layout;
    if (width > 0) setDigitsWidthAt100(width);
  };

  const handleFullCalibrationLayout = (event: LayoutChangeEvent) => {
    if (metrics !== null || digitsWidthAt100 === null) return;
    const { width, height } = event.nativeEvent.layout;
    if (width === 0 || height === 0) return;
    const scaleByWidth = (containerWidth * 0.98) / width;
    const scaleByHeight = (containerHeight * 0.95) / height;
    const scale = Math.min(scaleByWidth, scaleByHeight) * FIT_SCALE;
    setMetrics({
      fontSize: CALIBRATION_FONT_SIZE * scale,
      digitCellWidth: (digitsWidthAt100 / CALIBRATION_DIGITS.length) * scale * DIGIT_CELL_MARGIN,
    });
  };

  if (metrics === null) {
    return (
      <View style={{ width: containerWidth, height: containerHeight }}>
        <Text
          style={[styles.text, styles.calibration, { fontSize: CALIBRATION_FONT_SIZE, color }]}
          onLayout={handleDigitsCalibrationLayout}
        >
          {CALIBRATION_DIGITS}
        </Text>
        {digitsWidthAt100 !== null && (
          <Text
            style={[styles.text, styles.calibration, { fontSize: CALIBRATION_FONT_SIZE, color }]}
            onLayout={handleFullCalibrationLayout}
          >
            {CALIBRATION_TEXT}
          </Text>
        )}
      </View>
    );
  }

  const text = formatRemaining(remainingMs);

  return (
    <View style={[styles.row, { width: containerWidth, height: containerHeight }]}>
      {text.split("").map((char, index) => {
        const isDigit = char >= "0" && char <= "9";
        return (
          <Text
            key={index}
            style={[
              styles.text,
              { fontSize: metrics.fontSize, color },
              isDigit && { width: metrics.digitCellWidth },
            ]}
          >
            {char}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  calibration: {
    position: "absolute",
    opacity: 0,
  },
});

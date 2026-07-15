import React, { useCallback, useEffect, useRef } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from "react-native";

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const MINUTE_VALUES = Array.from({ length: 60 }, (_, i) => i);
const SECOND_VALUES = Array.from({ length: 60 }, (_, i) => i);

interface WheelColumnProps {
  values: number[];
  selectedValue: number;
  onChange: (value: number) => void;
}

function WheelColumn({ values, selectedValue, onChange }: WheelColumnProps) {
  const listRef = useRef<FlatList<number>>(null);
  const hasMountedScroll = useRef(false);

  useEffect(() => {
    if (hasMountedScroll.current) return;
    hasMountedScroll.current = true;
    const index = values.indexOf(selectedValue);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitOffset = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
      const value = values[index];
      if (value !== selectedValue) {
        onChange(value);
      }
    },
    [values, selectedValue, onChange]
  );

  return (
    <View style={styles.column}>
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={commitOffset}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={[styles.itemText, item === selectedValue && styles.itemTextSelected]}>
              {String(item).padStart(2, "0")}
            </Text>
          </View>
        )}
      />
      <View pointerEvents="none" style={[styles.selectionLine, { top: PADDING }]} />
      <View pointerEvents="none" style={[styles.selectionLine, { top: PADDING + ITEM_HEIGHT }]} />
    </View>
  );
}

interface TimeWheelPickerProps {
  minutes: number;
  seconds: number;
  onChange: (time: { minutes: number; seconds: number }) => void;
}

export default function TimeWheelPicker({ minutes, seconds, onChange }: TimeWheelPickerProps) {
  return (
    <View style={styles.wheelRow}>
      <WheelColumn
        values={MINUTE_VALUES}
        selectedValue={minutes}
        onChange={(value) => onChange({ minutes: value, seconds })}
      />
      <Text style={styles.separator}>:</Text>
      <WheelColumn
        values={SECOND_VALUES}
        selectedValue={seconds}
        onChange={(value) => onChange({ minutes, seconds: value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  column: {
    height: WHEEL_HEIGHT,
    width: 100,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 24,
    color: "#666",
    fontVariant: ["tabular-nums"],
  },
  itemTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  separator: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "700",
    marginHorizontal: 4,
  },
  selectionLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#555",
  },
});

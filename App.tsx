import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import SetupScreen from "./src/components/SetupScreen";
import TimerScreen from "./src/components/TimerScreen";
import { useLastDuration } from "./src/hooks/useLastDuration";

export default function App() {
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const { totalSeconds: lastDuration, setTotalSeconds: setLastDuration, loaded } = useLastDuration();

  const handleStart = (seconds: number) => {
    setLastDuration(seconds);
    setTotalSeconds(seconds);
  };

  return (
    <View style={styles.container}>
      {totalSeconds !== null ? (
        <TimerScreen totalSeconds={totalSeconds} onExit={() => setTotalSeconds(null)} />
      ) : loaded ? (
        <SetupScreen initialTotalSeconds={lastDuration} onStart={handleStart} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});

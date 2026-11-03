import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isOffline = (s: NetInfoState) =>
  s.isConnected === false || s.isInternetReachable === false;

export default function NetworkStatusBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOffline = isOffline(state);
      setOffline(nowOffline);
      if (nowOffline) {
        wasOffline.current = true;
        setBackOnline(false);
      } else if (wasOffline.current && state.isInternetReachable !== null) {
        wasOffline.current = false;
        setBackOnline(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setBackOnline(false), 2500);
      }
    });
    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!offline && !backOnline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          paddingTop: insets.top + 6,
          backgroundColor: offline ? "#D93025" : "#1E8E3E",
        },
      ]}
    >
      <Ionicons
        name={offline ? "cloud-offline-outline" : "cloud-done-outline"}
        size={16}
        color="white"
      />
      <Text style={styles.text}>
        {offline
          ? "No internet connection. Some features won't work until you're back online."
          : "Back online"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: { color: "white", fontSize: 12, fontWeight: "600", flexShrink: 1 },
});

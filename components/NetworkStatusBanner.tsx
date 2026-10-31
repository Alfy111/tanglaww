import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { StyleSheet, Text, View } from "react-native";

export default function NetworkStatusBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const isOffline = isConnected === false || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={styles.banner}
    >
      <MaterialCommunityIcons name="wifi-off" size={20} color="#5C3B00" />
      <Text style={styles.message}>
        No internet connection. Some app features may be unavailable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#FFF0C2",
    borderBottomWidth: 1,
    borderBottomColor: "#E8C66A",
  },
  message: {
    flexShrink: 1,
    color: "#5C3B00",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

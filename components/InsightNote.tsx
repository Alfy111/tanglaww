// Small "Insight" box shown under an analytics chart.
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function InsightNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.box}>
      <View style={styles.labelRow}>
        <Ionicons name="bulb-outline" size={14} color="#D4A017" />
        <Text style={styles.label}>INSIGHT</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E8F4",
    borderLeftWidth: 4,
    borderLeftColor: "#0D2A94",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#0D2A94",
  },
  text: { fontSize: 12, color: "#1A2A5E", lineHeight: 17 },
});

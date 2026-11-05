import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useAnalyticsColors } from "./analytics-ui";

export default function InsightNote({ text }: { text?: string | null }) {
  const colors = useAnalyticsColors();
  if (!text) return null;
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.labelRow}>
        <Ionicons name="bulb-outline" size={14} color="#D4A017" />
        <Text style={[styles.label, { color: colors.primary }]}>INSIGHT</Text>
      </View>
      <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
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
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  text: { fontSize: 12, lineHeight: 17 },
});

import { StyleSheet, Text, View } from "react-native";

const isHeading = (block: string) =>
  !block.includes("\n") &&
  block.length <= 40 &&
  !/[.!?:"”]$/.test(block.trim());

export default function ContentText({ text }: { text?: string | null }) {
  const blocks = (text ?? "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0)
    return <Text style={styles.empty}>No content yet.</Text>;

  return (
    <View>
      {blocks.map((block, i) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (isHeading(block)) {
          return (
            <Text key={i} style={styles.heading}>
              {block}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.block}>
            {lines.map((line, j) =>
              /^[-•]\s+/.test(line) ? (
                <View key={j} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={[styles.body, { flex: 1 }]}>
                    {line.replace(/^[-•]\s+/, "")}
                  </Text>
                </View>
              ) : (
                <Text key={j} style={styles.body}>
                  {line}
                </Text>
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  heading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D2A94",
    marginTop: 4,
    marginBottom: 6,
  },
  body: { fontSize: 15, color: "#555", lineHeight: 23 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
  bullet: { fontSize: 15, color: "#0D2A94", lineHeight: 23 },
  empty: { fontSize: 14, color: "#999", fontStyle: "italic" },
});

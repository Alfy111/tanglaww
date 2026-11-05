import { useAppTheme } from "@/context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const isHeading = (block: string) =>
  !block.includes("\n") &&
  block.length <= 40 &&
  !/[.!?:"”]$/.test(block.trim());

export default function ContentText({ text }: { text?: string | null }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

type ThemeColors = ReturnType<typeof useAppTheme>["colors"];

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    block: { marginBottom: 12 },
    heading: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
      marginTop: 4,
      marginBottom: 6,
    },
    body: { fontSize: 15, color: colors.text, lineHeight: 23 },
    bulletRow: { flexDirection: "row", gap: 8, marginBottom: 2 },
    bullet: { fontSize: 15, color: colors.primary, lineHeight: 23 },
    empty: { fontSize: 14, color: colors.secondaryText, fontStyle: "italic" },
  });

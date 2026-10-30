import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Diagnostic = {
  module_id: number;
  assessment_id: number | null;
  title: string | null;
  isPublished: boolean;
};

// "Diagnostic Examination" card shown above the courses.
// Admin: always shown. Opens the quiz list so they can create/edit the exam.
// Student: shown only when the exam is published. Opens the exam directly.
export default function DiagnosticCard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [diag, setDiag] = useState<Diagnostic | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.rpc("get_diagnostic_quiz").then(({ data, error }) => {
        if (error) console.error("get_diagnostic_quiz:", error.message);
        setDiag((data as Diagnostic) ?? null);
      });
    }, []),
  );

  if (!diag) return null;
  if (!isAdmin && !(diag.assessment_id && diag.isPublished)) return null;

  const subtitle = !diag.assessment_id
    ? "No exam yet · Tap to create"
    : isAdmin && !diag.isPublished
      ? `Draft · ${diag.title}`
      : diag.title;

  const open = () => {
    if (isAdmin) {
      router.push({
        pathname: "/materials/quiz" as any,
        params: {
          courseId: "1", // the diagnostic module sits under Concept-Driven
          courseTitle: "Diagnostic Examination",
          diagnostic: "1",
        },
      });
    } else {
      router.push({
        pathname: "/materials/quiz-details" as any,
        params: { assessmentId: String(diag.assessment_id) },
      });
    }
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={open}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Diagnostic Examination</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#BDC3C7" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8ECF4",
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EEF1FB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 15, fontWeight: "bold", color: "#333" },
  sub: { fontSize: 12, color: "#7F8C8D", marginTop: 2 },
});

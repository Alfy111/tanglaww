import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAdmin } from "../../context/AdminContext";

const EDITOR_ROUTE = "../materials/quiz-editor";
const DETAILS_ROUTE = "../materials/quiz-details";

// One shape for both admin and student rows
interface QuizRow {
  assessment_id: number;
  module_id: number;
  title: string;
  deadline: string | null;
  status: "Draft" | "Open" | "Closed";
  subtitle: string;
  // Student only
  maxScore?: number;
  latestScore?: number | null;
}

const STATUS_COLORS = {
  Draft: { text: "#B26A00" },
  Open: { text: "#1E9E5A" },
  Closed: { text: "#C0392B" },
};

const formatDue = (iso: string | null) => {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Due: ${date}, ${time}`;
};

const formatScore = (n: number) => String(Number(n.toFixed(2)));

export default function QuizScreen() {
  const router = useRouter();
  const { courseId: courseIdParam, courseTitle = "Course" } =
    useLocalSearchParams<{ courseId: string; courseTitle: string }>();
  const courseId = Number(courseIdParam);
  const { isAdmin, isStudent, authLoading } = useAdmin();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminQuizzes = async (): Promise<QuizRow[]> => {
    const { data, error } = await supabase
      .from("assessment")
      .select(
        "assessment_id, module_id, title, deadline, isPublished, isClosed, closeAfterDeadline, totalItems, module!inner(moduleName, course_id)",
      )
      .eq("module.course_id", courseId)
      .order("deadline", { ascending: true, nullsFirst: false });
    if (error) console.error("fetchAdminQuizzes:", error.message);

    return (data ?? []).map((q: any) => {
      const pastDeadline =
        q.closeAfterDeadline && q.deadline && new Date(q.deadline) < new Date();
      const status = !q.isPublished
        ? "Draft"
        : q.isClosed || pastDeadline
          ? "Closed"
          : "Open";
      return {
        assessment_id: q.assessment_id,
        module_id: q.module_id,
        title: q.title,
        deadline: q.deadline,
        status,
        subtitle: `${q.totalItems} ${q.totalItems === 1 ? "question" : "questions"}`,
      };
    });
  };

  const fetchStudentQuizzes = async (): Promise<QuizRow[]> => {
    const { data, error } = await supabase.rpc("get_student_quiz_list", {
      p_course_id: courseId,
    });
    if (error) console.error("fetchStudentQuizzes:", error.message);

    return ((data as any[]) ?? []).map((q) => ({
      assessment_id: q.assessment_id,
      module_id: q.module_id,
      title: q.title,
      deadline: q.deadline,
      status: q.isClosed ? "Closed" : "Open",
      subtitle: `Attempts used: ${q.attemptsUsed} of ${q.maxAttempts}`,
      maxScore: Number(q.maxScore),
      latestScore: q.latestScore === null ? null : Number(q.latestScore),
    }));
  };

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    // Wait until the role is known, then load the list for that role only
    if (authLoading) return;
    const rows = isAdmin
      ? await fetchAdminQuizzes()
      : isStudent
        ? await fetchStudentQuizzes()
        : [];
    setQuizzes(rows);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isAdmin, isStudent, authLoading]);

  // Refresh whenever the screen comes back into view
  useFocusEffect(
    useCallback(() => {
      if (courseId) fetchQuizzes();
    }, [courseId, fetchQuizzes]),
  );

  const openEditor = (assessmentId?: number) => {
    router.push({
      pathname: EDITOR_ROUTE as any,
      params: {
        courseId: String(courseId),
        courseTitle,
        ...(assessmentId ? { assessmentId: String(assessmentId) } : {}),
      },
    });
  };

  const handlePress = (item: QuizRow) => {
    if (isAdmin) {
      openEditor(item.assessment_id);
    } else {
      router.push({
        pathname: DETAILS_ROUTE as any,
        params: { assessmentId: String(item.assessment_id) },
      });
    }
  };

  const renderItem = ({ item }: { item: QuizRow }) => {
    const colors = STATUS_COLORS[item.status];
    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSub}>{formatDue(item.deadline)}</Text>
          <Text style={styles.cardMeta}>{item.subtitle}</Text>
          {!isAdmin && (
            <View style={styles.doneBadge}>
              <Ionicons
                name="checkmark-circle"
                size={13}
                color={item.latestScore != null ? "#1E9E5A" : "#A0A7B4"}
              />
              <Text
                style={[
                  styles.doneText,
                  item.latestScore == null && styles.notDoneText,
                ]}
              >
                {item.latestScore != null ? "Completed" : "Not taken yet"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          {!isAdmin && (
            <>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>
                {item.latestScore === null || item.latestScore === undefined
                  ? "?"
                  : formatScore(item.latestScore)}{" "}
                / {item.maxScore}
              </Text>
            </>
          )}
          {(isAdmin || item.status === "Closed") && (
            <View style={[styles.badge]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => openEditor()}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.courseLabelWrap}>
        <Text style={styles.courseLabel}>{courseTitle}</Text>
        <Text style={styles.courseSub}>Quizzes</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : quizzes.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="clipboard-text-search-outline"
            size={60}
            color="#BDC3C7"
          />
          <Text style={styles.emptyText}>No quizzes yet.</Text>
          {isAdmin && (
            <Text style={styles.emptyHint}>Tap + to create a quiz.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={quizzes}
          keyExtractor={(item) => String(item.assessment_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-back" size={24} color="#DCDFE3" />
        </TouchableOpacity>
        <Text style={styles.navLabel}>Quizzes</Text>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-forward" size={24} color="#DCDFE3" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#0D2A94",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 15,
  },
  headerRight: { paddingLeft: 10 },
  courseLabelWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  courseLabel: { fontSize: 17, fontWeight: "bold", color: "#0D2A94" },
  courseSub: { fontSize: 13, color: "#777", marginTop: 2 },
  listContent: { padding: 20, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF1F6",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#0D2A94" },
  cardSub: { fontSize: 12, color: "#1A1A2E", marginTop: 4 },
  cardMeta: { fontSize: 11, color: "#6B7280", marginTop: 4 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  doneText: { fontSize: 11, color: "#1E9E5A", fontWeight: "600" },
  notDoneText: { color: "#A0A7B4" },
  cardRight: { alignItems: "flex-end", marginLeft: 10 },
  scoreLabel: { fontSize: 11, color: "#0D2A94" },
  scoreValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: { fontSize: 16, color: "#95A5A6", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#BDC3C7", marginTop: 6 },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  navLabel: { fontSize: 16, color: "black", fontWeight: "500" },
});

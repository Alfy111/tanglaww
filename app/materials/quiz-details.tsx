import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TAKE_ROUTE = "/materials/quiz-take";
const REVIEW_ROUTE = "/materials/quiz-review";

interface Attempt {
  attempt_id: number;
  score: number;
  isPassed: boolean;
  attemptedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number;
}

interface QuizDetails {
  assessment_id: number;
  title: string;
  instructions: string | null;
  deadline: string | null;
  maxAttempts: number;
  passingScore: number;
  timeLimitMinutes: number | null;
  showCorrectAnswers: boolean;
  isClosed: boolean;
  maxScore: number;
  totalItems: number;
  attempts: Attempt[];
}

const COLORS = {
  primary: "#0D2A94",
  card: "#EEF1F6",
  text: "#1A1A2E",
  muted: "#6B7280",
  pass: "#22C55E",
  fail: "#E74C3C",
  empty: "#C9D2E3",
};

const formatDateTime = (iso: string) => {
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
  return `${date}, ${time}`;
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hr ${rest} min`;
};

const formatScore = (n: number) => String(Number(Number(n).toFixed(2)));

export default function QuizDetailsScreen() {
  const router = useRouter();
  const { assessmentId: idParam } = useLocalSearchParams<{
    assessmentId: string;
  }>();
  const assessmentId = Number(idParam);

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_student_quiz", {
      p_assessment_id: assessmentId,
    });
    if (error) {
      Alert.alert("Error", error.message);
      router.back();
      return;
    }
    setQuiz(data as QuizDetails);
    setLoading(false);
  }, [assessmentId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !quiz) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const submitted = quiz.attempts.filter((a) => a.submittedAt !== null);
  const inProgress = quiz.attempts.find((a) => a.submittedAt === null);
  const latest = submitted.length > 0 ? submitted[submitted.length - 1] : null;
  const best =
    submitted.length > 0
      ? Math.max(...submitted.map((a) => Number(a.score)))
      : null;
  const attemptsLeft = Math.max(quiz.maxAttempts - quiz.attempts.length, 0);

  const ringColor = !latest
    ? COLORS.empty
    : latest.isPassed
      ? COLORS.pass
      : COLORS.fail;

  const startQuiz = async () => {
    setStarting(true);
    const { data, error } = await supabase.rpc("start_attempt", {
      p_assessment_id: assessmentId,
    });
    setStarting(false);
    if (error) {
      Alert.alert("Cannot start quiz", error.message);
      load();
      return;
    }
    router.push({
      pathname: TAKE_ROUTE as any,
      params: { attemptId: String(data) },
    });
  };

  const confirmStart = () => {
    if (inProgress) {
      startQuiz();
      return;
    }
    Alert.alert(
      submitted.length > 0 ? "Re-take quiz" : "Take quiz",
      `This will use 1 of your ${attemptsLeft} remaining attempt${attemptsLeft === 1 ? "" : "s"}.${
        quiz.timeLimitMinutes
          ? ` You will have ${quiz.timeLimitMinutes} minutes, and the timer keeps running even if you leave the quiz.`
          : ""
      } Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start", onPress: startQuiz },
      ],
    );
  };

  const openReview = (attemptId: number) => {
    router.push({
      pathname: REVIEW_ROUTE as any,
      params: { attemptId: String(attemptId) },
    });
  };

  let buttonLabel = "Take Quiz";
  let buttonDisabled = false;
  if (quiz.isClosed) {
    buttonLabel = "Quiz Closed";
    buttonDisabled = true;
  } else if (inProgress) {
    buttonLabel = "Continue Quiz";
  } else if (attemptsLeft === 0) {
    buttonLabel = "No Attempts Left";
    buttonDisabled = true;
  } else if (submitted.length > 0) {
    buttonLabel = "Re-take Quiz";
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {quiz.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <Text style={styles.cardText}>
            {quiz.instructions || "Answer all questions carefully."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <Text style={styles.cardText}>
            Max score: {quiz.maxScore} ({quiz.totalItems}{" "}
            {quiz.totalItems === 1 ? "question" : "questions"})
          </Text>
          <Text style={styles.cardText}>
            Passing score: {quiz.passingScore}
          </Text>
          <Text style={styles.cardText}>
            Time limit:{" "}
            {quiz.timeLimitMinutes
              ? `${quiz.timeLimitMinutes} minutes`
              : "No time limit"}
          </Text>
          <Text style={styles.cardText}>
            Due: {quiz.deadline ? formatDateTime(quiz.deadline) : "No deadline"}
          </Text>
          <Text style={styles.cardText}>
            Available attempts: {attemptsLeft} of {quiz.maxAttempts}
          </Text>
          {quiz.isClosed && (
            <Text style={styles.closedText}>
              {quiz.deadline && new Date(quiz.deadline) < new Date()
                ? "This quiz is closed. The deadline has passed, so it can no longer be taken."
                : "This quiz is closed by the admin, so it can no longer be taken."}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score</Text>
          <View style={styles.ringWrap}>
            <View style={[styles.ring, { borderColor: ringColor }]}>
              <Text style={styles.ringText}>
                {latest ? formatScore(latest.score) : "?"} / {quiz.maxScore}
              </Text>
            </View>
            {latest && (
              <Text style={[styles.resultText, { color: ringColor }]}>
                {latest.isPassed ? "Passed" : "Did not pass"}
              </Text>
            )}
            {best !== null && submitted.length > 1 && (
              <Text style={styles.cardSubtle}>
                Highest score: {formatScore(best)}
              </Text>
            )}
          </View>
        </View>

        {latest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submission Details</Text>
            <Text style={styles.cardText}>
              Time spent: {formatDuration(latest.timeSpentSeconds)}
            </Text>
            <Text style={styles.cardText}>
              Submitted: {formatDateTime(latest.submittedAt as string)}
            </Text>

            {submitted.length > 0 && (
              <View style={styles.historyWrap}>
                {submitted.map((a, i) => (
                  <TouchableOpacity
                    key={a.attempt_id}
                    style={styles.historyRow}
                    onPress={() => openReview(a.attempt_id)}
                  >
                    <Text style={styles.historyText}>
                      Attempt {i + 1}: {formatScore(a.score)} / {quiz.maxScore}
                    </Text>
                    <View style={styles.reviewLink}>
                      <Text style={styles.reviewLinkText}>Review</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={COLORS.primary}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (buttonDisabled || starting) && styles.btnDisabled,
          ]}
          disabled={buttonDisabled || starting}
          onPress={confirmStart}
        >
          {starting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: COLORS.primary,
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
  scroll: { padding: 16, paddingBottom: 30 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  cardText: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  cardSubtle: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  closedText: {
    fontSize: 13,
    color: COLORS.fail,
    fontWeight: "600",
    marginTop: 4,
  },

  ringWrap: { alignItems: "center", paddingVertical: 6 },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  ringText: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  resultText: { fontSize: 13, fontWeight: "700", marginTop: 8 },

  historyWrap: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#DDE2EA" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DDE2EA",
  },
  historyText: { fontSize: 13, color: COLORS.text },
  reviewLink: { flexDirection: "row", alignItems: "center" },
  reviewLinkText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: "#EEE" },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
});

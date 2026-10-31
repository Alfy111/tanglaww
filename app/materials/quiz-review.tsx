import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type QuestionType = "mcq" | "identification" | "matching";

interface ReviewQuestion {
  question_id: number;
  questionType: QuestionType;
  questionText: string;
  imageUrl?: string | null;
  points: number;
  majorTag: string | null;
  minorTag: string | null;
  choices:
    | {
        choice_id: number;
        choiceText: string;
        imageUrl?: string | null;
        isCorrect: boolean | null;
      }[]
    | null;
  matchItems:
    | { pair_id: number; leftText: string; correctMatch: string | null }[]
    | null;
  acceptedAnswers: string[] | null;
  answer: {
    choice_id: number | null;
    textAnswer: string | null;
    matchingAnswer: Record<string, string> | null;
    isCorrect: boolean | null;
    pointsEarned: number | null;
  } | null;
}

interface Review {
  title: string;
  score: number;
  maxScore: number;
  isPassed: boolean;
  timeSpentSeconds: number;
  submittedAt: string;
  showCorrectAnswers: boolean;
  questions: ReviewQuestion[];
}

const COLORS = {
  primary: "#0D2A94",
  card: "#EEF1F6",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  correct: "#1E9E5A",
  correctBg: "#E3F6EC",
  wrong: "#C0392B",
  wrongBg: "#FDECEA",
  selectedBg: "#EEF1FB",
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  identification: "Identification",
  matching: "Matching Type",
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
};

const formatScore = (n: number) => String(Number(Number(n).toFixed(2)));

export default function QuizReviewScreen() {
  const router = useRouter();
  const { attemptId: idParam } = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Number(idParam);

  const [review, setReview] = useState<Review | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("get_attempt_review", {
        p_attempt_id: attemptId,
      });
      if (error) {
        Alert.alert("Error", error.message);
        router.back();
        return;
      }
      setReview(data as Review);
    };
    load();
  }, [attemptId, router]);

  if (!review) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const show = review.showCorrectAnswers;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {review.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Result</Text>
          <Text style={styles.cardText}>
            Score: {formatScore(review.score)} / {review.maxScore}{" "}
            <Text
              style={{ color: review.isPassed ? COLORS.correct : COLORS.wrong }}
            >
              ({review.isPassed ? "Passed" : "Did not pass"})
            </Text>
          </Text>
          <Text style={styles.cardText}>
            Time spent: {formatDuration(review.timeSpentSeconds)}
          </Text>
        </View>

        {!show && (
          <View style={styles.notice}>
            <Ionicons name="eye-off-outline" size={16} color={COLORS.muted} />
            <Text style={styles.noticeText}>
              Correct answers are hidden for this quiz. You can review your own
              answers below.
            </Text>
          </View>
        )}

        {review.questions.map((q, i) => {
          const a = q.answer;
          const correct = a?.isCorrect;
          return (
            <View key={q.question_id} style={styles.questionCard}>
              <View style={styles.questionTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questionNumber}>QUESTION {i + 1}</Text>
                  <Text style={styles.questionMeta}>
                    {TYPE_LABELS[q.questionType]}
                    {q.minorTag ? ` · ${q.minorTag}` : ""}
                  </Text>
                </View>
                {show && a && (
                  <View
                    style={[
                      styles.pointsBadge,
                      {
                        backgroundColor: correct
                          ? COLORS.correctBg
                          : COLORS.wrongBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pointsText,
                        { color: correct ? COLORS.correct : COLORS.wrong },
                      ]}
                    >
                      {formatScore(a.pointsEarned ?? 0)} / {q.points}
                    </Text>
                  </View>
                )}
              </View>

              {!!q.questionText && (
                <Text style={styles.questionText}>{q.questionText}</Text>
              )}
              {!!q.imageUrl && (
                <Image
                  source={{ uri: q.imageUrl }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              )}

              {q.questionType === "mcq" &&
                (q.choices ?? []).map((c, ci) => {
                  const picked = a?.choice_id === c.choice_id;
                  const isRight = show && c.isCorrect === true;
                  const isWrongPick = show && picked && c.isCorrect === false;
                  return (
                    <View
                      key={c.choice_id}
                      style={[
                        styles.choiceRow,
                        picked && {
                          backgroundColor: COLORS.selectedBg,
                          borderColor: COLORS.primary,
                        },
                        isRight && {
                          backgroundColor: COLORS.correctBg,
                          borderColor: COLORS.correct,
                        },
                        isWrongPick && {
                          backgroundColor: COLORS.wrongBg,
                          borderColor: COLORS.wrong,
                        },
                      ]}
                    >
                      <Text style={styles.choiceLetter}>
                        {String.fromCharCode(65 + ci)}
                      </Text>
                      <View style={{ flex: 1 }}>
                        {!!c.choiceText && (
                          <Text style={styles.choiceText}>{c.choiceText}</Text>
                        )}
                        {!!c.imageUrl && (
                          <Image
                            source={{ uri: c.imageUrl }}
                            style={[
                              styles.choiceImage,
                              !!c.choiceText && { marginTop: 6 },
                            ]}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                      {picked && (
                        <Text style={styles.yourPick}>Your answer</Text>
                      )}
                      {isRight && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={COLORS.correct}
                        />
                      )}
                      {isWrongPick && (
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={COLORS.wrong}
                        />
                      )}
                    </View>
                  );
                })}

              {q.questionType === "identification" && (
                <>
                  <Text style={styles.answerLabel}>Your answer:</Text>
                  <Text
                    style={[
                      styles.answerValue,
                      show && {
                        color: correct ? COLORS.correct : COLORS.wrong,
                      },
                    ]}
                  >
                    {a?.textAnswer || "No answer"}
                  </Text>
                  {show && q.acceptedAnswers && (
                    <>
                      <Text style={styles.answerLabel}>Accepted answers:</Text>
                      <Text style={styles.answerValue}>
                        {q.acceptedAnswers.join(", ")}
                      </Text>
                    </>
                  )}
                </>
              )}

              {q.questionType === "matching" &&
                (q.matchItems ?? []).map((item, mi) => {
                  const given =
                    a?.matchingAnswer?.[String(item.pair_id)] ?? null;
                  const right =
                    show &&
                    given !== null &&
                    item.correctMatch !== null &&
                    given.trim().toLowerCase() ===
                      item.correctMatch.trim().toLowerCase();
                  return (
                    <View key={item.pair_id} style={styles.matchRow}>
                      <Text style={styles.matchLeft}>
                        {mi + 1}. {item.leftText}
                      </Text>
                      <Text
                        style={[
                          styles.answerValue,
                          show && {
                            color: right ? COLORS.correct : COLORS.wrong,
                          },
                        ]}
                      >
                        Your match: {given ?? "No answer"}
                      </Text>
                      {show && !right && item.correctMatch && (
                        <Text
                          style={[
                            styles.answerValue,
                            { color: COLORS.correct },
                          ]}
                        >
                          Correct match: {item.correctMatch}
                        </Text>
                      )}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },

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

  notice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F5F6F9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.muted },

  questionCard: {
    borderWidth: 1,
    borderColor: "#E5E8EE",
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  questionTop: { flexDirection: "row", alignItems: "flex-start" },
  questionNumber: { fontSize: 13, fontWeight: "bold", color: COLORS.primary },
  questionMeta: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  pointsBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pointsText: { fontSize: 12, fontWeight: "700" },
  questionText: { fontSize: 14, color: COLORS.text, marginVertical: 12 },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  choiceLetter: { fontWeight: "700", color: COLORS.text, width: 18 },
  choiceText: { flex: 1, fontSize: 13, color: COLORS.text },
  choiceImage: { width: "100%", height: 120 },
  questionImage: {
    width: "100%",
    height: 200,
    marginVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E8EE",
    backgroundColor: "#FAFAFA",
  },
  yourPick: { fontSize: 10, color: COLORS.primary, fontWeight: "600" },

  answerLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  answerValue: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
    marginBottom: 4,
  },

  matchRow: { marginBottom: 10 },
  matchLeft: { fontSize: 13, fontWeight: "600", color: COLORS.text },
});

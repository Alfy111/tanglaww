import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MatchingBoard from "../../components/MatchingBoard";

type QuestionType = "mcq" | "identification" | "matching";
type Filter = "all" | "marked";

interface SavedAnswer {
  choice_id?: number | null;
  textAnswer?: string | null;
  matchingAnswer?: Record<string, string> | null;
}

interface Question {
  question_id: number;
  questionType: QuestionType;
  questionText: string;
  imageUrl?: string | null;
  points: number;
  majorTag: string | null;
  minorTag: string | null;
  choices:
    | { choice_id: number; choiceText: string; imageUrl?: string | null }[]
    | null;
  matchItems: { pair_id: number; leftText: string }[] | null;
  matchOptions: string[] | null;
  answer: SavedAnswer | null;
}

const COLORS = {
  primary: "#0D2A94",
  accent: "#2F459B",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  tag: "#D9DDE5",
  blue: "#0D2A94",
  blueLight: "#7F95E8",
  dark: "#161616",
  darkCell: "#262626",
  darkText: "#E5E5E5",
  green: "#22C55E",
  marked: "#FACC15",
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  identification: "Identification",
  matching: "Matching Type",
};

const formatTimer = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

const isAnswered = (q: Question, a?: SavedAnswer) => {
  if (!a) return false;
  if (q.questionType === "mcq")
    return a.choice_id !== null && a.choice_id !== undefined;
  if (q.questionType === "identification") return !!a.textAnswer?.trim();
  const items = q.matchItems ?? [];
  return (
    items.length > 0 &&
    items.every((it) => !!a.matchingAnswer?.[String(it.pair_id)])
  );
};

export default function QuizTakeScreen() {
  const router = useRouter();
  const { attemptId: idParam } = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Number(idParam);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, SavedAnswer>>({});
  const [index, setIndex] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [seconds, setSeconds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const dirty = useRef<Set<number>>(new Set());
  const finishing = useRef(false);
  const warned = useRef(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("get_attempt_questions", {
        p_attempt_id: attemptId,
      });
      if (error) {
        Alert.alert("Error", error.message);
        router.back();
        return;
      }
      const d = data as any;
      const qs = (d.questions ?? []) as Question[];
      const initial: Record<number, SavedAnswer> = {};
      for (const q of qs) if (q.answer) initial[q.question_id] = q.answer;

      setTitle(d.title);
      setQuestions(qs);
      setAnswers(initial);
      setSeconds(d.timeSpentSeconds ?? 0);
      setSecondsLeft(d.secondsLeft ?? null);
      setLoading(false);
    };
    load();
  }, [attemptId, router]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
      setSecondsLeft((s) => (s === null ? null : Math.max(s - 1, 0)));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const setAnswer = (questionId: number, changes: SavedAnswer) => {
    dirty.current.add(questionId);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...changes },
    }));
  };

  const saveDirty = useCallback(async (): Promise<
    "ok" | "closed" | "error"
  > => {
    const ids = Array.from(dirty.current);
    for (const qid of ids) {
      dirty.current.delete(qid);
      const a = answersRef.current[qid] ?? {};
      const text = a.textAnswer?.trim();
      const { data, error } = await supabase.rpc("save_answer", {
        p_attempt_id: attemptId,
        p_question_id: qid,
        p_choice_id: a.choice_id ?? null,
        p_text: text ? text : null,
        p_matching: a.matchingAnswer ?? null,
        p_time_spent: secondsRef.current,
      });
      if (error) {
        dirty.current.add(qid);
        Alert.alert("Could not save your answer", error.message);
        return "error";
      }
      if (data === false) return "closed";
    }
    return "ok";
  }, [attemptId]);

  const submitNow = useCallback(
    async (reason: "manual" | "closed" | "time") => {
      if (finishing.current) return;
      finishing.current = true;
      setBusy(true);

      const result = await saveDirty();
      if (result === "error") {
        finishing.current = false;
        setBusy(false);
        return;
      }

      const { error } = await supabase.rpc("submit_attempt", {
        p_attempt_id: attemptId,
        p_time_spent: secondsRef.current,
      });
      setBusy(false);

      if (error) {
        finishing.current = false;
        Alert.alert("Could not submit", error.message);
        return;
      }

      setNavigatorOpen(false);
      if (reason === "time") {
        Alert.alert(
          "Time's up",
          "Your time ran out, so your saved answers were submitted.",
        );
      } else if (reason === "closed") {
        Alert.alert(
          "Quiz ended",
          "The quiz has closed or your time ran out, so your saved answers were submitted.",
        );
      }
      router.back();
    },
    [attemptId, router, saveDirty],
  );

  const saveAndExit = useCallback(async () => {
    if (finishing.current) return;
    setBusy(true);
    const result = await saveDirty();
    if (result === "closed") {
      setBusy(false);
      submitNow("closed");
      return;
    }
    if (result === "error") {
      setBusy(false);
      return;
    }
    await supabase.rpc("save_attempt_time", {
      p_attempt_id: attemptId,
      p_seconds: secondsRef.current,
    });
    setBusy(false);
    finishing.current = true;
    router.back();
  }, [attemptId, router, saveDirty, submitNow]);

  const confirmExit = useCallback(() => {
    Alert.alert(
      "Save and exit",
      secondsLeft !== null
        ? "Your answers will be saved. The timer keeps running while you are away, and the quiz submits itself when time runs out."
        : "Your answers will be saved and the timer will pause. You can continue later, but this still counts as an attempt.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Save & exit", onPress: saveAndExit },
      ],
    );
  }, [saveAndExit, secondsLeft]);

  useEffect(() => {
    if (loading || secondsLeft === null) return;
    if (secondsLeft === 0) {
      submitNow("time");
      return;
    }
    if (secondsLeft <= 300 && secondsLeft > 290 && !warned.current) {
      warned.current = true;
      Alert.alert(
        "5 minutes left",
        "The quiz will submit automatically when time runs out.",
      );
    }
  }, [loading, secondsLeft, submitNow]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      confirmExit();
      return true;
    });
    return () => sub.remove();
  }, [confirmExit]);

  const goTo = async (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setIndex(i);
    setNavigatorOpen(false);
    const result = await saveDirty();
    if (result === "closed") submitNow("closed");
  };

  const confirmSubmit = () => {
    const unanswered = questions.filter(
      (q) => !isAnswered(q, answers[q.question_id]),
    ).length;
    Alert.alert(
      "Submit quiz",
      unanswered > 0
        ? `You have ${unanswered} unanswered question${
            unanswered === 1 ? "" : "s"
          }. Unanswered questions get 0 points. Submit anyway?`
        : "Submit your answers now?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: () => submitNow("manual") },
      ],
    );
  };

  const toggleMark = (questionId: number) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>This quiz has no questions.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const q = questions[index];
  const a = answers[q.question_id] ?? {};
  const answeredCount = questions.filter((x) =>
    isAnswered(x, answers[x.question_id]),
  ).length;
  const isLast = index === questions.length - 1;

  const numbered = questions.map((x, i) => ({ q: x, i }));
  const visibleCells = numbered.filter(({ q: x }) => {
    if (filter === "marked") return marked.has(x.question_id);
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={confirmExit}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
        >
          <View style={styles.tagRow}>
            <View style={[styles.tag, { flex: 1 }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {q.majorTag ?? "No major tag"}
              </Text>
            </View>
            <View style={[styles.tag, styles.tagLight, { flex: 1.4 }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {q.minorTag ?? "No minor tag"}
              </Text>
            </View>
          </View>

          <View style={styles.questionHeading}>
            <View>
              <Text style={styles.questionNumber}>QUESTION {index + 1}</Text>
              <Text style={styles.questionType}>
                {TYPE_LABELS[q.questionType]} · {q.points}{" "}
                {q.points === 1 ? "pt" : "pts"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.markBtn,
                marked.has(q.question_id) && styles.markBtnActive,
              ]}
              onPress={() => toggleMark(q.question_id)}
            >
              <Ionicons
                name={marked.has(q.question_id) ? "flag" : "flag-outline"}
                size={14}
                color={marked.has(q.question_id) ? "#7A5B00" : COLORS.muted}
              />
              <Text style={styles.markText}>
                {marked.has(q.question_id) ? "Marked" : "Mark"}
              </Text>
            </TouchableOpacity>
          </View>

          {!!q.questionText && (
            <Text style={styles.questionText}>{q.questionText}</Text>
          )}
          {!!q.imageUrl && (
            <Image
              source={{ uri: q.imageUrl }}
              style={[
                styles.questionImage,
                !q.questionText && { marginTop: 18 },
              ]}
              resizeMode="contain"
            />
          )}

          {q.questionType === "mcq" &&
            (q.choices ?? []).map((c, i) => {
              const selected = a.choice_id === c.choice_id;
              return (
                <TouchableOpacity
                  key={c.choice_id}
                  style={[
                    styles.choiceRow,
                    selected && styles.choiceRowSelected,
                  ]}
                  onPress={() =>
                    setAnswer(q.question_id, { choice_id: c.choice_id })
                  }
                >
                  <View
                    style={[
                      styles.letterBox,
                      selected && styles.letterBoxSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterText,
                        selected && { color: "white" },
                      ]}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <View style={styles.choiceBody}>
                    {!!c.choiceText && (
                      <Text style={styles.choiceTextInner}>{c.choiceText}</Text>
                    )}
                    {!!c.imageUrl && (
                      <Image
                        source={{ uri: c.imageUrl }}
                        style={[
                          styles.choiceImage,
                          !!c.choiceText && { marginTop: 8 },
                        ]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

          {q.questionType === "identification" && (
            <TextInput
              style={styles.textAnswer}
              placeholder="Type your answer"
              value={a.textAnswer ?? ""}
              onChangeText={(text) =>
                setAnswer(q.question_id, { textAnswer: text })
              }
              autoCorrect={false}
            />
          )}

          {q.questionType === "matching" && (
            <MatchingBoard
              key={q.question_id}
              items={q.matchItems ?? []}
              options={q.matchOptions ?? []}
              value={a.matchingAnswer ?? {}}
              onChange={(next) =>
                setAnswer(q.question_id, { matchingAnswer: next })
              }
              onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
            />
          )}

          <View style={styles.navButtons}>
            {index > 0 ? (
              <TouchableOpacity
                style={styles.prevBtn}
                onPress={() => goTo(index - 1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.prevText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                if (isLast) {
                  saveDirty().then((r) => {
                    if (r === "closed") submitNow("closed");
                  });
                  setNavigatorOpen(true);
                } else {
                  goTo(index + 1);
                }
              }}
            >
              <Text style={styles.nextText}>{isLast ? "Finish" : "Next"}</Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomCount}>
          <Text style={{ fontWeight: "700", color: COLORS.text }}>
            Q{index + 1}
          </Text>{" "}
          / {questions.length}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(answeredCount / questions.length) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.timerPill}>
          <Ionicons
            name={secondsLeft !== null ? "hourglass-outline" : "time-outline"}
            size={16}
            color={
              secondsLeft !== null && secondsLeft <= 60
                ? "#E74C3C"
                : COLORS.text
            }
          />
          <Text
            style={[
              styles.timerText,
              secondsLeft !== null && secondsLeft <= 60 && styles.timerUrgent,
            ]}
          >
            {formatTimer(secondsLeft !== null ? secondsLeft : seconds)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.navigatorBtn}
          onPress={() => setNavigatorOpen(true)}
        >
          <Ionicons name="menu" size={16} color={COLORS.text} />
          <Text style={styles.navigatorBtnText}>Navigator</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={navigatorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNavigatorOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.navSheet}>
            <View style={styles.navHeader}>
              <Text style={styles.navTitle}>Question Navigator</Text>
              <TouchableOpacity onPress={() => setNavigatorOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>

            <View style={styles.navSummary}>
              <View style={styles.navCircle}>
                <Text style={styles.navCircleText}>{answeredCount}</Text>
              </View>
              <View>
                <Text style={styles.navSummaryMain}>
                  {answeredCount} of {questions.length} answered
                </Text>
                <Text style={styles.navSummarySub}>
                  {questions.length - answeredCount} to go
                </Text>
              </View>
            </View>

            <View style={styles.navTabs}>
              {(
                [
                  ["all", `All ${questions.length}`],
                  ["marked", `Marked ${marked.size}`],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.navTab, filter === key && styles.navTabActive]}
                  onPress={() => setFilter(key)}
                >
                  <Text
                    style={[
                      styles.navTabText,
                      filter === key && styles.navTabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              style={{ maxHeight: 280 }}
              contentContainerStyle={styles.grid}
            >
              {visibleCells.length === 0 && (
                <Text style={styles.navEmpty}>No questions here.</Text>
              )}
              {visibleCells.map(({ q: x, i }) => {
                const done = isAnswered(x, answers[x.question_id]);
                return (
                  <TouchableOpacity
                    key={x.question_id}
                    style={[
                      styles.cell,
                      done && styles.cellAnswered,
                      i === index && styles.cellCurrent,
                    ]}
                    onPress={() => goTo(i)}
                  >
                    <Text style={[styles.cellText, done && { color: "white" }]}>
                      {i + 1}
                    </Text>
                    {marked.has(x.question_id) && (
                      <View style={styles.cellDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: COLORS.blue }]}
                />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: COLORS.marked }]}
                />
                <Text style={styles.legendText}>Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: COLORS.darkCell },
                  ]}
                />
                <Text style={styles.legendText}>Blank</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={confirmSubmit}
              disabled={busy}
            >
              <Ionicons name="paper-plane-outline" size={16} color="white" />
              <Text style={styles.submitText}>Submit exam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exitBtn}
              onPress={saveAndExit}
              disabled={busy}
            >
              <Text style={styles.exitText}>Save & exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: COLORS.muted },
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

  tagRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  tag: {
    backgroundColor: COLORS.tag,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#9AA1AE",
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tagLight: { backgroundColor: "#F3F4F7" },
  tagText: { fontSize: 11, fontWeight: "600", color: COLORS.text },

  questionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  questionNumber: { fontSize: 14, fontWeight: "bold", color: COLORS.primary },
  questionType: { fontSize: 11, color: COLORS.accent, marginTop: 2 },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markBtnActive: { backgroundColor: "#FEF3C7", borderColor: COLORS.marked },
  markText: { fontSize: 11, color: COLORS.text },
  questionText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 18,
    marginBottom: 14,
  },

  choiceRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
    backgroundColor: "white",
  },
  choiceRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF1FB",
  },
  letterBox: {
    width: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingVertical: 12,
  },
  letterBoxSelected: {
    backgroundColor: COLORS.primary,
    borderRightColor: COLORS.primary,
  },
  letterText: { fontWeight: "700", color: COLORS.text },
  choiceText: { flex: 1, fontSize: 13, color: COLORS.text, padding: 12 },
  choiceBody: { flex: 1, padding: 12 },
  choiceTextInner: { fontSize: 13, color: COLORS.text },
  choiceImage: { width: "100%", height: 140 },
  questionImage: {
    width: "100%",
    height: 220,
    marginBottom: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFAFA",
  },

  textAnswer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },

  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  prevText: { color: COLORS.primary, fontWeight: "600", marginLeft: 2 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  nextText: { color: "white", fontWeight: "600", marginRight: 2 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    gap: 8,
  },
  bottomCount: { fontSize: 13, color: COLORS.muted },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E8EE",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: COLORS.green },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E8EE",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  timerText: {
    fontSize: 12,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  timerUrgent: { color: "#E74C3C", fontWeight: "700" },
  navigatorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#E5E8EE",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  navigatorBtnText: { fontSize: 11, color: COLORS.text },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  navSheet: {
    backgroundColor: COLORS.dark,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  navTitle: { color: COLORS.darkText, fontSize: 15, fontWeight: "600" },
  navSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2E2E2E",
  },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: "#3A3A3A",
    justifyContent: "center",
    alignItems: "center",
  },
  navCircleText: { color: "white", fontWeight: "700" },
  navSummaryMain: { color: "white", fontWeight: "600", fontSize: 13 },
  navSummarySub: { color: "#9CA3AF", fontSize: 11, marginTop: 2 },
  navTabs: { flexDirection: "row", padding: 12, gap: 8 },
  navTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  navTabActive: {
    backgroundColor: COLORS.blue,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  navTabText: { color: "#9CA3AF", fontSize: 11 },
  navTabTextActive: { color: "white", fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  navEmpty: { color: "#9CA3AF", fontSize: 12, padding: 8 },
  cell: {
    width: 42,
    height: 36,
    borderRadius: 6,
    backgroundColor: COLORS.darkCell,
    justifyContent: "center",
    alignItems: "center",
  },
  cellAnswered: { backgroundColor: COLORS.blue },
  cellCurrent: { borderWidth: 2, borderColor: COLORS.blueLight },
  cellText: { color: "#D4D4D4", fontSize: 12, fontWeight: "600" },
  cellDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.marked,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#9CA3AF", fontSize: 11 },
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.blue,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  submitText: { color: "white", fontWeight: "600" },
  exitBtn: { alignItems: "center", paddingVertical: 14 },
  exitText: { color: "#D4D4D4", fontSize: 13 },

  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
});

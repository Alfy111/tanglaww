import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type QuestionType = "mcq" | "identification" | "matching";

interface ChoiceDraft {
  key: string;
  choiceText: string;
  isCorrect: boolean;
}
interface AnswerDraft {
  key: string;
  answerText: string;
}
interface PairDraft {
  key: string;
  leftText: string;
  rightText: string;
}
interface QuestionDraft {
  key: string;
  questionType: QuestionType;
  questionText: string;
  points: string;
  topicId: number | null;
  choices: ChoiceDraft[];
  answers: AnswerDraft[];
  pairs: PairDraft[];
}
interface Topic {
  topic_id: number;
  topicName: string;
  parent_id: number | null;
}
interface ModuleOption {
  module_id: number;
  moduleName: string;
}

const COLORS = {
  primary: "#0D2A94",
  accent: "#2F459B",
  card: "#EEF1F6",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  danger: "#E74C3C",
  success: "#1E9E5A",
  warningBg: "#FFF4E0",
  warningText: "#8A5300",
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  identification: "Identification",
  matching: "Matching Type",
};

const newKey = () => Math.random().toString(36).slice(2, 10);

const emptyQuestion = (): QuestionDraft => ({
  key: newKey(),
  questionType: "mcq",
  questionText: "",
  points: "1",
  topicId: null,
  choices: [0, 1, 2, 3].map(() => ({
    key: newKey(),
    choiceText: "",
    isCorrect: false,
  })),
  answers: [{ key: newKey(), answerText: "" }],
  pairs: [0, 1].map(() => ({ key: newKey(), leftText: "", rightText: "" })),
});

const defaultDeadline = () => {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

const isWholeNumber = (value: string, min: number) => {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min;
};

const cleanQuestion = (q: QuestionDraft): QuestionDraft => ({
  ...q,
  questionText: q.questionText.trim(),
  points: q.points.trim(),
  choices: q.choices
    .map((c) => ({ ...c, choiceText: c.choiceText.trim() }))
    .filter((c) => c.choiceText !== ""),
  answers: q.answers
    .map((a) => ({ ...a, answerText: a.answerText.trim() }))
    .filter((a) => a.answerText !== ""),
  pairs: q.pairs
    .map((p) => ({
      ...p,
      leftText: p.leftText.trim(),
      rightText: p.rightText.trim(),
    }))
    .filter((p) => p.leftText !== "" && p.rightText !== ""),
});

const hasDuplicates = (values: string[]) =>
  new Set(values.map((v) => v.toLowerCase())).size !== values.length;

const validateQuestion = (q: QuestionDraft): string | null => {
  if (!q.questionText) return "Enter the question.";
  if (!isWholeNumber(q.points, 1))
    return "Points must be a whole number of at least 1.";
  if (!q.topicId)
    return "Select a minor tag. The analytics uses it to find weak areas.";

  if (q.questionType === "mcq") {
    if (q.choices.length < 2) return "Add at least two choices.";
    if (hasDuplicates(q.choices.map((c) => c.choiceText)))
      return "Choices must be different.";
    if (q.choices.filter((c) => c.isCorrect).length !== 1)
      return "Mark exactly one correct answer.";
  }
  if (q.questionType === "identification" && q.answers.length < 1) {
    return "Add at least one accepted answer.";
  }
  if (q.questionType === "matching") {
    if (q.pairs.length < 2) return "Add at least two complete pairs.";
    if (hasDuplicates(q.pairs.map((p) => p.leftText)))
      return "Each item on the left must be different.";
    if (hasDuplicates(q.pairs.map((p) => p.rightText)))
      return "Each match on the right must be different.";
  }
  return null;
};

export default function QuizEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    courseId: string;
    courseTitle: string;
    assessmentId?: string;
    moduleId?: string;
  }>();
  const courseId = Number(params.courseId);
  const assessmentId = params.assessmentId ? Number(params.assessmentId) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [passingScore, setPassingScore] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [closeAfterDeadline, setCloseAfterDeadline] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [editing, setEditing] = useState<{
    index: number | null;
    draft: QuestionDraft;
  } | null>(null);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0),
    [questions],
  );

  const topicName = (id: number | null) =>
    topics.find((t) => t.topic_id === id)?.topicName ?? "No tag";

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [modRes, topicRes] = await Promise.all([
        supabase
          .from("module")
          .select("module_id, moduleName")
          .eq("course_id", courseId)
          .order("module_id"),
        supabase
          .from("topic")
          .select("topic_id, topicName, parent_id")
          .order("topicName"),
      ]);
      if (modRes.error) console.error("modules:", modRes.error.message);
      if (topicRes.error) console.error("topics:", topicRes.error.message);
      const moduleList = (modRes.data ?? []) as ModuleOption[];
      setModules(moduleList);
      setTopics((topicRes.data ?? []) as Topic[]);

      if (assessmentId) {
        const { data, error } = await supabase
          .from("assessment")
          .select(
            `assessment_id, title, instructions, deadline, maxAttempts, passingScore,
             showCorrectAnswers, closeAfterDeadline, isClosed, isPublished, module_id,
             timeLimitMinutes,
             assessment_question (
               question_id, questionText, questionType, points, topic_id, position,
               assessment_choice ( choice_id, choiceText, isCorrect ),
               assessment_identification_answer ( answer_id, answerText ),
               assessment_matching_pair ( pair_id, leftText, rightText )
             )`,
          )
          .eq("assessment_id", assessmentId)
          .single();

        if (error || !data) {
          Alert.alert("Error", error?.message ?? "Quiz not found.");
          router.back();
          return;
        }

        const a: any = data;
        setTitle(a.title ?? "");
        setInstructions(a.instructions ?? "");
        setModuleId(a.module_id);
        setDeadline(a.deadline ? new Date(a.deadline) : null);
        setMaxAttempts(String(a.maxAttempts ?? 1));
        setPassingScore(String(a.passingScore ?? 0));
        setTimeLimit(a.timeLimitMinutes ? String(a.timeLimitMinutes) : "");
        setShowCorrectAnswers(!!a.showCorrectAnswers);
        setCloseAfterDeadline(!!a.closeAfterDeadline);
        setIsClosed(!!a.isClosed);
        setIsPublished(!!a.isPublished);

        const loaded: QuestionDraft[] = [...(a.assessment_question ?? [])]
          .sort((x: any, y: any) => x.position - y.position)
          .map((q: any) => ({
            key: newKey(),
            questionType: q.questionType as QuestionType,
            questionText: q.questionText,
            points: String(q.points),
            topicId: q.topic_id,
            choices: [...(q.assessment_choice ?? [])]
              .sort((x: any, y: any) => x.choice_id - y.choice_id)
              .map((c: any) => ({
                key: newKey(),
                choiceText: c.choiceText,
                isCorrect: c.isCorrect,
              })),
            answers: (q.assessment_identification_answer ?? []).map(
              (ans: any) => ({
                key: newKey(),
                answerText: ans.answerText,
              }),
            ),
            pairs: (q.assessment_matching_pair ?? []).map((p: any) => ({
              key: newKey(),
              leftText: p.leftText,
              rightText: p.rightText,
            })),
          }));
        setQuestions(loaded);

        const { count } = await supabase
          .from("assessment_attempt")
          .select("attempt_id", { count: "exact", head: true })
          .eq("assessment_id", assessmentId);
        setHasAttempts((count ?? 0) > 0);
      } else if (params.moduleId) {
        setModuleId(Number(params.moduleId));
      } else if (moduleList.length === 1) {
        setModuleId(moduleList[0].module_id);
      }

      setLoading(false);
    };
    load();
  }, [assessmentId, courseId]);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const mode = picker;
    setPicker(null);
    if (event.type !== "set" || !selected) return;
    const next = new Date(deadline ?? defaultDeadline());
    if (mode === "date") {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setDeadline(next);
  };

  const saveQuestion = (q: QuestionDraft) => {
    if (!editing) return;
    setQuestions((prev) => {
      const copy = [...prev];
      if (editing.index === null) copy.push(q);
      else copy[editing.index] = q;
      return copy;
    });
    setEditing(null);
  };

  const removeQuestion = (index: number) => {
    Alert.alert("Remove question", `Remove question ${index + 1}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setQuestions((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const validateQuiz = (publish: boolean): string | null => {
    if (!title.trim()) return "Enter a quiz title.";
    if (!moduleId) return "Select a module.";
    if (!publish) return null;

    if (questions.length === 0) return "Add at least one question.";
    if (!isWholeNumber(maxAttempts, 1))
      return "Available attempts must be at least 1.";
    if (timeLimit.trim() !== "" && !isWholeNumber(timeLimit, 1)) {
      return "Time limit must be a whole number of minutes, or empty for no limit.";
    }
    if (!isWholeNumber(passingScore, 0) || Number(passingScore) > totalPoints) {
      return `Passing score must be a whole number from 0 to ${totalPoints}.`;
    }
    return null;
  };

  const saveQuiz = async (publish: boolean) => {
    const error = validateQuiz(publish);
    if (error) {
      Alert.alert("Cannot save", error);
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    if (!adminId) {
      setSaving(false);
      Alert.alert(
        "Error",
        "Your admin session was not found. Please log in again.",
      );
      return;
    }

    const payload = {
      assessment_id: assessmentId,
      title: title.trim(),
      instructions: instructions.trim() || null,
      deadline: deadline ? deadline.toISOString() : null,
      maxAttempts: isWholeNumber(maxAttempts, 1) ? Number(maxAttempts) : 1,
      passingScore: isWholeNumber(passingScore, 0) ? Number(passingScore) : 0,
      timeLimitMinutes: isWholeNumber(timeLimit, 1) ? Number(timeLimit) : null,
      showCorrectAnswers,
      closeAfterDeadline,
      isClosed,
      isPublished: publish,
      module_id: moduleId,
      admin_id: adminId,
      questions: questions.map((q) => ({
        questionType: q.questionType,
        questionText: q.questionText,
        points: Number(q.points),
        topic_id: q.topicId,
        choices:
          q.questionType === "mcq"
            ? q.choices.map((c) => ({
                choiceText: c.choiceText,
                isCorrect: c.isCorrect,
              }))
            : [],
        answers:
          q.questionType === "identification"
            ? q.answers.map((a) => a.answerText)
            : [],
        pairs:
          q.questionType === "matching"
            ? q.pairs.map((p) => ({
                leftText: p.leftText,
                rightText: p.rightText,
              }))
            : [],
      })),
    };

    const { error: rpcError } = await supabase.rpc("save_assessment", {
      p: payload,
    });
    setSaving(false);

    if (rpcError) {
      Alert.alert("Error", rpcError.message);
      return;
    }
    Alert.alert(publish ? "Quiz saved and published" : "Draft saved");
    router.back();
  };

  const deleteQuiz = async () => {
    if (!assessmentId) return;
    const { data: takers } = await supabase.rpc("get_assessment_taker_count", {
      p_id: assessmentId,
    });
    const warning =
      takers > 0
        ? `${takers} ${takers === 1 ? "student has" : "students have"} already taken "${title}". Deleting it also deletes their scores and answers, and removes them from the analytics.\n\nThis cannot be undone.`
        : `Delete "${title}"? This cannot be undone.`;
    Alert.alert("Delete quiz", warning, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.rpc("delete_assessment", {
            p_id: assessmentId,
          });
          if (error) Alert.alert("Error", error.message);
          else router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {assessmentId ? title || "Edit Quiz" : "New Quiz"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Title:</Text>
          <TextInput
            style={styles.input}
            placeholder="Title of quiz"
            placeholderTextColor="#9AA0A6"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Instructions:</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Instructions for students"
            placeholderTextColor="#9AA0A6"
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />

          <Text style={styles.label}>Module:</Text>
          {modules.length === 0 ? (
            <Text style={styles.hint}>
              This course has no modules yet. Add a module first.
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {modules.map((m) => (
                <TouchableOpacity
                  key={m.module_id}
                  style={[
                    styles.chip,
                    moduleId === m.module_id && styles.chipActive,
                  ]}
                  onPress={() => setModuleId(m.module_id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      moduleId === m.module_id && styles.chipTextActive,
                    ]}
                  >
                    {m.moduleName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Deadline:</Text>
          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setPicker("date")}
          >
            <Text style={deadline ? styles.pickerText : styles.placeholder}>
              {deadline ? formatDate(deadline) : "MM / DD / YYYY"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <Text style={styles.label}>Time:</Text>
          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setPicker("time")}
          >
            <Text style={deadline ? styles.pickerText : styles.placeholder}>
              {deadline ? formatTime(deadline) : "HH : MM"}
            </Text>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          {deadline && (
            <TouchableOpacity onPress={() => setDeadline(null)}>
              <Text style={styles.linkText}>Remove deadline</Text>
            </TouchableOpacity>
          )}

          {picker && (
            <DateTimePicker
              value={deadline ?? defaultDeadline()}
              mode={picker}
              onChange={onPickerChange}
            />
          )}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Available attempts:</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={maxAttempts}
                onChangeText={setMaxAttempts}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Passing score:</Text>
              <TextInput
                style={styles.input}
                placeholder={`0 - ${totalPoints}`}
                placeholderTextColor="#9AA0A6"
                value={passingScore}
                onChangeText={setPassingScore}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={styles.hint}>Max score: {totalPoints} points</Text>

          <Text style={styles.label}>Time limit (minutes):</Text>
          <TextInput
            style={styles.input}
            placeholder="Leave empty for no time limit"
            placeholderTextColor="#9AA0A6"
            value={timeLimit}
            onChangeText={setTimeLimit}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            The countdown starts when a student begins an attempt and keeps
            running if they leave.
          </Text>

          <View style={styles.settingsCard}>
            <SettingRow
              title="Show correct answers"
              description="Students see the correct answers after they submit."
              value={showCorrectAnswers}
              onChange={setShowCorrectAnswers}
            />
            <SettingRow
              title="Close after deadline"
              description="No new attempts after the deadline. Students who took it can still review it."
              value={closeAfterDeadline}
              onChange={setCloseAfterDeadline}
            />
            <SettingRow
              title="Close quiz now"
              description="Stops all new attempts right away, even before the deadline."
              value={isClosed}
              onChange={setIsClosed}
              last
            />
          </View>

          <View style={styles.divider} />

          {hasAttempts && (
            <View style={styles.lockBanner}>
              <Ionicons
                name="lock-closed"
                size={16}
                color={COLORS.warningText}
              />
              <Text style={styles.lockText}>
                Students have already taken this quiz, so the questions are
                locked to keep their results accurate. You can still change the
                settings above.
              </Text>
            </View>
          )}

          <View style={styles.questionHeader}>
            <Text style={styles.sectionTitle}>
              Questions ({questions.length})
            </Text>
            {!hasAttempts && (
              <TouchableOpacity
                style={styles.addQuestionBtn}
                onPress={() =>
                  setEditing({ index: null, draft: emptyQuestion() })
                }
              >
                <Text style={styles.addQuestionText}>Add question</Text>
                <Ionicons name="add" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>

          {questions.length === 0 && (
            <Text style={styles.hint}>
              No questions yet. Tap "Add question" to start.
            </Text>
          )}

          {questions.map((q, index) => (
            <TouchableOpacity
              key={q.key}
              style={styles.questionCard}
              disabled={hasAttempts}
              onPress={() => setEditing({ index, draft: { ...q } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.questionCardTitle}>
                  Q{index + 1} · {TYPE_LABELS[q.questionType]} · {q.points}{" "}
                  {q.points === "1" ? "pt" : "pts"}
                </Text>
                <Text style={styles.questionCardText} numberOfLines={2}>
                  {q.questionText}
                </Text>
                <Text style={styles.questionCardTag}>
                  {topicName(q.topicId)}
                </Text>
              </View>
              {!hasAttempts && (
                <View style={styles.questionActions}>
                  <TouchableOpacity onPress={() => moveQuestion(index, -1)}>
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? "#C8CCD4" : COLORS.accent}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveQuestion(index, 1)}>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        index === questions.length - 1
                          ? "#C8CCD4"
                          : COLORS.accent
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeQuestion(index)}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={COLORS.danger}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            disabled={saving}
            onPress={() => saveQuiz(true)}
          >
            {saving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isPublished ? "Save Changes" : "Publish Quiz"}
              </Text>
            )}
          </TouchableOpacity>

          {!hasAttempts && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={saving}
              onPress={() => saveQuiz(false)}
            >
              <Text style={styles.secondaryBtnText}>
                {isPublished ? "Unpublish (move to draft)" : "Save as Draft"}
              </Text>
            </TouchableOpacity>
          )}

          {assessmentId && (
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteQuiz}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              <Text style={styles.deleteBtnText}>Delete Quiz</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {editing && (
        <QuestionEditorModal
          key={editing.draft.key}
          initial={editing.draft}
          isNew={editing.index === null}
          topics={topics}
          onCancel={() => setEditing(null)}
          onSave={saveQuestion}
        />
      )}
    </SafeAreaView>
  );
}

function SettingRow(props: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !props.last && styles.settingRowBorder]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.settingTitle}>{props.title}</Text>
        <Text style={styles.settingDesc}>{props.description}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: COLORS.accent, false: "#D0D4DC" }}
        thumbColor="white"
      />
    </View>
  );
}

function QuestionEditorModal(props: {
  initial: QuestionDraft;
  isNew: boolean;
  topics: Topic[];
  onCancel: () => void;
  onSave: (q: QuestionDraft) => void;
}) {
  const { topics } = props;
  const [draft, setDraft] = useState<QuestionDraft>(props.initial);

  const majors = topics.filter((t) => t.parent_id === null);
  const initialMajor =
    topics.find((t) => t.topic_id === props.initial.topicId)?.parent_id ?? null;
  const [majorId, setMajorId] = useState<number | null>(initialMajor);
  const minors = topics.filter(
    (t) => majorId !== null && t.parent_id === majorId,
  );

  const update = (changes: Partial<QuestionDraft>) =>
    setDraft((d) => ({ ...d, ...changes }));

  const setChoiceText = (key: string, text: string) =>
    update({
      choices: draft.choices.map((c) =>
        c.key === key ? { ...c, choiceText: text } : c,
      ),
    });
  const markCorrect = (key: string) =>
    update({
      choices: draft.choices.map((c) => ({ ...c, isCorrect: c.key === key })),
    });
  const addChoice = () =>
    update({
      choices: [
        ...draft.choices,
        { key: newKey(), choiceText: "", isCorrect: false },
      ],
    });
  const removeChoice = (key: string) =>
    update({ choices: draft.choices.filter((c) => c.key !== key) });

  const setAnswerText = (key: string, text: string) =>
    update({
      answers: draft.answers.map((a) =>
        a.key === key ? { ...a, answerText: text } : a,
      ),
    });
  const addAnswer = () =>
    update({ answers: [...draft.answers, { key: newKey(), answerText: "" }] });
  const removeAnswer = (key: string) =>
    update({ answers: draft.answers.filter((a) => a.key !== key) });

  const setPairText = (
    key: string,
    side: "leftText" | "rightText",
    text: string,
  ) =>
    update({
      pairs: draft.pairs.map((p) =>
        p.key === key ? { ...p, [side]: text } : p,
      ),
    });
  const addPair = () =>
    update({
      pairs: [...draft.pairs, { key: newKey(), leftText: "", rightText: "" }],
    });
  const removePair = (key: string) =>
    update({ pairs: draft.pairs.filter((p) => p.key !== key) });

  const handleSave = () => {
    const cleaned = cleanQuestion(draft);
    const error = validateQuestion(cleaned);
    if (error) {
      Alert.alert("Check the question", error);
      return;
    }
    props.onSave(cleaned);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={props.onCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={props.onCancel}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {props.isNew ? "Add Question" : "Edit Question"}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Question type:</Text>
            <View style={styles.segment}>
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.segmentItem,
                    draft.questionType === t && styles.segmentActive,
                  ]}
                  onPress={() => update({ questionType: t })}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draft.questionType === t && styles.segmentTextActive,
                    ]}
                  >
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Major tag:</Text>
            {majors.length === 0 ? (
              <Text style={styles.hint}>
                No topics yet. Add major and minor topics to the topic table
                first.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {majors.map((m) => (
                  <TouchableOpacity
                    key={m.topic_id}
                    style={[
                      styles.chip,
                      majorId === m.topic_id && styles.chipActive,
                    ]}
                    onPress={() => {
                      if (majorId === m.topic_id) return;
                      setMajorId(m.topic_id);
                      update({ topicId: null });
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        majorId === m.topic_id && styles.chipTextActive,
                      ]}
                    >
                      {m.topicName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {majorId !== null && (
              <>
                <Text style={styles.label}>Minor tag:</Text>
                {minors.length === 0 ? (
                  <Text style={styles.hint}>
                    This major tag has no minor tags yet.
                  </Text>
                ) : (
                  <View style={styles.chipWrap}>
                    {minors.map((m) => (
                      <TouchableOpacity
                        key={m.topic_id}
                        style={[
                          styles.chip,
                          draft.topicId === m.topic_id && styles.chipActive,
                        ]}
                        onPress={() => update({ topicId: m.topic_id })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            draft.topicId === m.topic_id &&
                              styles.chipTextActive,
                          ]}
                        >
                          {m.topicName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Question:</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Type the question"
              value={draft.questionText}
              onChangeText={(text) => update({ questionText: text })}
              multiline
            />

            <Text style={styles.label}>Points:</Text>
            <TextInput
              style={[styles.input, { width: 100 }]}
              value={draft.points}
              onChangeText={(text) => update({ points: text })}
              keyboardType="number-pad"
            />

            {draft.questionType === "mcq" && (
              <>
                <Text style={styles.label}>Choices:</Text>
                <Text style={styles.hint}>
                  Tap a letter to mark the correct answer.
                </Text>
                {draft.choices.map((c, i) => (
                  <View key={c.key} style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[
                        styles.letterBox,
                        c.isCorrect && styles.letterBoxCorrect,
                      ]}
                      onPress={() => markCorrect(c.key)}
                    >
                      {c.isCorrect ? (
                        <Ionicons name="checkmark" size={18} color="white" />
                      ) : (
                        <Text style={styles.letterText}>
                          {String.fromCharCode(65 + i)}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TextInput
                      style={styles.choiceInput}
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      value={c.choiceText}
                      onChangeText={(text) => setChoiceText(c.key, text)}
                    />
                    {draft.choices.length > 2 && (
                      <TouchableOpacity
                        onPress={() => removeChoice(c.key)}
                        style={styles.rowIcon}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {draft.choices.length < 6 && (
                  <TouchableOpacity onPress={addChoice}>
                    <Text style={styles.linkText}>+ Add choice</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {draft.questionType === "identification" && (
              <>
                <Text style={styles.label}>Accepted answers:</Text>
                <Text style={styles.hint}>
                  Checking ignores capitalization and extra spaces. Add other
                  accepted spellings as separate answers.
                </Text>
                {draft.answers.map((a, i) => (
                  <View key={a.key} style={styles.choiceRow}>
                    <TextInput
                      style={styles.choiceInput}
                      placeholder={`Answer ${i + 1}`}
                      value={a.answerText}
                      onChangeText={(text) => setAnswerText(a.key, text)}
                    />
                    {draft.answers.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeAnswer(a.key)}
                        style={styles.rowIcon}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={addAnswer}>
                  <Text style={styles.linkText}>+ Add accepted answer</Text>
                </TouchableOpacity>
              </>
            )}

            {draft.questionType === "matching" && (
              <>
                <Text style={styles.label}>Pairs:</Text>
                <Text style={styles.hint}>
                  Students will see the right-side matches in shuffled order.
                  Points are split evenly across the pairs.
                </Text>
                {draft.pairs.map((p, i) => (
                  <View key={p.key} style={styles.pairRow}>
                    <Text style={styles.pairNumber}>{i + 1}</Text>
                    <TextInput
                      style={[styles.choiceInput, { flex: 1 }]}
                      placeholder="Item"
                      value={p.leftText}
                      onChangeText={(text) =>
                        setPairText(p.key, "leftText", text)
                      }
                    />
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={COLORS.muted}
                      style={{ marginHorizontal: 6 }}
                    />
                    <TextInput
                      style={[styles.choiceInput, { flex: 1 }]}
                      placeholder="Match"
                      value={p.rightText}
                      onChangeText={(text) =>
                        setPairText(p.key, "rightText", text)
                      }
                    />
                    {draft.pairs.length > 2 && (
                      <TouchableOpacity
                        onPress={() => removePair(p.key)}
                        style={styles.rowIcon}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={COLORS.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={addPair}>
                  <Text style={styles.linkText}>+ Add pair</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Save Question</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  scroll: { padding: 20, paddingBottom: 60 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  hint: { fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },

  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { fontSize: 14, color: COLORS.text },
  placeholder: { fontSize: 14, color: "#9AA1AE" },
  linkText: {
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: 13,
    marginTop: 8,
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "white",
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text },
  chipTextActive: { color: "white", fontWeight: "600" },

  settingsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: "#DDE2EA" },
  settingTitle: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  settingDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  divider: { height: 1, backgroundColor: "#E5E8EE", marginVertical: 20 },
  lockBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.warningBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  lockText: { flex: 1, fontSize: 12, color: COLORS.warningText },

  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.primary },
  addQuestionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  addQuestionText: { fontSize: 14, color: COLORS.text },

  questionCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  questionCardTitle: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  questionCardText: { fontSize: 13, color: COLORS.text, marginTop: 4 },
  questionCardTag: { fontSize: 11, color: COLORS.muted, marginTop: 6 },
  questionActions: {
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 10,
  },

  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 12, color: COLORS.text },
  segmentTextActive: { color: "white", fontWeight: "600" },

  choiceRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  letterBox: {
    width: 42,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F9",
  },
  letterBoxCorrect: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  letterText: { fontWeight: "700", color: COLORS.text },
  choiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.text,
  },
  rowIcon: { marginLeft: 8 },
  pairRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  pairNumber: { width: 20, fontWeight: "700", color: COLORS.muted },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  primaryBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtnText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },
  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  deleteBtnText: { color: COLORS.danger, fontWeight: "600", fontSize: 13 },
});

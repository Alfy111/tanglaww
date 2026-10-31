import {
    ArrowRight,
    Check,
    ChevronDown,
    ChevronUp,
    Lock,
    Plus,
    Trash2,
    X,
    XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";

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

const TYPE_LABELS = {
  mcq: "Multiple Choice",
  identification: "Identification",
  matching: "Matching Type",
};

const newKey = () => Math.random().toString(36).slice(2, 10);

const emptyQuestion = () => ({
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

const isWholeNumber = (value, min) => {
  const n = Number(value);
  return String(value).trim() !== "" && Number.isInteger(n) && n >= min;
};

const pad = (n) => String(n).padStart(2, "0");
const toDateInput = (d) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "";
const toTimeInput = (d) =>
  d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "";

const cleanQuestion = (q) => ({
  ...q,
  questionText: q.questionText.trim(),
  points: String(q.points).trim(),
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

const hasDuplicates = (values) =>
  new Set(values.map((v) => v.toLowerCase())).size !== values.length;

const validateQuestion = (q) => {
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
  if (q.questionType === "identification" && q.answers.length < 1)
    return "Add at least one accepted answer.";
  if (q.questionType === "matching") {
    if (q.pairs.length < 2) return "Add at least two complete pairs.";
    if (hasDuplicates(q.pairs.map((p) => p.leftText)))
      return "Each item on the left must be different.";
    if (hasDuplicates(q.pairs.map((p) => p.rightText)))
      return "Each match on the right must be different.";
  }
  return null;
};

const s = {
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: COLORS.text,
    margin: "14px 0 6px",
  },
  hint: { fontSize: "12px", color: COLORS.muted, margin: "0 0 8px" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "8px",
    padding: "11px 12px",
    fontSize: "14px",
    color: COLORS.text,
    fontFamily: "Poppins, sans-serif",
    outline: "none",
    backgroundColor: "#fff",
  },
  link: {
    border: 0,
    background: "none",
    padding: 0,
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: "13px",
    marginTop: "8px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  chip: (active) => ({
    border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
    backgroundColor: active ? COLORS.primary : "#fff",
    color: active ? "#fff" : COLORS.text,
    fontWeight: active ? "600" : "400",
    borderRadius: "16px",
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  primaryBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    color: "#fff",
    border: 0,
    padding: "14px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "15px",
    marginTop: "24px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#fff",
    color: COLORS.primary,
    border: `1px solid ${COLORS.primary}`,
    padding: "13px",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    marginTop: "10px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  iconBtn: {
    border: 0,
    background: "none",
    padding: "2px",
    cursor: "pointer",
    display: "flex",
  },
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        border: 0,
        padding: "2px",
        backgroundColor: checked ? COLORS.accent : "#D0D4DC",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background-color 0.15s",
      }}
    >
      <span
        style={{
          display: "block",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "#fff",
          transform: checked ? "translateX(20px)" : "none",
          transition: "transform 0.15s",
        }}
      />
    </button>
  );
}

function SettingRow({ title, description, value, onChange, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 0",
        borderBottom: last ? "none" : "1px solid #DDE2EA",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{ fontSize: "14px", fontWeight: "600", color: COLORS.primary }}
        >
          {title}
        </div>
        <div
          style={{ fontSize: "12px", color: COLORS.muted, marginTop: "2px" }}
        >
          {description}
        </div>
      </div>
      <Toggle checked={value} onChange={onChange} />
    </div>
  );
}

function QuestionEditorModal({ initial, isNew, topics, onCancel, onSave }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");

  const majors = topics.filter((t) => t.parent_id === null);
  const [majorId, setMajorId] = useState(
    topics.find((t) => t.topic_id === initial.topicId)?.parent_id ?? null,
  );
  const minors = topics.filter(
    (t) => majorId !== null && t.parent_id === majorId,
  );

  const update = (changes) => {
    setDraft((d) => ({ ...d, ...changes }));
    setError("");
  };

  const handleSave = () => {
    const cleaned = cleanQuestion(draft);
    const problem = validateQuestion(cleaned);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(cleaned);
  };

  const removeIcon = <XCircle size={22} color={COLORS.danger} />;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px 16px",
        overflowY: "auto",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          backgroundColor: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.primary,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px 20px",
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            style={{ ...s.iconBtn, color: "#fff" }}
          >
            <X size={22} />
          </button>
          <span style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>
            {isNew ? "Add Question" : "Edit Question"}
          </span>
        </div>

        <div style={{ padding: "8px 24px 24px" }}>
          <label style={s.label}>Question type:</label>
          <div
            style={{
              display: "flex",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {Object.keys(TYPE_LABELS).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update({ questionType: t })}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: 0,
                  backgroundColor:
                    draft.questionType === t ? COLORS.primary : "#fff",
                  color: draft.questionType === t ? "#fff" : COLORS.text,
                  fontWeight: draft.questionType === t ? "600" : "400",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <label style={s.label}>Major tag:</label>
          {majors.length === 0 ? (
            <p style={s.hint}>
              No topics yet. Add major and minor topics to the topic table
              first.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {majors.map((m) => (
                <button
                  key={m.topic_id}
                  type="button"
                  style={s.chip(majorId === m.topic_id)}
                  onClick={() => {
                    if (majorId === m.topic_id) return;
                    setMajorId(m.topic_id);
                    update({ topicId: null });
                  }}
                >
                  {m.topicName}
                </button>
              ))}
            </div>
          )}

          {majorId !== null && (
            <>
              <label style={s.label}>Minor tag:</label>
              {minors.length === 0 ? (
                <p style={s.hint}>This major tag has no minor tags yet.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {minors.map((m) => (
                    <button
                      key={m.topic_id}
                      type="button"
                      style={s.chip(draft.topicId === m.topic_id)}
                      onClick={() => update({ topicId: m.topic_id })}
                    >
                      {m.topicName}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <label style={s.label}>Question:</label>
          <textarea
            style={{ ...s.input, minHeight: "80px", resize: "vertical" }}
            placeholder="Type the question"
            value={draft.questionText}
            onChange={(e) => update({ questionText: e.target.value })}
          />

          <label style={s.label}>Points:</label>
          <input
            style={{ ...s.input, width: "100px" }}
            inputMode="numeric"
            value={draft.points}
            onChange={(e) =>
              update({ points: e.target.value.replace(/\D/g, "") })
            }
          />

          {draft.questionType === "mcq" && (
            <>
              <label style={s.label}>Choices:</label>
              <p style={s.hint}>Click a letter to mark the correct answer.</p>
              {draft.choices.map((c, i) => (
                <div
                  key={c.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Mark choice ${String.fromCharCode(65 + i)} as correct`}
                    onClick={() =>
                      update({
                        choices: draft.choices.map((x) => ({
                          ...x,
                          isCorrect: x.key === c.key,
                        })),
                      })
                    }
                    style={{
                      width: "42px",
                      height: "44px",
                      flexShrink: 0,
                      borderRadius: "8px",
                      border: `1px solid ${c.isCorrect ? COLORS.success : COLORS.border}`,
                      backgroundColor: c.isCorrect ? COLORS.success : "#F5F6F9",
                      color: c.isCorrect ? "#fff" : COLORS.text,
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.isCorrect ? (
                      <Check size={18} />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </button>
                  <input
                    style={s.input}
                    placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                    value={c.choiceText}
                    onChange={(e) =>
                      update({
                        choices: draft.choices.map((x) =>
                          x.key === c.key
                            ? { ...x, choiceText: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                  {draft.choices.length > 2 && (
                    <button
                      type="button"
                      aria-label="Remove choice"
                      style={s.iconBtn}
                      onClick={() =>
                        update({
                          choices: draft.choices.filter((x) => x.key !== c.key),
                        })
                      }
                    >
                      {removeIcon}
                    </button>
                  )}
                </div>
              ))}
              {draft.choices.length < 6 && (
                <button
                  type="button"
                  style={s.link}
                  onClick={() =>
                    update({
                      choices: [
                        ...draft.choices,
                        { key: newKey(), choiceText: "", isCorrect: false },
                      ],
                    })
                  }
                >
                  + Add choice
                </button>
              )}
            </>
          )}

          {draft.questionType === "identification" && (
            <>
              <label style={s.label}>Accepted answers:</label>
              <p style={s.hint}>
                Checking ignores capitalization and extra spaces. Add other
                accepted spellings as separate answers.
              </p>
              {draft.answers.map((a, i) => (
                <div
                  key={a.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <input
                    style={s.input}
                    placeholder={`Answer ${i + 1}`}
                    value={a.answerText}
                    onChange={(e) =>
                      update({
                        answers: draft.answers.map((x) =>
                          x.key === a.key
                            ? { ...x, answerText: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                  {draft.answers.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove answer"
                      style={s.iconBtn}
                      onClick={() =>
                        update({
                          answers: draft.answers.filter((x) => x.key !== a.key),
                        })
                      }
                    >
                      {removeIcon}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                style={s.link}
                onClick={() =>
                  update({
                    answers: [
                      ...draft.answers,
                      { key: newKey(), answerText: "" },
                    ],
                  })
                }
              >
                + Add accepted answer
              </button>
            </>
          )}

          {draft.questionType === "matching" && (
            <>
              <label style={s.label}>Pairs:</label>
              <p style={s.hint}>
                Students will see the right-side matches in shuffled order.
                Points are split evenly across the pairs.
              </p>
              {draft.pairs.map((p, i) => (
                <div
                  key={p.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      fontWeight: "700",
                      color: COLORS.muted,
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    style={s.input}
                    placeholder="Item"
                    value={p.leftText}
                    onChange={(e) =>
                      update({
                        pairs: draft.pairs.map((x) =>
                          x.key === p.key
                            ? { ...x, leftText: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                  <ArrowRight
                    size={16}
                    color={COLORS.muted}
                    style={{ flexShrink: 0 }}
                  />
                  <input
                    style={s.input}
                    placeholder="Match"
                    value={p.rightText}
                    onChange={(e) =>
                      update({
                        pairs: draft.pairs.map((x) =>
                          x.key === p.key
                            ? { ...x, rightText: e.target.value }
                            : x,
                        ),
                      })
                    }
                  />
                  {draft.pairs.length > 2 && (
                    <button
                      type="button"
                      aria-label="Remove pair"
                      style={s.iconBtn}
                      onClick={() =>
                        update({
                          pairs: draft.pairs.filter((x) => x.key !== p.key),
                        })
                      }
                    >
                      {removeIcon}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                style={s.link}
                onClick={() =>
                  update({
                    pairs: [
                      ...draft.pairs,
                      { key: newKey(), leftText: "", rightText: "" },
                    ],
                  })
                }
              >
                + Add pair
              </button>
            </>
          )}

          {error && (
            <p
              role="alert"
              style={{
                color: COLORS.danger,
                fontSize: "13px",
                margin: "16px 0 0",
              }}
            >
              {error}
            </p>
          )}

          <button type="button" style={s.primaryBtn} onClick={handleSave}>
            Save Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminQuizEditor() {
  const navigate = useNavigate();
  const { courseId: courseIdParam, assessmentId: assessmentParam } =
    useParams();
  const [searchParams] = useSearchParams();
  const courseId = Number(courseIdParam);
  const assessmentId =
    assessmentParam && assessmentParam !== "new"
      ? Number(assessmentParam)
      : null;
  const isDiagnostic = searchParams.get("diagnostic") === "1";
  const presetModuleId = searchParams.get("moduleId");
  const listPath = `/admin/courses/${courseId}/quiz${isDiagnostic ? "?diagnostic=1" : ""}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [moduleId, setModuleId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [passingScore, setPassingScore] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [closeAfterDeadline, setCloseAfterDeadline] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [hasAttempts, setHasAttempts] = useState(false);
  const [editing, setEditing] = useState(null);

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0),
    [questions],
  );
  const topicName = (id) =>
    topics.find((t) => t.topic_id === id)?.topicName ?? "No tag";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [modRes, topicRes] = await Promise.all([
        supabase
          .from("module")
          .select("module_id, moduleName")
          .eq("course_id", courseId)
          .eq("is_diagnostic", isDiagnostic)
          .order("module_id"),
        supabase
          .from("topic")
          .select("topic_id, topicName, parent_id")
          .order("topicName"),
      ]);
      const moduleList = modRes.data ?? [];
      setModules(moduleList);
      setTopics(topicRes.data ?? []);

      if (assessmentId) {
        const { data: a, error: loadError } = await supabase
          .from("assessment")
          .select(
            `assessment_id, title, instructions, deadline, maxAttempts, passingScore,
             showCorrectAnswers, closeAfterDeadline, isClosed, isPublished, module_id, timeLimitMinutes,
             assessment_question (
               question_id, questionText, questionType, points, topic_id, position,
               assessment_choice ( choice_id, choiceText, isCorrect ),
               assessment_identification_answer ( answer_id, answerText ),
               assessment_matching_pair ( pair_id, leftText, rightText )
             )`,
          )
          .eq("assessment_id", assessmentId)
          .single();

        if (loadError || !a) {
          window.alert(loadError?.message ?? "Quiz not found.");
          navigate(listPath);
          return;
        }

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
        setQuestions(
          [...(a.assessment_question ?? [])]
            .sort((x, y) => x.position - y.position)
            .map((q) => ({
              key: newKey(),
              questionType: q.questionType,
              questionText: q.questionText,
              points: String(q.points),
              topicId: q.topic_id,
              choices: [...(q.assessment_choice ?? [])]
                .sort((x, y) => x.choice_id - y.choice_id)
                .map((c) => ({
                  key: newKey(),
                  choiceText: c.choiceText,
                  isCorrect: c.isCorrect,
                })),
              answers: (q.assessment_identification_answer ?? []).map(
                (ans) => ({ key: newKey(), answerText: ans.answerText }),
              ),
              pairs: (q.assessment_matching_pair ?? []).map((p) => ({
                key: newKey(),
                leftText: p.leftText,
                rightText: p.rightText,
              })),
            })),
        );

        const { count } = await supabase
          .from("assessment_attempt")
          .select("attempt_id", { count: "exact", head: true })
          .eq("assessment_id", assessmentId);
        setHasAttempts((count ?? 0) > 0);
      } else if (presetModuleId) {
        setModuleId(Number(presetModuleId));
      } else if (moduleList.length === 1) {
        setModuleId(moduleList[0].module_id);
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, courseId]);

  const setDeadlinePart = (part, value) => {
    if (!value) return;
    const next = deadline
      ? new Date(deadline)
      : (() => {
          const d = new Date();
          d.setHours(23, 59, 0, 0);
          return d;
        })();
    if (part === "date") {
      const [y, m, d] = value.split("-").map(Number);
      next.setFullYear(y, m - 1, d);
    } else {
      const [h, min] = value.split(":").map(Number);
      next.setHours(h, min, 0, 0);
    }
    setDeadline(next);
  };

  const saveQuestion = (q) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (editing.index === null) copy.push(q);
      else copy[editing.index] = q;
      return copy;
    });
    setEditing(null);
  };

  const removeQuestion = (index) => {
    if (!window.confirm(`Remove question ${index + 1}?`)) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const validateQuiz = (publish) => {
    if (!title.trim()) return "Enter a quiz title.";
    if (!moduleId) return "Select a module.";
    if (!publish) return null;
    if (questions.length === 0) return "Add at least one question.";
    if (!isWholeNumber(maxAttempts, 1))
      return "Available attempts must be at least 1.";
    if (timeLimit.trim() !== "" && !isWholeNumber(timeLimit, 1))
      return "Time limit must be a whole number of minutes, or empty for no limit.";
    if (!isWholeNumber(passingScore, 0) || Number(passingScore) > totalPoints)
      return `Passing score must be a whole number from 0 to ${totalPoints}.`;
    return null;
  };

  const saveQuiz = async (publish) => {
    const problem = validateQuiz(publish);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    if (!adminId) {
      setSaving(false);
      setError("Your admin session was not found. Please sign in again.");
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
      setError(rpcError.message);
      return;
    }
    window.alert(publish ? "Quiz saved and published" : "Draft saved");
    navigate(listPath);
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
    if (!window.confirm(warning)) return;
    const { error: deleteError } = await supabase.rpc("delete_assessment", {
      p_id: assessmentId,
    });
    if (deleteError) setError(deleteError.message);
    else navigate(listPath);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
        backgroundColor: "#f5f6fa",
      }}
    >
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar title={assessmentId ? title || "Edit Quiz" : "New Quiz"} />

        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1280px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(listPath)}
            style={{
              border: 0,
              background: "none",
              padding: 0,
              color: COLORS.primary,
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: "12px",
            }}
          >
            ← Back to Quizzes
          </button>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid #eee",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              padding: "8px 28px 28px",
            }}
          >
            {loading ? (
              <p
                style={{
                  color: "#aaa",
                  textAlign: "center",
                  padding: "40px 0",
                }}
              >
                Loading quiz...
              </p>
            ) : (
              <>
                <label style={s.label}>Title:</label>
                <input
                  style={s.input}
                  placeholder="Title of quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <label style={s.label}>Instructions:</label>
                <textarea
                  style={{ ...s.input, minHeight: "80px", resize: "vertical" }}
                  placeholder="Instructions for students"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />

                <label style={s.label}>Module:</label>
                {modules.length === 0 ? (
                  <p style={s.hint}>
                    This course has no modules yet. Add a module first.
                  </p>
                ) : (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {modules.map((m) => (
                      <button
                        key={m.module_id}
                        type="button"
                        style={s.chip(moduleId === m.module_id)}
                        onClick={() => setModuleId(m.module_id)}
                      >
                        {m.moduleName}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Deadline:</label>
                    <input
                      type="date"
                      style={s.input}
                      value={toDateInput(deadline)}
                      onChange={(e) => setDeadlinePart("date", e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Time:</label>
                    <input
                      type="time"
                      style={s.input}
                      value={toTimeInput(deadline)}
                      onChange={(e) => setDeadlinePart("time", e.target.value)}
                    />
                  </div>
                </div>
                {deadline && (
                  <button
                    type="button"
                    style={s.link}
                    onClick={() => setDeadline(null)}
                  >
                    Remove deadline
                  </button>
                )}

                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Available attempts:</label>
                    <input
                      style={s.input}
                      inputMode="numeric"
                      placeholder="1"
                      value={maxAttempts}
                      onChange={(e) =>
                        setMaxAttempts(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Passing score:</label>
                    <input
                      style={s.input}
                      inputMode="numeric"
                      placeholder={`0 - ${totalPoints}`}
                      value={passingScore}
                      onChange={(e) =>
                        setPassingScore(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                </div>
                <p style={{ ...s.hint, marginTop: "6px" }}>
                  Max score: {totalPoints} points
                </p>

                <label style={s.label}>Time limit (minutes):</label>
                <input
                  style={s.input}
                  inputMode="numeric"
                  placeholder="Leave empty for no time limit"
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(e.target.value.replace(/\D/g, ""))
                  }
                />
                <p style={{ ...s.hint, marginTop: "6px" }}>
                  The countdown starts when a student begins an attempt and
                  keeps running if they leave.
                </p>

                <div
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: "10px",
                    padding: "0 16px",
                    marginTop: "20px",
                  }}
                >
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
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor: "#E5E8EE",
                    margin: "20px 0",
                  }}
                />

                {hasAttempts && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      backgroundColor: COLORS.warningBg,
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <Lock
                      size={16}
                      color={COLORS.warningText}
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{ fontSize: "12px", color: COLORS.warningText }}
                    >
                      Students have already taken this quiz, so the questions
                      are locked to keep their results accurate. You can still
                      change the settings above.
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: COLORS.primary,
                    }}
                  >
                    Questions ({questions.length})
                  </span>
                  {!hasAttempts && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({ index: null, draft: emptyQuestion() })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: 0,
                        background: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: COLORS.text,
                        fontFamily: "inherit",
                      }}
                    >
                      Add question <Plus size={20} />
                    </button>
                  )}
                </div>

                {questions.length === 0 && (
                  <p style={s.hint}>
                    No questions yet. Click "Add question" to start.
                  </p>
                )}

                {questions.map((q, index) => (
                  <div
                    key={q.key}
                    style={{
                      display: "flex",
                      backgroundColor: COLORS.card,
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "10px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={hasAttempts}
                      onClick={() => setEditing({ index, draft: { ...q } })}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        border: 0,
                        background: "none",
                        padding: 0,
                        cursor: hasAttempts ? "default" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: COLORS.primary,
                        }}
                      >
                        Q{index + 1} · {TYPE_LABELS[q.questionType]} ·{" "}
                        {q.points} {q.points === "1" ? "pt" : "pts"}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: COLORS.text,
                          marginTop: "4px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {q.questionText}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: COLORS.muted,
                          marginTop: "6px",
                        }}
                      >
                        {topicName(q.topicId)}
                      </div>
                    </button>
                    {!hasAttempts && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginLeft: "10px",
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Move up"
                          style={s.iconBtn}
                          onClick={() => moveQuestion(index, -1)}
                        >
                          <ChevronUp
                            size={20}
                            color={index === 0 ? "#C8CCD4" : COLORS.accent}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          style={s.iconBtn}
                          onClick={() => moveQuestion(index, 1)}
                        >
                          <ChevronDown
                            size={20}
                            color={
                              index === questions.length - 1
                                ? "#C8CCD4"
                                : COLORS.accent
                            }
                          />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          style={s.iconBtn}
                          onClick={() => removeQuestion(index)}
                        >
                          <Trash2 size={18} color={COLORS.danger} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {error && (
                  <p
                    role="alert"
                    style={{
                      color: COLORS.danger,
                      fontSize: "13px",
                      margin: "16px 0 0",
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  style={{ ...s.primaryBtn, opacity: saving ? 0.7 : 1 }}
                  disabled={saving}
                  onClick={() => saveQuiz(true)}
                >
                  {saving
                    ? "Saving..."
                    : isPublished
                      ? "Save Changes"
                      : "Publish Quiz"}
                </button>

                {!hasAttempts && (
                  <button
                    type="button"
                    style={s.secondaryBtn}
                    disabled={saving}
                    onClick={() => saveQuiz(false)}
                  >
                    {isPublished
                      ? "Unpublish (move to draft)"
                      : "Save as Draft"}
                  </button>
                )}

                {assessmentId && (
                  <button
                    type="button"
                    onClick={deleteQuiz}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      marginTop: "18px",
                      border: 0,
                      background: "none",
                      color: COLORS.danger,
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Trash2 size={16} /> Delete Quiz
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}

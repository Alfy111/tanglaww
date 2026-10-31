import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Hourglass,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import MatchingBoard from "../../components/MatchingBoard";
import { supabase } from "../../lib/supabase";
import QuizLayout, { QUIZ_COLORS, TYPE_LABELS } from "./QuizLayout";

const C = {
  ...QUIZ_COLORS,
  tag: "#D9DDE5",
  dark: "#161616",
  darkCell: "#262626",
  darkText: "#E5E5E5",
  blueLight: "#7F95E8",
  green: "#22C55E",
  marked: "#FACC15",
};

const AUTOSAVE_MS = 20000;

const formatTimer = (total) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

const isAnswered = (q, a) => {
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

const outlineBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "9px 16px",
  borderRadius: "6px",
  border: `1px solid ${C.primary}`,
  backgroundColor: "#fff",
  color: C.primary,
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "inherit",
};
const solidBtn = { ...outlineBtn, backgroundColor: C.primary, color: "#fff" };

export default function QuizTake() {
  const { attemptId: idParam } = useParams();
  const attemptId = Number(idParam);
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [marked, setMarked] = useState(new Set());
  const [seconds, setSeconds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const dirty = useRef(new Set());
  const finishing = useRef(false);
  const warned = useRef(false);

  const leave = useCallback(() => {
    const assessmentId = location.state?.assessmentId;
    if (assessmentId)
      navigate(`/dashboard/quiz/${assessmentId}`, {
        replace: true,
        state: location.state,
      });
    else navigate(-1);
  }, [location.state, navigate]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("get_attempt_questions", {
        p_attempt_id: attemptId,
      });
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      const qs = data.questions ?? [];
      const initial = {};
      for (const q of qs) if (q.answer) initial[q.question_id] = q.answer;
      setTitle(data.title);
      setQuestions(qs);
      setAnswers(initial);
      setSeconds(data.timeSpentSeconds ?? 0);
      setSecondsLeft(data.secondsLeft ?? null);
      setLoading(false);
    };
    load();
  }, [attemptId]);

  useEffect(() => {
    if (loading || loadError) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((s) => s + 1);
      setSecondsLeft((s) => (s === null ? null : Math.max(s - 1, 0)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, loadError]);

  const setAnswer = (questionId, changes) => {
    dirty.current.add(questionId);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...changes },
    }));
  };

  const saveDirty = useCallback(async () => {
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
        setNotice(`Could not save your answer: ${error.message}`);
        return "error";
      }
      if (data === false) return "closed";
    }
    return "ok";
  }, [attemptId]);

  const submitNow = useCallback(
    async (reason) => {
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
        window.alert(`Could not submit: ${error.message}`);
        return;
      }

      if (reason === "time")
        window.alert(
          "Time's up. Your time ran out, so your saved answers were submitted.",
        );
      else if (reason === "closed")
        window.alert(
          "Quiz ended. The quiz has closed or your time ran out, so your saved answers were submitted.",
        );
      leave();
    },
    [attemptId, saveDirty, leave],
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
    leave();
  }, [attemptId, saveDirty, submitNow, leave]);

  const confirmExit = () => {
    const message =
      secondsLeft !== null
        ? "Your answers will be saved. The timer keeps running while you are away, and the quiz submits itself when time runs out. Save and exit?"
        : "Your answers will be saved and the timer will pause. You can continue later, but this still counts as an attempt. Save and exit?";
    if (window.confirm(message)) saveAndExit();
  };

  useEffect(() => {
    if (loading || secondsLeft === null) return;
    if (secondsLeft === 0) {
      submitNow("time");
      return;
    }
    if (secondsLeft <= 300 && secondsLeft > 290 && !warned.current) {
      warned.current = true;
      setNotice(
        "5 minutes left. The quiz will submit automatically when time runs out.",
      );
    }
  }, [loading, secondsLeft, submitNow]);

  useEffect(() => {
    if (loading) return undefined;
    const timer = window.setInterval(() => {
      if (dirty.current.size === 0 || finishing.current) return;
      saveDirty().then((r) => {
        if (r === "closed") submitNow("closed");
      });
    }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [loading, saveDirty, submitNow]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (finishing.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const goTo = async (i) => {
    if (i < 0 || i >= questions.length) return;
    setIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const result = await saveDirty();
    if (result === "closed") submitNow("closed");
  };

  const confirmSubmit = () => {
    const unanswered = questions.filter(
      (q) => !isAnswered(q, answers[q.question_id]),
    ).length;
    const message =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Unanswered questions get 0 points. Submit anyway?`
        : "Submit your answers now?";
    if (window.confirm(message)) submitNow("manual");
  };

  const toggleMark = (questionId) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading || loadError || questions.length === 0) {
    return (
      <QuizLayout title={title || "Quiz"} onBack={leave}>
        <p
          role={loadError ? "alert" : undefined}
          style={{ color: loadError ? C.fail : C.muted }}
        >
          {loading ? "Loading..." : loadError || "This quiz has no questions."}
        </p>
      </QuizLayout>
    );
  }

  const q = questions[index];
  const a = answers[q.question_id] ?? {};
  const answeredCount = questions.filter((x) =>
    isAnswered(x, answers[x.question_id]),
  ).length;
  const isLast = index === questions.length - 1;
  const urgent = secondsLeft !== null && secondsLeft <= 60;
  const visibleCells = questions
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => filter === "all" || marked.has(x.question_id));

  return (
    <QuizLayout
      title={title}
      onBack={confirmExit}
      backLabel="Save & exit"
      maxWidth="1200px"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          {notice && (
            <div
              role="status"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                padding: "10px 14px",
                marginBottom: "14px",
                borderRadius: "8px",
                backgroundColor: "#FFF8E1",
                border: "1px solid #F5C451",
                fontSize: "13px",
                color: "#7A5B00",
              }}
            >
              {notice}
              <button
                type="button"
                onClick={() => setNotice("")}
                style={{
                  border: 0,
                  background: "none",
                  cursor: "pointer",
                  color: "#7A5B00",
                  fontWeight: "700",
                }}
              >
                ×
              </button>
            </div>
          )}

          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
              <span
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: C.text,
                  backgroundColor: C.tag,
                  border: "1px solid #9AA1AE",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {q.majorTag ?? "No major tag"}
              </span>
              <span
                style={{
                  flex: 1.4,
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: C.text,
                  backgroundColor: "#F3F4F7",
                  border: "1px solid #9AA1AE",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {q.minorTag ?? "No minor tag"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: C.primary,
                  }}
                >
                  QUESTION {index + 1}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: C.accent,
                    marginTop: "2px",
                  }}
                >
                  {TYPE_LABELS[q.questionType]} · {q.points}{" "}
                  {q.points === 1 ? "pt" : "pts"}
                </div>
              </div>
              <button
                type="button"
                aria-pressed={marked.has(q.question_id)}
                onClick={() => toggleMark(q.question_id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 12px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  color: C.text,
                  border: `1px solid ${marked.has(q.question_id) ? C.marked : C.border}`,
                  backgroundColor: marked.has(q.question_id)
                    ? "#FEF3C7"
                    : "#fff",
                }}
              >
                <Flag
                  size={13}
                  color={marked.has(q.question_id) ? "#7A5B00" : C.muted}
                  fill={marked.has(q.question_id) ? "#FACC15" : "none"}
                />
                {marked.has(q.question_id) ? "Marked" : "Mark"}
              </button>
            </div>

            {q.questionText && (
              <p
                style={{
                  fontSize: "15px",
                  color: C.text,
                  margin: "18px 0 16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {q.questionText}
              </p>
            )}
            {q.imageUrl && (
              <a
                href={q.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open full size"
                style={{
                  display: "block",
                  margin: q.questionText ? "0 0 16px" : "18px 0 16px",
                }}
              >
                <img
                  src={q.imageUrl}
                  alt={`Question ${index + 1}`}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "420px",
                    borderRadius: "8px",
                    border: `1px solid ${C.border}`,
                  }}
                />
              </a>
            )}

            {q.questionType === "mcq" &&
              (q.choices ?? []).map((c, i) => {
                const selected = a.choice_id === c.choice_id;
                return (
                  <button
                    key={c.choice_id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setAnswer(q.question_id, { choice_id: c.choice_id })
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "stretch",
                      padding: 0,
                      marginBottom: "12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      border: `1px solid ${selected ? C.primary : C.border}`,
                      backgroundColor: selected ? C.selectedBg : "#fff",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        width: "42px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        color: selected ? "#fff" : C.text,
                        backgroundColor: selected ? C.primary : "transparent",
                        borderRight: `1px solid ${selected ? C.primary : C.border}`,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        padding: "12px",
                        fontSize: "14px",
                        color: C.text,
                        minWidth: 0,
                      }}
                    >
                      {c.choiceText}
                      {c.imageUrl && (
                        <img
                          src={c.imageUrl}
                          alt={`Choice ${String.fromCharCode(65 + i)}`}
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            maxHeight: "200px",
                            marginTop: c.choiceText ? "8px" : 0,
                            borderRadius: "6px",
                          }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}

            {q.questionType === "identification" && (
              <input
                aria-label="Your answer"
                placeholder="Type your answer"
                value={a.textAnswer ?? ""}
                onChange={(e) =>
                  setAnswer(q.question_id, { textAnswer: e.target.value })
                }
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  border: `1px solid ${C.border}`,
                  borderRadius: "4px",
                  fontSize: "15px",
                  color: C.text,
                  fontFamily: "inherit",
                  outline: "none",
                }}
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
              />
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "16px",
              }}
            >
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  style={outlineBtn}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <span />
              )}
              {isLast ? (
                <button
                  type="button"
                  onClick={confirmSubmit}
                  disabled={busy}
                  style={solidBtn}
                >
                  Finish <Send size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  style={solidBtn}
                >
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside
          style={{
            flex: "0 1 320px",
            minWidth: "260px",
            position: "sticky",
            top: "84px",
            backgroundColor: C.dark,
            borderRadius: "14px",
            color: C.darkText,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "600" }}>
              Question Navigator
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "13px",
                fontVariantNumeric: "tabular-nums",
                color: urgent ? "#FF6B6B" : C.darkText,
                fontWeight: urgent ? "700" : "400",
              }}
            >
              {secondsLeft !== null ? (
                <Hourglass size={15} />
              ) : (
                <Clock size={15} />
              )}
              {formatTimer(secondsLeft !== null ? secondsLeft : seconds)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "12px 16px",
              borderTop: "1px solid #2E2E2E",
              borderBottom: "1px solid #2E2E2E",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                border: "3px solid #3A3A3A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                color: "#fff",
              }}
            >
              {answeredCount}
            </div>
            <div>
              <div
                style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}
              >
                {answeredCount} of {questions.length} answered
              </div>
              <div
                style={{ color: "#9CA3AF", fontSize: "11px", marginTop: "2px" }}
              >
                {questions.length - answeredCount} to go
              </div>
            </div>
          </div>

          <div style={{ height: "6px", backgroundColor: "#2E2E2E" }}>
            <div
              style={{
                height: "100%",
                width: `${(answeredCount / questions.length) * 100}%`,
                backgroundColor: C.green,
              }}
            />
          </div>

          <div
            role="tablist"
            style={{ display: "flex", gap: "8px", padding: "12px" }}
          >
            {[
              ["all", `All ${questions.length}`],
              ["marked", `Marked ${marked.size}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                style={{
                  flex: 1,
                  padding: "7px",
                  borderRadius: "6px",
                  border:
                    filter === key
                      ? `1px solid ${C.primary}`
                      : "1px solid transparent",
                  backgroundColor: filter === key ? C.primary : "transparent",
                  color: filter === key ? "#fff" : "#9CA3AF",
                  fontSize: "12px",
                  fontWeight: filter === key ? "700" : "400",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              padding: "0 12px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {visibleCells.length === 0 && (
              <span
                style={{ color: "#9CA3AF", fontSize: "12px", padding: "8px" }}
              >
                No questions here.
              </span>
            )}
            {visibleCells.map(({ x, i }) => {
              const done = isAnswered(x, answers[x.question_id]);
              return (
                <button
                  key={x.question_id}
                  type="button"
                  aria-label={`Question ${i + 1}${done ? ", answered" : ""}${marked.has(x.question_id) ? ", marked" : ""}`}
                  onClick={() => goTo(i)}
                  style={{
                    position: "relative",
                    width: "42px",
                    height: "36px",
                    borderRadius: "6px",
                    border:
                      i === index
                        ? `2px solid ${C.blueLight}`
                        : "2px solid transparent",
                    backgroundColor: done ? C.primary : C.darkCell,
                    color: done ? "#fff" : "#D4D4D4",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {i + 1}
                  {marked.has(x.question_id) && (
                    <span
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: "3px",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: C.marked,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "16px", padding: "12px 16px" }}>
            {[
              [C.primary, "Answered"],
              [C.marked, "Marked"],
              [C.darkCell, "Blank"],
            ].map(([color, label]) => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  color: "#9CA3AF",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: color === C.darkCell ? "1px solid #555" : 0,
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          <div style={{ padding: "0 16px 16px" }}>
            <button
              type="button"
              onClick={confirmSubmit}
              disabled={busy}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "6px",
                border: 0,
                backgroundColor: C.primary,
                color: "#fff",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Send size={16} /> Submit exam
            </button>
            <button
              type="button"
              onClick={saveAndExit}
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px",
                border: 0,
                background: "none",
                color: "#D4D4D4",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Save & exit
            </button>
          </div>
        </aside>
      </div>

      {busy && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "600",
          }}
        >
          Saving...
        </div>
      )}
    </QuizLayout>
  );
}

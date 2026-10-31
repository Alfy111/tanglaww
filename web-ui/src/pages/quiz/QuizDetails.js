import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import QuizLayout, {
    QUIZ_COLORS as C,
    cardText,
    cardTitle,
    formatDateTime,
    formatDuration,
    formatScore,
    quizCard,
} from "./QuizLayout";

export default function QuizDetails() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const back = () => {
    const courseId = location.state?.courseId;
    if (courseId)
      navigate(`/dashboard/courses/${courseId}?section=quizzes`, {
        state: { courseTitle: location.state?.courseTitle },
      });
    else navigate(-1);
  };

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc("get_student_quiz", {
      p_assessment_id: Number(assessmentId),
    });
    if (loadError) setError(loadError.message);
    else setQuiz(data);
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <QuizLayout title="Quiz" onBack={back}>
        <p role="alert" style={{ color: C.fail }}>
          {error}
        </p>
      </QuizLayout>
    );
  }
  if (!quiz) {
    return (
      <QuizLayout title="Quiz" onBack={back}>
        <p style={{ color: C.muted }}>Loading...</p>
      </QuizLayout>
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
  const ringColor = !latest ? C.empty : latest.isPassed ? C.pass : C.fail;

  const startQuiz = async () => {
    setStarting(true);
    const { data, error: startError } = await supabase.rpc("start_attempt", {
      p_assessment_id: Number(assessmentId),
    });
    setStarting(false);
    if (startError) {
      window.alert(`Cannot start quiz: ${startError.message}`);
      load();
      return;
    }
    navigate(`/dashboard/quiz/attempt/${data}`, {
      state: { ...location.state, assessmentId: Number(assessmentId) },
    });
  };

  const confirmStart = () => {
    if (inProgress) {
      startQuiz();
      return;
    }
    const message = `This will use 1 of your ${attemptsLeft} remaining attempt${attemptsLeft === 1 ? "" : "s"}.${
      quiz.timeLimitMinutes
        ? ` You will have ${quiz.timeLimitMinutes} minutes, and the timer keeps running even if you leave the quiz.`
        : ""
    } Continue?`;
    if (window.confirm(message)) startQuiz();
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
    <QuizLayout title={quiz.title} onBack={back} backLabel="Back to quizzes">
      <section style={quizCard}>
        <h2 style={cardTitle}>Instructions</h2>
        <p style={{ ...cardText, whiteSpace: "pre-wrap" }}>
          {quiz.instructions || "Answer all questions carefully."}
        </p>
      </section>

      <section style={quizCard}>
        <h2 style={cardTitle}>Details</h2>
        <p style={cardText}>
          Max score: {quiz.maxScore} ({quiz.totalItems}{" "}
          {quiz.totalItems === 1 ? "question" : "questions"})
        </p>
        <p style={cardText}>Passing score: {quiz.passingScore}</p>
        <p style={cardText}>
          Time limit:{" "}
          {quiz.timeLimitMinutes
            ? `${quiz.timeLimitMinutes} minutes`
            : "No time limit"}
        </p>
        <p style={cardText}>
          Due: {quiz.deadline ? formatDateTime(quiz.deadline) : "No deadline"}
        </p>
        <p style={cardText}>
          Available attempts: {attemptsLeft} of {quiz.maxAttempts}
        </p>
        {quiz.isClosed && (
          <p
            style={{
              ...cardText,
              color: C.fail,
              fontWeight: "600",
              marginTop: "4px",
            }}
          >
            {quiz.deadline && new Date(quiz.deadline) < new Date()
              ? "This quiz is closed. The deadline has passed, so it can no longer be taken."
              : "This quiz is closed by the admin, so it can no longer be taken."}
          </p>
        )}
      </section>

      <section style={quizCard}>
        <h2 style={cardTitle}>Score</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "6px 0",
          }}
        >
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              border: `10px solid ${ringColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{ fontSize: "18px", fontWeight: "700", color: C.primary }}
            >
              {latest ? formatScore(latest.score) : "?"} / {quiz.maxScore}
            </span>
          </div>
          {latest && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: "700",
                marginTop: "8px",
                color: ringColor,
              }}
            >
              {latest.isPassed ? "Passed" : "Did not pass"}
            </span>
          )}
          {best !== null && submitted.length > 1 && (
            <span
              style={{ fontSize: "13px", color: C.muted, marginTop: "6px" }}
            >
              Highest score: {formatScore(best)}
            </span>
          )}
        </div>
      </section>

      {latest && (
        <section style={quizCard}>
          <h2 style={cardTitle}>Submission Details</h2>
          <p style={cardText}>
            Time spent: {formatDuration(latest.timeSpentSeconds)}
          </p>
          <p style={cardText}>
            Submitted: {formatDateTime(latest.submittedAt)}
          </p>
          <div style={{ marginTop: "8px", borderTop: "1px solid #DDE2EA" }}>
            {submitted.map((a, i) => (
              <button
                key={a.attempt_id}
                type="button"
                onClick={() =>
                  navigate(`/dashboard/quiz/review/${a.attempt_id}`, {
                    state: location.state,
                  })
                }
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  border: 0,
                  borderBottom: "1px solid #DDE2EA",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: "14px", color: C.text }}>
                  Attempt {i + 1}: {formatScore(a.score)} / {quiz.maxScore}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: C.primary,
                  }}
                >
                  Review <ChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        disabled={buttonDisabled || starting}
        onClick={confirmStart}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "8px",
          border: 0,
          backgroundColor: C.primary,
          color: "#fff",
          fontSize: "15px",
          fontWeight: "700",
          cursor: buttonDisabled || starting ? "not-allowed" : "pointer",
          opacity: buttonDisabled || starting ? 0.5 : 1,
          fontFamily: "inherit",
          marginTop: "6px",
        }}
      >
        {starting ? "Starting..." : buttonLabel}
      </button>
    </QuizLayout>
  );
}

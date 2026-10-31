import { CheckCircle2, EyeOff, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import QuizLayout, {
  QUIZ_COLORS as C,
  TYPE_LABELS,
  cardText,
  cardTitle,
  formatDuration,
  formatScore,
  quizCard,
} from "./QuizLayout";

const answerValue = { fontSize: "14px", color: C.text, margin: "2px 0 4px" };
const answerLabel = { fontSize: "12px", color: C.muted, margin: "4px 0 0" };

export default function QuizReview() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .rpc("get_attempt_review", { p_attempt_id: Number(attemptId) })
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message);
        else setReview(data);
      });
  }, [attemptId]);

  const back = () => navigate(-1);

  if (error || !review) {
    return (
      <QuizLayout title="Review" onBack={back}>
        <p
          role={error ? "alert" : undefined}
          style={{ color: error ? C.fail : C.muted }}
        >
          {error || "Loading..."}
        </p>
      </QuizLayout>
    );
  }

  const show = review.showCorrectAnswers;

  return (
    <QuizLayout
      title={review.title}
      onBack={back}
      backLabel={location.state ? "Back to quiz" : "Back"}
    >
      <section style={quizCard}>
        <h2 style={cardTitle}>Result</h2>
        <p style={cardText}>
          Score: {formatScore(review.score)} / {review.maxScore}{" "}
          <span style={{ color: review.isPassed ? C.correct : C.wrong }}>
            ({review.isPassed ? "Passed" : "Did not pass"})
          </span>
        </p>
        <p style={cardText}>
          Time spent: {formatDuration(review.timeSpentSeconds)}
        </p>
      </section>

      {!show && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
            backgroundColor: "#F5F6F9",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "14px",
            fontSize: "13px",
            color: C.muted,
          }}
        >
          <EyeOff size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          Correct answers are hidden for this quiz. You can review your own
          answers below.
        </div>
      )}

      {review.questions.map((q, i) => {
        const a = q.answer;
        const correct = a?.isCorrect;
        return (
          <section
            key={q.question_id}
            style={{
              border: "1px solid #E5E8EE",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "14px",
              backgroundColor: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: C.primary,
                  }}
                >
                  QUESTION {i + 1}
                </div>
                <div
                  style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}
                >
                  {TYPE_LABELS[q.questionType]}
                  {q.minorTag ? ` · ${q.minorTag}` : ""}
                </div>
              </div>
              {show && a && (
                <span
                  style={{
                    borderRadius: "12px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: "700",
                    backgroundColor: correct ? C.correctBg : C.wrongBg,
                    color: correct ? C.correct : C.wrong,
                  }}
                >
                  {formatScore(a.pointsEarned ?? 0)} / {q.points}
                </span>
              )}
            </div>

            {q.questionText && (
              <p
                style={{
                  fontSize: "15px",
                  color: C.text,
                  margin: "12px 0",
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
                style={{ display: "block", margin: "12px 0" }}
              >
                <img
                  src={q.imageUrl}
                  alt={`Question ${i + 1}`}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "360px",
                    borderRadius: "8px",
                    border: "1px solid #E5E8EE",
                  }}
                />
              </a>
            )}

            {q.questionType === "mcq" &&
              (q.choices ?? []).map((c, ci) => {
                const picked = a?.choice_id === c.choice_id;
                const isRight = show && c.isCorrect === true;
                const isWrongPick = show && picked && c.isCorrect === false;
                const border = isWrongPick
                  ? C.wrong
                  : isRight
                    ? C.correct
                    : picked
                      ? C.primary
                      : C.border;
                const bg = isWrongPick
                  ? C.wrongBg
                  : isRight
                    ? C.correctBg
                    : picked
                      ? C.selectedBg
                      : "#fff";
                return (
                  <div
                    key={c.choice_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      border: `1px solid ${border}`,
                      backgroundColor: bg,
                      borderRadius: "4px",
                      padding: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "700",
                        color: C.text,
                        width: "18px",
                      }}
                    >
                      {String.fromCharCode(65 + ci)}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "14px",
                        color: C.text,
                        minWidth: 0,
                      }}
                    >
                      {c.choiceText}
                      {c.imageUrl && (
                        <img
                          src={c.imageUrl}
                          alt={`Choice ${String.fromCharCode(65 + ci)}`}
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            maxHeight: "180px",
                            marginTop: c.choiceText ? "6px" : 0,
                            borderRadius: "6px",
                          }}
                        />
                      )}
                    </span>
                    {picked && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: C.primary,
                          fontWeight: "600",
                        }}
                      >
                        Your answer
                      </span>
                    )}
                    {isRight && <CheckCircle2 size={18} color={C.correct} />}
                    {isWrongPick && <XCircle size={18} color={C.wrong} />}
                  </div>
                );
              })}

            {q.questionType === "identification" && (
              <>
                <p style={answerLabel}>Your answer:</p>
                <p
                  style={{
                    ...answerValue,
                    color: show ? (correct ? C.correct : C.wrong) : C.text,
                  }}
                >
                  {a?.textAnswer || "No answer"}
                </p>
                {show && q.acceptedAnswers && (
                  <>
                    <p style={answerLabel}>Accepted answers:</p>
                    <p style={answerValue}>{q.acceptedAnswers.join(", ")}</p>
                  </>
                )}
              </>
            )}

            {q.questionType === "matching" &&
              (q.matchItems ?? []).map((item, mi) => {
                const given = a?.matchingAnswer?.[String(item.pair_id)] ?? null;
                const right =
                  show &&
                  given !== null &&
                  item.correctMatch !== null &&
                  given.trim().toLowerCase() ===
                    item.correctMatch.trim().toLowerCase();
                return (
                  <div key={item.pair_id} style={{ marginBottom: "10px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: C.text,
                        margin: 0,
                      }}
                    >
                      {mi + 1}. {item.leftText}
                    </p>
                    <p
                      style={{
                        ...answerValue,
                        color: show ? (right ? C.correct : C.wrong) : C.text,
                      }}
                    >
                      Your match: {given ?? "No answer"}
                    </p>
                    {show && !right && item.correctMatch && (
                      <p style={{ ...answerValue, color: C.correct }}>
                        Correct match: {item.correctMatch}
                      </p>
                    )}
                  </div>
                );
              })}
          </section>
        );
      })}
    </QuizLayout>
  );
}

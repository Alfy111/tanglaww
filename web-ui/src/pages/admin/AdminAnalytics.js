import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  GraduationCap,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";
import "./AdminAnalytics.css";

const rpc = async (name, params) => {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data;
};

const percent = (value) =>
  value == null ? "–" : `${Math.round(Number(value))}%`;
const scoreTone = (value) =>
  value == null
    ? "neutral"
    : value >= 75
      ? "good"
      : value >= 60
        ? "watch"
        : "risk";
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "–";

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`admin-analytics-panel ${className}`}>
      {(title || subtitle) && (
        <header className="admin-analytics-panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

function Metric({ label, value, note, icon: Icon }) {
  return (
    <div className="admin-analytics-metric">
      {Icon && (
        <span className="admin-analytics-metric-icon">
          <Icon size={19} />
        </span>
      )}
      <div>
        <span className="admin-analytics-label">{label}</span>
        <strong>{value ?? "–"}</strong>
        {note && <small>{note}</small>}
      </div>
    </div>
  );
}

function Bar({ label, value, note, color = "blue" }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="admin-analytics-bar-row">
      <div className="admin-analytics-bar-label">
        <span>{label}</span>
        <strong>{percent(value)}</strong>
      </div>
      <div className="admin-analytics-track">
        <span
          className={`bar-${color === "tone" ? scoreTone(value) : color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {note && <small>{note}</small>}
    </div>
  );
}

function Empty({ children }) {
  return <p className="admin-analytics-empty">{children}</p>;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [course, setCourse] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [report, setReport] = useState(null);
  const [rankKey, setRankKey] = useState("overall");
  const [rankings, setRankings] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [diagnosticId, setDiagnosticId] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [showAllRanks, setShowAllRanks] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBase = async () => {
    try {
      const [overviewData, studentData] = await Promise.all([
        rpc("get_admin_overview"),
        rpc("get_admin_students"),
      ]);
      setOverview(overviewData);
      setStudents(studentData ?? []);
      setCourseId(
        (previous) => previous ?? overviewData.courses[0]?.course_id ?? null,
      );
      setDiagnosticId(
        (previous) => previous ?? overviewData.diagnostic.assessment_id ?? null,
      );
      setStudentId((previous) => {
        if (previous) return previous;
        const atRisk = (studentData ?? [])
          .filter((student) => student.avgScore != null)
          .sort((a, b) => a.avgScore - b.avgScore);
        return atRisk[0]?.id ?? studentData?.[0]?.id ?? null;
      });
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (tab !== "overview") return;
    let active = true;
    setRankings(null);
    rpc("get_admin_rankings", {
      p_assessment_id: rankKey === "overall" ? null : Number(rankKey),
    })
      .then((data) => {
        if (active) setRankings(data ?? []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [tab, rankKey]);

  useEffect(() => {
    if (tab !== "course" || !courseId) return;
    let active = true;
    setCourse(null);
    rpc("get_admin_course_analytics", { p_course_id: courseId })
      .then((data) => {
        if (!active) return;
        setCourse(data);
        setQuizId((previous) =>
          data.quizzes.some((quiz) => quiz.assessment_id === previous)
            ? previous
            : (data.quizzes[0]?.assessment_id ?? null),
        );
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [tab, courseId]);

  useEffect(() => {
    if (tab !== "student" || !studentId) return;
    let active = true;
    setReport(null);
    rpc("get_student_report", { p_student_id: studentId })
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => {
      active = false;
    };
  }, [tab, studentId]);

  const selectDiagnostic = async (value) => {
    const id = value ? Number(value) : null;
    setDiagnosticId(id);
    try {
      await rpc("set_diagnostic_assessment", { p_assessment_id: id });
      await loadBase();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const selectedStudent = students.find((student) => student.id === studentId);
  const allQuizQuestions = (course?.questions ?? []).filter(
    (question) => question.assessment_id === quizId,
  );
  const weakQuestions = allQuizQuestions.filter(
    (question) => question.correct / Math.max(1, question.examinees) < 0.5,
  );
  const visibleQuestions = showAllQuestions
    ? weakQuestions
    : weakQuestions.slice(0, 10);
  const atRisk = students
    .filter(
      (student) =>
        student.earlyWarning ||
        (student.avgScore != null && student.avgScore < 60),
    )
    .sort(
      (a, b) =>
        Number(b.earlyWarning) - Number(a.earlyWarning) ||
        (a.avgScore ?? 0) - (b.avgScore ?? 0),
    );
  const diagnostic = overview?.diagnostic;

  return (
    <div className="admin-analytics-layout">
      <AdminSidebar />
      <main className="admin-analytics-main">
        <AdminTopbar
          title="Analytics"
          actions={
            <button
              className="admin-analytics-back"
              type="button"
              onClick={() => navigate("/admin/courses")}
              aria-label="Back to courses"
              title="Back to courses"
            >
              <ArrowLeft size={20} />
            </button>
          }
        />

        <div className="admin-analytics-content">
          <nav className="admin-analytics-tabs" aria-label="Analytics views">
            {[
              { key: "overview", label: "Overview" },
              { key: "course", label: "By Course" },
              { key: "student", label: "By Student" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={tab === item.key ? "active" : ""}
                onClick={() => {
                  setTab(item.key);
                  setError("");
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {loading ? (
            <div className="admin-analytics-status">Loading analytics...</div>
          ) : error && !overview ? (
            <div className="admin-analytics-status error" role="alert">
              {error}
            </div>
          ) : overview ? (
            <>
              {error && (
                <div className="admin-analytics-inline-error" role="alert">
                  {error}
                </div>
              )}
              {tab === "overview" && (
                <div className="admin-analytics-stack">
                  <div className="admin-analytics-metrics">
                    <Metric
                      label="Total Students"
                      value={overview.summary.totalStudents}
                      note={`${overview.summary.activeStudents} active`}
                      icon={Users}
                    />
                    <Metric
                      label="Average Score"
                      value={percent(overview.summary.avgScore)}
                      icon={BarChart3}
                    />
                    <Metric
                      label="Pass Rate"
                      value={percent(overview.summary.passRate)}
                      icon={GraduationCap}
                    />
                    <Metric
                      label="Quiz Results"
                      value={overview.summary.quizResults}
                      icon={BookOpen}
                    />
                  </div>

                  <div className="admin-analytics-columns">
                    <Panel
                      title="Score Distribution"
                      subtitle={`Latest result of each student per quiz (${overview.distribution.count} results)`}
                    >
                      {!overview.distribution.count ? (
                        <Empty>No quiz results yet.</Empty>
                      ) : (
                        <>
                          <div className="admin-analytics-stat-row">
                            <Metric
                              label="Average"
                              value={percent(overview.distribution.average)}
                            />
                            <Metric
                              label="Median"
                              value={percent(overview.distribution.median)}
                            />
                            <Metric
                              label="Range"
                              value={`${percent(overview.distribution.min)} – ${percent(overview.distribution.max)}`}
                            />
                          </div>
                          <div
                            className="admin-analytics-histogram"
                            aria-label="Score distribution"
                          >
                            {overview.distribution.bins.map((count, index) => (
                              <div
                                key={index}
                                className="admin-analytics-histogram-column"
                              >
                                <span
                                  style={{
                                    height: `${Math.max(3, (count / Math.max(...overview.distribution.bins, 1)) * 100)}%`,
                                  }}
                                />
                                <small>
                                  {index * 10}-{index * 10 + 9}
                                </small>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </Panel>

                    <Panel
                      title="Student Ranking"
                      subtitle={
                        rankKey === "overall"
                          ? "Average of each student's latest quiz results"
                          : "Based on each student's first attempt"
                      }
                    >
                      <label className="admin-analytics-field">
                        Rank by
                        <select
                          value={rankKey}
                          onChange={(event) => {
                            setRankKey(event.target.value);
                            setShowAllRanks(false);
                          }}
                        >
                          <option value="overall">Overall performance</option>
                          {overview.assessments.map((assessment) => (
                            <option
                              key={assessment.assessment_id}
                              value={assessment.assessment_id}
                            >
                              {assessment.title} · {assessment.courseName}
                            </option>
                          ))}
                        </select>
                      </label>
                      {rankings === null ? (
                        <Empty>Loading rankings...</Empty>
                      ) : rankings.length === 0 ? (
                        <Empty>No results yet.</Empty>
                      ) : (
                        <div className="admin-analytics-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(showAllRanks
                                ? rankings
                                : rankings.slice(0, 10)
                              ).map((row) => (
                                <tr key={`${row.rank}-${row.name}`}>
                                  <td>{row.rank}</td>
                                  <td>
                                    {row.name}
                                    {row.quizzes != null && (
                                      <small>
                                        {row.quizzes}{" "}
                                        {row.quizzes === 1 ? "quiz" : "quizzes"}
                                      </small>
                                    )}
                                  </td>
                                  <td className="score-plain">
                                    {percent(row.pct)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {rankings?.length > 10 && (
                        <button
                          className="admin-analytics-text-button"
                          type="button"
                          onClick={() => setShowAllRanks((value) => !value)}
                        >
                          {showAllRanks
                            ? "Show top 10"
                            : `Show all ${rankings.length} students`}
                        </button>
                      )}
                    </Panel>
                  </div>

                  <Panel
                    title="Diagnostic Exam: Current vs Past Cohort Average"
                    subtitle="This batch compared with the past batch"
                  >
                    <label className="admin-analytics-field diagnostic-select">
                      Diagnostic exam
                      <select
                        value={diagnosticId ?? ""}
                        onChange={(event) =>
                          selectDiagnostic(event.target.value)
                        }
                      >
                        <option value="">Select a diagnostic exam</option>
                        {overview.assessments.map((assessment) => (
                          <option
                            key={assessment.assessment_id}
                            value={assessment.assessment_id}
                          >
                            {assessment.title} · {assessment.courseName}
                          </option>
                        ))}
                      </select>
                    </label>
                    {diagnosticId == null ? (
                      <Empty>
                        Choose a diagnostic quiz to see the cohort comparison
                        and early warnings.
                      </Empty>
                    ) : (
                      <>
                        <div className="admin-analytics-compare">
                          <Metric
                            label="This batch"
                            value={percent(diagnostic.currentAvg)}
                            note={`${diagnostic.currentCount} ${diagnostic.currentCount === 1 ? "reviewee" : "reviewees"}`}
                          />
                          <Metric
                            label="Past batch"
                            value={percent(diagnostic.pastAvg)}
                            note="Google Forms results"
                          />
                        </div>
                        {diagnostic.currentAvg != null &&
                          diagnostic.pastAvg != null && (
                            <p className="admin-analytics-compare-note">
                              {diagnostic.currentAvg >= diagnostic.pastAvg
                                ? `${(diagnostic.currentAvg - diagnostic.pastAvg).toFixed(1)} points higher`
                                : `${(diagnostic.pastAvg - diagnostic.currentAvg).toFixed(1)} points lower`}{" "}
                              than the past batch
                            </p>
                          )}
                        <div className="admin-analytics-warning">
                          <CircleAlert size={18} />
                          <span>
                            <strong>
                              Early warning: {diagnostic.flagged}{" "}
                              {diagnostic.flagged === 1
                                ? "reviewee"
                                : "reviewees"}
                            </strong>{" "}
                            scored below {diagnostic.cutoff}%. Past reviewees
                            below this cutoff mostly did not reach 75% in Prof
                            Ed final coaching.
                          </span>
                        </div>
                      </>
                    )}
                  </Panel>

                  <Panel
                    title="At-Risk Students"
                    subtitle="Students with an average below 60% or an early warning"
                  >
                    {atRisk.length === 0 ? (
                      <Empty>No students at risk right now.</Empty>
                    ) : (
                      <div className="admin-analytics-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Average</th>
                              <th>Completion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {atRisk.map((student) => (
                              <tr
                                key={student.id}
                                onClick={() => {
                                  setStudentId(student.id);
                                  setTab("student");
                                }}
                                className="clickable-row"
                              >
                                <td>
                                  {student.name}
                                  {student.earlyWarning && (
                                    <small>Early warning</small>
                                  )}
                                </td>
                                <td className="score-plain">
                                  {percent(student.avgScore)}
                                </td>
                                <td>{percent(student.completion)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>

                  <div className="admin-analytics-columns">
                    <Panel
                      title="Completion Rate by Course"
                      subtitle="Average progress of all students"
                    >
                      {overview.courses.map((item) => (
                        <Bar
                          key={item.course_id}
                          label={item.courseName}
                          value={item.completion}
                          note={
                            item.finished > 0
                              ? `${item.finished} finished`
                              : undefined
                          }
                        />
                      ))}
                    </Panel>
                    <Panel
                      title="Material Engagement"
                      subtitle="Share of students who opened or completed each material"
                    >
                      {overview.engagement.map((item) => (
                        <div
                          className="admin-analytics-engagement"
                          key={item.label}
                        >
                          <strong>
                            {item.label} <small>({item.materials})</small>
                          </strong>
                          <Bar label="Opened" value={item.opened} />
                          <Bar
                            label="Completed"
                            value={item.completed}
                            color="green"
                          />
                        </div>
                      ))}
                    </Panel>
                  </div>
                </div>
              )}

              {tab === "course" && (
                <div className="admin-analytics-stack">
                  <div className="admin-analytics-chips">
                    {overview.courses.map((item) => (
                      <button
                        key={item.course_id}
                        className={courseId === item.course_id ? "active" : ""}
                        onClick={() => setCourseId(item.course_id)}
                        type="button"
                      >
                        {item.courseName}
                      </button>
                    ))}
                  </div>
                  {!course ? (
                    <div className="admin-analytics-status">
                      Loading course analytics...
                    </div>
                  ) : (
                    <>
                      <Panel
                        title="Quiz Breakdown"
                        subtitle="Based on each student's latest attempt"
                      >
                        {course.quizzes.length === 0 ? (
                          <Empty>No quizzes in this course yet.</Empty>
                        ) : (
                          <div className="admin-analytics-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Quiz</th>
                                  <th>Average</th>
                                  <th>Takers</th>
                                  <th>Passed</th>
                                </tr>
                              </thead>
                              <tbody>
                                {course.quizzes.map((quiz) => (
                                  <tr key={quiz.assessment_id}>
                                    <td>{quiz.title}</td>
                                    <td className="score-plain">
                                      {percent(quiz.avgScore)}
                                    </td>
                                    <td>{quiz.takers}</td>
                                    <td>{percent(quiz.passRate)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </Panel>
                      <Panel
                        title="Weak Topics"
                        subtitle="Reteach first: lowest mastery and most students below 60%"
                      >
                        {course.weakTopics.length === 0 ? (
                          <Empty>
                            Topic results appear once students take tagged
                            quizzes.
                          </Empty>
                        ) : (
                          course.weakTopics
                            .slice(0, 6)
                            .map((topic) => (
                              <Bar
                                key={topic.topicName}
                                label={topic.topicName}
                                value={topic.mastery}
                                note={`${topic.weakShare}% of ${topic.students} students below 60%`}
                                color="tone"
                              />
                            ))
                        )}
                      </Panel>
                      <Panel
                        title="Frequently Missed Questions"
                        subtitle="Less than 50% correct on the first attempt"
                      >
                        {course.quizzes.length === 0 ? (
                          <Empty>No quizzes in this course yet.</Empty>
                        ) : (
                          <label className="admin-analytics-field">
                            Quiz
                            <select
                              value={quizId ?? ""}
                              onChange={(event) => {
                                setQuizId(Number(event.target.value));
                                setOpenQuestion(null);
                                setShowAllQuestions(false);
                              }}
                            >
                              {course.quizzes.map((quiz) => (
                                <option
                                  key={quiz.assessment_id}
                                  value={quiz.assessment_id}
                                >
                                  {quiz.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {course.quizzes.length > 0 &&
                          (weakQuestions.length === 0 ? (
                            <Empty>
                              {allQuizQuestions.length === 0
                                ? "No answers for this quiz yet."
                                : "No question had less than 50% correct responses."}
                            </Empty>
                          ) : (
                            <div className="admin-analytics-question-list">
                              {visibleQuestions.map((item) => {
                                const key = `${item.assessment_id}-${item.number}`;
                                const isOpen = openQuestion === key;
                                return (
                                  <div
                                    className="admin-analytics-question"
                                    key={key}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenQuestion(isOpen ? null : key)
                                      }
                                    >
                                      <span>
                                        {item.number}. {item.question}
                                      </span>
                                      <strong>
                                        {item.correct} / {item.examinees}
                                        {isOpen ? (
                                          <ChevronUp size={16} />
                                        ) : (
                                          <ChevronDown size={16} />
                                        )}
                                      </strong>
                                    </button>
                                    {isOpen && (
                                      <div className="admin-analytics-question-details">
                                        <span>
                                          {Math.round(item.difficulty * 100)}%
                                          answered correctly
                                          {item.topicName
                                            ? ` · ${item.topicName}`
                                            : ""}
                                        </span>
                                        {item.topWrong && (
                                          <span>
                                            Most chosen wrong answer: “
                                            {item.topWrong}” (
                                            {item.topWrongShare}%)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {weakQuestions.length > 10 && (
                                <button
                                  type="button"
                                  className="admin-analytics-text-button"
                                  onClick={() =>
                                    setShowAllQuestions((value) => !value)
                                  }
                                >
                                  {showAllQuestions
                                    ? "Show fewer"
                                    : `Show all ${weakQuestions.length} questions`}
                                </button>
                              )}
                            </div>
                          ))}
                      </Panel>
                    </>
                  )}
                </div>
              )}

              {tab === "student" && (
                <div className="admin-analytics-stack">
                  <label className="admin-analytics-field student-select">
                    Student
                    <select
                      value={studentId ?? ""}
                      onChange={(event) =>
                        setStudentId(Number(event.target.value))
                      }
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} · Avg {percent(student.avgScore)} ·
                          Completion {percent(student.completion)}
                          {student.earlyWarning ||
                          (student.avgScore != null && student.avgScore < 60)
                            ? " · At risk"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!report ? (
                    <div className="admin-analytics-status">
                      {students.length
                        ? "Loading student report..."
                        : "No students found."}
                    </div>
                  ) : (
                    <>
                      <Panel className="admin-analytics-profile">
                        {report.student?.photo ? (
                          <img src={report.student.photo} alt="" />
                        ) : (
                          <span className="admin-analytics-avatar">
                            <Users size={28} />
                          </span>
                        )}
                        <div>
                          <h2>
                            {report.student?.name ?? selectedStudent?.name}
                          </h2>
                          {report.student?.degree && (
                            <p>{report.student.degree}</p>
                          )}
                          {report.student?.majorship && (
                            <p>Major: {report.student.majorship}</p>
                          )}
                        </div>
                      </Panel>
                      {selectedStudent?.earlyWarning && (
                        <div className="admin-analytics-warning">
                          <CircleAlert size={18} />
                          <span>
                            <strong>Early warning:</strong> Diagnostic score{" "}
                            {percent(selectedStudent.diagnosticScore)}, below{" "}
                            {diagnostic?.cutoff ?? 60}%. Additional support may
                            be needed.
                          </span>
                        </div>
                      )}
                      <div className="admin-analytics-metrics student-metrics">
                        <Metric
                          label="Average Score"
                          value={percent(report.summary.avgScore)}
                        />
                        <Metric
                          label="Completion"
                          value={percent(report.summary.completion)}
                        />
                        <Metric
                          label="Quizzes"
                          value={report.summary.quizzesTaken}
                          note={`Passed ${percent(report.summary.passRate)}`}
                        />
                      </div>
                      <Panel
                        title="Recommended Focus"
                        subtitle="Weakest topics below 75%"
                      >
                        {report.focus.length === 0 ? (
                          <Empty>
                            {report.topics.length === 0
                              ? "No quiz results yet."
                              : "No topic below 75%."}
                          </Empty>
                        ) : (
                          report.focus.map((topic) => (
                            <Bar
                              key={topic.topicName}
                              label={topic.topicName}
                              value={topic.mastery}
                              note={topic.majorName ?? undefined}
                              color="tone"
                            />
                          ))
                        )}
                      </Panel>
                      <Panel title="Topic Strengths">
                        {report.topics.length === 0 ? (
                          <Empty>No quiz results yet.</Empty>
                        ) : (
                          Object.entries(
                            report.topics.reduce((groups, topic) => {
                              const major = topic.majorName ?? "Other";
                              (groups[major] ??= []).push(topic);
                              return groups;
                            }, {}),
                          ).map(([major, topics]) => (
                            <div
                              className="admin-analytics-topic-group"
                              key={major}
                            >
                              <h3>{major}</h3>
                              {topics.map((topic) => (
                                <Bar
                                  key={topic.topicName}
                                  label={topic.topicName}
                                  value={topic.mastery}
                                  color="tone"
                                />
                              ))}
                            </div>
                          ))
                        )}
                      </Panel>
                      <Panel title="Course Progress">
                        {report.courses.map((item) => (
                          <Bar
                            key={item.course_id}
                            label={item.courseName}
                            value={item.percent}
                          />
                        ))}
                      </Panel>
                      <Panel
                        title="Quiz History"
                        subtitle="Latest attempt per quiz"
                      >
                        {report.courses.every(
                          (item) => item.quizzes.length === 0,
                        ) ? (
                          <Empty>No quizzes taken yet.</Empty>
                        ) : (
                          <div className="admin-analytics-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Quiz</th>
                                  <th>Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.courses.flatMap((item) =>
                                  item.quizzes.map((quiz, index) => (
                                    <tr key={`${item.course_id}-${index}`}>
                                      <td>
                                        {quiz.title}
                                        <small>
                                          {item.courseName} ·{" "}
                                          {dateLabel(quiz.date)}
                                          {quiz.attempts > 1
                                            ? ` · ${quiz.attempts} attempts`
                                            : ""}
                                        </small>
                                      </td>
                                      <td
                                        className={`score-${scoreTone(quiz.pct)}`}
                                      >
                                        {percent(quiz.pct)}
                                      </td>
                                    </tr>
                                  )),
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </Panel>
                    </>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

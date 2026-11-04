import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Lightbulb,
  Target,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import UserTopbar from "../components/UserTopbar";
import {
  courseTopicsInsight,
  coursesInsight,
  focusInsight,
  progressInsight,
  recentInsight,
  trendInsight,
} from "../lib/insights";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const NAVY = "#0D2A94";
const GREEN = "#2e7d32";

const pct = (value) => (value == null ? "—" : `${Math.round(Number(value))}%`);
const shortDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";
// Same colors and cutoffs as the mobile app
const barColor = (value) =>
  value == null
    ? "#BDC3C7"
    : value >= 75
      ? "#4CD964"
      : value >= 60
        ? "#FFB800"
        : "#FF4D4D";

function CardTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {Icon && <Icon size={18} color={NAVY} />}
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a2e" }}>
          {title}
        </span>
      </div>
      {subtitle && (
        <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Same layout as the mobile app: label, bar, percentage on one line
function BarRow({ label, value, note }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            flex: 3,
            minWidth: 0,
            fontSize: "13px",
            fontWeight: 500,
            color: "#34495E",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
        <div style={{ flex: 4, padding: "0 8px" }}>
          <div
            style={{
              height: "8px",
              backgroundColor: "#ECF0F1",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${width}%`,
                backgroundColor: barColor(value),
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
        <span
          style={{
            flex: 1.2,
            textAlign: "right",
            fontSize: "13px",
            fontWeight: 600,
            color: "#2C3E50",
          }}
        >
          {pct(value)}
        </span>
      </div>
      {note && (
        <div style={{ fontSize: "11px", color: "#7F8C8D", marginTop: "2px" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function Insight({ text }) {
  if (!text) return null;
  return (
    <div
      style={{
        marginTop: "14px",
        padding: "10px 14px",
        borderRadius: "8px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E3E8F4",
        borderLeft: "4px solid #0D2A94",
        color: "#1a2a5e",
        fontSize: "12px",
        lineHeight: 1.55,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <Lightbulb size={14} color="#D4A017" />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#0D2A94",
          }}
        >
          INSIGHT
        </span>
      </div>
      <span>{text}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <p
      style={{
        fontSize: "13px",
        color: "#888",
        fontStyle: "italic",
        margin: 0,
      }}
    >
      {text}
    </p>
  );
}

function StatCard({ icon: Icon, tint, color, label, value, note }) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: tint,
          padding: "12px",
          borderRadius: "10px",
          color,
          display: "flex",
        }}
      >
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: "12px", color: "#777", fontWeight: "500" }}>
          {label}
        </div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e" }}>
          {value}
        </div>
        {note && <div style={{ fontSize: "11px", color: "#999" }}>{note}</div>}
      </div>
    </div>
  );
}

function ColumnChart({ quizzes }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        height: "170px",
        padding: "0 4px",
        borderBottom: "1px solid #eee",
      }}
    >
      {quizzes.map((q, i) => {
        const value = Math.max(0, Math.min(100, Number(q.pct) || 0));
        return (
          <div
            key={i}
            title={`${q.title}: ${pct(q.pct)}`}
            style={{
              flex: 1,
              maxWidth: "48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "700", color: NAVY }}>
              {pct(q.pct)}
            </span>
            <div
              style={{
                width: "100%",
                height: `${Math.max(value, 2)}%`,
                backgroundColor: barColor(q.pct),
                borderRadius: "6px 6px 0 0",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [courseId, setCourseId] = useState(null);

  useEffect(() => {
    supabase
      .rpc("get_my_analytics")
      .then(({ data: report, error: loadError }) => {
        if (loadError) {
          setError(loadError.message);
          return;
        }
        setData(report);
        setCourseId(report?.courses?.[0]?.course_id ?? null);
      });
  }, []);

  const summary = data?.summary;
  const course = data?.courses?.find((c) => c.course_id === courseId) ?? null;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Analytics" />

        <div
          className="dashboard-content"
          style={{ flexDirection: "column", gap: "20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1a1a2e",
                  margin: 0,
                }}
              >
                My Performance
              </h2>
              <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>
                Your course progress, quiz scores, and the topics to review
                next.
              </p>
            </div>
            <div
              role="tablist"
              style={{
                display: "flex",
                gap: "8px",
                background: "#eef2ff",
                padding: "4px",
                borderRadius: "8px",
              }}
            >
              {[
                ["overview", "Overview"],
                ["course", "By Course"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  style={{
                    border: "none",
                    background: tab === key ? NAVY : "transparent",
                    color: tab === key ? "#fff" : "#555",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
              {error}
            </p>
          ) : !data ? (
            <div className="card">
              <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                Loading your performance...
              </p>
            </div>
          ) : tab === "overview" ? (
            <>
              <div className="card">
                <CardTitle
                  icon={Award}
                  title="Road to LPT Passer"
                  subtitle="Your progress across all courses"
                />
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "10px",
                      backgroundColor: "#E0E0E0",
                      borderRadius: "5px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${summary.completion ?? 0}%`,
                        backgroundColor: NAVY,
                        borderRadius: "5px",
                      }}
                    />
                  </div>
                  <span
                    style={{ fontSize: "14px", fontWeight: "700", color: NAVY }}
                  >
                    {pct(summary.completion ?? 0)}
                  </span>
                </div>
                <Insight text={progressInsight(summary)} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <StatCard
                  icon={Target}
                  tint="#e8f5e9"
                  color={GREEN}
                  label="Average Score"
                  value={pct(summary.avgScore)}
                  note={`${summary.quizzesTaken} ${summary.quizzesTaken === 1 ? "quiz" : "quizzes"}`}
                />
                <StatCard
                  icon={BookOpen}
                  tint="#e0f2fe"
                  color="#0284c7"
                  label="Completed Courses"
                  value={`${summary.completedCourses} / ${summary.totalCourses}`}
                />
                <StatCard
                  icon={CalendarCheck}
                  tint="#f3e8ff"
                  color="#9333ea"
                  label="Review Frequency"
                  value={`${summary.activeDays} ${summary.activeDays === 1 ? "day" : "days"}`}
                  note="active this week"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px",
                  alignItems: "start",
                }}
              >
                <div className="card">
                  <CardTitle
                    icon={BarChart3}
                    title="Overall Performance by Course"
                  />
                  {data.courses.length === 0 ? (
                    <Empty text="No courses yet." />
                  ) : (
                    data.courses.map((c) => (
                      <BarRow
                        key={c.course_id}
                        label={c.courseName}
                        value={c.percent}
                      />
                    ))
                  )}
                  <Insight text={coursesInsight(data.courses)} />
                </div>

                <div className="card">
                  <CardTitle
                    icon={TrendingDown}
                    title="Focus Next"
                    subtitle="Your weakest topics so far"
                  />
                  {data.focus.length === 0 ? (
                    <Empty
                      text={
                        data.topics.length === 0
                          ? "Take a quiz to see your strengths and weak areas."
                          : "Great work! No topic is below 75%."
                      }
                    />
                  ) : (
                    data.focus.map((t) => (
                      <BarRow
                        key={t.topicName}
                        label={t.topicName}
                        value={t.mastery}
                        note={t.majorName}
                      />
                    ))
                  )}
                  <Insight text={focusInsight(data.focus, data.topics)} />
                </div>
              </div>

              <div className="card">
                <CardTitle title="Recent Quiz Results" />
                {data.recent.length === 0 ? (
                  <Empty text="No quizzes taken yet." />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            textAlign: "left",
                            color: "#95A5A6",
                            fontSize: "11px",
                          }}
                        >
                          <th
                            style={{
                              padding: "0 8px 8px 0",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            Course
                          </th>
                          <th
                            style={{
                              padding: "0 8px 8px",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            Quiz Title
                          </th>
                          <th
                            style={{
                              padding: "0 8px 8px",
                              borderBottom: "1px solid #eee",
                              textAlign: "center",
                            }}
                          >
                            Grade
                          </th>
                          <th
                            style={{
                              padding: "0 0 8px 8px",
                              borderBottom: "1px solid #eee",
                              textAlign: "right",
                            }}
                          >
                            Date Taken
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent.map((q, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: "1px solid #f5f5f5" }}
                          >
                            <td
                              style={{
                                padding: "10px 8px 10px 0",
                                color: NAVY,
                              }}
                            >
                              {q.courseName}
                            </td>
                            <td
                              style={{ padding: "10px 8px", color: "#34495E" }}
                            >
                              {q.title}
                            </td>
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                fontWeight: "700",
                                color: NAVY,
                              }}
                            >
                              {pct(q.pct)}
                            </td>
                            <td
                              style={{
                                padding: "10px 0 10px 8px",
                                textAlign: "right",
                                color: "#888",
                              }}
                            >
                              {shortDate(q.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Insight text={recentInsight(data.recent)} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {data.courses.map((c) => {
                  const active = c.course_id === courseId;
                  return (
                    <button
                      key={c.course_id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCourseId(c.course_id)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "20px",
                        border: `1px solid ${NAVY}`,
                        backgroundColor: active ? NAVY : "#fff",
                        color: active ? "#fff" : NAVY,
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {c.courseName}
                    </button>
                  );
                })}
              </div>

              {course && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  <div className="card">
                    <CardTitle
                      icon={BarChart3}
                      title={`${course.courseName} Performance Trend`}
                      subtitle="Your latest score per quiz"
                    />
                    {course.quizzes.length === 0 ? (
                      <Empty text="No quizzes taken in this course yet." />
                    ) : (
                      <>
                        <ColumnChart quizzes={course.quizzes} />
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            padding: "4px 4px 10px",
                          }}
                        >
                          {course.quizzes.map((_, i) => (
                            <span
                              key={i}
                              style={{
                                flex: 1,
                                maxWidth: "48px",
                                textAlign: "center",
                                fontSize: "11px",
                                color: "#888",
                              }}
                            >
                              Q{i + 1}
                            </span>
                          ))}
                        </div>
                        {course.quizzes.map((q, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: "12px",
                              color: "#777",
                              marginTop: "4px",
                            }}
                          >
                            Q{i + 1} · {q.title}
                            {q.attempts > 1 ? ` (${q.attempts} attempts)` : ""}
                          </div>
                        ))}
                        <Insight text={trendInsight(course.quizzes)} />
                      </>
                    )}
                  </div>

                  <div className="card">
                    <CardTitle
                      icon={TrendingDown}
                      title="Topics Needing Review"
                      subtitle="Lowest scores first"
                    />
                    {course.topics.length === 0 ? (
                      <Empty text="Topic results appear after your first quiz in this course." />
                    ) : (
                      course.topics.map((t) => (
                        <BarRow
                          key={t.topicName}
                          label={t.topicName}
                          value={t.mastery}
                        />
                      ))
                    )}
                    <Insight text={courseTopicsInsight(course.topics)} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

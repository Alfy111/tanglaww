import {
    ArrowRight,
    CheckCircle2,
    Clock,
    TrendingUp,
    User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

export async function getMyStudent() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("student")
    .select(
      "id, firstName, lastName, email, bachelorsDegree, profilephotourl, bannerphotourl",
    )
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!data) return null;

  const { data: enrollment } = await supabase
    .from("enrollment")
    .select(
      `
      curriculum!enrollment_curriculum_id_fkey ("curriculumName"),
      specialization!enrollment_specialization_id_fkey ("specializationName")
    `,
    )
    .eq("student_id", data.id)
    .order("enrollment_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const first = (v) => (Array.isArray(v) ? v[0] : v);
  return {
    ...data,
    curriculumName: first(enrollment?.curriculum)?.curriculumName ?? null,
    specializationName:
      first(enrollment?.specialization)?.specializationName ?? null,
  };
}

export async function getMyCourseProgress() {
  const { data, error } = await supabase.rpc("get_my_course_progress");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function summarizeProgress(courses) {
  const applicable = courses.filter((c) => c.lockReason !== "not_applicable");
  const sum = (key) =>
    applicable.reduce((total, c) => total + (Number(c[key]) || 0), 0);
  const completed = sum("completed");
  const total = sum("total");
  return {
    percent: pct(completed, total),
    completed,
    total,
    handoutsDone: sum("handoutsDone"),
    handoutsTotal: sum("handoutsTotal"),
    sessionsDone: sum("sessionsDone"),
    sessionsTotal: sum("sessionsTotal"),
    quizzesDone: sum("quizzesDone"),
    quizzesTotal: sum("quizzesTotal"),
  };
}

function ProgressRing({ percent }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="progress-ring-container">
      <svg
        width="96"
        height="96"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${percent}% complete`}
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e8eaf6"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#0D2A94"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="#0D2A94"
        >
          {percent}%
        </text>
      </svg>
    </div>
  );
}

function MetricRow({ label, done, total, color }) {
  return (
    <div className="metric-row">
      <div className="metric-info">
        <span>{label}</span>
        <strong>
          {done}/{total}
        </strong>
      </div>
      <div className="metric-bar-bg">
        <div
          className="metric-bar-fill"
          style={{ width: `${pct(done, total)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ProfileCard({ student }) {
  const fullName =
    `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim();
  return (
    <div className="card">
      <div
        className="profile-banner"
        style={
          student?.bannerphotourl
            ? {
                backgroundImage: `url(${student.bannerphotourl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="profile-avatar" style={{ overflow: "hidden" }}>
        {student?.profilephotourl ? (
          <img
            src={student.profilephotourl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <User size={32} color="#9e9e9e" />
        )}
      </div>
      <div className="profile-name">{fullName.toUpperCase() || "—"}</div>
      <div className="profile-degree">
        {student?.curriculumName ?? student?.bachelorsDegree ?? ""}
      </div>
      {student?.specializationName &&
        !/^none/i.test(student.specializationName) && (
          <div className="profile-degree">{student.specializationName}</div>
        )}
      <div className="profile-email">{student?.email ?? ""}</div>
    </div>
  );
}

export function ReviewProgressCard({ summary, loading }) {
  const navigate = useNavigate();
  const open = () => navigate("/dashboard/Analytics");
  return (
    <div
      className="card analytics-card"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
    >
      <div
        className="analytics-header"
        style={{ justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <TrendingUp size={16} color="#0D2A94" />
          <span className="analytics-title">Review Progress</span>
        </div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#0D2A94",
            display: "flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          View Insights <ArrowRight size={12} />
        </div>
      </div>

      {loading || !summary ? (
        <p style={{ fontSize: "12px", color: "#888" }}>Loading progress...</p>
      ) : (
        <>
          <div className="progress-ring-wrap">
            <ProgressRing percent={summary.percent} />
            <div className="readiness-tag">
              <CheckCircle2 size={12} color="#2e7d32" />
              <span>
                {summary.completed} of {summary.total} items complete
              </span>
            </div>
          </div>
          <div className="analytics-metrics">
            <MetricRow
              label="Handouts"
              done={summary.handoutsDone}
              total={summary.handoutsTotal}
              color="#0D2A94"
            />
            <MetricRow
              label="Recorded Sessions"
              done={summary.sessionsDone}
              total={summary.sessionsTotal}
              color="#2F80ED"
            />
            <MetricRow
              label="Quizzes"
              done={summary.quizzesDone}
              total={summary.quizzesTotal}
              color="#2e7d32"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function UpcomingSessionsCard() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    supabase
      .from("calendar_events")
      .select("event_id, title, link, event_date")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(3)
      .then(({ data }) => setSessions(data ?? []));
  }, []);

  const join = (session) => {
    const url = /^https?:\/\//i.test(session.link)
      ? session.link
      : `https://${session.link}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "12px",
        }}
      >
        <Clock size={16} color="#0D2A94" />
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e" }}>
          Upcoming Sessions
        </span>
      </div>
      {sessions.length === 0 ? (
        <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
          No upcoming sessions.
        </p>
      ) : (
        sessions.map((s) => {
          const date = new Date(s.event_date);
          return (
            <div key={s.event_id} className="deadline-item">
              <div className="deadline-title">{s.title}</div>
              <div className="deadline-meta">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              {s.link && (
                <button
                  type="button"
                  className="deadline-link"
                  onClick={() => join(s)}
                >
                  Join session →
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

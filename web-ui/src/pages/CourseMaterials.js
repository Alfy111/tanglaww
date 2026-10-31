import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileText,
    Lightbulb,
    Lock,
    LogIn,
    Play,
    Share2,
    Video,
    VideoOff,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import PdfScrollViewer from "../components/PdfScrollViewer";
import Sidebar from "../components/Sidebar";
import {
    getMyCourseProgress,
    getMyStudent,
} from "../components/StudentSidePanel";
import UserTopbar from "../components/UserTopbar";
import {
    formatBytes,
    formatDate,
    getCourseMaterials,
    getCourseName,
} from "../lib/materials";
import {
    SEGMENT_SECONDS,
    VIDEO_COMPLETION_THRESHOLD,
    getCompletedMaterialIds,
    getTotalViewSeconds,
    getWatchedSegments,
    loadYouTubeApi,
    markMaterialCompleted,
    recordMaterialView,
    requiredViewSeconds,
    videoCoverage,
} from "../lib/studentProgress";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const NAVY = "#0D2A94";
const POLL_MS = 3000;
const MAX_CONTINUOUS_JUMP_SECONDS = (POLL_MS / 1000) * 2.5;

const TABS = [
  { key: "handouts", label: "Learning Modules", icon: FileText },
  { key: "sessions", label: "Recorded Sessions", icon: Video },
  { key: "quizzes", label: "Quiz", icon: Lightbulb },
  { key: "online", label: "Online Sessions", icon: Share2 },
];

const LOCK_MESSAGES = {
  payment: "Please settle the remaining balance to access this course.",
  access: "Your enrollment is not active. Please contact the admin.",
  not_applicable: "This course is not part of your program.",
};

const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 14px",
  borderRadius: "8px",
  border: `1px solid ${NAVY}`,
  backgroundColor: "#fff",
  color: NAVY,
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "none",
};

const formatClock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const downloadUrl = (url) => `${url}${url.includes("?") ? "&" : "?"}download=`;

function DoneBadge({ done }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "12px",
        fontWeight: "600",
        color: done ? "#1E9E5A" : "#A0A7B4",
        marginTop: "4px",
      }}
    >
      {done ? <CheckCircle2 size={14} /> : <Clock size={14} />}
      {done ? "Completed" : "Not completed yet"}
    </span>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        padding: "48px 0",
        color: "#999",
        textAlign: "center",
      }}
    >
      <Icon size={48} color="#BDC3C7" />
      <span style={{ fontSize: "14px" }}>{text}</span>
    </div>
  );
}

function ViewerShell({ title, hint, onClose, footer, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "#111",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 18px",
          backgroundColor: NAVY,
          color: "#fff",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            border: 0,
            background: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            padding: 4,
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          {hint && (
            <div style={{ fontSize: "12px", color: "#c7d2fe" }}>{hint}</div>
          )}
        </div>
        <button
          type="button"
          aria-label="Close viewer"
          onClick={onClose}
          style={{
            border: 0,
            background: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            padding: 4,
          }}
        >
          <X size={22} />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

function DocumentViewer({
  material,
  studentId,
  alreadyCompleted,
  onClose,
  onCompleted,
}) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef(new Date());
  const activeRef = useRef(0);
  const saved = useRef(false);
  const tracking = !!studentId;
  const isPdf = (material.fileType || "").toLowerCase() === "pdf";

  useEffect(() => {
    if (!tracking) return undefined;
    recordMaterialView(
      studentId,
      material.material_id,
      startedAt.current,
      0,
    ).catch(() => {});
    getTotalViewSeconds(studentId, material.material_id)
      .then(setPrevious)
      .catch(() => setPrevious(0));
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        activeRef.current += 1;
        setActive(activeRef.current);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      if (!saved.current && activeRef.current > 0) {
        recordMaterialView(
          studentId,
          material.material_id,
          startedAt.current,
          activeRef.current,
        ).catch(() => {});
      }
    };
  }, [tracking, studentId, material.material_id]);

  const complete = async () => {
    if (!tracking || completed || saved.current) return;
    setSaving(true);
    setError("");
    try {
      saved.current = true;
      const total = await recordMaterialView(
        studentId,
        material.material_id,
        startedAt.current,
        activeRef.current,
      );
      await markMaterialCompleted(
        material.material_id,
        "scrolled_to_end",
        total,
      );
      setCompleted(true);
      onCompleted(material.material_id);
    } catch (err) {
      saved.current = false;
      setError(err.message ?? "Could not save your progress.");
    } finally {
      setSaving(false);
    }
  };

  const required = requiredViewSeconds(material.fileSize);
  const remaining =
    previous == null ? required : Math.max(0, required - previous - active);

  const footer = tracking && (completed || saving || error || !isPdf) && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        padding: "12px 18px",
        backgroundColor: "#fff",
        borderTop: "1px solid #ddd",
      }}
    >
      <span style={{ fontSize: "13px", color: completed ? "#1E9E5A" : "#555" }}>
        {completed
          ? "You've completed this module."
          : saving
            ? "Saving your progress..."
            : remaining > 0
              ? `Keep reading. You can mark this as finished in ${formatClock(remaining)}.`
              : "Done reading? Mark it as finished."}
      </span>
      {error && (
        <span role="alert" style={{ fontSize: "12px", color: "#E74C3C" }}>
          {error}
        </span>
      )}
      {!completed && !isPdf && (
        <button
          type="button"
          disabled={remaining > 0 || saving}
          onClick={complete}
          style={{
            ...actionButton,
            backgroundColor: remaining > 0 ? "#E0E4EF" : NAVY,
            color: remaining > 0 ? "#888" : "#fff",
            borderColor: remaining > 0 ? "#E0E4EF" : NAVY,
            cursor: remaining > 0 ? "not-allowed" : "pointer",
          }}
        >
          <CheckCircle2 size={16} />{" "}
          {saving ? "Saving..." : "I've finished reading"}
        </button>
      )}
    </div>
  );

  return (
    <ViewerShell
      title={material.title}
      hint={
        tracking
          ? completed
            ? "Completed"
            : "Read to the end to complete"
          : null
      }
      onClose={onClose}
      footer={footer}
    >
      {isPdf ? (
        <PdfScrollViewer url={material.fileUrl} onReachedBottom={complete} />
      ) : (
        <iframe
          title={material.title}
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(material.fileUrl)}&embedded=true`}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            backgroundColor: "#fff",
          }}
        />
      )}
    </ViewerShell>
  );
}

function VideoPlayer({
  session,
  studentId,
  alreadyCompleted,
  onClose,
  onCompleted,
}) {
  const holder = useRef(null);
  const player = useRef(null);
  const watched = useRef(new Set());
  const lastPos = useRef(null);
  const mediaDuration = useRef(0);
  const playMs = useRef(0);
  const resumedAt = useRef(null);
  const startedAt = useRef(null);
  const playing = useRef(false);
  const finished = useRef(false);
  const [coverage, setCoverage] = useState(0);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const tracking = !!studentId;
  const percentNeeded = Math.round(VIDEO_COMPLETION_THRESHOLD * 100);

  const startClock = () => {
    if (
      !tracking ||
      resumedAt.current !== null ||
      document.visibilityState !== "visible"
    )
      return;
    resumedAt.current = Date.now();
    if (!startedAt.current) startedAt.current = new Date();
  };
  const pauseClock = () => {
    if (resumedAt.current === null) return;
    playMs.current += Date.now() - resumedAt.current;
    resumedAt.current = null;
  };

  const sample = useCallback(() => {
    const p = player.current;
    if (!tracking || !p?.getCurrentTime) return;
    const current = p.getCurrentTime();
    const duration = p.getDuration();
    if (duration > 0) mediaDuration.current = duration;
    const last = lastPos.current;
    if (
      last !== null &&
      current >= last &&
      current - last <= MAX_CONTINUOUS_JUMP_SECONDS
    ) {
      const from = Math.floor(last / SEGMENT_SECONDS);
      const to = Math.floor(current / SEGMENT_SECONDS);
      for (let s = from; s <= to; s++) watched.current.add(s);
    }
    lastPos.current = current;
    setCoverage(videoCoverage(watched.current, mediaDuration.current));
  }, [tracking]);

  const finalize = useCallback(async () => {
    if (finished.current || !tracking || !startedAt.current) return;
    finished.current = true;
    pauseClock();
    sample();
    try {
      const total = await recordMaterialView(
        studentId,
        session.material_id,
        startedAt.current,
        playMs.current / 1000,
        {
          watchedSegments: Array.from(watched.current).sort((a, b) => a - b),
          mediaDurationSeconds: Math.round(mediaDuration.current),
        },
      );
      if (mediaDuration.current <= 0 || alreadyCompleted) return;
      const all = await getWatchedSegments(studentId, session.material_id);
      if (
        videoCoverage(all, mediaDuration.current) >= VIDEO_COMPLETION_THRESHOLD
      ) {
        await markMaterialCompleted(
          session.material_id,
          "video_watched",
          total,
        );
        setCompleted(true);
        onCompleted(session.material_id);
      }
    } catch (err) {
      console.warn("[sessions] saving watch progress failed", err);
    }
  }, [
    tracking,
    studentId,
    session.material_id,
    alreadyCompleted,
    onCompleted,
    sample,
  ]);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !holder.current) return;
      player.current = new YT.Player(holder.current, {
        videoId: session.youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (event) => {
            if (event.data === 1) {
              playing.current = true;
              startClock();
              if (tracking && !startedAt.current)
                startedAt.current = new Date();
            } else if (event.data === 3) {
              playing.current = false;
              pauseClock();
            } else if (event.data === 2 || event.data === 0) {
              playing.current = false;
              sample();
              pauseClock();
            }
          },
        },
      });
    });

    const timer = window.setInterval(() => {
      if (playing.current) sample();
    }, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (playing.current) startClock();
      } else pauseClock();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      finalize();
      player.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.youtubeId]);

  const close = async () => {
    await finalize();
    onClose();
  };

  return (
    <ViewerShell
      title={session.title}
      hint={
        tracking
          ? completed
            ? "Completed"
            : `Watch at least ${percentNeeded}% to complete · ${Math.round(coverage * 100)}% watched this time`
          : null
      }
      onClose={close}
    >
      <div
        style={{
          width: "min(100%, calc((100vh - 120px) * 16 / 9))",
          aspectRatio: "16 / 9",
          backgroundColor: "#000",
        }}
      >
        <div ref={holder} style={{ width: "100%", height: "100%" }} />
      </div>
    </ViewerShell>
  );
}

function HandoutsSection({ courseId, studentId }) {
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    getCourseMaterials(courseId, "handout")
      .then(async (rows) => {
        setItems(rows);
        if (studentId)
          setDone(
            await getCompletedMaterialIds(
              studentId,
              rows.map((r) => r.material_id),
            ),
          );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId, studentId]);

  const markDone = useCallback(
    (id) => setDone((prev) => new Set(prev).add(id)),
    [],
  );

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;
  return (
    <>
      {error && (
        <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <Empty icon={FileText} text="No learning modules yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => (
            <div
              key={item.material_id}
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #E8ECF4",
                backgroundColor: "#F8F9FC",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  flexShrink: 0,
                  borderRadius: "10px",
                  backgroundColor: "#fff",
                  border: "1px solid #E0E4EF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText
                  size={24}
                  color={
                    (item.fileType || "").toLowerCase() === "pdf"
                      ? "#E74C3C"
                      : "#2F80ED"
                  }
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1A1A2E",
                    wordBreak: "break-word",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#95A5A6",
                    marginTop: "2px",
                  }}
                >
                  {formatBytes(item.fileSize)} · {formatDate(item.uploadedAt)}
                </div>
                {studentId && <DoneBadge done={done.has(item.material_id)} />}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    style={actionButton}
                    onClick={() => setViewing(item)}
                  >
                    <Eye size={15} /> View
                  </button>
                  {item.isDownloadable && (
                    <a
                      href={downloadUrl(item.fileUrl)}
                      download
                      style={actionButton}
                    >
                      <Download size={15} /> Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {viewing && (
        <DocumentViewer
          material={viewing}
          studentId={studentId}
          alreadyCompleted={done.has(viewing.material_id)}
          onClose={() => setViewing(null)}
          onCompleted={markDone}
        />
      )}
    </>
  );
}

function SessionsSection({ courseId, studentId }) {
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watching, setWatching] = useState(null);

  useEffect(() => {
    getCourseMaterials(courseId, "recorded_session")
      .then(async (rows) => {
        setItems(rows);
        if (studentId)
          setDone(
            await getCompletedMaterialIds(
              studentId,
              rows.map((r) => r.material_id),
            ),
          );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId, studentId]);

  const markDone = useCallback(
    (id) => setDone((prev) => new Set(prev).add(id)),
    [],
  );

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;
  return (
    <>
      {error && (
        <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <Empty icon={VideoOff} text="No recorded sessions yet." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {items.map((item) => (
            <div
              key={item.material_id}
              style={{
                borderRadius: "12px",
                border: "1px solid #E8ECF4",
                overflow: "hidden",
                backgroundColor: "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => item.youtubeId && setWatching(item)}
                aria-label={`Watch ${item.title}`}
                style={{
                  position: "relative",
                  display: "block",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  border: 0,
                  padding: 0,
                  cursor: item.youtubeId ? "pointer" : "default",
                  backgroundColor: "#000",
                }}
              >
                {item.youtubeId && (
                  <img
                    src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.85,
                    }}
                  />
                )}
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(13,42,148,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Play size={26} color="#fff" fill="#fff" />
                  </span>
                </span>
              </button>
              <div style={{ padding: "12px 14px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1A1A2E",
                    wordBreak: "break-word",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#95A5A6",
                    marginTop: "2px",
                  }}
                >
                  {formatDate(item.uploadedAt)}
                </div>
                {studentId && <DoneBadge done={done.has(item.material_id)} />}
              </div>
            </div>
          ))}
        </div>
      )}
      {watching && (
        <VideoPlayer
          session={watching}
          studentId={studentId}
          alreadyCompleted={done.has(watching.material_id)}
          onClose={() => setWatching(null)}
          onCompleted={markDone}
        />
      )}
    </>
  );
}

function OnlineSection({ courseId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("calendar_events")
      .select("event_id, title, link, description, event_date")
      .eq("course_id", courseId)
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [courseId]);

  const join = (s) => {
    if (
      !window.confirm(`You will be redirected to join "${s.title}". Continue?`)
    )
      return;
    const url = /^https?:\/\//i.test(s.link) ? s.link : `https://${s.link}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;
  if (sessions.length === 0)
    return <Empty icon={VideoOff} text="No online sessions yet." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {sessions.map((s) => {
        const upcoming = new Date(s.event_date) >= new Date();
        const tone = upcoming ? NAVY : "#BDC3C7";
        return (
          <div
            key={s.event_id}
            style={{
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #E8ECF4",
              backgroundColor: "#F8F9FC",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                flexShrink: 0,
                borderRadius: "10px",
                backgroundColor: "#fff",
                border: "1px solid #E0E4EF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Video size={24} color={tone} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1A1A2E",
                }}
              >
                {s.title}
              </div>
              <div
                style={{ fontSize: "11px", color: "#95A5A6", marginTop: "2px" }}
              >
                {new Date(s.event_date).toLocaleString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {!upcoming && " · Ended"}
              </div>
              {s.description && (
                <div
                  style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}
                >
                  {s.description}
                </div>
              )}
              {s.link && (
                <button
                  type="button"
                  onClick={() => join(s)}
                  style={{
                    ...actionButton,
                    marginTop: "10px",
                    borderColor: tone,
                    color: tone,
                  }}
                >
                  <LogIn size={14} /> Join Session
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const QUIZ_STATUS = {
  Open: { bg: "#E3F6EC", text: "#1E9E5A" },
  Closed: { bg: "#FDECEA", text: "#C0392B" },
};

const formatDue = (iso) => {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  return `Due: ${d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" })}, ${d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatQuizScore = (n) => String(Number(Number(n).toFixed(2)));

function QuizzesSection({ courseId, courseTitle }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.rpc("get_student_quiz_list", { p_course_id: Number(courseId) }),
      supabase.rpc("get_diagnostic_quiz"),
    ]).then(([list, diag]) => {
      if (list.error) setError(list.error.message);
      const diagModule = diag.data?.module_id ?? null;
      setQuizzes(
        (list.data ?? [])
          .filter((q) => q.module_id !== diagModule)
          .map((q) => ({
            ...q,
            status: q.isClosed ? "Closed" : "Open",
            maxScore: Number(q.maxScore),
            latestScore: q.latestScore === null ? null : Number(q.latestScore),
          })),
      );
      setLoading(false);
    });
  }, [courseId]);

  if (loading) return <p style={{ color: "#999" }}>Loading...</p>;
  return (
    <>
      {error && (
        <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
          {error}
        </p>
      )}
      {quizzes.length === 0 ? (
        <Empty icon={Lightbulb} text="No quizzes yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {quizzes.map((q) => {
            const taken = q.latestScore != null;
            const colors = QUIZ_STATUS[q.status];
            return (
              <button
                key={q.assessment_id}
                type="button"
                onClick={() =>
                  navigate(`/dashboard/quiz/${q.assessment_id}`, {
                    state: { courseId, courseTitle },
                  })
                }
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  width: "100%",
                  textAlign: "left",
                  padding: "16px",
                  borderRadius: "10px",
                  border: 0,
                  backgroundColor: "#EEF1F6",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: "15px", fontWeight: "600", color: NAVY }}
                  >
                    {q.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#1A1A2E",
                      marginTop: "4px",
                    }}
                  >
                    {formatDue(q.deadline)}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#6B7280",
                      marginTop: "4px",
                    }}
                  >
                    Attempts used: {q.attemptsUsed} of {q.maxAttempts}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "4px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: taken ? "#1E9E5A" : "#A0A7B4",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {taken
                      ? "Completed"
                      : q.status === "Closed"
                        ? "Missed"
                        : "Not taken yet"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "11px", color: NAVY }}>Score</span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#1A1A2E",
                      marginTop: "2px",
                    }}
                  >
                    {taken ? formatQuizScore(q.latestScore) : "?"} /{" "}
                    {q.maxScore}
                  </span>
                  {q.status === "Closed" && (
                    <>
                      <span
                        style={{
                          marginTop: "6px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        Closed
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#C0392B",
                          marginTop: "4px",
                        }}
                      >
                        {q.pastDeadline ? "Past deadline" : "Closed by admin"}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function CourseMaterials() {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = TABS.some((t) => t.key === searchParams.get("section"))
    ? searchParams.get("section")
    : "handouts";
  const [courseName, setCourseName] = useState(
    location.state?.courseTitle ?? "",
  );
  const [student, setStudent] = useState(null);
  const [lockReason, setLockReason] = useState(undefined);

  useEffect(() => {
    if (!courseName) getCourseName(courseId).then(setCourseName);
    getMyStudent().then(setStudent);
    getMyCourseProgress()
      .then((rows) =>
        setLockReason(
          rows.find((r) => String(r.course_id) === String(courseId))
            ?.lockReason ?? null,
        ),
      )
      .catch(() => setLockReason(null));
  }, [courseId, courseName]);

  const studentId = student?.id ?? null;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title={courseName || "Course"} />
        <div
          style={{
            padding: "28px 32px",
            maxWidth: "1000px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/dashboard/courses")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: 0,
              background: "none",
              color: NAVY,
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              padding: 0,
              marginBottom: "16px",
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={16} /> All courses
          </button>

          <div
            role="tablist"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = section === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    setSearchParams(
                      { section: key },
                      { replace: true, state: location.state },
                    )
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: `1px solid ${NAVY}`,
                    backgroundColor: active ? NAVY : "#fff",
                    color: active ? "#fff" : NAVY,
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </div>

          <div className="card">
            {lockReason === undefined ? (
              <p style={{ color: "#999", margin: 0 }}>Loading...</p>
            ) : lockReason ? (
              <Empty
                icon={Lock}
                text={
                  LOCK_MESSAGES[lockReason] ??
                  "Finish the previous course to unlock this one."
                }
              />
            ) : section === "handouts" ? (
              <HandoutsSection courseId={courseId} studentId={studentId} />
            ) : section === "sessions" ? (
              <SessionsSection courseId={courseId} studentId={studentId} />
            ) : section === "online" ? (
              <OnlineSection courseId={courseId} />
            ) : (
              <QuizzesSection courseId={courseId} courseTitle={courseName} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import {
    Link2,
    LogIn,
    PlusCircle,
    Trash2,
    Video,
    VideoOff,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    EmptyState,
    MaterialPage,
    NAVY,
    actionButton,
    primaryButton,
} from "../../components/admin/MaterialPage";
import { getCourseName } from "../../lib/materials";
import { supabase } from "../../lib/supabase";

const formatDateTime = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isUpcoming = (iso) => new Date(iso) >= new Date();

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DCDFE3",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#333",
  fontFamily: "Poppins, sans-serif",
  outline: "none",
};
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "#555",
  margin: "14px 0 6px",
};

function AddSessionModal({ courseId, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !link.trim() || !date || !time) {
      setError("Please fill in the title, link, date, and time.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from("calendar_events").insert({
      admin_id: user?.id,
      title: title.trim(),
      link: link.trim(),
      description: description.trim() || null,
      event_date: new Date(`${date}T${time}`).toISOString(),
      course_id: Number(courseId),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "24px",
          fontFamily: "Poppins, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: "18px", fontWeight: "700", color: "#1A1A2E" }}
          >
            Add Session Link
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={22} color="#333" />
          </button>
        </div>

        <label style={labelStyle}>Session Title *</label>
        <input
          style={inputStyle}
          placeholder="e.g. LEPT Express - Module 3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label style={labelStyle}>Meeting Link *</label>
        <input
          style={inputStyle}
          placeholder="https://zoom.us/j/... or meet.google.com/..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <label style={labelStyle}>Description (optional)</label>
        <textarea
          style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
          placeholder="Brief description of the session"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              style={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Time *</label>
            <input
              type="time"
              style={inputStyle}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            style={{ color: "#E74C3C", fontSize: "12px", margin: "12px 0 0" }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={save}
          style={{
            ...primaryButton,
            marginTop: "20px",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Add Session"}
        </button>
      </div>
    </div>
  );
}

export default function AdminOnlineSession() {
  const { courseId } = useParams();
  const [courseTitle, setCourseTitle] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSessions = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("calendar_events")
      .select("event_id, title, link, description, event_date, course_id")
      .eq("course_id", courseId)
      .order("event_date", { ascending: true });
    if (loadError) setError(`Could not load sessions: ${loadError.message}`);
    setSessions(data ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    getCourseName(courseId).then(setCourseTitle);
    fetchSessions();
  }, [courseId, fetchSessions]);

  const join = (session) => {
    if (
      !window.confirm(
        `You will be redirected to join "${session.title}". Continue?`,
      )
    )
      return;
    const url = /^https?:\/\//i.test(session.link)
      ? session.link
      : `https://${session.link}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const remove = async (session) => {
    if (!window.confirm(`Remove "${session.title}"?`)) return;
    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("event_id", session.event_id);
    if (deleteError) setError(deleteError.message);
    else fetchSessions();
  };

  return (
    <MaterialPage
      topbarTitle="Online Sessions"
      courseTitle={courseTitle}
      subtitle="Online Session Links"
    >
      <button
        type="button"
        style={primaryButton}
        onClick={() => setAdding(true)}
      >
        <PlusCircle size={20} /> Add Session Link
      </button>

      {error && (
        <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>
          Loading...
        </p>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<VideoOff size={56} color="#BDC3C7" />}
          text="No sessions yet."
          hint='Click "Add Session Link" to add one.'
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginTop: "20px",
          }}
        >
          {sessions.map((item) => {
            const upcoming = isUpcoming(item.event_date);
            const tone = upcoming ? NAVY : "#BDC3C7";
            return (
              <div
                key={item.event_id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid #E8ECF4",
                  backgroundColor: "#F8F9FC",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    flexShrink: 0,
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    border: "1px solid #E0E4EF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Video size={26} color={tone} />
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
                      marginTop: "3px",
                    }}
                  >
                    {formatDateTime(item.event_date)}
                  </div>
                  {item.description && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#777",
                        marginTop: "4px",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginTop: "10px",
                    }}
                  >
                    {item.link ? (
                      <button
                        type="button"
                        onClick={() => join(item)}
                        style={{
                          ...actionButton,
                          borderColor: tone,
                          color: tone,
                        }}
                      >
                        <LogIn size={14} /> Join Session
                      </button>
                    ) : (
                      <span
                        style={{
                          ...actionButton,
                          borderColor: "#BDC3C7",
                          color: "#BDC3C7",
                          cursor: "default",
                        }}
                      >
                        <Link2 size={14} /> No link yet
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      style={{
                        ...actionButton,
                        borderColor: "#E74C3C",
                        color: "#E74C3C",
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <AddSessionModal
          courseId={courseId}
          onClose={() => setAdding(false)}
          onSaved={fetchSessions}
        />
      )}
    </MaterialPage>
  );
}

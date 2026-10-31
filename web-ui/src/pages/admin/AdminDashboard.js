import {
  Check,
  CheckCircle2,
  ChevronRight,
  Heart,
  Image,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dashboardBanner from "../../assets/dashboardBanner.png";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { getSlides } from "../../lib/carousel";
import { supabase } from "../../lib/supabase";

const NAVY = "#1a1a6e";

const card = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "20px 24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  border: "1px solid #eee",
  boxSizing: "border-box",
};

const linkButton = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: NAVY,
  fontSize: "12px",
  fontWeight: "600",
  fontFamily: "Poppins, sans-serif",
  padding: 0,
};

const solidButton = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  backgroundColor: NAVY,
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

const outlineButton = {
  ...solidButton,
  backgroundColor: "#fff",
  color: "#e53935",
  border: "1px solid #e53935",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  fontFamily: "Poppins, sans-serif",
  boxSizing: "border-box",
  outline: "none",
};

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

function CardHeader({ icon, title, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "14px",
      }}
    >
      {icon}
      <span style={{ fontSize: "15px", fontWeight: "700", color: NAVY }}>
        {title}
      </span>
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ErrorText({ children }) {
  return children ? (
    <p
      role="alert"
      style={{ color: "#c0392b", fontSize: "12px", margin: "0 0 8px" }}
    >
      {children}
    </p>
  ) : null;
}

function DashboardBanner({ onEdit }) {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSlides()
      .then(setSlides)
      .catch((loadError) =>
        setError(`Could not load dashboard photos: ${loadError.message}`),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActive((index) => (index + 1) % slides.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  const image = slides.length ? slides[active]?.image_url : dashboardBanner;

  return (
    <div style={card}>
      <CardHeader icon={<Image size={20} color={NAVY} />} title="Highlights">
        <button type="button" onClick={onEdit} style={linkButton}>
          <Pencil size={13} /> Edit photos
        </button>
      </CardHeader>

      <div
        style={{
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          width: "100%",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <p style={{ color: "#888" }}>Loading dashboard photos...</p>
        ) : image ? (
          <img
            src={image}
            alt="Dashboard highlight"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        ) : (
          <Image size={32} color="#bbb" />
        )}
      </div>
      {slides.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          {slides.map((slide, index) => (
            <button
              key={slide.slide_id}
              type="button"
              aria-label={`Show dashboard photo ${index + 1}`}
              onClick={() => setActive(index)}
              style={{
                width: index === active ? "18px" : "8px",
                height: "8px",
                padding: 0,
                border: "none",
                borderRadius: "4px",
                backgroundColor: index === active ? NAVY : "#ddd",
                cursor: "pointer",
                transition: "width 0.2s",
              }}
            />
          ))}
        </div>
      )}
      {error && (
        <p
          role="alert"
          style={{ color: "#c0392b", fontSize: "12px", marginBottom: 0 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

async function insertWithAdmin(table, row) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  let { error } = await supabase
    .from(table)
    .insert({ ...row, admin_id: user.id });
  if (
    error &&
    /admin_id/.test(error.message) &&
    /column/i.test(error.message)
  ) {
    ({ error } = await supabase.from(table).insert(row));
  }
  if (error) throw new Error(error.message);
}

function AnnouncementCard({ announcements, onSave }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startEdit = (key, a) => {
    setEditing(key);
    setDraft({ title: a?.title ?? "", content: a?.content ?? "" });
    setError("");
  };

  const cancel = () => {
    setEditing(null);
    setError("");
  };

  const save = async () => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title || !content) {
      setError("Please enter a title and a body.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editing === "new") {
        await insertWithAdmin("announcements", { title, content });
      } else {
        const { error: updateError } = await supabase
          .from("announcements")
          .update({ title, content })
          .eq("announcement_id", editing);
        if (updateError) throw new Error(updateError.message);
      }
      setEditing(null);
      await onSave();
    } catch (saveError) {
      setError(`Could not save announcement: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    if (
      !window.confirm(
        `Delete the announcement "${a.title || "Untitled"}"? This cannot be undone.`,
      )
    )
      return;
    const { error: deleteError } = await supabase
      .from("announcements")
      .delete()
      .eq("announcement_id", a.announcement_id);
    if (deleteError) {
      setError(`Could not delete announcement: ${deleteError.message}`);
      return;
    }
    await onSave();
  };

  const editor = (
    <div
      style={{
        backgroundColor: "#f8f9fc",
        border: "1px solid #e8ecf4",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Announcement title"
        autoFocus
        style={{
          ...inputStyle,
          fontWeight: "600",
          marginBottom: "8px",
          borderColor: NAVY,
        }}
      />
      <textarea
        value={draft.content}
        onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        placeholder="Announcement body"
        style={{
          ...inputStyle,
          fontSize: "13px",
          lineHeight: "1.6",
          resize: "vertical",
          minHeight: "80px",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <button type="button" onClick={cancel} style={outlineButton}>
          <X size={12} /> Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{ ...solidButton, cursor: saving ? "wait" : "pointer" }}
        >
          <Check size={12} />{" "}
          {saving ? "Saving..." : editing === "new" ? "Post" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={card}>
      <CardHeader
        icon={<Megaphone size={20} color={NAVY} />}
        title="Announcements"
      >
        {editing === null && (
          <button
            type="button"
            onClick={() => startEdit("new", null)}
            style={linkButton}
          >
            <Plus size={14} /> New
          </button>
        )}
      </CardHeader>

      <ErrorText>{error}</ErrorText>

      {editing === "new" && (
        <div style={{ marginBottom: "14px" }}>{editor}</div>
      )}

      {announcements.length === 0 && editing !== "new" ? (
        <p
          style={{
            color: "#aaa",
            fontStyle: "italic",
            margin: 0,
            fontSize: "13px",
          }}
        >
          No announcements yet.
        </p>
      ) : (
        announcements.map((a, i) => (
          <div
            key={a.announcement_id}
            style={{
              borderTop: i !== 0 ? "1px solid #f0f0f0" : "none",
              paddingTop: i !== 0 ? "14px" : "0",
              marginTop: i !== 0 ? "14px" : "0",
            }}
          >
            {editing === a.announcement_id ? (
              editor
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      fontWeight: "500",
                    }}
                  >
                    {formatDate(a.created_at)}
                  </span>
                  {editing === null && (
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => startEdit(a.announcement_id, a)}
                        style={linkButton}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(a)}
                        style={{ ...linkButton, color: "#e53935" }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
                {a.title && (
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#1a1a2e",
                      margin: "0 0 4px",
                    }}
                  >
                    {a.title}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "13px",
                    color: "#444",
                    lineHeight: "1.6",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a.content || "—"}
                </p>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function AffirmationCard({ affirmation, loading, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(affirmation?.content ?? "");
  }, [affirmation]);

  const save = async () => {
    const content = draft.trim();
    if (!content) {
      setError("Please enter an affirmation.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (affirmation) {
        const { error: updateError } = await supabase
          .from("affirmation")
          .update({ content })
          .eq("id", affirmation.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        await insertWithAdmin("affirmation", { content });
      }
      await onSave();
      setEditing(false);
    } catch (saveError) {
      setError(`Could not save affirmation: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={card}>
      <CardHeader
        icon={<Heart size={20} color={NAVY} />}
        title="Daily Affirmation"
      >
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(affirmation?.content ?? "");
              setError("");
              setEditing(true);
            }}
            style={linkButton}
          >
            <Pencil size={13} /> Edit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(affirmation?.content ?? "");
                setEditing(false);
                setError("");
              }}
              style={outlineButton}
            >
              <X size={12} /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...solidButton, cursor: saving ? "wait" : "pointer" }}
            >
              <Check size={12} /> {saving ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </CardHeader>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
          Loading affirmation...
        </p>
      ) : editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          style={{
            ...inputStyle,
            fontSize: "13px",
            fontStyle: "italic",
            borderColor: NAVY,
            minHeight: "80px",
            resize: "vertical",
          }}
        />
      ) : (
        <p
          style={{
            fontSize: "14px",
            color: "#444",
            fontStyle: "italic",
            fontWeight: "600",
            textAlign: "center",
            lineHeight: "1.6",
            margin: "8px 0",
          }}
        >
          {affirmation?.content
            ? `"${affirmation.content}"`
            : "No affirmation yet."}
        </p>
      )}
    </div>
  );
}

function ApprovalStream({ pending, pendingCount, onOpen, onSeeAll }) {
  return (
    <div style={card}>
      <CardHeader
        icon={<User size={20} color={NAVY} />}
        title={
          pendingCount > 0
            ? `Approval Stream (${pendingCount})`
            : "Approval Stream"
        }
      >
        <button
          type="button"
          onClick={onSeeAll}
          style={{ ...linkButton, color: "#f5a623" }}
        >
          See all
        </button>
      </CardHeader>

      {pending.length === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 0",
          }}
        >
          <CheckCircle2 size={24} color="#27ae60" />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: NAVY }}>
              All caught up!
            </div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              No pending enrollments
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pending.map((e) => {
            const name =
              `${e.student?.firstName ?? ""} ${e.student?.lastName ?? ""}`.trim() ||
              "New registrant";
            const curriculum = e.curriculum?.curriculumName ?? "—";
            return (
              <button
                key={e.enrollment_id}
                type="button"
                onClick={() => onOpen(e)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  textAlign: "left",
                  backgroundColor: "#f8f9fc",
                  border: "1px solid #eef0f5",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#e8eaf6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={18} color={NAVY} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: NAVY,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
                    {curriculum}
                    {e.enrollmentDate
                      ? ` · ${formatDate(e.enrollmentDate)}`
                      : ""}
                  </div>
                </div>
                <ChevronRight size={16} color="#aaa" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const isPending = (enrollment) => {
  const v = Array.isArray(enrollment.verification)
    ? enrollment.verification[0]
    : enrollment.verification;
  if (v?.status) return v.status === "pending";
  return v?.verificationStatus === false && !v?.verificationNotes;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [affirmation, setAffirmation] = useState(null);
  const [affirmationLoading, setAffirmationLoading] = useState(true);

  const fetchAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("admin")
      .select("firstName, lastName")
      .eq("admin_id", user.id)
      .maybeSingle();
    if (data)
      setAdminName(`${data.firstName ?? ""} ${data.lastName ?? ""}`.trim());
  };

  const fetchAffirmation = async () => {
    setAffirmationLoading(true);
    const { data, error } = await supabase
      .from("affirmation")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("Failed to load dashboard affirmation", error);
    } else {
      setAffirmation(data);
    }
    setAffirmationLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) console.error(error.message);
    setAnnouncements(data ?? []);
  };

  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("enrollment")
      .select(
        `
      enrollment_id,
      enrollmentDate,
      student (firstName, lastName),
      curriculum!enrollment_curriculum_id_fkey (curriculumName),
      verification!enrollment_verification_id_fkey (status, verificationStatus, verificationNotes)
    `,
      )
      .order("enrollment_id", { ascending: false });
    if (error) {
      console.error(error.message);
      return;
    }
    const pending = (data ?? []).filter(isPending);
    setPendingCount(pending.length);
    setPendingEnrollments(pending.slice(0, 5));
  };

  useEffect(() => {
    fetchAdmin();
    fetchAnnouncements();
    fetchPending();
    fetchAffirmation();
  }, []);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
      <div
        style={{
          marginLeft: "240px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <AdminTopbar title="Dashboard" />
        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1280px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: NAVY,
                margin: 0,
              }}
            >
              Welcome Back{adminName ? `, ${adminName}` : ""}!
            </h2>
            <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
              {today}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flex: "2 1 560px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <DashboardBanner onEdit={() => navigate("/admin/carousel")} />
              <AnnouncementCard
                announcements={announcements}
                onSave={fetchAnnouncements}
              />
            </div>

            <div
              style={{
                flex: "1 1 320px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <AffirmationCard
                affirmation={affirmation}
                loading={affirmationLoading}
                onSave={fetchAffirmation}
              />
              <ApprovalStream
                pending={pendingEnrollments}
                pendingCount={pendingCount}
                onOpen={() => navigate("/admin/approvals")}
                onSeeAll={() => navigate("/admin/approvals")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

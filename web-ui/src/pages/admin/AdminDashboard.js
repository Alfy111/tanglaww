import { Check, ChevronRight, Image, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dashboardBanner from "../../assets/dashboardBanner.png";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { getSlides } from "../../lib/carousel";
import { supabase } from "../../lib/supabase";

function DashboardBanner({ onEdit }) {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSlides()
      .then(setSlides)
      .catch((loadError) => setError(`Could not load dashboard photos: ${loadError.message}`))
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
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "16px", border: "1px solid #eee" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "#1a1a6e", fontSize: "12px", fontWeight: "600", fontFamily: "Poppins, sans-serif" }}>
          <Pencil size={13} /> Edit
        </button>
      </div>

      <div style={{ backgroundColor: "#f0f0f0", borderRadius: "8px", width: "100%", aspectRatio: "16 / 9", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {loading ? (
          <p style={{ color: "#888" }}>Loading dashboard photos...</p>
        ) : image ? (
          <img src={image} alt="Dashboard carousel" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }} />
        ) : (
          <Image size={32} color="#bbb" />
        )}
      </div>
      {slides.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "10px" }}>
          {slides.map((slide, index) => (
            <button key={slide.slide_id} type="button" aria-label={`Show dashboard photo ${index + 1}`} onClick={() => setActive(index)} style={{ width: "9px", height: "9px", padding: 0, border: "none", borderRadius: "50%", backgroundColor: index === active ? "#1a1a6e" : "#ddd", cursor: "pointer" }} />
          ))}
        </div>
      )}
      {error && <p role="alert" style={{ color: "#c0392b", fontSize: "12px", marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

// Single card showing last 3 announcements with timestamps
function AnnouncementCard({ announcements, onSave }) {
  const [editing, setEditing] = useState(null); // index of announcement being edited
  const [drafts, setDrafts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(announcements.map((a) => ({ title: a.title ?? "", content: a.content ?? "" })));
  }, [announcements]);

  const save = async (i) => {
    if (!drafts[i]?.title.trim() || !drafts[i]?.content.trim()) return;
    setSaving(true);
    await supabase.from("announcements")
      .update({ title: drafts[i].title, content: drafts[i].content })
      .eq("announcement_id", announcements[i].announcement_id);
    setSaving(false);
    setEditing(null);
    await onSave();
  };

  const cancel = (i) => {
    setDrafts((d) =>
      d.map((draft, idx) =>
        idx === i ? { title: announcements[i].title ?? "", content: announcements[i].content ?? "" } : draft
      )
    );
    setEditing(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "16px", border: "1px solid #eee" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a6e" }}>📢 Announcements</span>
      </div>

      {announcements.length === 0 ? (
        <p style={{ color: "#aaa", fontStyle: "italic", margin: 0, fontSize: "13px" }}>No announcements yet.</p>
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
            {/* Row: date + edit controls */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#aaa", fontWeight: "500" }}>
                {formatDate(a.created_at)}
              </span>
              {editing !== i ? (
                <button
                  onClick={() => setEditing(i)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "#1a1a6e", fontSize: "12px", fontWeight: "600", fontFamily: "Poppins, sans-serif" }}
                >
                  <Pencil size={13} /> Edit
                </button>
              ) : (
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => save(i)}
                    disabled={saving}
                    style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#1a1a6e", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}
                  >
                    <Check size={12} /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => cancel(i)}
                    style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fff", color: "#e53935", border: "1px solid #e53935", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Content: edit mode or read mode */}
            {editing === i ? (
              <>
                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#888", display: "block", marginBottom: "4px" }}>Title</label>
                  <input
                    value={drafts[i]?.title ?? ""}
                    onChange={(e) =>
                      setDrafts((d) =>
                        d.map((draft, idx) => idx === i ? { ...draft, title: e.target.value } : draft)
                      )
                    }
                    placeholder="Announcement title"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #1a1a6e", fontSize: "14px", fontFamily: "Poppins, sans-serif", boxSizing: "border-box", outline: "none", fontWeight: "600" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#888", display: "block", marginBottom: "4px" }}>Body</label>
                  <textarea
                    value={drafts[i]?.content ?? ""}
                    onChange={(e) =>
                      setDrafts((d) =>
                        d.map((draft, idx) => idx === i ? { ...draft, content: e.target.value } : draft)
                      )
                    }
                    placeholder="Announcement body"
                    style={{ width: "100%", fontSize: "13px", color: "#444", lineHeight: "1.6", border: "1px solid #ddd", borderRadius: "8px", padding: "10px", fontFamily: "Poppins, sans-serif", boxSizing: "border-box", resize: "vertical", minHeight: "80px", outline: "none" }}
                  />
                </div>
              </>
            ) : (
              <>
                {a.title && (
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e", margin: "0 0 4px" }}>{a.title}</p>
                )}
                <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.6", margin: 0 }}>
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

// Editable affirmation card
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user) throw new Error("You must be signed in to save an affirmation.");
        const { error: insertError } = await supabase
          .from("affirmation")
          .insert({ content, admin_id: user.id });
        if (insertError) throw new Error(insertError.message);
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
    <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "24px", border: "1px solid #eee" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a6e" }}>🤍 Daily Affirmation</span>
        {!editing && (
          <button onClick={() => { setDraft(affirmation?.content ?? ""); setError(""); setEditing(true); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "#1a1a6e", fontSize: "12px", fontWeight: "600", fontFamily: "Poppins, sans-serif" }}>
            <Pencil size={13} /> Edit
          </button>
        )}
        {editing && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#1a1a6e", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: "600", cursor: saving ? "wait" : "pointer", fontFamily: "Poppins, sans-serif" }}>
              <Check size={12} /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setDraft(affirmation?.content ?? ""); setEditing(false); setError(""); }} style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fff", color: "#e53935", border: "1px solid #e53935", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
              <X size={12} /> Cancel
            </button>
          </div>
        )}
      </div>
      {error && <p role="alert" style={{ color: "#c0392b", fontSize: "12px", margin: "0 0 8px" }}>{error}</p>}
      {loading ? (
        <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>Loading affirmation...</p>
      ) : editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          style={{ width: "100%", fontSize: "13px", color: "#444", fontStyle: "italic", border: "1px solid #1a1a6e", borderRadius: "8px", padding: "10px", fontFamily: "Poppins, sans-serif", boxSizing: "border-box", outline: "none" }}
        />
      ) : (
        <p style={{ fontSize: "13px", color: "#444", fontStyle: "italic", margin: 0 }}>{affirmation?.content ? `"${affirmation.content}"` : "No affirmation yet."}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [affirmation, setAffirmation] = useState(null);
  const [affirmationLoading, setAffirmationLoading] = useState(true);

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
    const { data } = await supabase.from("enrollment").select(`
      enrollment_id,
      student (firstName, lastName),
      curriculum!enrollment_curriculum_id_fkey (curriculumName),
      verification!enrollment_verification_id_fkey (verificationStatus)
    `)
      .order("enrollment_id", { ascending: false })
      .limit(10);
    const pending = (data ?? []).filter((e) => {
      const v = Array.isArray(e.verification) ? e.verification[0] : e.verification;
      return v?.verificationStatus === false;
    }).slice(0, 3);
    setPendingEnrollments(pending);
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchPending();
    fetchAffirmation();
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, display: "flex", flexDirection: "column" }}>
        <AdminTopbar title="Dashboard" />
        <div style={{ padding: "32px 40px" }}>

          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a6e", marginBottom: "16px" }}>Welcome Back!</h2>

          <DashboardBanner onEdit={() => navigate("/admin/carousel")} />

          <AnnouncementCard announcements={announcements} onSave={fetchAnnouncements} />

          <AffirmationCard affirmation={affirmation} loading={affirmationLoading} onSave={fetchAffirmation} />

          {/* Approval Stream */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a6e", margin: 0 }}>Approval Stream</h2>
            <span onClick={() => navigate("/admin/approvals")} style={{ fontSize: "13px", color: "#f5a623", fontWeight: "600", cursor: "pointer" }}>See all</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingEnrollments.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>No pending enrollments.</p>
            ) : (
              pendingEnrollments.map((e) => {
                const name = `${e.student?.firstName ?? ""} ${e.student?.lastName ?? ""}`.trim();
                const curriculum = e.curriculum?.curriculumName ?? "—";
                return (
                  <div key={e.enrollment_id} onClick={() => navigate("/admin/approvals")} style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee", cursor: "pointer" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a6e" }}>New registree!</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>{name} — {curriculum}</div>
                    </div>
                    <ChevronRight size={16} color="#aaa" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
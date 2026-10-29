import { Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";
import "../Dashboard.css";

function YouTubeEmbed({ youtubeId }) {
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "10px", overflow: "hidden", marginBottom: "12px" }}>
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="YouTube video" frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}

function extractYoutubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function AdminRecordedSessions() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [newSession, setNewSession] = useState({ title: "", url: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const sortedMaterials = useMemo(() => [...materials].sort((a, b) => {
    if (sortBy === "name-asc") return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (sortBy === "name-desc") return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
    const dateDifference = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    return sortBy === "date-asc" ? dateDifference : -dateDifference;
  }), [materials, sortBy]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);

      const { data: courseData } = await supabase
        .from("course").select("*").eq("course_id", courseId).maybeSingle();
      setCourse(courseData);

      const { data: moduleData } = await supabase
        .from("module").select("*").eq("course_id", courseId).order("module_id");
      setModules(moduleData ?? []);
      if (moduleData && moduleData.length > 0) setSelectedModule(moduleData[0]);
      setLoading(false);
    };
    init();
  }, [courseId]);

  const fetchMaterials = useCallback(async () => {
    if (!selectedModule) return;
    const { data } = await supabase
      .from("learning_material").select("*")
      .eq("module_id", selectedModule.module_id)
      .eq("materialType", "recorded_session")
      .order("uploadedAt", { ascending: false });
    setMaterials(data ?? []);
  }, [selectedModule]);

  useEffect(() => {
    if (selectedModule) fetchMaterials();
  }, [fetchMaterials, selectedModule]);

  const handleSaveSession = async () => {
    if (!newSession.title || !newSession.url || !selectedModule || !adminId) return;
    const youtubeId = extractYoutubeId(newSession.url);
    if (!youtubeId) { alert("Invalid YouTube URL"); return; }

    const { error } = editingSession
      ? await supabase.from("learning_material").update({
        title: newSession.title, fileUrl: newSession.url, youtubeId,
      }).eq("material_id", editingSession.material_id)
      : await supabase.from("learning_material").insert({
        title: newSession.title, fileType: "youtube",
        fileUrl: newSession.url, youtubeId,
        storagePath: null, isDownloadable: false, fileSize: null,
        materialType: "recorded_session",
        module_id: selectedModule.module_id,
        admin_id: adminId, uploadedAt: new Date().toISOString(),
      });
    if (error) { alert("Error: " + error.message); return; }
    setNewSession({ title: "", url: "" });
    setShowAdd(false);
    setEditingSession(null);
    await fetchMaterials();
  };

  const openEditSession = (material) => {
    setEditingSession(material);
    setNewSession({ title: material.title, url: material.fileUrl });
    setShowAdd(true);
  };

  const closeSessionModal = () => {
    setShowAdd(false);
    setEditingSession(null);
    setNewSession({ title: "", url: "" });
  };

  const handleDelete = async (material) => {
    if (!window.confirm("Delete this session?")) return;
    const { error } = await supabase.from("learning_material").delete().eq("material_id", material.material_id);
    if (error) { alert("Error: " + error.message); return; }
    await fetchMaterials();
  };

  const formatDate = (str) => new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #ddd", fontSize: "14px",
    fontFamily: "Poppins, sans-serif", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1 }}>
        <AdminTopbar title="Recorded Sessions" />

        <div style={{ padding: "32px 40px" }}>

          {/* Back + Course name */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <button onClick={() => navigate("/admin/courses")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "20px", color: "#1a1a6e", fontWeight: "700", padding: 0,
            }}>&#8592;</button>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a2e" }}>{course?.courseName}</div>
              <div style={{ fontSize: "13px", color: "#888" }}>Recorded Sessions</div>
            </div>
          </div>

          {/* Module Selector */}
          {modules.length > 0 && (
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#aaa", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Module</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {modules.map((m) => (
                  <div key={m.module_id} onClick={() => setSelectedModule(m)} style={{
                    padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
                    backgroundColor: selectedModule?.module_id === m.module_id ? "#f5a623" : "#f0f0f0",
                    color: selectedModule?.module_id === m.module_id ? "#fff" : "#555",
                    transition: "all 0.15s",
                  }}>
                    {m.moduleName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Session button */}
          <div style={{ marginBottom: "20px" }}>
            <button onClick={() => setShowAdd(true)} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              backgroundColor: "#f5a623", color: "#1a1a2e",
              padding: "12px 24px", borderRadius: "10px",
              fontSize: "14px", fontWeight: "700", cursor: "pointer",
              border: "none", fontFamily: "Poppins, sans-serif",
            }}>
              <Plus size={16} /> Add Session
            </button>
          </div>

          {/* Sessions list */}
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : materials.length === 0 ? (
            <p style={{ color: "#aaa", fontStyle: "italic" }}>No recorded sessions yet.</p>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <label htmlFor="recorded-session-sort" style={{ fontSize: "13px", color: "#666" }}>Sort by</label>
                <select id="recorded-session-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                  padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px",
                  backgroundColor: "#fff", color: "#333", fontFamily: "Poppins, sans-serif",
                }}>
                  <option value="date-desc">Upload date (newest first)</option>
                  <option value="date-asc">Upload date (oldest first)</option>
                  <option value="name-asc">Session title (A–Z)</option>
                  <option value="name-desc">Session title (Z–A)</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sortedMaterials.map((m) => (
                <div key={m.material_id}>
                  {playingId === m.material_id && m.youtubeId && (
                    <YouTubeEmbed youtubeId={m.youtubeId} />
                  )}
                  <div style={{
                    backgroundColor: "#fff", borderRadius: "12px", padding: "16px 20px",
                    border: "1px solid #eee", display: "flex", alignItems: "center", gap: "14px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "10px",
                      backgroundColor: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Play size={20} color="#f5a623" fill="#f5a623" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                      <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{formatDate(m.uploadedAt)}</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button onClick={() => setPlayingId(playingId === m.material_id ? null : m.material_id)} style={{
                        padding: "7px 14px", borderRadius: "8px",
                        border: "1px solid #f5a623", color: "#f5a623",
                        fontSize: "12px", fontWeight: "600", cursor: "pointer",
                        backgroundColor: "#fff", fontFamily: "Poppins, sans-serif",
                      }}>
                        {playingId === m.material_id ? "Close" : "Play"}
                      </button>
                      <button onClick={() => openEditSession(m)} style={{
                        padding: "7px 10px", borderRadius: "8px",
                        border: "1px solid #ddd", backgroundColor: "#fff",
                        color: "#555", fontSize: "12px", fontWeight: "600",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                        fontFamily: "Poppins, sans-serif",
                      }}>
                        <Pencil size={13} /> Edit
                      </button>
                      <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{
                        padding: "7px 14px", borderRadius: "8px",
                        border: "1px solid #f5a623", color: "#f5a623",
                        fontSize: "12px", fontWeight: "600", textDecoration: "none",
                      }}>YouTube</a>
                      <button onClick={() => handleDelete(m)} style={{
                        padding: "7px 10px", borderRadius: "8px",
                        border: "1px solid #ffcdd2", backgroundColor: "#fff",
                        cursor: "pointer", display: "flex", alignItems: "center",
                      }}>
                        <Trash2 size={14} color="#e53935" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px", width: "440px", fontFamily: "Poppins, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e", margin: 0 }}>{editingSession ? "Edit Session" : "Add Session"}</h3>
              <button onClick={closeSessionModal} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#aaa" /></button>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#222", display: "block", marginBottom: "4px" }}>Title*</label>
              <input value={newSession.title} onChange={(e) => setNewSession({ ...newSession, title: e.target.value })} style={inputStyle} placeholder="Session title" />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#222", display: "block", marginBottom: "4px" }}>YouTube URL*</label>
              <input value={newSession.url} onChange={(e) => setNewSession({ ...newSession, url: e.target.value })} style={inputStyle} placeholder="https://youtu.be/..." />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={closeSessionModal} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Cancel</button>
              <button onClick={handleSaveSession} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#f5a623", color: "#1a1a2e", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>{editingSession ? "Save Changes" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
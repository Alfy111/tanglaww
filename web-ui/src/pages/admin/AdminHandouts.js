import { Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase, uploadStorageFileWithProgress } from "../../lib/supabase";
import "../Dashboard.css";

export default function AdminHandouts() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [sortBy, setSortBy] = useState("date-desc");
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
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

  const fetchMaterials = useCallback(async (moduleId) => {
    if (!moduleId) return;
    const { data } = await supabase
      .from("learning_material").select("*")
      .eq("module_id", moduleId)
      .eq("materialType", "handout")
      .order("uploadedAt", { ascending: false });
    setMaterials(data ?? []);
  }, []);

  useEffect(() => {
    if (selectedModule) fetchMaterials(selectedModule.module_id);
  }, [fetchMaterials, selectedModule]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !selectedModule || !adminId) return;

    const moduleId = selectedModule.module_id;
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    let completedBytes = 0;
    const failures = [];

    setUploading(true);
    setUploadProgress({ percent: 0, current: 1, total: files.length, fileName: files[0].name });

    try {
      for (const [index, file] of files.entries()) {
        const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
        const storagePath = `module_${moduleId}/${Date.now()}_${index}_${file.name}`;
        const bytesBeforeCurrentFile = completedBytes;
        setUploadProgress({ percent: totalBytes === 0 ? 100 : Math.round((completedBytes / totalBytes) * 100), current: index + 1, total: files.length, fileName: file.name });

        try {
          await uploadStorageFileWithProgress("learning-materials", storagePath, file, (loaded) => {
            const percent = totalBytes === 0 ? 100 : Math.round(((bytesBeforeCurrentFile + Math.min(file.size, loaded)) / totalBytes) * 100);
            setUploadProgress({ percent, current: index + 1, total: files.length, fileName: file.name });
          });

          const { data: urlData } = supabase.storage.from("learning-materials").getPublicUrl(storagePath);
          const { error: dbError } = await supabase.from("learning_material").insert({
            title: file.name, fileType: ext, fileUrl: urlData.publicUrl,
            storagePath, isDownloadable: true, fileSize: file.size,
            materialType: "handout", module_id: moduleId,
            admin_id: adminId, uploadedAt: new Date().toISOString(),
          });
          if (dbError) {
            const { error: cleanupError } = await supabase.storage.from("learning-materials").remove([storagePath]);
            throw new Error(`Database error: ${dbError.message}${cleanupError ? `; storage cleanup failed: ${cleanupError.message}` : ""}`);
          }
        } catch (error) {
          failures.push(`${file.name}: ${error.message}`);
        }

        completedBytes += file.size;
        setUploadProgress({ percent: totalBytes === 0 ? 100 : Math.round((completedBytes / totalBytes) * 100), current: Math.min(index + 2, files.length), total: files.length, fileName: files[index + 1]?.name ?? file.name });
      }

      await fetchMaterials(moduleId);
      if (failures.length > 0) alert(`Some handouts could not be uploaded:\n${failures.join("\n")}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (material) => {
    if (!window.confirm("Delete this handout?")) return;
    if (material.storagePath) {
      await supabase.storage.from("learning-materials").remove([material.storagePath]);
    }
    await supabase.from("learning_material").delete().eq("material_id", material.material_id);
    await fetchMaterials(material.module_id);
  };

  const formatDate = (str) => new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatSize = (bytes) => bytes ? (bytes / 1024).toFixed(1) + " KB" : "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1 }}>
        <AdminTopbar title="Handouts" />

        <div style={{ padding: "32px 40px" }}>

          {/* Back + Course name */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <button onClick={() => navigate("/admin/courses")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "20px", color: "#1a1a6e", fontWeight: "700", padding: 0,
            }}>&#8592;</button>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a2e" }}>{course?.courseName}</div>
              <div style={{ fontSize: "13px", color: "#888" }}>Handouts</div>
            </div>
          </div>

          {/* Module Selector */}
          {modules.length > 0 && (
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#aaa", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Module</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {modules.map((m) => (
                  <div key={m.module_id} onClick={() => !uploading && setSelectedModule(m)} style={{
                    padding: "8px 16px", borderRadius: "20px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600",
                    backgroundColor: selectedModule?.module_id === m.module_id ? "#f5a623" : "#f0f0f0",
                    color: selectedModule?.module_id === m.module_id ? "#fff" : "#555",
                    opacity: uploading ? 0.7 : 1,
                    transition: "all 0.15s",
                  }}>
                    {m.moduleName}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload button */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              backgroundColor: "#f5a623", color: "#1a1a2e",
              padding: "12px 24px", borderRadius: "10px",
              fontSize: "14px", fontWeight: "700", cursor: "pointer",
            }}>
              <Upload size={16} />
              {uploading ? `Uploading ${uploadProgress?.percent ?? 0}%` : "Upload Handouts"}
              <input type="file" accept=".pdf,.doc,.docx" multiple disabled={uploading} onChange={handleUpload} style={{ display: "none" }} />
            </label>
          </div>

          {uploading && uploadProgress && (
            <div role="status" aria-live="polite" style={{ maxWidth: "480px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px", fontSize: "12px", color: "#555" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Uploading {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.fileName}
                </span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#e8e8e8", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress.percent}%`, height: "100%", backgroundColor: "#f5a623", transition: "width 0.15s ease" }} />
              </div>
            </div>
          )}

          {/* Handouts list */}
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : materials.length === 0 ? (
            <p style={{ color: "#aaa", fontStyle: "italic" }}>No handouts yet.</p>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <label htmlFor="handout-sort" style={{ fontSize: "13px", color: "#666" }}>Sort by</label>
                <select id="handout-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
                  padding: "8px 12px", border: "1px solid #ddd", borderRadius: "8px",
                  backgroundColor: "#fff", color: "#333", fontFamily: "Poppins, sans-serif",
                }}>
                  <option value="date-desc">Upload date (newest first)</option>
                  <option value="date-asc">Upload date (oldest first)</option>
                  <option value="name-asc">File name (A–Z)</option>
                  <option value="name-desc">File name (Z–A)</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sortedMaterials.map((m) => (
                <div key={m.material_id} style={{
                  backgroundColor: "#fff", borderRadius: "12px", padding: "16px 20px",
                  border: "1px solid #eee", display: "flex", alignItems: "center", gap: "14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "10px",
                    backgroundColor: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#f5a623" }}>PDF</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                    <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>
                      {m.fileSize ? formatSize(m.fileSize) + " · " : ""}{formatDate(m.uploadedAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" style={{
                      padding: "7px 14px", borderRadius: "8px",
                      border: "1px solid #f5a623", color: "#f5a623",
                      fontSize: "12px", fontWeight: "600", textDecoration: "none",
                    }}>View</a>
                    <a href={m.fileUrl} download style={{
                      padding: "7px 14px", borderRadius: "8px",
                      border: "1px solid #f5a623", color: "#f5a623",
                      fontSize: "12px", fontWeight: "600", textDecoration: "none",
                    }}>Download</a>
                    <button onClick={() => handleDelete(m)} style={{
                      padding: "7px 10px", borderRadius: "8px",
                      border: "1px solid #ffcdd2", backgroundColor: "#fff",
                      cursor: "pointer", display: "flex", alignItems: "center",
                    }}>
                      <Trash2 size={14} color="#e53935" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
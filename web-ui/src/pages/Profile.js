import { useEffect, useRef, useState } from "react";
import { FiSearch, FiUser } from "react-icons/fi";
import profileBanner from "../assets/profileBanner.png";
import NotificationBell from "../components/NotificationBell";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [curriculum, setCurriculum] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState({ email: false, contact: false });
  const [form, setForm] = useState({ email: "", contact: "" });
  const [bannerImg, setBannerImg] = useState(profileBanner);
  const [avatarImg, setAvatarImg] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const bannerRef = useRef();
  const avatarRef = useRef();

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("student")
     .select(`
        id, firstName, lastName, middleName, email,
        profilephotourl, bannerphotourl,
        enrollment (
          curriculum!enrollment_curriculum_id_fkey (curriculumName),
          specialization!enrollment_specialization_id_fkey (specializationName)
        )
      `)
      .eq("email", user.email)
      .single();

    if (error) console.error("Profile fetch error:", error.message);
    if (data) {
      setStudent(data);
      setForm({ email: data.email ?? "", contact: data.contact ?? "" });
      if (data.profilephotourl) setAvatarImg(data.profilephotourl);
      if (data.bannerphotourl) setBannerImg(data.bannerphotourl);
      const curr = data.enrollment?.[0]?.curriculum?.curriculumName ?? "";
      setCurriculum(curr);
    }
    setLoading(false);
  };

  const fullName = student
    ? `${student.firstName}${student.middleName ? " " + student.middleName + "." : ""} ${student.lastName}`
    : "";

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !student) return;
    setUploadingBanner(true);
    const path = `banners/${student.id}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: true });
    if (error) { alert("Banner upload error: " + error.message); setUploadingBanner(false); return; }
    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
   setBannerImg(urlData.publicUrl);
    const { error: updateError } = await supabase.from("student").update({ bannerphotourl: urlData.publicUrl }).eq("id", student.id);
    if (updateError) console.error("Banner DB update error:", updateError.message);
    setUploadingBanner(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !student) return;
    setUploadingAvatar(true);
    const path = `avatars/${student.id}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: true });
    if (error) { alert("Avatar upload error: " + error.message); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
    setAvatarImg(urlData.publicUrl);
    await supabase.from("student").update({ profilephotourl: urlData.publicUrl }).eq("id", student.id);
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase
      .from("student")
      .update({ email: form.email })
      .eq("id", student.id);
    if (error) { alert("Save error: " + error.message); setSaving(false); return; }
    setSaving(false);
    setEditMode(false);
    setEditing({ email: false, contact: false });
    fetchProfile();
  };

  const toggleEdit = (field) => setEditing((prev) => ({ ...prev, [field]: !prev[field] }));

  if (loading) return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#aaa" }}>Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">

        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-search">
            <FiSearch size={16} color="#aaa" />
            <input placeholder="Enter search terms" />
          </div>
          <div className="topbar-right">
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <div className="profile-content">

          {/* Banner + Avatar */}
          <div className="profile-banner-wrap">

            {/* Banner */}
            <div
              className="profile-banner-image"
              onClick={() => bannerRef.current.click()}
            >
              <img
                src={typeof bannerImg === "string" ? bannerImg : profileBanner}
                alt="Banner"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                <div style={{
                  backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px",
                  padding: "8px 20px", color: "#fff", fontSize: "13px", fontWeight: "600",
                }}>
                  {uploadingBanner ? "Uploading..." : "✎ Change Banner"}
                </div>
              </div>
            </div>

            {/* Hidden inputs */}
            <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />

            {/* Avatar */}
            <div
              className="profile-page-avatar"
              onClick={() => avatarRef.current.click()}
            >
              {avatarImg
                ? <img src={avatarImg} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <FiUser size={48} color="#bbb" />
              }
              <div style={{
                position: "absolute", bottom: "6px", right: "6px",
                backgroundColor: "#1a1a6e", borderRadius: "50%",
                width: "26px", height: "26px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: "#fff",
              }}>
                {uploadingAvatar ? "..." : "✎"}
              </div>
            </div>
          </div>

          {/* Name under avatar */}
          <div className="profile-identity">
            <div>
              <p style={{ fontWeight: "700", color: "#1a1a2e", margin: 0 }}>{fullName}</p>
              <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>{curriculum}</p>
              <p style={{ fontSize: "12px", color: "#aaa", margin: "2px 0 0" }}>{student?.email}</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="profile-form-card">
            {!editMode && (
              <button onClick={() => setEditMode(true)} style={{
                position: "absolute", top: "20px", right: "24px",
                backgroundColor: "#f0f3ff", color: "#1a1a6e",
                border: "none", borderRadius: "8px",
                padding: "8px 16px", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "Poppins, sans-serif",
              }}>
                ✎ Edit
              </button>
            )}

            {/* Read-only fields */}
            {[
              ["Username", fullName],
              ["Curriculum", curriculum],
            ].map(([label, value]) => (
              <div key={label}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#222", display: "block", marginBottom: "6px" }}>{label}</label>
                <input value={value} readOnly style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px",
                  border: "1px solid #ddd", fontSize: "14px",
                  fontFamily: "Poppins, sans-serif", backgroundColor: "#f9f9f9",
                  color: "#555", boxSizing: "border-box", outline: "none",
                }} />
              </div>
            ))}

            {/* Editable fields */}
            {[["Email", "email"], ["Contact Number", "contact"]].map(([label, key]) => (
              <div key={key}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#222", display: "block", marginBottom: "6px" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input
                    value={form[key]}
                    readOnly={!editMode || !editing[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={{
                      width: "100%", padding: "10px 40px 10px 14px",
                      borderRadius: "8px",
                      border: editing[key] ? "1px solid #1a1a6e" : "1px solid #ddd",
                      fontSize: "14px", fontFamily: "Poppins, sans-serif",
                      backgroundColor: editing[key] ? "#fff" : "#f9f9f9",
                      color: "#333", boxSizing: "border-box", outline: "none",
                    }}
                  />
                  {editMode && (
                    <span onClick={() => toggleEdit(key)} style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer", color: "#1a1a6e", fontSize: "14px",
                    }}>✎</span>
                  )}
                </div>
              </div>
            ))}

            {editMode && (
              <button onClick={handleSave} disabled={saving} style={{
                width: "100%", padding: "14px",
                backgroundColor: "#1a1a6e", color: "#fff",
                border: "none", borderRadius: "8px",
                fontSize: "15px", fontWeight: "600",
                cursor: "pointer", fontFamily: "Poppins, sans-serif",
                marginTop: "8px", opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving..." : "Done"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
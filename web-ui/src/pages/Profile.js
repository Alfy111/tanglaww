import { Camera, Clock, Pencil, UploadCloud, User, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import profileBanner from "../assets/profileBanner.png";
import Sidebar from "../components/Sidebar";
import { getSignedInUser } from "../components/StudentSidePanel";
import UserTopbar from "../components/UserTopbar";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const NAVY = "#0D2A94";
const FONT = "Poppins, sans-serif";
const PHONE_PATTERN = /^09\d{9}$/;

const first = (v) => (Array.isArray(v) ? v[0] : v);
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: "700",
  color: NAVY,
  marginBottom: "8px",
};
const boxStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid #BDC3C7",
  backgroundColor: "#FDFDFD",
  fontSize: "14px",
  color: "#555",
  fontFamily: FONT,
  outline: "none",
};

async function uploadToReceipts(folder, studentId, file) {
  const path = `${folder}/${studentId}_${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl;
}

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [program, setProgram] = useState({
    curriculum: "—",
    specialization: "—",
  });
  const [enrollmentInfo, setEnrollmentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  const avatarRef = useRef(null);
  const receiptRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    const user = await getSignedInUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("student")
      .select(
        "id, firstName, lastName, middleName, email, phoneNumber, profilephotourl, bannerphotourl",
      )
      .eq("auth_id", user.id)
      .maybeSingle();
    if (error)
      setMessage({
        ok: false,
        text: `Could not load your profile: ${error.message}`,
      });

    if (data) {
      setStudent(data);
      setPhone(data.phoneNumber ?? "");
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
      setProgram({
        curriculum: first(enrollment?.curriculum)?.curriculumName ?? "—",
        specialization:
          first(enrollment?.specialization)?.specializationName ?? "—",
      });
    }

    const { data: info } = await supabase.rpc("get_my_enrollment");
    setEnrollmentInfo(info ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fullName = student
    ? `${student.firstName}${student.middleName ? ` ${student.middleName}.` : ""} ${student.lastName}`.toUpperCase()
    : "";

  const changePhoto = async (kind, file) => {
    if (!file || !student) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ ok: false, text: "Please choose an image file." });
      return;
    }
    setUploading(kind);
    setMessage(null);
    try {
      const url = await uploadToReceipts("avatars", student.id, file);
      const { error } = await supabase
        .from("student")
        .update({ profilephotourl: url })
        .eq("id", student.id);
      if (error) throw new Error(error.message);
      setStudent((s) => ({ ...s, profilephotourl: url }));
      setMessage({ ok: true, text: "Profile photo updated." });
    } catch (err) {
      setMessage({ ok: false, text: `Upload failed: ${err.message}` });
    } finally {
      setUploading(null);
    }
  };

  const savePhone = async () => {
    const cleaned = phone.trim();
    if (cleaned && !PHONE_PATTERN.test(cleaned)) {
      setMessage({
        ok: false,
        text: "Enter an 11-digit mobile number that starts with 09, e.g. 09171234567.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("student")
      .update({ phoneNumber: cleaned || null })
      .eq("id", student.id);
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: `Could not save: ${error.message}` });
      return;
    }
    setStudent((s) => ({ ...s, phoneNumber: cleaned || null }));
    setEditing(false);
    setMessage({ ok: true, text: "Contact number saved." });
  };

  const uploadBalance = async (file) => {
    if (!file || !student) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setMessage({
        ok: false,
        text: "Please upload an image or a PDF of your receipt.",
      });
      return;
    }
    setUploading("receipt");
    setMessage(null);
    try {
      const url = await uploadToReceipts("balance", student.id, file);
      const { error } = await supabase.rpc("submit_balance_receipt", {
        p_url: url,
      });
      if (error) throw new Error(error.message);
      setMessage({
        ok: true,
        text: "Receipt submitted. The admin will review your payment. The remaining courses unlock once you are fully approved.",
      });
      await fetchProfile();
    } catch (err) {
      setMessage({
        ok: false,
        text: `Upload failed: ${err.message ?? "Please try again."}`,
      });
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <UserTopbar title="Profile" />
          <p style={{ color: "#aaa", textAlign: "center", padding: "60px 0" }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  const isPartial = enrollmentInfo?.status === "partially_approved";
  const phoneSet = !!student?.phoneNumber?.trim();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Profile" />

        <div
          className="profile-content"
          style={{ maxWidth: "860px", width: "100%", margin: "0 auto" }}
        >
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              changePhoto("avatar", e.target.files[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={receiptRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              uploadBalance(e.target.files[0]);
              e.target.value = "";
            }}
          />

          <div className="profile-banner-wrap" style={{ marginBottom: "92px" }}>
            <div className="profile-banner-image" style={{ cursor: "default" }}>
              <img
                src={student?.bannerphotourl || profileBanner}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <button
              type="button"
              className="profile-page-avatar"
              aria-label="Change profile photo"
              title="Change profile photo"
              onClick={() => avatarRef.current?.click()}
              style={{
                padding: 0,
                borderColor: "#fff",
                width: "150px",
                height: "150px",
                bottom: "-75px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {student?.profilephotourl ? (
                <img
                  src={student.profilephotourl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User size={48} color="#bbb" />
              )}
              <span
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: NAVY,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {uploading === "avatar" ? "…" : <Camera size={14} />}
              </span>
            </button>
          </div>

          <div
            className="profile-identity"
            style={{ justifyContent: "center", textAlign: "center" }}
          >
            <div>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: NAVY,
                  margin: 0,
                }}
              >
                {fullName}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#333",
                  margin: "4px 0 0",
                }}
              >
                {program.curriculum}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#7F8C8D",
                  margin: "2px 0 0",
                }}
              >
                {student?.email}
              </p>
            </div>
          </div>

          {message && (
            <div
              role={message.ok ? "status" : "alert"}
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                color: message.ok ? "#1E9E5A" : "#E74C3C",
                backgroundColor: message.ok ? "#f0fff4" : "#fff5f5",
                border: `1px solid ${message.ok ? "#1E9E5A" : "#E74C3C"}`,
              }}
            >
              {message.text}
            </div>
          )}

          <div className="profile-form-card">
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setMessage(null);
                }}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "24px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#f0f3ff",
                  color: NAVY,
                  border: 0,
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                <Pencil size={14} /> Edit
              </button>
            )}

            {[
              ["Curriculum", program.curriculum],
              ["Specialization", program.specialization],
              ["Email", student?.email ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <span style={labelStyle}>{label}</span>
                <div style={boxStyle}>{value}</div>
              </div>
            ))}

            <div>
              <label htmlFor="profile-phone" style={labelStyle}>
                Contact Number
              </label>
              {editing ? (
                <input
                  id="profile-phone"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  style={{
                    ...boxStyle,
                    borderColor: NAVY,
                    backgroundColor: "#fff",
                    color: "#333",
                  }}
                />
              ) : (
                <div
                  style={{
                    ...boxStyle,
                    color: phoneSet ? "#555" : "#BDC3C7",
                    fontStyle: phoneSet ? "normal" : "italic",
                  }}
                >
                  {phoneSet ? student.phoneNumber : "Not set"}
                </div>
              )}
            </div>

            {editing && (
              <>
                <p style={{ fontSize: "12px", color: "#7F8C8D", margin: 0 }}>
                  Your name, program and email come from your enrollment.
                  Contact the admin if any of them need to change.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setPhone(student?.phoneNumber ?? "");
                    }}
                    style={{
                      flex: 1,
                      padding: "13px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePhone}
                    disabled={saving}
                    style={{
                      flex: 2,
                      padding: "13px",
                      borderRadius: "8px",
                      border: 0,
                      backgroundColor: NAVY,
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: saving ? "wait" : "pointer",
                      opacity: saving ? 0.7 : 1,
                      fontFamily: FONT,
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>

          {isPartial && (
            <div
              className="profile-form-card"
              style={{ marginTop: "20px", gap: "12px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Wallet size={22} color={NAVY} />
                <span
                  style={{ fontSize: "16px", fontWeight: "700", color: NAVY }}
                >
                  Remaining Balance
                </span>
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#555",
                  lineHeight: 1.45,
                  margin: 0,
                }}
              >
                Upload your remaining balance receipt to unlock the rest of the
                courses.
              </p>
              {enrollmentInfo?.balanceProofUrl && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                    fontSize: "13px",
                    color: "#B26A00",
                  }}
                >
                  <Clock
                    size={16}
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  Receipt submitted on{" "}
                  {new Date(
                    enrollmentInfo.balanceSubmittedAt ?? "",
                  ).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  . Waiting for admin review.
                </div>
              )}
              <button
                type="button"
                disabled={uploading === "receipt"}
                onClick={() => receiptRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                  borderRadius: "10px",
                  border: 0,
                  backgroundColor: NAVY,
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  opacity: uploading === "receipt" ? 0.7 : 1,
                  fontFamily: FONT,
                }}
              >
                <UploadCloud size={18} />
                {uploading === "receipt"
                  ? "Uploading..."
                  : enrollmentInfo?.balanceProofUrl
                    ? "Replace Receipt"
                    : "Upload Receipt"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, FileText, MoreVertical, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";

function StudentDetailModal({ student, onClose }) {
  const [openSection, setOpenSection] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loadingEnrollment, setLoadingEnrollment] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [codeModal, setCodeModal] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);
  const toggle = (key) => setOpenSection((current) => current === key ? null : key);

  useEffect(() => {
    let active = true;

    const loadEnrollment = async () => {
      setLoadingEnrollment(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("enrollment")
        .select(`
          enrollment_id,
          student_id,
          curriculum!enrollment_curriculum_id_fkey (curriculumName),
          specialization!enrollment_specialization_id_fkey (specializationName),
          type_of_taker!enrollment_typeOfTaker_id_fkey (typeOfTaker),
          promo!enrollment_promo_id_fkey (promo),
          verification!enrollment_verification_id_fkey (
            verification_id, verificationStatus, verificationNotes, allow_reenrollment
          ),
          paymentDetails (
            amountTransferred, referenceNumber, proofOfPaymentUrl,
            payment_channel!paymentDetails_paymentChannel_id_fkey (paymentChannelName)
          )
        `)
        .eq("student_id", student.id)
        .order("enrollment_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setLoadError(`Could not load enrollment details: ${error.message}`);
      } else {
        setEnrollment(data);
      }
      setLoadingEnrollment(false);
    };

    loadEnrollment();
    return () => { active = false; };
  }, [student.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const firstRelation = (value) => (Array.isArray(value) ? value[0] : value);
  const verification = firstRelation(enrollment?.verification);
  const payment = firstRelation(enrollment?.paymentDetails);
  const paymentChannel = firstRelation(payment?.payment_channel);
  const isApproved = verification?.verificationStatus === true;
  const status = isApproved ? "Approved" : verification?.verificationNotes ? "Rejected" : enrollment ? "Pending" : "No Enrollment";
  const statusColor = status === "Approved" ? "#27ae60" : status === "Rejected" ? "#e74c3c" : "#f39c12";

  const Section = ({ title, fields }) => (
    <section style={{ border: "1px solid #ddd", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
      <button type="button" aria-expanded={openSection === title} onClick={() => toggle(title)} style={{ width: "100%", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "#1a1a2e", background: "#fff", border: "none", textAlign: "left" }}>
        {title}
        {openSection === title ? <ChevronUp size={16} color="#555" /> : <ChevronDown size={16} color="#555" />}
      </button>
      {openSection === title && (
        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: "8px" }}>
          {fields.map(([label, value]) => (
            <div key={label} style={{ fontSize: "13px", color: "#555" }}>
              <strong style={{ color: "#1a1a2e" }}>{label}:</strong> {value || "—"}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const name = `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim().toUpperCase();
  const openActivationCode = async () => {
    setCodeModal(true);
    setActivationCode("");
    setCodeMessage("");
    if (!enrollment) return;

    setLoadingCode(true);
    const { data, error } = await supabase
      .from("activation_codes")
      .select("code, is_used, expires_at")
      .eq("enrollment_id", enrollment.enrollment_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoadingCode(false);

    if (error) {
      setCodeMessage(`Could not load activation code: ${error.message}`);
    } else if (!data) {
      setCodeMessage("No activation code found.");
    } else if (data.is_used) {
      setCodeMessage("This student has already activated their account.");
    } else if (new Date(data.expires_at) < new Date()) {
      setCodeMessage("The activation code has expired.");
    } else {
      setActivationCode(data.code ?? "");
    }
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, fontFamily: "Poppins, sans-serif", padding: "20px" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="student-profile-title" style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 id="student-profile-title" style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a6e", margin: 0 }}>Student Profile</h2>
          <button type="button" aria-label="Close student profile" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color="#aaa" />
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div style={{ width: "100px", height: "100px", borderRadius: "50%", backgroundColor: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", overflow: "hidden" }}>
            {student.profilephotourl
              ? <img src={student.profilephotourl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={46} color="#aaa" />
            }
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a6e" }}>{name || "Unknown"}</div>
          <div style={{ fontSize: "14px", color: "#555", marginTop: "4px" }}>{enrollment?.curriculum?.curriculumName ?? "—"}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", padding: "5px 12px", borderRadius: "20px", border: `1px solid ${statusColor}`, background: `${statusColor}18`, color: statusColor, fontSize: "12px", fontWeight: 700 }}>
            {status === "Approved" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status}
          </div>
        </div>

        <div style={{ color: "#1a1a2e", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Registrant Information:</div>
        {loadError && <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>{loadError}</p>}
        {loadingEnrollment ? (
          <p style={{ color: "#888", fontSize: "13px" }}>Loading enrollment details...</p>
        ) : (
          <>
        <Section title="Program & Curriculum" fields={[
          ["Curriculum", enrollment?.curriculum?.curriculumName],
          ["Specialization", enrollment?.specialization?.specializationName],
          ["Type of Taker", enrollment?.type_of_taker?.typeOfTaker],
        ]} />
        <Section title="Personal Information" fields={[
          ["First Name", student.firstName],
          ["Middle Name", student.middleName],
          ["Last Name", student.lastName],
          ["Email", student.email],
          ["Degree", student.bachelorsDegree],
          ["Last School", student.lastSchoolAttended],
          ["Province", student.province],
          ["Contact Number", student.phoneNumber?.trim() || "Not set"],
        ]} />
        <Section title="Promotions & Verification" fields={[
          ["Promo", enrollment?.promo?.promo ?? "None"],
          ["Verification", status],
          ["Re-enrollment", verification?.allow_reenrollment ? "Allowed" : "Not allowed"],
          ["Rejection Notes", verification?.verificationNotes],
        ]} />
        <Section title="Payment Information" fields={[
          ["Channel", paymentChannel?.paymentChannelName],
          ["Amount", payment?.amountTransferred == null ? undefined : String(payment.amountTransferred)],
          ["Reference #", payment?.referenceNumber],
        ]} />
          </>
        )}

        <div style={{ color: "#1a1a2e", fontSize: "14px", fontWeight: 700, margin: "20px 0 10px" }}>Documents:</div>
        <button type="button" onClick={() => {
          const proofUrl = payment?.proofOfPaymentUrl;
          if (proofUrl) window.open(proofUrl, "_blank", "noopener,noreferrer");
        }} style={{ width: "100%", border: "1px solid #ddd", borderRadius: "10px", marginBottom: "10px", padding: "14px 20px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: payment?.proofOfPaymentUrl ? "pointer" : "default", color: "#1a1a2e", fontSize: "14px", textAlign: "left" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}><FileText size={18} color="#1a1a6e" />Proof of Payment</span>
          <ChevronRight size={18} color="#555" />
        </button>
        {isApproved && (
          <button type="button" onClick={openActivationCode} style={{ width: "100%", border: "none", borderRadius: "10px", padding: "14px 20px", background: "#1a1a6e", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            View Activation Code
          </button>
        )}
      </div>

      {codeModal && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCodeModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div role="dialog" aria-modal="true" aria-labelledby="activation-code-title" style={{ width: "100%", maxWidth: "400px", background: "#fff", borderRadius: "14px", padding: "24px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 id="activation-code-title" style={{ margin: 0, color: "#1a1a6e" }}>Activation Code</h3>
              <button type="button" aria-label="Close activation code" onClick={() => setCodeModal(false)} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={19} color="#888" /></button>
            </div>
            {loadingCode ? <p>Loading...</p> : (
              <>
                <div aria-label="Activation code" style={{ minHeight: "52px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", margin: "20px 0 10px" }}>
                  {activationCode.split("").map((digit, index) => (
                    <span key={`${index}-${digit}`} style={{ width: "40px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a6e", borderRadius: "9px", background: "#f0f4ff", color: "#1a1a6e", fontSize: "22px", fontWeight: 700 }}>{digit}</span>
                  ))}
                </div>
                {codeMessage && <p role="status" style={{ fontSize: "13px", color: "#666" }}>{codeMessage}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStudentRegistry() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("student")
        .select("id, firstName, middleName, lastName, email, profilephotourl, bachelorsDegree, majorshipTaken, lastSchoolAttended, province, phoneNumber")
        .order("firstName", { ascending: true });
      if (error) console.error(error.message);
      setStudents(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = students.filter((s) => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const q = query.toLowerCase();
    return name.includes(q) || s.email?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1 }}>
        <AdminTopbar title="Student Registry" />
        <div style={{ padding: "32px 40px" }}>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#fff", borderRadius: "10px", padding: "10px 16px", border: "1px solid #eee", marginBottom: "24px", maxWidth: "480px" }}>
            <Search size={16} color="#aaa" />
            <input
              placeholder="Search by name or email address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "14px", fontFamily: "Poppins, sans-serif", flex: 1, color: "#333", backgroundColor: "transparent" }}
            />
          </div>

          {/* Count */}
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
            {filtered.length} student{filtered.length !== 1 ? "s" : ""} found
          </p>

          {/* List */}
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : (
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #eee", overflow: "hidden" }}>
              {filtered.length === 0 ? (
                <p style={{ padding: "32px", textAlign: "center", color: "#aaa", fontStyle: "italic" }}>No students found.</p>
              ) : (
                filtered.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderBottom: i < filtered.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                  >
                    {/* Avatar */}
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {s.profilephotourl
                        ? <img src={s.profilephotourl} alt={s.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <User size={20} color="#1a1a6e" />
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a6e" }}>{s.firstName} {s.lastName}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>{s.bachelorsDegree || "—"} • {s.email}</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>ID: {s.id}</div>
                    </div>

                    <MoreVertical size={18} color="#aaa" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {selected && <StudentDetailModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
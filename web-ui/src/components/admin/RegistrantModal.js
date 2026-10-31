import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Download,
    ExternalLink,
    Send,
    User,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
    ENROLLMENT_SELECT,
    PAYMENT_TYPE_LABELS,
    STATUS_COLORS,
    STATUS_LABELS,
    approveWithCode,
    first,
    getActivationCode,
    getStatus,
    getVerification,
    sendActivationEmail,
    setEnrollmentStatus,
} from "../../lib/enrollmentStatus";
import { supabase } from "../../lib/supabase";

const NAVY = "#2F459B";
const FONT = "Poppins, sans-serif";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  fontFamily: FONT,
};

const rowStyle = {
  width: "100%",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "14px 18px",
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  color: "#1A1A2E",
  textAlign: "left",
  fontFamily: FONT,
  boxSizing: "border-box",
};

const solidButton = (color) => ({
  flex: 1,
  padding: "13px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: color,
  color: "#fff",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: FONT,
});

const outlineButton = (color) => ({
  width: "100%",
  padding: "13px",
  borderRadius: "10px",
  border: `1.5px solid ${color}`,
  backgroundColor: "#fff",
  color,
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: FONT,
  marginTop: "10px",
});

const sectionLabel = {
  color: NAVY,
  fontSize: "15px",
  fontWeight: "700",
  margin: "0 0 10px",
};

const formatLongDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

const photoFileName = (student) =>
  `${student?.lastName ?? ""}_${student?.firstName ?? ""}_formal_photo`
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .toUpperCase();

const fullName = (student) =>
  `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim();

function useEscape(onClose) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
}

export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] ?? "#999";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "20px",
        border: `1px solid ${color}`,
        backgroundColor: `${color}18`,
        color,
        fontSize: "12px",
        fontWeight: "700",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      {STATUS_LABELS[status] ?? "No Enrollment"}
    </span>
  );
}

export function Avatar({ url, size = 40, name }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#F0F0F0",
        border: "1px solid #CCC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={name ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <User size={size * 0.55} color="#BDC3C7" />
      )}
    </div>
  );
}

export function CodeModal({ code, name, email, message, onClose }) {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  useEscape(onClose);

  const resend = async () => {
    setSending(true);
    const sent = await sendActivationEmail(email, name.split(" ")[0], code);
    setSending(false);
    setNotice(
      sent
        ? { ok: true, text: `Activation code resent to ${email}` }
        : {
            ok: false,
            text: "Could not send email. Please share the code manually.",
          },
    );
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ ...overlayStyle, zIndex: 1100 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-modal-title"
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#fff",
          borderRadius: "20px",
          padding: "24px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {code ? (
          <>
            <CheckCircle2 size={40} color="#27ae60" />
            <h3
              id="code-modal-title"
              style={{
                margin: "8px 0 12px",
                fontSize: "20px",
                color: "#27ae60",
              }}
            >
              Student Approved!
            </h3>
            <div style={{ fontSize: "12px", color: "#777" }}>
              Activation code for:
            </div>
            <div
              style={{ fontSize: "16px", fontWeight: "700", color: "#0D2A94" }}
            >
              {name}
            </div>
            <div
              style={{ fontSize: "12px", color: "#777", marginBottom: "14px" }}
            >
              {email}
            </div>

            <div
              aria-label="Activation code"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              {code.split("").map((digit, i) => (
                <span
                  key={i}
                  style={{
                    width: "40px",
                    height: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #0D2A94",
                    borderRadius: "10px",
                    backgroundColor: "#F0F4FF",
                    color: "#0D2A94",
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  {digit}
                </span>
              ))}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#E74C3C",
                fontStyle: "italic",
                marginBottom: "14px",
              }}
            >
              Expires in 3 days. One-time use only
            </div>

            {notice && (
              <div
                role="status"
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  color: notice.ok ? "#27ae60" : "#E74C3C",
                  backgroundColor: notice.ok ? "#f0fff4" : "#fff5f5",
                  border: `1px solid ${notice.ok ? "#27ae60" : "#E74C3C"}`,
                }}
              >
                {notice.text}
              </div>
            )}

            <button
              type="button"
              disabled={sending}
              onClick={resend}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: `1px solid ${NAVY}`,
                backgroundColor: "#fff",
                color: NAVY,
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: FONT,
                marginBottom: "14px",
                opacity: sending ? 0.6 : 1,
              }}
            >
              <Send size={15} /> {sending ? "Sending..." : "Resend Email"}
            </button>
          </>
        ) : (
          <>
            <h3
              id="code-modal-title"
              style={{ margin: "0 0 10px", fontSize: "18px", color: "#0D2A94" }}
            >
              Activation Code
            </h3>
            <p
              role="status"
              style={{ fontSize: "14px", color: "#555", margin: "0 0 18px" }}
            >
              {message ?? "Loading..."}
            </p>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#0D2A94",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

const fileExtension = (url, type) => {
  const match = url.split("?")[0].match(/\.(jpe?g|png|webp|heic|gif)$/i);
  if (match) return match[1].toLowerCase();
  return type?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
};

async function downloadFile(url, baseName) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${baseName}.${fileExtension(url, blob.type)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    window.open(
      `${url}${separator}download=${encodeURIComponent(`${baseName}.${fileExtension(url)}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
}

function DocumentPreview({ url, title, downloadName, onClose }) {
  const [downloading, setDownloading] = useState(false);
  useEscape(onClose);

  const download = async () => {
    setDownloading(true);
    await downloadFile(url, downloadName);
    setDownloading(false);
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ ...overlayStyle, zIndex: 1100 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "700", color: NAVY }}>
            {title}
          </span>
          <button
            type="button"
            aria-label="Close preview"
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
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            border: "1px solid #ddd",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FAFAFA",
          }}
        >
          <img
            src={url}
            alt={title}
            style={{
              maxWidth: "100%",
              maxHeight: "65vh",
              objectFit: "contain",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          {downloadName && (
            <button
              type="button"
              disabled={downloading}
              onClick={download}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "10px",
                border: `1.5px solid ${NAVY}`,
                backgroundColor: "#fff",
                color: NAVY,
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: FONT,
                opacity: downloading ? 0.6 : 1,
              }}
            >
              <Download size={18} />{" "}
              {downloading ? "Downloading..." : "Download Photo"}
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              borderRadius: "10px",
              backgroundColor: NAVY,
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={18} /> Open Full Size
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoSection({ title, open, onToggle, fields }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={rowStyle}
      >
        {title}
        {open ? (
          <ChevronUp size={20} color="#555" />
        ) : (
          <ChevronDown size={20} color="#555" />
        )}
      </button>
      {open && (
        <div
          style={{
            backgroundColor: "#f9f9f9",
            border: "1px solid #ddd",
            borderTop: 0,
            borderRadius: "0 0 10px 10px",
            padding: "12px 18px",
            marginTop: "-4px",
          }}
        >
          {fields.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                padding: "5px 0",
                fontSize: "13px",
              }}
            >
              <span style={{ color: NAVY, fontWeight: "600" }}>{label}</span>
              <span
                style={{
                  color: "#333",
                  textAlign: "right",
                  wordBreak: "break-word",
                }}
              >
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ title, note, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...rowStyle, marginBottom: "10px" }}
    >
      <span>
        {title}
        {note && (
          <span
            style={{
              display: "block",
              fontSize: "11px",
              color: "#888",
              marginTop: "2px",
            }}
          >
            {note}
          </span>
        )}
      </span>
      <ChevronRight size={20} color="#555" />
    </button>
  );
}

export default function RegistrantModal({ enrollmentId, onClose, onChanged }) {
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openSection, setOpenSection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [preview, setPreview] = useState(null);
  const [codeInfo, setCodeInfo] = useState(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("enrollment")
      .select(ENROLLMENT_SELECT)
      .eq("enrollment_id", enrollmentId)
      .single();
    if (loadError) setError(`Could not load registrant: ${loadError.message}`);
    else setEnrollment(data);
    setLoading(false);
  }, [enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const closeAll = useCallback(() => {
    if (!preview && !codeInfo) onClose();
  }, [preview, codeInfo, onClose]);
  useEscape(closeAll);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const student = first(enrollment?.student);
  const payment = first(enrollment?.paymentDetails);
  const verification = getVerification(enrollment);
  const status = enrollment ? getStatus(enrollment) : null;
  const name = fullName(student);
  const hasAccess = status === "approved" || status === "partially_approved";
  const showBalanceRow =
    payment?.paymentType === "downpayment" ||
    status === "partially_approved" ||
    !!payment?.balanceProofUrl;

  const run = async (task) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const approve = (target) => {
    const full = target === "approved";
    const fromPending = status === "pending";
    const message = fromPending
      ? `${full ? "Fully approve" : "Partially approve"} ${name}? An activation code will be sent to their email.`
      : full
        ? `Fully approve ${name}? They get access to all courses.`
        : `Set ${name} as partially approved? They get access up to LEPT Express until the balance is settled.`;
    if (!window.confirm(message)) return;

    run(async () => {
      if (fromPending) {
        const { code, emailSent } = await approveWithCode(enrollment, target);
        setCodeInfo({ code, name, email: student.email });
        if (!emailSent)
          setNotice(
            "The activation email could not be sent. Use Resend Email or share the code manually.",
          );
      } else {
        await setEnrollmentStatus(verification?.verification_id, target);
        setNotice(`${name} is now ${STATUS_LABELS[target].toLowerCase()}.`);
      }
      await refresh();
    });
  };

  const withdraw = () => {
    if (
      !window.confirm(
        `${name} will no longer be able to log in. You can restore them later.`,
      )
    )
      return;
    run(async () => {
      await setEnrollmentStatus(verification?.verification_id, "withdrawn");
      await refresh();
    });
  };

  const reject = () => {
    if (!remarks.trim()) {
      setError("Please enter a reason for rejection.");
      return;
    }
    if (!window.confirm(`Reject ${name}?`)) return;
    run(async () => {
      await setEnrollmentStatus(
        verification?.verification_id,
        "rejected",
        remarks.trim(),
      );
      setShowRemarks(false);
      setRemarks("");
      await refresh();
    });
  };

  const toggleReenrollment = async () => {
    setToggling(true);
    setError("");
    const next = !verification?.allow_reenrollment;
    const { error: toggleError } = await supabase
      .from("verification")
      .update({ allow_reenrollment: next })
      .eq("verification_id", verification?.verification_id);
    setToggling(false);
    if (toggleError) setError(toggleError.message);
    else await refresh();
  };

  const viewCode = async () => {
    setCodeInfo({ code: "", name, email: student?.email });
    const result = await getActivationCode(enrollment.enrollment_id);
    setCodeInfo({
      code: result.code ?? "",
      name,
      email: student?.email,
      message: result.message,
    });
  };

  const openDocument = (url, title, downloadName) => {
    if (!url) {
      setError(`No ${title.toLowerCase()} uploaded.`);
      return;
    }
    if (url.toLowerCase().split("?")[0].endsWith(".pdf")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreview({ url, title, downloadName });
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeAll();
      }}
      style={{ ...overlayStyle, zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrant-title"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "28px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            id="registrant-title"
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: "#1A1A2E",
            }}
          >
            Student Profile
          </h2>
          <button
            type="button"
            aria-label="Close student profile"
            onClick={onClose}
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={22} color="#999" />
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>
            Loading...
          </p>
        ) : !enrollment ? (
          <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
            {error || "Registrant not found."}
          </p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              <Avatar url={student?.profilephotourl} size={100} name={name} />
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: NAVY,
                  marginTop: "12px",
                }}
              >
                {name.toUpperCase() || "REGISTRANT"}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#555",
                  fontStyle: "italic",
                  margin: "2px 0 10px",
                }}
              >
                {first(enrollment.curriculum)?.curriculumName ?? "—"}
              </div>
              <StatusBadge status={status} />
            </div>

            <p style={sectionLabel}>Registrant Information:</p>

            <InfoSection
              title="Program & Curriculum"
              open={openSection === "program"}
              onToggle={() =>
                setOpenSection(openSection === "program" ? null : "program")
              }
              fields={[
                ["Curriculum", first(enrollment.curriculum)?.curriculumName],
                [
                  "Specialization",
                  first(enrollment.specialization)?.specializationName,
                ],
                ["Type of Taker", first(enrollment.type_of_taker)?.typeOfTaker],
                ["Comments", enrollment.comments || "None"],
              ]}
            />
            <InfoSection
              title="Personal Information"
              open={openSection === "personal"}
              onToggle={() =>
                setOpenSection(openSection === "personal" ? null : "personal")
              }
              fields={[
                ["First Name", student?.firstName],
                ["Middle Name", student?.middleName],
                ["Last Name", student?.lastName],
                ["Email", student?.email],
                ["Degree", student?.bachelorsDegree],
                ["Majorship", student?.majorshipTaken],
                ["Last School", student?.lastSchoolAttended],
                ["Province", student?.province],
                ["Contact Number", student?.phoneNumber?.trim() || "Not set"],
              ]}
            />
            <InfoSection
              title="Promotions & Verification"
              open={openSection === "promo"}
              onToggle={() =>
                setOpenSection(openSection === "promo" ? null : "promo")
              }
              fields={[["Promo", first(enrollment.promo)?.promo ?? "None"]]}
            />
            <InfoSection
              title="Payment Information"
              open={openSection === "payment"}
              onToggle={() =>
                setOpenSection(openSection === "payment" ? null : "payment")
              }
              fields={[
                [
                  "Channel",
                  first(payment?.payment_channel)?.paymentChannelName,
                ],
                [
                  "Amount",
                  payment?.amountTransferred == null
                    ? ""
                    : String(payment.amountTransferred),
                ],
                ["Reference #", payment?.referenceNumber],
                ["Date of Transaction", formatLongDate(payment?.dateOfPayment)],
                [
                  "Payment Type",
                  PAYMENT_TYPE_LABELS[payment?.paymentType] ?? "Not specified",
                ],
              ]}
            />

            <p style={{ ...sectionLabel, marginTop: "20px" }}>Documents:</p>
            <DocumentRow
              title="Proof of Payment"
              onClick={() =>
                openDocument(payment?.proofOfPaymentUrl, "Proof of Payment")
              }
            />
            <DocumentRow
              title="Graduation or Formal Photo"
              onClick={() =>
                openDocument(
                  student?.formalPhotoUrl,
                  "Graduation or Formal Photo",
                  photoFileName(student),
                )
              }
            />
            <DocumentRow
              title="Valid ID"
              note={student?.validIdUrl ? null : "Not provided"}
              onClick={() => openDocument(student?.validIdUrl, "Valid ID")}
            />
            {showBalanceRow && (
              <DocumentRow
                title="Remaining Balance Receipt"
                note={
                  payment?.balanceProofUrl
                    ? `Submitted ${new Date(payment.balanceSubmittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Not submitted yet"
                }
                onClick={() =>
                  openDocument(
                    payment?.balanceProofUrl,
                    "Remaining Balance Receipt",
                  )
                }
              />
            )}

            {error && (
              <p
                role="alert"
                style={{
                  color: "#E74C3C",
                  fontSize: "13px",
                  margin: "12px 0 0",
                }}
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                style={{
                  color: "#27ae60",
                  fontSize: "13px",
                  margin: "12px 0 0",
                }}
              >
                {notice}
              </p>
            )}

            <div
              style={{
                marginTop: "18px",
                opacity: busy ? 0.6 : 1,
                pointerEvents: busy ? "none" : "auto",
              }}
            >
              {status === "pending" && (
                <>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => approve("approved")}
                      style={solidButton("#27ae60")}
                    >
                      {busy ? "Working..." : "Fully Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => approve("partially_approved")}
                      style={solidButton("#2F80ED")}
                    >
                      Partially Approve
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRemarks(!showRemarks)}
                    style={{
                      ...solidButton("#e74c3c"),
                      width: "100%",
                      marginTop: "10px",
                    }}
                  >
                    Reject
                  </button>
                  {showRemarks && (
                    <>
                      <textarea
                        aria-label="Reason for rejection"
                        placeholder="Enter reason for rejection..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          minHeight: "80px",
                          marginTop: "10px",
                          padding: "10px 12px",
                          border: "1px solid #CCC",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: FONT,
                          resize: "vertical",
                        }}
                      />
                      <button
                        type="button"
                        onClick={reject}
                        style={{
                          ...solidButton("#e74c3c"),
                          width: "100%",
                          marginTop: "10px",
                        }}
                      >
                        Confirm Rejection
                      </button>
                    </>
                  )}
                </>
              )}

              {status === "partially_approved" && (
                <button
                  type="button"
                  onClick={() => approve("approved")}
                  style={{ ...solidButton("#27ae60"), width: "100%" }}
                >
                  Fully Approve (balance settled)
                </button>
              )}

              {status === "withdrawn" && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => approve("approved")}
                    style={solidButton("#27ae60")}
                  >
                    Restore as Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => approve("partially_approved")}
                    style={solidButton("#2F80ED")}
                  >
                    Restore as Partial
                  </button>
                </div>
              )}

              {hasAccess && (
                <>
                  <button
                    type="button"
                    onClick={withdraw}
                    style={outlineButton("#7F8C8D")}
                  >
                    Mark as Withdrawn
                  </button>
                  <button
                    type="button"
                    onClick={viewCode}
                    style={outlineButton(NAVY)}
                  >
                    View Activation Code
                  </button>
                </>
              )}

              {status === "rejected" && (
                <>
                  <div
                    style={{
                      border: "1px solid #e74c3c",
                      borderRadius: "10px",
                      padding: "14px",
                      marginTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#e74c3c",
                        marginBottom: "6px",
                      }}
                    >
                      Rejection Notes:
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#333",
                        lineHeight: 1.4,
                      }}
                    >
                      {verification?.verificationNotes || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "12px",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid #DCDFE3",
                      backgroundColor: "#F8F9FA",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#0D2A94",
                        }}
                      >
                        Allow Re-enrollment?
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#777",
                          marginTop: "2px",
                        }}
                      >
                        Student can re-enroll using the same email address
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!verification?.allow_reenrollment}
                      aria-label="Allow re-enrollment"
                      disabled={toggling}
                      onClick={toggleReenrollment}
                      style={{
                        width: "64px",
                        height: "30px",
                        borderRadius: "15px",
                        border: 0,
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: verification?.allow_reenrollment
                          ? "#27ae60"
                          : "#CCC",
                        opacity: toggling ? 0.6 : 1,
                        transition: "background-color 0.2s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: verification?.allow_reenrollment
                            ? "38px"
                            : "4px",
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          backgroundColor: "#fff",
                          transition: "left 0.2s",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "7px",
                          left: verification?.allow_reenrollment
                            ? "10px"
                            : "32px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#fff",
                          fontFamily: FONT,
                        }}
                      >
                        {verification?.allow_reenrollment ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {verification?.allow_reenrollment && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "10px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #27ae60",
                        backgroundColor: "#f0fff4",
                        fontSize: "12px",
                        color: "#27ae60",
                      }}
                    >
                      <CheckCircle2 size={16} /> Student is now allowed to
                      re-enroll with the same email.
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {preview && (
        <DocumentPreview
          url={preview.url}
          title={preview.title}
          downloadName={preview.downloadName}
          onClose={() => setPreview(null)}
        />
      )}
      {codeInfo && (
        <CodeModal {...codeInfo} onClose={() => setCodeInfo(null)} />
      )}
    </div>
  );
}

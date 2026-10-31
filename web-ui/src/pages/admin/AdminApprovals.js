import { Check, KeyRound, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import RegistrantModal, {
  Avatar,
  CodeModal,
} from "../../components/admin/RegistrantModal";
import {
  ENROLLMENT_SELECT,
  approveWithCode,
  first,
  getActivationCode,
  getStatus,
  getVerification,
  setEnrollmentStatus,
} from "../../lib/enrollmentStatus";
import { supabase } from "../../lib/supabase";

const NAVY = "#2F459B";
const FONT = "Poppins, sans-serif";

const SECTIONS = [
  { status: "pending", title: "Pending", empty: "No pending enrollments" },
  {
    status: "partially_approved",
    title: "Partially Approved",
    empty: "No partially approved students",
  },
  { status: "approved", title: "Approved", empty: "No approved enrollments" },
  { status: "withdrawn", title: "Withdrawn", empty: "No withdrawn students" },
  { status: "rejected", title: "Rejected", empty: "No rejected enrollments" },
];

const roundButton = (color) => ({
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: 0,
  backgroundColor: color,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

const fullName = (enrollment) => {
  const s = first(enrollment.student);
  return `${s?.firstName ?? ""} ${s?.lastName ?? ""}`.trim() || "Unknown";
};

export default function AdminApprovals() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [codeInfo, setCodeInfo] = useState(null);

  const fetchEnrollments = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("enrollment")
      .select(ENROLLMENT_SELECT)
      .order("enrollment_id", { ascending: false });
    if (loadError) setError(`Could not load enrollments: ${loadError.message}`);
    else setEnrollments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchEnrollments();
    setRefreshing(false);
  };

  const run = async (enrollment, task) => {
    setBusyId(enrollment.enrollment_id);
    setError("");
    setNotice("");
    try {
      await task();
      await fetchEnrollments();
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const approve = (enrollment) => {
    const name = fullName(enrollment);
    if (!window.confirm(`Approve ${name}?`)) return;
    run(enrollment, async () => {
      const { code, emailSent } = await approveWithCode(enrollment, "approved");
      setCodeInfo({ code, name, email: first(enrollment.student)?.email });
      if (!emailSent)
        setNotice(
          `The activation email to ${name} could not be sent. Use Resend Email or share the code manually.`,
        );
    });
  };

  const reject = (enrollment) => {
    if (!window.confirm(`Reject ${fullName(enrollment)}?`)) return;
    run(enrollment, () =>
      setEnrollmentStatus(
        getVerification(enrollment)?.verification_id,
        "rejected",
        "Application rejected by administrator.",
      ),
    );
  };

  const viewCode = async (enrollment) => {
    const base = {
      code: "",
      name: fullName(enrollment),
      email: first(enrollment.student)?.email,
    };
    setCodeInfo(base);
    const result = await getActivationCode(enrollment.enrollment_id);
    setCodeInfo({
      ...base,
      code: result.code ?? "",
      message:
        result.message === "The activation code has expired."
          ? "The activation code has expired. Open the student and approve again to generate a new one."
          : result.message,
    });
  };

  const ApprovalCard = ({ enrollment }) => {
    const student = first(enrollment.student);
    const status = getStatus(enrollment);
    const name = fullName(enrollment);
    const busy = busyId === enrollment.enrollment_id;
    const stop = (handler) => (event) => {
      event.stopPropagation();
      handler(enrollment);
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedId(enrollment.enrollment_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setSelectedId(enrollment.enrollment_id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          padding: "15px",
          borderRadius: "12px",
          border: `1px solid ${NAVY}`,
          backgroundColor: "#fff",
          cursor: "pointer",
        }}
      >
        <Avatar url={student?.profilephotourl} size={44} name={name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: NAVY }}>
            {name}
          </div>
          <div style={{ fontSize: "12px", color: "#777" }}>
            {first(enrollment.curriculum)?.curriculumName ?? "—"}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#aaa",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {student?.email}
          </div>
        </div>

        {busy ? (
          <span style={{ fontSize: "12px", color: NAVY }}>Working...</span>
        ) : status === "pending" ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              title="Approve"
              aria-label={`Approve ${name}`}
              onClick={stop(approve)}
              style={roundButton("#27ae60")}
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              title="Reject"
              aria-label={`Reject ${name}`}
              onClick={stop(reject)}
              style={roundButton("#e74c3c")}
            >
              <X size={18} />
            </button>
          </div>
        ) : status === "approved" || status === "partially_approved" ? (
          <button
            type="button"
            onClick={stop(viewCode)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: `1px solid ${NAVY}`,
              backgroundColor: "#fff",
              color: NAVY,
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            <KeyRound size={14} /> Code
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: FONT,
        backgroundColor: "#f5f6fa",
      }}
    >
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar
          title="Approvals"
          actions={
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: `1px solid ${NAVY}`,
                backgroundColor: "#fff",
                color: NAVY,
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              <RefreshCw size={15} /> {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          }
        />
        <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
          {error && (
            <p
              role="alert"
              style={{ color: "#c0392b", fontSize: "13px", marginTop: 0 }}
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              style={{ color: "#E67E22", fontSize: "13px", marginTop: 0 }}
            >
              {notice}
            </p>
          )}

          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : (
            SECTIONS.map((section) => {
              const items = enrollments.filter(
                (e) => getStatus(e) === section.status,
              );
              return (
                <section key={section.status} style={{ marginBottom: "28px" }}>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: NAVY,
                      margin: "0 0 12px",
                    }}
                  >
                    {section.title} ({items.length})
                  </h2>
                  {items.length === 0 ? (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#999",
                        fontStyle: "italic",
                        margin: 0,
                      }}
                    >
                      {section.empty}
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {items.map((e) => (
                        <ApprovalCard key={e.enrollment_id} enrollment={e} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      {selectedId && (
        <RegistrantModal
          enrollmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={fetchEnrollments}
        />
      )}
      {codeInfo && (
        <CodeModal {...codeInfo} onClose={() => setCodeInfo(null)} />
      )}
    </div>
  );
}

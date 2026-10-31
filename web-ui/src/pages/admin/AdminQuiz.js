import { ClipboardList, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";

const NAVY = "#0D2A94";

const STATUS_COLORS = {
  Draft: { bg: "#FFF4E0", text: "#B26A00" },
  Open: { bg: "#E3F6EC", text: "#1E9E5A" },
  Closed: { bg: "#FDECEA", text: "#C0392B" },
};

const formatDue = (iso) => {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Due: ${date}, ${time}`;
};

export default function AdminQuiz() {
  const navigate = useNavigate();
  const { courseId: courseIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = Number(courseIdParam);
  const isDiagnostic = searchParams.get("diagnostic") === "1";

  const [courseTitle, setCourseTitle] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [diagnosticModuleId, setDiagnosticModuleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [courseRes, quizRes, diagRes] = await Promise.all([
        supabase
          .from("course")
          .select("courseName")
          .eq("course_id", courseId)
          .maybeSingle(),
        supabase
          .from("assessment")
          .select(
            "assessment_id, module_id, title, deadline, isPublished, isClosed, closeAfterDeadline, totalItems, module!inner(course_id)",
          )
          .eq("module.course_id", courseId)
          .order("deadline", { ascending: true, nullsFirst: false }),
        supabase.rpc("get_diagnostic_quiz"),
      ]);

      if (quizRes.error)
        setError(`Could not load quizzes: ${quizRes.error.message}`);
      const diagModuleId = diagRes.data?.module_id ?? null;

      const rows = (quizRes.data ?? [])
        .filter((q) =>
          isDiagnostic
            ? q.module_id === diagModuleId
            : q.module_id !== diagModuleId,
        )
        .map((q) => {
          const pastDeadline =
            q.closeAfterDeadline &&
            q.deadline &&
            new Date(q.deadline) < new Date();
          return {
            ...q,
            status: !q.isPublished
              ? "Draft"
              : q.isClosed || pastDeadline
                ? "Closed"
                : "Open",
          };
        });

      setCourseTitle(
        isDiagnostic
          ? "Diagnostic Examination"
          : (courseRes.data?.courseName ?? "Course"),
      );
      setDiagnosticModuleId(diagModuleId);
      setQuizzes(rows);
      setLoading(false);
    };
    load();
  }, [courseId, isDiagnostic]);

  const openEditor = (assessmentId) => {
    const query =
      isDiagnostic && diagnosticModuleId
        ? `?diagnostic=1&moduleId=${diagnosticModuleId}`
        : "";
    navigate(
      `/admin/courses/${courseId}/quiz/${assessmentId ?? "new"}${query}`,
    );
  };

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
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar
          title="Quiz"
          actions={
            <button
              type="button"
              onClick={() => openEditor()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "38px",
                padding: "0 14px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: NAVY,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <Plus size={18} /> New Quiz
            </button>
          }
        />

        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1280px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/admin/courses")}
            style={{
              border: 0,
              background: "none",
              padding: 0,
              color: NAVY,
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: "12px",
            }}
          >
            ← Back to Courses
          </button>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid #eee",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{ padding: "18px 24px", borderBottom: "1px solid #EEE" }}
            >
              <div style={{ fontSize: "17px", fontWeight: "700", color: NAVY }}>
                {courseTitle}
              </div>
              {!isDiagnostic && (
                <div
                  style={{ fontSize: "13px", color: "#777", marginTop: "2px" }}
                >
                  Quizzes
                </div>
              )}
            </div>

            <div style={{ padding: "20px 24px" }}>
              {error && (
                <p
                  role="alert"
                  style={{ color: "#c0392b", fontSize: "13px", marginTop: 0 }}
                >
                  {error}
                </p>
              )}
              {loading ? (
                <p
                  style={{
                    color: "#aaa",
                    textAlign: "center",
                    padding: "40px 0",
                  }}
                >
                  Loading quizzes...
                </p>
              ) : quizzes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <ClipboardList size={56} color="#BDC3C7" />
                  <p
                    style={{
                      fontSize: "16px",
                      color: "#95A5A6",
                      margin: "12px 0 4px",
                    }}
                  >
                    No quizzes yet.
                  </p>
                  <p style={{ fontSize: "13px", color: "#BDC3C7", margin: 0 }}>
                    Click "New Quiz" to create one.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  {quizzes.map((q) => {
                    const colors = STATUS_COLORS[q.status];
                    return (
                      <button
                        key={q.assessment_id}
                        type="button"
                        onClick={() => openEditor(q.assessment_id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          width: "100%",
                          textAlign: "left",
                          backgroundColor: "#EEF1F6",
                          border: 0,
                          borderRadius: "10px",
                          padding: "16px",
                          cursor: "pointer",
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              color: NAVY,
                            }}
                          >
                            {q.title}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#1A1A2E",
                              marginTop: "4px",
                            }}
                          >
                            {formatDue(q.deadline)}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6B7280",
                              marginTop: "4px",
                            }}
                          >
                            {q.totalItems}{" "}
                            {q.totalItems === 1 ? "question" : "questions"}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            backgroundColor: colors.bg,
                            color: colors.text,
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {q.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

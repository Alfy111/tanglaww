import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  Image,
  Lightbulb,
  Link,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import finalCoaching from "../../assets/images/final-coaching.jpg";
import integrative from "../../assets/images/integrative.jpg";
import letAdvanced from "../../assets/images/let-advanced.jpg";
import letExpress from "../../assets/images/let-express.jpg";
import letOnBoarding from "../../assets/images/let-on-boarding.jpg";
import testHighlights from "../../assets/images/test-highlights.jpg";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";

const NAVY = "#1a1a6e";

const courseImages = {
  1: letOnBoarding,
  2: letExpress,
  3: letAdvanced,
  4: integrative,
  5: finalCoaching,
  6: testHighlights,
};

const SECTIONS = [
  { label: "Learning Modules", icon: FileText, path: "handouts" },
  { label: "Recorded Sessions", icon: Video, path: "recorded-sessions" },
  { label: "Quiz", icon: Lightbulb, path: "quiz" },
  { label: "Online Session Link", icon: Link, path: "online-session" },
];

const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid #eee",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

function DiagnosticCard({ diagnostic, onOpen }) {
  const subtitle = !diagnostic?.assessment_id
    ? "No exam yet · Click to create"
    : diagnostic.isPublished
      ? diagnostic.title
      : `Draft · ${diagnostic.title}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        ...cardStyle,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        width: "100%",
        padding: "16px 20px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          backgroundColor: "#EEF1FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ClipboardList size={24} color={NAVY} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#333" }}>
          Diagnostic Examination
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#7F8C8D",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight size={20} color="#BDC3C7" />
    </button>
  );
}

function CourseCard({ course, expanded, onToggle, onOpenSection }) {
  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          display: "block",
          width: "100%",
          padding: 0,
          border: 0,
          background: "none",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: "#f0f0f0",
            height: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {courseImages[course.course_id] ? (
            <img
              src={courseImages[course.course_id]}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Image size={32} color="#bbb" />
          )}
        </div>
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a2e" }}
            >
              {course.courseName}
            </div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
              {course.instructor ?? "—"}
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={22} color={NAVY} />
          ) : (
            <ChevronDown size={22} color={NAVY} />
          )}
        </div>
      </button>

      {expanded && (
        <div
          style={{
            backgroundColor: "#F0F2F8",
            borderTop: "1px solid #eee",
            padding: "0 18px 6px",
          }}
        >
          {SECTIONS.map(({ label, icon: Icon, path }, i) => (
            <button
              key={path}
              type="button"
              onClick={() => onOpenSection(path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                padding: "12px 0",
                border: 0,
                borderBottom:
                  i < SECTIONS.length - 1 ? "1px solid #E0E0E0" : "none",
                background: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                textAlign: "left",
              }}
            >
              <Icon size={18} color={NAVY} />
              <span
                style={{
                  fontSize: "14px",
                  color: NAVY,
                  fontWeight: "500",
                  textDecoration: "underline",
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [diagnostic, setDiagnostic] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: courseData, error: courseError }, { data: diagData }] =
        await Promise.all([
          supabase
            .from("course")
            .select("course_id, courseName, instructor")
            .order("course_id"),
          supabase.rpc("get_diagnostic_quiz"),
        ]);
      if (courseError)
        setError(`Could not load courses: ${courseError.message}`);
      setCourses(courseData ?? []);
      setDiagnostic(diagData ?? null);
      setLoading(false);
    };
    fetchAll();
  }, []);

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
          title="Courses"
          actions={
            <button
              type="button"
              onClick={() => navigate("/admin/analytics")}
              aria-label="Open analytics"
              title="Analytics"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                height: "38px",
                padding: "0 12px",
                border: "none",
                borderRadius: "8px",
                background: "transparent",
                color: "#1a1a2e",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <BarChart3 size={22} /> Analytics
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
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : (
            <>
              {error && (
                <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
                  {error}
                </p>
              )}

              <div style={{ marginBottom: "20px" }}>
                <DiagnosticCard
                  diagnostic={diagnostic}
                  onOpen={() =>
                    navigate(
                      `/admin/courses/${diagnostic?.course_id ?? 1}/quiz?diagnostic=1`,
                    )
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {courses.map((course) => (
                  <CourseCard
                    key={course.course_id}
                    course={course}
                    expanded={expanded === course.course_id}
                    onToggle={() =>
                      setExpanded((prev) =>
                        prev === course.course_id ? null : course.course_id,
                      )
                    }
                    onOpenSection={(path) =>
                      navigate(`/admin/courses/${course.course_id}/${path}`)
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

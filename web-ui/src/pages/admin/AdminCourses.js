import { BarChart3, ChevronDown, ChevronUp, FileText, Image, Lightbulb, Link, PlusCircle, Video } from "lucide-react";
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

const courseImages = {
  1: letOnBoarding,
  2: letExpress,
  3: letAdvanced,
  4: integrative,
  5: finalCoaching,
  6: testHighlights,
};

const SECTIONS = [
  { label: "Handouts", icon: <FileText size={16} color="#1a1a6e" />, path: "handouts" },
  { label: "Recorded Sessions", icon: <Video size={16} color="#1a1a6e" />, path: "recorded-sessions" },
  { label: "Quiz", icon: <Lightbulb size={16} color="#1a1a6e" />, path: "quiz" },
  { label: "Online Session Link", icon: <Link size={16} color="#1a1a6e" />, path: "online-session" },
];

export default function AdminCourses() {
    const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const { data: courseData } = await supabase
      .from("course")
      .select("course_id, courseName, instructor")
      .order("course_id");

    setCourses(courseData ?? []);
    setLoading(false);
  };

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Poppins, sans-serif", backgroundColor: "#f5f6fa" }}>
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1 }}>
        <AdminTopbar
          title="Courses"
          actions={(
            <button
              type="button"
              onClick={() => navigate("/admin/analytics")}
              aria-label="Open analytics"
              title="Analytics"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", padding: 0, border: "none", borderRadius: "8px", background: "transparent", color: "#1a1a2e", cursor: "pointer" }}
            >
              <BarChart3 size={24} />
            </button>
          )}
        />
        <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : (
            courses.map((course) => (
              <div key={course.course_id} style={{ backgroundColor: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

                {/* Thumbnail */}
                <div style={{ backgroundColor: "#f0f0f0", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  {courseImages[course.course_id] ? (
                    <img src={courseImages[course.course_id]} alt={course.courseName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Image size={32} color="#bbb" />
                  )}
                </div>

                {/* Course row */}
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a2e" }}>{course.courseName}</div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{course.instructor ?? "—"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Expand */}
                    <button onClick={() => toggleExpand(course.course_id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                      {expanded[course.course_id] ? <ChevronUp size={20} color="#1a1a6e" /> : <ChevronDown size={20} color="#1a1a6e" />}
                    </button>
                  </div>
                </div>

                {/* Expanded sections */}
                {expanded[course.course_id] && (
                  <div style={{ backgroundColor: "#f8f9ff", borderTop: "1px solid #eee" }}>
                   {SECTIONS.map((s, i) => (
  <div key={i} onClick={() => navigate(`/admin/courses/${course.course_id}/${s.path}`)} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 24px", borderBottom: i < SECTIONS.length - 1 ? "1px solid #eee" : "none", cursor: "pointer" }}>
    {s.icon}
    <span style={{ fontSize: "14px", color: "#1a1a6e", fontWeight: "500", textDecoration: "underline" }}>{s.label}</span>
  </div>
))}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 24px", cursor: "pointer" }}>
                      <PlusCircle size={16} color="#aaa" />
                      <span style={{ fontSize: "14px", color: "#aaa" }}>Add new section</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  Image,
  Lightbulb,
  Lock,
  Share2,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import finalCoaching from "../assets/images/final-coaching.jpg";
import integrative from "../assets/images/integrative.jpg";
import letAdvanced from "../assets/images/let-advanced.jpg";
import letExpress from "../assets/images/let-express.jpg";
import letOnBoarding from "../assets/images/let-on-boarding.jpg";
import testHighlights from "../assets/images/test-highlights.jpg";
import Sidebar from "../components/Sidebar";
import {
  ProfileCard,
  ReviewProgressCard,
  UpcomingSessionsCard,
  getMyCourseProgress,
  getMyStudent,
  summarizeProgress,
} from "../components/StudentSidePanel";
import UserTopbar from "../components/UserTopbar";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const NAVY = "#2F459B";

const courseImages = {
  1: letOnBoarding,
  2: letExpress,
  3: letAdvanced,
  4: integrative,
  5: finalCoaching,
  6: testHighlights,
  7: finalCoaching,
};

const SECTIONS = [
  { key: "handouts", label: "Learning Modules", icon: FileText },
  { key: "sessions", label: "Recorded Sessions", icon: Video },
  { key: "quizzes", label: "Quiz", icon: Lightbulb },
  { key: "online", label: "Online Session Link", icon: Share2 },
];

const lockMessage = (status) => {
  switch (status?.lockReason) {
    case "payment":
      return "Please settle the remaining balance to access the remaining courses";
    case "access":
      return "Your enrollment is not active. Please contact the admin.";
    default:
      return `Complete ${status?.previousCourseName ?? "the previous course"} to unlock`;
  }
};

function SectionCheck({ done, total }) {
  if (!total) return null;
  return (
    <CheckCircle2
      size={18}
      color={done >= total ? "#1E9E5A" : "#C4C9D2"}
      style={{ marginLeft: "auto", flexShrink: 0 }}
    />
  );
}

export default function Courses() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);

  useEffect(() => {
    getMyStudent().then(setStudent);
    supabase.rpc("get_diagnostic_quiz").then(({ data }) => {
      if (data?.assessment_id && data?.isPublished) setDiagnostic(data);
    });

    const load = async () => {
      try {
        const [{ data, error }, progressRows] = await Promise.all([
          supabase
            .from("course")
            .select("course_id, courseName, instructor, sort_order")
            .order("sort_order")
            .order("course_id"),
          getMyCourseProgress(),
        ]);
        if (error) throw new Error(error.message);
        setCourses(data ?? []);
        setProgress(progressRows);
      } catch (err) {
        setLoadError(err.message ?? "Unable to load courses.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const progressById = new Map(progress.map((p) => [p.course_id, p]));
  const visibleCourses = courses.filter(
    (c) => progressById.get(c.course_id)?.lockReason !== "not_applicable",
  );

  const openSection = (course, section) => {
    navigate(`/dashboard/courses/${course.course_id}?section=${section}`, {
      state: { courseTitle: course.courseName },
    });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Courses" />

        <div className="dashboard-content">
          <div className="dashboard-left">
            {loadError && (
              <p
                role="alert"
                style={{ color: "#c0392b", fontSize: "13px", margin: 0 }}
              >
                {loadError}
              </p>
            )}

            {diagnostic && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/quiz/${diagnostic.assessment_id}`)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  textAlign: "left",
                  padding: "15px",
                  borderRadius: "12px",
                  border: 0,
                  borderLeft: "4px solid #FFB800",
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "#EEF1FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ClipboardList size={22} color={NAVY} />
                </span>
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#333",
                    }}
                  >
                    {diagnostic.title || "Diagnostic Examination"}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "#7F8C8D",
                      marginTop: "2px",
                    }}
                  >
                    Diagnostic Examination
                  </span>
                </span>
                <ChevronRight size={20} color="#BDC3C7" />
              </button>
            )}

            {loading ? (
              <div className="card">
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                  Loading courses...
                </p>
              </div>
            ) : visibleCourses.length === 0 ? (
              <div className="card">
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                  No courses available.
                </p>
              </div>
            ) : (
              visibleCourses.map((course) => {
                const status = progressById.get(course.course_id);
                const isLocked = !!status?.lockReason;
                const isExpanded = expandedId === course.course_id;
                const percent = status?.percent ?? 0;
                const toggle = () =>
                  !isLocked &&
                  setExpandedId(isExpanded ? null : course.course_id);

                return (
                  <div
                    key={course.course_id}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: isExpanded
                        ? "1px solid #0D2A94"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={isLocked ? -1 : 0}
                      aria-expanded={isLocked ? undefined : isExpanded}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggle();
                      }}
                      style={{ cursor: isLocked ? "default" : "pointer" }}
                    >
                      <div
                        style={{
                          position: "relative",
                          height: "180px",
                          backgroundColor: "#F2F4F7",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {courseImages[course.course_id] ? (
                          <img
                            src={courseImages[course.course_id]}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Image size={28} color="#bbb" />
                        )}

                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            backgroundColor: "#fff",
                            border: "1px solid #EEE",
                            borderRadius: "12px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#555",
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: `2px solid ${percent >= 100 ? "#2ECC71" : "#BDC3C7"}`,
                            }}
                          />
                          {percent}%
                        </div>

                        {isLocked && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              backgroundColor: "rgba(0,0,0,0.25)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 1,
                            }}
                          >
                            <Lock size={36} color="#fff" />
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "15px 18px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "#333",
                            }}
                          >
                            {course.courseName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#7F8C8D" }}>
                            {course.instructor ?? "—"}
                          </div>
                          {isLocked && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#E74C3C",
                                marginTop: "4px",
                              }}
                            >
                              {lockMessage(status)}
                            </div>
                          )}
                        </div>
                        {!isLocked &&
                          (isExpanded ? (
                            <ChevronUp size={22} color="#BDC3C7" />
                          ) : (
                            <ChevronDown size={22} color="#BDC3C7" />
                          ))}
                      </div>
                    </div>

                    {isExpanded && !isLocked && (
                      <div
                        style={{
                          backgroundColor: "#F0F2F8",
                          padding: "4px 18px 8px",
                        }}
                      >
                        {SECTIONS.map(({ key, label, icon: Icon }, i) => {
                          const done = Number(status?.[`${key}Done`]) || 0;
                          const total = Number(status?.[`${key}Total`]) || 0;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => openSection(course, key)}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                padding: "12px 0",
                                border: 0,
                                borderBottom:
                                  i < SECTIONS.length - 1
                                    ? "1px solid #E0E0E0"
                                    : 0,
                                background: "none",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                textAlign: "left",
                              }}
                            >
                              <Icon size={20} color={NAVY} />
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  color: NAVY,
                                  textDecoration: "underline",
                                }}
                              >
                                {label}
                              </span>
                              {key !== "online" && (
                                <SectionCheck done={done} total={total} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="dashboard-right">
            <ProfileCard student={student} />
            <ReviewProgressCard
              summary={loading ? null : summarizeProgress(progress)}
              loading={loading}
            />
            <UpcomingSessionsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

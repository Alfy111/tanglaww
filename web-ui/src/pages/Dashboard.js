import { ArrowRight, Megaphone, Quote, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dashboardBanner from "../assets/dashboardBanner.png";
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
import { getSlides } from "../lib/carousel";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const first = (value) => (Array.isArray(value) ? value[0] : value);

function Highlights() {
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getSlides()
      .then(setSlides)
      .catch(() => setSlides([]));
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      4000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const image = slides.length
    ? slides[active % slides.length]?.image_url
    : dashboardBanner;

  return (
    <>
      <div
        style={{
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
          width: "100%",
          aspectRatio: "16 / 9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={image}
          alt="Highlight"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
      </div>
      {slides.length > 1 && (
        <div className="carousel-dots" style={{ marginTop: "12px" }}>
          {slides.map((slide, i) => (
            <button
              key={slide.slide_id}
              type="button"
              aria-label={`Show highlight ${i + 1}`}
              className={`dot ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [affirmation, setAffirmation] = useState(null);
  const [lastMaterial, setLastMaterial] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setAnnouncements(data ?? []));

    supabase
      .from("affirmation")
      .select("id, content")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setAffirmation(data));

    getMyCourseProgress()
      .then((courses) => setSummary(summarizeProgress(courses)))
      .catch(() => setSummary(summarizeProgress([])));

    const loadStudent = async () => {
      const data = await getMyStudent();
      if (!data) return;
      setStudent(data);

      const { data: recent } = await supabase
        .from("material_progress")
        .select(
          `lastAccessedAt, learning_material ( title, "materialType", module ( course_id, course ( "courseName" ) ) )`,
        )
        .eq("student_id", data.id)
        .order("lastAccessedAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      const material = first(recent?.learning_material);
      if (material) {
        const module = first(material.module);
        setLastMaterial({
          title: material.title,
          kind:
            material.materialType === "recorded_session"
              ? "Recorded Session"
              : "Handout",
          courseName: first(module?.course)?.courseName ?? "",
        });
      }
    };
    loadStudent();
  }, []);

  const fullName =
    `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Dashboard" />
        <div className="dashboard-content">
          <div className="dashboard-left">
            <div className="card">
              <div className="card-title" style={{ fontSize: "20px" }}>
                Welcome Back{fullName ? `, ${fullName}` : ""}!
              </div>
              <Highlights />
            </div>

            <div className="card">
              <div className="card-title">Continue where you left off...</div>
              <div
                className="session-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/dashboard/courses")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/dashboard/courses");
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="session-label">
                    {lastMaterial
                      ? `${lastMaterial.kind}${lastMaterial.courseName ? ` · ${lastMaterial.courseName}` : ""}`
                      : "Get started"}
                  </div>
                  <div className="session-title">
                    {lastMaterial?.title ?? "Go to your courses"}
                  </div>
                </div>
                <ArrowRight
                  size={20}
                  color="#0D2A94"
                  style={{ flexShrink: 0 }}
                />
              </div>
            </div>

            <div className="card">
              <div
                className="card-title"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Megaphone size={18} color="#0D2A94" /> Announcements
              </div>
              {announcements.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                  No announcements yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {announcements.map((a) => (
                    <div
                      key={a.announcement_id ?? a.id}
                      className="announcement-item"
                    >
                      <div className="announcement-title">{a.title}</div>
                      <div
                        className="announcement-content"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {a.content}
                      </div>
                      <div className="announcement-date">
                        {new Date(a.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-right">
            <ProfileCard student={student} />
            <ReviewProgressCard summary={summary} loading={!summary} />

            <div className="card affirmation-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                <Sparkles size={16} color="#ffd700" />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#ffffff",
                  }}
                >
                  Daily Affirmation
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <Quote
                  size={20}
                  color="#ffd700"
                  style={{ transform: "rotate(180deg)", flexShrink: 0 }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.5",
                    fontStyle: "italic",
                    color: "#e0e7ff",
                    margin: 0,
                  }}
                >
                  {affirmation?.content ?? "No affirmation yet."}
                </p>
              </div>
            </div>

            <UpcomingSessionsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

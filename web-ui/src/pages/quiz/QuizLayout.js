import { ArrowLeft } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import UserTopbar from "../../components/UserTopbar";
import "../Dashboard.css";

export const QUIZ_COLORS = {
  primary: "#0D2A94",
  accent: "#2F459B",
  card: "#EEF1F6",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  pass: "#22C55E",
  fail: "#E74C3C",
  correct: "#1E9E5A",
  correctBg: "#E3F6EC",
  wrong: "#C0392B",
  wrongBg: "#FDECEA",
  selectedBg: "#EEF1FB",
  empty: "#C9D2E3",
};

export const formatScore = (n) => String(Number(Number(n).toFixed(2)));

export const formatDateTime = (iso) => {
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
  return `${date}, ${time}`;
};

export const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
};

export const TYPE_LABELS = {
  mcq: "Multiple Choice",
  identification: "Identification",
  matching: "Matching Type",
};

export const quizCard = {
  backgroundColor: QUIZ_COLORS.card,
  borderRadius: "10px",
  padding: "18px 20px",
  marginBottom: "14px",
};

export const cardTitle = {
  fontSize: "17px",
  fontWeight: "700",
  color: QUIZ_COLORS.primary,
  margin: "0 0 8px",
};
export const cardText = {
  fontSize: "14px",
  color: QUIZ_COLORS.text,
  margin: "0 0 6px",
};

export default function QuizLayout({
  title,
  onBack,
  backLabel = "Back",
  maxWidth = "820px",
  children,
}) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title={title || "Quiz"} />
        <div
          style={{
            padding: "24px 32px 40px",
            maxWidth,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: 0,
                background: "none",
                color: QUIZ_COLORS.primary,
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                padding: 0,
                marginBottom: "16px",
                fontFamily: "inherit",
              }}
            >
              <ArrowLeft size={16} /> {backLabel}
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

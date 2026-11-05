import { useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiLock,
  FiSun,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { applyUserTheme, getUserThemePreference } from "../lib/userTheme";
import "./Dashboard.css";

export default function Settings() {
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(getUserThemePreference);

  const selectTheme = (theme) => {
    setSelectedTheme(theme);
    applyUserTheme(theme);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div
        className="dashboard-main"
        style={{ backgroundColor: "#f5f6fa", minHeight: "100vh" }}
      >
        {/* Header Banner */}
        <div
          style={{
            backgroundColor: "#1a1a6e",
            padding: "24px 40px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: "24px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Settings
          </h1>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "36px 40px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Account Settings */}
          <div style={{ marginBottom: "32px" }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#555",
                marginBottom: "12px",
              }}
            >
              Account Settings
            </p>
            <div style={cardStyle}>
              {/* Change Password */}
              <div
                style={rowStyle}
                onClick={() => navigate("/dashboard/settings/change-password")}
                className="settings-row"
              >
                <div style={rowLeft}>
                  <div style={iconBox}>
                    <FiLock size={16} color="#1a1a6e" />
                  </div>
                  <span style={rowLabel}>Change Password</span>
                </div>
                <FiChevronRight size={18} color="#aaa" />
              </div>

              <div style={divider} />

              {/* Manage Account */}
              <div
                style={rowStyle}
                onClick={() => navigate("/dashboard/profile")}
                className="settings-row"
              >
                <div style={rowLeft}>
                  <div style={iconBox}>
                    <FiUser size={16} color="#1a1a6e" />
                  </div>
                  <span style={rowLabel}>Manage Account</span>
                </div>
                <FiChevronRight size={18} color="#aaa" />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#555",
                marginBottom: "12px",
              }}
            >
              Preferences
            </p>
            <div style={cardStyle}>
              {/* App Theme */}
              <div style={rowStyle} onClick={() => setThemeOpen(!themeOpen)}>
                <div style={rowLeft}>
                  <div style={iconBox}>
                    <FiSun size={16} color="#1a1a6e" />
                  </div>
                  <span style={rowLabel}>App Theme</span>
                </div>
                <FiChevronDown
                  size={18}
                  color="#aaa"
                  style={{
                    transform: themeOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "0.2s",
                  }}
                />
              </div>

              {themeOpen && (
                <div
                  style={{
                    padding: "0 20px 16px 56px",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  {["Light", "Dark", "System"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selectedTheme === t.toLowerCase()}
                      onClick={() => selectTheme(t.toLowerCase())}
                      style={{
                        padding: "6px 18px",
                        borderRadius: "20px",
                        border: "1px solid #1a1a6e",
                        backgroundColor:
                          selectedTheme === t.toLowerCase()
                            ? "#1a1a6e"
                            : "#fff",
                        color:
                          selectedTheme === t.toLowerCase()
                            ? "#fff"
                            : "#1a1a6e",
                        fontSize: "13px",
                        fontFamily: "Poppins, sans-serif",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  overflow: "hidden",
  width: "100%",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 20px",
  cursor: "pointer",
};

const rowLeft = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const rowLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1a1a2e",
};

const iconBox = {
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  backgroundColor: "#eef0fb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const divider = {
  height: "1px",
  backgroundColor: "#f0f0f0",
  margin: "0 20px",
};

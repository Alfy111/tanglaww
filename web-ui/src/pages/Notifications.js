import { CheckCheck, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

const ALL_NOTIFICATIONS = [
  {
    id: 1,
    type: "Calendar Event",
    title: "Test meeting",
    date: "May 22, 2026",
    time: "6:45 PM",
    read: false,
  },
  {
    id: 2,
    type: "Calendar Event",
    title: "Tanglaw Meeting",
    date: "May 22, 2026",
    time: "6:30 PM",
    read: false,
  },
  {
    id: 3,
    type: "Announcement",
    title: "Testing",
    subtitle: "Greetings!",
    date: "May 22, 2026",
    time: "",
    read: false,
  },
  {
    id: 4,
    type: "Calendar Event",
    title: "Testing",
    subtitle: "Testing",
    date: "May 31, 2026",
    time: "6:30 AM",
    read: true,
  },
  {
    id: 5,
    type: "Calendar Event",
    title: "Test",
    subtitle: "Testing",
    date: "May 29, 2026",
    time: "12:00 PM",
    read: true,
  },
  {
    id: 6,
    type: "Calendar Event",
    title: "LEPT Advanced",
    subtitle: "Meeting",
    date: "May 2, 2026",
    time: "12:00 AM",
    read: true,
  },
  {
    id: 7,
    type: "Calendar Event",
    title: "LEPT On Boarding",
    subtitle: "Meeting",
    date: "Apr 25, 2026",
    time: "6:17 PM",
    read: true,
  },
];

const groupByDate = (notifs) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const grouped = { yesterday: [], earlier: [] };
  notifs.forEach((n) => {
    const notifDate = new Date(n.date);
    notifDate.setHours(0, 0, 0, 0);
    if (notifDate.getTime() === yesterday.getTime()) {
      grouped.yesterday.push(n);
    } else {
      grouped.earlier.push(n);
    }
  });
  return grouped;
};

export default function Notifications() {
  const [notifs, setNotifs] = useState(ALL_NOTIFICATIONS);
  const markAllRead = () =>
    setNotifs((n) => n.map((item) => ({ ...item, read: true })));
  const clearAll = () => setNotifs([]);
  const grouped = groupByDate(notifs);
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-search">
            <Search size={16} color="#aaa" />
            <input placeholder="Enter search terms" />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "32px 40px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#1a1a2e",
                  margin: 0,
                }}
              >
                Notifications
              </h1>
              {unread > 0 && (
                <p
                  style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}
                >
                  {unread} unread
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={markAllRead}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#f0f3ff",
                  color: "#1a1a6e",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
              <button
                onClick={clearAll}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#fff",
                  color: "#e53935",
                  border: "1px solid #e53935",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                <Trash2 size={14} /> Clear all
              </button>
            </div>
          </div>

          {/* Grouped List */}
          {notifs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#aaa",
                fontSize: "14px",
              }}
            >
              No notifications
            </div>
          ) : (
            Object.entries(grouped).map(
              ([group, items]) =>
                items.length > 0 && (
                  <div key={group} style={{ marginBottom: "32px" }}>
                    <h2
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#666",
                        marginBottom: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {items.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "12px",
                            backgroundColor: "#fff",
                            border: "1px solid #1a1a6e",
                            borderRadius: "12px",
                            padding: "16px",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#1a1a6e",
                                fontStyle: "italic",
                                fontWeight: "600",
                              }}
                            >
                              {n.type}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "700",
                                color: "#1a1a6e",
                                marginTop: "4px",
                              }}
                            >
                              {n.title}
                            </div>
                            {n.subtitle && (
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#666",
                                  marginTop: "2px",
                                }}
                              >
                                {n.subtitle}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#aaa",
                                marginTop: "6px",
                              }}
                            >
                              {n.date} {n.time && `· ${n.time}`}
                            </div>
                          </div>

                          {/* Unread dot */}
                          {!n.read && (
                            <div
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: "#1a1a6e",
                                flexShrink: 0,
                                marginTop: "4px",
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
            )
          )}
        </div>
      </div>
    </div>
  );
}

import { Bell, CheckCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const MOCK_NOTIFICATIONS = [
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

export default function NotificationBell({ isAdmin = false }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const ref = useRef();
  const navigate = useNavigate();

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Group notifications by date (Yesterday/Earlier)
  const groupByDate = () => {
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

  const grouped = groupByDate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () =>
    setNotifs((n) => n.map((item) => ({ ...item, read: true })));
  const dismiss = (id) => setNotifs((n) => n.filter((item) => item.id !== id));

  if (isAdmin) {
    return (
      <div
        onClick={() => navigate("/admin/announcements")}
        style={{ position: "relative", cursor: "pointer" }}
      >
        <Bell size={20} color="#fff" />
      </div>
    );
  }

  // Render notification item with blue-bordered box design
  const renderNotificationItem = (n) => (
    <div
      key={n.id}
      style={{
        border: "1px solid #1a1a6e",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "12px",
        backgroundColor: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
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
          <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
            {n.subtitle}
          </div>
        )}
        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "6px" }}>
          {n.date} {n.time && `· ${n.time}`}
        </div>
      </div>
      <button
        onClick={() => dismiss(n.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ccc",
          padding: "4px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ position: "relative", cursor: "pointer" }}
      >
        <Bell size={20} color="#fff" />
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "#e53935",
              color: "#fff",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount}
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            right: 0,
            width: "420px",
            backgroundColor: "#fff",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            zIndex: 999,
            overflow: "hidden",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
            }}
          >
            <span
              style={{ fontWeight: "700", fontSize: "16px", color: "#1a1a2e" }}
            >
              Notifications
            </span>
            <button
              onClick={markAllRead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "#f0f3ff",
                color: "#1a1a6e",
                border: "none",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>

          {/* Notifications content */}
          <div
            style={{ maxHeight: "500px", overflowY: "auto", padding: "16px" }}
          >
            {notifs.length === 0 ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#aaa",
                  fontSize: "13px",
                }}
              >
                No notifications
              </div>
            ) : (
              <>
                {/* Yesterday Section */}
                {grouped.yesterday.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#666",
                        marginBottom: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Yesterday
                    </div>
                    {grouped.yesterday.map(renderNotificationItem)}
                  </div>
                )}

                {/* Earlier Section */}
                {grouped.earlier.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#666",
                        marginBottom: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Earlier
                    </div>
                    {grouped.earlier.map(renderNotificationItem)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            <button
              onClick={() => {
                navigate("/dashboard/notifications");
                setOpen(false);
              }}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: "#1a1a6e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Read All
            </button>
            <button
              onClick={() => setNotifs([])}
              style={{
                padding: "10px 16px",
                backgroundColor: "#fff",
                color: "#e53935",
                border: "1px solid #e53935",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

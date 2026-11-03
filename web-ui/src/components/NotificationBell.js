import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KIND_LABELS, useNotificationFeed } from "../lib/notifications";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const dayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const routeFor = (n) => {
  if (n.kind === "enrollment") return "/admin/approvals";
  if (n.kind === "balance_receipt") return "/admin/students";
  if (n.kind === "quiz") return "/dashboard/courses";
  return null;
};

export default function NotificationBell({ isAdmin = false }) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();
  const { items, unreadCount, isUnread, markAllRead, clearAll } =
    useNotificationFeed(isAdmin ? "admin" : "student");

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setConfirmClear(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const today = dayStart(Date.now());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups = [
    ["Today", items.filter((n) => dayStart(n.created_at) === today)],
    ["Yesterday", items.filter((n) => dayStart(n.created_at) === yesterday)],
    ["Earlier", items.filter((n) => dayStart(n.created_at) < yesterday)],
  ];

  const renderNotificationItem = (n) => {
    const route = routeFor(n);
    return (
      <div
        key={n.id}
        onClick={
          route
            ? () => {
                setOpen(false);
                navigate(route);
              }
            : undefined
        }
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
          cursor: route ? "pointer" : "default",
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
            {KIND_LABELS[n.kind]}
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
          {n.body && (
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {n.body}
            </div>
          )}
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: "6px" }}>
            {n.event_at
              ? `${formatDate(n.event_at)} · ${formatTime(n.event_at)}`
              : formatDate(n.created_at)}
          </div>
        </div>
        {isUnread(n) && (
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
    );
  };

  const sectionTitle = {
    fontSize: "12px",
    fontWeight: "700",
    color: "#666",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setOpen((o) => !o);
        }}
        style={{ position: "relative", cursor: "pointer", display: "flex" }}
      >
        <Bell size={20} color={isAdmin ? "#1a1a2e" : "#fff"} />
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "#e53935",
              color: "#fff",
              borderRadius: "8px",
              minWidth: "16px",
              height: "16px",
              padding: "0 3px",
              boxSizing: "border-box",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            right: 0,
            width: "min(420px, calc(100vw - 32px))",
            backgroundColor: "#fff",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            zIndex: 999,
            overflow: "hidden",
            fontFamily: "Poppins, sans-serif",
          }}
        >
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
            {unreadCount > 0 && (
              <button
                type="button"
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
            )}
          </div>

          <div
            style={{ maxHeight: "500px", overflowY: "auto", padding: "16px" }}
          >
            {items.length === 0 ? (
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
              groups.map(([title, list]) =>
                list.length > 0 ? (
                  <div key={title} style={{ marginBottom: "20px" }}>
                    <div style={sectionTitle}>{title}</div>
                    {list.map(renderNotificationItem)}
                  </div>
                ) : null,
              )
            )}
          </div>

          {items.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                gap: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              {!isAdmin && (
                <button
                  type="button"
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
                  View All
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  clearAll();
                  setConfirmClear(false);
                }}
                style={{
                  flex: isAdmin ? 1 : undefined,
                  padding: "10px 16px",
                  backgroundColor: confirmClear ? "#e53935" : "#fff",
                  color: confirmClear ? "#fff" : "#e53935",
                  border: "1px solid #e53935",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {confirmClear ? "Click again to clear" : "Clear All"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

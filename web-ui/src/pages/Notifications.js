import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { KIND_LABELS, useNotificationFeed } from "../lib/notifications";
import "./Dashboard.css";

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
const minutesUntil = (iso) =>
  Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
const toUrl = (link) => (/^https?:\/\//i.test(link) ? link : `https://${link}`);

export default function Notifications() {
  const navigate = useNavigate();
  const { items, loading, soon, isUnread, markAllRead, clearAll } =
    useNotificationFeed("student");
  const [confirmClear, setConfirmClear] = useState(false);

  // Keep the dots for what was new when the page opened, then mark as read.
  const newIds = useRef(null);
  useEffect(() => {
    if (loading) return;
    const fresh = items.filter(isUnread);
    if (!newIds.current) newIds.current = new Set();
    if (fresh.length === 0) return;
    fresh.forEach((n) => newIds.current.add(n.id));
    markAllRead();
  }, [loading, items, isUnread, markAllRead]);
  const showDot = (n) => newIds.current?.has(n.id) || isUnread(n);

  const today = dayStart(Date.now());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups = [
    ["Today", items.filter((n) => dayStart(n.created_at) === today)],
    ["Yesterday", items.filter((n) => dayStart(n.created_at) === yesterday)],
    ["Earlier", items.filter((n) => dayStart(n.created_at) < yesterday)],
  ];

  const card = (n, highlight = false) => {
    const clickable = n.kind === "quiz";
    return (
      <div
        key={`${highlight ? "soon" : "n"}-${n.id}`}
        onClick={clickable ? () => navigate("/dashboard/courses") : undefined}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          backgroundColor: highlight ? "#EEF1FF" : "#fff",
          border: `${highlight ? 2 : 1}px solid #1a1a6e`,
          borderRadius: "12px",
          padding: "16px",
          fontFamily: "Poppins, sans-serif",
          cursor: clickable ? "pointer" : "default",
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
            {highlight
              ? `Starting in ${minutesUntil(n.event_at)} min`
              : KIND_LABELS[n.kind]}
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
                whiteSpace: "pre-line",
              }}
            >
              {n.body}
            </div>
          )}
          <div style={{ fontSize: "12px", color: "#aaa", marginTop: "6px" }}>
            {n.event_at
              ? `${formatDate(n.event_at)} · ${formatTime(n.event_at)}`
              : `Posted ${formatDate(n.created_at)}`}
          </div>
          {n.link && (
            <a
              href={toUrl(n.link)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "8px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#2F459B",
              }}
            >
              Open link <ExternalLink size={12} />
            </a>
          )}
        </div>
        {!highlight && showDot(n) && (
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

  const section = (title, list, highlight = false) =>
    list.length > 0 && (
      <div key={title} style={{ marginBottom: "32px" }}>
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
          {title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {list.map((n) => card(n, highlight))}
        </div>
      </div>
    );

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div style={{ padding: "32px 40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
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
            {items.length > 0 &&
              (confirmClear ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#555" }}>
                    Clear all notifications?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    style={smallBtn("#fff", "#555", "#ccc")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearAll();
                      setConfirmClear(false);
                    }}
                    style={smallBtn("#e53935", "#fff", "#e53935")}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  style={{
                    ...smallBtn("#fff", "#e53935", "#e53935"),
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Trash2 size={14} /> Clear all
                </button>
              ))}
          </div>

          {loading ? (
            <p style={{ color: "#999", fontSize: "14px" }}>Loading...</p>
          ) : items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#aaa",
                fontSize: "14px",
              }}
            >
              No notifications yet
            </div>
          ) : (
            <>
              {section("Starting soon", soon, true)}
              {groups.map(([title, list]) => section(title, list))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const smallBtn = (bg, color, border) => ({
  backgroundColor: bg,
  color,
  border: `1px solid ${border}`,
  borderRadius: "8px",
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
});

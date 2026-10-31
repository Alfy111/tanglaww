import NotificationBell from "../NotificationBell";

export default function AdminTopbar({ title, actions }) {
  return (
    <div
      className="admin-topbar"
      style={{
        backgroundColor: "#FFD75E",
        padding: "0 32px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          fontWeight: "700",
          color: "#000",
          margin: 0,
        }}
      >
        {title}
      </h1>
      <div
        className="admin-topbar-actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {actions}
        <NotificationBell />
      </div>
    </div>
  );
}

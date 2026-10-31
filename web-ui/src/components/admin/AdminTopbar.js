import NotificationBell from "../NotificationBell";

export default function AdminTopbar({ title, actions }) {
  return (
    <div
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {actions}
        <NotificationBell />
      </div>
    </div>
  );
}

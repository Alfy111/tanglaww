import NotificationBell from "../NotificationBell";

export default function AdminTopbar({ title, actions }) {
  return (
    <div style={{
      backgroundColor: "#f5a623", padding: "0 32px",
      height: "60px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
    }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", margin: 0 }}>{title}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {actions}
        <NotificationBell />
      </div>
    </div>
  );
}
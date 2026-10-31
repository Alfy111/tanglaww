import NotificationBell from "./NotificationBell";

export default function UserTopbar({ title }) {
  return (
    <div className="user-topbar">
      <h1 className="user-topbar-title">{title}</h1>
      <div className="user-topbar-actions">
        <NotificationBell />
      </div>
    </div>
  );
}

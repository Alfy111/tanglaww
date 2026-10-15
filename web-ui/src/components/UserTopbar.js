import { Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function UserTopbar({ title }) {
  return (
    <div className="user-topbar">
      <h1 className="user-topbar-title">{title}</h1>
      <div className="user-topbar-actions">
        <div className="user-topbar-search">
          <Search size={15} color="rgba(255,255,255,0.7)" />
          <input
            className="user-topbar-search-input"
            placeholder="Enter search terms"
            style={{
              border: "none", background: "transparent", outline: "none",
              fontSize: "13px", fontFamily: "Poppins, sans-serif",
              color: "#fff",
            }}
          />
        </div>
        <NotificationBell />
      </div>
    </div>
  );
}
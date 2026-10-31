import {
  BarChart3,
  BookOpen,
  Calendar,
  FileText,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { supabase } from "../lib/supabase";

const navItems = [
  { label: "Home", path: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/dashboard/courses", icon: BookOpen },
  { label: "Analytics", path: "/dashboard/Analytics", icon: BarChart3 },
  { label: "Calendar", path: "/dashboard/calendar", icon: Calendar },
  { label: "Profile", path: "/dashboard/profile", icon: User },
];

const bottomItems = [
  { label: "Settings", path: "/dashboard/settings", icon: Settings },
  { label: "Help", path: "/dashboard/help", icon: HelpCircle },
  { label: "About", path: "/dashboard/about", icon: Info },
  { label: "Terms & Policies", path: "/dashboard/terms", icon: FileText },
];

const isActive = (pathname, path) => {
  if (path === "/dashboard") return pathname === path;
  if (path === "/dashboard/courses")
    return pathname.startsWith(path) || pathname.startsWith("/dashboard/quiz");
  return pathname === path || pathname.startsWith(`${path}/`);
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const go = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut().catch(() => {});
    setSigningOut(false);
    navigate("/signin", { replace: true });
  };

  const renderLink = ({ label, path, icon: Icon }) => {
    const active = isActive(location.pathname, path);
    return (
      <div
        key={path}
        role="link"
        tabIndex={0}
        aria-current={active ? "page" : undefined}
        className={`sidebar-link ${active ? "active" : ""}`}
        onClick={() => go(path)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(path);
        }}
      >
        <Icon size={18} />
        {label}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label={
          mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
        }
        aria-expanded={mobileMenuOpen}
        aria-controls="dashboard-sidebar"
        onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        id="dashboard-sidebar"
        className={`sidebar${mobileMenuOpen ? " sidebar-open" : ""}`}
      >
        <div
          role="link"
          tabIndex={0}
          className="sidebar-brand"
          onClick={() => go("/dashboard")}
          onKeyDown={(e) => {
            if (e.key === "Enter") go("/dashboard");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "4px 24px 20px",
            cursor: "pointer",
          }}
        >
          <img
            src={logo}
            alt=""
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <span
            className="sidebar-brand-name"
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#0D2A94",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Tanglaw
          </span>
        </div>

        <span className="sidebar-section-label">Overview</span>
        {navItems.map(renderLink)}

        <div className="sidebar-bottom">
          {bottomItems.map(renderLink)}
          <div
            role="button"
            tabIndex={0}
            className="sidebar-link signout"
            onClick={() => {
              setMobileMenuOpen(false);
              setShowSignOutConfirm(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setShowSignOutConfirm(true);
            }}
          >
            <LogOut size={18} />
            Sign Out
          </div>
        </div>
      </aside>
      {showSignOutConfirm && (
        <div
          className="signout-modal-backdrop"
          onClick={() => setShowSignOutConfirm(false)}
        >
          <section
            className="signout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="signout-modal-title">Sign out?</h2>
            <p>Are you sure you want to sign out of your account?</p>
            <div className="signout-modal-actions">
              <button
                type="button"
                className="signout-modal-cancel"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="signout-modal-confirm"
                disabled={signingOut}
                onClick={signOut}
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

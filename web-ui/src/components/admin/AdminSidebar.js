import {
  BarChart3,
  BookOpen,
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./AdminLayout.css";

const isActivePath = (pathname, path) =>
  pathname === path ||
  (path !== "/admin/dashboard" && pathname.startsWith(`${path}/`));

const OVERVIEW = [
  {
    label: "Home",
    path: "/admin/dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: "Approvals",
    path: "/admin/approvals",
    icon: <CheckSquare size={18} />,
  },
  {
    label: "Calendar",
    path: "/admin/calendar",
    icon: <CalendarIcon size={18} />,
  },
  { label: "Courses", path: "/admin/courses", icon: <BookOpen size={18} /> },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: <BarChart3 size={18} />,
  },
];

const MANAGEMENT = [
  {
    label: "Student Registry",
    path: "/admin/students",
    icon: <Users size={18} />,
  },
];

const CONFIG = [
  {
    label: "About Tanglaw & TARC",
    path: "/admin/about",
    icon: <Info size={18} />,
  },
];

const BOTTOM = [
  { label: "Help", path: "/admin/help", icon: <HelpCircle size={18} /> },
  { label: "Policies", path: "/admin/policies", icon: <FileText size={18} /> },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "admin",
  });
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  useEffect(() => {
    let active = true;

    const loadAdmin = async (userId) => {
      if (!userId) {
        if (active)
          setAdmin({ firstName: "", lastName: "", email: "", role: "admin" });
        return;
      }

      const { data, error } = await supabase
        .from("admin")
        .select("firstName, lastName, email, role")
        .eq("admin_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load admin profile for navigation", error);
        return;
      }

      if (active) {
        setAdmin(
          data ?? { firstName: "", lastName: "", email: "", role: "admin" },
        );
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Failed to read session for admin navigation", error);
        return;
      }
      loadAdmin(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (active)
          setAdmin({ firstName: "", lastName: "", email: "", role: "admin" });
        return;
      }
      if (!session?.user?.id) return;
      // Run the query after the auth callback finishes. Awaiting Supabase calls
      // inside this callback can lock up the client until the page is reloaded.
      setTimeout(() => loadAdmin(session.user.id), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const roleLabel =
    admin.role === "owner"
      ? "Owner"
      : admin.role === "super_admin"
        ? "Super Admin"
        : "Instructor";

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.alert(`Unable to sign out: ${error.message}`);
      return;
    }

    navigate("/admin/signin", { replace: true });
  };

  const linkStyle = (path) => {
    const active = isActivePath(location.pathname, path);
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      color: active ? "#2F459B" : "#555",
      backgroundColor: active ? "#EEF1FF" : "transparent",
      borderLeft: active ? "3px solid #2F459B" : "3px solid transparent",
      transition: "all 0.15s",
    };
  };

  return (
    <>
      {!menuOpen && (
        <button
          type="button"
          className="admin-menu-toggle"
          aria-label="Open navigation menu"
          aria-expanded={false}
          aria-controls="admin-sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
        </button>
      )}
      {menuOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="admin-sidebar"
        className={`admin-sidebar${menuOpen ? " admin-sidebar-open" : ""}`}
        style={{
          width: "240px",
          backgroundColor: "#fff",
          borderRight: "1px solid #eee",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          overflowY: "auto",
        }}
      >
        {/* Admin Profile Header */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#FFD75E",
            padding: "24px 20px 20px",
          }}
        >
          <button
            type="button"
            className="admin-sidebar-close"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a6e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div
            style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a6e" }}
          >
            {`${admin.firstName} ${admin.lastName}`.trim()}
          </div>
          <div style={{ fontSize: "12px", color: "#1a1a6e", opacity: 0.8 }}>
            {roleLabel}
          </div>
          <div style={{ fontSize: "11px", color: "#1a1a6e", opacity: 0.7 }}>
            {admin.email}
          </div>
        </div>

        {/* Overview */}
        <div style={{ padding: "16px 0 0" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#aaa",
              padding: "0 24px",
              marginBottom: "6px",
              letterSpacing: "0.08em",
            }}
          >
            OVERVIEW
          </div>
          {OVERVIEW.map((item) => (
            <div
              key={item.path}
              role="link"
              tabIndex={0}
              aria-current={
                isActivePath(location.pathname, item.path) ? "page" : undefined
              }
              style={linkStyle(item.path)}
              onClick={() => go(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(item.path);
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {item.icon}
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Management */}
        <div style={{ padding: "16px 0 0" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#aaa",
              padding: "0 24px",
              marginBottom: "6px",
              letterSpacing: "0.08em",
            }}
          >
            MANAGEMENT
          </div>
          {[
            ...MANAGEMENT,
            ...(admin.role === "owner" || admin.role === "super_admin"
              ? [
                  {
                    label: "Manage Admins",
                    path: "/admin/manage-admins",
                    icon: <UserCog size={18} />,
                  },
                ]
              : []),
          ].map((item) => (
            <div
              key={item.path}
              role="link"
              tabIndex={0}
              aria-current={
                isActivePath(location.pathname, item.path) ? "page" : undefined
              }
              style={linkStyle(item.path)}
              onClick={() => go(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(item.path);
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {item.icon}
                {item.label}
              </div>
              {item.badge && (
                <div
                  style={{
                    backgroundColor: "#e53935",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.badge}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* App Configuration */}
        <div style={{ padding: "16px 0 0" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#aaa",
              padding: "0 24px",
              marginBottom: "6px",
              letterSpacing: "0.08em",
            }}
          >
            APP CONFIGURATION
          </div>
          {CONFIG.map((item) => (
            <div
              key={item.path}
              role="link"
              tabIndex={0}
              aria-current={
                isActivePath(location.pathname, item.path) ? "page" : undefined
              }
              style={linkStyle(item.path)}
              onClick={() => go(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(item.path);
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {item.icon}
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid #eee",
            paddingTop: "12px",
          }}
        >
          {BOTTOM.map((item) => (
            <div
              key={item.path}
              role="link"
              tabIndex={0}
              aria-current={
                isActivePath(location.pathname, item.path) ? "page" : undefined
              }
              style={linkStyle(item.path)}
              onClick={() => go(item.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(item.path);
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {item.icon}
                {item.label}
              </div>
            </div>
          ))}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setMenuOpen(false);
              setShowSignOutConfirm(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setShowSignOutConfirm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              color: "#e53935",
            }}
          >
            <LogOut size={18} /> Sign Out
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
            aria-labelledby="admin-signout-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="admin-signout-modal-title">Sign out?</h2>
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
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

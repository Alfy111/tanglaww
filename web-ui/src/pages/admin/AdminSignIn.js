import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { clearFailedLogins, getLoginLockout, getLockoutMessage, recordFailedLogin } from "../../lib/loginLockout";
import { supabase } from "../../lib/supabase";
import "../SignIn.css";

export default function AdminSignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);
  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    const refreshLockout = () => {
      try {
        const status = getLoginLockout("admin", normalizedEmail);
        if (active) {
          setLockoutRemainingMs(status.remainingMs);
          setErrors((previous) => {
            if (previous[0]?.startsWith("You've been temporarily locked out")) {
              return status.remainingMs > 0 ? [getLockoutMessage(status.remainingMs)] : [];
            }
            return previous;
          });
        }
      } catch (error) {
        if (active) setErrors([`Unable to check sign-in status: ${error.message}`]);
      }
    };

    refreshLockout();
    const intervalId = window.setInterval(refreshLockout, 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [normalizedEmail]);

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #ccc", fontSize: "14px",
    fontFamily: "Poppins, sans-serif", boxSizing: "border-box",
    marginTop: "4px", outline: "none",
  };

  const labelStyle = {
    fontSize: "13px", fontWeight: "600", color: "#222",
    marginTop: "16px", display: "block",
  };

  const handleSignIn = async () => {
    if (lockoutRemainingMs > 0) {
      setErrors([getLockoutMessage(lockoutRemainingMs)]);
      return;
    }

    const newErrors = [];
    if (!email.trim()) newErrors.push("Email is required.");
    if (!password.trim()) newErrors.push("Password is required.");
    if (newErrors.length > 0) { setErrors(newErrors); return; }

    setErrors([]);
    setLoading(true);

    try {
      console.log("STEP 1: attempting sign in...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      console.log("STEP 2: auth result", { data, error });

      if (error) {
        if (error.status === 400) {
          const status = recordFailedLogin("admin", normalizedEmail);
          setLockoutRemainingMs(status.remainingMs);
          setErrors([status.remainingMs > 0
            ? getLockoutMessage(status.remainingMs)
            : `Invalid email or password. ${5 - status.attempts} attempt${status.attempts === 4 ? "" : "s"} remaining before a temporary lockout.`]);
        } else {
          setErrors([error.message]);
        }
        return;
      }

      clearFailedLogins("admin", normalizedEmail);
      setLockoutRemainingMs(0);
      const { data: adminRow, error: adminLookupError } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", data.user.id)
        .maybeSingle();

      if (adminLookupError) throw new Error(`Unable to verify administrator access: ${adminLookupError.message}`);

      if (!adminRow) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw new Error(`Access denied. This account is not an administrator. Sign-out failed: ${signOutError.message}`);
        setErrors(["Access denied. This account is not an administrator."]);
        return;
      }

      navigate("/admin/dashboard");
    } catch (err) {
      setErrors([err.message ?? "Something went wrong."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar brandOnly />
      <div className={`auth-card${location.state?.authTransition === "student-to-admin" ? " auth-card--enter-from-right" : ""}`}>

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-block", backgroundColor: "#fff8e1", color: "#f5a623", fontWeight: "700", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", border: "1px solid #f5a623", marginBottom: "12px" }}>
            ADMIN PORTAL
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1a1a6e", marginBottom: "6px" }}>Sign in</h1>
          <p style={{ fontSize: "13px", color: "#888" }}>Authorized administrators only.</p>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "#222", marginTop: "16px" }}>Welcome Back, Admin!</p>
        </div>

        {errors.length > 0 && (
          <div style={{ backgroundColor: "#fff5f5", border: "1px solid #e53935", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
            {errors.map((e, i) => <p key={i} style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}>• {e}</p>)}
          </div>
        )}

        <div>
          <span style={labelStyle}>Email Address:</span>
          <input
            style={inputStyle}
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "4px" }}>
          <span style={labelStyle}>Password:</span>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ ...inputStyle, paddingRight: "40px" }}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", border: "none", background: "none", padding: "4px", display: "flex", alignItems: "center", color: "#888" }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "right", marginTop: "6px" }}>
          <button type="button" onClick={() => navigate("/admin/forgot-password")} style={{ border: 0, padding: 0, background: "none", fontSize: "12px", color: "#1a1a6e", cursor: "pointer", fontWeight: "600", fontFamily: "inherit" }}>Forgot Password?</button>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading || lockoutRemainingMs > 0}
          style={{ width: "100%", padding: "14px", backgroundColor: "#f5a623", color: "#1a1a2e", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: loading || lockoutRemainingMs > 0 ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif", marginTop: "24px", opacity: loading || lockoutRemainingMs > 0 ? 0.7 : 1 }}
        >
          {loading ? "Signing in..." : "Sign In as Admin"}
        </button>

        <div style={{ textAlign: "center", marginTop: "28px", fontSize: "12px", color: "#888" }}>
          Not an admin?{" "}
          <button type="button" onClick={() => navigate("/signin", { state: { authTransition: "admin-to-student" } })} style={{ border: 0, padding: 0, background: "none", color: "#1a1a6e", fontWeight: "700", cursor: "pointer", font: "inherit" }}>Student Sign-in</button>
        </div>
        <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "#888" }}>
          Got an admin invite?{" "}
          <button type="button" onClick={() => navigate("/admin/activate")} style={{ color: "#1a1a6e", fontWeight: "700", cursor: "pointer", border: 0, padding: 0, background: "none", font: "inherit" }}>Activate account</button>
        </div>
      </div>
    </div>
  );
}
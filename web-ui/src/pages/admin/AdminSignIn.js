import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginWarningModal from "../../components/LoginWarningModal";
import Navbar from "../../components/Navbar";
import {
  clearLoginFailures,
  formatRemaining,
  getLockStatus,
  isWrongPasswordError,
  normalizeEmail,
  recordLoginFailure,
  warningFor,
} from "../../lib/loginLockout";
import { supabase } from "../../lib/supabase";
import { useLoginLock } from "../../lib/useLoginLock";
import "../SignIn.css";

export default function AdminSignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null);
  const normalizedEmail = normalizeEmail(email);
  const lock = useLoginLock(normalizedEmail);

  const goToReset = () => {
    setWarning(null);
    navigate(
      `/admin/forgot-password${normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : ""}`,
    );
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 0",
    border: 0,
    borderBottom: "1px solid #CCC",
    fontSize: "16px",
    fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box",
    outline: "none",
    background: "transparent",
    color: "#000",
  };

  const labelStyle = {
    fontSize: "14px",
    fontWeight: "700",
    color: "#555",
    marginBottom: "5px",
    display: "block",
  };

  const handleSignIn = async () => {
    if (lock.locked) return;

    const newErrors = [];
    if (!email.trim()) newErrors.push("Email is required.");
    if (!password.trim()) newErrors.push("Password is required.");
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setLoading(true);

    try {
      const lockStatus = await getLockStatus(normalizedEmail);
      if (lockStatus.remainingSeconds > 0) {
        lock.apply(lockStatus);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if (isWrongPasswordError(error)) {
          const status = await recordLoginFailure(normalizedEmail);
          lock.apply(status);
          const nextWarning = warningFor(status);
          if (nextWarning) setWarning(nextWarning);
          else setErrors(["Invalid email or password."]);
        } else {
          setErrors([error.message]);
        }
        return;
      }

      await clearLoginFailures().catch(() => {});
      const { data: adminRow, error: adminLookupError } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", data.user.id)
        .maybeSingle();

      if (adminLookupError)
        throw new Error(
          `Unable to verify administrator access: ${adminLookupError.message}`,
        );

      if (!adminRow) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError)
          throw new Error(
            `Access denied. This account is not an administrator. Sign-out failed: ${signOutError.message}`,
          );
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
      <div
        className={`auth-card${location.state?.authTransition === "student-to-admin" ? " auth-card--enter-from-right" : ""}`}
      >

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-block", backgroundColor: "#fff8e1", color: "#f5a623", fontWeight: "700", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", border: "1px solid #f5a623", marginBottom: "12px" }}>
            ADMIN PORTAL
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1a1a6e", marginBottom: "6px" }}>Sign in</h1>
          <p style={{ fontSize: "13px", color: "#888" }}>Authorized administrators only.</p>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "#222", marginTop: "16px" }}>Welcome Back, Admin!</p>
        </div>

        <div>
          <label htmlFor="admin-email" style={labelStyle}>
              Email:
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              style={{ ...inputStyle, marginBottom: "20px" }}
              placeholder="Enter Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="admin-password" style={labelStyle}>
              Password:
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid #CCC",
                marginBottom: "25px",
              }}
            >
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                style={{
                  ...inputStyle,
                  borderBottom: 0,
                  flex: 1,
                  color: lock.locked ? "#A9A9A9" : "#000",
                }}
                placeholder={
                  lock.locked ? "Password entry disabled" : "Password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                disabled={lock.locked}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: 0,
                  background: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: "gray",
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {lock.locked ? (
              <p
                style={{
                  color: "#c0392b",
                  fontSize: "12px",
                  margin: "0 0 12px",
                }}
              >
                Too many wrong attempts. Try again in{" "}
                {formatRemaining(lock.remaining)}.
              </p>
            ) : lock.lockCount > 0 ? (
              <p
                style={{
                  color: "#B26A00",
                  fontSize: "12px",
                  margin: "0 0 12px",
                }}
              >
                One more wrong password will disable sign-in for 10 minutes.
              </p>
            ) : null}

            {errors.length > 0 && (
              <div
                role="alert"
                style={{
                  backgroundColor: "#fff5f5",
                  border: "1px solid #e74c3c",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                {errors.map((e, i) => (
                  <p
                    key={i}
                    style={{
                      color: "#c0392b",
                      fontSize: "13px",
                      margin: "2px 0",
                    }}
                  >
                    {e}
                  </p>
                ))}
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: "-5px" }}>
              <button
                type="button"
                onClick={goToReset}
                style={{
                  border: 0,
                  padding: 0,
                  background: "none",
                  fontSize: "12px",
                  color: "#A9A9A9",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: "20px",
                }}
              >
                Forgot Password?
              </button>
            </div>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading || lock.locked}
          style={{ width: "100%", padding: "14px", backgroundColor: "#f5a623", color: "#1a1a2e", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: loading || lock.locked ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif", marginTop: "24px", opacity: loading || lock.locked ? 0.7 : 1 }}
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
      <LoginWarningModal
        warning={warning}
        onClose={() => setWarning(null)}
        onReset={goToReset}
      />
    </div>
  );
}

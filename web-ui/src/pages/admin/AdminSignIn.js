import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AdminSignIn() {
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

  const linkStyle = {
    border: 0,
    padding: 0,
    background: "none",
    font: "inherit",
    color: "#0D2A94",
    fontWeight: "700",
    textDecoration: "underline",
    cursor: "pointer",
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
    <div
      style={{
        fontFamily: "Poppins, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Navbar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 16px",
          minHeight: "calc(100vh - 100px)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            margin: 0,
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: "32px 40px 40px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#FFD75E",
                margin: "8px 0 0",
              }}
            >
              Administrator Login
            </h1>
            <p style={{ fontSize: "14px", color: "#666", margin: "5px 0 0" }}>
              Authorized administrators only.
            </p>
            <p
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#333",
                margin: "25px 0",
              }}
            >
              Welcome Back, Admin!
            </p>
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

            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading || lock.locked}
              style={{
                width: "100%",
                padding: "15px",
                backgroundColor: "#FFD75E",
                color: "#000",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "700",
                fontFamily: "Poppins, sans-serif",
                cursor: loading || lock.locked ? "not-allowed" : "pointer",
                opacity: loading || lock.locked ? 0.6 : 1,
              }}
            >
              {loading ? "Signing in..." : "Sign-In"}
            </button>
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: "28px",
              fontSize: "14px",
              color: "#666",
            }}
          >
            Got an admin invite?{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/activate")}
              style={linkStyle}
            >
              Activate admin account
            </button>
          </p>
          <p
            style={{
              textAlign: "center",
              marginTop: "10px",
              fontSize: "14px",
              color: "#666",
            }}
          >
            Not an admin?{" "}
            <button
              type="button"
              onClick={() => navigate("/signin")}
              style={linkStyle}
            >
              Student Sign-in
            </button>
          </p>
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

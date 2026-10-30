import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginWarningModal from "../components/LoginWarningModal";
import Navbar from "../components/Navbar";
import {
  clearLoginFailures,
  formatRemaining,
  getLockStatus,
  isWrongPasswordError,
  normalizeEmail,
  recordLoginFailure,
  warningFor,
} from "../lib/loginLockout";
import { supabase } from "../lib/supabase";
import { useLoginLock } from "../lib/useLoginLock";

export default function SignIn() {
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
      `/forgot-password${normalizedEmail ? `?email=${encodeURIComponent(normalizedEmail)}` : ""}`,
    );
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${hasError ? "#e53935" : "#ccc"}`,
    fontSize: "14px",
    fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box",
    marginTop: "4px",
    outline: "none",
  });

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#222",
    marginTop: "16px",
    display: "block",
  };

  const handleSignIn = async () => {
    if (lock.locked) return;

    const newErrors = [];
    if (!email.trim()) newErrors.push("Email is required.");
    if (!password.trim()) newErrors.push("Password is required.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.push("Please enter a valid email address.");
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

      // Check if user is an admin — if so, block
      const { data: adminRow } = await supabase
        .from("admin")
        .select("admin_id")
        .eq("admin_id", data.user.id)
        .maybeSingle();

      if (adminRow) {
        await supabase.auth.signOut();
        setErrors(["Admins must use the Admin Sign In page."]);
        setLoading(false);
        return;
      }

      // Check student exists
      const { data: student, error: studentError } = await supabase
        .from("student")
        .select("id, firstName, lastName")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (studentError || !student) {
        await supabase.auth.signOut();
        setErrors(["No student account found for this email."]);
        setLoading(false);
        return;
      }

      const { data: enrollmentStatus } = await supabase.rpc(
        "my_enrollment_status",
      );
      if (enrollmentStatus === "withdrawn") {
        await supabase.auth.signOut();
        setErrors([
          "Your enrollment has been withdrawn. Please contact the admin if you wish to continue.",
        ]);
        return;
      }

      navigate("/dashboard");
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
          maxWidth: "480px",
          margin: "60px auto",
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          padding: "48px 40px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#1a1a6e",
              marginBottom: "6px",
            }}
          >
            Sign in
          </h1>
          <p style={{ fontSize: "13px", color: "#888" }}>
            Ready to beat the boards? Sign in now!
          </p>
          <p
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#222",
              marginTop: "16px",
            }}
          >
            Welcome Back, Achiever!
          </p>
        </div>

        {errors.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff5f5",
              border: "1px solid #e53935",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            {errors.map((e, i) => (
              <p
                key={i}
                style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}
              >
                • {e}
              </p>
            ))}
          </div>
        )}

        <div>
          <span style={labelStyle}>Email Address:</span>
          <input
            style={inputStyle(false)}
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginTop: "4px" }}>
          <span style={labelStyle}>Password:</span>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              style={{ ...inputStyle(false), paddingRight: "40px" }}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              disabled={lock.locked}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                border: "none",
                background: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                color: "#888",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {lock.locked ? (
          <p style={{ color: "#c0392b", fontSize: "12px", margin: "8px 0 0" }}>
            Too many wrong attempts. Try again in{" "}
            {formatRemaining(lock.remaining)}.
          </p>
        ) : lock.lockCount > 0 ? (
          <p style={{ color: "#B26A00", fontSize: "12px", margin: "8px 0 0" }}>
            One more wrong password will disable sign-in for 10 minutes.
          </p>
        ) : null}

        <div style={{ textAlign: "right", marginTop: "6px" }}>
          <button
            type="button"
            onClick={goToReset}
            style={{
              border: 0,
              padding: 0,
              background: "none",
              fontSize: "12px",
              color: "#1a1a6e",
              cursor: "pointer",
              fontWeight: "600",
              fontFamily: "inherit",
            }}
          >
            Forgot Password?
          </button>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading || lock.locked}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#1a1a6e",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: loading || lock.locked ? "not-allowed" : "pointer",
            fontFamily: "Poppins, sans-serif",
            marginTop: "24px",
            opacity: loading || lock.locked ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div
          style={{ display: "flex", alignItems: "center", margin: "20px 0" }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }} />
          <span style={{ margin: "0 12px", fontSize: "12px", color: "#aaa" }}>
            or
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }} />
        </div>

        <button
          type="button"
          onClick={() => navigate("/signin/code")}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            backgroundColor: "#fff",
            color: "#1a1a6e",
            border: "1px solid #d7d9e3",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <KeyRound size={16} /> Use enrollment code
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "28px",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "#888" }}>
            New here?{" "}
            <span
              onClick={() => navigate("/enroll")}
              style={{ color: "#1a1a6e", fontWeight: "700", cursor: "pointer" }}
            >
              Enroll now!
            </span>
          </span>
          <span style={{ color: "#888" }}>
            For Instructors:{" "}
            <span
              onClick={() => navigate("/admin/signin")}
              style={{ color: "#f5b700", fontWeight: "700", cursor: "pointer" }}
            >
              Admin Sign-in
            </span>
          </span>
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

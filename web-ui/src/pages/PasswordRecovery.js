import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { normalizeEmail } from "../lib/loginLockout";
import {
  passwordProblems,
  resetPasswordWithCode,
  sendResetCode,
} from "../lib/passwordReset";

const RESEND_SECONDS = 60;

export default function PasswordRecovery({
  isAdmin = false,
  isResetPage = false,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [resendIn, setResendIn] = useState(0);
  const signInPath = isAdmin ? "/admin/signin" : "/signin";
  const forgotPath = isAdmin ? "/admin/forgot-password" : "/forgot-password";
  const title = isAdmin ? "Admin Password" : "Password";

  useEffect(() => {
    if (isResetPage) navigate(forgotPath, { replace: true });
  }, [isResetPage, forgotPath, navigate]);

  const counting = resendIn > 0;
  useEffect(() => {
    if (!counting) return undefined;
    const timer = window.setInterval(
      () => setResendIn((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [counting]);

  const sendCode = async () => {
    setErrors([]);
    setLoading(true);
    try {
      await sendResetCode(email);
      setStep("code");
      setResendIn(RESEND_SECONDS);
    } catch (error) {
      setErrors([
        error.message || "Unable to send the reset code. Please try again.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
      setErrors(["Please enter a valid email address."]);
      return;
    }
    sendCode();
  };

  const handleReset = async (event) => {
    event.preventDefault();
    const problems = [];
    if (!/^\d{6}$/.test(code))
      problems.push("Enter the 6-digit code from your email.");
    problems.push(...passwordProblems(password, confirmPassword));
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    setLoading(true);
    try {
      await resetPasswordWithCode(email, code, password);
      setStep("success");
    } catch (error) {
      setErrors(
        (
          error.message || "Unable to update your password. Please try again."
        ).split("\n"),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box",
    marginTop: "6px",
    outline: "none",
  };
  const labelStyle = {
    display: "block",
    marginTop: "16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#222",
  };
  const linkButton = {
    border: 0,
    padding: 0,
    background: "none",
    color: "#1a1a6e",
    fontWeight: "700",
    cursor: "pointer",
    font: "inherit",
  };

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    backgroundColor: isAdmin ? "#f5a623" : "#1a1a6e",
    color: isAdmin ? "#1a1a2e" : "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "Poppins, sans-serif",
    marginTop: "20px",
    opacity: loading ? 0.7 : 1,
  };

  const renderErrors = errors.length > 0 && (
    <div
      role="alert"
      style={{
        backgroundColor: "#fff5f5",
        border: "1px solid #e53935",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
      }}
    >
      {errors.map((error) => (
        <p
          key={error}
          style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}
        >
          {errors.length > 1 ? `• ${error}` : error}
        </p>
      ))}
    </div>
  );

  const passwordInput = (id, label, value, setValue, visible, setVisible) => (
    <>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ ...inputStyle, paddingRight: "44px" }}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(!visible)}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            padding: "4px",
            color: "#707782",
            border: 0,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </>
  );

  const subtitle = {
    email:
      "Enter the email address linked to your account and we'll send you a 6-digit reset code.",
    code: "Enter the code we emailed you, then choose a new password.",
    success:
      "Your password has been updated. You can now sign in with your new password.",
  }[step];

  return (
    <div
      style={{
        fontFamily: "Poppins, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Navbar />
      <main
        style={{
          width: "calc(100% - 32px)",
          maxWidth: "480px",
          margin: "60px auto",
          backgroundColor: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          padding: "40px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          {isAdmin && (
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#fff8e1",
                color: "#f5a623",
                fontWeight: "700",
                fontSize: "12px",
                padding: "4px 14px",
                borderRadius: "20px",
                border: "1px solid #f5a623",
                marginBottom: "12px",
              }}
            >
              ADMIN PORTAL
            </div>
          )}
          <h1
            style={{
              fontSize: "25px",
              fontWeight: "700",
              color: "#1a1a6e",
              margin: "0 0 8px",
            }}
          >
            {step === "success"
              ? "Password updated"
              : step === "code"
                ? `Reset ${title.toLowerCase()}`
                : `Forgot ${title.toLowerCase()}?`}
          </h1>
          <p style={{ fontSize: "13px", color: "#777", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>

        {renderErrors}

        {step === "email" && (
          <form onSubmit={handleSendCode}>
            <label
              htmlFor="recovery-email"
              style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}
            >
              Email address
            </label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors([]);
              }}
              placeholder="you@example.com"
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleReset}>
            <p
              style={{
                fontSize: "13px",
                color: "#555",
                textAlign: "center",
                margin: "0 0 4px",
              }}
            >
              If an account exists, we sent a code to{" "}
              <strong>{normalizeEmail(email)}</strong>. It expires in 15
              minutes.
            </p>
            <label htmlFor="reset-code" style={labelStyle}>
              6-digit reset code
            </label>
            <input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setErrors([]);
              }}
              placeholder="Enter code"
              style={{ ...inputStyle, letterSpacing: "0.3em" }}
            />
            {passwordInput(
              "new-password",
              "New password",
              password,
              setPassword,
              showPassword,
              setShowPassword,
            )}
            {passwordInput(
              "confirm-password",
              "Confirm new password",
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              setShowConfirm,
            )}
            <p style={{ color: "#777", fontSize: "12px", lineHeight: 1.5 }}>
              At least 8 characters with an uppercase letter, a lowercase
              letter, a number, and a special character.
            </p>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Updating..." : "Reset password"}
            </button>
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                marginTop: "16px",
              }}
            >
              {resendIn > 0 ? (
                <span style={{ color: "#999" }}>
                  Resend code in {resendIn}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading}
                  style={linkButton}
                >
                  Resend code
                </button>
              )}
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setErrors([]);
                }}
                style={linkButton}
              >
                Change email
              </button>
            </p>
          </form>
        )}

        <div
          style={{ textAlign: "center", marginTop: "24px", fontSize: "13px" }}
        >
          <button
            type="button"
            onClick={() => navigate(signInPath)}
            style={linkButton}
          >
            Back to {isAdmin ? "admin " : ""}sign in
          </button>
        </div>
      </main>
    </div>
  );
}

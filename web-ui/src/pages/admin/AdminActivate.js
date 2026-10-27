import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { activateAdmin, verifyAdminInvite } from "../../lib/adminInvites";

const PASSWORD_RULES = [
  { test: (password) => password.length >= 8, message: "Password must be at least 8 characters." },
  { test: (password) => /[0-9]/.test(password), message: "Password must contain at least one number." },
  { test: (password) => /[a-z]/.test(password), message: "Password must contain at least one lowercase letter." },
  { test: (password) => /[A-Z]/.test(password), message: "Password must contain at least one uppercase letter." },
  { test: (password) => [...password].some((character) => "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?".includes(character)), message: "Password must contain at least one special character." },
];

export default function AdminActivate() {
  const navigate = useNavigate();
  const [step, setStep] = useState("code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1px solid #ccc", fontSize: "14px",
    fontFamily: "Poppins, sans-serif", boxSizing: "border-box",
    marginTop: "6px", outline: "none",
  };
  const labelStyle = { display: "block", marginTop: "16px", fontSize: "13px", fontWeight: "600", color: "#222" };

  const handleVerify = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit activation code from your invite email.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const verifiedInvite = await verifyAdminInvite(normalizedEmail, code);
      setInvite(verifiedInvite);
      setStep("password");
    } catch (verificationError) {
      setError(verificationError.message || "Unable to verify the invite code.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (event) => {
    event.preventDefault();
    const validationErrors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);
    if (password !== confirmPassword) validationErrors.push("Passwords do not match.");
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      await activateAdmin(email, code, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (activationError) {
      setErrors([activationError.message || "Unable to activate the admin account."]);
    } finally {
      setLoading(false);
    }
  };

  const passwordInput = (id, label, value, setValue, visible, setVisible) => (
    <>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input id={id} type={visible ? "text" : "password"} autoComplete="new-password" value={value} onChange={(event) => setValue(event.target.value)} style={{ ...inputStyle, paddingRight: "44px" }} required />
        <button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setVisible((shown) => !shown)} style={{
          position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "4px",
          color: "#707782", border: 0, background: "transparent", cursor: "pointer",
        }}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Navbar />
      <main style={{ width: "calc(100% - 32px)", maxWidth: "520px", margin: "48px auto", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "40px", boxSizing: "border-box" }}>
        <button type="button" onClick={() => step === "password" ? setStep("code") : navigate("/admin/signin")} style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: 0,
          color: "#1a1a6e", border: 0, background: "transparent", cursor: "pointer", font: "inherit", fontSize: "13px",
        }}>
          <ArrowLeft size={16} /> {step === "password" ? "Back to code" : "Back to admin sign in"}
        </button>

        <div style={{ textAlign: "center", margin: "22px 0 28px" }}>
          <div style={{ display: "inline-block", backgroundColor: "#fff8e1", color: "#f5a623", fontWeight: "700", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", border: "1px solid #f5a623", marginBottom: "12px" }}>ADMIN PORTAL</div>
          <h1 style={{ fontSize: "25px", fontWeight: "700", color: "#1a1a6e", margin: "0 0 8px" }}>
            {step === "code" ? "Activate Admin Account" : "Create Your Password"}
          </h1>
          <p style={{ fontSize: "13px", color: "#777", lineHeight: 1.6, margin: 0 }}>
            {step === "code"
              ? "Enter the email address and 6-digit code sent by the owner or a super admin."
              : <>You're joining Tanglaw as <strong>{invite?.role === "super_admin" ? "Super Admin" : "Admin"}</strong>.</>}
          </p>
        </div>

        {(error || errors.length > 0) && (
          <div role="alert" style={{ backgroundColor: "#fff5f5", border: "1px solid #e53935", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
            {error && <p style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}>{error}</p>}
            {errors.map((item) => <p key={item} style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}>• {item}</p>)}
          </div>
        )}

        {step === "code" ? (
          <form onSubmit={handleVerify}>
            <label htmlFor="admin-invite-email" style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}>Email address</label>
            <input id="admin-invite-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="email@example.com" style={inputStyle} required />
            <label htmlFor="admin-invite-code" style={labelStyle}>6-digit activation code</label>
            <input id="admin-invite-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="Enter code" style={{ ...inputStyle, letterSpacing: "0.3em" }} required />
            <p style={{ color: "#777", fontSize: "12px", lineHeight: 1.5 }}>Codes expire after 3 days. If you did not receive a code, ask the owner or a super admin to resend the invite.</p>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", marginTop: "12px", backgroundColor: "#f5a623", color: "#1a1a2e", border: 0, borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleActivate}>
            <label htmlFor="admin-invite-name" style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}>Full name</label>
            <input id="admin-invite-name" value={`${invite?.firstName ?? ""} ${invite?.lastName ?? ""}`.trim()} readOnly style={{ ...inputStyle, color: "#888", backgroundColor: "#f8f8f8" }} />
            <label htmlFor="admin-invite-email-readonly" style={labelStyle}>Email</label>
            <input id="admin-invite-email-readonly" value={email.trim().toLowerCase()} readOnly style={{ ...inputStyle, color: "#888", backgroundColor: "#f8f8f8" }} />
            {passwordInput("admin-new-password", "Create password", password, setPassword, showPassword, setShowPassword)}
            {passwordInput("admin-confirm-password", "Confirm password", confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword)}
            <p style={{ color: "#777", fontSize: "12px", lineHeight: 1.5 }}>If this email already has a Tanglaw account, enter that account's current password.</p>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", marginTop: "12px", backgroundColor: "#f5a623", color: "#1a1a2e", border: 0, borderRadius: "8px", fontSize: "14px", fontWeight: "700", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Activating..." : "Activate Account"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

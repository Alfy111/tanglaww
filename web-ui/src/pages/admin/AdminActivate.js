import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import headerBg from "../../assets/tanglaw_header.png";
import Navbar from "../../components/Navbar";
import { activateAdmin, verifyAdminInvite } from "../../lib/adminInvites";
import "../SignIn.css";

const PASSWORD_RULES = [
  {
    test: (password) => password.length >= 8,
    message: "Password must be at least 8 characters.",
  },
  {
    test: (password) => /[0-9]/.test(password),
    message: "Password must contain at least one number.",
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: "Password must contain at least one lowercase letter.",
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: "Password must contain at least one uppercase letter.",
  },
  {
    test: (password) =>
      [...password].some((character) =>
        "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?".includes(character),
      ),
    message: "Password must contain at least one special character.",
  },
];

const EMPTY_CODE = ["", "", "", "", "", ""];

export default function AdminActivate() {
  const navigate = useNavigate();
  const [step, setStep] = useState("code");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(EMPTY_CODE);
  const [codeError, setCodeError] = useState("");
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const fullCode = code.join("");
  const canVerify = code.every((d) => d !== "") && email.trim().length > 0;

  const handleDigit = (value, index) => {
    const digits = value.replace(/\D/g, "");
    const next = [...code];
    if (digits.length > 1) {
      digits
        .slice(0, 6 - index)
        .split("")
        .forEach((d, i) => {
          next[index + i] = d;
        });
      setCode(next);
      inputs.current[Math.min(index + digits.length, 5)]?.focus();
    } else {
      next[index] = digits;
      setCode(next);
      if (digits && index < 5) inputs.current[index + 1]?.focus();
    }
    setCodeError("");
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !code[index] && index > 0)
      inputs.current[index - 1]?.focus();
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setCodeError("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(fullCode)) {
      setCodeError("Enter the 6-digit activation code from your invite email.");
      return;
    }

    setCodeError("");
    setLoading(true);
    try {
      const verifiedInvite = await verifyAdminInvite(normalizedEmail, fullCode);
      setInvite(verifiedInvite);
      setStep("password");
    } catch (verificationError) {
      setCodeError(
        verificationError.message || "Unable to verify the invite code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (event) => {
    event.preventDefault();
    const validationErrors = PASSWORD_RULES.filter(
      (rule) => !rule.test(password),
    ).map((rule) => rule.message);
    if (password !== confirmPassword)
      validationErrors.push("Passwords do not match.");
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      await activateAdmin(email, fullCode, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (activationError) {
      setErrors([
        activationError.message || "Unable to activate the admin account.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0D2A94",
    marginBottom: "8px",
  };
  const fieldStyle = {
    width: "100%",
    height: "50px",
    padding: "0 15px",
    borderRadius: "8px",
    border: "1px solid #DCDFE3",
    backgroundColor: "#F9FAFB",
    fontSize: "16px",
    fontFamily: "Poppins, sans-serif",
    color: "#333",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: "20px",
  };
  const primaryStyle = {
    width: "100%",
    padding: "16px",
    marginTop: "30px",
    backgroundColor: "#0D2A94",
    color: "#fff",
    border: 0,
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "700",
    fontFamily: "Poppins, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  };
  const errorBox = (content) => (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        backgroundColor: "#fff5f5",
        border: "1px solid #E74C3C",
        borderRadius: "8px",
        padding: "10px",
        marginTop: "10px",
      }}
    >
      <AlertCircle
        size={16}
        color="#E74C3C"
        style={{ flexShrink: 0, marginTop: "2px" }}
      />
      <div style={{ fontSize: "12px", color: "#E74C3C", lineHeight: "18px" }}>
        {content}
      </div>
    </div>
  );

  const passwordInput = (id, label, value, setValue, visible, setVisible) => (
    <>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div
        style={{
          ...fieldStyle,
          display: "flex",
          alignItems: "center",
          padding: "0 15px",
        }}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder={label.replace(" *", "")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{
            flex: 1,
            border: 0,
            outline: "none",
            background: "transparent",
            fontSize: "16px",
            fontFamily: "inherit",
            color: "#333",
          }}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(!visible)}
          style={{
            border: 0,
            background: "none",
            padding: "4px",
            cursor: "pointer",
            color: "#7F8C8D",
            display: "flex",
          }}
        >
          {visible ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      </div>
    </>
  );

  return (
    <div className="auth-page">
      <Navbar brandOnly />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          boxSizing: "border-box",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "480px",
            margin: 0,
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              height: "200px",
              backgroundImage: `url(${headerBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "rgba(13, 42, 148, 0.1)",
                padding: "20px",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                aria-label="Back"
                onClick={() =>
                  step === "password"
                    ? setStep("code")
                    : navigate("/admin/signin")
                }
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: 0,
                  backgroundColor: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#0D2A94",
                }}
              >
                <ArrowLeft size={22} />
              </button>
            </div>
          </div>

          <div style={{ padding: "0 30px 40px" }}>
            {step === "code" ? (
              <form onSubmit={handleVerify} style={{ paddingTop: "24px" }}>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#0D2A94",
                    margin: "0 0 8px",
                  }}
                >
                  Activate Admin Account
                </h1>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "19px",
                    margin: "0 0 24px",
                  }}
                >
                  Enter your email and the 6-digit code sent to you by the owner
                  or a super admin.
                </p>

                <label htmlFor="admin-invite-email" style={labelStyle}>
                  Email Address
                </label>
                <input
                  id="admin-invite-email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setCodeError("");
                  }}
                  style={fieldStyle}
                />

                <span style={labelStyle}>Activation Code</span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "20px",
                  }}
                >
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputs.current[index] = el;
                      }}
                      aria-label={`Digit ${index + 1}`}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={index === 0 ? 6 : 1}
                      placeholder="•"
                      value={digit}
                      onChange={(event) =>
                        handleDigit(event.target.value, index)
                      }
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      style={{
                        width: "100%",
                        maxWidth: "60px",
                        height: "55px",
                        textAlign: "center",
                        fontSize: "22px",
                        fontWeight: "700",
                        color: "#0D2A94",
                        backgroundColor: "#F9FAFB",
                        border: `2px solid ${codeError ? "#E74C3C" : digit ? "#0D2A94" : "#BDC3C7"}`,
                        borderRadius: "10px",
                        outline: "none",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  ))}
                </div>

                {codeError ? (
                  errorBox(codeError)
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      marginTop: "4px",
                    }}
                  >
                    <Lightbulb
                      size={16}
                      color="#FFB800"
                      style={{ flexShrink: 0 }}
                    />
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        fontStyle: "italic",
                        lineHeight: "17px",
                        margin: 0,
                      }}
                    >
                      Didn't get a code? Ask the owner or a super admin to send
                      the invite again. Codes expire after 3 days.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canVerify || loading}
                  style={{
                    ...primaryStyle,
                    opacity: canVerify && !loading ? 1 : 0.6,
                    cursor: canVerify && !loading ? "pointer" : "not-allowed",
                  }}
                >
                  {loading ? (
                    "Verifying..."
                  ) : (
                    <>
                      Verify Code <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleActivate} style={{ paddingTop: "24px" }}>
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#0D2A94",
                    margin: "0 0 8px",
                  }}
                >
                  Create Your Password
                </h1>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "19px",
                    margin: "0 0 24px",
                  }}
                >
                  You're joining Tanglaw as{" "}
                  <strong style={{ color: "#0D2A94" }}>
                    {invite?.role === "super_admin" ? "Super Admin" : "Admin"}
                  </strong>
                  .
                </p>

                <label htmlFor="admin-invite-name" style={labelStyle}>
                  Full Name
                </label>
                <input
                  id="admin-invite-name"
                  readOnly
                  value={`${invite?.firstName ?? ""} ${invite?.lastName ?? ""}`.trim()}
                  style={{ ...fieldStyle, color: "#888" }}
                />

                <label htmlFor="admin-invite-email-readonly" style={labelStyle}>
                  Email
                </label>
                <input
                  id="admin-invite-email-readonly"
                  readOnly
                  value={email.trim().toLowerCase()}
                  style={{ ...fieldStyle, color: "#888" }}
                />

                {passwordInput(
                  "admin-new-password",
                  "Create Password *",
                  password,
                  setPassword,
                  showPassword,
                  setShowPassword,
                )}
                {passwordInput(
                  "admin-confirm-password",
                  "Confirm Password *",
                  confirmPassword,
                  setConfirmPassword,
                  showConfirmPassword,
                  setShowConfirmPassword,
                )}

                <p
                  style={{
                    fontSize: "11px",
                    color: "#7F8C8D",
                    lineHeight: "16px",
                    margin: "-8px 0 8px",
                  }}
                >
                  If this email already has a Tanglaw account, enter that
                  account's current password instead.
                </p>

                {errors.length > 0 &&
                  errorBox(
                    errors.map((item) => <div key={item}>• {item}</div>),
                  )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...primaryStyle,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? (
                    "Activating..."
                  ) : (
                    <>
                      Activate Account <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

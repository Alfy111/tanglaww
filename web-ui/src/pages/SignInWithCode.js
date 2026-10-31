import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Search,
  User,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import "./SignIn.css";

const CODE_LENGTH = 6;

export default function SignInWithCode() {
  const navigate = useNavigate();
  const codeInputs = useRef([]);
  const [activeTab, setActiveTab] = useState("code");
  const [codeDigits, setCodeDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [activation, setActivation] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [setupErrors, setSetupErrors] = useState([]);
  const photoInput = useRef(null);
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [status, setStatus] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [allowReenroll, setAllowReenroll] = useState(false);

  const fullCode = codeDigits.join("");
  const isCodeComplete = codeDigits.every(Boolean);

  const handleCodeChange = (text, index) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      setCodeDigits((current) =>
        current.map((digit, position) => (position === index ? "" : digit)),
      );
      setCodeError("");
      return;
    }

    const nextDigits = [...codeDigits];
    digits
      .slice(0, CODE_LENGTH - index)
      .split("")
      .forEach((digit, offset) => {
        nextDigits[index + offset] = digit;
      });
    setCodeDigits(nextDigits);
    setCodeError("");
    codeInputs.current[
      Math.min(index + digits.length, CODE_LENGTH - 1)
    ]?.focus();
  };

  const handleCodeKeyDown = (event, index) => {
    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (!isCodeComplete) return;

    setCodeError("");
    setLoading(true);
    try {
      const { data: codeData, error: codeQueryError } = await supabase
        .from("activation_codes")
        .select("id, student_id, is_used, expires_at")
        .eq("code", fullCode)
        .maybeSingle();

      if (codeQueryError) throw new Error(codeQueryError.message);
      if (!codeData) {
        setCodeError("Invalid code. Please check and try again.");
        return;
      }
      if (codeData.is_used) {
        setCodeError(
          "This code has already been used. Please contact the admin if you need help.",
        );
        return;
      }
      if (!codeData.expires_at || new Date(codeData.expires_at) < new Date()) {
        setCodeError(
          "This code has expired. Please contact the admin for a new one.",
        );
        return;
      }

      const { data: student, error: studentQueryError } = await supabase
        .from("student")
        .select("id, email, firstName, middleName, lastName, isAccountSetup")
        .eq("id", codeData.student_id)
        .maybeSingle();

      if (studentQueryError) throw new Error(studentQueryError.message);
      if (!student) {
        setCodeError("Student record not found. Please contact the admin.");
        return;
      }
      if (student.isAccountSetup) {
        setCodeError(
          "This account has already been activated. Please log in instead.",
        );
        return;
      }

      setActivation({ ...codeData, student });
    } catch (error) {
      setCodeError(error.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSetupErrors(["Please choose an image file for your profile picture."]);
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSetupErrors([]);
  };

  const uploadPhoto = async (studentId) => {
    if (!photoFile) return null;
    const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `photos/${studentId}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("profiles")
      .upload(path, photoFile, {
        contentType: photoFile.type || "image/jpeg",
        upsert: true,
      });
    if (error) return null;
    return supabase.storage.from("profiles").getPublicUrl(path).data.publicUrl;
  };

  const validateSetup = () => {
    const rules = [
      [() => password.trim().length > 0, "Please create a password."],
      [() => password.length >= 8, "Password must be at least 8 characters."],
      [
        () => /[0-9]/.test(password),
        "Password must contain at least one number.",
      ],
      [
        () => /[a-z]/.test(password),
        "Password must contain at least one lowercase letter.",
      ],
      [
        () => /[A-Z]/.test(password),
        "Password must contain at least one uppercase letter.",
      ],
      [
        () => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
        "Password must contain at least one special character.",
      ],
      [() => password === confirmPassword, "Passwords do not match."],
      [
        () => {
          if (!phoneNumber.trim()) return true;
          return /^(09|\+639)\d{9}$/.test(phoneNumber.replace(/\s|-/g, ""));
        },
        "Please enter a valid mobile number (e.g. 0912-345-6789).",
      ],
    ];
    return rules.filter(([test]) => !test()).map(([, message]) => message);
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    const problems = validateSetup();
    if (problems.length) {
      setSetupErrors(problems);
      return;
    }

    setSetupErrors([]);
    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: activation.student.email,
          password,
          options: { data: { student_id: String(activation.student.id) } },
        });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error("Unable to create the account.");

      const photoUrl = signUpData.session
        ? await uploadPhoto(activation.student.id)
        : null;
      const phone = phoneNumber.replace(/\s|-/g, "");

      const { error: studentUpdateError } = await supabase
        .from("student")
        .update({
          auth_id: signUpData.user.id,
          isAccountSetup: true,
          ...(phone ? { phoneNumber: phone } : {}),
          ...(photoUrl ? { profilephotourl: photoUrl } : {}),
        })
        .eq("id", activation.student.id);

      if (studentUpdateError)
        throw new Error(
          `Failed to link account: ${studentUpdateError.message}`,
        );

      const { data: usedCode, error: useCodeError } = await supabase
        .from("activation_codes")
        .update({ is_used: true })
        .eq("id", activation.id)
        .eq("is_used", false)
        .select("id")
        .maybeSingle();

      if (useCodeError) throw new Error(useCodeError.message);
      if (!usedCode) throw new Error("This code has already been used.");

      if (signUpData.session) {
        navigate("/signin/success", { replace: true });
      } else {
        setAccountCreated(true);
      }
    } catch (error) {
      setSetupErrors([
        error.message ?? "Unable to create the account. Please try again.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (event) => {
    event.preventDefault();
    if (!email.trim() || !lastName.trim()) {
      setStatusError("Please enter both email and last name.");
      return;
    }

    setStatusError("");
    setStatusLoading(true);
    setStatus(null);
    try {
      const { data: student, error: studentQueryError } = await supabase
        .from("student")
        .select("id, firstName, lastName, email")
        .eq("email", email.trim().toLowerCase())
        .ilike("lastName", lastName.trim())
        .maybeSingle();

      if (studentQueryError || !student) {
        setStatusError("No registration found with that email and last name.");
        return;
      }

      const { data: enrollment, error: enrollmentQueryError } = await supabase
        .from("enrollment")
        .select(
          `
          enrollment_id,
          student_id,
          verification!enrollment_verification_id_fkey (
            status,
            verificationStatus,
            verificationNotes,
            allow_reenrollment
          )
        `,
        )
        .eq("student_id", student.id)
        .order("enrollment_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentQueryError || !enrollment) {
        setStatusError("No enrollment found for this account.");
        return;
      }

      const verification = Array.isArray(enrollment.verification)
        ? enrollment.verification[0]
        : enrollment.verification;

      setStudentData(student);
      const value =
        verification?.status ??
        (verification?.verificationStatus === true
          ? "approved"
          : verification?.verificationNotes
            ? "rejected"
            : "pending");
      if (value === "approved" || value === "partially_approved") {
        setStatus("approved");
      } else if (value === "withdrawn") {
        setStatus("withdrawn");
      } else if (value === "rejected") {
        setStatus("rejected");
        setRejectionNotes(verification?.verificationNotes ?? "");
        setAllowReenroll(verification?.allow_reenrollment ?? false);
      } else {
        setStatus("pending");
      }
    } catch (error) {
      setStatusError(
        error.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const resetStatus = () => {
    setStatus(null);
    setEmail("");
    setLastName("");
    setStatusError("");
    setRejectionNotes("");
    setAllowReenroll(false);
    setStudentData(null);
  };

  const buttonStyle = {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#1a1a6e",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  const setupLabel = {
    display: "block",
    marginBottom: "8px",
    color: "#0D2A94",
    fontSize: "14px",
    fontWeight: "700",
  };
  const setupField = {
    width: "100%",
    height: "50px",
    padding: "0 15px",
    border: "1px solid #DCDFE3",
    borderRadius: "8px",
    backgroundColor: "#F9FAFB",
    fontSize: "16px",
    color: "#333",
    fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box",
    outline: "none",
  };
  const setupInner = {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: "none",
    background: "transparent",
    fontSize: "16px",
    color: "#333",
    fontFamily: "inherit",
  };
  const eyeButton = {
    border: 0,
    background: "none",
    padding: "4px",
    cursor: "pointer",
    color: "#7F8C8D",
    display: "flex",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    fontFamily: "Poppins, sans-serif",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div className="auth-page">
      <Navbar brandOnly />
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "24px 0 0",
          boxSizing: "border-box",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "480px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: "32px 40px 40px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/signin")}
            aria-label="Back to sign in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: 0,
              marginBottom: "22px",
              border: "none",
              background: "none",
              color: "#1a1a6e",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Back to sign in
          </button>

          <div
            style={{
              display: "flex",
              marginBottom: "24px",
              borderBottom: "1px solid #e5e5e5",
            }}
          >
            {[
              { id: "code", label: "Enter Code", Icon: KeyRound },
              { id: "status", label: "Check Status", Icon: Search },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setCodeError("");
                  setStatusError("");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "11px 8px",
                  border: 0,
                  borderBottom:
                    activeTab === id
                      ? "2px solid #1a1a6e"
                      : "2px solid transparent",
                  backgroundColor: "transparent",
                  color: activeTab === id ? "#1a1a6e" : "#888",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {activeTab === "code" ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto 14px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#eef0fb",
                    color: "#1a1a6e",
                  }}
                >
                  <KeyRound size={22} />
                </div>
                <h1
                  style={{
                    margin: "0 0 8px",
                    color: "#1a1a6e",
                    fontSize: "26px",
                    fontWeight: "700",
                  }}
                >
                  {accountCreated
                    ? "Account created"
                    : activation
                      ? "Complete Your Profile"
                      : "Activate your Account"}
                </h1>
                <p
                  style={{
                    margin: 0,
                    color: "#888",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {accountCreated
                    ? "Your account is ready. Sign in with your email and new password."
                    : activation
                      ? `Help us personalize your learning experience. Signing up as ${activation.student.email}.`
                      : "Enter the 6-digit code provided by your administrator."}
                </p>
              </div>

              {codeError && (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    marginBottom: "14px",
                    padding: "10px 12px",
                    border: "1px solid #E74C3C",
                    borderRadius: "8px",
                    backgroundColor: "#fff5f5",
                    color: "#c13121",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle size={17} style={{ flexShrink: 0 }} />{" "}
                  {codeError}
                </div>
              )}

              {accountCreated ? (
                <button
                  type="button"
                  onClick={() => navigate("/signin", { replace: true })}
                  style={buttonStyle}
                >
                  Go to sign in
                </button>
              ) : activation ? (
                <form onSubmit={handleCreateAccount} noValidate>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      pickPhoto(event.target.files[0]);
                      event.target.value = "";
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      aria-label={
                        photoPreview
                          ? "Change profile picture"
                          : "Upload profile picture"
                      }
                      style={{
                        position: "relative",
                        width: "100px",
                        height: "100px",
                        padding: 0,
                        border: 0,
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: "100px",
                          height: "100px",
                          borderRadius: "50%",
                          backgroundColor: "#F2F4F7",
                          border: "1px solid #DCDFE3",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <User size={50} color="#BDC3C7" />
                        )}
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          right: 0,
                          bottom: 0,
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "#0D2A94",
                          border: "2px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Camera size={16} color="#fff" />
                      </span>
                    </button>
                    <span
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        fontWeight: "500",
                        color: "#0D2A94",
                      }}
                    >
                      {photoPreview
                        ? "Click to change photo"
                        : "Upload Profile Picture (optional)"}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                        maxWidth: "300px",
                        marginTop: "12px",
                        padding: "10px",
                        borderRadius: "8px",
                        backgroundColor: "#EEF1FF",
                        color: "#2F459B",
                        fontSize: "12px",
                        lineHeight: 1.45,
                      }}
                    >
                      <Info
                        size={15}
                        style={{ flexShrink: 0, marginTop: "1px" }}
                      />
                      We highly recommend using a clear, formal photo for your
                      profile picture.
                    </div>
                  </div>

                  <label htmlFor="setup-name" style={setupLabel}>
                    Full Name
                  </label>
                  <input
                    id="setup-name"
                    readOnly
                    value={`${activation.student.firstName ?? ""}${activation.student.middleName ? ` ${activation.student.middleName}` : ""} ${activation.student.lastName ?? ""}`.trim()}
                    style={{
                      ...setupField,
                      color: "#888",
                      marginBottom: "18px",
                    }}
                  />

                  <label htmlFor="setup-phone" style={setupLabel}>
                    Contact Number{" "}
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: "#95A5A6",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    id="setup-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="e.g. 0912-345-6789"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    style={{ ...setupField, marginBottom: "18px" }}
                  />

                  <label htmlFor="new-password" style={setupLabel}>
                    Create Password *
                  </label>
                  <div
                    style={{
                      ...setupField,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 15px",
                      marginBottom: "18px",
                    }}
                  >
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      style={setupInner}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      style={eyeButton}
                    >
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>

                  <label htmlFor="confirm-password" style={setupLabel}>
                    Confirm Password *
                  </label>
                  <div
                    style={{
                      ...setupField,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 15px",
                      marginBottom: "18px",
                    }}
                  >
                    <input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      style={setupInner}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      style={eyeButton}
                    >
                      {showConfirm ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>

                  {setupErrors.length > 0 && (
                    <div
                      role="alert"
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                        marginBottom: "12px",
                        padding: "12px",
                        border: "1px solid #e74c3c",
                        borderRadius: "8px",
                        backgroundColor: "#fff5f5",
                      }}
                    >
                      <AlertCircle
                        size={18}
                        color="#c0392b"
                        style={{ flexShrink: 0, marginTop: "1px" }}
                      />
                      <div>
                        {setupErrors.map((item) => (
                          <div
                            key={item}
                            style={{
                              color: "#c0392b",
                              fontSize: "13px",
                              lineHeight: 1.55,
                            }}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "#0D2A94",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? (
                      "Setting up..."
                    ) : (
                      <>
                        Finish Setup <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "14px",
                      color: "#0D2A94",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    Enter Activation Code
                  </label>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "18px",
                    }}
                  >
                    {codeDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          codeInputs.current[index] = element;
                        }}
                        aria-label={`Activation code digit ${index + 1}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={CODE_LENGTH}
                        value={digit}
                        onChange={(event) =>
                          handleCodeChange(event.target.value, index)
                        }
                        onKeyDown={(event) => handleCodeKeyDown(event, index)}
                        placeholder="•"
                        style={{
                          width: "min(55px, calc((100% - 40px) / 6))",
                          height: "55px",
                          padding: 0,
                          border: `2px solid ${codeError ? "#E74C3C" : digit ? "#0D2A94" : "#BDC3C7"}`,
                          borderRadius: "10px",
                          backgroundColor: "#F9FAFB",
                          color: "#0D2A94",
                          fontSize: "22px",
                          fontWeight: "700",
                          textAlign: "center",
                          boxSizing: "border-box",
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "7px",
                      color: "#666",
                      fontSize: "12px",
                      fontStyle: "italic",
                      lineHeight: 1.6,
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "#FFB800" }}>
                      ●
                    </span>
                    <span>
                      Contact your administrator if you haven't received your
                      code. Or use the{" "}
                      <button
                        type="button"
                        onClick={() => setActiveTab("status")}
                        style={{
                          padding: 0,
                          border: 0,
                          background: "none",
                          color: "#0D2A94",
                          font: "inherit",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Check Status
                      </button>{" "}
                      tab to see your enrollment status.
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!isCodeComplete || loading}
                    style={{
                      ...buttonStyle,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "32px",
                      opacity: isCodeComplete && !loading ? 1 : 0.6,
                    }}
                  >
                    {loading ? (
                      "Verifying..."
                    ) : (
                      <>
                        Verify Code <span aria-hidden="true">›</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    margin: "0 auto 14px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#eef0fb",
                    color: "#1a1a6e",
                  }}
                >
                  <Search size={22} />
                </div>
                <h1
                  style={{
                    margin: "0 0 8px",
                    color: "#1a1a6e",
                    fontSize: "24px",
                    fontWeight: "700",
                  }}
                >
                  Check Registration Status
                </h1>
                <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                  Enter your details to check your enrollment status.
                </p>
              </div>

              {!status && (
                <form onSubmit={handleCheckStatus}>
                  <label
                    htmlFor="status-email"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      color: "#222",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Email Address:
                  </label>
                  <input
                    id="status-email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    style={{ ...inputStyle, marginBottom: "18px" }}
                  />
                  <label
                    htmlFor="status-last-name"
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      color: "#222",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Last Name:
                  </label>
                  <input
                    id="status-last-name"
                    autoComplete="family-name"
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    style={{ ...inputStyle, marginBottom: "18px" }}
                  />
                  {statusError && (
                    <div
                      role="alert"
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "14px",
                        padding: "10px 12px",
                        border: "1px solid #E74C3C",
                        borderRadius: "8px",
                        backgroundColor: "#fff5f5",
                        color: "#c13121",
                        fontSize: "12px",
                      }}
                    >
                      <AlertCircle size={17} /> {statusError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={statusLoading}
                    style={{ ...buttonStyle, opacity: statusLoading ? 0.7 : 1 }}
                  >
                    {statusLoading ? "Checking..." : "Check Status"}
                  </button>
                </form>
              )}

              {status && studentData && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "24px",
                    border: `1px solid ${status === "pending" ? "#FFB800" : status === "approved" ? "#27ae60" : status === "withdrawn" ? "#7F8C8D" : "#e74c3c"}`,
                    borderRadius: "15px",
                    textAlign: "center",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                  }}
                >
                  {status === "pending" ? (
                    <Clock3 size={44} color="#FFB800" />
                  ) : status === "approved" ? (
                    <CheckCircle2 size={44} color="#27ae60" />
                  ) : (
                    <XCircle
                      size={44}
                      color={status === "withdrawn" ? "#7F8C8D" : "#e74c3c"}
                    />
                  )}
                  <h2
                    style={{
                      margin: "12px 0 6px",
                      color: "#333",
                      fontSize: "20px",
                    }}
                  >
                    {status === "pending"
                      ? "Under Review"
                      : status === "approved"
                        ? "Approved!"
                        : status === "withdrawn"
                          ? "Withdrawn"
                          : "Not Approved"}
                  </h2>
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#555",
                      fontSize: "15px",
                      fontWeight: "600",
                    }}
                  >
                    {status === "approved"
                      ? `Congratulations, ${studentData.firstName}!`
                      : `Hello, ${studentData.firstName}!`}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "#666",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    {status === "pending" ? (
                      "Your enrollment is currently being reviewed by our admin team. Please check again later."
                    ) : status === "approved" ? (
                      <>
                        Your enrollment has been approved. Check your email for
                        your activation code, then switch to the{" "}
                        <strong>Enter Code</strong> tab to continue.
                      </>
                    ) : status === "withdrawn" ? (
                      "Your enrollment has been marked as withdrawn. Please contact the admin if you think this is a mistake."
                    ) : (
                      "Unfortunately your enrollment was not approved at this time."
                    )}
                  </p>
                  {status === "rejected" && rejectionNotes && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "12px",
                        border: "1px solid #e74c3c",
                        borderRadius: "8px",
                        textAlign: "left",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          color: "#e74c3c",
                          fontSize: "12px",
                        }}
                      >
                        Admin Notes:
                      </strong>
                      <span
                        style={{
                          color: "#333",
                          fontSize: "13px",
                          lineHeight: 1.5,
                        }}
                      >
                        {rejectionNotes}
                      </span>
                    </div>
                  )}
                  {status === "approved" && (
                    <button
                      type="button"
                      onClick={() => {
                        resetStatus();
                        setActiveTab("code");
                      }}
                      style={{
                        ...buttonStyle,
                        width: "auto",
                        marginTop: "18px",
                        padding: "12px 24px",
                        fontSize: "14px",
                      }}
                    >
                      Go to Enter Code
                    </button>
                  )}
                  {status === "rejected" &&
                    (allowReenroll ? (
                      <button
                        type="button"
                        onClick={() => navigate("/enroll")}
                        style={{
                          ...buttonStyle,
                          width: "auto",
                          marginTop: "16px",
                          padding: "12px 24px",
                          fontSize: "14px",
                        }}
                      >
                        Re-Enroll Now
                      </button>
                    ) : (
                      <p
                        style={{
                          margin: "16px 0 0",
                          padding: "10px",
                          border: "1px solid #DCDFE3",
                          borderRadius: "8px",
                          backgroundColor: "#F8F9FA",
                          color: "#777",
                          fontSize: "12px",
                        }}
                      >
                        Re-enrollment is not yet allowed. Please contact the
                        admin.
                      </p>
                    ))}
                </div>
              )}

              {status && (
                <button
                  type="button"
                  onClick={resetStatus}
                  style={{
                    display: "block",
                    margin: "20px auto 0",
                    padding: "6px",
                    border: 0,
                    background: "none",
                    color: "#0D2A94",
                    fontSize: "14px",
                    fontWeight: "700",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Check Another
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

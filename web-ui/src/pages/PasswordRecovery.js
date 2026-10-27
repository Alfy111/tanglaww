import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";

const PASSWORD_RULES = [
  { test: (password) => password.length >= 8, message: "Password must be at least 8 characters." },
  { test: (password) => /[0-9]/.test(password), message: "Password must contain at least one number." },
  { test: (password) => /[a-z]/.test(password), message: "Password must contain at least one lowercase letter." },
  { test: (password) => /[A-Z]/.test(password), message: "Password must contain at least one uppercase letter." },
  { test: (password) => [...password].some((character) => "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?".includes(character)), message: "Password must contain at least one special character." },
];

export default function PasswordRecovery({ isAdmin = false, isResetPage = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(isResetPage ? "checking" : "email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const signInPath = isAdmin ? "/admin/signin" : "/signin";
  const forgotPath = isAdmin ? "/admin/forgot-password" : "/forgot-password";
  const title = isAdmin ? "Admin Password" : "Password";

  useEffect(() => {
    if (!isResetPage) return undefined;

    let active = true;
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hasRecoveryLink = search.get("flow") === "password-reset"
      || search.has("code")
      || hash.get("type") === "recovery"
      || (hash.has("access_token") && hash.has("refresh_token"));

    const verifyAccount = async (session) => {
      if (!session?.user || !hasRecoveryLink) return;

      const { data, error } = isAdmin
        ? await supabase.from("admin").select("admin_id").eq("admin_id", session.user.id).maybeSingle()
        : await supabase.from("student").select("id, isAccountSetup").eq("email", session.user.email?.toLowerCase()).maybeSingle();

      if (!active) return;
      if (error) {
        setStep("error");
        setMessage(`Unable to verify your account: ${error.message}`);
      } else if (!data || (!isAdmin && !data.isAccountSetup)) {
        setStep("error");
        setMessage("This reset link is not valid for this account. Request a new link from the correct sign-in page.");
      } else {
        setStep("ready");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") void verifyAccount(session);
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return;
      if (error) {
        setStep("error");
        setMessage(`Unable to verify the reset link: ${error.message}`);
      } else if (session && hasRecoveryLink) {
        void verifyAccount(session);
      } else if (!hasRecoveryLink) {
        setStep("error");
        setMessage("This reset link is missing or invalid. Please request a new password reset link.");
      } else {
        setStep("error");
        setMessage("This reset link has expired or could not be verified. Please request a new one.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isAdmin, isResetPage]);

  const handleSendReset = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrors(["Please enter a valid email address."]);
      return;
    }

    setErrors([]);
    setMessage("");
    setLoading(true);
    try {
      if (isAdmin) {
        const { data: admin, error: adminError } = await supabase
          .from("admin").select("admin_id").eq("email", normalizedEmail).maybeSingle();
        if (adminError) throw new Error(adminError.message);
        if (!admin) throw new Error("No administrator account was found with that email address.");
      } else {
        const { data: student, error: studentError } = await supabase
          .from("student").select("id, isAccountSetup").eq("email", normalizedEmail).maybeSingle();
        if (studentError) throw new Error(studentError.message);
        if (!student) throw new Error("No student account was found with that email address.");
        if (!student.isAccountSetup) {
          throw new Error("This account has not been activated yet. Please use your activation code first.");
        }
      }

      const redirectPath = isAdmin ? "/admin/reset-password" : "/reset-password";
      const redirectTo = new URL(redirectPath, window.location.origin);
      redirectTo.searchParams.set("flow", "password-reset");
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectTo.toString(),
      });
      if (error) throw new Error(error.message);
      setStep("sent");
    } catch (error) {
      setErrors([error.message || "Unable to send the reset email. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    const newErrors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.message);
    if (password !== confirmPassword) newErrors.push("Passwords do not match.");
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setStep("success");
    } catch (error) {
      setErrors([error.message || "Unable to update your password. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1px solid #ccc", fontSize: "14px",
    fontFamily: "Poppins, sans-serif", boxSizing: "border-box",
    marginTop: "6px", outline: "none",
  };

  const renderErrors = errors.length > 0 && (
    <div role="alert" style={{ backgroundColor: "#fff5f5", border: "1px solid #e53935", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
      {errors.map((error) => <p key={error} style={{ color: "#c0392b", fontSize: "13px", margin: "2px 0" }}>{error}</p>)}
    </div>
  );

  const buttonStyle = {
    width: "100%", padding: "14px", backgroundColor: isAdmin ? "#f5a623" : "#1a1a6e",
    color: isAdmin ? "#1a1a2e" : "#fff", border: "none", borderRadius: "8px",
    fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "Poppins, sans-serif", marginTop: "20px", opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Navbar />
      <main style={{ width: "calc(100% - 32px)", maxWidth: "480px", margin: "60px auto", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", padding: "40px", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          {isAdmin && <div style={{ display: "inline-block", backgroundColor: "#fff8e1", color: "#f5a623", fontWeight: "700", fontSize: "12px", padding: "4px 14px", borderRadius: "20px", border: "1px solid #f5a623", marginBottom: "12px" }}>ADMIN PORTAL</div>}
          <h1 style={{ fontSize: "25px", fontWeight: "700", color: "#1a1a6e", margin: "0 0 8px" }}>
            {isResetPage ? `Reset ${title.toLowerCase()}` : `Forgot ${title.toLowerCase()}?`}
          </h1>
          <p style={{ fontSize: "13px", color: "#777", lineHeight: 1.6 }}>
            {isResetPage
              ? step === "checking" ? "Verifying your password reset link..." : "Choose a new password for your account."
              : "Enter the email address linked to your account and we'll send you a password reset link."}
          </p>
        </div>

        {renderErrors}

        {!isResetPage && step === "email" && (
          <form onSubmit={handleSendReset}>
            <label htmlFor="recovery-email" style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}>Email address</label>
            <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
            <button type="submit" disabled={loading} style={buttonStyle}>{loading ? "Sending..." : "Send reset link"}</button>
          </form>
        )}

        {!isResetPage && step === "sent" && (
          <div role="status" style={{ textAlign: "center", color: "#555" }}>
            <p>If the address is associated with an account, a password reset email has been sent.</p>
            <p>Please check your inbox and follow the link to choose a new password.</p>
          </div>
        )}

        {isResetPage && step === "checking" && (
          <p role="status" style={{ textAlign: "center", color: "#777" }}>Please wait while we verify your reset link.</p>
        )}

        {isResetPage && step === "ready" && (
          <form onSubmit={handleUpdatePassword}>
            <label htmlFor="new-password" style={{ fontSize: "13px", fontWeight: "600", color: "#222" }}>New password</label>
            <input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} />
            <label htmlFor="confirm-password" style={{ display: "block", marginTop: "16px", fontSize: "13px", fontWeight: "600", color: "#222" }}>Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={inputStyle} />
            <button type="submit" disabled={loading} style={buttonStyle}>{loading ? "Updating..." : "Update password"}</button>
          </form>
        )}

        {isResetPage && step === "error" && (
          <div role="alert" style={{ textAlign: "center", color: "#b42318", fontSize: "14px" }}>{message}</div>
        )}

        {isResetPage && step === "success" && (
          <div role="status" style={{ textAlign: "center", color: "#286b3a", fontSize: "14px" }}>
            Your password has been updated successfully.
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px" }}>
          <button type="button" onClick={() => navigate(signInPath)} style={{ border: 0, padding: 0, background: "none", color: "#1a1a6e", fontWeight: "700", cursor: "pointer", font: "inherit" }}>
            {isResetPage && step !== "success" ? `Back to ${isAdmin ? "admin " : ""}sign in` : "Back to sign in"}
          </button>
          {isResetPage && step === "error" && (
            <span> · <button type="button" onClick={() => navigate(forgotPath)} style={{ border: 0, padding: 0, background: "none", color: "#1a1a6e", fontWeight: "700", cursor: "pointer", font: "inherit" }}>Request a new link</button></span>
          )}
        </div>
      </main>
    </div>
  );
}

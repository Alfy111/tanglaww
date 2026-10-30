import { useState } from "react";
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { passwordProblems } from "../lib/passwordReset";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [form, setForm] = useState({ old: "", new: "", confirm: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (field) =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleDone = async () => {
    const problems = [];
    if (!form.old) problems.push("Old password is required.");
    problems.push(...passwordProblems(form.new, form.confirm));
    if (form.old && form.old === form.new)
      problems.push("New password must be different from your old password.");
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email)
        throw new Error("Your session has expired. Please sign in again.");

      const { error: oldError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.old,
      });
      if (oldError) throw new Error("Old password is incorrect.");

      const { error } = await supabase.auth.updateUser({ password: form.new });
      if (error) throw new Error(error.message);

      setDone(true);
      window.setTimeout(() => navigate("/dashboard/settings"), 1500);
    } catch (err) {
      setErrors([
        err.message || "Unable to change your password. Please try again.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div
        className="dashboard-main"
        style={{ backgroundColor: "#f5f6fa", minHeight: "100vh" }}
      >
        <div
          style={{
            backgroundColor: "#1a1a6e",
            padding: "24px 40px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <FiArrowLeft
            size={22}
            color="#fff"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(-1)}
          />
          <h1
            style={{
              color: "#fff",
              fontSize: "24px",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Change Password
          </h1>
        </div>

        <div
          style={{
            padding: "48px 40px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {errors.length > 0 && (
            <div
              role="alert"
              style={{
                backgroundColor: "#fff5f5",
                border: "1px solid #e53935",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "24px",
              }}
            >
              {errors.map((e) => (
                <p
                  key={e}
                  style={{
                    color: "#c0392b",
                    fontSize: "13px",
                    margin: "2px 0",
                  }}
                >
                  {errors.length > 1 ? `• ${e}` : e}
                </p>
              ))}
            </div>
          )}

          {done && (
            <div
              role="status"
              style={{
                backgroundColor: "#EAF7F0",
                border: "1px solid #27ae60",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "24px",
                color: "#1E7A47",
                fontSize: "13px",
              }}
            >
              Your password has been changed.
            </div>
          )}

          {[
            {
              label: "Old Password:*",
              key: "old",
              placeholder: "Old Password",
            },
            {
              label: "New Password:*",
              key: "new",
              placeholder: "New Password",
            },
            {
              label: "Confirm Password:*",
              key: "confirm",
              placeholder: "Confirm Password",
            },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: "28px" }}>
              <label
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#1a1a2e",
                  display: "block",
                  marginBottom: "10px",
                }}
              >
                {label}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={show[key] ? "text" : "password"}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => {
                    setForm({ ...form, [key]: e.target.value });
                    setErrors([]);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 44px 14px 16px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                    fontSize: "14px",
                    fontFamily: "Poppins, sans-serif",
                    color: "#333",
                    boxSizing: "border-box",
                    outline: "none",
                    backgroundColor: "#fff",
                  }}
                />
                <span
                  onClick={() => toggle(key)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    color: "#aaa",
                  }}
                >
                  {show[key] ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </span>
              </div>
              {key === "new" && (
                <p
                  style={{ color: "#777", fontSize: "12px", margin: "8px 0 0" }}
                >
                  At least 8 characters with an uppercase letter, a lowercase
                  letter, a number, and a special character.
                </p>
              )}
            </div>
          ))}

          <button
            onClick={handleDone}
            disabled={loading || done}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#1a1a6e",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading || done ? "not-allowed" : "pointer",
              opacity: loading || done ? 0.7 : 1,
              fontFamily: "Poppins, sans-serif",
              marginTop: "8px",
            }}
          >
            {loading ? "Saving..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

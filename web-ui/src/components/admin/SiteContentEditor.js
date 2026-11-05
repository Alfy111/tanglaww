// Shared pieces for the admin About / Help / Policies pages (web).
import { AlertCircle, Info, Pencil } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export const NAVY = "#2F459B";
export const FONT = "Poppins, sans-serif";

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DDD",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  fontFamily: FONT,
  backgroundColor: "#fff",
};

export const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: NAVY,
  margin: "8px 0 5px",
};

const button = (primary) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 18px",
  borderRadius: "8px",
  border: `1px solid ${NAVY}`,
  backgroundColor: primary ? NAVY : "#fff",
  color: primary ? "#fff" : NAVY,
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
});

export function AdminContentFrame({
  title,
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
  children,
}) {
  const actions = editing ? (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        style={button(false)}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{ ...button(true), opacity: saving ? 0.7 : 1 }}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </>
  ) : (
    <button type="button" onClick={onEdit} style={button(true)}>
      <Pencil size={15} /> Edit
    </button>
  );
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: FONT,
        backgroundColor: "#f5f6fa",
      }}
    >
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar title={title} actions={actions} />
        <div style={{ padding: "32px 40px", boxSizing: "border-box" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "8px",
        padding: "8px",
        backgroundColor: "#F8F9FA",
        borderRadius: "10px",
        marginBottom: "18px",
      }}
    >
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: 0,
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: "14px",
            fontWeight: 700,
            backgroundColor: active === key ? NAVY : "transparent",
            color: active === key ? "#fff" : "#666",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function TextEditor({
  label,
  value,
  onChange,
  minHeight = 320,
  placeholder,
}) {
  return (
    <>
      <label
        style={{ ...labelStyle, fontSize: "14px", color: "#333", marginTop: 0 }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          minHeight,
          lineHeight: 1.6,
          resize: "vertical",
          backgroundColor: "#F9F9F9",
          borderRadius: "12px",
          padding: "14px",
        }}
      />
    </>
  );
}

export function Note({ warning, children }) {
  const Icon = warning ? AlertCircle : Info;
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        marginTop: "16px",
        padding: "14px",
        borderRadius: "10px",
        backgroundColor: warning ? "#FFF5F5" : "#F0F4FF",
        border: warning ? "1px solid #FFEBEB" : 0,
        color: warning ? "#E74C3C" : NAVY,
        fontSize: "12px",
        lineHeight: 1.5,
      }}
    >
      <Icon size={20} style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

export function Status({ error, notice }) {
  if (error)
    return (
      <p
        role="alert"
        style={{ color: "#E74C3C", fontSize: "13px", margin: "0 0 12px" }}
      >
        {error}
      </p>
    );
  if (notice)
    return (
      <p
        role="status"
        style={{ color: "#27ae60", fontSize: "13px", margin: "0 0 12px" }}
      >
        {notice}
      </p>
    );
  return null;
}

export default function LoginWarningModal({ warning, onClose, onReset }) {
  if (!warning) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "380px",
          backgroundColor: "#fff",
          borderRadius: "14px",
          padding: "28px 24px",
          textAlign: "center",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            margin: "0 auto 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            backgroundColor: warning.locked ? "#FDECEA" : "#FFF4E0",
          }}
        >
          {warning.locked ? "🔒" : "⚠️"}
        </div>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#1a1a2e",
            margin: "0 0 8px",
          }}
        >
          {warning.title}
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#555",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {warning.message}
        </p>
        <p style={{ fontSize: "13px", color: "#666", margin: "14px 0 0" }}>
          Forgot password?{" "}
          <button
            type="button"
            onClick={onReset}
            style={{
              border: 0,
              padding: 0,
              background: "none",
              color: "#1a1a6e",
              fontWeight: 700,
              textDecoration: "underline",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Reset here
          </button>
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: "18px",
            padding: "12px",
            backgroundColor: "#1a1a6e",
            color: "#fff",
            border: 0,
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

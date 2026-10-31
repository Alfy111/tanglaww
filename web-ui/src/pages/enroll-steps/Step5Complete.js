import { useNavigate } from "react-router-dom";
import StepBanner from "../../components/StepBanner";

const NEXT_STEPS = [
  "You'll receive an email with your activation code once approved.",
  "Open the Tanglaw app or come back to this website.",
  "Then, enter the code to activate your account.",
];

export default function Step5Complete() {
  const navigate = useNavigate();
  return (
    <>
      <StepBanner title="Registration Complete" currentStep={4} />
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#4caf50",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <span style={{ color: "#fff", fontSize: "40px" }}>✓</span>
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#1a1a2e",
            marginBottom: "8px",
          }}
        >
          Thank you for signing up to our services!
        </h2>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "32px" }}>
          Your registration has been received and is now awaiting admin
          approval.
        </p>
        <div
          style={{
            textAlign: "left",
            backgroundColor: "#fffbea",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              fontWeight: "700",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            💡 What comes next?
          </p>
          {NEXT_STEPS.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "10px",
                fontSize: "13px",
                color: "#444",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#4caf50" }}>✓</span> {item}
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#1a1a6e",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}

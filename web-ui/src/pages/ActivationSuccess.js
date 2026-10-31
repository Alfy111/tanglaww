import { Check } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./SignIn.css";

const REDIRECT_MS = 2500;

export default function ActivationSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(
      () => navigate("/dashboard", { replace: true }),
      REDIRECT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-page">
      <style>{`
        @keyframes activation-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes activation-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .activation-anim { animation: none !important; } }
      `}</style>
      <Navbar brandOnly />
      <main
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "24px 16px 0",
          boxSizing: "border-box",
        }}
      >
        <section
          role="status"
          aria-live="polite"
          style={{
            width: "100%",
            maxWidth: "480px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            padding: "48px 40px",
            boxSizing: "border-box",
            textAlign: "center",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <div
            className="activation-anim"
            style={{
              width: "160px",
              height: "160px",
              margin: "0 auto 36px",
              borderRadius: "50%",
              backgroundColor: "#4CD964",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
              animation: "activation-pop 0.5s ease-out",
            }}
          >
            <Check size={92} color="#fff" strokeWidth={3} />
          </div>
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "24px",
              fontWeight: "700",
              color: "#0D2A94",
              lineHeight: 1.35,
            }}
          >
            Your account has been successfully activated!
          </h1>
          <p style={{ margin: 0, fontSize: "16px", color: "#666" }}>
            Welcome aboard, Achiever!
          </p>

          <div
            className="activation-anim"
            aria-hidden="true"
            style={{
              width: "26px",
              height: "26px",
              margin: "36px auto 12px",
              borderRadius: "50%",
              border: "3px solid #DCDFE3",
              borderTopColor: "#0D2A94",
              animation: "activation-spin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, fontSize: "15px", color: "#777" }}>
            Setting up your dashboard...
          </p>
        </section>
      </main>
    </div>
  );
}

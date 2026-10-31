import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo.png";
import "./Navbar.css";

export default function Navbar({ landingPage = false, brandOnly = false, activeSection = "home" }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={`navbar${landingPage || brandOnly ? " landing-navbar" : ""}`}>
      {landingPage || brandOnly ? (
        <a className="landing-brand" href={landingPage ? "#home" : "/"} aria-label="Tanglaw home">
          <img src={logo} alt="" className="nav-logo" />
          <span>Tanglaw</span>
        </a>
      ) : (
        <img src={logo} alt="Tanglaw Logo" className="nav-logo" onClick={() => navigate("/")} />
      )}
      {!brandOnly && (
        <button
          className="nav-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      )}
      {!brandOnly && (
        <ul className={`nav-links${menuOpen ? " nav-links-open" : ""}`}>
          {landingPage ? (
            <>
            <a
              href="#home"
              className={`nav-link${activeSection === "home" ? " active" : ""}`}
              aria-current={activeSection === "home" ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="#courses"
              className={`nav-link${activeSection === "courses" ? " active" : ""}`}
              aria-current={activeSection === "courses" ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Our Courses
            </a>
            <a
              href="#about"
              className={`nav-link${activeSection === "about" ? " active" : ""}`}
              aria-current={activeSection === "about" ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              About Us
            </a>
            <a
              href="#helpdesk"
              className={`nav-link${activeSection === "helpdesk" ? " active" : ""}`}
              aria-current={activeSection === "helpdesk" ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Helpdesk
            </a>
            </>
          ) : (
            <>
              <a href="/#home" className="nav-link" onClick={() => setMenuOpen(false)}>Home</a>
              <a href="/#courses" className="nav-link" onClick={() => setMenuOpen(false)}>Our Courses</a>
              <a href="/#about" className="nav-link" onClick={() => setMenuOpen(false)}>About Us</a>
              <a href="/#helpdesk" className="nav-link" onClick={() => setMenuOpen(false)}>Helpdesk</a>
            </>
          )}
        </ul>
      )}
      {!brandOnly && (
        <button
          className="btn-signin"
          onClick={() => navigate("/signin", landingPage ? { state: { authTransition: "home-to-student" } } : undefined)}
        >
          Sign-in
        </button>
      )}
    </nav>
  );
}
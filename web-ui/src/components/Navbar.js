import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo.png";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <img src={logo} alt="Tanglaw Logo" className="nav-logo" onClick={() => navigate("/")} />
      <button
        className="nav-menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <ul className={`nav-links${menuOpen ? " nav-links-open" : ""}`}>
        <NavLink to="/" className="nav-link" onClick={() => setMenuOpen(false)}>Home</NavLink>
        <NavLink to="/our-courses" className="nav-link" onClick={() => setMenuOpen(false)}>Our Courses</NavLink>
        <NavLink to="/about-us" className="nav-link" onClick={() => setMenuOpen(false)}>About Us</NavLink>
        <NavLink to="/helpdesk" className="nav-link" onClick={() => setMenuOpen(false)}>Helpdesk</NavLink>
      </ul>
      <button className="btn-signin" onClick={() => navigate("/signin")}>Sign-in</button>
    </nav>
  );
}
import { useNavigate } from "react-router-dom";
import heroImage from "../assets/background.png";
import mainLogo from "../assets/mainlogo.png";
import Navbar from "../components/Navbar";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: require("../assets/feature1.png"),
      text: <>Experience <strong>affordable, high-quality</strong> review programs designed for dreamers like you!</>
    },
    {
      icon: require("../assets/feature2.png"),
      text: <>Gain access to <strong>full online</strong> review sessions that you can <strong>replay anytime</strong></>
    },
    {
      icon: require("../assets/feature3.png"),
      text: <strong>Join now and start your journey!</strong>
    }
  ];

  return (
    <div>
      <Navbar />
      <section className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-content">
          <img src={mainLogo} alt="Tanglaw Logo" className="hero-logo" />
          <p className="hero-tagline">"Where a Dreamer Becomes an Achiever."</p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate("/enroll")}>Enroll now!</button>
           <button className="btn-secondary" onClick={() => navigate("/download")}>Download the App</button>
          </div>
        </div>
      </section>
      <section className="features">
        {features.map((item, index) => (
          <div key={index} className="feature-card">
            <img src={item.icon} alt="feature icon" className="feature-icon" />
            <p>{item.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Home;
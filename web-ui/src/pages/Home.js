import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  GraduationCap,
  Globe,
  Play,
  Smartphone,
  Star,
} from "lucide-react";
import heroImage from "../assets/background.png";
import aboutImage from "../assets/enrollBanner.png";
import logo from "../assets/logo.png";
import Navbar from "../components/Navbar";
import "./Home.css";

const programs = [
  { title: "General Education", icon: Globe },
  { title: "Professional Education", icon: GraduationCap },
  { title: "Majorship", icon: BookOpen },
];

const specializations = [
  "English",
  "Filipino",
  "Math",
  "Science",
  "Social Studies",
  "Values Education",
];

const inclusions = [
  "Diagnostic Examination",
  "Course Content - Concept Driven",
  "LEPT Express",
  "LEPT Advanced",
  "Battery Examination",
  "Mastery",
  "Best Highlights & Final Coaching",
];

const testimonials = [
  {
    quote: <>I highly recommend TARC for aspiring board exam takers who are looking for a <strong>quality and student-friendly review center.</strong> TARC provides excellent coaching and well-prepared review materials.</>,
    name: "Jhanine O. Payad, LPT",
    initials: "JP",
  },
  {
    quote: <>I am truly grateful to Teacher A Review Center for their <strong>excellent guidance and support throughout my LPT journey.</strong> Their dedication and effective teaching strategies helped me achieve this milestone.</>,
    name: "Joshua C. Vasquez, LPT",
    initials: "JV",
  },
  {
    quote: <>Sana po ay <strong>magpatuloy ang inyong paglilingkod,</strong> lalong-lalo na sa mga teachers na umasa parin makapasa. For 9 years of praying, manifesting, and claiming, FINALLY! No retake. (Remarks: PASSED)</>,
    name: "Jocelyn P. Banez, LPT",
    initials: "JB",
  },
];

const faqs = [
  {
    question: "How do I enroll?",
    answer: "Register through the enrollment form. Once TARC approves it, you'll get an enrollment code by email to activate your account.",
  },
  {
    question: "What if I miss a live session?",
    answer: "You can replay recorded review sessions anytime through the Tanglaw app or web platform.",
  },
  {
    question: "Why are some courses locked?",
    answer: "Courses become available based on your enrollment and course schedule. Sign in to your account to see the materials included in your program.",
  },
  {
    question: "Who do I contact for help?",
    answer: "Email teacheraonlinereview@gmail.com or call 0951 698 9114 and the TARC team will be happy to help.",
  },
];

function CheckList({ items, className = "" }) {
  return (
    <ul className={`landing-check-list${className ? ` ${className}` : ""}`}>
      {items.map((item) => (
        <li key={item}>
          <span className="check-icon"><Check size={13} strokeWidth={3} /></span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function AnimatedStat({ value, decimals = 0, suffix = "", singularSuffix, delay = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(value);
      return undefined;
    }

    let animationFrame;
    let timeout;
    let startTime;
    const duration = 850;

    const animateCount = (timestamp) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setCount(value * easedProgress);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animateCount);
      } else {
        setCount(value);
      }
    };

    timeout = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(animateCount);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [decimals, delay, value]);

  const displayedSuffix = singularSuffix && Math.round(count) === 1 ? singularSuffix : suffix;
  return <>{formattedStat(count, decimals)}{displayedSuffix}</>;
}

function formattedStat(value, decimals) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [activeSection, setActiveSection] = useState("home");
  const [journeyVisible, setJourneyVisible] = useState(false);
  const [coursesVisible, setCoursesVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [testimonialsVisible, setTestimonialsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const journeyStepsRef = useRef(null);
  const coursesPanelRef = useRef(null);
  const aboutLayoutRef = useRef(null);
  const progressLayoutRef = useRef(null);
  const testimonialsRef = useRef(null);
  const helpRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (!sectionId) return undefined;

    const section = document.getElementById(sectionId);
    if (!section) return undefined;

    const frame = window.requestAnimationFrame(() => {
      section.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  useEffect(() => {
    const journeySteps = journeyStepsRef.current;
    if (!journeySteps) return undefined;

    if (!("IntersectionObserver" in window)) {
      setJourneyVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setJourneyVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(journeySteps);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const progressLayout = progressLayoutRef.current;
    if (!progressLayout) return undefined;

    if (!("IntersectionObserver" in window)) {
      setProgressVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setProgressVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(progressLayout);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const aboutLayout = aboutLayoutRef.current;
    if (!aboutLayout) return undefined;

    if (!("IntersectionObserver" in window)) {
      setAboutVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAboutVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(aboutLayout);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const coursesPanel = coursesPanelRef.current;
    if (!coursesPanel) return undefined;

    if (!("IntersectionObserver" in window)) {
      setCoursesVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCoursesVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(coursesPanel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const revealTargets = [
      [testimonialsRef.current, setTestimonialsVisible],
      [helpRef.current, setHelpVisible],
      [ctaRef.current, setCtaVisible],
    ].filter(([element]) => element);

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach(([, setVisible]) => setVisible(true));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = revealTargets.find(([element]) => element === entry.target);
          if (target) target[1](true);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach(([element]) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionIds = ["home", "courses", "about", "helpdesk"];
    const updateActiveSection = () => {
      const activationLine = window.scrollY + 110;
      let currentSection = "home";

      sectionIds.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        const sectionTop = section
          ? section.getBoundingClientRect().top + window.scrollY
          : Infinity;
        if (sectionTop <= activationLine) {
          currentSection = sectionId;
        }
      });

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <div className="landing-home">
      <Navbar landingPage activeSection={activeSection} />

      <main>
        <section
          className="landing-hero"
          id="home"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="landing-container hero-inner">
            <h1>
              Where a Dreamer
              <br />
              Becomes an
              <br />
              <span>Achiever</span>
            </h1>
            <p className="hero-description">
              Teacher A Review Center (TARC)’s LET review process, now in one app.
              Access learning modules, recorded sessions, and quizzes anytime,
              anywhere with Tanglaw!
            </p>
            <div className="hero-actions">
              <button className="landing-button button-yellow" onClick={() => navigate("/enroll")}>
                Enroll now!
              </button>
              <a className="landing-button button-outline-light" href="#download">
                Download the App
              </a>
            </div>
            <div className="hero-stats" aria-label="Tanglaw at a glance">
              <div className="hero-stat hero-stat-one">
                <strong><AnimatedStat value={1849} suffix="+" delay={0} /></strong>
                <span>LET passers</span>
              </div>
              <div className="hero-stat hero-stat-two">
                <strong><AnimatedStat value={93.93} decimals={2} suffix="%" delay={320} /></strong>
                <span>Passing rate <small>(as of Sept 2025)</small></span>
              </div>
              <div className="hero-stat hero-stat-three">
                <strong><AnimatedStat value={8} suffix=" years" singularSuffix=" year" delay={640} /></strong>
                <span>Years of review service</span>
              </div>
            </div>
            <p className="hero-footnote">Teacher A Review Center’s track record</p>
          </div>
        </section>

        <div className="landing-tagline">Online review wherever and whenever.</div>

        <section className="journey-section" aria-labelledby="journey-heading">
          <div className="landing-container">
            <p className="section-eyebrow">How it works</p>
            <h2 className="section-title" id="journey-heading">Your LET review journey,<br />made simple</h2>
            <p className="section-subtitle">Three steps from sign-up to your first session.</p>
            <div
              className={`journey-steps${journeyVisible ? " journey-steps-visible" : ""}`}
              ref={journeyStepsRef}
            >
              {[
                ["01", "Register", "Fill out the enrollment form with your details and payment receipt."],
                ["02", "Get approved", "Once TARC approves your registration, you'll receive your enrollment code by email."],
                ["03", "Start reviewing", "Activate your account using the code, set up your profile, and sign in to the app."],
              ].map(([number, title, description], index) => (
                <article className="journey-step" key={number}>
                  <div className={`step-number${index === 2 ? " step-number-current" : ""}`}>{number}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="courses-section" id="courses" aria-labelledby="courses-heading">
          <div className="landing-container">
            <div className="section-heading-centered">
              <p className="section-eyebrow">Our courses</p>
              <h2 className="section-title" id="courses-heading">Explore our review programs</h2>
              <p className="section-subtitle">
                Every program comes with learning modules, recorded sessions and quizzes per course.
              </p>
            </div>
            <div
              className={`courses-panel${coursesVisible ? " courses-panel-visible" : ""}`}
              ref={coursesPanelRef}
            >
              <div className="programs-column">
                <h3>Review Programs</h3>
                <div className="program-list">
                  {programs.map(({ title, icon: Icon }) => (
                    <div className="program-item" key={title}>
                      <span className="program-icon"><Icon size={17} /></span>
                      <strong>{title}</strong>
                    </div>
                  ))}
                  <div className="program-item specialization-item">
                    <span className="program-icon"><Star size={17} /></span>
                    <div>
                      <strong>Specializations</strong>
                      <p>Majorship tracks we review for:</p>
                      <div className="specialization-tags">
                        {specializations.map((specialization) => (
                          <span key={specialization}>{specialization}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="inclusions-column">
                <h3>Program Inclusions</h3>
                <CheckList items={inclusions} className="courses-check-list" />
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-heading">
          <div
            className={`landing-container about-layout${aboutVisible ? " about-layout-visible" : ""}`}
            ref={aboutLayoutRef}
          >
            <div className="about-image-wrap">
              <img src={aboutImage} alt="TARC reviewees celebrating their LET success" />
            </div>
            <div className="about-copy">
              <p className="section-eyebrow">About us</p>
              <h2 className="section-title" id="about-heading">Affordable, high-quality review, on your schedule</h2>
              <p>
                Teacher A Review Center (TARC) is dedicated to transforming
                <strong> Dreamers</strong> into <strong>Achievers</strong>, and
                specializes in preparing examinees for the Licensure Examination
                for Professional Teachers (LEPT), led by highly-rated lecturers
                who have guided thousands of passers in the Middle East and the Philippines.
              </p>
              <p>At Teacher A, we don’t just dream big—<strong>we achieve greatness, together.</strong></p>
              <CheckList className="about-check-list" items={[
                "Replay recorded sessions anytime",
                "Downloadable learning modules",
                "Working-Friendly Schedule",
                "Full Package Review Program",
              ]} />
            </div>
          </div>
        </section>

        <section className="progress-section" aria-labelledby="progress-heading">
          <div
            className={`landing-container progress-layout${progressVisible ? " progress-layout-visible" : ""}`}
            ref={progressLayoutRef}
          >
            <div className="progress-copy">
              <p className="section-eyebrow">Progress tracking</p>
              <h2 className="section-title" id="progress-heading">Know exactly where you stand</h2>
              <p>
                Tanglaw tracks your quiz scores, engagement, and module progress,
                so you can spot weak topics early and walk into the exam prepared.
              </p>
              <ul className="progress-bullets">
                <li>Scores per topic from Gen Ed and Prof Ed</li>
                <li>Module completion and engagement</li>
                <li>Early warning when you need extra help</li>
              </ul>
            </div>
            <div className="performance-card" aria-label="Sample student performance dashboard">
              <div className="performance-header">
                <strong>My Performance</strong><span>*Sample data</span>
              </div>
              <div className="performance-tabs"><b>Overview</b><span>By Course</span></div>
              <div className="performance-progress">
                <div className="performance-row"><strong>Road to LET Passer</strong><span>🏅</span></div>
                <small>Your progress across all courses</small>
                <div className="progress-track"><span style={{ width: "64%" }} /></div>
                <b className="progress-percent">64%</b>
              </div>
              <div className="performance-summary">
                <div className="score-box"><small>Average Score</small><strong>82%</strong><small>6 quizzes</small></div>
                <div className="summary-stack">
                  <div><small>Completed Courses</small><strong>2 / 5</strong></div>
                  <div><small>Review Frequency</small><span>Active <b>4 days</b> this week</span></div>
                </div>
              </div>
              <div className="focus-box">
                <strong>Focus Next</strong><small>Your weakest topics so far</small>
                <div className="focus-topic"><span>The Teaching Profession</span><b>68%</b><i><em style={{ width: "68%" }} /></i></div>
                <div className="focus-topic"><span>Mathematics in the Modern World</span><b>58%</b><i><em style={{ width: "58%" }} /></i></div>
              </div>
            </div>
          </div>
        </section>

        <section className="download-section" id="download" aria-labelledby="download-heading">
          <div className="landing-container download-layout">
            <div className="phone-art" aria-label="Preview of the Tanglaw student app">
              <div className="phone-screen">
                <div className="phone-greeting"><small>Good morning,</small><strong>[Student name]</strong></div>
                <div className="phone-course"><strong>General Education</strong><i><em /></i><small>64% complete</small></div>
                <div className="phone-course"><strong>Professional Education</strong><i><em /></i><small>30% complete</small></div>
                <div className="phone-action"><span><Play size={12} fill="currentColor" /></span><div><strong>Recorded session</strong><small>Continue watching</small></div></div>
                <div className="phone-action"><span className="phone-check"><Check size={14} /></span><div><strong>Quiz available</strong><small>Take it now</small></div></div>
              </div>
            </div>
            <div className="download-copy">
              <p className="section-eyebrow">Download the app</p>
              <h2 className="section-title" id="download-heading">Download Tanglaw Now!</h2>
              <p>Watch sessions, read learning modules, answer quizzes and check your progress — anywhere, anytime.</p>
              <a className="landing-button button-navy" href="#download">
                <Smartphone size={16} /> Download for Android
              </a>
            </div>
          </div>
        </section>

        <section
          className={`testimonials-section${testimonialsVisible ? " testimonials-visible" : ""}`}
          aria-labelledby="testimonials-heading"
          ref={testimonialsRef}
        >
          <div className="landing-container">
            <div className="section-heading-centered">
              <p className="section-eyebrow">Testimonials</p>
              <h2 className="section-title" id="testimonials-heading">From our achievers</h2>
              <p className="section-subtitle">Hear from TARC reviewees who passed the LET.</p>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((testimonial, index) => (
                <article className={`testimonial-card${index === 1 ? " testimonial-featured" : ""}`} key={testimonial.initials}>
                  <span className="quote-mark" aria-hidden="true">“</span>
                  <p>{testimonial.quote}</p>
                  <div className="testimonial-author">
                    <span>{testimonial.initials}</span>
                    <div><strong>{testimonial.name}</strong><small>LET Passer, March 2026</small></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className={`help-section${helpVisible ? " help-visible" : ""}`}
          id="helpdesk"
          aria-labelledby="help-heading"
          ref={helpRef}
        >
          <div className="landing-container">
            <div className="section-heading-centered">
              <p className="section-eyebrow">Helpdesk</p>
              <h2 className="section-title" id="help-heading">Frequently asked questions</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div className={`faq-item${openFaq === index ? " faq-open" : ""}`} key={faq.question}>
                  <button
                    className="faq-question"
                    type="button"
                    aria-expanded={openFaq === index}
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  >
                    {faq.question}<span aria-hidden="true">{openFaq === index ? "−" : "+"}</span>
                  </button>
                  {openFaq === index && <p className="faq-answer">{faq.answer}</p>}
                </div>
              ))}
            </div>
            <div className={`landing-cta${ctaVisible ? " landing-cta-visible" : ""}`} ref={ctaRef}>
              <div>
                <h2>Ready to become an achiever?</h2>
                <p>Join the next TARC review batch and start your LET journey today.</p>
              </div>
              <button className="landing-button button-navy" onClick={() => navigate("/enroll")}>
                Enroll now!
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <div className="footer-brand">
            <div><img src={logo} alt="" /><strong>Tanglaw</strong></div>
            <p>Where a Dreamer Becomes an Achiever</p>
          </div>
          <div className="footer-links">
            <strong>Explore</strong>
            <a href="#courses">Our Courses</a>
            <a href="#about">About Us</a>
            <a href="#helpdesk">Helpdesk</a>
            <a href="#download">Download the App</a>
          </div>
          <div className="footer-contact">
            <strong>Contact</strong>
            <a href="mailto:teacheraonlinereview@gmail.com">Email: teacheraonlinereview@gmail.com</a>
            <a href="tel:+639516989114">Phone: 0951 698 9114</a>
            <a href="https://www.facebook.com/share/17bslgAtjA/" target="_blank" rel="noreferrer">
              Facebook page: facebook.com/teacheraonlinereviewcenter
            </a>
          </div>
          <div className="footer-bottom">© 2026 TARC · Tanglaw. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default Home;

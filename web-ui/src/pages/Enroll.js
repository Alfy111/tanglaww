import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/enroll.css";
import Step1Privacy from "./enroll-steps/Step1Privacy";
import Step2Curriculum from "./enroll-steps/Step2Curriculum";
import Step3Personal from "./enroll-steps/Step3Personal";
import Step4Payment from "./enroll-steps/Step4Payment";
import Step5Complete from "./enroll-steps/Step5Complete";

const INITIAL_DATA = {};

const LEAVE_MESSAGE =
  "Leave enrollment?\n\nGoing back now will exit the enrollment form and clear everything you have entered. You will need to start over.";

export default function Enroll() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [personalSubStep, setPersonalSubStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_DATA);

  const hasEnteredData = Object.entries(formData).some(
    ([key, value]) =>
      key !== "privacy" &&
      value !== "" &&
      value !== null &&
      value !== undefined &&
      value !== false,
  );
  const isComplete = step === 4;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const previous = () => setStep((s) => Math.max(s - 1, 0));
  const backToPromotions = () => {
    setStep(2);
    setPersonalSubStep(1);
  };

  const leave = () => {
    if (!hasEnteredData || window.confirm(LEAVE_MESSAGE)) {
      navigate("/signin");
      return true;
    }
    return false;
  };

  const goBackOneStep = () => {
    if (step === 0) return leave();
    if (step === 2 && personalSubStep === 1) setPersonalSubStep(0);
    else if (step === 3) backToPromotions();
    else previous();
    return false;
  };

  const goBackRef = useRef(goBackOneStep);
  goBackRef.current = goBackOneStep;
  const isCompleteRef = useRef(isComplete);
  isCompleteRef.current = isComplete;

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      if (isCompleteRef.current) {
        navigate("/");
        return;
      }
      const left = goBackRef.current();
      if (!left) window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  useEffect(() => {
    if (!hasEnteredData || isComplete) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasEnteredData, isComplete]);

  const steps = [
    <Step1Privacy
      data={formData}
      setData={setFormData}
      onNext={next}
      onBack={leave}
    />,
    <Step2Curriculum
      data={formData}
      setData={setFormData}
      onNext={next}
      onBack={previous}
    />,
    <Step3Personal
      data={formData}
      setData={setFormData}
      onNext={next}
      onBack={previous}
      subStep={personalSubStep}
      setSubStep={setPersonalSubStep}
    />,
    <Step4Payment data={formData} onNext={next} onBack={backToPromotions} />,
    <Step5Complete />,
  ];

  return (
    <div className="enroll-page">
      <Navbar />
      <div className="enroll-card">{steps[step]}</div>
    </div>
  );
}

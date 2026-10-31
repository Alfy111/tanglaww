import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Step1Privacy from "./enroll-steps/Step1Privacy";
import Step2Curriculum from "./enroll-steps/Step2Curriculum";
import Step3Personal from "./enroll-steps/Step3Personal";
import Step4Payment from "./enroll-steps/Step4Payment";
import Step5Complete from "./enroll-steps/Step5Complete";
import "../styles/enroll.css";

const INITIAL_DATA = {
  privacy: "Agree",
  curriculum: "BEEd",
  takerType: "First time taker",
};

export default function Enroll() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [personalSubStep, setPersonalSubStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_DATA);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const previous = () => setStep((s) => Math.max(s - 1, 0));
  const backToPromotions = () => {
    setStep(2);
    setPersonalSubStep(1);
  };

  const steps = [
    <Step1Privacy data={formData} setData={setFormData} onNext={next} onBack={() => navigate("/signin")} />,
    <Step2Curriculum data={formData} setData={setFormData} onNext={next} onBack={previous} />,
    <Step3Personal data={formData} setData={setFormData} onNext={next} onBack={previous} subStep={personalSubStep} setSubStep={setPersonalSubStep} />,
    <Step4Payment data={formData} onNext={next} onBack={backToPromotions} />,
    <Step5Complete />,
  ];

  return (
    <div className="enroll-page">
      <Navbar brandOnly />
      <div className="enroll-card">
        {steps[step]}
      </div>
    </div>
  );
}
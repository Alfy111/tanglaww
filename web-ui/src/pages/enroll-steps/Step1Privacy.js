import { useState } from "react";
import StepBanner from "../../components/StepBanner";
import ContinueButton from "../../components/ContinueButton";
export default function Step1Privacy({ data, setData, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const validate = () => {
    if (!data.privacy) { setErrors({ privacy: "Please select an option." }); return; }
    if (data.privacy !== "Agree") { setErrors({ privacy: "You must agree to continue." }); return; }
    onNext();
  };
  return (
    <>
      <StepBanner title="Data Privacy Notice" currentStep={0} />
      <div className="enroll-body">
        <p style={{ fontSize: "14px", lineHeight: "1.8", color: "#333" }}>
          <strong>Teacher A Review Center</strong> recognizes its responsibilities under the{" "}
          <strong>Republic Act No.10173 (RA 10173)</strong>, also known as the{" "}
          <strong>Data Privacy Act of 2012</strong>, with respect to the data they collect,
          record, organize, update, use, consolidate or destruct from the data subject.
        </p>
        <div className="radio-group" style={{ margin: "24px 0 4px" }}>
          {["Agree", "Disagree"].map((opt) => (
            <label key={opt} className="radio-label">
              <input type="radio" name="privacy" checked={data.privacy === opt} onChange={() => { setData({ ...data, privacy: opt }); setErrors({}); }} />
              {opt}
            </label>
          ))}
        </div>
        {errors.privacy && <p className="field-error">{errors.privacy}</p>}
        <ContinueButton onClick={validate} onBack={onBack} />
      </div>
    </>
  );
}
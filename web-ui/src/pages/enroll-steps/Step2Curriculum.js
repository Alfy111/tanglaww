import { useState } from "react";
import StepBanner from "../../components/StepBanner";
import ContinueButton from "../../components/ContinueButton";
const SPECIALIZATIONS = ["English", "Filipino", "Mathematics", "Science", "Social Values", "Values Education"];
export default function Step2Curriculum({ data, setData, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));
  const validate = () => {
    const e = {};
    if (!data.curriculum) e.curriculum = "Required.";
    if (!data.specialization) e.specialization = "Please select a specialization.";
    if (!data.takerType) e.takerType = "Required.";
    if (Object.keys(e).length) { setErrors(e); return; }
    onNext();
  };
  return (
    <>
      <StepBanner title="Program & Curriculum" currentStep={1} />
      <div className="enroll-body">
        <p className="enroll-subtitle">Please fill up the necessary information:</p>
        <div className="field-group">
          <span className={`field-label ${errors.takerType ? "error" : ""}`}>Type of Taker:*</span>
          <div className="radio-group">
            {["First time taker", "Retaker"].map((opt) => (
              <label key={opt} className="radio-label">
                <input type="radio" name="takerType" checked={data.takerType === opt} onChange={() => { setData({ ...data, takerType: opt }); clearError("takerType"); }} />
                {opt}
              </label>
            ))}
          </div>
          {errors.takerType && <p className="field-error">{errors.takerType}</p>}
        </div>
        <div className="field-group">
          <span className={`field-label ${errors.curriculum ? "error" : ""}`}>Curriculum:*</span>
          <div className="radio-group">
            {[["BEEd", "Bachelor of Elementary Education (BEEd)"], ["BSEd", "Bachelor of Secondary Education (BSEd)"]].map(([val, label]) => (
              <label key={val} className="radio-label">
                <input type="radio" name="curriculum" checked={data.curriculum === val} onChange={() => { setData({ ...data, curriculum: val, specialization: "" }); clearError("curriculum"); }} />
                {label}
              </label>
            ))}
          </div>
          {errors.curriculum && <p className="field-error">{errors.curriculum}</p>}
        </div>
        <div className="field-group">
          <span className={`field-label ${errors.specialization ? "error" : ""}`}>Specialization:*</span>
          <select className={`field-input ${errors.specialization ? "error" : ""}`} value={data.specialization || ""} onChange={(e) => { setData({ ...data, specialization: e.target.value }); clearError("specialization"); }}>
            <option value="">Majorship</option>
            {SPECIALIZATIONS.map((specialization) => <option key={specialization} value={specialization}>{specialization}</option>)}
          </select>
          {errors.specialization && <p className="field-error">{errors.specialization}</p>}
        </div>
        <ContinueButton onClick={validate} onBack={onBack} />
      </div>
    </>
  );
}
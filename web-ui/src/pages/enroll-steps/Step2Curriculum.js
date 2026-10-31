import { useEffect, useState } from "react";
import ContinueButton from "../../components/ContinueButton";
import StepBanner from "../../components/StepBanner";
import {
  CURRICULUM_NAMES,
  getSpecializations,
  specializationsFor,
} from "../../lib/enrollment";

export default function Step2Curriculum({ data, setData, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const [allSpecializations, setAllSpecializations] = useState([]);
  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));

  useEffect(() => {
    getSpecializations().then(setAllSpecializations);
  }, []);

  const options = specializationsFor(allSpecializations, data.curriculum);

  const validate = () => {
    const e = {};
    if (!data.curriculum) e.curriculum = "Required.";
    if (!data.specialization || !data.specializationId)
      e.specialization = "Please select a specialization.";
    if (!data.takerType) e.takerType = "Required.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onNext();
  };

  const pickSpecialization = (id) => {
    const picked = options.find((o) => o.id === Number(id));
    setData({
      ...data,
      specialization: picked?.name ?? "",
      specializationId: picked?.id ?? null,
    });
    clearError("specialization");
  };

  return (
    <>
      <StepBanner title="Program & Curriculum" currentStep={1} />
      <div className="enroll-body">
        <p className="enroll-subtitle">
          Please fill up the necessary information:
        </p>
        <div className="field-group">
          <span className={`field-label ${errors.takerType ? "error" : ""}`}>
            Type of Taker:*
          </span>
          <div className="radio-group">
            {["First time taker", "Retaker"].map((opt) => (
              <label key={opt} className="radio-label">
                <input
                  type="radio"
                  name="takerType"
                  checked={data.takerType === opt}
                  onChange={() => {
                    setData({ ...data, takerType: opt });
                    clearError("takerType");
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
          {errors.takerType && (
            <p className="field-error">{errors.takerType}</p>
          )}
        </div>
        <div className="field-group">
          <span className={`field-label ${errors.curriculum ? "error" : ""}`}>
            Curriculum:*
          </span>
          <div className="radio-group">
            {Object.entries(CURRICULUM_NAMES).map(([val, label]) => (
              <label key={val} className="radio-label">
                <input
                  type="radio"
                  name="curriculum"
                  checked={data.curriculum === val}
                  onChange={() => {
                    if (data.curriculum !== val)
                      setData({
                        ...data,
                        curriculum: val,
                        specialization: "",
                        specializationId: null,
                      });
                    clearError("curriculum");
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          {errors.curriculum && (
            <p className="field-error">{errors.curriculum}</p>
          )}
        </div>
        <div className="field-group">
          <span
            className={`field-label ${errors.specialization ? "error" : ""}`}
          >
            Specialization:*
          </span>
          <select
            className={`field-input ${errors.specialization ? "error" : ""}`}
            value={data.specializationId ?? ""}
            disabled={!data.curriculum}
            onChange={(e) => pickSpecialization(e.target.value)}
          >
            <option value="">
              {data.curriculum
                ? "Select Specialization"
                : "Select a curriculum first"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {errors.specialization && (
            <p className="field-error">{errors.specialization}</p>
          )}
        </div>
        <ContinueButton onClick={validate} onBack={onBack} />
      </div>
    </>
  );
}

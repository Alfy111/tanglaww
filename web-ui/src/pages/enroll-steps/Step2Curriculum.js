import { useEffect, useState } from "react";
import ContinueButton from "../../components/ContinueButton";
import StepBanner from "../../components/StepBanner";
import { getExamPrograms } from "../../lib/enrollment";

export default function Step2Curriculum({ data, setData, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const [programs, setPrograms] = useState([]);
  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));

  useEffect(() => {
    getExamPrograms().then(setPrograms);
  }, []);

  // "Others (Please Specify)" has no curriculum
  const isOthers = !!data.specializationId && data.curriculumId === null;

  const validate = () => {
    const e = {};
    if (!data.takerType) e.takerType = "Required.";
    if (!data.specializationId)
      e.specialization = "Please select your examination program.";
    if (isOthers && !data.comments?.trim())
      e.comments = "Please specify your examination program.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onNext();
  };

  const pickProgram = (id) => {
    const p = programs.find((o) => o.id === Number(id));
    setData({
      ...data,
      examProgram: p?.label ?? "",
      specialization: p?.name ?? "",
      specializationId: p?.id ?? null,
      curriculumId: p ? p.curriculumId : undefined,
      curriculum:
        p?.curriculumId === 1 ? "BEEd" : p?.curriculumId === 2 ? "BSEd" : "",
      comments: p && p.curriculumId === null ? data.comments : "",
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
          <span
            className={`field-label ${errors.specialization ? "error" : ""}`}
          >
            Examination Program:*
          </span>
          <select
            className={`field-input ${errors.specialization ? "error" : ""}`}
            value={data.specializationId ?? ""}
            onChange={(e) => pickProgram(e.target.value)}
          >
            <option value="">Select Examination Program</option>
            {programs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.specialization && (
            <p className="field-error">{errors.specialization}</p>
          )}
        </div>
        {isOthers && (
          <div className="field-group">
            <label
              htmlFor="enroll-comments"
              className={`field-label ${errors.comments ? "error" : ""}`}
            >
              Please specify:*
            </label>
            <input
              id="enroll-comments"
              className={`field-input ${errors.comments ? "error" : ""}`}
              maxLength={200}
              placeholder="Your examination program"
              value={data.comments ?? ""}
              onChange={(e) => {
                setData({
                  ...data,
                  comments: e.target.value
                    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s.,'()&-]/g, "")
                    .toUpperCase(),
                });
                clearError("comments");
              }}
            />
            {errors.comments && (
              <p className="field-error">{errors.comments}</p>
            )}
          </div>
        )}
        <ContinueButton onClick={validate} onBack={onBack} />
      </div>
    </>
  );
}

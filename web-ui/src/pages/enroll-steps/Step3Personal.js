import { useState } from "react";
import StepBanner from "../../components/StepBanner";
import ContinueButton from "../../components/ContinueButton";
import FormField from "../../components/FormField";
export default function Step3Personal({ data, setData, onNext, onBack, subStep, setSubStep }) {
  const [errors, setErrors] = useState({});
  const handleChange = (key, value) => { setData({ ...data, [key]: value }); setErrors((e) => ({ ...e, [key]: null })); };
  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));
  const validatePersonal = () => {
    const e = {};
    if (!data.firstName?.trim()) e.firstName = "Required.";
    else if (/\p{N}/u.test(data.firstName)) e.firstName = "Name cannot contain numbers.";
    if (data.middleName?.trim() && /\p{N}/u.test(data.middleName)) e.middleName = "Name cannot contain numbers.";
    if (!data.lastName?.trim()) e.lastName = "Required.";
    else if (/\p{N}/u.test(data.lastName)) e.lastName = "Name cannot contain numbers.";
    if (!data.email?.trim()) e.email = "Required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) e.email = "Please enter a valid email address.";
    if (!data.degree?.trim()) e.degree = "Required.";
    if (!data.school?.trim()) e.school = "Required.";
    if (!data.province?.trim()) e.province = "Required.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setSubStep(1);
  };
  const validatePromotionsAndPayment = () => {
    const e = {};
    if (!data.paymentDate) e.paymentDate = "Required.";
    if (!data.paymentChannel) e.paymentChannel = "Required.";
    if (data.paymentChannel === "Others" && !data.paymentOther?.trim()) e.paymentOther = "Please specify.";
    if (!data.amount?.trim()) e.amount = "Required.";
    if (!data.referenceNumber?.trim()) e.referenceNumber = "Required.";
    if (!data.proofOfPayment) e.proofOfPayment = "Please upload your receipt.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); onNext();
  };
  return (
    <>
      <StepBanner title={subStep === 0 ? "Personal Information & Verification" : "Promotions & Payment"} currentStep={2} />
      <div className="enroll-body">
        {subStep === 0 ? (
          <>
            <FormField label="First Name:*" fieldKey="firstName" placeholder="Given Name" value={data.firstName} onChange={handleChange} errors={errors} />
            <FormField label="Middle Name:" fieldKey="middleName" placeholder="Middle Name" value={data.middleName} onChange={handleChange} errors={errors} />
            <FormField label="Last Name:*" fieldKey="lastName" placeholder="Last Name" value={data.lastName} onChange={handleChange} errors={errors} />
            <FormField label="Email Address:*" fieldKey="email" placeholder="Email Address" value={data.email} onChange={handleChange} errors={errors} />
            <FormField label="Bachelor's Degree and Majorship Taken:*" fieldKey="degree" placeholder="E.g.: Bachelor of Secondary Education Major in English" hint="Format: [Full Degree/Program Title] Major in [Specialization if app.]" value={data.degree} onChange={handleChange} errors={errors} />
            <FormField label="Last School Attended:*" fieldKey="school" placeholder="E.g.: Polytechnic University of the Philippines - Main Campus" hint="Format: [Full School Name] - [Branch if applicable]" value={data.school} onChange={handleChange} errors={errors} />
            <FormField label="Province:*" fieldKey="province" placeholder="Province" value={data.province} onChange={handleChange} errors={errors} />
            <div className="field-group">
              <span className="field-label">Upload Valid ID: (optional)</span>
              <input type="file" accept="image/*,.pdf" className="field-input" style={{ padding: "8px" }} onChange={(e) => setData({ ...data, validId: e.target.files[0] || null })} />
            </div>
            <div className="field-group">
              <span className="field-label">Upload Graduation or Formal Photo: (optional)</span>
              <input type="file" accept="image/*" className="field-input" style={{ padding: "8px" }} onChange={(e) => setData({ ...data, graduationPhoto: e.target.files[0] || null })} />
              <p style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: "6px", backgroundColor: "#fff8e1", color: "#795900", fontSize: "12px", lineHeight: "1.5" }}>
                By uploading your graduation photo, you agree that it may be used in promotional materials.
              </p>
            </div>
            <ContinueButton onClick={validatePersonal} onBack={onBack} />
          </>
        ) : (
          <>
            <p className="enroll-subtitle">Please fill up the necessary information:</p>
            <div className="field-group">
              <span className="field-label">Promo/Discount to avail:</span>
              <input className="field-input" placeholder="Promo or discount (optional)" value={data.promoCode || ""} onChange={(e) => setData({ ...data, promoCode: e.target.value })} />
            </div>
            <div className="field-group">
              <span className={`field-label ${errors.paymentDate ? "error" : ""}`}>Date of Transaction:*</span>
              <input type="date" className={`field-input ${errors.paymentDate ? "error" : ""}`} value={data.paymentDate || ""} onChange={(e) => { setData({ ...data, paymentDate: e.target.value }); clearError("paymentDate"); }} />
              {errors.paymentDate && <p className="field-error">{errors.paymentDate}</p>}
            </div>
            <div className="field-group">
              <span className={`field-label ${errors.paymentChannel ? "error" : ""}`}>Payment Method:*</span>
              <select className={`field-input ${errors.paymentChannel ? "error" : ""}`} value={data.paymentChannel || ""} onChange={(e) => { setData({ ...data, paymentChannel: e.target.value, paymentOther: "" }); clearError("paymentChannel"); clearError("paymentOther"); }}>
                <option value="">Select method</option>
                {["GCash", "Maya", "Bank Transfer", "Others"].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
              {errors.paymentChannel && <p className="field-error">{errors.paymentChannel}</p>}
            </div>
            {data.paymentChannel === "Others" && (
              <div className="field-group">
                <span className={`field-label ${errors.paymentOther ? "error" : ""}`}>Please specify:*</span>
                <input className={`field-input ${errors.paymentOther ? "error" : ""}`} placeholder="Payment method" value={data.paymentOther || ""} onChange={(e) => { setData({ ...data, paymentOther: e.target.value }); clearError("paymentOther"); }} />
                {errors.paymentOther && <p className="field-error">{errors.paymentOther}</p>}
              </div>
            )}
            <div className="field-group">
              <span className={`field-label ${errors.amount ? "error" : ""}`}>Amount Transferred:*</span>
              <input className={`field-input ${errors.amount ? "error" : ""}`} placeholder="E.g.: 5000" value={data.amount || ""} onChange={(e) => { setData({ ...data, amount: e.target.value }); clearError("amount"); }} />
              {errors.amount && <p className="field-error">{errors.amount}</p>}
            </div>
            <div className="field-group">
              <span className={`field-label ${errors.referenceNumber ? "error" : ""}`}>Reference Number:*</span>
              <input className={`field-input ${errors.referenceNumber ? "error" : ""}`} placeholder="E.g.: 1234 5678 9" value={data.referenceNumber || ""} onChange={(e) => { setData({ ...data, referenceNumber: e.target.value }); clearError("referenceNumber"); }} />
              {errors.referenceNumber && <p className="field-error">{errors.referenceNumber}</p>}
            </div>
            <div className="field-group">
              <span className={`field-label ${errors.proofOfPayment ? "error" : ""}`}>Receipt:*</span>
              <input type="file" accept="image/*,.pdf" className={`field-input ${errors.proofOfPayment ? "error" : ""}`} style={{ padding: "8px" }} onChange={(e) => { setData({ ...data, proofOfPayment: e.target.files[0] }); clearError("proofOfPayment"); }} />
              {errors.proofOfPayment && <p className="field-error">{errors.proofOfPayment}</p>}
            </div>
            <ContinueButton onClick={validatePromotionsAndPayment} onBack={() => setSubStep(0)} />
          </>
        )}
      </div>
    </>
  );
}
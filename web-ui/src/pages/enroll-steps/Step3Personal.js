import { useEffect, useState } from "react";
import ContinueButton from "../../components/ContinueButton";
import FormField from "../../components/FormField";
import StepBanner from "../../components/StepBanner";
import {
  PAYMENT_TYPES,
  PROMOS,
  channelDetails,
  getPaymentChannels,
} from "../../lib/enrollment";

const UPPERCASE_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "degree",
  "school",
  "province",
];
const hasNumber = (v) => /\p{N}/u.test(v || "");
const onlyDigits = (v) => v.replace(/\D/g, "");
const onlyAmount = (v) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
const today = () => new Date().toISOString().slice(0, 10);

const noteStyle = {
  margin: "6px 0 0",
  padding: "10px 12px",
  borderRadius: "6px",
  backgroundColor: "#EEF1FF",
  color: "#2F459B",
  fontSize: "12px",
  lineHeight: "1.5",
};

export default function Step3Personal({
  data,
  setData,
  onNext,
  onBack,
  subStep,
  setSubStep,
}) {
  const [errors, setErrors] = useState({});
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    getPaymentChannels().then(setChannels);
  }, []);

  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));
  const set = (key, value) => {
    setData({ ...data, [key]: value });
    clearError(key);
  };
  const handleChange = (key, value) =>
    set(key, UPPERCASE_FIELDS.includes(key) ? value.toUpperCase() : value);

  const validatePersonal = () => {
    const e = {};
    if (!data.firstName?.trim()) e.firstName = "Required.";
    else if (hasNumber(data.firstName))
      e.firstName = "Name cannot contain numbers.";
    if (data.middleName?.trim() && hasNumber(data.middleName))
      e.middleName = "Name cannot contain numbers.";
    if (!data.lastName?.trim()) e.lastName = "Required.";
    else if (hasNumber(data.lastName))
      e.lastName = "Name cannot contain numbers.";
    if (!data.email?.trim()) e.email = "Required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
      e.email = "Please enter a valid email address.";
    if (!data.degree?.trim()) e.degree = "Required.";
    else if (hasNumber(data.degree))
      e.degree = "Degree cannot contain numbers.";
    if (!data.school?.trim()) e.school = "Required.";
    else if (hasNumber(data.school))
      e.school = "School name cannot contain numbers.";
    if (!data.province?.trim()) e.province = "Required.";
    else if (hasNumber(data.province))
      e.province = "Province cannot contain numbers.";
    if (!data.graduationPhoto) e.graduationPhoto = "Required.";
    if (!data.photoConsent) e.photoConsent = "Kindly agree before proceeding.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setSubStep(1);
  };

  const validatePromotionsAndPayment = () => {
    const e = {};
    if (!data.paymentDate) e.paymentDate = "Required.";
    if (!data.paymentChannelId) e.paymentChannel = "Required.";
    if (!data.paymentType) e.paymentType = "Required.";
    if (!data.amount?.trim()) e.amount = "Required.";
    else if (!(parseFloat(data.amount) > 0))
      e.amount = "Please enter a valid amount.";
    if (!data.referenceNumber?.trim()) e.referenceNumber = "Required.";
    if (!data.proofOfPayment) e.proofOfPayment = "Please upload your receipt.";
    if (!data.paymentNoticeAgreement)
      e.paymentNoticeAgreement = "Kindly confirm before proceeding.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    onNext();
  };

  const label = (key, text) => (
    <span className={`field-label ${errors[key] ? "error" : ""}`}>{text}</span>
  );
  const error = (key) =>
    errors[key] && <p className="field-error">{errors[key]}</p>;
  const checkbox = (key, text) => (
    <div className="field-group">
      <label
        className="radio-label"
        style={{ alignItems: "flex-start", fontSize: "13px" }}
      >
        <input
          type="checkbox"
          checked={!!data[key]}
          onChange={(e) => set(key, e.target.checked)}
        />
        <span style={{ color: errors[key] ? "#e53935" : undefined }}>
          {text}
        </span>
      </label>
      {error(key)}
    </div>
  );

  const picked = (key) =>
    data[key] && (
      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#2F459B" }}>
        ✓ {data[key].name}
      </p>
    );

  const details = channelDetails(data.paymentChannel);

  return (
    <>
      <StepBanner
        title={
          subStep === 0
            ? "Personal Information & Verification"
            : "Promotions & Payment"
        }
        currentStep={2}
      />
      <div className="enroll-body">
        {subStep === 0 ? (
          <>
            <FormField
              label="First Name:*"
              fieldKey="firstName"
              placeholder="Given Name"
              value={data.firstName}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Middle Name:"
              fieldKey="middleName"
              placeholder="Middle Name"
              value={data.middleName}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Last Name:*"
              fieldKey="lastName"
              placeholder="Last Name"
              value={data.lastName}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Email Address:*"
              fieldKey="email"
              placeholder="Email Address"
              value={data.email}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Bachelor's Degree and Majorship Taken:*"
              fieldKey="degree"
              placeholder="E.g.: Bachelor of Secondary Education Major in English"
              hint="Format: [Full Degree/Program Title] Major in [Specialization if applicable]"
              value={data.degree}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Last School Attended:*"
              fieldKey="school"
              placeholder="E.g.: Polytechnic University of the Philippines - Main Campus"
              hint="Format: [Full School Name] - [Branch if applicable]"
              value={data.school}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Province:*"
              fieldKey="province"
              placeholder="Province"
              value={data.province}
              onChange={handleChange}
              errors={errors}
            />
            <div className="field-group">
              <span className="field-label">Upload Valid ID: (optional)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="field-input"
                style={{ padding: "8px" }}
                onChange={(e) =>
                  setData({ ...data, validId: e.target.files[0] || null })
                }
              />
              {picked("validId")}
            </div>
            <div className="field-group">
              {label("graduationPhoto", "Upload Graduation or Formal Photo:*")}
              <input
                type="file"
                accept="image/*"
                className={`field-input ${errors.graduationPhoto ? "error" : ""}`}
                style={{ padding: "8px" }}
                onChange={(e) =>
                  set("graduationPhoto", e.target.files[0] || null)
                }
              />
              {picked("graduationPhoto")}
              {error("graduationPhoto")}
            </div>
            {checkbox(
              "photoConsent",
              "I agree that my graduation/formal photo and valid ID may be used in promotional materials and verification purposes.",
            )}
            <ContinueButton onClick={validatePersonal} onBack={onBack} />
          </>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 16px",
                padding: "10px 12px",
                borderRadius: "6px",
                backgroundColor: "#fff8e1",
                color: "#795900",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              ATTENTION: Kindly consult with our admins regarding the course
              prices before proceeding.
            </p>
            <div className="field-group">
              <span className="field-label">Promo/Discount to avail:</span>
              <select
                className="field-input"
                value={data.promoId ?? ""}
                onChange={(e) => {
                  const promo = PROMOS.find(
                    (p) => p.id === Number(e.target.value),
                  );
                  setData({
                    ...data,
                    promoId: promo?.id ?? null,
                    promoCode: promo?.name ?? "",
                  });
                }}
              >
                <option value="">Select promo (optional)</option>
                {PROMOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              {label("paymentDate", "Date of Transaction:*")}
              <input
                type="date"
                max={today()}
                className={`field-input ${errors.paymentDate ? "error" : ""}`}
                value={data.paymentDate || ""}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
              {error("paymentDate")}
            </div>
            <div className="field-group">
              {label("paymentChannel", "Payment Method:*")}
              <select
                className={`field-input ${errors.paymentChannel ? "error" : ""}`}
                value={data.paymentChannelId ?? ""}
                onChange={(e) => {
                  const channel = channels.find(
                    (c) => c.id === Number(e.target.value),
                  );
                  setData({
                    ...data,
                    paymentChannelId: channel?.id ?? null,
                    paymentChannel: channel?.name ?? "",
                  });
                  clearError("paymentChannel");
                }}
              >
                <option value="">Select method</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {error("paymentChannel")}
              {details && (
                <div
                  style={{
                    border: `2px solid ${details.color}`,
                    borderRadius: "10px",
                    padding: "14px",
                    marginTop: "10px",
                    backgroundColor: "#fff",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontWeight: 700,
                      color: details.color,
                    }}
                  >
                    {data.paymentChannel}
                  </p>
                  {details.rows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "130px",
                          fontWeight: 600,
                          color: "#333",
                        }}
                      >
                        {row.label}:
                      </span>
                      <span style={{ flex: 1 }}>{row.value || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="field-group">
              {label("paymentType", "Payment Type:*")}
              <select
                className={`field-input ${errors.paymentType ? "error" : ""}`}
                value={data.paymentType || ""}
                onChange={(e) => set("paymentType", e.target.value || null)}
              >
                <option value="">Select payment type</option>
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.name}
                  </option>
                ))}
              </select>
              {error("paymentType")}
              {data.paymentType === "downpayment" && (
                <p style={noteStyle}>
                  With a downpayment, you can access the courses up to LET
                  Express. Upload your remaining balance receipt later in your
                  Profile to unlock the rest.
                </p>
              )}
            </div>
            <div className="field-group">
              {label("amount", "Amount Transferred:*")}
              <input
                inputMode="decimal"
                className={`field-input ${errors.amount ? "error" : ""}`}
                placeholder="E.g.: 3500"
                value={data.amount || ""}
                onChange={(e) => set("amount", onlyAmount(e.target.value))}
              />
              {error("amount")}
            </div>
            <div className="field-group">
              {label("referenceNumber", "Reference Number:*")}
              <input
                inputMode="numeric"
                className={`field-input ${errors.referenceNumber ? "error" : ""}`}
                placeholder="Enter Ref #"
                value={data.referenceNumber || ""}
                onChange={(e) =>
                  set("referenceNumber", onlyDigits(e.target.value))
                }
              />
              {error("referenceNumber")}
            </div>
            <div className="field-group">
              {label("proofOfPayment", "Verification/Receipt:*")}
              <input
                type="file"
                accept="image/*,.pdf"
                className={`field-input ${errors.proofOfPayment ? "error" : ""}`}
                style={{ padding: "8px" }}
                onChange={(e) =>
                  set("proofOfPayment", e.target.files[0] || null)
                }
              />
              {picked("proofOfPayment")}
              {error("proofOfPayment")}
            </div>
            {checkbox(
              "paymentNoticeAgreement",
              "I acknowledge that all info is correct and had consulted with an admin before proceeding.",
            )}
            <ContinueButton
              onClick={validatePromotionsAndPayment}
              onBack={() => setSubStep(0)}
            />
          </>
        )}
      </div>
    </>
  );
}

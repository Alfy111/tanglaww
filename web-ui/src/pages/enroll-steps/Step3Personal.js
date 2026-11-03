import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ContinueButton from "../../components/ContinueButton";
import FormField from "../../components/FormField";
import StepBanner from "../../components/StepBanner";
import {
  PAYMENT_TYPES,
  channelDetails,
  getPaymentChannels,
  getPromos,
} from "../../lib/enrollment";

const NAME_FIELDS = ["firstName", "middleName", "lastName"];
const SCHOOL_FIELDS = ["degree", "school", "tcpProgram", "tcpSchool"];
const hasNumber = (v) => /\p{N}/u.test(v || "");
// True if the text has no letters, or has symbols stacked like "..", "-(", "&&"
const hasBadMarks = (v) =>
  !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(v) || /[.,'()&-]{2,}/.test(v);
// Names: letters (incl. Ñ/accents), spaces and . - ' only
const cleanName = (v) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s.'-]/g, "");
const cleanText = (v) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,'()&-]/g, "");
const isFacebookLink = (v) =>
  /^(https?:\/\/)?([a-z0-9-]+\.)?(facebook|fb)\.com\/\S+/i.test(
    (v || "").trim(),
  );
const onlyDigits = (v) => v.replace(/\D/g, "");
const MAX_PAYMENTS = 5;
const newExtraPayment = () => ({
  key: String(Date.now() + Math.random()),
  paymentDate: "",
  paymentChannelId: null,
  paymentChannel: "",
  amount: "",
  referenceNumber: "",
  proofOfPayment: null,
});
const extraPaymentMissing = (p) => ({
  paymentDate: !p.paymentDate,
  paymentChannel: !p.paymentChannelId,
  amount: !(parseFloat(p.amount) > 0),
  referenceNumber: !p.referenceNumber?.trim(),
});
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
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    getPromos().then(setPromos);
  }, []);

  useEffect(() => {
    getPaymentChannels().then(setChannels);
  }, []);

  const clearError = (key) => setErrors((e) => ({ ...e, [key]: null }));
  const set = (key, value) => {
    setData({ ...data, [key]: value });
    clearError(key);
  };
  // "Same school" box: keep the TCP fields equal to the college fields
  useEffect(() => {
    if (!data.tcpSameAsCollege) return;
    if (data.tcpProgram === data.degree && data.tcpSchool === data.school)
      return;
    setData({
      ...data,
      tcpProgram: data.degree ?? "",
      tcpSchool: data.school ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tcpSameAsCollege, data.degree, data.school]);

  const handleChange = (key, value) => {
    if (NAME_FIELDS.includes(key)) value = cleanName(value).toUpperCase();
    else if (SCHOOL_FIELDS.includes(key))
      value = cleanText(value).toUpperCase();
    else if (key === "facebookName") value = cleanText(value);
    else if (key === "facebookLink") value = value.replace(/\s/g, "");
    set(key, value);
  };

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
    // Facebook fields are optional, but must look right if filled in
    if (data.facebookName?.trim() && hasBadMarks(data.facebookName))
      e.facebookName = "Please use letters, not just symbols.";
    if (data.facebookLink?.trim() && !isFacebookLink(data.facebookLink))
      e.facebookLink =
        "Please paste your Facebook profile link (facebook.com/...).";
    if (!data.degree?.trim()) e.degree = "Required.";
    else if (hasNumber(data.degree))
      e.degree = "Degree cannot contain numbers.";
    if (!data.school?.trim()) e.school = "Required.";
    else if (hasNumber(data.school))
      e.school = "School name cannot contain numbers.";
    if (data.tcpProgram?.trim() && hasNumber(data.tcpProgram))
      e.tcpProgram = "Program cannot contain numbers.";
    if (data.tcpSchool?.trim() && hasNumber(data.tcpSchool))
      e.tcpSchool = "School name cannot contain numbers.";
    [...NAME_FIELDS, ...SCHOOL_FIELDS].forEach((k) => {
      if (!e[k] && data[k]?.trim() && hasBadMarks(data[k]))
        e[k] = "Please use letters, not just symbols.";
    });
    // Only needed when they actually uploaded a photo or ID
    if ((data.graduationPhoto || data.validId) && !data.photoConsent)
      e.photoConsent = "Kindly agree before proceeding.";
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
    if (
      (data.extraPayments || []).some((p) =>
        Object.values(extraPaymentMissing(p)).some(Boolean),
      )
    )
      e.extraPayments = "Please complete every added payment, or remove it.";
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

  const extraPayments = data.extraPayments || [];
  const addExtraPayment = () => {
    if (extraPayments.length + 1 >= MAX_PAYMENTS) return;
    setData({ ...data, extraPayments: [...extraPayments, newExtraPayment()] });
  };
  const updateExtraPayment = (key, changes) => {
    setData({
      ...data,
      extraPayments: extraPayments.map((p) =>
        p.key === key ? { ...p, ...changes } : p,
      ),
    });
    clearError("extraPayments");
  };
  const removeExtraPayment = (key) => {
    setData({
      ...data,
      extraPayments: extraPayments.filter((p) => p.key !== key),
    });
    clearError("extraPayments");
  };

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
              label="Email Address:*"
              fieldKey="email"
              placeholder="Email Address"
              value={data.email}
              onChange={handleChange}
              errors={errors}
            />
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
              label="Facebook Name:"
              fieldKey="facebookName"
              placeholder="Name on your Facebook account (optional)"
              value={data.facebookName ?? ""}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Facebook Link:"
              fieldKey="facebookLink"
              placeholder="E.g.: https://www.facebook.com/your.name (optional)"
              value={data.facebookLink ?? ""}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Bachelor's Degree (College):*"
              fieldKey="degree"
              placeholder="E.g.: Bachelor of Arts in Psychology"
              value={data.degree ?? ""}
              onChange={handleChange}
              errors={errors}
            />
            <FormField
              label="Name of School:*"
              fieldKey="school"
              placeholder="E.g.: Polytechnic University of the Philippines"
              value={data.school ?? ""}
              onChange={handleChange}
              errors={errors}
            />
            {checkbox(
              "tcpSameAsCollege",
              "I took my Teacher Certificate Program (TCP) at the same school. Use my Bachelor's Degree and Name of School above.",
            )}
            {data.tcpSameAsCollege ? (
              <p
                style={{
                  margin: "4px 0 18px 10px",
                  fontSize: "12px",
                  color: "#777",
                }}
              >
                TCP Program and School will be the same as your Bachelor's
                Degree and Name of School.
              </p>
            ) : (
              <>
                <FormField
                  label="Program Name/Course (for Teacher Certificate Program (TCP)):"
                  fieldKey="tcpProgram"
                  placeholder="Optional"
                  hint={
                    <>
                      Examples:
                      <span style={{ display: "block", paddingLeft: "10px" }}>
                        • Bachelor of Secondary Education Major in
                        (Specialization)
                      </span>
                      <span style={{ display: "block", paddingLeft: "10px" }}>
                        • Certificate in Professional Teaching Program Major in
                        (Specialization)
                      </span>
                      <span style={{ display: "block", paddingLeft: "10px" }}>
                        • Teacher Certificate Program Major in (Specialization)
                      </span>
                      <span style={{ display: "block", marginTop: "6px" }}>
                        Note: Only include courses related to Education.
                      </span>
                    </>
                  }
                  value={data.tcpProgram ?? ""}
                  onChange={handleChange}
                  errors={errors}
                />
                <FormField
                  label="Last School Attended (for TCP):"
                  fieldKey="tcpSchool"
                  placeholder="Optional"
                  hint={
                    <>
                      Note: If you are a Unit Earner, list the school where you
                      earned your teaching units.
                      <span style={{ display: "block" }}>
                        Format: [Full School Name] - [Branch if applicable]
                      </span>
                    </>
                  }
                  value={data.tcpSchool ?? ""}
                  onChange={handleChange}
                  errors={errors}
                />
              </>
            )}
            <div className="field-group">
              <span className="field-label">
                Upload Graduation or Formal Photo: (optional)
              </span>
              <input
                type="file"
                accept="image/*"
                className="field-input"
                style={{ padding: "8px" }}
                onChange={(e) =>
                  setData({
                    ...data,
                    graduationPhoto: e.target.files[0] || null,
                  })
                }
              />
              {picked("graduationPhoto")}
            </div>
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
            {(data.graduationPhoto || data.validId) &&
              checkbox(
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
                  const promo = promos.find(
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
                {promos.map((p) => (
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
                  With a downpayment, you can access the courses up to LEPT
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
              {label("proofOfPayment", "Verification/Receipt:")}
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

            {extraPayments.map((p, i) => {
              const missing = extraPaymentMissing(p);
              const bad = (k) => !!errors.extraPayments && missing[k];
              const fieldLabel = (k, text) => (
                <span className={`field-label ${bad(k) ? "error" : ""}`}>
                  {text}
                </span>
              );
              return (
                <div
                  key={p.key}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ color: "#2F459B", fontSize: "15px" }}>
                      Payment {i + 2}
                    </strong>
                    <button
                      type="button"
                      onClick={() => removeExtraPayment(p.key)}
                      style={{
                        border: 0,
                        background: "none",
                        color: "#e53935",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="field-group">
                    {fieldLabel("paymentDate", "Date of Transaction:*")}
                    <input
                      type="date"
                      max={today()}
                      className={`field-input ${bad("paymentDate") ? "error" : ""}`}
                      value={p.paymentDate}
                      onChange={(e) =>
                        updateExtraPayment(p.key, {
                          paymentDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="field-group">
                    {fieldLabel("paymentChannel", "Payment Method:*")}
                    <select
                      className={`field-input ${bad("paymentChannel") ? "error" : ""}`}
                      value={p.paymentChannelId ?? ""}
                      onChange={(e) => {
                        const channel = channels.find(
                          (c) => c.id === Number(e.target.value),
                        );
                        updateExtraPayment(p.key, {
                          paymentChannelId: channel?.id ?? null,
                          paymentChannel: channel?.name ?? "",
                        });
                      }}
                    >
                      <option value="">Select method</option>
                      {channels.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    {fieldLabel("amount", "Amount Transferred:*")}
                    <input
                      inputMode="decimal"
                      className={`field-input ${bad("amount") ? "error" : ""}`}
                      placeholder="E.g.: 1000"
                      value={p.amount}
                      onChange={(e) =>
                        updateExtraPayment(p.key, {
                          amount: onlyAmount(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field-group">
                    {fieldLabel("referenceNumber", "Reference Number:*")}
                    <input
                      inputMode="numeric"
                      className={`field-input ${bad("referenceNumber") ? "error" : ""}`}
                      placeholder="Enter Ref #"
                      value={p.referenceNumber}
                      onChange={(e) =>
                        updateExtraPayment(p.key, {
                          referenceNumber: onlyDigits(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    {fieldLabel("proofOfPayment", "Verification/Receipt:")}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="field-input"
                      style={{ padding: "8px" }}
                      onChange={(e) =>
                        updateExtraPayment(p.key, {
                          proofOfPayment: e.target.files[0] || null,
                        })
                      }
                    />
                    {p.proofOfPayment && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "12px",
                          color: "#2F459B",
                        }}
                      >
                        ✓ {p.proofOfPayment.name}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {error("extraPayments")}

            <div className="field-group">
              {extraPayments.length + 1 < MAX_PAYMENTS && (
                <button
                  type="button"
                  onClick={addExtraPayment}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    border: 0,
                    padding: 0,
                    background: "none",
                    color: "#2F459B",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Add another payment <PlusCircle size={20} strokeWidth={2.2} />
                </button>
              )}
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#777" }}>
                Paid in parts or through a different method? Add each payment
                separately.
              </p>
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

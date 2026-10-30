import { useState } from "react";
import ContinueButton from "../../components/ContinueButton";
import StepBanner from "../../components/StepBanner";
import SummarySection from "../../components/SummarySection";
import { PAYMENT_TYPES, submitEnrollment } from "../../lib/enrollment";

export default function Step4Payment({ data, onNext, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await submitEnrollment(data);
      onNext();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const paymentType = PAYMENT_TYPES.find(
    (t) => t.value === data.paymentType,
  )?.name;

  return (
    <>
      <StepBanner title="Summary" currentStep={3} />
      <div className="enroll-body">
        <p className="enroll-subtitle">
          Kindly verify all information before proceeding.
        </p>
        <SummarySection
          title="Program & Curriculum"
          fields={[
            ["Type of Taker", data.takerType],
            ["Curriculum", data.curriculum],
            ["Specialization", data.specialization],
          ]}
        />
        <SummarySection
          title="Personal Information & Verification"
          fields={[
            ["First Name", data.firstName],
            ["Middle Name", data.middleName],
            ["Last Name", data.lastName],
            ["Email", data.email],
            ["Bachelor's Degree and Majorship", data.degree],
            ["Last School Attended", data.school],
            ["Province", data.province],
            ["Valid ID", data.validId?.name || "Not provided"],
            ["Graduation or Formal Photo", data.graduationPhoto?.name || "—"],
          ]}
        />
        <SummarySection
          title="Promotions & Payment"
          fields={[
            ["Promo/Discount to avail", data.promoCode || "None"],
            ["Date of Transaction", data.paymentDate],
            ["Payment Method", data.paymentChannel],
            ["Payment Type", paymentType],
            ["Amount Transferred", data.amount],
            ["Reference Number", data.referenceNumber],
            ["Receipt", data.proofOfPayment?.name || "—"],
          ]}
        />
        {error && (
          <p
            className="field-error"
            style={{ fontSize: "13px", margin: "12px 0" }}
          >
            {error}
          </p>
        )}
        {submitting && (
          <p style={{ fontSize: "13px", color: "#2F459B", margin: "12px 0" }}>
            Submitting your enrollment…
          </p>
        )}
        <ContinueButton
          onClick={handleSubmit}
          onBack={submitting ? () => {} : onBack}
        />
      </div>
    </>
  );
}

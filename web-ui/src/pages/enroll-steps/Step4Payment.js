import StepBanner from "../../components/StepBanner";
import ContinueButton from "../../components/ContinueButton";
import SummarySection from "../../components/SummarySection";
export default function Step4Payment({ data, onNext, onBack }) {
  return (
    <>
      <StepBanner title="Summary" currentStep={3} />
      <div className="enroll-body">
        <p className="enroll-subtitle">Kindly verify all information before proceeding.</p>
        <SummarySection title="Program & Curriculum" fields={[["Curriculum", data.curriculum], ["Specialization", data.specialization], ["Type of Taker", data.takerType]]} />
        <SummarySection title="Personal Information & Verification" fields={[["First Name", data.firstName], ["Middle Name", data.middleName], ["Last Name", data.lastName], ["Email", data.email], ["Degree", data.degree], ["School", data.school], ["Province", data.province], ["Valid ID", data.validId?.name || "Not uploaded"], ["Graduation or Formal Photo", data.graduationPhoto?.name || "Not uploaded"]]} />
        <SummarySection title="Promotions & Payment" fields={[["Promo/Discount to avail", data.promoCode || "None"], ["Date of Transaction", data.paymentDate], ["Payment Method", data.paymentChannel === "Others" ? data.paymentOther : data.paymentChannel], ["Amount Transferred", data.amount], ["Reference Number", data.referenceNumber], ["Receipt", data.proofOfPayment?.name || "Uploaded"]]} />
        <ContinueButton onClick={onNext} onBack={onBack} />
      </div>
    </>
  );
}
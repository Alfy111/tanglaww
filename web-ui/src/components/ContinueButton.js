export default function ContinueButton({ onClick, label = "Continue", onBack }) {
  const continueButton = (
    <button type="button" onClick={onClick} className="continue-btn">
      {label}
    </button>
  );

  if (!onBack) return continueButton;

  return (
    <div className="step-navigation">
      <button type="button" onClick={onBack} className="back-btn">
        Back
      </button>
      {continueButton}
    </div>
  );
}
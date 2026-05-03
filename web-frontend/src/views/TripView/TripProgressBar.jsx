import "./TripProgressBar.css";

export default function TripProgressBar({ currentStep }) {
  const steps = [
    { num: 1, label: "Trip Details",   sub: "Vehicle & route" },
    { num: 2, label: "Route Results",  sub: "AI recommendations" },
    { num: 3, label: "Confirm & Save", sub: "Review selection" },
  ];

  return (
    <div className="tpb-strip">
      <div className="tpb-inner">
        {steps.map((step, i) => {
          const isDone   = currentStep > step.num;
          const isActive = currentStep === step.num;
          return (
            <div key={step.num} className="tpb-item-wrap">
              <div className="tpb-item">
                <div className={`tpb-circle ${isDone ? "tpb-done" : isActive ? "tpb-active" : ""}`}>
                  {isDone ? "✓" : step.num}
                </div>
                <div className="tpb-text">
                  <div className={`tpb-label ${isDone ? "tpb-label--done" : isActive ? "tpb-label--active" : ""}`}>
                    {step.label}
                  </div>
                  <div className="tpb-sub">{step.sub}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`tpb-line ${isDone ? "tpb-line--done" : ""}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
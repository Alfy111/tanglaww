import { useState } from "react";

// fields: [label, value] rows, or { heading: "Payment 2" } for a blue sub-heading
export default function SummarySection({ title, fields }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="summary-section">
      <div className="summary-header" onClick={() => setOpen(!open)}>
        {title}
        <span>{open ? "^" : "v"}</span>
      </div>
      {open && (
        <div className="summary-body">
          {fields.map((field, i) =>
            field.heading ? (
              <div
                key={i}
                style={{ color: "#2F459B", fontWeight: 700, marginTop: "10px" }}
              >
                {field.heading}
              </div>
            ) : (
              <div key={i}>
                <strong>{field[0]}:</strong> {field[1] || "-"}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

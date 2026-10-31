import { GripVertical, XCircle } from "lucide-react";
import { useState } from "react";

const COLORS = {
  primary: "#0D2A94",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  hover: "#E3E9FF",
  filled: "#EEF1FB",
};

export default function MatchingBoard({ items, options, value, onChange }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const placed = new Set(Object.values(value));
  const pool = options.filter((o) => !placed.has(o));

  const place = (slotKey, option) => {
    const next = { ...value };
    for (const k of Object.keys(next)) if (next[k] === option) delete next[k];
    next[slotKey] = option;
    onChange(next);
  };

  const clearSlot = (slotKey) => {
    const next = { ...value };
    delete next[slotKey];
    onChange(next);
  };

  return (
    <div>
      {items.map((item, i) => {
        const key = String(item.pair_id);
        const chosen = value[key];
        return (
          <div key={key} style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "14px",
                color: COLORS.text,
                marginBottom: "6px",
              }}
            >
              {i + 1}. {item.leftText}
            </div>
            <button
              type="button"
              aria-label={
                chosen
                  ? `Remove ${chosen} from item ${i + 1}`
                  : `Answer box for item ${i + 1}`
              }
              onClick={() => {
                if (selected) {
                  place(key, selected);
                  setSelected(null);
                } else if (chosen) {
                  clearSlot(key);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setHovered(key);
              }}
              onDragLeave={() => setHovered((h) => (h === key ? null : h))}
              onDrop={(e) => {
                e.preventDefault();
                const option = e.dataTransfer.getData("text/plain");
                if (option) place(key, option);
                setHovered(null);
              }}
              style={{
                width: "100%",
                minHeight: "46px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                border: `1.5px ${chosen ? "solid" : "dashed"} ${chosen || hovered === key ? COLORS.primary : COLORS.border}`,
                backgroundColor:
                  hovered === key
                    ? COLORS.hover
                    : chosen
                      ? COLORS.filled
                      : "#fff",
              }}
            >
              {chosen ? (
                <>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: COLORS.text,
                    }}
                  >
                    {chosen}
                  </span>
                  <XCircle size={16} color={COLORS.primary} />
                </>
              ) : (
                <span style={{ fontSize: "13px", color: "#9AA1AE" }}>
                  {selected ? "Click to place here" : "Drop answer here"}
                </span>
              )}
            </button>
          </div>
        );
      })}

      <p
        style={{ fontSize: "13px", color: COLORS.muted, margin: "12px 0 10px" }}
      >
        {pool.length > 0
          ? "Drag each answer to its match, or click an answer and then a box."
          : "All answers placed. Click a placed answer to take it back."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {pool.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              draggable
              aria-pressed={isSelected}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", option);
                e.dataTransfer.effectAllowed = "move";
                setSelected(null);
              }}
              onClick={() => setSelected((s) => (s === option ? null : option))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "18px",
                border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                backgroundColor: isSelected ? COLORS.primary : "#fff",
                color: isSelected ? "#fff" : COLORS.text,
                fontSize: "14px",
                cursor: "grab",
                fontFamily: "inherit",
              }}
            >
              <GripVertical
                size={14}
                color={isSelected ? "#fff" : COLORS.muted}
              />
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

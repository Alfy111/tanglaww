import { CheckSquare, GripVertical, Square } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export const NAVY = "#2F459B";

export const toolButton = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 10px",
  borderRadius: "6px",
  border: `1px solid ${NAVY}`,
  backgroundColor: "#fff",
  color: NAVY,
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

export const actionButton = { ...toolButton, textDecoration: "none" };

export const primaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  backgroundColor: NAVY,
  color: "#fff",
  border: 0,
  padding: "13px",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

export function MaterialPage({ topbarTitle, courseTitle, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
        backgroundColor: "#f5f6fa",
      }}
    >
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar title={topbarTitle} />
        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1280px",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/admin/courses")}
            style={{
              border: 0,
              background: "none",
              padding: 0,
              color: "#0D2A94",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: "12px",
            }}
          >
            ← Back to Courses
          </button>
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid #eee",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{ padding: "18px 24px", borderBottom: "1px solid #EEE" }}
            >
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "#0D2A94",
                }}
              >
                {courseTitle}
              </div>
              <div
                style={{ fontSize: "13px", color: "#777", marginTop: "2px" }}
              >
                {subtitle}
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, text, hint }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      {icon}
      <p style={{ fontSize: "16px", color: "#95A5A6", margin: "12px 0 4px" }}>
        {text}
      </p>
      {hint && (
        <p style={{ fontSize: "13px", color: "#BDC3C7", margin: 0 }}>{hint}</p>
      )}
    </div>
  );
}

export function ToolsRow({ count, onSelect, onReorder, disabled }) {
  if (count === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        margin: "12px 0",
      }}
    >
      <button
        type="button"
        style={toolButton}
        onClick={onSelect}
        disabled={disabled}
      >
        <CheckSquare size={14} /> Select
      </button>
      {count > 1 && (
        <button
          type="button"
          style={toolButton}
          onClick={onReorder}
          disabled={disabled}
        >
          <GripVertical size={14} /> Reorder
        </button>
      )}
    </div>
  );
}

export function SelectBar({
  selectedCount,
  allSelected,
  onToggleAll,
  onCancel,
  onDelete,
  deleting,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "12px 0",
      }}
    >
      <button
        type="button"
        onClick={onToggleAll}
        style={{
          border: 0,
          background: "none",
          color: NAVY,
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {allSelected ? "Unselect all" : "Select all"}
      </button>
      <span
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: "12px",
          color: "#777",
        }}
      >
        {selectedCount} selected
      </span>
      <button
        type="button"
        style={toolButton}
        onClick={onCancel}
        disabled={deleting}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={selectedCount === 0 || deleting}
        style={{
          padding: "7px 12px",
          borderRadius: "6px",
          border: 0,
          backgroundColor: "#E74C3C",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "700",
          minWidth: "64px",
          cursor: "pointer",
          opacity: selectedCount === 0 || deleting ? 0.5 : 1,
          fontFamily: "inherit",
        }}
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

export function SelectBox({ checked }) {
  return checked ? (
    <CheckSquare size={22} color={NAVY} />
  ) : (
    <Square size={22} color="#A0A7B4" />
  );
}

export function ReorderList({ items, renderIcon, onSave, onCancel }) {
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const moveTo = (target) => {
    if (dragIndex === null || dragIndex === target) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDragIndex(target);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(order.map((item) => item.material_id));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          margin: "12px 0",
        }}
      >
        <span style={{ flex: 1, fontSize: "12px", color: "#777" }}>
          Drag ☰ to change the order
        </span>
        <button
          type="button"
          style={{ ...toolButton, borderColor: "#BDC3C7", color: "#555" }}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            padding: "7px 12px",
            borderRadius: "6px",
            border: 0,
            backgroundColor: NAVY,
            color: "#fff",
            fontSize: "12px",
            fontWeight: "700",
            minWidth: "86px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {order.map((item, index) => (
          <div
            key={item.material_id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => moveTo(index)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => setDragIndex(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "56px",
              padding: "0 12px",
              borderRadius: "10px",
              border: `1px solid ${dragIndex === index ? NAVY : "#E8ECF4"}`,
              backgroundColor: dragIndex === index ? "#fff" : "#F8F9FC",
              cursor: "grab",
              boxSizing: "border-box",
            }}
          >
            <GripVertical size={22} color="#7F8C8D" />
            <span
              style={{
                width: "30px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {renderIcon(item)}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: "13px",
                fontWeight: "600",
                color: "#1A1A2E",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

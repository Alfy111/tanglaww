import {
  Check,
  ChevronRight,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import RegistrantModal from "../../components/admin/RegistrantModal";
import { STATUS_LABELS, first, getStatus } from "../../lib/enrollmentStatus";
import { supabase } from "../../lib/supabase";

const NAVY = "#2F459B";
const FONT = "Poppins, sans-serif";

const SORT_LABELS = {
  alpha_asc: "Name (Ascending)",
  alpha_desc: "Name (Descending)",
  id_asc: "Student No. (Ascending)",
  id_desc: "Student No. (Descending)",
};

const FILTER_LABELS = {
  all: "All Students",
  pending: STATUS_LABELS.pending,
  partially_approved: STATUS_LABELS.partially_approved,
  approved: STATUS_LABELS.approved,
  withdrawn: STATUS_LABELS.withdrawn,
  rejected: STATUS_LABELS.rejected,
};

const nameOf = (item) =>
  `${item.student?.firstName ?? ""} ${item.student?.lastName ?? ""}`.trim();

function OptionRow({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        marginBottom: "4px",
        borderRadius: "8px",
        border: 0,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        fontSize: "14px",
        backgroundColor: active ? "#EEF1FF" : "transparent",
        color: active ? NAVY : "#555",
        fontWeight: active ? "600" : "400",
      }}
    >
      {label}
      {active && <Check size={18} color={NAVY} />}
    </button>
  );
}

function FilterModal({ sortBy, statusFilter, onApply, onClose }) {
  const [pendingSort, setPendingSort] = useState(sortBy);
  const [pendingStatus, setPendingStatus] = useState(statusFilter);
  const sectionLabel = {
    fontSize: "11px",
    fontWeight: "700",
    color: "#AAA",
    textTransform: "uppercase",
    letterSpacing: "1px",
    margin: "0 0 8px",
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: FONT,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        style={{
          width: "100%",
          maxWidth: "420px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          borderRadius: "20px",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            id="filter-title"
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: "#1A1A2E",
            }}
          >
            Filter & Sort
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={24} color="#333" />
          </button>
        </div>

        <div style={{ overflowY: "auto" }}>
          <p style={sectionLabel}>Sort By</p>
          {Object.keys(SORT_LABELS).map((key) => (
            <OptionRow
              key={key}
              label={SORT_LABELS[key]}
              active={pendingSort === key}
              onClick={() => setPendingSort(key)}
            />
          ))}

          <p style={{ ...sectionLabel, marginTop: "20px" }}>
            Enrollment Status
          </p>
          {Object.keys(FILTER_LABELS).map((key) => (
            <OptionRow
              key={key}
              label={FILTER_LABELS[key]}
              active={pendingStatus === key}
              onClick={() => setPendingStatus(key)}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid #F0F0F0",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPendingSort("alpha_asc");
              setPendingStatus("all");
            }}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: "10px",
              border: "1px solid #DDD",
              backgroundColor: "#fff",
              color: "#777",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(pendingSort, pendingStatus)}
            style={{
              flex: 2,
              padding: "13px",
              borderRadius: "10px",
              border: 0,
              backgroundColor: NAVY,
              color: "#fff",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentRegistry() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("alpha_asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("enrollment")
      .select(
        `
        enrollment_id, student_id,
        student (id, firstName, lastName, email, profilephotourl),
        curriculum!enrollment_curriculum_id_fkey (curriculumName),
        verification!enrollment_verification_id_fkey (verificationStatus, verificationNotes, status)
      `,
      )
      .order("enrollment_id", { ascending: false });

    if (loadError) {
      setError(`Could not load students: ${loadError.message}`);
    } else {
      const seen = new Set();
      const latest = [];
      (data ?? []).forEach((e) => {
        if (seen.has(e.student_id)) return;
        seen.add(e.student_id);
        latest.push({
          ...e,
          student: first(e.student),
          curriculum: first(e.curriculum),
        });
      });
      setItems(latest);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchesSearch =
        nameOf(item).toLowerCase().includes(q) ||
        (item.student?.email ?? "").toLowerCase().includes(q) ||
        String(item.student?.id ?? "").includes(q);
      const matchesStatus =
        statusFilter === "all" || getStatus(item) === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "alpha_desc":
          return nameOf(b).localeCompare(nameOf(a));
        case "id_asc":
          return (a.student?.id ?? 0) - (b.student?.id ?? 0);
        case "id_desc":
          return (b.student?.id ?? 0) - (a.student?.id ?? 0);
        default:
          return nameOf(a).localeCompare(nameOf(b));
      }
    });
  }, [items, search, sortBy, statusFilter]);

  const hasActiveFilters = sortBy !== "alpha_asc" || statusFilter !== "all";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: FONT,
        backgroundColor: "#f5f6fa",
      }}
    >
      <AdminSidebar />
      <div style={{ marginLeft: "240px", flex: 1, minWidth: 0 }}>
        <AdminTopbar title="Student Registry" />
        <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#fff",
                border: "1px solid #DCDFE3",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <Search size={18} color="#999" />
              <input
                aria-label="Search students"
                placeholder="Search by name, email or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  fontSize: "14px",
                  color: "#333",
                  fontFamily: FONT,
                  backgroundColor: "transparent",
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  style={{
                    border: 0,
                    background: "none",
                    cursor: "pointer",
                    display: "flex",
                    padding: 0,
                  }}
                >
                  <XCircle size={16} color="#BBB" />
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Filter and sort"
              title="Filter & Sort"
              onClick={() => setFilterOpen(true)}
              style={{
                position: "relative",
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                border: `1px solid ${NAVY}`,
                backgroundColor: hasActiveFilters ? NAVY : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <SlidersHorizontal
                size={20}
                color={hasActiveFilters ? "#fff" : NAVY}
              />
              {hasActiveFilters && (
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "#FFD75E",
                  }}
                />
              )}
            </button>
          </div>

          <p style={{ fontSize: "12px", color: "#999", margin: "0 0 8px" }}>
            {filteredAndSorted.length} student
            {filteredAndSorted.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` • ${FILTER_LABELS[statusFilter]}`}
          </p>

          {error && (
            <p role="alert" style={{ color: "#c0392b", fontSize: "13px" }}>
              {error}
            </p>
          )}

          {loading ? (
            <p
              style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}
            >
              Loading...
            </p>
          ) : filteredAndSorted.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                padding: "60px 0",
              }}
            >
              <Users size={48} color="#DDD" />
              <span style={{ color: "#BBB", fontSize: "14px" }}>
                No students found
              </span>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                border: "1px solid #eee",
                overflow: "hidden",
              }}
            >
              {filteredAndSorted.map((item, i) => (
                <div
                  key={item.student_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.enrollment_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedId(item.enrollment_id);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    padding: "14px 20px",
                    borderBottom:
                      i < filteredAndSorted.length - 1
                        ? "1px solid #EEE"
                        : "none",
                    cursor: "pointer",
                    backgroundColor: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: "#F0F0F0",
                      border: "1px solid #EEE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {item.student?.profilephotourl ? (
                      <img
                        src={item.student.profilephotourl}
                        alt={nameOf(item)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <User size={22} color="#666" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: NAVY,
                      }}
                    >
                      {nameOf(item) || "Unknown"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.curriculum?.curriculumName ?? "—"} •{" "}
                      {item.student?.email}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#999",
                        marginTop: "2px",
                      }}
                    >
                      Student No: {item.student?.id}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#CCC" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {filterOpen && (
        <FilterModal
          sortBy={sortBy}
          statusFilter={statusFilter}
          onClose={() => setFilterOpen(false)}
          onApply={(sort, status) => {
            setSortBy(sort);
            setStatusFilter(status);
            setFilterOpen(false);
          }}
        />
      )}
      {selectedId && (
        <RegistrantModal
          enrollmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={fetchData}
        />
      )}
    </div>
  );
}

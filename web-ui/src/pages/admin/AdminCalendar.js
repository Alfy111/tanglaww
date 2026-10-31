import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link2,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";

const NAVY = "#2F459B";
const DARK_NAVY = "#0D2A94";
const YELLOW = "#FFD75E";
const TODO_DOT = "#FFB800";
const FONT = "Poppins, sans-serif";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
const sameDay = (iso, year, month, day) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  );
};
const toUrl = (link) => (/^https?:\/\//i.test(link) ? link : `https://${link}`);

const card = {
  backgroundColor: "#fff",
  borderRadius: "16px",
  border: "1px solid #eee",
  padding: "20px",
  boxSizing: "border-box",
};
const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  backgroundColor: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  fontFamily: FONT,
};
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "#555",
  margin: "0 0 6px",
};
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: "8px",
  border: "1px solid #DCDFE3",
  fontSize: "14px",
  fontFamily: FONT,
  color: "#333",
  outline: "none",
};

function useEscape(handler) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler]);
}

function FormModal({ title, onClose, onSubmit, saving, error, children }) {
  useEscape(onClose);
  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={overlay}
    >
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "700",
              color: "#1A1A2E",
            }}
          >
            {title}
          </h3>
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
            <X size={22} color="#555" />
          </button>
        </div>
        {children}
        {error && (
          <p
            role="alert"
            style={{ color: "#E74C3C", fontSize: "13px", margin: "10px 0 0" }}
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "8px",
              border: 0,
              backgroundColor: NAVY,
              color: "#fff",
              fontSize: "14px",
              fontWeight: "700",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontFamily: FONT,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventDetails({ events, onClose, onDelete }) {
  useEscape(onClose);
  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={overlay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "85vh",
          overflowY: "auto",
          backgroundColor: "#fff",
          borderRadius: "20px",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        {events.map((ev, i) => (
          <div
            key={ev.event_id}
            style={{
              borderTop: i > 0 ? "1px solid #eee" : 0,
              paddingTop: i > 0 ? "16px" : 0,
              marginTop: i > 0 ? "16px" : 0,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}
            >
              <h3
                style={{
                  flex: 1,
                  margin: "0 0 8px",
                  fontSize: "19px",
                  fontWeight: "700",
                  color: "#1A1A2E",
                  wordBreak: "break-word",
                }}
              >
                {ev.title}
              </h3>
              {i === 0 && (
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
                  <X size={22} color="#555" />
                </button>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
                fontSize: "13px",
                color: "#666",
              }}
            >
              <Clock size={16} color={DARK_NAVY} /> {formatDate(ev.event_date)}{" "}
              · {formatTime(ev.event_date)}
            </div>
            {ev.description && (
              <div
                style={{
                  backgroundColor: "#F8F9FA",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "12px",
                  fontSize: "14px",
                  color: "#444",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                }}
              >
                {ev.description}
              </div>
            )}
            {ev.link && (
              <a
                href={toUrl(ev.link)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#EEF1FF",
                  borderRadius: "8px",
                  padding: "10px",
                  color: DARK_NAVY,
                  fontSize: "13px",
                  textDecoration: "none",
                  marginBottom: "12px",
                }}
              >
                <Link2 size={16} />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ev.link}
                </span>
                <ExternalLink size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={() => onDelete(ev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #E74C3C",
                backgroundColor: "#fff",
                color: "#E74C3C",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: FONT,
              }}
            >
              <Trash2 size={14} /> Delete event
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [tab, setTab] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [openEvents, setOpenEvents] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: eventData, error: eventError } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    if (eventError) setError(`Could not load events: ${eventError.message}`);
    setEvents(eventData ?? []);
    if (user) {
      setAdminId(user.id);
      const { data: todoData, error: todoError } = await supabase
        .from("admin_todo")
        .select("*")
        .eq("admin_id", user.id)
        .order("duedate", { ascending: true });
      if (todoError)
        setError(`Could not load your to dos: ${todoError.message}`);
      setTodos(todoData ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { year, month } = current;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const prevMonth = () =>
    setCurrent(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 },
    );
  const nextMonth = () =>
    setCurrent(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 },
    );

  const openForm = (kind) => {
    setForm({ title: "", description: "", link: "", date: "", time: "" });
    setFormError("");
    setModal(kind);
  };

  const combine = (date, time) =>
    date ? new Date(`${date}T${time || "00:00"}`).toISOString() : null;

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) {
      setFormError("Please fill in the title, date, and time.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from("calendar_events").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      link: form.link.trim() || null,
      event_date: combine(form.date, form.time),
      admin_id: adminId,
    });
    setSaving(false);
    if (saveError) {
      setFormError(saveError.message);
      return;
    }
    setModal(null);
    fetchData();
  };

  const saveTodo = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Please enter a title.");
      return;
    }
    if (form.time && !form.date) {
      setFormError("Please pick a due date for the time.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from("admin_todo").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      duedate: combine(form.date, form.time),
      admin_id: adminId,
    });
    setSaving(false);
    if (saveError) {
      setFormError(saveError.message);
      return;
    }
    setModal(null);
    fetchData();
  };

  const deleteEvent = async (ev) => {
    if (
      !window.confirm(`Delete "${ev.title}"? Students will no longer see it.`)
    )
      return;
    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("event_id", ev.event_id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setOpenEvents((list) => {
      const rest = (list ?? []).filter((x) => x.event_id !== ev.event_id);
      return rest.length ? rest : null;
    });
    fetchData();
  };

  const toggleTodo = async (todo) => {
    const next = !todo.iscompleted;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, iscompleted: next } : t)),
    );
    const { error: updateError } = await supabase
      .from("admin_todo")
      .update({ iscompleted: next })
      .eq("id", todo.id);
    if (updateError) {
      setError(updateError.message);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, iscompleted: !next } : t)),
      );
    }
  };

  const deleteTodo = async (todo) => {
    if (!window.confirm(`Delete "${todo.title}"?`)) return;
    const { error: deleteError } = await supabase
      .from("admin_todo")
      .delete()
      .eq("id", todo.id);
    if (deleteError) setError(deleteError.message);
    else setTodos((prev) => prev.filter((t) => t.id !== todo.id));
  };

  const field = (key, label, props = {}) => (
    <div style={{ marginBottom: "12px", flex: props.flex }}>
      <label htmlFor={`cal-${key}`} style={labelStyle}>
        {label}
      </label>
      {props.textarea ? (
        <textarea
          id={`cal-${key}`}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={props.placeholder}
          style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
        />
      ) : (
        <input
          id={`cal-${key}`}
          type={props.type ?? "text"}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={props.placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );

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
        <AdminTopbar title="Calendar" />
        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1100px",
            boxSizing: "border-box",
          }}
        >
          {error && (
            <p
              role="alert"
              style={{ color: "#c0392b", fontSize: "13px", marginTop: 0 }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              alignItems: "flex-start",
            }}
          >
            <section style={{ ...card, flex: "1 1 380px", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "24px",
                  marginBottom: "16px",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={prevMonth}
                  style={{
                    border: 0,
                    background: "none",
                    cursor: "pointer",
                    display: "flex",
                    color: DARK_NAVY,
                  }}
                >
                  <ChevronLeft size={22} />
                </button>
                <span
                  style={{
                    minWidth: "160px",
                    textAlign: "center",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: DARK_NAVY,
                  }}
                >
                  {MONTHS[month]} {year}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={nextMonth}
                  style={{
                    border: 0,
                    background: "none",
                    cursor: "pointer",
                    display: "flex",
                    color: DARK_NAVY,
                  }}
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  rowGap: "2px",
                }}
              >
                {DAYS.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#BDC3C7",
                      paddingBottom: "8px",
                    }}
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayEvents = events.filter((e) =>
                    sameDay(e.event_date, year, month, day),
                  );
                  const dayTodo = todos.some(
                    (t) => t.duedate && sameDay(t.duedate, year, month, day),
                  );
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-label={`${MONTHS[month]} ${day}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                      onClick={() =>
                        dayEvents.length && setOpenEvents(dayEvents)
                      }
                      style={{
                        height: "50px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        border: 0,
                        background: "none",
                        padding: 0,
                        cursor: dayEvents.length ? "pointer" : "default",
                        fontFamily: FONT,
                      }}
                    >
                      <span
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isToday ? YELLOW : "transparent",
                          color: NAVY,
                          fontSize: "14px",
                          fontWeight: isToday ? "700" : "400",
                        }}
                      >
                        {day}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          gap: "2px",
                          height: "5px",
                          marginTop: "2px",
                        }}
                      >
                        {dayEvents.length > 0 && (
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              backgroundColor: DARK_NAVY,
                            }}
                          />
                        )}
                        {dayTodo && (
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              backgroundColor: TODO_DOT,
                            }}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                  marginTop: "10px",
                }}
              >
                {[
                  [DARK_NAVY, "Event"],
                  [TODO_DOT, "To Do"],
                ].map(([color, label]) => (
                  <span
                    key={label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: color,
                      }}
                    />{" "}
                    {label}
                  </span>
                ))}
              </div>
            </section>

            <section style={{ ...card, flex: "1 1 380px", minWidth: 0 }}>
              <div
                role="tablist"
                style={{
                  display: "flex",
                  backgroundColor: DARK_NAVY,
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                {[
                  ["upcoming", "Upcoming Events"],
                  ["todo", "To Do List"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      border: 0,
                      borderBottom: `4px solid ${tab === key ? "#fff" : "transparent"}`,
                      background: "none",
                      color: tab === key ? "#fff" : "rgba(255,255,255,0.6)",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openForm(tab === "upcoming" ? "event" : "todo")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "11px",
                  marginBottom: "14px",
                  borderRadius: "10px",
                  border: 0,
                  backgroundColor: tab === "upcoming" ? NAVY : TODO_DOT,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                <Plus size={18} />{" "}
                {tab === "upcoming" ? "Add event" : "Add to do"}
              </button>

              {loading ? (
                <p style={{ color: "#999", textAlign: "center" }}>Loading...</p>
              ) : tab === "upcoming" ? (
                events.length === 0 ? (
                  <p
                    style={{
                      color: "#999",
                      fontStyle: "italic",
                      textAlign: "center",
                    }}
                  >
                    No events yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {events.map((ev) => (
                      <button
                        key={ev.event_id}
                        type="button"
                        onClick={() => setOpenEvents([ev])}
                        style={{
                          display: "flex",
                          gap: "12px",
                          width: "100%",
                          textAlign: "left",
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid #DCDFE3",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          fontFamily: FONT,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "#444",
                              wordBreak: "break-word",
                            }}
                          >
                            {ev.title}
                          </span>
                          {ev.description && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "12px",
                                color: "#777",
                                marginTop: "3px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ev.description}
                            </span>
                          )}
                        </span>
                        <span style={{ textAlign: "right", flexShrink: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "#7F8C8D",
                            }}
                          >
                            {formatDate(ev.event_date)}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#7F8C8D",
                            }}
                          >
                            {formatTime(ev.event_date)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : todos.length === 0 ? (
                <p
                  style={{
                    color: "#999",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  No to dos yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "14px",
                        borderRadius: "10px",
                        border: "1px solid #DCDFE3",
                        backgroundColor: todo.iscompleted ? "#f9f9f9" : "#fff",
                        opacity: todo.iscompleted ? 0.6 : 1,
                      }}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!todo.iscompleted}
                        aria-label={`Mark "${todo.title}" as ${todo.iscompleted ? "not done" : "done"}`}
                        onClick={() => toggleTodo(todo)}
                        style={{
                          border: 0,
                          background: "none",
                          cursor: "pointer",
                          display: "flex",
                          padding: 0,
                          color: DARK_NAVY,
                        }}
                      >
                        {todo.iscompleted ? (
                          <CheckSquare size={22} />
                        ) : (
                          <Square size={22} />
                        )}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: todo.iscompleted ? "#999" : "#444",
                            textDecoration: todo.iscompleted
                              ? "line-through"
                              : "none",
                            wordBreak: "break-word",
                          }}
                        >
                          {todo.title}
                        </div>
                        {todo.description && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#777",
                              marginTop: "3px",
                            }}
                          >
                            {todo.description}
                          </div>
                        )}
                        {todo.duedate && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#7F8C8D",
                              marginTop: "3px",
                            }}
                          >
                            Due: {formatDate(todo.duedate)}{" "}
                            {formatTime(todo.duedate)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete "${todo.title}"`}
                        onClick={() => deleteTodo(todo)}
                        style={{
                          border: 0,
                          background: "none",
                          cursor: "pointer",
                          display: "flex",
                          padding: 0,
                        }}
                      >
                        <Trash2 size={18} color="#e74c3c" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {openEvents && (
        <EventDetails
          events={openEvents}
          onClose={() => setOpenEvents(null)}
          onDelete={deleteEvent}
        />
      )}

      {modal === "event" && (
        <FormModal
          title="Add Event"
          onClose={() => setModal(null)}
          onSubmit={saveEvent}
          saving={saving}
          error={formError}
        >
          {field("title", "Title *", {
            placeholder: "e.g. LEPT Express - Online Session",
          })}
          {field("description", "Description", {
            placeholder: "Optional",
            textarea: true,
          })}
          {field("link", "Link", { placeholder: "https://zoom.us/j/..." })}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {field("date", "Date *", { type: "date", flex: "1 1 150px" })}
            {field("time", "Time *", { type: "time", flex: "1 1 120px" })}
          </div>
        </FormModal>
      )}

      {modal === "todo" && (
        <FormModal
          title="Add To Do"
          onClose={() => setModal(null)}
          onSubmit={saveTodo}
          saving={saving}
          error={formError}
        >
          {field("title", "Title *", { placeholder: "Title of item" })}
          {field("description", "Short details", {
            placeholder: "Optional",
            textarea: true,
          })}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {field("date", "Due date", { type: "date", flex: "1 1 150px" })}
            {field("time", "Time", { type: "time", flex: "1 1 120px" })}
          </div>
        </FormModal>
      )}
    </div>
  );
}

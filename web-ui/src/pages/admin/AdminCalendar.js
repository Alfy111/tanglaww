import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import { supabase } from "../../lib/supabase";


const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
const formatDate = (str) => new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatTime = (str) => new Date(str).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export default function AdminCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", event_date: "", link: "" });
  const [newTodo, setNewTodo] = useState({ title: "", description: "", duedate: "" });
  const [adminId, setAdminId] = useState(null);

  const { year, month } = current;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const hasEvent = (d) => events.some((e) => { const dt = new Date(e.event_date); return dt.getDate() === d && dt.getMonth() === month && dt.getFullYear() === year; });
  const hasTodo = (d) => todos.some((t) => { if (!t.duedate) return false; const dt = new Date(t.duedate); return dt.getDate() === d && dt.getMonth() === month && dt.getFullYear() === year; });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: eventData, error: eventError } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    if (eventError) console.error("Events error:", eventError.message);
    setEvents(eventData ?? []);

    if (user) {
      setAdminId(user.id);
      const { data: todoData, error: todoError } = await supabase
        .from("admin_todo")
        .select("*")
        .eq("admin_id", user.id)
        .order("duedate", { ascending: true });
      if (todoError) console.error("Todo error:", todoError.message);
      setTodos(todoData ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: adminData } = await supabase
      .from("admin")
      .select("admin_id")
      .eq("admin_id", user.id)
      .maybeSingle();
    if (!adminData) { alert("Admin record not found."); return; }
    const { error } = await supabase.from("calendar_events").insert({
      title: newEvent.title,
      description: newEvent.description || null,
      event_date: new Date(newEvent.event_date).toISOString(),
      link: newEvent.link || null,
      admin_id: adminData.admin_id,
    });
    if (error) { alert("Error: " + error.message); return; }
    setNewEvent({ title: "", description: "", event_date: "", link: "" });
    setShowAddEvent(false);
    fetchData();
  };

  const deleteEvent = async (id) => {
    await supabase.from("calendar_events").delete().eq("event_id", id);
    fetchData();
  };

  const addTodo = async () => {
    if (!newTodo.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Not logged in."); return; }
    const { error } = await supabase.from("admin_todo").insert({
      title: newTodo.title,
      description: newTodo.description || null,
      duedate: newTodo.duedate ? new Date(newTodo.duedate).toISOString() : null,
      admin_id: user.id,
    });
    if (error) { alert("Error: " + error.message); return; }
    setNewTodo({ title: "", description: "", duedate: "" });
    setShowAddTodo(false);
    fetchData();
  };

 const toggleTodo = async (todo) => {
    await supabase.from("admin_todo").update({
      iscompleted: !todo.iscompleted,
    }).eq("id", todo.id);
    fetchData();
  };

  const deleteTodo = async (id) => {
    await supabase.from("admin_todo").delete().eq("id", id);
    fetchData();
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "8px",
    border: "1px solid #ddd", fontSize: "14px",
    fontFamily: "Poppins, sans-serif", boxSizing: "border-box", outline: "none",
  };

  const labelStyle = {
    fontSize: "13px", fontWeight: "600", color: "#222",
    display: "block", marginBottom: "4px",
  };

  return (
    <div className="dashboard-layout admin-layout">
      <AdminSidebar />
      <div className="dashboard-main">
        <AdminTopbar title="Calendar" />

        <div style={{ padding: "32px 40px" }}>

          {/* Month Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px", marginBottom: "20px" }}>
            <button
              onClick={() => setCurrent(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
              style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#1a1a6e", fontWeight: "700" }}
            >&#8249;</button>
            <span style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a6e" }}>{MONTH_NAMES[month]} {year}</span>
            <button
              onClick={() => setCurrent(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
              style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#1a1a6e", fontWeight: "700" }}
            >&#8250;</button>
          </div>

          {/* Calendar Grid */}
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #eee", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {DAYS.map((d) => (
                <div key={d} style={{ textAlign: "center", padding: "12px 0", fontSize: "12px", fontWeight: "600", color: "#aaa" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {cells.map((d, i) => (
                <div key={i} style={{ textAlign: "center", padding: "8px 0", borderTop: "1px solid #f5f5f5" }}>
                  {d && (
                    <>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        backgroundColor: isToday(d) ? "#f5a623" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto",
                        color: isToday(d) ? "#fff" : "#1a1a6e",
                        fontWeight: isToday(d) ? "700" : "400",
                        fontSize: "14px",
                      }}>{d}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "3px", marginTop: "3px" }}>
                        {hasEvent(d) && <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#1a1a6e" }} />}
                        {hasTodo(d) && <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#f5a623" }} />}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", justifyContent: "center" }}>
            {[["#1a1a6e", "Event"], ["#f5a623", "To do"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#555" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} /> {label}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", backgroundColor: "#f5a623",
            borderRadius: "12px", marginBottom: "16px", padding: "4px", gap: "4px",
          }}>
            {["upcoming", "todo"].map((tab) => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, textAlign: "center", padding: "12px",
                fontSize: "14px", fontWeight: "600", cursor: "pointer",
                color: activeTab === tab ? "#f5a623" : "#1a1a6e",
                backgroundColor: activeTab === tab ? "#fff" : "transparent",
                borderRadius: "10px",
                transition: "all 0.15s",
              }}>
                {tab === "upcoming" ? "Upcoming Events" : "To Do List"}
              </div>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <p style={{ color: "#aaa", textAlign: "center" }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeTab === "upcoming" ? (
                events.length === 0
                  ? <p style={{ color: "#aaa", fontStyle: "italic", textAlign: "center" }}>No upcoming events.</p>
                  : events.map((e) => (
                    <div key={e.event_id} style={{
                      backgroundColor: "#fff", borderRadius: "12px",
                      padding: "16px 20px", border: "1px solid #eee",
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a2e" }}>{e.title}</div>
                        {e.description && <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{e.description}</div>}
                        {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#1a1a6e" }}>{e.link}</a>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a2e" }}>{formatDate(e.event_date)}</div>
                          <div style={{ fontSize: "12px", color: "#888" }}>{formatTime(e.event_date)}</div>
                        </div>
                        <button onClick={() => deleteEvent(e.event_id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <Trash2 size={16} color="#e53935" />
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                todos.length === 0
                  ? <p style={{ color: "#aaa", fontStyle: "italic", textAlign: "center" }}>No tasks yet.</p>
                  : todos.map((t) => (
                    <div key={t.id} style={{
                      backgroundColor: "#fff", borderRadius: "12px",
                      padding: "16px 20px", border: "1px solid #eee",
                      display: "flex", alignItems: "center", gap: "12px",
                    }}>
                     <input type="checkbox" checked={t.iscompleted ?? false} onChange={() => toggleTodo(t)}
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#f5a623" }} />
                      <div style={{ flex: 1 }}>
                 <div style={{ fontSize: "14px", fontWeight: "600", color: t.iscompleted ? "#aaa" : "#1a1a2e", textDecoration: t.iscompleted ? "line-through" : "none" }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: "12px", color: "#888" }}>{t.description}</div>}
                        {t.duedate && <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>Due: {formatDate(t.duedate)}</div>}
                      </div>
                      <button onClick={() => deleteTodo(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <Trash2 size={16} color="#e53935" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: "32px", right: "40px", zIndex: 200 }}>
        {activeTab === "upcoming" && (
          <button onClick={() => setShowAddEvent(true)} style={{
            width: "52px", height: "52px", borderRadius: "50%",
            backgroundColor: "#f5a623", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}>
            <Plus size={24} color="#fff" />
          </button>
        )}
        {activeTab === "todo" && (
          <button onClick={() => setShowAddTodo(true)} style={{
            width: "52px", height: "52px", borderRadius: "50%",
            backgroundColor: "#f5a623", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}>
            <Plus size={24} color="#fff" />
          </button>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px", width: "440px", fontFamily: "Poppins, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e", margin: 0 }}>Add Event</h3>
              <button onClick={() => setShowAddEvent(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#aaa" /></button>
            </div>
            {[
              { label: "Title*", key: "title", placeholder: "Event title" },
              { label: "Description", key: "description", placeholder: "Optional" },
              { label: "Link", key: "link", placeholder: "https://..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>{label}</label>
                <input value={newEvent[key]} onChange={(e) => setNewEvent({ ...newEvent, [key]: e.target.value })} style={inputStyle} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Date & Time*</label>
              <input type="datetime-local" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowAddEvent(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Cancel</button>
              <button onClick={addEvent} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#f5a623", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Todo Modal */}
      {showAddTodo && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px", width: "440px", fontFamily: "Poppins, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e", margin: 0 }}>Add To Do</h3>
              <button onClick={() => setShowAddTodo(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#aaa" /></button>
            </div>
            {[
              { label: "Task*", key: "title", placeholder: "Task title" },
              { label: "Description", key: "description", placeholder: "Optional" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>{label}</label>
                <input value={newTodo[key]} onChange={(e) => setNewTodo({ ...newTodo, [key]: e.target.value })} style={inputStyle} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Due Date & Time</label>
              <input type="datetime-local" value={newTodo.duedate} onChange={(e) => setNewTodo({ ...newTodo, duedate: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowAddTodo(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Cancel</button>
              <button onClick={addTodo} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#f5a623", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { Clock, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import UserTopbar from "../components/UserTopbar";
import { supabase } from "../lib/supabase";
import "./Dashboard.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }
const formatDate = (str) => new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatTime = (str) => new Date(str).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const leaderboard = [
  { height: 60, color: "#f5a623" },
  { height: 80, color: "#f5a623" },
  { height: 110, color: "#4caf50" },
];

export default function Calendar() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({ title: "", description: "", dueDate: "" });

  const { year, month } = current;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const hasEvent = (d) => events.some((e) => { const dt = new Date(e.event_date); return dt.getDate() === d && dt.getMonth() === month && dt.getFullYear() === year; });
  const hasTodo = (d) => todos.some((t) => { if (!t.dueDate) return false; const dt = new Date(t.dueDate); return dt.getDate() === d && dt.getMonth() === month && dt.getFullYear() === year; });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: eventData } = await supabase.from("calendar_events").select("*").order("event_date", { ascending: true });
    setEvents(eventData ?? []);
    if (user) {
      const { data: studentData } = await supabase.from("student").select("id").eq("auth_id", user.id).maybeSingle();
      if (studentData) {
        setStudentId(studentData.id);
        const { data: todoData } = await supabase.from("to_do").select("*").eq("student_id", studentData.id).order("dueDate", { ascending: true });
        setTodos(todoData ?? []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTodo = async () => {
    if (!newTodo.title || !studentId) return;
    await supabase.from("to_do").insert({ title: newTodo.title, description: newTodo.description, dueDate: newTodo.dueDate || null, isCompleted: false, student_id: studentId });
    setNewTodo({ title: "", description: "", dueDate: "" });
    setShowAddTodo(false);
    fetchData();
  };

  const toggleTodo = async (todo) => {
    await supabase.from("to_do").update({ isCompleted: !todo.isCompleted, completedAt: !todo.isCompleted ? new Date().toISOString() : null }).eq("todo_id", todo.todo_id);
    fetchData();
  };

  const deleteTodo = async (id) => {
    await supabase.from("to_do").delete().eq("todo_id", id);
    fetchData();
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <UserTopbar title="Calendar" />

        <div className="dashboard-content">

          {/* LEFT */}
          <div className="dashboard-left">

            {/* Calendar Card */}
            <div className="card">
              <div className="card-title">Calendar</div>

              <div style={{ backgroundColor: "#1a1a6e", color: "#fff", borderRadius: "8px", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "600" }}>
                {MONTH_NAMES[month]} {year}
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: "#f9f9f9" }}>
                  {DAYS.map((d) => <div key={d} style={{ textAlign: "center", padding: "10px 0", fontSize: "12px", fontWeight: "600", color: "#888" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {cells.map((d, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "8px 0", fontSize: "13px", borderTop: "1px solid #f0f0f0" }}>
                      {d && (
                        <>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isToday(d) ? "#f5a623" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: isToday(d) ? "#fff" : "#1a1a6e", fontWeight: isToday(d) ? "700" : "400" }}>{d}</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: "2px", marginTop: "2px" }}>
                            {hasEvent(d) && <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#1a1a6e" }} />}
                            {hasTodo(d) && <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#f5a623" }} />}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                <button onClick={() => setCurrent(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#1a1a6e", fontWeight: "700" }}>‹</button>
                <button onClick={() => setCurrent(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#1a1a6e", fontWeight: "700" }}>›</button>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                {[["#1a1a6e", "Event"], ["#f5a623", "To do"]].map(([color, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#555" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color }} /> {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Events / Todo Card */}
            <div className="card">
              <div className="card-title">Upcoming Events</div>

              <div style={{ display: "flex", backgroundColor: "#1a1a6e", borderRadius: "8px", marginBottom: "16px", overflow: "hidden" }}>
                {["upcoming", "todo"].map((tab) => (
                  <div key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, textAlign: "center", padding: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: activeTab === tab ? "#1a1a6e" : "#fff", backgroundColor: activeTab === tab ? "#fff" : "transparent", borderRadius: activeTab === tab ? "6px" : "0", margin: activeTab === tab ? "4px" : "0", transition: "all 0.15s" }}>
                    {tab === "upcoming" ? "Upcoming Events" : "To Do List"}
                  </div>
                ))}
              </div>

              {loading ? <p style={{ color: "#aaa", fontSize: "13px" }}>Loading...</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeTab === "upcoming" ? (
                    events.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px", fontStyle: "italic" }}>No upcoming events.</p> :
                    events.map((e) => (
                      <div key={e.event_id} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a2e" }}>{e.title}</div>
                          {e.description && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{e.description}</div>}
                          {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#1a1a6e" }}>{e.link}</a>}
                        </div>
                        <div style={{ fontSize: "11px", color: "#888", textAlign: "right", whiteSpace: "nowrap", marginLeft: "12px" }}>
                          {formatDate(e.event_date)}<br />{formatTime(e.event_date)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {todos.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px", fontStyle: "italic" }}>No tasks yet.</p> :
                        todos.map((t) => (
                          <div key={t.todo_id} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <input type="checkbox" checked={t.isCompleted} onChange={() => toggleTodo(t)} style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#1a1a6e" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "13px", fontWeight: "600", color: t.isCompleted ? "#aaa" : "#1a1a2e", textDecoration: t.isCompleted ? "line-through" : "none" }}>{t.title}</div>
                              {t.description && <div style={{ fontSize: "11px", color: "#888" }}>{t.description}</div>}
                              {t.dueDate && <div style={{ fontSize: "11px", color: "#aaa" }}>Due: {formatDate(t.dueDate)}</div>}
                            </div>
                            <Trash2 size={13} color="#e53935" style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => deleteTodo(t.todo_id)} />
                          </div>
                        ))
                      }
                      <button onClick={() => setShowAddTodo(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "2px dashed #1a1a6e", borderRadius: "8px", backgroundColor: "transparent", color: "#1a1a6e", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                        <Plus size={14} /> Add Task
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT */}
          <div className="dashboard-right">
            <div className="card">
              <div className="profile-banner" />
              <div className="profile-avatar" style={{ fontSize: "28px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="profile-name">JOHN DOE</div>
              <div className="profile-degree">Bachelor of Elementary Education</div>
              <div className="profile-email">johndoejacat10@gmail.com</div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <TrendingUp size={16} color="#1a1a6e" />
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e" }}>Leaderboards</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "12px", height: "130px", marginTop: "8px" }}>
                {leaderboard.map((b, i) => (
                  <div key={i} style={{ width: "40px", height: `${b.height}px`, backgroundColor: b.color, borderRadius: "6px 6px 0 0" }} />
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Clock size={16} color="#1a1a6e" />
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e" }}>Deadlines</span>
              </div>
              {events.slice(0, 3).map((e, i) => (
                <div key={i} className="deadline-item">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="deadline-title">{e.title}</div>
                    <div style={{ fontSize: "11px", color: "#aaa", whiteSpace: "nowrap", marginLeft: "8px" }}>
                      {formatDate(e.event_date)}<br />{formatTime(e.event_date)}
                    </div>
                  </div>
                  {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="deadline-link">{e.link}</a>}
                </div>
              ))}
              {events.length === 0 && <p style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>No deadlines.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Add Todo Modal */}
      {showAddTodo && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px", width: "400px", fontFamily: "Poppins, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e", margin: 0 }}>Add Task</h3>
              <button onClick={() => setShowAddTodo(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#aaa" /></button>
            </div>
            {[["Task*", "title", "text", "Task title"], ["Description", "description", "text", "Optional"], ["Due Date", "dueDate", "datetime-local", ""]].map(([label, key, type, placeholder]) => (
              <div key={key} style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#222", display: "block", marginBottom: "4px" }}>{label}</label>
                <input type={type} value={newTodo[key]} onChange={(e) => setNewTodo({ ...newTodo, [key]: e.target.value })} placeholder={placeholder} style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", fontFamily: "Poppins, sans-serif", boxSizing: "border-box", outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => setShowAddTodo(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "#fff", fontSize: "14px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Cancel</button>
              <button onClick={addTodo} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#1a1a6e", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { Lock, RefreshCw, UserPlus, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import {
    ROLE_LABELS,
    cancelAdminInvite,
    getAdminTeam,
    sendAdminInvite,
} from "../../lib/adminInvites";

const NAVY = "#2F459B";
const FONT = "Poppins, sans-serif";

const ROLE_COLORS = {
  owner: { bg: "#FFF4E0", text: "#B26A00" },
  super_admin: { bg: "#EEF1FF", text: NAVY },
  admin: { bg: "#F2F4F7", text: "#555" },
};

const card = {
  backgroundColor: "#fff",
  borderRadius: "12px",
  padding: "24px",
  border: "1px solid #eee",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
};
const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: "700",
  color: NAVY,
  marginBottom: "8px",
};
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: "#F9FAFB",
  border: "1px solid #DCDFE3",
  borderRadius: "10px",
  padding: "13px 15px",
  fontSize: "15px",
  color: "#333",
  fontFamily: FONT,
  outline: "none",
  marginBottom: "18px",
};
const sectionTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: NAVY,
  margin: "0 0 12px",
};
const iconButton = {
  width: "32px",
  height: "32px",
  border: 0,
  background: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
};

function RoleBadge({ role }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.admin;
  return (
    <span
      style={{
        borderRadius: "10px",
        padding: "3px 10px",
        fontSize: "11px",
        fontWeight: "700",
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Row({ title, sub, note, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 4px",
        borderBottom: "1px solid #EFEFEF",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#1A1A2E",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#888",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </div>
        {note && (
          <div style={{ fontSize: "11px", color: "#AAA", marginTop: "2px" }}>
            {note}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AdminManageAdmins() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [sending, setSending] = useState(false);
  const [busyInvite, setBusyInvite] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setTeam(await getAdminTeam());
      setLoadError("");
    } catch (err) {
      setLoadError(err.message ?? "Could not load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = async (event) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !cleanEmail) {
      setMessage({
        ok: false,
        text: "Please fill in the first name, last name and email.",
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage({ ok: false, text: "Please enter a valid email address." });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      await sendAdminInvite({
        email: cleanEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      setMessage({
        ok: true,
        text: `Invite sent! An activation code was emailed to ${cleanEmail}. It expires in 3 days.`,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("admin");
      load();
    } catch (err) {
      setMessage({
        ok: false,
        text: err.message ?? "Could not send the invite.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (invite) => {
    setBusyInvite(invite.invite_id);
    setMessage(null);
    try {
      await sendAdminInvite({
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        role: invite.role === "super_admin" ? "super_admin" : "admin",
      });
      setMessage({
        ok: true,
        text: `A new code was emailed to ${invite.email}.`,
      });
      load();
    } catch (err) {
      setMessage({ ok: false, text: err.message ?? "Could not resend." });
    } finally {
      setBusyInvite(null);
    }
  };

  const handleCancel = async (invite) => {
    if (
      !window.confirm(
        `Cancel the invite for ${invite.email}? The code will stop working.`,
      )
    )
      return;
    setBusyInvite(invite.invite_id);
    setMessage(null);
    try {
      await cancelAdminInvite(invite.invite_id);
      load();
    } catch (err) {
      setMessage({ ok: false, text: err.message ?? "Could not cancel." });
    } finally {
      setBusyInvite(null);
    }
  };

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
        <AdminTopbar title="Manage Admins" />
        <div
          style={{
            padding: "32px 40px",
            maxWidth: "1100px",
            boxSizing: "border-box",
          }}
        >
          {loading ? (
            <p style={{ color: "#aaa" }}>Loading...</p>
          ) : loadError ? (
            <div
              style={{
                ...card,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <Lock size={40} color="#CCC" />
              <p style={{ fontSize: "14px", color: "#888", margin: 0 }}>
                {loadError}
              </p>
            </div>
          ) : (
            team && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  alignItems: "flex-start",
                }}
              >
                <form
                  onSubmit={handleSend}
                  style={{ ...card, flex: "1 1 360px", minWidth: 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      backgroundColor: "#F8F9FA",
                      border: "1px solid #EEE",
                      borderRadius: "15px",
                      padding: "20px",
                      marginBottom: "24px",
                    }}
                  >
                    <UserPlus size={40} color="#FFD75E" />
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: NAVY,
                        marginTop: "10px",
                      }}
                    >
                      Add an Admin
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        marginTop: "5px",
                      }}
                    >
                      New admins are sent an activation code through email.
                    </div>
                  </div>

                  <label htmlFor="invite-first" style={labelStyle}>
                    First Name:
                  </label>
                  <input
                    id="invite-first"
                    style={inputStyle}
                    placeholder="e.g., Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <label htmlFor="invite-last" style={labelStyle}>
                    Last Name:
                  </label>
                  <input
                    id="invite-last"
                    style={inputStyle}
                    placeholder="e.g., Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  <label htmlFor="invite-email" style={labelStyle}>
                    Email:
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    autoComplete="off"
                    style={inputStyle}
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  {team.myRole === "owner" && (
                    <>
                      <span style={labelStyle}>Role:</span>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginBottom: "18px",
                        }}
                      >
                        {["admin", "super_admin"].map((r) => {
                          const active = role === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setRole(r)}
                              style={{
                                flex: 1,
                                padding: "12px",
                                borderRadius: "10px",
                                cursor: "pointer",
                                fontFamily: FONT,
                                fontSize: "14px",
                                fontWeight: "600",
                                border: `1px solid ${active ? NAVY : "#DCDFE3"}`,
                                backgroundColor: active ? "#EEF1FF" : "#F9FAFB",
                                color: active ? NAVY : "#666",
                              }}
                            >
                              {ROLE_LABELS[r]}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {message && (
                    <div
                      role={message.ok ? "status" : "alert"}
                      style={{
                        fontSize: "13px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        marginBottom: "14px",
                        color: message.ok ? "#27ae60" : "#E74C3C",
                        backgroundColor: message.ok ? "#f0fff4" : "#fff5f5",
                        border: `1px solid ${message.ok ? "#27ae60" : "#E74C3C"}`,
                      }}
                    >
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "12px",
                      border: 0,
                      backgroundColor: NAVY,
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "700",
                      cursor: sending ? "wait" : "pointer",
                      fontFamily: FONT,
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    {sending ? "Sending..." : "Send Invite"}
                  </button>
                </form>

                <div
                  style={{
                    flex: "1 1 360px",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                  }}
                >
                  {team.invites.length > 0 && (
                    <section style={card}>
                      <h2 style={sectionTitle}>
                        Pending Invites ({team.invites.length})
                      </h2>
                      {team.invites.map((invite) => (
                        <Row
                          key={invite.invite_id}
                          title={invite.name}
                          sub={invite.email}
                          note={`Expires ${new Date(invite.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        >
                          <RoleBadge role={invite.role} />
                          {busyInvite === invite.invite_id ? (
                            <span
                              style={{
                                width: "64px",
                                fontSize: "12px",
                                color: NAVY,
                                textAlign: "center",
                              }}
                            >
                              ...
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                title="Resend invite"
                                aria-label={`Resend invite to ${invite.email}`}
                                onClick={() => handleResend(invite)}
                                style={iconButton}
                              >
                                <RefreshCw size={18} color={NAVY} />
                              </button>
                              <button
                                type="button"
                                title="Cancel invite"
                                aria-label={`Cancel invite for ${invite.email}`}
                                onClick={() => handleCancel(invite)}
                                style={iconButton}
                              >
                                <XCircle size={18} color="#E53935" />
                              </button>
                            </>
                          )}
                        </Row>
                      ))}
                    </section>
                  )}

                  <section style={card}>
                    <h2 style={sectionTitle}>Admins ({team.admins.length})</h2>
                    {team.admins.map((admin) => (
                      <Row
                        key={admin.admin_id}
                        title={admin.name}
                        sub={admin.email}
                      >
                        <RoleBadge role={admin.role} />
                      </Row>
                    ))}
                  </section>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

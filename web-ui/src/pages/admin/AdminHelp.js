import { ArrowDown, ArrowUp, PlusCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AdminContentFrame,
  FONT,
  NAVY,
  Note,
  Status,
  TabBar,
  inputStyle,
  labelStyle,
} from "../../components/admin/SiteContentEditor";
import { HelpView, PageCard } from "../../components/SiteContentViews";
import {
  CONTACT_KEYS,
  getFaqs,
  getSiteContent,
  saveFaqs,
  saveSiteContent,
} from "../../lib/siteContent";

const CONTACT_FIELDS = [
  ["contact_email", "Support Email", "email"],
  ["contact_phone", "Phone Number", "tel"],
  ["contact_facebook_name", "Facebook Page Name", "text"],
  ["contact_facebook_link", "Facebook Page Link", "url"],
  ["contact_office", "Office Address (optional)", "text"],
];

const iconButton = (color) => ({
  border: 0,
  background: "none",
  padding: "4px",
  cursor: "pointer",
  color,
  display: "flex",
});

export default function AdminHelp() {
  const [faqs, setFaqs] = useState(null);
  const [contact, setContact] = useState({});
  const [draftFaqs, setDraftFaqs] = useState([]);
  const [draftContact, setDraftContact] = useState({});
  const [tab, setTab] = useState("faq");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, info] = await Promise.all([
        getFaqs(),
        getSiteContent(CONTACT_KEYS),
      ]);
      setFaqs(list);
      setContact(info);
    } catch (e) {
      setError(e.message ?? "Could not load this page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    setDraftFaqs(faqs.map((f) => ({ ...f, key: String(f.faq_id) })));
    setDraftContact(
      Object.fromEntries(CONTACT_KEYS.map((k) => [k, contact[k] ?? ""])),
    );
    setNotice("");
    setError("");
    setEditing(true);
  };

  const updateFaq = (key, field, value) =>
    setDraftFaqs((list) =>
      list.map((f) => (f.key === key ? { ...f, [field]: value } : f)),
    );
  const moveFaq = (index, dir) =>
    setDraftFaqs((list) => {
      const to = index + dir;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const save = async () => {
    if (draftFaqs.some((f) => !!f.question.trim() !== !!f.answer.trim())) {
      setTab("faq");
      setError("Every FAQ needs both a question and an answer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveFaqs(
        draftFaqs,
        faqs.map((f) => f.faq_id),
      );
      await saveSiteContent(draftContact);
      await load();
      setEditing(false);
      setNotice("Help & Support has been updated.");
    } catch (e) {
      setError(e.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminContentFrame
      title="Help & Support"
      editing={editing}
      saving={saving}
      onEdit={startEdit}
      onCancel={() => setEditing(false)}
      onSave={save}
    >
      <PageCard>
        <Status error={error} notice={notice} />
        {!faqs ? (
          !error && <p style={{ color: "#999", margin: 0 }}>Loading...</p>
        ) : !editing ? (
          <HelpView faqs={faqs} contact={contact} />
        ) : (
          <>
            <TabBar
              tabs={[
                ["faq", "FAQs"],
                ["contact", "Contact Us"],
              ]}
              active={tab}
              onChange={setTab}
            />
            {tab === "faq" ? (
              <>
                {draftFaqs.length === 0 && (
                  <p
                    style={{
                      color: "#999",
                      fontStyle: "italic",
                      fontSize: "14px",
                    }}
                  >
                    No FAQs yet. Click “Add FAQ” to start.
                  </p>
                )}
                {draftFaqs.map((f, i) => (
                  <div
                    key={f.key}
                    style={{
                      backgroundColor: "#F9F9F9",
                      border: "1px solid #EEE",
                      borderRadius: "12px",
                      padding: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong style={{ fontSize: "13px", color: "#333" }}>
                        FAQ {i + 1}
                      </strong>
                      <span style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={i === 0}
                          onClick={() => moveFaq(i, -1)}
                          style={iconButton(i === 0 ? "#CCC" : NAVY)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={i === draftFaqs.length - 1}
                          onClick={() => moveFaq(i, 1)}
                          style={iconButton(
                            i === draftFaqs.length - 1 ? "#CCC" : NAVY,
                          )}
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove FAQ"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove "${f.question || "this question"}"?`,
                              )
                            )
                              setDraftFaqs((list) =>
                                list.filter((x) => x.key !== f.key),
                              );
                          }}
                          style={iconButton("#E74C3C")}
                        >
                          <Trash2 size={17} />
                        </button>
                      </span>
                    </div>
                    <label style={labelStyle}>Question</label>
                    <input
                      value={f.question}
                      placeholder="Type the question"
                      onChange={(e) =>
                        updateFaq(f.key, "question", e.target.value)
                      }
                      style={inputStyle}
                    />
                    <label style={labelStyle}>Answer</label>
                    <textarea
                      value={f.answer}
                      placeholder="Type the answer"
                      onChange={(e) =>
                        updateFaq(f.key, "answer", e.target.value)
                      }
                      style={{
                        ...inputStyle,
                        minHeight: "80px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setDraftFaqs((list) => [
                      ...list,
                      { key: `new-${Date.now()}`, question: "", answer: "" },
                    ])
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px",
                    borderRadius: "10px",
                    border: `1px dashed ${NAVY}`,
                    background: "#fff",
                    color: NAVY,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  <PlusCircle size={18} /> Add FAQ
                </button>
              </>
            ) : (
              <>
                {CONTACT_FIELDS.map(([key, label, type]) => (
                  <div key={key} style={{ marginBottom: "14px" }}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      type={type}
                      value={draftContact[key] ?? ""}
                      onChange={(e) =>
                        setDraftContact((c) => ({
                          ...c,
                          [key]: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    />
                  </div>
                ))}
                <Note>
                  Empty fields are hidden from students. These details show on
                  the students' Help & Support page (web and app).
                </Note>
              </>
            )}
          </>
        )}
      </PageCard>
    </AdminContentFrame>
  );
}

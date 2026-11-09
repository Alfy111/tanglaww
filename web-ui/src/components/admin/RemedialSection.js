import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

// Remedial quiz settings for the admin quiz editor.
// Only the chosen reviewees see a remedial quiz. The list shows only the
// reviewees below 60% on the topic (plus anyone already saved on this quiz),
// all ticked. The admin can untick names.

export const AT_RISK_CUTOFF = 60;

const C = {
  primary: "#0D2A94",
  card: "#EEF1F6",
  border: "#C9D0DD",
  text: "#1A1A2E",
  muted: "#6B7280",
  danger: "#C0392B",
  dangerBg: "#FDECEA",
};

export default function RemedialSection({
  enabled,
  onEnabledChange,
  topics,
  topicId,
  onTopicChange,
  chosen,
  onChosenChange,
  keepSavedList,
  savedIds = [],
  assessmentId = null,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const majors = topics.filter((t) => t.parent_id === null);
  const minorsOf = (majorId) => topics.filter((t) => t.parent_id === majorId);

  // Load the reviewees' mastery on the chosen topic
  useEffect(() => {
    if (!enabled || !topicId) {
      setCandidates([]);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const { data, error: rpcError } = await supabase.rpc("get_remedial_candidates", {
        p_topic_id: topicId,
        p_assessment_id: assessmentId,
      });
      if (!active) return;
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      const rows = data ?? [];
      setCandidates(rows);
      // A new topic starts with its at-risk reviewees ticked.
      // A saved remedial keeps its saved list the first time it loads.
      if (!keepSavedList.current) {
        onChosenChange(rows.filter((r) => r.atRisk).map((r) => r.studentId));
      }
      keepSavedList.current = false;
    };
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, topicId]);

  const toggle = (id) =>
    onChosenChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  // Only at-risk reviewees, plus anyone already saved on this quiz
  const shown = candidates.filter((r) => r.atRisk || r.inList || savedIds.includes(r.studentId));

  return (
    <div style={{ backgroundColor: C.card, borderRadius: "10px", padding: "14px 16px", marginTop: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: C.text }}>Remedial quiz</div>
          <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
            Only the reviewees you choose below can see and take this quiz. It does not count toward course progress.
          </div>
        </div>
        <input
          type="checkbox"
          aria-label="Remedial quiz"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: C.primary, cursor: "pointer", flexShrink: 0 }}
        />
      </div>

      {enabled && (
        <>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: C.text, margin: "16px 0 6px" }}>
            Topic they are weak in:
          </label>
          <select
            value={topicId ?? ""}
            onChange={(e) => onTopicChange(e.target.value ? Number(e.target.value) : null)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.border}`, fontFamily: "inherit", fontSize: "14px", backgroundColor: "#fff" }}
          >
            <option value="">Select a topic</option>
            {majors.map((m) => (
              <optgroup key={m.topic_id} label={m.topicName}>
                <option value={m.topic_id}>All of {m.topicName}</option>
                {minorsOf(m.topic_id).map((t) => (
                  <option key={t.topic_id} value={t.topic_id}>{t.topicName}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {topicId && (
            <>
              <div style={{ margin: "16px 0 8px", fontSize: "13px", fontWeight: "600", color: C.text }}>
                At-risk reviewees ({chosen.length} of {shown.length} chosen)
              </div>
              <p style={{ fontSize: "12px", color: C.muted, margin: "0 0 8px" }}>
                Only reviewees below {AT_RISK_CUTOFF}% on this topic are listed. They are all ticked; untick anyone who should not get this quiz.
              </p>

              {loading && <p style={{ fontSize: "13px", color: C.muted }}>Loading reviewees...</p>}
              {error && <p role="alert" style={{ fontSize: "13px", color: C.danger }}>{error}</p>}
              {!loading && !error && shown.length === 0 && (
                <p style={{ fontSize: "13px", color: C.muted }}>
                  No reviewee is below {AT_RISK_CUTOFF}% on this topic, so there is no one to give this remedial to yet.
                </p>
              )}

              {!loading && shown.length > 0 && (
                <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: `1px solid ${C.border}`, maxHeight: "320px", overflowY: "auto" }}>
                  {shown.map((r, i) => (
                    <label
                      key={r.studentId}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderTop: i === 0 ? "none" : "1px solid #EEF0F4", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={chosen.includes(r.studentId)}
                        onChange={() => toggle(r.studentId)}
                        style={{ width: "16px", height: "16px", accentColor: C.primary }}
                      />
                      <span style={{ flex: 1, fontSize: "13px", color: C.text }}>{r.name}</span>
                      {r.atRisk ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: C.danger, backgroundColor: C.dangerBg, borderRadius: "10px", padding: "2px 8px" }}>
                          <AlertTriangle size={11} /> At risk
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: C.muted }}>No longer at risk</span>
                      )}
                      <span style={{ width: "64px", textAlign: "right", fontSize: "12px", color: r.mastery === null ? C.muted : C.text }}>
                        {r.mastery === null ? "No data" : `${r.mastery}%`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import {
  AdminContentFrame,
  Note,
  Status,
  TabBar,
  TextEditor,
} from "../../components/admin/SiteContentEditor";
import { PageCard, PoliciesView } from "../../components/SiteContentViews";
import { getSiteContent, saveSiteContent } from "../../lib/siteContent";

const KEYS = ["privacy_policy", "terms_of_use"];
const TABS = [
  ["privacy_policy", "Privacy Policy"],
  ["terms_of_use", "Terms of Use"],
];

export default function AdminPolicies() {
  const [content, setContent] = useState(null);
  const [draft, setDraft] = useState({});
  const [tab, setTab] = useState(KEYS[0]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setContent(await getSiteContent(KEYS));
    } catch (e) {
      setError(e.message ?? "Could not load this page.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    setDraft({
      privacy_policy: content?.privacy_policy ?? "",
      terms_of_use: content?.terms_of_use ?? "",
    });
    setNotice("");
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await saveSiteContent(draft);
      await load();
      setEditing(false);
      setNotice("Terms & Policies have been updated.");
    } catch (e) {
      setError(e.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminContentFrame
      title="Terms & Policies"
      editing={editing}
      saving={saving}
      onEdit={startEdit}
      onCancel={() => setEditing(false)}
      onSave={save}
    >
      <PageCard>
        <Status error={error} notice={notice} />
        {!content ? (
          !error && <p style={{ color: "#999", margin: 0 }}>Loading...</p>
        ) : editing ? (
          <>
            <TabBar tabs={TABS} active={tab} onChange={setTab} />
            <TextEditor
              label={`Editing: ${TABS.find(([k]) => k === tab)[1]}`}
              value={draft[tab] ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, [tab]: v }))}
              minHeight={420}
              placeholder="Paste or type the policy here..."
            />
            <Note warning>
              Legal documents affect user rights. Make sure changes are approved
              by TARC management before saving. Leave a blank line between
              paragraphs, and start a line with "- " for a bullet.
            </Note>
          </>
        ) : (
          <PoliciesView content={content} />
        )}
      </PageCard>
    </AdminContentFrame>
  );
}

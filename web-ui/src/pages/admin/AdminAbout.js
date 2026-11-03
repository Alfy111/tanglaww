import { useCallback, useEffect, useState } from "react";
import {
  AdminContentFrame,
  Note,
  Status,
  TabBar,
  TextEditor,
} from "../../components/admin/SiteContentEditor";
import { AboutView, PageCard } from "../../components/SiteContentViews";
import { getSiteContent, saveSiteContent } from "../../lib/siteContent";

const KEYS = ["about_tanglaw", "about_tarc"];
const TABS = [
  ["about_tanglaw", "Tanglaw"],
  ["about_tarc", "TARC"],
];

export default function AdminAbout() {
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
      about_tanglaw: content?.about_tanglaw ?? "",
      about_tarc: content?.about_tarc ?? "",
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
      setNotice("The About page has been updated.");
    } catch (e) {
      setError(e.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminContentFrame
      title="About"
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
              label={`About ${TABS.find(([k]) => k === tab)[1]}`}
              value={draft[tab] ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, [tab]: v }))}
              minHeight={320}
              placeholder="Enter description here..."
            />
            <Note>
              Changes show right away on the students' About page (web and app).
              Leave a blank line between paragraphs, and start a line with "- "
              for a bullet.
            </Note>
          </>
        ) : (
          <AboutView content={content} />
        )}
      </PageCard>
    </AdminContentFrame>
  );
}

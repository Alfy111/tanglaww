import {
  Pencil,
  PlayCircle,
  PlusCircle,
  Trash2,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  EmptyState,
  MaterialPage,
  NAVY,
  ReorderList,
  SelectBar,
  SelectBox,
  ToolsRow,
  actionButton,
  primaryButton,
} from "../../components/admin/MaterialPage";
import {
  deleteMaterials,
  extractYoutubeId,
  formatDate,
  getCourseMaterials,
  getCourseName,
  getUploadModuleId,
  saveMaterialOrder,
} from "../../lib/materials";
import { supabase } from "../../lib/supabase";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DCDFE3",
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#1A1A2E",
  backgroundColor: "#F8F9FC",
  fontFamily: "Poppins, sans-serif",
  outline: "none",
};

function SessionModal({ editing, onClose, onSaved, moduleId, adminId }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.fileUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addedCount, setAddedCount] = useState(0);

  const emptyForm = !title.trim() && !url.trim();

  const save = async (keepOpen) => {
    if (!title.trim()) {
      setError("Enter a session title.");
      return;
    }
    const youtubeId = extractYoutubeId(url.trim());
    if (!youtubeId) {
      setError(
        "Invalid YouTube URL. Accepted formats: https://youtu.be/VIDEO_ID or https://youtube.com/watch?v=VIDEO_ID",
      );
      return;
    }
    setError("");
    setSaving(true);
    const { error: saveError } = editing
      ? await supabase
          .from("learning_material")
          .update({ title: title.trim(), fileUrl: url.trim(), youtubeId })
          .eq("material_id", editing.material_id)
      : await supabase.from("learning_material").insert({
          title: title.trim(),
          fileType: "youtube",
          fileUrl: url.trim(),
          youtubeId,
          storagePath: null,
          isDownloadable: false,
          fileSize: null,
          materialType: "recorded_session",
          module_id: moduleId,
          admin_id: adminId,
          uploadedAt: new Date().toISOString(),
        });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
    if (keepOpen) {
      setTitle("");
      setUrl("");
      setAddedCount((n) => n + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "24px",
          fontFamily: "Poppins, sans-serif",
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
          <span
            style={{ fontSize: "18px", fontWeight: "700", color: "#1A1A2E" }}
          >
            {editing ? "Edit Recorded Session" : "Add Recorded Session"}
          </span>
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
            <X size={22} color="#333" />
          </button>
        </div>

        {addedCount > 0 && (
          <p
            style={{
              fontSize: "12px",
              color: "#1E9E5A",
              backgroundColor: "#EAF7F0",
              padding: "10px",
              borderRadius: "8px",
              margin: "0 0 14px",
            }}
          >
            {addedCount} session{addedCount > 1 ? "s" : ""} added. Enter the
            next one, or click Done.
          </p>
        )}

        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "#555",
            marginBottom: "6px",
          }}
        >
          Session Title: *
        </label>
        <input
          style={inputStyle}
          placeholder="e.g. Week 1 – Introduction"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
        />

        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "#555",
            margin: "14px 0 6px",
          }}
        >
          YouTube URL: *
        </label>
        <input
          style={{
            ...inputStyle,
            borderColor: error.startsWith("Invalid") ? "#E74C3C" : "#DCDFE3",
          }}
          placeholder="https://youtu.be/VIDEO_ID"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
        />
        {error ? (
          <p style={{ fontSize: "12px", color: "#E74C3C", margin: "6px 0 0" }}>
            {error}
          </p>
        ) : (
          <p style={{ fontSize: "12px", color: "#95A5A6", margin: "6px 0 0" }}>
            Paste an unlisted YouTube link.
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          {!editing && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "10px",
                border: `1px solid ${NAVY}`,
                backgroundColor: "#fff",
                color: NAVY,
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Save & Add Another
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              addedCount > 0 && emptyForm ? onClose() : save(false)
            }
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "10px",
              border: 0,
              backgroundColor: NAVY,
              color: "#fff",
              fontWeight: "700",
              fontSize: "15px",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {saving
              ? "Saving..."
              : addedCount > 0 && emptyForm
                ? "Done"
                : editing
                  ? "Save Changes"
                  : "Save Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerModal({ session, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "900px",
          backgroundColor: "#0D0D1A",
          borderRadius: "12px",
          overflow: "hidden",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#0D2A94",
            padding: "14px 16px",
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              display: "flex",
              color: "#fff",
            }}
          >
            <X size={22} />
          </button>
          <span
            style={{
              color: "#fff",
              fontWeight: "700",
              fontSize: "16px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.title}
          </span>
        </div>
        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            backgroundColor: "#000",
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${session.youtubeId}?autoplay=1`}
            title={session.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>
            {session.title}
          </div>
          <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
            Added {formatDate(session.uploadedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRecordedSessions() {
  const { courseId } = useParams();
  const [courseTitle, setCourseTitle] = useState("");
  const [uploadModuleId, setUploadModuleId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [mode, setMode] = useState("normal");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setSessions(await getCourseMaterials(courseId, "recorded_session"));
    } catch (loadError) {
      setError(`Could not load recorded sessions: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminId(user?.id ?? null);
      const [name, moduleId] = await Promise.all([
        getCourseName(courseId),
        getUploadModuleId(courseId),
      ]);
      setCourseTitle(name);
      setUploadModuleId(moduleId);
      await fetchSessions();
    };
    init();
  }, [courseId, fetchSessions]);

  const exitMode = () => {
    setMode("normal");
    setSelectedIds(new Set());
  };

  const toggleSelected = (id) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    sessions.length > 0 && selectedIds.size === sessions.length;

  const deleteItems = async (items, label) => {
    if (!window.confirm(`${label} This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteMaterials(items);
    setDeleting(false);
    exitMode();
    await fetchSessions();
    if (result.failed.length > 0)
      setError(`Some sessions were not deleted:\n${result.failed.join("\n")}`);
  };

  const handleSaveOrder = async (ids) => {
    try {
      await saveMaterialOrder(ids);
      exitMode();
      await fetchSessions();
    } catch (saveError) {
      setError(`Couldn't save the order: ${saveError.message}`);
    }
  };

  return (
    <MaterialPage
      topbarTitle="Recorded Sessions"
      courseTitle={courseTitle}
      subtitle="Recorded Sessions"
    >
      {mode === "normal" && uploadModuleId && (
        <button
          type="button"
          style={primaryButton}
          onClick={() => setModal({ editing: null })}
        >
          <PlusCircle size={20} /> Upload Sessions
        </button>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "#c0392b", fontSize: "13px", whiteSpace: "pre-line" }}
        >
          {error}
        </p>
      )}

      {mode === "normal" && !loading && (
        <ToolsRow
          count={sessions.length}
          onSelect={() => setMode("select")}
          onReorder={() => setMode("reorder")}
        />
      )}

      {mode === "select" && (
        <SelectBar
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onToggleAll={() =>
            setSelectedIds(
              allSelected
                ? new Set()
                : new Set(sessions.map((s) => s.material_id)),
            )
          }
          onCancel={exitMode}
          deleting={deleting}
          onDelete={() => {
            const items = sessions.filter((s) =>
              selectedIds.has(s.material_id),
            );
            deleteItems(
              items,
              `Delete ${items.length} selected session${items.length > 1 ? "s" : ""}?`,
            );
          }}
        />
      )}

      {mode === "reorder" ? (
        <ReorderList
          items={sessions}
          renderIcon={() => <Video size={22} color="#E74C3C" />}
          onSave={handleSaveOrder}
          onCancel={exitMode}
        />
      ) : loading ? (
        <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>
          Loading...
        </p>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<VideoOff size={56} color="#BDC3C7" />}
          text="No recorded sessions yet."
          hint='Click "Upload Sessions" to add YouTube links.'
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginTop: "4px",
          }}
        >
          {sessions.map((item) => {
            const selecting = mode === "select";
            const isSelected = selectedIds.has(item.material_id);
            return (
              <div
                key={item.material_id}
                onClick={
                  selecting ? () => toggleSelected(item.material_id) : undefined
                }
                style={{
                  display: "flex",
                  borderRadius: "12px",
                  border: `1px solid ${isSelected ? NAVY : "#E8ECF4"}`,
                  backgroundColor: isSelected ? "#EEF1FB" : "#F8F9FC",
                  overflow: "hidden",
                  cursor: selecting ? "pointer" : "default",
                }}
              >
                {selecting && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0 4px 0 10px",
                    }}
                  >
                    <SelectBox checked={isSelected} />
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Play ${item.title}`}
                  onClick={selecting ? undefined : () => setPlaying(item)}
                  style={{
                    position: "relative",
                    width: "120px",
                    minHeight: "90px",
                    flexShrink: 0,
                    border: 0,
                    backgroundColor: "#1A1A2E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    overflow: "hidden",
                  }}
                >
                  {item.youtubeId ? (
                    <img
                      src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                  ) : (
                    <Video size={36} color="#E74C3C" />
                  )}
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "6px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "11px",
                      backgroundColor: "#E74C3C",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "10px",
                    }}
                  >
                    ▶
                  </span>
                </button>
                <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1A1A2E",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#95A5A6",
                      marginTop: "3px",
                    }}
                  >
                    {formatDate(item.uploadedAt)}
                  </div>
                  {!selecting && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginTop: "10px",
                      }}
                    >
                      <button
                        type="button"
                        style={actionButton}
                        onClick={() => setPlaying(item)}
                      >
                        <PlayCircle size={14} /> Play
                      </button>
                      <button
                        type="button"
                        style={actionButton}
                        onClick={() => setModal({ editing: item })}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteItems([item], `Delete "${item.title}"?`)
                        }
                        style={{
                          ...actionButton,
                          borderColor: "#E74C3C",
                          color: "#E74C3C",
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <SessionModal
          key={modal.editing?.material_id ?? "new"}
          editing={modal.editing}
          moduleId={uploadModuleId}
          adminId={adminId}
          onClose={() => setModal(null)}
          onSaved={fetchSessions}
        />
      )}
      {playing && (
        <PlayerModal session={playing} onClose={() => setPlaying(null)} />
      )}
    </MaterialPage>
  );
}

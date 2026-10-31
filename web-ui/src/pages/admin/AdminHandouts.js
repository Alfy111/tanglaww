import {
  Download,
  Eye,
  FileSearch,
  FileText,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  EmptyState,
  MaterialPage,
  ReorderList,
  SelectBar,
  SelectBox,
  ToolsRow,
  actionButton,
  primaryButton,
} from "../../components/admin/MaterialPage";
import {
  deleteMaterials,
  formatBytes,
  formatDate,
  getCourseMaterials,
  getCourseName,
  getUploadModuleId,
  saveMaterialOrder,
} from "../../lib/materials";
import { supabase, uploadStorageFileWithProgress } from "../../lib/supabase";

const fileColor = (type) =>
  type === "pdf"
    ? "#E74C3C"
    : type === "doc" || type === "docx"
      ? "#2980B9"
      : "#95A5A6";

function FileIcon({ type, size = 40 }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FileText size={size} color={fileColor(type)} />
      {size >= 32 && (
        <span
          style={{
            position: "absolute",
            bottom: "6px",
            fontSize: "8px",
            fontWeight: "800",
            color: fileColor(type),
            textTransform: "uppercase",
            backgroundColor: "#fff",
            padding: "0 2px",
          }}
        >
          {type || "file"}
        </span>
      )}
    </div>
  );
}

export default function AdminHandouts() {
  const { courseId } = useParams();
  const [courseTitle, setCourseTitle] = useState("");
  const [uploadModuleId, setUploadModuleId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [handouts, setHandouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [mode, setMode] = useState("normal");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const uploading = uploadProgress !== null;

  const fetchHandouts = useCallback(async () => {
    try {
      setHandouts(await getCourseMaterials(courseId, "handout"));
    } catch (loadError) {
      setError(`Could not load learning modules: ${loadError.message}`);
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
      await fetchHandouts();
    };
    init();
  }, [courseId, fetchHandouts]);

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
    handouts.length > 0 && selectedIds.size === handouts.length;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !uploadModuleId || !adminId) return;

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    let completedBytes = 0;
    const failures = [];
    setError("");
    setUploadProgress({
      percent: 0,
      current: 1,
      total: files.length,
      fileName: files[0].name,
    });

    try {
      for (const [index, file] of files.entries()) {
        const ext = file.name.includes(".")
          ? file.name.split(".").pop().toLowerCase()
          : "";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `module_${uploadModuleId}/${Date.now()}_${index}_${safeName}`;
        const bytesBefore = completedBytes;
        try {
          await uploadStorageFileWithProgress(
            "learning-materials",
            storagePath,
            file,
            (loaded) => {
              const percent =
                totalBytes === 0
                  ? 100
                  : Math.round(
                      ((bytesBefore + Math.min(file.size, loaded)) /
                        totalBytes) *
                        100,
                    );
              setUploadProgress({
                percent,
                current: index + 1,
                total: files.length,
                fileName: file.name,
              });
            },
          );
          const { data: urlData } = supabase.storage
            .from("learning-materials")
            .getPublicUrl(storagePath);
          const { error: dbError } = await supabase
            .from("learning_material")
            .insert({
              title: file.name,
              fileType: ext,
              fileUrl: urlData.publicUrl,
              storagePath,
              isDownloadable: true,
              fileSize: file.size,
              materialType: "handout",
              module_id: uploadModuleId,
              admin_id: adminId,
              uploadedAt: new Date().toISOString(),
            });
          if (dbError) {
            await supabase.storage
              .from("learning-materials")
              .remove([storagePath]);
            throw new Error(dbError.message);
          }
        } catch (uploadError) {
          failures.push(`${file.name}: ${uploadError.message}`);
        }
        completedBytes += file.size;
      }
      await fetchHandouts();
      if (failures.length > 0)
        setError(`Some files could not be uploaded:\n${failures.join("\n")}`);
    } finally {
      setUploadProgress(null);
    }
  };

  const deleteItems = async (items, label) => {
    if (!window.confirm(`${label} This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteMaterials(items);
    setDeleting(false);
    exitMode();
    await fetchHandouts();
    if (result.failed.length > 0)
      setError(`Some files were not deleted:\n${result.failed.join("\n")}`);
  };

  const handleSaveOrder = async (ids) => {
    try {
      await saveMaterialOrder(ids);
      exitMode();
      await fetchHandouts();
    } catch (saveError) {
      setError(`Couldn't save the order: ${saveError.message}`);
    }
  };

  return (
    <MaterialPage
      topbarTitle="Learning Modules"
      courseTitle={courseTitle}
      subtitle="Learning Modules"
    >
      {mode === "normal" && uploadModuleId && (
        <label
          style={{
            ...primaryButton,
            opacity: uploading ? 0.7 : 1,
            cursor: uploading ? "wait" : "pointer",
            boxSizing: "border-box",
          }}
        >
          <PlusCircle size={20} />
          {uploading
            ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}… ${uploadProgress.percent}%`
            : "Upload Modules"}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            disabled={uploading}
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </label>
      )}

      {uploading && (
        <div role="status" style={{ marginTop: "10px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#555",
              marginBottom: "6px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {uploadProgress.fileName}
          </div>
          <div
            style={{
              height: "8px",
              backgroundColor: "#e8e8e8",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${uploadProgress.percent}%`,
                height: "100%",
                backgroundColor: "#2F459B",
                transition: "width 0.15s ease",
              }}
            />
          </div>
        </div>
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
          count={handouts.length}
          onSelect={() => setMode("select")}
          onReorder={() => setMode("reorder")}
          disabled={uploading}
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
                : new Set(handouts.map((h) => h.material_id)),
            )
          }
          onCancel={exitMode}
          deleting={deleting}
          onDelete={() => {
            const items = handouts.filter((h) =>
              selectedIds.has(h.material_id),
            );
            deleteItems(
              items,
              `Delete ${items.length} selected file${items.length > 1 ? "s" : ""}?`,
            );
          }}
        />
      )}

      {mode === "reorder" ? (
        <ReorderList
          items={handouts}
          renderIcon={(h) => <FileIcon type={h.fileType} size={24} />}
          onSave={handleSaveOrder}
          onCancel={exitMode}
        />
      ) : loading ? (
        <p style={{ color: "#aaa", textAlign: "center", padding: "40px 0" }}>
          Loading...
        </p>
      ) : handouts.length === 0 ? (
        <EmptyState
          icon={<FileSearch size={56} color="#BDC3C7" />}
          text="No learning modules yet."
          hint='Click "Upload Modules" to add files. You can pick several at once.'
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
          {handouts.map((item) => {
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
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px",
                  borderRadius: "12px",
                  border: `1px solid ${isSelected ? "#2F459B" : "#E8ECF4"}`,
                  backgroundColor: isSelected ? "#EEF1FB" : "#F8F9FC",
                  cursor: selecting ? "pointer" : "default",
                }}
              >
                {selecting && (
                  <span style={{ alignSelf: "center" }}>
                    <SelectBox checked={isSelected} />
                  </span>
                )}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    flexShrink: 0,
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    border: "1px solid #E0E4EF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileIcon type={item.fileType} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                    {formatBytes(item.fileSize)} · {formatDate(item.uploadedAt)}
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
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={actionButton}
                      >
                        <Eye size={14} /> View
                      </a>
                      {item.isDownloadable && (
                        <a href={item.fileUrl} download style={actionButton}>
                          <Download size={14} /> Download
                        </a>
                      )}
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
    </MaterialPage>
  );
}

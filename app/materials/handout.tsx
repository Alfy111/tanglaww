import { logAudit } from "@/services/auditService";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useAdmin } from "../../context/AdminContext";
import {
  getCompletedMaterialIds,
  markMaterialCompleted,
  recordMaterialView,
} from "../../services/materialProgressService";
import {
  deleteMaterial,
  downloadMaterial,
  getCourseIdForModule,
  getMaterialsByCourse,
  getModulesByCourse,
  LearningMaterial,
  uploadHandout,
} from "../../services/materialService";

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const fileIconName = (type: string) => {
  if (type === "pdf") return "file-pdf-box";
  if (type === "docx" || type === "doc") return "file-word-box";
  return "file-outline";
};

const fileIconColor = (type: string) => {
  if (type === "pdf") return "#E74C3C";
  if (type === "docx" || type === "doc") return "#2980B9";
  return "#95A5A6";
};

const DETECT_BOTTOM_JS = `
  (function () {
    if (window.__tanglawTracker) return;
    window.__tanglawTracker = true;

    var sent = false;
    var fitChecks = 0;
    var started = Date.now();
    var timer = null;

    function send() {
      if (sent) return;
      sent = true;
      if (timer) clearInterval(timer);
      window.ReactNativeWebView.postMessage("reached_bottom");
    }

    function contentReady() {
      var imgs = document.images;
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].complete && imgs[i].naturalHeight > 200) return true;
      }
      var text = (document.body && document.body.innerText) || "";
      return text.length > 200;
    }

    function mainScroller() {
      var doc = document.scrollingElement || document.documentElement;
      var best = doc;
      var all = document.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.clientHeight > 100 && el.scrollHeight > el.clientHeight + 4 &&
            el.scrollHeight > best.scrollHeight) {
          var oy = getComputedStyle(el).overflowY;
          if (oy === "auto" || oy === "scroll") best = el;
        }
      }
      return best;
    }

    function check() {
      if (sent || !contentReady()) return;

      var doc = document.scrollingElement || document.documentElement;
      var el = mainScroller();
      var margin = Math.max(40, el.scrollHeight * 0.03);
      var overflow = el.scrollHeight - el.clientHeight;

      if (overflow <= margin) {
        fitChecks += 1;
        if (fitChecks >= 4 && Date.now() - started > 3000) send();
        return;
      }
      fitChecks = 0;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - margin) {
        send();
        return;
      }

      var vv = window.visualViewport;
      if (vv && el === doc && vv.scale > 1.01 &&
          vv.pageTop + vv.height >= doc.scrollHeight - margin) {
        send();
      }
    }

    document.addEventListener("scroll", check, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", check);
      window.visualViewport.addEventListener("resize", check);
    }
    timer = setInterval(check, 800);
  })();
  true;
`;

function InAppViewer({
  material,
  onClose,
  onReachedBottom,
  trackProgress,
  alreadyCompleted,
}: {
  material: LearningMaterial;
  onClose: () => void;
  onReachedBottom?: () => void;
  trackProgress: boolean;
  alreadyCompleted: boolean;
}) {
  const [webLoading, setWebLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    material.fileUrl,
  )}&embedded=true`;

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    if (event.nativeEvent.data !== "reached_bottom") return;
    if (!trackProgress || completed) return;
    setCompleted(true);
    onReachedBottom?.();
  };

  return (
    <SafeAreaView style={viewer.container}>
      <View style={viewer.header}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={viewer.headerTitle} numberOfLines={1}>
            {material.title}
          </Text>
          {trackProgress && (
            <Text style={viewer.headerHint} numberOfLines={1}>
              {completed ? "Completed" : "Read to the end to complete"}
            </Text>
          )}
        </View>
      </View>

      {webLoading && !loadFailed && (
        <View style={viewer.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F459B" />
          <Text style={viewer.loadingText}>Loading document…</Text>
        </View>
      )}

      {loadFailed && (
        <View style={viewer.loadingOverlay}>
          <MaterialCommunityIcons
            name="file-alert-outline"
            size={48}
            color="#BDC3C7"
          />
          <Text style={viewer.loadingText}>
            Couldn't load this document. Try again or download it instead.
          </Text>
        </View>
      )}

      <WebView
        source={{ uri: viewerUrl }}
        style={{ flex: 1 }}
        onLoadStart={() => setWebLoading(true)}
        onLoad={() => {
          setWebLoading(false);
          setLoadFailed(false);
        }}
        onError={() => {
          setWebLoading(false);
          setLoadFailed(true);
        }}
        injectedJavaScript={DETECT_BOTTOM_JS}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    </SafeAreaView>
  );
}

export default function HandoutScreen() {
  const router = useRouter();
  const {
    courseId: courseIdParam,
    moduleId: moduleIdParam,
    courseTitle = "Course",
  } = useLocalSearchParams<{
    courseId?: string;
    moduleId?: string;
    courseTitle: string;
  }>();

  const { isAdmin, isStudent, authLoading, currentAdminId, currentStudentId } =
    useAdmin();

  const [courseId, setCourseId] = useState<number | null>(
    courseIdParam ? Number(courseIdParam) : null,
  );
  const [uploadModuleId, setUploadModuleId] = useState<number | null>(null);
  const [handouts, setHandouts] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewingMaterial, setViewingMaterial] =
    useState<LearningMaterial | null>(null);
  const [completedMaterialIds, setCompletedMaterialIds] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    if (courseId || !moduleIdParam) return;
    getCourseIdForModule(Number(moduleIdParam)).then((id) => {
      if (id) setCourseId(id);
      else setLoading(false);
    });
  }, [courseId, moduleIdParam]);

  const fetchHandouts = useCallback(async () => {
    if (authLoading) return;
    if (!courseId) {
      if (!moduleIdParam) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, mods] = await Promise.all([
        getMaterialsByCourse(courseId, "handout"),
        getModulesByCourse(courseId),
      ]);
      setHandouts(data);
      setUploadModuleId(mods[0]?.module_id ?? null);

      if (isStudent && currentStudentId) {
        try {
          const completed = await getCompletedMaterialIds(
            currentStudentId,
            data.map((material) => material.material_id),
          );
          setCompletedMaterialIds(completed);
        } catch (error: any) {
          Alert.alert("Progress unavailable", error.message);
        }
      } else {
        setCompletedMaterialIds(new Set());
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, isStudent, authLoading, moduleIdParam, currentStudentId]);

  useEffect(() => {
    fetchHandouts();
  }, [fetchHandouts]);

  const logStudentEvent = async (
    action: "student_viewed_material" | "student_downloaded_material",
    item: LearningMaterial,
  ) => {
    if (isAdmin || !currentStudentId) return;
    try {
      await logAudit({
        actorType: "student",
        actorId: String(currentStudentId),
        action,
        targetType: "material",
        targetId: String(item.material_id),
        targetName: item.title,
        metadata: {
          courseTitle,
          courseId,
          moduleId: moduleIdParam ? Number(moduleIdParam) : null,
        },
      });
    } catch (err) {
      console.warn("[handout] audit log failed", err);
    }
  };

  const markCompletedLocally = (materialId: number) =>
    setCompletedMaterialIds((current) => new Set(current).add(materialId));

  const recordOpened = async (item: LearningMaterial) => {
    if (!isStudent || !currentStudentId) return;
    try {
      await recordMaterialView(
        currentStudentId,
        item.material_id,
        new Date(),
        0,
      );
    } catch (err) {
      console.warn("[module] saving view failed", err);
    }
  };

  const completeOnReachedBottom = async (item: LearningMaterial) => {
    if (!isStudent || !currentStudentId) return;
    if (completedMaterialIds.has(item.material_id)) return;
    try {
      await markMaterialCompleted(
        currentStudentId,
        item.material_id,
        "scrolled_to_end",
      );
      markCompletedLocally(item.material_id);
    } catch (err) {
      console.warn("[module] saving completion failed", err);
    }
  };

  const handleUpload = async () => {
    if (!currentAdminId || !uploadModuleId) return;
    setUploading(true);
    const result = await uploadHandout(uploadModuleId, currentAdminId);
    setUploading(false);
    if (result.success) fetchHandouts();
    else if (result.error) Alert.alert("Upload Failed", result.error);
  };

  const handleDelete = (item: LearningMaterial) => {
    Alert.alert(
      "Delete Learning Module",
      `Delete "${item.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteMaterial(item);
            if (result.success) fetchHandouts();
            else Alert.alert("Error", result.error);
          },
        },
      ],
    );
  };

  const handleView = (item: LearningMaterial) => {
    setViewingMaterial(item);
    logStudentEvent("student_viewed_material", item);
    recordOpened(item);
  };

  const handleDownload = async (item: LearningMaterial) => {
    setDownloadingId(item.material_id);
    const result = await downloadMaterial(item);
    setDownloadingId(null);

    if (!result.success) {
      Alert.alert("Download Failed", result.error ?? "Unknown error");
      return;
    }

    logStudentEvent("student_downloaded_material", item);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Saved", `File saved to app storage.`);
        return;
      }

      await Sharing.shareAsync(result.uri!, {
        mimeType:
          item.fileType === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        dialogTitle: "Save or open file",
        UTI:
          item.fileType === "pdf"
            ? "com.adobe.pdf"
            : "org.openxmlformats.wordprocessingml.document",
      });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (viewingMaterial) {
    const item = viewingMaterial;
    return (
      <InAppViewer
        material={item}
        onClose={() => setViewingMaterial(null)}
        trackProgress={!!(isStudent && currentStudentId)}
        alreadyCompleted={completedMaterialIds.has(item.material_id)}
        onReachedBottom={() => completeOnReachedBottom(item)}
      />
    );
  }

  const renderItem = ({ item }: { item: LearningMaterial }) => {
    const isDownloading = downloadingId === item.material_id;
    const isCompleted = completedMaterialIds.has(item.material_id);
    return (
      <View style={styles.fileCard}>
        <View style={styles.fileIconWrap}>
          <MaterialCommunityIcons
            name={fileIconName(item.fileType) as any}
            size={40}
            color={fileIconColor(item.fileType)}
          />
        </View>
        <View style={styles.fileMeta}>
          <Text style={styles.fileName} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.fileSub}>
            {formatBytes(item.fileSize)} · {formatDate(item.uploadedAt)}
          </Text>
          {isStudent && (
            <View style={styles.doneBadge}>
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "time-outline"}
                size={13}
                color={isCompleted ? "#1E9E5A" : "#A0A7B4"}
              />
              <Text
                style={[styles.doneText, !isCompleted && styles.notDoneText]}
              >
                {isCompleted ? "Completed" : "Not completed yet"}
              </Text>
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleView(item)}
            >
              <Ionicons name="eye-outline" size={15} color="#2F459B" />
              <Text style={styles.actionBtnText}>View</Text>
            </TouchableOpacity>

            {item.isDownloadable && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDownload(item)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#2F459B" />
                ) : (
                  <>
                    <Ionicons
                      name="download-outline"
                      size={15}
                      color="#2F459B"
                    />
                    <Text style={styles.actionBtnText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={15} color="#E74C3C" />
                <Text style={[styles.actionBtnText, { color: "#E74C3C" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Modules</Text>
      </View>

      <View style={styles.courseLabelWrap}>
        <Text style={styles.courseLabel}>{courseTitle}</Text>
        <Text style={styles.courseSub}>Learning Modules</Text>
      </View>

      {isAdmin && uploadModuleId && (
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.uploadBtnText}>Upload Module</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : handouts.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="file-search-outline"
            size={60}
            color="#BDC3C7"
          />
          <Text style={styles.emptyText}>No learning modules yet.</Text>
          {isAdmin && (
            <Text style={styles.emptyHint}>
              Tap "Upload Learning Module" to add files.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={handouts}
          keyExtractor={(item) => String(item.material_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-back" size={24} color="#DCDFE3" />
        </TouchableOpacity>
        <Text style={styles.navLabel}>Learning Modules</Text>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-forward" size={24} color="#DCDFE3" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#0D2A94",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 15,
  },
  courseLabelWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  courseLabel: { fontSize: 17, fontWeight: "bold", color: "#0D2A94" },
  courseSub: { fontSize: 13, color: "#777", marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F459B",
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  uploadBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
  listContent: { padding: 20, paddingBottom: 100 },
  fileCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8ECF4",
    padding: 14,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  fileIconWrap: {
    width: 52,
    height: 52,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E4EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  fileSub: { fontSize: 11, color: "#95A5A6", marginTop: 3 },
  actions: { flexDirection: "row", marginTop: 10, gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2F459B",
    backgroundColor: "white",
    gap: 4,
  },
  actionBtnText: { fontSize: 12, color: "#2F459B", fontWeight: "600" },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  doneText: { fontSize: 11, color: "#1E9E5A", fontWeight: "600" },
  notDoneText: { color: "#A0A7B4" },
  deleteBtn: { borderColor: "#E74C3C" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#95A5A6",
    marginTop: 12,
    textAlign: "center",
  },
  emptyHint: { fontSize: 13, color: "#BDC3C7", marginTop: 6 },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  navLabel: { fontSize: 16, color: "black", fontWeight: "500" },
});

const viewer = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#0D2A94",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "white" },
  headerHint: { fontSize: 11, color: "#C9D2F5", marginTop: 2 },
  loadingOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

import { logAudit } from "@/services/auditService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";
import MaterialReorder from "../../components/MaterialReorder";
import { useAdmin } from "../../context/AdminContext";
import {
  deleteMaterials,
  saveMaterialOrder,
} from "../../services/materialAdminService";
import {
  getCompletedMaterialIds,
  getWatchedSegments,
  markMaterialCompleted,
  recordMaterialView,
  SEGMENT_SECONDS,
  VIDEO_COMPLETION_THRESHOLD,
  videoCoverage,
} from "../../services/materialProgressService";
import {
  addRecordedSession,
  deleteMaterial,
  getCourseIdForModule,
  getMaterialsByCourse,
  getModulesByCourse,
  LearningMaterial,
} from "../../services/materialService";

const { width } = Dimensions.get("window");

const POLL_MS = 3000;
const MAX_CONTINUOUS_JUMP_SECONDS = (POLL_MS / 1000) * 2.5;

type WatchSessionResult = {
  startedAt: Date;
  activeSeconds: number;
  watchedSegments: number[];
  mediaDurationSeconds: number;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

function AddSessionModal({
  visible,
  onClose,
  onSaved,
  moduleId,
  adminId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  moduleId: number;
  adminId: string;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState("");

  const [addedCount, setAddedCount] = useState(0);

  const reset = () => {
    setTitle("");
    setUrl("");
    setUrlError("");
  };

  const close = () => {
    reset();
    setAddedCount(0);
    onClose();
  };

  const handleSave = async (keepOpen: boolean) => {
    if (!title.trim()) {
      Alert.alert("Validation", "Enter a session title.");
      return;
    }
    const videoId = extractYoutubeId(url.trim());
    if (!videoId) {
      setUrlError(
        "Invalid YouTube URL. Accepted formats:\n• https://youtu.be/VIDEO_ID\n• https://youtube.com/watch?v=VIDEO_ID",
      );
      return;
    }
    setUrlError("");
    setSaving(true);
    const result = await addRecordedSession(
      moduleId,
      adminId,
      title.trim(),
      url.trim(),
      videoId,
    );
    setSaving(false);
    if (result.success) {
      reset();
      onSaved();
      if (keepOpen) setAddedCount((n) => n + 1);
      else close();
    } else Alert.alert("Error", result.error);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.headerText}>Add Recorded Session</Text>
            <TouchableOpacity onPress={close}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {addedCount > 0 && (
              <Text style={modal.addedNote}>
                {addedCount} session{addedCount > 1 ? "s" : ""} added. Enter the
                next one, or tap Done.
              </Text>
            )}
            <Text style={modal.label}>Session Title: *</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. Week 1 – Introduction"
              placeholderTextColor="#BDC3C7"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={modal.label}>YouTube URL: *</Text>
            <TextInput
              style={[modal.input, urlError ? modal.inputError : null]}
              placeholder="https://youtu.be/VIDEO_ID"
              placeholderTextColor="#BDC3C7"
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setUrlError("");
              }}
              autoCapitalize="none"
              keyboardType="url"
            />
            {urlError ? (
              <Text style={modal.errorText}>{urlError}</Text>
            ) : (
              <Text style={modal.hint}>Paste an unlisted YouTube link.</Text>
            )}
          </ScrollView>

          <View style={modal.btnRow}>
            <TouchableOpacity
              style={[modal.secondaryBtn, saving && { opacity: 0.7 }]}
              onPress={() => handleSave(true)}
              disabled={saving}
            >
              <Text style={modal.secondaryBtnText}>Save & Add Another</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.saveBtn, saving && { opacity: 0.7 }]}
              onPress={() =>
                addedCount > 0 && !title.trim() && !url.trim()
                  ? close()
                  : handleSave(false)
              }
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={modal.saveBtnText}>
                  {addedCount > 0 && !title.trim() && !url.trim()
                    ? "Done"
                    : "Save Session"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SessionPlayer({
  session,
  onClose,
  onViewed,
  onSessionEnd,
  trackProgress,
  alreadyCompleted,
}: {
  session: LearningMaterial;
  onClose: () => void;
  onViewed?: (session: LearningMaterial) => void;
  onSessionEnd?: (result: WatchSessionResult) => void;
  trackProgress: boolean;
  alreadyCompleted: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<YoutubeIframeRef>(null);
  const viewedLogged = useRef(false);

  const watched = useRef(new Set<number>());
  const lastPos = useRef<number | null>(null);
  const mediaDuration = useRef(0);

  const playMs = useRef(0);
  const resumedAt = useRef<number | null>(null);
  const startedAt = useRef<Date | null>(null);
  const isPlayingNow = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const startClock = () => {
    if (!trackProgress || resumedAt.current !== null) return;
    resumedAt.current = Date.now();
    if (!startedAt.current) startedAt.current = new Date();
  };

  const pauseClock = () => {
    if (resumedAt.current === null) return;
    playMs.current += Date.now() - resumedAt.current;
    resumedAt.current = null;
  };

  const samplePosition = async () => {
    const p = playerRef.current;
    if (!trackProgress || !p) return;
    try {
      const [current, duration] = await Promise.all([
        p.getCurrentTime(),
        p.getDuration(),
      ]);
      if (duration > 0) mediaDuration.current = duration;
      const last = lastPos.current;
      if (
        last !== null &&
        current >= last &&
        current - last <= MAX_CONTINUOUS_JUMP_SECONDS
      ) {
        const from = Math.floor(last / SEGMENT_SECONDS);
        const to = Math.floor(current / SEGMENT_SECONDS);
        for (let s = from; s <= to; s++) watched.current.add(s);
      }
      lastPos.current = current;
    } catch {}
  };

  useEffect(() => {
    if (!playing) return;
    samplePosition();
    const timer = setInterval(samplePosition, POLL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (isPlayingNow.current) startClock();
      } else {
        pauseClock();
      }
    });
    return () => {
      sub.remove();
      pauseClock();
      if (startedAt.current) {
        onSessionEndRef.current?.({
          startedAt: startedAt.current,
          activeSeconds: Math.round(playMs.current / 1000),
          watchedSegments: Array.from(watched.current).sort((a, b) => a - b),
          mediaDurationSeconds: Math.round(mediaDuration.current),
        });
      }
    };
  }, []);

  const handleStateChange = (state: string) => {
    if (state === "playing") {
      isPlayingNow.current = true;
      setPlaying(true);
      if (AppState.currentState === "active") startClock();
      if (!viewedLogged.current) {
        viewedLogged.current = true;
        onViewed?.(session);
      }
    } else if (state === "buffering") {
      isPlayingNow.current = false;
      pauseClock();
    } else if (state === "paused" || state === "ended") {
      isPlayingNow.current = false;
      samplePosition();
      pauseClock();
      setPlaying(false);
    }
  };

  const percent = Math.round(VIDEO_COMPLETION_THRESHOLD * 100);

  return (
    <SafeAreaView style={player.container}>
      <View style={player.header}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={player.headerTitle} numberOfLines={1}>
            {session.title}
          </Text>
          {trackProgress && (
            <Text style={player.headerHint} numberOfLines={1}>
              {alreadyCompleted
                ? "Watched"
                : `Watch at least ${percent}% to complete`}
            </Text>
          )}
        </View>
      </View>

      <View style={player.videoWrap}>
        <YoutubePlayer
          ref={playerRef}
          height={width * 0.5625}
          width={width}
          videoId={session.youtubeId!}
          play={playing}
          onChangeState={handleStateChange}
        />
      </View>

      <View style={player.info}>
        <Text style={player.sessionTitle}>{session.title}</Text>
        <Text style={player.sessionDate}>
          Added {formatDate(session.uploadedAt)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function PlayerModal(props: {
  session: LearningMaterial | null;
  onClose: () => void;
  onViewed?: (session: LearningMaterial) => void;
  onSessionEnd?: (
    session: LearningMaterial,
    result: WatchSessionResult,
  ) => void;
  trackProgress: boolean;
  completedIds: Set<number>;
}) {
  const {
    session,
    onClose,
    onViewed,
    onSessionEnd,
    trackProgress,
    completedIds,
  } = props;
  if (!session?.youtubeId) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SessionPlayer
        key={session.material_id}
        session={session}
        onClose={onClose}
        onViewed={onViewed}
        onSessionEnd={(result) => onSessionEnd?.(session, result)}
        trackProgress={trackProgress}
        alreadyCompleted={completedIds.has(session.material_id)}
      />
    </Modal>
  );
}

export default function RecordedSessionsScreen() {
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
  const [sessions, setSessions] = useState<LearningMaterial[]>([]);
  const [completedMaterialIds, setCompletedMaterialIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [mode, setMode] = useState<"normal" | "select" | "reorder">("normal");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [activeSession, setActiveSession] = useState<LearningMaterial | null>(
    null,
  );

  useEffect(() => {
    if (courseId || !moduleIdParam) return;
    getCourseIdForModule(Number(moduleIdParam)).then((id) => {
      if (id) setCourseId(id);
      else setLoading(false);
    });
  }, [courseId, moduleIdParam]);

  const fetchSessions = useCallback(async () => {
    if (authLoading) return;
    if (!courseId) {
      if (!moduleIdParam) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, mods] = await Promise.all([
        getMaterialsByCourse(courseId, "recorded_session"),
        getModulesByCourse(courseId),
      ]);
      setSessions(data);
      setUploadModuleId(mods[0]?.module_id ?? null);

      if (isStudent && currentStudentId) {
        try {
          const completed = await getCompletedMaterialIds(
            currentStudentId,
            data.map((session) => session.material_id),
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
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = (item: LearningMaterial) => {
    Alert.alert("Delete Session", `Delete "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteMaterial(item);
          if (result.success) fetchSessions();
          else Alert.alert("Error", result.error);
        },
      },
    ]);
  };

  const exitMode = () => {
    setMode("normal");
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: number) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    sessions.length > 0 && selectedIds.size === sessions.length;

  const toggleSelectAll = () =>
    setSelectedIds(
      allSelected ? new Set() : new Set(sessions.map((s) => s.material_id)),
    );

  const handleDeleteSelected = () => {
    const items = sessions.filter((s) => selectedIds.has(s.material_id));
    if (items.length === 0) return;
    Alert.alert(
      "Delete Sessions",
      `Delete ${items.length} selected session${items.length > 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const result = await deleteMaterials(items);
            setDeleting(false);
            exitMode();
            fetchSessions();
            if (result.failed.length > 0) {
              Alert.alert(
                "Some sessions were not deleted",
                result.failed.join("\n"),
              );
            }
          },
        },
      ],
    );
  };

  const handleSaveOrder = async (ids: number[]) => {
    try {
      await saveMaterialOrder(ids);
      exitMode();
      fetchSessions();
    } catch (err: any) {
      Alert.alert("Couldn't save the order", err.message);
    }
  };

  const handleSessionViewed = async (session: LearningMaterial) => {
    if (isAdmin || !currentStudentId) return;
    try {
      await logAudit({
        actorType: "student",
        actorId: String(currentStudentId),
        action: "student_viewed_session",
        targetType: "session",
        targetId: String(session.material_id),
        targetName: session.title,
        metadata: {
          courseTitle,
          courseId,
          moduleId: moduleIdParam ? Number(moduleIdParam) : null,
        },
      });
    } catch (err) {
      console.warn("[sessions] audit log failed", err);
    }
  };

  const handleSessionEnd = async (
    session: LearningMaterial,
    result: WatchSessionResult,
  ) => {
    if (!isStudent || !currentStudentId) return;
    try {
      const totalSeconds = await recordMaterialView(
        currentStudentId,
        session.material_id,
        result.startedAt,
        result.activeSeconds,
        {
          watchedSegments: result.watchedSegments,
          mediaDurationSeconds: result.mediaDurationSeconds,
        },
      );
      if (result.mediaDurationSeconds <= 0) return;

      const allSegments = await getWatchedSegments(
        currentStudentId,
        session.material_id,
      );
      const coverage = videoCoverage(allSegments, result.mediaDurationSeconds);
      if (coverage >= VIDEO_COMPLETION_THRESHOLD) {
        await markMaterialCompleted(
          currentStudentId,
          session.material_id,
          "video_watched",
          totalSeconds,
        );
        setCompletedMaterialIds((prev) =>
          new Set(prev).add(session.material_id),
        );
      }
    } catch (err) {
      console.warn("[sessions] saving watch progress failed", err);
    }
  };

  const renderItem = ({ item }: { item: LearningMaterial }) => {
    const isCompleted = completedMaterialIds.has(item.material_id);
    const selecting = mode === "select";
    const isSelected = selectedIds.has(item.material_id);
    return (
      <TouchableOpacity
        style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
        disabled={!selecting}
        activeOpacity={0.7}
        onPress={() => toggleSelected(item.material_id)}
      >
        {selecting && (
          <View style={styles.checkboxWrap}>
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={22}
              color={isSelected ? "#2F459B" : "#A0A7B4"}
            />
          </View>
        )}
        <TouchableOpacity
          style={styles.thumbnailWrap}
          onPress={() =>
            selecting
              ? toggleSelected(item.material_id)
              : setActiveSession(item)
          }
          activeOpacity={0.85}
        >
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="logo-youtube" size={36} color="#E74C3C" />
            <View style={styles.playBadge}>
              <Ionicons name="play" size={12} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.sessionDate}>{formatDate(item.uploadedAt)}</Text>
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
                {isCompleted ? "Watched" : "Not watched yet"}
              </Text>
            </View>
          )}

          {!selecting && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setActiveSession(item)}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={15}
                  color="#2F459B"
                />
                <Text style={styles.actionBtnText}>Play</Text>
              </TouchableOpacity>

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
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recorded Sessions</Text>
      </View>

      <View style={styles.courseLabelWrap}>
        <Text style={styles.courseLabel}>{courseTitle}</Text>
        <Text style={styles.courseSub}>Recorded Sessions</Text>
      </View>

      {isAdmin && uploadModuleId && mode === "normal" && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.addBtnText}>Upload Sessions</Text>
        </TouchableOpacity>
      )}

      {isAdmin && !loading && sessions.length > 0 && mode === "normal" && (
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setMode("select")}
          >
            <Ionicons name="checkbox-outline" size={15} color="#2F459B" />
            <Text style={styles.toolBtnText}>Select</Text>
          </TouchableOpacity>
          {sessions.length > 1 && (
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setMode("reorder")}
            >
              <Ionicons name="reorder-three" size={17} color="#2F459B" />
              <Text style={styles.toolBtnText}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isAdmin && mode === "select" && (
        <View style={styles.selectBar}>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.selectAllText}>
              {allSelected ? "Unselect all" : "Select all"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectCount}>{selectedIds.size} selected</Text>
          <TouchableOpacity
            onPress={exitMode}
            style={styles.toolBtn}
            disabled={deleting}
          >
            <Text style={styles.toolBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteSelected}
            style={[
              styles.deleteSelectedBtn,
              (selectedIds.size === 0 || deleting) && { opacity: 0.5 },
            ]}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.deleteSelectedText}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && mode === "reorder" ? (
        <MaterialReorder
          items={sessions.map((s) => ({
            key: String(s.material_id),
            id: s.material_id,
            title: s.title,
            icon: <Ionicons name="logo-youtube" size={24} color="#E74C3C" />,
          }))}
          onSave={handleSaveOrder}
          onCancel={exitMode}
        />
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="videocam-off-outline" size={60} color="#BDC3C7" />
          <Text style={styles.emptyText}>No recorded sessions yet.</Text>
          {isAdmin && (
            <Text style={styles.emptyHint}>
              Tap "Upload Sessions" to add YouTube links.
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={sessions}
            extraData={[mode, selectedIds]}
            keyExtractor={(item) => String(item.material_id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-back" size={24} color="#DCDFE3" />
        </TouchableOpacity>
        <Text style={styles.navLabel}>Recorded Sessions</Text>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-forward" size={24} color="#DCDFE3" />
        </TouchableOpacity>
      </View>

      {isAdmin && currentAdminId && uploadModuleId && (
        <AddSessionModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSaved={fetchSessions}
          moduleId={uploadModuleId}
          adminId={currentAdminId}
        />
      )}

      <PlayerModal
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onViewed={handleSessionViewed}
        onSessionEnd={handleSessionEnd}
        trackProgress={!!(isStudent && currentStudentId)}
        completedIds={completedMaterialIds}
      />
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
  addBtn: {
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
  addBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2F459B",
    backgroundColor: "white",
  },
  toolBtnText: { fontSize: 12, color: "#2F459B", fontWeight: "600" },
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  selectAllText: { fontSize: 12, color: "#2F459B", fontWeight: "600" },
  selectCount: { flex: 1, fontSize: 12, color: "#777", textAlign: "center" },
  deleteSelectedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#E74C3C",
    minWidth: 64,
    alignItems: "center",
  },
  deleteSelectedText: { fontSize: 12, color: "white", fontWeight: "bold" },
  sessionCardSelected: { borderColor: "#2F459B", backgroundColor: "#EEF1FB" },
  checkboxWrap: { justifyContent: "center", paddingLeft: 10, paddingRight: 4 },
  listContent: { padding: 20, paddingBottom: 100 },
  sessionCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8ECF4",
    marginBottom: 14,
    overflow: "hidden",
  },
  thumbnailWrap: { width: 90, alignSelf: "stretch" },
  thumbnailPlaceholder: {
    flex: 1,
    width: 90,
    minHeight: 90,
    backgroundColor: "#1A1A2E",
    justifyContent: "center",
    alignItems: "center",
  },
  playBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionInfo: { flex: 1, padding: 12 },
  sessionTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  sessionDate: { fontSize: 11, color: "#95A5A6", marginTop: 3 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  doneText: { fontSize: 11, color: "#1E9E5A", fontWeight: "600" },
  notDoneText: { color: "#A0A7B4" },
  actions: { flexDirection: "row", marginTop: 10, gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2F459B",
    backgroundColor: "white",
    gap: 4,
  },
  actionBtnText: { fontSize: 12, color: "#2F459B", fontWeight: "600" },
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

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A2E",
    backgroundColor: "#F8F9FC",
    marginBottom: 6,
  },
  inputError: { borderColor: "#E74C3C" },
  errorText: { fontSize: 12, color: "#E74C3C", marginBottom: 16 },
  hint: { fontSize: 12, color: "#95A5A6", marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2F459B",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2F459B",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#2F459B", fontWeight: "bold", fontSize: 14 },
  addedNote: {
    fontSize: 12,
    color: "#1E9E5A",
    backgroundColor: "#EAF7F0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
});

const player = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D1A" },
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
  videoWrap: { backgroundColor: "black" },
  info: { padding: 20 },
  sessionTitle: { fontSize: 17, fontWeight: "bold", color: "white" },
  sessionDate: { fontSize: 12, color: "#666", marginTop: 4 },
});

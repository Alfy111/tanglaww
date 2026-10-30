import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAdmin } from "../../context/AdminContext";
import { logAudit } from "../../services/auditService";

interface SessionEvent {
  event_id: number;
  title: string;
  link: string | null;
  description: string | null;
  event_date: string;
  course_id: number | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isUpcoming = (iso: string) => new Date(iso) >= new Date();

export default function SessionLinkScreen() {
  const router = useRouter();
  const { courseId: courseIdParam, courseTitle = "Course" } =
    useLocalSearchParams<{ courseId: string; courseTitle: string }>();
  const courseId = Number(courseIdParam);
  const { isAdmin, currentStudentId } = useAdmin();

  const [sessions, setSessions] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("event_id, title, link, description, event_date, course_id")
      .eq("course_id", courseId)
      .order("event_date", { ascending: true });

    if (error) console.error("fetchSessions:", error.message);
    setSessions(data ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    if (courseId) fetchSessions();
  }, [fetchSessions]);

  const resetForm = () => {
    setNewTitle("");
    setNewLink("");
    setNewDescription("");
    setNewDate(null);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newLink.trim() || !newDate) {
      Alert.alert("Error", "Please fill in the title, link, and date.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("calendar_events").insert({
      admin_id: user?.id,
      title: newTitle.trim(),
      link: newLink.trim(),
      description: newDescription.trim() || null,
      event_date: newDate.toISOString(),
      course_id: courseId,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      resetForm();
      setAddModalVisible(false);
      fetchSessions();
    }
  };

  const handleJoin = async (session: SessionEvent) => {
    if (!session.link) {
      Alert.alert("No Link", "This session does not have a meeting link yet.");
      return;
    }

    Alert.alert(
      "Join Session",
      `You will be redirected to join "${session.title}". Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Join",
          onPress: async () => {
            try {
              if (
                session.link!.startsWith("http://") ||
                session.link!.startsWith("https://")
              ) {
                await WebBrowser.openBrowserAsync(session.link!);
              } else {
                const canOpen = await Linking.canOpenURL(session.link!);
                if (canOpen) {
                  await Linking.openURL(session.link!);
                } else {
                  Alert.alert(
                    "Cannot Open",
                    "Could not open the meeting link. Make sure the app is installed.",
                  );
                }
              }

              if (!isAdmin && currentStudentId) {
                await logAudit({
                  actorType: "student",
                  actorId: String(currentStudentId),
                  action: "student_joined_session",
                  targetType: "session",
                  targetId: String(session.event_id),
                  targetName: session.title,
                  metadata: { courseTitle, courseId },
                });
              }
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ],
    );
  };

  const handleDelete = (session: SessionEvent) => {
    Alert.alert("Delete Session", `Remove "${session.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("calendar_events")
            .delete()
            .eq("event_id", session.event_id);
          if (error) Alert.alert("Error", error.message);
          else fetchSessions();
        },
      },
    ]);
  };

  const formattedDate = newDate
    ? newDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const formattedTime = newDate
    ? newDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const renderItem = ({ item }: { item: SessionEvent }) => {
    const upcoming = isUpcoming(item.event_date);
    return (
      <View style={styles.fileCard}>
        <View style={styles.fileIconWrap}>
          <Ionicons
            name="videocam"
            size={28}
            color={upcoming ? "#2F459B" : "#BDC3C7"}
          />
        </View>
        <View style={styles.fileMeta}>
          <View style={styles.titleRow}>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <Text style={styles.fileSub}>{formatDate(item.event_date)}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {item.link ? (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  !upcoming && { borderColor: "#BDC3C7" },
                ]}
                onPress={() => handleJoin(item)}
              >
                <Ionicons
                  name="enter-outline"
                  size={15}
                  color={upcoming ? "#2F459B" : "#BDC3C7"}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    !upcoming && { color: "#BDC3C7" },
                  ]}
                >
                  Join Session
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionBtn, { borderColor: "#BDC3C7" }]}>
                <Ionicons name="link-outline" size={15} color="#BDC3C7" />
                <Text style={[styles.actionBtnText, { color: "#BDC3C7" }]}>
                  No link yet
                </Text>
              </View>
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
        <Text style={styles.headerTitle}>Online Sessions</Text>
      </View>

      <View style={styles.courseLabelWrap}>
        <Text style={styles.courseLabel}>{courseTitle}</Text>
        <Text style={styles.courseSub}>Online Session Links</Text>
      </View>

      {isAdmin && (
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.uploadBtnText}>Add Session Link</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="video-off-outline"
            size={60}
            color="#BDC3C7"
          />
          <Text style={styles.emptyText}>No sessions yet.</Text>
          {isAdmin && (
            <Text style={styles.emptyHint}>
              Tap "Add Session Link" to add one.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.event_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-back" size={24} color="#DCDFE3" />
        </TouchableOpacity>
        <Text style={styles.navLabel}>Sessions</Text>
        <TouchableOpacity disabled>
          <Ionicons name="chevron-forward" size={24} color="#DCDFE3" />
        </TouchableOpacity>
      </View>

      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Session Link</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setAddModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Session Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. LET Express - Module 3"
                placeholderTextColor="#9AA0A6"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Meeting Link *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://zoom.us/j/... or meet.google.com/..."
                placeholderTextColor="#9AA0A6"
                value={newLink}
                onChangeText={setNewLink}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Brief description of the session"
                placeholderTextColor="#9AA0A6"
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.inputWithIcon}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={{ flex: 1, color: formattedDate ? "#333" : "#BDC3C7" }}
                >
                  {formattedDate || "Select date"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#2F459B" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Time *</Text>
              <TouchableOpacity
                style={styles.inputWithIcon}
                onPress={() => setShowTimePicker(true)}
              >
                <Text
                  style={{ flex: 1, color: formattedTime ? "#333" : "#BDC3C7" }}
                >
                  {formattedTime || "Select time"}
                </Text>
                <Ionicons name="time-outline" size={20} color="#2F459B" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      const updated = newDate ? new Date(newDate) : new Date();
                      updated.setFullYear(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                      );
                      setNewDate(updated);
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={newDate ?? new Date()}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      const updated = newDate ? new Date(newDate) : new Date();
                      updated.setHours(date.getHours(), date.getMinutes());
                      setNewDate(updated);
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Add Session</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  fileName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  upcomingBadge: {
    backgroundColor: "#EAF4FF",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  upcomingText: { fontSize: 10, color: "#2F459B", fontWeight: "700" },
  pastBadge: {
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pastText: { fontSize: 10, color: "#999", fontWeight: "600" },
  fileSub: { fontSize: 11, color: "#95A5A6", marginTop: 3 },
  description: { fontSize: 12, color: "#777", marginTop: 4, lineHeight: 17 },
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
  deleteBtn: { borderColor: "#E74C3C" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: { fontSize: 16, color: "#95A5A6", marginTop: 12 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    color: "#333",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: "#2F459B",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
});

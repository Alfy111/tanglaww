import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  created_at: string;
};

export default function AdminAnnouncement() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetchingList, setFetchingList] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setFetchingList(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("announcement_id, title, content, created_at")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      setAnnouncements(data ?? []);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not load announcements.");
    } finally {
      setFetchingList(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handlePublish = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in both the title and the message.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      const { error } = await supabase.from("announcements").insert({
        admin_id: user.id,
        title: title.trim(),
        content: message.trim(),
      });

      if (error) throw new Error(error.message);

      setTitle("");
      setMessage("");
      Alert.alert(
        "Published!",
        "Announcement is now visible to all students.",
        [{ text: "OK" }],
      );
      fetchAnnouncements();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (item: Announcement) => {
    Alert.alert(
      "Delete Announcement",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(item.announcement_id);
            try {
              const { error } = await supabase
                .from("announcements")
                .delete()
                .eq("announcement_id", item.announcement_id);

              if (error) throw new Error(error.message);
              setAnnouncements((prev) =>
                prev.filter((a) => a.announcement_id !== item.announcement_id),
              );
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Could not delete.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Announcement</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoSection}>
            <Ionicons name="megaphone" size={40} color="#FFD75E" />
            <Text style={styles.infoTitle}>Broadcast Message</Text>
            <Text style={styles.infoSubtitle}>
              This information will be displayed to all students on their
              dashboard.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Announcement Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Enrollment Update"
              placeholderTextColor="#9AA0A6"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Message:</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your announcement here..."
              placeholderTextColor="#9AA0A6"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.publishBtn, loading && { opacity: 0.7 }]}
            onPress={handlePublish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.publishText}>Publish</Text>
            )}
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Previous Announcements</Text>
          </View>

          {fetchingList ? (
            <ActivityIndicator color="#2F459B" style={{ marginTop: 20 }} />
          ) : announcements.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={36} color="#CCC" />
              <Text style={styles.emptyText}>No announcements yet.</Text>
            </View>
          ) : (
            announcements.map((item) => (
              <View key={item.announcement_id} style={styles.announcementCard}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.announcement_id}
                >
                  {deletingId === item.announcement_id ? (
                    <ActivityIndicator size="small" color="#E53935" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "black" },
  content: { padding: 25, paddingBottom: 40 },
  infoSection: {
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2F459B",
    marginTop: 10,
  },
  infoSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  form: { marginBottom: 30 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2F459B",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#DCDFE3",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  textArea: { height: 150, paddingTop: 15 },
  publishBtn: {
    backgroundColor: "#2F459B",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    marginBottom: 35,
  },
  publishText: { color: "white", fontWeight: "bold", fontSize: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2F459B",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAA",
  },
  announcementCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    gap: 10,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  cardContent: {
    fontSize: 12,
    color: "#888",
    lineHeight: 16,
  },
  cardDate: {
    fontSize: 10,
    color: "#BBB",
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});

import {
  FeedItem,
  KIND_LABELS,
  useNotificationFeed,
} from "@/lib/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const isYesterday = (iso: string) => {
  const d = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

const minutesUntil = (iso: string) =>
  Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 60000));

export default function StudentNotifications() {
  const router = useRouter();
  const { items, loading, soon, isUnread, markAllRead, refresh } =
    useNotificationFeed("student");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<FeedItem | null>(null);

  const unreadAtOpen = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (loading || unreadAtOpen.current) return;
    unreadAtOpen.current = new Set(items.filter(isUnread).map((n) => n.id));
    markAllRead();
  }, [loading]);
  const showDot = (n: FeedItem) =>
    unreadAtOpen.current?.has(n.id) || isUnread(n);
  useEffect(() => {
    if (loading || !unreadAtOpen.current) return;
    const fresh = items.filter(isUnread);
    if (fresh.length === 0) return;
    fresh.forEach((n) => unreadAtOpen.current!.add(n.id));
    markAllRead();
  }, [items]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const today = items.filter((n) => isToday(n.created_at));
  const yesterday = items.filter((n) => isYesterday(n.created_at));
  const older = items.filter(
    (n) => !isToday(n.created_at) && !isYesterday(n.created_at),
  );

  const openItem = (n: FeedItem) => {
    if (n.kind === "quiz") {
      router.push("/courses" as any);
      return;
    }
    setSelected(n);
  };

  const Card = ({ n, highlight }: { n: FeedItem; highlight?: boolean }) => (
    <TouchableOpacity
      style={[styles.notificationCard, highlight && styles.soonCard]}
      onPress={() => openItem(n)}
    >
      <View style={styles.textContainer}>
        <Text style={styles.label}>
          {highlight
            ? `Starting in ${minutesUntil(n.event_at!)} min`
            : KIND_LABELS[n.kind]}
        </Text>
        <Text style={styles.notiTitle}>{n.title}</Text>
        {!!n.body && (
          <Text style={styles.notiDescription} numberOfLines={1}>
            {n.body}
          </Text>
        )}
      </View>
      <View style={styles.dateTimeContainer}>
        <Text style={styles.notiDate}>
          {formatDate(n.event_at ?? n.created_at)}
        </Text>
        {!!n.event_at && (
          <Text style={styles.notiTime}>{formatTime(n.event_at)}</Text>
        )}
        {!highlight && showDot(n) && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const Section = ({ title, list }: { title: string; list: FeedItem[] }) =>
    list.length === 0 ? null : (
      <>
        <Text style={[styles.sectionHeader, { marginTop: 10 }]}>{title}</Text>
        {list.map((n) => (
          <Card key={n.id} n={n} />
        ))}
      </>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color="#DDD" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {soon.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Starting Soon</Text>
              {soon.map((n) => (
                <Card key={`soon-${n.id}`} n={n} highlight />
              ))}
            </>
          )}
          <Section title="Today" list={today} />
          <Section title="Yesterday" list={yesterday} />
          <Section title="Earlier" list={older} />
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <View
            style={styles.eventModal}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={[styles.eventModalTitle, { flex: 1 }]}>
                {selected?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelected(null)}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.eventModalRow}>
              <Ionicons name="time-outline" size={16} color="#2F459B" />
              <Text style={styles.eventModalMeta}>
                {selected?.event_at
                  ? `${formatDate(selected.event_at)} · ${formatTime(selected.event_at)}`
                  : selected
                    ? `Posted ${formatDate(selected.created_at)}`
                    : ""}
              </Text>
            </View>

            {!!selected?.body && (
              <View style={styles.eventModalDescBox}>
                <Text style={styles.eventModalDescLabel}>
                  {selected.kind === "announcement"
                    ? "Announcement"
                    : "Description"}
                </Text>
                <Text style={styles.eventModalDesc}>{selected.body}</Text>
              </View>
            )}

            {!!selected?.link && (
              <TouchableOpacity
                style={styles.eventModalLinkBtn}
                onPress={() => {
                  const link = selected.link!;
                  Linking.openURL(
                    /^https?:\/\//i.test(link) ? link : `https://${link}`,
                  );
                }}
              >
                <Ionicons name="link-outline" size={16} color="#2F459B" />
                <Text style={styles.eventModalLinkText} numberOfLines={1}>
                  {selected.link}
                </Text>
                <Ionicons name="open-outline" size={14} color="#2F459B" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.eventModalCloseBtn}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.eventModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#2F459B",
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: "#BBB", fontSize: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2F459B",
    marginBottom: 15,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2F459B",
    marginBottom: 12,
  },
  textContainer: { flex: 1 },
  notiTitle: { fontSize: 15, fontWeight: "bold", color: "#2F459B" },
  notiDescription: { fontSize: 13, color: "#777", marginTop: 2 },
  dateTimeContainer: { alignItems: "flex-end" },
  notiDate: { fontSize: 10, color: "#777" },
  notiTime: { fontSize: 10, color: "#777", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  eventModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  eventModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  eventModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF1FF",
    justifyContent: "center",
    alignItems: "center",
  },
  eventModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 10,
  },
  eventModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  eventModalMeta: { fontSize: 13, color: "#666" },
  eventModalDescBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  eventModalDescLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2F459B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  eventModalDesc: { fontSize: 14, color: "#444", lineHeight: 20 },
  eventModalLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF1FF",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 20,
  },
  eventModalLinkText: { flex: 1, fontSize: 12, color: "#2F459B" },
  eventModalCloseBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#2F459B",
    alignItems: "center",
  },
  eventModalCloseBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  soonCard: { backgroundColor: "#EEF1FF", borderWidth: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F459B",
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2F459B",
    marginBottom: 3,
    fontStyle: "italic",
  },
});

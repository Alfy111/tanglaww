import {
  FeedItem,
  KIND_LABELS,
  useNotificationFeed,
} from "@/lib/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("en-PH", {
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
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getDate() === y.getDate() &&
    d.getMonth() === y.getMonth() &&
    d.getFullYear() === y.getFullYear()
  );
};

const ROUTES: Partial<Record<FeedItem["kind"], string>> = {
  enrollment: "/admin/approval",
  balance_receipt: "/admin/registry",
};

export default function AdminNotification() {
  const router = useRouter();
  const { items, loading, isUnread, markAllRead, refresh } =
    useNotificationFeed("admin");
  const [refreshing, setRefreshing] = useState(false);

  const newIds = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!newIds.current) newIds.current = new Set();
    const fresh = items.filter(isUnread);
    if (fresh.length === 0) return;
    fresh.forEach((n) => newIds.current!.add(n.id));
    markAllRead();
  }, [loading, items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const todayItems = items.filter((n) => isToday(n.created_at));
  const yesterdayItems = items.filter((n) => isYesterday(n.created_at));
  const olderItems = items.filter(
    (n) => !isToday(n.created_at) && !isYesterday(n.created_at),
  );

  const section = (title: string, list: FeedItem[], first = false) =>
    list.length === 0 ? null : (
      <>
        <Text style={[styles.sectionHeader, !first && { marginTop: 10 }]}>
          {title}
        </Text>
        {list.map((n) => (
          <NotificationCard
            key={n.id}
            notif={n}
            unread={!!newIds.current?.has(n.id) || isUnread(n)}
            onPress={() => {
              const route = ROUTES[n.kind];
              if (route) router.push(route as any);
            }}
          />
        ))}
      </>
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={64} color="#DDD" />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            New enrollments and balance receipts will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2F459B"]}
            />
          }
        >
          {section("Today", todayItems, true)}
          {section("Yesterday", yesterdayItems, todayItems.length === 0)}
          {section(
            "Earlier",
            olderItems,
            todayItems.length === 0 && yesterdayItems.length === 0,
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotificationCard({
  notif,
  unread,
  onPress,
}: {
  notif: FeedItem;
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.textContainer}>
        <Text style={styles.label}>
          {notif.kind === "enrollment"
            ? "New Enrollment Arrived!"
            : `${KIND_LABELS[notif.kind]}!`}
        </Text>
        <Text style={styles.notiTitle}>{notif.body || notif.title}</Text>
        <Text style={styles.notiDescription} numberOfLines={1}>
          {notif.kind === "enrollment"
            ? "Awaiting your review and approval"
            : "Check the student's remaining balance receipt"}
        </Text>
      </View>
      <View style={styles.dateTimeContainer}>
        <Text style={styles.notiDate}>{formatDate(notif.created_at)}</Text>
        <Text style={styles.notiTime}>{formatTime(notif.created_at)}</Text>
        {unread && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    backgroundColor: "#FFD75E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "black" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#555" },
  emptySubtitle: { fontSize: 13, color: "#999", textAlign: "center" },
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
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2F459B",
    fontStyle: "italic",
    marginBottom: 3,
  },
  notiTitle: { fontSize: 15, fontWeight: "bold", color: "#2F459B" },
  notiDescription: { fontSize: 13, color: "#777", marginTop: 2 },
  dateTimeContainer: { alignItems: "flex-end" },
  notiDate: { fontSize: 10, color: "#777" },
  notiTime: { fontSize: 10, color: "#777", fontWeight: "bold" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F459B",
    marginTop: 6,
  },
});

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminHamburger from "./hamburger";

const dashboardImage = require("../../assets/images/dashboard-image.png");

export default function AdminDashboard() {
  const router = useRouter();
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [affirmations, setAffirmations] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [adminName, setAdminName] = useState({
    firstName: "",
    lastName: "",
  });
  const [refresh, setRefresh] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);
    if (data) setAnnouncements(data);
  }, []);

  const fetchAffirmations = useCallback(async () => {
    const { data } = await supabase
      .from("affirmation")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data) setAffirmations(data);
  }, []);

  const fetchAdmin = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from("admin")
      .select("firstName, lastName")
      .eq("admin_id", session.user.id)
      .single();

    if (data)
      setAdminName({ firstName: data.firstName, lastName: data.lastName });
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from("enrollment")
      .select(
        `
      enrollment_id,
      student (firstName, lastName),
      verification!enrollment_verification_id_fkey (verificationStatus)
      `,
      )
      .order("enrollment_id", { ascending: false })
      .limit(10);

    const pending = (data ?? [])
      .filter((e: any) => {
        const v = Array.isArray(e.verification)
          ? e.verification[0]
          : e.verification;
        return v?.verificationStatus === false;
      })
      .slice(0, 3);

    setPendingEnrollments(pending);
  };

  const fetchNotifCount = useCallback(async () => {
    const lastSeen = await AsyncStorage.getItem("notifLastSeen");

    const { data: enrollments } = await supabase.from("enrollment").select(`
    enrollment_id,
    verification!enrollment_verification_id_fkey (verificationStatus, verificationNotes, created_at)
  `);

    const pendingCount = (enrollments ?? []).filter((e: any) => {
      const v = Array.isArray(e.verification)
        ? e.verification[0]
        : e.verification;
      const isUnseen = lastSeen
        ? new Date(v?.created_at) > new Date(lastSeen)
        : true;
      return (
        v?.verificationStatus === false && !v?.verificationNotes && isUnseen
      );
    }).length;

    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const eventsQuery = supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", now.toISOString())
      .lte("event_date", twoDaysLater.toISOString());

    if (lastSeen) {
      eventsQuery.gt("created_at", lastSeen);
    }

    const { count: eventCount } = await eventsQuery;

    setNotifCount(pendingCount + (eventCount ?? 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAdmin();
      fetchAnnouncements();
      fetchAffirmations();
      fetchPending();
      fetchNotifCount();
    }, [fetchAnnouncements, fetchAffirmations, fetchNotifCount]),
  );

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await fetchAffirmations();
    await fetchAnnouncements();
    await fetchAdmin();
    await fetchPending();
    await fetchNotifCount();
    setRefresh(false);
  }, [fetchAffirmations, fetchAnnouncements, fetchNotifCount]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.setItem(
                "notifLastSeen",
                new Date().toISOString(),
              );
              setNotifCount(0);
              router.push("/admin/notification");
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="black" />
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifCount > 99 ? "99+" : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={onRefresh}
            colors={["#2F459B"]}
          />
        }
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcomeText}>
          Welcome Back, {adminName.firstName} {adminName.lastName}!
        </Text>

        <View style={styles.heroCard}>
          <Image
            source={dashboardImage}
            style={{
              width: "100%",
              height: 200,
              resizeMode: "cover",
              borderRadius: 12,
            }}
          />
          <TouchableOpacity style={styles.editIconHero}>
            <Ionicons name="pencil-outline" size={16} color="black" />
          </TouchableOpacity>
          <View style={styles.paginationDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="megaphone-outline" size={20} color="#2F459B" />
            <Text style={styles.cardTitle}>Announcements</Text>
            <TouchableOpacity
              onPress={() => router.push("/admin/announcements")}
            >
              <Ionicons name="pencil-outline" size={18} color="#555" />
            </TouchableOpacity>
          </View>
          {announcements.length === 0 ? (
            <Text style={styles.cardBody}>No announcements yet.</Text>
          ) : (
            announcements.map((a, i) => (
              <View
                key={a.id ?? i}
                style={
                  i > 0
                    ? {
                        marginTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: "#eee",
                        paddingTop: 8,
                      }
                    : {}
                }
              >
                <Text style={[styles.cardBody, { fontWeight: "bold" }]}>
                  {a.title}
                </Text>
                <Text style={styles.cardBody}>{a.content}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.affirmationCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-outline" size={20} color="#2F459B" />
            <Text style={styles.cardTitle}>Daily Affirmation</Text>
            <TouchableOpacity
              onPress={() => router.push("/admin/affirmations")}
            >
              <Ionicons name="pencil-outline" size={18} color="#555" />
            </TouchableOpacity>
          </View>
          {affirmations.length === 0 ? (
            <Text style={styles.cardBody}>No affirmation yet.</Text>
          ) : (
            affirmations.map((a, i) => (
              <View key={a.id ?? i}>
                <Text
                  style={[
                    styles.cardBody,
                    {
                      fontStyle: "italic",
                      fontWeight: "bold",
                      textAlign: "center",
                    },
                  ]}
                >
                  {a.content}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Approval Stream</Text>
          <TouchableOpacity onPress={() => router.push("/admin/approval")}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {pendingEnrollments.length === 0 ? (
          <View style={styles.approvalItem}>
            <View style={styles.approvalTextContainer}>
              <Text style={styles.approvalName}>All caught up!</Text>
              <Text style={styles.approvalSub}>No pending enrollments</Text>
            </View>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color="#27ae60"
              style={{ marginLeft: "auto" }}
            />
          </View>
        ) : (
          pendingEnrollments.map((e: any) => (
            <TouchableOpacity
              key={e.enrollment_id}
              style={styles.approvalItem}
              onPress={() => router.push("/admin/approval" as any)}
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={20} color="#555" />
              </View>
              <View style={styles.approvalTextContainer}>
                <Text style={styles.approvalName}>
                  {e.student?.firstName} {e.student?.lastName}
                </Text>
                <Text style={styles.approvalSub}>Pending approval</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CCC" />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home-outline" size={24} color="#FFD75E" />
          <Text style={[styles.navText, { color: "#FFD75E" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/courses")}
        >
          <Ionicons name="school-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/calendar")}
        >
          <Ionicons name="calendar" size={24} color="#2F459B" />
          <Text style={styles.navText}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/approval")}
        >
          <Ionicons name="person-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Approvals</Text>
        </TouchableOpacity>
      </View>

      <AdminHamburger
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
      />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    flex: 1,
    marginLeft: 20,
  },
  headerIcons: { flexDirection: "row" },
  scrollContent: { paddingHorizontal: 20 },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2F459B",
    marginVertical: 20,
  },
  affirmationCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  affirmationText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#555",
    marginTop: 5,
    textAlign: "center",
  },
  heroCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    alignItems: "center",
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2F459B",
    justifyContent: "center",
    alignItems: "center",
  },
  editIconHero: { position: "absolute", top: 10, right: 10 },
  paginationDots: { flexDirection: "row", marginTop: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CCC",
    marginHorizontal: 3,
  },
  activeDot: { backgroundColor: "#555" },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2F459B",
  },
  cardBody: { fontSize: 13, color: "#555", lineHeight: 18 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#2F459B" },
  seeAllText: { color: "#2F459B", fontSize: 14 },
  approvalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  approvalTextContainer: { flex: 1, marginLeft: 12 },
  approvalName: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  approvalSub: { fontSize: 12, color: "#777" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 70,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  navItem: { alignItems: "center" },
  navText: { fontSize: 12, marginTop: 4, color: "#2F459B" },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFD75E",
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
});

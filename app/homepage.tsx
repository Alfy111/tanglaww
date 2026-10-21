import { supabase } from "@/lib/supabase";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DashboardCarousel from "../components/dashboard-carousel";
import HamburgerMenu from "./hamburger";

export default function Homepage() {
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [studentName, setStudentName] = useState({
    firstName: "",
    lastName: "",
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [affirmations, setAffirmations] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [carouselKey, setCarouselKey] = useState(0);

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

    const announcementsQuery = supabase
      .from("announcements")
      .select("*", { count: "exact", head: true });

    if (lastSeen) {
      announcementsQuery.gt("created_at", lastSeen);
    }

    const { count: announcementCount } = await announcementsQuery;

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

    setNotifCount(pendingCount + (eventCount ?? 0) + (announcementCount ?? 0));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    setCarouselKey((k) => k + 1);
    await fetchAnnouncements();
    await fetchAffirmations();
    await fetchNotifCount();
    setRefresh(false);
  }, [fetchAnnouncements, fetchAffirmations, fetchNotifCount]);

  useEffect(() => {
    const fetchStudent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("student")
        .select("firstName, lastName")
        .eq("auth_id", user.id)
        .single();

      if (data)
        setStudentName({ firstName: data.firstName, lastName: data.lastName });
    };

    fetchStudent();
    fetchAnnouncements();
    fetchAffirmations();
  }, [fetchAnnouncements]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifCount();
    }, [fetchNotifCount]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <HamburgerMenu onClose={() => setIsMenuVisible(false)} />
          <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
            <View style={styles.clickableOverlay} />
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => setIsMenuVisible(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
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
              router.push("/notification");
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
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
            colors={["#0D2A94"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.welcomeText}>
          Welcome Back, {studentName.firstName} {studentName.lastName}!
        </Text>

        <View style={styles.carouselContainer}>
          <DashboardCarousel
            reloadKey={carouselKey}
            dotColor="#DCDFE3"
            activeDotColor="#0D2A94"
          />
        </View>

        <Text style={styles.sectionTitle}>Continue where you left off...</Text>
        <TouchableOpacity
          style={styles.continueCard}
          activeOpacity={0.7}
          onPress={() => router.push("/courses")}
        >
          <View style={styles.cardInfo}>
            <Text style={styles.sessionLabel}>Recorded Session</Text>
            <Text style={styles.courseTitle}>LET Express</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#2F459B" />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="bullhorn-outline"
              size={22}
              color="#2F459B"
            />
            <Text style={styles.cardTitle}>Announcements</Text>
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
                        marginTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: "#eee",
                        paddingTop: 10,
                      }
                    : {}
                }
              >
                <Text
                  style={[
                    styles.cardBody,
                    { fontWeight: "bold", color: "#0D2A94" },
                  ]}
                >
                  {a.title}
                </Text>
                <Text style={styles.cardBody}>{a.content}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-outline" size={22} color="#2F459B" />
            <Text style={styles.cardTitle}>Daily Affirmation</Text>
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
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/homepage")}
        >
          <Ionicons name="home" size={24} color="#FFB800" />
          <Text style={[styles.navText, { color: "#FFB800" }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/courses")}
        >
          <FontAwesome5 name="graduation-cap" size={20} color="#2F459B" />
          <Text style={styles.navText}>Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/calendar")}
        >
          <Ionicons name="calendar-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  clickableOverlay: {
    flex: 1,
  },
  header: {
    backgroundColor: "#0D2A94",
    height: Platform.OS === "ios" ? 60 : 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 20,
  },
  carouselContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 25,
  },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#F2F4F7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCDFE3",
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: { flexDirection: "row", justifyContent: "center", marginTop: 15 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DCDFE3",
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: "#000", width: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0D2A94",
    marginBottom: 15,
  },
  continueCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardInfo: { flex: 1 },
  sessionLabel: { fontSize: 14, color: "#7F8C8D", marginBottom: 2 },
  courseTitle: { fontSize: 16, fontWeight: "bold", color: "#2F459B" },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0D2A94",
    marginLeft: 10,
  },
  cardBody: { fontSize: 14, color: "#555", lineHeight: 20 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  navItem: { alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 12, marginTop: 4, color: "#2F459B", fontWeight: "500" },
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

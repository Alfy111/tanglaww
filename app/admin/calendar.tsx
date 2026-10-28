import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AdminHamburger from "./hamburger";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AdminCalendar() {
  const router = useRouter();

  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.getDate());

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  const [refresh, setRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: eventData } = await supabase
      .from("calendar_events")
      .select("*")
      .order("event_date", { ascending: true });

    const { data: todoData } = await supabase
      .from("admin_todo")
      .select("*")
      .eq("admin_id", user.id)
      .order("createdat", { ascending: true });

    setEvents(eventData ?? []);
    setTodos(todoData ?? []);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await fetchData();
    setRefresh(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleTodo = async (todo: any) => {
    const { error } = await supabase
      .from("admin_todo")
      .update({ iscompleted: !todo.iscompleted })
      .eq("id", todo.id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    fetchData();
  };

  const handleDeleteTodo = async (id: number) => {
    Alert.alert("Delete Task", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("admin_todo").delete().eq("id", id);
          fetchData();
        },
      },
    ]);
  };

  const handleDeleteEvent = async (id: number) => {
    Alert.alert(
      "Delete Event",
      "This will remove it from all students' calendars. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { data, error } = await supabase
              .from("calendar_events")
              .delete()
              .eq("event_id", id)
              .select();
            if (error) {
              Alert.alert("Error", `${error.message}\nCode: ${error.code}`);
              return;
            }
            setEventModalVisible(false);
            Alert.alert("Success", `Deleted ${data.length} event`);
            fetchData();
          },
        },
      ],
    );
  };

  const openEventModal = (event: any) => {
    setSelectedEvent(event);
    setEventModalVisible(true);
  };

  const handleTabChange = (tabName: string, index: number) => {
    setActiveTab(tabName);
    Animated.spring(tabSlideAnim, {
      toValue: index * (width / 2 - 20),
      useNativeDriver: false,
      friction: 10,
      tension: 50,
    }).start();
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const hasEvent = (day: number) =>
    events.some((e) => {
      const d = new Date(e.event_date);
      return (
        d.getDate() === day &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });

  const hasTodo = (day: number) =>
    todos.some((t) => {
      if (!t.duedate) return false;
      const d = new Date(t.duedate);
      return (
        d.getDate() === day &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={{ width: 28 }} />
      </View>

      <AdminHamburger
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={onRefresh}
            colors={["#2F459B"]}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth}>
            <Ionicons name="chevron-back" size={24} color="#2F459B" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {MONTHS[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={24} color="#2F459B" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {DAYS.map((day) => (
            <Text key={`label-${day}`} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
          {[...Array(offset)].map((_, i) => (
            <View key={`empty-${i}`} style={styles.dateBox} />
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const isSelected =
              day === selectedDate &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();
            const dayEvents = events.filter((e) => {
              const d = new Date(e.event_date);
              return (
                d.getDate() === day &&
                d.getMonth() === currentMonth &&
                d.getFullYear() === currentYear
              );
            });
            return (
              <TouchableOpacity
                key={`day-${currentYear}-${currentMonth}-${day}`}
                style={[styles.dateBox, isSelected && styles.selectedDate]}
                onPress={() => {
                  setSelectedDate(day);
                  if (dayEvents.length === 1) {
                    openEventModal(dayEvents[0]);
                  } else if (dayEvents.length > 1) {
                    openEventModal(dayEvents[0]);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.selectedDateText,
                  ]}
                >
                  {day}
                </Text>
                <View style={styles.dotRow}>
                  {hasEvent(day) && (
                    <View
                      style={[styles.calDot, { backgroundColor: "#2F459B" }]}
                    />
                  )}
                  {hasTodo(day) && (
                    <View
                      style={[styles.calDot, { backgroundColor: "#FFD75E" }]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.calDot, { backgroundColor: "#2F459B" }]} />
            <Text style={styles.legendText}>Event</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.calDot, { backgroundColor: "#FFD75E" }]} />
            <Text style={styles.legendText}>To Do</Text>
          </View>
        </View>

        <View style={styles.tabWrapper}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange("Upcoming", 0)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Upcoming" && styles.activeTabText,
                ]}
              >
                Upcoming Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabChange("ToDo", 1)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "ToDo" && styles.activeTabText,
                ]}
              >
                To Do List
              </Text>
            </TouchableOpacity>
          </View>
          <Animated.View
            style={[styles.underline, { left: tabSlideAnim, width: "50%" }]}
          />
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator color="#2F459B" />
          ) : activeTab === "Upcoming" ? (
            events.length === 0 ? (
              <Text style={styles.emptyText}>
                No upcoming events yet. Tap + to add one!
              </Text>
            ) : (
              events.map((event) => (
                <TouchableOpacity
                  key={event.event_id}
                  style={styles.eventCard}
                  onPress={() => openEventModal(event)}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.description && (
                      <Text style={styles.eventDesc} numberOfLines={1}>
                        {event.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.eventRight}>
                    <View style={styles.eventDateTime}>
                      <Text style={styles.eventDate}>
                        {formatDate(event.event_date)}
                      </Text>
                      <Text style={styles.eventTime}>
                        {formatTime(event.event_date)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.event_id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#e74c3c"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : todos.length === 0 ? (
            <Text style={styles.emptyText}>
              No tasks yet. Tap + to add one!
            </Text>
          ) : (
            todos.map((todo) => (
              <View
                key={todo.id}
                style={[styles.todoCard, todo.iscompleted && { opacity: 0.6 }]}
              >
                <TouchableOpacity onPress={() => handleToggleTodo(todo)}>
                  <Ionicons
                    name={todo.iscompleted ? "checkbox" : "square-outline"}
                    size={24}
                    color="#2F459B"
                  />
                </TouchableOpacity>
                <View style={styles.todoTextContainer}>
                  <Text
                    style={[
                      styles.todoTitle,
                      todo.iscompleted && {
                        textDecorationLine: "line-through",
                        color: "#999",
                      },
                    ]}
                  >
                    {todo.title}
                  </Text>
                  {todo.description && (
                    <Text style={styles.eventDesc} numberOfLines={1}>
                      {todo.description}
                    </Text>
                  )}
                  {todo.duedate && (
                    <Text style={styles.todoDate}>
                      {formatDate(todo.duedate)} {formatTime(todo.duedate)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteTodo(todo.id)}>
                  <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (activeTab === "Upcoming") router.push("/admin/add-event" as any);
          else router.push("/admin/todo" as any);
        }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/dashboard")}
        >
          <Ionicons name="home-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/courses")}
        >
          <Ionicons name="school-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#FFD75E" />
          <Text style={[styles.navText, { color: "#FFD75E" }]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/approval")}
        >
          <Ionicons name="person-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Approvals</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={eventModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEventModalVisible(false)}
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
              <Text style={styles.eventModalTitle}>{selectedEvent?.title}</Text>

              <TouchableOpacity
                onPress={() => setEventModalVisible(false)}
                style={{ marginLeft: "auto" }}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <View style={styles.eventModalRow}>
              <Ionicons name="time-outline" size={16} color="#2F459B" />
              <Text style={styles.eventModalMeta}>
                {selectedEvent ? formatDate(selectedEvent.event_date) : ""} ·{" "}
                {selectedEvent ? formatTime(selectedEvent.event_date) : ""}
              </Text>
            </View>

            {selectedEvent?.description && (
              <View style={styles.eventModalDescBox}>
                <Text style={styles.eventModalDescLabel}>Description</Text>
                <Text style={styles.eventModalDesc}>
                  {selectedEvent.description}
                </Text>
              </View>
            )}

            {selectedEvent?.link && (
              <TouchableOpacity
                style={styles.eventModalLinkBtn}
                onPress={() => Linking.openURL(selectedEvent.link)}
              >
                <Ionicons name="link-outline" size={16} color="#2F459B" />
                <Text style={styles.eventModalLinkText} numberOfLines={1}>
                  {selectedEvent.link}
                </Text>
                <Ionicons name="open-outline" size={14} color="#2F459B" />
              </TouchableOpacity>
            )}

            <View style={styles.eventModalActions}>
              <TouchableOpacity
                style={styles.eventModalDeleteBtn}
                onPress={() => handleDeleteEvent(selectedEvent?.event_id)}
              >
                <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                <Text style={styles.eventModalDeleteText}>Delete Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.eventModalCloseBtn}
                onPress={() => setEventModalVisible(false)}
              >
                <Text style={styles.eventModalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
  scrollContent: { paddingBottom: 120 },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 25,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F459B",
    marginHorizontal: 40,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  dayLabel: {
    width: "14.28%",
    textAlign: "center",
    color: "#BDC3C7",
    fontSize: 13,
    marginBottom: 15,
    fontWeight: "500",
  },
  dateBox: {
    width: "14.28%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  dateText: { color: "#2F459B", fontSize: 15 },
  selectedDate: { backgroundColor: "#FFD75E", borderRadius: 25 },
  selectedDateText: { fontWeight: "bold", color: "#2F459B" },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 15,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 11, color: "#666" },
  tabWrapper: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#FFD75E",
    borderRadius: 12,
    height: 50,
    position: "relative",
  },
  tabContainer: { flexDirection: "row", width: "100%", height: "100%" },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 4,
    backgroundColor: "white",
    borderRadius: 2,
  },
  tabText: { fontWeight: "bold", color: "rgba(47, 69, 155, 0.6)" },
  activeTabText: { color: "#2F459B" },
  listContainer: { padding: 20 },
  emptyText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 12,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: "bold", color: "#444" },
  eventDesc: { fontSize: 12, color: "#777", marginTop: 3 },
  eventRight: { alignItems: "flex-end", justifyContent: "space-between" },
  eventDateTime: { alignItems: "flex-end" },
  eventDate: { fontSize: 12, fontWeight: "bold", color: "#7F8C8D" },
  eventTime: { fontSize: 12, color: "#95A5A6" },
  todoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    marginBottom: 12,
    gap: 10,
  },
  todoTextContainer: { flex: 1 },
  todoTitle: { fontSize: 16, fontWeight: "bold", color: "#444" },
  todoDate: { fontSize: 12, color: "#95A5A6", marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#FFD75E",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    position: "relative",
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
    marginBottom: 3,
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
  eventModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  eventModalDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e74c3c",
    gap: 6,
  },
  eventModalDeleteText: { fontSize: 13, color: "#e74c3c", fontWeight: "600" },
  eventModalCloseBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2F459B",
    alignItems: "center",
  },
  eventModalCloseBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});

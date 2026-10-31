import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DiagnosticCard from "../../components/DiagnosticCard";
import { supabase } from "../../lib/supabase";
import { getModulesByCourse } from "../../services/materialService";
import AdminHamburger from "./hamburger";

interface Module {
  module_id: number;
  moduleName: string;
}

interface Course {
  course_id: number;
  courseName: string;
  instructor: string | null;
  modules: Module[];
}

const courseImages: Record<number, any> = {
  1: require("../../assets/images/let-on-boarding.jpg"),
  2: require("../../assets/images/let-express.jpg"),
  3: require("../../assets/images/let-advanced.jpg"),
  4: require("../../assets/images/integrative.jpg"),
  5: require("../../assets/images/final-coaching.jpg"),
  6: require("../../assets/images/test-highlights.jpg"),
};

const CourseCard = React.memo(
  ({
    course,
    expandedCourse,
    toggleExpand,
    router,
  }: {
    course: Course;
    expandedCourse: number | null;
    toggleExpand: (id: number) => void;
    router: any;
  }) => {
    const isExpanded = expandedCourse === course.course_id;
    const primaryModule = course.modules[0] ?? null;

    const navigateTo = (
      screen: "handout" | "recorded-sessions" | "quiz" | "session-links",
    ) => {
      if (screen === "handout" || screen === "recorded-sessions") {
        if (!primaryModule) {
          return;
        }
        router.push({
          pathname: `/materials/${screen}` as any,
          params: {
            moduleId: String(primaryModule.module_id),
            courseTitle: course.courseName,
          },
        });
      } else {
        router.push({
          pathname: `/materials/${screen}` as any,
          params: {
            courseId: String(course.course_id),
            courseTitle: course.courseName,
          },
        });
      }
    };

    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.courseCard}
          onPress={() => toggleExpand(course.course_id)}
        >
          <View style={styles.imagePlaceholder}>
            {courseImages[course.course_id] ? (
              <Image
                source={courseImages[course.course_id]}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={40} color="#CCC" />
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.courseName}</Text>
              <Text style={styles.instructorText}>
                {course.instructor ?? "—"}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#2F459B"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dropdownContent}>
            <TouchableOpacity
              style={styles.dropItem}
              onPress={() => navigateTo("handout")}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#2F459B"
              />
              <Text style={styles.dropText}>Learning Modules</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropItem}
              onPress={() => navigateTo("recorded-sessions")}
            >
              <Ionicons name="videocam-outline" size={20} color="#2F459B" />
              <Text style={styles.dropText}>Recorded Sessions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropItem}
              onPress={() => navigateTo("quiz")}
            >
              <Ionicons name="bulb-outline" size={20} color="#2F459B" />
              <Text style={styles.dropText}>Quiz</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropItem, { borderBottomWidth: 0 }]}
              onPress={() => navigateTo("session-links")}
            >
              <Ionicons name="share-outline" size={20} color="#2F459B" />
              <Text style={styles.dropText}>Online Session Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  },
);

export default function AdminCourses() {
  const router = useRouter();
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("course")
      .select("course_id, courseName, instructor")
      .order("course_id");

    if (error) {
      setLoading(false);
      return;
    }

    const coursesWithModules = await Promise.all(
      (data ?? []).map(async (c) => {
        const modules = await getModulesByCourse(c.course_id);
        return { ...c, modules };
      }),
    );

    setCourses(coursesWithModules);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await fetchCourses();
    setRefresh(false);
  }, []);

  const toggleExpand = useCallback((courseId: number) => {
    setExpandedCourse((prev) => (prev === courseId ? null : courseId));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Courses</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/admin/analytics" as any)}
          activeOpacity={0.7}
          style={styles.analyticsButton}
        >
          <MaterialCommunityIcons name="chart-bar" size={26} color="black" />
        </TouchableOpacity>
      </View>

      <AdminHamburger
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2F459B" />
        </View>
      ) : (
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
          <DiagnosticCard isAdmin />
          {courses.map((course) => (
            <CourseCard
              key={course.course_id}
              course={course}
              expandedCourse={expandedCourse}
              toggleExpand={toggleExpand}
              router={router}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/admin/dashboard")}
        >
          <Ionicons name="home-outline" size={24} color="#2F459B" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="school-outline" size={24} color="#FFD75E" />
          <Text style={[styles.navText, { color: "#FFD75E" }]}>Courses</Text>
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
  headerLeft: { flexDirection: "row", alignItems: "center" },
  analyticsButton: { padding: 6, borderRadius: 8 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "black",
    marginLeft: 20,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  courseCard: { backgroundColor: "white" },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  cardFooter: { padding: 15, flexDirection: "row", alignItems: "center" },
  courseTitle: { fontSize: 16, fontWeight: "bold", color: "black" },
  instructorText: { fontSize: 13, color: "#777", marginTop: 2 },
  dropdownContent: {
    backgroundColor: "#F0F2F8",
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  dropItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  dropText: {
    fontSize: 14,
    color: "#2F459B",
    fontWeight: "500",
    marginLeft: 15,
    textDecorationLine: "underline",
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
});

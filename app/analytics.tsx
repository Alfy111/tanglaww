import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BarRow,
  C,
  Card,
  Chips,
  ColumnChart,
  EmptyNote,
  Header,
  pct,
  ScoreStat,
  shortDate,
  Tabs,
} from "../components/analytics-ui";
import { useAdmin } from "../context/AdminContext";
import { getMyAnalytics, StudentReport } from "../services/analyticsService";

const isTablet = Dimensions.get("window").width >= 600;

export default function StudentAnalytics() {
  const router = useRouter();
  const { isAdmin, authLoading } = useAdmin();
  const [tab, setTab] = useState<"overview" | "course">("overview");
  const [data, setData] = useState<StudentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [courseId, setCourseId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && isAdmin) router.replace("/admin-analytics" as any);
  }, [authLoading, isAdmin, router]);

  const load = useCallback(async () => {
    if (authLoading || isAdmin) return;
    try {
      const report = await getMyAnalytics();
      setData(report);
      setError(null);
      setCourseId((prev) => prev ?? report.courses[0]?.course_id ?? null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [authLoading, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const course = data?.courses.find((c) => c.course_id === courseId) ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Performance" onBack={() => router.back()} />
      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "course", label: "By Course" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {!data && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
            />
          }
        >
          {tab === "overview" && (
            <View>
              <Card
                title="Road to LPT Passer"
                subtitle="Your progress across all courses"
                right={
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={24}
                    color={C.yellow}
                  />
                }
              >
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${data.summary.completion ?? 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {pct(data.summary.completion ?? 0)}
                  </Text>
                </View>
              </Card>

              <View style={styles.grid}>
                <Card style={[styles.gridHalf, styles.centerCard]}>
                  <ScoreStat
                    label="Average Score"
                    value={data.summary.avgScore}
                    note={`${data.summary.quizzesTaken} ${data.summary.quizzesTaken === 1 ? "quiz" : "quizzes"}`}
                  />
                </Card>
                <View style={styles.gridHalf}>
                  <Card style={styles.miniCard}>
                    <Text style={styles.metricLabel}>Completed Courses</Text>
                    <Text style={styles.bigValue}>
                      {data.summary.completedCourses} /{" "}
                      {data.summary.totalCourses}
                    </Text>
                  </Card>
                  <Card style={styles.miniCard}>
                    <Text style={styles.metricLabel}>Review Frequency</Text>
                    <Text style={styles.freqText}>
                      Active{" "}
                      <Text style={{ color: C.primary, fontWeight: "bold" }}>
                        {data.summary.activeDays}{" "}
                        {data.summary.activeDays === 1 ? "day" : "days"}
                      </Text>{" "}
                      this week
                    </Text>
                  </Card>
                </View>
              </View>

              <Card title="Overall Performance by Course">
                {data.courses.map((c) => (
                  <BarRow
                    key={c.course_id}
                    label={c.courseName}
                    value={c.percent}
                  />
                ))}
              </Card>

              <Card title="Recent Quiz Results">
                {data.recent.length === 0 ? (
                  <EmptyNote text="No quizzes taken yet." />
                ) : (
                  <>
                    <View style={styles.thRow}>
                      <Text style={[styles.th, { flex: 2 }]}>Course</Text>
                      <Text style={[styles.th, { flex: 1.8 }]}>Quiz Title</Text>
                      <Text
                        style={[styles.th, { flex: 1, textAlign: "center" }]}
                      >
                        Grade
                      </Text>
                      <Text
                        style={[styles.th, { flex: 1.4, textAlign: "right" }]}
                      >
                        Date Taken
                      </Text>
                    </View>
                    {data.recent.map((q, i) => (
                      <View key={i} style={styles.tdRow}>
                        <Text
                          style={[styles.td, { flex: 2, color: C.primary }]}
                          numberOfLines={1}
                        >
                          {q.courseName}
                        </Text>
                        <Text
                          style={[styles.td, { flex: 1.8 }]}
                          numberOfLines={1}
                        >
                          {q.title}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            {
                              flex: 1,
                              textAlign: "center",
                              fontWeight: "bold",
                              color: C.primary,
                            },
                          ]}
                        >
                          {pct(q.pct)}
                        </Text>
                        <Text
                          style={[
                            styles.td,
                            { flex: 1.4, textAlign: "right", color: C.sub },
                          ]}
                        >
                          {shortDate(q.date)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </Card>

              <Card title="Focus Next" subtitle="Your weakest topics so far">
                {data.focus.length === 0 ? (
                  <EmptyNote
                    text={
                      data.topics.length === 0
                        ? "Take a quiz to see your strengths and weak areas."
                        : "Great work! No topic is below 75%."
                    }
                  />
                ) : (
                  data.focus.map((t) => (
                    <BarRow
                      key={t.topicName}
                      label={t.topicName}
                      value={t.mastery}
                      note={t.majorName ?? undefined}
                    />
                  ))
                )}
              </Card>
            </View>
          )}

          {tab === "course" && (
            <View>
              <Chips
                items={data.courses.map((c) => ({
                  id: c.course_id,
                  label: c.courseName,
                }))}
                selected={courseId}
                onSelect={setCourseId}
              />

              {course && (
                <View style={isTablet ? styles.tabletWrap : null}>
                  <View style={isTablet ? styles.tabletCol : null}>
                    <Card
                      title={`${course.courseName} Performance Trend`}
                      subtitle="Your latest score per quiz"
                    >
                      {course.quizzes.length === 0 ? (
                        <EmptyNote text="No quizzes taken in this course yet." />
                      ) : (
                        <>
                          <ColumnChart
                            values={course.quizzes.map((q) => q.pct)}
                            labels={course.quizzes.map((_, i) => `Q${i + 1}`)}
                          />
                          {course.quizzes.map((q, i) => (
                            <Text
                              key={i}
                              style={styles.legend}
                              numberOfLines={1}
                            >
                              Q{i + 1} · {q.title}
                              {q.attempts > 1
                                ? `  (${q.attempts} attempts)`
                                : ""}
                            </Text>
                          ))}
                        </>
                      )}
                    </Card>
                  </View>

                  <View style={isTablet ? styles.tabletCol : null}>
                    <Card
                      title="Topics Needing Review"
                      subtitle="Lowest scores first"
                    >
                      {course.topics.length === 0 ? (
                        <EmptyNote text="Topic results appear after your first quiz in this course." />
                      ) : (
                        course.topics.map((t) => (
                          <BarRow
                            key={t.topicName}
                            label={t.topicName}
                            value={t.mastery}
                          />
                        ))
                      )}
                    </Card>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorText: { color: C.red, textAlign: "center" },
  scroll: { padding: isTablet ? 24 : 16, paddingBottom: 40 },
  tabletWrap: { flexDirection: "row", justifyContent: "space-between" },
  tabletCol: { width: "49%" },

  progressRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.primary, borderRadius: 5 },
  progressText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "700",
    color: C.primary,
  },

  grid: { flexDirection: "row", justifyContent: "space-between" },
  gridHalf: { width: "48%" },
  centerCard: { alignItems: "center", justifyContent: "center" },
  miniCard: { justifyContent: "center", paddingVertical: 10, marginBottom: 12 },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.sub,
    marginBottom: 4,
  },
  bigValue: { fontSize: 20, fontWeight: "700", color: C.primary, marginTop: 2 },
  freqText: { fontSize: 12, color: C.sub },
  smallNote: { fontSize: 11, color: C.sub, marginTop: 6 },

  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.track,
    paddingBottom: 8,
    marginBottom: 8,
  },
  th: { fontSize: 11, fontWeight: "700", color: "#95A5A6" },
  tdRow: {
    flexDirection: "row",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
    alignItems: "center",
  },
  td: { fontSize: 12, color: "#34495E" },

  legend: { fontSize: 11, color: C.sub, marginTop: 4 },
});

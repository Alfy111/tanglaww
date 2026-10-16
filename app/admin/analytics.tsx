import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    BarRow,
    C,
    Card,
    Chips,
    Dropdown,
    EmptyNote,
    Header,
    Histogram,
    pct,
    scoreColor,
    ScoreStat,
    shortDate,
    StatTile,
    Tabs,
} from "../../components/analytics-ui";
import { useAdmin } from "../../context/AdminContext";
import {
    AdminCourse,
    AdminOverview,
    getAdminCourse,
    getAdminOverview,
    getAdminRankings,
    getAdminStudents,
    getStudentReport,
    RankingRow,
    setDiagnosticAssessment,
    StudentListItem,
    StudentReport,
} from "../../services/analyticsService";

type TabKey = "overview" | "course" | "student";

export default function AdminAnalytics() {
  const router = useRouter();
  const { isAdmin, authLoading } = useAdmin();
  const [tab, setTab] = useState<TabKey>("overview");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [rankKey, setRankKey] = useState<number | "overall">("overall");
  const [rankings, setRankings] = useState<RankingRow[] | null>(null);
  const [showAllRanks, setShowAllRanks] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [showAllQ, setShowAllQ] = useState(false);
  const [openQ, setOpenQ] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    if (authLoading || !isAdmin) return;
    try {
      const [o, list] = await Promise.all([
        getAdminOverview(),
        getAdminStudents(),
      ]);
      setOverview(o);
      setStudents(list);
      setCourseId((prev) => prev ?? o.courses[0]?.course_id ?? null);
      setStudentId((prev) => {
        if (prev) return prev;
        const ranked = list
          .filter((s) => s.avgScore != null)
          .sort((a, b) => (a.avgScore ?? 0) - (b.avgScore ?? 0));
        return ranked[0]?.id ?? list[0]?.id ?? null;
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [authLoading, isAdmin]);

  const loadCourse = useCallback(async (id: number) => {
    setBusy(true);
    try {
      const data = await getAdminCourse(id);
      setCourse(data);
      setQuizId((prev) =>
        data.quizzes.some((q) => q.assessment_id === prev)
          ? prev
          : (data.quizzes[0]?.assessment_id ?? null),
      );
      setShowAllQ(false);
      setOpenQ(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadStudent = useCallback(async (id: number) => {
    setBusy(true);
    try {
      setReport(await getStudentReport(id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBase();
    }, [loadBase]),
  );

  useEffect(() => {
    if (tab !== "overview" || authLoading || !isAdmin) return;
    let active = true;
    setRankings(null);
    getAdminRankings(rankKey === "overall" ? null : rankKey)
      .then((rows) => active && setRankings(rows))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [tab, rankKey, authLoading, isAdmin]);

  useEffect(() => {
    if (tab === "course" && courseId) loadCourse(courseId);
  }, [tab, courseId, loadCourse]);

  useEffect(() => {
    if (tab === "student" && studentId) loadStudent(studentId);
  }, [tab, studentId, loadStudent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBase();
    if (tab === "course" && courseId) await loadCourse(courseId);
    if (tab === "student" && studentId) await loadStudent(studentId);
    setRefreshing(false);
  };

  const selectedStudent = students.find((s) => s.id === studentId);

  const quizAll = (course?.questions ?? []).filter(
    (q) => q.assessment_id === quizId,
  );
  const quizQuestions = quizAll.filter(
    (q) => q.correct / Math.max(1, q.examinees) < 0.5,
  );
  const shownQuestions = showAllQ ? quizQuestions : quizQuestions.slice(0, 10);
  const atRisk = students
    .filter(
      (st) => st.earlyWarning || (st.avgScore != null && st.avgScore < 60),
    )
    .sort(
      (a, b) =>
        Number(b.earlyWarning) - Number(a.earlyWarning) ||
        (a.avgScore ?? 0) - (b.avgScore ?? 0),
    );

  const chooseDiagnostic = async (id: number) => {
    try {
      await setDiagnosticAssessment(id);
      await loadBase();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const shownRanks = rankings
    ? showAllRanks
      ? rankings
      : rankings.slice(0, 10)
    : [];

  if (!authLoading && !isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Analytics" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>This page is for admins only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Analytics" onBack={() => router.back()} />
      <Tabs<TabKey>
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "course", label: "By Course" },
          { key: "student", label: "By Student" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {!overview && !error ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : error && !overview ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : overview ? (
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
            <>
              <View style={styles.row3}>
                <Card style={styles.tile}>
                  <Text style={styles.metricLabel}>Total Students</Text>
                  <Text style={styles.bigValue}>
                    {overview.summary.totalStudents}
                  </Text>
                  <Text style={styles.smallNote}>
                    {overview.summary.activeStudents} active
                  </Text>
                </Card>
                <Card style={styles.tile}>
                  <ScoreStat
                    label="Average Score"
                    value={overview.summary.avgScore}
                  />
                </Card>
                <Card style={styles.tile}>
                  <ScoreStat
                    label="Pass Rate"
                    value={overview.summary.passRate}
                  />
                </Card>
              </View>

              <Card
                title="Score Distribution"
                subtitle={`Latest result of each student per quiz (${overview.distribution.count} results)`}
              >
                {overview.distribution.count === 0 ? (
                  <EmptyNote text="No quiz results yet." />
                ) : (
                  <>
                    <View style={styles.statRow}>
                      <StatTile
                        label="Average"
                        value={pct(overview.distribution.average)}
                      />
                      <StatTile
                        label="Median"
                        value={pct(overview.distribution.median)}
                      />
                      <StatTile
                        label="Range"
                        value={`${pct(overview.distribution.min)} – ${pct(overview.distribution.max)}`}
                      />
                    </View>
                    <Histogram bins={overview.distribution.bins} />
                  </>
                )}
              </Card>

              <Card
                title="Student Ranking"
                subtitle={
                  rankKey === "overall"
                    ? "Average of each student's latest quiz results"
                    : "Based on each student's first attempt"
                }
              >
                <Dropdown<number | "overall">
                  title="Rank by"
                  value={rankKey}
                  options={[
                    { key: "overall", label: "Overall performance" },
                    ...overview.assessments.map((a) => ({
                      key: a.assessment_id,
                      label: a.title,
                      sub: a.courseName,
                    })),
                  ]}
                  onChange={(k) => {
                    setRankKey(k);
                    setShowAllRanks(false);
                  }}
                />
                {rankings === null ? (
                  <ActivityIndicator
                    color={C.primary}
                    style={{ marginVertical: 12 }}
                  />
                ) : rankings.length === 0 ? (
                  <EmptyNote text="No results yet." />
                ) : (
                  <>
                    <View style={styles.thRow}>
                      <Text style={[styles.th, { width: 34 }]}>#</Text>
                      <Text style={[styles.th, { flex: 1 }]}>Student</Text>
                      <Text
                        style={[styles.th, { width: 60, textAlign: "right" }]}
                      >
                        Score
                      </Text>
                    </View>
                    {shownRanks.map((r, i) => (
                      <View key={i} style={styles.tdRow}>
                        <Text
                          style={[
                            styles.td,
                            styles.rankNo,
                            r.rank <= 3 && { color: C.primary },
                          ]}
                        >
                          {r.rank}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.td} numberOfLines={1}>
                            {r.name}
                          </Text>
                          {r.quizzes != null && (
                            <Text style={styles.smallNote}>
                              {r.quizzes} {r.quizzes === 1 ? "quiz" : "quizzes"}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.td,
                            styles.rankScore,
                            { color: C.primary },
                          ]}
                        >
                          {pct(r.pct)}
                        </Text>
                      </View>
                    ))}
                    {rankings.length > 10 && (
                      <TouchableOpacity
                        onPress={() => setShowAllRanks((v) => !v)}
                      >
                        <Text style={styles.link}>
                          {showAllRanks
                            ? "Show top 10"
                            : `Show all ${rankings.length} students`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </Card>

              <Card
                title="Diagnostic Exam: Current vs Past Cohort Average"
                subtitle="This batch compared with the past batch"
              >
                <Dropdown<number>
                  title="Tap to select a diagnostic exam"
                  value={overview.diagnostic.assessment_id}
                  options={overview.assessments.map((a) => ({
                    key: a.assessment_id,
                    label: a.title,
                    sub: a.courseName,
                  }))}
                  onChange={chooseDiagnostic}
                />
                {overview.diagnostic.assessment_id == null ? (
                  <EmptyNote text="Choose the diagnostic quiz to see the comparison and early warnings." />
                ) : (
                  <>
                    <View style={styles.compareRow}>
                      <View style={styles.compareBox}>
                        <Text style={styles.metricLabel}>This batch</Text>
                        <Text style={styles.bigValue}>
                          {pct(overview.diagnostic.currentAvg)}
                        </Text>
                        <Text style={styles.smallNote}>
                          {overview.diagnostic.currentCount}{" "}
                          {overview.diagnostic.currentCount === 1
                            ? "reviewee"
                            : "reviewees"}
                        </Text>
                      </View>
                      <View style={styles.compareBox}>
                        <Text style={styles.metricLabel}>Past batch</Text>
                        <Text style={[styles.bigValue, { color: C.sub }]}>
                          {pct(overview.diagnostic.pastAvg)}
                        </Text>
                        <Text style={styles.smallNote}>
                          Google Forms results
                        </Text>
                      </View>
                    </View>
                    {overview.diagnostic.currentAvg != null &&
                      overview.diagnostic.pastAvg != null && (
                        <Text style={styles.compareNote}>
                          {overview.diagnostic.currentAvg >=
                          overview.diagnostic.pastAvg
                            ? `${(overview.diagnostic.currentAvg - overview.diagnostic.pastAvg).toFixed(1)} points higher than the past batch`
                            : `${(overview.diagnostic.pastAvg - overview.diagnostic.currentAvg).toFixed(1)} points lower than the past batch`}
                        </Text>
                      )}
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        <Text style={{ fontWeight: "700" }}>
                          Early warning: {overview.diagnostic.flagged}{" "}
                          {overview.diagnostic.flagged === 1
                            ? "reviewee"
                            : "reviewees"}
                        </Text>{" "}
                        scored below {overview.diagnostic.cutoff}%. Past
                        reviewees who scored below {overview.diagnostic.cutoff}%
                        mostly did not reach 75% in Prof Ed final coaching.
                      </Text>
                    </View>
                  </>
                )}
              </Card>

              <Card
                title="At-Risk Students"
                subtitle="Students with an average below 60%. Tap for details."
              >
                {atRisk.length === 0 ? (
                  <EmptyNote text="No students at risk right now." />
                ) : (
                  <>
                    <View style={styles.thRow}>
                      <Text style={[styles.th, { flex: 1 }]}>Student</Text>
                      <Text
                        style={[styles.th, { width: 64, textAlign: "right" }]}
                      >
                        Average
                      </Text>
                      <Text
                        style={[styles.th, { width: 76, textAlign: "right" }]}
                      >
                        Completion
                      </Text>
                    </View>
                    {atRisk.map((st) => (
                      <TouchableOpacity
                        key={st.id}
                        style={styles.tdRow}
                        onPress={() => {
                          setStudentId(st.id);
                          setTab("student");
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.td, { color: C.primary }]}
                            numberOfLines={1}
                          >
                            {st.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.td,
                            {
                              width: 64,
                              textAlign: "right",
                              fontWeight: "700",
                              color: C.primary,
                            },
                          ]}
                        >
                          {pct(st.avgScore)}
                        </Text>
                        <Text
                          style={[styles.td, { width: 76, textAlign: "right" }]}
                        >
                          {pct(st.completion)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </Card>

              <Card
                title="Completion Rate by Course"
                subtitle="Average progress of all students"
              >
                {overview.courses.map((c) => (
                  <BarRow
                    key={c.course_id}
                    label={c.courseName}
                    value={c.completion}
                    color={C.primary}
                    note={c.finished > 0 ? `${c.finished} finished` : undefined}
                  />
                ))}
              </Card>

              <Card
                title="Material Engagement"
                subtitle="Share of students who opened/completed each material"
              >
                {overview.engagement.map((e) => (
                  <View key={e.label} style={{ marginBottom: 6 }}>
                    <Text style={styles.engTitle}>
                      {e.label}{" "}
                      <Text style={styles.smallNote}>({e.materials})</Text>
                    </Text>
                    <BarRow label="Opened" value={e.opened} color={C.primary} />
                    <BarRow
                      label="Completed"
                      value={e.completed}
                      color={C.green}
                    />
                  </View>
                ))}
              </Card>
            </>
          )}

          {tab === "course" && (
            <>
              <Chips
                items={overview.courses.map((c) => ({
                  id: c.course_id,
                  label: c.courseName,
                }))}
                selected={courseId}
                onSelect={setCourseId}
              />

              {busy || !course ? (
                <ActivityIndicator
                  style={{ marginTop: 40 }}
                  color={C.primary}
                />
              ) : (
                <>
                  <Card
                    title="Quiz Breakdown"
                    subtitle="Based on each student's latest attempt"
                  >
                    {course.quizzes.length === 0 ? (
                      <EmptyNote text="No quizzes in this course yet." />
                    ) : (
                      <>
                        <View style={styles.thRow}>
                          <Text style={[styles.th, { flex: 2.4 }]}>Quiz</Text>
                          <Text style={[styles.th, styles.num]}>Average</Text>
                          <Text style={[styles.th, styles.num]}>Takers</Text>
                          <Text style={[styles.th, styles.num]}>Passed</Text>
                        </View>
                        {course.quizzes.map((q, i) => (
                          <View key={i} style={styles.tdRow}>
                            <Text
                              style={[
                                styles.td,
                                { flex: 2.4, color: C.primary },
                              ]}
                              numberOfLines={2}
                            >
                              {q.title}
                            </Text>
                            <Text
                              style={[
                                styles.td,
                                styles.num,
                                {
                                  fontWeight: "700",
                                  color: C.primary,
                                },
                              ]}
                            >
                              {pct(q.avgScore)}
                            </Text>
                            <Text style={[styles.td, styles.num]}>
                              {q.takers}
                            </Text>
                            <Text style={[styles.td, styles.num]}>
                              {pct(q.passRate)}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </Card>

                  <Card
                    title="Weak Topics"
                    subtitle="Reteach first: lowest mastery and most students below 60%"
                  >
                    {course.weakTopics.length === 0 ? (
                      <EmptyNote text="Topic results appear once students take tagged quizzes." />
                    ) : (
                      course.weakTopics
                        .slice(0, 6)
                        .map((t) => (
                          <BarRow
                            key={t.topicName}
                            label={t.topicName}
                            value={t.mastery}
                            note={`${t.weakShare}% of ${t.students} students below 60%`}
                          />
                        ))
                    )}
                  </Card>

                  <Card
                    title="Frequently Missed Questions"
                    subtitle="Less than 50% correct on the first attempt. Tap for details"
                  >
                    {course.quizzes.length === 0 ? (
                      <EmptyNote text="No quizzes in this course yet." />
                    ) : (
                      <>
                        <Dropdown<number>
                          title="Select a quiz"
                          value={quizId}
                          options={course.quizzes.map((q) => ({
                            key: q.assessment_id,
                            label: q.title,
                          }))}
                          onChange={(id) => {
                            setQuizId(id);
                            setShowAllQ(false);
                            setOpenQ(null);
                          }}
                        />
                        {quizQuestions.length === 0 ? (
                          <EmptyNote
                            text={
                              quizAll.length === 0
                                ? "No answers for this quiz yet."
                                : "No question had less than 50% correct responses."
                            }
                          />
                        ) : (
                          <>
                            <View style={styles.qHead}>
                              <Text style={styles.qHeadText}>Question</Text>
                              <Text style={styles.qHeadText}>
                                Correct responses
                              </Text>
                            </View>
                            {shownQuestions.map((m) => {
                              const key = `${m.assessment_id}-${m.number}-${m.question}`;
                              const open = openQ === key;
                              const low =
                                m.correct / Math.max(1, m.examinees) <= 0.5;
                              return (
                                <TouchableOpacity
                                  key={key}
                                  style={styles.qRow}
                                  activeOpacity={0.7}
                                  onPress={() => setOpenQ(open ? null : key)}
                                >
                                  <View style={styles.qTop}>
                                    <Text style={styles.qText}>
                                      {m.number}.{"  "}
                                      {m.question}
                                    </Text>
                                    <Text style={styles.qScore}>
                                      <Text
                                        style={{
                                          color: low ? "#D93025" : C.text,
                                        }}
                                      >
                                        {m.correct}
                                      </Text>{" "}
                                      / {m.examinees}
                                    </Text>
                                  </View>

                                  {open && (
                                    <View style={styles.qDetails}>
                                      <Text style={styles.smallNote}>
                                        {Math.round(m.difficulty * 100)}%
                                        answered correctly
                                        {m.topicName ? ` · ${m.topicName}` : ""}
                                      </Text>
                                      {m.topWrong && (
                                        <Text style={styles.qWrong}>
                                          Most chosen wrong answer: "
                                          {m.topWrong}" ({m.topWrongShare}%)
                                        </Text>
                                      )}
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                            {quizQuestions.length > 10 && (
                              <TouchableOpacity
                                onPress={() => setShowAllQ((v) => !v)}
                              >
                                <Text style={styles.link}>
                                  {showAllQ
                                    ? "Show fewer"
                                    : `Show all ${quizQuestions.length} questions`}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </Card>
                </>
              )}
            </>
          )}

          {tab === "student" && (
            <>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.pickerText} numberOfLines={1}>
                  {selectedStudent?.name ?? "Select a student"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={C.sub} />
              </TouchableOpacity>

              {busy || !report ? (
                <ActivityIndicator
                  style={{ marginTop: 40 }}
                  color={C.primary}
                />
              ) : (
                <>
                  <Card style={styles.profile}>
                    {report.student?.photo ? (
                      <Image
                        source={{ uri: report.student.photo }}
                        style={styles.avatar}
                      />
                    ) : (
                      <Ionicons
                        name="person-circle-outline"
                        size={72}
                        color={C.primary}
                      />
                    )}
                    <Text style={styles.profileName}>
                      {report.student?.name}
                    </Text>
                    {report.student?.degree && (
                      <Text style={styles.profileSub}>
                        {report.student.degree}
                      </Text>
                    )}
                    {report.student?.majorship && (
                      <Text style={styles.profileSub}>
                        Major: {report.student.majorship}
                      </Text>
                    )}
                  </Card>

                  {selectedStudent?.earlyWarning && (
                    <View
                      style={[
                        styles.warningBox,
                        { marginTop: 0, marginBottom: 16 },
                      ]}
                    >
                      <Text style={styles.warningText}>
                        <Text style={{ fontWeight: "700" }}>
                          Early warning:
                        </Text>{" "}
                        Reviewee scored {pct(selectedStudent.diagnosticScore)}{" "}
                        on the diagnostic, below {overview.diagnostic.cutoff}%.
                        They may not reach 75% in Prof Ed final coaching without
                        extra support.
                      </Text>
                    </View>
                  )}

                  <View style={styles.row3}>
                    <Card style={styles.tile}>
                      <ScoreStat
                        label="Average Score"
                        value={report.summary.avgScore}
                      />
                    </Card>
                    <Card style={styles.tile}>
                      <ScoreStat
                        label="Completion"
                        value={report.summary.completion}
                        color={C.primary}
                      />
                    </Card>
                    <Card style={styles.tile}>
                      <Text style={styles.metricLabel}>Quizzes</Text>
                      <Text style={styles.bigValue}>
                        {report.summary.quizzesTaken}
                      </Text>
                      <Text style={styles.smallNote}>
                        Passed {pct(report.summary.passRate)}
                      </Text>
                    </Card>
                  </View>

                  <Card
                    title="Recommended Focus"
                    subtitle="Weakest topics below 75%"
                  >
                    {report.focus.length === 0 ? (
                      <EmptyNote
                        text={
                          report.topics.length === 0
                            ? "No quiz results yet."
                            : "No topic below 75%."
                        }
                      />
                    ) : (
                      report.focus.map((t) => (
                        <BarRow
                          key={t.topicName}
                          label={t.topicName}
                          value={t.mastery}
                          note={t.majorName ?? undefined}
                        />
                      ))
                    )}
                  </Card>

                  <Card title="Topic Strengths">
                    {report.topics.length === 0 ? (
                      <EmptyNote text="No quiz results yet." />
                    ) : (
                      groupByMajor(report.topics).map(([major, topics]) => (
                        <View key={major} style={{ marginBottom: 6 }}>
                          <Text style={styles.engTitle}>{major}</Text>
                          {topics.map((t) => (
                            <BarRow
                              key={t.topicName}
                              label={t.topicName}
                              value={t.mastery}
                            />
                          ))}
                        </View>
                      ))
                    )}
                  </Card>

                  <Card title="Course Progress">
                    {report.courses.map((c) => (
                      <BarRow
                        key={c.course_id}
                        label={c.courseName}
                        value={c.percent}
                        color={C.primary}
                      />
                    ))}
                  </Card>

                  <Card title="Quiz History" subtitle="Latest attempt per quiz">
                    {report.courses.every((c) => c.quizzes.length === 0) ? (
                      <EmptyNote text="No quizzes taken yet." />
                    ) : (
                      report.courses.flatMap((c) =>
                        c.quizzes.map((q, i) => (
                          <View
                            key={`${c.course_id}-${i}`}
                            style={styles.tdRow}
                          >
                            <View style={{ flex: 3 }}>
                              <Text
                                style={[styles.td, { color: C.primary }]}
                                numberOfLines={1}
                              >
                                {q.title}
                              </Text>
                              <Text style={styles.smallNote}>
                                {c.courseName} · {shortDate(q.date)}
                                {q.attempts > 1
                                  ? ` · ${q.attempts} attempts`
                                  : ""}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.td,
                                styles.num,
                                { fontWeight: "700", color: scoreColor(q.pct) },
                              ]}
                            >
                              {pct(q.pct)}
                            </Text>
                          </View>
                        )),
                      )
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </ScrollView>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select a student</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={students}
              keyExtractor={(s) => String(s.id)}
              style={{ maxHeight: 460 }}
              renderItem={({ item }) => {
                const atRisk = item.avgScore != null && item.avgScore < 60;
                return (
                  <TouchableOpacity
                    style={[
                      styles.studentRow,
                      item.id === studentId && styles.studentRowActive,
                    ]}
                    onPress={() => {
                      setStudentId(item.id);
                      setPickerOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.name}</Text>
                      <Text style={styles.smallNote}>
                        Avg {pct(item.avgScore)} · Completion{" "}
                        {pct(item.completion)}
                      </Text>
                    </View>
                    {atRisk && (
                      <View style={styles.riskBadge}>
                        <Text style={styles.riskText}>At risk</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function groupByMajor(topics: StudentReport["topics"]) {
  const groups = new Map<string, StudentReport["topics"]>();
  topics.forEach((t) => {
    const key = t.majorName ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  });
  return Array.from(groups.entries());
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
  scroll: { padding: 16, paddingBottom: 40 },

  row3: { flexDirection: "row", justifyContent: "space-between" },
  tile: {
    width: "31.5%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.sub,
    marginBottom: 4,
    textAlign: "center",
  },
  bigValue: { fontSize: 22, fontWeight: "700", color: C.primary },
  smallNote: { fontSize: 11, color: C.sub },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  engTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginTop: 4 },

  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.track,
    paddingBottom: 8,
    marginBottom: 4,
  },
  th: { fontSize: 11, fontWeight: "700", color: "#95A5A6" },
  tdRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.bg,
    alignItems: "center",
  },
  td: { fontSize: 12, color: "#34495E" },
  num: { flex: 1, textAlign: "center" },

  qHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginTop: 4,
  },
  qHeadText: { fontSize: 12, color: C.text, fontWeight: "600" },
  qRow: {
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  qTop: { flexDirection: "row", alignItems: "center" },
  qText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19 },
  qScore: { fontSize: 13, color: C.text, marginLeft: 12, fontWeight: "600" },
  qDetails: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E8EE",
    paddingTop: 8,
  },
  qWrong: { fontSize: 11, color: C.primary, marginTop: 6 },
  compareRow: { flexDirection: "row", gap: 10 },
  compareBox: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  compareNote: {
    fontSize: 12,
    color: C.text,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  warningText: { flex: 1, fontSize: 12, color: "#7B241C", lineHeight: 17 },
  ewChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FDECEA",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 3,
  },
  ewChipText: { fontSize: 10, fontWeight: "700", color: "#C0392B" },
  link: {
    color: C.primary,
    fontWeight: "600",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  rankNo: { width: 34, fontWeight: "700" },
  rankScore: { width: 60, textAlign: "right", fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: "700" },

  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pickerText: { flex: 1, fontSize: 14, color: C.text },
  profile: { alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.track },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.primary,
    marginTop: 4,
  },
  profileSub: { fontSize: 12, color: C.sub, marginTop: 2, textAlign: "center" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: C.primary },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  studentRowActive: { backgroundColor: "#EEF1FB" },
  studentName: { fontSize: 14, fontWeight: "600", color: C.text },
  riskBadge: {
    backgroundColor: "#FDECEA",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  riskText: { fontSize: 11, fontWeight: "700", color: "#C0392B" },
});

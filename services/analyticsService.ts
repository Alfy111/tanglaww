import { supabase } from "../lib/supabase";

export interface QuizResult {
  title: string;
  pct: number | null;
  passed: boolean;
  attempts: number;
  date: string;
}

export interface TopicScore {
  topicName: string;
  majorName?: string | null;
  mastery: number | null;
}

export interface CourseReport {
  course_id: number;
  courseName: string;
  percent: number;
  quizzes: QuizResult[];
  topics: TopicScore[];
}

export interface StudentReport {
  student: {
    id: number;
    name: string;
    photo: string | null;
    degree: string | null;
    majorship: string | null;
  } | null;
  summary: {
    avgScore: number | null;
    quizzesTaken: number;
    passRate: number | null;
    completion: number | null;
    completedCourses: number;
    totalCourses: number;
    activeDays: number;
  };
  courses: CourseReport[];
  topics: TopicScore[];
  focus: TopicScore[];
  recent: {
    courseName: string;
    title: string;
    pct: number | null;
    date: string;
  }[];
}

export interface AdminOverview {
  summary: {
    totalStudents: number;
    activeStudents: number;
    avgScore: number | null;
    passRate: number | null;
    quizResults: number;
  };
  distribution: {
    bins: number[];
    average: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    count: number;
  };
  courses: {
    course_id: number;
    courseName: string;
    completion: number;
    finished: number;
  }[];
  assessments: { assessment_id: number; title: string; courseName: string }[];
  diagnostic: {
    assessment_id: number | null;
    title: string | null;
    currentAvg: number | null;
    currentCount: number;
    flagged: number;
    pastAvg: number | null;
    cutoff: number;
    accuracy: number | null;
    sample: number | null;
  };
  engagement: {
    label: string;
    materials: number;
    opened: number;
    completed: number;
  }[];
}

export interface QuestionResult {
  assessment_id: number;
  number: number;
  question: string;
  topicName: string | null;
  correct: number;
  examinees: number;
  difficulty: number;
  keyCheck: boolean;
  topWrong: string | null;
  topWrongShare: number | null;
}

export interface AdminCourse {
  quizzes: {
    assessment_id: number;
    title: string;
    takers: number;
    avgScore: number | null;
    passRate: number | null;
  }[];
  weakTopics: {
    topicName: string;
    majorName: string | null;
    mastery: number;
    students: number;
    weakShare: number;
    priority: number;
  }[];
  questions: QuestionResult[];
  itemCount: number;
  flagged: number;
}

export interface RankingRow {
  rank: number;
  name: string;
  pct: number | null;
  quizzes: number | null;
}

export interface StudentListItem {
  id: number;
  name: string;
  avgScore: number | null;
  quizzesTaken: number;
  completion: number;
  diagnosticScore: number | null;
  earlyWarning: boolean;
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const getMyAnalytics = () => call<StudentReport>("get_my_analytics");
export const getAdminOverview = () => call<AdminOverview>("get_admin_overview");
export const getAdminCourse = (courseId: number) =>
  call<AdminCourse>("get_admin_course_analytics", { p_course_id: courseId });
export const getAdminStudents = () =>
  call<StudentListItem[]>("get_admin_students");
export const getAdminRankings = (assessmentId: number | null) =>
  call<RankingRow[]>("get_admin_rankings", { p_assessment_id: assessmentId });
export async function setDiagnosticAssessment(
  assessmentId: number | null,
): Promise<void> {
  const { error } = await supabase.rpc("set_diagnostic_assessment", {
    p_assessment_id: assessmentId,
  });
  if (error) throw new Error(error.message);
}
export const getStudentReport = (studentId: number) =>
  call<StudentReport>("get_student_report", { p_student_id: studentId });

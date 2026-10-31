import { Navigate, Route, Routes } from "react-router-dom";
import { applyUserTheme, getUserThemePreference } from "./lib/userTheme";
import About from "./pages/About";
import AdminAbout from "./pages/admin/AdminAbout";
import AdminActivate from "./pages/admin/AdminActivate";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminAuditQueue from "./pages/admin/AdminAuditQueue";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminCarousel from "./pages/admin/AdminCarousel";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHandouts from "./pages/admin/AdminHandouts";
import AdminHelp from "./pages/admin/AdminHelp";
import AdminOnlineSession from "./pages/admin/AdminOnlineSession";
import AdminPolicies from "./pages/admin/AdminPolicies";
import AdminQuiz from "./pages/admin/AdminQuiz";
import AdminQuizEditor from "./pages/admin/AdminQuizEditor";
import AdminRecordedSessions from "./pages/admin/AdminRecordedSessions";
import AdminSignIn from "./pages/admin/AdminSignIn";
import AdminStudentRegistry from "./pages/admin/AdminStudentRegistry";
import Analytics from "./pages/Analytics"; // <-- 1. ADD THIS IMPORT
import Calendar from "./pages/Calendar";
import ChangePassword from "./pages/ChangePassword";
import CourseDetail from "./pages/CourseDetails";
import Courses from "./pages/Courses";
import Dashboard from "./pages/Dashboard";
import Enroll from "./pages/Enroll";
import Help from "./pages/Help";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
import PasswordRecovery from "./pages/PasswordRecovery";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import SignIn from "./pages/SignIn";
import SignInWithCode from "./pages/SignInWithCode";
import Terms from "./pages/Terms";

export default function App() {
  applyUserTheme(getUserThemePreference());

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/enroll" element={<Enroll />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<PasswordRecovery />} />
      <Route
        path="/reset-password"
        element={<PasswordRecovery isResetPage />}
      />
      <Route path="/signin/code" element={<SignInWithCode />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/Analytics" element={<Analytics />} />{" "}
      {/* <-- 2. ADD THIS ROUTE */}
      <Route path="/dashboard/courses" element={<Courses />} />
      <Route
        path="/dashboard/courses/:courseId"
        element={<CourseDetail isAdmin={false} />}
      />
      <Route path="/dashboard/calendar" element={<Calendar />} />
      <Route path="/dashboard/profile" element={<Profile />} />
      <Route path="/dashboard/about" element={<About />} />
      <Route path="/dashboard/help" element={<Help />} />
      <Route path="/dashboard/terms" element={<Terms />} />
      <Route path="/dashboard/settings" element={<Settings />} />
      <Route
        path="/dashboard/settings/change-password"
        element={<ChangePassword />}
      />
      <Route path="/dashboard/notifications" element={<Notifications />} />
      <Route path="/admin/signin" element={<AdminSignIn />} />
      <Route path="/admin/activate" element={<AdminActivate />} />
      <Route
        path="/admin/forgot-password"
        element={<PasswordRecovery isAdmin />}
      />
      <Route
        path="/admin/reset-password"
        element={<PasswordRecovery isAdmin isResetPage />}
      />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/approvals" element={<AdminApprovals />} />
      <Route path="/admin/audit-queue" element={<AdminAuditQueue />} />
      <Route path="/admin/students" element={<AdminStudentRegistry />} />
      <Route path="/admin/about" element={<AdminAbout />} />
      <Route path="/admin/calendar" element={<AdminCalendar />} />
      <Route path="/admin/carousel" element={<AdminCarousel />} />
      <Route path="/admin/courses" element={<AdminCourses />} />
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/help" element={<AdminHelp />} />
      <Route path="/admin/policies" element={<AdminPolicies />} />
      <Route path="/admin/audit-log" element={<AdminAuditLog />} />
      <Route
        path="/admin/courses/:courseId/handouts"
        element={<AdminHandouts />}
      />
      <Route path="/our-courses" element={<Navigate to="/#courses" replace />} />
      <Route path="/about-us" element={<Navigate to="/#about" replace />} />
      <Route path="/helpdesk" element={<Navigate to="/#helpdesk" replace />} />
      <Route
        path="/admin/courses/:courseId/recorded-sessions"
        element={<AdminRecordedSessions />}
      />
      <Route path="/admin/courses/:courseId/quiz" element={<AdminQuiz />} />
      <Route
        path="/admin/courses/:courseId/quiz/:assessmentId"
        element={<AdminQuizEditor />}
      />
      <Route
        path="/admin/courses/:courseId/online-session"
        element={<AdminOnlineSession />}
      />
    </Routes>
  );
}

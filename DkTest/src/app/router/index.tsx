import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AdminLayout from "../../components/ui/AdminLayout";
import StudentLayout from "../../components/ui/StudentLayout";
import RequireAuth from "../../components/auth/RequireAuth";
import { RouteErrorBoundary } from "../../components/common/RouteErrorBoundary";
import { PageLoadingFallback } from "../../components/common/PageLoadingFallback";
import { lazyWithRetry } from "../../utils/lazyWithRetry";

// Helper to wrap lazy routes with Suspense fallback
function withSuspense(Component: React.ComponentType<any>, label?: string) {
  return (
    <Suspense fallback={<PageLoadingFallback label={label} />}>
      <Component />
    </Suspense>
  );
}

// Lazy-loaded Auth Pages
const Login = lazyWithRetry(() => import("../../pages/auth/Login"), "Login");
const Register = lazyWithRetry(() => import("../../pages/auth/Register"), "Register");
const AdminLogin = lazyWithRetry(() => import("../../pages/auth/AdminLogin"), "AdminLogin");
const StudentLogin = lazyWithRetry(() => import("../../pages/auth/StudentLogin"), "StudentLogin");
const ParentLogin = lazyWithRetry(() => import("../../pages/auth/ParentLogin"), "ParentLogin");
const ParentDashboard = lazyWithRetry(() => import("../../pages/parent/ParentDashboard"), "ParentDashboard");
const EmailVerification = lazyWithRetry(() => import("../../pages/auth/EmailVerification"), "EmailVerification");

// Lazy-loaded Admin Pages
const Dashboard = lazyWithRetry(() => import("../../pages/admin/Dashboard"), "Dashboard");
const ExamList = lazyWithRetry(() => import("../../pages/admin/ExamList"), "ExamList");
const AiWordImport = lazyWithRetry(() => import("../../pages/admin/AiWordImport"), "AiWordImport");
const AiPromptImport = lazyWithRetry(() => import("../../pages/admin/AiPromptImport"), "AiPromptImport");
const ExamBuilder = lazyWithRetry(() => import("../../features/exam-builder/ExamBuilder"), "ExamBuilder");
const ExamDetail = lazyWithRetry(() => import("../../pages/admin/ExamDetail"), "ExamDetail");
const Submissions = lazyWithRetry(() => import("../../pages/admin/Submissions"), "Submissions");
const SubmissionDetail = lazyWithRetry(() => import("../../pages/admin/SubmissionDetail"), "SubmissionDetail");
const Students = lazyWithRetry(() => import("../../pages/admin/Students"), "Students");
const Parents = lazyWithRetry(() => import("../../pages/admin/Parents"), "Parents");
const UserDetail = lazyWithRetry(() => import("../../pages/admin/UserDetail"), "UserDetail");
const DataHealth = lazyWithRetry(() => import("../../pages/admin/DataHealth"), "DataHealth");
const AuditLogs = lazyWithRetry(() => import("../../pages/admin/AuditLogs"), "AuditLogs");
const Classes = lazyWithRetry(() => import("../../pages/admin/Classes"), "Classes");
const SystemHealth = lazyWithRetry(() => import("../../pages/admin/SystemHealth"), "SystemHealth");
const Statistics = lazyWithRetry(() => import("../../pages/admin/Statistics"), "Statistics");
const Settings = lazyWithRetry(() => import("../../pages/admin/Settings"), "Settings");
const LiveProctoring = lazyWithRetry(() => import("../../pages/admin/LiveProctoring"), "LiveProctoring");
const LiveMonitor = lazyWithRetry(() => import("../../pages/admin/LiveMonitor"), "LiveMonitor");
const LegalPolicy = lazyWithRetry(() => import("../../pages/LegalPolicy"), "LegalPolicy");

// Lazy-loaded Student Pages
const Home = lazyWithRetry(() => import("../../pages/home/Home"), "Home");
const ExamIntro = lazyWithRetry(() => import("../../pages/student/ExamIntro"), "ExamIntro");
const TakingExam = lazyWithRetry(() => import("../../pages/student/TakingExam"), "TakingExam");
const ExamResult = lazyWithRetry(() => import("../../pages/student/ExamResult"), "ExamResult");
const StudentHistory = lazyWithRetry(() => import("../../pages/student/StudentHistory"), "StudentHistory");
const StudentProfile = lazyWithRetry(() => import("../../pages/student/StudentProfile"), "StudentProfile");
const Community = lazyWithRetry(() => import("../../pages/student/Community"), "Community");
const AiTutorPage = lazyWithRetry(() => import("../../pages/student/AiTutorPage"), "AiTutorPage");
const PracticePage = lazyWithRetry(() => import("../../pages/student/PracticePage"), "PracticePage");
const PracticeSessionPage = lazyWithRetry(() => import("../../practice/pages/PracticeSessionPage"), "PracticeSessionPage");
const NotFoundPage = lazyWithRetry(() => import("../../pages/NotFoundPage"), "NotFoundPage");

const router = createBrowserRouter([
  {
    path: "/admin/live-monitor/:sessionId",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="admin">
        {withSuspense(LiveMonitor, "Đang tải màn hình giám sát...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/live-monitor/:sessionId",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(LiveMonitor, "Đang tải màn hình giám sát...")}
      </RequireAuth>
    ),
  },
  {
    path: "/email-verification",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(EmailVerification),
  },
  {
    path: "/login",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(Login),
  },
  {
    path: "/register",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(Register),
  },
  {
    path: "/admin/login",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(AdminLogin),
  },
  {
    path: "/student/login",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(StudentLogin),
  },
  {
    path: "/parent/login",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(ParentLogin),
  },
  {
    path: "/parent/dashboard",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(ParentDashboard, "Đang tải trang tổng quan phụ huynh...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(ExamList, "Đang tải danh sách đề thi...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/import-word",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(AiWordImport, "Đang nạp trình nhập đề Word...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/import-prompt",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(AiPromptImport, "Đang nạp trình tạo đề AI...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/new",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        <Suspense fallback={<PageLoadingFallback label="Đang khởi tạo trình soạn đề..." />}>
          <ExamBuilder isNew />
        </Suspense>
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/:examId/edit",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        <Suspense fallback={<PageLoadingFallback label="Đang mở đề thi..." />}>
          <ExamBuilder />
        </Suspense>
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/:examId",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(ExamDetail, "Đang tải chi tiết đề thi...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/:examId/submissions",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(Submissions, "Đang tải danh sách bài nộp...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/:examId/submissions/:submissionId",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(SubmissionDetail, "Đang tải chi tiết bài làm...")}
      </RequireAuth>
    ),
  },
  {
    path: "/parent/exams/:examId/stats",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="parent">
        {withSuspense(Statistics, "Đang tải thống kê phổ điểm...")}
      </RequireAuth>
    ),
  },
  {
    path: "/admin",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAuth role="admin">
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { path: "", element: <Navigate to="exams" replace /> },
      { path: "dashboard", element: withSuspense(Dashboard, "Đang tải Dashboard...") },
      { path: "exams", element: withSuspense(ExamList, "Đang tải danh sách đề...") },
      { path: "exams/import-word", element: withSuspense(AiWordImport, "Đang nạp trình nhập Word...") },
      { path: "exams/import-prompt", element: withSuspense(AiPromptImport, "Đang nạp AI Prompt Import...") },
      {
        path: "exams/new",
        element: (
          <Suspense fallback={<PageLoadingFallback label="Đang khởi tạo trình soạn đề..." />}>
            <ExamBuilder isNew />
          </Suspense>
        ),
      },
      {
        path: "exams/:examId/edit",
        element: (
          <Suspense fallback={<PageLoadingFallback label="Đang mở trình sửa đề..." />}>
            <ExamBuilder />
          </Suspense>
        ),
      },
      { path: "exams/:examId", element: withSuspense(ExamDetail, "Đang tải chi tiết đề...") },
      { path: "exams/:examId/stats", element: withSuspense(Statistics, "Đang tải phổ điểm...") },
      { path: "exams/:examId/submissions", element: withSuspense(Submissions, "Đang tải bài nộp...") },
      { path: "exams/:examId/submissions/:submissionId", element: withSuspense(SubmissionDetail, "Đang xem bài nộp...") },
      { path: "submissions", element: withSuspense(Submissions, "Đang tải danh sách bài nộp...") },
      { path: "students", element: withSuspense(Students, "Đang tải danh sách học sinh...") },
      { path: "parents", element: withSuspense(Parents, "Đang tải danh sách phụ huynh...") },
      { path: "users/:uid", element: withSuspense(UserDetail, "Đang tải thông tin người dùng...") },
      { path: "data-health", element: withSuspense(DataHealth, "Đang kiểm tra sức khoẻ dữ liệu...") },
      { path: "audit-logs", element: withSuspense(AuditLogs, "Đang tải nhật ký hệ thống...") },
      { path: "classes", element: <Navigate to="/admin/stats" replace /> },
      { path: "system-health", element: withSuspense(SystemHealth, "Đang kiểm tra hệ thống...") },
      { path: "live-proctoring", element: withSuspense(LiveProctoring, "Đang tải phòng giám sát...") },
      { path: "stats", element: withSuspense(Statistics, "Đang tổng hợp số liệu...") },
      { path: "settings", element: withSuspense(Settings, "Đang tải cài đặt...") },
      { path: "legal-policy", element: withSuspense(LegalPolicy, "Đang tải điều khoản...") },
      { path: "*", element: withSuspense(NotFoundPage) },
    ],
  },
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    element: <StudentLayout />,
    children: [
      { path: "", element: withSuspense(Home, "Đang tải trang chủ đề thi...") },
      { path: "exams", element: withSuspense(Home, "Đang tải danh sách đề thi...") },
      { path: "student", element: <Navigate to="/student/history" replace /> },
      { path: "student/practice", element: withSuspense(PracticePage, "Đang tải góc luyện tập...") },
      { path: "student/practice/:modeId", element: withSuspense(PracticeSessionPage, "Đang tải phòng luyện tập...") },
      { path: "practice", element: withSuspense(PracticePage, "Đang tải góc luyện tập...") },
      { path: "practice/:modeId", element: withSuspense(PracticeSessionPage, "Đang tải phòng luyện tập...") },
      { path: "student/community", element: withSuspense(Community, "Đang tải cộng đồng...") },
      { path: "student/ai-tutor", element: withSuspense(AiTutorPage, "Đang kết nối Gia sư AI...") },
      { path: "student/history", element: withSuspense(StudentHistory, "Đang tải lịch sử bài làm...") },
      { path: "student/profile", element: withSuspense(StudentProfile, "Đang tải hồ sơ cá nhân...") },
      { path: "legal-policy", element: withSuspense(LegalPolicy, "Đang tải chính sách...") },
      { path: "student/exam/:examId", element: withSuspense(ExamIntro, "Đang nạp thông tin đề thi...") },
      { path: "student/exam/:examId/take", element: withSuspense(TakingExam, "Đang khởi tạo phòng thi...") },
      { path: "student/exam/:examId/result/:submissionId", element: withSuspense(ExamResult, "Đang tính điểm bài làm...") },
      { path: "*", element: withSuspense(NotFoundPage) },
    ],
  },
  {
    path: "*",
    errorElement: <RouteErrorBoundary />,
    element: withSuspense(NotFoundPage),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

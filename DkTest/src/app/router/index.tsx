import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AdminLayout from "../../components/ui/AdminLayout";
import StudentLayout from "../../components/ui/StudentLayout";

// Auth Pages
import AdminLogin from "../../pages/auth/AdminLogin";
import StudentLogin from "../../pages/auth/StudentLogin";

// Admin Pages
import Dashboard from "../../pages/admin/Dashboard";
import ExamList from "../../pages/admin/ExamList";
import AiWordImport from "../../pages/admin/AiWordImport";
import AiPromptImport from "../../pages/admin/AiPromptImport";
import ExamBuilder from "../../features/exam-builder/ExamBuilder";
import ExamDetail from "../../pages/admin/ExamDetail";
import Submissions from "../../pages/admin/Submissions";
import SubmissionDetail from "../../pages/admin/SubmissionDetail";
import Students from "../../pages/admin/Students";
import Statistics from "../../pages/admin/Statistics";
import Settings from "../../pages/admin/Settings";
import LiveProctoring from "../../pages/admin/LiveProctoring";

// Student Pages
import ExamIntro from "../../pages/student/ExamIntro";
import TakingExam from "../../pages/student/TakingExam";
import ExamResult from "../../pages/student/ExamResult";
import StudentHistory from "../../pages/student/StudentHistory";
import StudentProfile from "../../pages/student/StudentProfile";
import Community from "../../pages/student/Community";
import AiTutorPage from "../../pages/student/AiTutorPage";
import Home from "../../pages/home/Home";

const router = createBrowserRouter([
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },
  {
    path: "/student/login",
    element: <StudentLogin />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { path: "", element: <Navigate to="exams" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "exams", element: <ExamList /> },
      { path: "exams/import-word", element: <AiWordImport /> },
      { path: "exams/import-prompt", element: <AiPromptImport /> },
      { path: "exams/new", element: <ExamBuilder isNew /> },
      { path: "exams/:examId/edit", element: <ExamBuilder /> },
      { path: "exams/:examId", element: <ExamDetail /> },
      { path: "exams/:examId/stats", element: <Statistics /> },
      { path: "exams/:examId/submissions", element: <Submissions /> },
      { path: "exams/:examId/submissions/:submissionId", element: <SubmissionDetail /> },
      { path: "submissions", element: <Submissions /> },
      { path: "students", element: <Students /> },
      { path: "live-proctoring", element: <LiveProctoring /> },
      { path: "stats", element: <Statistics /> },
      { path: "settings", element: <Settings /> },
    ],
  },
  {
    path: "/",
    element: <StudentLayout />,
    children: [
      { path: "", element: <Home /> },
      { path: "student", element: <Navigate to="/student/history" replace /> },
      { path: "student/community", element: <Community /> },
      { path: "student/ai-tutor", element: <AiTutorPage /> },
      { path: "student/history", element: <StudentHistory /> },
      { path: "student/profile", element: <StudentProfile /> },
      { path: "student/exam/:examId", element: <ExamIntro /> },
      { path: "student/exam/:examId/take", element: <TakingExam /> },
      { path: "student/exam/:examId/result/:submissionId", element: <ExamResult /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

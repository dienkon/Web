/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CodeExam {
  id: string;
  title: string;
  code: string; // Mã đề (e.g. CODE-WEB-01)
  description?: string;
  timeLimit: number; // Số phút làm bài (e.g. 45)
  htmlContent: string; // Toàn bộ code HTML của trang đề thi
  cssContent: string; // CSS style tùy biến
  jsContent: string; // JavaScript logic cho trang đề thi
  solutionInstructions?: string; // Hướng dẫn giải / barem
  gradingKey?: Record<string, any>; // Đáp án hoặc cấu hình chấm
  authorId?: string;
  authorName?: string;
  status: "published" | "draft";
  isPublic?: boolean; // Công khai cho mọi học sinh hoặc Không công khai (chỉ ai có link mới làm được)
  accessCode?: string; // Mật khẩu / mã truy cập khi không công khai (nếu có)
  shareUrl?: string; // Đường link chia sẻ làm bài trực tiếp
  submissionCount?: number;
  createdAt: any;
  updatedAt: any;
}

export interface CodeSubmission {
  id: string;
  examId: string;
  examTitle: string;
  examCode: string;
  studentUsername: string;
  studentName: string;
  score: number;
  maxScore: number;
  timeSpent: number; // Số giây làm bài
  submittedData: any; // Toàn bộ dữ liệu câu trả lời thu thập từ frame
  submittedAt: any;
}

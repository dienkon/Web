/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasActiveExamInProgress } from "../../services/examSessionService";
import type {
  TourStepId,
  TourStepConfig,
  StoredOnboardingState,
  OnboardingStatus,
} from "./StudentOnboardingTypes";
import { TOUR_DATA_IDS } from "./StudentOnboardingTypes";
import {
  loadStoredOnboardingState,
  saveStoredOnboardingState,
  markOnboardingCompleted,
  markOnboardingSkipped,
  resetOnboardingState,
} from "./StudentOnboardingStorage";
import StudentOnboardingSpotlight from "./StudentOnboardingSpotlight";
import StudentOnboardingTooltip from "./StudentOnboardingTooltip";
import {
  StudentWelcomeModal,
  StudentFinishModal,
  StudentSkipConfirmModal,
} from "./StudentOnboardingModal";

// Definition of all 36 steps with exact requirements
export const TOUR_STEPS: TourStepConfig[] = [
  // Phase 1: Navigation Tour & Tab Detailed Introductions
  {
    id: "nav_logo",
    phase: "nav_tour",
    stepNumber: 1,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.BRAND_LOGO,
    title: "Giao diện chính DkTEST",
    description: "Chào mừng bạn đến với DkTEST! Đây là trang chủ chính của nền tảng thi trực tuyến. Từ thanh menu bên trái, bạn có thể nhanh chóng truy cập toàn bộ các phân hệ học tập và thi cử.",
    actionHint: "Nhấn 'Đã hiểu • Tiếp tục' để tìm hiểu chi tiết Thư viện Đề thi.",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "page_exams_detail",
    phase: "nav_tour",
    stepNumber: 2,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_EXAMS_OVERVIEW,
    title: "Thư Viện Đề Thi & Bộ Lọc DkTEST",
    description: "Kho đề thi trắc nghiệm trực tuyến chuẩn hóa! Bạn có thể lọc đề theo môn học (Toán, Lý, Hóa, Tiếng Anh...), cấp thi, tìm kiếm mã đề hoặc duyệt qua các tab: Nhiều lượt làm nhất (Top 5), Đề mới nhất, hoặc Xem tất cả kho đề.",
    actionHint: "Bây giờ hãy nhấp vào tab 'Luyện tập' trên menu bên trái để chuyển trang!",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "nav_practice",
    phase: "nav_tour",
    stepNumber: 3,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.NAV_PRACTICE,
    title: "Tab Luyện tập",
    description: "Luyện tập là khu vực tự học linh hoạt, không giới hạn thời gian và không ghi nhận điểm số thi thật.",
    actionHint: "Hãy nhấp chuột vào tab 'Luyện tập' trên thanh menu!",
    placement: "right",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "page_practice_detail",
    phase: "nav_tour",
    stepNumber: 4,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_PRACTICE_OVERVIEW,
    title: "Khu Vực Tự Học & Luyện Tập Thông Minh",
    description: "Phòng luyện tập hỗ trợ 35+ dạng bài đa dạng các môn Toán, Tiếng Anh, Tin học. Bạn có thể tự chọn số lượng câu, mức độ khó, hoặc đặc biệt là tính năng 'Ôn tập bài cũ' từ các đề đã thi để khắc phục các câu đã làm sai!",
    actionHint: "Bây giờ hãy nhấp vào tab 'Hỏi Gia sư AI' để khám phá tiếp!",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "nav_ai",
    phase: "nav_tour",
    stepNumber: 5,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.NAV_AI,
    title: "Tab Hỏi Gia sư AI",
    description: "Trợ lý trí tuệ nhân tạo chuyên sâu hỗ trợ học sinh học tập 24/7.",
    actionHint: "Hãy nhấp chuột vào tab 'Hỏi Gia sư AI' trên thanh menu!",
    placement: "right",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "page_ai_detail",
    phase: "nav_tour",
    stepNumber: 6,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_AI_TUTOR_OVERVIEW,
    title: "Trợ Lý Gia Sư AI 24/7",
    description: "Gia sư AI thông minh đồng hành cùng bạn học tập: Hỗ trợ giải thích chi tiết từng bước, dịch đề thi, phân tích công thức toán học LaTeX, đọc và giải bài từ ảnh chụp đề, tài liệu PDF, DOCX hoặc dán ảnh trực tiếp từ clipboard (Ctrl + V).",
    actionHint: "Bây giờ hãy nhấp vào tab 'Cộng đồng' để khám phá tiếp!",
    placement: "top",
    allowManualNext: true,
  },
  {
    id: "nav_community",
    phase: "nav_tour",
    stepNumber: 7,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.NAV_COMMUNITY,
    title: "Tab Cộng đồng",
    description: "Diễn đàn kết nối và giao lưu học hỏi cùng các bạn học sinh trên toàn quốc.",
    actionHint: "Hãy nhấp chuột vào tab 'Cộng đồng' trên thanh menu!",
    placement: "right",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "page_community_detail",
    phase: "nav_tour",
    stepNumber: 8,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_COMMUNITY_OVERVIEW,
    title: "Cộng Đồng Thảo Luận & Chia Sẻ DkTEST",
    description: "Mạng xã hội học tập dành riêng cho học sinh: Đặt câu hỏi về các bài thi khó, chia sẻ kinh nghiệm học tập, đăng bài viết kèm hình ảnh/file tài liệu, thả tim, bình luận và xem hồ sơ thành tích của các bạn khác.",
    actionHint: "Bây giờ hãy nhấp vào tab 'Lịch sử bài làm' để khám phá tiếp!",
    placement: "top",
    allowManualNext: true,
  },
  {
    id: "nav_history",
    phase: "nav_tour",
    stepNumber: 9,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.NAV_HISTORY,
    title: "Tab Lịch sử bài làm",
    description: "Theo dõi toàn bộ quá trình thi cử và tiến độ học tập của bạn.",
    actionHint: "Hãy nhấp chuột vào tab 'Lịch sử bài làm' trên thanh menu!",
    placement: "right",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "page_history_detail",
    phase: "nav_tour",
    stepNumber: 10,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_HISTORY_OVERVIEW,
    title: "Theo Dõi & Quản Lý Lịch Sử Thi",
    description: "Bảng tổng hợp toàn diện các bài thi bạn từng làm: Điểm số, thời gian, số câu đúng/sai. Bạn có thể mở lại bài làm để xem lời giải chi tiết, phân tích biểu đồ tiến độ hoặc làm lại đề thi bất kỳ lúc nào.",
    actionHint: "Bây giờ hãy nhấp vào tab 'Hồ sơ & Avatar' để khám phá tiếp!",
    placement: "top",
    allowManualNext: true,
  },
  {
    id: "nav_profile",
    phase: "nav_tour",
    stepNumber: 11,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.NAV_PROFILE,
    title: "Tab Hồ sơ & Avatar",
    description: "Quản lý hồ sơ học sinh, thành tích cá nhân và bảo mật tài khoản.",
    actionHint: "Hãy nhấp chuột vào tab 'Hồ sơ & Avatar' trên thanh menu!",
    placement: "right",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "page_profile_detail",
    phase: "nav_tour",
    stepNumber: 12,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.PAGE_PROFILE_OVERVIEW,
    title: "Hồ Sơ Cá Nhân & Cài Đặt",
    description: "Cập nhật thông tin học sinh: Họ tên, lớp học, đổi ảnh đại diện Avatar, theo dõi thành tích huy hiệu, liên kết tài khoản Phụ huynh, và nút 'Xem lại hướng dẫn' khi bạn muốn ôn lại tour hướng dẫn này!",
    actionHint: "Bây giờ hãy nhấp vào Logo DkTEST hoặc nút 'Về Trang chủ' để bắt đầu thi trải nghiệm!",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "nav_back_home",
    phase: "nav_tour",
    stepNumber: 13,
    totalStepsInPhase: 13,
    targetId: TOUR_DATA_IDS.BRAND_LOGO,
    title: "Trở về Trang chủ DkTEST",
    description: "Chúng ta đã tham quan chi tiết tất cả các phân hệ học tập! Giờ hãy quay lại Trang chủ để bắt đầu làm bài thi trải nghiệm 7 dạng câu hỏi và toàn bộ công cụ phòng thi.",
    actionHint: "Nhấp vào Logo DkTEST ở góc trên bên trái hoặc nút 'Tiếp tục'!",
    placement: "bottom",
    allowManualNext: true,
  },

  // Phase 2: Demo Card on Home
  {
    id: "home_demo_card",
    phase: "demo_banner",
    stepNumber: 1,
    totalStepsInPhase: 1,
    targetId: TOUR_DATA_IDS.HOME_DEMO_CARD,
    title: "Bài thi trải nghiệm DkTEST",
    description: "Bài thi này được thiết kế để bạn thử toàn bộ 7 dạng câu hỏi và các công cụ phòng thi ảo. Hoàn toàn là chế độ DEMO, không ảnh hưởng đến kết quả thật.",
    actionHint: "Hãy bấm 'Bắt đầu trải nghiệm' trên thẻ màu xanh để vào phòng thi!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },

  // Phase 3: Demo Exam Steps
  {
    id: "exam_intro",
    phase: "demo_exam",
    stepNumber: 1,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_HEADER,
    title: "Phòng thi trực tuyến DkTEST",
    description: "Chào mừng bạn đến với phòng thi! Phía trên là thanh thông tin bài thi, đồng hồ đếm ngược và các công cụ hỗ trợ làm bài.",
    actionHint: "Nhấn 'Đã hiểu • Tiếp tục' để bắt đầu làm quen các dạng câu hỏi.",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "exam_q1_single",
    phase: "demo_exam",
    stepNumber: 2,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_SINGLE_OPTIONS,
    title: "Câu 1 — Trắc nghiệm 1 đáp án",
    description: "Đây là dạng Trắc nghiệm 1 đáp án. Bạn chỉ được chọn duy nhất một phương án. Khi chọn phương án khác, hệ thống sẽ tự động cập nhật.",
    actionHint: "👉 Hãy bấm chọn một đáp án (ví dụ B: x = 3) để thử nghiệm!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q2_multi",
    phase: "demo_exam",
    stepNumber: 3,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_MULTI_OPTIONS,
    title: "Câu 2 — Trắc nghiệm nhiều đáp án",
    description: "Đây là dạng Trắc nghiệm nhiều đáp án. Bạn có thể chọn nhiều phương án cùng lúc. Khác với trắc nghiệm đơn, bạn cần tích chọn đủ tất cả các ý đúng.",
    actionHint: "👉 Hãy chọn đồng thời 2 đáp án số nguyên tố (ví dụ A: 2 và B: 3)!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q3_truefalse",
    phase: "demo_exam",
    stepNumber: 4,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_TRUEFALSE_GROUP,
    title: "Câu 3 — Đúng / Sai theo từng ý",
    description: "Đây là dạng Đúng / Sai theo từng ý. Mỗi ý khẳng định được đánh giá độc lập. Hệ thống chấm điểm chi tiết theo từng khẳng định.",
    actionHint: "👉 Hãy bấm Đúng hoặc Sai cho ít nhất một ý khẳng định!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q4_short",
    phase: "demo_exam",
    stepNumber: 5,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_SHORT_INPUT,
    title: "Câu 4 — Câu trả lời ngắn",
    description: "Đây là dạng Câu trả lời ngắn. Bạn tự nhập đáp án vào ô nhập thay vì chọn đáp án có sẵn.",
    actionHint: "👉 Hãy nhập kết quả (ví dụ: 20) vào ô trả lời!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q5_ordering",
    phase: "demo_exam",
    stepNumber: 6,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_ORDERING_ITEMS,
    title: "Câu 5 — Sắp xếp thứ tự",
    description: "Đây là dạng Sắp xếp thứ tự. Bạn cần đưa các mục về đúng trình tự logic bằng cách dùng các nút mũi tên lên / xuống.",
    actionHint: "👉 Hãy bấm nút mũi tên lên hoặc xuống để thay đổi thứ tự một mục!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q6_fillblank",
    phase: "demo_exam",
    stepNumber: 7,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_FILLBLANK_INPUTS,
    title: "Câu 6 — Điền vào chỗ trống",
    description: "Đây là dạng Điền vào chỗ trống. Bạn nhập nội dung thích hợp vào từng vị trí ô trống [_] được yêu cầu.",
    actionHint: "👉 Hãy nhập nội dung vào ô trống (ví dụ: 100)! ",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_q7_matching",
    phase: "demo_exam",
    stepNumber: 8,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_MATCHING_BOARD,
    title: "Câu 7 — Nối bảng 2 cột",
    description: "Đây là dạng Nối bảng 2 cột. Bạn ghép các mục ở Cột 1 với các mục có kết quả phù hợp ở Cột 2.",
    actionHint: "👉 Hãy thực hiện ghép ít nhất một cặp nối!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_tool_scratchpad",
    phase: "demo_exam",
    stepNumber: 9,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_SCRATCHPAD,
    title: "Bảng nháp vẽ tay",
    description: "Đây là Bảng nháp. Bạn có thể dùng nó để viết công thức, vẽ hình, ghi chú, tính toán nháp lời giải. Nội dung bảng nháp không phải là đáp án gửi cho hệ thống.",
    actionHint: "👉 Hãy bấm vào nút 'Bảng nháp', vẽ một nét thử nghiệm rồi đóng lại!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_tool_casio",
    phase: "demo_exam",
    stepNumber: 10,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_CASIO,
    title: "Máy tính CASIO fx-580 VN X",
    description: "DkTEST có giả lập máy tính Casio fx-580 VN X ngay trong phòng thi, có thể kéo thả tự do và sao chép kết quả nhanh chóng.",
    actionHint: "👉 Hãy bấm vào nút 'CASIO' để mở máy tính, sau đó đóng lại!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_tool_flag",
    phase: "demo_exam",
    stepNumber: 11,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_FLAG,
    title: "Đánh dấu câu xem lại",
    description: "Đánh dấu giúp bạn ghi nhớ câu muốn quay lại kiểm tra trước khi nộp bài. Câu được đánh dấu sẽ có màu vàng trên sơ đồ.",
    actionHint: "👉 Hãy bấm nút 'Đánh dấu xem lại'!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_tool_map",
    phase: "demo_exam",
    stepNumber: 12,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_QUESTION_MAP,
    title: "Sơ đồ câu hỏi",
    description: "Sơ đồ giúp bạn theo dõi toàn bộ trạng thái làm bài:\n• Màu xanh dương: Câu hiện tại\n• Màu xanh lá: Đã làm\n• Màu vàng: Đã đánh dấu\n• Màu trắng/xám: Chưa làm",
    actionHint: "👉 Hãy mở sơ đồ câu hỏi và bấm chuyển thử một câu khác!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_tool_mode",
    phase: "demo_exam",
    stepNumber: 13,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_MODE_TOGGLE,
    title: "Chế độ xem đề thi",
    description: "Bạn có thể chuyển đổi giữa chế độ 'Từng câu' (tập trung vào từng câu hỏi) hoặc 'Lướt xuống' (xem danh sách nhiều câu trên cùng một trang).",
    actionHint: "👉 Thử chuyển chế độ xem hoặc bấm 'Đã hiểu • Tiếp tục'!",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "exam_submit_btn",
    phase: "demo_exam",
    stepNumber: 14,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_SUBMIT,
    title: "Nộp bài thi",
    description: "Khi bạn đã hoàn thành bài thi, hãy bấm nút nộp bài để hệ thống kiểm tra và chuyển sang hộp thoại xác nhận.",
    actionHint: "👉 Hãy bấm nút 'Nộp bài'!",
    placement: "bottom",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "exam_confirm_modal",
    phase: "demo_exam",
    stepNumber: 15,
    totalStepsInPhase: 15,
    targetId: TOUR_DATA_IDS.EXAM_CONFIRM_MODAL,
    title: "Kiểm tra trước khi nộp",
    description: "Trước khi nộp bài, hãy kiểm tra lại số câu đã hoàn thành, số câu chưa làm và thời gian còn lại. Khi chắc chắn, hãy bấm 'Xác nhận nộp bài'.",
    actionHint: "👉 Hãy bấm nút 'Xác nhận nộp bài' để xem kết quả!",
    placement: "center",
    requiresAction: true,
    allowManualNext: true,
  },

  // Phase 4: Demo Result Steps
  {
    id: "result_score_overview",
    phase: "demo_result",
    stepNumber: 1,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_SUMMARY,
    title: "Tổng quan kết quả bài thi",
    description: "Đây là nơi bạn xem kết quả tổng quát sau khi nộp bài: Điểm số, tỷ lệ đúng, số câu đúng/tổng số câu, thời gian làm bài và số lần cảnh báo.",
    actionHint: "Nhấn 'Đã hiểu • Tiếp tục' để tìm hiểu phần phân tích thời gian.",
    placement: "bottom",
    allowManualNext: true,
  },
  {
    id: "result_time_analysis",
    phase: "demo_result",
    stepNumber: 2,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_TIME_ANALYSIS,
    title: "Phân tích thời gian làm bài từng câu",
    description: "Phần này giúp bạn biết:\n• Trung bình mất bao lâu cho một câu\n• Câu nào tốn nhiều thời gian nhất\n• Tốc độ và nhịp độ làm bài\nĐặc biệt: Bạn có thể nhấp trực tiếp vào cột biểu đồ để cuộn tới câu hỏi đó!",
    actionHint: "👉 Hãy nhấp để mở rộng mục 'Phân tích thời gian làm bài'!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_progress_chart",
    phase: "demo_result",
    stepNumber: 3,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_PROGRESS_CHART,
    title: "Diễn biến làm bài & tích lũy điểm số",
    description: "Biểu đồ cho thấy điểm số tích lũy thay đổi như thế nào từ đầu đến cuối bài, giúp bạn nhận diện giai đoạn bứt phá hoặc chững lại.",
    actionHint: "👉 Hãy nhấp để mở rộng mục 'Diễn biến làm bài'!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_category_chart",
    phase: "demo_result",
    stepNumber: 4,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_CATEGORY_CHART,
    title: "Biểu đồ phân tích tỉ lệ đúng / sai & chuyên đề",
    description: "Xem tỷ lệ đúng/sai theo từng phần thi và từng định dạng câu hỏi (trắc nghiệm, điền lỗ, đúng/sai, nối bảng...).",
    actionHint: "👉 Hãy nhấp để mở rộng mục 'Biểu đồ phân tích tỉ lệ'!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_ai_analysis",
    phase: "demo_result",
    stepNumber: 5,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_AI_ANALYSIS,
    title: "Phân tích học tập thông minh & Gia sư AI",
    description: "AI Analysis dùng để nhìn tổng quan năng lực, phát hiện xu hướng sai, tìm mẫu lỗi, phân tích tốc độ và gợi ý 3 ưu tiên ôn tập thực tế nhất để cải thiện.",
    actionHint: "Đọc qua các nhận xét tích cực từ AI và nhấn 'Đã hiểu • Tiếp tục'!",
    placement: "top",
    allowManualNext: true,
  },
  {
    id: "result_details_btn",
    phase: "demo_result",
    stepNumber: 6,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_DETAILS_TOGGLE,
    title: "Xem chi tiết bài làm",
    description: "Đây là nơi bạn xem lại từng câu: mình đã chọn gì, đáp án đúng là gì, câu đó đúng hay sai, thời gian làm và lời giải.",
    actionHint: "👉 Hãy bấm vào nút biểu tượng văn bản để mở chi tiết bài làm!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_explanation",
    phase: "demo_result",
    stepNumber: 7,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_EXPLANATION_BTN,
    title: "Lời giải chi tiết từng câu",
    description: "Bạn có thể bấm 'Xem lời giải chi tiết' để đọc phương pháp giải toán bằng công thức LaTeX chuẩn xác.",
    actionHint: "👉 Hãy bấm 'Xem lời giải chi tiết' ở Câu 1, sau đó thu gọn lại!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_ask_ai",
    phase: "demo_result",
    stepNumber: 8,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_ASK_AI_BTN,
    title: "Hỏi AI ngay tại câu hỏi",
    description: "Bạn có thể hỏi Gia sư AI ngay tại câu hỏi này mà không cần tự gõ lại toàn bộ đề. Hệ thống tự động truyền ngữ cảnh câu hỏi, đáp án và bài làm của bạn sang AI!",
    actionHint: "👉 Hãy bấm nút 'Hỏi AI' để xem cửa sổ gia sư!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_report",
    phase: "demo_result",
    stepNumber: 9,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_REPORT_BTN,
    title: "Báo cáo câu hỏi có sự cố",
    description: "Nếu phát hiện sai đáp án, lỗi công thức LaTeX, sai chính tả hoặc hình ảnh bị lỗi, bạn có thể gửi báo cáo ngay. (Trong chế độ Demo, báo cáo sẽ không gửi webhook thật).",
    actionHint: "👉 Hãy bấm nút 'Báo cáo' để mở hộp thoại báo lỗi!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_leaderboard",
    phase: "demo_result",
    stepNumber: 10,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_LEADERBOARD_BTN,
    title: "Xem Bảng xếp hạng",
    description: "Bảng xếp hạng giúp bạn biết kết quả của mình đang đứng ở đâu so với những người tham gia bài thi. Bảng xếp hạng demo hiển thị thứ hạng giả lập riêng biệt.",
    actionHint: "👉 Hãy bấm nút cúp 'Bảng xếp hạng'!",
    placement: "top",
    requiresAction: true,
    allowManualNext: true,
  },
  {
    id: "result_extra_tools",
    phase: "demo_result",
    stepNumber: 11,
    totalStepsInPhase: 11,
    targetId: TOUR_DATA_IDS.RESULT_RETAKE_BTN,
    title: "Làm lại đề thi & Tải file Word",
    description: "Bạn có thể bấm 'Làm lại đề thi' nếu bài thi cho phép thi nhiều lần, hoặc bấm 'Tải file Word' để tải toàn bộ nội dung đề và đáp án về máy tính ôn tập.",
    actionHint: "Nhấn 'Đã hiểu • Tiếp tục' để hoàn tất toàn bộ chương trình hướng dẫn!",
    placement: "top",
    allowManualNext: true,
  },
];

interface StudentOnboardingContextValue {
  isTutorialActive: boolean;
  currentStepId: TourStepId | null;
  currentStepConfig: TourStepConfig | null;
  isWelcomeModalOpen: boolean;
  isFinishModalOpen: boolean;
  isSkipModalOpen: boolean;
  targetRect: DOMRect | null;
  answersDraft: Record<string, any>;
  updateDemoAnswer: (qId: string, valOrUpdater: any) => void;
  startTutorial: () => void;
  replayTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  confirmSkip: () => void;
  cancelSkip: () => void;
  completeTutorial: () => void;
  triggerAction: (actionKey: string) => void;
}

const StudentOnboardingContext = createContext<StudentOnboardingContextValue | null>(null);

export function StudentOnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, role, authInitialized } = useAuth();

  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [answersDraft, setAnswersDraft] = useState<Record<string, any>>({});

  const currentStepConfig = isTutorialActive ? TOUR_STEPS[currentStepIndex] || null : null;
  const currentStepId = currentStepConfig ? currentStepConfig.id : null;

  // 1. Evaluate whether to show Welcome Modal upon initial load
  useEffect(() => {
    if (!authInitialized) return;

    // Check if user is actively in a real exam session
    const activeExam = hasActiveExamInProgress();
    if (activeExam) return;

    // Check location: don't interrupt active real exams
    if (
      location.pathname.includes("/take") ||
      (location.pathname.includes("/result/") && !location.pathname.includes("/tutorial/result"))
    ) {
      return;
    }

    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";

    // Check onboarding status in local storage
    const stored = loadStoredOnboardingState(effectiveUid);
    if (stored?.status === "completed" || stored?.status === "skipped") {
      return;
    }

    // If stored status is in_progress, resume tutorial!
    if (stored?.status === "in_progress") {
      setIsTutorialActive(true);
      if (stored.currentStepId) {
        const idx = TOUR_STEPS.findIndex((s) => s.id === stored.currentStepId);
        if (idx !== -1) setCurrentStepIndex(idx);
      }
      if (stored.answersDraft) setAnswersDraft(stored.answersDraft);
      return;
    }

    // Chưa lưu local là đã hướng dẫn rồi => PHỰT LÊN VỚI MỌI TÀI KHOẢN VÀO WEB!
    setIsWelcomeModalOpen(true);
  }, [authInitialized, user?.uid, location.pathname]);

  // 2. Continuous target DOM element finder & bounding rect updater
  useEffect(() => {
    if (!isTutorialActive || !currentStepConfig) {
      setTargetRect(null);
      return;
    }

    let retryCount = 0;
    const maxRetries = 20;

    const findTarget = () => {
      const el = document.querySelector(`[data-tour-id="${currentStepConfig.targetId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll into view gently if offscreen
        if (
          rect.top < 0 ||
          rect.bottom > window.innerHeight ||
          rect.left < 0 ||
          rect.right > window.innerWidth
        ) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(findTarget, 100);
      } else {
        setTargetRect(null);
      }
    };

    findTarget();
    const interval = setInterval(findTarget, 800);
    return () => clearInterval(interval);
  }, [isTutorialActive, currentStepConfig, location.pathname]);

  const updateDemoAnswer = (qId: string, valOrUpdater: any) => {
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    setAnswersDraft((prev) => {
      const nextVal = typeof valOrUpdater === "function" ? valOrUpdater(prev[qId]) : valOrUpdater;
      const next = { ...prev, [qId]: nextVal };
      saveStoredOnboardingState(effectiveUid, { answersDraft: next });
      return next;
    });
  };

  const startTutorial = () => {
    setIsWelcomeModalOpen(false);
    setIsTutorialActive(true);
    setCurrentStepIndex(0);
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    saveStoredOnboardingState(effectiveUid, {
      status: "in_progress",
      currentStepId: TOUR_STEPS[0].id,
    });
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const replayTutorial = () => {
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    resetOnboardingState(effectiveUid);
    setAnswersDraft({});
    setIsTutorialActive(true);
    setCurrentStepIndex(0);
    setIsFinishModalOpen(false);
    setIsSkipModalOpen(false);
    navigate("/");
  };

  const nextStep = () => {
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const nextConfig = TOUR_STEPS[nextIdx];
      setCurrentStepIndex(nextIdx);
      saveStoredOnboardingState(effectiveUid, {
        status: "in_progress",
        currentStepId: nextConfig.id,
      });

      // Handle contextual navigation transitions when advancing
      if (currentStepConfig?.id === "page_exams_detail" || currentStepConfig?.id === "nav_practice") {
        if (location.pathname !== "/student/practice") navigate("/student/practice");
      } else if (currentStepConfig?.id === "page_practice_detail" || currentStepConfig?.id === "nav_ai") {
        if (location.pathname !== "/student/ai-tutor") navigate("/student/ai-tutor");
      } else if (currentStepConfig?.id === "page_ai_detail" || currentStepConfig?.id === "nav_community") {
        if (location.pathname !== "/student/community") navigate("/student/community");
      } else if (currentStepConfig?.id === "page_community_detail" || currentStepConfig?.id === "nav_history") {
        if (location.pathname !== "/student/history") navigate("/student/history");
      } else if (currentStepConfig?.id === "page_history_detail" || currentStepConfig?.id === "nav_profile") {
        if (location.pathname !== "/student/profile") navigate("/student/profile");
      } else if (currentStepConfig?.id === "page_profile_detail" || currentStepConfig?.id === "nav_back_home") {
        if (location.pathname !== "/") navigate("/");
      } else if (currentStepConfig?.id === "home_demo_card") {
        navigate("/student/tutorial/exam");
      } else if (currentStepConfig?.id === "exam_confirm_modal") {
        navigate("/student/tutorial/result");
      }
    } else {
      // Completed all steps
      setIsTutorialActive(false);
      setIsFinishModalOpen(true);
    }
  };

  const skipTutorial = () => {
    setIsSkipModalOpen(true);
  };

  const confirmSkip = async () => {
    setIsSkipModalOpen(false);
    setIsWelcomeModalOpen(false);
    setIsTutorialActive(false);
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    await markOnboardingSkipped(effectiveUid);
  };

  const cancelSkip = () => {
    setIsSkipModalOpen(false);
  };

  const completeTutorial = async () => {
    setIsFinishModalOpen(false);
    setIsTutorialActive(false);
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";
    await markOnboardingCompleted(effectiveUid);
    navigate("/");
  };

  // Trigger actions invoked by interactive elements in the UI
  const triggerAction = (actionKey: string) => {
    if (!isTutorialActive || !currentStepConfig) return;
    const effectiveUid = user?.uid || localStorage.getItem("current_student_username") || "guest";

    switch (actionKey) {
      case "click_exams":
        if (currentStepConfig.id === "nav_exams") nextStep();
        break;
      case "click_practice":
        if (
          currentStepConfig.id === "nav_practice" ||
          currentStepConfig.id === "page_exams_detail" ||
          currentStepConfig.id === "nav_logo"
        ) {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "page_practice_detail");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "page_practice_detail",
            });
          }
        }
        break;
      case "click_ai":
        if (currentStepConfig.id === "nav_ai" || currentStepConfig.id === "page_practice_detail") {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "page_ai_detail");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "page_ai_detail",
            });
          }
        }
        break;
      case "click_community":
        if (currentStepConfig.id === "nav_community" || currentStepConfig.id === "page_ai_detail") {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "page_community_detail");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "page_community_detail",
            });
          }
        }
        break;
      case "click_history":
        if (currentStepConfig.id === "nav_history" || currentStepConfig.id === "page_community_detail") {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "page_history_detail");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "page_history_detail",
            });
          }
        }
        break;
      case "click_profile":
        if (currentStepConfig.id === "nav_profile" || currentStepConfig.id === "page_history_detail") {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "page_profile_detail");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "page_profile_detail",
            });
          }
        }
        break;
      case "click_logo_home":
        if (
          currentStepConfig.id === "nav_back_home" ||
          currentStepConfig.id === "page_profile_detail"
        ) {
          const targetStepIdx = TOUR_STEPS.findIndex((s) => s.id === "home_demo_card");
          if (targetStepIdx !== -1) {
            setCurrentStepIndex(targetStepIdx);
            saveStoredOnboardingState(effectiveUid, {
              status: "in_progress",
              currentStepId: "home_demo_card",
            });
          }
        }
        break;
      case "start_demo_exam":
        if (currentStepConfig.id === "home_demo_card") {
          navigate("/student/tutorial/exam");
          nextStep();
        }
        break;
      case "answer_q1":
        if (currentStepConfig.id === "exam_q1_single") nextStep();
        break;
      case "answer_q2":
        if (currentStepConfig.id === "exam_q2_multi") nextStep();
        break;
      case "answer_q3":
        if (currentStepConfig.id === "exam_q3_truefalse") nextStep();
        break;
      case "answer_q4":
        if (currentStepConfig.id === "exam_q4_short") nextStep();
        break;
      case "answer_q5":
        if (currentStepConfig.id === "exam_q5_ordering") nextStep();
        break;
      case "answer_q6":
        if (currentStepConfig.id === "exam_q6_fillblank") nextStep();
        break;
      case "answer_q7":
        if (currentStepConfig.id === "exam_q7_matching") nextStep();
        break;
      case "open_scratchpad":
      case "close_scratchpad":
        if (currentStepConfig.id === "exam_tool_scratchpad") nextStep();
        break;
      case "toggle_casio":
        if (currentStepConfig.id === "exam_tool_casio") nextStep();
        break;
      case "toggle_flag":
        if (currentStepConfig.id === "exam_tool_flag") nextStep();
        break;
      case "toggle_map":
        if (currentStepConfig.id === "exam_tool_map") nextStep();
        break;
      case "toggle_display_mode":
        if (currentStepConfig.id === "exam_tool_mode") nextStep();
        break;
      case "open_submit_confirm":
        if (currentStepConfig.id === "exam_submit_btn") nextStep();
        break;
      case "execute_demo_submit":
        if (currentStepConfig.id === "exam_confirm_modal") {
          navigate("/student/tutorial/result");
          nextStep();
        }
        break;
      case "toggle_time_analysis":
        if (currentStepConfig.id === "result_time_analysis") nextStep();
        break;
      case "toggle_progress_chart":
        if (currentStepConfig.id === "result_progress_chart") nextStep();
        break;
      case "toggle_category_chart":
        if (currentStepConfig.id === "result_category_chart") nextStep();
        break;
      case "toggle_details":
        if (currentStepConfig.id === "result_details_btn") nextStep();
        break;
      case "toggle_explanation":
        if (currentStepConfig.id === "result_explanation") nextStep();
        break;
      case "open_ask_ai":
        if (currentStepConfig.id === "result_ask_ai") nextStep();
        break;
      case "open_report":
        if (currentStepConfig.id === "result_report") nextStep();
        break;
      case "toggle_leaderboard":
        if (currentStepConfig.id === "result_leaderboard") nextStep();
        break;
    }
  };

  return (
    <StudentOnboardingContext.Provider
      value={{
        isTutorialActive,
        currentStepId,
        currentStepConfig,
        isWelcomeModalOpen,
        isFinishModalOpen,
        isSkipModalOpen,
        targetRect,
        answersDraft,
        updateDemoAnswer,
        startTutorial,
        replayTutorial,
        nextStep,
        skipTutorial,
        confirmSkip,
        cancelSkip,
        completeTutorial,
        triggerAction,
      }}
    >
      {children}

      {/* Welcome Modal */}
      <StudentWelcomeModal
        isOpen={isWelcomeModalOpen}
        onStartTutorial={startTutorial}
        onSkipTutorial={skipTutorial}
      />

      {/* Spotlight and Tooltip Overlay when Tutorial is active */}
      {isTutorialActive && currentStepConfig && (
        <>
          <StudentOnboardingSpotlight targetRect={targetRect} />
          <StudentOnboardingTooltip
            title={currentStepConfig.title}
            description={currentStepConfig.description}
            stepNumber={currentStepIndex + 1}
            totalSteps={TOUR_STEPS.length}
            actionHint={currentStepConfig.actionHint}
            targetRect={targetRect}
            placement={currentStepConfig.placement}
            allowManualNext={currentStepConfig.allowManualNext}
            onNext={nextStep}
            onSkip={skipTutorial}
          />
        </>
      )}

      {/* Finish Completion Modal */}
      <StudentFinishModal isOpen={isFinishModalOpen} onFinish={completeTutorial} />

      {/* Skip Confirmation Modal */}
      <StudentSkipConfirmModal
        isOpen={isSkipModalOpen}
        onContinueTutorial={cancelSkip}
        onConfirmSkip={confirmSkip}
      />
    </StudentOnboardingContext.Provider>
  );
}

export function useStudentOnboarding() {
  const ctx = useContext(StudentOnboardingContext);
  if (!ctx) {
    throw new Error("useStudentOnboarding must be used within a StudentOnboardingProvider");
  }
  return ctx;
}

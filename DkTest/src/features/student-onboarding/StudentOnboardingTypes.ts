/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OnboardingStatus = "pending" | "in_progress" | "completed" | "skipped";

export type TourPhase =
  | "welcome"
  | "nav_tour"
  | "demo_banner"
  | "demo_exam"
  | "demo_result"
  | "completed";

export type TourStepId =
  // Welcome
  | "welcome_modal"

  // Navigation Tour
  | "nav_logo"
  | "nav_exams"
  | "page_exams_detail"
  | "nav_practice"
  | "page_practice_detail"
  | "nav_ai"
  | "page_ai_detail"
  | "nav_community"
  | "page_community_detail"
  | "nav_history"
  | "page_history_detail"
  | "nav_profile"
  | "page_profile_detail"
  | "nav_back_home"

  // Demo Exam Card on Home
  | "home_demo_card"

  // Demo Exam Steps
  | "exam_intro"
  | "exam_q1_single"
  | "exam_q2_multi"
  | "exam_q3_truefalse"
  | "exam_q4_short"
  | "exam_q5_ordering"
  | "exam_q6_fillblank"
  | "exam_q7_matching"
  | "exam_tool_scratchpad"
  | "exam_tool_map"
  | "exam_tool_flag"
  | "exam_tool_casio"
  | "exam_tool_mode"
  | "exam_submit_btn"
  | "exam_confirm_modal"

  // Demo Result Steps
  | "result_score_overview"
  | "result_time_analysis"
  | "result_progress_chart"
  | "result_category_chart"
  | "result_ai_analysis"
  | "result_details_btn"
  | "result_explanation"
  | "result_ask_ai"
  | "result_report"
  | "result_leaderboard"
  | "result_extra_tools"
  | "finish_modal";

export interface TourStepConfig {
  id: TourStepId;
  phase: TourPhase;
  stepNumber: number;
  totalStepsInPhase: number;
  targetId: string; // data-tour-id
  title: string;
  description: string;
  actionHint?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  requiresAction?: boolean; // If true, the user must perform the action before proceeding
  allowManualNext?: boolean; // If true, "Tiếp tục" button is visible
  nextRoute?: string;
  autoScroll?: boolean;
}

export interface StoredOnboardingState {
  version: "v1";
  uid: string;
  status: OnboardingStatus;
  currentStepId?: TourStepId;
  completedAt?: number;
  updatedAt: number;
  answersDraft?: Record<string, any>;
  hasInteractedWithScratchpad?: boolean;
  hasInteractedWithMap?: boolean;
  hasInteractedWithCasio?: boolean;
  hasInteractedWithFlag?: boolean;
}

export const TOUR_DATA_IDS = {
  BRAND_LOGO: "brand-logo",
  NAV_EXAMS: "student-nav-exams",
  NAV_PRACTICE: "student-nav-practice",
  NAV_AI: "student-nav-ai",
  NAV_COMMUNITY: "student-nav-community",
  NAV_HISTORY: "student-nav-history",
  NAV_PROFILE: "student-nav-profile",
  HEADER_AVATAR: "header-avatar-profile",

  // Home
  HOME_DEMO_CARD: "home-demo-exam-card",

  // Page level detailed overviews
  PAGE_EXAMS_OVERVIEW: "home-exam-library-intro",
  PAGE_PRACTICE_OVERVIEW: "practice-page-overview",
  PAGE_AI_TUTOR_OVERVIEW: "ai-tutor-page-overview",
  PAGE_COMMUNITY_OVERVIEW: "community-page-overview",
  PAGE_HISTORY_OVERVIEW: "history-page-overview",
  PAGE_PROFILE_OVERVIEW: "profile-page-overview",

  // Exam tools & question elements
  EXAM_HEADER: "exam-header-bar",
  EXAM_TIMER: "exam-timer-display",
  EXAM_QUESTION_CARD: "exam-question-card",
  EXAM_SINGLE_OPTIONS: "exam-single-options",
  EXAM_MULTI_OPTIONS: "exam-multi-options",
  EXAM_TRUEFALSE_GROUP: "exam-truefalse-group",
  EXAM_SHORT_INPUT: "exam-short-input",
  EXAM_ORDERING_ITEMS: "exam-ordering-items",
  EXAM_FILLBLANK_INPUTS: "exam-fillblank-inputs",
  EXAM_MATCHING_BOARD: "exam-matching-board",

  EXAM_SCRATCHPAD: "exam-scratchpad-btn",
  EXAM_CASIO: "exam-casio-btn",
  EXAM_QUESTION_MAP: "exam-question-map-btn",
  EXAM_FLAG: "exam-flag-btn",
  EXAM_MODE_TOGGLE: "exam-mode-toggle-btn",
  EXAM_SUBMIT: "exam-submit-btn",
  EXAM_CONFIRM_MODAL: "exam-confirm-modal-box",

  // Result page
  RESULT_SUMMARY: "result-summary-hero",
  RESULT_TIME_ANALYSIS: "result-time-analysis-accordion",
  RESULT_PROGRESS_CHART: "result-progress-chart-accordion",
  RESULT_CATEGORY_CHART: "result-category-chart-accordion",
  RESULT_AI_ANALYSIS: "result-ai-analysis-widget",
  RESULT_DETAILS_TOGGLE: "result-details-toggle-btn",
  RESULT_EXPLANATION_BTN: "result-explanation-btn",
  RESULT_ASK_AI_BTN: "result-ask-ai-btn",
  RESULT_REPORT_BTN: "result-report-btn",
  RESULT_LEADERBOARD_BTN: "result-leaderboard-btn",
  RESULT_RETAKE_BTN: "result-retake-btn",
  RESULT_EXPORT_BTN: "result-export-word-btn",
} as const;

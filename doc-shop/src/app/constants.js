/**
 * Application Constants
 */

export const Routes = {
  LANDING: "landing",
  HOME: "home",
  EXPLORE: "explore",
  DOCUMENT_DETAIL: "doc-detail",
  PROFILE: "profile",
  WALLET: "wallet",
  TRANSACTIONS: "transactions",
  PURCHASED: "purchased",
  FAVORITES: "favorites",
  BUNDLES: "bundles",
  NOTIFICATIONS: "notifications",
  ADMIN: "admin",
  
  // DkDocShop 2.0 Extended Routes
  DASHBOARD: "dashboard",
  LIBRARY: "library",
  READER: "reader",
  NOTES: "notes",
  FLASHCARDS: "flashcards",
  AI: "ai",
  SETTINGS: "settings",
  
  // Deprecated routes kept for backward safety
  QUIZ: "quiz",
  STUDY_PLAN: "study-plan",
  SELLER: "seller",
  WISHLIST: "wishlist",
  ACHIEVEMENTS: "achievements",
};

export const Collections = {
  // Legacy Collections
  DOCUMENTS: "documents",
  USERS: "users",
  PURCHASES: "purchases",
  TRANSACTIONS: "transactions",
  REPORTS: "reports",
  KEYWORDS: "keywords",
  KEY_USAGE_LOGS: "keyUsageLogs",
  UNIQUE_KEY_POOLS: "uniqueKeyPools",
  KEY_ALLOCATIONS: "keyAllocations",

  // 2.0 Extended Collections
  NOTES: "notes",
  FLASHCARD_DECKS: "flashcardDecks",
  FLASHCARDS: "flashcards",
  QUIZZES: "quizzes",
  QUIZ_ATTEMPTS: "quizAttempts",
  STUDY_TASKS: "studyTasks",
  STUDY_PROGRESS: "studyProgress",
  REVIEWS: "reviews",
  PROMOTIONS: "promotions",
  BUNDLES: "bundles",
  ANNOUNCEMENTS: "announcements",
  AUDIT_LOGS: "auditLogs",
  WISHLIST: "wishlist",
  ACHIEVEMENTS: "achievements",
  USER_ACHIEVEMENTS: "userAchievements",
  USER_SETTINGS: "userSettings",
  SELLER_PROFILES: "sellerProfiles",
  PAYOUTS: "payouts",
};

export const TransactionTypes = {
  DEPOSIT: "deposit",
  PURCHASE: "purchase",
  PAYOUT: "payout",
};

export const TransactionStatuses = {
  VERIFIED: "verified",
  PENDING: "pending",
  REJECTED: "rejected",
  SUCCESS: "success",
};

export const UserRoles = {
  ADMIN: "admin",
  SELLER: "seller",
  USER: "user",
};

export const ReportTypes = [
  "Lỗi link",
  "Lỗi key",
  "Nội dung sai",
  "Vi phạm bản quyền",
  "Lỗi thanh toán",
  "Khác",
];

export const TargetExams = [
  {
    id: "thpt-qg-2027",
    name: "Kỳ thi Tốt nghiệp THPT Quốc Gia",
    targetDate: "2027-06-25T07:30:00+07:00",
    badge: "Bộ GD&ĐT",
    color: "#2563eb",
  },
  {
    id: "dgnl-hcm-2027",
    name: "Đánh Giá Năng Lực ĐHQG TP.HCM (Đợt 1)",
    targetDate: "2027-04-05T07:30:00+07:00",
    badge: "ĐHQG-HCM",
    color: "#059669",
  },
  {
    id: "dgnl-hn-2027",
    name: "Đánh Giá Năng Lực ĐHQG Hà Nội (HSA)",
    targetDate: "2027-04-20T07:30:00+07:00",
    badge: "HSA",
    color: "#7c3aed",
  },
  {
    id: "hsg-qg-2027",
    name: "Kỳ thi Chọn Học Sinh Giỏi Quốc Gia",
    targetDate: "2027-01-08T07:30:00+07:00",
    badge: "HSGQG",
    color: "#d97706",
  },
];

export const AchievementRules = [
  {
    id: "first_login",
    title: "Chào mừng Tân Thủ",
    description: "Đăng nhập và hoàn tất hồ sơ học sinh đầu tiên",
    icon: "🎉",
    xp: 50,
  },
  {
    id: "first_purchase",
    title: "Tri Thức Đầu Tiên",
    description: "Sở hữu tài liệu học tập có phí đầu tiên",
    icon: "📘",
    xp: 100,
  },
  {
    id: "first_quiz",
    title: "Chiến Binh Luyện Đề",
    description: "Hoàn thành bài thi thử trắc nghiệm đầu tiên",
    icon: "🎯",
    xp: 150,
  },
  {
    id: "flashcard_master_10",
    title: "Thần Ký Nhớ",
    description: "Ôn tập và thuộc lòng hơn 10 thẻ Flashcard",
    icon: "🧠",
    xp: 120,
  },
  {
    id: "study_streak_7",
    title: "Kỷ Luật Thép",
    description: "Duy trì chuỗi học tập liên tục trong 7 ngày",
    icon: "🔥",
    xp: 300,
  },
  {
    id: "ai_learner",
    title: "Đồng Hành AI",
    description: "Đặt 5 câu hỏi học tập cùng trợ lý DkAI",
    icon: "🤖",
    xp: 80,
  },
];

export const DefaultFeatureFlags = {
  aiEnabled: true,
  sellerEnabled: true,
  flashcardsEnabled: true,
  quizEnabled: true,
  gamificationEnabled: true,
  darkModeEnabled: true,
  reviewsEnabled: true,
  promotionsEnabled: true,
};

import type { AiServiceCategoryKey, AiServiceItem } from "../../types/aiShop";

export interface InitialServiceSeed {
  id: string;
  code: string;
  name: string;
  categoryKey: AiServiceCategoryKey;
  categoryLabel: string;
  variantLabel: string;
  requiresUpgradeEmail: boolean;
  billingType: "one_time" | "monthly";
  defaultFirstPriceVnd: number | null;
  defaultRecurringPriceVnd: number | null;
  durationValue: number | null;
  durationUnit: "days" | "months" | null;
  conditions: string;
  studentVisible: boolean;
  sortOrder: number;
}

export interface StorefrontCategoryDefinition {
  key: AiServiceCategoryKey;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  requiresUpgradeEmail: boolean;
  sortOrder: number;
}

export const STOREFRONT_CATEGORIES: StorefrontCategoryDefinition[] = [
  {
    key: "chatgpt",
    title: "CHAT GPT",
    subtitle: "ChatGPT Plus 30 ngày — chọn gói Sài riêng hoặc Dùng chung",
    badge: "OpenAI",
    gradient: "from-emerald-500 to-teal-600",
    requiresUpgradeEmail: false,
    sortOrder: 1,
  },
  {
    key: "gemini_pro_3m",
    title: "Gemini Pro 3M",
    subtitle: "Gemini Pro chính chủ 3 tháng — chọn Link Offer hoặc Pay hộ",
    badge: "Google AI",
    gradient: "from-blue-600 to-indigo-600",
    requiresUpgradeEmail: false,
    sortOrder: 2,
  },
  {
    key: "gemini_plus_6m",
    title: "Gemini Plus 6M",
    subtitle: "Gemini Plus chính chủ 6 tháng — chọn Link Offer hoặc Pay hộ",
    badge: "Google AI",
    gradient: "from-sky-500 to-blue-600",
    requiresUpgradeEmail: false,
    sortOrder: 3,
  },
  {
    key: "gemini_pro_fam",
    title: "Gemini Pro (Add Fam)",
    subtitle: "Add Family theo tháng — chọn Slot Lỏm (Web) hoặc Slot Ngon (Full Antigravity)",
    badge: "Add Fam",
    gradient: "from-violet-600 to-purple-600",
    requiresUpgradeEmail: true,
    sortOrder: 4,
  },
  {
    key: "yt_pre",
    title: "Yt Pre",
    subtitle: "YouTube Premium không quảng cáo, phát nền & YouTube Music — gia hạn tháng",
    badge: "YouTube",
    gradient: "from-rose-500 to-red-600",
    requiresUpgradeEmail: true,
    sortOrder: 5,
  },
  {
    key: "verify_student",
    title: "Verify Student",
    subtitle: "Xác minh tài khoản sinh viên theo lượt nhanh chóng",
    badge: "Verify",
    gradient: "from-amber-500 to-orange-600",
    requiresUpgradeEmail: true,
    sortOrder: 6,
  },
  {
    key: "other",
    title: "Dịch vụ khác",
    subtitle: "Các gói dịch vụ AI mở rộng khác từ quản trị viên",
    badge: "Khác",
    gradient: "from-slate-600 to-slate-700",
    requiresUpgradeEmail: false,
    sortOrder: 99,
  },
];

/**
 * Initial catalog based strictly on the provided price sheet.
 * Prices not fixed in the price sheet MUST stay null so the order form requires explicit entry.
 */
export const INITIAL_AI_SERVICES: InitialServiceSeed[] = [
  {
    id: "svc_chatgpt_plus_30d_private",
    code: "GPT-30D-RIENG",
    name: "ChatGPT Plus 30D - riêng",
    categoryKey: "chatgpt",
    categoryLabel: "CHAT GPT",
    variantLabel: "Sài riêng (30 ngày)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 185000,
    defaultRecurringPriceVnd: null,
    durationValue: 30,
    durationUnit: "days",
    conditions: "Không bảo hành. Tài khoản sài riêng 30 ngày. Giá dao động ~185.000đ (có thể chỉnh khi tạo đơn).",
    studentVisible: true,
    sortOrder: 1,
  },
  {
    id: "svc_chatgpt_plus_30d_shared",
    code: "GPT-30D-CHUNG",
    name: "ChatGPT Plus 30D - chung",
    categoryKey: "chatgpt",
    categoryLabel: "CHAT GPT",
    variantLabel: "Dùng chung (30 ngày)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 50000,
    defaultRecurringPriceVnd: null,
    durationValue: 30,
    durationUnit: "days",
    conditions: "Không bảo hành. Tài khoản dùng chung 30 ngày.",
    studentVisible: true,
    sortOrder: 2,
  },
  {
    id: "svc_gemini_pro_3m_offer",
    code: "GEM-PRO-3M-OFFER",
    name: "Gemini Pro 3M - link offer",
    categoryKey: "gemini_pro_3m",
    categoryLabel: "Gemini Pro 3M",
    variantLabel: "Link Offer (3 tháng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 35000,
    defaultRecurringPriceVnd: null,
    durationValue: 3,
    durationUnit: "months",
    conditions: "Không bảo hành. Chính chủ 3 tháng nâng bằng link offer.",
    studentVisible: true,
    sortOrder: 3,
  },
  {
    id: "svc_gemini_pro_3m_payho",
    code: "GEM-PRO-3M-PAYHO",
    name: "Gemini Pro 3M - pay hộ",
    categoryKey: "gemini_pro_3m",
    categoryLabel: "Gemini Pro 3M",
    variantLabel: "Pay hộ (3 tháng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 40000,
    defaultRecurringPriceVnd: null,
    durationValue: 3,
    durationUnit: "months",
    conditions: "Không bảo hành. Chính chủ 3 tháng, shop pay hộ.",
    studentVisible: true,
    sortOrder: 4,
  },
  {
    id: "svc_gemini_plus_6m_offer",
    code: "GEM-PLUS-6M-OFFER",
    name: "Gemini Plus 6M - link offer",
    categoryKey: "gemini_plus_6m",
    categoryLabel: "Gemini Plus 6M",
    variantLabel: "Link Offer (6 tháng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 25000,
    defaultRecurringPriceVnd: null,
    durationValue: 6,
    durationUnit: "months",
    conditions: "Không bảo hành. Chính chủ 6 tháng nâng bằng link offer.",
    studentVisible: true,
    sortOrder: 5,
  },
  {
    id: "svc_gemini_plus_6m_payho",
    code: "GEM-PLUS-6M-PAYHO",
    name: "Gemini Plus 6M - pay hộ",
    categoryKey: "gemini_plus_6m",
    categoryLabel: "Gemini Plus 6M",
    variantLabel: "Pay hộ (6 tháng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 30000,
    defaultRecurringPriceVnd: null,
    durationValue: 6,
    durationUnit: "months",
    conditions: "Không bảo hành. Chính chủ 6 tháng, shop pay hộ.",
    studentVisible: true,
    sortOrder: 6,
  },
  {
    id: "svc_gemini_pro_slot_lom",
    code: "GEM-PRO-SLOT-LOM",
    name: "Gemini Pro slot lỏm",
    categoryKey: "gemini_pro_fam",
    categoryLabel: "Gemini Pro (Add Fam)",
    variantLabel: "Slot Lỏm (Hỗ trợ tốt Gemini Web)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 15000,
    defaultRecurringPriceVnd: 5000,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Không bảo hành. Hỗ trợ tốt Gemini Web. Kỳ đầu 15.000đ, từ kỳ 2 chỉ 5.000đ/tháng.",
    studentVisible: true,
    sortOrder: 7,
  },
  {
    id: "svc_gemini_pro_slot_ngon",
    code: "GEM-PRO-SLOT-NGON",
    name: "Gemini Pro slot ngon",
    categoryKey: "gemini_pro_fam",
    categoryLabel: "Gemini Pro (Add Fam)",
    variantLabel: "Slot Ngon (Full model Pro Antigravity)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 25000,
    defaultRecurringPriceVnd: 25000,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Không bảo hành. Có full các model hỗ trợ gói Pro mới nhất trong Antigravity. 25.000đ/tháng.",
    studentVisible: true,
    sortOrder: 8,
  },
  {
    id: "svc_youtube_premium_slot",
    code: "YT-PREM-SLOT",
    name: "YouTube Premium slot",
    categoryKey: "yt_pre",
    categoryLabel: "Yt Pre",
    variantLabel: "YouTube Premium Slot (1 tháng)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 25000,
    defaultRecurringPriceVnd: 25000,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Slot YouTube Premium gia hạn hàng tháng (25.000đ/tháng).",
    studentVisible: true,
    sortOrder: 9,
  },
  {
    id: "svc_verify_student",
    code: "VERIFY-STUDENT",
    name: "Verify Student",
    categoryKey: "verify_student",
    categoryLabel: "Verify Student",
    variantLabel: "Verify Student (Theo lượt)",
    requiresUpgradeEmail: true,
    billingType: "one_time",
    defaultFirstPriceVnd: 20000,
    defaultRecurringPriceVnd: null,
    durationValue: null,
    durationUnit: null,
    conditions: "Nhận Verify Student theo lượt.",
    studentVisible: true,
    sortOrder: 10,
  },
  {
    id: "svc_custom_quote",
    code: "GOI-KHAC",
    name: "Gói khác (báo giá riêng)",
    categoryKey: "other",
    categoryLabel: "Dịch vụ khác",
    variantLabel: "Báo giá riêng",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: null,
    defaultRecurringPriceVnd: null,
    durationValue: null,
    durationUnit: null,
    conditions: "Hỗ trợ các gói khác theo yêu cầu — chưa có giá cố định, bắt buộc nhập giá khi tạo đơn.",
    studentVisible: false,
    sortOrder: 11,
  },
];

/**
 * Resolves storefront grouping & upgrade-email requirement for any AiServiceItem,
 * including legacy Firestore records seeded before v1.9.16.
 */
export function resolveServiceStorefrontMeta(service: AiServiceItem): {
  categoryKey: AiServiceCategoryKey;
  categoryLabel: string;
  variantLabel: string;
  requiresUpgradeEmail: boolean;
} {
  const seedMatch = INITIAL_AI_SERVICES.find((s) => s.id === service.id);
  const norm = `${service.name} ${service.code}`.toLowerCase();

  let categoryKey: AiServiceCategoryKey = service.categoryKey || seedMatch?.categoryKey || "other";
  if (!service.categoryKey && !seedMatch) {
    if (norm.includes("chatgpt") || norm.includes("gpt")) categoryKey = "chatgpt";
    else if (norm.includes("gemini pro") && norm.includes("3m")) categoryKey = "gemini_pro_3m";
    else if (norm.includes("gemini plus") && norm.includes("6m")) categoryKey = "gemini_plus_6m";
    else if (norm.includes("gemini pro") && (norm.includes("slot") || norm.includes("fam")))
      categoryKey = "gemini_pro_fam";
    else if (norm.includes("youtube") || norm.includes("yt")) categoryKey = "yt_pre";
    else if (norm.includes("verify") || norm.includes("student")) categoryKey = "verify_student";
  }

  const catDef =
    STOREFRONT_CATEGORIES.find((c) => c.key === categoryKey) ||
    STOREFRONT_CATEGORIES[STOREFRONT_CATEGORIES.length - 1];

  const requiresUpgradeEmail =
    typeof service.requiresUpgradeEmail === "boolean"
      ? service.requiresUpgradeEmail
      : seedMatch?.requiresUpgradeEmail ?? catDef.requiresUpgradeEmail;

  const variantLabel = service.variantLabel || seedMatch?.variantLabel || service.name;

  return {
    categoryKey,
    categoryLabel: service.categoryLabel || seedMatch?.categoryLabel || catDef.title,
    variantLabel,
    requiresUpgradeEmail,
  };
}

export function buildSeedServiceRecords(nowIso: string): AiServiceItem[] {
  return INITIAL_AI_SERVICES.map((item) => ({
    ...item,
    status: "active",
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

import type { Voucher, VoucherType } from "../types";

export type VoucherCheckoutContext = "exam_unlock" | "course_unlock" | "deposit" | "gift_money";

export interface SavedVoucherItem {
  id: string;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscountVnd?: number;
  minOrderVnd?: number;
  minDepositVnd?: number;
  expiresAt?: string | null;
  perUserLimit?: number;
  description?: string;
  savedAt: string;
}

export interface SuggestedSavedVoucher {
  voucher: SavedVoucherItem;
  eligible: boolean;
  estimatedBenefitVnd: number;
  benefitLabel: string;
  reason?: string;
}

const STORAGE_PREFIX = "dktest_saved_vouchers_v1_";
const GUEST_STORAGE_KEY = `${STORAGE_PREFIX}guest`;

function getStorageKey(uid?: string | null): string {
  const cleanUid = String(uid || "").trim();
  return cleanUid ? `${STORAGE_PREFIX}${cleanUid}` : GUEST_STORAGE_KEY;
}

function normalizeCode(code: string): string {
  return String(code || "").trim().toUpperCase();
}

function readRawList(key: string): SavedVoucherItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedVoucherItem =>
        Boolean(item && typeof item.code === "string" && typeof item.type === "string")
    );
  } catch {
    return [];
  }
}

function writeRawList(key: string, list: SavedVoucherItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function isDiscountVoucherType(type: VoucherType): boolean {
  return type === "discount_percent" || type === "discount_fixed";
}

export function isDepositVoucherType(type: VoucherType): boolean {
  return type === "deposit_bonus_percent" || type === "deposit_bonus_fixed";
}

export function isVoucherMatchingContext(
  type: VoucherType,
  context: VoucherCheckoutContext
): boolean {
  if (context === "gift_money") return type === "gift_money";
  if (context === "deposit") return isDepositVoucherType(type);
  if (context === "exam_unlock" || context === "course_unlock") {
    return isDiscountVoucherType(type);
  }
  return false;
}

export function getVoucherCategoryLabel(type: VoucherType): string {
  switch (type) {
    case "gift_money":
      return "Voucher tặng tiền thẳng vào Ví";
    case "discount_percent":
    case "discount_fixed":
      return "Voucher giảm giá mở khóa Đề thi / Khóa học";
    case "deposit_bonus_percent":
    case "deposit_bonus_fixed":
      return "Voucher thưởng thêm khi Nạp tiền";
    default:
      return "Voucher ưu đãi DkTEST";
  }
}

export function formatVoucherBenefitSummary(
  voucher: Pick<Voucher, "type" | "value" | "maxDiscountVnd">
): string {
  const val = Math.max(0, Number(voucher.value) || 0);
  switch (voucher.type) {
    case "gift_money":
      return `Tặng thẳng +${val.toLocaleString("vi-VN")}đ vào ví`;
    case "discount_percent":
      return voucher.maxDiscountVnd && voucher.maxDiscountVnd > 0
        ? `Giảm ${val}% (tối đa ${voucher.maxDiscountVnd.toLocaleString("vi-VN")}đ)`
        : `Giảm ${val}% học phí`;
    case "discount_fixed":
      return `Giảm ngay ${val.toLocaleString("vi-VN")}đ`;
    case "deposit_bonus_percent":
      return `Thưởng nạp +${val}%`;
    case "deposit_bonus_fixed":
      return `Thưởng nạp +${val.toLocaleString("vi-VN")}đ`;
    default:
      return "Ưu đãi đặc biệt";
  }
}

export function buildVoucherContextMismatchMessage(
  voucherType: VoucherType,
  context: VoucherCheckoutContext
): string {
  if (context === "deposit") {
    if (isDiscountVoucherType(voucherType)) {
      return "Mã này là Voucher giảm giá mở khóa đề thi / khóa học — không áp dụng khi nạp tiền! Vui lòng dùng mã này ở bước mở khóa đề thi hoặc khóa học.";
    }
    if (voucherType === "gift_money") {
      return "Mã này là Voucher tặng tiền thẳng vào ví — hãy nhập ở mục 'Nhập mã Voucher quà tặng' phía trên để nhận tiền ngay!";
    }
    return "Mã voucher này không áp dụng cho thao tác nạp tiền.";
  }

  if (context === "exam_unlock" || context === "course_unlock") {
    const targetLabel = context === "course_unlock" ? "khóa học / bài giảng" : "đề thi";
    if (isDepositVoucherType(voucherType)) {
      return `Mã này là Voucher thưởng nạp tiền — không áp dụng để giảm giá mở khóa ${targetLabel}! Vui lòng dùng mã này tại trang Ví DkTEST khi nạp tiền.`;
    }
    if (voucherType === "gift_money") {
      return `Mã này là Voucher tặng tiền trực tiếp vào ví — hãy vào trang Ví DkTEST để nhận tiền thẳng vào ví trước rồi mở khóa ${targetLabel}!`;
    }
    return `Mã này không áp dụng để giảm giá mở khóa ${targetLabel}.`;
  }

  if (context === "gift_money") {
    if (isDiscountVoucherType(voucherType)) {
      return "Đây là Voucher giảm giá mở khóa đề thi / khóa học (không phải mã tặng tiền thẳng). Hãy bấm 'Lưu voucher' để hệ thống tự đề xuất khi bạn thanh toán mở khóa!";
    }
    if (isDepositVoucherType(voucherType)) {
      return "Đây là Voucher thưởng thêm khi nạp tiền (không phải mã tặng tiền thẳng). Hãy bấm 'Lưu voucher' để áp dụng ngay ở bước nạp Ví DkTEST!";
    }
    return "Mã này không phải mã quà tặng nạp tiền trực tiếp.";
  }

  return "Loại voucher không phù hợp với thao tác hiện tại.";
}

/**
 * Reads all saved vouchers from localStorage for the given user (automatically merging any guest-saved vouchers).
 */
export function getSavedVouchers(uid?: string | null): SavedVoucherItem[] {
  const userKey = getStorageKey(uid);
  const userList = readRawList(userKey);

  if (uid && userKey !== GUEST_STORAGE_KEY) {
    const guestList = readRawList(GUEST_STORAGE_KEY);
    if (guestList.length > 0) {
      const mergedMap = new Map<string, SavedVoucherItem>();
      for (const item of [...guestList, ...userList]) {
        mergedMap.set(normalizeCode(item.code), { ...item, code: normalizeCode(item.code) });
      }
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
      );
      writeRawList(userKey, merged);
      writeRawList(GUEST_STORAGE_KEY, []);
      return merged;
    }
  }

  return userList.sort(
    (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
  );
}

export function isVoucherSavedLocally(code: string, uid?: string | null): boolean {
  const clean = normalizeCode(code);
  if (!clean) return false;
  return getSavedVouchers(uid).some((v) => normalizeCode(v.code) === clean);
}

/**
 * Saves a non-gift voucher into the local voucher wallet.
 * Tracks whether the voucher was already saved so reopening the same link notifies "Đã lưu".
 */
export function saveVoucherLocally(
  voucher: Pick<
    Voucher,
    | "id"
    | "code"
    | "name"
    | "type"
    | "value"
    | "maxDiscountVnd"
    | "minOrderVnd"
    | "minDepositVnd"
    | "expiresAt"
    | "perUserLimit"
    | "description"
  >,
  uid?: string | null
): { saved: boolean; alreadySaved: boolean; item: SavedVoucherItem; list: SavedVoucherItem[] } {
  const cleanCode = normalizeCode(voucher.code);
  const current = getSavedVouchers(uid);
  const existing = current.find((v) => normalizeCode(v.code) === cleanCode);

  const item: SavedVoucherItem = {
    id: voucher.id || `local_${cleanCode}`,
    code: cleanCode,
    name: voucher.name || `Voucher ${cleanCode}`,
    type: voucher.type,
    value: Math.max(0, Number(voucher.value) || 0),
    ...(voucher.maxDiscountVnd ? { maxDiscountVnd: Number(voucher.maxDiscountVnd) } : {}),
    ...(voucher.minOrderVnd ? { minOrderVnd: Number(voucher.minOrderVnd) } : {}),
    ...(voucher.minDepositVnd ? { minDepositVnd: Number(voucher.minDepositVnd) } : {}),
    expiresAt: voucher.expiresAt || null,
    ...(voucher.perUserLimit ? { perUserLimit: Number(voucher.perUserLimit) } : {}),
    ...(voucher.description ? { description: voucher.description } : {}),
    savedAt: existing?.savedAt || new Date().toISOString(),
  };

  if (voucher.type === "gift_money") {
    return { saved: false, alreadySaved: false, item, list: current };
  }

  if (existing) {
    // Refresh metadata silently without duplicating entry
    const updated = current.map((v) => (normalizeCode(v.code) === cleanCode ? item : v));
    writeRawList(getStorageKey(uid), updated);
    return { saved: true, alreadySaved: true, item, list: updated };
  }

  const next = [item, ...current];
  writeRawList(getStorageKey(uid), next);
  return { saved: true, alreadySaved: false, item, list: next };
}

export function removeSavedVoucherLocally(code: string, uid?: string | null): SavedVoucherItem[] {
  const clean = normalizeCode(code);
  const next = getSavedVouchers(uid).filter((v) => normalizeCode(v.code) !== clean);
  writeRawList(getStorageKey(uid), next);
  return next;
}

export function markSavedVoucherConsumed(code: string, uid?: string | null): void {
  const clean = normalizeCode(code);
  if (!clean) return;
  const current = getSavedVouchers(uid);
  const matched = current.find((v) => normalizeCode(v.code) === clean);
  if (!matched) return;
  // Remove single-use vouchers from local suggestions once successfully applied in checkout
  if (!matched.perUserLimit || matched.perUserLimit <= 1) {
    removeSavedVoucherLocally(clean, uid);
  }
}

export function estimateVoucherBenefitVnd(
  voucher: Pick<Voucher, "type" | "value" | "maxDiscountVnd">,
  amountVnd: number
): number {
  const base = Math.max(0, Math.floor(Number(amountVnd) || 0));
  const val = Math.max(0, Number(voucher.value) || 0);

  if (voucher.type === "discount_percent") {
    let disc = Math.round((base * val) / 100);
    if (voucher.maxDiscountVnd && voucher.maxDiscountVnd > 0 && disc > voucher.maxDiscountVnd) {
      disc = voucher.maxDiscountVnd;
    }
    return Math.min(base, Math.max(0, disc));
  }
  if (voucher.type === "discount_fixed") {
    return Math.min(base, Math.max(0, Math.floor(val)));
  }
  if (voucher.type === "deposit_bonus_percent") {
    return Math.max(0, Math.round((base * val) / 100));
  }
  if (voucher.type === "deposit_bonus_fixed") {
    return Math.max(0, Math.floor(val));
  }
  return Math.max(0, Math.floor(val));
}

/**
 * Shopee-style voucher suggestion engine: returns saved vouchers matching the current payment context,
 * sorted with eligible highest-benefit vouchers first and ineligible (e.g., min order not met) listed with exact reasons.
 */
export function getSuggestedSavedVouchersForContext(
  uid: string | null | undefined,
  context: "exam_unlock" | "course_unlock" | "deposit",
  amountVnd: number
): SuggestedSavedVoucher[] {
  const saved = getSavedVouchers(uid);
  const now = Date.now();
  const base = Math.max(0, Math.floor(Number(amountVnd) || 0));

  const matching = saved.filter((v) => isVoucherMatchingContext(v.type, context));

  const evaluated: SuggestedSavedVoucher[] = matching.map((v) => {
    const expMs = v.expiresAt ? new Date(v.expiresAt).getTime() : NaN;
    const isExpired = !isNaN(expMs) && expMs < now;
    const estimatedBenefitVnd = estimateVoucherBenefitVnd(v, base);
    const benefitLabel = formatVoucherBenefitSummary(v);

    if (isExpired) {
      return {
        voucher: v,
        eligible: false,
        estimatedBenefitVnd: 0,
        benefitLabel,
        reason: "Đã hết hạn sử dụng",
      };
    }

    if (context === "deposit") {
      if (v.minDepositVnd && base < v.minDepositVnd) {
        return {
          voucher: v,
          eligible: false,
          estimatedBenefitVnd,
          benefitLabel,
          reason: `Cần nạp tối thiểu ${v.minDepositVnd.toLocaleString("vi-VN")}đ`,
        };
      }
    } else {
      if (v.minOrderVnd && base < v.minOrderVnd) {
        return {
          voucher: v,
          eligible: false,
          estimatedBenefitVnd,
          benefitLabel,
          reason: `Áp dụng cho đơn từ ${v.minOrderVnd.toLocaleString("vi-VN")}đ`,
        };
      }
    }

    return {
      voucher: v,
      eligible: true,
      estimatedBenefitVnd,
      benefitLabel,
    };
  });

  // Sort: eligible first, then highest estimatedBenefitVnd, then newest savedAt
  return evaluated.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (b.estimatedBenefitVnd !== a.estimatedBenefitVnd) {
      return b.estimatedBenefitVnd - a.estimatedBenefitVnd;
    }
    return new Date(b.voucher.savedAt || 0).getTime() - new Date(a.voucher.savedAt || 0).getTime();
  });
}

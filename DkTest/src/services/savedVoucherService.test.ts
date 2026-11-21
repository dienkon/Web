import { beforeEach, describe, expect, it } from "vitest";
import {
  saveVoucherLocally,
  isVoucherSavedLocally,
  getSavedVouchers,
  removeSavedVoucherLocally,
  markSavedVoucherConsumed,
  getSuggestedSavedVouchersForContext,
  buildVoucherContextMismatchMessage,
} from "./savedVoucherService";
import type { Voucher } from "../types";

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
};

const examPercentVoucher: Voucher = {
  id: "v_exam_50",
  code: "GIAM50",
  name: "Giảm 50% mở khóa đề",
  type: "discount_percent",
  value: 50,
  maxDiscountVnd: 10000,
  minOrderVnd: 5000,
  usageLimit: 100,
  usedCount: 0,
  perUserLimit: 1,
  expiresAt: null,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const examFixedVoucher: Voucher = {
  id: "v_exam_2k",
  code: "GIAM2K",
  name: "Giảm 2.000đ mọi đề",
  type: "discount_fixed",
  value: 2000,
  minOrderVnd: 2000,
  usageLimit: 100,
  usedCount: 0,
  perUserLimit: 1,
  expiresAt: null,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const depositBonusVoucher: Voucher = {
  id: "v_dep_20",
  code: "NAP20",
  name: "Thưởng 20% khi nạp",
  type: "deposit_bonus_percent",
  value: 20,
  minDepositVnd: 5000,
  usageLimit: 100,
  usedCount: 0,
  perUserLimit: 1,
  expiresAt: null,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const giftMoneyVoucher: Voucher = {
  id: "v_gift_5k",
  code: "TANG5K",
  name: "Tặng 5.000đ trực tiếp",
  type: "gift_money",
  value: 5000,
  usageLimit: 50,
  usedCount: 0,
  perUserLimit: 1,
  expiresAt: null,
  isActive: true,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

describe("savedVoucherService (Shopee-style local vault & suggestions)", () => {
  beforeEach(() => {
    const mem = createMemoryStorage();
    (globalThis as any).window = {
      localStorage: mem,
      dispatchEvent: () => true,
    };
    (globalThis as any).localStorage = mem;
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, init?: { detail?: any }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  });

  it("saves non-gift voucher once and reports alreadySaved=true when saved again", () => {
    const first = saveVoucherLocally(examPercentVoucher, "student_1");
    expect(first.saved).toBe(true);
    expect(first.alreadySaved).toBe(false);
    expect(isVoucherSavedLocally("giam50", "student_1")).toBe(true);

    const second = saveVoucherLocally(examPercentVoucher, "student_1");
    expect(second.saved).toBe(true);
    expect(second.alreadySaved).toBe(true);
    expect(getSavedVouchers("student_1")).toHaveLength(1);
  });

  it("refuses to store gift_money voucher in the local discount vault", () => {
    const res = saveVoucherLocally(giftMoneyVoucher, "student_1");
    expect(res.saved).toBe(false);
    expect(getSavedVouchers("student_1")).toHaveLength(0);
  });

  it("merges guest saved vouchers into user vault upon login", () => {
    saveVoucherLocally(depositBonusVoucher, null);
    expect(getSavedVouchers(null)).toHaveLength(1);

    const merged = getSavedVouchers("student_99");
    expect(merged).toHaveLength(1);
    expect(merged[0].code).toBe("NAP20");
    expect(getSavedVouchers(null)).toHaveLength(0);
  });

  it("suggests only matching vouchers per context and ranks best eligible savings first", () => {
    saveVoucherLocally(examPercentVoucher, "u1");
    saveVoucherLocally(examFixedVoucher, "u1");
    saveVoucherLocally(depositBonusVoucher, "u1");

    // Context: exam_unlock with 10,000đ -> both exam vouchers eligible, GIAM50 (5,000đ) before GIAM2K (2,000đ), NAP20 excluded
    const examSuggestions = getSuggestedSavedVouchersForContext("u1", "exam_unlock", 10000);
    expect(examSuggestions.map((s) => s.voucher.code)).toEqual(["GIAM50", "GIAM2K"]);
    expect(examSuggestions[0].eligible).toBe(true);
    expect(examSuggestions[0].estimatedBenefitVnd).toBe(5000);
    expect(examSuggestions[1].estimatedBenefitVnd).toBe(2000);

    // Context: exam_unlock with 3,000đ -> GIAM2K eligible, GIAM50 ineligible (minOrder 5,000đ)
    const smallOrderSuggestions = getSuggestedSavedVouchersForContext("u1", "exam_unlock", 3000);
    expect(smallOrderSuggestions[0].voucher.code).toBe("GIAM2K");
    expect(smallOrderSuggestions[0].eligible).toBe(true);
    expect(smallOrderSuggestions[1].voucher.code).toBe("GIAM50");
    expect(smallOrderSuggestions[1].eligible).toBe(false);
    expect(smallOrderSuggestions[1].reason).toContain("5.000đ");

    // Context: deposit with 10,000đ -> ONLY NAP20 suggested (+2,000đ)
    const depositSuggestions = getSuggestedSavedVouchersForContext("u1", "deposit", 10000);
    expect(depositSuggestions).toHaveLength(1);
    expect(depositSuggestions[0].voucher.code).toBe("NAP20");
    expect(depositSuggestions[0].eligible).toBe(true);
    expect(depositSuggestions[0].estimatedBenefitVnd).toBe(2000);
  });

  it("removes voucher from local vault when consumed or deleted", () => {
    saveVoucherLocally(examFixedVoucher, "u1");
    saveVoucherLocally(depositBonusVoucher, "u1");

    markSavedVoucherConsumed("GIAM2K", "u1");
    expect(isVoucherSavedLocally("GIAM2K", "u1")).toBe(false);
    expect(isVoucherSavedLocally("NAP20", "u1")).toBe(true);

    removeSavedVoucherLocally("NAP20", "u1");
    expect(getSavedVouchers("u1")).toHaveLength(0);
  });

  it("produces clear Shopee-style mismatch messages when wrong voucher type is entered", () => {
    const examInDeposit = buildVoucherContextMismatchMessage("discount_percent", "deposit");
    expect(examInDeposit.toLowerCase()).toContain("giảm giá mở khóa đề thi");
    expect(examInDeposit.toLowerCase()).toContain("nạp tiền");

    const depositInExam = buildVoucherContextMismatchMessage("deposit_bonus_percent", "exam_unlock");
    expect(depositInExam.toLowerCase()).toContain("thưởng nạp tiền");
    expect(depositInExam.toLowerCase()).toContain("mở khóa đề thi");

    const giftInDeposit = buildVoucherContextMismatchMessage("gift_money", "deposit");
    expect(giftInDeposit.toLowerCase()).toContain("tặng tiền thẳng vào ví");
  });
});

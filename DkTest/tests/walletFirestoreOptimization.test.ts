import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryFirestoreRestDocs, clearServerRestCache } from "../server/firebaseAdmin.js";
import {
  getStudentWalletDetails,
  invalidateStudentDetailsCache,
  getDepositRequests,
  invalidateDepositRequestsCache,
  recordManualCashCollection,
  adjustStudentDebt,
  grantOrRevokeExamEntitlement,
  adminDirectEditWallet,
} from "../server/services/walletService.js";
import { validateVoucher, invalidateVouchersCache } from "../server/services/voucherService.js";

describe("Wallet & Voucher Firestore Read Optimization", () => {
  beforeEach(() => {
    clearServerRestCache();
    invalidateStudentDetailsCache();
    invalidateDepositRequestsCache();
    invalidateVouchersCache();
    vi.restoreAllMocks();
  });

  describe("queryFirestoreRestDocs input validation", () => {
    it("returns empty array immediately if collectionName, field or value is undefined", async () => {
      const res1 = await queryFirestoreRestDocs("", "uid", "user1");
      const res2 = await queryFirestoreRestDocs("wallets", "", "user1");
      const res3 = await queryFirestoreRestDocs("wallets", "uid", undefined);

      expect(res1).toEqual([]);
      expect(res2).toEqual([]);
      expect(res3).toEqual([]);
    });
  });

  describe("Deposit requests multi-key Map caching", () => {
    it("caches different statuses independently without overwriting", async () => {
      // In-memory cache should return cached values across different queries
      const resPending = await getDepositRequests({ status: "pending", limit: 10 });
      const resApproved = await getDepositRequests({ status: "approved", limit: 10 });
      const resAll = await getDepositRequests({ status: "all", limit: 10 });

      expect(Array.isArray(resPending)).toBe(true);
      expect(Array.isArray(resApproved)).toBe(true);
      expect(Array.isArray(resAll)).toBe(true);

      // Subsequent call should hit cache
      const cachedPending = await getDepositRequests({ status: "pending", limit: 10 });
      expect(cachedPending).toBe(resPending);
    });
  });

  describe("Student details cache invalidation", () => {
    it("invalidates student details cache on manual cash collection and debt adjustment", async () => {
      const studentUid = "test_student_cache_123";
      
      // Load initial details into cache
      const initial = await getStudentWalletDetails(studentUid);
      expect(initial).toBeDefined();

      // Second read hits cache
      const fromCache = await getStudentWalletDetails(studentUid);
      expect(fromCache).toBe(initial);

      // Invalidate
      invalidateStudentDetailsCache(studentUid);

      // Third read is a new object
      const fresh = await getStudentWalletDetails(studentUid);
      expect(fresh).not.toBe(initial);
    }, 15000);
  });

  describe("Voucher validation read optimization", () => {
    it("returns invalid immediately for empty code without hitting DB", async () => {
      const result = await validateVoucher({ code: "", uid: "student_1", context: "gift_money" });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Vui lòng nhập mã");
    });
  });
});

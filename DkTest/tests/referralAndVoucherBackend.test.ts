import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearServerRestCache } from "../server/firebaseAdmin.js";
import {
  inspectVoucher,
  recordVoucherSave,
  validateVoucher,
  invalidateVouchersCache,
  invalidateVoucherUsagesCache,
} from "../server/services/voucherService.js";
import {
  extractClientIp,
  hashAntiFraudSignal,
  generateRandomReferralRewardVnd,
  getOrCreateReferralProfile,
  claimReferralCode,
  withdrawReferralBalanceToWallet,
  REFERRAL_MIN_REWARD_VND,
  REFERRAL_MAX_REWARD_VND,
  REFERRAL_MIN_WITHDRAW_VND,
} from "../server/services/referralService.js";

function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = encodeFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("stringValue" in val) return String(val.stringValue);
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in val) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function makeDocPayload(collection: string, docId: string, data: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = encodeFirestoreValue(v);
  }
  return {
    name: `projects/exam-fd7a1/databases/(default)/documents/${collection}/${docId}`,
    fields,
  };
}

function createMockFirestoreRest(initial: Record<string, Record<string, any>>) {
  const db: Record<string, Record<string, any>> = {};
  for (const [col, docs] of Object.entries(initial)) {
    db[col] = {};
    for (const [id, data] of Object.entries(docs)) {
      db[col][id] = structuredClone(data);
    }
  }

  const fetchMock = vi.fn(async (input: any, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : String(input?.url || "");
    const cleanUrl = rawUrl.split("?")[0];
    const method = (init?.method || "GET").toUpperCase();

    // Handle :runQuery
    if (cleanUrl.endsWith(":runQuery") && method === "POST") {
      const body = JSON.parse(String(init?.body || "{}"));
      const sq = body.structuredQuery || {};
      const col = sq.from?.[0]?.collectionId;
      const filter = sq.where?.fieldFilter;
      const fieldPath = filter?.field?.fieldPath;
      const targetVal = filter?.value ? decodeFirestoreValue(filter.value) : undefined;
      const docsMap = db[col] || {};
      const matched: any[] = [];
      for (const [docId, docData] of Object.entries(docsMap)) {
        if (!fieldPath || docData[fieldPath] === targetVal) {
          matched.push({ document: makeDocPayload(col, docId, docData) });
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => (matched.length > 0 ? matched : [{ readTime: new Date().toISOString() }]),
      };
    }

    // Match /documents/{collection}/{docId}
    const docMatch = cleanUrl.match(/\/documents\/([^/]+)\/([^/]+)$/);
    if (docMatch) {
      const col = decodeURIComponent(docMatch[1]);
      const docId = decodeURIComponent(docMatch[2]);

      if (method === "GET") {
        const found = db[col]?.[docId];
        if (!found) {
          return { ok: false, status: 404, json: async () => ({ error: { message: "NOT_FOUND" } }) };
        }
        return { ok: true, status: 200, json: async () => makeDocPayload(col, docId, found) };
      }

      if (method === "PATCH" || method === "POST") {
        const body = JSON.parse(String(init?.body || "{}"));
        const decoded: Record<string, any> = {};
        for (const [k, v] of Object.entries(body.fields || {})) {
          decoded[k] = decodeFirestoreValue(v);
        }
        if (!db[col]) db[col] = {};
        db[col][docId] = decoded;
        return { ok: true, status: 200, json: async () => makeDocPayload(col, docId, decoded) };
      }
    }

    return { ok: false, status: 404, json: async () => ({ error: "unhandled_mock_url", rawUrl }) };
  });

  vi.stubGlobal("fetch", fetchMock);
  return { db, fetchMock };
}

describe("Voucher inspect/save/mismatch & Referral anti-fraud backend", () => {
  beforeEach(() => {
    clearServerRestCache();
    invalidateVouchersCache();
    invalidateVoucherUsagesCache();
    vi.restoreAllMocks();
  });

  it("recordVoucherSave increments only savedCount and never usedCount, and rejects gift_money", async () => {
    const { db } = createMockFirestoreRest({
      vouchers: {
        v1: {
          id: "v1",
          code: "GIAM30",
          name: "Giảm 30%",
          type: "discount_percent",
          value: 30,
          usageLimit: 50,
          usedCount: 2,
          savedCount: 5,
          perUserLimit: 1,
          isActive: true,
          expiresAt: null,
        },
        v_gift: {
          id: "v_gift",
          code: "TANG5K",
          name: "Quà 5K",
          type: "gift_money",
          value: 5000,
          usageLimit: 50,
          usedCount: 0,
          isActive: true,
          expiresAt: null,
        },
      },
    });

    const inspectRes = await inspectVoucher("GIAM30");
    expect(inspectRes.found).toBe(true);
    expect(inspectRes.voucher?.code).toBe("GIAM30");

    const saveRes = await recordVoucherSave("GIAM30");
    expect(saveRes.success).toBe(true);
    expect(saveRes.savedCount).toBe(6);
    expect(db.vouchers.v1.savedCount).toBe(6);
    expect(db.vouchers.v1.usedCount).toBe(2); // unchanged!

    await expect(recordVoucherSave("TANG5K")).rejects.toThrow("quà tặng cộng tiền trực tiếp");
  });

  it("validateVoucher rejects exam discount voucher during deposit with immediate mismatch notice", async () => {
    createMockFirestoreRest({
      vouchers: {
        v1: {
          id: "v1",
          code: "GIAM30",
          name: "Giảm 30% mở đề",
          type: "discount_percent",
          value: 30,
          usageLimit: 50,
          usedCount: 0,
          perUserLimit: 1,
          isActive: true,
          expiresAt: null,
        },
        v2: {
          id: "v2",
          code: "NAP20",
          name: "Thưởng 20% nạp tiền",
          type: "deposit_bonus_percent",
          value: 20,
          usageLimit: 50,
          usedCount: 0,
          perUserLimit: 1,
          isActive: true,
          expiresAt: null,
        },
      },
      voucher_usages: {},
    });

    const wrongForDeposit = await validateVoucher({
      code: "GIAM30",
      uid: "stu_1",
      context: "deposit",
      amountVnd: 10000,
    });
    expect(wrongForDeposit.valid).toBe(false);
    expect(wrongForDeposit.message?.toLowerCase()).toContain("giảm giá mở khóa đề thi");
    expect(wrongForDeposit.message?.toLowerCase()).toContain("nạp tiền");

    const wrongForExam = await validateVoucher({
      code: "NAP20",
      uid: "stu_1",
      context: "exam_unlock",
      amountVnd: 10000,
    });
    expect(wrongForExam.valid).toBe(false);
    expect(wrongForExam.message?.toLowerCase()).toContain("thưởng nạp tiền");
    expect(wrongForExam.message?.toLowerCase()).toContain("mở khóa đề thi");
  });

  it("generates cryptographically random referral reward strictly within [100, 1000] VND", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const val = generateRandomReferralRewardVnd();
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(REFERRAL_MIN_REWARD_VND);
      expect(val).toBeLessThanOrEqual(REFERRAL_MAX_REWARD_VND);
      seen.add(val);
    }
    expect(seen.size).toBeGreaterThan(50);
  });

  it("extracts and hashes client IP and device fingerprint cleanly", () => {
    const ip = extractClientIp({ headers: { "x-forwarded-for": "::ffff:203.0.113.45, 10.0.0.1" } });
    expect(ip).toBe("203.0.113.45");
    const h1 = hashAntiFraudSignal("ip", ip);
    const h2 = hashAntiFraudSignal("ip", "203.0.113.45");
    const h3 = hashAntiFraudSignal("ip", "198.51.100.7");
    expect(h1).toBeTruthy();
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toContain("203.0.113.45");
  });

  it("enforces anti-fraud checks (self-ref, same IP, same device, duplicate claim, old account, mutual loop) and credits valid referral", async () => {
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();

    const { db } = createMockFirestoreRest({
      users: {
        referrer_1: { uid: "referrer_1", email: "a@test.com", username: "user_a", createdAt: oldIso },
        referee_ok: { uid: "referee_ok", email: "b@test.com", username: "user_b", createdAt: nowIso },
        referee_same_ip: { uid: "referee_same_ip", email: "c@test.com", username: "user_c", createdAt: nowIso },
        referee_same_dev: { uid: "referee_same_dev", email: "d@test.com", username: "user_d", createdAt: nowIso },
        referee_old: { uid: "referee_old", email: "e@test.com", username: "user_e", createdAt: oldIso },
        referee_ip_reuse: { uid: "referee_ip_reuse", email: "f@test.com", username: "user_f", createdAt: nowIso },
      },
      referral_profiles: {},
      referral_codes: {},
      referral_claims: {},
      referral_ip_guards: {},
      referral_device_guards: {},
    });

    // 1. Create referrer profile with referrer's IP & device
    const refDash = await getOrCreateReferralProfile("referrer_1", {
      ip: "203.0.113.10",
      deviceFingerprint: "fp_referrer_pc",
    });
    const refCode = refDash.profile.code;
    expect(refCode).toMatch(/^DK[A-Z0-9]{6}$/);
    expect((refDash.profile as any).lastKnownIpHash).toBeUndefined();

    // 2. Reject self-referral
    await expect(
      claimReferralCode("referrer_1", refCode, { ip: "198.51.100.1", deviceFingerprint: "fp_other" })
    ).rejects.toThrow("tự nhập mã giới thiệu");

    // 3. Reject same IP as referrer
    await expect(
      claimReferralCode("referee_same_ip", refCode, {
        ip: "203.0.113.10",
        deviceFingerprint: "fp_different_phone",
      })
    ).rejects.toThrow("dùng chung địa chỉ IP");

    // 4. Reject same device as referrer
    await expect(
      claimReferralCode("referee_same_dev", refCode, {
        ip: "198.51.100.22",
        deviceFingerprint: "fp_referrer_pc",
      })
    ).rejects.toThrow("dùng chung thiết bị");

    // 5. Reject account older than 7 days
    await expect(
      claimReferralCode("referee_old", refCode, {
        ip: "198.51.100.33",
        deviceFingerprint: "fp_old_user",
      })
    ).rejects.toThrow("trong vòng 7 ngày");

    // 6. Valid new friend from distinct IP & device succeeds with 100..1000đ
    const okRes = await claimReferralCode("referee_ok", refCode, {
      ip: "198.51.100.44",
      deviceFingerprint: "fp_friend_phone",
      refereeName: "Bạn Mới",
    });
    expect(okRes.success).toBe(true);
    expect(okRes.rewardVnd).toBeGreaterThanOrEqual(100);
    expect(okRes.rewardVnd).toBeLessThanOrEqual(1000);
    expect(db.referral_profiles.referrer_1.referralBalanceVnd).toBe(okRes.rewardVnd);
    expect(db.referral_profiles.referrer_1.successfulReferralsCount).toBe(1);

    // 7. Reject duplicate claim by same referee
    await expect(
      claimReferralCode("referee_ok", refCode, {
        ip: "198.51.100.55",
        deviceFingerprint: "fp_friend_phone_2",
      })
    ).rejects.toThrow("đã xác nhận mã giới thiệu trước đó");

    // 8. Reject another account reusing the exact IP that already claimed for this referrer
    await expect(
      claimReferralCode("referee_ip_reuse", refCode, {
        ip: "198.51.100.44",
        deviceFingerprint: "fp_another_phone",
      })
    ).rejects.toThrow("địa chỉ IP này đã từng xác nhận");

    // 9. Reject mutual A <-> B loop (referrer_1 trying to claim referee_ok's code)
    const friendDash = await getOrCreateReferralProfile("referee_ok");
    db.users.referrer_1.createdAt = nowIso; // even if account were new
    await expect(
      claimReferralCode("referrer_1", friendDash.profile.code, {
        ip: "198.51.100.99",
        deviceFingerprint: "fp_brand_new",
      })
    ).rejects.toThrow("giới thiệu chéo");
  });

  it("enforces minimum 1,000đ withdrawal and transfers referral balance into DkTEST wallet", async () => {
    const { db } = createMockFirestoreRest({
      referral_profiles: {
        u_low: {
          uid: "u_low",
          code: "DKLOW123",
          referralBalanceVnd: 950,
          totalEarnedVnd: 950,
          totalWithdrawnVnd: 0,
          successfulReferralsCount: 2,
        },
        u_ready: {
          uid: "u_ready",
          code: "DKRDY123",
          referralBalanceVnd: 1450,
          totalEarnedVnd: 1450,
          totalWithdrawnVnd: 0,
          successfulReferralsCount: 3,
        },
      },
      wallets: {
        u_low: { uid: "u_low", balanceVnd: 2000, totalCreditedVnd: 2000, totalSpentVnd: 0 },
        u_ready: { uid: "u_ready", balanceVnd: 5000, totalCreditedVnd: 5000, totalSpentVnd: 0 },
      },
      wallet_transactions: {},
    });

    await expect(withdrawReferralBalanceToWallet("u_low")).rejects.toThrow(
      `${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}đ`
    );

    const wRes = await withdrawReferralBalanceToWallet("u_ready");
    expect(wRes.success).toBe(true);
    expect(wRes.withdrawnVnd).toBe(1450);
    expect(wRes.remainingReferralBalanceVnd).toBe(0);
    expect(wRes.newWalletBalanceVnd).toBe(6450);

    expect(db.referral_profiles.u_ready.referralBalanceVnd).toBe(0);
    expect(db.referral_profiles.u_ready.totalWithdrawnVnd).toBe(1450);
    expect(db.wallets.u_ready.balanceVnd).toBe(6450);
    expect(db.wallet_transactions[wRes.transactionId]?.type).toBe("referral_withdraw_credit");
  });
});

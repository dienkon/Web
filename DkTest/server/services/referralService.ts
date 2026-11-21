/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referral & Anti-Fraud Service (DkTEST)
 * - Invite friends to use DkTEST and earn a server-generated random reward (100đ - 1,000đ)
 * - Minimum withdrawal from Referral Balance to DkTEST Wallet: 1,000đ
 * - Strict anti-fraud checks: IP hash guard, device fingerprint guard, self-referral check,
 *   mutual loop prevention, account age & status check, and daily velocity limit.
 *
 * Supports dual modes:
 * - Firebase Admin SDK (atomic Firestore transactions)
 * - Firestore REST API fallback (when running without service account key)
 */

import crypto from "crypto";
import {
  adminDb,
  getFirestoreRestDoc,
  queryFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import {
  getOrCreateWallet,
  invalidateWalletOverviewCache,
  invalidateStudentDetailsCache,
  updateWalletOverviewAggregates,
  sanitizeVnd,
  parseTimestampMs,
} from "./walletService.js";
import type {
  ReferralClaimRecord,
  ReferralProfile,
  StudentWallet,
  WalletTransaction,
} from "../../src/types/index.js";

export const REFERRAL_MIN_REWARD_VND = 100;
export const REFERRAL_MAX_REWARD_VND = 1000;
export const REFERRAL_MIN_WITHDRAW_VND = 1000;
export const REFERRAL_MAX_DAILY_CLAIMS = 20;
export const REFERRAL_IP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const REFERRAL_IP_MAX_LIFETIME_CLAIMS = 2;
export const REFERRAL_DEVICE_MAX_CLAIMS = 1;
export const REFERRAL_NEW_ACCOUNT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface ReferralSignalContext {
  ip?: string | null;
  deviceFingerprint?: string | null;
  refereeEmail?: string | null;
  refereeName?: string | null;
}

interface IpGuardDoc {
  id: string;
  ipHash: string;
  totalClaims: number;
  lastClaimAt: string;
  referrerUids: string[];
  refereeUids: string[];
  updatedAt: string;
}

interface DeviceGuardDoc {
  id: string;
  deviceHash: string;
  totalClaims: number;
  lastClaimAt: string;
  refereeUids: string[];
  updatedAt: string;
}

export function normalizeReferralCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function getVietnamDateKey(nowMs: number = Date.now()): string {
  const vnDate = new Date(nowMs + 7 * 60 * 60 * 1000);
  return vnDate.toISOString().slice(0, 10);
}

export function extractClientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const headers = req?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  let candidate = "";

  if (rawForwarded && typeof rawForwarded === "string") {
    candidate = rawForwarded.split(",")[0]?.trim() || "";
  }
  if (!candidate) {
    const cfIp = headers["cf-connecting-ip"];
    candidate = (Array.isArray(cfIp) ? cfIp[0] : cfIp) || "";
  }
  if (!candidate) {
    const realIp = headers["x-real-ip"];
    candidate = (Array.isArray(realIp) ? realIp[0] : realIp) || "";
  }
  if (!candidate) {
    candidate = req?.ip || req?.socket?.remoteAddress || "";
  }

  let normalized = String(candidate || "").trim();
  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.slice(7);
  }
  if (normalized === "::1") {
    normalized = "127.0.0.1";
  }
  return normalized;
}

export function hashAntiFraudSignal(kind: "ip" | "device", rawValue?: string | null): string | null {
  const clean = String(rawValue || "").trim();
  if (!clean || clean.length < 3 || clean.toLowerCase() === "unknown") {
    return null;
  }
  const salt =
    process.env.REFERRAL_HASH_SALT ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_API_SECRET ||
    "dktest_referral_guard_v1";
  return crypto
    .createHmac("sha256", salt)
    .update(`${kind}:${clean}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Cryptographically uniform integer in [100, 1000] VND.
 */
export function generateRandomReferralRewardVnd(): number {
  return crypto.randomInt(REFERRAL_MIN_REWARD_VND, REFERRAL_MAX_REWARD_VND + 1);
}

export function generateReferralCodeCandidate(uid: string, attempt = 0): string {
  const digest = crypto
    .createHash("sha256")
    .update(`dktest_ref_code:${uid}:${attempt}`)
    .digest();
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
  }
  return `DK${suffix}`;
}

function sanitizeReferralProfile(uid: string, raw?: Partial<ReferralProfile> | null): ReferralProfile {
  const now = new Date().toISOString();
  return {
    uid,
    code: normalizeReferralCode(raw?.code || ""),
    referralBalanceVnd: sanitizeVnd(raw?.referralBalanceVnd),
    totalEarnedVnd: sanitizeVnd(raw?.totalEarnedVnd),
    totalWithdrawnVnd: sanitizeVnd(raw?.totalWithdrawnVnd),
    successfulReferralsCount: Math.max(0, Math.floor(Number(raw?.successfulReferralsCount || 0))),
    referredByUid: raw?.referredByUid || undefined,
    referredByCode: raw?.referredByCode || undefined,
    referredAt: raw?.referredAt || undefined,
    lastKnownIpHash: raw?.lastKnownIpHash || undefined,
    lastKnownDeviceHash: raw?.lastKnownDeviceHash || undefined,
    dailyClaimsDate: raw?.dailyClaimsDate || undefined,
    dailyClaimsCount: Math.max(0, Math.floor(Number(raw?.dailyClaimsCount || 0))),
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || now,
  };
}

function stripSensitiveProfileFields(profile: ReferralProfile): ReferralProfile {
  const { lastKnownIpHash: _ip, lastKnownDeviceHash: _dev, ...safe } = profile;
  return safe;
}

async function allocateUniqueCodeForUid(uid: string): Promise<string> {
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateReferralCodeCandidate(uid, attempt);
    if (adminDb) {
      const codeRef = adminDb.collection("referral_codes").doc(candidate);
      const snap = await codeRef.get();
      if (!snap.exists) {
        await codeRef.set({
          code: candidate,
          uid,
          createdAt: now,
        });
        return candidate;
      }
      if (snap.data()?.uid === uid) {
        return candidate;
      }
    } else {
      const existing = await getFirestoreRestDoc("referral_codes", candidate, false);
      if (!existing) {
        await setFirestoreRestDoc("referral_codes", candidate, {
          code: candidate,
          uid,
          createdAt: now,
        });
        return candidate;
      }
      if (existing.uid === uid) {
        return candidate;
      }
    }
  }
  const fallback = `DK${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
  if (adminDb) {
    await adminDb.collection("referral_codes").doc(fallback).set({ code: fallback, uid, createdAt: now });
  } else {
    await setFirestoreRestDoc("referral_codes", fallback, { code: fallback, uid, createdAt: now });
  }
  return fallback;
}

async function getRecentReferralsForReferrer(referrerUid: string, limitCount = 20): Promise<ReferralClaimRecord[]> {
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection("referral_claims")
        .where("referrerUid", "==", referrerUid)
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralClaimRecord));
    } catch {
      const snap = await adminDb
        .collection("referral_claims")
        .where("referrerUid", "==", referrerUid)
        .limit(50)
        .get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralClaimRecord));
      rows.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
      return rows.slice(0, limitCount);
    }
  } else {
    const docs = await queryFirestoreRestDocs("referral_claims", "referrerUid", referrerUid, 50);
    const rows = (docs || []).map((d) => ({ id: d.id, ...d } as ReferralClaimRecord));
    rows.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
    return rows.slice(0, limitCount);
  }
}

export async function getOrCreateReferralProfile(
  uid: string,
  signals?: { ip?: string | null; deviceFingerprint?: string | null }
): Promise<{
  profile: ReferralProfile;
  recentClaims: ReferralClaimRecord[];
  rules: {
    minRewardVnd: number;
    maxRewardVnd: number;
    minWithdrawVnd: number;
    maxDailyClaims: number;
  };
}> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) {
    throw new Error("Tài khoản không hợp lệ.");
  }

  const ipHash = hashAntiFraudSignal("ip", signals?.ip);
  const deviceHash = hashAntiFraudSignal("device", signals?.deviceFingerprint);
  const now = new Date().toISOString();

  let profile: ReferralProfile;

  if (adminDb) {
    const ref = adminDb.collection("referral_profiles").doc(cleanUid);
    const snap = await ref.get();
    if (snap.exists) {
      profile = sanitizeReferralProfile(cleanUid, snap.data() as ReferralProfile);
      const patch: Record<string, any> = {};
      if (!profile.code) {
        profile.code = await allocateUniqueCodeForUid(cleanUid);
        patch.code = profile.code;
      }
      if (ipHash && profile.lastKnownIpHash !== ipHash) {
        profile.lastKnownIpHash = ipHash;
        patch.lastKnownIpHash = ipHash;
      }
      if (deviceHash && profile.lastKnownDeviceHash !== deviceHash) {
        profile.lastKnownDeviceHash = deviceHash;
        patch.lastKnownDeviceHash = deviceHash;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now;
        await ref.set(patch, { merge: true });
      }
    } else {
      const code = await allocateUniqueCodeForUid(cleanUid);
      profile = sanitizeReferralProfile(cleanUid, {
        uid: cleanUid,
        code,
        referralBalanceVnd: 0,
        totalEarnedVnd: 0,
        totalWithdrawnVnd: 0,
        successfulReferralsCount: 0,
        lastKnownIpHash: ipHash || undefined,
        lastKnownDeviceHash: deviceHash || undefined,
        createdAt: now,
        updatedAt: now,
      });
      await ref.set(profile);
    }
  } else {
    const existing = await getFirestoreRestDoc("referral_profiles", cleanUid, false);
    if (existing) {
      profile = sanitizeReferralProfile(cleanUid, existing as ReferralProfile);
      let changed = false;
      if (!profile.code) {
        profile.code = await allocateUniqueCodeForUid(cleanUid);
        changed = true;
      }
      if (ipHash && profile.lastKnownIpHash !== ipHash) {
        profile.lastKnownIpHash = ipHash;
        changed = true;
      }
      if (deviceHash && profile.lastKnownDeviceHash !== deviceHash) {
        profile.lastKnownDeviceHash = deviceHash;
        changed = true;
      }
      if (changed) {
        profile.updatedAt = now;
        await setFirestoreRestDoc("referral_profiles", cleanUid, profile);
      }
    } else {
      const code = await allocateUniqueCodeForUid(cleanUid);
      profile = sanitizeReferralProfile(cleanUid, {
        uid: cleanUid,
        code,
        referralBalanceVnd: 0,
        totalEarnedVnd: 0,
        totalWithdrawnVnd: 0,
        successfulReferralsCount: 0,
        lastKnownIpHash: ipHash || undefined,
        lastKnownDeviceHash: deviceHash || undefined,
        createdAt: now,
        updatedAt: now,
      });
      await setFirestoreRestDoc("referral_profiles", cleanUid, profile);
    }
  }

  const recentClaims = await getRecentReferralsForReferrer(cleanUid, 20);
  const safeRecentClaims = recentClaims.map(({ ipHash: _i, deviceHash: _d, ...rest }) => rest);

  return {
    profile: stripSensitiveProfileFields(profile),
    recentClaims: safeRecentClaims,
    rules: {
      minRewardVnd: REFERRAL_MIN_REWARD_VND,
      maxRewardVnd: REFERRAL_MAX_REWARD_VND,
      minWithdrawVnd: REFERRAL_MIN_WITHDRAW_VND,
      maxDailyClaims: REFERRAL_MAX_DAILY_CLAIMS,
    },
  };
}

async function getUserAccountMeta(uid: string): Promise<{
  exists: boolean;
  createdAtMs: number;
  email: string;
  username: string;
  displayName: string;
  disabled: boolean;
}> {
  let doc: any = null;
  try {
    if (adminDb) {
      const snap = await adminDb.collection("users").doc(uid).get();
      if (snap.exists) doc = snap.data();
    } else {
      doc = await getFirestoreRestDoc("users", uid, false);
    }
  } catch {
    doc = null;
  }

  if (!doc) {
    return {
      exists: false,
      createdAtMs: 0,
      email: "",
      username: "",
      displayName: "",
      disabled: false,
    };
  }

  return {
    exists: true,
    createdAtMs: parseTimestampMs(doc.createdAt),
    email: String(doc.email || "").trim().toLowerCase(),
    username: String(doc.username || "").trim().toLowerCase(),
    displayName: String(doc.fullName || doc.displayName || doc.username || "").trim(),
    disabled: Boolean(doc.disabled || doc.banned || doc.status === "banned" || doc.status === "suspended"),
  };
}

function validateAntiFraudGuards(params: {
  nowMs: number;
  refereeUid: string;
  referrerUid: string;
  referrerProfile: ReferralProfile;
  refereeAlreadyClaimed: boolean;
  ipHash: string | null;
  deviceHash: string | null;
  ipGuard: IpGuardDoc | null;
  deviceGuard: DeviceGuardDoc | null;
  refereeMeta: Awaited<ReturnType<typeof getUserAccountMeta>>;
  referrerMeta: Awaited<ReturnType<typeof getUserAccountMeta>>;
}): void {
  const {
    nowMs,
    refereeUid,
    referrerUid,
    referrerProfile,
    refereeAlreadyClaimed,
    ipHash,
    deviceHash,
    ipGuard,
    deviceGuard,
    refereeMeta,
    referrerMeta,
  } = params;

  if (referrerUid === refereeUid) {
    throw new Error("Bạn không thể tự nhập mã giới thiệu của chính mình.");
  }

  if (refereeMeta.disabled) {
    throw new Error("Tài khoản của bạn không đủ điều kiện tham gia chương trình giới thiệu.");
  }

  if (referrerMeta.disabled) {
    throw new Error("Mã giới thiệu này hiện không khả dụng.");
  }

  if (
    (refereeMeta.email && referrerMeta.email && refereeMeta.email === referrerMeta.email) ||
    (refereeMeta.username && referrerMeta.username && refereeMeta.username === referrerMeta.username)
  ) {
    throw new Error("Phát hiện trùng thông tin tài khoản giữa người mời và người được mời.");
  }

  if (refereeMeta.createdAtMs > 0 && nowMs - refereeMeta.createdAtMs > REFERRAL_NEW_ACCOUNT_MAX_AGE_MS) {
    throw new Error("Chỉ tài khoản mới tạo trong vòng 7 ngày mới được nhập mã giới thiệu.");
  }

  if (refereeAlreadyClaimed) {
    throw new Error("Tài khoản của bạn đã xác nhận mã giới thiệu trước đó rồi.");
  }

  if (referrerProfile.referredByUid && referrerProfile.referredByUid === refereeUid) {
    throw new Error("Không thể giới thiệu chéo giữa 2 tài khoản đã giới thiệu nhau.");
  }

  // Same IP or same device as referrer
  if (ipHash && referrerProfile.lastKnownIpHash && ipHash === referrerProfile.lastKnownIpHash) {
    throw new Error("Hệ thống chống gian lận: không thể nhận thưởng khi dùng chung địa chỉ IP / mạng với người mời.");
  }

  if (deviceHash && referrerProfile.lastKnownDeviceHash && deviceHash === referrerProfile.lastKnownDeviceHash) {
    throw new Error("Hệ thống chống gian lận: không thể nhận thưởng khi dùng chung thiết bị với người mời.");
  }

  // IP Guard
  if (ipGuard) {
    const referrerList = Array.isArray(ipGuard.referrerUids) ? ipGuard.referrerUids : [];
    if (referrerList.includes(referrerUid)) {
      throw new Error("Hệ thống chống gian lận: địa chỉ IP này đã từng xác nhận mã cho người mời này.");
    }
    if ((ipGuard.totalClaims || 0) >= REFERRAL_IP_MAX_LIFETIME_CLAIMS) {
      throw new Error("Hệ thống chống gian lận: địa chỉ IP này đã đạt giới hạn lượt xác nhận mã giới thiệu.");
    }
    const lastClaimMs = parseTimestampMs(ipGuard.lastClaimAt);
    if (lastClaimMs > 0 && nowMs - lastClaimMs < REFERRAL_IP_COOLDOWN_MS) {
      throw new Error("Hệ thống chống gian lận: địa chỉ IP này vừa xác nhận mã giới thiệu gần đây. Vui lòng thử lại sau 24 giờ.");
    }
  }

  // Device Guard
  if (deviceGuard && (deviceGuard.totalClaims || 0) >= REFERRAL_DEVICE_MAX_CLAIMS) {
    throw new Error("Hệ thống chống gian lận: thiết bị này đã từng xác nhận mã giới thiệu trước đó.");
  }

  // Referrer Daily Velocity Cap
  const todayVn = getVietnamDateKey(nowMs);
  if (
    referrerProfile.dailyClaimsDate === todayVn &&
    (referrerProfile.dailyClaimsCount || 0) >= REFERRAL_MAX_DAILY_CLAIMS
  ) {
    throw new Error("Mã giới thiệu này đã đạt giới hạn lượt mời trong ngày hôm nay.");
  }
}

export async function claimReferralCode(
  refereeUid: string,
  rawCode: string,
  signals: ReferralSignalContext = {}
): Promise<{
  success: boolean;
  code: string;
  referrerUid: string;
  rewardVnd: number;
  message: string;
}> {
  const cleanRefereeUid = String(refereeUid || "").trim();
  const code = normalizeReferralCode(rawCode);

  if (!cleanRefereeUid) {
    throw new Error("Vui lòng đăng nhập để xác nhận mã giới thiệu.");
  }
  if (!code || code.length < 4) {
    throw new Error("Mã giới thiệu không hợp lệ.");
  }

  // Resolve code -> referrerUid
  let codeDoc: any = null;
  if (adminDb) {
    const snap = await adminDb.collection("referral_codes").doc(code).get();
    if (snap.exists) codeDoc = snap.data();
  } else {
    codeDoc = await getFirestoreRestDoc("referral_codes", code, false);
  }

  if (!codeDoc || !codeDoc.uid) {
    throw new Error("Mã giới thiệu không tồn tại trên hệ thống.");
  }

  const referrerUid = String(codeDoc.uid).trim();
  if (referrerUid === cleanRefereeUid) {
    throw new Error("Bạn không thể tự nhập mã giới thiệu của chính mình.");
  }

  // Ensure referee has a profile initialized
  await getOrCreateReferralProfile(cleanRefereeUid, {
    ip: signals.ip,
    deviceFingerprint: signals.deviceFingerprint,
  });

  const [refereeMeta, referrerMeta] = await Promise.all([
    getUserAccountMeta(cleanRefereeUid),
    getUserAccountMeta(referrerUid),
  ]);

  const ipHash = hashAntiFraudSignal("ip", signals.ip);
  const deviceHash = hashAntiFraudSignal("device", signals.deviceFingerprint);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayVn = getVietnamDateKey(nowMs);
  const rewardVnd = generateRandomReferralRewardVnd();
  const refereeDisplayName =
    String(signals.refereeName || refereeMeta.displayName || "Học sinh mới").trim();

  if (adminDb) {
    await adminDb.runTransaction(async (tx) => {
      const claimRef = adminDb.collection("referral_claims").doc(cleanRefereeUid);
      const referrerProfileRef = adminDb.collection("referral_profiles").doc(referrerUid);
      const refereeProfileRef = adminDb.collection("referral_profiles").doc(cleanRefereeUid);
      const ipGuardRef = ipHash ? adminDb.collection("referral_ip_guards").doc(ipHash) : null;
      const deviceGuardRef = deviceHash
        ? adminDb.collection("referral_device_guards").doc(deviceHash)
        : null;

      const [claimSnap, referrerSnap, refereeSnap, ipSnap, deviceSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(referrerProfileRef),
        tx.get(refereeProfileRef),
        ipGuardRef ? tx.get(ipGuardRef) : Promise.resolve(null),
        deviceGuardRef ? tx.get(deviceGuardRef) : Promise.resolve(null),
      ]);

      const referrerProfile = sanitizeReferralProfile(
        referrerUid,
        referrerSnap.exists ? (referrerSnap.data() as ReferralProfile) : { uid: referrerUid, code }
      );
      const refereeProfile = sanitizeReferralProfile(
        cleanRefereeUid,
        refereeSnap.exists ? (refereeSnap.data() as ReferralProfile) : { uid: cleanRefereeUid }
      );

      validateAntiFraudGuards({
        nowMs,
        refereeUid: cleanRefereeUid,
        referrerUid,
        referrerProfile,
        refereeAlreadyClaimed: claimSnap.exists || Boolean(refereeProfile.referredByUid),
        ipHash,
        deviceHash,
        ipGuard: ipSnap && ipSnap.exists ? (ipSnap.data() as IpGuardDoc) : null,
        deviceGuard: deviceSnap && deviceSnap.exists ? (deviceSnap.data() as DeviceGuardDoc) : null,
        refereeMeta,
        referrerMeta,
      });

      const nextDailyCount =
        referrerProfile.dailyClaimsDate === todayVn
          ? (referrerProfile.dailyClaimsCount || 0) + 1
          : 1;

      tx.set(
        referrerProfileRef,
        {
          uid: referrerUid,
          code: referrerProfile.code || code,
          referralBalanceVnd: referrerProfile.referralBalanceVnd + rewardVnd,
          totalEarnedVnd: referrerProfile.totalEarnedVnd + rewardVnd,
          successfulReferralsCount: referrerProfile.successfulReferralsCount + 1,
          dailyClaimsDate: todayVn,
          dailyClaimsCount: nextDailyCount,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      tx.set(
        refereeProfileRef,
        {
          uid: cleanRefereeUid,
          referredByUid: referrerUid,
          referredByCode: code,
          referredAt: nowIso,
          ...(ipHash ? { lastKnownIpHash: ipHash } : {}),
          ...(deviceHash ? { lastKnownDeviceHash: deviceHash } : {}),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      const claimDoc: ReferralClaimRecord = {
        id: cleanRefereeUid,
        referrerUid,
        referrerCode: code,
        refereeUid: cleanRefereeUid,
        refereeName: refereeDisplayName,
        rewardVnd,
        status: "credited",
        ipHash: ipHash || undefined,
        deviceHash: deviceHash || undefined,
        createdAt: nowIso,
      };
      tx.set(claimRef, claimDoc);

      if (ipGuardRef && ipHash) {
        const prevIp = ipSnap && ipSnap.exists ? (ipSnap.data() as IpGuardDoc) : null;
        const nextReferrers = Array.from(new Set([...(prevIp?.referrerUids || []), referrerUid]));
        const nextReferees = Array.from(new Set([...(prevIp?.refereeUids || []), cleanRefereeUid]));
        tx.set(ipGuardRef, {
          id: ipHash,
          ipHash,
          totalClaims: (prevIp?.totalClaims || 0) + 1,
          lastClaimAt: nowIso,
          referrerUids: nextReferrers,
          refereeUids: nextReferees,
          updatedAt: nowIso,
        });
      }

      if (deviceGuardRef && deviceHash) {
        const prevDev = deviceSnap && deviceSnap.exists ? (deviceSnap.data() as DeviceGuardDoc) : null;
        const nextReferees = Array.from(new Set([...(prevDev?.refereeUids || []), cleanRefereeUid]));
        tx.set(deviceGuardRef, {
          id: deviceHash,
          deviceHash,
          totalClaims: (prevDev?.totalClaims || 0) + 1,
          lastClaimAt: nowIso,
          refereeUids: nextReferees,
          updatedAt: nowIso,
        });
      }
    });
  } else {
    // REST API fallback mode
    const [existingClaim, rawReferrer, rawReferee, rawIpGuard, rawDeviceGuard] = await Promise.all([
      getFirestoreRestDoc("referral_claims", cleanRefereeUid, false),
      getFirestoreRestDoc("referral_profiles", referrerUid, false),
      getFirestoreRestDoc("referral_profiles", cleanRefereeUid, false),
      ipHash ? getFirestoreRestDoc("referral_ip_guards", ipHash, false) : Promise.resolve(null),
      deviceHash ? getFirestoreRestDoc("referral_device_guards", deviceHash, false) : Promise.resolve(null),
    ]);

    const referrerProfile = sanitizeReferralProfile(
      referrerUid,
      (rawReferrer as ReferralProfile) || { uid: referrerUid, code }
    );
    const refereeProfile = sanitizeReferralProfile(
      cleanRefereeUid,
      (rawReferee as ReferralProfile) || { uid: cleanRefereeUid }
    );

    validateAntiFraudGuards({
      nowMs,
      refereeUid: cleanRefereeUid,
      referrerUid,
      referrerProfile,
      refereeAlreadyClaimed: Boolean(existingClaim) || Boolean(refereeProfile.referredByUid),
      ipHash,
      deviceHash,
      ipGuard: (rawIpGuard as IpGuardDoc) || null,
      deviceGuard: (rawDeviceGuard as DeviceGuardDoc) || null,
      refereeMeta,
      referrerMeta,
    });

    const nextDailyCount =
      referrerProfile.dailyClaimsDate === todayVn
        ? (referrerProfile.dailyClaimsCount || 0) + 1
        : 1;

    await setFirestoreRestDoc("referral_profiles", referrerUid, {
      ...referrerProfile,
      code: referrerProfile.code || code,
      referralBalanceVnd: referrerProfile.referralBalanceVnd + rewardVnd,
      totalEarnedVnd: referrerProfile.totalEarnedVnd + rewardVnd,
      successfulReferralsCount: referrerProfile.successfulReferralsCount + 1,
      dailyClaimsDate: todayVn,
      dailyClaimsCount: nextDailyCount,
      updatedAt: nowIso,
    });

    await setFirestoreRestDoc("referral_profiles", cleanRefereeUid, {
      ...refereeProfile,
      referredByUid: referrerUid,
      referredByCode: code,
      referredAt: nowIso,
      ...(ipHash ? { lastKnownIpHash: ipHash } : {}),
      ...(deviceHash ? { lastKnownDeviceHash: deviceHash } : {}),
      updatedAt: nowIso,
    });

    const claimDoc: ReferralClaimRecord = {
      id: cleanRefereeUid,
      referrerUid,
      referrerCode: code,
      refereeUid: cleanRefereeUid,
      refereeName: refereeDisplayName,
      rewardVnd,
      status: "credited",
      ipHash: ipHash || undefined,
      deviceHash: deviceHash || undefined,
      createdAt: nowIso,
    };
    await setFirestoreRestDoc("referral_claims", cleanRefereeUid, claimDoc);

    if (ipHash) {
      const prevIp = (rawIpGuard as IpGuardDoc) || null;
      await setFirestoreRestDoc("referral_ip_guards", ipHash, {
        id: ipHash,
        ipHash,
        totalClaims: (prevIp?.totalClaims || 0) + 1,
        lastClaimAt: nowIso,
        referrerUids: Array.from(new Set([...(prevIp?.referrerUids || []), referrerUid])),
        refereeUids: Array.from(new Set([...(prevIp?.refereeUids || []), cleanRefereeUid])),
        updatedAt: nowIso,
      });
    }

    if (deviceHash) {
      const prevDev = (rawDeviceGuard as DeviceGuardDoc) || null;
      await setFirestoreRestDoc("referral_device_guards", deviceHash, {
        id: deviceHash,
        deviceHash,
        totalClaims: (prevDev?.totalClaims || 0) + 1,
        lastClaimAt: nowIso,
        refereeUids: Array.from(new Set([...(prevDev?.refereeUids || []), cleanRefereeUid])),
        updatedAt: nowIso,
      });
    }
  }

  return {
    success: true,
    code,
    referrerUid,
    rewardVnd,
    message: `Xác nhận mã giới thiệu ${code} thành công! Người giới thiệu đã nhận thưởng ngẫu nhiên +${rewardVnd.toLocaleString("vi-VN")}đ.`,
  };
}

export async function withdrawReferralBalanceToWallet(
  uid: string,
  requestedAmountVnd?: number
): Promise<{
  success: boolean;
  withdrawnVnd: number;
  remainingReferralBalanceVnd: number;
  newWalletBalanceVnd: number;
  transactionId: string;
  message: string;
}> {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) {
    throw new Error("Tài khoản không hợp lệ.");
  }

  // Ensure wallet exists before transaction
  await getOrCreateWallet(cleanUid);

  const nowIso = new Date().toISOString();
  const txId = `tx_ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  let withdrawnVnd = 0;
  let remainingReferralBalanceVnd = 0;
  let newWalletBalanceVnd = 0;

  if (adminDb) {
    await adminDb.runTransaction(async (tx) => {
      const refProfileRef = adminDb.collection("referral_profiles").doc(cleanUid);
      const walletRef = adminDb.collection("wallets").doc(cleanUid);

      const [refSnap, walletSnap] = await Promise.all([tx.get(refProfileRef), tx.get(walletRef)]);
      if (!refSnap.exists) {
        throw new Error(`Số dư thưởng giới thiệu chưa đủ mức tối thiểu ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}đ để rút.`);
      }

      const refData = sanitizeReferralProfile(cleanUid, refSnap.data() as ReferralProfile);
      const available = refData.referralBalanceVnd;
      const amount =
        requestedAmountVnd !== undefined && requestedAmountVnd !== null
          ? sanitizeVnd(requestedAmountVnd)
          : available;

      if (amount < REFERRAL_MIN_WITHDRAW_VND) {
        throw new Error(
          `Số tiền rút tối thiểu là ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}đ (hiện có ${available.toLocaleString("vi-VN")}đ).`
        );
      }
      if (amount > available) {
        throw new Error(
          `Số dư thưởng giới thiệu không đủ (hiện có ${available.toLocaleString("vi-VN")}đ).`
        );
      }

      const walletData = walletSnap.exists ? (walletSnap.data() as StudentWallet) : null;
      const prevBalance = sanitizeVnd(walletData?.balanceVnd);
      newWalletBalanceVnd = prevBalance + amount;
      withdrawnVnd = amount;
      remainingReferralBalanceVnd = available - amount;

      tx.set(
        refProfileRef,
        {
          referralBalanceVnd: remainingReferralBalanceVnd,
          totalWithdrawnVnd: refData.totalWithdrawnVnd + amount,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      tx.set(
        walletRef,
        {
          uid: cleanUid,
          balanceVnd: newWalletBalanceVnd,
          totalCreditedVnd: sanitizeVnd(walletData?.totalCreditedVnd) + amount,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txDoc: WalletTransaction = {
        id: txId,
        uid: cleanUid,
        type: "referral_withdraw_credit",
        amountVnd: amount,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newWalletBalanceVnd,
        actorUid: "system",
        actorName: "Thưởng giới thiệu bạn bè",
        note: `Rút tiền thưởng mời bạn bè (Ref) về Ví DkTEST: +${amount.toLocaleString("vi-VN")}đ`,
        createdAt: nowIso,
      };
      tx.set(txRef, txDoc);
    });
  } else {
    const rawProfile = await getFirestoreRestDoc("referral_profiles", cleanUid, false);
    if (!rawProfile) {
      throw new Error(
        `Số dư thưởng giới thiệu chưa đủ mức tối thiểu ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}đ để rút.`
      );
    }

    const refData = sanitizeReferralProfile(cleanUid, rawProfile as ReferralProfile);
    const available = refData.referralBalanceVnd;
    const amount =
      requestedAmountVnd !== undefined && requestedAmountVnd !== null
        ? sanitizeVnd(requestedAmountVnd)
        : available;

    if (amount < REFERRAL_MIN_WITHDRAW_VND) {
      throw new Error(
        `Số tiền rút tối thiểu là ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}đ (hiện có ${available.toLocaleString("vi-VN")}đ).`
      );
    }
    if (amount > available) {
      throw new Error(
        `Số dư thưởng giới thiệu không đủ (hiện có ${available.toLocaleString("vi-VN")}đ).`
      );
    }

    const walletData = (await getFirestoreRestDoc("wallets", cleanUid, false)) as StudentWallet | null;
    const prevBalance = sanitizeVnd(walletData?.balanceVnd);
    newWalletBalanceVnd = prevBalance + amount;
    withdrawnVnd = amount;
    remainingReferralBalanceVnd = available - amount;

    await setFirestoreRestDoc("referral_profiles", cleanUid, {
      ...refData,
      referralBalanceVnd: remainingReferralBalanceVnd,
      totalWithdrawnVnd: refData.totalWithdrawnVnd + amount,
      updatedAt: nowIso,
    });

    await setFirestoreRestDoc("wallets", cleanUid, {
      ...(walletData || {}),
      uid: cleanUid,
      balanceVnd: newWalletBalanceVnd,
      totalCreditedVnd: sanitizeVnd(walletData?.totalCreditedVnd) + amount,
      updatedAt: nowIso,
    });

    const txDoc: WalletTransaction = {
      id: txId,
      uid: cleanUid,
      type: "referral_withdraw_credit",
      amountVnd: amount,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: newWalletBalanceVnd,
      actorUid: "system",
      actorName: "Thưởng giới thiệu bạn bè",
      note: `Rút tiền thưởng mời bạn bè (Ref) về Ví DkTEST: +${amount.toLocaleString("vi-VN")}đ`,
      createdAt: nowIso,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }

  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(cleanUid);
  updateWalletOverviewAggregates({
    deltaVirtualBalanceVnd: withdrawnVnd,
    deltaConfirmedCreditedVnd: withdrawnVnd,
  }).catch(() => {});

  return {
    success: true,
    withdrawnVnd,
    remainingReferralBalanceVnd,
    newWalletBalanceVnd,
    transactionId: txId,
    message: `Rút thành công +${withdrawnVnd.toLocaleString("vi-VN")}đ từ Quỹ giới thiệu vào Ví DkTEST!`,
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client service for DkTEST Referral Program ("Mời bạn dùng DkTEST"):
 * - Captures ?ref=CODE or /ref/:code links into localStorage/sessionStorage
 * - Generates a consistent client device fingerprint for server-side anti-fraud checks
 * - Calls /api/referral/me, /api/referral/claim, /api/referral/withdraw
 */

import { api } from "./apiClient";
import type { ReferralClaimRecord, ReferralProfile } from "../types";

const PENDING_REF_KEY = "dktest_pending_referral_code_v1";
const DEVICE_SEED_KEY = "dktest_device_fp_seed_v1";

export function normalizeReferralCodeClient(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function capturePendingReferralCode(rawCode?: string | null): string | null {
  const code = normalizeReferralCodeClient(rawCode || "");
  if (!code || code.length < 4) return null;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PENDING_REF_KEY, code);
      sessionStorage.setItem(PENDING_REF_KEY, code);
    } catch {
      // ignore storage errors
    }
  }
  return code;
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_REF_KEY) || sessionStorage.getItem(PENDING_REF_KEY);
    const clean = normalizeReferralCodeClient(raw || "");
    return clean.length >= 4 ? clean : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_REF_KEY);
    sessionStorage.removeItem(PENDING_REF_KEY);
  } catch {
    // ignore
  }
}

function simpleHashHex(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

/**
 * Combines persistent browser storage token with stable environment signals
 * so the server can hash and detect multi-account farming on the same device.
 */
export function getOrCreateClientDeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr_unknown";

  let seed = "";
  try {
    seed = localStorage.getItem(DEVICE_SEED_KEY) || "";
    if (!seed) {
      seed = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_SEED_KEY, seed);
    }
  } catch {
    seed = "nostorage";
  }

  const nav = typeof navigator !== "undefined" ? navigator : null;
  const scr = typeof screen !== "undefined" ? screen : null;
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  })();

  const traits = [
    nav?.platform || "",
    nav?.language || "",
    String(nav?.hardwareConcurrency || 0),
    String((nav as any)?.deviceMemory || 0),
    `${scr?.width || 0}x${scr?.height || 0}x${scr?.colorDepth || 0}`,
    tz,
  ].join("|");

  return `${simpleHashHex(traits)}_${simpleHashHex(seed)}`;
}

export function buildReferralShareUrl(code: string): string {
  const clean = normalizeReferralCodeClient(code);
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://dktest.edu.vn";
  return `${origin}/ref/${encodeURIComponent(clean)}`;
}

export interface ReferralDashboardResponse {
  success: boolean;
  profile: ReferralProfile;
  recentClaims: ReferralClaimRecord[];
  rules: {
    minRewardVnd: number;
    maxRewardVnd: number;
    minWithdrawVnd: number;
    maxDailyClaims: number;
  };
}

export async function getMyReferralProfileApi(): Promise<ReferralDashboardResponse> {
  const fp = getOrCreateClientDeviceFingerprint();
  return api.get<ReferralDashboardResponse>("/api/referral/me", {
    headers: { "X-Device-Fingerprint": fp },
  });
}

export async function claimReferralCodeApi(code: string): Promise<{
  success: boolean;
  code: string;
  referrerUid: string;
  rewardVnd: number;
  message: string;
}> {
  const clean = normalizeReferralCodeClient(code);
  const fp = getOrCreateClientDeviceFingerprint();
  return api.post(
    "/api/referral/claim",
    { code: clean, deviceFingerprint: fp },
    { headers: { "X-Device-Fingerprint": fp } }
  );
}

export async function withdrawReferralBalanceApi(amountVnd?: number): Promise<{
  success: boolean;
  withdrawnVnd: number;
  remainingReferralBalanceVnd: number;
  newWalletBalanceVnd: number;
  transactionId: string;
  message: string;
}> {
  return api.post("/api/referral/withdraw", amountVnd ? { amountVnd } : {});
}

/**
 * Helper called right after a brand-new student finishes registering.
 * Non-blocking: clears the pending code once claimed or rejected as already-claimed.
 */
export async function tryAutoClaimPendingReferral(explicitCode?: string | null): Promise<{
  attempted: boolean;
  success: boolean;
  message?: string;
}> {
  const code = normalizeReferralCodeClient(explicitCode || getPendingReferralCode() || "");
  if (!code || code.length < 4) {
    return { attempted: false, success: false };
  }
  try {
    const res = await claimReferralCodeApi(code);
    clearPendingReferralCode();
    return { attempted: true, success: Boolean(res?.success), message: res?.message };
  } catch (err: any) {
    const msg = err?.message || "Không thể áp dụng mã giới thiệu.";
    // Clear pending code so we don't retry an invalid/already-used code endlessly
    clearPendingReferralCode();
    return { attempted: true, success: false, message: msg };
  }
}

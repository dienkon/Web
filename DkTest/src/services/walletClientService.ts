import { api } from "./apiClient";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { getTimestampMillis } from "../utils/date";
import type {
  StudentWallet,
  WalletTransaction,
  DepositRequest,
  ExamEntitlement,
  StudentDebtSummary,
  DebtRecord,
  StudentWalletProfileDetail,
  Voucher,
  VoucherUsage,
  AdminWalletEditPayload,
} from "../types";

export interface ExamAccessInfo {
  hasAccess: boolean;
  isFree: boolean;
  unlocked: boolean;
  priceVnd: number;
  accessMode: "free" | "paid";
  salesEnabled: boolean;
  userBalance: number;
  missingVnd: number;
  canUnlock: boolean;
  examTitle: string;
  rejectionReason?: string;
  parentExamId?: string;
  parentExamTitle?: string;
  message?: string;
}

export interface UnlockExamResponse {
  success: boolean;
  newBalanceVnd: number;
  entitlement: ExamEntitlement;
  alreadyUnlocked?: boolean;
  message?: string;
}

// -------------------------------------------------------------
// STUDENT CLIENT API CALLS
// -------------------------------------------------------------

export function getResolvedStudentUid(): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  try {
    const sInfoStr =
      localStorage.getItem("student_info") ||
      localStorage.getItem("dktest:auth:student_info") ||
      localStorage.getItem("current_student_session");
    if (sInfoStr) {
      const sInfo = JSON.parse(sInfoStr);
      return sInfo.uid || sInfo.id || sInfo.studentId || "";
    }
  } catch (_) {}
  return "";
}

export async function getMyWallet(): Promise<StudentWallet> {
  try {
    const res = await api.get<{ success: boolean; wallet: StudentWallet }>("/api/wallet/me");
    if (res?.wallet) return res.wallet;
  } catch (err) {
    console.warn("[walletClientService] API getMyWallet error, attempting direct Firestore read:", err);
  }

  // Direct Firestore fallback (supported by firestore.rules for wallet owner)
  const currentUid = getResolvedStudentUid();
  if (currentUid) {
    try {
      const snap = await getDoc(doc(db, "wallets", currentUid));
      if (snap.exists()) {
        return snap.data() as StudentWallet;
      }
      return {
        uid: currentUid,
        balanceVnd: 0,
        totalCreditedVnd: 0,
        totalSpentVnd: 0,
        profileCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as StudentWallet;
    } catch (fsErr) {
      console.warn("[walletClientService] Direct Firestore wallet read failed:", fsErr);
    }
  }

  throw new Error("Không thể tải thông tin ví. Vui lòng đăng nhập lại!");
}

/**
 * Subscribes to live real-time wallet updates via Firestore onSnapshot.
 * Triggers callback instantly whenever wallet balance is credited or spent.
 */
export function subscribeMyWallet(
  uid: string,
  onUpdate: (wallet: StudentWallet) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "wallets", uid),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as StudentWallet);
      } else {
        onUpdate({
          uid,
          balanceVnd: 0,
          totalCreditedVnd: 0,
          totalSpentVnd: 0,
          profileCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as StudentWallet);
      }
    },
    (err) => {
      console.warn("[subscribeMyWallet] onSnapshot listener error:", err);
      onError?.(err);
    }
  );
}

export async function updateMyWalletProfile(fullName: string, currentClass: string): Promise<StudentWallet> {
  const res = await api.patch<{ success: boolean; wallet: StudentWallet }>("/api/wallet/me/profile", {
    fullName,
    currentClass,
  });
  return res.wallet;
}

export async function createDepositRequest(
  amountVnd: number,
  idempotencyKey?: string,
  voucherCode?: string
): Promise<DepositRequest> {
  const res = await api.post<{ success: boolean; depositRequest: DepositRequest }>(
    "/api/wallet/deposit-requests",
    { amountVnd, idempotencyKey, voucherCode }
  );
  return res.depositRequest;
}

export async function getMyDepositRequests(force = false): Promise<DepositRequest[]> {
  const currentUid = getResolvedStudentUid();
  const cacheKey = `wallet_reqs_${currentUid || "guest"}`;
  if (!force && typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 120000 && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch (_) {}
  }

  let items: DepositRequest[] = [];
  try {
    const res = await api.get<{ success: boolean; items: DepositRequest[] }>(
      `/api/wallet/deposit-requests${force ? "?force=true" : ""}`
    );
    if (Array.isArray(res?.items)) items = res.items;
  } catch (err) {
    console.warn("[walletClientService] API getMyDepositRequests failed, trying direct Firestore query:", err);
    if (currentUid) {
      try {
        let snap;
        try {
          const q = query(
            collection(db, "deposit_requests"),
            where("uid", "==", currentUid),
            orderBy("createdAt", "desc"),
            limit(50)
          );
          snap = await getDocs(q);
        } catch {
          const fallbackQ = query(
            collection(db, "deposit_requests"),
            where("uid", "==", currentUid),
            limit(50)
          );
          snap = await getDocs(fallbackQ);
        }
        items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
        items.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      } catch (_) {}
    }
  }

  if (typeof sessionStorage !== "undefined" && items.length > 0) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ items, timestamp: Date.now() }));
    } catch (_) {}
  }

  return items;
}

export async function getMyTransactions(force = false): Promise<WalletTransaction[]> {
  const currentUid = getResolvedStudentUid();
  const cacheKey = `wallet_txs_${currentUid || "guest"}`;
  if (!force && typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 120000 && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch (_) {}
  }

  let items: WalletTransaction[] = [];
  try {
    const res = await api.get<{ success: boolean; items: WalletTransaction[] }>(
      `/api/wallet/transactions${force ? "?force=true" : ""}`
    );
    if (Array.isArray(res?.items)) items = res.items;
  } catch (err) {
    console.warn("[walletClientService] API getMyTransactions failed, trying direct Firestore query:", err);
    if (currentUid) {
      try {
        let snap;
        try {
          const q = query(
            collection(db, "wallet_transactions"),
            where("uid", "==", currentUid),
            orderBy("createdAt", "desc"),
            limit(50)
          );
          snap = await getDocs(q);
        } catch {
          const fallbackQ = query(
            collection(db, "wallet_transactions"),
            where("uid", "==", currentUid),
            limit(50)
          );
          snap = await getDocs(fallbackQ);
        }
        items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletTransaction));
        items.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      } catch (_) {}
    }
  }

  if (typeof sessionStorage !== "undefined" && items.length > 0) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ items, timestamp: Date.now() }));
    } catch (_) {}
  }

  return items;
}

export async function getMyDebtSummary(force = false): Promise<{
  totalDebtVnd: number;
  unpaidCount: number;
  records: DebtRecord[];
}> {
  const currentUid = getResolvedStudentUid();
  const cacheKey = `wallet_debt_${currentUid || "guest"}`;
  if (!force && typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 120000 && parsed.data) {
          return parsed.data;
        }
      }
    } catch (_) {}
  }

  let result = { totalDebtVnd: 0, unpaidCount: 0, records: [] as DebtRecord[] };
  try {
    const res = await api.get<{ success: boolean; totalDebtVnd: number; unpaidCount: number; records: DebtRecord[] }>(
      `/api/wallet/debt${force ? "?force=true" : ""}`
    );
    if (res?.records) {
      result = {
        totalDebtVnd: res.totalDebtVnd || 0,
        unpaidCount: res.unpaidCount || 0,
        records: res.records || [],
      };
    }
  } catch (err) {
    console.warn("[walletClientService] API getMyDebtSummary failed, trying direct Firestore query:", err);
    if (currentUid) {
      try {
        let snap;
        try {
          const q = query(
            collection(db, "debt_records"),
            where("uid", "==", currentUid),
            orderBy("createdAt", "desc"),
            limit(50)
          );
          snap = await getDocs(q);
        } catch {
          const fallbackQ = query(
            collection(db, "debt_records"),
            where("uid", "==", currentUid),
            limit(50)
          );
          snap = await getDocs(fallbackQ);
        }
        const allDebts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DebtRecord));
        const unpaid = allDebts.filter(
          (d) => d.status === "unpaid" || d.status === "partial" || (d.remainingVnd && d.remainingVnd > 0)
        );
        unpaid.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        const totalDebtVnd = unpaid.reduce((sum, d) => sum + (d.remainingVnd ?? d.amountVnd ?? 0), 0);
        result = { totalDebtVnd, unpaidCount: unpaid.length, records: unpaid };
      } catch (_) {}
    }
  }

  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch (_) {}
  }

  return result;
}

const clientExamAccessCache = new Map<string, { data: ExamAccessInfo; timestamp: number }>();
const CLIENT_EXAM_ACCESS_TTL_MS = 60 * 1000;

export function invalidateClientExamAccessCache(examId?: string): void {
  if (examId) {
    for (const key of clientExamAccessCache.keys()) {
      if (key.includes(examId)) {
        clientExamAccessCache.delete(key);
      }
    }
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const prefix = `exam_access_${examId}`;
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(prefix)) {
            sessionStorage.removeItem(k);
          }
        }
      } catch (_) {}
    }
  } else {
    clientExamAccessCache.clear();
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("exam_access_")) {
            sessionStorage.removeItem(k);
          }
        }
      } catch (_) {}
    }
  }
}

export async function checkExamAccess(
  examId: string,
  providedUid?: string,
  providedUsername?: string,
  force = false
): Promise<ExamAccessInfo> {
  let resolvedUid = providedUid || auth.currentUser?.uid || "";
  let resolvedUsername = providedUsername || "";

  if (!resolvedUid || !resolvedUsername) {
    try {
      const sInfoStr =
        localStorage.getItem("student_info") ||
        localStorage.getItem("current_student_session");
      if (sInfoStr) {
        const sInfo = JSON.parse(sInfoStr);
        if (!resolvedUid && sInfo.uid) resolvedUid = sInfo.uid;
        if (!resolvedUsername && sInfo.username) resolvedUsername = sInfo.username;
      }
    } catch (_) {}
  }

  const cacheKey = `${examId}_${resolvedUid || resolvedUsername || "anon"}`;

  if (!force) {
    // 1. Check RAM cache
    const ramEntry = clientExamAccessCache.get(cacheKey);
    if (ramEntry && Date.now() - ramEntry.timestamp < CLIENT_EXAM_ACCESS_TTL_MS) {
      return ramEntry.data;
    }

    // 2. Check sessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const raw = sessionStorage.getItem(`exam_access_${cacheKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.timestamp < CLIENT_EXAM_ACCESS_TTL_MS) {
            clientExamAccessCache.set(cacheKey, { data: parsed.data, timestamp: parsed.timestamp });
            return parsed.data;
          }
        }
      } catch (_) {}
    }
  }

  const saveCache = (res: ExamAccessInfo): ExamAccessInfo => {
    clientExamAccessCache.set(cacheKey, { data: res, timestamp: Date.now() });
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.setItem(`exam_access_${cacheKey}`, JSON.stringify({ data: res, timestamp: Date.now() }));
      } catch (_) {}
    }
    return res;
  };

  const queryParts: string[] = [];
  if (resolvedUid) queryParts.push(`studentUid=${encodeURIComponent(resolvedUid)}`);
  if (resolvedUsername) queryParts.push(`studentUsername=${encodeURIComponent(resolvedUsername)}`);
  const queryStr = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  const headers: Record<string, string> = {};
  if (resolvedUid) headers["X-Student-Uid"] = resolvedUid;
  if (resolvedUsername) headers["X-Student-Username"] = resolvedUsername;

  let apiResult: ExamAccessInfo | null = null;
  try {
    const res = await api.get<{ success: boolean } & ExamAccessInfo>(
      `/api/exams/${examId}/access${queryStr}`,
      {
        requiresAuth: true,
        headers,
      }
    );
    apiResult = res;
  } catch (err) {
    console.warn("[walletClientService] API checkExamAccess failed, checking direct Firestore:", err);
  }

  // If API succeeded and found positive balance or access granted, return it
  if (apiResult && (apiResult.hasAccess || apiResult.userBalance > 0)) {
    return saveCache(apiResult);
  }

  // Dual verification: If API returned userBalance === 0 or threw error, check direct Firestore wallet
  const targetUid = resolvedUid || resolvedUsername;
  if (targetUid) {
    try {
      // 1. Try wallet by UID
      let wSnap = resolvedUid ? await getDoc(doc(db, "wallets", resolvedUid)) : null;
      let wData = wSnap?.exists() ? (wSnap.data() as StudentWallet) : null;

      // 2. Try wallet by Username if UID wallet doesn't have balance
      if ((!wData || (wData.balanceVnd || 0) <= 0) && resolvedUsername && resolvedUsername !== resolvedUid) {
        const altSnap = await getDoc(doc(db, "wallets", resolvedUsername));
        if (altSnap.exists()) {
          wData = altSnap.data() as StudentWallet;
        }
      }

      if (wData && (wData.balanceVnd || 0) > 0) {
        const realBal = Math.max(0, Math.round(Number(wData.balanceVnd) || 0));
        const price = apiResult?.priceVnd || 0;
        if (apiResult) {
          return saveCache({
            ...apiResult,
            userBalance: realBal,
            missingVnd: Math.max(0, price - realBal),
            canUnlock: realBal >= price,
          });
        }
      }
    } catch (fsErr) {
      console.warn("[walletClientService] Direct Firestore wallet verification warning:", fsErr);
    }
  }

  if (apiResult) return saveCache(apiResult);

  // Ultimate fallback: direct Firestore exam access check
  try {
    const examSnap = await getDoc(doc(db, "exams", examId));
    if (examSnap.exists()) {
      const eData = examSnap.data() as any;
      const price = Math.max(0, Math.round(Number(eData.priceVnd) || 0));
      const isFree = (eData.accessMode || "free") === "free" || price <= 0;
      let hasEntitlement = false;

      if (resolvedUid) {
        const entSnap = await getDoc(doc(db, "exam_entitlements", `${resolvedUid}_${examId}`));
        if (entSnap.exists() && entSnap.data().status === "active") {
          hasEntitlement = true;
        }
      }

      let userBal = 0;
      if (resolvedUid) {
        const wSnap = await getDoc(doc(db, "wallets", resolvedUid));
        if (wSnap.exists()) {
          userBal = Math.max(0, Math.round(Number(wSnap.data().balanceVnd) || 0));
        }
      }

      return saveCache({
        hasAccess: isFree || hasEntitlement,
        isFree,
        unlocked: hasEntitlement,
        priceVnd: price,
        accessMode: (eData.accessMode as any) || "free",
        salesEnabled: eData.salesEnabled !== false,
        userBalance: userBal,
        missingVnd: Math.max(0, price - userBal),
        canUnlock: userBal >= price,
        examTitle: eData.title || "Bài thi",
      });
    }
  } catch (_) {}

  return saveCache({
    hasAccess: false,
    isFree: false,
    unlocked: false,
    priceVnd: 0,
    accessMode: "paid",
    salesEnabled: false,
    userBalance: 0,
    missingVnd: 0,
    canUnlock: false,
    examTitle: "Bài thi",
  });
}

export async function unlockExam(
  examId: string,
  idempotencyKey?: string,
  voucherCode?: string
): Promise<UnlockExamResponse> {
  const res = await api.post<UnlockExamResponse>(`/api/exams/${examId}/unlock`, {
    idempotencyKey,
    voucherCode,
  });
  invalidateClientExamAccessCache(examId);
  return res;
}

// -------------------------------------------------------------
// ADMIN CLIENT API CALLS
// -------------------------------------------------------------

export interface AdminWalletOverview {
  totalWallets: number;
  totalVirtualBalanceVnd: number;
  totalConfirmedCreditedVnd: number;
  totalUnlockedSpendingVnd: number;
  pendingRequestsTotalVnd: number;
  pendingRequestsCount: number;
  totalOutstandingDebtVnd: number;
  studentsInDebtCount: number;
  recentRequests: DepositRequest[];
}

let cachedAdminWalletOverview: { data: AdminWalletOverview; timestamp: number } | null = null;
const CLIENT_WALLET_OVERVIEW_TTL_MS = 180 * 1000; // 3 minutes

export function invalidateClientWalletOverviewCache() {
  cachedAdminWalletOverview = null;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem("dktest:admin_wallet_overview");
    } catch (_) {}
  }
}

export async function getAdminWalletOverview(force = false): Promise<AdminWalletOverview> {
  const now = Date.now();
  // Step 1: Memory cache check (0 network calls, 0 Firestore reads)
  if (!force && cachedAdminWalletOverview && now - cachedAdminWalletOverview.timestamp < CLIENT_WALLET_OVERVIEW_TTL_MS) {
    return cachedAdminWalletOverview.data;
  }

  // Step 2: SessionStorage check across tab switching (0 Firestore reads)
  if (!force && typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem("dktest:admin_wallet_overview");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < CLIENT_WALLET_OVERVIEW_TTL_MS && parsed.data) {
          cachedAdminWalletOverview = { data: parsed.data, timestamp: parsed.timestamp };
          return parsed.data;
        }
      }
    } catch (_) {}
  }

  try {
    const res = await api.get<{ success: boolean; overview: AdminWalletOverview }>(
      `/api/admin/wallet/overview${force ? "?force=true" : ""}`
    );
    if (res?.overview) {
      cachedAdminWalletOverview = { data: res.overview, timestamp: now };
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.setItem("dktest:admin_wallet_overview", JSON.stringify({ data: res.overview, timestamp: now }));
        } catch (_) {}
      }
      return res.overview;
    }
  } catch (err) {
    console.warn("[walletClientService] API getAdminWalletOverview error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback (Optimized: Check 1 single pre-aggregated document first!)
  try {
    if (!force) {
      try {
        const overviewDocSnap = await getDoc(doc(db, "system_stats", "wallet_overview"));
        if (overviewDocSnap.exists()) {
          const overviewData = overviewDocSnap.data() as AdminWalletOverview;
          cachedAdminWalletOverview = { data: overviewData, timestamp: now };
          if (typeof sessionStorage !== "undefined") {
            try {
              sessionStorage.setItem("dktest:admin_wallet_overview", JSON.stringify({ data: overviewData, timestamp: now }));
            } catch (_) {}
          }
          return overviewData;
        }
      } catch (_) {}
    }

    const [walletsSnap, reqsSnap, debtsSnap] = await Promise.all([
      getDocs(query(collection(db, "wallets"), limit(30))),
      getDocs(query(collection(db, "deposit_requests"), limit(30))),
      getDocs(query(collection(db, "debt_records"), limit(30))),
    ]);

    let totalWallets = walletsSnap.size;
    let totalVirtualBalanceVnd = 0;
    let totalConfirmedCreditedVnd = 0;
    let totalUnlockedSpendingVnd = 0;
    walletsSnap.docs.forEach((d) => {
      const data = d.data() as StudentWallet;
      totalVirtualBalanceVnd += data.balanceVnd || 0;
      totalConfirmedCreditedVnd += data.totalCreditedVnd || 0;
      totalUnlockedSpendingVnd += data.totalSpentVnd || 0;
    });

    const allReqs = reqsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
    allReqs.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
    const pendingReqs = allReqs.filter((r) => r.status === "pending");
    const pendingRequestsTotalVnd = pendingReqs.reduce((sum, r) => sum + (r.amountVnd || 0), 0);

    const studentsInDebtSet = new Set<string>();
    let totalOutstandingDebtVnd = 0;
    debtsSnap.docs.forEach((d) => {
      const data = d.data() as DebtRecord;
      if (data.status === "unpaid" || data.status === "partial") {
        const rem = data.remainingVnd || 0;
        if (rem > 0) {
          totalOutstandingDebtVnd += rem;
          studentsInDebtSet.add(data.uid);
        }
      }
    });

    const result: AdminWalletOverview = {
      totalWallets,
      totalVirtualBalanceVnd,
      totalConfirmedCreditedVnd,
      totalUnlockedSpendingVnd,
      pendingRequestsTotalVnd,
      pendingRequestsCount: pendingReqs.length,
      totalOutstandingDebtVnd,
      studentsInDebtCount: studentsInDebtSet.size,
      recentRequests: allReqs.slice(0, 10),
    };

    cachedAdminWalletOverview = { data: result, timestamp: now };
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.setItem("dktest:admin_wallet_overview", JSON.stringify({ data: result, timestamp: now }));
      } catch (_) {}
    }

    // Save to system_stats/wallet_overview so future direct loads only read 1 doc
    setDoc(doc(db, "system_stats", "wallet_overview"), result).catch(() => {});

    return result;
  } catch (fsErr) {
    console.error("[walletClientService] Direct Firestore fallback for overview failed:", fsErr);
    throw new Error("Không thể tải tổng quan ví.");
  }
}

let adminDebtFallbackCache: {
  walletsSnap: any;
  debtsSnap: any;
  entsSnap: any;
  timestamp: number;
} | null = null;

export function invalidateAdminDebtFallbackCache() {
  adminDebtFallbackCache = null;
}

export async function getAdminStudentDebtList(params?: {
  search?: string;
  filterStatus?: "all" | "in_debt" | "paid" | "has_credit";
  className?: string;
  limit?: number;
  offset?: number;
  force?: boolean;
}): Promise<{ items: StudentDebtSummary[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.filterStatus) searchParams.set("filterStatus", params.filterStatus);
  if (params?.className) searchParams.set("className", params.className);
  const pageSizeLimit = params?.limit !== undefined ? Math.max(1, Number(params.limit)) : 10;
  searchParams.set("limit", String(pageSizeLimit));
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  if (params?.force) searchParams.set("force", "true");

  const qs = searchParams.toString();
  const cacheKey = `admin_debts_${qs}`;
  const now = Date.now();

  if (!params?.force && typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < 120000 && Array.isArray(parsed.items)) {
          return { items: parsed.items, total: parsed.total || parsed.items.length };
        }
      }
    } catch (_) {}
  }

  try {
    const endpoint = `/api/admin/wallet/students${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ success: boolean; items: StudentDebtSummary[]; total: number }>(endpoint);
    if (Array.isArray(res?.items)) {
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ items: res.items, total: res.total, timestamp: now }));
        } catch (_) {}
      }
      return { items: res.items, total: res.total || res.items.length };
    }
  } catch (err) {
    console.warn("[walletClientService] API getAdminStudentDebtList error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback with 30s cache
  try {
    const now = Date.now();
    let walletsSnap: any;
    let debtsSnap: any;
    let entsSnap: any;

    if (!params?.force && adminDebtFallbackCache && now - adminDebtFallbackCache.timestamp < 30000) {
      walletsSnap = adminDebtFallbackCache.walletsSnap;
      debtsSnap = adminDebtFallbackCache.debtsSnap;
      entsSnap = adminDebtFallbackCache.entsSnap;
    } else {
      [walletsSnap, debtsSnap, entsSnap] = await Promise.all([
        getDocs(query(collection(db, "wallets"), limit(50))),
        getDocs(query(collection(db, "debt_records"), limit(50))),
        getDocs(query(collection(db, "exam_entitlements"), limit(50))),
      ]);
      adminDebtFallbackCache = {
        walletsSnap,
        debtsSnap,
        entsSnap,
        timestamp: now,
      };
    }

    const debtByUid = new Map<string, { totalReceivable: number; totalCollected: number; totalAdjusted: number; remainingDebt: number }>();
    debtsSnap.docs.forEach((d: any) => {
      const rec = d.data() as DebtRecord;
      const uid = rec.uid;
      if (!debtByUid.has(uid)) {
        debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, totalAdjusted: 0, remainingDebt: 0 });
      }
      const curr = debtByUid.get(uid)!;
      // CRITICAL: Cash collection receipts are payment proofs, NOT receivables!
      if ((rec as any).type !== "cash_collection") {
        curr.totalReceivable += rec.amountVnd || 0;
        curr.totalCollected += rec.collectedVnd || 0;
        curr.remainingDebt += Math.max(0, rec.remainingVnd || 0);
      }
      if (rec.type === "adjustment" || (rec as any).adjustedVnd) {
        curr.totalAdjusted += (rec as any).adjustedVnd || 0;
      }
    });

    const unlocksByUid = new Map<string, number>();
    entsSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (data.status === "active") {
        unlocksByUid.set(data.uid, (unlocksByUid.get(data.uid) || 0) + 1);
      }
    });

    let summaries: StudentDebtSummary[] = [];
    walletsSnap.docs.forEach((d: any) => {
      const w = d.data() as StudentWallet;
      const debtInfo = debtByUid.get(w.uid) || { totalReceivable: 0, totalCollected: 0, totalAdjusted: 0, remainingDebt: 0 };
      const hasManualDebt = (w as any).debtManualOverride === true || (w as any).remainingDebtVnd !== undefined;
      const remainingDebtVnd = hasManualDebt && (w as any).remainingDebtVnd !== undefined
        ? Number((w as any).remainingDebtVnd) || 0
        : debtInfo.remainingDebt;
      const totalReceivableVnd = hasManualDebt && (w as any).totalReceivableVnd !== undefined
        ? Number((w as any).totalReceivableVnd) || 0
        : (w as any).totalReceivableVnd !== undefined
        ? Number((w as any).totalReceivableVnd) || 0
        : debtInfo.totalReceivable;
      const totalCollectedVnd = hasManualDebt && (w as any).totalCollectedVnd !== undefined
        ? Number((w as any).totalCollectedVnd) || 0
        : (w as any).totalCollectedVnd !== undefined
        ? Number((w as any).totalCollectedVnd) || 0
        : debtInfo.totalCollected;
      const totalAdjustmentsVnd = hasManualDebt && (w as any).totalAdjustmentsVnd !== undefined
        ? Number((w as any).totalAdjustmentsVnd) || 0
        : (w as any).totalAdjustmentsVnd !== undefined
        ? Number((w as any).totalAdjustmentsVnd) || 0
        : debtInfo.totalAdjusted;

      let debtStatus: "in_debt" | "paid" | "has_credit" = "paid";
      if ((w as any).debtStatus) {
        debtStatus = (w as any).debtStatus;
      } else if (remainingDebtVnd > 0) {
        debtStatus = "in_debt";
      } else if ((w.balanceVnd || 0) > 0) {
        debtStatus = "has_credit";
      }

      summaries.push({
        uid: w.uid,
        fullName: w.fullName || "Chưa cập nhật",
        studentClass: w.currentClass || "—",
        currentClass: w.currentClass || "—",
        balanceVnd: w.balanceVnd || 0,
        totalReceivableVnd,
        totalReceivablesVnd: totalReceivableVnd,
        totalCollectedVnd,
        totalAdjustmentsVnd,
        totalAdjustedVnd: totalAdjustmentsVnd,
        remainingDebtVnd,
        totalPurchasesCount: unlocksByUid.get(w.uid) || 0,
        debtStatus,
        lastActivityAt: w.updatedAt || w.createdAt,
      });
    });

    if (params?.className && params.className !== "all") {
      summaries = summaries.filter((s) => s.studentClass.toLowerCase() === params.className?.toLowerCase());
    }
    if (params?.filterStatus && params.filterStatus !== "all") {
      summaries = summaries.filter((s) => s.debtStatus === params.filterStatus);
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      summaries = summaries.filter((s) => s.fullName.toLowerCase().includes(q) || s.studentClass.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q));
    }
    summaries.sort((a, b) => b.remainingDebtVnd - a.remainingDebtVnd || b.balanceVnd - a.balanceVnd);

    const total = summaries.length;
    const offset = params?.offset || 0;
    const pageLimit = params?.limit !== undefined ? Math.max(1, Number(params.limit)) : 10;
    return { items: summaries.slice(offset, offset + pageLimit), total };
  } catch (fsErr) {
    console.error("[walletClientService] Direct Firestore fallback for debt list failed:", fsErr);
    return { items: [], total: 0 };
  }
}

export async function getAdminStudentWalletDetails(studentUid: string, force = false): Promise<{
  wallet: StudentWallet;
  studentProfile?: StudentWalletProfileDetail;
  transactions: WalletTransaction[];
  depositRequests: DepositRequest[];
  entitlements: ExamEntitlement[];
  debtRecords: DebtRecord[];
}> {
  const res = await api.get<{
    success: boolean;
    wallet: StudentWallet;
    studentProfile?: StudentWalletProfileDetail;
    transactions: WalletTransaction[];
    depositRequests: DepositRequest[];
    entitlements: ExamEntitlement[];
    debtRecords: DebtRecord[];
  }>(`/api/admin/wallet/students/${studentUid}/details${force ? "?force=true" : ""}`);
  return res;
}

export async function syncStudentsToWalletsApi(): Promise<{
  success: boolean;
  message: string;
  totalStudents: number;
  createdCount: number;
  updatedCount: number;
}> {
  const res = await api.post<{
    success: boolean;
    message: string;
    totalStudents: number;
    createdCount: number;
    updatedCount: number;
  }>("/api/admin/wallet/sync-students");
  return res;
}

export async function updateAdminStudentWalletProfileApi(
  studentUid: string,
  data: {
    verifiedName?: string;
    isVerified?: boolean;
    fullName?: string;
    currentClass?: string;
  }
): Promise<{ success: boolean; message: string; wallet: StudentWallet }> {
  const res = await api.patch<{ success: boolean; message: string; wallet: StudentWallet }>(
    `/api/admin/wallet/students/${studentUid}/profile`,
    data
  );
  return res;
}

export async function getAdminDepositRequests(params?: {
  status?: string;
  search?: string;
  limit?: number;
  force?: boolean;
}): Promise<DepositRequest[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.force) searchParams.set("force", "true");

    const qs = searchParams.toString();
    const endpoint = `/api/admin/wallet/deposit-requests${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ success: boolean; items: DepositRequest[] }>(endpoint);
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getAdminDepositRequests error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback
  try {
    const safeLimit = params?.limit ? Math.min(params.limit, 100) : 50;
    let snap;
    try {
      let reqQ;
      if (params?.status && params.status !== "all") {
        reqQ = query(
          collection(db, "deposit_requests"),
          where("status", "==", params.status),
          orderBy("createdAt", "desc"),
          limit(safeLimit)
        );
      } else {
        reqQ = query(collection(db, "deposit_requests"), orderBy("createdAt", "desc"), limit(safeLimit));
      }
      snap = await getDocs(reqQ);
    } catch {
      let fallbackQ;
      if (params?.status && params.status !== "all") {
        fallbackQ = query(collection(db, "deposit_requests"), where("status", "==", params.status), limit(safeLimit));
      } else {
        fallbackQ = query(collection(db, "deposit_requests"), limit(safeLimit));
      }
      snap = await getDocs(fallbackQ);
    }

    let items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DepositRequest));
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (r) =>
          (r.studentNameSnapshot || "").toLowerCase().includes(q) ||
          (r.studentClassSnapshot || "").toLowerCase().includes(q) ||
          (r.id || "").toLowerCase().includes(q) ||
          (r.uid || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
    if (params?.limit) items = items.slice(0, params.limit);
    return items;
  } catch (fsErr) {
    console.error("[walletClientService] Direct Firestore fallback for deposit requests failed:", fsErr);
    return [];
  }
}

export async function approveDepositRequest(
  requestId: string,
  externalCollectionNote?: string
): Promise<{ success: boolean; newBalanceVnd: number }> {
  const res = await api.post<{ success: boolean; newBalanceVnd: number }>(
    `/api/admin/wallet/deposit-requests/${requestId}/approve`,
    { externalCollectionNote }
  );
  return res;
}

export async function rejectDepositRequest(
  requestId: string,
  reason: string
): Promise<{ success: boolean; request: DepositRequest }> {
  const res = await api.post<{ success: boolean; request: DepositRequest }>(
    `/api/admin/wallet/deposit-requests/${requestId}/reject`,
    { reason }
  );
  return res;
}

export async function recordManualCashCollection(
  studentUid: string,
  data: {
    amountVnd: number;
    collectionDate?: string;
    paymentMethod?: string;
    referenceCode?: string;
    note?: string;
    creditToWallet?: boolean;
  }
): Promise<{ success: boolean; debtRecordId: string; newBalanceVnd?: number }> {
  const res = await api.post<{ success: boolean; debtRecordId: string; newBalanceVnd?: number }>(
    `/api/admin/wallet/students/${studentUid}/collections`,
    data
  );
  invalidateAdminDebtFallbackCache();
  return res;
}

export async function adjustStudentDebt(
  studentUid: string,
  data: {
    amountVnd: number;
    type: "increase" | "decrease";
    reason: string;
  }
): Promise<{ success: boolean; recordId: string }> {
  const res = await api.post<{ success: boolean; recordId: string }>(
    `/api/admin/wallet/students/${studentUid}/debt-adjustments`,
    data
  );
  invalidateAdminDebtFallbackCache();
  return res;
}

export async function grantOrRevokeExamEntitlement(
  studentUid: string,
  examId: string,
  action: "grant" | "revoke",
  reason: string
): Promise<{ success: boolean; entitlement: ExamEntitlement }> {
  const res = await api.post<{ success: boolean; entitlement: ExamEntitlement }>(
    "/api/admin/exam-entitlements/grant",
    { studentUid, examId, action, reason }
  );
  return res;
}

export async function mergeExamsApi(payload: {
  title: string;
  code?: string;
  description?: string;
  subject?: string;
  gradeCategory?: string;
  folderId?: string | null;
  timeLimit?: number;
  sourceExamIds: string[];
  organizeMode?: "by_source_exam" | "flatten";
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}): Promise<{
  success: boolean;
  newExamId: string;
  totalSections: number;
  totalQuestions: number;
  totalPoints: number;
}> {
  const res = await api.post<{
    success: boolean;
    newExamId: string;
    totalSections: number;
    totalQuestions: number;
    totalPoints: number;
  }>("/api/admin/exams/merge", payload);
  return res;
}

// -------------------------------------------------------------
// VOUCHER & PROMO CODE API CALLS
// -------------------------------------------------------------

export async function validateVoucherApi(
  codeOrParams: string | { code: string; context: "exam_unlock" | "deposit" | "gift_money"; amountVnd?: number; examId?: string },
  contextArg?: "exam_unlock" | "deposit" | "gift_money",
  amountVndArg?: number
): Promise<{
  success: boolean;
  valid: boolean;
  message?: string;
  voucher?: Voucher;
  discountVnd?: number;
  bonusVnd?: number;
  finalPriceVnd?: number;
  code?: string;
  name?: string;
}> {
  const code = typeof codeOrParams === "string" ? codeOrParams : codeOrParams.code;
  const context = typeof codeOrParams === "string" ? (contextArg || "exam_unlock") : codeOrParams.context;
  const amountVnd = typeof codeOrParams === "string" ? (amountVndArg || 0) : (codeOrParams.amountVnd || 0);
  const examId = typeof codeOrParams === "string" ? undefined : codeOrParams.examId;

  try {
    const res = await api.post<any>("/api/vouchers/validate", { code, context, amountVnd, examId });
    if (res) return res;
  } catch (err: any) {
    console.warn("[walletClientService] API validateVoucherApi failed, trying alias endpoint:", err);
    try {
      const res2 = await api.post<any>("/api/wallet/vouchers/validate", { code, context, amountVnd, examId });
      if (res2) return res2;
    } catch (_) {}
  }

  // Direct Firestore fallback
  try {
    const cleanCode = String(code || "").trim().toUpperCase();
    const q = query(collection(db, "vouchers"), where("code", "==", cleanCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: false, valid: false, message: `Mã voucher "${cleanCode}" không tồn tại hoặc đã hết hạn.` };
    }
    const voucher = { id: snap.docs[0].id, ...snap.docs[0].data() } as Voucher;
    if (!voucher.isActive) {
      return { success: false, valid: false, message: "Mã voucher này hiện đang bị tạm khóa." };
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
      return { success: false, valid: false, message: "Mã voucher này đã hết hạn sử dụng." };
    }
    if (voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit) {
      return { success: false, valid: false, message: "Mã voucher này đã hết lượt sử dụng." };
    }

    const baseAmount = Math.max(0, amountVnd || 0);

    if (context === "gift_money") {
      if (voucher.type !== "gift_money") {
        return { success: false, valid: false, message: "Mã này không phải mã quà tặng nạp tiền." };
      }
      return {
        success: true,
        valid: true,
        voucher,
        code: voucher.code,
        name: voucher.name,
        bonusVnd: voucher.value,
        message: `Mã hợp lệ! Nhận ngay +${voucher.value.toLocaleString("vi-VN")}đ vào ví.`,
      };
    }

    if (context === "exam_unlock") {
      if (voucher.type !== "discount_percent" && voucher.type !== "discount_fixed") {
        return { success: false, valid: false, message: "Mã này không áp dụng để giảm giá bài thi." };
      }
      if (voucher.minOrderVnd && baseAmount < voucher.minOrderVnd) {
        return { success: false, valid: false, message: `Mã này chỉ áp dụng cho bài thi từ ${voucher.minOrderVnd.toLocaleString("vi-VN")}đ.` };
      }
      let discountVnd = 0;
      if (voucher.type === "discount_percent") {
        discountVnd = Math.round((baseAmount * voucher.value) / 100);
        if (voucher.maxDiscountVnd && discountVnd > voucher.maxDiscountVnd) {
          discountVnd = voucher.maxDiscountVnd;
        }
      } else {
        discountVnd = voucher.value;
      }
      discountVnd = Math.min(baseAmount, Math.max(0, discountVnd));
      const finalPriceVnd = Math.max(0, baseAmount - discountVnd);
      return {
        success: true,
        valid: true,
        voucher,
        discountVnd,
        finalPriceVnd,
        code: voucher.code,
        name: voucher.name,
        message: `Áp dụng thành công! Giảm ${discountVnd.toLocaleString("vi-VN")}đ (còn ${finalPriceVnd.toLocaleString("vi-VN")}đ).`,
      };
    }

    if (context === "deposit") {
      if (voucher.type !== "deposit_bonus_percent" && voucher.type !== "deposit_bonus_fixed") {
        return { success: false, valid: false, message: "Mã này không áp dụng khi nạp tiền." };
      }
      if (voucher.minDepositVnd && baseAmount < voucher.minDepositVnd) {
        return { success: false, valid: false, message: `Mã này chỉ áp dụng khi nạp từ ${voucher.minDepositVnd.toLocaleString("vi-VN")}đ.` };
      }
      let bonusVnd = 0;
      if (voucher.type === "deposit_bonus_percent") {
        bonusVnd = Math.round((baseAmount * voucher.value) / 100);
      } else {
        bonusVnd = voucher.value;
      }
      return {
        success: true,
        valid: true,
        voucher,
        bonusVnd,
        code: voucher.code,
        name: voucher.name,
        message: `Mã nạp hợp lệ! Tặng thêm +${bonusVnd.toLocaleString("vi-VN")}đ vào ví.`,
      };
    }
  } catch (_) {}

  return { success: false, valid: false, message: "Không thể kiểm tra mã voucher." };
}

export async function redeemGiftVoucherApi(code: string): Promise<{
  success: boolean;
  message: string;
  addedVnd: number;
  newBalanceVnd: number;
  voucher: Voucher;
}> {
  // 1. Try primary endpoint /api/vouchers/redeem-gift
  try {
    const res = await api.post<{
      success: boolean;
      message: string;
      addedVnd: number;
      newBalanceVnd: number;
      voucher: Voucher;
    }>("/api/vouchers/redeem-gift", { code });
    if (res?.success) return res;
  } catch (err: any) {
    console.warn("[walletClientService] API /api/vouchers/redeem-gift failed, trying alias endpoint:", err);
    // 2. Try alias endpoint /api/wallet/vouchers/redeem-gift
    try {
      const res2 = await api.post<{
        success: boolean;
        message: string;
        addedVnd: number;
        newBalanceVnd: number;
        voucher: Voucher;
      }>("/api/wallet/vouchers/redeem-gift", { code });
      if (res2?.success) return res2;
    } catch (err2: any) {
      console.warn("[walletClientService] API /api/wallet/vouchers/redeem-gift failed, attempting direct Firestore fallback:", err2);
    }
  }

  // 3. Direct Firestore Fallback
  const studentUid = getResolvedStudentUid();
  if (!studentUid) {
    throw new Error("Yêu cầu đăng nhập để tiếp tục sử dụng mã quà tặng.");
  }

  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Mã quà tặng không hợp lệ.");
  }

  try {
    const q = query(collection(db, "vouchers"), where("code", "==", cleanCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`Mã quà tặng "${cleanCode}" không tồn tại hoặc đã hết hạn.`);
    }

    const voucherDoc = snap.docs[0];
    const voucher = { id: voucherDoc.id, ...voucherDoc.data() } as Voucher;

    if (voucher.type !== "gift_money") {
      const wRef = doc(db, "wallets", studentUid);
      const wSnap = await getDoc(wRef);
      const curBal = wSnap.exists() ? Number(wSnap.data()?.balanceVnd) || 0 : 0;
      return {
        success: true,
        message: `Mã ưu đãi "${cleanCode}" đã được kích hoạt!`,
        addedVnd: 0,
        newBalanceVnd: curBal,
        voucher,
      };
    }
    if (!voucher.isActive) {
      throw new Error("Mã quà tặng này hiện đang bị tạm khóa.");
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
      throw new Error("Mã quà tặng này đã hết hạn sử dụng.");
    }
    if (voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit) {
      throw new Error("Mã quà tặng này đã hết lượt sử dụng.");
    }

    // Check per-user limit
    const perUserLimit = voucher.perUserLimit || 1;
    const usagesQ = query(
      collection(db, "voucher_usages"),
      where("voucherId", "==", voucher.id),
      where("uid", "==", studentUid),
      limit(perUserLimit)
    );
    const usagesSnap = await getDocs(usagesQ);
    if (usagesSnap.size >= perUserLimit) {
      throw new Error("Bạn đã sử dụng hết lượt cho mã quà tặng này.");
    }

    const addedVnd = Math.max(0, Math.round(voucher.value || 0));
    if (addedVnd <= 0) {
      throw new Error("Giá trị mã quà tặng không hợp lệ.");
    }

    // Read current wallet
    const wRef = doc(db, "wallets", studentUid);
    const wSnap = await getDoc(wRef);
    const currentWallet = wSnap.exists() ? (wSnap.data() as StudentWallet) : null;
    const currentBal = Math.max(0, Number(currentWallet?.balanceVnd) || 0);
    const currentCredited = Math.max(0, Number(currentWallet?.totalCreditedVnd) || 0);
    const newBal = currentBal + addedVnd;
    const now = new Date().toISOString();

    // Update wallet
    await setDoc(
      wRef,
      {
        uid: studentUid,
        balanceVnd: newBal,
        totalCreditedVnd: currentCredited + addedVnd,
        updatedAt: now,
      },
      { merge: true }
    );

    // Update voucher usedCount
    await updateDoc(doc(db, "vouchers", voucher.id), {
      usedCount: (voucher.usedCount || 0) + 1,
      updatedAt: now,
    });

    // Record voucher usage
    const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const usageDoc: VoucherUsage = {
      id: usageId,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      code: voucher.code,
      uid: studentUid,
      studentName: currentWallet?.fullName || "Học sinh",
      studentClass: currentWallet?.currentClass || "",
      type: "gift_money",
      bonusVnd: addedVnd,
      benefitVnd: addedVnd,
      context: "gift_money",
      usedAt: now,
      createdAt: now,
    };
    await setDoc(doc(db, "voucher_usages", usageId), usageDoc);

    // Record wallet transaction
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txDoc: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "gift_code",
      amountVnd: addedVnd,
      balanceBeforeVnd: currentBal,
      balanceAfterVnd: newBal,
      actorUid: studentUid,
      actorName: currentWallet?.fullName || "Học sinh",
      note: `Nhập mã quà tặng ${voucher.code}: +${addedVnd.toLocaleString("vi-VN")}đ`,
      createdAt: now,
    };
    await setDoc(doc(db, "wallet_transactions", txId), txDoc);

    invalidateClientVouchersCache();
    invalidateClientVoucherUsagesCache();
    invalidateClientWalletOverviewCache();

    return {
      success: true,
      addedVnd,
      newBalanceVnd: newBal,
      voucher: {
        ...voucher,
        usedCount: (voucher.usedCount || 0) + 1,
      },
      message: `Đổi mã thành công! Bạn nhận được +${addedVnd.toLocaleString("vi-VN")}đ vào ví.`,
    };
  } catch (err: any) {
    console.error("[walletClientService] Fallback redeemGiftVoucher error:", err);
    throw new Error(err.message || "Không thể sử dụng mã quà tặng.");
  }
}

let cachedAdminVouchers: { data: Voucher[]; timestamp: number } | null = null;
const CLIENT_VOUCHERS_TTL_MS = 45 * 1000;

export function invalidateClientVouchersCache() {
  cachedAdminVouchers = null;
}

const clientVoucherUsagesCache = new Map<string, { data: VoucherUsage[]; timestamp: number }>();
const CLIENT_USAGES_TTL_MS = 45 * 1000;

export function invalidateClientVoucherUsagesCache() {
  clientVoucherUsagesCache.clear();
}

export async function getAdminVouchersApi(force = false): Promise<Voucher[]> {
  if (!force && cachedAdminVouchers && Date.now() - cachedAdminVouchers.timestamp < CLIENT_VOUCHERS_TTL_MS) {
    return cachedAdminVouchers.data;
  }

  try {
    const res = await api.get<{ success: boolean; items: Voucher[] }>(
      `/api/admin/vouchers${force ? "?force=true" : ""}`
    );
    if (Array.isArray(res?.items)) {
      cachedAdminVouchers = { data: res.items, timestamp: Date.now() };
      return res.items;
    }
  } catch (err) {
    console.warn("[walletClientService] API getAdminVouchersApi failed, trying direct Firestore query:", err);
  }

  try {
    const snap = await getDocs(query(collection(db, "vouchers"), limit(50)));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher));
    list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
    cachedAdminVouchers = { data: list, timestamp: Date.now() };
    return list;
  } catch (_) {}

  return [];
}

export async function getAdminVoucherUsagesApi(voucherId?: string, force = false): Promise<VoucherUsage[]> {
  const cacheKey = voucherId || "__all__";
  const cached = clientVoucherUsagesCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.timestamp < CLIENT_USAGES_TTL_MS) {
    return cached.data;
  }

  try {
    const url = voucherId
      ? `/api/admin/vouchers/${voucherId}/usages${force ? "?force=true" : ""}`
      : `/api/admin/vouchers/usages${force ? "?force=true" : ""}`;
    const res = await api.get<{ success: boolean; items: VoucherUsage[]; total: number }>(url);
    if (Array.isArray(res?.items)) {
      clientVoucherUsagesCache.set(cacheKey, { data: res.items, timestamp: Date.now() });
      return res.items;
    }
  } catch (err) {
    console.warn("[walletClientService] API getAdminVoucherUsagesApi failed, trying direct Firestore query:", err);
  }

  // Direct Firestore Fallback
  try {
    let q;
    if (voucherId) {
      q = query(collection(db, "voucher_usages"), where("voucherId", "==", voucherId), limit(50));
    } else {
      q = query(collection(db, "voucher_usages"), limit(50));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as VoucherUsage));
    list.sort((a, b) => {
      const timeA = getTimestampMillis(a.usedAt || a.createdAt);
      const timeB = getTimestampMillis(b.usedAt || b.createdAt);
      return timeB - timeA;
    });
    clientVoucherUsagesCache.set(cacheKey, { data: list, timestamp: Date.now() });
    return list;
  } catch (err: any) {
    console.error("[walletClientService] Direct Firestore voucher_usages failed:", err);
    return [];
  }
}

export async function createAdminVoucherApi(data: Partial<Voucher>): Promise<Voucher> {
  try {
    const res = await api.post<{ success: boolean; voucher: Voucher; message: string }>(
      "/api/admin/vouchers",
      data
    );
    if (res?.voucher) {
      invalidateClientVouchersCache();
      invalidateClientWalletOverviewCache();
      return res.voucher;
    }
  } catch (err: any) {
    console.warn("[walletClientService] API createAdminVoucherApi failed, trying direct Firestore write:", err);
  }

  // Direct Firestore fallback
  const code = String(data.code || "").trim().toUpperCase();
  const id = `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const voucher: Voucher = {
    id,
    code,
    name: data.name?.trim() || `Voucher ${code}`,
    type: data.type || "discount_fixed",
    value: Math.max(0, Number(data.value) || 0),
    maxDiscountVnd: data.maxDiscountVnd ? Math.max(0, Number(data.maxDiscountVnd)) : undefined,
    minOrderVnd: data.minOrderVnd ? Math.max(0, Number(data.minOrderVnd)) : 0,
    minDepositVnd: data.minDepositVnd ? Math.max(0, Number(data.minDepositVnd)) : 0,
    usageLimit: data.usageLimit !== undefined ? Math.max(0, Number(data.usageLimit)) : 0,
    usedCount: 0,
    perUserLimit: data.perUserLimit !== undefined ? Math.max(1, Number(data.perUserLimit)) : 1,
    expiresAt: data.expiresAt || null,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    description: data.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, "vouchers", id), voucher);
  invalidateClientVouchersCache();
  invalidateClientWalletOverviewCache();
  return voucher;
}

export async function updateAdminVoucherApi(id: string, data: Partial<Voucher>): Promise<Voucher> {
  try {
    const res = await api.patch<{ success: boolean; voucher: Voucher; message: string }>(
      `/api/admin/vouchers/${id}`,
      data
    );
    if (res?.voucher) {
      invalidateClientVouchersCache();
      invalidateClientWalletOverviewCache();
      return res.voucher;
    }
  } catch (err: any) {
    console.warn("[walletClientService] API updateAdminVoucherApi failed, trying direct Firestore write:", err);
  }

  // Direct Firestore fallback
  const now = new Date().toISOString();
  const updates: any = { ...data, updatedAt: now };
  if (data.code) updates.code = String(data.code).trim().toUpperCase();
  await updateDoc(doc(db, "vouchers", id), updates);
  invalidateClientVouchersCache();
  invalidateClientWalletOverviewCache();
  const snap = await getDoc(doc(db, "vouchers", id));
  return { id, ...(snap.data() as any) } as Voucher;
}

export async function deleteAdminVoucherApi(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/vouchers/${id}`);
    invalidateClientVouchersCache();
    invalidateClientVoucherUsagesCache();
    invalidateClientWalletOverviewCache();
    return;
  } catch (err: any) {
    console.warn("[walletClientService] API deleteAdminVoucherApi failed, trying direct Firestore delete:", err);
  }

  // Direct Firestore fallback
  await deleteDoc(doc(db, "vouchers", id));
  invalidateClientVouchersCache();
  invalidateClientVoucherUsagesCache();
  invalidateClientWalletOverviewCache();
}

export async function adminDirectEditWalletApi(
  studentUid: string,
  payload: AdminWalletEditPayload
): Promise<{ success: boolean; wallet: StudentWallet; message: string }> {
  try {
    return await api.post(`/api/admin/wallets/${studentUid}/direct-edit`, payload);
  } catch (err: any) {
    console.warn("[walletClientService] API adminDirectEditWalletApi failed, trying direct Firestore fallback:", err);
  }

  // Direct Firestore fallback
  const cleanUid = studentUid.trim();
  const wRef = doc(db, "wallets", cleanUid);
  const wSnap = await getDoc(wRef);
  const currentWallet = wSnap.exists()
    ? (wSnap.data() as StudentWallet)
    : {
        uid: cleanUid,
        fullName: "",
        balanceVnd: 0,
        totalCreditedVnd: 0,
        totalSpentVnd: 0,
        currentClass: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const now = new Date().toISOString();
  const updates: Partial<StudentWallet> = { updatedAt: now };
  if (payload.fullName !== undefined) updates.fullName = String(payload.fullName).trim();
  if (payload.currentClass !== undefined) updates.currentClass = String(payload.currentClass).trim().toUpperCase();
  if (payload.verifiedName !== undefined) (updates as any).verifiedName = String(payload.verifiedName).trim();
  if (payload.isVerified !== undefined) {
    (updates as any).isVerified = Boolean(payload.isVerified);
    if (payload.isVerified) {
      (updates as any).verifiedAt = now;
      (updates as any).verifiedBy = "admin";
    }
  }
  if (payload.totalCreditedVnd !== undefined) {
    updates.totalCreditedVnd = Math.max(0, Math.round(Number(payload.totalCreditedVnd) || 0));
  }
  if (payload.totalSpentVnd !== undefined) {
    updates.totalSpentVnd = Math.max(0, Math.round(Number(payload.totalSpentVnd) || 0));
  }

  const prevBal = Math.max(0, Math.round(Number(currentWallet.balanceVnd) || 0));
  const newBal =
    payload.balanceVnd !== undefined ? Math.max(0, Math.round(Number(payload.balanceVnd) || 0)) : prevBal;
  updates.balanceVnd = newBal;

  if (payload.totalReceivableVnd !== undefined) {
    updates.totalReceivableVnd = Math.max(0, Math.round(Number(payload.totalReceivableVnd) || 0));
    updates.totalReceivablesVnd = updates.totalReceivableVnd;
    updates.debtManualOverride = true;
  }
  if (payload.totalCollectedVnd !== undefined) {
    updates.totalCollectedVnd = Math.max(0, Math.round(Number(payload.totalCollectedVnd) || 0));
    updates.debtManualOverride = true;
  }
  if (payload.totalAdjustmentsVnd !== undefined) {
    updates.totalAdjustmentsVnd = Math.max(0, Math.round(Number(payload.totalAdjustmentsVnd) || 0));
    updates.totalAdjustedVnd = updates.totalAdjustmentsVnd;
    updates.debtManualOverride = true;
  }
  if (payload.remainingDebtVnd !== undefined) {
    updates.remainingDebtVnd = Math.max(0, Math.round(Number(payload.remainingDebtVnd) || 0));
    updates.debtManualOverride = true;
  }
  if (payload.debtStatus !== undefined) {
    updates.debtStatus = payload.debtStatus;
  }

  await setDoc(wRef, { ...currentWallet, ...updates }, { merge: true });

  if (newBal !== prevBal) {
    const diff = newBal - prevBal;
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txDoc: WalletTransaction = {
      id: txId,
      uid: cleanUid,
      type: "admin_adjustment",
      amountVnd: Math.abs(diff),
      balanceBeforeVnd: prevBal,
      balanceAfterVnd: newBal,
      actorUid: "admin",
      actorName: "Quản trị viên",
      note: payload.note || `Admin điều chỉnh số dư trực tiếp (${diff >= 0 ? "+" : ""}${diff.toLocaleString("vi-VN")}đ)`,
      createdAt: now,
    };
    await setDoc(doc(db, "wallet_transactions", txId), txDoc);
  }

  if (payload.remainingDebtVnd !== undefined) {
    const targetRemaining = Math.max(0, Math.round(Number(payload.remainingDebtVnd) || 0));
    try {
      const q = query(collection(db, "debt_records"), where("uid", "==", cleanUid));
      const debtSnap = await getDocs(q);
      const unpaidRecords = debtSnap.docs
        .map((d) => ({ ref: d.ref, id: d.id, data: d.data() as DebtRecord }))
        .filter(
          (d) =>
            d.data.type !== "cash_collection" &&
            (d.data.status === "unpaid" || d.data.status === "partial" || (d.data.remainingVnd && d.data.remainingVnd > 0))
        );

      const currentUnpaidSum = unpaidRecords.reduce((sum, d) => sum + (d.data.remainingVnd || 0), 0);

      if (targetRemaining === 0) {
        for (const d of unpaidRecords) {
          await setDoc(
            d.ref,
            {
              remainingVnd: 0,
              status: "paid",
              updatedAt: now,
              note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin điều chỉnh xóa công nợ về 0đ"),
            },
            { merge: true }
          );
        }
      } else if (unpaidRecords.length > 0) {
        if (targetRemaining <= currentUnpaidSum) {
          let remAlloc = targetRemaining;
          for (const d of unpaidRecords) {
            const currentRecRem = d.data.remainingVnd || 0;
            if (remAlloc <= 0) {
              await setDoc(
                d.ref,
                {
                  remainingVnd: 0,
                  status: "paid",
                  updatedAt: now,
                  note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin điều chỉnh giảm công nợ"),
                },
                { merge: true }
              );
            } else if (currentRecRem <= remAlloc) {
              remAlloc -= currentRecRem;
            } else {
              const newRem = remAlloc;
              remAlloc = 0;
              await setDoc(
                d.ref,
                {
                  remainingVnd: newRem,
                  status: "partial",
                  updatedAt: now,
                  note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin điều chỉnh công nợ"),
                },
                { merge: true }
              );
            }
          }
        } else {
          const diff = targetRemaining - currentUnpaidSum;
          const lastRec = unpaidRecords[unpaidRecords.length - 1];
          await setDoc(
            lastRec.ref,
            {
              remainingVnd: (lastRec.data.remainingVnd || 0) + diff,
              amountVnd: Math.max(lastRec.data.amountVnd || 0, (lastRec.data.remainingVnd || 0) + diff),
              status: "partial",
              updatedAt: now,
              note: (lastRec.data.note ? lastRec.data.note + " | " : "") + (payload.note || `Admin tăng công nợ +${diff.toLocaleString("vi-VN")}đ`),
            },
            { merge: true }
          );
        }
      } else {
        const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDebtDoc: DebtRecord = {
          id: debtId,
          uid: cleanUid,
          studentNameSnapshot: (updates.fullName || currentWallet.fullName || "").trim(),
          studentClassSnapshot: (updates.currentClass || currentWallet.currentClass || "").trim(),
          type: "manual_receivable",
          amountVnd: targetRemaining,
          collectedVnd: 0,
          allocatedVnd: 0,
          remainingVnd: targetRemaining,
          adjustedVnd: 0,
          status: "unpaid",
          note: payload.note || `Admin thiết lập công nợ trực tiếp: ${targetRemaining.toLocaleString("vi-VN")}đ`,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, "debt_records", debtId), newDebtDoc);
      }
    } catch (debtSyncErr) {
      console.warn("[walletClientService] Could not sync debt_records in fallback mode:", debtSyncErr);
    }
  }

  invalidateAdminDebtFallbackCache();
  return {
    success: true,
    wallet: { ...currentWallet, ...updates } as StudentWallet,
    message: "Đã cập nhật ví học sinh trực tiếp!",
  };
}

/**
 * Awards coins (5 - 30 đồng) to a student upon conquering a Journey level.
 */
export async function awardJourneyRewardCoins(
  studentUid: string,
  coins: number,
  level: number,
  subjectName: string
): Promise<{ success: boolean; coinsAwarded: number; newBalance: number }> {
  const cleanUid = studentUid || getResolvedStudentUid();
  const rewardAmount = Math.max(5, Math.min(100, Math.floor(coins)));
  if (!cleanUid) {
    return { success: false, coinsAwarded: 0, newBalance: 0 };
  }

  // 1. Update local cache immediately
  let localBal = 0;
  try {
    const rawBal = localStorage.getItem(`dktest_wallet_balance_${cleanUid}`);
    localBal = rawBal ? parseInt(rawBal, 10) || 0 : 0;
    localBal += rewardAmount;
    localStorage.setItem(`dktest_wallet_balance_${cleanUid}`, String(localBal));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dktest:wallet_updated", { detail: { newBalance: localBal } }));
    }
  } catch (_) {}

  // 2. Persist to Firestore if available
  try {
    const walletRef = doc(db, "wallets", cleanUid);
    const snap = await getDoc(walletRef);
    let currentBal = 0;
    if (snap.exists()) {
      currentBal = Number(snap.data()?.balanceVnd) || 0;
    }
    const updatedBal = currentBal + rewardAmount;
    await setDoc(
      walletRef,
      {
        balanceVnd: updatedBal,
        totalCreditedVnd: (Number(snap.data()?.totalCreditedVnd) || 0) + rewardAmount,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Record transaction
    const txId = `tx_jny_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, "wallet_transactions", txId), {
      id: txId,
      uid: cleanUid,
      type: "reward",
      amountVnd: rewardAmount,
      balanceAfterVnd: updatedBal,
      description: `Thưởng vượt Màn ${level} (${subjectName}) trong Hành trình học tập`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, coinsAwarded: rewardAmount, newBalance: updatedBal };
  } catch (err) {
    console.warn("[walletClientService] Could not persist reward to Firestore:", err);
    return { success: true, coinsAwarded: rewardAmount, newBalance: localBal };
  }
}


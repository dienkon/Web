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
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase/config";
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

export async function getMyDepositRequests(): Promise<DepositRequest[]> {
  try {
    const res = await api.get<{ success: boolean; items: DepositRequest[] }>("/api/wallet/deposit-requests");
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getMyDepositRequests failed, trying direct Firestore query:", err);
  }

  const currentUid = getResolvedStudentUid();
  if (currentUid) {
    try {
      const q = query(collection(db, "deposit_requests"), where("uid", "==", currentUid));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return items;
    } catch (_) {}
  }

  return [];
}

export async function getMyTransactions(): Promise<WalletTransaction[]> {
  try {
    const res = await api.get<{ success: boolean; items: WalletTransaction[] }>("/api/wallet/transactions");
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getMyTransactions failed, trying direct Firestore query:", err);
  }

  const currentUid = getResolvedStudentUid();
  if (currentUid) {
    try {
      const q = query(collection(db, "wallet_transactions"), where("uid", "==", currentUid));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletTransaction));
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return items;
    } catch (_) {}
  }

  return [];
}

export async function getMyDebtSummary(): Promise<{
  totalDebtVnd: number;
  unpaidCount: number;
  records: DebtRecord[];
}> {
  try {
    const res = await api.get<{ success: boolean; totalDebtVnd: number; unpaidCount: number; records: DebtRecord[] }>(
      "/api/wallet/debt"
    );
    if (res?.records) {
      return {
        totalDebtVnd: res.totalDebtVnd || 0,
        unpaidCount: res.unpaidCount || 0,
        records: res.records || [],
      };
    }
  } catch (err) {
    console.warn("[walletClientService] API getMyDebtSummary failed, trying direct Firestore query:", err);
  }

  const currentUid = getResolvedStudentUid();
  if (currentUid) {
    try {
      const q = query(collection(db, "debt_records"), where("uid", "==", currentUid));
      const snap = await getDocs(q);
      const allDebts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DebtRecord));
      const unpaid = allDebts.filter(
        (d) => d.status === "unpaid" || d.status === "partial" || (d.remainingVnd && d.remainingVnd > 0)
      );
      unpaid.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const totalDebtVnd = unpaid.reduce((sum, d) => sum + (d.remainingVnd ?? d.amountVnd ?? 0), 0);
      return { totalDebtVnd, unpaidCount: unpaid.length, records: unpaid };
    } catch (_) {}
  }

  return { totalDebtVnd: 0, unpaidCount: 0, records: [] };
}

export async function checkExamAccess(
  examId: string,
  providedUid?: string,
  providedUsername?: string
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
    return apiResult;
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
          return {
            ...apiResult,
            userBalance: realBal,
            missingVnd: Math.max(0, price - realBal),
            canUnlock: realBal >= price,
          };
        }
      }
    } catch (fsErr) {
      console.warn("[walletClientService] Direct Firestore wallet verification warning:", fsErr);
    }
  }

  if (apiResult) return apiResult;

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

      return {
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
      };
    }
  } catch (_) {}

  return {
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
  };
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

export async function getAdminWalletOverview(): Promise<AdminWalletOverview> {
  try {
    const res = await api.get<{ success: boolean; overview: AdminWalletOverview }>("/api/admin/wallet/overview");
    if (res?.overview) return res.overview;
  } catch (err) {
    console.warn("[walletClientService] API getAdminWalletOverview error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback
  try {
    const [walletsSnap, reqsSnap, debtsSnap] = await Promise.all([
      getDocs(collection(db, "wallets")),
      getDocs(collection(db, "deposit_requests")),
      getDocs(collection(db, "debt_records")),
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
    allReqs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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

    return {
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
}): Promise<{ items: StudentDebtSummary[]; total: number }> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.filterStatus) query.set("filterStatus", params.filterStatus);
    if (params?.className) query.set("className", params.className);
    const limit = params?.limit !== undefined ? Math.max(1, Number(params.limit)) : 10;
    query.set("limit", String(limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));

    const qs = query.toString();
    const endpoint = `/api/admin/wallet/students${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ success: boolean; items: StudentDebtSummary[]; total: number }>(endpoint);
    if (Array.isArray(res?.items)) return { items: res.items, total: res.total || res.items.length };
  } catch (err) {
    console.warn("[walletClientService] API getAdminStudentDebtList error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback with 30s cache
  try {
    const now = Date.now();
    let walletsSnap: any;
    let debtsSnap: any;
    let entsSnap: any;

    if (adminDebtFallbackCache && now - adminDebtFallbackCache.timestamp < 30000) {
      walletsSnap = adminDebtFallbackCache.walletsSnap;
      debtsSnap = adminDebtFallbackCache.debtsSnap;
      entsSnap = adminDebtFallbackCache.entsSnap;
    } else {
      [walletsSnap, debtsSnap, entsSnap] = await Promise.all([
        getDocs(collection(db, "wallets")),
        getDocs(collection(db, "debt_records")),
        getDocs(collection(db, "exam_entitlements")),
      ]);
      adminDebtFallbackCache = {
        walletsSnap,
        debtsSnap,
        entsSnap,
        timestamp: now,
      };
    }

    const debtByUid = new Map<string, { totalReceivable: number; totalCollected: number; remainingDebt: number }>();
    debtsSnap.docs.forEach((d: any) => {
      const rec = d.data() as DebtRecord;
      const uid = rec.uid;
      if (!debtByUid.has(uid)) {
        debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, remainingDebt: 0 });
      }
      const curr = debtByUid.get(uid)!;
      // CRITICAL: Cash collection receipts are payment proofs, NOT receivables!
      if ((rec as any).type !== "cash_collection") {
        curr.totalReceivable += rec.amountVnd || 0;
        curr.totalCollected += rec.collectedVnd || 0;
        curr.remainingDebt += Math.max(0, rec.remainingVnd || 0);
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
      const debtInfo = debtByUid.get(w.uid) || { totalReceivable: 0, totalCollected: 0, remainingDebt: 0 };
      let debtStatus: "in_debt" | "paid" | "has_credit" = "paid";
      if (debtInfo.remainingDebt > 0) debtStatus = "in_debt";
      else if ((w.balanceVnd || 0) > 0) debtStatus = "has_credit";

      summaries.push({
        uid: w.uid,
        fullName: w.fullName || "Chưa cập nhật",
        studentClass: w.currentClass || "—",
        currentClass: w.currentClass || "—",
        balanceVnd: w.balanceVnd || 0,
        totalReceivableVnd: debtInfo.totalReceivable,
        totalReceivablesVnd: debtInfo.totalReceivable,
        totalCollectedVnd: debtInfo.totalCollected,
        totalAdjustmentsVnd: 0,
        totalAdjustedVnd: 0,
        remainingDebtVnd: debtInfo.remainingDebt,
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
    const limit = params?.limit !== undefined ? Math.max(1, Number(params.limit)) : 10;
    return { items: summaries.slice(offset, offset + limit), total };
  } catch (fsErr) {
    console.error("[walletClientService] Direct Firestore fallback for debt list failed:", fsErr);
    return { items: [], total: 0 };
  }
}

export async function getAdminStudentWalletDetails(studentUid: string): Promise<{
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
  }>(`/api/admin/wallet/students/${studentUid}/details`);
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
}): Promise<DepositRequest[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/admin/wallet/deposit-requests${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ success: boolean; items: DepositRequest[] }>(endpoint);
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getAdminDepositRequests error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback
  try {
    const snap = await getDocs(collection(db, "deposit_requests"));
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositRequest));
    if (params?.status && params.status !== "all") {
      items = items.filter((r) => r.status === params.status);
    }
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
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
    const q = query(collection(db, "vouchers"), where("code", "==", cleanCode));
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
    const q = query(collection(db, "vouchers"), where("code", "==", cleanCode));
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
      where("uid", "==", studentUid)
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

export async function getAdminVouchersApi(): Promise<Voucher[]> {
  try {
    const res = await api.get<{ success: boolean; items: Voucher[] }>("/api/admin/vouchers");
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getAdminVouchersApi failed, trying direct Firestore query:", err);
  }

  try {
    const snap = await getDocs(collection(db, "vouchers"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher));
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (_) {}

  return [];
}

export async function getAdminVoucherUsagesApi(voucherId?: string): Promise<VoucherUsage[]> {
  try {
    const url = voucherId ? `/api/admin/vouchers/${voucherId}/usages` : "/api/admin/vouchers/usages";
    const res = await api.get<{ success: boolean; items: VoucherUsage[]; total: number }>(url);
    if (Array.isArray(res?.items)) return res.items;
  } catch (err) {
    console.warn("[walletClientService] API getAdminVoucherUsagesApi failed, trying direct Firestore query:", err);
  }

  // Direct Firestore Fallback
  try {
    let q;
    if (voucherId) {
      q = query(collection(db, "voucher_usages"), where("voucherId", "==", voucherId));
    } else {
      q = query(collection(db, "voucher_usages"));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VoucherUsage));
    list.sort((a, b) => {
      const timeA = new Date(a.usedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.usedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
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
    if (res?.voucher) return res.voucher;
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
  return voucher;
}

export async function updateAdminVoucherApi(id: string, data: Partial<Voucher>): Promise<Voucher> {
  try {
    const res = await api.patch<{ success: boolean; voucher: Voucher; message: string }>(
      `/api/admin/vouchers/${id}`,
      data
    );
    if (res?.voucher) return res.voucher;
  } catch (err: any) {
    console.warn("[walletClientService] API updateAdminVoucherApi failed, trying direct Firestore write:", err);
  }

  // Direct Firestore fallback
  const now = new Date().toISOString();
  const updates: any = { ...data, updatedAt: now };
  if (data.code) updates.code = String(data.code).trim().toUpperCase();
  await updateDoc(doc(db, "vouchers", id), updates);
  const snap = await getDoc(doc(db, "vouchers", id));
  return { id, ...(snap.data() as any) } as Voucher;
}

export async function deleteAdminVoucherApi(id: string): Promise<void> {
  try {
    await api.delete(`/api/admin/vouchers/${id}`);
    return;
  } catch (err: any) {
    console.warn("[walletClientService] API deleteAdminVoucherApi failed, trying direct Firestore delete:", err);
  }

  // Direct Firestore fallback
  await deleteDoc(doc(db, "vouchers", id));
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

  invalidateAdminDebtFallbackCache();
  return {
    success: true,
    wallet: { ...currentWallet, ...updates } as StudentWallet,
    message: "Đã cập nhật ví học sinh trực tiếp!",
  };
}

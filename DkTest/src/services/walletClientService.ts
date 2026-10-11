import { api } from "./apiClient";
import {
  doc,
  getDoc,
  getDocs,
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
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));

    const qs = query.toString();
    const endpoint = `/api/admin/wallet/students${qs ? `?${qs}` : ""}`;
    const res = await api.get<{ success: boolean; items: StudentDebtSummary[]; total: number }>(endpoint);
    if (Array.isArray(res?.items)) return { items: res.items, total: res.total || res.items.length };
  } catch (err) {
    console.warn("[walletClientService] API getAdminStudentDebtList error, attempting direct Firestore query:", err);
  }

  // Direct Firestore fallback
  try {
    const [walletsSnap, debtsSnap, entsSnap] = await Promise.all([
      getDocs(collection(db, "wallets")),
      getDocs(collection(db, "debt_records")),
      getDocs(collection(db, "exam_entitlements")),
    ]);

    const debtByUid = new Map<string, { totalReceivable: number; totalCollected: number; remainingDebt: number }>();
    debtsSnap.docs.forEach((d) => {
      const rec = d.data() as DebtRecord;
      const uid = rec.uid;
      if (!debtByUid.has(uid)) {
        debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, remainingDebt: 0 });
      }
      const curr = debtByUid.get(uid)!;
      curr.totalReceivable += rec.amountVnd || 0;
      curr.totalCollected += rec.collectedVnd || 0;
      curr.remainingDebt += Math.max(0, rec.remainingVnd || 0);
    });

    const unlocksByUid = new Map<string, number>();
    entsSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.status === "active") {
        unlocksByUid.set(data.uid, (unlocksByUid.get(data.uid) || 0) + 1);
      }
    });

    let summaries: StudentDebtSummary[] = [];
    walletsSnap.docs.forEach((d) => {
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
    const limit = params?.limit || 50;
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

export async function validateVoucherApi(params: {
  code: string;
  context: "exam_unlock" | "deposit" | "gift_money";
  amountVnd?: number;
  examId?: string;
}): Promise<{
  success: boolean;
  valid: boolean;
  message?: string;
  voucher?: Voucher;
  discountVnd?: number;
  bonusVnd?: number;
  finalPriceVnd?: number;
}> {
  return await api.post("/api/vouchers/validate", params);
}

export async function redeemGiftVoucherApi(code: string): Promise<{
  success: boolean;
  message: string;
  addedVnd: number;
  newBalanceVnd: number;
  voucher: Voucher;
}> {
  return await api.post("/api/vouchers/redeem-gift", { code });
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

export async function createAdminVoucherApi(data: Partial<Voucher>): Promise<Voucher> {
  const res = await api.post<{ success: boolean; voucher: Voucher; message: string }>(
    "/api/admin/vouchers",
    data
  );
  return res.voucher;
}

export async function updateAdminVoucherApi(id: string, data: Partial<Voucher>): Promise<Voucher> {
  const res = await api.patch<{ success: boolean; voucher: Voucher; message: string }>(
    `/api/admin/vouchers/${id}`,
    data
  );
  return res.voucher;
}

export async function deleteAdminVoucherApi(id: string): Promise<void> {
  await api.delete(`/api/admin/vouchers/${id}`);
}

export async function adminDirectEditWalletApi(
  studentUid: string,
  payload: AdminWalletEditPayload
): Promise<{ success: boolean; wallet: StudentWallet; message: string }> {
  return await api.post(`/api/admin/wallets/${studentUid}/direct-edit`, payload);
}

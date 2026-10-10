import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Coins,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  DollarSign,
  FileText,
  User,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Eye,
  Sliders,
  Calendar,
  CreditCard,
  X,
  Lock,
  Unlock,
  Users,
  Mail,
  Phone,
  School,
  Check,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import {
  getAdminWalletOverview,
  getAdminStudentDebtList,
  getAdminDepositRequests,
  approveDepositRequest,
  rejectDepositRequest,
  recordManualCashCollection,
  adjustStudentDebt,
  getAdminStudentWalletDetails,
  grantOrRevokeExamEntitlement,
  syncStudentsToWalletsApi,
  updateAdminStudentWalletProfileApi,
  type AdminWalletOverview,
} from "../../services/walletClientService";
import type {
  StudentDebtSummary,
  DepositRequest,
  StudentWallet,
  WalletTransaction,
  ExamEntitlement,
  DebtRecord,
  StudentWalletProfileDetail,
} from "../../types";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";

export default function WalletManagement() {
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "debts">("overview");
  const [overview, setOverview] = useState<AdminWalletOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Deposit Requests Tab State
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestFilter, setRequestFilter] = useState<string>("all");
  const [requestSearch, setRequestSearch] = useState<string>("");

  // Approve / Reject Modal State
  const [approvingRequest, setApprovingRequest] = useState<DepositRequest | null>(null);
  const [approveNote, setApproveNote] = useState<string>("");
  const [processingApprove, setProcessingApprove] = useState<boolean>(false);

  const [rejectingRequest, setRejectingRequest] = useState<DepositRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [processingReject, setProcessingReject] = useState<boolean>(false);

  // Debts Tab State
  const [debts, setDebts] = useState<StudentDebtSummary[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtSearch, setDebtSearch] = useState<string>("");
  const [debtFilterStatus, setDebtFilterStatus] = useState<"all" | "in_debt" | "paid" | "has_credit">("all");
  const [debtClassFilter, setDebtClassFilter] = useState<string>("");

  // Record Cash Collection Modal State
  const [collectingStudent, setCollectingStudent] = useState<StudentDebtSummary | null>(null);
  const [collectionAmount, setCollectionAmount] = useState<number>(10000);
  const [collectionMethod, setCollectionMethod] = useState<string>("cash");
  const [collectionRefCode, setCollectionRefCode] = useState<string>("");
  const [collectionNote, setCollectionNote] = useState<string>("");
  const [collectionCreditToWallet, setCollectionCreditToWallet] = useState<boolean>(true);
  const [processingCollection, setProcessingCollection] = useState<boolean>(false);

  // Debt Adjustment Modal State
  const [adjustingStudent, setAdjustingStudent] = useState<StudentDebtSummary | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(5000);
  const [adjustType, setAdjustType] = useState<"increase" | "decrease">("decrease");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [processingAdjust, setProcessingAdjust] = useState<boolean>(false);

  // Student Detail Modal State
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<{
    wallet: StudentWallet;
    studentProfile?: StudentWalletProfileDetail;
    transactions: WalletTransaction[];
    depositRequests: DepositRequest[];
    entitlements: ExamEntitlement[];
    debtRecords: DebtRecord[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Sync Students State
  const [syncingStudents, setSyncingStudents] = useState<boolean>(false);

  // KYC Verified Name Form State
  const [editVerifiedName, setEditVerifiedName] = useState<string>("");
  const [editIsVerified, setEditIsVerified] = useState<boolean>(false);
  const [savingWalletProfile, setSavingWalletProfile] = useState<boolean>(false);

  // Manual Grant/Revoke Entitlement Modal
  const [entitlementExamId, setEntitlementExamId] = useState<string>("");
  const [entitlementAction, setEntitlementAction] = useState<"grant" | "revoke">("grant");
  const [entitlementReason, setEntitlementReason] = useState<string>("");
  const [processingEntitlement, setProcessingEntitlement] = useState<boolean>(false);

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setOverviewLoading(true);
      const data = await getAdminWalletOverview();
      setOverview(data);
    } catch (err: any) {
      console.error("Load overview error:", err);
      showErrorToast(err.message || "Không thể tải số liệu tổng quan ví");
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load Requests Data
  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      const data = await getAdminDepositRequests({
        status: requestFilter !== "all" ? requestFilter : undefined,
        search: requestSearch || undefined,
      });
      setRequests(data);
    } catch (err: any) {
      console.error("Load requests error:", err);
      showErrorToast(err.message || "Không thể tải danh sách yêu cầu nạp");
    } finally {
      setRequestsLoading(false);
    }
  };

  // Load Debts Data
  const loadDebts = async () => {
    try {
      setDebtsLoading(true);
      const res = await getAdminStudentDebtList({
        search: debtSearch || undefined,
        filterStatus: debtFilterStatus,
        className: debtClassFilter || undefined,
      });
      setDebts(res.items);
    } catch (err: any) {
      console.error("Load debts error:", err);
      showErrorToast(err.message || "Không thể tải sổ công nợ học sinh");
    } finally {
      setDebtsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "requests") {
      loadRequests();
    } else if (activeTab === "debts") {
      loadDebts();
    }
  }, [activeTab, requestFilter]);

  // Handle Approve Deposit Request
  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    try {
      setProcessingApprove(true);
      const res = await approveDepositRequest(approvingRequest.id, approveNote);
      showSuccessToast(`Duyệt thành công nạp ${approvingRequest.amountVnd.toLocaleString("vi-VN")}đ!`);
      setApprovingRequest(null);
      setApproveNote("");
      loadRequests();
      loadOverview();
    } catch (err: any) {
      console.error("Approve error:", err);
      showErrorToast(err.message || "Không thể duyệt yêu cầu nạp tiền");
    } finally {
      setProcessingApprove(false);
    }
  };

  // Handle Reject Deposit Request
  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      showErrorToast("Vui lòng nhập lý do từ chối yêu cầu");
      return;
    }
    try {
      setProcessingReject(true);
      await rejectDepositRequest(rejectingRequest.id, rejectReason.trim());
      showSuccessToast("Đã từ chối yêu cầu nạp tiền");
      setRejectingRequest(null);
      setRejectReason("");
      loadRequests();
      loadOverview();
    } catch (err: any) {
      console.error("Reject error:", err);
      showErrorToast(err.message || "Không thể từ chối yêu cầu nạp");
    } finally {
      setProcessingReject(false);
    }
  };

  // Handle Record Manual Cash Collection
  const handleConfirmCollection = async () => {
    if (!collectingStudent) return;
    if (collectionAmount <= 0) {
      showErrorToast("Số tiền thu phải lớn hơn 0");
      return;
    }
    try {
      setProcessingCollection(true);
      await recordManualCashCollection(collectingStudent.uid, {
        amountVnd: collectionAmount,
        paymentMethod: collectionMethod,
        referenceCode: collectionRefCode.trim(),
        note: collectionNote.trim(),
        creditToWallet: collectionCreditToWallet,
      });
      showSuccessToast(`Đã ghi nhận thu ${collectionAmount.toLocaleString("vi-VN")}đ thành công!`);
      setCollectingStudent(null);
      setCollectionNote("");
      setCollectionRefCode("");
      loadDebts();
      loadOverview();
    } catch (err: any) {
      console.error("Collection error:", err);
      showErrorToast(err.message || "Không thể ghi nhận thu tiền");
    } finally {
      setProcessingCollection(false);
    }
  };

  // Handle Adjust Student Debt
  const handleConfirmAdjust = async () => {
    if (!adjustingStudent) return;
    if (adjustAmount <= 0) {
      showErrorToast("Số tiền điều chỉnh phải lớn hơn 0");
      return;
    }
    if (!adjustReason.trim()) {
      showErrorToast("Vui lòng nhập lý do điều chỉnh công nợ");
      return;
    }
    try {
      setProcessingAdjust(true);
      await adjustStudentDebt(adjustingStudent.uid, {
        amountVnd: adjustAmount,
        type: adjustType,
        reason: adjustReason.trim(),
      });
      showSuccessToast("Đã điều chỉnh công nợ thành công!");
      setAdjustingStudent(null);
      setAdjustReason("");
      loadDebts();
      loadOverview();
    } catch (err: any) {
      console.error("Adjust error:", err);
      showErrorToast(err.message || "Không thể điều chỉnh công nợ");
    } finally {
      setProcessingAdjust(false);
    }
  };

  // Sync Students into Wallet System
  const handleSyncStudents = async () => {
    try {
      setSyncingStudents(true);
      const res = await syncStudentsToWalletsApi();
      showSuccessToast(res.message || "Đồng bộ tài khoản học sinh thành công!");
      await Promise.all([loadOverview(), loadDebts()]);
    } catch (err: any) {
      console.error("Sync students error:", err);
      showErrorToast(err.message || "Không thể đồng bộ tài khoản học sinh");
    } finally {
      setSyncingStudents(false);
    }
  };

  // Open Student Details Modal
  const openStudentDetails = async (uid: string) => {
    setSelectedStudentUid(uid);
    try {
      setLoadingDetails(true);
      const data = await getAdminStudentWalletDetails(uid);
      setStudentDetails(data);
      setEditVerifiedName(
        (data.wallet as any).verifiedName ||
        data.studentProfile?.displayName ||
        data.wallet.fullName ||
        ""
      );
      setEditIsVerified(Boolean((data.wallet as any).isVerified));
    } catch (err: any) {
      console.error("Get student details error:", err);
      showErrorToast(err.message || "Không thể tải chi tiết học sinh");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Save Wallet KYC Profile
  const handleSaveWalletProfile = async () => {
    if (!selectedStudentUid) return;
    try {
      setSavingWalletProfile(true);
      const res = await updateAdminStudentWalletProfileApi(selectedStudentUid, {
        verifiedName: editVerifiedName.trim(),
        isVerified: editIsVerified,
      });
      showSuccessToast(res.message || "Đã lưu tên xác thực ví học sinh thành công!");
      if (studentDetails) {
        setStudentDetails({
          ...studentDetails,
          wallet: {
            ...studentDetails.wallet,
            verifiedName: res.wallet.verifiedName,
            isVerified: res.wallet.isVerified,
            verifiedAt: res.wallet.verifiedAt,
            verifiedBy: res.wallet.verifiedBy,
          },
        });
      }
      setDebts((prev) =>
        prev.map((d) =>
          d.uid === selectedStudentUid
            ? {
                ...d,
                verifiedName: res.wallet.verifiedName,
                isVerified: res.wallet.isVerified,
              }
            : d
        )
      );
    } catch (err: any) {
      console.error("Save wallet profile error:", err);
      showErrorToast(err.message || "Không thể cập nhật tên xác thực ví");
    } finally {
      setSavingWalletProfile(false);
    }
  };

  // Handle Manual Grant / Revoke Entitlement
  const handleConfirmEntitlementAction = async () => {
    if (!selectedStudentUid || !entitlementExamId.trim()) {
      showErrorToast("Vui lòng nhập ID đề thi hợp lệ");
      return;
    }
    if (!entitlementReason.trim()) {
      showErrorToast("Vui lòng nhập lý do cấp hoặc thu hồi");
      return;
    }
    try {
      setProcessingEntitlement(true);
      await grantOrRevokeExamEntitlement(
        selectedStudentUid,
        entitlementExamId.trim(),
        entitlementAction,
        entitlementReason.trim()
      );
      showSuccessToast(
        entitlementAction === "grant" ? "Đã cấp quyền mở khóa đề thi!" : "Đã thu hồi quyền mở khóa đề thi!"
      );
      setEntitlementExamId("");
      setEntitlementReason("");
      // Refresh student details
      const refreshed = await getAdminStudentWalletDetails(selectedStudentUid);
      setStudentDetails(refreshed);
    } catch (err: any) {
      console.error("Entitlement action error:", err);
      showErrorToast(err.message || "Thao tác quyền mở khóa thất bại");
    } finally {
      setProcessingEntitlement(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-600" />
            <span>Quản Lý Ví DkTEST & Sổ Công Nợ</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi số dư ví học sinh, phê duyệt nạp tiền, thu tiền mặt ngoại tuyến và quản lý công nợ minh bạch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={syncingStudents}
            onClick={handleSyncStudents}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Quét toàn bộ tài khoản học sinh trong hệ thống và tự động tạo/cập nhật hồ sơ ví"
          >
            <Users className={`w-3.5 h-3.5 ${syncingStudents ? "animate-spin" : ""}`} />
            <span>{syncingStudents ? "Đang đồng bộ..." : "Đồng bộ tài khoản học sinh"}</span>
          </button>

          <button
            onClick={() => {
              loadOverview();
              if (activeTab === "requests") loadRequests();
              if (activeTab === "debts") loadDebts();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Tổng Quan Sổ Quỹ</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === "requests"
              ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Yêu Cầu Nạp Tiền</span>
          {overview && overview.pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
              {overview.pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("debts")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px ${
            activeTab === "debts"
              ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sổ Công Nợ Học Sinh</span>
          {overview && overview.studentsInDebtCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
              {overview.studentsInDebtCount} nợ
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Số Dư Ví Toàn Hệ Thống</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {overview ? overview.totalVirtualBalanceVnd.toLocaleString("vi-VN") : "0"}đ
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tổng từ {overview?.totalWallets || 0} ví học sinh hoạt động
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Tổng Tiền Đã Nạp Vào Ví</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-blue-700">
                  {overview ? overview.totalConfirmedCreditedVnd.toLocaleString("vi-VN") : "0"}đ
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Đã giải ngân qua duyệt nạp & thu tiền trực tiếp
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Doanh Thu Mở Khóa Đề</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-purple-700">
                  {overview ? overview.totalUnlockedSpendingVnd.toLocaleString("vi-VN") : "0"}đ
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tiền học sinh đã chi tiêu mở khóa đề vĩnh viễn
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Yêu Cầu Chờ Duyệt</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-amber-700 flex items-center gap-2">
                  <span>{overview ? overview.pendingRequestsCount : 0}</span>
                  <span className="text-sm font-bold text-slate-500">
                    ({overview ? overview.pendingRequestsTotalVnd.toLocaleString("vi-VN") : 0}đ)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">Cần admin xác nhận thu tiền để cộng ví</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Công Nợ Còn Phải Thu</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-rose-700">
                  {overview ? overview.totalOutstandingDebtVnd.toLocaleString("vi-VN") : "0"}đ
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Phát sinh từ {overview?.studentsInDebtCount || 0} học sinh chưa nộp đủ
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-emerald-100">Bảo Vệ Tính Toàn Vẹn</span>
                <h3 className="text-lg font-black mt-1">Chống gian lận tiền tệ</h3>
                <p className="text-xs text-emerald-100/90 mt-1">
                  Tất cả giao dịch số dư & công nợ được thực hiện bằng số nguyên VND và chạy qua Firestore Transaction.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/50">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span className="text-[11px] font-bold text-emerald-200">Chuẩn số dư & Idempotency</span>
              </div>
            </div>
          </div>

          {/* Recent Requests Table Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Yêu Cầu Nạp Tiền Gần Đây</h3>
                <p className="text-xs text-slate-500">Hệ thống tự động duyệt cộng ví ảo, giáo viên theo dõi để thu tiền mặt ngoài đời</p>
              </div>
              <button
                onClick={() => setActiveTab("requests")}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {overviewLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách yêu cầu...</div>
            ) : !overview?.recentRequests || overview.recentRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                Hiện chưa có yêu cầu nạp tiền nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {overview.recentRequests.map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs">
                        VNĐ
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <span>{req.studentName || req.studentNameSnapshot || "Học sinh"}</span>
                          {(req.studentClass || req.studentClassSnapshot) && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              Lớp {req.studentClass || req.studentClassSnapshot}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(req.requestedAt || req.createdAt)}
                          {req.status === "approved" && (
                            <span className="ml-2 text-emerald-600 font-semibold">• Tự động duyệt</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">
                        +{req.amountVnd.toLocaleString("vi-VN")}đ
                      </span>

                      {req.status === "pending" ? (
                        <>
                          <button
                            onClick={() => {
                              setApprovingRequest(req);
                              setApproveNote("");
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Duyệt nạp
                          </button>
                          <button
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectReason("");
                            }}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </>
                      ) : req.status === "approved" ? (
                        <button
                          onClick={() => {
                            const studentSummary: StudentDebtSummary = {
                              uid: req.uid || req.studentUid || "",
                              fullName: req.studentName || req.studentNameSnapshot || "Học sinh",
                              studentClass: req.studentClass || req.studentClassSnapshot || "",
                              balanceVnd: 0,
                              totalReceivableVnd: req.amountVnd,
                              totalCollectedVnd: 0,
                              remainingDebtVnd: req.amountVnd,
                              totalPurchasesCount: 0,
                              debtStatus: "in_debt",
                            };
                            setCollectingStudent(studentSummary);
                            setCollectionAmount(req.amountVnd);
                            setCollectionCreditToWallet(false);
                            setCollectionNote(`Thu tiền mặt cho yêu cầu nạp #${req.id}`);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Ghi nhận đã thu tiền mặt ngoài đời để trừ công nợ"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Thu tiền mặt</span>
                        </button>
                      ) : (
                        <span className="text-xs text-rose-600 font-bold">Từ chối</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEPOSIT REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadRequests();
                }}
                placeholder="Tìm theo tên học sinh, lớp hoặc mã yêu cầu..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="pending">Chờ duyệt (Pending)</option>
                <option value="approved">Đã duyệt (Approved)</option>
                <option value="rejected">Bị từ chối (Rejected)</option>
              </select>

              <button
                onClick={loadRequests}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Lọc
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {requestsLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách yêu cầu nạp tiền...</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Không tìm thấy yêu cầu nạp tiền nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Học sinh</th>
                      <th className="px-4 py-3">Số tiền</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Người xử lý / Ghi chú</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{r.studentName || r.studentNameSnapshot || "Học sinh"}</div>
                          <div className="text-[11px] text-slate-400">
                            {(r.studentClass || r.studentClassSnapshot) ? `Lớp ${r.studentClass || r.studentClassSnapshot}` : "Chưa cập nhật lớp"} • UID: {(r.studentUid || r.uid || "").slice(0, 6)}...
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black text-slate-900">
                            {r.amountVnd.toLocaleString("vi-VN")}đ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          {formatDate(r.requestedAt || r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {r.status === "approved" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{r.processedBy === "system" ? "Tự động duyệt" : "Đã duyệt"}</span>
                              </>
                            ) : r.status === "rejected" ? (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Từ chối</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Chờ duyệt</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs">
                          {r.status === "approved" && (
                            <div>
                              <span className="font-bold text-slate-700">{r.reviewedBy || r.processedByName || r.processedBy || "Admin"}</span>
                              {(r.reviewNote || r.externalCollectionNote) && (
                                <div className="italic text-slate-400">"{r.reviewNote || r.externalCollectionNote}"</div>
                              )}
                            </div>
                          )}
                          {r.status === "rejected" && (
                            <div className="text-rose-600">
                              Lý do: <strong>{r.rejectionReason}</strong>
                            </div>
                          )}
                          {r.status === "pending" && <span className="text-slate-400 italic">Chưa duyệt</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setApprovingRequest(r);
                                  setApproveNote("");
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingRequest(r);
                                  setRejectReason("");
                                }}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {r.status === "approved" && (
                                <button
                                  onClick={() => {
                                    const studentSummary: StudentDebtSummary = {
                                      uid: r.uid || r.studentUid || "",
                                      fullName: r.studentName || r.studentNameSnapshot || "Học sinh",
                                      studentClass: r.studentClass || r.studentClassSnapshot || "",
                                      balanceVnd: 0,
                                      totalReceivableVnd: r.amountVnd,
                                      totalCollectedVnd: 0,
                                      remainingDebtVnd: r.amountVnd,
                                      totalPurchasesCount: 0,
                                      debtStatus: "in_debt",
                                    };
                                    setCollectingStudent(studentSummary);
                                    setCollectionAmount(r.amountVnd);
                                    setCollectionCreditToWallet(false);
                                    setCollectionNote(`Thu tiền mặt cho yêu cầu nạp #${r.id}`);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                  title="Ghi nhận thu tiền mặt để xóa nợ"
                                >
                                  Thu tiền
                                </button>
                              )}
                              <button
                                onClick={() => openStudentDetails(r.studentUid || r.uid)}
                                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                Xem ví
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEBTS LEDGER */}
      {activeTab === "debts" && (
        <div className="space-y-4">
          {/* Debt Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={debtSearch}
                onChange={(e) => setDebtSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadDebts();
                }}
                placeholder="Tìm học sinh theo tên, lớp hoặc UID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={debtFilterStatus}
                onChange={(e) => setDebtFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="in_debt">Đang có công nợ (Còn nợ)</option>
                <option value="paid">Đã thanh toán đủ (0đ nợ)</option>
                <option value="has_credit">Có dư nộp thừa</option>
              </select>

              <button
                onClick={loadDebts}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Lọc danh sách
              </button>
            </div>
          </div>

          {/* Sắp xếp mặc định: Công nợ giảm dần */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <span className="font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              Danh sách được tự động sắp xếp theo <strong>công nợ giảm dần</strong> để dễ thu hồi tiền mặt.
            </span>
            <span className="font-bold text-amber-800">{debts.length} học sinh</span>
          </div>

          {/* Debts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {debtsLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Đang tổng hợp sổ công nợ học sinh...</div>
            ) : debts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Chưa có dữ liệu công nợ học sinh phù hợp.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Học sinh</th>
                      <th className="px-4 py-3">Số dư ví</th>
                      <th className="px-4 py-3">Phát sinh phải thu</th>
                      <th className="px-4 py-3">Đã thu thực tế</th>
                      <th className="px-4 py-3">Điều chỉnh</th>
                      <th className="px-4 py-3">Công nợ còn lại</th>
                      <th className="px-4 py-3">Tình trạng</th>
                      <th className="px-4 py-3 text-right">Thao tác thu / Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {debts.map((s) => (
                      <tr key={s.uid} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-900 flex items-center gap-1.5">
                            <span>{s.fullName}</span>
                            {s.username && (
                              <span className="text-[11px] font-normal text-slate-400">
                                (@{s.username})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span>{(s.studentClass || s.currentClass) ? `Lớp ${s.studentClass || s.currentClass}` : "Chưa rõ lớp"}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-400">UID: {s.uid.slice(0, 6)}...</span>
                          </div>
                          {/* Tên xác thực của ví (KYC Badge) */}
                          <div className="mt-1 flex items-center gap-1.5">
                            {s.isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold" title="Tên ví đã được Admin xác thực">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Ví KYC: {s.verifiedName || s.fullName}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium" title="Chưa xác thực tên ví">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Ví KYC: {s.verifiedName || "Chưa xác thực"}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700">
                          {s.balanceVnd.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(s.totalReceivableVnd ?? s.totalReceivablesVnd ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-4 py-3 text-blue-700 font-semibold">
                          {s.totalCollectedVnd.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {(s.totalAdjustmentsVnd ?? s.totalAdjustedVnd ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-black text-sm ${
                              s.remainingDebtVnd > 0 ? "text-rose-600" : "text-slate-400"
                            }`}
                          >
                            {s.remainingDebtVnd.toLocaleString("vi-VN")}đ
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              s.debtStatus === "in_debt"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : s.debtStatus === "has_credit"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {s.debtStatus === "in_debt"
                              ? "Còn nợ"
                              : s.debtStatus === "has_credit"
                              ? "Dư tiền"
                              : "Đã thu đủ"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setCollectingStudent(s);
                                setCollectionAmount(s.remainingDebtVnd > 0 ? s.remainingDebtVnd : 10000);
                                setCollectionCreditToWallet(s.remainingDebtVnd <= 0);
                                setCollectionNote("");
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              title="Ghi nhận đã thu tiền mặt từ học sinh"
                            >
                              Thu tiền
                            </button>
                            <button
                              onClick={() => {
                                setAdjustingStudent(s);
                                setAdjustAmount(5000);
                                setAdjustReason("");
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              title="Điều chỉnh hoặc miễn giảm nợ"
                            >
                              Điều chỉnh
                            </button>
                            <button
                              onClick={() => openStudentDetails(s.uid)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                              title="Xem sổ cái chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: APPROVE DEPOSIT REQUEST */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Xác Nhận Duyệt Nạp Tiền</span>
              </h3>
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Học sinh:</span>
                <span className="text-slate-900 font-black">{approvingRequest.studentName || approvingRequest.studentNameSnapshot || "Học sinh"}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Lớp:</span>
                <span>{approvingRequest.studentClass || approvingRequest.studentClassSnapshot || "Chưa rõ"}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Số tiền nạp:</span>
                <span className="text-base font-black text-emerald-700">
                  +{approvingRequest.amountVnd.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú đối soát (tùy chọn)
              </label>
              <input
                type="text"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="VD: Đã nhận tiền mặt tại bàn giáo viên..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              ⚠️ Khi nhấn xác nhận, hệ thống sẽ tự động cộng số dư vào ví học sinh và cập nhật sổ cái trong một transaction an toàn.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingApprove}
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {processingApprove ? "Đang xử lý..." : "Xác nhận duyệt nạp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT DEPOSIT REQUEST */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Từ Chối Yêu Cầu Nạp Tiền</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Từ chối yêu cầu nạp{" "}
              <strong>{rejectingRequest.amountVnd.toLocaleString("vi-VN")}đ</strong> của thí sinh{" "}
              <strong>{rejectingRequest.studentName || rejectingRequest.studentNameSnapshot || "Học sinh"}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do từ chối (Bắt buộc) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Chưa nhận được tiền mặt, thông tin không khớp..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingReject}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {processingReject ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD CASH COLLECTION */}
      {collectingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Ghi Nhận Thu Tiền Mặt Ngoại Tuyến</span>
              </h3>
              <button
                type="button"
                onClick={() => setCollectingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div>
                Học sinh: <strong>{collectingStudent.fullName}</strong> ({collectingStudent.studentClass || collectingStudent.currentClass || "Chưa rõ lớp"})
              </div>
              <div>
                Công nợ hiện tại: <strong className="text-rose-600">{collectingStudent.remainingDebtVnd.toLocaleString("vi-VN")}đ</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền đã thu (VNĐ) *</label>
              <input
                type="number"
                step="1000"
                min="1000"
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phương thức thanh toán</label>
              <select
                value={collectionMethod}
                onChange={(e) => setCollectionMethod(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="cash">Tiền mặt tại lớp</option>
                <option value="bank_transfer">Chuyển khoản phụ huynh</option>
                <option value="other">Hình thức khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã tham chiếu / Biên lai</label>
              <input
                type="text"
                value={collectionRefCode}
                onChange={(e) => setCollectionRefCode(e.target.value)}
                placeholder="VD: BL-2026-001..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thu tiền</label>
              <input
                type="text"
                value={collectionNote}
                onChange={(e) => setCollectionNote(e.target.value)}
                placeholder="Ghi chú chi tiết về khoản thu..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="creditToWallet"
                  checked={collectionCreditToWallet}
                  onChange={(e) => setCollectionCreditToWallet(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="creditToWallet" className="text-xs font-bold text-emerald-900 cursor-pointer">
                  Đồng thời cộng thêm số tiền này vào Ví DkTEST của học sinh
                </label>
              </div>
              <p className="text-[11px] text-emerald-700 leading-normal pl-6">
                {collectionCreditToWallet
                  ? "⚠️ Chú ý: Học sinh sẽ nhận thêm tiền vào ví ảo. Chỉ dùng khi học sinh nạp tiền mặt trực tiếp mà chưa từng gửi yêu cầu trên hệ thống."
                  : "✓ Chuẩn đối soát: Thu tiền mặt ngoài đời để xóa công nợ (học sinh đã được hệ thống tự động cộng ví ảo trước đó)."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCollectingStudent(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingCollection}
                onClick={handleConfirmCollection}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {processingCollection ? "Đang ghi nhận..." : "Lưu phiếu thu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST STUDENT DEBT */}
      {adjustingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Điều Chỉnh Công Nợ Học Sinh</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Học sinh: <strong>{adjustingStudent.fullName}</strong>. Công nợ hiện tại:{" "}
              <strong className="text-rose-600">{adjustingStudent.remainingDebtVnd.toLocaleString("vi-VN")}đ</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại điều chỉnh</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("decrease")}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    adjustType === "decrease"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Giảm nợ (Miễn giảm)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("increase")}
                  className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    adjustType === "increase"
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  Tăng nợ (Phí bổ sung)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền điều chỉnh (VNĐ) *</label>
              <input
                type="number"
                step="1000"
                min="1000"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lý do điều chỉnh (Bắt buộc) *</label>
              <textarea
                rows={3}
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="VD: Miễn giảm theo chính sách khuyến học, thưởng điểm..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingStudent(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingAdjust}
                onClick={handleConfirmAdjust}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {processingAdjust ? "Đang xử lý..." : "Lưu điều chỉnh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: STUDENT DETAIL DRAWER */}
      {selectedStudentUid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  <span>Sổ Cái Chi Tiết Học Sinh</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">UID: {selectedStudentUid}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentUid(null);
                  setStudentDetails(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
              {loadingDetails ? (
                <div className="p-12 text-center text-xs text-slate-400">Đang tải chi tiết học sinh...</div>
              ) : !studentDetails ? (
                <div className="p-12 text-center text-xs text-slate-400 italic">Không có dữ liệu chi tiết.</div>
              ) : (
                <>
                  {/* Student Account Profile Card */}
                  <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-2xl p-4.5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs overflow-hidden shrink-0">
                          {studentDetails.studentProfile?.avatarUrl ? (
                            <img
                              src={studentDetails.studentProfile.avatarUrl}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {(studentDetails.studentProfile?.displayName || studentDetails.wallet.fullName || "HS").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-base text-slate-900">
                              {studentDetails.studentProfile?.displayName || studentDetails.wallet.fullName || "Chưa đặt tên"}
                            </h4>
                            {studentDetails.studentProfile?.username && (
                              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                                @{studentDetails.studentProfile.username}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            UID: <span className="font-mono">{studentDetails.wallet.uid}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-indigo-50 w-full sm:w-auto">
                        <span className="text-[11px] font-bold text-slate-400 block">Số dư ví DkTEST</span>
                        <span className="font-black text-xl text-emerald-700">
                          {studentDetails.wallet.balanceVnd.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-100/80 text-xs">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-50">
                        <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                          <School className="w-3 h-3 text-indigo-400" /> Lớp học
                        </span>
                        <span className="font-bold text-slate-800">
                          {studentDetails.studentProfile?.studentClass || studentDetails.wallet.currentClass || "—"}
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-50">
                        <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                          <School className="w-3 h-3 text-indigo-400" /> Trường học
                        </span>
                        <span className="font-bold text-slate-800 truncate block" title={studentDetails.studentProfile?.school}>
                          {studentDetails.studentProfile?.school || "Chưa cập nhật"}
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-50">
                        <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                          <Mail className="w-3 h-3 text-indigo-400" /> Email
                        </span>
                        <span className="font-bold text-slate-800 truncate block" title={studentDetails.studentProfile?.email}>
                          {studentDetails.studentProfile?.email || "—"}
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-50">
                        <span className="text-[10px] font-bold text-slate-400 block flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-400" /> Điện thoại
                        </span>
                        <span className="font-bold text-slate-800">
                          {studentDetails.studentProfile?.phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KYC & Verified Name Manager Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">
                          Tên Xác Thực Của Ví (KYC Identity)
                        </h4>
                      </div>
                      {studentDetails.wallet.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Đã xác thực KYC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Chưa xác thực KYC
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Tên xác thực chính chủ trên ví (Tên thật đối soát)
                        </label>
                        <input
                          type="text"
                          value={editVerifiedName}
                          onChange={(e) => setEditVerifiedName(e.target.value)}
                          placeholder="Nhập tên thật / tên tài khoản xác thực..."
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={editIsVerified}
                            onChange={(e) => setEditIsVerified(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>Xác thực danh tính ví này</span>
                        </label>

                        <button
                          type="button"
                          disabled={savingWalletProfile}
                          onClick={handleSaveWalletProfile}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {savingWalletProfile ? "Đang lưu..." : "Lưu tên ví"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manual Entitlement Grant / Revoke Section */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <span>Cấp / Thu Hồi Quyền Mở Khóa Đề Thi Thủ Công</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={entitlementExamId}
                        onChange={(e) => setEntitlementExamId(e.target.value)}
                        placeholder="Nhập Exam ID..."
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <select
                        value={entitlementAction}
                        onChange={(e) => setEntitlementAction(e.target.value as any)}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="grant">Cấp quyền (Unlock)</option>
                        <option value="revoke">Thu hồi (Lock)</option>
                      </select>
                      <input
                        type="text"
                        value={entitlementReason}
                        onChange={(e) => setEntitlementReason(e.target.value)}
                        placeholder="Lý do cấp/thu hồi..."
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={processingEntitlement}
                        onClick={handleConfirmEntitlementAction}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                      >
                        {processingEntitlement ? "Đang xử lý..." : "Thực hiện"}
                      </button>
                    </div>

                    {/* Active Entitlements List */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-[11px] font-bold text-slate-500">Các đề đã mở khóa ({studentDetails.entitlements.length}):</span>
                      {studentDetails.entitlements.length === 0 ? (
                        <p className="text-xs text-slate-400 italic mt-1">Chưa mở khóa đề thi nào.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {studentDetails.entitlements.map((en) => (
                            <span
                              key={en.id}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
                                en.status === "active"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-slate-100 text-slate-400 line-through"
                              }`}
                            >
                              <Unlock className="w-3 h-3 text-purple-500" />
                              <span>Đề: {en.examId}</span>
                              <span className="text-[10px] text-purple-500">({en.source})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transactions History */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900">
                      Lịch Sử Giao Dịch Ví ({studentDetails.transactions.length})
                    </h4>
                    {studentDetails.transactions.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có giao dịch ví nào.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-48 overflow-y-auto">
                        {studentDetails.transactions.map((tx) => (
                          <div key={tx.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <div className="font-bold text-slate-800">{tx.note || tx.description || "Giao dịch"}</div>
                              <div className="text-[10px] text-slate-400">{formatDate(tx.createdAt)}</div>
                            </div>
                            <div
                              className={`font-black ${
                                tx.amountVnd > 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {tx.amountVnd > 0 ? "+" : ""}
                              {tx.amountVnd.toLocaleString("vi-VN")}đ
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cash Collection & Debt Records */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900">
                      Phiếu Thu & Điều Chỉnh Công Nợ ({studentDetails.debtRecords.length})
                    </h4>
                    {studentDetails.debtRecords.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có phiếu thu tiền mặt nào.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden max-h-48 overflow-y-auto">
                        {studentDetails.debtRecords.map((dr) => (
                          <div key={dr.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <div className="font-bold text-slate-800">
                                {dr.type === "cash_collection" || dr.type === "manual_receivable" ? "Phiếu thu tiền mặt" : "Điều chỉnh công nợ"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {dr.note || dr.reason || "Bản ghi công nợ"} • {formatDate(dr.createdAt)}
                              </div>
                            </div>
                            <div className="font-black text-slate-900">
                              {dr.amountVnd.toLocaleString("vi-VN")}đ
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

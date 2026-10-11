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
  Edit3,
  Ticket,
  Trash2,
  Gift,
  Percent,
  Tag,
  Copy,
  History,
  Award,
  ExternalLink,
  Share2,
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
  adminDirectEditWalletApi,
  getAdminVouchersApi,
  getAdminVoucherUsagesApi,
  createAdminVoucherApi,
  updateAdminVoucherApi,
  deleteAdminVoucherApi,
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
  Voucher,
  VoucherType,
  VoucherUsage,
  AdminWalletEditPayload,
} from "../../types";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";

export default function WalletManagement() {
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "debts" | "vouchers">("overview");
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
  const [debtPage, setDebtPage] = useState<number>(1);
  const [debtTotal, setDebtTotal] = useState<number>(0);
  const debtPageSize = 10;

  // Record Cash Collection Modal State
  const [collectingStudent, setCollectingStudent] = useState<StudentDebtSummary | null>(null);
  const [collectionAmount, setCollectionAmount] = useState<number>(10000);
  const [collectionMethod, setCollectionMethod] = useState<string>("cash");
  const [collectionRefCode, setCollectionRefCode] = useState<string>("");
  const [collectionNote, setCollectionNote] = useState<string>("");
  const [collectionCreditToWallet, setCollectionCreditToWallet] = useState<boolean>(false);
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

  // Admin Direct Wallet Edit Modal State
  const [editingWalletStudent, setEditingWalletStudent] = useState<{
    uid: string;
    fullName: string;
    currentClass?: string;
    verifiedName?: string;
    isVerified?: boolean;
    balanceVnd: number;
    totalCreditedVnd?: number;
    totalSpentVnd?: number;
  } | null>(null);

  const [editBalanceVnd, setEditBalanceVnd] = useState<number>(0);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editCurrentClass, setEditCurrentClass] = useState<string>("");
  const [editWalletVerifiedName, setEditWalletVerifiedName] = useState<string>("");
  const [editWalletIsVerified, setEditWalletIsVerified] = useState<boolean>(false);
  const [editTotalCreditedVnd, setEditTotalCreditedVnd] = useState<number>(0);
  const [editTotalSpentVnd, setEditTotalSpentVnd] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>("");
  const [savingDirectEdit, setSavingDirectEdit] = useState<boolean>(false);

  // Vouchers Tab State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState<boolean>(false);
  const [voucherSearch, setVoucherSearch] = useState<string>("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>("all");

  // Create / Edit Voucher Modal
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [vCode, setVCode] = useState<string>("");
  const [vName, setVName] = useState<string>("");
  const [vDescription, setVDescription] = useState<string>("");
  const [vType, setVType] = useState<VoucherType>("gift_money");
  const [vValue, setVValue] = useState<number>(10000);
  const [vMaxDiscount, setVMaxDiscount] = useState<number | undefined>(undefined);
  const [vMinOrder, setVMinOrder] = useState<number | undefined>(undefined);
  const [vMinDeposit, setVMinDeposit] = useState<number | undefined>(undefined);
  const [vUsageLimit, setVUsageLimit] = useState<number | undefined>(undefined);
  const [vPerUserLimit, setVPerUserLimit] = useState<number>(1);
  const [vExpiresAt, setVExpiresAt] = useState<string>("");
  const [vIsActive, setVIsActive] = useState<boolean>(true);
  const [savingVoucher, setSavingVoucher] = useState<boolean>(false);

  // Delete Voucher Modal
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);
  const [processingDeleteVoucher, setProcessingDeleteVoucher] = useState<boolean>(false);

  // Voucher Usages Modal & Sub-View State
  const [selectedVoucherForUsages, setSelectedVoucherForUsages] = useState<Voucher | null>(null);
  const [voucherUsages, setVoucherUsages] = useState<VoucherUsage[]>([]);
  const [voucherUsagesLoading, setVoucherUsagesLoading] = useState<boolean>(false);
  const [voucherUsagesSearch, setVoucherUsagesSearch] = useState<string>("");
  const [voucherUsagesContextFilter, setVoucherUsagesContextFilter] = useState<string>("all");

  const [voucherSubTab, setVoucherSubTab] = useState<"vouchers_list" | "all_usages">("vouchers_list");
  const [allVoucherUsages, setAllVoucherUsages] = useState<VoucherUsage[]>([]);
  const [allVoucherUsagesLoading, setAllVoucherUsagesLoading] = useState<boolean>(false);
  const [allUsagesSearch, setAllUsagesSearch] = useState<string>("");
  const [allUsagesVoucherFilter, setAllUsagesVoucherFilter] = useState<string>("all");

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

  // Load Debts Data (10 students per page for read optimization)
  const loadDebts = async (page = debtPage) => {
    try {
      setDebtsLoading(true);
      const limit = debtPageSize;
      const offset = (page - 1) * limit;
      const res = await getAdminStudentDebtList({
        search: debtSearch || undefined,
        filterStatus: debtFilterStatus,
        className: debtClassFilter || undefined,
        limit,
        offset,
      });
      setDebts(res.items);
      setDebtTotal(res.total);
      setDebtPage(page);
    } catch (err: any) {
      console.error("Load debts error:", err);
      showErrorToast(err.message || "Không thể tải sổ công nợ học sinh");
    } finally {
      setDebtsLoading(false);
    }
  };

  // Load Vouchers Data
  const loadVouchers = async () => {
    try {
      setVouchersLoading(true);
      const list = await getAdminVouchersApi();
      setVouchers(list);
    } catch (err: any) {
      console.error("Load vouchers error:", err);
      showErrorToast(err.message || "Không thể tải danh sách voucher");
    } finally {
      setVouchersLoading(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        !voucherSearch ||
        v.code.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        v.name.toLowerCase().includes(voucherSearch.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(voucherSearch.toLowerCase()));
      const matchType = voucherTypeFilter === "all" || v.type === voucherTypeFilter;
      return matchSearch && matchType;
    });
  }, [vouchers, voucherSearch, voucherTypeFilter]);

  const voucherStats = useMemo(() => {
    const total = vouchers.length;
    const now = Date.now();
    const active = vouchers.filter((v) => v.isActive && (!v.expiresAt || new Date(v.expiresAt).getTime() > now)).length;
    const totalUsed = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);
    const expired = vouchers.filter((v) => v.expiresAt && new Date(v.expiresAt).getTime() <= now).length;
    return { total, active, totalUsed, expired };
  }, [vouchers]);

  const handleCopyVoucherCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      showSuccessToast(`Đã sao chép mã voucher "${code}"!`);
    } catch (_) {
      showInfoToast(`Mã voucher: ${code}`);
    }
  };

  const handleCopyVoucherLink = (code: string) => {
    try {
      const url = `${window.location.origin}/student/wallet?voucher=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(url);
      showSuccessToast(`Đã sao chép link nhận thưởng: ${url}`);
    } catch (_) {
      const url = `${window.location.origin}/student/wallet?voucher=${encodeURIComponent(code)}`;
      showInfoToast(`Link nhận thưởng: ${url}`);
    }
  };

  const handleViewVoucherUsages = async (v: Voucher) => {
    setSelectedVoucherForUsages(v);
    setVoucherUsagesSearch("");
    setVoucherUsagesContextFilter("all");
    try {
      setVoucherUsagesLoading(true);
      const items = await getAdminVoucherUsagesApi(v.id);
      setVoucherUsages(items);
    } catch (err: any) {
      console.error("Load voucher usages error:", err);
      showErrorToast(err.message || "Không thể tải danh sách người đã nhập mã");
    } finally {
      setVoucherUsagesLoading(false);
    }
  };

  const loadAllVoucherUsages = async () => {
    try {
      setAllVoucherUsagesLoading(true);
      const items = await getAdminVoucherUsagesApi();
      setAllVoucherUsages(items);
    } catch (err: any) {
      console.error("Load all voucher usages error:", err);
      showErrorToast(err.message || "Không thể tải lịch sử sử dụng voucher");
    } finally {
      setAllVoucherUsagesLoading(false);
    }
  };

  const filteredVoucherUsages = useMemo(() => {
    return voucherUsages.filter((u) => {
      const q = voucherUsagesSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.studentName && u.studentName.toLowerCase().includes(q)) ||
        (u.studentClass && u.studentClass.toLowerCase().includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q)) ||
        (u.voucherCode && u.voucherCode.toLowerCase().includes(q)) ||
        (u.code && u.code.toLowerCase().includes(q));
      const matchContext =
        voucherUsagesContextFilter === "all" || u.context === voucherUsagesContextFilter;
      return matchSearch && matchContext;
    });
  }, [voucherUsages, voucherUsagesSearch, voucherUsagesContextFilter]);

  const filteredAllVoucherUsages = useMemo(() => {
    return allVoucherUsages.filter((u) => {
      const q = allUsagesSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.studentName && u.studentName.toLowerCase().includes(q)) ||
        (u.studentClass && u.studentClass.toLowerCase().includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q)) ||
        (u.voucherCode && u.voucherCode.toLowerCase().includes(q)) ||
        (u.code && u.code.toLowerCase().includes(q));
      const matchVoucher =
        allUsagesVoucherFilter === "all" ||
        u.voucherId === allUsagesVoucherFilter ||
        (u.voucherCode && u.voucherCode === allUsagesVoucherFilter) ||
        (u.code && u.code === allUsagesVoucherFilter);
      return matchSearch && matchVoucher;
    });
  }, [allVoucherUsages, allUsagesSearch, allUsagesVoucherFilter]);

  // Open direct wallet edit modal from debts list
  const openEditWalletModal = (student: StudentDebtSummary) => {
    setEditingWalletStudent({
      uid: student.uid,
      fullName: student.fullName,
      currentClass: student.studentClass || student.currentClass,
      verifiedName: student.verifiedName,
      isVerified: student.isVerified,
      balanceVnd: student.balanceVnd,
      totalCreditedVnd: 0,
      totalSpentVnd: 0,
    });
    setEditBalanceVnd(student.balanceVnd || 0);
    setEditFullName(student.fullName || "");
    setEditCurrentClass(student.studentClass || student.currentClass || "");
    setEditWalletVerifiedName(student.verifiedName || student.fullName || "");
    setEditWalletIsVerified(Boolean(student.isVerified));
    setEditTotalCreditedVnd(0);
    setEditTotalSpentVnd(0);
    setEditReason("");
  };

  // Open direct wallet edit modal from student details drawer
  const openEditWalletModalFromDetails = () => {
    if (!studentDetails) return;
    const w = studentDetails.wallet;
    setEditingWalletStudent({
      uid: w.uid,
      fullName: w.fullName,
      currentClass: w.currentClass,
      verifiedName: w.verifiedName,
      isVerified: w.isVerified,
      balanceVnd: w.balanceVnd,
      totalCreditedVnd: w.totalCreditedVnd || 0,
      totalSpentVnd: w.totalSpentVnd || 0,
    });
    setEditBalanceVnd(w.balanceVnd || 0);
    setEditFullName(w.fullName || "");
    setEditCurrentClass(w.currentClass || "");
    setEditWalletVerifiedName(w.verifiedName || w.fullName || "");
    setEditWalletIsVerified(Boolean(w.isVerified));
    setEditTotalCreditedVnd(w.totalCreditedVnd || 0);
    setEditTotalSpentVnd(w.totalSpentVnd || 0);
    setEditReason("");
  };

  const handleConfirmDirectEditWallet = async () => {
    if (!editingWalletStudent) return;
    try {
      setSavingDirectEdit(true);
      const res = await adminDirectEditWalletApi(editingWalletStudent.uid, {
        balanceVnd: Number(editBalanceVnd),
        fullName: editFullName.trim(),
        currentClass: editCurrentClass.trim(),
        verifiedName: editWalletVerifiedName.trim(),
        isVerified: editWalletIsVerified,
        totalCreditedVnd: Number(editTotalCreditedVnd),
        totalSpentVnd: Number(editTotalSpentVnd),
        reason: editReason.trim() || "Admin cập nhật ví trực tiếp",
      });
      showSuccessToast(res.message || "Đã cập nhật toàn diện ví học sinh thành công!");
      setEditingWalletStudent(null);
      loadDebts();
      loadOverview();
      if (selectedStudentUid === editingWalletStudent.uid) {
        const refreshed = await getAdminStudentWalletDetails(editingWalletStudent.uid);
        setStudentDetails(refreshed);
      }
    } catch (err: any) {
      console.error("Direct edit wallet error:", err);
      showErrorToast(err.message || "Không thể cập nhật ví học sinh");
    } finally {
      setSavingDirectEdit(false);
    }
  };

  const handleOpenCreateVoucher = () => {
    setEditingVoucher(null);
    setVCode("");
    setVName("");
    setVDescription("");
    setVType("gift_money");
    setVValue(10000);
    setVMaxDiscount(undefined);
    setVMinOrder(undefined);
    setVMinDeposit(undefined);
    setVUsageLimit(undefined);
    setVPerUserLimit(1);
    setVExpiresAt("");
    setVIsActive(true);
    setIsVoucherModalOpen(true);
  };

  const handleOpenEditVoucher = (v: Voucher) => {
    setEditingVoucher(v);
    setVCode(v.code);
    setVName(v.name);
    setVDescription(v.description || "");
    setVType(v.type);
    setVValue(v.value);
    setVMaxDiscount(v.maxDiscountVnd);
    setVMinOrder(v.minOrderVnd);
    setVMinDeposit(v.minDepositVnd);
    setVUsageLimit(v.usageLimit);
    setVPerUserLimit(v.perUserLimit || 1);
    setVExpiresAt(v.expiresAt ? new Date(v.expiresAt).toISOString().slice(0, 16) : "");
    setVIsActive(v.isActive);
    setIsVoucherModalOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!vCode.trim()) {
      showErrorToast("Vui lòng nhập mã voucher");
      return;
    }
    if (!vName.trim()) {
      showErrorToast("Vui lòng nhập tên chương trình voucher");
      return;
    }
    if (vValue <= 0) {
      showErrorToast("Giá trị ưu đãi phải lớn hơn 0");
      return;
    }
    try {
      setSavingVoucher(true);
      const payload: Partial<Voucher> = {
        code: vCode.trim().toUpperCase(),
        name: vName.trim(),
        description: vDescription.trim() || undefined,
        type: vType,
        value: Number(vValue),
        maxDiscountVnd: vMaxDiscount ? Number(vMaxDiscount) : undefined,
        minOrderVnd: vMinOrder ? Number(vMinOrder) : undefined,
        minDepositVnd: vMinDeposit ? Number(vMinDeposit) : undefined,
        usageLimit: vUsageLimit ? Number(vUsageLimit) : undefined,
        perUserLimit: Number(vPerUserLimit || 1),
        expiresAt: vExpiresAt ? new Date(vExpiresAt).toISOString() : (null as any),
        isActive: vIsActive,
      };

      if (editingVoucher) {
        await updateAdminVoucherApi(editingVoucher.id, payload);
        showSuccessToast(`Đã cập nhật mã ${payload.code} thành công!`);
      } else {
        await createAdminVoucherApi(payload);
        showSuccessToast(`Đã tạo mã ${payload.code} thành công!`);
      }
      setIsVoucherModalOpen(false);
      loadVouchers();
    } catch (err: any) {
      console.error("Save voucher error:", err);
      showErrorToast(err.message || "Không thể lưu voucher");
    } finally {
      setSavingVoucher(false);
    }
  };

  const handleToggleVoucherActive = async (v: Voucher) => {
    try {
      await updateAdminVoucherApi(v.id, { isActive: !v.isActive });
      showSuccessToast(`Đã ${!v.isActive ? "kích hoạt" : "tạm khóa"} voucher ${v.code}`);
      loadVouchers();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể thay đổi trạng thái voucher");
    }
  };

  const handleConfirmDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    try {
      setProcessingDeleteVoucher(true);
      await deleteAdminVoucherApi(deletingVoucher.id);
      showSuccessToast(`Đã xóa voucher ${deletingVoucher.code}`);
      setDeletingVoucher(null);
      loadVouchers();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể xóa voucher");
    } finally {
      setProcessingDeleteVoucher(false);
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
    } else if (activeTab === "vouchers") {
      loadVouchers();
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
              if (activeTab === "vouchers") loadVouchers();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px shrink-0 ${
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
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px shrink-0 ${
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
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px shrink-0 ${
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

        <button
          onClick={() => setActiveTab("vouchers")}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-px shrink-0 ${
            activeTab === "vouchers"
              ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Mã Voucher & Ưu Đãi</span>
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
                  if (e.key === "Enter") {
                    setDebtPage(1);
                    loadDebts(1);
                  }
                }}
                placeholder="Tìm học sinh theo tên, lớp hoặc UID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={debtFilterStatus}
                onChange={(e) => {
                  setDebtFilterStatus(e.target.value as any);
                  setDebtPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="in_debt">Đang có công nợ (Còn nợ)</option>
                <option value="paid">Đã thanh toán đủ (0đ nợ)</option>
                <option value="has_credit">Có dư nộp thừa</option>
              </select>

              <button
                onClick={() => {
                  setDebtPage(1);
                  loadDebts(1);
                }}
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
              Danh sách được tự động sắp xếp theo <strong>công nợ giảm dần</strong> để dễ thu hồi tiền mặt (10 học sinh/trang).
            </span>
            <span className="font-bold text-amber-800">
              Trang {debtPage}/{Math.max(1, Math.ceil(debtTotal / debtPageSize))} (Tổng {debtTotal} học sinh)
            </span>
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
                              onClick={() => openEditWalletModal(s)}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Chỉnh sửa toàn diện số dư & hồ sơ ví"
                            >
                              <Edit3 className="w-4 h-4" />
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

            {/* Pagination Controls */}
            {debtTotal > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-medium">
                  Hiển thị{" "}
                  <strong className="text-slate-800">
                    {Math.min((debtPage - 1) * debtPageSize + 1, debtTotal)} -{" "}
                    {Math.min(debtPage * debtPageSize, debtTotal)}
                  </strong>{" "}
                  trên tổng số <strong className="text-slate-800">{debtTotal}</strong> học sinh
                  <span className="ml-2 text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md">
                    Tối ưu 10 học sinh/lần tải để tiết kiệm Firestore
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={debtPage <= 1 || debtsLoading}
                    onClick={() => {
                      const prev = Math.max(1, debtPage - 1);
                      loadDebts(prev);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Trang trước
                  </button>

                  <span className="px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 rounded-xl">
                    Trang {debtPage} / {Math.max(1, Math.ceil(debtTotal / debtPageSize))}
                  </span>

                  <button
                    type="button"
                    disabled={debtPage * debtPageSize >= debtTotal || debtsLoading}
                    onClick={() => {
                      const next = debtPage + 1;
                      loadDebts(next);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VOUCHERS & PROMOTIONS */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          {/* Top Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Voucher</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{voucherStats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Ticket className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đang hoạt động</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{voucherStats.active}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Tổng lượt đã nhập</p>
                <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-0.5">{voucherStats.totalUsed}</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Đã hết hạn / Khóa</p>
                <p className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">{voucherStats.expired + (voucherStats.total - voucherStats.active - voucherStats.expired)}</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Sub-view Switcher & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setVoucherSubTab("vouchers_list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  voucherSubTab === "vouchers_list"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Danh sách Voucher ({vouchers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoucherSubTab("all_usages");
                  if (allVoucherUsages.length === 0) loadAllVoucherUsages();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  voucherSubTab === "all_usages"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Nhật ký nhập mã toàn hệ thống</span>
                {allVoucherUsages.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] rounded-full font-black">
                    {allVoucherUsages.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {voucherSubTab === "all_usages" ? (
                <button
                  type="button"
                  onClick={loadAllVoucherUsages}
                  disabled={allVoucherUsagesLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${allVoucherUsagesLoading ? "animate-spin" : ""}`} />
                  <span>Tải lại nhật ký</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={loadVouchers}
                    disabled={vouchersLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${vouchersLoading ? "animate-spin" : ""}`} />
                    <span>Làm mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateVoucher}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Voucher Mới</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SUB-VIEW 1: VOUCHERS LIST */}
          {voucherSubTab === "vouchers_list" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={voucherSearch}
                      onChange={(e) => setVoucherSearch(e.target.value)}
                      placeholder="Tìm mã hoặc tên voucher..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={voucherTypeFilter}
                    onChange={(e) => setVoucherTypeFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="all">Tất cả loại ưu đãi</option>
                    <option value="gift_money">🎁 Nhận tiền ví (Gift Code)</option>
                    <option value="discount_percent">% Giảm giá mở đề thi</option>
                    <option value="discount_fixed">Giảm tiền cố định mở đề</option>
                    <option value="deposit_bonus_percent">% Thưởng nạp ví</option>
                    <option value="deposit_bonus_fixed">Thưởng tiền cố định khi nạp</option>
                  </select>
                </div>
              </div>

              {/* Vouchers Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {vouchersLoading ? (
                  <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách mã ưu đãi...</div>
                ) : filteredVouchers.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 italic">
                    Chưa có mã voucher nào phù hợp. Bấm "Tạo Voucher Mới" để thêm mã khuyến mãi đầu tiên!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="px-4 py-3">Mã Voucher</th>
                          <th className="px-4 py-3">Tên & Mô tả</th>
                          <th className="px-4 py-3">Loại ưu đãi</th>
                          <th className="px-4 py-3">Giá trị</th>
                          <th className="px-4 py-3">Điều kiện áp dụng</th>
                          <th className="px-4 py-3">Đã dùng / Giới hạn</th>
                          <th className="px-4 py-3">Hạn sử dụng</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredVouchers.map((v) => {
                          const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();
                          return (
                            <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                                    {v.code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyVoucherCode(v.code)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                    title="Sao chép mã voucher"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyVoucherLink(v.code)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors cursor-pointer"
                                    title="Sao chép link nhận thưởng (học sinh bấm vào tự động nhận)"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900">{v.name}</div>
                                {v.description && (
                                  <div className="text-[11px] text-slate-500 line-clamp-1">{v.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.type === "gift_money"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : v.type.startsWith("discount")
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}>
                                  {v.type === "gift_money" && "🎁 Nhận tiền ví"}
                                  {v.type === "discount_percent" && "🏷️ Giảm % mở đề"}
                                  {v.type === "discount_fixed" && "🏷️ Giảm tiền mở đề"}
                                  {v.type === "deposit_bonus_percent" && "⚡ Thưởng % khi nạp"}
                                  {v.type === "deposit_bonus_fixed" && "⚡ Thưởng tiền khi nạp"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-black text-slate-900">
                                {v.type.includes("percent")
                                  ? `${v.value}%`
                                  : `${v.value.toLocaleString("vi-VN")}đ`}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-500 space-y-0.5">
                                {v.maxDiscountVnd && (
                                  <div>Tối đa: {v.maxDiscountVnd.toLocaleString("vi-VN")}đ</div>
                                )}
                                {v.minOrderVnd && (
                                  <div>Đơn tối thiểu: {v.minOrderVnd.toLocaleString("vi-VN")}đ</div>
                                )}
                                {v.minDepositVnd && (
                                  <div>Nạp tối thiểu: {v.minDepositVnd.toLocaleString("vi-VN")}đ</div>
                                )}
                                {!v.maxDiscountVnd && !v.minOrderVnd && !v.minDepositVnd && (
                                  <span className="text-slate-400">Không yêu cầu</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleViewVoucherUsages(v)}
                                  className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all border border-indigo-200/60 cursor-pointer shadow-2xs"
                                  title="Xem danh sách học sinh đã nhập mã này"
                                >
                                  <Users className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                                  <span>{v.usedCount || 0}</span>
                                  <span className="text-indigo-400 font-normal">/ {v.usageLimit ? v.usageLimit : "∞"}</span>
                                  <span className="text-[10px] text-indigo-600 font-bold underline underline-offset-2 ml-1">Xem ai nhập</span>
                                </button>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  (Tối đa {v.perUserLimit || 1} lần/hs)
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px]">
                                {v.expiresAt ? (
                                  <span className={isExpired ? "text-rose-600 font-bold" : "text-slate-600"}>
                                    {new Date(v.expiresAt).toLocaleDateString("vi-VN")}
                                    {isExpired && " (Hết hạn)"}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-bold">Vĩnh viễn</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleVoucherActive(v)}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-colors ${
                                    v.isActive && !isExpired
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                                  }`}
                                >
                                  {v.isActive && !isExpired ? "Đang bật" : "Tạm khóa"}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyVoucherLink(v.code)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                    title="Sao chép link nhận thưởng trực tiếp"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleViewVoucherUsages(v)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Xem chi tiết người đã nhập voucher"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditVoucher(v)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    title="Chỉnh sửa voucher"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingVoucher(v)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Xóa voucher"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: AUDIT TRAIL OF ALL REDEMPTIONS */}
          {voucherSubTab === "all_usages" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={allUsagesSearch}
                      onChange={(e) => setAllUsagesSearch(e.target.value)}
                      placeholder="Tìm tên học sinh, lớp, UID, mã voucher..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={allUsagesVoucherFilter}
                    onChange={(e) => setAllUsagesVoucherFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="all">Tất cả mã voucher</option>
                    {vouchers.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* All Usages Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                {allVoucherUsagesLoading ? (
                  <div className="p-12 text-center text-xs text-slate-400">Đang tải lịch sử nhập voucher...</div>
                ) : filteredAllVoucherUsages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 italic">
                    Chưa có lượt nhập voucher nào được ghi nhận trên hệ thống.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="px-4 py-3">Mã Voucher</th>
                          <th className="px-4 py-3">Học sinh</th>
                          <th className="px-4 py-3">Lớp & UID</th>
                          <th className="px-4 py-3">Thời gian nhập</th>
                          <th className="px-4 py-3">Mục đích sử dụng</th>
                          <th className="px-4 py-3">Quyền lợi nhận được</th>
                          <th className="px-4 py-3 text-right">Đối soát ví</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredAllVoucherUsages.map((u) => {
                          const benefit = Math.max(0, u.benefitVnd || u.bonusVnd || u.discountVnd || 0);
                          const code = u.voucherCode || u.code || "VOUCHER";
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                                  {code}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                                    {(u.studentName || "H").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{u.studentName || "Chưa cập nhật"}</div>
                                    {u.studentUsername && (
                                      <div className="text-[10px] text-slate-400">@{u.studentUsername}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-500">
                                <div>Lớp: <span className="font-bold text-slate-700">{u.studentClass || "—"}</span></div>
                                <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={u.uid}>
                                  {u.uid}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-600">
                                {u.usedAt || u.createdAt ? (
                                  <>
                                    <div className="font-bold text-slate-800">
                                      {new Date(u.usedAt || u.createdAt!).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(u.usedAt || u.createdAt!).toLocaleDateString("vi-VN")}
                                    </div>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.context === "gift_money"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : u.context === "exam_unlock"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}>
                                  {u.context === "gift_money" && "🎁 Nhận tiền vào ví"}
                                  {u.context === "exam_unlock" && "🏷️ Giảm giá mở đề thi"}
                                  {u.context === "deposit" && "⚡ Thưởng khi nạp ví"}
                                </span>
                                {u.referenceId && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Đề/Đơn: {u.referenceId}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-black text-emerald-600 text-xs">
                                  +{benefit.toLocaleString("vi-VN")}đ
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => openStudentDetails(u.uid)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Xem chi tiết ví và lịch sử học sinh này"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem ví HS</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Số tiền đã thu (VNĐ) *</label>
                {collectingStudent.remainingDebtVnd > 0 && (
                  <button
                    type="button"
                    onClick={() => setCollectionAmount(collectingStudent.remainingDebtVnd)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    Điền đúng số nợ ({collectingStudent.remainingDebtVnd.toLocaleString("vi-VN")}đ)
                  </button>
                )}
              </div>
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

                      <div className="text-left sm:text-right bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-indigo-50 w-full sm:w-auto flex flex-col items-start sm:items-end gap-1">
                        <span className="text-[11px] font-bold text-slate-400 block">Số dư ví DkTEST</span>
                        <span className="font-black text-xl text-emerald-700">
                          {studentDetails.wallet.balanceVnd.toLocaleString("vi-VN")}đ
                        </span>
                        <button
                          type="button"
                          onClick={openEditWalletModalFromDetails}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Chỉnh sửa ví</span>
                        </button>
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

      {/* MODAL: DIRECT EDIT WALLET (BALANCE & KYC PROFILE) */}
      {editingWalletStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <span>Chỉnh Sửa Toàn Diện Hồ Sơ & Số Dư Ví</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingWalletStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div>Học sinh: <strong>{editingWalletStudent.fullName}</strong></div>
              <div>UID: <span className="font-mono text-slate-500">{editingWalletStudent.uid}</span></div>
            </div>

            <div className="space-y-3">
              {/* Balance edit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số dư ví hiện tại (VNĐ) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={editBalanceVnd}
                    onChange={(e) => setEditBalanceVnd(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                    Hiển thị: {Number(editBalanceVnd || 0).toLocaleString("vi-VN")} VNĐ
                  </div>
                </div>
              </div>

              {/* Verified Name and Verification Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên xác thực của ví (KYC)
                  </label>
                  <input
                    type="text"
                    value={editWalletVerifiedName}
                    onChange={(e) => setEditWalletVerifiedName(e.target.value)}
                    placeholder="Tên thật ví..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editWalletIsVerified}
                      onChange={(e) => setEditWalletIsVerified(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Xác thực danh tính ví (KYC)</span>
                  </label>
                </div>
              </div>

              {/* Full name and class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên học sinh
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lớp học
                  </label>
                  <input
                    type="text"
                    value={editCurrentClass}
                    onChange={(e) => setEditCurrentClass(e.target.value)}
                    placeholder="VD: 12A1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Total credited and spent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tổng tiền đã nạp lũy kế
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={editTotalCreditedVnd}
                    onChange={(e) => setEditTotalCreditedVnd(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tổng tiền đã tiêu lũy kế
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={editTotalSpentVnd}
                    onChange={(e) => setEditTotalSpentVnd(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Note / reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do điều chỉnh / Ghi chú đối soát
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: Cập nhật số dư theo thỏa thuận ngoại tuyến..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingWalletStudent(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingDirectEdit}
                onClick={handleConfirmDirectEditWallet}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {savingDirectEdit ? "Đang lưu..." : "Lưu thay đổi ví"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT VOUCHER */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                <span>{editingVoucher ? "Chỉnh Sửa Voucher" : "Tạo Mã Voucher Mới"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Voucher *</label>
                  <input
                    type="text"
                    value={vCode}
                    onChange={(e) => setVCode(e.target.value.toUpperCase())}
                    placeholder="VD: GIAM50, TET2025..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên chương trình *</label>
                  <input
                    type="text"
                    value={vName}
                    onChange={(e) => setVName(e.target.value)}
                    placeholder="VD: Tặng tiền mừng năm mới"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại voucher *</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value as VoucherType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="gift_money">🎁 Nhận tiền trực tiếp vào ví (Gift Code)</option>
                  <option value="discount_percent">🏷️ Giảm giá theo % khi mở khóa đề thi</option>
                  <option value="discount_fixed">🏷️ Giảm số tiền cố định khi mở khóa đề thi</option>
                  <option value="deposit_bonus_percent">⚡ Thưởng thêm % số tiền khi nạp ví</option>
                  <option value="deposit_bonus_fixed">⚡ Thưởng số tiền cố định khi nạp ví</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Giá trị ưu đãi ({vType.includes("percent") ? "%" : "VNĐ"}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={vValue}
                    onChange={(e) => setVValue(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {vType === "discount_percent" && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giảm tối đa (VNĐ, để trống = không giới hạn)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={vMaxDiscount || ""}
                      onChange={(e) => setVMaxDiscount(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="VD: 50000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vType.startsWith("discount") && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giá trị đề thi tối thiểu (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={vMinOrder || ""}
                      onChange={(e) => setVMinOrder(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="VD: 20000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
                {vType.startsWith("deposit") && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số tiền nạp tối thiểu (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={vMinDeposit || ""}
                      onChange={(e) => setVMinDeposit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      placeholder="VD: 50000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tổng lượt dùng tối đa (để trống = vô hạn)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={vUsageLimit || ""}
                    onChange={(e) => setVUsageLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="VD: 100"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lượt dùng tối đa mỗi học sinh
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={vPerUserLimit}
                    onChange={(e) => setVPerUserLimit(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hạn sử dụng (để trống = vĩnh viễn)
                </label>
                <input
                  type="datetime-local"
                  value={vExpiresAt}
                  onChange={(e) => setVExpiresAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả / Thể lệ</label>
                <textarea
                  rows={2}
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                  placeholder="Ghi chú thể lệ chương trình khuyến mãi..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={vIsActive}
                    onChange={(e) => setVIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Kích hoạt voucher ngay</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={savingVoucher}
                onClick={handleSaveVoucher}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {savingVoucher ? "Đang lưu..." : editingVoucher ? "Cập nhật Voucher" : "Tạo Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE VOUCHER */}
      {deletingVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>Xóa Voucher</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeletingVoucher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn voucher <strong>{deletingVoucher.code}</strong> (
              {deletingVoucher.name}) không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVoucher(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={processingDeleteVoucher}
                onClick={handleConfirmDeleteVoucher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {processingDeleteVoucher ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VOUCHER USAGE AUDIT DETAILS */}
      {selectedVoucherForUsages && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-base text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                      {selectedVoucherForUsages.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucherCode(selectedVoucherForUsages.code)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                      title="Sao chép mã"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucherLink(selectedVoucherForUsages.code)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                      title="Sao chép link nhận thưởng trực tiếp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Sao chép link nhận</span>
                    </button>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedVoucherForUsages.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {selectedVoucherForUsages.isActive ? "Đang hoạt động" : "Tạm khóa"}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {selectedVoucherForUsages.name}
                  </h3>
                  {selectedVoucherForUsages.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{selectedVoucherForUsages.description}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVoucherForUsages(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ưu đãi</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {selectedVoucherForUsages.type.includes("percent")
                    ? `${selectedVoucherForUsages.value}%`
                    : `${selectedVoucherForUsages.value.toLocaleString("vi-VN")}đ`}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lượt đã ghi nhận</p>
                <p className="text-sm font-black text-indigo-700 mt-0.5">
                  {voucherUsages.length} lượt
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số học sinh đã nhập</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">
                  {new Set(voucherUsages.map((u) => u.uid)).size} học sinh
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng ưu đãi đã trao</p>
                <p className="text-sm font-black text-amber-600 mt-0.5">
                  {voucherUsages.reduce((sum, u) => sum + Math.max(0, u.benefitVnd || u.bonusVnd || u.discountVnd || 0), 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={voucherUsagesSearch}
                  onChange={(e) => setVoucherUsagesSearch(e.target.value)}
                  placeholder="Tìm học sinh, lớp, UID..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={voucherUsagesContextFilter}
                  onChange={(e) => setVoucherUsagesContextFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="all">Tất cả mục đích</option>
                  <option value="gift_money">🎁 Nhận tiền ví</option>
                  <option value="exam_unlock">🏷️ Giảm giá mở đề</option>
                  <option value="deposit">⚡ Thưởng nạp ví</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleViewVoucherUsages(selectedVoucherForUsages)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${voucherUsagesLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Table Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl overflow-hidden min-h-[220px]">
              {voucherUsagesLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Đang tải lịch sử nhập mã...</div>
              ) : filteredVoucherUsages.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 italic">
                  Chưa có học sinh nào nhập mã voucher này. Hãy chia sẻ mã cho học sinh sử dụng!
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                      <th className="px-4 py-2.5">Học sinh</th>
                      <th className="px-4 py-2.5">Lớp</th>
                      <th className="px-4 py-2.5">UID</th>
                      <th className="px-4 py-2.5">Thời gian nhập</th>
                      <th className="px-4 py-2.5">Mục đích</th>
                      <th className="px-4 py-2.5">Quyền lợi nhận được</th>
                      <th className="px-4 py-2.5 text-right">Đối soát ví</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredVoucherUsages.map((u) => {
                      const benefit = Math.max(0, u.benefitVnd || u.bonusVnd || u.discountVnd || 0);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                {(u.studentName || "H").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900">{u.studentName || "Chưa cập nhật"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-700">
                            {u.studentClass || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded" title={u.uid}>
                              {u.uid.length > 14 ? `${u.uid.substring(0, 12)}...` : u.uid}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px] text-slate-600">
                            {u.usedAt || u.createdAt ? (
                              <span>
                                {new Date(u.usedAt || u.createdAt!).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                                {" - "}
                                {new Date(u.usedAt || u.createdAt!).toLocaleDateString("vi-VN")}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.context === "gift_money"
                                ? "bg-emerald-100 text-emerald-800"
                                : u.context === "exam_unlock"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}>
                              {u.context === "gift_money" && "🎁 Nhận tiền ví"}
                              {u.context === "exam_unlock" && "🏷️ Giảm giá mở đề"}
                              {u.context === "deposit" && "⚡ Thưởng nạp ví"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-black text-emerald-600 text-xs">
                              +{benefit.toLocaleString("vi-VN")}đ
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVoucherForUsages(null);
                                openStudentDetails(u.uid);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="Mở drawer ví của học sinh để đối soát và chỉnh sửa nếu cần"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem ví HS</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0 text-xs text-slate-500">
              <div>
                Hiển thị <strong>{filteredVoucherUsages.length}</strong> / <strong>{voucherUsages.length}</strong> lượt nhập
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucherForUsages(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

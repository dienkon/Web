import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Plus,
  BookOpen,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  getMyWallet,
  subscribeMyWallet,
  updateMyWalletProfile,
  createDepositRequest,
  getMyDepositRequests,
  getMyTransactions,
} from "../../services/walletClientService";
import type { StudentWallet as WalletType, DepositRequest, WalletTransaction } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";

export default function StudentWalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast();

  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deposit" | "requests" | "history">("deposit");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileClass, setProfileClass] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Deposit input state
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [customInputStr, setCustomInputStr] = useState<string>("5000");

  // 3-Step Confirmation Modal State (Phần B - Section 7)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2 | 3>(1);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  useEffect(() => {
    loadWalletData();

    if (user?.uid) {
      const unsub = subscribeMyWallet(user.uid, (liveWallet) => {
        setWallet(liveWallet);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const [w, reqs, txs] = await Promise.all([
        getMyWallet(),
        getMyDepositRequests().catch(() => []),
        getMyTransactions().catch(() => []),
      ]);
      setWallet(w);
      setRequests(reqs);
      setTransactions(txs);

      if (!w.profileCompleted || !w.fullName || !w.currentClass) {
        setProfileName(w.fullName || "");
        setProfileClass(w.currentClass || "");
        setShowProfileModal(true);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thông tin ví:", err);
      showErrorToast("Không thể tải thông tin ví. Vui lòng đăng nhập lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || profileName.trim().length < 2) {
      showErrorToast("Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).");
      return;
    }
    if (!profileClass.trim() || profileClass.trim().length < 2) {
      showErrorToast("Vui lòng nhập lớp học hiện tại (ví dụ: 11A1).");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateMyWalletProfile(profileName.trim(), profileClass.trim());
      setWallet(updated);
      setShowProfileModal(false);
      showSuccessToast("Đã cập nhật hồ sơ ví thành công!");
    } catch (err: any) {
      showErrorToast(err.message || "Cập nhật hồ sơ thất bại.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStartDeposit = () => {
    if (!wallet?.profileCompleted || !wallet?.fullName || !wallet?.currentClass) {
      setShowProfileModal(true);
      return;
    }

    const amt = parseInt(customInputStr.replace(/\D/g, "") || "0", 10);
    if (isNaN(amt) || amt < 1000) {
      showErrorToast("Số tiền nạp tối thiểu là 1.000đ.");
      return;
    }
    if (amt > 500000) {
      showErrorToast("Số tiền nạp tối đa cho mỗi yêu cầu là 500.000đ.");
      return;
    }

    setDepositAmount(amt);
    setConfirmStep(1);
    setShowConfirmModal(true);
  };

  const handleFinalSubmitDeposit = async () => {
    setSubmittingDeposit(true);
    try {
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await createDepositRequest(depositAmount, idempotencyKey);
      setShowConfirmModal(false);
      showSuccessToast(
        `Nạp tiền thành công! Đã cộng +${depositAmount.toLocaleString("vi-VN")}đ vào ví của bạn. Vui lòng nộp tiền mặt cho giáo viên để hoàn tất công nợ.`
      );
      // Cập nhật lại số dư và lịch sử ngay lập tức
      await loadWalletData();
      setActiveTab("requests");
    } catch (err: any) {
      showErrorToast(err.message || "Gửi yêu cầu nạp thất bại.");
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const unlockedExams = transactions
    .filter((tx) => tx.type === "exam_unlock_debit" && tx.examId)
    .reduce((acc, curr) => {
      if (!acc.some((x) => x.examId === curr.examId)) {
        acc.push(curr);
      }
      return acc;
    }, [] as WalletTransaction[]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Ví DkTEST & Mở khóa đề thi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Hệ thống số dư ảo cá nhân để mở khóa vĩnh viễn các bài thi có trả phí.
          </p>
        </div>

        <button
          onClick={loadWalletData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/10 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Số dư khả dụng
            </span>
            <span className="p-1.5 bg-white/15 rounded-lg">
              <Wallet className="w-4 h-4 text-emerald-100" />
            </span>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {(wallet?.balanceVnd || 0).toLocaleString("vi-VN")}
              <span className="text-base sm:text-lg font-bold ml-1 text-emerald-200">đ</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1">
              Dùng để mở khóa vĩnh viễn đề thi bất cứ lúc nào
            </p>
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="text-emerald-100">Học sinh:</span>
            <span className="font-bold truncate max-w-[150px]">
              {wallet?.fullName || "Chưa cập nhật"} {wallet?.currentClass ? `(${wallet.currentClass})` : ""}
            </span>
          </div>
        </div>

        {/* Total Credited */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tổng tiền đã nạp
            </span>
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {(wallet?.totalCreditedVnd || 0).toLocaleString("vi-VN")}
              <span className="text-sm font-bold ml-1 text-slate-400">đ</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Đã được Admin xác nhận thu tiền thực tế</p>
          </div>
        </div>

        {/* Total Spent */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đã chi mở khóa
            </span>
            <span className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {(wallet?.totalSpentVnd || 0).toLocaleString("vi-VN")}
              <span className="text-sm font-bold ml-1 text-slate-400">đ</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Đã mở khóa {unlockedExams.length} bài thi vĩnh viễn
            </p>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
          <p className="font-bold">Quy trình nạp tiền và mở khóa bài thi DkTEST:</p>
          <p className="opacity-90 leading-relaxed">
            Hệ thống tự động duyệt và <strong>cộng ngay số dư vào ví ảo</strong> để bạn có thể mở khóa và làm bài thi ngay lập tức. Khoản tiền nạp sẽ được ghi nhận vào sổ công nợ để giáo viên/quản trị viên thu tiền mặt ngoài đời.
          </p>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === "deposit"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Plus className="w-4 h-4" />
          Tạo yêu cầu nạp tiền
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === "requests"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          Yêu cầu nạp ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Đề thi đã mở khóa ({unlockedExams.length})
        </button>
      </div>

      {/* TAB 1: FORM TẠO YÊU CẦU NẠP */}
      {activeTab === "deposit" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Tạo yêu cầu nạp số dư ví
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập số tiền muốn nạp từ 1.000đ đến 500.000đ.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nhập số tiền muốn nạp (VNĐ):
              </label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  value={customInputStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const num = raw ? parseInt(raw, 10) : 0;
                    setCustomInputStr(num > 0 ? num.toLocaleString("vi-VN") : "");
                    setDepositAmount(num);
                  }}
                  placeholder="Ví dụ: 10.000"
                  className="w-full pl-4 pr-14 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-2 uppercase">
                Gợi ý nhanh số tiền:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {[5000, 10000, 20000, 50000, 100000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setDepositAmount(quick);
                      setCustomInputStr(quick.toLocaleString("vi-VN"));
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      depositAmount === quick
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    +{quick.toLocaleString("vi-VN")}đ
                  </button>
                ))}
              </div>
            </div>

            {/* Student Snapshot Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Thông tin học sinh xác nhận:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {wallet?.fullName || "Chưa có"} — Lớp: {wallet?.currentClass || "Chưa có"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Chỉnh sửa
              </button>
            </div>

            <button
              type="button"
              onClick={handleStartDeposit}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              Tiến hành xác nhận nạp tiền
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH YÊU CẦU NẠP */}
      {activeTab === "requests" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Lịch sử các yêu cầu nạp tiền
            </h2>
            <span className="text-xs text-slate-500">{requests.length} yêu cầu</span>
          </div>

          {requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Bạn chưa có yêu cầu nạp tiền nào.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {requests.map((r) => {
                let badge = (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Chờ admin xác nhận
                  </span>
                );
                if (r.status === "approved") {
                  badge = (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đã cộng ví
                    </span>
                  );
                } else if (r.status === "rejected") {
                  badge = (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Từ chối
                    </span>
                  );
                }

                return (
                  <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          +{r.amountVnd.toLocaleString("vi-VN")}đ
                        </span>
                        {badge}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Mã: {r.id} • {formatDate(r.createdAt)}
                      </span>
                      {r.status === "rejected" && r.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          Lý do: {r.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DANH SÁCH ĐỀ THI ĐÃ MỞ KHÓA */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Đề thi đã mở khóa vĩnh viễn
            </h2>
            <span className="text-xs text-slate-500">{unlockedExams.length} bài thi</span>
          </div>

          {unlockedExams.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Bạn chưa mở khóa đề thi nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedExams.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-block mb-1.5">
                      ✓ Đã mở khóa vĩnh viễn
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {tx.examTitleSnapshot || "Đề thi đã mở khóa"}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Giá mở khóa: {tx.amountVnd.toLocaleString("vi-VN")}đ • Ngày mua: {formatDate(tx.createdAt)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                    <Link
                      to={`/student/exam/${tx.examId}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      Làm bài ngay
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BẮT BUỘC ĐIỀN HỒ SƠ LẦN ĐẦU */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-2xl">
                <User className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hoàn thiện hồ sơ ví DkTEST
                </h3>
                <p className="text-xs text-slate-500">
                  Vui lòng cung cấp họ tên và lớp để admin đối soát thu tiền.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lớp học hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileClass}
                  onChange={(e) => setProfileClass(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: 11A1, 12D2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {savingProfile ? "Đang lưu..." : "Lưu thông tin hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XÁC NHẬN 3 LẦN TRƯỚC KHI TẠO YÊU CẦU NẠP (Phần B - Section 7) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                Xác nhận nạp tiền — Bước {confirmStep}/3
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`h-2 rounded-full transition-all ${
                      confirmStep >= step
                        ? "w-6 bg-emerald-600"
                        : "w-2 bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* BƯỚC 1: XÁC NHẬN SỐ TIỀN & THÔNG TIN HỌC SINH */}
            {confirmStep === 1 && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <span className="text-xs text-slate-500 block">Số tiền yêu cầu nạp:</span>
                  <div className="text-3xl font-black text-emerald-600">
                    {depositAmount.toLocaleString("vi-VN")}đ
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ tên thí sinh:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {wallet?.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lớp hiện tại:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {wallet?.currentClass}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed text-center">
                  Vui lòng kiểm tra kỹ số tiền và thông tin cá nhân của bạn trước khi sang bước tiếp theo.
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Đồng ý, Tiếp tục (1/3)
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 2: TỰ ĐỘNG DUYỆT & GHI SỔ CÔNG NỢ */}
            {confirmStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <span className="font-bold block">Tự động duyệt & Cộng ví tức thì:</span>
                    <p className="leading-relaxed">
                      Hệ thống sẽ <strong>tự động duyệt và cộng ngay</strong> +{depositAmount.toLocaleString("vi-VN")}đ vào ví DkTEST của bạn để bạn có thể mở khóa đề thi ngay.
                      <br />
                      Khoản tiền này sẽ được ghi vào <strong>sổ công nợ</strong>. Bạn có trách nhiệm thanh toán tiền mặt/chuyển khoản cho thầy cô giáo ngoài đời thực để đối soát và xóa nợ.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(1)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStep(3)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Tôi đã hiểu (2/3)
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 3: NÚT CUỐI XÁC NHẬN NHẬN TIỀN NGAY */}
            {confirmStep === 3 && (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl space-y-2">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">
                    Xác nhận nhận ngay số dư vào ví:
                  </span>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-200">
                    +{depositAmount.toLocaleString("vi-VN")}đ
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Thí sinh: {wallet?.fullName} ({wallet?.currentClass})
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(2)}
                    disabled={submittingDeposit}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmitDeposit}
                    disabled={submittingDeposit}
                    className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {submittingDeposit ? "Đang xử lý..." : `Xác nhận & Nhận ${depositAmount.toLocaleString("vi-VN")}đ ngay`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
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
  Gift,
  Tag,
  CreditCard,
  Receipt,
  PartyPopper,
  X,
} from "lucide-react";
import {
  getMyWallet,
  subscribeMyWallet,
  updateMyWalletProfile,
  createDepositRequest,
  getMyDepositRequests,
  getMyTransactions,
  getMyDebtSummary,
  redeemGiftVoucherApi,
} from "../../services/walletClientService";
import type { StudentWallet as WalletType, DepositRequest, WalletTransaction, DebtRecord } from "../../types";
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
  const [debtSummary, setDebtSummary] = useState<{ totalDebtVnd: number; unpaidCount: number; records: DebtRecord[] }>({
    totalDebtVnd: 0,
    unpaidCount: 0,
    records: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deposit" | "debt" | "requests" | "history">("deposit");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileClass, setProfileClass] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Deposit input state (Default 2k VND as requested)
  const [depositAmount, setDepositAmount] = useState<number>(2000);
  const [customInputStr, setCustomInputStr] = useState<string>("2.000");
  const [depositVoucherCode, setDepositVoucherCode] = useState<string>("");

  // Gift money voucher redemption state
  const [giftVoucherCode, setGiftVoucherCode] = useState("");
  const [redeemingGift, setRedeemingGift] = useState(false);
  const [celebrationReward, setCelebrationReward] = useState<{
    code: string;
    addedVnd: number;
    newBalanceVnd: number;
    name?: string;
    description?: string;
    message?: string;
  } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const autoRedeemAttemptedRef = useRef(false);

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
      const [w, reqs, txs, debt] = await Promise.all([
        getMyWallet(),
        getMyDepositRequests().catch(() => []),
        getMyTransactions().catch(() => []),
        getMyDebtSummary().catch(() => ({ totalDebtVnd: 0, unpaidCount: 0, records: [] })),
      ]);
      setWallet(w);
      setRequests(reqs);
      setTransactions(txs);
      setDebtSummary(debt);

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
      await createDepositRequest(depositAmount, idempotencyKey, depositVoucherCode.trim() || undefined);
      setShowConfirmModal(false);
      showSuccessToast(
        `Nạp tiền thành công! Đã cộng số dư vào ví của bạn. Vui lòng nộp tiền mặt cho giáo viên để hoàn tất công nợ.`
      );
      setDepositVoucherCode("");
      // Cập nhật lại số dư và lịch sử ngay lập tức
      await loadWalletData();
      setActiveTab("requests");
    } catch (err: any) {
      showErrorToast(err.message || "Gửi yêu cầu nạp thất bại.");
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const playFanfareSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      // Cheerful 5-note fanfare arpeggio (C5 -> E5 -> G5 -> B5 -> C6)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const startTime = ctx.currentTime + idx * 0.1;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + (idx === notes.length - 1 ? 0.8 : 0.4));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + (idx === notes.length - 1 ? 0.9 : 0.5));
      });
    } catch (_) {}
  };

  const fireGrandCelebration = () => {
    playFanfareSound();

    // Central fireworks burst
    const count = 220;
    const defaults = { origin: { y: 0.65 } };
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Side cannons after 280ms
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.65 },
        colors: ["#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#FBBF24"],
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.65 },
        colors: ["#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#FBBF24"],
      });
    }, 280);

    // Extra glitter burst after 550ms
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.5 },
        shapes: ["circle", "star"],
        colors: ["#FFD700", "#FFA500", "#FFFFFF"],
      });
    }, 550);
  };

  const executeRedeemVoucher = async (codeToRedeem: string) => {
    const code = codeToRedeem.trim().toUpperCase();
    if (!code) {
      showErrorToast("Vui lòng nhập mã voucher quà tặng.");
      return;
    }
    setRedeemingGift(true);
    try {
      const res = await redeemGiftVoucherApi(code);
      fireGrandCelebration();
      setCelebrationReward({
        code,
        addedVnd: res.addedVnd,
        newBalanceVnd: res.newBalanceVnd,
        name: res.voucher?.name,
        description: res.voucher?.description,
        message: res.message,
      });
      showSuccessToast(res.message || `Đã nhận quà thành công! +${res.addedVnd.toLocaleString("vi-VN")}đ vào ví.`);
      setGiftVoucherCode("");
      await loadWalletData();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể sử dụng mã quà tặng này.");
    } finally {
      setRedeemingGift(false);
    }
  };

  const handleRedeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeRedeemVoucher(giftVoucherCode);
  };

  // Auto-redeem from URL query (?voucher=CODE or ?code=CODE or ?redeem=CODE)
  useEffect(() => {
    const paramCode = (searchParams.get("voucher") || searchParams.get("code") || searchParams.get("redeem") || "").trim().toUpperCase();
    if (!paramCode) return;

    setGiftVoucherCode(paramCode);

    // When student is authenticated and wallet loaded, auto-redeem once
    if (user?.uid && !autoRedeemAttemptedRef.current && !loading) {
      autoRedeemAttemptedRef.current = true;
      executeRedeemVoucher(paramCode);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("voucher");
      newParams.delete("code");
      newParams.delete("redeem");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, user?.uid, loading]);

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

      {/* Banner when unauthenticated visitor opens a voucher link */}
      {!user && !loading && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Gift className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <p className="font-black text-sm">Bạn đã nhận được mã quà tặng DkTEST!</p>
              <p className="text-xs text-amber-100">
                Đăng nhập tài khoản học sinh để nhận quà ngay vào số dư ví ảo.
              </p>
            </div>
          </div>
          <Link
            to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
            className="px-4 py-2 bg-white text-slate-900 font-black text-xs rounded-xl hover:bg-amber-50 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            Đăng nhập để nhận quà ngay
          </Link>
        </div>
      )}

      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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

        {/* Unpaid Debt (Công nợ cần trả) */}
        <div
          onClick={() => setActiveTab("debt")}
          className={`p-5 rounded-2xl border shadow-2xs space-y-3 cursor-pointer transition-all hover:scale-[1.01] ${
            debtSummary.totalDebtVnd > 0
              ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${debtSummary.totalDebtVnd > 0 ? "text-amber-800 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
              Chưa trả tiền (Công nợ)
            </span>
            <span className={`p-1.5 rounded-lg ${debtSummary.totalDebtVnd > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className={`text-2xl font-black ${debtSummary.totalDebtVnd > 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-white"}`}>
              {debtSummary.totalDebtVnd.toLocaleString("vi-VN")}
              <span className="text-sm font-bold ml-1 opacity-70">đ</span>
            </div>
            <p className={`text-[11px] mt-1 ${debtSummary.totalDebtVnd > 0 ? "text-amber-700/90 dark:text-amber-400/90 font-medium" : "text-slate-400"}`}>
              {debtSummary.unpaidCount > 0 ? `${debtSummary.unpaidCount} khoản cần nộp tiền mặt ngoài đời` : "Không có khoản nợ nào"}
            </p>
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
            <p className="text-[11px] text-slate-400 mt-1">Đã được cộng vào ví ảo</p>
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
      <div className="flex items-center border-b border-slate-200 dark:border-slate-700 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("deposit")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "deposit"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Plus className="w-4 h-4" />
          Tạo yêu cầu nạp tiền
        </button>

        <button
          onClick={() => setActiveTab("debt")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "debt"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Khoản chưa trả ({debtSummary.unpaidCount})
          {debtSummary.totalDebtVnd > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
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
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
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
        <div className="space-y-6">
          {/* GIFT CODE BOX (NHẬN TIỀN TRỰC TIẾP) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <Gift className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Nhập mã Voucher quà tặng (Cộng tiền ngay vào ví)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nhận mã quà tặng từ giáo viên hoặc sự kiện trường? Nhập mã vào đây để nhận tiền lập tức.
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeemGift} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
              <input
                type="text"
                value={giftVoucherCode}
                onChange={(e) => setGiftVoucherCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: TANG2K, CHAOBANMOI"
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={redeemingGift || !giftVoucherCode.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Gift className="w-3.5 h-3.5" />
                {redeemingGift ? "Đang nhận..." : "Nhận quà"}
              </button>
            </form>
          </div>

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
                    placeholder="Ví dụ: 2.000"
                    className="w-full pl-4 pr-14 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
              </div>

              {/* Quick Suggestions: ONLY 1k, 2k, 5k, 10k */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-2 uppercase">
                  Gợi ý nhanh số tiền:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[1000, 2000, 5000, 10000].map((quick) => (
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

              {/* Deposit Promo Voucher Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã khuyến mãi nạp tiền (nếu có):
                </label>
                <div className="relative max-w-sm">
                  <input
                    type="text"
                    value={depositVoucherCode}
                    onChange={(e) => setDepositVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: NAPTHUONG20"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
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
        </div>
      )}

      {/* TAB 2: DANH SÁCH KHOẢN CHƯA TRẢ (CÔNG NỢ) */}
      {activeTab === "debt" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Khoản chưa thanh toán (Công nợ ngoài đời)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các khoản nạp ví ảo đã được tự động duyệt trước. Bạn cần hoàn trả tiền mặt cho giáo viên.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Tổng nợ cần nộp</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                {debtSummary.totalDebtVnd.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {debtSummary.records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Tuyệt vời! Bạn không có khoản công nợ nào chưa trả.
              </p>
              <p className="text-slate-400">Tất cả các khoản nạp ví của bạn đều đã được thanh toán đầy đủ.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {debtSummary.records.map((debt) => (
                <div key={debt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {debt.note || `Khoản nạp ví #${debt.id.slice(-6)}`}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {debt.status === "partial" ? "Đã trả một phần" : "Chưa trả"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Ngày tạo: {debt.createdAt ? formatDate(debt.createdAt) : "N/A"}</span>
                      {debt.collectedVnd ? (
                        <span>Đã thu: {debt.collectedVnd.toLocaleString("vi-VN")}đ</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-black text-amber-700 dark:text-amber-400">
                      {(debt.remainingVnd ?? debt.amountVnd).toLocaleString("vi-VN")}đ
                    </div>
                    <span className="text-[10px] text-slate-400">cần nộp tiền mặt</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DANH SÁCH YÊU CẦU NẠP */}
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
                  {depositVoucherCode.trim() && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Mã ưu đãi nạp:</span>
                      <span>{depositVoucherCode.trim()}</span>
                    </div>
                  )}
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

      {/* GRAND CELEBRATION REWARD MODAL */}
      {celebrationReward && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-amber-500/30 text-center overflow-hidden">
            {/* Background radiant glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setCelebrationReward(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Trophy / Gift Animation */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/20 animate-bounce">
                <Gift className="w-10 h-10 text-slate-950" />
              </div>
            </div>

            {/* Celebration Title */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-black text-amber-300 uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chúc mừng nhận thưởng</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              NHẬN QUÀ THÀNH CÔNG! 🎉
            </h3>

            {/* Big Reward Amount */}
            <div className="my-5 py-4 px-6 bg-slate-800/80 rounded-2xl border border-amber-400/20 shadow-inner">
              <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                Số tiền được cộng
              </span>
              <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 tracking-tight">
                +{celebrationReward.addedVnd.toLocaleString("vi-VN")}đ
              </span>
              <div className="mt-2 text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã nạp trực tiếp vào Ví DkTEST!</span>
              </div>
            </div>

            {/* Voucher info snippet */}
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 text-xs text-left space-y-1.5 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mã voucher:</span>
                <span className="font-mono font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {celebrationReward.code}
                </span>
              </div>
              {celebrationReward.name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tên quà tặng:</span>
                  <span className="font-bold text-white text-right">{celebrationReward.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                <span className="text-slate-400">Số dư ví hiện tại:</span>
                <span className="font-black text-emerald-300">
                  {celebrationReward.newBalanceVnd.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={fireGrandCelebration}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <PartyPopper className="w-4 h-4" />
                <span>Bắn pháo hoa ăn mừng lại 🎆</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to="/student"
                  onClick={() => setCelebrationReward(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mở đề thi ngay</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setCelebrationReward(null)}
                  className="flex-1 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
                >
                  Đóng & xem ví
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

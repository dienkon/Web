import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
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
  Share2,
  Ticket,
  Users,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Trash2,
  ArrowRightLeft,
  ShieldAlert,
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
  validateVoucherApi,
  inspectVoucherApi,
  recordVoucherSaveApi,
  getResolvedStudentUid,
} from "../../services/walletClientService";
import {
  getSavedVouchers,
  isVoucherSavedLocally,
  saveVoucherLocally,
  removeSavedVoucherLocally,
  markSavedVoucherConsumed,
  formatVoucherBenefitSummary,
  getVoucherCategoryLabel,
  isDepositVoucherType,
  type SavedVoucherItem,
} from "../../services/savedVoucherService";
import {
  getMyReferralProfileApi,
  claimReferralCodeApi,
  withdrawReferralBalanceApi,
  buildReferralShareUrl,
  type ReferralDashboardResponse,
} from "../../services/referralClientService";
import { SavedVoucherPicker } from "../../components/wallet/SavedVoucherPicker";
import type { StudentWallet as WalletType, DepositRequest, WalletTransaction, DebtRecord, Voucher } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/ToastNotification";
import { formatDate } from "../../utils/date";
import { safeShare } from "../../utils/mobileCompat";

export default function StudentWalletPage() {
  const navigate = useNavigate();
  const { code: routeVoucherCode } = useParams<{ code?: string }>();
  const { user, authInitialized, loading: authLoading } = useAuth();
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
  const [activeTab, setActiveTab] = useState<"deposit" | "vouchers" | "referral" | "debt" | "requests" | "history">("deposit");

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileClass, setProfileClass] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Deposit input state (Default 2k VND as requested)
  const [depositAmount, setDepositAmount] = useState<number>(2000);
  const [customInputStr, setCustomInputStr] = useState<string>("2.000");
  const [depositVoucherCode, setDepositVoucherCode] = useState<string>("");
  const [validatingDepositVoucher, setValidatingDepositVoucher] = useState(false);
  const [depositVoucherResult, setDepositVoucherResult] = useState<{
    valid: boolean;
    code?: string;
    name?: string;
    bonusVnd?: number;
    message?: string;
  } | null>(null);

  // Saved local vouchers vault (Shopee-style)
  const currentStudentUid = user?.uid || getResolvedStudentUid() || null;
  const [savedVouchers, setSavedVouchers] = useState<SavedVoucherItem[]>([]);
  const [saveVoucherModal, setSaveVoucherModal] = useState<{
    voucher: Voucher;
    alreadySaved: boolean;
    isExpired?: boolean;
    isOutOfStock?: boolean;
    isInactive?: boolean;
    saving?: boolean;
  } | null>(null);

  // Referral Program state
  const [referralData, setReferralData] = useState<ReferralDashboardResponse | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [claimRefCodeInput, setClaimRefCodeInput] = useState("");
  const [claimingRef, setClaimingRef] = useState(false);
  const [withdrawingRef, setWithdrawingRef] = useState(false);
  const [copiedRefField, setCopiedRefField] = useState<"code" | "link" | null>(null);

  // Gift money voucher redemption state
  const [giftVoucherCode, setGiftVoucherCode] = useState("");
  const [redeemingGift, setRedeemingGift] = useState(false);
  const [celebrationReward, setCelebrationReward] = useState<{
    code: string;
    addedVnd: number;
    newBalanceVnd: number;
    name?: string;
    description?: string;
    type?: string;
    value?: number;
    message?: string;
  } | null>(null);

  const [alreadyRedeemedNotice, setAlreadyRedeemedNotice] = useState<{
    code: string;
    message: string;
    balanceVnd: number;
  } | null>(null);

  const [autoRedeemProcessing, setAutoRedeemProcessing] = useState<string | null>(null);
  const [unauthenticatedVoucherPrompt, setUnauthenticatedVoucherPrompt] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const autoRedeemTriggeredRef = useRef<string | null>(null);

  // 3-Step Confirmation Modal State (Phần B - Section 7)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2 | 3>(1);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const refreshSavedVouchers = () => {
    setSavedVouchers(getSavedVouchers(currentStudentUid));
  };

  useEffect(() => {
    refreshSavedVouchers();
    const handler = () => refreshSavedVouchers();
    window.addEventListener("dktest:saved_vouchers_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dktest:saved_vouchers_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, [currentStudentUid]);

  // Support deep link ?tab=referral or ?tab=vouchers
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "deposit" ||
      tabParam === "vouchers" ||
      tabParam === "referral" ||
      tabParam === "debt" ||
      tabParam === "requests" ||
      tabParam === "history"
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadReferralData = async () => {
    if (!currentStudentUid) return;
    setLoadingReferral(true);
    try {
      const res = await getMyReferralProfileApi();
      if (res?.profile) {
        setReferralData(res);
      }
    } catch (err) {
      console.warn("[StudentWallet] Could not load referral profile:", err);
    } finally {
      setLoadingReferral(false);
    }
  };

  useEffect(() => {
    loadWalletData();
    loadReferralData();

    if (user?.uid) {
      const unsub = subscribeMyWallet(user.uid, (liveWallet) => {
        setWallet(liveWallet);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const validateDepositVoucher = async (rawCode: string, amountOverride?: number) => {
    const clean = rawCode.trim().toUpperCase();
    const amt = amountOverride ?? depositAmount;
    if (!clean) {
      setDepositVoucherResult(null);
      return null;
    }
    setValidatingDepositVoucher(true);
    try {
      const res = await validateVoucherApi(clean, "deposit", amt);
      setDepositVoucherResult({
        valid: Boolean(res.valid),
        code: res.code || clean,
        name: res.name || res.voucher?.name,
        bonusVnd: res.bonusVnd || 0,
        message: res.message,
      });
      return res;
    } catch (err: any) {
      const fallback = { valid: false, message: err?.message || "Không thể kiểm tra mã khuyến mãi nạp tiền." };
      setDepositVoucherResult(fallback);
      return fallback;
    } finally {
      setValidatingDepositVoucher(false);
    }
  };

  // Debounced auto-validation when user types or changes deposit amount
  useEffect(() => {
    const clean = depositVoucherCode.trim().toUpperCase();
    if (!clean) {
      setDepositVoucherResult(null);
      return;
    }
    const timer = setTimeout(() => {
      void validateDepositVoucher(clean, depositAmount);
    }, 450);
    return () => clearTimeout(timer);
  }, [depositVoucherCode, depositAmount]);

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

  const handleStartDeposit = async () => {
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

    // Immediate validation for deposit voucher (blocks mismatched exam/course/gift vouchers!)
    const trimmedCode = depositVoucherCode.trim().toUpperCase();
    if (trimmedCode) {
      const check = await validateDepositVoucher(trimmedCode, amt);
      if (!check?.valid) {
        showErrorToast(
          check?.message || "Mã voucher bạn nhập không áp dụng được cho giao dịch nạp tiền."
        );
        return;
      }
    }

    setDepositAmount(amt);
    setConfirmStep(1);
    setShowConfirmModal(true);
  };

  const handleFinalSubmitDeposit = async () => {
    setSubmittingDeposit(true);
    try {
      const usedCode = depositVoucherCode.trim().toUpperCase();
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await createDepositRequest(depositAmount, idempotencyKey, usedCode || undefined);
      setShowConfirmModal(false);
      if (usedCode) {
        markSavedVoucherConsumed(usedCode, currentStudentUid);
        refreshSavedVouchers();
      }
      showSuccessToast(
        `Nạp tiền thành công! Đã cộng số dư vào ví của bạn. Vui lòng nộp tiền mặt cho giáo viên để hoàn tất công nợ.`
      );
      setDepositVoucherCode("");
      setDepositVoucherResult(null);
      // Cập nhật lại số dư và lịch sử ngay lập tức
      await loadWalletData();
      setActiveTab("requests");
    } catch (err: any) {
      showErrorToast(err.message || "Gửi yêu cầu nạp thất bại.");
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleConfirmSaveVoucher = async () => {
    if (!saveVoucherModal || saveVoucherModal.saving) return;
    const { voucher } = saveVoucherModal;
    setSaveVoucherModal((prev) => (prev ? { ...prev, saving: true } : null));
    try {
      const saveRes = saveVoucherLocally(voucher, currentStudentUid);
      if (!saveRes.alreadySaved && currentStudentUid) {
        await recordVoucherSaveApi(voucher.code);
      }
      refreshSavedVouchers();
      setSaveVoucherModal((prev) =>
        prev
          ? {
              ...prev,
              alreadySaved: true,
              saving: false,
              voucher: {
                ...prev.voucher,
                savedCount: saveRes.alreadySaved
                  ? prev.voucher.savedCount
                  : (prev.voucher.savedCount || 0) + 1,
              },
            }
          : null
      );
      showSuccessToast(
        saveRes.alreadySaved
          ? `Voucher ${voucher.code} đã có sẵn trong Kho Voucher của bạn!`
          : `Đã lưu voucher ${voucher.code} vào Kho Voucher! Hệ thống sẽ tự động đề xuất khi bạn thanh toán.`
      );
    } catch (err: any) {
      setSaveVoucherModal((prev) => (prev ? { ...prev, saving: false } : null));
      showErrorToast(err?.message || "Không thể lưu voucher lúc này.");
    }
  };

  const handleClaimReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = claimRefCodeInput.trim().toUpperCase();
    if (!code) {
      showErrorToast("Vui lòng nhập mã giới thiệu từ bạn bè.");
      return;
    }
    setClaimingRef(true);
    try {
      const res = await claimReferralCodeApi(code);
      showSuccessToast(res.message || "Xác nhận mã giới thiệu thành công!");
      setClaimRefCodeInput("");
      await loadReferralData();
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể áp dụng mã giới thiệu.");
    } finally {
      setClaimingRef(false);
    }
  };

  const handleWithdrawReferral = async () => {
    const available = referralData?.profile?.referralBalanceVnd || 0;
    const minWithdraw = referralData?.rules?.minWithdrawVnd || 1000;
    if (available < minWithdraw) {
      showErrorToast(`Cần tối thiểu ${minWithdraw.toLocaleString("vi-VN")}đ trong Quỹ giới thiệu để rút về Ví DkTEST.`);
      return;
    }
    setWithdrawingRef(true);
    try {
      const res = await withdrawReferralBalanceApi(available);
      fireGrandCelebration();
      showSuccessToast(
        res.message || `Đã rút +${res.withdrawnVnd.toLocaleString("vi-VN")}đ vào Ví DkTEST thành công!`
      );
      await Promise.all([loadWalletData(), loadReferralData()]);
    } catch (err: any) {
      showErrorToast(err?.message || "Không thể rút tiền thưởng giới thiệu.");
    } finally {
      setWithdrawingRef(false);
    }
  };

  const handleCopyReferral = async (type: "code" | "link") => {
    const code = referralData?.profile?.code;
    if (!code) return;
    const text = type === "code" ? code : buildReferralShareUrl(code);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRefField(type);
      showSuccessToast(
        type === "code" ? `Đã sao chép mã giới thiệu ${code}!` : "Đã sao chép link mời bạn bè!"
      );
      setTimeout(() => setCopiedRefField(null), 2000);
    } catch {
      prompt(type === "code" ? "Sao chép mã giới thiệu:" : "Sao chép link mời bạn:", text);
    }
  };

  const handleShareReferral = async () => {
    const code = referralData?.profile?.code;
    if (!code) return;
    const url = buildReferralShareUrl(code);
    const shared = await safeShare({
      title: `Mời bạn dùng DkTEST - Mã ${code}`,
      text: `Đăng ký DkTEST qua link mời của mình để cùng luyện đề và ôn tập cực đỉnh! Mã giới thiệu: ${code}`,
      url,
    });
    if (!shared) {
      await handleCopyReferral("link");
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

  const executeRedeemVoucher = async (codeToRedeem: string, isAuto = false) => {
    const code = codeToRedeem.trim().toUpperCase();
    if (!code) {
      showErrorToast("Vui lòng nhập mã voucher.");
      return;
    }
    setRedeemingGift(true);
    if (isAuto) setAutoRedeemProcessing(code);

    try {
      // Step 1: Inspect voucher type first (Shopee-style separation)
      const inspected = await inspectVoucherApi(code);
      if (!inspected.found || !inspected.voucher) {
        showErrorToast(inspected.message || `Mã voucher "${code}" không tồn tại hoặc đã bị xóa.`);
        return;
      }

      const voucher = inspected.voucher;

      // Non-gift vouchers (giảm giá đề thi/khóa học, thưởng nạp tiền) -> open Save Voucher Modal instead of redeeming gift money
      if (voucher.type !== "gift_money") {
        const alreadySaved = isVoucherSavedLocally(voucher.code, currentStudentUid);
        setSaveVoucherModal({
          voucher,
          alreadySaved,
          isExpired: inspected.isExpired,
          isOutOfStock: inspected.isOutOfStock,
          isInactive: inspected.isInactive,
          saving: false,
        });
        setGiftVoucherCode("");
        if (alreadySaved) {
          showInfoToast(`Bạn đã lưu voucher ${voucher.code} vào Kho Voucher trước đó rồi!`);
        }
        return;
      }

      // Gift money voucher -> requires login
      const activeUid = user?.uid || getResolvedStudentUid();
      if (!activeUid) {
        sessionStorage.setItem("dktest_pending_voucher", code);
        setUnauthenticatedVoucherPrompt(code);
        return;
      }

      // Direct gift money redemption
      const res = await redeemGiftVoucherApi(code);
      fireGrandCelebration();
      setCelebrationReward({
        code,
        addedVnd: res.addedVnd || 0,
        newBalanceVnd: res.newBalanceVnd,
        name: res.voucher?.name,
        description: res.voucher?.description,
        type: res.voucher?.type,
        value: res.voucher?.value,
        message: res.message,
      });
      showSuccessToast(
        res.message || `Đã nhận quà thành công! +${(res.addedVnd || 0).toLocaleString("vi-VN")}đ vào ví.`
      );
      setGiftVoucherCode("");
      await loadWalletData();
    } catch (err: any) {
      console.warn("[StudentWallet] Redeem voucher error:", err);
      const errMsg = String(err?.message || "");
      if (
        errMsg.toLowerCase().includes("bạn đã sử dụng") ||
        errMsg.toLowerCase().includes("đã dùng") ||
        errMsg.toLowerCase().includes("already used")
      ) {
        setAlreadyRedeemedNotice({
          code,
          message: "Mã quà tặng này đã được bạn nhận vào ví trước đó (mỗi tài khoản chỉ được nhận 1 lần).",
          balanceVnd: wallet?.balanceVnd || 0,
        });
      } else if (errMsg.toLowerCase().includes("hết lượt")) {
        setAlreadyRedeemedNotice({
          code,
          message: "Rất tiếc! Mã quà tặng này đã đạt tối đa số lượt nhận và hiện tại đã hết.",
          balanceVnd: wallet?.balanceVnd || 0,
        });
      } else {
        showErrorToast(err.message || "Không thể xử lý mã voucher này.");
      }
    } finally {
      setRedeemingGift(false);
      setAutoRedeemProcessing(null);
    }
  };

  const handleRedeemGift = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeRedeemVoucher(giftVoucherCode, false);
  };

  const handleShareVoucher = async () => {
    const code = giftVoucherCode.trim().toUpperCase();
    if (!code) return;
    const url = `${window.location.origin}/voucher/${encodeURIComponent(code)}`;
    const shared = await safeShare({
      title: `Voucher Quà Tặng ${code} - DkTEST`,
      text: `Nhận ngay ưu đãi voucher ${code} trên DkTEST!`,
      url,
    });
    if (!shared) {
      try {
        await navigator.clipboard.writeText(url);
        showSuccessToast(
          `Đã sao chép link voucher "${code}"! Khi gửi qua Zalo, link sẽ tự động hiển thị thẻ xem trước có tên, giá trị ưu đãi và ảnh banner riêng.`
        );
      } catch (_) {
        prompt("Sao chép link voucher gửi qua Zalo:", url);
      }
    }
  };

  // Auto-handle voucher from URL route (/voucher/:code), query (?voucher=CODE or ?code=CODE or ?redeem=CODE) or sessionStorage
  useEffect(() => {
    const paramCode = (
      routeVoucherCode ||
      searchParams.get("voucher") ||
      searchParams.get("code") ||
      searchParams.get("redeem") ||
      sessionStorage.getItem("dktest_pending_voucher") ||
      ""
    ).trim().toUpperCase();

    if (!paramCode) return;

    setGiftVoucherCode(paramCode);

    const currentUid = user?.uid || getResolvedStudentUid();
    if (!currentUid && (!authInitialized || authLoading)) return;

    if (autoRedeemTriggeredRef.current !== paramCode) {
      autoRedeemTriggeredRef.current = paramCode;
      if (currentUid) {
        sessionStorage.removeItem("dktest_pending_voucher");
        setUnauthenticatedVoucherPrompt(null);
      }

      // Clear query parameters from URL quietly
      try {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("voucher");
        newParams.delete("code");
        newParams.delete("redeem");
        setSearchParams(newParams, { replace: true });
      } catch (_) {}

      void executeRedeemVoucher(paramCode, true);
    }
  }, [routeVoucherCode, searchParams, user?.uid, authInitialized, authLoading]);

  const unlockedExams = transactions
    .filter((tx) => tx.type === "exam_unlock_debit" && tx.examId)
    .reduce((acc, curr) => {
      if (!acc.some((x) => x.examId === curr.examId)) {
        acc.push(curr);
      }
      return acc;
    }, [] as WalletTransaction[]);

  const unlockedCoursesAndLessons = transactions.filter(
    (tx) =>
      (tx.type === "course_unlock_debit" || tx.type === "course_lesson_unlock_debit") &&
      tx.courseId
  );

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
          onClick={() => {
            void loadWalletData();
            void loadReferralData();
            refreshSavedVouchers();
          }}
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
          Nạp tiền & Quà tặng
        </button>

        <button
          onClick={() => setActiveTab("vouchers")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "vouchers"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Ticket className="w-4 h-4" />
          Kho Voucher ({savedVouchers.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("referral");
            if (!referralData) void loadReferralData();
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "referral"
              ? "border-violet-600 text-violet-600 dark:text-violet-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Mời bạn nhận thưởng
          {(referralData?.profile?.referralBalanceVnd || 0) >= 1000 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-600 text-white font-black">
              Rút ngay
            </span>
          )}
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
          Đã mở khóa ({unlockedExams.length + unlockedCoursesAndLessons.length})
        </button>
      </div>

      {/* TAB 1: FORM TẠO YÊU CẦU NẠP */}
      {activeTab === "deposit" && (
        <div className="space-y-6">
          {/* GIFT / SAVE VOUCHER BOX */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <Gift className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Nhập mã Voucher (Nhận tiền thẳng hoặc Lưu mã giảm giá)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mã quà tặng sẽ cộng tiền ngay vào ví. Mã giảm giá / thưởng nạp sẽ hiện nút <strong>Lưu voucher</strong> vào Kho để tự động đề xuất khi thanh toán.
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeemGift} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg">
              <input
                type="text"
                value={giftVoucherCode}
                onChange={(e) => setGiftVoucherCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: TANG2K, GIAM50, NAPTHUONG20"
                className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={redeemingGift || !giftVoucherCode.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Gift className="w-3.5 h-3.5" />
                {redeemingGift ? "Đang kiểm tra..." : "Nhận / Lưu mã"}
              </button>
              {giftVoucherCode.trim() && (
                <button
                  type="button"
                  onClick={handleShareVoucher}
                  className="px-3.5 py-2.5 bg-white hover:bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  title="Chia sẻ link voucher qua Zalo"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Chia sẻ Zalo</span>
                </button>
              )}
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

              {/* Deposit Promo Voucher Input + Shopee-style Picker + Instant Mismatch Warning */}
              <div className="space-y-2.5 max-w-lg">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mã khuyến mãi nạp tiền (nếu có):
                </label>

                <SavedVoucherPicker
                  uid={currentStudentUid}
                  context="deposit"
                  amountVnd={depositAmount}
                  appliedCode={depositVoucherResult?.valid ? depositVoucherResult.code : undefined}
                  onSelectVoucher={(selectedCode) => {
                    setDepositVoucherCode(selectedCode);
                    void validateDepositVoucher(selectedCode, depositAmount);
                  }}
                />

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={depositVoucherCode}
                      onChange={(e) => {
                        setDepositVoucherCode(e.target.value.toUpperCase());
                        if (!e.target.value.trim()) setDepositVoucherResult(null);
                      }}
                      placeholder="Ví dụ: NAPTHUONG20"
                      className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 uppercase tracking-wider ${
                        depositVoucherResult
                          ? depositVoucherResult.valid
                            ? "border-emerald-400 focus:ring-emerald-500"
                            : "border-rose-400 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-emerald-500"
                      }`}
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="button"
                    disabled={validatingDepositVoucher || !depositVoucherCode.trim()}
                    onClick={() => void validateDepositVoucher(depositVoucherCode, depositAmount)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {validatingDepositVoucher ? "Đang kiểm tra..." : "Áp dụng"}
                  </button>
                </div>

                {depositVoucherResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                      depositVoucherResult.valid
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {depositVoucherResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      {depositVoucherResult.message}
                    </div>
                  </div>
                )}
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
                disabled={validatingDepositVoucher}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                Tiến hành xác nhận nạp tiền
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: KHO VOUCHER ĐÃ LƯU (SHOPEE-STYLE) */}
      {activeTab === "vouchers" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" />
                Kho Voucher đã lưu trên thiết bị
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hệ thống tự động đề xuất đúng loại voucher hợp lệ khi bạn nạp tiền ví, mở khóa đề thi hoặc mua khóa học.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full self-start sm:self-auto">
              {savedVouchers.length} voucher đang lưu
            </span>
          </div>

          {savedVouchers.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mx-auto flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Kho Voucher của bạn đang trống
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi mở link voucher giảm giá hoặc thưởng nạp từ giáo viên/sự kiện, bấm <strong>Lưu voucher</strong> để lưu vào đây nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {savedVouchers.map((v) => {
                const isDep = isDepositVoucherType(v.type);
                const isExpired = Boolean(v.expiresAt && new Date(v.expiresAt).getTime() < Date.now());
                return (
                  <div
                    key={v.code}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                      isExpired
                        ? "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40 opacity-70"
                        : isDep
                          ? "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 dark:border-emerald-800/70"
                          : "border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-800/70"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isDep
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-600 text-white"
                          }`}
                        >
                          {getVoucherCategoryLabel(v.type)}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          {v.code}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {v.name}
                        </h3>
                        <p className={`text-xs font-bold mt-0.5 ${isDep ? "text-emerald-700 dark:text-emerald-400" : "text-indigo-700 dark:text-indigo-400"}`}>
                          {formatVoucherBenefitSummary(v)}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                        {isDep && v.minDepositVnd ? (
                          <span>Nạp tối thiểu: {v.minDepositVnd.toLocaleString("vi-VN")}đ</span>
                        ) : null}
                        {!isDep && v.minOrderVnd ? (
                          <span>Đơn tối thiểu: {v.minOrderVnd.toLocaleString("vi-VN")}đ</span>
                        ) : null}
                        {v.expiresAt ? (
                          <span className={isExpired ? "text-rose-600 font-bold" : ""}>
                            {isExpired ? "Đã hết hạn" : `HSD: ${formatDate(v.expiresAt)}`}
                          </span>
                        ) : (
                          <span>Không giới hạn hạn dùng</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          removeSavedVoucherLocally(v.code, currentStudentUid);
                          refreshSavedVouchers();
                          showInfoToast(`Đã xóa voucher ${v.code} khỏi Kho.`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa
                      </button>

                      {!isExpired && isDep ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDepositVoucherCode(v.code);
                            setActiveTab("deposit");
                            void validateDepositVoucher(v.code, depositAmount);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Dùng nạp tiền ngay
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : !isExpired ? (
                        <div className="flex items-center gap-1.5">
                          <Link
                            to="/"
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-colors"
                          >
                            Mở đề thi
                          </Link>
                          <Link
                            to="/courses"
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-extrabold transition-colors"
                          >
                            Khóa học
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: MỜI BẠN DÙNG DKTEST (REFERRAL PROGRAM + ANTI-FRAUD) */}
      {activeTab === "referral" && (
        <div className="space-y-5">
          {/* Reward Balance & Withdraw Card */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Thưởng ngẫu nhiên 100đ – 1.000đ / bạn mới
                </div>
                <h2 className="text-lg sm:text-xl font-black">
                  Quỹ thưởng giới thiệu bạn bè (Ref)
                </h2>
                <p className="text-xs text-indigo-100 max-w-xl">
                  Mời bạn bè đăng ký DkTEST bằng link hoặc mã của bạn. Khi bạn mới hợp lệ xác nhận, bạn nhận thưởng ngẫu nhiên <strong>100đ – 1.000đ</strong>. Đủ từ <strong>1.000đ</strong> có thể rút ngay vào Ví DkTEST!
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-4 min-w-[210px] border border-white/20 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-indigo-100 font-bold block">
                  Số dư có thể rút
                </span>
                <div className="text-2xl sm:text-3xl font-black">
                  {(referralData?.profile?.referralBalanceVnd || 0).toLocaleString("vi-VN")}
                  <span className="text-sm font-bold ml-1 text-indigo-200">đ</span>
                </div>
                <button
                  type="button"
                  disabled={
                    withdrawingRef ||
                    loadingReferral ||
                    (referralData?.profile?.referralBalanceVnd || 0) < (referralData?.rules?.minWithdrawVnd || 1000)
                  }
                  onClick={handleWithdrawReferral}
                  className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-white/20 disabled:text-white/60 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {withdrawingRef
                    ? "Đang chuyển vào ví..."
                    : (referralData?.profile?.referralBalanceVnd || 0) >= 1000
                      ? "Rút về Ví DkTEST ngay"
                      : "Cần đủ 1.000đ để rút"}
                </button>
              </div>
            </div>

            {/* Progress bar towards 1.000đ min withdraw */}
            {(() => {
              const bal = referralData?.profile?.referralBalanceVnd || 0;
              const minW = referralData?.rules?.minWithdrawVnd || 1000;
              const pct = Math.min(100, Math.round((bal / minW) * 100));
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-100">
                    <span>Tiến độ đạt mốc rút tối thiểu ({minW.toLocaleString("vi-VN")}đ)</span>
                    <span>{bal >= minW ? "Đã đủ điều kiện rút!" : `${pct}% (còn thiếu ${(minW - bal).toLocaleString("vi-VN")}đ)`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/15 text-center">
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-lg font-black">{referralData?.profile?.successfulReferralsCount || 0}</div>
                <div className="text-[11px] text-indigo-100">Bạn mời thành công</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-lg font-black">
                  {(referralData?.profile?.totalEarnedVnd || 0).toLocaleString("vi-VN")}đ
                </div>
                <div className="text-[11px] text-indigo-100">Tổng đã nhận</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5">
                <div className="text-lg font-black">
                  {(referralData?.profile?.totalWithdrawnVnd || 0).toLocaleString("vi-VN")}đ
                </div>
                <div className="text-[11px] text-indigo-100">Đã rút về Ví</div>
              </div>
            </div>
          </div>

          {/* Share Code & Link Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-600" />
              Mã & Link giới thiệu của bạn
            </h3>

            {loadingReferral && !referralData ? (
              <div className="py-6 text-center text-xs text-slate-400">Đang tải mã giới thiệu của bạn...</div>
            ) : referralData?.profile?.code ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Mã giới thiệu</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-black tracking-widest text-violet-700 dark:text-violet-400">
                      {referralData.profile.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyReferral("code")}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedRefField === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedRefField === "code" ? "Đã chép" : "Sao chép"}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Link mời trực tiếp</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={buildReferralShareUrl(referralData.profile.code)}
                      className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopyReferral("link")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedRefField === "link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShareReferral()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Vui lòng đăng nhập để nhận mã giới thiệu cá nhân.</div>
            )}

            {/* Anti-fraud notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Cơ chế chống gian lận tự động:</strong> Mỗi tài khoản mới (tạo trong vòng 7 ngày) chỉ được nhập mã 1 lần. Hệ thống tự động kiểm tra <strong>địa chỉ IP, thiết bị, tài khoản trùng lặp và giới thiệu chéo</strong> — các tài khoản clone cùng máy / cùng mạng với người mời sẽ bị từ chối thưởng.
              </div>
            </div>
          </div>

          {/* Claim Friend's Code (for newly created accounts that haven't claimed yet) */}
          {referralData?.profile && !referralData.profile.referredByUid ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bạn được bạn bè giới thiệu?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhập mã giới thiệu của bạn ấy (áp dụng cho tài khoản mới trong 7 ngày đầu) để bạn ấy nhận thưởng ngẫu nhiên 100đ – 1.000đ.
                </p>
              </div>
              <form onSubmit={handleClaimReferral} className="flex flex-col sm:flex-row gap-2 max-w-md">
                <input
                  type="text"
                  value={claimRefCodeInput}
                  onChange={(e) => setClaimRefCodeInput(e.target.value.toUpperCase())}
                  placeholder="Nhập mã ví dụ: DK7A9B2C"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider"
                />
                <button
                  type="submit"
                  disabled={claimingRef || !claimRefCodeInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer shrink-0"
                >
                  {claimingRef ? "Đang xác nhận..." : "Xác nhận mã"}
                </button>
              </form>
            </div>
          ) : referralData?.profile?.referredByCode ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Tài khoản của bạn đã xác nhận mã giới thiệu <strong className="font-mono">{referralData.profile.referredByCode}</strong>.
              </span>
            </div>
          ) : null}

          {/* Recent Successful Referrals List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Lịch sử mời bạn thành công
              </h3>
              <span className="text-xs text-slate-400">
                {referralData?.recentClaims?.length || 0} lượt gần nhất
              </span>
            </div>

            {!referralData?.recentClaims || referralData.recentClaims.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có lượt mời bạn bè nào. Hãy chia sẻ link giới thiệu ở trên để bắt đầu nhận thưởng!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {referralData.recentClaims.map((claim) => (
                  <div key={claim.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {claim.refereeName || "Học sinh mới"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {claim.createdAt ? formatDate(claim.createdAt) : ""}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                      +{claim.rewardVnd.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
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

          {unlockedCoursesAndLessons.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Khóa học & Bài giảng đã mở khóa
                </h3>
                <span className="text-xs text-slate-500">{unlockedCoursesAndLessons.length} mục</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unlockedCoursesAndLessons.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full inline-block mb-1.5">
                        {tx.type === "course_unlock_debit" ? "✓ Trọn khóa học" : "✓ Bài giảng lẻ"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {tx.lessonTitleSnapshot ? `${tx.lessonTitleSnapshot} — ` : ""}
                        {tx.courseTitleSnapshot || "Khóa học"}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Giá: {tx.amountVnd.toLocaleString("vi-VN")}đ • {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                      <Link
                        to={`/student/courses/${tx.courseId}`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        Vào học ngay
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
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
                      <span>
                        {depositVoucherCode.trim()}
                        {depositVoucherResult?.valid && depositVoucherResult.bonusVnd
                          ? ` (+${depositVoucherResult.bonusVnd.toLocaleString("vi-VN")}đ thưởng)`
                          : ""}
                      </span>
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
                    +{(depositAmount + (depositVoucherResult?.valid ? depositVoucherResult.bonusVnd || 0 : 0)).toLocaleString("vi-VN")}đ
                  </div>
                  {depositVoucherResult?.valid && (depositVoucherResult.bonusVnd || 0) > 0 && (
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      (Gồm {depositAmount.toLocaleString("vi-VN")}đ nạp + {(depositVoucherResult.bonusVnd || 0).toLocaleString("vi-VN")}đ thưởng voucher {depositVoucherCode.trim()})
                    </p>
                  )}
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

      {/* AUTO-REDEEM IN PROGRESS OVERLAY */}
      {autoRedeemProcessing && (
        <div className="fixed inset-0 z-[65] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Gift className="w-8 h-8 animate-bounce" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border-2 border-emerald-400/40 animate-ping pointer-events-none" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Đang tự động nhận quà...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Hệ thống đang kích hoạt mã quà tặng <span className="text-amber-400 font-mono font-bold">#{autoRedeemProcessing}</span> vào ví DkTEST của bạn.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Vui lòng chờ trong giây lát...</span>
            </div>
          </div>
        </div>
      )}

      {/* GRAND CELEBRATION REWARD MODAL */}
      {celebrationReward && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
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
                {celebrationReward.addedVnd > 0 ? "Số tiền được cộng" : "Giá trị ưu đãi"}
              </span>
              {celebrationReward.addedVnd > 0 ? (
                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 tracking-tight">
                  +{celebrationReward.addedVnd.toLocaleString("vi-VN")}đ
                </span>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 tracking-tight">
                  {celebrationReward.type === "percent_discount"
                    ? `Giảm ${celebrationReward.value}%`
                    : celebrationReward.type === "deposit_bonus"
                    ? `Tặng +${celebrationReward.value}% khi nạp`
                    : celebrationReward.name || "Ưu đãi đặc biệt"}
                </span>
              )}
              <div className="mt-2 text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {celebrationReward.addedVnd > 0
                    ? "Đã nạp trực tiếp vào Ví DkTEST!"
                    : "Đã kích hoạt thành công cho tài khoản của bạn!"}
                </span>
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

      {/* ALREADY REDEEMED / USAGE LIMIT NOTICE MODAL */}
      {alreadyRedeemedNotice && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setAlreadyRedeemedNotice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                Mã quà tặng: {alreadyRedeemedNotice.code}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Bạn đã nhận mã này rồi! 🎉
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                {alreadyRedeemedNotice.message}
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Số dư khả dụng hiện tại:</span>
              <span className="text-base font-black text-emerald-400">
                {(wallet?.balanceVnd ?? alreadyRedeemedNotice.balanceVnd).toLocaleString("vi-VN")}đ
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link
                to="/student"
                onClick={() => setAlreadyRedeemedNotice(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Làm bài thi ngay</span>
              </Link>
              <button
                type="button"
                onClick={() => setAlreadyRedeemedNotice(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOPEE-STYLE SAVE VOUCHER MODAL (FOR DISCOUNT / DEPOSIT BONUS VOUCHERS) */}
      {saveVoucherModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700/60 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 overflow-hidden">
            <button
              type="button"
              onClick={() => setSaveVoucherModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2.5">
              <div
                className={`inline-flex p-3.5 rounded-2xl shadow-md ${
                  saveVoucherModal.alreadySaved
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                }`}
              >
                {saveVoucherModal.alreadySaved ? (
                  <BookmarkCheck className="w-8 h-8" />
                ) : (
                  <Bookmark className="w-8 h-8" />
                )}
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {getVoucherCategoryLabel(saveVoucherModal.voucher.type)}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5">
                  {saveVoucherModal.alreadySaved
                    ? "Bạn đã lưu voucher này rồi!"
                    : saveVoucherModal.voucher.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {saveVoucherModal.alreadySaved
                    ? "Voucher đã nằm sẵn trong Kho Voucher trên thiết bị của bạn và sẽ tự động đề xuất khi thanh toán."
                    : "Bấm Lưu voucher để cất vào Kho Voucher trên máy. Chỉ tính lượt lưu, chưa trừ lượt sử dụng."}
                </p>
              </div>
            </div>

            {/* Ticket Details Box */}
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mã voucher:</span>
                <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  {saveVoucherModal.voucher.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Ưu đãi:</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatVoucherBenefitSummary(saveVoucherModal.voucher)}
                </span>
              </div>
              {isDepositVoucherType(saveVoucherModal.voucher.type) && saveVoucherModal.voucher.minDepositVnd ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Nạp tối thiểu:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {saveVoucherModal.voucher.minDepositVnd.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ) : null}
              {!isDepositVoucherType(saveVoucherModal.voucher.type) && saveVoucherModal.voucher.minOrderVnd ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Đơn tối thiểu:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {saveVoucherModal.voucher.minOrderVnd.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ) : null}
              {saveVoucherModal.voucher.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Hạn sử dụng:</span>
                  <span className={`font-bold ${saveVoucherModal.isExpired ? "text-rose-600" : "text-slate-800 dark:text-slate-200"}`}>
                    {saveVoucherModal.isExpired ? "Đã hết hạn" : formatDate(saveVoucherModal.voucher.expiresAt)}
                  </span>
                </div>
              )}
              {typeof saveVoucherModal.voucher.savedCount === "number" && (
                <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Lượt đã lưu:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {saveVoucherModal.voucher.savedCount.toLocaleString("vi-VN")} lượt
                  </span>
                </div>
              )}
            </div>

            {(saveVoucherModal.isExpired || saveVoucherModal.isInactive || saveVoucherModal.isOutOfStock) && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 text-center">
                {saveVoucherModal.isInactive
                  ? "Voucher này hiện đang tạm khóa."
                  : saveVoucherModal.isExpired
                    ? "Voucher này đã hết hạn sử dụng."
                    : "Voucher này đã hết lượt sử dụng."}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {saveVoucherModal.alreadySaved ? (
                <>
                  <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                    <BookmarkCheck className="w-4 h-4" />
                    Đã lưu trong Kho Voucher
                  </div>
                  <div className="flex items-center gap-2">
                    {isDepositVoucherType(saveVoucherModal.voucher.type) ? (
                      <button
                        type="button"
                        onClick={() => {
                          const code = saveVoucherModal.voucher.code;
                          setSaveVoucherModal(null);
                          setDepositVoucherCode(code);
                          setActiveTab("deposit");
                          void validateDepositVoucher(code, depositAmount);
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Dùng nạp tiền ngay
                      </button>
                    ) : (
                      <Link
                        to="/"
                        onClick={() => setSaveVoucherModal(null)}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl text-center transition-colors"
                      >
                        Đi mở khóa đề / khóa học
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSaveVoucherModal(null);
                        setActiveTab("vouchers");
                      }}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Xem Kho Voucher
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={
                    saveVoucherModal.saving ||
                    saveVoucherModal.isExpired ||
                    saveVoucherModal.isInactive ||
                    saveVoucherModal.isOutOfStock
                  }
                  onClick={() => void handleConfirmSaveVoucher()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  {saveVoucherModal.saving ? "Đang lưu voucher..." : "Lưu voucher vào máy"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSaveVoucherModal(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNAUTHENTICATED VISITOR PROMPT MODAL */}
      {unauthenticatedVoucherPrompt && (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setUnauthenticatedVoucherPrompt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 animate-bounce">
              <Gift className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Mã quà tặng #{unauthenticatedVoucherPrompt}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Bạn nhận được quà tặng DkTEST!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đăng nhập vào tài khoản học sinh để hệ thống tự động cộng phần thưởng voucher này vào ví của bạn.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-center cursor-pointer"
              >
                Đăng nhập nhận quà ngay
              </Link>
              <button
                type="button"
                onClick={() => setUnauthenticatedVoucherPrompt(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

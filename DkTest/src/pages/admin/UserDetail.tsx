import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  FileText,
  Calendar,
  Award,
  Key,
  Edit2,
  Save,
  Trash2,
  HeartHandshake,
  Activity,
  Lock,
  Wallet,
  Coins,
  CreditCard,
  AlertTriangle,
  RotateCw,
  Check,
  ExternalLink,
  Receipt,
  Tag,
} from "lucide-react";
import {
  fetchAdminUserDetail,
  updateAdminUser,
  approveUserAccount,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
} from "../../services/adminService";
import { getAdminStudentWalletDetails } from "../../services/walletClientService";
import { unlinkRelationship } from "../../services/relationshipService";
import type { UserProfile, Submission } from "../../types";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function UserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "family" | "exams" | "activity" | "security" | "wallet">("overview");
  const [subLimit, setSubLimit] = useState(5);
  const [logLimit, setLogLimit] = useState(5);

  // Wallet details state
  const [walletData, setWalletData] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Suspend modal state with reason
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadUserDetail = async (currentSubLimit = subLimit, currentLogLimit = logLimit) => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetchAdminUserDetail(uid, currentSubLimit, currentLogLimit);
      
      // Ensure submissions are populated: if server returned empty, fallback directly to Firestore
      let finalSubs = res.submissions || [];
      if (finalSubs.length === 0 && res.user) {
        try {
          const candidateNames = Array.from(
            new Set([uid, res.user.username, res.user.displayName, res.user.email, res.studentProfile?.username].filter(Boolean))
          );
          const foundMap = new Map<string, any>();
          for (const name of candidateNames) {
            try {
              const q1 = query(collection(db, "submissions"), where("studentUsername", "==", name), limit(currentSubLimit));
              const s1 = await getDocs(q1);
              s1.docs.forEach((d) => foundMap.set(d.id, { id: d.id, ...d.data() }));
            } catch (_) {}

            try {
              const q2 = query(collection(db, "submissions"), where("studentId", "==", name), limit(currentSubLimit));
              const s2 = await getDocs(q2);
              s2.docs.forEach((d) => foundMap.set(d.id, { id: d.id, ...d.data() }));
            } catch (_) {}
          }

          if (foundMap.size > 0) {
            const list = Array.from(foundMap.values());
            list.sort((a, b) => {
              const timeA = new Date(a.submittedAt?.toDate?.() || a.submittedAt || 0).getTime();
              const timeB = new Date(b.submittedAt?.toDate?.() || b.submittedAt || 0).getTime();
              return timeB - timeA;
            });
            finalSubs = list.slice(0, currentSubLimit);
            res.submissions = finalSubs;
          }
        } catch (directErr) {
          console.warn("[UserDetail] Direct submissions query fallback error:", directErr);
        }
      }

      setData(res);
      setEditName(res.user?.displayName || "");
      setEditClass(res.user?.studentClass || res.studentProfile?.className || "");
      setEditRole(res.user?.role || "student");
    } catch (err: any) {
      console.error("[UserDetail] Error:", err);
      showErrorToast(err.message || "Không thể tải thông tin người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreSubs = () => {
    const next = subLimit + 5;
    setSubLimit(next);
    loadUserDetail(next, logLimit);
  };

  const handleLoadMoreLogs = () => {
    const next = logLimit + 5;
    setLogLimit(next);
    loadUserDetail(subLimit, next);
  };

  const loadWalletData = async (force = false) => {
    if (!uid) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await getAdminStudentWalletDetails(uid, force);
      setWalletData(res);
    } catch (err: any) {
      console.warn("[UserDetail] loadWalletData error:", err);
      setWalletError(err.message || "Không thể tải dữ liệu ví học sinh");
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetail(5, 5);
  }, [uid]);

  useEffect(() => {
    if (activeTab === "wallet" && !walletData && !walletLoading) {
      loadWalletData();
    }
  }, [activeTab, uid]);

  const handleSaveProfile = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await updateAdminUser(uid, {
        displayName: editName.trim(),
        studentClass: editClass.trim(),
        role: editRole as any,
      });
      showSuccessToast("Đã cập nhật thông tin thành công!");
      setIsEditing(false);
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message || "Lỗi khi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!uid) return;
    try {
      await approveUserAccount(uid);
      showSuccessToast("Đã phê duyệt tài khoản!");
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message);
    }
  };

  const handleOpenSuspendModal = () => {
    setSuspendReason(user?.suspendedReason || user?.lockReason || "");
    setShowSuspendModal(true);
  };

  const confirmSuspendAccount = async () => {
    if (!uid) return;
    const finalReason = suspendReason.trim() || "Tạm khoá theo quyết định của Quản trị viên";
    setIsSubmittingSuspend(true);
    try {
      await suspendUserAccount(uid, finalReason);
      showSuccessToast("Đã tạm khoá tài khoản thành công!");
      setShowSuspendModal(false);
      setSuspendReason("");
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message || "Lỗi khi tạm khoá tài khoản");
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleReactivate = async () => {
    if (!uid) return;
    try {
      await reactivateUserAccount(uid);
      showSuccessToast("Đã kích hoạt lại tài khoản!");
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message);
    }
  };

  const handleDelete = async () => {
    if (!uid) return;
    try {
      await deleteUserAccount(uid);
      showSuccessToast("Đã xoá vĩnh viễn tài khoản!");
      const returnPath = data?.user?.role === "parent" ? "/admin/parents" : "/admin/students";
      navigate(returnPath, { replace: true });
    } catch (err: any) {
      showErrorToast(err.message);
    }
  };

  const handleUnlink = async (relId: string) => {
    try {
      await unlinkRelationship(relId);
      showSuccessToast("Đã huỷ liên kết thành công!");
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message || "Không thể huỷ liên kết.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-xs">Đang tải hồ sơ người dùng...</p>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-sm font-bold">Không tìm thấy người dùng.</p>
        <Link to="/admin/students" className="mt-3 inline-block text-xs text-blue-600 underline">
          Quay lại danh sách học sinh
        </Link>
      </div>
    );
  }

  const { user, studentProfile, parentProfile, relationships = [], submissions = [], auditLogs = [] } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          {user.accountStatus === "pending" && (
            <button
              onClick={handleApprove}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Phê duyệt</span>
            </button>
          )}

          {user.accountStatus === "active" ? (
            <button
              onClick={handleOpenSuspendModal}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Tạm khoá</span>
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kích hoạt</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xoá</span>
          </button>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-20 h-20 rounded-2xl object-cover shadow-xs border border-slate-100" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center shrink-0">
            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">{user.displayName || "Người dùng"}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
              {user.role}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              user.accountStatus === "active"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {user.accountStatus === "active" ? "Đang hoạt động" : user.accountStatus === "pending" ? "Chờ duyệt" : "Tạm khoá"}
            </span>
          </div>

          <p className="text-xs text-slate-500 font-mono">UID: {user.uid}</p>
          <p className="text-xs text-slate-600">{user.email || "Chưa có email"}</p>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
          <p>Tham gia: <strong className="text-slate-700">{user.createdAt ? formatDate(user.createdAt) : "—"}</strong></p>
          <p>Lần cuối: <strong className="text-slate-700">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"}</strong></p>
        </div>
      </div>

      {/* Prominent Suspended Banner if Account is Suspended */}
      {user.accountStatus === "suspended" && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-2xl shrink-0 mt-0.5 shadow-2xs">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white">
                  Tài khoản đang bị tạm khoá
                </span>
                <span className="text-[11px] text-red-600 font-medium">
                  Học sinh bị chặn đăng nhập & thi trực tuyến
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-950 font-bold mt-1 leading-snug">
                Lý do khoá: <span className="text-red-700 italic">"{user.suspendedReason || user.lockReason || "Quản trị viên tạm khoá"}"</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleOpenSuspendModal}
              className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Chỉnh lý do
            </button>
            <button
              type="button"
              onClick={handleReactivate}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kích hoạt lại ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: "overview", label: "Tổng quan", icon: User },
          { id: "wallet", label: "Ví & Sổ công nợ", icon: Wallet },
          { id: "profile", label: "Hồ sơ chi tiết", icon: GraduationCap },
          { id: "family", label: `Liên kết gia đình (${relationships.length})`, icon: HeartHandshake },
          { id: "exams", label: `Bài thi đã làm (${submissions.length})`, icon: FileText },
          { id: "activity", label: "Hoạt động gần đây", icon: Activity },
          { id: "security", label: "Bảo mật", icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Thông tin tài khoản</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Họ và tên</span>
                <span className="font-bold text-slate-800">{user.displayName || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Địa chỉ Email</span>
                <span className="font-bold text-slate-800">{user.email || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Lớp / Khối</span>
                <span className="font-bold text-slate-800">{user.studentClass || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Vai trò</span>
                <span className="font-bold text-slate-800 capitalize">{user.role}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Phương thức đăng nhập</span>
                <span className="font-bold text-slate-800 capitalize">{user.provider || "password"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Email xác minh</span>
                <span className={`font-bold ${user.emailVerified ? "text-emerald-600" : "text-slate-400"}`}>
                  {user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Thống kê nhanh</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-blue-600">{submissions.length}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Bài thi đã làm</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-emerald-600">
                  {submissions.length > 0
                    ? (submissions.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / submissions.length).toFixed(1)
                    : "—"}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Điểm trung bình</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-indigo-600">{relationships.length}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Phụ huynh liên kết</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-black text-purple-600">{user.loginCount || 1}</p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">Lượt đăng nhập</p>
              </div>
            </div>
          </div>

          {/* Recent Exam Submissions Card on Overview Tab */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Bài thi đã làm gần nhất</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {submissions.length} bài
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Danh sách các bài thi học sinh vừa hoàn thành gần đây nhất
                </p>
              </div>
              {submissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("exams")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem tất cả bài thi</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              )}
            </div>

            {submissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Học sinh chưa hoàn thành bài thi nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Khi học sinh nộp bài thi trên hệ thống, kết quả và bài làm sẽ hiển thị tự động tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="pb-2.5">Đề thi</th>
                      <th className="pb-2.5">Điểm số</th>
                      <th className="pb-2.5">Đúng / Tổng câu</th>
                      <th className="pb-2.5">Thời gian làm</th>
                      <th className="pb-2.5">Ngày nộp</th>
                      <th className="pb-2.5 text-right">Chi tiết bài làm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.slice(0, 5).map((sub: any) => {
                      const score = typeof sub.score === "number" ? sub.score : 0;
                      const maxScore = sub.maxScore || 10;
                      const ratio = maxScore > 0 ? score / maxScore : 0;
                      const badgeColor =
                        ratio >= 0.8
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ratio >= 0.5
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-rose-50 text-rose-700 border-rose-200";

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-bold text-slate-900">
                            {sub.examTitleSnapshot || sub.examTitle || sub.examId}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border font-black text-xs ${badgeColor}`}>
                              {score} <span className="font-normal text-[10px] ml-1 opacity-70">/ {maxScore}</span>
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 font-medium">
                            {sub.correctCount ?? "—"} / {sub.totalCount ?? "—"}
                          </td>
                          <td className="py-3 text-slate-600 font-medium">
                            {sub.timeSpent ? `${Math.round(sub.timeSpent / 60)} phút` : "—"}
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">
                            {sub.submittedAt ? formatDate(sub.submittedAt) : "—"}
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              to={`/admin/exams/${sub.examId}/submissions/${sub.id}`}
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <span>Xem bài làm</span>
                            </Link>
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

      {/* Tab: Wallet & Debt */}
      {activeTab === "wallet" && (
        <div className="space-y-6">
          {/* Wallet Header & Controls */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Ví DkTEST & Sổ Công Nợ Chi Tiết</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý số dư, lịch sử giao dịch và đối soát công nợ của học sinh {user.displayName || user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-center">
              <button
                type="button"
                onClick={() => loadWalletData(true)}
                disabled={walletLoading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Làm mới dữ liệu ví"
              >
                <RotateCw className={`w-3.5 h-3.5 ${walletLoading ? "animate-spin text-emerald-600" : ""}`} />
                <span>{walletLoading ? "Đang tải..." : "Làm mới"}</span>
              </button>

              <Link
                to={`/admin/wallet?search=${encodeURIComponent(user.displayName || user.username || user.uid)}`}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Mở trong trang Quản lý Ví"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở trong Quản lý Ví</span>
              </Link>
            </div>
          </div>

          {walletLoading && !walletData ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-bold">Đang tải chi tiết ví và công nợ của học sinh...</p>
            </div>
          ) : walletError ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-red-200 space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-xs font-bold text-red-600">{walletError}</p>
              <button
                type="button"
                onClick={() => loadWalletData(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold"
              >
                Thử lại
              </button>
            </div>
          ) : !walletData?.wallet ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200 space-y-3">
              <Coins className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Chưa tìm thấy dữ liệu ví của học sinh này.</p>
              <p className="text-xs text-slate-400">Học sinh có thể chưa được đồng bộ tài khoản vào hệ thống ví.</p>
              <Link
                to="/admin/wallet"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Đến Quản lý Ví để Đồng bộ
              </Link>
            </div>
          ) : (
            (() => {
              const w = walletData.wallet;
              const remainingDebt =
                typeof w.remainingDebtVnd === "number"
                  ? w.remainingDebtVnd
                  : Math.max(0, (w.totalReceivableVnd || 0) - (w.totalCollectedVnd || 0) - (w.totalAdjustedVnd || 0));

              return (
                <div className="space-y-6">
                  {/* Financial Metrics Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Số dư ví</p>
                      <p className="text-lg sm:text-xl font-black text-emerald-700">
                        {w.balanceVnd.toLocaleString("vi-VN")}đ
                      </p>
                      <span className="text-[10px] text-slate-400 block">Khả dụng thanh toán đề</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Phát sinh phải thu</p>
                      <p className="text-lg sm:text-xl font-black text-blue-700">
                        {(w.totalReceivableVnd || 0).toLocaleString("vi-VN")}đ
                      </p>
                      <span className="text-[10px] text-slate-400 block">Tổng học phí / dịch vụ</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-teal-600">Đã thu thực tế</p>
                      <p className="text-lg sm:text-xl font-black text-teal-700">
                        {(w.totalCollectedVnd || 0).toLocaleString("vi-VN")}đ
                      </p>
                      <span className="text-[10px] text-slate-400 block">Đã thanh toán ngoại tuyến</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-purple-600">Điều chỉnh công nợ</p>
                      <p className="text-lg sm:text-xl font-black text-purple-700">
                        {(w.totalAdjustedVnd || 0).toLocaleString("vi-VN")}đ
                      </p>
                      <span className="text-[10px] text-slate-400 block">Miễn giảm / bù trừ</span>
                    </div>

                    <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Công nợ còn lại</p>
                      <p className="text-lg sm:text-xl font-black text-rose-700">
                        {remainingDebt.toLocaleString("vi-VN")}đ
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.debtStatus === "in_debt" || remainingDebt > 0
                            ? "bg-rose-100 text-rose-700"
                            : w.debtStatus === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {remainingDebt > 0 ? "Còn nợ học phí" : "Đã hoàn tất"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KYC & Identity Info */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${w.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">Danh Tính Xác Thực Ví (KYC)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.isVerified
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {w.isVerified ? "Đã xác thực danh tính" : "Chưa xác thực KYC"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tên đối soát: <strong className="text-slate-800">{w.verifiedName || w.fullName || "Chưa thiết lập"}</strong>
                          {w.currentClass && <span> • Lớp: <strong className="text-slate-800">{w.currentClass}</strong></span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Entitlements (Đề thi đã mở khóa) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-600" />
                        <span>Danh Sách Đề Thi Đã Mở Khóa ({walletData.entitlements?.length || 0})</span>
                      </span>
                    </h4>

                    {(!walletData.entitlements || walletData.entitlements.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-2">Học sinh chưa mở khóa đề thi trả phí nào.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {walletData.entitlements.map((en: any) => (
                          <div key={en.id || en.examId} className="p-3 bg-purple-50/50 border border-purple-100 rounded-2xl text-xs space-y-1">
                            <div className="font-bold text-purple-950 truncate" title={en.examTitle || en.examId}>
                              {en.examTitle || `Đề thi #${en.examId}`}
                            </div>
                            <div className="text-[10px] text-purple-600 flex items-center justify-between">
                              <span>Mã: <code className="font-mono">{en.examId}</code></span>
                              <span className="font-semibold">{en.grantedAt ? formatDate(en.grantedAt) : "Đã mở"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Two-column Ledger: Transactions & Cash Collections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Wallet Transactions */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <span>Lịch Sử Giao Dịch Ví ({walletData.transactions?.length || 0})</span>
                      </h4>

                      {(!walletData.transactions || walletData.transactions.length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có giao dịch biến động số dư ví.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                          {walletData.transactions.map((tx: any) => (
                            <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-3">
                                <p className="font-bold text-slate-800 truncate">{tx.note || tx.description || "Giao dịch ví"}</p>
                                <p className="text-[10px] text-slate-400">{tx.createdAt ? formatDate(tx.createdAt) : "—"}</p>
                              </div>
                              <span className={`font-black shrink-0 ${tx.amountVnd > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {tx.amountVnd > 0 ? "+" : ""}{tx.amountVnd.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cash Collection & Debt Adjustments */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-600" />
                        <span>Phiếu Thu & Điều Chỉnh Công Nợ ({walletData.debtRecords?.length || 0})</span>
                      </h4>

                      {(!walletData.debtRecords || walletData.debtRecords.length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">Chưa có phiếu thu tiền mặt hoặc điều chỉnh nợ.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                          {walletData.debtRecords.map((dr: any) => (
                            <div key={dr.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="min-w-0 pr-3">
                                <p className="font-bold text-slate-800 truncate">
                                  {dr.type === "cash_collection" || dr.type === "manual_receivable" ? "Phiếu thu tiền mặt" : "Điều chỉnh công nợ"}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{dr.note || dr.reason || "Bản ghi công nợ"} • {dr.createdAt ? formatDate(dr.createdAt) : "—"}</p>
                              </div>
                              <span className="font-black text-slate-900 shrink-0">
                                {dr.amountVnd.toLocaleString("vi-VN")}đ
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deposit Requests if any */}
                  {walletData.depositRequests && walletData.depositRequests.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        <span>Yêu Cầu Nạp Tiền Chuyển Khoản ({walletData.depositRequests.length})</span>
                      </h4>

                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {walletData.depositRequests.map((req: any) => (
                          <div key={req.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-800">Mã chuyển: {req.transferCode || req.id}</p>
                              <p className="text-[10px] text-slate-400">{req.createdAt ? formatDate(req.createdAt) : "—"} • {req.paymentMethod || "Ngân hàng"}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-emerald-600">{(req.amountVnd || 0).toLocaleString("vi-VN")}đ</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                req.status === "approved" ? "bg-emerald-50 text-emerald-700" : req.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {req.status === "approved" ? "Thành công" : req.status === "rejected" ? "Từ chối" : "Đang chờ duyệt"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 2: Profile Edit */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Chỉnh sửa hồ sơ</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Sửa thông tin</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lớp / Khối
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={editClass}
                onChange={(e) => setEditClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vai trò (Role)
              </label>
              <select
                disabled={!isEditing}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-slate-800"
              >
                <option value="student">Học sinh (student)</option>
                <option value="parent">Phụ huynh (parent)</option>
                <option value="teacher">Giáo viên (teacher)</option>
                <option value="admin">Quản trị viên (admin)</option>
              </select>
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Lưu thay đổi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Huỷ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Family / Relationships */}
      {activeTab === "family" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Các liên kết Phụ huynh ↔ Học sinh
          </h3>
          {relationships.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Chưa có liên kết phụ huynh nào được thiết lập.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {relationships.map((rel: any) => (
                <div key={rel.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {rel.parentName ? `Phụ huynh: ${rel.parentName}` : "Mã mời chưa claim"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Học sinh: {rel.studentName} {rel.studentClass ? `(${rel.studentClass})` : ""}
                    </p>
                    {rel.inviteCode && (
                      <p className="text-[10px] text-slate-400 font-mono">Mã mời: {rel.inviteCode}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      rel.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {rel.status}
                    </span>
                    <button
                      onClick={() => handleUnlink(rel.id)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Huỷ liên kết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Exam Submissions */}
      {activeTab === "exams" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Lịch sử làm bài thi ({submissions.length})
          </h3>
          {submissions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Học sinh chưa hoàn thành bài thi nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="pb-2">Đề thi</th>
                    <th className="pb-2">Điểm số</th>
                    <th className="pb-2">Đúng / Tổng</th>
                    <th className="pb-2">Thời gian nộp</th>
                    <th className="pb-2 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{sub.examTitleSnapshot || sub.examId}</td>
                      <td className="py-3">
                        <span className="font-black text-blue-600 text-sm">{sub.score}</span> / {sub.maxScore || 10}
                      </td>
                      <td className="py-3 text-slate-600">{sub.correctCount} / {sub.totalCount}</td>
                      <td className="py-3 text-slate-500">
                        {sub.submittedAt ? formatDate(sub.submittedAt) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/exams/${sub.examId}/submissions/${sub.id}`}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Xem bài làm
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {submissions.length >= subLimit && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreSubs}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-blue-200 disabled:opacity-50"
                  >
                    {loading ? "Đang tải thêm..." : "Tải thêm 5 bài nộp"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Activity Timeline */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Nhật ký hoạt động</h3>
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {user.createdAt && (
              <div className="flex items-start gap-4 relative pl-8">
                <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Tạo tài khoản hệ thống</p>
                  <p className="text-[11px] text-slate-400">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            )}
            {user.emailVerified && (
              <div className="flex items-start gap-4 relative pl-8">
                <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Đã xác minh email thành công</p>
                </div>
              </div>
            )}
            {user.lastLoginAt && (
              <div className="flex items-start gap-4 relative pl-8">
                <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-white" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Đăng nhập gần nhất</p>
                  <p className="text-[11px] text-slate-400">{formatDate(user.lastLoginAt)}</p>
                </div>
              </div>
            )}
            {auditLogs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 relative pl-8">
                <span className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-slate-400 ring-4 ring-white" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{log.action}</p>
                  <p className="text-[11px] text-slate-500">
                    Bởi: {log.actorName || log.actorEmail || log.actorUid} • {formatDate(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {auditLogs.length >= logLimit && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMoreLogs}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
              >
                {loading ? "Đang tải thêm..." : "Tải thêm 5 nhật ký"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Security */}
      {activeTab === "security" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Thông tin bảo mật tài khoản</h3>
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Nhà cung cấp xác thực: <strong>{user.provider || "password"}</strong>
            </p>
            <p>
              Trạng thái xác minh email: <strong>{user.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</strong>
            </p>
            <p>
              Trạng thái hoạt động: <strong>{user.accountStatus}</strong>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
              * Mật khẩu của người dùng được mã hoá an toàn bởi Firebase Authentication và không thể xem hoặc trích xuất dưới dạng plain text.
            </p>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showDeleteModal && (
        <ConfirmModal
          isOpen={true}
          title="Xác nhận xoá người dùng"
          message={`Bạn có chắc chắn muốn xoá tài khoản của "${user.displayName || user.email}"? Thao tác này sẽ vô hiệu hoá tài khoản.`}
          confirmText="Xoá vĩnh viễn"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Suspend Account Modal with Custom Reason */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Tạm khoá tài khoản học sinh
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {user.displayName || user.email} (UID: {user.uid})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Khi bị tạm khoá, học sinh sẽ không thể đăng nhập hoặc làm bài thi. Hệ thống sẽ hiển thị lý do này cho học sinh trên màn hình thông báo.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Lý do tạm khoá tài khoản <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Nhập lý do cụ thể để học sinh biết khi vào web..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />

              {/* Quick suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400">Gợi ý lý do nhanh:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Gian lận trong quá trình làm bài thi",
                    "Vi phạm quy chế thi trực tuyến",
                    "Chưa hoàn tất học phí / công nợ quá hạn",
                    "Theo yêu cầu xác minh từ phụ huynh",
                    "Tài khoản có dấu hiệu đăng nhập bất thường",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSuspendReason(preset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-left"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                disabled={isSubmittingSuspend}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmSuspendAccount}
                disabled={isSubmittingSuspend}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSuspend ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang khoá...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Xác nhận tạm khoá</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

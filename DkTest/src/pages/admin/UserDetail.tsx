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
} from "lucide-react";
import {
  fetchAdminUserDetail,
  updateAdminUser,
  approveUserAccount,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
} from "../../services/adminService";
import { unlinkRelationship } from "../../services/relationshipService";
import type { UserProfile, Submission } from "../../types";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function UserDetail() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "family" | "exams" | "activity" | "security">("overview");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadUserDetail = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetchAdminUserDetail(uid);
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

  useEffect(() => {
    loadUserDetail();
  }, [uid]);

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

  const handleSuspend = async () => {
    if (!uid) return;
    try {
      await suspendUserAccount(uid, "Quản trị viên tạm khoá");
      showSuccessToast("Đã tạm khoá tài khoản!");
      loadUserDetail();
    } catch (err: any) {
      showErrorToast(err.message);
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
      showSuccessToast("Đã xoá tài khoản!");
      navigate("/admin/students", { replace: true });
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
              onClick={handleSuspend}
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

      {/* Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: "overview", label: "Tổng quan", icon: User },
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
    </div>
  );
}

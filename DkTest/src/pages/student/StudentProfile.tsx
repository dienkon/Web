import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Camera, Save, CheckCircle2, ShieldCheck, Loader2, Award, BookOpen, Clock, HeartHandshake, Check, X } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { saveStudentProfile } from "../../services/studentService";
import { getPendingRequestsForStudent, respondToParentLinkRequest, type ParentLinkRequest } from "../../services/parentService";
import { useToast } from "../../components/ui/ToastNotification";

export default function StudentProfile() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Incoming parent requests
  const [parentRequests, setParentRequests] = useState<ParentLinkRequest[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  // Stats from submission history
  const [examCount, setExamCount] = useState(0);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (!role) {
      navigate("/student/login", { replace: true });
      return;
    }

    // Load student info
    const infoStr = localStorage.getItem("student_info");
    let currentUsername = "";
    if (infoStr) {
      try {
        const info = JSON.parse(infoStr);
        setDisplayName(info.displayName || info.name || "");
        setUsername(info.username || "");
        currentUsername = info.username || info.displayName || "";
        setEmail(info.email || "");
        setStudentClass(info.studentClass || info.class || "");
        setAvatarUrl(info.avatarUrl || "");
      } catch (e) {
        console.error("Error loading student_info:", e);
      }
    }

    // Load parent requests
    if (currentUsername) {
      getPendingRequestsForStudent(currentUsername).then(setParentRequests);
    }

    // Load submission count history from Firestore
    const fetchStats = async () => {
      if (!currentUsername) return;
      try {
        const q = query(
          collection(db, "submissions"),
          where("studentId", "==", currentUsername)
        );
        const snap = await getDocs(q);
        setExamCount(snap.docs.length);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    
    fetchStats();
  }, [navigate]);

  const handleRespondParent = async (reqId: string, accept: boolean) => {
    setProcessingReqId(reqId);
    try {
      const ok = await respondToParentLinkRequest(reqId, accept);
      if (ok) {
        setParentRequests((prev) => prev.filter((r) => r.id !== reqId));
        showToast(
          accept
            ? "Đã chấp nhận liên kết với tài khoản Phụ huynh!"
            : "Đã từ chối yêu cầu liên kết.",
          accept ? "success" : "info"
        );
      } else {
        showToast("Lỗi xử lý yêu cầu", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi xử lý yêu cầu", "error");
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ!", "error");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const uploadedUrl = await uploadImageToCloudinary(file);
      setAvatarUrl(uploadedUrl);
      showToast("Tải ảnh đại diện thành công!", "success");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      showToast("Lỗi khi tải ảnh đại diện lên hệ thống", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Vui lòng nhập Họ và tên!", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updatedInfo = {
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        studentClass: studentClass.trim(),
        avatarUrl: avatarUrl.trim(),
      };

      // Save to localStorage
      localStorage.setItem("student_info", JSON.stringify(updatedInfo));

      // Save to Firestore
      await saveStudentProfile({
        name: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
        studentClass: studentClass.trim(),
      });

      showToast("Đã lưu thông tin tài khoản thành công!", "success");
    } catch (err) {
      console.error("Error saving profile:", err);
      showToast("Lỗi khi cập nhật hồ sơ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 overflow-hidden shadow-lg flex items-center justify-center text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold uppercase">
                  {displayName ? displayName.charAt(0) : "S"}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2.5 bg-white text-blue-600 rounded-xl shadow-lg hover:bg-slate-100 transition-all cursor-pointer group-hover:scale-105"
              title="Đổi ảnh đại diện"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Name & Role */}
          <div className="text-center md:text-left space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {displayName || "Tài khoản Thí sinh"}
            </h1>
            <p className="text-blue-100 text-sm font-medium flex items-center justify-center md:justify-start gap-2">
              <span>{studentClass ? `Lớp: ${studentClass}` : "Thí sinh tự do"}</span>
              <span>•</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs font-semibold">Tài khoản Học sinh</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{examCount}</div>
            <div className="text-xs text-slate-500 font-medium">Bài thi đã làm</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">10.0</div>
            <div className="text-xs text-slate-500 font-medium">Thang điểm tối đa</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">Sẵn sàng</div>
            <div className="text-xs text-slate-500 font-medium">Trạng thái phòng thi</div>
          </div>
        </div>
      </div>

      {/* Incoming Parent Connection Requests */}
      {parentRequests.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-3xl p-6 shadow-2xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-indigo-900">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">Yêu cầu liên kết từ Phụ huynh</h3>
              <p className="text-xs text-indigo-700 font-medium">
                Phụ huynh muốn đồng hành và theo dõi kết quả làm bài thi của bạn.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {parentRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-extrabold text-slate-900">
                    Phụ huynh: {req.parentDisplayName}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Tên đăng nhập: <strong className="text-indigo-600 font-mono">@{req.parentUsername}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={processingReqId === req.id}
                    onClick={() => handleRespondParent(req.id, false)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>

                  <button
                    type="button"
                    disabled={processingReqId === req.id}
                    onClick={() => handleRespondParent(req.id, true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {processingReqId === req.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Đồng ý kết nối</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-2xs space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          <span>Thông tin cá nhân & Tài khoản</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nhập họ và tên thí sinh..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">Tên này sẽ tự động lưu khi làm bài thi.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tên đăng nhập / Mã học sinh
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: hs123456"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Lớp / Trường học
            </label>
            <input
              type="text"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="VD: 12A1 - THPT Chuyên"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nhapemail@domain.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Đường dẫn ảnh đại diện (URL)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl shrink-0 transition-colors cursor-pointer"
            >
              Chọn tệp
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Lưu thay đổi hồ sơ</span>
          </button>
        </div>
      </form>
    </div>
  );
}

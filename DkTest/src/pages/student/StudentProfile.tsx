import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Camera,
  Save,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Award,
  BookOpen,
  Clock,
  HeartHandshake,
  Check,
  X,
  Copy,
  Plus,
  Sparkles,
  Trophy,
  KeyRound,
  Send,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { saveStudentProfile } from "../../services/studentService";
import {
  getPendingRequestsForStudent,
  respondToParentLinkRequest,
  type ParentLinkRequest,
} from "../../services/parentService";
import {
  createStudentInviteCode,
  getStudentRelationships,
  unlinkRelationship,
} from "../../services/relationshipService";
import type { ParentStudentRelationship, Submission } from "../../types";
import {
  updateProfile as updateFirebaseProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reload,
} from "firebase/auth";
import { setStoredItem, STORAGE_KEYS } from "../../utils/storage";
import { useAuth } from "../../context/AuthContext";
import EmailVerificationBanner from "../../components/auth/EmailVerificationBanner";
import { useToast } from "../../components/ui/ToastNotification";

export default function StudentProfile() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user, userProfile, role, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Change & Linking States
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [emailModalError, setEmailModalError] = useState("");
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  // Parent links
  const [parentRequests, setParentRequests] = useState<ParentLinkRequest[]>([]);
  const [activeRelationships, setActiveRelationships] = useState<ParentStudentRelationship[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  // Stats & Achievements
  const [examCount, setExamCount] = useState(0);
  const [hasPerfectScore, setHasPerfectScore] = useState(false);
  const [averageScore, setAverageScore] = useState(0);

  // 1. Initial form synchronization (runs strictly when userProfile or user changes, NOT on local keystrokes)
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || "");
      setUsername(
        userProfile.username ||
          userProfile.usernameNormalized ||
          (userProfile.email && !userProfile.email.endsWith("@dktest.local")
            ? userProfile.email.split("@")[0]
            : userProfile.uid)
      );
      const isUserAccount =
        userProfile.email?.endsWith("@dktest.local") || userProfile.authProvider === "username";
      setEmail(userProfile.contactEmail || (isUserAccount ? "" : userProfile.email || ""));
      setStudentClass(userProfile.studentClass || "");
      setAvatarUrl(userProfile.photoURL || "");
      if (userProfile.pendingEmail) {
        setPendingVerificationEmail(userProfile.pendingEmail);
      }
    } else {
      const infoStr = localStorage.getItem("student_info");
      if (infoStr) {
        try {
          const info = JSON.parse(infoStr);
          setDisplayName(info.displayName || info.name || "");
          setUsername(info.username || "");
          const storedEmail = info.contactEmail || info.email || "";
          setEmail(storedEmail.endsWith("@dktest.local") ? "" : storedEmail);
          setStudentClass(info.studentClass || info.class || "");
          setAvatarUrl(info.avatarUrl || "");
        } catch (e) {}
      }
    }
  }, [userProfile?.uid, user?.uid]);

  // 2. Load parent requests & relationships (strictly decoupled from displayName input changes)
  const normalizedUsername = (
    userProfile?.username ||
    userProfile?.usernameNormalized ||
    username ||
    ""
  ).trim().toLowerCase();

  useEffect(() => {
    if (normalizedUsername) {
      getPendingRequestsForStudent(normalizedUsername).then(setParentRequests);
    }
    if (user?.uid) {
      getStudentRelationships(user.uid).then(setActiveRelationships);
    }
  }, [user?.uid, normalizedUsername]);

  // 3. Load submissions and compute achievements (strictly decoupled from form inputs)
  useEffect(() => {
    const targetId = user?.uid;
    if (!targetId) return;

    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, "submissions"),
          where("studentId", "==", targetId)
        );
        const snap = await getDocs(q);
        const count = snap.docs.length;
        setExamCount(count);

        let totalScore = 0;
        let perfect = false;
        snap.docs.forEach((d) => {
          const s = d.data() as Submission;
          if (typeof s.score === "number") {
            totalScore += s.score;
            if (s.score >= (s.maxScore || 10)) perfect = true;
          }
        });

        setHasPerfectScore(perfect);
        setAverageScore(count > 0 ? Number((totalScore / count).toFixed(1)) : 0);
      } catch (err) {
        console.warn("Error fetching student submissions:", err);
      }
    };

    fetchStats();
  }, [user?.uid]);

  // 4. Auto check if pending email verification was completed upon page load
  useEffect(() => {
    if (user?.email && userProfile?.pendingEmail) {
      if (user.email.toLowerCase() === userProfile.pendingEmail.toLowerCase()) {
        setDoc(
          doc(db, "users", user.uid),
          { pendingEmail: null, emailVerified: true },
          { merge: true }
        ).catch(() => {});
        setPendingVerificationEmail(null);
      }
    }
  }, [user?.email, userProfile?.pendingEmail]);

  const isUsernameAccount =
    Boolean(user?.email?.endsWith("@dktest.local")) ||
    userProfile?.authProvider === "username";
  const hasRealEmail = Boolean(user?.email && !user.email.endsWith("@dktest.local"));

  // Send email verification to link or update email
  const handleSendEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanEmail = newEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.endsWith("@dktest.local")) {
      setEmailModalError("Vui lòng nhập địa chỉ email hợp lệ (ví dụ: yourname@gmail.com).");
      return;
    }

    if (user.email && cleanEmail === user.email.toLowerCase()) {
      setEmailModalError("Địa chỉ email mới phải khác với địa chỉ email hiện tại.");
      return;
    }

    if (!currentPasswordInput) {
      setEmailModalError("Vui lòng nhập mật khẩu tài khoản hiện tại để xác thực bảo mật.");
      return;
    }

    setEmailActionLoading(true);
    setEmailModalError("");

    try {
      // 1. Re-authenticate with current credentials to ensure security freshness
      const cred = EmailAuthProvider.credential(user.email || "", currentPasswordInput);
      await reauthenticateWithCredential(user, cred);

      // 2. Request verification email before updating email in Firebase Auth
      await verifyBeforeUpdateEmail(user, cleanEmail);

      // 3. Store pendingEmail in Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          pendingEmail: cleanEmail,
          pendingEmailRequestedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setPendingVerificationEmail(cleanEmail);
      setIsChangingEmail(false);
      setCurrentPasswordInput("");
      setNewEmailInput("");
      showToast(
        `Đã gửi thư xác nhận đến ${cleanEmail}. Vui lòng mở email và nhấn vào link để kích hoạt!`,
        "success"
      );
    } catch (err: any) {
      console.error("[StudentProfile] Error sending verification email:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setEmailModalError("Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.");
      } else if (err.code === "auth/email-already-in-use") {
        setEmailModalError("Địa chỉ email này đã được sử dụng bởi một tài khoản khác.");
      } else if (err.code === "auth/invalid-email") {
        setEmailModalError("Địa chỉ email không đúng định dạng.");
      } else if (err.code === "auth/too-many-requests") {
        setEmailModalError("Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.");
      } else {
        setEmailModalError(err.message || "Đã xảy ra sự cố khi gửi email xác thực.");
      }
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Check if user confirmed the link in their inbox
  const handleCheckEmailVerification = async () => {
    if (!user) return;
    setIsCheckingVerification(true);
    try {
      await reload(user);
      const targetEmail = (pendingVerificationEmail || userProfile?.pendingEmail || "").trim().toLowerCase();

      // If user's email in Firebase Auth matches targetEmail
      if (user.email && targetEmail && user.email.toLowerCase() === targetEmail) {
        // Sync Firestore
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            contactEmail: user.email,
            emailVerified: true,
            pendingEmail: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Also update usernames collection if applicable
        const usernameNorm = (userProfile?.username || username || "").trim().toLowerCase();
        if (usernameNorm) {
          try {
            await setDoc(doc(db, "usernames", usernameNorm), { email: user.email }, { merge: true });
          } catch (unErr) {}
        }

        setPendingVerificationEmail(null);
        setEmail(user.email);
        await refreshProfile();
        showToast("Xác thực email thành công! Email tài khoản của bạn đã được cập nhật.", "success");
      } else {
        showToast(
          `Chưa ghi nhận xác nhận. Vui lòng mở hộp thư đến của ${targetEmail} và nhấn vào liên kết xác nhận.`,
          "info"
        );
      }
    } catch (err: any) {
      showToast("Lỗi kiểm tra trạng thái xác minh: " + (err.message || err), "error");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Resend verification email
  const handleResendEmailVerification = async () => {
    if (!user || !pendingVerificationEmail) return;
    setEmailActionLoading(true);
    try {
      await verifyBeforeUpdateEmail(user, pendingVerificationEmail);
      showToast(`Đã gửi lại email xác thực đến ${pendingVerificationEmail}!`, "success");
    } catch (err: any) {
      showToast("Không thể gửi lại email: " + (err.message || err), "error");
    } finally {
      setEmailActionLoading(false);
    }
  };

  // Cancel email change
  const handleCancelEmailChange = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { pendingEmail: null }, { merge: true });
      setPendingVerificationEmail(null);
      showToast("Đã hủy yêu cầu xác minh email.", "info");
    } catch (err) {}
  };

  // Profile completion calculation (0 - 100%)
  const calculateCompletion = () => {
    let score = 0;
    if (avatarUrl) score += 20;
    if (displayName) score += 25;
    if (email) score += 25;
    if (studentClass) score += 15;
    if (activeRelationships.length > 0 || parentRequests.length > 0) score += 15;
    return Math.min(100, score);
  };

  const completionPercent = calculateCompletion();

  const handleGenerateInviteCode = async () => {
    if (!user) return;
    setGeneratingCode(true);
    try {
      const code = await createStudentInviteCode(user.uid, displayName || "Học sinh", email, studentClass);
      setInviteCode(code);
      showToast("Đã tạo mã mời liên kết phụ huynh thành công!", "success");
    } catch (err: any) {
      showToast(err.message || "Không thể tạo mã mời.", "error");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    showToast("Đã sao chép mã mời!", "info");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleUnlinkParent = async (relId: string) => {
    try {
      await unlinkRelationship(relId);
      setActiveRelationships((prev) => prev.filter((r) => r.id !== relId));
      showToast("Đã huỷ liên kết phụ huynh thành công!", "info");
    } catch (err: any) {
      showToast("Không thể huỷ liên kết.", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Họ và tên không được để trống", "error");
      return;
    }

    setIsSaving(true);
    try {
      const cleanName = displayName.trim();
      const cleanClass = studentClass.trim();
      const cleanEmail = email.trim();

      if (user) {
        // 1. Update Firebase Auth displayName
        try {
          await updateFirebaseProfile(user, { displayName: cleanName });
        } catch (authErr) {
          console.warn("[StudentProfile] Could not update Firebase Auth user:", authErr);
        }

        // 2. Prepare user document update
        const updateData: Record<string, any> = {
          displayName: cleanName,
          fullName: cleanName,
          studentClass: cleanClass,
          updatedAt: new Date().toISOString(),
        };
        // For username-based accounts, allow saving a real contact email to the profile
        const isUsernameAccount = user.email?.endsWith("@dktest.local") || userProfile?.authProvider === "username";
        if (isUsernameAccount) {
          if (cleanEmail && cleanEmail.includes("@") && !cleanEmail.endsWith("@dktest.local")) {
            updateData.contactEmail = cleanEmail;
          } else if (!cleanEmail) {
            updateData.contactEmail = "";
          }
        }
        await setDoc(
          doc(db, "users", user.uid),
          updateData,
          { merge: true }
        );

        // 3. Also update the usernames doc with the new displayName
        const normUser = userProfile?.usernameNormalized || userProfile?.username?.toLowerCase() || username?.toLowerCase();
        if (normUser) {
          try {
            await setDoc(
              doc(db, "usernames", normUser),
              {
                fullName: cleanName,
                displayName: cleanName,
                uid: user.uid,
                ...(isUsernameAccount && cleanEmail && cleanEmail.includes("@") && !cleanEmail.endsWith("@dktest.local")
                  ? { contactEmail: cleanEmail }
                  : {}),
              },
              { merge: true }
            );
          } catch (unErr) {
            console.warn("[StudentProfile] Could not update usernames doc:", unErr);
          }
        }
      }

      // 4. Save to students collection (with uid to satisfy security rules)
      try {
        await saveStudentProfile({
          uid: user?.uid,
          name: cleanName,
          email: cleanEmail,
          username: username.trim(),
          avatarUrl,
          studentClass: cleanClass,
        });
      } catch (stErr) {
        console.warn("[StudentProfile] Could not save to students collection:", stErr);
      }

      // 5. Update local storage
      const studentInfo = {
        name: cleanName,
        displayName: cleanName,
        username: username.trim(),
        email: cleanEmail,
        contactEmail: cleanEmail,
        avatarUrl,
        studentClass: cleanClass,
        uid: user?.uid,
      };
      localStorage.setItem("student_info", JSON.stringify(studentInfo));
      setStoredItem(STORAGE_KEYS.STUDENT_INFO, studentInfo);

      // 6. Refresh AuthContext state
      await refreshProfile();
      showToast("Đã lưu thông tin hồ sơ thành công!", "success");
    } catch (err: any) {
      showToast(err.message || "Lỗi lưu hồ sơ", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn tệp hình ảnh hợp lệ", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh tối đa là 5MB", "error");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      setAvatarUrl(uploadedUrl);

      if (user) {
        await setDoc(doc(db, "users", user.uid), { photoURL: uploadedUrl }, { merge: true });
      }

      showToast("Đã tải ảnh đại diện lên thành công!", "success");
    } catch (err: any) {
      showToast(err.message || "Lỗi tải ảnh lên", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Email verification alert banner */}
        <EmailVerificationBanner />

        {/* Profile Completion Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Mức độ hoàn thiện hồ sơ:</span>
            </span>
            <span className="font-black text-blue-600 text-sm">{completionPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionPercent >= 80 ? "bg-emerald-500" : completionPercent >= 50 ? "bg-blue-500" : "bg-amber-500"
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Điền đầy đủ thông tin lớp, email và liên kết phụ huynh để hoàn thiện 100% hồ sơ học tập.
          </p>
        </div>

        {/* Header Profile Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-3xl border-4 border-slate-100 shadow-md">
                {(displayName || username || "H").charAt(0).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
              title="Đổi ảnh đại diện"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {displayName || username || "Học sinh"}
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                Học sinh
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">@{username || "hocsinh"}</p>
            <p className="text-xs text-slate-600 font-medium">
              {studentClass ? `Lớp: ${studentClass}` : "Chưa cập nhật lớp học"}
            </p>
          </div>

          <div className="flex items-center gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[90px]">
              <p className="text-2xl font-black text-emerald-600">{examCount}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Bài thi</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[90px]">
              <p className="text-2xl font-black text-blue-600">{averageScore || "—"}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Điểm TB</p>
            </div>
          </div>
        </div>

        {/* Achievements Section (Calculated from Real Data) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Thành tích học tập</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-2xl border text-center space-y-1 ${
              examCount >= 1 ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
                <Award className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold">Khởi Đầu Tốt</p>
              <p className="text-[10px] opacity-80">Hoàn thành bài thi đầu tiên</p>
            </div>

            <div className={`p-3 rounded-2xl border text-center space-y-1 ${
              hasPerfectScore ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold">Điểm Tuyệt Đối</p>
              <p className="text-[10px] opacity-80">Đạt điểm tối đa một bài thi</p>
            </div>

            <div className={`p-3 rounded-2xl border text-center space-y-1 ${
              examCount >= 10 ? "bg-blue-50/70 border-blue-200 text-blue-900" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold">Chăm Chỉ</p>
              <p className="text-[10px] opacity-80">Hoàn thành 10 bài thi</p>
            </div>

            <div className={`p-3 rounded-2xl border text-center space-y-1 ${
              averageScore >= 8 ? "bg-purple-50/70 border-purple-200 text-purple-900" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
            }`}>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold">Học Sinh Giỏi</p>
              <p className="text-[10px] opacity-80">Điểm trung bình từ 8.0</p>
            </div>
          </div>
        </div>

        {/* Parent Link Invitation Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-indigo-600" />
                <span>Liên kết tài khoản Phụ huynh</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chia sẻ mã mời để bố mẹ có thể theo dõi tiến độ và kết quả làm bài của bạn
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateInviteCode}
              disabled={generatingCode}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Tạo mã mời phụ huynh</span>
            </button>
          </div>

          {/* Active Generated Invite Code Display */}
          {inviteCode && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Mã liên kết của bạn (gửi cho phụ huynh):
                </span>
                <span className="text-xl font-black font-mono text-indigo-950 tracking-wider">
                  {inviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
              </button>
            </div>
          )}

          {/* Active Linked Parents List */}
          {activeRelationships.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700">Phụ huynh đã liên kết:</p>
              <div className="divide-y divide-slate-100">
                {activeRelationships.map((rel) => (
                  <div key={rel.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{rel.parentName || "Phụ huynh"}</span>
                      {rel.parentEmail && <span className="text-slate-400 ml-2 font-mono">({rel.parentEmail})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkParent(rel.id)}
                      className="text-red-500 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                    >
                      Huỷ liên kết
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Thông tin cá nhân
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập (Username)</label>
              <input
                type="text"
                disabled
                value={username}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Địa chỉ Email
                </label>
                {isUsernameAccount && !hasRealEmail ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Chưa liên kết email
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      user?.emailVerified
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}
                  >
                    {user?.emailVerified ? "Đã xác thực" : "Chưa xác thực"}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    disabled
                    value={
                      hasRealEmail
                        ? user?.email || email
                        : email || (userProfile?.contactEmail ? userProfile.contactEmail : "")
                    }
                    placeholder={!hasRealEmail ? "Chưa liên kết email thật" : ""}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 disabled:opacity-90 font-mono"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingEmail(true);
                    setNewEmailInput("");
                    setCurrentPasswordInput("");
                    setEmailModalError("");
                  }}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isUsernameAccount && !hasRealEmail ? "Liên kết Email" : "Đổi Email"}</span>
                </button>
              </div>

              {/* Pending Email Verification Card */}
              {pendingVerificationEmail && (
                <div className="mt-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 flex-1">
                      <p className="font-bold">Đang chờ xác minh email mới:</p>
                      <p className="font-mono text-amber-950 font-bold text-xs mt-0.5">
                        {pendingVerificationEmail}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Hệ thống đã gửi liên kết xác thực đến địa chỉ này. Vui lòng mở email (kiểm tra cả thư rác/spam) và nhấn vào link để hoàn tất {isUsernameAccount && !hasRealEmail ? "liên kết" : "đổi"} email.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isCheckingVerification}
                      onClick={handleCheckEmailVerification}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingVerification ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Tôi đã xác nhận trong email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendEmailVerification}
                      disabled={emailActionLoading}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Gửi lại thư
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelEmailChange}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer"
                    >
                      Hủy yêu cầu
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lớp / Trường</label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="VD: 12A1"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu thông tin hồ sơ</span>
            </button>
          </div>
        </form>

        {/* Modal: Change / Link Email with Verification */}
        {isChangingEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {isUsernameAccount && !hasRealEmail ? "Liên kết Email với tài khoản" : "Thay đổi địa chỉ Email"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isUsernameAccount && !hasRealEmail ? "Bảo mật tài khoản & khôi phục mật khẩu" : "Cập nhật hòm thư nhận thông báo mới"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingEmail(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 leading-relaxed">
                {isUsernameAccount && !hasRealEmail ? (
                  <span>
                    Nhập địa chỉ email của bạn. Hệ thống sẽ gửi một liên kết xác thực đến hòm thư này. Bạn chỉ cần mở email và nhấn vào link xác nhận để hoàn tất liên kết tài khoản.
                  </span>
                ) : (
                  <span>
                    Nhập địa chỉ email mới. Thư xác nhận sẽ được gửi đến email mới. Khi bạn nhấn vào liên kết xác nhận trong email, địa chỉ email của bạn sẽ chính thức được cập nhật.
                  </span>
                )}
              </div>

              <form onSubmit={handleSendEmailVerification} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ email mới <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="VD: an.nguyen@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu hiện tại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Nhập mật khẩu tài khoản hiện tại"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Yêu cầu bảo mật của hệ thống để xác thực bạn là chủ tài khoản.
                  </p>
                </div>

                {emailModalError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{emailModalError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsChangingEmail(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={emailActionLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {emailActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Gửi email xác thực</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

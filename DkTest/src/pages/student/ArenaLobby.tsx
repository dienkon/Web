import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Swords,
  Users,
  PlusCircle,
  KeyRound,
  Trophy,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  X,
  Target,
  Zap,
} from "lucide-react";
import {
  createArenaRoom,
  joinArenaRoom,
} from "../../services/arenaService";
import { useAuth } from "../../context/AuthContext";

// Arena Default Preset Exam
const DEFAULT_PRESET_EXAM = {
  id: "toan12_standard_01",
  title: "Đề Thi Khảo Sát Toán 12 Chuẩn Cấu Trúc GDPT 2025",
  code: "TOAN12-2025",
  duration: 45,
};

export default function ArenaLobby() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Create room modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [examSourceType, setExamSourceType] = useState<"preset" | "custom">("preset");
  const [customExamCode, setCustomExamCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active user details
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem("userProfile");
    const parsed = raw ? JSON.parse(raw) : null;
    const uid = userProfile?.uid || parsed?.uid || `guest_${Math.random().toString(36).substring(2, 7)}`;
    const name = userProfile?.displayName || userProfile?.fullName || parsed?.displayName || parsed?.name || "Chiến binh DkTest";
    const avatar = userProfile?.photoURL || parsed?.avatarUrl || "";
    return { uid, name, avatar };
  }, [userProfile]);

  // Handle Join by Code - Only queries the single requested room doc
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsJoinLoading(true);
    setErrorMessage("");

    try {
      const room = await joinArenaRoom(code, currentUser);
      navigate(`/student/arena/room/${room.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tham gia phòng thi đấu!");
    } finally {
      setIsJoinLoading(false);
    }
  };

  // Handle Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalExamId = examSourceType === "custom" ? customExamCode.trim() : DEFAULT_PRESET_EXAM.id;
    if (!finalExamId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const examTitle = examSourceType === "custom"
        ? `Đề thi mã: ${customExamCode.trim()}`
        : DEFAULT_PRESET_EXAM.title;

      const newRoom = await createArenaRoom({
        hostUid: currentUser.uid,
        hostName: currentUser.name,
        hostAvatar: currentUser.avatar,
        title: roomTitle.trim() || `Phòng thi đấu của ${currentUser.name}`,
        examId: finalExamId,
        examTitle,
        maxParticipants,
      });

      setIsCreateModalOpen(false);
      navigate(`/student/arena/room/${newRoom.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Tạo phòng thất bại, vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Arena Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Đấu Trường Trực Tuyến Thời Gian Thực</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Đấu Trường Trắc Nghiệm DkTEST
              </h1>
              <p className="mt-2 text-purple-200 text-xs sm:text-sm leading-relaxed">
                Thi đấu đối kháng thời gian thực theo phòng riêng. Chỉ cần nhập mã phòng để vào tranh tài hoặc mở phòng mới và chia sẻ mã cho bạn bè!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 fill-slate-950 text-white" />
                <span>Tạo phòng thi đấu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Action Card: Join By Room Code (Zero Firestore Quota On Mount) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100 shadow-2xs">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Vào Phòng Thi Đấu Bằng Mã Phòng
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Nhập mã phòng gồm 6 ký tự được chia sẻ bởi bạn bè hoặc giáo viên
            </p>
          </div>

          <form
            onSubmit={handleJoinByCode}
            className="max-w-md mx-auto space-y-3"
          >
            <div className="relative">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="VD: 3B8YQ2"
                maxLength={8}
                autoFocus
                className="w-full text-center text-xl sm:text-2xl font-mono font-black tracking-widest uppercase bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl py-3.5 px-4 outline-hidden transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCodeInput.trim() || isJoinLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-extrabold text-sm rounded-2xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 shadow-md"
            >
              <span>{isJoinLoading ? "Đang kết nối phòng..." : "Tham gia phòng thi"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {errorMessage && (
            <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 animate-in fade-in">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Feature & Rules Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                Đua Tốc Độ Thời Gian Thực
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Đường đua mô phỏng tiến độ giải đề trực tiếp giữa các thí sinh tham gia.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                Đề Chuẩn GDPT 2025
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Áp dụng cấu trúc trắc nghiệm chuẩn hoặc tùy chỉnh mã đề theo nhu cầu.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                Vinh Danh & Nhận Thưởng
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Top 3 thí sinh xuất sắc nhận vinh danh huy chương và cộng thưởng Xu DkTEST.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Tạo Phòng Đấu Trường Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn đề thi và thiết lập số lượng thí sinh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên phòng thi đấu
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder={`Phòng thi của ${currentUser.name}`}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Đề thi tranh tài
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setExamSourceType("preset")}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        examSourceType === "preset"
                          ? "bg-white text-blue-700 shadow-2xs font-extrabold"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Kho đề có sẵn
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamSourceType("custom")}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        examSourceType === "custom"
                          ? "bg-white text-blue-700 shadow-2xs font-extrabold"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Nhập mã đề riêng
                    </button>
                  </div>
                </div>

                {examSourceType === "preset" ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-bold text-slate-800">{DEFAULT_PRESET_EXAM.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Mã đề: <span className="font-mono font-bold text-blue-600">{DEFAULT_PRESET_EXAM.code}</span> • Thời gian: {DEFAULT_PRESET_EXAM.duration} phút
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customExamCode}
                    onChange={(e) => setCustomExamCode(e.target.value)}
                    placeholder="Nhập mã bài thi (VD: TOAN12-2025, SG_1, DE_01...)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden transition-all font-mono"
                    required={examSourceType === "custom"}
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Số lượng thí sinh tối đa (N):
                  </label>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {maxParticipants} người
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>2 người (Đối đầu 1v1)</span>
                  <span>10 người</span>
                  <span>20 người</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (examSourceType === "custom" && !customExamCode.trim())}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Đang tạo phòng..." : "Bắt đầu mở phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { showNotice, confirmDialog } from '../ui/Dialogs';
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { TeacherQuestionPanel } from '../classroom/TeacherQuestionPanel';
import { AnswerStatistics } from '../classroom/AnswerStatistics';
import { useClassroomStore } from '../../store/classroomStore';
import { useMeetingStore } from '../../store/meetingStore';
import { useClassroom } from '../../hooks/useClassroom';
import { socketService } from '../../services/socket';
import { HostSettings } from '../../types/meeting';
import {
  HelpCircle,
  BarChart3,
  ShieldCheck,
  VolumeX,
  Hand,
  Lock,
  Unlock,
  SlidersHorizontal,
  Sparkles,
  Timer,
  FileText,
  Disc,
  Users2,
  Vote,
} from 'lucide-react';
import { clsx } from 'clsx';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'room' | 'tools' | 'create' | 'stats'>('room');
  const { currentQuestion, statistics, answersList, questionLocked } = useClassroomStore();
  const { startQuestion, lockQuestion, resetQuestion } = useClassroom();
  const {
    timerEndsAt,
    requireApproval,
    waitingRequests,
    isRoomLocked,
    participants,
    addToast,
    hostSettings,
  } = useMeetingStore();

  // Local state for meeting tools (Image 2)
  const [timerMinutes, setTimerMinutes] = useState(5);
  const timerRunning = !!timerEndsAt;

  const handleCreate = (text: string, options: { A: string; B: string; C: string; D: string }) => {
    startQuestion(text, options);
    setTab('stats');
  };

  const handleUpdateSettings = (updates: Partial<HostSettings>) => {
    socketService.emit('host:settings-update', updates);
  };

  const handleMuteAll = async () => {
    if (await confirmDialog('Bạn có muốn tắt micro của tất cả học sinh trong phòng?')) {
      socketService.emit('host:mute-all');
      addToast('Đã gửi yêu cầu tắt micro đến tất cả người tham gia', 'info');
    }
  };

  const handleLowerAllHands = () => {
    socketService.emit('host:lower-all-hands');
    addToast('Đã hạ tay tất cả học sinh', 'info');
  };

  const handleToggleLock = () => {
    const nextState = !isRoomLocked;
    socketService.emit('host:lock-room', { locked: nextState });
  };

  const participantsList = Array.from(participants.values());
  const raisedHandsList = participantsList.filter((p) => p.handRaised);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bộ điều khiển của người tổ chức" maxWidth="xl">
      {/* Tab Selectors */}
      <div className="flex border-b border-gray-800 mb-5 overflow-x-auto no-scrollbar gap-1">
        <button
          onClick={() => setTab('room')}
          className={clsx(
            'flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'room'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <ShieldCheck className="w-4 h-4" /> Quản lý lớp học
        </button>

        <button
          onClick={() => setTab('tools')}
          className={clsx(
            'flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'tools'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <Sparkles className="w-4 h-4" /> Công cụ cuộc họp
        </button>

        <button
          onClick={() => setTab('create')}
          className={clsx(
            'flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'create'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <HelpCircle className="w-4 h-4" /> Tạo câu hỏi mới
        </button>

        <button
          onClick={() => setTab('stats')}
          className={clsx(
            'flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'stats'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <BarChart3 className="w-4 h-4" /> Thống kê Realtime
        </button>
      </div>

      {/* 1. Quản lý lớp học & Bộ điều khiển người tổ chức (Google Meet Standard) */}
      {tab === 'room' && (
        <div className="space-y-6 text-slate-200">
          {/* Quick Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleMuteAll}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-left transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-rose-500/20">
                <VolumeX className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Tắt tiếng tất cả</p>
                <p className="text-[11px] text-slate-400">Tắt micro của mọi học sinh trong phòng</p>
              </div>
            </button>

            <button
              onClick={handleLowerAllHands}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-left transition-colors"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Hand className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Hạ tay tất cả</p>
                <p className="text-[11px] text-slate-400">Xóa cờ giơ tay của mọi học sinh</p>
              </div>
            </button>

            <button
              onClick={handleToggleLock}
              className={clsx(
                'flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-colors sm:col-span-2',
                isRoomLocked
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-white/[0.05] border-white/10 text-slate-200 hover:bg-white/[0.09]'
              )}
            >
              <div
                className={clsx(
                  'p-2.5 rounded-xl',
                  isRoomLocked ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-300'
                )}
              >
                {isRoomLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isRoomLocked ? 'Phòng đang khóa (Chặn người mới)' : 'Khóa phòng học'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isRoomLocked
                    ? 'Bấm để mở khóa cho phép học sinh vào lại'
                    : 'Không cho phép người mới tham gia nếu không có sự đồng ý'}
                </p>
              </div>
            </button>
          </div>

          <section className="p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-semibold">Duyệt người tham gia</p><p className="text-xs text-slate-400">Người mới chờ bạn chấp nhận trước khi vào phòng.</p></div>
              <button role="switch" aria-label="Duyệt người tham gia" aria-checked={requireApproval}
                className="px-3 py-2 rounded-lg bg-blue-600 text-sm"
                onClick={() => socketService.emit('host:admission-mode', { required: !requireApproval })}>{requireApproval ? 'Đang bật' : 'Đang tắt'}</button>
            </div>
            <p className="text-xs text-slate-300">Yêu cầu đang chờ ({waitingRequests.length})</p>
            {waitingRequests.map(request => <div key={request.id} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{request.name}</span>
              <div className="flex gap-2 shrink-0">
                <button className="px-3 py-1 rounded bg-emerald-700" aria-label={`Chấp nhận ${request.name}`} disabled={isRoomLocked}
                  onClick={() => socketService.emit('host:admission-decide', { requestId: request.id, approved: true })}>Chấp nhận</button>
                <button className="px-3 py-1 rounded bg-rose-800" aria-label={`Từ chối ${request.name}`}
                  onClick={() => socketService.emit('host:admission-decide', { requestId: request.id, approved: false })}>Từ chối</button>
              </div>
            </div>)}
          </section>

          {/* Raised hands queue */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-amber-400" /> Danh sách đang giơ tay ({raisedHandsList.length})
              </span>
            </div>

            {raisedHandsList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {raisedHandsList.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] text-xs"
                  >
                    <span className="font-medium text-slate-200">{p.name}</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Hand className="w-3.5 h-3.5" /> Đang giơ tay
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-1">Hiện không có ai giơ tay.</p>
            )}
          </div>

          {/* Google Meet Host Management Controls (Images 3 & 4) */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Điều phối cuộc họp (Google Meet)
              </h3>
            </div>

            {/* Master Switch */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Quyền quản lý của người tổ chức</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Cho phép bạn giới hạn những tính năng mà cộng tác viên có thể bật (chẳng hạn như micro, camera, chia sẻ màn hình và chat).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Quyền quản lý của người tổ chức" aria-checked={hostSettings.hostManagement}
                onClick={() => handleUpdateSettings({ hostManagement: !hostSettings.hostManagement })}
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  hostSettings.hostManagement ? 'bg-blue-600' : 'bg-slate-700'
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                    hostSettings.hostManagement ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Sub-section: CHO PHÉP NGƯỜI ĐÓNG GÓP */}
            <div
              className={clsx(
                'space-y-3 pl-1 pr-1 transition-opacity duration-200',
                !hostSettings.hostManagement && 'opacity-40 pointer-events-none'
              )}
            >
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                Cho phép người đóng góp
              </h4>

              {/* 1. Screen Share */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-slate-100">Chia sẻ màn hình</p>
                  <p className="text-xs text-slate-400">Cho phép người tham gia trình chiếu màn hình</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Cho phép chia sẻ màn hình" aria-checked={hostSettings.allowScreenShare}
                  onClick={() => handleUpdateSettings({ allowScreenShare: !hostSettings.allowScreenShare })}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                    hostSettings.allowScreenShare ? 'bg-blue-600' : 'bg-slate-700'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                      hostSettings.allowScreenShare ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* 2. Send Reactions */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-slate-100">Gửi phản ứng</p>
                  <p className="text-xs text-slate-400">Cho phép người tham gia thả biểu cảm emoji</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Cho phép phản ứng" aria-checked={hostSettings.allowReactions}
                  onClick={() => handleUpdateSettings({ allowReactions: !hostSettings.allowReactions })}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                    hostSettings.allowReactions ? 'bg-blue-600' : 'bg-slate-700'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                      hostSettings.allowReactions ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* 3. Allow Mic */}
              <div className="py-2 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">Bật micrô của họ</p>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Cho phép micro" aria-checked={hostSettings.allowMic}
                    onClick={() => handleUpdateSettings({ allowMic: !hostSettings.allowMic })}
                    className={clsx(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      hostSettings.allowMic ? 'bg-blue-600' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                        hostSettings.allowMic ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Việc tắt chế độ cài đặt này có thể khóa micro của người tham gia. Họ có thể bật lại khi chế độ này được mở lại.
                </p>
              </div>

              {/* 4. Allow Video */}
              <div className="py-2 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">Bật video của họ</p>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Cho phép camera" aria-checked={hostSettings.allowVideo}
                    onClick={() => handleUpdateSettings({ allowVideo: !hostSettings.allowVideo })}
                    className={clsx(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      hostSettings.allowVideo ? 'bg-blue-600' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                        hostSettings.allowVideo ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Việc tắt chế độ cài đặt này sẽ ngăn người tham gia bật camera trong phòng.
                </p>
              </div>

              {/* 5. Allow Chat */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">Gửi tin nhắn trò chuyện</p>
                  <p className="text-xs text-slate-400">Cho phép người tham gia gửi tin nhắn trong phòng họp</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Cho phép trò chuyện" aria-checked={hostSettings.allowChat}
                  onClick={() => handleUpdateSettings({ allowChat: !hostSettings.allowChat })}
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                    hostSettings.allowChat ? 'bg-blue-600' : 'bg-slate-700'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                      hostSettings.allowChat ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Công cụ cuộc họp (Matching Image 2) */}
      {tab === 'tools' && (
        <div className="space-y-4 text-slate-200">
          <p className="text-xs text-slate-400">
            Các tiện ích nâng cao hỗ trợ giảng dạy và hội thảo trực tuyến theo chuẩn Google Meet.
          </p>

          <div className="space-y-2.5">
            {/* Chép lời */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Chép lời</p>
                  <p className="text-xs text-slate-400">Ghi lại phụ đề cuộc trò chuyện theo thời gian thực</p>
                </div>
              </div>
              <button
                onClick={() => showNotice('Chép lời chưa khả dụng', 'Ứng dụng chưa tích hợp dịch vụ chép lời. Chưa có phụ đề nào được tạo hoặc lưu.')}
                className="px-3.5 py-1.5 rounded-xl text-xs bg-white/10 text-slate-300"
              >
                Chưa hỗ trợ
              </button>
            </div>

            {/* Hẹn giờ */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Hẹn giờ</p>
                  <p className="text-xs text-slate-400">Hiện đồng hồ đếm ngược làm bài tập cho học sinh</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Number(e.target.value))}
                  disabled={timerRunning}
                  className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 outline-none"
                >
                  <option value={1} className="bg-slate-900">1 phút</option>
                  <option value={3} className="bg-slate-900">3 phút</option>
                  <option value={5} className="bg-slate-900">5 phút</option>
                  <option value={10} className="bg-slate-900">10 phút</option>
                </select>
                <button
                  onClick={() => socketService.emit('host:timer', { minutes: timerRunning ? null : timerMinutes })}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                    timerRunning
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  )}
                >
                  {timerRunning ? 'Dừng' : 'Bắt đầu'}
                </button>
              </div>
            </div>

            {/* Ghi cuộc họp */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                  <Disc className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Ghi cuộc họp</p>
                  <p className="text-xs text-slate-400">Lưu trữ video và âm thanh buổi học</p>
                </div>
              </div>
              <button
                onClick={() => showNotice('Ghi cuộc họp chưa khả dụng', 'Ứng dụng chưa tích hợp hệ thống ghi cuộc họp. Chưa có bản ghi nào được tạo hoặc lưu.')}
                className="px-3.5 py-1.5 rounded-xl text-xs bg-white/10 text-slate-300"
              >
                Chưa hỗ trợ
              </button>
            </div>

            {/* Phòng họp nhóm */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Phòng họp nhóm (Breakout Rooms)</p>
                  <p className="text-xs text-slate-400">Chia thành các nhóm nhỏ thảo luận riêng</p>
                </div>
              </div>
              <button
                onClick={() => showNotice('Phòng họp nhóm chưa khả dụng', 'Tính năng chia nhóm chưa được triển khai. Bạn có thể tạo phòng riêng từ trang chủ và chia sẻ liên kết cho từng nhóm.')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
              >
                Cấu hình
              </button>
            </div>

            {/* Polls & Hỏi đáp */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Polls & Hỏi đáp</p>
                  <p className="text-xs text-slate-400">Gửi cuộc thăm dò ý kiến hoặc mở hỏi đáp cho khán giả</p>
                </div>
              </div>
              <button
                onClick={() => setTab('create')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Tạo ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tạo câu hỏi mới */}
      {tab === 'create' && <TeacherQuestionPanel onStartQuestion={handleCreate} />}

      {/* 4. Thống kê realtime */}
      {tab === 'stats' && (
        <div>
          {currentQuestion ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#282a2d] rounded-xl border border-gray-700">
                <span className="text-xs font-bold text-blue-400 uppercase">Câu hỏi đang phát</span>
                <p className="text-sm font-semibold text-white mt-1">{currentQuestion.text}</p>
              </div>

              <AnswerStatistics
                statistics={statistics}
                answersList={answersList}
                questionLocked={questionLocked}
                isHost={true}
                onLock={lockQuestion}
                onReset={resetQuestion}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 space-y-3">
              <BarChart3 className="w-10 h-10 mx-auto text-gray-600" />
              <p className="text-sm">Chưa có câu hỏi nào được phát động trong phòng học này.</p>
              <button
                onClick={() => setTab('create')}
                className="text-xs text-blue-400 hover:underline font-medium"
              >
                + Tạo câu hỏi đầu tiên ngay
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

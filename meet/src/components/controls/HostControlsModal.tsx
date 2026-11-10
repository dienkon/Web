import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { TeacherQuestionPanel } from '../classroom/TeacherQuestionPanel';
import { AnswerStatistics } from '../classroom/AnswerStatistics';
import { useClassroomStore } from '../../store/classroomStore';
import { useMeetingStore } from '../../store/meetingStore';
import { useClassroom } from '../../hooks/useClassroom';
import { socketService } from '../../services/socket';
import { HelpCircle, BarChart3, Settings, ShieldCheck, VolumeX, Hand, Lock, Unlock, Users } from 'lucide-react';
import { clsx } from 'clsx';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'create' | 'stats' | 'room'>('create');
  const { currentQuestion, statistics, answersList, questionLocked } = useClassroomStore();
  const { startQuestion, lockQuestion, resetQuestion } = useClassroom();
  const { isRoomLocked, setRoomLocked, participants, addToast } = useMeetingStore();

  const handleCreate = (text: string, options: { A: string; B: string; C: string; D: string }) => {
    startQuestion(text, options);
    setTab('stats');
  };

  const handleMuteAll = () => {
    if (window.confirm('Bạn có muốn tắt micro của tất cả học sinh trong phòng?')) {
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
    setRoomLocked(nextState);
    addToast(nextState ? 'Đã khóa phòng học' : 'Đã mở khóa phòng học', 'info');
  };

  const participantsList = Array.from(participants.values());
  const raisedHandsList = participantsList.filter((p) => p.handRaised);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý Phòng Học (Giáo viên)" maxWidth="lg">
      {/* Tab Selectors */}
      <div className="flex border-b border-gray-800 mb-5 overflow-x-auto">
        <button
          onClick={() => setTab('create')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
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
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'stats'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <BarChart3 className="w-4 h-4" /> Thống kê Realtime
        </button>

        <button
          onClick={() => setTab('room')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0',
            tab === 'room'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          )}
        >
          <ShieldCheck className="w-4 h-4" /> Quản lý lớp học
        </button>
      </div>

      {tab === 'create' && <TeacherQuestionPanel onStartQuestion={handleCreate} />}

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
              <Settings className="w-10 h-10 mx-auto text-gray-600 animate-spin-slow" />
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

      {tab === 'room' && (
        <div className="space-y-4 text-slate-200">
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
        </div>
      )}
    </Modal>
  );
};

import { confirmDialog } from '../ui/Dialogs';
import React from 'react';
import { Participant } from '../../types/meeting';
import { Mic, MicOff, Crown, Pin, PinOff, MicOff as MuteHost, UserX, Hand } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { useClassroomStore } from '../../store/classroomStore';
import { socketService } from '../../services/socket';
import { clsx } from 'clsx';

interface ParticipantItemProps {
  participant: Participant;
  isLocal?: boolean;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({ participant, isLocal = false }) => {
  const { pinnedParticipantId, setPinnedParticipant, isHost, addToast } = useMeetingStore();
  const { answersList } = useClassroomStore();

  const isPinned = pinnedParticipantId === participant.id;

  // Find student's current answer if available
  const userAnswerObj = answersList.find((a) => a.userId === participant.id);

  const handleMuteByHost = () => {
    if (!isHost || isLocal) return;
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('host:mute-participant', { targetId: participant.id });
      addToast(`Đã yêu cầu tắt micro của ${participant.name}`, 'info');
    }
  };

  const handleRemoveByHost = async () => {
    if (!isHost || isLocal) return;
    if (await confirmDialog(`Bạn có chắc chắn muốn mời ${participant.name} ra khỏi phòng học?`)) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('host:remove-participant', { targetId: participant.id });
        addToast(`Đã mời ${participant.name} ra khỏi phòng`, 'warning');
      }
    }
  };

  const initialLetter = participant.name ? participant.name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="flex items-center justify-between p-3 bg-[#282a2d] hover:bg-[#323539] rounded-xl border border-gray-700/60 transition-colors group">
      {/* Name & Avatar */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-sm font-bold shrink-0 border border-blue-400/30">
          {initialLetter}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {participant.handRaised && <span title="Đang giơ tay"><Hand size={15} className="text-amber-300" /></span>}
            <span className="text-sm font-medium text-gray-100 truncate">
              {participant.name} {isLocal && '(Bạn)'}
            </span>
            {participant.isHost && (
              <span title="Giáo viên / Host">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </span>
            )}
          </div>

          {/* Student Selected Answer Badge */}
          {userAnswerObj && (
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 bg-blue-900/60 text-blue-300 rounded border border-blue-600/40">
              Đã chọn: {userAnswerObj.answer}
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1">
        {/* Pin */}
        <button
          onClick={() => setPinnedParticipant(participant.id)}
          className={clsx(
            'p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors',
            isPinned && 'text-blue-400 bg-blue-950/60'
          )}
          title={isPinned ? 'Bỏ ghim' : 'Ghim video'}
        >
          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>

        {/* Mic Status */}
        <div className="p-1.5 text-gray-400">
          {participant.audioEnabled ? (
            <Mic className="w-4 h-4 text-emerald-400" />
          ) : (
            <MicOff className="w-4 h-4 text-red-400" />
          )}
        </div>

        {/* Host controls (Mute / Remove) - Always visible for host on mobile & desktop */}
        {isHost && !isLocal && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              onClick={handleMuteByHost}
              className="p-1.5 rounded-lg text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 transition-all"
              title="Tắt micro người này"
              aria-label="Tắt micro người này"
            >
              <MuteHost className="w-4 h-4" />
            </button>
            <button
              onClick={handleRemoveByHost}
              className="p-1.5 rounded-lg text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 active:scale-95 transition-all"
              title="Mời ra khỏi phòng"
              aria-label="Mời ra khỏi phòng"
            >
              <UserX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

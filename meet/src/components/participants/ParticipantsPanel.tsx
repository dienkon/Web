import React from 'react';
import { ParticipantItem } from './ParticipantItem';
import { Participant } from '../../types/meeting';
import { X, Users } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';

interface ParticipantsPanelProps {
  participants: Participant[];
  localParticipant: Participant;
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  localParticipant,
  onClose,
}) => {
  const { myParticipantId } = useMeetingStore();
  const remoteParticipants = participants.filter(
    (p) => p.id !== localParticipant.id && p.id !== myParticipantId && p.id !== 'local_user'
  );
  const all = [localParticipant, ...remoteParticipants];

  return (
    <div className="w-full md:w-80 lg:w-96 h-full bg-[#202124] border-l border-gray-800 flex flex-col z-20 shrink-0 select-none shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-gray-100">Người tham gia ({all.length})</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {all.map((p) => (
          <ParticipantItem
            key={p.id}
            participant={p}
            isLocal={p.id === localParticipant.id}
          />
        ))}
      </div>
    </div>
  );
};

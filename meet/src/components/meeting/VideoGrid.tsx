import React from 'react';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareView } from './ScreenShareView';
import { Participant } from '../../types/meeting';
import { useMeetingStore } from '../../store/meetingStore';

interface VideoGridProps {
  participants: Participant[];
  localParticipant: Participant;
  activeSpeakerId: string | null;
  pinnedParticipantId: string | null;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  onStopScreenShare: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localParticipant,
  activeSpeakerId,
  pinnedParticipantId,
  isScreenSharing,
  screenStream,
  onStopScreenShare,
}) => {
  const { myParticipantId } = useMeetingStore();

  // All participants including local (filtered to prevent self-duplication)
  const remoteParticipants = participants.filter(
    (p) => p.id !== localParticipant.id && p.id !== myParticipantId && p.id !== 'local_user'
  );
  const allParticipants = [localParticipant, ...remoteParticipants];

  const pinnedParticipant = pinnedParticipantId
    ? allParticipants.find((p) => p.id === pinnedParticipantId)
    : null;

  // Screen share view takes main priority if active
  if (isScreenSharing && screenStream) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        {/* Main Presentation View */}
        <div className="flex-1 h-full min-h-0">
          <ScreenShareView
            stream={screenStream}
            presenterName={localParticipant.name}
            isSelf={true}
            onStopShare={onStopScreenShare}
          />
        </div>

        {/* Side Strip of Participants */}
        <div className="w-full md:w-64 lg:w-72 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 max-h-40 md:max-h-full">
          {allParticipants.map((p) => (
            <div key={p.id} className="w-44 md:w-full h-28 md:h-44 shrink-0">
              <ParticipantTile
                participant={p}
                isLocal={p.id === localParticipant.id}
                isPinned={p.id === pinnedParticipantId}
                isActiveSpeaker={p.id === activeSpeakerId}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Pinned Participant view takes secondary priority
  if (pinnedParticipant) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        <div className="flex-1 h-full min-h-0">
          <ParticipantTile
            participant={pinnedParticipant}
            isLocal={pinnedParticipant.id === localParticipant.id}
            isPinned={true}
            isActiveSpeaker={pinnedParticipant.id === activeSpeakerId}
          />
        </div>

        <div className="w-full md:w-64 lg:w-72 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto shrink-0 max-h-40 md:max-h-full">
          {allParticipants
            .filter((p) => p.id !== pinnedParticipant.id)
            .map((p) => (
              <div key={p.id} className="w-44 md:w-full h-28 md:h-44 shrink-0">
                <ParticipantTile
                  participant={p}
                  isLocal={p.id === localParticipant.id}
                  isPinned={false}
                  isActiveSpeaker={p.id === activeSpeakerId}
                />
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Automatic Dynamic Grid Layout Algorithm (Item 35)
  const count = allParticipants.length;

  let gridColsClass = 'grid-cols-1';
  if (count === 2) {
    gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  } else if (count >= 3 && count <= 4) {
    gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  } else if (count >= 5 && count <= 6) {
    gridColsClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  } else if (count >= 7) {
    gridColsClass = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="w-full h-full p-3 sm:p-4 overflow-y-auto flex items-center justify-center">
      <div className={`w-full h-full grid ${gridColsClass} gap-3 sm:gap-4 auto-rows-fr max-w-7xl mx-auto`}>
        {allParticipants.map((p) => (
          <div key={p.id} className="w-full h-full min-h-[180px] sm:min-h-[220px]">
            <ParticipantTile
              participant={p}
              isLocal={p.id === localParticipant.id}
              isPinned={false}
              isActiveSpeaker={p.id === activeSpeakerId}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

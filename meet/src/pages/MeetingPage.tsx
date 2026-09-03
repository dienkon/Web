import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomHeader } from '../components/meeting/RoomHeader';
import { VideoGrid } from '../components/meeting/VideoGrid';
import { ControlBar } from '../components/controls/ControlBar';
import { AnswerPanel } from '../components/classroom/AnswerPanel';
import { QuestionBanner } from '../components/classroom/QuestionBanner';
import { ChatPanel } from '../components/chat/ChatPanel';
import { ParticipantsPanel } from '../components/participants/ParticipantsPanel';
import { HostControlsModal } from '../components/controls/HostControlsModal';
import { ToastContainer } from '../components/ui/Toast';

import { useMeetingStore } from '../store/meetingStore';
import { useClassroomStore } from '../store/classroomStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSocket } from '../hooks/useSocket';
import { useParticipants } from '../hooks/useParticipants';
import { useClassroom } from '../hooks/useClassroom';
import { Participant } from '../types/meeting';

export const MeetingPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const roomCode = (code || 'CLASSROOM').toUpperCase();
  const roomId = `ROOM-${roomCode}`;

  const {
    userName,
    isHost,
    activePanel,
    setActivePanel,
    activeSpeakerId,
    pinnedParticipantId,
    setRoomInfo,
    resetMeeting,
    addToast,
  } = useMeetingStore();

  const { currentQuestion, selectedAnswer, questionLocked } = useClassroomStore();

  // Host modal state
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);

  // Custom Hooks
  const {
    localStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
  } = useWebRTC();

  useSocket();

  const { participantsList, activeSpeaker } = useParticipants();
  const { submitAnswer } = useClassroom();

  // Initial Sync
  useEffect(() => {
    if (!userName) {
      navigate(`/join/${roomCode}`);
      return;
    }
    setRoomInfo(roomId, roomCode, isHost);
  }, [userName, roomCode]);

  // Construct local participant object
  const localParticipant: Participant = {
    id: 'local_user',
    name: userName || 'Bạn',
    stream: localStream || undefined,
    audioEnabled,
    videoEnabled,
    isHost,
    isSpeaking: activeSpeakerId === 'local_user',
  };

  const handleLeave = () => {
    if (window.confirm('Bạn có muốn rời khỏi cuộc họp?')) {
      resetMeeting();
      navigate('/');
    }
  };

  return (
    <div className="w-screen h-screen bg-[#121212] flex flex-col overflow-hidden select-none relative">
      <ToastContainer />

      {/* Header */}
      <RoomHeader />

      {/* Main Workspace Area (Video Grid + Side Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Question Banner Overlay (Section 15) */}
        <QuestionBanner question={currentQuestion} />

        {/* Video Canvas Grid */}
        <div className="flex-1 h-full relative overflow-hidden flex flex-col justify-between">
          <div className="flex-1 h-full relative overflow-hidden">
            <VideoGrid
              participants={participantsList}
              localParticipant={localParticipant}
              activeSpeakerId={activeSpeaker?.id || null}
              pinnedParticipantId={pinnedParticipantId}
              isScreenSharing={isScreenSharing}
              screenStream={useMeetingStore.getState().screenStream}
              onStopScreenShare={toggleScreenShare}
            />
          </div>

          {/* Interactive Answer Panel (A/B/C/D) - Floating above controls for students */}
          {currentQuestion && (
            <div className="p-3 z-30 pointer-events-auto">
              <AnswerPanel
                question={currentQuestion}
                selectedAnswer={selectedAnswer}
                disabled={questionLocked}
                onAnswer={submitAnswer}
              />
            </div>
          )}
        </div>

        {/* Side Panels (Chat / Participants) */}
        {activePanel === 'chat' && <ChatPanel onClose={() => setActivePanel('none')} />}
        {activePanel === 'participants' && (
          <ParticipantsPanel
            participants={participantsList}
            localParticipant={localParticipant}
            onClose={() => setActivePanel('none')}
          />
        )}
      </div>

      {/* Bottom Control Bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        participantCount={participantsList.length + 1}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeave={handleLeave}
        onOpenHostModal={() => setIsHostModalOpen(true)}
      />

      {/* Teacher / Host Management Modal */}
      {isHost && (
        <HostControlsModal
          isOpen={isHostModalOpen}
          onClose={() => setIsHostModalOpen(false)}
        />
      )}
    </div>
  );
};

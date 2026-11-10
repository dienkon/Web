import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { confirmDialog } from '../components/ui/Dialogs';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { RoomHeader } from '../components/meeting/RoomHeader';
import { VideoGrid } from '../components/meeting/VideoGrid';
import { ControlBar } from '../components/controls/ControlBar';
import { AnswerPanel } from '../components/classroom/AnswerPanel';
import { QuestionBanner } from '../components/classroom/QuestionBanner';
import { ChatPanel } from '../components/chat/ChatPanel';
import { ParticipantsPanel } from '../components/participants/ParticipantsPanel';
import { ClassroomPanel } from '../components/classroom/ClassroomPanel';
import { HostControlsModal } from '../components/controls/HostControlsModal';
import { RemoteAudioContainer } from '../components/meeting/RemoteAudioContainer';
import { ToastContainer } from '../components/ui/Toast';
import { WhiteboardModal } from '../components/meeting/WhiteboardModal';
import { ReactionsOverlay } from '../components/meeting/ReactionsOverlay';

import { useMeetingStore } from '../store/meetingStore';
import { useClassroomStore } from '../store/classroomStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSocket } from '../hooks/useSocket';
import { useParticipants } from '../hooks/useParticipants';
import { useClassroom } from '../hooks/useClassroom';
import { socketService } from '../services/socket';
import { Participant } from '../types/meeting';
import { DeviceSettings } from '../components/meeting/DeviceSettings';
import { LayoutGrid, UserRound, Hand } from 'lucide-react';

export const MeetingPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const name = useMeetingStore((s) => s.userName);
  let savedName = '';
  try {
    savedName = localStorage.getItem('meetclass_user_name') || '';
  } catch {}
  if (!name && !savedName) return <Navigate to={`/join/${code || 'CLASSROOM'}`} replace />;
  return <MeetingSession />;
};

const MeetingSession: React.FC = () => {
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
    isWhiteboardOpen,
    setWhiteboardOpen,
  } = useMeetingStore();

  const { currentQuestion, selectedAnswer, questionLocked } = useClassroomStore();

  // Host modal state
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const layout = useMeetingStore((s) => s.layout);
  const handRaised = useMeetingStore((s) => s.handRaised);
  const screenStream = useMeetingStore((s) => s.screenStream);

  // Custom Hooks
  const {
    localStream,
    initLocalStream,
    toggleAudio,
    toggleVideo,
    toggleCameraFacingMode,
    toggleScreenShare,
    stopAllMedia,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    changeDevice,
  } = useWebRTC();

  useSocket();

  useEffect(() => {
    clearTimeout(leaveTimer.current);
    return () => {
      // Delay one tick so React StrictMode's effect probe does not end the call prematurely.
      leaveTimer.current = setTimeout(() => {
        stopAllMedia();
        socketService.disconnect();
        resetMeeting();
        useClassroomStore.getState().resetQuestionState();
        useClassroomStore.getState().setCurrentQuestion(null);
      }, 0);
    };
  }, [stopAllMedia, resetMeeting]);

  const { participantsList, activeSpeaker } = useParticipants();
  const { submitAnswer } = useClassroom();

  // Initial Sync & Name recovery
  useEffect(() => {
    let name = userName;
    if (!name) {
      const storedName = localStorage.getItem('meetclass_user_name');
      if (storedName) {
        useMeetingStore.getState().setUserName(storedName);
        name = storedName;
      }
    }

    if (!name) {
      navigate(`/join/${roomCode}`);
      return;
    }
    setRoomInfo(roomId, roomCode, isHost);
  }, [userName, roomCode, roomId, isHost, navigate, setRoomInfo]);

  // Ensure media stream is active on mount
  useEffect(() => {
    void initLocalStream();
  }, [initLocalStream]);

  // Global keyboard shortcuts
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || settingsOpen || isHostModalOpen || isWhiteboardOpen) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.code === 'KeyM') {
        e.preventDefault();
        void toggleAudio();
      }
      if (e.code === 'KeyV') {
        e.preventDefault();
        void toggleVideo();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [toggleAudio, toggleVideo, settingsOpen, isHostModalOpen, isWhiteboardOpen]);

  // Construct local participant object
  const isLocalSpeaking = activeSpeakerId === 'local_user' || activeSpeakerId === socketService.id;

  const localParticipant: Participant = {
    id: 'local_user',
    name: userName || 'Bạn',
    stream: localStream || undefined,
    audioEnabled,
    videoEnabled,
    isHost,
    isSpeaking: isLocalSpeaking,
    handRaised,
  };

  const exitMeeting = () => {
    stopAllMedia();
    socketService.disconnect();
    resetMeeting();
    navigate('/');
  };
  const handleLeave = async () => {
    if (await confirmDialog('Bạn có muốn rời khỏi cuộc họp?')) {
      exitMeeting();
    }
  };

  const { joinStatus, joinError, waitingRequests } = useMeetingStore();
  if (joinStatus !== 'joined') return <div className="meeting-shell h-dvh">
    <Modal isOpen title={joinStatus === 'waiting' ? 'Chờ duyệt vào phòng' : joinStatus === 'error' ? 'Không thể vào phòng' : 'Đang kết nối phòng'} onClose={exitMeeting}>
      <p className="text-sm text-slate-300">{joinStatus === 'waiting' ? 'Yêu cầu đã được gửi. Bạn sẽ vào phòng sau khi chủ phòng chấp nhận.' : joinError || 'Đang kết nối tới máy chủ…'}</p>
      <Button className="mt-6" onClick={exitMeeting}>{joinStatus === 'waiting' ? 'Hủy yêu cầu' : 'Về trang chủ'}</Button>
    </Modal>
  </div>;

  return (
    <div className="meeting-shell w-full h-dvh flex flex-col overflow-hidden relative">
      <ToastContainer />
      <RemoteAudioContainer participants={participantsList} />
      <ReactionsOverlay />
      {isHost && waitingRequests.length > 0 && !isHostModalOpen && <button
        className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-3 rounded-xl bg-blue-600 text-sm shadow-xl"
        onClick={() => setIsHostModalOpen(true)}>Có {waitingRequests.length} yêu cầu tham gia · Xem để duyệt</button>}

      {/* Header */}
      <RoomHeader onOpenSettings={() => setSettingsOpen(true)} />

      {/* Participant stats & Layout switcher bar */}
      <div className="px-3 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span>Trong phòng · {participantsList.length + 1} người</span>
          {(handRaised || participantsList.some((p) => p.handRaised)) && (
            <span className="flex items-center gap-1 text-amber-300 ml-2 font-medium">
              <Hand size={13} />
              {participantsList.filter((p) => p.handRaised).length + Number(handRaised)} giơ tay
            </span>
          )}
        </div>

        <button
          onClick={() =>
            useMeetingStore.getState().setPreferences({
              layout: layout === 'grid' ? 'speaker' : 'grid',
            })
          }
          className="text-xs flex items-center gap-1.5 sm:gap-2 text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-1.5 transition-colors"
        >
          {layout === 'grid' ? <LayoutGrid size={14} /> : <UserRound size={14} />}
          <span>{layout === 'grid' ? 'Dạng lưới' : 'Người nói'}</span>
        </button>
      </div>

      {/* Main Workspace Area (Video Grid + Side Panel) */}
      <div className="meeting-workspace flex-1 min-h-0 flex overflow-hidden relative">
        {/* Question Banner Overlay */}
        <QuestionBanner question={currentQuestion} />

        {/* Video Canvas Grid */}
        <div className="flex-1 h-full relative overflow-hidden flex flex-col justify-between">
          <div className="flex-1 h-full relative overflow-hidden">
            <VideoGrid
              participants={participantsList}
              localParticipant={localParticipant}
              activeSpeakerId={activeSpeaker?.id || (isLocalSpeaking ? 'local_user' : null)}
              pinnedParticipantId={pinnedParticipantId}
              isScreenSharing={isScreenSharing}
              screenStream={screenStream}
              onStopScreenShare={toggleScreenShare}
            />
          </div>

          {/* Interactive Answer Panel (A/B/C/D) - Floating above bottom controls for students */}
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

      </div>

      <Modal isOpen={activePanel === 'chat'} onClose={() => setActivePanel('none')} ariaLabel="Trò chuyện" maxWidth="xl">
        <div className="h-[65vh] [&>div]:!w-full"><ChatPanel onClose={() => setActivePanel('none')} /></div>
      </Modal>
      <Modal isOpen={activePanel === 'participants'} onClose={() => setActivePanel('none')} ariaLabel="Người tham gia" maxWidth="xl">
        <div className="h-[65vh] [&>div]:!w-full"><ParticipantsPanel participants={participantsList} localParticipant={localParticipant} onClose={() => setActivePanel('none')} /></div>
      </Modal>
      <Modal isOpen={activePanel === 'classroom'} onClose={() => setActivePanel('none')} ariaLabel="Lớp học tương tác" maxWidth="xl">
        <div className="h-[65vh] [&>div]:!w-full"><ClassroomPanel onClose={() => setActivePanel('none')} /></div>
      </Modal>

      {/* Bottom Control Bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        participantCount={participantsList.length + 1}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleCameraFlip={toggleCameraFacingMode}
        onToggleScreenShare={toggleScreenShare}
        onLeave={handleLeave}
        onOpenHostModal={() => setIsHostModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Interactive Collaborative Whiteboard Modal */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setWhiteboardOpen(false)}
      />

      {/* Audio / Video Device Settings Modal */}
      <DeviceSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChangeDevice={changeDevice}
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

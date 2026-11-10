import { useEffect } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { useClassroomStore } from '../store/classroomStore';
import { getIdentityToken, getHostToken } from '../services/identity';
import { showNotice } from '../components/ui/Dialogs';
import { socketService } from '../services/socket';
import { webRTCManager } from '../services/webrtc';
import { soundEffects } from '../services/audioUtils';
import { stopAllMedia } from './useWebRTC';
import { Participant, ChatMessage, ReactionItem, HostSettings } from '../types/meeting';
import { Question, AnswerStatistics, UserAnswer } from '../types/classroom';

export function useSocket() {
  const {
    roomId,
    setJoined,
    setConnectionState,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipants,
    addChatMessage,
    addToast,
    setActiveSpeaker,
    setAudioEnabled,
    setVideoEnabled,
    addReaction,
    setPreferences,
    setRoomLocked,
    setHostSettings,
  } = useMeetingStore();

  const {
    setCurrentQuestion,
    setSelectedAnswer,
    setQuestionLocked,
    setStatistics,
    setAnswersList,
    resetQuestionState,
  } = useClassroomStore();

  useEffect(() => {
    if (!roomId) return;

    socketService.connect();
    setConnectionState('reconnecting');

    let disposed = false;
    const { userName } = useMeetingStore.getState();
    useMeetingStore.setState({ joinStatus: 'connecting', joinError: '' });

    // Helper: Initialize RTCPeerConnection with current local stream and polite peer logic
    const initPeerConnection = async (targetId: string, isInitiator: boolean) => {
      await webRTCManager.fetchDynamicIceServers();
      if (disposed || !useMeetingStore.getState().joined || !useMeetingStore.getState().participants.has(targetId) || webRTCManager.hasPeerConnection(targetId)) return;
      const currentStream = useMeetingStore.getState().localStream;
      const myId = socketService.id || useMeetingStore.getState().myParticipantId || '';
      const isPolite = myId > targetId;

      webRTCManager.createPeerConnection(
        targetId,
        currentStream,
        (remoteStream, screenStream) => {
          updateParticipant(targetId, { stream: remoteStream, screenStream });
        },
        (candidate) => {
          socketService.emit('webrtc:ice-candidate', { targetId, candidate });
        },
        (connectionState) => {
          updateParticipant(targetId, { connectionState });
          if (connectionState === 'failed') showNotice('Không kết nối được âm thanh / hình ảnh',
            'Kết nối âm thanh/hình ảnh tới một người tham gia đã thất bại. Hãy tải lại phòng hoặc đổi mạng. Nếu lỗi vẫn còn, hãy báo cho người quản trị.');
        },
        (offer) => socketService.emit('webrtc:offer', { targetId, offer }),
        isPolite
      );

      if (isInitiator) {
        const offer = await webRTCManager.createOffer(targetId);
        if (offer) {
          socketService.emit('webrtc:offer', { targetId, offer });
        }
      }
    };

    // 1. Room Joined Callback
    const handleRoomJoined = (data: {
      roomId: string;
      roomCode: string;
      participant: Participant;
      participants: Participant[];
      currentQuestion?: Question;
      myAnswer?: any;
      statistics?: AnswerStatistics;
      isLocked?: boolean;
      hostSettings?: HostSettings;
      chatMessages?: ChatMessage[];
      timerEndsAt?: number | null;
      serverTime?: number;
      requireApproval?: boolean;
      answers?: UserAnswer[];
    }) => {
      setJoined(true);
      useMeetingStore.setState({
        joinStatus: 'joined', joinError: '', requireApproval: !!data.requireApproval,
        chatMessages: data.chatMessages || [], timerEndsAt: data.timerEndsAt || null,
        serverTimeOffset: (data.serverTime || Date.now()) - Date.now(),
      });
      setAnswersList(data.answers || []);
      setQuestionLocked(data.currentQuestion?.status === 'locked');
      if (!data.currentQuestion) setCurrentQuestion(null);
      setConnectionState('connected');
      useMeetingStore.setState({ isHost: data.participant.isHost });
      const { setMyParticipantId } = useMeetingStore.getState();
      setMyParticipantId(data.participant.id);
      setParticipants(data.participants);

      if (data.isLocked !== undefined) {
        setRoomLocked(data.isLocked);
      }
      if (data.hostSettings) handleHostSettingsUpdated({ settings: data.hostSettings });

      const media = useMeetingStore.getState();
      socketService.emit('media:toggle', { type: 'audio', enabled: media.audioEnabled });
      socketService.emit('media:toggle', { type: 'video', enabled: media.videoEnabled });
      socketService.emit('media:toggle', { type: 'screen', enabled: media.isScreenSharing });

      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
      }
      setSelectedAnswer(data.myAnswer || null);
      if (data.statistics) {
        setStatistics(data.statistics);
      }

      // Initialize WebRTC connections to existing participants
      data.participants.forEach((p) => {
        if (p.id !== data.participant.id) {
          void initPeerConnection(p.id, data.participant.id < p.id);
        }
      });
    };

    // 2. Participant Joined
    const handleParticipantJoined = ({ participant }: { participant: Participant }) => {
      if (!useMeetingStore.getState().joined) return;
      addParticipant(participant);
      addToast(`${participant.name} đã tham gia phòng`, 'info');
      const myId = socketService.id || useMeetingStore.getState().myParticipantId || '';
      void initPeerConnection(participant.id, myId < participant.id);
    };

    // 3. Participant Left
    const handleParticipantLeft = ({ userId, participant }: { userId: string; participant?: Participant }) => {
      removeParticipant(userId);
      webRTCManager.closePeerConnection(userId);
      const name = participant?.name || 'Người dùng';
      addToast(`${name} đã rời phòng`, 'info');
    };

    // 4. Participant Updated (Media toggle / host status / hand raise)
    const handleParticipantUpdated = ({ participant }: { participant: Participant }) => {
      const existing = useMeetingStore.getState().participants.get(participant.id);
      if (!existing?.handRaised && participant.handRaised) {
        // Play hand raise chime
        soundEffects.playHandRaise();
      }
      updateParticipant(participant.id, participant);
    };

    const handleDisconnect = () => {
      if (useMeetingStore.getState().joinStatus === 'error') return;
      setConnectionState('reconnecting');
      setJoined(false);
      useMeetingStore.setState({ joinStatus: 'connecting', waitingRequests: [] });
      webRTCManager.closeAll();
      void webRTCManager.updateScreenStream(useMeetingStore.getState().screenStream);
    };

    const handleConnect = () => {
      webRTCManager.closeAll();
      void webRTCManager.updateScreenStream(useMeetingStore.getState().screenStream);
    };

    // 5. Active Speaker Remote Indicator
    const handleSpeakerActive = ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      const myId = socketService.id || useMeetingStore.getState().myParticipantId;
      if (userId === myId) return;
      if (isSpeaking) {
        setActiveSpeaker(userId);
      } else {
        const currentSpeaker = useMeetingStore.getState().activeSpeakerId;
        if (currentSpeaker === userId) {
          setActiveSpeaker(null);
        }
      }
    };

    // 6. WebRTC Offer / Answer / ICE
    const handleOffer = async ({ senderId, offer }: { senderId: string; offer: RTCSessionDescriptionInit }) => {
      if (!useMeetingStore.getState().joined || !useMeetingStore.getState().participants.has(senderId)) return;
      if (!webRTCManager.hasPeerConnection(senderId)) {
        await initPeerConnection(senderId, false);
      }
      const answer = await webRTCManager.handleOffer(senderId, offer);
      if (answer) {
        socketService.emit('webrtc:answer', { targetId: senderId, answer });
      }
    };

    const handleAnswer = async ({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) => {
      await webRTCManager.handleAnswer(senderId, answer);
    };

    const handleIceCandidate = async ({ senderId, candidate }: { senderId: string; candidate: RTCIceCandidateInit }) => {
      await webRTCManager.addIceCandidate(senderId, candidate);
    };

    // 7. Chat Message
    const handleChatMessage = (msg: ChatMessage) => {
      addChatMessage(msg);
    };
    const handleChatError = ({ message }: { message: string }) => addToast(message, 'warning');

    // 8. Reactions
    const handleReactionReceived = (reaction: ReactionItem) => {
      soundEffects.playReaction();
      addReaction(reaction);
    };

    // 9. Classroom Q&A Events
    const handleQuestionStarted = ({ question, statistics }: { question: Question; statistics: AnswerStatistics }) => {
      setCurrentQuestion(question);
      setAnswersList([]);
      setSelectedAnswer(null);
      setQuestionLocked(false);
      setStatistics(statistics);
      addToast('Giáo viên đã bắt đầu một câu hỏi mới!', 'info');
    };

    const handleClassroomStats = ({
      statistics,
      answers,
      latestAnswer,
    }: {
      statistics: AnswerStatistics;
      answers: UserAnswer[];
      latestAnswer?: UserAnswer;
    }) => {
      setStatistics(statistics);
      setAnswersList(answers);

      const myId = socketService.id || useMeetingStore.getState().myParticipantId;
      if (latestAnswer && latestAnswer.userId === myId) {
        setSelectedAnswer(latestAnswer.answer);
      }
    };

    const handleQuestionLocked = () => {
      setQuestionLocked(true);
      addToast('⏱ Câu hỏi đã được khóa!', 'warning');
    };

    const handleQuestionUnlocked = () => {
      setQuestionLocked(false);
      addToast('Câu hỏi đã được mở lại.', 'info');
    };
    const handleQuestionResetted = ({ question, statistics }: { question: Question; statistics: AnswerStatistics }) => {
      setCurrentQuestion(question);
      resetQuestionState();
      setStatistics(statistics);
      addToast('🔄 Giáo viên đã reset câu hỏi. Bạn có thể trả lời lại!', 'info');
    };

    // 10. Host Actions & Moderation
    const handleMutedByHost = () => {
      soundEffects.playMuteAlert();
      const stream = useMeetingStore.getState().localStream;
      if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
      setAudioEnabled(false);
      socketService.emit('media:toggle', { type: 'audio', enabled: false });
      socketService.emit('speaker:active', { isSpeaking: false });
      addToast('Bạn đã bị chủ phòng tắt micro', 'warning');
    };

    const handleHandsLowered = () => {
      setPreferences({ handRaised: false });
      socketService.emit('media:toggle', { type: 'hand', enabled: false });
      addToast('Giáo viên đã hạ tay tất cả học sinh', 'info');
    };

    const handleRoomLocked = ({ isLocked }: { isLocked: boolean }) => {
      setRoomLocked(isLocked);
      addToast(
        isLocked
          ? '🔒 Giáo viên đã khóa phòng học'
          : '🔓 Giáo viên đã mở khóa phòng học',
        'info'
      );
    };

    const handleHostSettingsUpdated = ({ settings }: { settings: HostSettings }) => {
      setHostSettings(settings);
      const { isHost } = useMeetingStore.getState();
      if (!isHost) {
        if (!settings.allowScreenShare && useMeetingStore.getState().isScreenSharing) {
          const screen = useMeetingStore.getState().screenStream;
          useMeetingStore.getState().setScreenSharing(false, null);
          screen?.getTracks().forEach(t => { t.onended = null; t.stop(); });
          void webRTCManager.updateScreenStream(null);
          socketService.emit('media:toggle', { type: 'screen', enabled: false });
        }
        if (!settings.allowMic && useMeetingStore.getState().audioEnabled) {
          setAudioEnabled(false);
          const track = useMeetingStore.getState().localStream?.getAudioTracks()[0];
          if (track) track.enabled = false;
          socketService.emit('media:toggle', { type: 'audio', enabled: false });
          addToast('Chủ phòng đã khóa quyền bật micro', 'warning');
        }
        if (!settings.allowVideo && useMeetingStore.getState().videoEnabled) {
          setVideoEnabled(false);
          const track = useMeetingStore.getState().localStream?.getVideoTracks()[0];
          if (track) track.enabled = false;
          socketService.emit('media:toggle', { type: 'video', enabled: false });
          addToast('Chủ phòng đã khóa quyền bật camera', 'warning');
        }
      }
    };

    const handleRoomError = ({ message }: { message: string }) => {
      setJoined(false);
      setConnectionState('disconnected');
      useMeetingStore.setState({ joinStatus: 'error', joinError: message });
      webRTCManager.closeAll();
      stopAllMedia();
    };
    const handleTimer = ({ endsAt, serverTime, completed }: { endsAt: number | null; serverTime: number; completed?: boolean }) => {
      useMeetingStore.setState({ timerEndsAt: endsAt, serverTimeOffset: serverTime - Date.now() });
      if (completed) addToast('Đã hết thời gian làm bài.', 'info');
    };
    const handleWaiting = () => {
      setJoined(false);
      useMeetingStore.setState({ joinStatus: 'waiting' });
    };
    const handleWaitingList = ({ requests }: { requests: { id: string; name: string; requestedAt: number }[] }) => {
      useMeetingStore.setState({ waitingRequests: requests });
    };
    const handleAdmissionMode = ({ requireApproval }: { requireApproval: boolean }) => useMeetingStore.setState({ requireApproval });
    const handleSessionReplaced = () => handleRoomError({ message: 'Phiên này đã được mở ở tab khác. Hãy tiếp tục ở tab mới.' });
    const handleConnectError = () => {
      useMeetingStore.setState({ joinStatus: 'connecting', joinError: 'Không kết nối được máy chủ. Đang thử lại…' });
    };

    const handleRemovedByHost = () => {
      handleRoomError({ message: 'Bạn đã bị mời ra khỏi phòng học.' });
      socketService.disconnect();
    };

    // Bind Listeners
    socketService.on('timer:updated', handleTimer);
    socketService.on('room:waiting', handleWaiting);
    socketService.on('room:waiting-list', handleWaitingList);
    socketService.on('room:admission-mode', handleAdmissionMode);
    socketService.on('room:session-replaced', handleSessionReplaced);
    socketService.on('connect_error', handleConnectError);
    socketService.on('room:joined', handleRoomJoined);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect', handleConnect);
    socketService.on('participant:joined', handleParticipantJoined);
    socketService.on('participant:left', handleParticipantLeft);
    socketService.on('participant:updated', handleParticipantUpdated);
    socketService.on('speaker:active', handleSpeakerActive);

    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice-candidate', handleIceCandidate);

    socketService.on('chat:message', handleChatMessage);
    socketService.on('chat:error', handleChatError);
    socketService.on('reaction:received', handleReactionReceived);

    socketService.on('question:started', handleQuestionStarted);
    socketService.on('classroom:statistics', handleClassroomStats);
    socketService.on('question:locked', handleQuestionLocked);
    socketService.on('question:unlocked', handleQuestionUnlocked);
    socketService.on('question:resetted', handleQuestionResetted);

    socketService.on('host:muted-by-host', handleMutedByHost);
    socketService.on('host:hands-lowered', handleHandsLowered);
    socketService.on('room:locked', handleRoomLocked);
    socketService.on('host:settings-updated', handleHostSettingsUpdated);
    socketService.on('room:error', handleRoomError);
    socketService.on('host:removed-by-host', handleRemovedByHost);

    // Emit room:join event now that listeners are bound
    const state = useMeetingStore.getState();
    const joinTimer = setTimeout(
      () =>
        socketService.emit('room:join', {
          roomId,
          userName: userName || 'Học sinh',
          identityToken: getIdentityToken(),
          hostToken: getHostToken(roomId),
          audioEnabled: state.audioEnabled,
          videoEnabled: state.videoEnabled,
        }),
      0
    );

    return () => {
      disposed = true;
      clearTimeout(joinTimer);
      socketService.off('timer:updated', handleTimer);
      socketService.off('room:waiting', handleWaiting);
      socketService.off('room:waiting-list', handleWaitingList);
      socketService.off('room:admission-mode', handleAdmissionMode);
      socketService.off('room:session-replaced', handleSessionReplaced);
      socketService.off('connect_error', handleConnectError);
      socketService.off('room:joined', handleRoomJoined);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect', handleConnect);
      socketService.off('participant:joined', handleParticipantJoined);
      socketService.off('participant:left', handleParticipantLeft);
      socketService.off('participant:updated', handleParticipantUpdated);
      socketService.off('speaker:active', handleSpeakerActive);

      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice-candidate', handleIceCandidate);

      socketService.off('chat:message', handleChatMessage);
      socketService.off('chat:error', handleChatError);
      socketService.off('reaction:received', handleReactionReceived);

      socketService.off('question:started', handleQuestionStarted);
      socketService.off('classroom:statistics', handleClassroomStats);
      socketService.off('question:locked', handleQuestionLocked);
      socketService.off('question:unlocked', handleQuestionUnlocked);
      socketService.off('question:resetted', handleQuestionResetted);

      socketService.off('host:muted-by-host', handleMutedByHost);
      socketService.off('host:hands-lowered', handleHandsLowered);
      socketService.off('room:locked', handleRoomLocked);
      socketService.off('host:settings-updated', handleHostSettingsUpdated);
      socketService.off('room:error', handleRoomError);
      socketService.off('host:removed-by-host', handleRemovedByHost);
    };
  }, [roomId]);
}

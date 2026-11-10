import { useEffect } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { useClassroomStore } from '../store/classroomStore';
import { socketService } from '../services/socket';
import { webRTCManager } from '../services/webrtc';
import { Participant, ChatMessage, ReactionItem } from '../types/meeting';
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
    addReaction,
    setPreferences,
    setRoomLocked,
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

    const { userName, isHost } = useMeetingStore.getState();

    // Helper: Initialize RTCPeerConnection with current local stream and polite peer logic
    const initPeerConnection = async (targetId: string, isInitiator: boolean) => {
      if (webRTCManager.hasPeerConnection(targetId)) return;
      const currentStream = useMeetingStore.getState().localStream;
      const myId = socketService.id || useMeetingStore.getState().myParticipantId || '';
      const isPolite = myId < targetId;

      webRTCManager.createPeerConnection(
        targetId,
        currentStream,
        (remoteStream, screenStream) => {
          updateParticipant(targetId, { stream: remoteStream, screenStream });
        },
        (candidate) => {
          socketService.emit('webrtc:ice-candidate', { targetId, candidate });
        },
        (connectionState) => updateParticipant(targetId, { connectionState }),
        isPolite
          ? (offer) => socketService.emit('webrtc:offer', { targetId, offer })
          : undefined,
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
      whiteboardDataUrl?: string;
      isLocked?: boolean;
    }) => {
      setJoined(true);
      setConnectionState('connected');
      useMeetingStore.setState({ isHost: data.participant.isHost });
      const { setMyParticipantId } = useMeetingStore.getState();
      setMyParticipantId(data.participant.id);
      setParticipants(data.participants);

      if (data.isLocked !== undefined) {
        setRoomLocked(data.isLocked);
      }

      const media = useMeetingStore.getState();
      socketService.emit('media:toggle', { type: 'audio', enabled: media.audioEnabled });
      socketService.emit('media:toggle', { type: 'video', enabled: media.videoEnabled });
      socketService.emit('media:toggle', { type: 'screen', enabled: media.isScreenSharing });

      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
      }
      if (data.myAnswer) {
        setSelectedAnswer(data.myAnswer);
      }
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
      updateParticipant(participant.id, participant);
    };

    const handleDisconnect = () => {
      setConnectionState('reconnecting');
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

    // 8. Reactions
    const handleReactionReceived = (reaction: ReactionItem) => {
      addReaction(reaction);
    };

    // 9. Classroom Q&A Events
    const handleQuestionStarted = ({ question, statistics }: { question: Question; statistics: AnswerStatistics }) => {
      setCurrentQuestion(question);
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

    const handleQuestionResetted = ({ question, statistics }: { question: Question; statistics: AnswerStatistics }) => {
      setCurrentQuestion(question);
      resetQuestionState();
      setStatistics(statistics);
      addToast('🔄 Giáo viên đã reset câu hỏi. Bạn có thể trả lời lại!', 'info');
    };

    // 10. Host Actions & Moderation
    const handleMutedByHost = () => {
      const stream = useMeetingStore.getState().localStream;
      if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
      setAudioEnabled(false);
      socketService.emit('media:toggle', { type: 'audio', enabled: false });
      socketService.emit('speaker:active', { isSpeaking: false });
      addToast('Bạn đã bị giáo viên tắt micro', 'warning');
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

    const handleRoomError = ({ message }: { message: string }) => {
      addToast(message, 'error');
    };

    const handleRemovedByHost = () => {
      addToast('Bạn đã bị mời ra khỏi phòng học', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    };

    // Bind Listeners
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
    socketService.on('reaction:received', handleReactionReceived);

    socketService.on('question:started', handleQuestionStarted);
    socketService.on('classroom:statistics', handleClassroomStats);
    socketService.on('question:locked', handleQuestionLocked);
    socketService.on('question:resetted', handleQuestionResetted);

    socketService.on('host:muted-by-host', handleMutedByHost);
    socketService.on('host:hands-lowered', handleHandsLowered);
    socketService.on('room:locked', handleRoomLocked);
    socketService.on('room:error', handleRoomError);
    socketService.on('host:removed-by-host', handleRemovedByHost);

    // Emit room:join event now that listeners are bound
    const state = useMeetingStore.getState();
    const joinTimer = setTimeout(
      () =>
        socketService.emit('room:join', {
          roomId,
          userName: userName || 'Học sinh',
          isHost: isHost || false,
          audioEnabled: state.audioEnabled,
          videoEnabled: state.videoEnabled,
        }),
      0
    );

    return () => {
      clearTimeout(joinTimer);
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
      socketService.off('reaction:received', handleReactionReceived);

      socketService.off('question:started', handleQuestionStarted);
      socketService.off('classroom:statistics', handleClassroomStats);
      socketService.off('question:locked', handleQuestionLocked);
      socketService.off('question:resetted', handleQuestionResetted);

      socketService.off('host:muted-by-host', handleMutedByHost);
      socketService.off('host:hands-lowered', handleHandsLowered);
      socketService.off('room:locked', handleRoomLocked);
      socketService.off('room:error', handleRoomError);
      socketService.off('host:removed-by-host', handleRemovedByHost);
    };
  }, [roomId]);
}

import { useEffect } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { useClassroomStore } from '../store/classroomStore';
import { socketService } from '../services/socket';
import { webRTCManager } from '../services/webrtc';
import { Participant, ChatMessage } from '../types/meeting';
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
    localStream,
    setAudioEnabled,
  } = useMeetingStore();

  const {
    setCurrentQuestion,
    setSelectedAnswer,
    setQuestionLocked,
    setStatistics,
    setAnswersList,
    addOrUpdateUserAnswer,
    resetQuestionState,
  } = useClassroomStore();

  useEffect(() => {
    if (!roomId) return;

    socketService.connect();
    setConnectionState('connected');

    const { userName, isHost } = useMeetingStore.getState();

    // 1. Room Joined Callback
    const handleRoomJoined = (data: {
      roomId: string;
      roomCode: string;
      participant: Participant;
      participants: Participant[];
      currentQuestion?: Question;
      myAnswer?: any;
      statistics?: AnswerStatistics;
    }) => {
      setJoined(true);
      const { setMyParticipantId } = useMeetingStore.getState();
      setMyParticipantId(data.participant.id);
      setParticipants(data.participants);

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
          initPeerConnection(p.id, true);
        }
      });
    };

    // Helper: Initialize RTCPeerConnection
    const initPeerConnection = async (targetId: string, isInitiator: boolean) => {
      const pc = webRTCManager.createPeerConnection(
        targetId,
        localStream,
        (remoteStream) => {
          updateParticipant(targetId, { stream: remoteStream });
        },
        (candidate) => {
          socketService.emit('webrtc:ice-candidate', { targetId, candidate });
        }
      );

      if (isInitiator) {
        const offer = await webRTCManager.createOffer(targetId);
        if (offer) {
          socketService.emit('webrtc:offer', { targetId, offer });
        }
      }
    };

    // 2. Participant Joined
    const handleParticipantJoined = ({ participant }: { participant: Participant }) => {
      addParticipant(participant);
      addToast(`${participant.name} đã tham gia phòng`, 'info');
      initPeerConnection(participant.id, false);
    };

    // 3. Participant Left
    const handleParticipantLeft = ({ userId, participant }: { userId: string; participant?: Participant }) => {
      removeParticipant(userId);
      webRTCManager.closePeerConnection(userId);
      const name = participant?.name || 'Người dùng';
      addToast(`${name} đã rời phòng`, 'info');
    };

    // 4. Participant Updated (Media toggle / host status)
    const handleParticipantUpdated = ({ participant }: { participant: Participant }) => {
      updateParticipant(participant.id, participant);
    };

    // 5. WebRTC Offer / Answer / ICE
    const handleOffer = async ({ senderId, offer }: { senderId: string; offer: RTCSessionDescriptionInit }) => {
      const answer = await webRTCManager.handleOffer(senderId, offer);
      if (answer) {
        socket.emit('webrtc:answer', { targetId: senderId, answer });
      }
    };

    const handleAnswer = async ({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) => {
      await webRTCManager.handleAnswer(senderId, answer);
    };

    const handleIceCandidate = async ({ senderId, candidate }: { senderId: string; candidate: RTCIceCandidateInit }) => {
      await webRTCManager.addIceCandidate(senderId, candidate);
    };

    // 6. Chat Message
    const handleChatMessage = (msg: ChatMessage) => {
      addChatMessage(msg);
    };

    // 7. Classroom Q&A Events
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

      if (latestAnswer && latestAnswer.userId === socket.id) {
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

    // 8. Host Actions
    const handleMutedByHost = () => {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = false;
      }
      setAudioEnabled(false);
      socketService.emit('media:toggle', { type: 'audio', enabled: false });
      addToast('Bạn đã bị giáo viên tắt micro', 'warning');
    };

    const handleRemovedByHost = () => {
      addToast('Bạn đã bị mời ra khỏi phòng học', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    };

    // Bind Listeners
    socketService.on('room:joined', handleRoomJoined);
    socketService.on('participant:joined', handleParticipantJoined);
    socketService.on('participant:left', handleParticipantLeft);
    socketService.on('participant:updated', handleParticipantUpdated);

    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice-candidate', handleIceCandidate);

    socketService.on('chat:message', handleChatMessage);

    socketService.on('question:started', handleQuestionStarted);
    socketService.on('classroom:statistics', handleClassroomStats);
    socketService.on('question:locked', handleQuestionLocked);
    socketService.on('question:resetted', handleQuestionResetted);

    socketService.on('host:muted-by-host', handleMutedByHost);
    socketService.on('host:removed-by-host', handleRemovedByHost);

    // Emit room:join event now that listeners are bound
    socketService.emit('room:join', {
      roomId,
      userName: userName || 'Học sinh',
      isHost: isHost || false,
    });

    return () => {
      socketService.off('room:joined', handleRoomJoined);
      socketService.off('participant:joined', handleParticipantJoined);
      socketService.off('participant:left', handleParticipantLeft);
      socketService.off('participant:updated', handleParticipantUpdated);

      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice-candidate', handleIceCandidate);

      socketService.off('chat:message', handleChatMessage);

      socketService.off('question:started', handleQuestionStarted);
      socketService.off('classroom:statistics', handleClassroomStats);
      socketService.off('question:locked', handleQuestionLocked);
      socketService.off('question:resetted', handleQuestionResetted);

      socketService.off('host:muted-by-host', handleMutedByHost);
      socketService.off('host:removed-by-host', handleRemovedByHost);
    };
  }, [roomId, localStream]);
}

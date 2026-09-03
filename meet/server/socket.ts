import { Server, Socket } from 'socket.io';
import { roomManager } from './rooms.js';
import { classroomManager } from './classroom.js';
import { Participant, AnswerOption } from './types.js';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // 1. Join Room
    socket.on('room:join', ({ roomId, userName, isHost }: { roomId: string; userName: string; isHost?: boolean }) => {
      const room = roomManager.getRoom(roomId) || roomManager.createRoom(roomId, roomId, socket.id, true);
      currentRoomId = room.id;
      currentUserId = socket.id;

      const participant: Participant = {
        id: socket.id,
        socketId: socket.id,
        name: userName || 'Khách',
        audioEnabled: true,
        videoEnabled: true,
        isHost: isHost || room.participants.size === 0,
        isSpeaking: false,
        joinedAt: Date.now(),
      };

      roomManager.addParticipant(room.id, participant);
      socket.join(room.id);

      // Send existing room state to joining participant
      const existingParticipants = Array.from(room.participants.values());
      const currentAnswers = Array.from(room.answers.values());
      const stats = classroomManager.calculateStatistics(room);

      socket.emit('room:joined', {
        roomId: room.id,
        roomCode: room.code,
        participant,
        participants: existingParticipants,
        currentQuestion: room.currentQuestion,
        myAnswer: room.answers.get(socket.id)?.answer,
        statistics: stats,
      });

      // Notify others in room
      socket.to(room.id).emit('participant:joined', { participant });
    });

    // 2. Media Toggle (Mic / Camera)
    socket.on('media:toggle', ({ type, enabled }: { type: 'audio' | 'video'; enabled: boolean }) => {
      if (!currentRoomId || !currentUserId) return;
      const updated = roomManager.updateMediaState(currentRoomId, currentUserId, type, enabled);
      if (updated) {
        io.to(currentRoomId).emit('participant:updated', { participant: updated });
      }
    });

    // 3. WebRTC Signaling (Offer, Answer, ICE Candidate)
    socket.on('webrtc:offer', ({ targetId, offer }: { targetId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(targetId).emit('webrtc:offer', { senderId: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ targetId, answer }: { targetId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(targetId).emit('webrtc:answer', { senderId: socket.id, answer });
    });

    socket.on('webrtc:ice-candidate', ({ targetId, candidate }: { targetId: string; candidate: RTCIceCandidateInit }) => {
      io.to(targetId).emit('webrtc:ice-candidate', { senderId: socket.id, candidate });
    });

    // 4. Chat Message
    socket.on('chat:message', ({ text }: { text: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const sender = room?.participants.get(currentUserId);
      if (!sender) return;

      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        senderId: currentUserId,
        senderName: sender.name,
        text,
        timestamp: Date.now(),
      };

      io.to(currentRoomId).emit('chat:message', messagePayload);
    });

    // 5. Classroom System Events
    socket.on('question:create', ({ text, options }: { text: string; options: { A: string; B: string; C: string; D: string } }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const participant = room?.participants.get(currentUserId);
      if (!room || !participant?.isHost) return;

      const question = classroomManager.createQuestion(room, text, options);
      const stats = classroomManager.calculateStatistics(room);

      io.to(room.id).emit('question:started', { question, statistics: stats });
    });

    socket.on('classroom:answer', ({ answer }: { answer: AnswerOption }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const participant = room?.participants.get(currentUserId);
      if (!room || !participant) return;

      const res = classroomManager.submitAnswer(room, participant.id, participant.name, answer);
      if (res) {
        // Broadcast updated statistics and detailed answer list to room
        const answersList = Array.from(room.answers.values());
        io.to(room.id).emit('classroom:statistics', {
          statistics: res.statistics,
          answers: answersList,
          latestAnswer: res.answerObj,
        });
      }
    });

    socket.on('question:lock', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const participant = room?.participants.get(currentUserId);
      if (!room || !participant?.isHost) return;

      if (classroomManager.lockQuestion(room)) {
        io.to(room.id).emit('question:locked', { roomId: room.id });
      }
    });

    socket.on('question:reset', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const participant = room?.participants.get(currentUserId);
      if (!room || !participant?.isHost) return;

      if (classroomManager.resetQuestion(room)) {
        const stats = classroomManager.calculateStatistics(room);
        io.to(room.id).emit('question:resetted', {
          question: room.currentQuestion,
          statistics: stats,
        });
      }
    });

    // 6. Host Privileges (Mute, Remove)
    socket.on('host:mute-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      io.to(targetId).emit('host:muted-by-host');
    });

    socket.on('host:remove-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      io.to(targetId).emit('host:removed-by-host');
    });

    // 7. Disconnect / Leave
    socket.on('disconnect', () => {
      if (!currentRoomId || !currentUserId) return;
      const { room, removed } = roomManager.removeParticipant(currentRoomId, currentUserId);
      if (room && removed) {
        io.to(room.id).emit('participant:left', { userId: currentUserId, participant: removed });
      }
    });
  });
}

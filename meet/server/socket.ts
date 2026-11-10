import { Server, Socket } from 'socket.io';
import { roomManager } from './rooms.js';
import { classroomManager } from './classroom.js';
import { Participant, AnswerOption, WhiteboardStroke } from './types.js';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // 1. Join Room
    socket.on('room:join', ({ roomId, userName, isHost, audioEnabled, videoEnabled }: {
      roomId: string;
      userName: string;
      isHost?: boolean;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    }) => {
      if (currentRoomId === roomManager.getRoom(roomId)?.id && currentUserId === socket.id) return;
      const room = roomManager.getRoom(roomId) || roomManager.createRoom(roomId, roomId, socket.id, true);

      // Check if room is locked
      if (room.isLocked && room.hostId !== socket.id && room.participants.size > 0 && !isHost) {
        socket.emit('room:error', { message: 'Phòng học hiện đang bị khóa bởi giáo viên.' });
        return;
      }

      currentRoomId = room.id;
      currentUserId = socket.id;

      const participant: Participant = {
        id: socket.id,
        socketId: socket.id,
        name: userName || 'Khách',
        audioEnabled: audioEnabled !== undefined ? audioEnabled : true,
        videoEnabled: videoEnabled !== undefined ? videoEnabled : true,
        isHost: room.hostId === socket.id || room.participants.size === 0,
        isSpeaking: false,
        joinedAt: Date.now(),
      };

      roomManager.addParticipant(room.id, participant);
      socket.join(room.id);

      // Send existing room state to joining participant
      const existingParticipants = Array.from(room.participants.values());
      const stats = classroomManager.calculateStatistics(room);

      socket.emit('room:joined', {
        roomId: room.id,
        roomCode: room.code,
        participant,
        participants: existingParticipants,
        currentQuestion: room.currentQuestion,
        myAnswer: room.answers.get(socket.id)?.answer,
        statistics: stats,
        whiteboardDataUrl: room.whiteboardDataUrl,
        isLocked: room.isLocked || false,
      });

      // Notify others in room
      socket.to(room.id).emit('participant:joined', { participant });
    });

    // 2. Media Toggle (Mic / Camera / Screen / Hand)
    socket.on('media:toggle', ({ type, enabled }: { type: 'audio' | 'video' | 'screen' | 'hand'; enabled: boolean }) => {
      if (!currentRoomId || !currentUserId) return;
      const updated = roomManager.updateMediaState(currentRoomId, currentUserId, type, enabled);
      if (updated) {
        io.to(currentRoomId).emit('participant:updated', { participant: updated });
      }
    });

    // 2b. Speaker Active (Audio level threshold)
    socket.on('speaker:active', ({ isSpeaking }: { isSpeaking: boolean }) => {
      if (!currentRoomId || !currentUserId) return;
      socket.to(currentRoomId).emit('speaker:active', { userId: currentUserId, isSpeaking });
    });

    // 3. WebRTC Signaling (Offer, Answer, ICE Candidate)
    socket.on('webrtc:offer', ({ targetId, offer }: { targetId: string; offer: RTCSessionDescriptionInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
      io.to(targetId).emit('webrtc:offer', { senderId: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ targetId, answer }: { targetId: string; answer: RTCSessionDescriptionInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
      io.to(targetId).emit('webrtc:answer', { senderId: socket.id, answer });
    });

    socket.on('webrtc:ice-candidate', ({ targetId, candidate }: { targetId: string; candidate: RTCIceCandidateInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
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

    // 5. Collaborative Whiteboard Events
    socket.on('whiteboard:draw', (stroke: WhiteboardStroke) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('whiteboard:draw', stroke);
    });

    socket.on('whiteboard:clear', () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (room) room.whiteboardDataUrl = undefined;
      socket.to(currentRoomId).emit('whiteboard:clear');
    });

    socket.on('whiteboard:save', ({ dataUrl }: { dataUrl: string }) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (room) room.whiteboardDataUrl = dataUrl;
    });

    socket.on('whiteboard:get', () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (room?.whiteboardDataUrl) {
        socket.emit('whiteboard:sync', { dataUrl: room.whiteboardDataUrl });
      }
    });

    // 6. Live Interactive Reactions
    socket.on('reaction:send', ({ emoji }: { emoji: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const sender = room?.participants.get(currentUserId);
      if (!sender) return;

      const reactionPayload = {
        id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserId,
        senderName: sender.name,
        emoji,
        timestamp: Date.now(),
      };

      io.to(currentRoomId).emit('reaction:received', reactionPayload);
    });

    // 7. Classroom System Events
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

    // 8. Host Moderation Privileges
    socket.on('host:mute-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;
      if (!room.participants.has(targetId)) return;

      io.to(targetId).emit('host:muted-by-host');
    });

    socket.on('host:mute-all', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      socket.to(currentRoomId).emit('host:muted-by-host');
    });

    socket.on('host:lower-all-hands', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      room.participants.forEach((p) => {
        p.handRaised = false;
      });
      io.to(currentRoomId).emit('host:hands-lowered');
    });

    socket.on('host:lock-room', ({ locked }: { locked: boolean }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      room.isLocked = locked;
      io.to(currentRoomId).emit('room:locked', { isLocked: locked });
    });

    socket.on('host:remove-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;
      if (!room.participants.has(targetId)) return;

      io.to(targetId).emit('host:removed-by-host');
    });

    // 9. Disconnect / Leave
    socket.on('disconnect', () => {
      if (!currentRoomId || !currentUserId) return;
      const { room, removed } = roomManager.removeParticipant(currentRoomId, currentUserId);
      if (room && removed) {
        io.to(room.id).emit('participant:left', { userId: currentUserId, participant: removed });
        const host = room.participants.get(room.hostId);
        if (host) io.to(room.id).emit('participant:updated', { participant: host });
      }
    });
  });
}

import { Server, Socket } from 'socket.io';
import { roomManager, RoomRecoveryState } from './rooms.js';
import { classroomManager } from './classroom.js';
import { Participant, AnswerOption, WhiteboardStroke, HostSettings } from './types.js';
import { hashToken, validToken } from './identity.js';

interface JoinPayload { roomId: string; userName: string; identityToken: string; hostToken?: string; roomRecovery?: RoomRecoveryState; audioEnabled?: boolean; videoEnabled?: boolean }
const publicParticipant = (p: Participant) => {
  const { identityHash: _privateIdentity, ...data } = p;
  return data;
};

export function setupSocketHandlers(io: Server) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const waiting = new Map<string, { socket: Socket; roomId: string; payload: JoinPayload; requestedAt: number; admit: (payload: JoinPayload) => void }>();
  const publishRecoveryState = (room: NonNullable<ReturnType<typeof roomManager.getRoom>>) => {
    if (room.hostId) io.to(room.hostId).emit('room:recovery-state', {
      isLocked: !!room.isLocked, requireApproval: !!room.requireApproval, hostSettings: room.hostSettings,
      kickedUserIds: [...(room.kickedUserIds || [])], approvedUserIds: [...room.approvedUserIds],
    });
  };
  const broadcastWaiting = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (room?.hostId) io.to(room.hostId).emit('room:waiting-list', {
      requests: [...waiting.values()].filter(r => r.roomId === room.id)
        .map(r => ({ id: r.socket.id, name: r.payload.userName, requestedAt: r.requestedAt })),
    });
  };
  io.on('connection', (socket: Socket) => {
    const noPayloadEvents = new Set(['host:mute-all', 'host:lower-all-hands', 'question:lock', 'question:unlock', 'question:reset', 'whiteboard:clear', 'whiteboard:get']);
    socket.use(([event, payload], next) => {
      if (!noPayloadEvents.has(event) && (!payload || typeof payload !== 'object' || Array.isArray(payload))) return next(new Error('Invalid event payload'));
      next();
    });
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    const admit = (payload: JoinPayload) => {
      const room = roomManager.getRoom(payload.roomId);
      if (!room || !socket.connected) return;
      const identityHash = hashToken(payload.identityToken);
      const isOwner = validToken(payload.hostToken) && hashToken(payload.hostToken) === room.ownerTokenHash;
      if (!isOwner && room.kickedUserIds?.has(identityHash)) {
        socket.emit('room:error', { message: 'Bạn đã bị mời ra khỏi phòng học này.' }); return;
      }
      currentRoomId = room.id;
      currentUserId = socket.id;

      const participant: Participant = {
        id: socket.id,
        socketId: socket.id,
        identityHash,
        name: payload.userName.trim().slice(0, 80) || 'Khách',
        audioEnabled: !!payload.audioEnabled && (isOwner || !!room.hostSettings?.allowMic),
        videoEnabled: !!payload.videoEnabled && (isOwner || !!room.hostSettings?.allowVideo),
        isHost: isOwner,
        isSpeaking: false,
        joinedAt: Date.now(),
      };

      const previousAnswer = room.answersByIdentity?.get(identityHash);
      if (previousAnswer) room.answers.set(participant.id, { ...previousAnswer, userId: participant.id, userName: participant.name });
      room.approvedUserIds.add(identityHash);
      roomManager.persist();
      const { duplicateRemoved } = roomManager.addParticipant(room.id, participant);
      if (duplicateRemoved) {
        // Broadcast leave event for old ghost socket on page reload
        io.to(room.id).emit('participant:left', { userId: duplicateRemoved.id, participant: publicParticipant(duplicateRemoved) });
        const old = io.sockets.sockets.get(duplicateRemoved.socketId);
        old?.emit('room:session-replaced');
        old?.disconnect(true);
      }

      socket.join(room.id);
      waiting.delete(socket.id);

      // Send existing room state to joining participant
      const existingParticipants = Array.from(room.participants.values()).map(publicParticipant);
      const stats = classroomManager.calculateStatistics(room);

      socket.emit('room:joined', {
        roomId: room.id,
        roomCode: room.code,
        participant: publicParticipant(participant),
        participants: existingParticipants,
        currentQuestion: room.currentQuestion,
        myAnswer: room.answers.get(socket.id)?.answer,
        statistics: stats,
        isLocked: room.isLocked || false,
        hostSettings: room.hostSettings,
        requireApproval: !!room.requireApproval,
        chatMessages: room.messages || [],
        timerEndsAt: room.timerEndsAt || null, serverTime: Date.now(),
        answers: [...room.answers.values()],
      });

      // Notify others in room
      socket.to(room.id).emit('participant:joined', { participant: publicParticipant(participant) });
      publishRecoveryState(room);
      broadcastWaiting(room.id);
      io.to(room.id).emit('classroom:statistics', { statistics: classroomManager.calculateStatistics(room), answers: [...room.answers.values()] });
    };
    socket.on('room:join', (payload: JoinPayload) => {
      if (!payload || typeof payload.roomId !== 'string' || typeof payload.userName !== 'string' || !validToken(payload.identityToken)) {
        socket.emit('room:error', { message: 'Thông tin tham gia phòng không hợp lệ.' }); return;
      }
      if (currentRoomId) return;
      const room = roomManager.getRoom(payload.roomId) || roomManager.restoreOwnedRoom(payload.roomId, payload.hostToken, payload.roomRecovery);
      if (!room) { socket.emit('room:error', { message: 'Phòng không tồn tại hoặc máy chủ vừa khởi động lại. Nếu đây là link đúng, hãy nhờ chủ phòng mở lại link trước.' }); return; }
      const identityHash = hashToken(payload.identityToken);
      const isOwner = validToken(payload.hostToken) && hashToken(payload.hostToken) === room.ownerTokenHash;
      if (!isOwner && room.kickedUserIds?.has(identityHash)) {
        socket.emit('room:error', { message: 'Bạn đã bị mời ra khỏi phòng học này.' }); return;
      }
      if (!isOwner && room.isLocked && !room.approvedUserIds.has(identityHash)) {
        socket.emit('room:error', { message: 'Phòng học hiện đang bị khóa bởi giáo viên.' }); return;
      }
      if (!isOwner && room.requireApproval && !room.approvedUserIds.has(identityHash)) {
        waiting.set(socket.id, { socket, roomId: room.id, payload, requestedAt: Date.now(), admit });
        socket.emit('room:waiting', { message: 'Đang chờ chủ phòng duyệt yêu cầu tham gia.' });
        broadcastWaiting(room.id); return;
      }
      admit(payload);
    });
    socket.on('host:admission-mode', ({ required }: { required: boolean }) => {
      const room = currentRoomId ? roomManager.getRoom(currentRoomId) : undefined;
      if (!room || !room.participants.get(socket.id)?.isHost || typeof required !== 'boolean') return;
      room.requireApproval = required;
      roomManager.persist();
      publishRecoveryState(room);
      io.to(room.id).emit('room:admission-mode', { requireApproval: required });
    });
    socket.on('host:admission-decide', ({ requestId, approved }: { requestId: string; approved: boolean }) => {
      const room = currentRoomId ? roomManager.getRoom(currentRoomId) : undefined;
      if (!room || !room.participants.get(socket.id)?.isHost || typeof approved !== 'boolean') return;
      const request = waiting.get(requestId);
      if (!request || request.roomId !== room.id) return;
      waiting.delete(requestId);
      if (approved && !room.isLocked) request.admit(request.payload);
      else request.socket.emit('room:error', { message: room.isLocked ? 'Phòng đã khóa. Yêu cầu tham gia đã bị hủy.' : 'Chủ phòng đã từ chối yêu cầu tham gia.' });
      broadcastWaiting(room.id);
    });

    socket.on('host:timer', ({ minutes }: { minutes: number | null }) => {
      const room = currentRoomId ? roomManager.getRoom(currentRoomId) : undefined;
      if (!room?.participants.get(socket.id)?.isHost || (minutes !== null && ![1, 3, 5, 10].includes(minutes))) return;
      clearTimeout(timers.get(room.id));
      room.timerEndsAt = minutes === null ? null : Date.now() + minutes * 60000;
      io.to(room.id).emit('timer:updated', { endsAt: room.timerEndsAt, serverTime: Date.now() });
      if (minutes !== null) timers.set(room.id, setTimeout(() => {
        room.timerEndsAt = null;
        timers.delete(room.id);
        io.to(room.id).emit('timer:updated', { endsAt: null, serverTime: Date.now(), completed: true });
      }, minutes * 60000));
    });

    // 2. Media Toggle (Mic / Camera / Screen / Hand)
    socket.on('media:toggle', ({ type, enabled }: { type: 'audio' | 'video' | 'screen' | 'hand'; enabled: boolean }) => {
      if (!currentRoomId || !currentUserId || typeof enabled !== 'boolean' || !['audio', 'video', 'screen', 'hand'].includes(type)) return;
      const room = roomManager.getRoom(currentRoomId);
      const participant = room?.participants.get(currentUserId);

      // Check host permissions
      if (room?.hostSettings && participant && !participant.isHost) {
        if (type === 'audio' && enabled && !room.hostSettings.allowMic) return;
        if (type === 'video' && enabled && !room.hostSettings.allowVideo) return;
        if (type === 'screen' && enabled && !room.hostSettings.allowScreenShare) return;
      }

      const updated = roomManager.updateMediaState(currentRoomId, currentUserId, type, enabled);
      if (updated) {
        io.to(currentRoomId).emit('participant:updated', { participant: publicParticipant(updated) });
      }
    });

    // 2b. Speaker Active (Audio level threshold)
    socket.on('speaker:active', ({ isSpeaking }: { isSpeaking: boolean }) => {
      if (!currentRoomId || !currentUserId) return;
      socket.to(currentRoomId).emit('speaker:active', { userId: currentUserId, isSpeaking });
    });

    // 3. WebRTC Signaling (Offer, Answer, ICE Candidate)
    socket.on('webrtc:offer', ({ targetId, offer }: { targetId: string; offer: RTCSessionDescriptionInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(socket.id) || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
      io.to(targetId).emit('webrtc:offer', { senderId: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ targetId, answer }: { targetId: string; answer: RTCSessionDescriptionInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(socket.id) || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
      io.to(targetId).emit('webrtc:answer', { senderId: socket.id, answer });
    });

    socket.on('webrtc:ice-candidate', ({ targetId, candidate }: { targetId: string; candidate: RTCIceCandidateInit }) => {
      if (!currentRoomId || !roomManager.getRoom(currentRoomId)?.participants.has(socket.id) || !roomManager.getRoom(currentRoomId)?.participants.has(targetId)) return;
      io.to(targetId).emit('webrtc:ice-candidate', { senderId: socket.id, candidate });
    });

    // 4. Chat Message
    socket.on('chat:message', ({ text }: { text: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const sender = room?.participants.get(currentUserId);
      if (!sender) return;

      if (room?.hostSettings && !sender.isHost && !room.hostSettings.allowChat) {
        socket.emit('chat:error', { message: 'Chủ phòng đã tắt tính năng nhắn tin.' });
        return;
      }

      if (typeof text !== 'string' || !text.trim()) return;
      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        senderId: currentUserId,
        senderName: sender.name,
        text: text.trim().slice(0, 4000),
        timestamp: Date.now(),
      };

      room!.messages = [...(room!.messages || []).slice(-199), messagePayload];
      io.to(currentRoomId).emit('chat:message', messagePayload);
    });

    // 5. Collaborative Whiteboard Events
    socket.on('whiteboard:draw', (stroke: WhiteboardStroke) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room || !room.participants.has(socket.id) || !stroke ||
        ![stroke.fromX, stroke.fromY, stroke.toX, stroke.toY].every(n => Number.isFinite(n) && n >= 0 && n <= 1) ||
        typeof stroke.color !== 'string' || !Number.isFinite(stroke.size) || stroke.size < 1 || stroke.size > 64) return;
      room.whiteboardStrokes ||= [];
      // Retain the canonical stroke history rather than competing client snapshots.
      if (room.whiteboardStrokes.length >= 50000) return;
      room.whiteboardStrokes.push(stroke);
      socket.to(currentRoomId).emit('whiteboard:draw', stroke);
    });

    socket.on('whiteboard:clear', () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (room?.participants.has(socket.id)) room.whiteboardStrokes = [];
      else return;
      socket.to(currentRoomId).emit('whiteboard:clear');
    });

    socket.on('whiteboard:get', () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (room?.participants.has(socket.id)) socket.emit('whiteboard:sync', { strokes: room.whiteboardStrokes || [] });
    });

    // 6. Live Interactive Reactions
    socket.on('reaction:send', ({ emoji }: { emoji: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const sender = room?.participants.get(currentUserId);
      if (!sender) return;

      if (room?.hostSettings && !sender.isHost && !room.hostSettings.allowReactions) {
        return;
      }

      if (typeof emoji !== 'string' || emoji.length > 16) return;
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

      if (typeof text !== 'string' || !text.trim() || !options || !['A', 'B', 'C', 'D'].every(key => typeof options[key as keyof typeof options] === 'string')) return;
      const question = classroomManager.createQuestion(room, text.slice(0, 4000), options);
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
        if (participant.identityHash) {
          room.answersByIdentity ||= new Map();
          room.answersByIdentity.set(participant.identityHash, res.answerObj);
        }
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

    socket.on('question:unlock', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room?.participants.get(currentUserId)?.isHost || !room.currentQuestion) return;
      room.currentQuestion.status = 'active';
      io.to(room.id).emit('question:unlocked');
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

    // 8. Host Moderation Privileges (Google Meet Standard)
    socket.on('host:mute-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;
      if (!room.participants.has(targetId)) return;

      // Update state on server
      const updated = roomManager.updateMediaState(currentRoomId, targetId, 'audio', false);
      if (updated) {
        io.to(currentRoomId).emit('participant:updated', { participant: publicParticipant(updated) });
      }
      io.to(targetId).emit('host:muted-by-host');
    });

    socket.on('host:mute-all', () => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      room.participants.forEach((p) => {
        if (!p.isHost) {
          p.audioEnabled = false;
          io.to(room.id).emit('participant:updated', { participant: publicParticipant(p) });
        }
      });
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

      if (typeof locked !== 'boolean') return;
      room.isLocked = locked;
      roomManager.persist();
      publishRecoveryState(room);
      if (locked) {
        for (const [id, request] of waiting) {
          if (request.roomId !== room.id) continue;
          waiting.delete(id);
          request.socket.emit('room:error', { message: 'Phòng học hiện đang bị khóa bởi giáo viên.' });
        }
        broadcastWaiting(room.id);
      }
      io.to(currentRoomId).emit('room:locked', { isLocked: locked });
    });

    socket.on('host:settings-update', (settings: Partial<HostSettings>) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      if (!settings || typeof settings !== 'object') return;
      const allowedKeys = ['hostManagement', 'allowScreenShare', 'allowChat', 'allowReactions', 'allowMic', 'allowVideo'] as const;
      for (const key of allowedKeys) if (typeof settings[key] === 'boolean') room.hostSettings![key] = settings[key]!;
      if (!room.hostSettings!.hostManagement) {
        for (const key of allowedKeys) if (key !== 'hostManagement') room.hostSettings![key] = true;
      }
      roomManager.persist();
      publishRecoveryState(room);
      for (const p of room.participants.values()) {
        if (p.isHost) continue;
        if (!room.hostSettings!.allowMic) p.audioEnabled = false;
        if (!room.hostSettings!.allowVideo) p.videoEnabled = false;
        if (!room.hostSettings!.allowScreenShare) p.isScreenSharing = false;
        io.to(room.id).emit('participant:updated', { participant: publicParticipant(p) });
      }
      io.to(currentRoomId).emit('host:settings-updated', { settings: room.hostSettings });
    });

    socket.on('host:remove-participant', ({ targetId }: { targetId: string }) => {
      if (!currentRoomId || !currentUserId) return;
      const room = roomManager.getRoom(currentRoomId);
      const requester = room?.participants.get(currentUserId);
      if (!room || !requester?.isHost) return;

      const target = room.participants.get(targetId);
      if (!target || target.isHost) return;

      if (!room.kickedUserIds) room.kickedUserIds = new Set();
      if (target.identityHash) { room.kickedUserIds.add(target.identityHash); room.approvedUserIds.delete(target.identityHash); }
      if (target.identityHash) room.answersByIdentity?.delete(target.identityHash);
      roomManager.persist();
      publishRecoveryState(room);

      // Force target to leave
      io.to(targetId).emit('host:removed-by-host');

      // Remove from room
      const { removed } = roomManager.removeParticipant(currentRoomId, targetId);
      if (removed) {
        io.to(room.id).emit('participant:left', { userId: targetId, participant: publicParticipant(removed) });
      }
      io.to(room.id).emit('classroom:statistics', { statistics: classroomManager.calculateStatistics(room), answers: [...room.answers.values()] });
      io.sockets.sockets.get(targetId)?.disconnect(true);
    });

    // 9. Disconnect / Leave
    socket.on('disconnect', () => {
      const pending = waiting.get(socket.id);
      waiting.delete(socket.id);
      if (pending) broadcastWaiting(pending.roomId);
      if (!currentRoomId || !currentUserId) return;
      const { room, removed } = roomManager.removeParticipant(currentRoomId, currentUserId);
      if (room && removed) {
        io.to(room.id).emit('participant:left', { userId: currentUserId, participant: publicParticipant(removed) });
        io.to(room.id).emit('classroom:statistics', { statistics: classroomManager.calculateStatistics(room), answers: [...room.answers.values()] });
      }
    });
  });
}

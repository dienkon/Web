/**
 * MockSocketService: An in-browser BroadcastChannel based event emitter for seamless fallback.
 * Allows instant multi-user testing across tabs on the same machine even if the Node server isn't running.
 */
import { Question, AnswerOption, AnswerStatistics, UserAnswer } from '../types/classroom';

type Listener = (...args: any[]) => void;

interface RoomState {
  id: string;
  code: string;
  hostId: string;
  participants: Map<string, any>;
  currentQuestion?: Question;
  answers: Map<string, UserAnswer>;
}

// Shared in-memory store across tabs in same browser context
const sharedRoomsStore = new Map<string, RoomState>();

export class MockSocketService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Listener[]> = new Map();
  public id: string;
  private roomId: string | null = null;

  constructor() {
    this.id = `mock_usr_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('meetclass_mock_channel');
      this.channel.onmessage = (event) => {
        const { type, payload, senderId } = event.data;
        if (senderId !== this.id) {
          this.handleIncomingBroadcast(type, payload, senderId);
        }
      };
    }
  }

  public on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: Listener) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const list = this.listeners.get(event) || [];
    this.listeners.set(event, list.filter((cb) => cb !== callback));
  }

  public emit(event: string, payload?: any) {
    this.handleAction(event, payload, this.id);

    // Broadcast action to other tabs
    if (this.channel) {
      this.channel.postMessage({ type: event, payload, senderId: this.id });
    }
  }

  private trigger(event: string, payload: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => cb(payload));
  }

  private handleIncomingBroadcast(type: string, payload: any, senderId: string) {
    // If it's a direct response event like 'room:joined', 'participant:joined', 'chat:message', trigger it
    if (
      [
        'room:joined',
        'participant:joined',
        'participant:left',
        'participant:updated',
        'chat:message',
        'question:started',
        'classroom:statistics',
        'question:locked',
        'question:resetted',
        'webrtc:offer',
        'webrtc:answer',
        'webrtc:ice-candidate',
        'host:muted-by-host',
        'host:removed-by-host',
      ].includes(type)
    ) {
      this.trigger(type, payload);
    } else {
      // It's an action emitted from another tab
      this.handleAction(type, payload, senderId);
    }
  }

  private handleAction(event: string, payload: any, senderId: string) {
    if (event === 'room:join') {
      const { roomId, userName, isHost } = payload;
      this.roomId = roomId;

      let room = sharedRoomsStore.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          code: roomId.toUpperCase(),
          hostId: senderId,
          participants: new Map(),
          answers: new Map(),
        };
        sharedRoomsStore.set(roomId, room);
      }

      const isRoomHost = isHost || room.participants.size === 0 || room.hostId === senderId;
      if (isRoomHost) room.hostId = senderId;

      const participant = {
        id: senderId,
        name: userName || 'Khách',
        audioEnabled: true,
        videoEnabled: true,
        isHost: isRoomHost,
        isSpeaking: false,
        joinedAt: Date.now(),
      };

      room.participants.set(senderId, participant);
      const existingParticipants = Array.from(room.participants.values());
      const stats = this.calcStats(room);

      // If action came from THIS tab, respond with room:joined
      if (senderId === this.id) {
        setTimeout(() => {
          this.trigger('room:joined', {
            roomId: room!.id,
            roomCode: room!.code,
            participant,
            participants: existingParticipants,
            currentQuestion: room!.currentQuestion,
            myAnswer: room!.answers.get(this.id)?.answer,
            statistics: stats,
          });
        }, 30);
      } else {
        // If action came from ANOTHER tab, notify this tab that a participant joined!
        this.trigger('participant:joined', { participant });
      }
    }

    if (event === 'media:toggle') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      if (!room) return;
      const p = room.participants.get(senderId);
      if (p) {
        if (payload.type === 'audio') p.audioEnabled = payload.enabled;
        if (payload.type === 'video') p.videoEnabled = payload.enabled;
        this.trigger('participant:updated', { participant: p });
      }
    }

    if (event === 'chat:message') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      const p = room?.participants.get(senderId);
      const msg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        senderId,
        senderName: p?.name || 'User',
        text: payload.text,
        timestamp: Date.now(),
      };
      this.trigger('chat:message', msg);
    }

    if (event === 'question:create') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      if (!room) return;
      const question: Question = {
        id: `q_${Date.now()}`,
        roomId: this.roomId,
        text: payload.text,
        options: payload.options,
        status: 'active',
        createdAt: Date.now(),
      };
      room.currentQuestion = question;
      room.answers.clear();
      const stats = this.calcStats(room);

      this.trigger('question:started', { question, statistics: stats });
    }

    if (event === 'classroom:answer') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      if (!room || !room.currentQuestion || room.currentQuestion.status === 'locked') return;

      const p = room.participants.get(senderId);
      const answerObj: UserAnswer = {
        userId: senderId,
        userName: p?.name || 'User',
        answer: payload.answer as AnswerOption,
        timestamp: Date.now(),
      };

      room.answers.set(senderId, answerObj);
      const stats = this.calcStats(room);
      const answersList = Array.from(room.answers.values());

      this.trigger('classroom:statistics', {
        statistics: stats,
        answers: answersList,
        latestAnswer: answerObj,
      });
    }

    if (event === 'question:lock') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      if (room && room.currentQuestion) {
        room.currentQuestion.status = 'locked';
        this.trigger('question:locked', { roomId: this.roomId });
      }
    }

    if (event === 'question:reset') {
      if (!this.roomId) return;
      const room = sharedRoomsStore.get(this.roomId);
      if (room && room.currentQuestion) {
        room.currentQuestion.status = 'active';
        room.answers.clear();
        const stats = this.calcStats(room);
        this.trigger('question:resetted', {
          question: room.currentQuestion,
          statistics: stats,
        });
      }
    }

    if (event === 'webrtc:offer' && payload.targetId === this.id) {
      this.trigger('webrtc:offer', payload);
    }

    if (event === 'webrtc:answer' && payload.targetId === this.id) {
      this.trigger('webrtc:answer', payload);
    }

    if (event === 'webrtc:ice-candidate' && payload.targetId === this.id) {
      this.trigger('webrtc:ice-candidate', payload);
    }
  }

  private calcStats(room: RoomState): AnswerStatistics {
    const stats: AnswerStatistics = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    for (const a of room.answers.values()) {
      if (a.answer in stats) {
        stats[a.answer]++;
        stats.total++;
      }
    }
    return stats;
  }

  public disconnect() {
    if (this.roomId) {
      const room = sharedRoomsStore.get(this.roomId);
      if (room) {
        room.participants.delete(this.id);
        room.answers.delete(this.id);
        if (this.channel) {
          this.channel.postMessage({
            type: 'participant:left',
            payload: { userId: this.id },
            senderId: this.id,
          });
        }
      }
    }
    if (this.channel) {
      this.channel.close();
    }
    this.listeners.clear();
  }
}

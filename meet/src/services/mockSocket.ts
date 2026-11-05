/**
 * MockSocketService: Robust cross-tab WebRTC & classroom synchronization using BroadcastChannel and localStorage.
 * Enables instant multi-participant testing across browser tabs without needing an external Node server.
 */
import { Question, AnswerOption, AnswerStatistics, UserAnswer } from '../types/classroom';

type Listener = (...args: any[]) => void;

interface StoredRoom {
  id: string;
  code: string;
  hostId: string;
  participants: Record<string, any>;
  currentQuestion?: Question;
  answers: Record<string, UserAnswer>;
}

export class MockSocketService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Listener[]> = new Map();
  public id: string;
  private roomId: string | null = null;

  constructor() {
    this.id = `mock_${Math.random().toString(36).substring(2, 8)}`;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('meetclass_mock_channel');
      this.channel.onmessage = (event) => {
        const { type, payload, senderId } = event.data;
        if (senderId !== this.id) {
          this.handleIncomingBroadcast(type, payload, senderId);
        }
      };
    }

    // Auto cleanup when tab closes
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
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
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[MockSocket] Error in listener for "${event}":`, err);
      }
    });
  }

  // Handle incoming broadcast messages from OTHER tabs
  private handleIncomingBroadcast(type: string, payload: any, senderId: string) {
    if (type === 'webrtc:offer') {
      if (payload && payload.targetId === this.id) {
        this.trigger('webrtc:offer', { senderId, offer: payload.offer });
      }
      return;
    }

    if (type === 'webrtc:answer') {
      if (payload && payload.targetId === this.id) {
        this.trigger('webrtc:answer', { senderId, answer: payload.answer });
      }
      return;
    }

    if (type === 'webrtc:ice-candidate') {
      if (payload && payload.targetId === this.id) {
        this.trigger('webrtc:ice-candidate', { senderId, candidate: payload.candidate });
      }
      return;
    }

    if (type === 'speaker:active') {
      this.trigger('speaker:active', { userId: senderId, isSpeaking: Boolean(payload?.isSpeaking) });
      return;
    }

    if (type === 'host:muted-by-host') {
      if (payload && payload.targetId === this.id) {
        this.trigger('host:muted-by-host', {});
      }
      return;
    }

    if (type === 'host:removed-by-host') {
      if (payload && payload.targetId === this.id) {
        this.trigger('host:removed-by-host', {});
      }
      return;
    }

    // Direct event relays
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
      ].includes(type)
    ) {
      this.trigger(type, payload);
    } else {
      // It's a shared state action emitted from another tab
      this.handleAction(type, payload, senderId);
    }
  }

  private getStorageKey(roomId: string): string {
    return `meetclass_room_${roomId.toUpperCase().replace(/^ROOM-/, '')}`;
  }

  private loadRoom(roomId: string): StoredRoom | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(roomId));
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private saveRoom(roomId: string, room: StoredRoom): void {
    try {
      localStorage.setItem(this.getStorageKey(roomId), JSON.stringify(room));
    } catch (e) {
      console.warn('[MockSocket] Failed to persist room to localStorage', e);
    }
  }

  private calcStats(room: StoredRoom): AnswerStatistics {
    const stats: AnswerStatistics = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    if (!room.answers) return stats;
    for (const a of Object.values(room.answers)) {
      if (a && a.answer in stats) {
        stats[a.answer]++;
        stats.total++;
      }
    }
    return stats;
  }

  private handleAction(event: string, payload: any, senderId: string) {
    if (event === 'room:join') {
      const { roomId, userName, isHost } = payload;
      this.roomId = roomId;

      let room = this.loadRoom(roomId);
      if (!room) {
        room = {
          id: roomId,
          code: roomId.toUpperCase().replace(/^ROOM-/, ''),
          hostId: senderId,
          participants: {},
          answers: {},
        };
      }

      const participantCount = Object.keys(room.participants).length;
      const isRoomHost = Boolean(isHost || participantCount === 0 || room.hostId === senderId);
      if (isRoomHost) {
        room.hostId = senderId;
      }

      const participant = {
        id: senderId,
        name: userName || 'Khách',
        audioEnabled: true,
        videoEnabled: true,
        isHost: isRoomHost,
        isSpeaking: false,
        joinedAt: Date.now(),
      };

      room.participants[senderId] = participant;
      this.saveRoom(roomId, room);

      const allParticipants = Object.values(room.participants);
      const stats = this.calcStats(room);

      // If action came from THIS tab, emit room:joined with all existing participants
      if (senderId === this.id) {
        setTimeout(() => {
          this.trigger('room:joined', {
            roomId: room!.id,
            roomCode: room!.code,
            participant,
            participants: allParticipants,
            currentQuestion: room!.currentQuestion,
            myAnswer: room!.answers?.[this.id]?.answer,
            statistics: stats,
          });
        }, 40);
      } else {
        // If action came from another tab, notify THIS tab
        this.trigger('participant:joined', { participant });
      }
      return;
    }

    if (event === 'media:toggle') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
      if (!room) return;
      const p = room.participants[senderId];
      if (p) {
        if (payload.type === 'audio') p.audioEnabled = payload.enabled;
        if (payload.type === 'video') p.videoEnabled = payload.enabled;
        room.participants[senderId] = p;
        this.saveRoom(this.roomId, room);
        this.trigger('participant:updated', { participant: p });
      }
      return;
    }

    if (event === 'chat:message') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
      const p = room?.participants[senderId];
      const msg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId,
        senderName: p?.name || 'User',
        text: payload.text,
        timestamp: Date.now(),
      };
      this.trigger('chat:message', msg);
      return;
    }

    if (event === 'question:create') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
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
      room.answers = {};
      this.saveRoom(this.roomId, room);
      const stats = this.calcStats(room);

      this.trigger('question:started', { question, statistics: stats });
      return;
    }

    if (event === 'classroom:answer') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
      if (!room || !room.currentQuestion || room.currentQuestion.status === 'locked') return;

      const p = room.participants[senderId];
      const answerObj: UserAnswer = {
        userId: senderId,
        userName: p?.name || 'User',
        answer: payload.answer as AnswerOption,
        timestamp: Date.now(),
      };

      if (!room.answers) room.answers = {};
      room.answers[senderId] = answerObj;
      this.saveRoom(this.roomId, room);

      const stats = this.calcStats(room);
      const answersList = Object.values(room.answers);

      this.trigger('classroom:statistics', {
        statistics: stats,
        answers: answersList,
        latestAnswer: answerObj,
      });
      return;
    }

    if (event === 'question:lock') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
      if (room && room.currentQuestion) {
        room.currentQuestion.status = 'locked';
        this.saveRoom(this.roomId, room);
        this.trigger('question:locked', { roomId: this.roomId });
      }
      return;
    }

    if (event === 'question:reset') {
      if (!this.roomId) return;
      const room = this.loadRoom(this.roomId);
      if (room && room.currentQuestion) {
        room.currentQuestion.status = 'active';
        room.answers = {};
        this.saveRoom(this.roomId, room);
        const stats = this.calcStats(room);
        this.trigger('question:resetted', {
          question: room.currentQuestion,
          statistics: stats,
        });
      }
      return;
    }
  }

  public disconnect() {
    if (this.roomId) {
      const room = this.loadRoom(this.roomId);
      if (room) {
        const removed = room.participants[this.id];
        delete room.participants[this.id];
        if (room.answers) delete room.answers[this.id];

        // Reassign host if host left
        if (removed?.isHost) {
          const remainingIds = Object.keys(room.participants);
          if (remainingIds.length > 0) {
            const nextHostId = remainingIds[0];
            room.hostId = nextHostId;
            room.participants[nextHostId].isHost = true;
          }
        }

        this.saveRoom(this.roomId, room);

        if (this.channel) {
          this.channel.postMessage({
            type: 'participant:left',
            payload: { userId: this.id, participant: removed },
            senderId: this.id,
          });
        }
      }
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

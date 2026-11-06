/**
 * GlobalSocketService: Worldwide zero-config signaling using secure public MQTT over WebSockets.
 * Enables users anywhere across the internet (Vercel, mobile 4G, different Wi-Fi networks)
 * to connect and interact seamlessly like Google Meet with NO paid servers required.
 */
import mqtt, { MqttClient } from 'mqtt';
import { Participant } from '../types/meeting';
import { Question, AnswerStatistics, UserAnswer, AnswerOption } from '../types/classroom';

type Listener = (...args: any[]) => void;

// Public WebSocket MQTT Brokers with SSL & high availability
const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

interface WireMessage {
  type: string;
  senderId: string;
  targetId?: string;
  payload?: any;
  timestamp: number;
}

export class GlobalSocketService {
  private client: MqttClient | null = null;
  private listeners: Map<string, Listener[]> = new Map();
  public id: string;
  private roomId: string | null = null;
  private roomCode: string | null = null;
  private currentTopic: string | null = null;

  // Local synchronized room state
  private hostId: string | null = null;
  private isHost: boolean = false;
  private participants: Map<string, Participant> = new Map();
  private currentQuestion?: Question;
  private answers: Map<string, UserAnswer> = new Map();

  private joinTimeout: any = null;
  private heartbeatInterval: any = null;
  private isConnected: boolean = false;
  private brokerIndex: number = 0;

  constructor() {
    this.id = `usr_${Math.random().toString(36).substring(2, 8)}`;

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

  private trigger(event: string, payload: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[GlobalSocket] Listener error on event "${event}":`, err);
      }
    });
  }

  private connectBroker(onReady?: () => void) {
    if (this.client && this.isConnected) {
      if (onReady) onReady();
      return;
    }

    const brokerUrl = BROKER_URLS[this.brokerIndex % BROKER_URLS.length];
    console.log('[GlobalSocket] Connecting to Global Cloud Broker:', brokerUrl);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `meet_${this.id}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2500,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('[GlobalSocket] Connected successfully to Global Cloud Broker!');
        if (this.currentTopic) {
          this.client?.subscribe(this.currentTopic, { qos: 0 });
        }
        if (onReady) onReady();
      });

      this.client.on('message', (_topic, message) => {
        try {
          const wire: WireMessage = JSON.parse(message.toString());
          if (wire.senderId !== this.id) {
            this.handleIncomingWire(wire);
          }
        } catch (e) {
          console.warn('[GlobalSocket] Failed to parse incoming message:', e);
        }
      });

      this.client.on('error', (err) => {
        console.warn('[GlobalSocket] Broker error:', err);
        // Try fallback broker on error
        this.brokerIndex++;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err) {
      console.error('[GlobalSocket] MQTT Init Error:', err);
    }
  }

  private publish(type: string, payload?: any, targetId?: string) {
    if (!this.client || !this.currentTopic) return;
    const wire: WireMessage = {
      type,
      senderId: this.id,
      targetId,
      payload,
      timestamp: Date.now(),
    };
    try {
      this.client.publish(this.currentTopic, JSON.stringify(wire), { qos: 0 });
    } catch (e) {
      console.warn('[GlobalSocket] Publish failed:', e);
    }
  }

  private calcStats(): AnswerStatistics {
    const stats: AnswerStatistics = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    for (const a of this.answers.values()) {
      if (a && a.answer in stats) {
        stats[a.answer]++;
        stats.total++;
      }
    }
    return stats;
  }

  private handleIncomingWire(wire: WireMessage) {
    const { type, senderId, targetId, payload } = wire;

    // 1. WebRTC Signaling targeted to this client
    if (type === 'webrtc:offer' && targetId === this.id) {
      this.trigger('webrtc:offer', { senderId, offer: payload.offer });
      return;
    }

    if (type === 'webrtc:answer' && targetId === this.id) {
      this.trigger('webrtc:answer', { senderId, answer: payload.answer });
      return;
    }

    if (type === 'webrtc:ice-candidate' && targetId === this.id) {
      this.trigger('webrtc:ice-candidate', { senderId, candidate: payload.candidate });
      return;
    }

    // 2. Peer Discovery & Handshake
    if (type === 'peer:announce') {
      const remoteParticipant: Participant = payload.participant;
      this.participants.set(remoteParticipant.id, remoteParticipant);

      // Trigger joined for this peer
      this.trigger('participant:joined', { participant: remoteParticipant });

      // If we are Host (or have room info), reply with full room state to the joining peer
      if (this.isHost || this.participants.size > 1) {
        this.publish(
          'room:sync',
          {
            targetId: remoteParticipant.id,
            hostId: this.hostId,
            participants: Array.from(this.participants.values()),
            currentQuestion: this.currentQuestion,
            answers: Array.from(this.answers.values()),
            statistics: this.calcStats(),
          },
          remoteParticipant.id
        );
      }
      return;
    }

    // 3. Room Synchronization Received (Response to our join)
    if (type === 'room:sync' && targetId === this.id) {
      if (this.joinTimeout) {
        clearTimeout(this.joinTimeout);
        this.joinTimeout = null;
      }

      this.hostId = payload.hostId;
      if (payload.participants && Array.isArray(payload.participants)) {
        payload.participants.forEach((p: Participant) => {
          this.participants.set(p.id, p);
        });
      }

      if (payload.currentQuestion) {
        this.currentQuestion = payload.currentQuestion;
      }

      if (payload.answers && Array.isArray(payload.answers)) {
        payload.answers.forEach((ans: UserAnswer) => {
          this.answers.set(ans.userId, ans);
        });
      }

      const myParticipant = this.participants.get(this.id);
      if (myParticipant) {
        this.trigger('room:joined', {
          roomId: this.roomId,
          roomCode: this.roomCode,
          participant: myParticipant,
          participants: Array.from(this.participants.values()),
          currentQuestion: this.currentQuestion,
          myAnswer: this.answers.get(this.id)?.answer,
          statistics: payload.statistics || this.calcStats(),
        });
      }
      return;
    }

    // 4. Peer Left
    if (type === 'peer:leave') {
      const removed = this.participants.get(senderId);
      this.participants.delete(senderId);
      this.answers.delete(senderId);

      this.trigger('participant:left', { userId: senderId, participant: removed });

      // If host left, elect next available participant as host
      if (removed?.isHost && this.participants.size > 0) {
        const nextHost = this.participants.values().next().value;
        if (nextHost) {
          nextHost.isHost = true;
          this.hostId = nextHost.id;
          if (nextHost.id === this.id) {
            this.isHost = true;
          }
          this.trigger('participant:updated', { participant: nextHost });
        }
      }
      return;
    }

    // 5. Media Toggle (Mic / Camera)
    if (type === 'media:toggle') {
      const p = this.participants.get(senderId);
      if (p) {
        if (payload.type === 'audio') p.audioEnabled = payload.enabled;
        if (payload.type === 'video') p.videoEnabled = payload.enabled;
        this.trigger('participant:updated', { participant: p });
      }
      return;
    }

    // 6. Active Speaker
    if (type === 'speaker:active') {
      this.trigger('speaker:active', { userId: senderId, isSpeaking: Boolean(payload?.isSpeaking) });
      return;
    }

    // 7. Chat Message
    if (type === 'chat:message') {
      this.trigger('chat:message', payload);
      return;
    }

    // 8. Classroom Q&A Interactive Events
    if (type === 'question:started') {
      this.currentQuestion = payload.question;
      this.answers.clear();
      this.trigger('question:started', payload);
      return;
    }

    if (type === 'classroom:statistics') {
      if (payload.latestAnswer) {
        this.answers.set(payload.latestAnswer.userId, payload.latestAnswer);
      }
      this.trigger('classroom:statistics', payload);
      return;
    }

    if (type === 'question:locked') {
      if (this.currentQuestion) {
        this.currentQuestion.status = 'locked';
      }
      this.trigger('question:locked', payload);
      return;
    }

    if (type === 'question:resetted') {
      this.currentQuestion = payload.question;
      this.answers.clear();
      this.trigger('question:resetted', payload);
      return;
    }

    // 9. Host actions
    if (type === 'host:muted-by-host' && targetId === this.id) {
      this.trigger('host:muted-by-host', {});
      return;
    }

    if (type === 'host:removed-by-host' && targetId === this.id) {
      this.trigger('host:removed-by-host', {});
      return;
    }
  }

  public emit(event: string, payload?: any) {
    if (event === 'room:join') {
      const { roomId, userName, isHost, audioEnabled, videoEnabled } = payload;
      this.roomId = roomId;
      this.roomCode = roomId.toUpperCase().replace(/^ROOM-/, '');
      this.currentTopic = `meetclass/v2/rooms/${this.roomCode}`;

      this.connectBroker(() => {
        const myParticipant: Participant = {
          id: this.id,
          name: userName || 'Khách',
          audioEnabled: audioEnabled !== undefined ? audioEnabled : true,
          videoEnabled: videoEnabled !== undefined ? videoEnabled : true,
          isHost: Boolean(isHost),
          isSpeaking: false,
          joinedAt: Date.now(),
        };

        this.participants.set(this.id, myParticipant);
        if (isHost) {
          this.isHost = true;
          this.hostId = this.id;
        }

        // Announce presence to room topic
        this.publish('peer:announce', { participant: myParticipant });

        // If no peer replies with room:sync in 600ms, assume we are the room creator/host
        this.joinTimeout = setTimeout(() => {
          this.isHost = true;
          this.hostId = this.id;
          myParticipant.isHost = true;

          this.trigger('room:joined', {
            roomId: this.roomId,
            roomCode: this.roomCode,
            participant: myParticipant,
            participants: [myParticipant],
            currentQuestion: this.currentQuestion,
            statistics: this.calcStats(),
          });
        }, 600);
      });
      return;
    }

    if (event === 'webrtc:offer') {
      this.publish('webrtc:offer', { offer: payload.offer }, payload.targetId);
      return;
    }

    if (event === 'webrtc:answer') {
      this.publish('webrtc:answer', { answer: payload.answer }, payload.targetId);
      return;
    }

    if (event === 'webrtc:ice-candidate') {
      this.publish('webrtc:ice-candidate', { candidate: payload.candidate }, payload.targetId);
      return;
    }

    if (event === 'media:toggle') {
      const p = this.participants.get(this.id);
      if (p) {
        if (payload.type === 'audio') p.audioEnabled = payload.enabled;
        if (payload.type === 'video') p.videoEnabled = payload.enabled;
      }
      this.publish('media:toggle', payload);
      return;
    }

    if (event === 'speaker:active') {
      this.publish('speaker:active', payload);
      return;
    }

    if (event === 'chat:message') {
      const p = this.participants.get(this.id);
      const msg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: this.id,
        senderName: p?.name || 'User',
        text: payload.text,
        timestamp: Date.now(),
      };
      this.trigger('chat:message', msg);
      this.publish('chat:message', msg);
      return;
    }

    if (event === 'question:create') {
      const question: Question = {
        id: `q_${Date.now()}`,
        roomId: this.roomId || '',
        text: payload.text,
        options: payload.options,
        status: 'active',
        createdAt: Date.now(),
      };
      this.currentQuestion = question;
      this.answers.clear();
      const stats = this.calcStats();

      const questionPayload = { question, statistics: stats };
      this.trigger('question:started', questionPayload);
      this.publish('question:started', questionPayload);
      return;
    }

    if (event === 'classroom:answer') {
      if (!this.currentQuestion || this.currentQuestion.status === 'locked') return;

      const p = this.participants.get(this.id);
      const answerObj: UserAnswer = {
        userId: this.id,
        userName: p?.name || 'Học sinh',
        answer: payload.answer as AnswerOption,
        timestamp: Date.now(),
      };

      this.answers.set(this.id, answerObj);
      const stats = this.calcStats();
      const answersList = Array.from(this.answers.values());

      const statsPayload = {
        statistics: stats,
        answers: answersList,
        latestAnswer: answerObj,
      };

      this.trigger('classroom:statistics', statsPayload);
      this.publish('classroom:statistics', statsPayload);
      return;
    }

    if (event === 'question:lock') {
      if (this.currentQuestion) {
        this.currentQuestion.status = 'locked';
      }
      const lockPayload = { roomId: this.roomId };
      this.trigger('question:locked', lockPayload);
      this.publish('question:locked', lockPayload);
      return;
    }

    if (event === 'question:reset') {
      if (this.currentQuestion) {
        this.currentQuestion.status = 'active';
        this.answers.clear();
      }
      const resetPayload = {
        question: this.currentQuestion,
        statistics: this.calcStats(),
      };
      this.trigger('question:resetted', resetPayload);
      this.publish('question:resetted', resetPayload);
      return;
    }

    if (event === 'host:mute-participant') {
      this.publish('host:muted-by-host', {}, payload.targetId);
      return;
    }

    if (event === 'host:remove-participant') {
      this.publish('host:removed-by-host', {}, payload.targetId);
      return;
    }
  }

  public disconnect() {
    if (this.joinTimeout) {
      clearTimeout(this.joinTimeout);
      this.joinTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.isConnected && this.currentTopic) {
      this.publish('peer:leave', {});
      try {
        this.client?.unsubscribe(this.currentTopic);
        this.client?.end(true);
      } catch {}
    }

    this.client = null;
    this.isConnected = false;
    this.participants.clear();
    this.answers.clear();
    this.listeners.clear();
  }
}

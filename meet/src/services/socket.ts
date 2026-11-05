import { io, Socket } from 'socket.io-client';
import { GlobalSocketService } from './globalSocket';
import { MockSocketService } from './mockSocket';

export type ConnectionMode = 'socket-io' | 'global-cloud' | 'local-mock';

type Listener = (...args: any[]) => void;
type AnySocket = Socket | GlobalSocketService | MockSocketService;

class SocketService {
  private activeSocket: AnySocket | null = null;
  public connectionMode: ConnectionMode = 'global-cloud';
  private listeners: Map<string, Listener[]> = new Map();
  private lastJoinPayload: any = null;

  public connect(): SocketService {
    if (this.activeSocket) return this;

    const envUrl = import.meta.env.VITE_SERVER_URL;
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // If explicit external server URL provided (e.g. Render/Railway URL)
    const hasExternalServer = Boolean(envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'));
    const targetUrl = hasExternalServer ? envUrl : isLocalhost ? (envUrl || 'http://localhost:5000') : undefined;

    if (targetUrl) {
      try {
        const realSocket = io(targetUrl, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 2,
          reconnectionDelay: 1000,
          timeout: 2500,
        });

        realSocket.on('connect', () => {
          this.connectionMode = 'socket-io';
          console.log('[MeetClass Socket] Connected to Socket.IO Server on', targetUrl);
        });

        realSocket.on('connect_error', () => {
          if (this.connectionMode !== 'global-cloud' && this.connectionMode !== 'local-mock') {
            console.warn('[MeetClass Socket] Standalone Socket.IO server unreachable. Transitioning to Global Cloud Realtime mode.');
            this.switchToGlobalCloud();
          }
        });

        this.activeSocket = realSocket;
        this.rebindListeners();
        return this;
      } catch (err) {
        console.warn('[MeetClass Socket] Socket.IO initialization error. Using Global Cloud mode.', err);
      }
    }

    // Default for Vercel / Cloud deployments: Zero-config Global Realtime Cloud
    this.switchToGlobalCloud();
    return this;
  }

  private switchToGlobalCloud() {
    if (this.activeSocket && 'disconnect' in this.activeSocket) {
      try {
        this.activeSocket.disconnect();
      } catch (e) {}
    }

    this.connectionMode = 'global-cloud';
    console.log('[MeetClass Socket] Active mode: Global Cloud Realtime (Worldwide P2P)');
    this.activeSocket = new GlobalSocketService();
    this.rebindListeners();

    if (this.lastJoinPayload) {
      setTimeout(() => {
        this.activeSocket?.emit('room:join', this.lastJoinPayload);
      }, 50);
    }
  }

  private rebindListeners() {
    if (!this.activeSocket) return;
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.activeSocket?.on(event, cb);
      });
    });
  }

  public on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    if (this.activeSocket) {
      this.activeSocket.on(event, callback);
    }
  }

  public off(event: string, callback?: Listener) {
    if (!callback) {
      this.listeners.delete(event);
      if (this.activeSocket) {
        this.activeSocket.off(event);
      }
      return;
    }
    const list = this.listeners.get(event) || [];
    this.listeners.set(event, list.filter((cb) => cb !== callback));
    if (this.activeSocket) {
      this.activeSocket.off(event, callback);
    }
  }

  public emit(event: string, payload?: any) {
    if (event === 'room:join') {
      this.lastJoinPayload = payload;
    }
    if (!this.activeSocket) {
      this.connect();
    }
    this.activeSocket?.emit(event, payload);
  }

  public get id(): string | undefined {
    return this.activeSocket?.id;
  }

  public getSocket(): AnySocket | null {
    return this.activeSocket;
  }

  public disconnect() {
    if (this.activeSocket) {
      this.activeSocket.disconnect();
      this.activeSocket = null;
    }
    this.listeners.clear();
    this.lastJoinPayload = null;
  }
}

export const socketService = new SocketService();

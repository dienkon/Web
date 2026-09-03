import { io, Socket } from 'socket.io-client';
import { MockSocketService } from './mockSocket';

export type ConnectionMode = 'socket-io' | 'vercel-serverless' | 'local-mock';

type Listener = (...args: any[]) => void;

class SocketService {
  private activeSocket: Socket | MockSocketService | null = null;
  public connectionMode: ConnectionMode = 'local-mock';
  private listeners: Map<string, Listener[]> = new Map();
  private lastJoinPayload: any = null;
  private serverlessPollingTimer: any = null;

  public connect(): SocketService {
    if (this.activeSocket) return this;

    const envUrl = import.meta.env.VITE_SERVER_URL;
    const isVercelHost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    // If explicit external server URL provided
    const targetUrl = envUrl || (isVercelHost ? undefined : 'http://localhost:5000');

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
          if (this.connectionMode !== 'local-mock' && this.connectionMode !== 'vercel-serverless') {
            console.warn('[MeetClass Socket] Standalone Socket.IO server unreachable. Transitioning to Vercel Serverless / Local Sync mode.');
            this.switchToFallback(isVercelHost);
          }
        });

        this.activeSocket = realSocket;
        this.rebindListeners();
        return this;
      } catch (err) {
        console.warn('[MeetClass Socket] Socket.IO initialization error. Using fallback mode.', err);
      }
    }

    // Default Fallback
    this.switchToFallback(isVercelHost);
    return this;
  }

  private switchToFallback(isVercelHost: boolean) {
    if (this.activeSocket && 'disconnect' in this.activeSocket) {
      try {
        this.activeSocket.disconnect();
      } catch (e) {}
    }

    this.connectionMode = isVercelHost ? 'vercel-serverless' : 'local-mock';
    this.activeSocket = new MockSocketService();
    this.rebindListeners();

    // Automatically re-join room if payload exists
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

  public getSocket(): Socket | MockSocketService | null {
    return this.activeSocket;
  }

  public disconnect() {
    if (this.activeSocket) {
      this.activeSocket.disconnect();
      this.activeSocket = null;
    }
    if (this.serverlessPollingTimer) {
      clearInterval(this.serverlessPollingTimer);
      this.serverlessPollingTimer = null;
    }
    this.listeners.clear();
    this.lastJoinPayload = null;
  }
}

export const socketService = new SocketService();

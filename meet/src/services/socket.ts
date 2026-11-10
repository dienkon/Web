import { io, Socket } from 'socket.io-client';
import { getRoomRecovery } from './identity';
import { getServerUrl, waitForBackend } from './api';

type Listener = (...args: any[]) => void;

class SocketService {
  private activeSocket: Socket | null = null;
  public connectionMode = 'socket-io' as const;
  private listeners = new Map<string, Listener[]>();
  private lastJoinPayload: any = null;

  private initialization: Promise<void> | null = null;
  private generation = 0;
  public connect(): SocketService {
    if (this.activeSocket || this.initialization) return this;
    const generation = this.generation;
    this.initialization = (async () => {
      await waitForBackend();
      const serverUrl = await getServerUrl();
      if (generation !== this.generation) return;
      const socket = io(serverUrl || undefined, {
        autoConnect: false, reconnection: true, reconnectionDelay: 1000,
        reconnectionDelayMax: 5000, timeout: 10000,
      });
      this.activeSocket = socket;
      socket.on('connect', () => {
        if (this.lastJoinPayload) socket.emit('room:join', { ...this.lastJoinPayload, roomRecovery: getRoomRecovery(this.lastJoinPayload.roomId) });
      });
      this.listeners.forEach((callbacks, event) => callbacks.forEach(cb => socket.on(event, cb)));
      socket.connect();
    })().catch(error => {
      if (generation !== this.generation) return;
      for (const listener of this.listeners.get('room:error') || []) listener({ message: error.message });
    }).finally(() => { if (generation === this.generation) this.initialization = null; });
    return this;
  }
  public on(event: string, callback: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) || []), callback]);
    this.activeSocket?.on(event, callback);
  }
  public off(event: string, callback?: Listener) {
    if (callback) {
      this.listeners.set(event, (this.listeners.get(event) || []).filter(cb => cb !== callback));
      this.activeSocket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.activeSocket?.off(event);
    }
  }
  public emit(event: string, payload?: any) {
    if (event === 'room:join') this.lastJoinPayload = payload;
    if (!this.activeSocket) this.connect();
    // Do not buffer stale media/chat/host commands during reconnects.
    if (this.activeSocket?.connected) this.activeSocket.emit(event, payload);
  }
  public get id(): string | undefined { return this.activeSocket?.id; }
  public getSocket(): Socket | null { return this.activeSocket; }
  public disconnect() {
    this.generation++;
    this.initialization = null;
    this.lastJoinPayload = null;
    this.activeSocket?.disconnect();
    this.activeSocket = null;
    this.listeners.clear();
  }
}
export const socketService = new SocketService();

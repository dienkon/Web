import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Room, Participant, HostSettings } from './types.js';
import { hashToken } from './identity.js';

const DEFAULT_HOST_SETTINGS: HostSettings = {
  hostManagement: true, allowScreenShare: true, allowChat: true,
  allowReactions: true, allowMic: true, allowVideo: true,
};
const storagePath = resolve(process.env.ROOM_STORE_PATH || 'data/rooms.json');

export interface RoomRecoveryState {
  isLocked?: boolean;
  requireApproval?: boolean;
  hostSettings?: Partial<HostSettings>;
  kickedUserIds?: string[];
  approvedUserIds?: string[];
}

let signingKey: string | undefined;
function getSigningKey(): string {
  if (signingKey) return signingKey;
  if (process.env.ROOM_SIGNING_SECRET) {
    if (process.env.ROOM_SIGNING_SECRET.length < 32) throw new Error('ROOM_SIGNING_SECRET must have at least 32 characters.');
    return signingKey = process.env.ROOM_SIGNING_SECRET;
  }
  const keyPath = `${storagePath}.key`;
  if (!existsSync(keyPath)) {
    mkdirSync(dirname(storagePath), { recursive: true });
    writeFileSync(keyPath, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
  }
  return signingKey = readFileSync(keyPath, 'utf8').trim();
}
function signature(code: string, nonce: string): string {
  return createHmac('sha256', getSigningKey()).update(`${code}:${nonce}`).digest('hex');
}

class RoomManager {
  private rooms = new Map<string, Room>();
  constructor() {
    if (existsSync(storagePath)) {
      // Do not silently replace ownership if the persistent store is damaged.
      for (const saved of JSON.parse(readFileSync(storagePath, 'utf8'))) {
        const room: Room = { ...saved, hostId: '', participants: new Map(), answers: new Map(),
          kickedUserIds: new Set(saved.kickedUserIds), approvedUserIds: new Set(saved.approvedUserIds || []),
          hostSettings: { ...DEFAULT_HOST_SETTINGS, ...saved.hostSettings } };
        this.rooms.set(room.code, room);
      }
    }
  }
  persist() {
    const data = [...this.rooms.values()].map(room => ({
      id: room.id, code: room.code, ownerTokenHash: room.ownerTokenHash,
      classroomMode: room.classroomMode, createdAt: room.createdAt,
      isLocked: !!room.isLocked, requireApproval: !!room.requireApproval,
      hostSettings: room.hostSettings, kickedUserIds: [...(room.kickedUserIds || [])],
      approvedUserIds: [...room.approvedUserIds],
    }));
    mkdirSync(dirname(resolve(storagePath)), { recursive: true });
    writeFileSync(`${storagePath}.tmp`, JSON.stringify(data), { mode: 0o600 });
    renameSync(`${storagePath}.tmp`, storagePath);
  }
  createRoom(): { room: Room; hostToken: string } {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do { code = Array.from({ length: 9 }, () => alphabet[randomInt(alphabet.length)]).join(''); }
    while (this.rooms.has(code));
    const nonce = randomBytes(32).toString('hex');
    const hostToken = nonce + signature(code, nonce);
    const room: Room = {
      id: `ROOM-${code}`, code, hostId: '', ownerTokenHash: hashToken(hostToken),
      classroomMode: true, createdAt: Date.now(), participants: new Map(), answers: new Map(),
      kickedUserIds: new Set(), approvedUserIds: new Set(),
      hostSettings: { ...DEFAULT_HOST_SETTINGS }, isLocked: false, requireApproval: false,
    };
    this.rooms.set(code, room);
    this.persist();
    return { room, hostToken };
  }
  getRoom(value: string): Room | undefined {
    return typeof value === 'string' ? this.rooms.get(value.toUpperCase().replace(/^ROOM-/, '')) : undefined;
  }
  restoreOwnedRoom(value: string, token: unknown, state?: RoomRecoveryState): Room | undefined {
    const code = value.toUpperCase().replace(/^ROOM-/, '');
    if (!/^[A-Z2-9]{9}$/.test(code) || typeof token !== 'string' || !/^[a-f0-9]{128}$/.test(token)) return;
    if (!timingSafeEqual(Buffer.from(token.slice(64), 'hex'), Buffer.from(signature(code, token.slice(0, 64)), 'hex'))) return;
    if (this.rooms.has(code)) return this.rooms.get(code);
    const hostSettings = { ...DEFAULT_HOST_SETTINGS };
    for (const key of Object.keys(hostSettings) as (keyof HostSettings)[]) {
      if (typeof state?.hostSettings?.[key] === 'boolean') hostSettings[key] = state.hostSettings[key]!;
    }
    const hashes = (list: unknown) => new Set<string>(Array.isArray(list) ? list.filter(v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)).slice(0, 10000) : []);
    const room: Room = {
      id: `ROOM-${code}`, code, hostId: '', ownerTokenHash: hashToken(token), classroomMode: true,
      createdAt: Date.now(), participants: new Map(), answers: new Map(), hostSettings,
      // If the owner has no saved settings, restore closed instead of opening a locked room.
      isLocked: state?.isLocked !== false, requireApproval: state?.requireApproval !== false,
      kickedUserIds: hashes(state?.kickedUserIds), approvedUserIds: hashes(state?.approvedUserIds),
    };
    this.rooms.set(code, room);
    this.persist();
    return room;
  }
  addParticipant(roomId: string, participant: Participant): { room: Room | undefined; duplicateRemoved?: Participant } {
    const room = this.getRoom(roomId);
    if (!room) return { room: undefined };
    let duplicateRemoved: Participant | undefined;
    for (const [id, existing] of room.participants) {
      if (id !== participant.id && (existing.identityHash === participant.identityHash || (participant.isHost && existing.isHost))) {
        duplicateRemoved = existing;
        room.participants.delete(id);
        const answer = room.answers.get(id);
        room.answers.delete(id);
        if (answer) room.answers.set(participant.id, { ...answer, userId: participant.id });
      }
    }
    if (participant.isHost) room.hostId = participant.id;
    room.participants.set(participant.id, participant);
    return { room, duplicateRemoved };
  }
  removeParticipant(roomId: string, id: string): { room: Room | undefined; removed?: Participant } {
    const room = this.getRoom(roomId);
    if (!room) return { room: undefined };
    const removed = room.participants.get(id);
    room.participants.delete(id);
    room.answers.delete(id);
    if (room.hostId === id) room.hostId = '';
    return { room, removed };
  }
  updateMediaState(roomId: string, id: string, type: 'audio' | 'video' | 'screen' | 'hand', enabled: boolean): Participant | undefined {
    const participant = this.getRoom(roomId)?.participants.get(id);
    if (participant) {
      if (type === 'audio') participant.audioEnabled = enabled;
      if (type === 'video') participant.videoEnabled = enabled;
      if (type === 'screen') participant.isScreenSharing = enabled;
      if (type === 'hand') { participant.handRaised = enabled; participant.handRaisedAt = enabled ? Date.now() : undefined; }
    }
    return participant;
  }
}
export const roomManager = new RoomManager();

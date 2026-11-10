import { Room, Participant, HostSettings } from './types.js';

const DEFAULT_HOST_SETTINGS: HostSettings = {
  hostManagement: true,
  allowScreenShare: true,
  allowChat: true,
  allowReactions: true,
  allowMic: true,
  allowVideo: true,
};

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomId: string, roomCode: string, hostId: string, isClassroomMode: boolean = true): Room {
    const room: Room = {
      id: roomId,
      code: roomCode.toUpperCase(),
      hostId,
      classroomMode: isClassroomMode,
      createdAt: Date.now(),
      participants: new Map(),
      answers: new Map(),
      kickedUserIds: new Set(),
      hostSettings: { ...DEFAULT_HOST_SETTINGS },
    };
    this.rooms.set(roomId, room);
    this.rooms.set(room.code, room); // Register by code for easy join lookup
    return room;
  }

  getRoom(roomIdOrCode: string): Room | undefined {
    return this.rooms.get(roomIdOrCode) || this.rooms.get(roomIdOrCode.toUpperCase());
  }

  addParticipant(roomIdOrCode: string, participant: Participant): { room: Room | undefined; duplicateRemoved?: Participant } {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return { room: undefined };

    // Remove any ghost/duplicate participant with same name (prevents duplicate accounts on reload)
    let duplicateRemoved: Participant | undefined;
    for (const [key, p] of room.participants.entries()) {
      if (p.name === participant.name && key !== participant.id) {
        duplicateRemoved = p;
        room.participants.delete(key);
        room.answers.delete(key);
      }
    }

    // If first participant, mark as host
    if (room.participants.size === 0) {
      participant.isHost = true;
      room.hostId = participant.id;
    }

    room.participants.set(participant.id, participant);
    return { room, duplicateRemoved };
  }

  removeParticipant(roomIdOrCode: string, participantId: string): { room: Room | undefined; removed?: Participant } {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return { room: undefined };

    const removed = room.participants.get(participantId);
    room.participants.delete(participantId);
    room.answers.delete(participantId);

    // Reassign host if host left and participants remain
    if (removed?.isHost && room.participants.size > 0) {
      const nextParticipant = room.participants.values().next().value;
      if (nextParticipant) {
        nextParticipant.isHost = true;
        room.hostId = nextParticipant.id;
      }
    }

    // Clean up empty room after 10 minutes
    if (room.participants.size === 0) {
      setTimeout(() => {
        if (room.participants.size === 0) {
          this.rooms.delete(room.id);
          this.rooms.delete(room.code);
        }
      }, 10 * 60 * 1000);
    }

    return { room, removed };
  }

  updateMediaState(roomIdOrCode: string, participantId: string, mediaType: 'audio' | 'video' | 'screen' | 'hand', enabled: boolean): Participant | undefined {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return undefined;

    const participant = room.participants.get(participantId);
    if (participant) {
      if (mediaType === 'audio') participant.audioEnabled = enabled;
      if (mediaType === 'video') participant.videoEnabled = enabled;
      if (mediaType === 'screen') participant.isScreenSharing = enabled;
      if (mediaType === 'hand') {
        participant.handRaised = enabled;
        if (enabled) participant.handRaisedAt = Date.now();
      }
    }
    return participant;
  }
}

export const roomManager = new RoomManager();

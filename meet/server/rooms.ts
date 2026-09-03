import { Room, Participant } from './types.js';

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
    };
    this.rooms.set(roomId, room);
    this.rooms.set(room.code, room); // Also register by code for easy join lookup
    return room;
  }

  getRoom(roomIdOrCode: string): Room | undefined {
    return this.rooms.get(roomIdOrCode) || this.rooms.get(roomIdOrCode.toUpperCase());
  }

  addParticipant(roomIdOrCode: string, participant: Participant): Room | undefined {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return undefined;

    // If first participant, mark as host
    if (room.participants.size === 0) {
      participant.isHost = true;
      room.hostId = participant.id;
    }

    room.participants.set(participant.id, participant);
    return room;
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

  updateMediaState(roomIdOrCode: string, participantId: string, mediaType: 'audio' | 'video', enabled: boolean): Participant | undefined {
    const room = this.getRoom(roomIdOrCode);
    if (!room) return undefined;

    const participant = room.participants.get(participantId);
    if (participant) {
      if (mediaType === 'audio') participant.audioEnabled = enabled;
      if (mediaType === 'video') participant.videoEnabled = enabled;
    }
    return participant;
  }
}

export const roomManager = new RoomManager();

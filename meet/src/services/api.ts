const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export interface RoomDetailsResponse {
  id: string;
  code: string;
  hostId: string;
  participantCount: number;
  classroomMode: boolean;
}

export async function fetchRoomDetails(roomCode: string): Promise<RoomDetailsResponse | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/rooms/${roomCode}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch room details from server, fallback to client side creation.', err);
    return null;
  }
}

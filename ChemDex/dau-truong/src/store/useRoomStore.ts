import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, getDoc, deleteDoc, deleteField } from 'firebase/firestore';

export type GameMode = 'balance' | 'fill_blank' | 'compound_name' | 'element_quiz' | 'mixed' | 'oxidation_state' | 'ranked_mixed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';
export type RoomStatus = 'lobby' | 'preparing' | 'roundActive' | 'roundReveal' | 'roundBreak' | 'matchEnd';

export interface Player {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
  isReady: boolean;
  isHost: boolean;
  streak: number;
  submittedRound?: number;
  lastAnswerCorrect?: boolean;
  lastAnswer?: any;
  equippedTitle?: string;
}

export interface Room {
  id: string;
  hostId: string;
  mode: GameMode;
  difficulty: Difficulty;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  status: RoomStatus;
  players: Record<string, Player>;
  createdAt: any;
  questions: any[];
  messages?: any[];
  roundEndTime?: number;
  isRanked?: boolean;
}

interface RoomState {
  currentRoom: Room | null;
  roomId: string | null;
  loading: boolean;
  error: string | null;
  createRoom: (hostId: string, profile: any, params: any) => Promise<string>;
  joinRoom: (roomId: string, profile: any) => Promise<void>;
  leaveRoom: (uid: string) => Promise<void>;
  sendMessage: (uid: string, text: string, displayName: string) => Promise<void>;
  kickPlayer: (targetUid: string) => Promise<void>;
  toggleReady: (uid: string) => Promise<void>;
  updateRoomSettings: (settings: { mode: GameMode; difficulty: Difficulty; maxPlayers: number; totalRounds: number }) => Promise<void>;
  startGame: () => Promise<void>;
  clearError: () => void;
}

let unsubscribe: any = null;

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  roomId: null,
  loading: false,
  error: null,
  
  clearError: () => set({ error: null }),

  createRoom: async (hostId, profile, params) => {
    set({ loading: true, error: null });
    try {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, 'rooms', newRoomId);
      
      const newRoom: Room = {
        id: newRoomId,
        hostId,
        mode: params.mode,
        difficulty: params.difficulty,
        maxPlayers: params.maxPlayers,
        currentRound: 0,
        totalRounds: params.totalRounds,
        status: 'lobby',
        isRanked: params.isRanked || false,
        players: {
          [hostId]: {
            uid: hostId,
            displayName: profile.displayName || 'Hóa thủ',
            photoURL: profile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem',
            score: 0,
            isReady: true,
            isHost: true,
            streak: 0,
            equippedTitle: profile.equippedTitle || '',
          }
        },
        createdAt: serverTimestamp(),
        questions: [],
      };

      await setDoc(roomRef, newRoom);
      try { localStorage.setItem('chem_active_room_id', newRoomId); } catch(e){}
      
      // Attach snapshot listener directly
      if (unsubscribe) unsubscribe();
      unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const rData = docSnap.data() as Room;
          if (rData.status === 'matchEnd') {
            try { localStorage.removeItem('chem_active_room_id'); } catch(e){}
          }
          set({ currentRoom: rData, roomId: newRoomId, loading: false, error: null });
        } else {
          try { localStorage.removeItem('chem_active_room_id'); } catch(e){}
          set({ currentRoom: null, roomId: null, error: "Phòng đã bị đóng", loading: false });
        }
      });

      set({ currentRoom: newRoom as Room, roomId: newRoomId, loading: false, error: null });
      return newRoomId;
    } catch (error: any) {
      set({ error: error.message || "Lỗi tạo phòng", loading: false });
      throw error;
    }
  },

  joinRoom: async (roomId, profile) => {
    set({ loading: true, error: null, currentRoom: null, roomId: null });
    try {
      const roomRef = doc(db, 'rooms', roomId);
      let roomSnap = await getDoc(roomRef);
      
      // Retry once if room snap not immediately ready
      if (!roomSnap.exists()) {
        await new Promise(r => setTimeout(r, 300));
        roomSnap = await getDoc(roomRef);
      }

      if (!roomSnap.exists()) {
        set({ error: "Phòng không tồn tại hoặc đã bị hủy", loading: false, currentRoom: null, roomId: null });
        return;
      }
      
      const roomData = roomSnap.data() as Room;
      const playersMap = roomData.players || {};
      const playerCount = Object.keys(playersMap).length;
      
      if (!playersMap[profile.uid] && playerCount >= roomData.maxPlayers) {
        set({ error: "Phòng đã đầy người chơi", loading: false });
        return;
      }

      // Add player if not exists using updateDoc for nested map field
      if (!playersMap[profile.uid]) {
        await updateDoc(roomRef, {
          [`players.${profile.uid}`]: {
            uid: profile.uid,
            displayName: profile.displayName || 'Hóa thủ',
            photoURL: profile.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem',
            score: 0,
            isReady: false,
            isHost: false,
            streak: 0,
            equippedTitle: profile.equippedTitle || '',
          }
        });
      }

      try { localStorage.setItem('chem_active_room_id', roomId); } catch(e){}

      // Setup realtime listener
      if (unsubscribe) unsubscribe();
      
      unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const rData = docSnap.data() as Room;
          if (rData.status === 'matchEnd') {
            try { localStorage.removeItem('chem_active_room_id'); } catch(e){}
          }
          set({ currentRoom: rData, roomId, loading: false, error: null });
        } else {
          try { localStorage.removeItem('chem_active_room_id'); } catch(e){}
          set({ currentRoom: null, roomId: null, error: "Phòng đã bị đóng", loading: false });
        }
      }, (err) => {
        console.error("Room snapshot error:", err);
        set({ loading: false, error: err.message });
      });
      
    } catch (error: any) {
      console.error("Join room error:", error);
      set({ error: error.message || "Lỗi tham gia phòng", loading: false });
      throw error;
    }
  },

  leaveRoom: async (uid) => {
    const { roomId, currentRoom } = get();
    try { localStorage.removeItem('chem_active_room_id'); } catch(e){}
    
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!roomId || !currentRoom) {
      set({ currentRoom: null, roomId: null, error: null });
      return;
    }
    
    try {
      const roomRef = doc(db, 'rooms', roomId);
      if (currentRoom.hostId === uid) {
        await deleteDoc(roomRef).catch(console.error);
      } else {
        await updateDoc(roomRef, {
          [`players.${uid}`]: deleteField()
        }).catch(console.error);
      }
    } catch (error) {
      console.error(error);
    }

    set({ currentRoom: null, roomId: null, error: null });
  },

  sendMessage: async (uid: string, text: string, displayName: string) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const { arrayUnion } = await import('firebase/firestore');
      await updateDoc(roomRef, {
        messages: arrayUnion({
          uid,
          text,
          displayName,
          timestamp: Date.now()
        })
      });
    } catch (e) {
      console.error(e);
    }
  },

  kickPlayer: async (targetUid: string) => {
    const { roomId, currentRoom } = get();
    if (!roomId || !currentRoom) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        [`players.${targetUid}`]: deleteField()
      });
    } catch (e) {
      console.error("Lỗi kick người chơi:", e);
    }
  },

  toggleReady: async (uid) => {
    const { roomId, currentRoom } = get();
    if (!roomId || !currentRoom) return;
    
    const isReady = !currentRoom.players[uid]?.isReady;
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      [`players.${uid}.isReady`]: isReady
    });
  },

  updateRoomSettings: async (settings) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, settings);
    } catch (e: any) {
      console.error("Lỗi cập nhật cài đặt phòng:", e);
      throw e;
    }
  },

  startGame: async () => {
    const { roomId, currentRoom } = get();
    if (!roomId || !currentRoom) return;
    
    // Request questions from Backend
    try {
      set({ loading: true });
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: currentRoom.mode,
          difficulty: currentRoom.difficulty,
          count: currentRoom.totalRounds
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();

        console.error("generate-questions:", res.status, errorText);

        throw new Error(`Không thể tạo câu hỏi (${res.status})`);
      }

      const questions = await res.json();
      
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'preparing',
        questions: questions
      });
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));

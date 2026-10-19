import { create } from 'zustand';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, getDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { generateClientQuestions } from '../data/clientQuestionGenerator';

export type GameMode =
  | 'balance'
  | 'fill_blank'
  | 'compound_name'
  | 'element_quiz'
  | 'oxidation_state'
  | 'mol_calc'
  | 'substance_match'
  | 'solution_ph'
  | 'organic_reactions'
  | 'experiment_lab'
  | 'mixed'
  | 'ranked_mixed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'random';
export type RoomStatus = 'lobby' | 'preparing' | 'roundActive' | 'roundReveal' | 'roundBreak' | 'matchEnd';

export type PlayerAnswer = string | number | (string | number)[] | null;

export interface BaseQuestion {
  id?: string;
  mode?: GameMode;
  difficulty?: Difficulty;
  equation: string;
  explanation: string;
  timeLimitSec?: number;
  grade?: number;
  chapter?: string;
  tags?: string[];
  hint?: string;
}

export interface BalanceQuestion extends BaseQuestion {
  answers: number[];
  acceptedAnswers: string[];
}

export interface FillBlankQuestion extends BaseQuestion {
  acceptedAnswers: string[];
}

export interface CompoundNameQuestion extends BaseQuestion {
  acceptedAnswers: string[];
}

export interface ElementQuizQuestion extends BaseQuestion {
  acceptedAnswers: string[];
}

export interface OxidationStateQuestion extends BaseQuestion {
  answers?: number[];
  acceptedAnswers: string[];
}

export interface NumericQuestion extends BaseQuestion {
  correctValue?: number | string;
  acceptedAnswers: (string | number)[];
  unit?: string;
  tolerance?: number;
}

export interface ChoiceQuestion extends BaseQuestion {
  options?: string[];
  correctIndex?: number;
  acceptedAnswers: string[];
}

export type Question =
  | BalanceQuestion
  | FillBlankQuestion
  | CompoundNameQuestion
  | ElementQuizQuestion
  | OxidationStateQuestion
  | NumericQuestion
  | ChoiceQuestion
  | (BaseQuestion & { answers?: any[]; acceptedAnswers?: any[]; [key: string]: any });

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
  lastAnswer?: PlayerAnswer;
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
  questions: Question[];
  messages?: any[];
  roundEndTime?: number;
  isRanked?: boolean;
  customTimeLimitSec?: number;
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
        customTimeLimitSec: params.customTimeLimitSec !== undefined ? params.customTimeLimitSec : undefined,
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
    
    try {
      set({ loading: true });
      let questions: any[] | null = null;

      // 1. Thử gọi API backend (khi có server Express chạy cùng)
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
        const res = await fetch(`${baseUrl}api/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: currentRoom.mode,
            difficulty: currentRoom.difficulty,
            count: currentRoom.totalRounds,
            safe: currentRoom.maxPlayers > 1,
            roomId: roomId,
            customTimeLimitSec: currentRoom.customTimeLimitSec,
            isPractice: currentRoom.maxPlayers === 1
          })
        });
        
        if (res.ok) {
          questions = await res.json();
        } else {
          console.warn(`[ChemDex] API /generate-questions trả về mã ${res.status}. Tự động kích hoạt cơ chế sinh đề client nội bộ...`);
        }
      } catch (networkErr) {
        console.warn("[ChemDex] Không thể kết nối API backend. Tự động chuyển sang bộ sinh đề client nội bộ:", networkErr);
      }

      // 2. Dự phòng phía Client (Khi chạy static hosting, GitHub Pages, 404, hoặc offline)
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        questions = generateClientQuestions(
          currentRoom.mode,
          currentRoom.difficulty,
          currentRoom.totalRounds,
          currentRoom.customTimeLimitSec,
          currentRoom.maxPlayers === 1
        );
      }
      
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'preparing',
        questions: questions
      });
      set({ loading: false });
    } catch (error: any) {
      console.error("[ChemDex] Lỗi bắt đầu trận đấu:", error);
      set({ error: error.message || "Không thể bắt đầu trận đấu", loading: false });
      throw error;
    }
  }
}));

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase/config";

export interface ArenaParticipant {
  uid: string;
  name: string;
  avatar?: string;
  role: "host" | "player";
  isReady: boolean;
  currentQuestionIndex: number;
  score: number;
  completed: boolean;
  finishedAt?: number;
}

export interface ArenaRoom {
  id: string;
  roomCode: string;
  title: string;
  examId: string;
  examTitle: string;
  hostUid: string;
  hostName: string;
  maxParticipants: number;
  status: "waiting" | "in_progress" | "finished";
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  winnerUid?: string;
  participants: Record<string, ArenaParticipant>;
}

const ARENA_COLLECTION = "arena_rooms";

// Fallback in-memory storage for environments where Firestore is offline or unauthenticated
const memoryRooms: Record<string, ArenaRoom> = {};
const memoryListeners: Record<string, Set<(room: ArenaRoom | null) => void>> = {};
const lobbyListeners = new Set<(rooms: ArenaRoom[]) => void>();

function notifyLobbyListeners() {
  const activeRooms = Object.values(memoryRooms).filter((r) => r.status === "waiting");
  lobbyListeners.forEach((cb) => {
    try {
      cb(activeRooms);
    } catch (e) {}
  });
}

function notifyRoomListeners(roomId: string) {
  const room = memoryRooms[roomId] || null;
  const cbs = memoryListeners[roomId];
  if (cbs) {
    cbs.forEach((cb) => {
      try {
        cb(room);
      } catch (e) {}
    });
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Tạo phòng thi đấu mới
 */
export async function createArenaRoom(params: {
  hostUid: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  examId: string;
  examTitle: string;
  maxParticipants: number;
}): Promise<ArenaRoom> {
  const roomCode = generateRoomCode();
  const roomId = `arena_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const hostParticipant: ArenaParticipant = {
    uid: params.hostUid,
    name: params.hostName,
    avatar: params.hostAvatar || "",
    role: "host",
    isReady: true,
    currentQuestionIndex: 0,
    score: 0,
    completed: false,
  };

  const newRoom: ArenaRoom = {
    id: roomId,
    roomCode,
    title: params.title.trim() || `Phòng thi ${params.hostName}`,
    examId: params.examId,
    examTitle: params.examTitle,
    hostUid: params.hostUid,
    hostName: params.hostName,
    maxParticipants: Math.max(2, Math.min(params.maxParticipants || 4, 50)),
    status: "waiting",
    createdAt: Date.now(),
    participants: {
      [params.hostUid]: hostParticipant,
    },
  };

  // Local fallback cache
  memoryRooms[roomId] = newRoom;
  notifyLobbyListeners();
  notifyRoomListeners(roomId);

  // Firestore save
  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    await setDoc(roomRef, newRoom);
  } catch (err) {
    console.warn("[ArenaService] Firestore save failed, using local room state:", err);
  }

  return newRoom;
}

/**
 * Tham gia phòng đấu bằng Room ID hoặc Mã phòng (6 ký tự)
 */
export async function joinArenaRoom(
  roomIdOrCode: string,
  user: { uid: string; name: string; avatar?: string }
): Promise<ArenaRoom> {
  const cleanKey = roomIdOrCode.trim().toUpperCase();

  let targetRoom: ArenaRoom | null = null;
  let targetRoomId = roomIdOrCode;

  // Check in memory first
  for (const r of Object.values(memoryRooms)) {
    if (r.id === roomIdOrCode || r.roomCode.toUpperCase() === cleanKey) {
      targetRoom = r;
      targetRoomId = r.id;
      break;
    }
  }

  // Check in Firestore if not found in memory
  if (!targetRoom) {
    try {
      if (roomIdOrCode.startsWith("arena_")) {
        const snap = await getDoc(doc(db, ARENA_COLLECTION, roomIdOrCode));
        if (snap.exists()) {
          targetRoom = snap.data() as ArenaRoom;
          targetRoomId = snap.id;
        }
      } else {
        const q = query(
          collection(db, ARENA_COLLECTION),
          where("roomCode", "==", cleanKey),
          limit(1)
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const docSnap = qSnap.docs[0];
          targetRoom = docSnap.data() as ArenaRoom;
          targetRoomId = docSnap.id;
        }
      }
    } catch (err) {
      console.warn("[ArenaService] Query error:", err);
    }
  }

  if (!targetRoom) {
    throw new Error("Không tìm thấy phòng thi đấu hoặc mã phòng không hợp lệ!");
  }

  if (targetRoom.status !== "waiting") {
    // If user is already in the room, allow reconnecting
    if (targetRoom.participants[user.uid]) {
      return targetRoom;
    }
    throw new Error("Phòng thi đấu này đã bắt đầu hoặc đã kết thúc!");
  }

  const currentCount = Object.keys(targetRoom.participants).length;
  if (!targetRoom.participants[user.uid] && currentCount >= targetRoom.maxParticipants) {
    throw new Error("Phòng thi đã đủ số lượng người tham gia!");
  }

  // Add participant
  if (!targetRoom.participants[user.uid]) {
    targetRoom.participants[user.uid] = {
      uid: user.uid,
      name: user.name,
      avatar: user.avatar || "",
      role: targetRoom.hostUid === user.uid ? "host" : "player",
      isReady: targetRoom.hostUid === user.uid,
      currentQuestionIndex: 0,
      score: 0,
      completed: false,
    };
  }

  memoryRooms[targetRoomId] = targetRoom;
  notifyRoomListeners(targetRoomId);
  notifyLobbyListeners();

  // Firestore update
  try {
    const roomRef = doc(db, ARENA_COLLECTION, targetRoomId);
    await updateDoc(roomRef, {
      [`participants.${user.uid}`]: targetRoom.participants[user.uid],
    });
  } catch (err) {
    console.warn("[ArenaService] Firestore join update error:", err);
  }

  return targetRoom;
}

/**
 * Đổi trạng thái Sẵn sàng
 */
export async function toggleParticipantReady(
  roomId: string,
  uid: string,
  isReady: boolean
): Promise<void> {
  const room = memoryRooms[roomId];
  if (room && room.participants[uid]) {
    room.participants[uid].isReady = isReady;
    notifyRoomListeners(roomId);
  }

  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    await updateDoc(roomRef, {
      [`participants.${uid}.isReady`]: isReady,
    });
  } catch (err) {
    console.warn("[ArenaService] Firestore toggleReady error:", err);
  }
}

/**
 * Bắt đầu trận đấu (Chỉ Chủ phòng Host)
 */
export async function startArenaMatch(roomId: string, hostUid: string): Promise<void> {
  const room = memoryRooms[roomId];
  if (room) {
    if (room.hostUid !== hostUid) {
      throw new Error("Chỉ chủ phòng mới có quyền bắt đầu trận đấu!");
    }
    room.status = "in_progress";
    room.startedAt = Date.now();
    notifyRoomListeners(roomId);
    notifyLobbyListeners();
  }

  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    await updateDoc(roomRef, {
      status: "in_progress",
      startedAt: Date.now(),
    });
  } catch (err) {
    console.warn("[ArenaService] Firestore startMatch error:", err);
  }
}

/**
 * Cập nhật tiến độ của người chơi trong trận đấu
 */
export async function updateParticipantProgress(
  roomId: string,
  uid: string,
  currentQuestionIndex: number,
  score: number,
  completed: boolean
): Promise<void> {
  const room = memoryRooms[roomId];
  if (room && room.participants[uid]) {
    const p = room.participants[uid];
    p.currentQuestionIndex = currentQuestionIndex;
    p.score = score;
    p.completed = completed;
    if (completed && !p.finishedAt) {
      p.finishedAt = Date.now();
    }

    // Check if someone finished first or all finished
    const parts = Object.values(room.participants);
    const allDone = parts.every((pt) => pt.completed);
    if (!room.winnerUid && completed) {
      room.winnerUid = uid;
    }
    if (allDone) {
      room.status = "finished";
      room.finishedAt = Date.now();
      notifyLobbyListeners();
    }
    notifyRoomListeners(roomId);
  }

  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    const updates: any = {
      [`participants.${uid}.currentQuestionIndex`]: currentQuestionIndex,
      [`participants.${uid}.score`]: score,
      [`participants.${uid}.completed`]: completed,
    };
    if (completed) {
      updates[`participants.${uid}.finishedAt`] = Date.now();
    }
    await updateDoc(roomRef, updates);
  } catch (err) {
    console.warn("[ArenaService] Firestore progress update error:", err);
  }
}

/**
 * Rời phòng thi
 */
export async function leaveArenaRoom(roomId: string, uid: string): Promise<void> {
  const room = memoryRooms[roomId];
  if (room && room.participants[uid]) {
    delete room.participants[uid];
    if (Object.keys(room.participants).length === 0 || room.hostUid === uid) {
      delete memoryRooms[roomId];
    }
    notifyRoomListeners(roomId);
    notifyLobbyListeners();
  }

  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const data = snap.data() as ArenaRoom;
      if (data.hostUid === uid || Object.keys(data.participants).length <= 1) {
        await deleteDoc(roomRef);
      } else {
        delete data.participants[uid];
        await updateDoc(roomRef, {
          participants: data.participants,
        });
      }
    }
  } catch (err) {
    console.warn("[ArenaService] Firestore leave error:", err);
  }
}

/**
 * Lắng nghe cập nhật phòng theo thời gian thực
 */
export function subscribeToArenaRoom(
  roomId: string,
  onUpdate: (room: ArenaRoom | null) => void
): () => void {
  // Register in memory listener
  if (!memoryListeners[roomId]) {
    memoryListeners[roomId] = new Set();
  }
  memoryListeners[roomId].add(onUpdate);

  // Immediately notify if exists in memory
  if (memoryRooms[roomId]) {
    onUpdate(memoryRooms[roomId]);
  }

  // Firestore onSnapshot
  let unsubFirestore = () => {};
  try {
    const roomRef = doc(db, ARENA_COLLECTION, roomId);
    unsubFirestore = onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteRoom = docSnap.data() as ArenaRoom;
          memoryRooms[roomId] = remoteRoom;
          onUpdate(remoteRoom);
        } else {
          // If deleted remotely
          if (!memoryRooms[roomId]) {
            onUpdate(null);
          }
        }
      },
      (error) => {
        console.warn("[ArenaService] onSnapshot room error:", error);
      }
    );
  } catch (e) {
    console.warn("[ArenaService] Setup room listener failed:", e);
  }

  return () => {
    memoryListeners[roomId]?.delete(onUpdate);
    unsubFirestore();
  };
}

/**
 * Lắng nghe danh sách các phòng đang chờ tại Sảnh
 */
export function subscribeToActiveRooms(
  onUpdate: (rooms: ArenaRoom[]) => void
): () => void {
  lobbyListeners.add(onUpdate);

  // Emit current in-memory waiting rooms
  const currentActive = Object.values(memoryRooms).filter((r) => r.status === "waiting");
  onUpdate(currentActive);

  // Firestore onSnapshot
  let unsubFirestore = () => {};
  try {
    const q = query(
      collection(db, ARENA_COLLECTION),
      where("status", "==", "waiting"),
      limit(20)
    );
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const fetched: ArenaRoom[] = snapshot.docs.map((d) => d.data() as ArenaRoom);
        // Merge with memory
        fetched.forEach((r) => {
          memoryRooms[r.id] = r;
        });
        onUpdate(fetched);
      },
      (error) => {
        console.warn("[ArenaService] onSnapshot lobby error:", error);
      }
    );
  } catch (e) {
    console.warn("[ArenaService] Setup lobby listener failed:", e);
  }

  return () => {
    lobbyListeners.delete(onUpdate);
    unsubFirestore();
  };
}

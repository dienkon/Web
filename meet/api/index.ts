import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Participant {
  id: string;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  lastSeen: number;
}

interface Question {
  id: string;
  roomId: string;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  status: 'active' | 'locked';
  createdAt: number;
}

interface UserAnswer {
  userId: string;
  userName: string;
  answer: 'A' | 'B' | 'C' | 'D';
  timestamp: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface WebRTCSignal {
  id: string;
  senderId: string;
  targetId: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  timestamp: number;
}

interface RoomStore {
  id: string;
  code: string;
  hostId: string;
  participants: Map<string, Participant>;
  currentQuestion?: Question;
  answers: Map<string, UserAnswer>;
  messages: ChatMessage[];
  signals: WebRTCSignal[];
}

// In-memory Serverless Function Cache across warm invocations
const serverlessRooms = new Map<string, RoomStore>();

function getOrCreateRoom(code: string, hostId?: string): RoomStore {
  const cleanCode = code.toUpperCase();
  let room = serverlessRooms.get(cleanCode);
  if (!room) {
    room = {
      id: `ROOM-${cleanCode}`,
      code: cleanCode,
      hostId: hostId || 'host_init',
      participants: new Map(),
      answers: new Map(),
      messages: [],
      signals: [],
    };
    serverlessRooms.set(cleanCode, room);
  }
  return room;
}

function calculateStats(room: RoomStore) {
  const stats = { A: 0, B: 0, C: 0, D: 0, total: 0 };
  for (const a of room.answers.values()) {
    if (a.answer in stats) {
      stats[a.answer as 'A' | 'B' | 'C' | 'D']++;
      stats.total++;
    }
  }
  return stats;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  // 1. Health check endpoint
  if (url.includes('/api/health')) {
    return res.status(200).json({
      status: 'ok',
      transport: 'vercel-serverless-gateway',
      timestamp: new Date().toISOString(),
    });
  }

  // Extract room code
  const codeMatch = url.match(/\/api\/rooms\/([a-zA-Z0-9_-]+)/);
  const roomCode = codeMatch ? codeMatch[1].toUpperCase() : 'DEMO';
  const room = getOrCreateRoom(roomCode);

  // Clean inactive participants older than 2 minutes
  const now = Date.now();
  for (const [pId, p] of room.participants.entries()) {
    if (now - p.lastSeen > 2 * 60 * 1000) {
      room.participants.delete(pId);
      room.answers.delete(pId);
    }
  }

  // GET /api/rooms/:code - Fetch Room Details & State
  if (req.method === 'GET' && !url.includes('/signals')) {
    const participantsList = Array.from(room.participants.values());
    const answersList = Array.from(room.answers.values());
    const statistics = calculateStats(room);

    return res.status(200).json({
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      participants: participantsList,
      currentQuestion: room.currentQuestion || null,
      answers: answersList,
      statistics,
      messages: room.messages.slice(-50),
    });
  }

  // POST /api/rooms/:code/join - Join Room
  if (req.method === 'POST' && url.includes('/join')) {
    const { userId, userName, isHost } = req.body || {};
    const pId = userId || `usr_${Math.random().toString(36).substring(2, 7)}`;
    const isRoomHost = isHost || room.participants.size === 0;
    if (isRoomHost) room.hostId = pId;

    const participant: Participant = {
      id: pId,
      name: userName || 'Khách',
      audioEnabled: true,
      videoEnabled: true,
      isHost: isRoomHost,
      lastSeen: Date.now(),
    };

    room.participants.set(pId, participant);

    return res.status(200).json({
      roomId: room.id,
      roomCode: room.code,
      participant,
      participants: Array.from(room.participants.values()),
      currentQuestion: room.currentQuestion || null,
      statistics: calculateStats(room),
    });
  }

  // POST /api/rooms/:code/poll - Create Question (Host)
  if (req.method === 'POST' && url.includes('/poll')) {
    const { text, options } = req.body || {};
    const question: Question = {
      id: `q_${Date.now()}`,
      roomId: room.id,
      text: text || 'Câu hỏi trắc nghiệm',
      options: options || { A: 'A', B: 'B', C: 'C', D: 'D' },
      status: 'active',
      createdAt: Date.now(),
    };
    room.currentQuestion = question;
    room.answers.clear();

    return res.status(200).json({
      question,
      statistics: calculateStats(room),
    });
  }

  // POST /api/rooms/:code/answer - Submit A/B/C/D Answer
  if (req.method === 'POST' && url.includes('/answer')) {
    const { userId, userName, answer } = req.body || {};
    if (!room.currentQuestion || room.currentQuestion.status === 'locked') {
      return res.status(400).json({ error: 'Câu hỏi không khả dụng hoặc đã bị khóa' });
    }

    const answerObj: UserAnswer = {
      userId,
      userName: userName || 'Học sinh',
      answer,
      timestamp: Date.now(),
    };

    room.answers.set(userId, answerObj);

    return res.status(200).json({
      statistics: calculateStats(room),
      answers: Array.from(room.answers.values()),
    });
  }

  // POST /api/rooms/:code/lock - Lock Question
  if (req.method === 'POST' && url.includes('/lock')) {
    if (room.currentQuestion) {
      room.currentQuestion.status = 'locked';
    }
    return res.status(200).json({ status: 'locked' });
  }

  // POST /api/rooms/:code/reset - Reset Question
  if (req.method === 'POST' && url.includes('/reset')) {
    if (room.currentQuestion) {
      room.currentQuestion.status = 'active';
      room.answers.clear();
    }
    return res.status(200).json({
      question: room.currentQuestion,
      statistics: calculateStats(room),
    });
  }

  // POST /api/rooms/:code/chat - Send Chat Message
  if (req.method === 'POST' && url.includes('/chat')) {
    const { senderId, senderName, text } = req.body || {};
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      senderId,
      senderName: senderName || 'User',
      text,
      timestamp: Date.now(),
    };
    room.messages.push(msg);
    return res.status(200).json(msg);
  }

  // WebRTC Signal Exchange (POST & GET)
  if (url.includes('/signals')) {
    if (req.method === 'POST') {
      const { senderId, targetId, type, payload } = req.body || {};
      const signal: WebRTCSignal = {
        id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        senderId,
        targetId,
        type,
        payload,
        timestamp: Date.now(),
      };
      room.signals.push(signal);
      return res.status(200).json({ status: 'queued' });
    }

    if (req.method === 'GET') {
      const targetId = (req.query.targetId as string) || '';
      const pending = room.signals.filter((s) => s.targetId === targetId);
      // Remove fetched signals
      room.signals = room.signals.filter((s) => s.targetId !== targetId);
      return res.status(200).json({ signals: pending });
    }
  }

  return res.status(200).json({
    message: 'MeetClass Serverless API Gateway',
    roomCode,
    participantCount: room.participants.size,
  });
}

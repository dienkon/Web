import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket.js';
import { roomManager } from './rooms.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// REST Health Check & Room Info API
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ice-servers', async (_req, res) => {
  const iceServers: any[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'stun:stun.services.mozilla.com' },
  ];

  const turnServer = process.env.TURN_SERVER || process.env.VITE_TURN_SERVER;
  if (turnServer) {
    const urls = turnServer.split(',').map((s) => s.trim());
    iceServers.push({
      urls,
      username: process.env.TURN_USERNAME || process.env.VITE_TURN_USERNAME || '',
      credential: process.env.TURN_PASSWORD || process.env.VITE_TURN_PASSWORD || '',
    });
  }

  const meteredApp = process.env.METERED_APP_NAME || process.env.VITE_METERED_APP_NAME;
  const meteredKey = process.env.METERED_API_KEY || process.env.VITE_METERED_API_KEY;
  if (meteredApp && meteredKey) {
    try {
      const response = await fetch(`https://${meteredApp}.metered.live/api/v1/turn/credentials?apiKey=${meteredKey}`);
      if (response.ok) {
        const dynamicServers = await response.json();
        if (Array.isArray(dynamicServers)) {
          return res.json({ iceServers: dynamicServers });
        }
      }
    } catch {}
  }

  res.json({ iceServers });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Không tìm thấy phòng học' });
  }
  return res.json({
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    participantCount: room.participants.size,
    classroomMode: room.classroomMode,
  });
});

// Initialize Socket Handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[MeetClass Server] Realtime server running on http://localhost:${PORT}`);
});

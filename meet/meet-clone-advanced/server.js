
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static('public'));

function makeId(len = 6) {
  return crypto.randomBytes(len).toString('hex').slice(0, len).toUpperCase();
}

function newRoom(roomId) {
  return {
    roomId,
    hostId: null,
    hostName: '',
    participants: new Map(), // socketId -> {id,name,role}
    pending: new Map(),      // socketId -> {id,name,requestedAt}
  };
}

const rooms = new Map(); // roomId -> room

function getRoom(roomId) {
  return rooms.get(roomId);
}

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, newRoom(roomId));
  return rooms.get(roomId);
}

function roomState(room, excludeId = null) {
  const participants = [];
  for (const p of room.participants.values()) {
    if (p.id === excludeId) continue;
    participants.push({ ...p });
  }
  const pending = [];
  for (const p of room.pending.values()) {
    if (p.id === excludeId) continue;
    pending.push({ ...p });
  }
  return {
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
    participants,
    pending,
  };
}

function socketRoomId(socket) {
  return socket.data.roomId || null;
}

function cleanupRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.participants.size === 0 && room.pending.size === 0) {
    rooms.delete(roomId);
  }
}

function promoteNewHost(room) {
  const first = room.participants.values().next().value;
  if (!first) {
    room.hostId = null;
    room.hostName = '';
    return;
  }
  room.hostId = first.id;
  room.hostName = first.name;
  const targetSocket = io.sockets.sockets.get(first.id);
  if (targetSocket) {
    targetSocket.emit('host-promoted', { roomId: room.roomId });
  }
  io.to(room.roomId).emit('host-changed', {
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
  });
}

io.on('connection', (socket) => {
  socket.data.name = '';
  socket.data.roomId = null;
  socket.data.role = null;
  socket.data.approvedRooms = new Set();

  socket.on('create-room', ({ roomId, name }) => {
    try {
      if (!roomId) return socket.emit('room-error', { message: 'Room code is required.' });
      const cleanRoomId = String(roomId).trim().toUpperCase();
      const cleanName = String(name || 'Host').trim().slice(0, 40) || 'Host';

      const room = ensureRoom(cleanRoomId);
      room.hostId = socket.id;
      room.hostName = cleanName;
      room.participants.set(socket.id, { id: socket.id, name: cleanName, role: 'host' });

      socket.data.name = cleanName;
      socket.data.roomId = cleanRoomId;
      socket.data.role = 'host';

      socket.join(cleanRoomId);

      socket.emit('room-created', {
        roomId: cleanRoomId,
        self: { id: socket.id, name: cleanName, role: 'host' },
        state: roomState(room),
      });

      socket.to(cleanRoomId).emit('participant-joined', {
        id: socket.id,
        name: cleanName,
        role: 'host',
      });
      io.to(cleanRoomId).emit('room-state', roomState(room));
    } catch (err) {
      socket.emit('room-error', { message: err.message || 'Failed to create room.' });
    }
  });

  socket.on('request-join', ({ roomId, name }) => {
    try {
      if (!roomId) return socket.emit('room-error', { message: 'Room code is required.' });
      const cleanRoomId = String(roomId).trim().toUpperCase();
      const cleanName = String(name || 'Guest').trim().slice(0, 40) || 'Guest';
      const room = getRoom(cleanRoomId);
      if (!room) {
        return socket.emit('room-error', { message: 'Room does not exist.' });
      }

      socket.data.name = cleanName;
      socket.data.roomId = cleanRoomId;
      socket.data.role = 'guest';

      room.pending.set(socket.id, { id: socket.id, name: cleanName, requestedAt: Date.now() });
      socket.emit('waiting-for-approval', { roomId: cleanRoomId, name: cleanName });
      if (room.hostId) {
        io.to(room.hostId).emit('pending-join', {
          roomId: cleanRoomId,
          id: socket.id,
          name: cleanName,
        });
      }
      io.to(cleanRoomId).emit('room-state', roomState(room));
    } catch (err) {
      socket.emit('room-error', { message: err.message || 'Join request failed.' });
    }
  });

  socket.on('cancel-request', ({ roomId }) => {
    const cleanRoomId = String(roomId || '').trim().toUpperCase();
    const room = getRoom(cleanRoomId);
    if (!room) return;
    room.pending.delete(socket.id);
    io.to(cleanRoomId).emit('room-state', roomState(room));
  });

  socket.on('approve-join', ({ roomId, socketId, accept }) => {
    const room = getRoom(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    const pending = room.pending.get(socketId);
    if (!pending) return;

    if (!accept) {
      room.pending.delete(socketId);
      const candidate = io.sockets.sockets.get(socketId);
      if (candidate) {
        candidate.emit('join-rejected', { roomId, message: 'Your request was rejected by the host.' });
      }
      io.to(room.roomId).emit('room-state', roomState(room));
      return;
    }

    room.pending.delete(socketId);
    const candidateSocket = io.sockets.sockets.get(socketId);
    if (candidateSocket) {
      candidateSocket.data.approvedRooms.add(roomId);
      candidateSocket.emit('join-approved', { roomId, name: pending.name });
    }
    io.to(room.roomId).emit('room-state', roomState(room));
  });

  socket.on('enter-room', ({ roomId, name, role }) => {
    try {
      if (!roomId) return socket.emit('room-error', { message: 'Room code is required.' });
      const cleanRoomId = String(roomId).trim().toUpperCase();
      const cleanName = String(name || socket.data.name || 'Guest').trim().slice(0, 40) || 'Guest';
      const room = getRoom(cleanRoomId);
      if (!room) return socket.emit('room-error', { message: 'Room does not exist.' });

      const isHost = role === 'host' || room.hostId === socket.id;
      if (!isHost && !socket.data.approvedRooms.has(cleanRoomId)) {
        return socket.emit('room-error', { message: 'You are not approved to enter this room yet.' });
      }

      socket.data.roomId = cleanRoomId;
      socket.data.name = cleanName;
      socket.data.role = isHost ? 'host' : 'guest';
      socket.join(cleanRoomId);

      room.participants.set(socket.id, {
        id: socket.id,
        name: cleanName,
        role: isHost ? 'host' : 'guest',
      });

      if (!room.hostId || isHost) {
        room.hostId = socket.id;
        room.hostName = cleanName;
      }

      socket.emit('room-state', roomState(room, socket.id));
      socket.to(cleanRoomId).emit('participant-joined', {
        id: socket.id,
        name: cleanName,
        role: isHost ? 'host' : 'guest',
      });
      io.to(cleanRoomId).emit('room-state', roomState(room));
    } catch (err) {
      socket.emit('room-error', { message: err.message || 'Failed to enter room.' });
    }
  });

  socket.on('signal', ({ roomId, to, type, data }) => {
    if (!roomId || !to) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (!room.participants.has(socket.id)) return;
    if (!room.participants.has(to)) return;
    io.to(to).emit('signal', {
      from: socket.id,
      type,
      data,
      name: socket.data.name || '',
      roomId,
    });
  });

  socket.on('chat-message', ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room || !room.participants.has(socket.id)) return;
    const msg = String(text || '').trim();
    if (!msg) return;
    io.to(roomId).emit('chat-message', {
      id: crypto.randomUUID(),
      from: socket.id,
      name: socket.data.name || 'Guest',
      text: msg.slice(0, 1000),
      at: Date.now(),
    });
  });

  socket.on('participant-status', ({ roomId, micEnabled, camEnabled, screenSharing }) => {
    const room = getRoom(roomId);
    if (!room || !room.participants.has(socket.id)) return;
    const p = room.participants.get(socket.id);
    p.micEnabled = !!micEnabled;
    p.camEnabled = !!camEnabled;
    p.screenSharing = !!screenSharing;
    room.participants.set(socket.id, p);
    socket.to(roomId).emit('participant-status', {
      id: socket.id,
      micEnabled: !!micEnabled,
      camEnabled: !!camEnabled,
      screenSharing: !!screenSharing,
    });
  });

  socket.on('leave-room', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;
    const leavingId = socket.id;
    room.participants.delete(leavingId);
    room.pending.delete(leavingId);
    socket.leave(roomId);
    socket.to(roomId).emit('participant-left', { id: leavingId });

    if (room.hostId === leavingId) {
      promoteNewHost(room);
    }
    cleanupRoomIfEmpty(roomId);
  });

  socket.on('disconnect', () => {
    const roomId = socketRoomId(socket);
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;

    room.participants.delete(socket.id);
    room.pending.delete(socket.id);
    socket.to(roomId).emit('participant-left', { id: socket.id });

    if (room.hostId === socket.id) {
      promoteNewHost(room);
    }
    cleanupRoomIfEmpty(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Meet clone server running on http://localhost:${PORT}`);
});

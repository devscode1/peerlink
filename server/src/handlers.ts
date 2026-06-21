import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}

interface RoomPeer {
  socketId: string;
  displayName: string;
  peerId: string;
}

interface Room {
  roomId: string;
  code: string;
  peers: Map<string, RoomPeer>;
  createdAt: number;
  lastActivityAt: number;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

const MAX_PEERS_PER_ROOM = 2;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_ROOMS = 10;
const RATE_LIMIT_MAX_ICE = 30;

const ipRoomCreationTimes = new Map<string, number[]>();
const roomIceRateLimits = new Map<string, { count: number; resetTime: number }>();
const roomDeletionTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function generateRoomId(): string {
  return `room_${randomUUID()}`;
}

function generatePeerId(): string {
  return `peer_${randomUUID().substring(0, 8)}`;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let times = ipRoomCreationTimes.get(ip) || [];
  times = times.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (times.length >= RATE_LIMIT_MAX_ROOMS) {
    return false;
  }

  times.push(now);
  ipRoomCreationTimes.set(ip, times);
  return true;
}

function checkIceRateLimit(roomCode: string): boolean {
  const now = Date.now();
  let limit = roomIceRateLimits.get(roomCode);

  if (!limit || now >= limit.resetTime) {
    roomIceRateLimits.set(roomCode, { count: 1, resetTime: now + 1000 });
    return true;
  }

  limit.count++;
  return limit.count <= RATE_LIMIT_MAX_ICE;
}

function updateRoomActivity(code: string) {
  const room = rooms.get(code);
  if (room) {
    room.lastActivityAt = Date.now();
  }
}

function cleanupRateLimitMaps() {
  const now = Date.now();

  for (const [ip, times] of ipRoomCreationTimes.entries()) {
    const filtered = times.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (filtered.length === 0) {
      ipRoomCreationTimes.delete(ip);
    } else {
      ipRoomCreationTimes.set(ip, filtered);
    }
  }

  for (const [code, limit] of roomIceRateLimits.entries()) {
    if (now >= limit.resetTime) {
      roomIceRateLimits.delete(code);
    }
  }
}

setInterval(cleanupRateLimitMaps, 60000);

export function setupSignalingHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const clientIp = socket.handshake.address;

    socket.on('create-room', (payload: { displayName: string }, callback: Function) => {
      try {
        if (!checkRateLimit(clientIp)) {
          callback({ success: false, error: 'Rate limit exceeded. Try again later.' });
          return;
        }

        let code = generateRoomCode();
        let attempts = 0;

        while (rooms.has(code) && attempts < 10) {
          code = generateRoomCode();
          attempts++;
        }

        if (rooms.has(code)) {
          callback({ success: false, error: 'Could not generate unique room code' });
          return;
        }

        const roomId = generateRoomId();
        const peerId = generatePeerId();

        const room: Room = {
          roomId,
          code,
          peers: new Map(),
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        };

        room.peers.set(socket.id, {
          socketId: socket.id,
          displayName: payload.displayName || 'Anonymous',
          peerId,
        });

        rooms.set(code, room);
        socketToRoom.set(socket.id, code);
        socket.join(code);

        callback({
          success: true,
          roomId: code,
          peerId,
        });
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    socket.on('join-room', (payload: { roomId: string; displayName: string }, callback: Function) => {
      try {
        const code = payload.roomId;

        if (!isValidRoomCode(code)) {
          callback({ success: false, error: 'Invalid room code format' });
          return;
        }

        const room = rooms.get(code);

        if (!room) {
          callback({ success: false, error: 'Room not found' });
          socket.emit('room-not-found', { roomId: code });
          return;
        }

        if (room.peers.size >= MAX_PEERS_PER_ROOM) {
          callback({ success: false, error: 'Room full' });
          socket.emit('room-full', { roomId: code });
          return;
        }

        const peerId = generatePeerId();

        room.peers.set(socket.id, {
          socketId: socket.id,
          displayName: payload.displayName || 'Anonymous',
          peerId,
        });

        socketToRoom.set(socket.id, code);
        socket.join(code);
        updateRoomActivity(code);

        io.to(code).emit('peer-joined', {
          peerId,
          displayName: payload.displayName || 'Anonymous',
        });

        callback({
          success: true,
          peerId,
          roomSize: room.peers.size,
        });
      } catch (error) {
        console.error('Error joining room:', error);
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    socket.on('offer', (payload: { roomId: string; sdp: string }, callback: Function) => {
      try {
        const code = payload.roomId;
        const room = rooms.get(code);

        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        updateRoomActivity(code);
        socket.to(code).emit('offer-received', {
          sdp: payload.sdp,
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error handling offer:', error);
        callback({ success: false, error: 'Failed to send offer' });
      }
    });

    socket.on('answer', (payload: { roomId: string; sdp: string }, callback: Function) => {
      try {
        const code = payload.roomId;
        const room = rooms.get(code);

        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        updateRoomActivity(code);
        socket.to(code).emit('answer-received', {
          sdp: payload.sdp,
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error handling answer:', error);
        callback({ success: false, error: 'Failed to send answer' });
      }
    });

    socket.on('ice-candidate', (payload: { roomId: string; candidate: any }, callback: Function) => {
      try {
        const code = payload.roomId;
        const room = rooms.get(code);

        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        if (!checkIceRateLimit(code)) {
          callback({ success: false, error: 'ICE rate limit exceeded' });
          return;
        }

        updateRoomActivity(code);
        socket.to(code).emit('ice-candidate-received', {
          candidate: payload.candidate,
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
        callback({ success: false, error: 'Failed to send ICE candidate' });
      }
    });

    socket.on('disconnect', () => {
      const code = socketToRoom.get(socket.id);

      if (code) {
        const room = rooms.get(code);

        if (room) {
          const leavingPeerId = room.peers.get(socket.id)?.peerId || 'unknown';

          room.peers.delete(socket.id);

          if (room.peers.size === 0) {
            const existingTimeout = roomDeletionTimeouts.get(code);
            if (existingTimeout) clearTimeout(existingTimeout);

            const timeout = setTimeout(() => {
              if (room.peers.size === 0) {
                rooms.delete(code);
                roomDeletionTimeouts.delete(code);
              }
            }, 60000);

            roomDeletionTimeouts.set(code, timeout);

            console.log(`[Room Empty] Code: ${code}, scheduled deletion in 60s`);
          } else {
            socket.to(code).emit('peer-disconnected', {
              peerId: leavingPeerId,
            });
            console.log(`[Peer Left] Socket: ${socket.id}, Peer: ${leavingPeerId}, Room: ${code}`);
          }
        }

        socketToRoom.delete(socket.id);
      }
    });
  });
}

export { rooms, socketToRoom };

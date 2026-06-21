import { Server } from 'socket.io';
import { rooms, socketToRoom } from './handlers.js';

const CLEANUP_INTERVAL = 30000;
const ROOM_INACTIVITY_TIMEOUT = 600000;
const ROOM_SINGLE_PEER_TIMEOUT = 600000;

export function initializeRoomCleanup(io: Server) {
  setInterval(() => {
    const now = Date.now();
    const roomsToClean: string[] = [];

    for (const [code, room] of rooms.entries()) {
      const inactivityMs = now - room.lastActivityAt;

      if (inactivityMs > ROOM_INACTIVITY_TIMEOUT) {
        roomsToClean.push(code);
        continue;
      }

      if (room.peers.size < 2 && now - room.createdAt > ROOM_SINGLE_PEER_TIMEOUT) {
        roomsToClean.push(code);
      }
    }

    for (const code of roomsToClean) {
      const room = rooms.get(code);
      if (!room) continue;

      try {
        io.to(code).emit('room-expired', {
          message: 'Room expired due to inactivity',
          code,
        });

        for (const [socketId, _peer] of room.peers.entries()) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(code);
            socket.emit('room-deleted', { roomCode: code });
          }
          socketToRoom.delete(socketId);
        }

        rooms.delete(code);

        console.log(`[Room Cleanup] Room ${code} cleaned up`);
      } catch (err) {
        console.error(`[Room Cleanup] Error cleaning ${code}:`, err);
      }
    }
  }, CLEANUP_INTERVAL);

  console.log(`[Room Cleanup] Service initialized (every ${CLEANUP_INTERVAL / 1000}s)`);
}

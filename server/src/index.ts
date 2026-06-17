import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupSignalingHandlers } from './handlers.js';
import { initializeRoomCleanup } from './roomCleanup.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? '' : '*');

app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN || false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

let redisPubClient: ReturnType<typeof createClient> | null = null;
let redisSubClient: ReturnType<typeof createClient> | null = null;

if (REDIS_URL) {
  redisPubClient = createClient({ url: REDIS_URL });
  redisSubClient = redisPubClient.duplicate();

  redisPubClient.on('error', (err) => {
    console.error('[Redis] Pub client error:', err.message);
  });

  redisSubClient.on('error', (err) => {
    console.error('[Redis] Sub client error:', err.message);
  });

  Promise.all([redisPubClient.connect(), redisSubClient.connect()])
    .then(() => {
      io.adapter(createAdapter(redisPubClient!, redisSubClient!));
      console.log('[Redis] Adapter initialized for horizontal scaling');
    })
    .catch((err) => {
      console.error('[Redis] Failed to connect, running without scaling:', err.message);
    });
}

initializeRoomCleanup(io);
setupSignalingHandlers(io);

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Connected: ${socket.id}`);

  socket.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Socket error [${socket.id}]:`, error);
  });
});

function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);

  io.close(() => {
    console.log('[Server] Socket.IO closed');

    httpServer.close(async () => {
      console.log('[Server] HTTP server closed');

      if (redisPubClient) {
        try { await redisPubClient.quit(); } catch {}
      }
      if (redisSubClient) {
        try { await redisSubClient.quit(); } catch {}
      }

      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('[Server] Forced shutdown after 10s');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 PeerLink Signaling Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Redis: ${REDIS_URL ? 'Connected' : 'Not configured'}`);
  console.log(`\n   Ready for WebRTC signaling\n`);
});

export default httpServer;

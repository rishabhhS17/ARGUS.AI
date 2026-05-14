const http = require('http');
const { Server } = require('socket.io');

const { app } = require('./src/app');
const { connectDatabase } = require('./src/config/db');
const { env } = require('./src/config/env');
const { attachRealtimeServer } = require('./src/services/realtimeService');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

attachRealtimeServer(io);

connectDatabase();

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

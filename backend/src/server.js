const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const app = require('./app');
const connectDatabase = require('./config/db');
const { Server } = require('socket.io');
const Conversation = require('./models/Conversation');
const User = require('./models/User');

async function start() {
  await connectDatabase();
  const server = http.createServer(app);
  const origins = app.get('corsOrigins');
  const io = new Server(server, { cors: { origin: origins, credentials: true } });
  app.set('io', io);

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.findbackToken;
      if (!token) return next(new Error('Authentication required.'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ _id: payload.sub, isActive: true }).select('_id');
      if (!user) return next(new Error('This account is unavailable.'));
      socket.userId = payload.sub;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    socket.on('conversation:join', async (conversationId) => {
      try {
        const allowed = await Conversation.exists({ _id: conversationId, participants: socket.userId });
        if (allowed) socket.join(`conversation:${conversationId}`);
      } catch (error) {
        socket.emit('conversation:error', { message: 'Unable to join this conversation.' });
      }
    });
  });

  const port = Number(process.env.PORT) || 4000;
  server.listen(port, () => console.log(`FindBack API listening on ${port}`));
}

start().catch((error) => {
  console.error('Unable to start FindBack API:', error.message);
  process.exitCode = 1;
});

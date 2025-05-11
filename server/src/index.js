const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const config = require('./config');
const gameRouter = require('./routes/game');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Mount game-related API routes under /api/game
app.use('/api/game', gameRouter);

// Setup socket.io for PvP
require('./services/socketService')(io);

// Only start server if this module is run directly
if (require.main === module) {
  server.listen(config.port, () => console.log(`Server listening on port ${config.port}`));
}

module.exports = { app, server, io };
const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const gameRouter = require('./routes/game');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Mount game-related API routes under /api/game
app.use('/api/game', gameRouter);

// Only start server if this module is run directly
if (require.main === module) {
  app.listen(config.port, () => console.log(`Server listening on port ${config.port}`));
}

module.exports = app;
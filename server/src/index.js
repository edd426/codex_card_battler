const express = require('express');
const path = require('path');
const cors = require('cors');
const { randomUUID } = require('crypto');
const { Game } = require('./game');
const cards = require('./cards.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const games = {};

app.post('/api/game/start', (req, res) => {
  const gameId = randomUUID();
  const game = new Game(cards);
  games[gameId] = game;
  res.json({ gameId, ...game.getState() });
});

app.post('/api/game/:gameId/play', (req, res) => {
  const { gameId } = req.params;
  const { cardId } = req.body;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.playCard(cardId);
    res.json(game.getState());
  } catch (err) {
    // On error, return error message along with current game state to keep client state shape
    const state = game.getState();
    res.status(400).json({ error: err.message, ...state });
  }
});

// Endpoint to end the user's turn, process AI turn, then start next user turn
app.post('/api/game/:gameId/end-turn', (req, res) => {
  const { gameId } = req.params;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.endTurn();
    res.json(game.getState());
  } catch (err) {
    // On error, return error message along with current game state to keep client state shape
    const state = game.getState();
    res.status(400).json({ error: err.message, ...state });
  }
});
// Endpoint to perform an attack with a user creature
app.post('/api/game/:gameId/attack', (req, res) => {
  const { gameId } = req.params;
  const { attackerId, targetType, targetId } = req.body;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.attack(attackerId, targetType, targetId);
    res.json(game.getState());
  } catch (err) {
    const state = game.getState();
    res.status(400).json({ error: err.message, ...state });
  }
});

// Only start server if this module is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
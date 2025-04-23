const { randomUUID } = require('crypto');
const cards = require('../cards.json');
const { Game } = require('../game');

// In-memory store of active games
const games = {};

// Start a new game and return its initial state
function startGame(req, res) {
  const gameId = randomUUID();
  const game = new Game(cards);
  games[gameId] = game;
  res.json({ gameId, ...game.getState() });
}

// Play a card from the user's hand
function playCard(req, res) {
  const { gameId } = req.params;
  const { cardId } = req.body;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.playCard(cardId);
    return res.json(game.getState());
  } catch (err) {
    const state = game.getState();
    return res.status(400).json({ error: err.message, ...state });
  }
}

// End the user's turn, process AI actions, and return new state
function endTurn(req, res) {
  const { gameId } = req.params;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.endTurn();
    return res.json(game.getState());
  } catch (err) {
    const state = game.getState();
    return res.status(400).json({ error: err.message, ...state });
  }
}

// Perform an attack with a specified creature
function attack(req, res) {
  const { gameId } = req.params;
  const { attackerId, targetType, targetId } = req.body;
  const game = games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.attack(attackerId, targetType, targetId);
    return res.json(game.getState());
  } catch (err) {
    const state = game.getState();
    return res.status(400).json({ error: err.message, ...state });
  }
}

module.exports = {
  startGame,
  playCard,
  endTurn,
  attack,
};
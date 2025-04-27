const { createGame, getGame, deleteGame } = require('../services/gameService');

// Base URL path for card images
const CARD_IMAGE_PATH = '/images/cards/';
// Base filesystem directory for card images
const fs = require('fs');
const path = require('path');

/**
 * Enriches game state card arrays with image URLs based on card IDs
 */
function enrichStateWithImages(state) {
  // Directory where card images are stored on disk
  const cardsDir = path.join(__dirname, '..', '..', 'public', 'images', 'cards');
  ['userHand', 'userBoard', 'aiBoard'].forEach(key => {
    if (Array.isArray(state[key])) {
      state[key].forEach(card => {
        // Prefer PNG if exists, otherwise fall back to SVG placeholder
        const pngName = `${card.id}.png`;
        const svgName = `${card.id}.svg`;
        if (fs.existsSync(path.join(cardsDir, pngName))) {
          card.image = `${CARD_IMAGE_PATH}${pngName}`;
        } else {
          card.image = `${CARD_IMAGE_PATH}${svgName}`;
        }
      });
    }
  });
}

// Start a new game and return its initial state
// Start a new game and return its initial state
// Start a new game and return its initial state
function startGame(req, res) {
  const { gameId, game } = createGame();
  const state = game.getState();
  enrichStateWithImages(state);
  return res.json({ gameId, ...state });
}

// Play a card from the user's hand
// Play a card from the user's hand
// Play a card from the user's hand
function playCard(req, res) {
  const { gameId } = req.params;
  const { cardId } = req.body;
  const game = getGame(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.playCard(cardId);
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.json(state);
  } catch (err) {
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.status(400).json({ error: err.message, ...state });
  }
}

// End the user's turn, process AI actions, and return new state
// End the user's turn, process AI actions, and return new state
// End the user's turn, process AI actions, and return new state
function endTurn(req, res) {
  const { gameId } = req.params;
  const game = getGame(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.endTurn();
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.json(state);
  } catch (err) {
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.status(400).json({ error: err.message, ...state });
  }
}

// Perform an attack with a specified creature
// Perform an attack with a specified creature
// Perform an attack with a specified creature
function attack(req, res) {
  const { gameId } = req.params;
  const { attackerId, targetType, targetId } = req.body;
  const game = getGame(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  try {
    game.attack(attackerId, targetType, targetId);
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.json(state);
  } catch (err) {
    const state = game.getState();
    enrichStateWithImages(state);
    if (state.over) deleteGame(gameId);
    return res.status(400).json({ error: err.message, ...state });
  }
}

module.exports = {
  startGame,
  playCard,
  endTurn,
  attack,
};
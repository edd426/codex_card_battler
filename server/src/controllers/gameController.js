const { createGame, getGame, deleteGame } = require('../services/gameService');

// Base path for card images
const CARD_IMAGE_PATH = '/images/cards/';

/**
 * Enriches game state card arrays with image URLs based on card IDs
 */
function enrichStateWithImages(state) {
  ['userHand', 'userBoard', 'aiBoard'].forEach(key => {
    if (Array.isArray(state[key])) {
      state[key].forEach(card => {
        card.image = `${CARD_IMAGE_PATH}${card.id}.svg`;
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
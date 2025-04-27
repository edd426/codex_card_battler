const { randomUUID } = require('crypto');
const cards = require('../cards.json');
const { Game } = require('../domain/game');

// In-memory store of active games
const games = {};

/**
 * Starts a new game instance and returns its ID and object
 */
function createGame() {
  const gameId = randomUUID();
  const game = new Game(cards);
  games[gameId] = game;
  return { gameId, game };
}

/**
 * Retrieves an existing game by ID
 */
function getGame(gameId) {
  return games[gameId];
}

/**
 * Deletes a game (if needed)
 */
function deleteGame(gameId) {
  delete games[gameId];
}

module.exports = { createGame, getGame, deleteGame };
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Start a new game
router.post('/start', gameController.startGame);
// Play a card
router.post('/:gameId/play', gameController.playCard);
// End user turn and process AI
router.post('/:gameId/end-turn', gameController.endTurn);
// Attack with a creature
router.post('/:gameId/attack', gameController.attack);

module.exports = router;
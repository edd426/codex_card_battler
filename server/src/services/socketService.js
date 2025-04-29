const { v4: uuidv4 } = require('uuid');
const { PvPGame } = require('../domain/pvpGame');
const fs = require('fs');
const path = require('path');

// Base URL path for card images
const CARD_IMAGE_PATH = '/images/cards/';

// In-memory storage for active PvP games
const pvpGames = {};
// Queue for players waiting for matchmaking
let matchmakingQueue = [];

/**
 * Enriches PvP game state card arrays with image URLs based on card IDs
 */
function enrichStateWithImages(state) {
  // Directory where card images are stored on disk
  const cardsDir = path.join(__dirname, '..', '..', 'public', 'images', 'cards');
  
  // Process cards on player 1's hand and board
  ['player1Hand', 'player1Board', 'player2Hand', 'player2Board'].forEach(key => {
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
  
  return state;
}

// Initialize Socket.io service
module.exports = function(io) {
  // Set up connection handler
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Store local variables for this socket session
    let currentGameId = null;
    let isPlayer1 = false;
    
    // Matchmaking: join queue
    socket.on('joinQueue', (nickname) => {
      console.log(`${nickname} joined the queue`);
      
      // Add player to queue with nickname
      socket.data.nickname = nickname;
      matchmakingQueue.push(socket);
      
      // Check if we can create a match
      if (matchmakingQueue.length >= 2) {
        // Get the first two players in the queue
        const player1Socket = matchmakingQueue.shift();
        const player2Socket = matchmakingQueue.shift();
        
        // Create a new game for these players
        const gameId = uuidv4();
        pvpGames[gameId] = new PvPGame(
          player1Socket.data.nickname,
          player2Socket.data.nickname
        );
        
        // Add game ID to player socket data
        player1Socket.data.gameId = gameId;
        player2Socket.data.gameId = gameId;
        player1Socket.data.isPlayer1 = true;
        player2Socket.data.isPlayer1 = false;
        
        // Have sockets join a room for this game
        player1Socket.join(gameId);
        player2Socket.join(gameId);
        
        // Get the initial game state and add images
        let gameState = pvpGames[gameId].getState();
        gameState = enrichStateWithImages(gameState);
        
        // Send game start event to both players
        player1Socket.emit('gameStart', {
          ...gameState,
          playerNumber: 1,
          opponentNickname: player2Socket.data.nickname,
          gameId: gameId
        });
        
        player2Socket.emit('gameStart', {
          ...gameState,
          playerNumber: 2,
          opponentNickname: player1Socket.data.nickname,
          gameId: gameId
        });
      } else {
        // No match yet, notify player they're waiting
        socket.emit('waitingForOpponent');
      }
    });
    
    // Leave the matchmaking queue
    socket.on('leaveQueue', () => {
      // Remove player from queue
      matchmakingQueue = matchmakingQueue.filter(s => s.id !== socket.id);
      // Notify player
      socket.emit('leftQueue');
    });
    
    // Playing a card
    socket.on('playCard', ({ gameId, cardId }) => {
      // Verify game exists
      if (!pvpGames[gameId]) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Get player number
      const playerNumber = socket.data.isPlayer1 ? 1 : 2;
      
      try {
        // Play the card
        pvpGames[gameId].playCard(cardId, playerNumber);
        
        // Get updated game state and add images
        let updatedState = pvpGames[gameId].getState();
        updatedState = enrichStateWithImages(updatedState);
        
        // Send individual updates to each player with their playerNumber
        // This ensures each player sees the correct perspective
        socket.emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber
        });
        
        // Send update to the other player
        socket.to(gameId).emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber === 1 ? 2 : 1
        });
      } catch (error) {
        // Handle errors (invalid moves, etc.)
        socket.emit('error', { message: error.message });
      }
    });
    
    // End turn
    socket.on('endTurn', ({ gameId }) => {
      // Verify game exists
      if (!pvpGames[gameId]) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Get player number
      const playerNumber = socket.data.isPlayer1 ? 1 : 2;
      
      try {
        // End the turn
        pvpGames[gameId].endTurn(playerNumber);
        
        // Get updated game state and add images
        let updatedState = pvpGames[gameId].getState();
        updatedState = enrichStateWithImages(updatedState);
        
        // Send individual updates to each player with their playerNumber
        // This ensures each player sees the correct perspective
        socket.emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber
        });
        
        // Send update to the other player
        socket.to(gameId).emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber === 1 ? 2 : 1
        });
        
        // Check if the game is over
        if (updatedState.over) {
          // Clean up the game after a short delay
          setTimeout(() => {
            delete pvpGames[gameId];
          }, 5000);
        }
      } catch (error) {
        // Handle errors (invalid moves, etc.)
        socket.emit('error', { message: error.message });
      }
    });
    
    // Attack
    socket.on('attack', ({ gameId, attackerId, targetType, targetId }) => {
      // Verify game exists
      if (!pvpGames[gameId]) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      // Get player number
      const playerNumber = socket.data.isPlayer1 ? 1 : 2;
      
      try {
        // Perform the attack
        pvpGames[gameId].attack(attackerId, targetType, targetId, playerNumber);
        
        // Get updated game state and add images
        let updatedState = pvpGames[gameId].getState();
        updatedState = enrichStateWithImages(updatedState);
        
        // Send individual updates to each player with their playerNumber
        // This ensures each player sees the correct perspective
        socket.emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber
        });
        
        // Send update to the other player
        socket.to(gameId).emit('gameUpdate', {
          ...updatedState,
          playerNumber: playerNumber === 1 ? 2 : 1
        });
        
        // Check if the game is over
        if (updatedState.over) {
          // Clean up the game after a short delay
          setTimeout(() => {
            delete pvpGames[gameId];
          }, 5000);
        }
      } catch (error) {
        // Handle errors (invalid moves, etc.)
        socket.emit('error', { message: error.message });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected');
      
      // Remove from matchmaking queue if present
      matchmakingQueue = matchmakingQueue.filter(s => s.id !== socket.id);
      
      // Handle game cleanup if in a game
      const gameId = socket.data.gameId;
      if (gameId && pvpGames[gameId]) {
        // Notify opponent
        socket.to(gameId).emit('opponentDisconnected');
        
        // Clean up the game
        delete pvpGames[gameId];
      }
    });
  });

  // For testing purposes - expose method to reset state
  if (process.env.NODE_ENV === 'test') {
    module.exports.resetState = function() {
      matchmakingQueue = [];
      Object.keys(pvpGames).forEach(gameId => {
        delete pvpGames[gameId];
      });
    };
  }
};
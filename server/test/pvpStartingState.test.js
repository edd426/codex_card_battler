const { PvPGame } = require('../src/domain/pvpGame');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const socketService = require('../src/services/socketService');

describe('PvP Game Starting State', () => {
  let io, serverSocket, clientSocket1, clientSocket2, httpServer;

  let timeoutId;
  
  beforeAll((done) => {
    // Setup socket.io server and clients
    httpServer = createServer();
    io = new Server(httpServer);
    socketService(io);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Create two clients
      clientSocket1 = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      
      clientSocket1.on('connect', () => {
        clientSocket2.on('connect', () => {
          done();
        });
      });
    });
  });

  afterAll(() => {
    // Make sure to clean up any remaining timeouts
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    io.close();
    clientSocket1.close();
    clientSocket2.close();
    httpServer.close();
  });

  test('First player can take actions at game start', (done) => {
    // Test variables to track states
    let player1State = null;
    let player2State = null;
    let gameStarted = false;

    // Handle gameStart events for both clients
    clientSocket1.on('gameStart', (state) => {
      player1State = state;
      gameStarted = checkGameStarted();
    });

    clientSocket2.on('gameStart', (state) => {
      player2State = state;
      gameStarted = checkGameStarted();
    });

    // Function to check if both players have received their starting state
    function checkGameStarted() {
      if (player1State && player2State) {
        // Check that one player has a playable state
        if (player1State.playerNumber === 1) {
          expect(player1State.turn).toBe(1); // Player 1 should have turn 1
          expect(player2State.turn).toBe(1); // Player 2 should also see it's player 1's turn
          
          // Player 1 should be able to play a card if they have one
          if (player1State.player1Hand.length > 0) {
            const card = player1State.player1Hand[0];
            if (card.manaCost <= player1State.player1CurrentMana) {
              clientSocket1.emit('playCard', {
                gameId: player1State.gameId,
                cardId: card.id
              });
            } else {
              // End turn if no playable cards
              clientSocket1.emit('endTurn', {
                gameId: player1State.gameId
              });
            }
          }
          
          done();
        } else if (player2State.playerNumber === 1) {
          expect(player2State.turn).toBe(1); // Player 1 should have turn 1 (even if socket 2 is player 1)
          expect(player1State.turn).toBe(1);
          done();
        }
        return true;
      }
      return false;
    }

    // Handle error events
    clientSocket1.on('error', (error) => {
      fail(`Player 1 received error: ${error.message}`);
    });

    clientSocket2.on('error', (error) => {
      fail(`Player 2 received error: ${error.message}`);
    });

    // Setup the game: both players join queue
    clientSocket1.emit('joinQueue', 'Player1');
    clientSocket2.emit('joinQueue', 'Player2');

    // If nothing happens after 3 seconds, we have a problem
    timeoutId = setTimeout(() => {
      if (!gameStarted) {
        fail('Game did not start properly within timeout');
        done();
      }
    }, 3000);
  });
});
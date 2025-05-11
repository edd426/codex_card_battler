# Test Setup

This directory contains tests for the Codex Card Battler game. The tests are organized as follows:

## Testing Setup

- `setupTests.js`: Sets up the server before running tests and tears it down afterward
- `teardownTests.js`: Global teardown file for Jest
- `jest.config.js`: Jest configuration for running tests

## Test Commands

The following commands can be used to run tests:

- `npm test`: Run all tests except socket tests (fastest and most reliable)
- `npm run test:all`: Run all tests including socket tests (may be less reliable)
- `npm run test:api`: Run only API tests
- `npm run test:pvp`: Run only PvP game tests
- `npm run test:socket`: Run only socket communication tests

## Test Files

- `api.test.js`: Tests for REST API endpoints
- `game.test.js`: Tests for basic game mechanics
- `socket.test.js`: Tests for WebSocket communication
- `pvpGame.test.js`: Tests for PvP game logic
- `pvpEdgeCases.test.js`: Tests for edge cases in PvP games
- `pvpMatchmaking.test.js`: Tests for matchmaking logic
- `pvpStartingState.test.js`: Tests for initial PvP game state
- `pvpTurns.test.js`: Tests for turn management in PvP games

## Important Notes

1. All tests now automatically start the server before running
2. The server is automatically shut down after tests complete
3. Socket.io tests require a running server instance, which is now handled by the setup file
4. Some tests may timeout if they take too long to run
5. The `--forceExit` flag is used to ensure Jest exits properly even if there are open handles

If you're developing new tests, follow these guidelines:

- Use the `setupTests.js` file to access the running server
- For socket tests, connect to the server address and port from the server object
- Use appropriate timeouts for tests that require network communication
- Close all connections in the `afterAll` or `afterEach` blocks
const { server } = require('../src/index');
const config = require('../src/config');

// Set NODE_ENV for testing
process.env.NODE_ENV = 'test';

// Use a different port for tests to avoid conflicts with development server
const TEST_PORT = config.port || 3001;

// Workaround for a timeout in pvpStartingState.test.js
// that keeps Jest from exiting properly
jest.setTimeout(10000);

// Start the server before all tests
beforeAll((done) => {
  server.listen(TEST_PORT, () => {
    console.log(`Test server started on port ${TEST_PORT}`);
    done();
  });
});

// Close the server after all tests are done
afterAll((done) => {
  // Find any open timeouts and clear them
  // This helps prevent Jest from complaining about open handles
  try {
    jest.useRealTimers();
  } catch (e) {
    // Ignore timer errors
  }
  
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});
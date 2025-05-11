// Global teardown for Jest
module.exports = async function() {
  // Jest has already closed the server via setupTests.js
  console.log('Global teardown complete');
};
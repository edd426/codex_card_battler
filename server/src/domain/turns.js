/**
 * Turn management functions
 */

/**
 * Update mana for a player at start of turn
 * @param {number} currentMax - Current max mana
 * @param {number} maxPossible - Maximum possible mana in game
 * @returns {Object} New mana values
 */
function updateMana(currentMax, maxPossible) {
  const newMax = Math.min(maxPossible, currentMax + 1);
  return {
    maxMana: newMax,
    currentMana: newMax
  };
}

/**
 * Process card draw
 * @param {Function} drawFn - Draw function to call
 * @param {Array} hand - Current hand to add cards to
 * @param {Function} logFn - Logging function
 * @param {string} player - 'user' or 'ai'
 * @returns {Array} Updated hand
 */
function processDraw(drawFn, hand, logFn, player) {
  const drawn = drawFn(1);
  if (!drawn.length) return hand;
  
  const newHand = [...hand, ...drawn];
  const playerText = player === 'user' ? 'You' : 'AI';
  const card = drawn[0];
  logFn(`${playerText} draw${player === 'user' ? '' : 's'} a card: ${card.name}`);
  
  return newHand;
}

/**
 * Switch active player
 * @param {string} currentTurn - Current turn ('user' or 'ai')
 * @returns {string} New turn
 */
function switchTurn(currentTurn) {
  return currentTurn === 'user' ? 'ai' : 'user';
}

module.exports = {
  updateMana,
  processDraw,
  switchTurn
};
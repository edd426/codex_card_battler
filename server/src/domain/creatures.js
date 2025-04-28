/**
 * Functions for creature management and reborn handling
 */

/**
 * Create a creature from a card definition
 * @param {Object} card - The card definition
 * @returns {Object} The creature game object
 */
function createCreature(card) {
  return {
    ...card,
    currentHealth: card.health,
    hasAttacked: false,
    summonedThisTurn: true,
    lifesteal: !!card.lifesteal,
    divineShield: !!card.divineShield,
    reborn: !!card.reborn,
    poisonous: !!card.poisonous,
  };
}

/**
 * Handle minion death and possible rebirth
 * @param {Object} creature - The creature that died
 * @param {Array} board - The board to update
 * @param {Function} logFn - Function to log events
 * @returns {Object|null} The reborn creature or null if not reborn
 */
function handleMinionDeath(creature, board, logFn) {
  // Remove the creature from its board
  const updatedBoard = board.filter(c => c !== creature);
  logFn(`${creature.name} dies`);
  
  if (creature.reborn) {
    logFn(`${creature.name} is reborn!`);
    const revived = {
      ...creature,
      currentHealth: 1,
      hasAttacked: false,
      summonedThisTurn: true,
      reborn: false,
    };
    return { board: [...updatedBoard, revived], revived };
  }
  
  return { board: updatedBoard, revived: null };
}

/**
 * Reset creatures at end of turn
 * @param {Array} creatures - List of creatures to reset
 */
function resetCreatures(creatures) {
  creatures.forEach(c => {
    c.hasAttacked = false;
    c.summonedThisTurn = false;
  });
}

module.exports = {
  createCreature,
  handleMinionDeath,
  resetCreatures
};
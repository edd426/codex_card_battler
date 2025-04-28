/**
 * AI related utilities
 */

const { createCreature } = require('./creatures');
const { processSpellEffect } = require('./effects');

/**
 * AI plays cards from hand if possible
 * @param {Object} state - Current game state
 * @param {Function} logFn - Logging function
 * @returns {Object} Updated game state
 */
function aiPlayCards(state, logFn) {
  let { aiHand, aiBoard, currentAiMana } = state;
  
  while (true) {
    const affordable = aiHand.filter(c => c.manaCost <= currentAiMana);
    if (!affordable.length) break;
    
    // Play cheapest card first
    affordable.sort((a, b) => a.manaCost - b.manaCost);
    const card = affordable[0];
    const idx = aiHand.findIndex(c => c.id === card.id);
    aiHand = [...aiHand.slice(0, idx), ...aiHand.slice(idx + 1)];
    currentAiMana -= card.manaCost;
    
    if (card.spell) {
      state = processSpellEffect(card, state, logFn, 'ai');
    } else {
      const creature = createCreature(card);
      aiBoard = [...aiBoard, creature];
      logFn(`AI plays ${card.name} (Cost ${card.manaCost})`);
    }
  }
  
  return {
    ...state,
    aiHand,
    aiBoard,
    currentAiMana
  };
}

/**
 * AI decides attack targets
 * @param {Object} state - Current game state
 * @param {number} attackMinionProbability - Probability of attacking minions
 * @returns {Array} List of attack instructions {attacker, targetType, targetId}
 */
function aiDecideAttacks(state, attackMinionProbability) {
  const { aiBoard, userBoard } = state;
  const attacks = [];
  
  for (const creature of aiBoard) {
    if (creature.hasAttacked || (creature.summonedThisTurn && !creature.charge)) {
      continue;
    }
    
    // Must attack taunt if present
    const tauntTargets = userBoard.filter(c => c.taunt);
    if (tauntTargets.length > 0) {
      attacks.push({
        attacker: creature,
        targetType: 'creature',
        target: tauntTargets[0],
        targetId: tauntTargets[0].id
      });
      continue;
    }
    
    // Decide whether to attack minion or hero
    let targetType = 'hero';
    let target = null;
    let targetId = null;
    
    if (userBoard.length > 0 && Math.random() < attackMinionProbability) {
      targetType = 'creature';
      // Pick random minion
      target = userBoard[Math.floor(Math.random() * userBoard.length)];
      targetId = target.id;
    }
    
    attacks.push({
      attacker: creature,
      targetType,
      target,
      targetId
    });
  }
  
  return attacks;
}

module.exports = {
  aiPlayCards,
  aiDecideAttacks
};
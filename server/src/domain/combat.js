/**
 * Combat utility functions for handling attacks between creatures and heroes
 */

const MAX_HEALTH = 20;

/**
 * Processes attack damage considering divine shield and poison
 * @param {Object} attacker - The attacking creature
 * @param {Object} target - The target creature or null for hero
 * @param {Function} logFn - Function to log combat events
 * @returns {Object} Result containing damage dealt and poison status
 */
function processDamage(attacker, target, logFn) {
  if (!target) {
    return { damage: attacker.attack, poisoned: false }; // Direct hero damage
  }
  
  let damage = attacker.attack;
  let poisoned = false;
  
  if (target.divineShield) {
    target.divineShield = false;
    damage = 0;
    logFn(`${target.name}'s Divine Shield absorbs the attack`);
  } else {
    target.currentHealth -= damage;
    logFn(`${attacker.name} attacks ${target.name} for ${damage}`);
    
    // Check if the attack was from a poisonous creature and actually dealt damage
    if (attacker.poisonous && damage > 0) {
      poisoned = true;
      logFn(`${attacker.name}'s poison affects ${target.name}!`);
      // Don't set currentHealth to 0 here, we'll handle death processing separately
    }
  }
  
  return { damage, poisoned };
}

/**
 * Processes lifesteal healing
 * @param {Object} source - Source creature with lifesteal
 * @param {number} damage - Amount of damage dealt
 * @param {number} currentHealth - Current health of hero
 * @param {Function} logFn - Function to log heal events
 * @param {string} player - 'user' or 'ai'
 * @returns {number} New health value after healing
 */
function processLifesteal(source, damage, currentHealth, logFn, player) {
  if (source.lifesteal && damage > 0) {
    const newHealth = Math.min(MAX_HEALTH, currentHealth + damage);
    logFn(`${player === 'user' ? 'You' : 'AI'} heal${player === 'ai' ? 's' : ''} for ${damage}`);
    return newHealth;
  }
  return currentHealth;
}

/**
 * Checks if attack is valid considering taunt mechanics
 * @param {Array} defenderBoard - Board of the defending player
 * @param {string} targetType - 'hero' or 'creature'
 * @param {number|null} targetId - ID of target creature or null for hero
 * @returns {boolean} Whether the attack is valid
 */
function isValidAttackTarget(defenderBoard, targetType, targetId) {
  const taunts = defenderBoard.filter(c => c.taunt);
  if (taunts.length > 0) {
    if (targetType === 'hero' || (targetType === 'creature' && !taunts.some(c => c.id === targetId))) {
      return false; // Must attack taunt first
    }
  }
  return true;
}

/**
 * Check if creature can attack
 * @param {Object} creature - Creature to check
 * @returns {boolean} Whether creature can attack
 */
function canAttack(creature) {
  if (creature.hasAttacked) {
    return false;
  }
  if (creature.summonedThisTurn && !creature.charge) {
    return false;
  }
  return true;
}

module.exports = {
  MAX_HEALTH,
  processDamage,
  processLifesteal,
  isValidAttackTarget,
  canAttack
};
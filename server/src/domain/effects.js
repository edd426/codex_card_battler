/**
 * Card effect processing utilities
 */

const { MAX_HEALTH } = require('./combat');

/**
 * Process spell card effects
 * @param {Object} card - The spell card being played
 * @param {Object} gameState - Current game state to modify
 * @param {Function} logFn - Function to log events
 * @param {string} caster - 'user' or 'ai' who is casting the spell
 * @returns {Object} Updated game state
 */
function processSpellEffect(card, gameState, logFn, caster) {
  const { effect } = card;
  if (!effect) return gameState;
  
  const isUser = caster === 'user';
  const userMessage = isUser ? 'You' : 'AI';
  
  logFn(`${userMessage} cast${isUser ? '' : 's'} ${card.name} (Cost ${card.manaCost})`);
  
  const state = { ...gameState };
  
  if (effect.target === 'aiHero') {
    const damage = effect.amount;
    state.aiHealth -= damage;
    logFn(`${card.name} deals ${damage} damage to AI hero`);
    
    if (state.aiHealth <= 0) {
      state.over = true;
      state.winner = 'user';
      logFn(`AI hero dies. You win!`);
    }
  } else if (effect.target === 'userHero') {
    if (effect.type === 'damage') {
      const damage = effect.amount;
      state.userHealth -= damage;
      logFn(`${card.name} deals ${damage} damage to you`);
      
      if (state.userHealth <= 0) {
        state.over = true;
        state.winner = 'ai';
        logFn(`You die. AI wins!`);
      }
    } else { // Healing
      const heal = effect.amount;
      state.userHealth = Math.min(MAX_HEALTH, state.userHealth + heal);
      logFn(`${card.name} heals you for ${heal}`);
    }
  } else if (effect.target === 'aiHero' && effect.type === 'heal') {
    const heal = effect.amount;
    state.aiHealth = Math.min(MAX_HEALTH, state.aiHealth + heal);
    logFn(`${card.name} heals AI for ${heal}`);
  }
  
  return state;
}

module.exports = {
  processSpellEffect
};
module.exports = {
  // Server port
  port: process.env.PORT || 3001, // Changed from 3000 to avoid conflicts
  // Maximum mana per player
  maxMana: 10,
  // AI chance to attack non-taunt minions when no taunt present
  aiAttackMinionProbability: 0.3,
};
module.exports = {
  // Server port
  port: process.env.PORT || 3000,
  // Maximum mana per player
  maxMana: 10,
  // AI chance to attack non-taunt minions when no taunt present
  aiAttackMinionProbability: 0.3,
};
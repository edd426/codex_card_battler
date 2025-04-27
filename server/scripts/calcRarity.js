#!/usr/bin/env node
/**
 * Script to calculate a score and assign a rarity to each card
 * Run with: node scripts/calcRarity.js
 */
const path = require('path');
// Load card definitions
const cards = require(path.join(__dirname, '../src/cards.json'));

/**
 * Compute a numeric score for a card based on its stats.
 * Weights: attack*1.5, health*1.2, charge+2, taunt+1.5, divineShield+2, lifesteal+2,
 * spell effect amount*1.5.
 */
function calculateScore(card) {
  let score = 0;
  if (card.spell) {
    // Spell cards: weight by effect amount
    if (card.effect && typeof card.effect.amount === 'number') {
      score += card.effect.amount * 1.5;
    }
  } else {
    // Creature cards
    score += (card.attack || 0) * 1.5;
    score += (card.health || 0) * 1.2;
    if (card.charge) score += 8;
    if (card.taunt) score += 1.5;
    if (card.divineShield) score += 2;
    if (card.lifesteal) score += 2;
  }
  // Penalize by mana cost (higher-cost cards get a larger net penalty)
  score -= (card.manaCost || 0) * 1.5;
  return score;
}

/**
 * Map a score to a rarity string
 */
function determineRarity(score) {
  if (score < 5) return 'Common';
  if (score < 8) return 'Rare';
  if (score < 12) return 'Epic';
  return 'Legendary';
}

// Output header
console.log('ID | Name                     | Score  | Rarity');
console.log('---|--------------------------|--------|-----------');
// Sort by card id and process
cards
  .slice()
  .sort((a, b) => a.id - b.id)
  .forEach(card => {
    const score = calculateScore(card);
    const rarity = determineRarity(score);
    const name = card.name.padEnd(24);
    const scoreText = score.toFixed(2).padStart(6);
    console.log(`${card.id.toString().padStart(2)} | ${name} | ${scoreText} | ${rarity}`);
  });
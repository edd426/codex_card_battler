#!/usr/bin/env node
/**
 * Simulation script: pit two identical AIs against each other and collect stats
 * Usage: node scripts/simulate.js [numGames]
 */
const path = require('path');
const { Game } = require(path.join(__dirname, '../src/domain/game'));
const cards = require(path.join(__dirname, '../src/cards.json'));

// Default number of simulations to run
const numGames = parseInt(process.argv[2], 10) || 100;

// Collect win statistics and per-card correlations
const stats = {
  wins: { user: 0, ai: 0 },
  cardStats: {},
};
// Initialize per-card counters
for (const c of cards) {
  // Track plays and draws per card
  stats.cardStats[c.id] = {
    name: c.name,
    userPlayed: 0,
    userWins: 0,
    aiPlayed: 0,
    aiWins: 0,
    userDrawn: 0,
    userDrawWins: 0,
    aiDrawn: 0,
    aiDrawWins: 0,
  };
}

// No swapRoles: user will use same play logic as AI directly


// Main loop: simulate games
// Main loop: simulate games
console.log(`Running ${numGames} simulated games...`);
for (let i = 0; i < numGames; i++) {
  try {
    const game = new Game(cards);
    const userPlayed = new Set();
    const aiPlayed = new Set();
    // Track cards drawn by each side (game-level draw correlation)
    const userDrawn = new Set();
    const aiDrawn = new Set();
    // Record initial hands as drawn cards
    game.userHand.forEach(c => userDrawn.add(c.id));
    game.aiHand.forEach(c => aiDrawn.add(c.id));
    while (!game.over) {
      // USER play phase: mirror built-in AI play logic (cheapest-first)
      while (true) {
        const affordable = game.userHand.filter(c => c.manaCost <= game.currentUserMana);
        if (!affordable.length) break;
        affordable.sort((a, b) => a.manaCost - b.manaCost);
        const card = affordable[0];
        try {
          game.playCard(card.id);
          userPlayed.add(card.id);
        } catch (_) {
          break;
        }
      }
      // If the game ended during the user's play phase, skip endTurn
      if (game.over) break;
      // Execute endTurn (userBoard attacks + AI plays/attacks + draw)
      const beforeLog = game.log.length;
      game.endTurn();
      // Record AI plays from log entries
      game.log.slice(beforeLog).forEach(entry => {
        // Record AI plays
        let m = entry.match(/^AI plays (.+?) \(Cost/);
        if (!m) m = entry.match(/^AI casts (.+?) \(Cost/);
        if (m) {
          const c = cards.find(x => x.name === m[1]);
          if (c) aiPlayed.add(c.id);
          return;
        }
        // Record draws by AI
        const md = entry.match(/^AI draws (.+)$/);
        if (md) {
          const c = cards.find(x => x.name === md[1]);
          if (c) aiDrawn.add(c.id);
          return;
        }
        // Record draws by user
        const mu = entry.match(/^You draw (.+)$/);
        if (mu) {
          const c = cards.find(x => x.name === mu[1]);
          if (c) userDrawn.add(c.id);
        }
      });
    }
    // Record winner and per-card stats
    if (game.winner === 'user' || game.winner === 'ai') {
      stats.wins[game.winner]++;
      userPlayed.forEach(id => {
        stats.cardStats[id].userPlayed++;
        if (game.winner === 'user') stats.cardStats[id].userWins++;
      });
      aiPlayed.forEach(id => {
        stats.cardStats[id].aiPlayed++;
        if (game.winner === 'ai') stats.cardStats[id].aiWins++;
      });
      // Record draw-based correlations
      userDrawn.forEach(id => {
        stats.cardStats[id].userDrawn++;
        if (game.winner === 'user') stats.cardStats[id].userDrawWins++;
      });
      aiDrawn.forEach(id => {
        stats.cardStats[id].aiDrawn++;
        if (game.winner === 'ai') stats.cardStats[id].aiDrawWins++;
      });
    }
  } catch (err) {
    console.error(`Simulation #${i+1} error:`, err);
  }
}

// Combined correlation: any play by either side
// Combined correlation: any play by either side, including draw stats
console.log('\nCombined correlations:');
console.log('ID | Name                     | Plays | Wins | Win% | Draws | Dr%');
console.log('---|--------------------------|-------|------|------|-------|----');
// Build and sort by descending win rate (N/A last)
const combined = Object.entries(stats.cardStats).map(([id, s]) => {
  const plays = (s.userPlayed || 0) + (s.aiPlayed || 0);
  const wins = (s.userWins || 0) + (s.aiWins || 0);
  const rate = plays > 0 ? wins / plays : -1;
  const draws = (s.userDrawn || 0) + (s.aiDrawn || 0);
  const drawWins = (s.userDrawWins || 0) + (s.aiDrawWins || 0);
  const drawRate = draws > 0 ? drawWins / draws : -1;
  return { id: Number(id), name: s.name, plays, wins, rate, draws, drawRate };
});
// Sort combined results by draw-rate descending, with entries lacking draw data last
combined.sort((a, b) => {
  if (a.drawRate < 0 && b.drawRate < 0) return 0;
  if (a.drawRate < 0) return 1;
  if (b.drawRate < 0) return -1;
  return b.drawRate - a.drawRate;
});
// Output combined sorted
for (const c of combined) {
  const rateText = c.rate >= 0 ? (c.rate * 100).toFixed(1) + '%' : 'N/A';
  const drawRateText = c.drawRate >= 0 ? (c.drawRate * 100).toFixed(1) + '%' : 'N/A';
  console.log(
    `${c.id.toString().padStart(2)} | ${c.name.padEnd(24)} | ${c.plays.toString().padStart(5)} | ${c.wins.toString().padStart(4)} | ${rateText.toString().padStart(5)} | ${c.draws.toString().padStart(6)} | ${drawRateText.toString().padStart(4)}`
  );
}

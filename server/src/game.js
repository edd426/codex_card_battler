const MAX_MANA = 10;
// Chance for AI to attack non-taunt minions when no taunt present
const AI_ATTACK_MINION_PROBABILITY = 0.3;
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class Game {
  constructor(cards) {
    this.deck = shuffle(cards.map(c => ({ ...c })));
    this.userHealth = 20;
    this.aiHealth = 20;
    this.userHand = this.draw(3);
    this.aiHand = this.draw(3);
    this.userBoard = [];
    this.aiBoard = [];
    this.turn = 'user';
    this.turnCount = 1;
    this.maxUserMana = 1;
    this.currentUserMana = 1;
    this.maxAiMana = 1;
    this.currentAiMana = 1;
    this.over = false;
    this.winner = null;
    this.log = [];
    this.logEvent(`Game started. Turn ${this.turnCount}: your turn. Mana: ${this.currentUserMana}/${this.maxUserMana}`);
  }

  draw(count) {
    const drawn = [];
    for (let i = 0; i < count && this.deck.length > 0; i++) {
      drawn.push(this.deck.shift());
    }
    return drawn;
  }

  logEvent(text) {
    this.log.push(text);
  }

  playCard(cardId) {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== 'user') throw new Error('Not your turn');
    const idx = this.userHand.findIndex(c => c.id === cardId);
    if (idx === -1) throw new Error('Card not in hand');
    const card = this.userHand[idx];
    if (card.manaCost > this.currentUserMana) throw new Error('Not enough mana');
    this.userHand.splice(idx, 1);
    this.currentUserMana -= card.manaCost;
    // Create creature instance, track summoning sickness and attack status
    const creature = {
      ...card,
      currentHealth: card.health,
      hasAttacked: false,
      // creatures cannot attack on the turn they are summoned unless they have Charge
      summonedThisTurn: true
    };
    this.userBoard.push(creature);
    this.logEvent(`You play ${card.name} (Cost ${card.manaCost})`);
  }
  /**
   * Perform an attack from a user creature to a target (hero or creature)
   */
  attack(attackerId, targetType, targetId) {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== 'user') throw new Error('Not your turn');
    const attacker = this.userBoard.find(c => c.id === attackerId);
    if (!attacker) throw new Error('Attacking creature not found');
    if (attacker.hasAttacked) throw new Error('Creature has already attacked');
    // Summoning sickness: cannot attack the turn summoned unless has Charge
    if (attacker.summonedThisTurn && !attacker.charge) {
      throw new Error(`${attacker.name} cannot attack until next turn`);
    }
    // Taunt: must attack taunt creatures first
    const taunts = this.aiBoard.filter(c => c.taunt);
    if (taunts.length > 0) {
      // if attacking hero or a non-taunt creature, block
      if (targetType === 'hero' || (targetType === 'creature' && !taunts.some(c => c.id === targetId))) {
        throw new Error('Must attack taunt creatures first');
      }
    }
    // Attack hero
    if (targetType === 'hero') {
      this.aiHealth -= attacker.attack;
      this.logEvent(`${attacker.name} attacks AI hero for ${attacker.attack}`);
      attacker.hasAttacked = true;
      if (this.aiHealth <= 0) {
        this.over = true;
        this.winner = 'user';
        this.logEvent(`AI hero dies. You win!`);
      }
      return;
    }
    // Attack another creature
    if (targetType === 'creature') {
      const target = this.aiBoard.find(c => c.id === targetId);
      if (!target) throw new Error('Target creature not found');
      // Deal damage
      target.currentHealth -= attacker.attack;
      this.logEvent(`${attacker.name} attacks ${target.name} for ${attacker.attack}`);
      // Retaliation
      attacker.currentHealth -= target.attack;
      this.logEvent(`${target.name} retaliates for ${target.attack}`);
      attacker.hasAttacked = true;
      // Remove dead creatures
      if (target.currentHealth <= 0) {
        this.aiBoard = this.aiBoard.filter(c => c !== target);
        this.logEvent(`${target.name} dies`);
      }
      if (attacker.currentHealth <= 0) {
        this.userBoard = this.userBoard.filter(c => c !== attacker);
        this.logEvent(`${attacker.name} dies`);
      }
      return;
    }
    throw new Error('Invalid target type');
  }

  endTurn() {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== 'user') throw new Error('Not your turn');

    // User creatures attack AI hero (skip those that attacked or have summoning sickness)
    for (const creature of this.userBoard) {
      if (creature.hasAttacked) continue;
      if (creature.summonedThisTurn && !creature.charge) continue;
      this.aiHealth -= creature.attack;
      creature.hasAttacked = true;
      this.logEvent(`${creature.name} attacks AI hero for ${creature.attack}`);
      if (this.aiHealth <= 0) {
        this.over = true;
        this.winner = 'user';
        this.logEvent(`AI hero dies. You win!`);
        return;
      }
    }

    // AI turn begins
    this.turn = 'ai';
    // Refill AI mana and draw
    this.maxAiMana = Math.min(MAX_MANA, this.maxAiMana + 1);
    this.currentAiMana = this.maxAiMana;
    const drawnAi = this.draw(1);
    if (drawnAi.length) {
      this.aiHand.push(...drawnAi);
      this.logEvent(`AI draws a card`);
    }
    // AI plays creatures, tracking summon status and attack flags
    let playable = true;
    while (playable) {
      const affordable = this.aiHand.filter(c => c.manaCost <= this.currentAiMana);
      if (affordable.length === 0) break;
      affordable.sort((a, b) => a.manaCost - b.manaCost);
      const card = affordable[0];
      const idx2 = this.aiHand.findIndex(c => c.id === card.id);
      this.aiHand.splice(idx2, 1);
      this.currentAiMana -= card.manaCost;
      const creature = {
        ...card,
        currentHealth: card.health,
        hasAttacked: false,
        summonedThisTurn: true
      };
      this.aiBoard.push(creature);
      this.logEvent(`AI plays ${card.name} (Cost ${card.manaCost})`);
    }
    // AI creatures attack (respecting Charge and summoning sickness) – prefer hitting taunt creatures
    for (const creature of [...this.aiBoard]) {
      if (creature.hasAttacked) continue;
      if (creature.summonedThisTurn && !creature.charge) continue;
      const tauntTargets = this.userBoard.filter(c => c.taunt);
      if (tauntTargets.length > 0) {
        // Attack a taunt creature first
        const target = tauntTargets[0];
        target.currentHealth -= creature.attack;
        this.logEvent(`${creature.name} attacks ${target.name} for ${creature.attack}`);
        // Retaliation
        creature.currentHealth -= target.attack;
        this.logEvent(`${target.name} retaliates for ${target.attack}`);
        creature.hasAttacked = true;
        // Remove dead creatures
        if (target.currentHealth <= 0) {
          this.userBoard = this.userBoard.filter(c => c !== target);
          this.logEvent(`${target.name} dies`);
        }
        if (creature.currentHealth <= 0) {
          this.aiBoard = this.aiBoard.filter(c => c !== creature);
          this.logEvent(`${creature.name} dies`);
          continue;
        }
      } else {
        // No taunt. Sometimes attack other creatures, otherwise attack hero
        const nonTauntTargets = this.userBoard;
        if (nonTauntTargets.length > 0 && Math.random() < AI_ATTACK_MINION_PROBABILITY) {
          // Attack a random creature
          const target = nonTauntTargets[Math.floor(Math.random() * nonTauntTargets.length)];
          target.currentHealth -= creature.attack;
          this.logEvent(`${creature.name} attacks ${target.name} for ${creature.attack}`);
          // Retaliation
          creature.currentHealth -= target.attack;
          this.logEvent(`${target.name} retaliates for ${target.attack}`);
          creature.hasAttacked = true;
          // Remove dead creatures
          if (target.currentHealth <= 0) {
            this.userBoard = this.userBoard.filter(c => c !== target);
            this.logEvent(`${target.name} dies`);
          }
          if (creature.currentHealth <= 0) {
            this.aiBoard = this.aiBoard.filter(c => c !== creature);
            this.logEvent(`${creature.name} dies`);
          }
        } else {
          // Attack hero
          this.userHealth -= creature.attack;
          creature.hasAttacked = true;
          this.logEvent(`${creature.name} attacks you for ${creature.attack}`);
          if (this.userHealth <= 0) {
            this.over = true;
            this.winner = 'ai';
            this.logEvent(`You die. AI wins!`);
            return;
          }
        }
      }
    }

    // Start next user turn
    this.turn = 'user';
    this.turnCount++;
    this.maxUserMana = Math.min(MAX_MANA, this.maxUserMana + 1);
    this.currentUserMana = this.maxUserMana;
    const drawnUser = this.draw(1);
    if (drawnUser.length) {
      this.userHand.push(...drawnUser);
      this.logEvent(`You draw a card`);
    }
    this.logEvent(`Turn ${this.turnCount}: your turn. Mana: ${this.currentUserMana}/${this.maxUserMana}`);
    // Reset attack status and clear summoning sickness for all creatures
    this.userBoard.forEach(c => {
      c.hasAttacked = false;
      c.summonedThisTurn = false;
    });
    this.aiBoard.forEach(c => {
      c.hasAttacked = false;
      c.summonedThisTurn = false;
    });
  }

  getState() {
    return {
      userHealth: this.userHealth,
      aiHealth: this.aiHealth,
      userHand: this.userHand,
      userBoard: this.userBoard,
      aiBoard: this.aiBoard,
      currentUserMana: this.currentUserMana,
      maxUserMana: this.maxUserMana,
      turn: this.turn,
      turnCount: this.turnCount,
      log: this.log,
      over: this.over,
      winner: this.winner
    };
  }
}

module.exports = { Game };
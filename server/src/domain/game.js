const { maxMana: MAX_MANA, aiAttackMinionProbability: AI_ATTACK_MINION_PROBABILITY } = require('../config');
const shuffle = require('./shuffle');

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
    if (card.spell) {
      this.logEvent(`You cast ${card.name} (Cost ${card.manaCost})`);
      const { effect } = card;
      if (effect) {
        if (effect.target === 'aiHero') {
          const dmg = effect.amount;
          this.aiHealth -= dmg;
          this.logEvent(`${card.name} deals ${dmg} damage to AI hero`);
          if (this.aiHealth <= 0) {
            this.over = true;
            this.winner = 'user';
            this.logEvent(`AI hero dies. You win!`);
          }
        } else if (effect.target === 'userHero') {
          const heal = effect.amount;
          this.userHealth = Math.min(20, this.userHealth + heal);
          this.logEvent(`${card.name} heals you for ${heal}`);
        }
      }
      return;
    }
    const creature = {
      ...card,
      currentHealth: card.health,
      hasAttacked: false,
      summonedThisTurn: true,
      lifesteal: !!card.lifesteal,
      divineShield: !!card.divineShield,
    };
    this.userBoard.push(creature);
    this.logEvent(`You play ${card.name} (Cost ${card.manaCost})`);
  }

  attack(attackerId, targetType, targetId) {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== 'user') throw new Error('Not your turn');
    const attacker = this.userBoard.find(c => c.id === attackerId);
    if (!attacker) throw new Error('Attacking creature not found');
    if (attacker.hasAttacked) throw new Error('Creature has already attacked');
    if (attacker.summonedThisTurn && !attacker.charge) {
      throw new Error(`${attacker.name} cannot attack until next turn`);
    }
    const taunts = this.aiBoard.filter(c => c.taunt);
    if (taunts.length > 0) {
      if (targetType === 'hero' || (targetType === 'creature' && !taunts.some(c => c.id === targetId))) {
        throw new Error('Must attack taunt creatures first');
      }
    }
    if (targetType === 'hero') {
      const dmg = attacker.attack;
      this.aiHealth -= dmg;
      this.logEvent(`${attacker.name} attacks AI hero for ${dmg}`);
      if (attacker.lifesteal && dmg > 0) {
        this.userHealth = Math.min(20, this.userHealth + dmg);
        this.logEvent(`You heal for ${dmg}`);
      }
      attacker.hasAttacked = true;
      if (this.aiHealth <= 0) {
        this.over = true;
        this.winner = 'user';
        this.logEvent(`AI hero dies. You win!`);
      }
      return;
    }
    if (targetType === 'creature') {
      const target = this.aiBoard.find(c => c.id === targetId);
      if (!target) throw new Error('Target creature not found');
      let dealt = attacker.attack;
      if (target.divineShield) {
        target.divineShield = false;
        dealt = 0;
        this.logEvent(`${target.name}'s Divine Shield absorbs the attack`);
      } else {
        target.currentHealth -= dealt;
        this.logEvent(`${attacker.name} attacks ${target.name} for ${dealt}`);
      }
      if (attacker.lifesteal && dealt > 0) {
        this.userHealth = Math.min(20, this.userHealth + dealt);
        this.logEvent(`You heal for ${dealt}`);
      }
      let ret = target.attack;
      if (attacker.divineShield) {
        attacker.divineShield = false;
        ret = 0;
        this.logEvent(`${attacker.name}'s Divine Shield absorbs the retaliatory damage`);
      } else {
        attacker.currentHealth -= ret;
        this.logEvent(`${target.name} retaliates for ${ret}`);
      }
      if (target.lifesteal && ret > 0) {
        this.aiHealth = Math.min(20, this.aiHealth + ret);
        this.logEvent(`AI heals for ${ret}`);
      }
      attacker.hasAttacked = true;
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

    for (const creature of this.userBoard) {
      if (creature.hasAttacked) continue;
      if (creature.summonedThisTurn && !creature.charge) continue;
      const dealt = creature.attack;
      this.aiHealth -= dealt;
      this.logEvent(`${creature.name} attacks AI hero for ${dealt}`);
      if (creature.lifesteal && dealt > 0) {
        this.userHealth = Math.min(20, this.userHealth + dealt);
        this.logEvent(`You heal for ${dealt}`);
      }
      creature.hasAttacked = true;
      if (this.aiHealth <= 0) {
        this.over = true;
        this.winner = 'user';
        this.logEvent(`AI hero dies. You win!`);
        return;
      }
    }

    this.turn = 'ai';
    // Track previous AI mana to allow disabling AI draw/play in specific scenarios (e.g., tests)
    const prevMaxAiMana = this.maxAiMana;
    this.maxAiMana = Math.min(MAX_MANA, this.maxAiMana + 1);
    this.currentAiMana = this.maxAiMana;
    if (prevMaxAiMana > 0) {
      const drawnAi = this.draw(1);
      if (drawnAi.length) {
        this.aiHand.push(...drawnAi);
        // Log the specific card drawn for better tracking
        const card = drawnAi[0];
        this.logEvent(`AI draws a card: ${card.name}`);
      }

      while (true) {
      const affordable = this.aiHand.filter(c => c.manaCost <= this.currentAiMana);
      if (!affordable.length) break;
      affordable.sort((a, b) => a.manaCost - b.manaCost);
      const card = affordable[0];
      const idx2 = this.aiHand.findIndex(c => c.id === card.id);
      this.aiHand.splice(idx2, 1);
      this.currentAiMana -= card.manaCost;
      if (card.spell) {
        this.logEvent(`AI casts ${card.name} (Cost ${card.manaCost})`);
        const effect = card.effect;
        if (effect) {
          if (effect.target === 'userHero') {
            const dmg = effect.amount;
            this.userHealth -= dmg;
            this.logEvent(`${card.name} deals ${dmg} damage to you`);
            if (this.userHealth <= 0) {
              this.over = true;
              this.winner = 'ai';
              this.logEvent(`You die. AI wins!`);
            }
          } else if (effect.target === 'aiHero') {
            const heal = effect.amount;
            this.aiHealth = Math.min(20, this.aiHealth + heal);
            this.logEvent(`${card.name} heals AI for ${heal}`);
          }
        }
        continue;
      }
      const creature = {
        ...card,
        currentHealth: card.health,
        hasAttacked: false,
        summonedThisTurn: true,
        lifesteal: !!card.lifesteal,
        divineShield: !!card.divineShield,
      };
      this.aiBoard.push(creature);
      this.logEvent(`AI plays ${card.name} (Cost ${card.manaCost})`);
    }

    }
    for (const creature of [...this.aiBoard]) {
      if (creature.hasAttacked) continue;
      if (creature.summonedThisTurn && !creature.charge) continue;
      const tauntTargets = this.userBoard.filter(c => c.taunt);
      if (tauntTargets.length > 0) {
        const target = tauntTargets[0];
        let dealt = creature.attack;
        if (target.divineShield) {
          target.divineShield = false;
          dealt = 0;
          this.logEvent(`${target.name}'s Divine Shield absorbs the attack`);
        } else {
          target.currentHealth -= dealt;
          this.logEvent(`${creature.name} attacks ${target.name} for ${dealt}`);
        }
        if (creature.lifesteal && dealt > 0) {
          this.aiHealth = Math.min(20, this.aiHealth + dealt);
          this.logEvent(`AI heals for ${dealt}`);
        }
        let ret = target.attack;
        if (creature.divineShield) {
          creature.divineShield = false;
          ret = 0;
          this.logEvent(`${creature.name}'s Divine Shield absorbs the retaliatory damage`);
        } else {
          creature.currentHealth -= ret;
          this.logEvent(`${target.name} retaliates for ${ret}`);
        }
        if (target.lifesteal && ret > 0) {
          this.userHealth = Math.min(20, this.userHealth + ret);
          this.logEvent(`You heal for ${ret}`);
        }
        creature.hasAttacked = true;
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
        if (this.userBoard.length > 0 && Math.random() < AI_ATTACK_MINION_PROBABILITY) {
          const target = this.userBoard[Math.floor(Math.random() * this.userBoard.length)];
          let dealt = creature.attack;
          if (target.divineShield) {
            target.divineShield = false;
            dealt = 0;
            this.logEvent(`${target.name}'s Divine Shield absorbs the attack`);
          } else {
            target.currentHealth -= dealt;
            this.logEvent(`${creature.name} attacks ${target.name} for ${dealt}`);
          }
          if (creature.lifesteal && dealt > 0) {
            this.aiHealth = Math.min(20, this.aiHealth + dealt);
            this.logEvent(`AI heals for ${dealt}`);
          }
          let ret = target.attack;
          if (creature.divineShield) {
            creature.divineShield = false;
            ret = 0;
            this.logEvent(`${creature.name}'s Divine Shield absorbs the retaliatory damage`);
          } else {
            creature.currentHealth -= ret;
            this.logEvent(`${target.name} retaliates for ${ret}`);
          }
          if (target.lifesteal && ret > 0) {
            this.userHealth = Math.min(20, this.userHealth + ret);
            this.logEvent(`You heal for ${ret}`);
          }
          creature.hasAttacked = true;
          if (target.currentHealth <= 0) {
            this.userBoard = this.userBoard.filter(c => c !== target);
            this.logEvent(`${target.name} dies`);
          }
          if (creature.currentHealth <= 0) {
            this.aiBoard = this.aiBoard.filter(c => c !== creature);
            this.logEvent(`${creature.name} dies`);
          }
        } else {
          const dealt = creature.attack;
          this.userHealth -= dealt;
          this.logEvent(`${creature.name} attacks you for ${dealt}`);
          if (creature.lifesteal && dealt > 0) {
            this.aiHealth = Math.min(20, this.aiHealth + dealt);
            this.logEvent(`AI heals for ${dealt}`);
          }
          creature.hasAttacked = true;
          if (this.userHealth <= 0) {
            this.over = true;
            this.winner = 'ai';
            this.logEvent(`You die. AI wins!`);
            return;
          }
        }
      }
    }

    this.turn = 'user';
    this.turnCount++;
    this.maxUserMana = Math.min(MAX_MANA, this.maxUserMana + 1);
    this.currentUserMana = this.maxUserMana;
    const drawnUser = this.draw(1);
    if (drawnUser.length) {
      this.userHand.push(...drawnUser);
      // Log the specific card drawn for better tracking
      const card = drawnUser[0];
      this.logEvent(`You draw a card: ${card.name}`);
    }
    this.logEvent(`Turn ${this.turnCount}: your turn. Mana: ${this.currentUserMana}/${this.maxUserMana}`);
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
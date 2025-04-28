const { maxMana: MAX_MANA, aiAttackMinionProbability: AI_ATTACK_MINION_PROBABILITY } = require('../config');
const shuffle = require('./shuffle');
const { processDamage, processLifesteal, isValidAttackTarget, canAttack, MAX_HEALTH } = require('./combat');
const { createCreature, handleMinionDeath, resetCreatures } = require('./creatures');
const { processSpellEffect } = require('./effects');
const { updateMana, processDraw, switchTurn } = require('./turns');
const { aiPlayCards, aiDecideAttacks } = require('./ai');

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
    this._validateGameState('user');
    
    const idx = this.userHand.findIndex(c => c.id === cardId);
    if (idx === -1) throw new Error('Card not in hand');
    
    const card = this.userHand[idx];
    if (card.manaCost > this.currentUserMana) throw new Error('Not enough mana');
    
    // Remove from hand and deduct mana
    this.userHand.splice(idx, 1);
    this.currentUserMana -= card.manaCost;
    
    if (card.spell) {
      // Process spell effect
      const gameState = {
        userHealth: this.userHealth,
        aiHealth: this.aiHealth,
        over: this.over,
        winner: this.winner
      };
      
      const updatedState = processSpellEffect(card, gameState, this.logEvent.bind(this), 'user');
      
      this.userHealth = updatedState.userHealth;
      this.aiHealth = updatedState.aiHealth;
      this.over = updatedState.over;
      this.winner = updatedState.winner;
    } else {
      // Create creature and add to board
      const creature = createCreature(card);
      this.userBoard.push(creature);
      this.logEvent(`You play ${card.name} (Cost ${card.manaCost})`);
    }
  }

  attack(attackerId, targetType, targetId) {
    this._validateGameState('user');
    
    const attacker = this.userBoard.find(c => c.id === attackerId);
    if (!attacker) throw new Error('Attacking creature not found');
    
    if (!canAttack(attacker)) {
      if (attacker.hasAttacked) {
        throw new Error('Creature has already attacked');
      } else {
        throw new Error(`${attacker.name} cannot attack until next turn`);
      }
    }
    
    if (!isValidAttackTarget(this.aiBoard, targetType, targetId)) {
      throw new Error('Must attack taunt creatures first');
    }
    
    if (targetType === 'hero') {
      this._attackHero(attacker, 'ai');
    } else if (targetType === 'creature') {
      const target = this.aiBoard.find(c => c.id === targetId);
      if (!target) throw new Error('Target creature not found');
      this._attackCreature(attacker, target, 'user', 'ai');
    } else {
      throw new Error('Invalid target type');
    }
  }
  
  _attackHero(attacker, targetPlayer) {
    const { damage } = processDamage(attacker, null, this.logEvent.bind(this));
    
    if (targetPlayer === 'ai') {
      this.aiHealth -= damage;
      this.logEvent(`${attacker.name} attacks AI hero for ${damage}`);
      
      // Process lifesteal if applicable
      this.userHealth = processLifesteal(attacker, damage, this.userHealth, this.logEvent.bind(this), 'user');
      
      attacker.hasAttacked = true;
      
      // Check win condition
      if (this.aiHealth <= 0) {
        this.over = true;
        this.winner = 'user';
        this.logEvent(`AI hero dies. You win!`);
      }
    } else {
      this.userHealth -= damage;
      this.logEvent(`${attacker.name} attacks you for ${damage}`);
      
      // Process lifesteal if applicable
      this.aiHealth = processLifesteal(attacker, damage, this.aiHealth, this.logEvent.bind(this), 'ai');
      
      attacker.hasAttacked = true;
      
      // Check win condition
      if (this.userHealth <= 0) {
        this.over = true;
        this.winner = 'ai';
        this.logEvent(`You die. AI wins!`);
      }
    }
  }
  
  _attackCreature(attacker, defender, attackerPlayer, defenderPlayer) {
    // Process attacker's damage to defender
    const { damage, poisoned } = processDamage(attacker, defender, this.logEvent.bind(this));
    
    // Process lifesteal if applicable
    if (attackerPlayer === 'user') {
      this.userHealth = processLifesteal(attacker, damage, this.userHealth, this.logEvent.bind(this), 'user');
    } else {
      this.aiHealth = processLifesteal(attacker, damage, this.aiHealth, this.logEvent.bind(this), 'ai');
    }
    
    // If poisoned, set health to 0 to ensure it dies
    if (poisoned) {
      defender.currentHealth = 0;
    }
    
    // Process defender's retaliation if still alive
    let ret = 0;
    let defenderPoisonProc = false;
    
    if (defender.currentHealth > 0) {
      ret = defender.attack;
      if (attacker.divineShield) {
        attacker.divineShield = false;
        ret = 0;
        this.logEvent(`${attacker.name}'s Divine Shield absorbs the retaliatory damage`);
      } else {
        attacker.currentHealth -= ret;
        this.logEvent(`${defender.name} retaliates for ${ret}`);
        
        // Check if retaliation is from a poisonous creature
        if (defender.poisonous && ret > 0) {
          defenderPoisonProc = true;
          this.logEvent(`${defender.name}'s poison affects ${attacker.name}!`);
          attacker.currentHealth = 0; // Immediately kill the poisoned creature
        }
      }
      
      // Process lifesteal from retaliation
      if (defenderPlayer === 'user') {
        this.userHealth = processLifesteal(defender, ret, this.userHealth, this.logEvent.bind(this), 'user');
      } else {
        this.aiHealth = processLifesteal(defender, ret, this.aiHealth, this.logEvent.bind(this), 'ai');
      }
    }
    
    attacker.hasAttacked = true;
    
    // Check for deaths and handle reborn
    if (defender.currentHealth <= 0) {
      if (defenderPlayer === 'ai') {
        const result = handleMinionDeath(defender, this.aiBoard, this.logEvent.bind(this));
        this.aiBoard = result.board;
      } else {
        const result = handleMinionDeath(defender, this.userBoard, this.logEvent.bind(this));
        this.userBoard = result.board;
      }
    }
    
    if (attacker.currentHealth <= 0) {
      if (attackerPlayer === 'user') {
        const result = handleMinionDeath(attacker, this.userBoard, this.logEvent.bind(this));
        this.userBoard = result.board;
      } else {
        const result = handleMinionDeath(attacker, this.aiBoard, this.logEvent.bind(this));
        this.aiBoard = result.board;
      }
    }
  }

  _validateGameState(expectedTurn) {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== expectedTurn) throw new Error('Not your turn');
  }
  
  endTurn() {
    this._validateGameState('user');
    
    // Auto-attack with user's creatures that haven't attacked yet
    for (const creature of this.userBoard) {
      if (!canAttack(creature)) continue;
      
      this._attackHero(creature, 'ai');
      if (this.over) return;
    }
    
    // AI's turn
    this.turn = 'ai';
    
    // Update AI mana
    const prevMaxAiMana = this.maxAiMana;
    const mana = updateMana(this.maxAiMana, MAX_MANA);
    this.maxAiMana = mana.maxMana;
    this.currentAiMana = mana.currentMana;
    
    // AI draws a card if possible
    if (prevMaxAiMana > 0) {
      this.aiHand = processDraw(this.draw.bind(this), this.aiHand, this.logEvent.bind(this), 'ai');
      
      // AI plays cards
      const gameState = {
        userHealth: this.userHealth,
        aiHealth: this.aiHealth,
        aiHand: this.aiHand,
        aiBoard: this.aiBoard,
        currentAiMana: this.currentAiMana,
        over: this.over,
        winner: this.winner
      };
      
      const updatedState = aiPlayCards(gameState, this.logEvent.bind(this));
      
      this.userHealth = updatedState.userHealth;
      this.aiHealth = updatedState.aiHealth;
      this.aiHand = updatedState.aiHand;
      this.aiBoard = updatedState.aiBoard;
      this.currentAiMana = updatedState.currentAiMana;
      this.over = updatedState.over;
      this.winner = updatedState.winner;
      
      if (this.over) return;
    }
    
    // AI attacks
    const attacks = aiDecideAttacks({
      aiBoard: this.aiBoard,
      userBoard: this.userBoard
    }, AI_ATTACK_MINION_PROBABILITY);
    
    for (const attack of attacks) {
      if (attack.targetType === 'hero') {
        this._attackHero(attack.attacker, 'user');
      } else {
        this._attackCreature(attack.attacker, attack.target, 'ai', 'user');
      }
      
      if (this.over) return;
    }
    
    // Back to player's turn
    this.turn = 'user';
    this.turnCount++;
    
    // Update user mana
    const userMana = updateMana(this.maxUserMana, MAX_MANA);
    this.maxUserMana = userMana.maxMana;
    this.currentUserMana = userMana.currentMana;
    
    // User draws a card
    this.userHand = processDraw(this.draw.bind(this), this.userHand, this.logEvent.bind(this), 'user');
    
    // Log turn info
    this.logEvent(`Turn ${this.turnCount}: your turn. Mana: ${this.currentUserMana}/${this.maxUserMana}`);
    
    // Reset all creatures
    resetCreatures(this.userBoard);
    resetCreatures(this.aiBoard);
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
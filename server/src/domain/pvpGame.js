const { maxMana: MAX_MANA } = require('../config');
const shuffle = require('./shuffle');
const { processDamage, processLifesteal, isValidAttackTarget, canAttack, MAX_HEALTH } = require('./combat');
const { createCreature, handleMinionDeath, resetCreatures } = require('./creatures');
const { processSpellEffect } = require('./effects');
const { updateMana, processDraw, switchTurn } = require('./turns');
const cards = require('../cards.json');

class PvPGame {
  constructor(player1Name, player2Name) {
    // Create two shuffled decks
    this.player1Deck = shuffle(cards.map(c => ({ ...c })));
    this.player2Deck = shuffle(cards.map(c => ({ ...c })));
    
    // Player health
    this.player1Health = 20;
    this.player2Health = 20;
    
    // Hands
    this.player1Hand = this.draw(3, 1);
    this.player2Hand = this.draw(3, 2);
    
    // Boards (creatures in play)
    this.player1Board = [];
    this.player2Board = [];
    
    // Turn tracking (player 1 goes first)
    this.turn = 1;
    this.turnCount = 1;
    
    // Mana
    this.player1MaxMana = 1;
    this.player1CurrentMana = 1;
    this.player2MaxMana = 1;
    this.player2CurrentMana = 1;
    
    // Game state
    this.over = false;
    this.winner = null;
    
    // Player names
    this.player1Name = player1Name || 'Player 1';
    this.player2Name = player2Name || 'Player 2';
    
    // Game log
    this.log = [];
    this.logEvent(`Game started. Turn ${this.turnCount}: ${this.player1Name}'s turn`);
  }
  
  draw(count, playerNumber) {
    const drawn = [];
    const deck = playerNumber === 1 ? this.player1Deck : this.player2Deck;
    
    for (let i = 0; i < count && deck.length > 0; i++) {
      drawn.push(deck.shift());
    }
    
    return drawn;
  }
  
  logEvent(text) {
    this.log.push(text);
  }
  
  playCard(cardId, playerNumber) {
    this._validateGameState(playerNumber);
    
    const hand = playerNumber === 1 ? this.player1Hand : this.player2Hand;
    const idx = hand.findIndex(c => c.id === cardId);
    
    if (idx === -1) throw new Error('Card not in hand');
    
    const card = hand[idx];
    const currentMana = playerNumber === 1 ? this.player1CurrentMana : this.player2CurrentMana;
    
    if (card.manaCost > currentMana) throw new Error('Not enough mana');
    
    // Remove card from hand and deduct mana
    if (playerNumber === 1) {
      this.player1Hand.splice(idx, 1);
      this.player1CurrentMana -= card.manaCost;
    } else {
      this.player2Hand.splice(idx, 1);
      this.player2CurrentMana -= card.manaCost;
    }
    
    const playerName = playerNumber === 1 ? this.player1Name : this.player2Name;
    
    if (card.spell) {
      // Process spell effect
      const gameState = {
        player1Health: this.player1Health,
        player2Health: this.player2Health,
        over: this.over,
        winner: this.winner
      };
      
      // For spells, we need to adapt the targeting since the original code
      // assumes user vs AI. Here we use player1 vs player2.
      const targetPlayer = playerNumber === 1 ? 'player2' : 'player1';
      const casterPlayer = playerNumber === 1 ? 'player1' : 'player2';
      
      // TODO: Process spell effect for PvP
      // This requires modification of the processSpellEffect function
      // For minimal implementation, we'll skip complex spell effects
      
      this.logEvent(`${playerName} plays spell ${card.name} (Cost ${card.manaCost})`);
    } else {
      // Create creature and add to board
      const creature = createCreature(card);
      
      if (playerNumber === 1) {
        this.player1Board.push(creature);
      } else {
        this.player2Board.push(creature);
      }
      
      this.logEvent(`${playerName} plays ${card.name} (Cost ${card.manaCost})`);
    }
  }
  
  attack(attackerId, targetType, targetId, playerNumber) {
    this._validateGameState(playerNumber);
    
    const attackerBoard = playerNumber === 1 ? this.player1Board : this.player2Board;
    const defenderBoard = playerNumber === 1 ? this.player2Board : this.player1Board;
    
    const attacker = attackerBoard.find(c => c.id === attackerId);
    if (!attacker) throw new Error('Attacking creature not found');
    
    if (!canAttack(attacker)) {
      if (attacker.hasAttacked) {
        throw new Error('Creature has already attacked');
      } else {
        throw new Error(`${attacker.name} cannot attack until next turn`);
      }
    }
    
    if (!isValidAttackTarget(defenderBoard, targetType, targetId)) {
      throw new Error('Must attack taunt creatures first');
    }
    
    if (targetType === 'hero') {
      this._attackHero(attacker, playerNumber === 1 ? 2 : 1);
    } else if (targetType === 'creature') {
      const target = defenderBoard.find(c => c.id === targetId);
      if (!target) throw new Error('Target creature not found');
      this._attackCreature(attacker, target, playerNumber);
    } else {
      throw new Error('Invalid target type');
    }
  }
  
  _attackHero(attacker, targetPlayerNumber) {
    const { damage } = processDamage(attacker, null, this.logEvent.bind(this));
    const attackerPlayerNumber = targetPlayerNumber === 1 ? 2 : 1;
    const attackerName = attackerPlayerNumber === 1 ? this.player1Name : this.player2Name;
    const targetName = targetPlayerNumber === 1 ? this.player1Name : this.player2Name;
    
    if (targetPlayerNumber === 1) {
      this.player1Health -= damage;
      this.logEvent(`${attacker.name} attacks ${targetName} for ${damage}`);
      
      // Process lifesteal if applicable
      if (attacker.lifesteal) {
        this.player2Health = Math.min(this.player2Health + damage, MAX_HEALTH);
        this.logEvent(`${attacker.name} heals ${attackerName} for ${damage}`);
      }
      
      // Check win condition
      if (this.player1Health <= 0) {
        this.over = true;
        this.winner = 2;
        this.logEvent(`${targetName} dies. ${attackerName} wins!`);
      }
    } else {
      this.player2Health -= damage;
      this.logEvent(`${attacker.name} attacks ${targetName} for ${damage}`);
      
      // Process lifesteal if applicable
      if (attacker.lifesteal) {
        this.player1Health = Math.min(this.player1Health + damage, MAX_HEALTH);
        this.logEvent(`${attacker.name} heals ${attackerName} for ${damage}`);
      }
      
      // Check win condition
      if (this.player2Health <= 0) {
        this.over = true;
        this.winner = 1;
        this.logEvent(`${targetName} dies. ${attackerName} wins!`);
      }
    }
    
    attacker.hasAttacked = true;
  }
  
  _attackCreature(attacker, defender, attackerPlayerNumber) {
    const defenderPlayerNumber = attackerPlayerNumber === 1 ? 2 : 1;
    const attackerName = attackerPlayerNumber === 1 ? this.player1Name : this.player2Name;
    const defenderName = defenderPlayerNumber === 1 ? this.player1Name : this.player2Name;
    
    // Process attacker's damage to defender
    let damage = attacker.attack;
    let poisoned = false;
    
    // Log the attack
    this.logEvent(`${attacker.name} attacks ${defender.name} for ${damage}`);
    
    // Apply divine shield logic for defender
    if (defender.divineShield) {
      defender.divineShield = false;
      this.logEvent(`${defender.name}'s Divine Shield absorbs the attack`);
    } else {
      // Apply damage to defender
      defender.currentHealth -= damage;
      
      // Check if attacker is poisonous
      if (attacker.poisonous && damage > 0) {
        poisoned = true;
        this.logEvent(`${attacker.name}'s poison affects ${defender.name}!`);
        defender.currentHealth = 0; // Immediately kill the poisoned creature
      }
    }
    
    // Process lifesteal if applicable
    if (attacker.lifesteal && damage > 0 && !defender.divineShield) {
      if (attackerPlayerNumber === 1) {
        this.player1Health = Math.min(this.player1Health + damage, MAX_HEALTH);
        this.logEvent(`${attacker.name} heals ${attackerName} for ${damage}`);
      } else {
        this.player2Health = Math.min(this.player2Health + damage, MAX_HEALTH);
        this.logEvent(`${attacker.name} heals ${attackerName} for ${damage}`);
      }
    }
    
    // Process defender's retaliation if still alive
    let ret = 0;
    
    if (defender.currentHealth > 0) {
      ret = defender.attack;
      
      // Apply divine shield logic for attacker
      if (attacker.divineShield) {
        attacker.divineShield = false;
        this.logEvent(`${attacker.name}'s Divine Shield absorbs the retaliatory damage`);
      } else {
        // Apply retaliation damage
        attacker.currentHealth -= ret;
        this.logEvent(`${defender.name} retaliates for ${ret}`);
        
        // Check if defender is poisonous
        if (defender.poisonous && ret > 0) {
          this.logEvent(`${defender.name}'s poison affects ${attacker.name}!`);
          attacker.currentHealth = 0; // Immediately kill the poisoned creature
        }
      }
      
      // Process lifesteal from retaliation
      if (defender.lifesteal && ret > 0 && !attacker.divineShield) {
        if (defenderPlayerNumber === 1) {
          this.player1Health = Math.min(this.player1Health + ret, MAX_HEALTH);
          this.logEvent(`${defender.name} heals ${defenderName} for ${ret}`);
        } else {
          this.player2Health = Math.min(this.player2Health + ret, MAX_HEALTH);
          this.logEvent(`${defender.name} heals ${defenderName} for ${ret}`);
        }
      }
    }
    
    // Mark attacker as having attacked
    attacker.hasAttacked = true;
    
    // Check for deaths and handle reborn
    if (defender.currentHealth <= 0) {
      if (defenderPlayerNumber === 1) {
        const result = handleMinionDeath(defender, this.player1Board, this.logEvent.bind(this));
        this.player1Board = result.board;
      } else {
        const result = handleMinionDeath(defender, this.player2Board, this.logEvent.bind(this));
        this.player2Board = result.board;
      }
    }
    
    if (attacker.currentHealth <= 0) {
      if (attackerPlayerNumber === 1) {
        const result = handleMinionDeath(attacker, this.player1Board, this.logEvent.bind(this));
        this.player1Board = result.board;
      } else {
        const result = handleMinionDeath(attacker, this.player2Board, this.logEvent.bind(this));
        this.player2Board = result.board;
      }
    }
  }
  
  _validateGameState(expectedPlayerNumber) {
    if (this.over) throw new Error('Game is already over');
    if (this.turn !== expectedPlayerNumber) throw new Error('Not your turn');
  }
  
  endTurn(playerNumber) {
    this._validateGameState(playerNumber);
    
    // Switch turns
    this.turn = playerNumber === 1 ? 2 : 1;
    
    // Increment turn count if player 2 ends turn
    if (playerNumber === 2) {
      this.turnCount++;
    }
    
    // Update mana for the player whose turn is starting
    if (this.turn === 1) {
      const mana = updateMana(this.player1MaxMana, MAX_MANA);
      this.player1MaxMana = mana.maxMana;
      this.player1CurrentMana = mana.currentMana;
      
      // Skip card draw in the first turn for player 1
      if (this.turnCount > 1) {
        // Draw a card
        this.player1Hand = processDraw(
          (count) => this.draw(count, 1),
          this.player1Hand,
          this.logEvent.bind(this),
          this.player1Name
        );
      }
      
      this.logEvent(`Turn ${this.turnCount}: ${this.player1Name}'s turn`);
    } else {
      const mana = updateMana(this.player2MaxMana, MAX_MANA);
      this.player2MaxMana = mana.maxMana;
      this.player2CurrentMana = mana.currentMana;
      
      // Skip card draw in the first turn for player 2
      if (this.turnCount > 1) {
        // Draw a card
        this.player2Hand = processDraw(
          (count) => this.draw(count, 2),
          this.player2Hand,
          this.logEvent.bind(this),
          this.player2Name
        );
      }
      
      this.logEvent(`Turn ${this.turnCount}: ${this.player2Name}'s turn`);
    }
    
    // Reset all creatures for the player whose turn is starting
    if (this.turn === 1) {
      resetCreatures(this.player1Board);
    } else {
      resetCreatures(this.player2Board);
    }
  }
  
  getState() {
    // Base state
    const state = {
      player1Health: this.player1Health,
      player2Health: this.player2Health,
      player1Hand: this.player1Hand,
      player2Hand: this.player2Hand,
      player1Board: this.player1Board,
      player2Board: this.player2Board,
      player1CurrentMana: this.player1CurrentMana,
      player1MaxMana: this.player1MaxMana,
      player2CurrentMana: this.player2CurrentMana,
      player2MaxMana: this.player2MaxMana,
      player1Name: this.player1Name,
      player2Name: this.player2Name,
      turn: this.turn,
      turnCount: this.turnCount,
      log: this.log,
      over: this.over,
      winner: this.winner
    };
    
    return state;
  }
}

module.exports = { PvPGame };
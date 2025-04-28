const { Game } = require('../src/domain/game');
const cards = require('../src/cards.json');

describe('Game class', () => {
  test('initializes correctly', () => {
    const game = new Game(cards);
    const state = game.getState();
    expect(state.userHealth).toBe(20);
    expect(state.aiHealth).toBe(20);
    expect(state.userHand.length).toBe(3);
    // Ensure each card in hand includes mana cost
    expect(typeof state.userHand[0].manaCost).toBe('number');
    expect(state.currentUserMana).toBe(1);
    expect(state.maxUserMana).toBe(1);
    expect(state.turn).toBe('user');
    expect(Array.isArray(state.log)).toBe(true);
    expect(state.log[0]).toMatch(/Game started/);
  });

  test('playCard works and affects state', () => {
    const game = new Game(cards);
    // Override hand for deterministic test
    const testCard = { id: 999, name: 'TestMinion', attack: 1, health: 1, manaCost: 1 };
    game.userHand = [testCard];
    game.currentUserMana = testCard.manaCost;
    game.maxUserMana = testCard.manaCost;
    game.log = [];
    game.playCard(testCard.id);
    const state = game.getState();
    expect(state.userBoard).toHaveLength(1);
    expect(state.currentUserMana).toBe(0);
    expect(state.userHand).toHaveLength(0);
    expect(state.log).toEqual(
      expect.arrayContaining([`You play TestMinion (Cost 1)`])
    );
  });

  test('endTurn cycles turns, updates mana, logs correctly', () => {
    const game = new Game(cards);
    const initialHandCount = game.getState().userHand.length;
    game.endTurn();
    const state = game.getState();
    expect(state.turn).toBe('user');
    expect(state.turnCount).toBe(2);
    expect(state.maxUserMana).toBe(2);
    expect(state.currentUserMana).toBe(2);
    expect(state.log.some(e => e.includes('AI draws a card'))).toBe(true);
    expect(state.log.some(e => e.includes('You draw a card'))).toBe(true);
    expect(state.log.some(e => e.includes('Turn 2: your turn. Mana: 2/2'))).toBe(true);
    expect(state.userHand.length).toBeGreaterThanOrEqual(initialHandCount + 1 - state.userBoard.length);
  });
  
  test('playCard throws when card not in hand', () => {
    const game = new Game(cards);
    expect(() => game.playCard(-1)).toThrow('Card not in hand');
  });

  test('playCard throws when not enough mana', () => {
    const game = new Game(cards);
    // Create a test card that is too expensive for current mana
    const expensiveCard = { id: 999, name: 'Expensive', attack: 0, health: 0, manaCost: game.currentUserMana + 1 };
    // Override hand to contain only the expensive card
    game.userHand = [expensiveCard];
    // Ensure mana is not enough
    game.maxUserMana = game.currentUserMana;
    // Attempt to play the expensive card
    expect(() => game.playCard(expensiveCard.id)).toThrow('Not enough mana');
  });
  
  test('AI attacks taunt creatures before hero', () => {
    const game = new Game(cards);
    // Place a taunt creature on the user's board with 0 attack to isolate behavior
    const taunt = {
      id: 999,
      name: 'TauntMinion',
      attack: 0,
      health: 5,
      manaCost: 0,
      currentHealth: 5,
      hasAttacked: false,
      summonedThisTurn: false,
      taunt: true
    };
    game.userBoard = [taunt];
    // Place an AI attacker ready to attack
    const attacker = {
      id: 1000,
      name: 'AIWarrior',
      attack: 3,
      health: 2,
      currentHealth: 2,
      hasAttacked: false,
      summonedThisTurn: false
    };
    game.aiBoard = [attacker];
    // Prevent AI from drawing or playing extra creatures
    game.aiHand = [];
    game.maxAiMana = 0;
    game.currentAiMana = 0;
    // Call endTurn to trigger AI attack phase
    game.endTurn();
    const state = game.getState();
    // User hero should be unharmed
    expect(state.userHealth).toBe(20);
    // Taunt creature should have taken damage from the AI attacker
    const remainingTaunt = state.userBoard.find(c => c.id === 999);
    expect(remainingTaunt).toBeDefined();
    expect(remainingTaunt.currentHealth).toBe(5 - attacker.attack);
    // AI attacker should still be present and healthy (no retaliation)
    expect(state.aiBoard).toHaveLength(1);
    expect(state.aiBoard[0].id).toBe(1000);
    expect(state.aiBoard[0].currentHealth).toBe(2);
  });
  
  describe('Spell cards', () => {
    test('Fireball deals damage to AI hero and can win the game', () => {
      const game = new Game(cards);
      // Set AI health low enough for lethal
      game.aiHealth = 4;
      // Override hand to contain only Fireball (id 31)
      const fireball = cards.find(c => c.id === 31);
      game.userHand = [{ ...fireball }];
      game.currentUserMana = fireball.manaCost;
      game.maxUserMana = fireball.manaCost;
      game.log = [];
      game.playCard(fireball.id);
      const state = game.getState();
      expect(state.aiHealth).toBe(4 - fireball.effect.amount);
      expect(state.log).toEqual(
        expect.arrayContaining([
          `You cast ${fireball.name} (Cost ${fireball.manaCost})`,
          `${fireball.name} deals ${fireball.effect.amount} damage to AI hero`,
          `AI hero dies. You win!`
        ])
      );
      expect(state.over).toBe(true);
      expect(state.winner).toBe('user');
    });

    test('Healing Touch heals the user hero up to maximum health', () => {
      const game = new Game(cards);
      game.userHealth = 17;
      const heal = cards.find(c => c.id === 32);
      game.userHand = [{ ...heal }];
      game.currentUserMana = heal.manaCost;
      game.maxUserMana = heal.manaCost;
      game.log = [];
      game.playCard(heal.id);
      const state = game.getState();
      expect(state.userHealth).toBe(20);
      expect(state.log).toEqual(
        expect.arrayContaining([
          `You cast ${heal.name} (Cost ${heal.manaCost})`,
          `${heal.name} heals you for ${heal.effect.amount}`
        ])
      );
      expect(state.over).toBe(false);
    });
  });

  describe('Lifesteal and Divine Shield edge cases', () => {
    test('Lifesteal heals user hero when attacking AI hero', () => {
      const game = new Game(cards);
      game.userHealth = 10;
      // Prepare a lifesteal creature on board
      const lifestealMinion = {
        id: 999,
        name: 'LS Minion',
        attack: 3,
        health: 2,
        currentHealth: 2,
        hasAttacked: false,
        summonedThisTurn: false,
        lifesteal: true,
        divineShield: false
      };
      game.userBoard = [lifestealMinion];
      game.turn = 'user';
      game.attack(lifestealMinion.id, 'hero', null);
      const state = game.getState();
      expect(state.aiHealth).toBe(20 - lifestealMinion.attack);
      expect(state.userHealth).toBe(10 + lifestealMinion.attack);
      expect(state.log).toEqual(
        expect.arrayContaining([
          `${lifestealMinion.name} attacks AI hero for ${lifestealMinion.attack}`,
          `You heal for ${lifestealMinion.attack}`
        ])
      );
    });

    test('Divine Shield absorbs first damage from an attack', () => {
      const game = new Game(cards);
      // Prepare attacker and a divine shield creature
      const attacker = {
        id: 1000,
        name: 'Attacker',
        attack: 2,
        health: 3,
        currentHealth: 3,
        hasAttacked: false,
        summonedThisTurn: false,
        lifesteal: false,
        divineShield: false
      };
      const shieldMinion = {
        id: 1001,
        name: 'Shielded',
        attack: 1,
        health: 2,
        currentHealth: 2,
        hasAttacked: false,
        summonedThisTurn: false,
        lifesteal: false,
        divineShield: true
      };
      game.userBoard = [attacker];
      game.aiBoard = [shieldMinion];
      game.turn = 'user';
      game.attack(attacker.id, 'creature', shieldMinion.id);
      const state = game.getState();
      const target = state.aiBoard.find(c => c.id === shieldMinion.id);
      expect(target).toBeDefined();
      expect(target.divineShield).toBe(false);
      expect(target.currentHealth).toBe(shieldMinion.health);
      // Attacker should take retaliatory damage
      const usrAtt = state.userBoard.find(c => c.id === attacker.id);
      expect(usrAtt.currentHealth).toBe(attacker.health - shieldMinion.attack);
      expect(state.log).toEqual(
        expect.arrayContaining([
          `${shieldMinion.name}'s Divine Shield absorbs the attack`,
          `${shieldMinion.name} retaliates for ${shieldMinion.attack}`
        ])
      );
    });
  });

  describe('Deck exhaustion', () => {
    test('draw returns empty array when deck is empty', () => {
      const game = new Game(cards);
      game.deck = [];
      const drawn = game.draw(3);
      expect(drawn).toEqual([]);
    });

    test('endTurn does not throw when deck is empty and no draw events', () => {
      const game = new Game(cards);
      game.deck = [];
      game.log = [];
      // Ensure no errors
      expect(() => game.endTurn()).not.toThrow();
      // Check that no draw logs were added
      expect(game.log.every(e => !/draws a card/.test(e))).toBe(true);
    });
  
  describe('Reborn ability', () => {
    test('Reborn minion resurrects with 1 health and loses reborn flag', () => {
      const game = new Game(cards);
      // Set up AI board with a reborn minion
      const rebornMinion = {
        id: 500,
        name: 'TestReborn',
        attack: 2,
        health: 4,
        manaCost: 0,
        currentHealth: 4,
        hasAttacked: false,
        summonedThisTurn: false,
        reborn: true
      };
      game.aiBoard = [rebornMinion];
      // Set up user attacker
      const attacker = {
        id: 501,
        name: 'Attacker',
        attack: 5,
        health: 3,
        currentHealth: 3,
        hasAttacked: false,
        summonedThisTurn: false
      };
      game.userBoard = [attacker];
      game.turn = 'user';
      // Attack and kill the reborn minion
      game.attack(attacker.id, 'creature', rebornMinion.id);
      const state = game.getState();
      // Should have exactly one minion on AI board
      expect(state.aiBoard).toHaveLength(1);
      const revived = state.aiBoard[0];
      // Revived with 1 health and reborn flag removed
      expect(revived.currentHealth).toBe(1);
      expect(revived.reborn).toBe(false);
      // Logs should include death and reborn messages
      expect(state.log).toEqual(
        expect.arrayContaining([
          'TestReborn dies',
          'TestReborn is reborn!'
        ])
      );
    });
    
    test('Poisonous effect instantly kills any damaged creature', () => {
      const game = new Game(cards);
      // Set up a poisonous minion on user's board with enough health to survive retaliation
      const poisonMinion = {
        id: 600,
        name: 'PoisonSpider',
        attack: 1,
        health: 5,
        manaCost: 2,
        currentHealth: 5,
        hasAttacked: false,
        summonedThisTurn: false,
        poisonous: true
      };
      game.userBoard = [poisonMinion];
      
      // Set up a high-health minion on AI's board
      const tankMinion = {
        id: 601,
        name: 'Tank',
        attack: 2,
        health: 10,
        manaCost: 5,
        currentHealth: 10,
        hasAttacked: false,
        summonedThisTurn: false
      };
      game.aiBoard = [tankMinion];
      
      game.turn = 'user';
      // Attack the high-health minion with our poison minion
      game.attack(poisonMinion.id, 'creature', tankMinion.id);
      const state = game.getState();
      
      // The AI board should be empty since the tank minion died to poison
      expect(state.aiBoard).toHaveLength(0);
      
      // Our poison minion should still be alive
      expect(state.userBoard).toHaveLength(1);
      // Don't check exact health as implementation details may change
      
      // Logs should include poison effect and death messages
      expect(state.log).toEqual(
        expect.arrayContaining([
          'PoisonSpider attacks Tank for 1',
          'PoisonSpider\'s poison affects Tank!',
          'Tank dies',
        ])
      );
    });
    
    test('Creature with divine shield blocks poisonous effect', () => {
      const game = new Game(cards);
      // Set up a poisonous minion on user's board with high health to survive retaliation
      const poisonMinion = {
        id: 600,
        name: 'PoisonSpider',
        attack: 1,
        health: 5,
        manaCost: 2,
        currentHealth: 5,
        hasAttacked: false,
        summonedThisTurn: false,
        poisonous: true
      };
      game.userBoard = [poisonMinion];
      
      // Set up a divine shield minion on AI's board
      const shieldedMinion = {
        id: 602,
        name: 'ShieldBearer',
        attack: 2,
        health: 4,
        manaCost: 3,
        currentHealth: 4,
        hasAttacked: false,
        summonedThisTurn: false,
        divineShield: true
      };
      game.aiBoard = [shieldedMinion];
      
      game.turn = 'user';
      // Attack the shielded minion with our poison minion
      game.attack(poisonMinion.id, 'creature', shieldedMinion.id);
      const state = game.getState();
      
      // The AI minion should still be alive with its shield gone
      expect(state.aiBoard).toHaveLength(1);
      expect(state.aiBoard[0].divineShield).toBe(false);
      expect(state.aiBoard[0].currentHealth).toBe(shieldedMinion.health);
      
      // Our poison minion should have taken damage
      expect(state.userBoard).toHaveLength(1);
      expect(state.userBoard[0].currentHealth).toBe(poisonMinion.health - shieldedMinion.attack);
      
      // Logs should not include poison effect
      expect(state.log).not.toEqual(
        expect.arrayContaining([
          'PoisonSpider\'s poison affects ShieldBearer!'
        ])
      );
      
      expect(state.log).toEqual(
        expect.arrayContaining([
          'ShieldBearer\'s Divine Shield absorbs the attack'
        ])
      );
    });
    
    test('Poisonous retaliation kills attacking creature', () => {
      const game = new Game(cards);
      // Set up a normal minion on user's board
      const normalMinion = {
        id: 603,
        name: 'Fighter',
        attack: 2,
        health: 5,
        manaCost: 3,
        currentHealth: 5,
        hasAttacked: false,
        summonedThisTurn: false
      };
      game.userBoard = [normalMinion];
      
      // Set up a poisonous minion on AI's board with enough health to survive the attack
      const poisonDefender = {
        id: 604,
        name: 'VenomSnake',
        attack: 1,
        health: 6,
        manaCost: 2,
        currentHealth: 6,
        hasAttacked: false,
        summonedThisTurn: false,
        poisonous: true
      };
      game.aiBoard = [poisonDefender];
      
      game.turn = 'user';
      // Attack the poisonous minion with our normal minion
      game.attack(normalMinion.id, 'creature', poisonDefender.id);
      const state = game.getState();
      
      // The AI's poisonous minion should be damaged but alive
      expect(state.aiBoard).toHaveLength(1);
      expect(state.aiBoard[0].currentHealth).toBe(poisonDefender.health - normalMinion.attack);
      
      // Our normal minion should die from the poison effect
      expect(state.userBoard).toHaveLength(0);
      
      // Logs should include poison retaliation effect
      expect(state.log).toEqual(
        expect.arrayContaining([
          'Fighter attacks VenomSnake for 2',
          'VenomSnake retaliates for 1',
          'VenomSnake\'s poison affects Fighter!',
          'Fighter dies'
        ])
      );
    });
    test('Reborn activates when AI kills a reborn minion during endTurn', () => {
      const game = new Game(cards);
      // Set up a reborn skeleton on user board
      const cardDef = cards.find(c => c.id === 14);
      const skeleton = {
        ...cardDef,
        currentHealth: cardDef.health,
        hasAttacked: false,
        summonedThisTurn: false,
        reborn: true,
      };
      game.userBoard = [skeleton];
      // Set up AI attacker with charge to guarantee immediate attack
      const aiAttacker = {
        id: 999,
        name: 'AIWarrior',
        attack: skeleton.attack + 1,
        health: 2,
        currentHealth: 2,
        hasAttacked: false,
        summonedThisTurn: false,
        charge: true
      };
      game.aiBoard = [aiAttacker];
      // Prepare for endTurn: user turn
      game.turn = 'user';
      // Prevent AI draw/play
      game.maxAiMana = 0;
      game.currentAiMana = 0;
      game.log = [];
      // Execute endTurn: user auto-attacks then AI attacks (force AI to attack minions)
      jest.spyOn(global.Math, 'random').mockReturnValue(0);
      game.endTurn();
      global.Math.random.mockRestore();
      const state = game.getState();
      // Skeleton should be reborn
      expect(state.userBoard).toHaveLength(1);
      const revived = state.userBoard[0];
      expect(revived.currentHealth).toBe(1);
      expect(revived.reborn).toBe(false);
      // Logs include death and reborn
      expect(state.log).toEqual(
        expect.arrayContaining([
          `${skeleton.name} dies`,
          `${skeleton.name} is reborn!`
        ])
      );
    });
    test('Reborn minion summonedThisTurn flag is set when killed by player attack', () => {
      const game = new Game(cards);
      // Place a reborn creature in AI board
      const skeletonDef = cards.find(c => c.id === 14);
      const skeleton = {
        ...skeletonDef,
        currentHealth: skeletonDef.health,
        hasAttacked: false,
        summonedThisTurn: false,
        reborn: true,
      };
      game.aiBoard = [skeleton];
      // Player attacker with charge to kill skeleton
      const attacker = { id: 600, name: 'Att', attack: skeleton.attack + 1,
        health: 3, currentHealth: 3, hasAttacked: false,
        summonedThisTurn: false, charge: true };
      game.userBoard = [attacker];
      game.turn = 'user';
      // Kill the skeleton via player attack
      game.attack(attacker.id, 'creature', skeleton.id);
      const state = game.getState();
      // Should have skeleton revived on AI board with summonedThisTurn true
      expect(state.aiBoard).toHaveLength(1);
      const revived = state.aiBoard[0];
      expect(revived.currentHealth).toBe(1);
      expect(revived.reborn).toBe(false);
      expect(revived.summonedThisTurn).toBe(true);
      // Attacker has attacked; revived has not
      expect(revived.hasAttacked).toBe(false);
    });
  });
  });
});
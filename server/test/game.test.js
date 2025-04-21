const { Game } = require('../src/game');
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
});
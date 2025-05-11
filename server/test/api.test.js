const request = require('supertest');
const { app } = require('../src/index');

describe('API endpoints', () => {
  let gameId;

  test('POST /api/game/start returns initial state', async () => {
    const res = await request(app).post('/api/game/start');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gameId');
    expect(res.body.userHealth).toBe(20);
    expect(res.body.aiHealth).toBe(20);
    expect(Array.isArray(res.body.userHand)).toBe(true);
    // Ensure each card in hand includes mana cost
    expect(typeof res.body.userHand[0].manaCost).toBe('number');
    expect(res.body.currentUserMana).toBe(1);
    gameId = res.body.gameId;
  });

  test('POST /api/game/:gameId/play allows a move', async () => {
    // start a fresh game
    const start = await request(app).post('/api/game/start');
    gameId = start.body.gameId;
    const playable = start.body.userHand.find(c => c.manaCost <= start.body.currentUserMana);
    let res;
    if (playable) {
      res = await request(app)
        .post(`/api/game/${gameId}/play`)
        .send({ cardId: playable.id });
      expect(res.status).toBe(200);
      expect(res.body.userBoard).toBeDefined();
      // Ensure played card retains mana cost
      expect(res.body.userBoard[0]).toHaveProperty('manaCost');
      expect(typeof res.body.currentUserMana).toBe('number');
      expect(Array.isArray(res.body.log)).toBe(true);
    } else {
      // No playable cards: should reject but include game state shape
      const cardId = start.body.userHand[0].id;
      res = await request(app)
        .post(`/api/game/${gameId}/play`)
        .send({ cardId });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Not enough mana/);
      // Ensure response includes game state arrays for client
      expect(Array.isArray(res.body.userHand)).toBe(true);
      // Ensure cards in hand include mana cost
      expect(typeof res.body.userHand[0].manaCost).toBe('number');
      expect(Array.isArray(res.body.userBoard)).toBe(true);
      expect(Array.isArray(res.body.log)).toBe(true);
    }
  });

  test('POST /api/game/:gameId/end-turn processes AI and returns new state', async () => {
    const start = await request(app).post('/api/game/start');
    gameId = start.body.gameId;
    const res = await request(app)
      .post(`/api/game/${gameId}/end-turn`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.turn).toBe('user');
    expect(res.body.turnCount).toBe(2);
    expect(Array.isArray(res.body.log)).toBe(true);
  });

  test('404 for unknown gameId', async () => {
    let res = await request(app).post('/api/game/unknown/play').send({ cardId: 1 });
    expect(res.status).toBe(404);
    res = await request(app).post('/api/game/unknown/end-turn');
    expect(res.status).toBe(404);
  });
  
  test('POST /api/game/:gameId/play rejects when card is not in hand', async () => {
    // start a fresh game
    const start = await request(app).post('/api/game/start');
    const id = start.body.gameId;
    // attempt to play a card using an invalid cardId
    const invalidId = -1;
    const res = await request(app)
      .post(`/api/game/${id}/play`)
      .send({ cardId: invalidId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Card not in hand/);
    // Ensure response includes game state arrays for client safety
    expect(Array.isArray(res.body.userHand)).toBe(true);
    expect(Array.isArray(res.body.userBoard)).toBe(true);
    expect(Array.isArray(res.body.log)).toBe(true);
  });
  
  describe('Attack endpoint', () => {
    test('404 for unknown gameId', async () => {
      const res = await request(app)
        .post('/api/game/doesnotexist/attack')
        .send({ attackerId: 1, targetType: 'hero', targetId: null });
      expect(res.status).toBe(404);
    });

    test('creature attack behavior respects summoning sickness and one attack per turn', async () => {
      // start a fresh game
      let res = await request(app).post('/api/game/start');
      expect(res.status).toBe(200);
      const id = res.body.gameId;
      // play a playable card if available
      const playable = res.body.userHand.find(c => c.manaCost <= res.body.currentUserMana);
      if (!playable) {
        // No playable card available for this game; skip
        return;
      }
      res = await request(app)
        .post(`/api/game/${id}/play`)
        .send({ cardId: playable.id });
      expect(res.status).toBe(200);
      // retrieve the creature and its properties
      const creature = res.body.userBoard[0];
      expect(creature).toHaveProperty('id');
      expect(creature).toHaveProperty('attack');
      // Attempt first attack
      res = await request(app)
        .post(`/api/game/${id}/attack`)
        .send({ attackerId: creature.id, targetType: 'hero', targetId: null });
      if (!creature.charge) {
        // Non-charge creatures cannot attack on summon
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cannot attack until next turn/i);
        return;
      }
      // Charge creatures can attack immediately
      expect(res.status).toBe(200);
      expect(res.body.aiHealth).toBe(20 - creature.attack);
      // Second attack should be blocked by already attacked
      res = await request(app)
        .post(`/api/game/${id}/attack`)
        .send({ attackerId: creature.id, targetType: 'hero', targetId: null });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already attacked/i);
    });
  });

  describe('Static content', () => {
    test('GET / returns index.html', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toMatch(/<!DOCTYPE html>/i);
    });

    test('GET /main.js returns JS', async () => {
      const res = await request(app).get('/main.js');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
    });

    test('GET /styles.css returns CSS', async () => {
      const res = await request(app).get('/styles.css');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/css/);
    });

    test('GET unknown static asset returns 404', async () => {
      const res = await request(app).get('/does-not-exist.xyz');
      expect(res.status).toBe(404);
    });
  });
});
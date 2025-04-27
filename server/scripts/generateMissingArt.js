#!/usr/bin/env node
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

(async () => {
  // Specify the card IDs that need missing PNGs
  const missingIds = [18, 19, 20, 21, 22];
  const cardsPath = path.join(__dirname, '../src/cards.json');
  const cardsData = await fs.readFile(cardsPath, 'utf8');
  const cards = JSON.parse(cardsData);
  const outDir = path.join(__dirname, '../public/images/cards');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  for (const id of missingIds) {
    const card = cards.find(c => c.id === id);
    if (!card) {
      console.error(`Card ID ${id} not found in cards.json`);
      continue;
    }
    const outPath = path.join(outDir, `${id}.png`);
    if (fsSync.existsSync(outPath)) {
      console.log(`Skipping card ${id}, PNG already exists`);
      continue;
    }
    // Build prompt based on card traits (similar to generateArt.js)
    let prompt = `High-resolution digital painting of ${card.name} card character.`;
    if (card.spell && card.description) prompt += ` ${card.description.replace(/\s*\.$/, '')}.`;
    if (card.charge) prompt += ' The character appears agile and ready to attack immediately.';
    if (card.taunt) prompt += ' The character stands protectively with a shield, indicating taunt.';
    if (card.divineShield) prompt += ' It has a glowing golden shield, representing divine shield.';
    if (card.lifesteal) prompt += ' The character exudes a dark aura of lifesteal.';
    prompt += ' Fantasy theme, card game art style.';
    console.log(`Generating art for [${id}] ${card.name}`);
    try {
      const imgResponse = await openai.images.generate({
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      });
      const b64 = imgResponse.data[0].b64_json;
      const buffer = Buffer.from(b64, 'base64');
      await fs.writeFile(outPath, buffer);
      console.log(`Saved art for card ${id} at ${outPath}`);
    } catch (err) {
      console.error(`Failed to generate art for card ${id}:`, err.message);
    }
  }
})();
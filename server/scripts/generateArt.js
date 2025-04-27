#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

(async () => {
  const cardsPath = path.join(__dirname, '../src/cards.json');
  const cardsData = await fs.readFile(cardsPath, 'utf8');
  const cards = JSON.parse(cardsData);
  const outDir = path.join(__dirname, '../public/images/cards');
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);
  for (const card of cards) {
    // Build prompt based on card traits
    let prompt = `High-resolution digital painting of ${card.name} card character.`;
    if (card.spell && card.description) prompt += ` ${card.description.replace(/\s*\.$/, '')}.`;
    if (card.charge) prompt += ' The character appears agile and ready to attack immediately.';
    if (card.taunt) prompt += ' The character stands protectively with a shield, indicating taunt.';
    if (card.divineShield) prompt += ' It has a glowing golden shield, representing divine shield.';
    if (card.lifesteal) prompt += ' The character exudes a dark aura of lifesteal.';
    prompt += ' Fantasy theme, card game art style.';
    console.log(`Generating art for [${card.id}] ${card.name}`);
    try {
      const response = await openai.createImage({
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      });
      const b64 = response.data.data[0].b64_json;
      const buffer = Buffer.from(b64, 'base64');
      const outPath = path.join(outDir, `${card.id}.png`);
      await fs.writeFile(outPath, buffer);
      console.log(`Saved art for card ${card.id} at ${outPath}`);
    } catch (err) {
      console.error(`Failed to generate art for card ${card.id}:`, err.message);
    }
  }
})();
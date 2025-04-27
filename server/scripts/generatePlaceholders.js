#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
// Load card definitions to generate placeholders for each
const cards = require('../src/cards.json');

// Output directory for generated images (SVG)
const outDir = path.join(__dirname, '../public/images/cards');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate a simple SVG placeholder for each card
cards.forEach(card => {
  const width = 200;
  const height = 300;
  // Generate a pastel background color based on card id
  const hue = (card.id * 137) % 360;
  const bgColor = `hsl(${hue}, 50%, 85%)`;
  // Escape any special characters in card name
  const safeName = String(card.name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}" stroke="#333" stroke-width="2"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#333"
        font-family="Arial, sans-serif" font-size="20">
    ${safeName}
  </text>
</svg>`;
  const filename = path.join(outDir, `${card.id}.svg`);
  fs.writeFileSync(filename, svg, 'utf8');
});
console.log(`Generated ${cards.length} placeholder images in ${outDir}`);
# codex_card_battler

A simple card battler game built with Node.js and React. Players summon creatures and cast spells to reduce their opponent’s hero to zero health.

## Features
- Turn-based combat with creatures (attack, health, charge, taunt, lifesteal, divine shield)
- Spell cards for one-time effects (damage, healing)
- AI opponent with basic heuristics
- Responsive UI for desktop and mobile

## Getting Started

### Prerequisites
- Node.js 14+ and npm

### Install and Run Locally
1. Clone the repo:
   ```bash
   git clone https://github.com/edd426/codex_card_battler.git
   cd codex_card_battler/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server (default port 3000):
   ```bash
   npm start
   ```
4. Open your browser at `http://localhost:3000` to play.

## Deploying to Render

You can host this app online for free on Render:

1. Push your code to GitHub (e.g. `edd426/codex_card_battler`).
2. Go to https://dashboard.render.com and log in.
3. Click **New** → **Web Service**.
4. Connect your GitHub repo and select the `main` branch.
5. Fill in the service settings:
   - **Name:** `codex-card-battler`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node.js (default is fine)
6. Click **Create Web Service**. Render will build and deploy automatically.
7. After deployment completes, visit:

   ```
   https://codex-card-battler.onrender.com
   ```

Whenever you push new commits to `main`, Render will auto-deploy your updates.

## License
This project is open source under the MIT License.

## Card Rarities

Based on card names alone, these are the estimated rarities for reference:

| ID | Name             | Estimated Rarity |
|----|------------------|------------------|
|  1 | Squire           | Common           |
|  2 | Archer           | Common           |
|  3 | Knight           | Common           |
|  4 | Mage             | Rare             |
|  5 | Giant            | Epic             |
|  6 | Rogue            | Rare             |
|  7 | Goblin           | Common           |
|  8 | Shieldbearer     | Rare             |
|  9 | Berserker        | Common           |
| 10 | Priest           | Rare             |
| 11 | Warlock          | Epic             |
| 12 | Demon            | Epic             |
| 13 | Dragon           | Legendary        |
| 14 | Skeleton         | Common           |
| 15 | Zombie           | Common           |
| 16 | Elemental        | Epic             |
| 17 | Assassin         | Epic             |
| 18 | Paladin          | Rare             |
| 19 | Shaman           | Epic             |
| 20 | Hunter           | Rare             |
| 21 | Ranger           | Common           |
| 22 | Monk             | Common           |
| 23 | Beastmaster      | Rare             |
| 24 | Assault Trooper  | Rare             |
| 25 | Defender         | Rare             |
| 26 | Sorcerer         | Rare             |
| 27 | Warlord          | Legendary        |
| 28 | Titan            | Legendary        |
| 29 | Spirit           | Common           |
| 30 | Elemental Lord   | Legendary        |
| 31 | Fireball         | Rare             |
| 32 | Healing Touch    | Rare             |
## Art Generation

This project supports generating card art placeholders and realistic card images.

1. Placeholder SVGs: in the server directory, run:
   ```bash
   cd server
   npm install
   npm run gen-art
   ```
   This creates simple SVGs under `public/images/cards/<id>.svg`.

2. Realistic PNGs via OpenAI Image API:
   ```bash
   cd server
   npm install
   export OPENAI_API_KEY=your_key_here
   npm run gen-real-art
   ```
   This generates 512×512 PNGs under `public/images/cards/<id>.png`.

Once images are generated, the server routes will include `card.image` URLs (pointing to the `.png` files) in the game state for easy UI integration.

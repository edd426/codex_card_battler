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

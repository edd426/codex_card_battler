# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install: `cd server && npm install`
- Start server: `cd server && npm start`
- Run tests: `cd server && npm test` (reliable, skips socket tests)
- Run all tests: `cd server && npm run test:all` (less reliable, includes socket tests)
- Run API tests only: `cd server && npm run test:api`
- Run PvP tests only: `cd server && npm run test:pvp`
- Run socket tests only: `cd server && npm run test:socket` (unreliable)
- Run single test: `cd server && npm test -- -t "test name pattern"`

NOTE: Socket tests can be unreliable due to timing/networking dependencies. Prefer `npm test` for routine development work.
- Run simulations: `cd server && npm run simulate`
- Calculate card rarities: `cd server && npm run rarity`
- Generate placeholder art: `cd server && npm run gen-art`
- Generate realistic art: `cd server && npm run gen-real-art`
- Generate missing art: `cd server && npm run gen-missing-art`

## Code Style Guidelines

- **Imports:** CommonJS style (`require`/`module.exports`)
- **Error handling:** Use `throw new Error('message')` for explicit errors
- **State management:** Immutable updates (use filter/map methods)
- **Testing:** Use Jest with descriptive test names
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Formatting:** 2-space indentation
- **Comments:** Comment complex logic; use JSDoc-style for functions
- **Logging:** Use `logEvent` method for game state changes
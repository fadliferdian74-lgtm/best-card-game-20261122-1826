# Ember Sigils — a duel of sigil cards

[![make.fun bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/fadliferdian74-lgtm/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/fadliferdian74-lgtm/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Ember Sigils** is an original turn-based card duel for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826). You are the Emberborn, duelling Vex, the Hollow Warden, on a green felt table. Both heroes start at 30 life; the first to 0 loses.

## How to play

- Each turn you gain ember (1 more per turn, max 10) and draw a card.
- Click a hand card to play it if you can afford its cost (top-left). Creatures take the table; spells resolve at once.
- Click one of your creatures, then an enemy creature — or Vex herself — to attack. Creatures can't attack the turn they are played, unless they have **RUSH**.
- Keywords: **RUSH** attacks at once · **WARD** ignores the first damage · **LEECH** heals your hero for the damage it deals · **GUARD** must be attacked first.
- Sigils are told apart by colour *and* shape: ▲ Ember (red) · ◆ Frost (blue) · ✚ Thorn (green) · ★ Gale (gold).
- Keyboard: `1–6` play a hand card · `Space` / `Enter` ends the turn · `Esc` closes help.

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

Open `game/index.html` in desktop Chrome. No build step, no network requests — every file the game loads lives under `game/`.

## Layout

- `game/index.html` — the page shell
- `game/src/config.js` — tuning, sigils, palette
- `game/src/cards.js` — the 21-card catalogue (all original names and text)
- `game/src/deck.js` — deck building, shuffling, drawing
- `game/src/state.js` — the rules as pure state transitions
- `game/src/ai.js` — Vex, the opponent
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/render.js` — the DOM table
- `game/src/input.js` — mouse and keyboard intents
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|table|win|loss`)
- `game/src/main.js` — boot and the live game loop
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 4 real renders of the game's own code: title, table, victory, defeat

## License

MIT — see [LICENSE](LICENSE).

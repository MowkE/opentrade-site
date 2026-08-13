# THE FLOOR

(working name)

A walkable 3D casino for you and your friends, heavily inspired by the
party game Gamble With Your Friends: a dark neon room you move through
in first person, ten glowing tables, and play-money bankrolls for
everyone on the couch.

Walk with WASD, look with the mouse, press E at any table to sit down.
Its room slides up over the floor; Esc stands you back up.

## What is here

- **The world** (js/world.js): the floor built procedurally in Three.js
  (vendored, no CDN, no build step). Carpet, walls, neon strips, ceiling
  fixtures, and ten stations: half-moon blackjack, roulette with a
  spinning wheel, craps with rails, baccarat and poker ovals, a slot
  bank with glowing reels, video poker, a lit keno board, sic bo under
  its dome, and casino war. Signage is Bungee rendered to canvas
  textures; a standings board on the back wall repaints live as
  bankrolls change.
- **The engine** (js/engine.js): cards, dice, chips that fly to the bet
  spot, a shared bet box, verdict banners, and the bankroll store with
  local friend profiles, rebuys, and standings, persisted in
  localStorage.
- **Two reference tables**: Blackjack (6-deck shoe, dealer stands on
  17, blackjack pays 3 to 2, double and split) and European Roulette
  (full betting board, straight to even chances, single zero). These
  show the wiring; the other eight games are placeholder rooms.

## Adding a game

Each game is one module in js/games/ that default-exports:

```js
export default {
  id: 'craps',          // must match the id in world.js LAYOUT
  name: 'CRAPS',        // the neon sign text
  tag: 'one line for the top bar',
  odds: 'one line about the odds',
  glyph: '<svg>...</svg>',
  init(body) { /* build your room DOM here, fresh each visit */ },
};
```

Import from ../engine.js for chips, money, cards, and dice. The store
handles all debits and credits; never touch localStorage directly.

## Run it

```
python3 -m http.server 7782
```

then open http://localhost:7782. WebGL and a desktop browser required;
this is a keyboard-and-mouse game.

No real money anywhere. House rules: the odds are the real ones.

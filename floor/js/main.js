// main.js
// The house itself: a 3D floor you walk, the glass bar, the friends
// and their bankrolls. Walk to a table, press E, and its room slides
// up; game rooms live in js/games/ and are rebuilt fresh each visit.

import { store, watchMoney, fmt, toast, sfx } from './engine.js?v7';
import { buildWorld } from './world.js?v7';
import higherlower from './games/higherlower.js?v7';
import tickerdle from './games/tickerdle.js?v7';
import fanstocks from './games/fanstocks.js?v7';
import league from './games/league.js?v7';
import cashroyale from './games/cashroyale.js?v7';
import surfers from './games/surfers.js?v7';
import runway from './games/runway.js?v7';
import news from './games/news.js?v7';

const GAMES = [higherlower, tickerdle, fanstocks, league, cashroyale, surfers, runway, news];

const $ = id => document.getElementById(id);
let open = null;

// signage draws in Bungee; make sure it exists before painting canvases
if (document.fonts) {
  try { await document.fonts.load('80px Bungee'); } catch { /* fallback font */ }
}

const world = buildWorld($('world'), GAMES);
window.__world = world;   // console access for tinkering; harmless in production

// ------------------------------------------------------------ the bar

let lastChips = null;
watchMoney(() => {
  if (lastChips !== null && store.chips > lastChips) {
    sfx.coin();
    $('bank').classList.remove('pop');
    void $('bank').offsetWidth;
    $('bank').classList.add('pop');
  }
  lastChips = store.chips;
  $('bank-amt').textContent = fmt(store.chips);
  $('who-name').textContent = store.player.name;
  world.paintBoard(store.players, store.player.id);
});

// ------------------------------------------------------------- rooms

function openRoom(game) {
  open = game;
  sfx.sit();
  world.freeze(true);
  $('room').classList.add('open');
  $('room-sign').textContent = game.name;
  $('room-tag').innerHTML = `${game.tag}<i>·</i>esc stands you up`;
  const body = $('room-body');
  body.textContent = '';
  game.init(body);
  $('splash').hidden = true;
}

function closeRoom() {
  if (!open) return;
  const leaving = open;
  open = null;
  $('room').classList.remove('open');
  $('room-body').textContent = '';
  world.freeze(false);
  $('splash').hidden = false;
  // the next table is always two steps away
  const others = (world.stations || []).filter(s => s.id !== leaving.id);
  if (others.length) {
    others.sort((a, b) =>
      Math.hypot(a.x - world.player.x, a.z - world.player.z) -
      Math.hypot(b.x - world.player.x, b.z - world.player.z));
    toast(`Right next door: ${others[0].name}`);
  }
}

$('wordmark').addEventListener('click', closeRoom);

// ---------------------------------------------------------------- hud

world.onPromptChange(game => {
  $('prompt').hidden = !game;
  if (game) $('prompt-text').textContent = `sit at ${game.name}`;
});

world.onLockChange(locked => {
  $('splash').hidden = locked || !!open;
  $('aim').hidden = !locked;
});

window.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'Escape' && open) closeRoom();
  if ((e.key === 'e' || e.key === 'E') && !open) {
    const game = world.currentPrompt;
    if (game) openRoom(game);
  }
});

// --------------------------------------------------- friends and seats

function playerSheet() {
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `
    <div class="sheet" role="dialog" aria-label="players">
      <h2>Who's playing</h2>
      <p class="sub">Everyone gets their own bankroll. Winner buys nothing, they just gloat.</p>
      <div class="plist"></div>
      <input type="text" maxlength="14" placeholder="Add a friend by name" aria-label="new player name" />
      <div class="split">
        <button class="ghost-btn add">Add player</button>
        <button class="ghost-btn rebuy">Rebuy 1,000</button>
      </div>
    </div>`;
  const plist = back.querySelector('.plist');
  const input = back.querySelector('input');

  const paint = () => {
    plist.textContent = '';
    for (const p of store.players) {
      const row = document.createElement('button');
      row.className = 'prow' + (p.id === store.player.id ? ' on' : '');
      const hue = [...p.name].reduce((s, c) => s + c.charCodeAt(0), 0) * 47 % 360;
      row.innerHTML = `<span class="pava" style="background:hsl(${hue} 65% 55%)"></span><span>${p.name}</span><b>${fmt(p.chips)}</b>`;
      row.addEventListener('click', () => { store.switchTo(p.id); paint(); });
      plist.appendChild(row);
    }
  };
  paint();

  back.querySelector('.add').addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    store.addPlayer(name);
    input.value = '';
    paint();
    toast(`${store.player.name} sits down with 1,000`);
  });
  back.querySelector('.rebuy').addEventListener('click', () => {
    store.rebuy();
    paint();
    toast(`${store.player.name} rebuys for 1,000. The standings remember.`);
  });

  const close = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 300); };
  back.addEventListener('click', e => { if (e.target === back) close(); });
  window.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); window.removeEventListener('keydown', esc); }
  });

  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('show'));
  input.focus();
}

$('who').addEventListener('click', playerSheet);
$('bank').addEventListener('click', playerSheet);

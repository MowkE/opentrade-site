// engine.js
// The house's shared machinery: cards, dice, chips, money, and the
// small pieces of theater every table uses. Game modules import from
// here and nothing else; if a game needs something twice, it lives
// here once.

// ------------------------------------------------------------ random

export const rng = {
  int(n) { return Math.floor(Math.random() * n); },
  pick(arr) { return arr[this.int(arr.length)]; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
};

// ------------------------------------------------------------- cards

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function newDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit, red: suit === '♥' || suit === '♦' });
  }
  return deck;
}

export function newShoe(decks = 6) {
  const shoe = [];
  for (let i = 0; i < decks; i++) shoe.push(...newDeck());
  return rng.shuffle(shoe);
}

/** a card element; pass faceDown to deal it hidden, flip() reveals */
export function cardEl(card, { faceDown = false } = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (faceDown ? ' down' : '') + (card.red ? ' red' : '');
  el.innerHTML = `
    <span class="pip tl">${card.rank}<i>${card.suit}</i></span>
    <span class="pip mid">${card.suit}</span>
    <span class="pip br">${card.rank}<i>${card.suit}</i></span>
    <span class="back"></span>`;
  el.flip = () => el.classList.remove('down');
  return el;
}

/** deal a card into a hand row with the sliding entrance */
export function dealTo(handEl, card, opts) {
  const el = cardEl(card, opts);
  el.classList.add('dealt');
  handEl.appendChild(el);
  requestAnimationFrame(() => el.classList.remove('dealt'));
  return el;
}

// -------------------------------------------------------------- dice

/** a die face element showing n pips, 1 to 6 */
export function dieEl(n) {
  const el = document.createElement('div');
  el.className = 'die';
  el.dataset.n = n;
  for (let i = 0; i < n; i++) el.appendChild(document.createElement('i'));
  return el;
}

/** tumble animation resolving to values; returns a promise */
export function rollDice(rowEl, values) {
  rowEl.textContent = '';
  const dice = values.map(() => dieEl(1 + rng.int(6)));
  dice.forEach(d => { d.classList.add('rolling'); rowEl.appendChild(d); });
  return new Promise(res => {
    let ticks = 0;
    const spin = setInterval(() => {
      ticks++;
      dice.forEach((d, i) => {
        const n = ticks > 6 ? values[i] : 1 + rng.int(6);
        d.dataset.n = n;
        d.textContent = '';
        for (let k = 0; k < n; k++) d.appendChild(document.createElement('i'));
      });
      if (ticks > 8) {
        clearInterval(spin);
        dice.forEach(d => d.classList.remove('rolling'));
        res(dice);
      }
    }, 90);
  });
}

// ------------------------------------------------------------- money

const STORE_KEY = 'casino.players.v1';
const START_CHIPS = 1000;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && raw.players && raw.players.length) return raw;
  } catch { /* fresh start */ }
  return { players: [{ id: 'p1', name: 'Player 1', chips: START_CHIPS }], active: 'p1' };
}

const data = load();

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

export const store = {
  get player() { return data.players.find(p => p.id === data.active); },
  get players() { return [...data.players].sort((a, b) => b.chips - a.chips); },
  get chips() { return this.player.chips; },

  canBet(n) { return n > 0 && n <= this.player.chips; },

  debit(n) {
    if (!this.canBet(n)) return false;
    this.player.chips -= n;
    save(); onMoney();
    return true;
  },

  credit(n) {
    this.player.chips += Math.round(n);
    save(); onMoney();
  },

  addPlayer(name) {
    const id = 'p' + (Date.now() % 1e7);
    data.players.push({ id, name: name.slice(0, 14) || 'Player', chips: START_CHIPS });
    data.active = id;
    save(); onMoney();
  },

  switchTo(id) {
    if (data.players.some(p => p.id === id)) { data.active = id; save(); onMoney(); }
  },

  /** a broke friend rebuys at the window, tracked honestly */
  rebuy() {
    this.player.chips += START_CHIPS;
    this.player.rebuys = (this.player.rebuys || 0) + 1;
    save(); onMoney();
  },
};

let moneyWatchers = [];
export function watchMoney(fn) { moneyWatchers.push(fn); fn(); }
function onMoney() { moneyWatchers.forEach(fn => fn()); }

// -------------------------------------------------------------- chips

export const CHIP_VALUES = [1, 5, 25, 100, 500];

export function chipEl(value) {
  const el = document.createElement('button');
  el.className = 'chip v' + value;
  el.type = 'button';
  el.innerHTML = `<b>${value}</b>`;
  return el;
}

/**
 * The shared bet composer: a rack of chips, a bet spot, clear and max.
 * Games call lock() while a round runs and settle with win/lose/push.
 */
export function betBox(mount, { min = 1, onChange = () => {} } = {}) {
  const root = document.createElement('div');
  root.className = 'betbox';
  root.innerHTML = `
    <div class="rack"></div>
    <div class="spot"><span class="spot-ring"></span><b class="spot-amt">0</b><span class="spot-label">bet</span></div>
    <div class="bet-tools">
      <button class="ghost-btn clear">Clear</button>
    </div>`;
  const rack = root.querySelector('.rack');
  const amtEl = root.querySelector('.spot-amt');
  const spot = root.querySelector('.spot');
  let amount = 0, locked = false;

  const paint = () => {
    amtEl.textContent = amount;
    spot.classList.toggle('live', amount >= min);
    onChange(amount);
  };

  for (const v of CHIP_VALUES) {
    const chip = chipEl(v);
    chip.addEventListener('click', () => {
      if (locked || !store.canBet(v)) return;
      store.debit(v);
      amount += v;
      flyChip(chip, spot, v);
      paint();
    });
    rack.appendChild(chip);
  }
  root.querySelector('.clear').addEventListener('click', () => {
    if (locked || amount === 0) return;
    store.credit(amount);
    amount = 0;
    spot.querySelectorAll('.chip.flying-done').forEach(c => c.remove());
    paint();
  });

  mount.appendChild(root);
  return {
    get amount() { return amount; },
    lock() { locked = true; root.classList.add('locked'); },
    unlock() {
      locked = false; root.classList.remove('locked');
      amount = 0;
      spot.querySelectorAll('.chip.flying-done').forEach(c => c.remove());
      paint();
    },
    /** pays total returned to the player (stake included when they win) */
    settle(returned) { if (returned > 0) store.credit(returned); },
  };
}

/** a chip flies from the rack to a target and stays there */
export function flyChip(fromEl, toEl, value) {
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const chip = chipEl(value);
  chip.classList.add('flying');
  chip.style.left = a.left + a.width / 2 + 'px';
  chip.style.top = a.top + a.height / 2 + 'px';
  document.body.appendChild(chip);
  requestAnimationFrame(() => {
    const jx = (Math.random() - 0.5) * 18, jy = (Math.random() - 0.5) * 10;
    chip.style.left = b.left + b.width / 2 + jx + 'px';
    chip.style.top = b.top + b.height / 2 + jy + 'px';
  });
  chip.addEventListener('transitionend', () => {
    chip.classList.remove('flying');
    chip.classList.add('flying-done');
    chip.style.left = ''; chip.style.top = '';
    toEl.appendChild(chip);
  }, { once: true });
}

// ------------------------------------------------------------ theater

/** rolling money counter with tabular figures */
export function countTo(el, from, to, ms = 600) {
  const t0 = performance.now();
  const tick = now => {
    const k = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** the verdict banner every table shares: win, lose, push */
export function verdict(root, kind, text) {
  const old = root.querySelector('.verdict');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'verdict ' + kind;
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2400);
}

export function toast(text) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  host.appendChild(el);
  setTimeout(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2600);
}

/** standard money formatter */
export const fmt = n => Math.round(n).toLocaleString();

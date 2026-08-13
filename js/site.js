// site.js
// The whole page: the tape, the tabs, the wallet, and a husky named
// Gary who runs a higher-or-lower book against every visitor. Every
// market number on this page is synthetic; the only real currency is
// pride.

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ wallet

const W_KEY = 'ot.wallet.v1';
function loadWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(W_KEY));
    if (w && typeof w.coins === 'number') return w;
  } catch { /* fresh */ }
  return { coins: 100, xp: 0, streak: 0, best: 0, q1: false, q2: false, q3: false };
}
const wallet = loadWallet();
function saveWallet() { localStorage.setItem(W_KEY, JSON.stringify(wallet)); paintWallet(); }
function paintWallet() {
  $('w-coins').textContent = wallet.coins.toLocaleString();
  $('w-streak').textContent = wallet.streak;
  $('w-xp').textContent = wallet.xp.toLocaleString();
  ['q1', 'q2', 'q3'].forEach(q => { $(q).checked = wallet[q]; });
  $('q-count').textContent = `${['q1', 'q2', 'q3'].filter(q => wallet[q]).length}/3`;
}
function quest(q) {
  if (wallet[q]) return;
  wallet[q] = true;
  wallet.coins += 50;
  saveWallet();
  toast('Quest done. 50 G Coins.');
}

// ------------------------------------------------------------- toast

function toast(text) {
  let host = $('toasts');
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
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2400);
}

// -------------------------------------------------------------- tape

const TAPE_NAMES = ['BONE', 'HOWL', 'FETCH', 'SNIF', 'WOOF', 'PAWS', 'TAIL', 'DIGG', 'TRAT', 'MUTT', 'FLUF', 'ZOOM'];
function buildTape() {
  const bits = [];
  TAPE_NAMES.forEach((n, i) => {
    const up = Math.random() > 0.45;
    const px = (20 + Math.random() * 400).toFixed(2);
    const d = (Math.random() * 4 + 0.1).toFixed(2);
    bits.push(`<span class="t ${up ? 'u' : 'd'}"><b>$${n}</b>${px} <i>${up ? '▲' : '▼'}${d}%</i></span>`);
    if (i === 3) bits.push('<span class="t legal">PRODUCT PREVIEW · NOT INVESTMENT ADVICE</span>');
    if (i === 8) bits.push('<span class="t legal">NO MONEY · NO PRIZES · SYNTHETIC DATA · JUST PRIDE</span>');
  });
  const half = bits.join('');
  $('tape-track').innerHTML = half + half;
}

// -------------------------------------------------------------- tabs

for (const el of document.querySelectorAll('[data-go]')) {
  el.addEventListener('click', () => {
    const go = el.dataset.go;
    document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== 'page-' + go; });
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === go));
    if (go === 'board') paintBoard();
  });
}
document.querySelector('.tab[href="floor/"]').addEventListener('click', () => quest('q2'));
for (const row of document.querySelectorAll('#lineup .row')) {
  row.addEventListener('click', e => {
    e.preventDefault();
    toast(row.dataset.toast || 'Opens in the app');
  });
}

// -------------------------------------------------- Gary's little book

const GARY = {
  idle: [
    'Gary bets you can’t beat him.',
    'Gary has seen a thousand charts. Gary naps on them.',
    'Take the bet. Gary needs kibble money.',
  ],
  win: [
    'Beginner’s luck. Run it back.',
    'Gary was distracted by a squirrel. Rematch.',
    'Fine. One for you.',
  ],
  lose: [
    'Gary keeps your pride. It smells nice.',
    'Gary picked it by smell. Works every time.',
    'The house always wags last.',
  ],
  streak: 'Okay. Now Gary is paying attention.',
};

const TICKS = ['$GARY', '$BONE', '$HOWL', '$FETCH', '$ZOOM'];
const N_SHOW = 26, N_REVEAL = 7;

const game = {
  prices: [], round: 1, you: 0, gary: 0, busy: false, base: 0,
};

function synthSeries(n, start) {
  const out = [start];
  let drift = (Math.random() - 0.5) * 0.004;
  for (let i = 1; i < n; i++) {
    if (Math.random() < 0.08) drift = (Math.random() - 0.5) * 0.006;
    const shock = (Math.random() - 0.5) * 0.028;
    out.push(Math.max(4, out[i - 1] * (1 + drift + shock)));
  }
  return out;
}

function drawChart(upto) {
  const cv = $('chart');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, pad = 10;
  g.clearRect(0, 0, W, H);
  const ps = game.prices.slice(0, upto);
  const lo = Math.min(...game.prices) * 0.995, hi = Math.max(...game.prices) * 1.005;
  const x = i => pad + i * ((W - pad * 2) / (N_SHOW + N_REVEAL));
  const y = p => H - pad - ((p - lo) / (hi - lo)) * (H - pad * 2);

  // the moment of the bet
  g.strokeStyle = 'rgba(255,176,32,0.35)';
  g.setLineDash([3, 5]);
  g.beginPath();
  g.moveTo(x(N_SHOW - 1) + 4, pad); g.lineTo(x(N_SHOW - 1) + 4, H - pad);
  g.stroke();
  g.setLineDash([]);

  const cw = Math.max(3, (W - pad * 2) / (N_SHOW + N_REVEAL) * 0.55);
  for (let i = 1; i < ps.length; i++) {
    const o = ps[i - 1], c = ps[i];
    const up = c >= o;
    g.strokeStyle = g.fillStyle = up ? '#35d07f' : '#ff5468';
    g.beginPath();
    g.moveTo(x(i), y(Math.max(o, c)) - 3); g.lineTo(x(i), y(Math.min(o, c)) + 3);
    g.stroke();
    g.fillRect(x(i) - cw / 2, Math.min(y(o), y(c)), cw, Math.max(2, Math.abs(y(o) - y(c))));
  }
  $('tick-price').textContent = ps[ps.length - 1].toFixed(2);
}

function garySay(pool) {
  const line = Array.isArray(pool) ? pool[Math.floor(Math.random() * pool.length)] : pool;
  $('gary-says').textContent = line;
}

function newRound() {
  game.busy = false;
  game.prices = synthSeries(N_SHOW + N_REVEAL, 30 + Math.random() * 300);
  game.base = game.prices[N_SHOW - 1];
  $('tick-name').textContent = TICKS[Math.floor(Math.random() * TICKS.length)];
  $('round-label').textContent = 'round ' + game.round;
  $('call-up').disabled = $('call-down').disabled = false;
  setGary('smug');
  if (game.round === 1) garySay(GARY.idle);
  drawChart(N_SHOW);
}

function setGary(mood) {
  const el = $('gary');
  el.className = mood;
}

function call(dir) {
  if (game.busy) return;
  game.busy = true;
  $('call-up').disabled = $('call-down').disabled = true;
  wallet.xp += 10;

  let i = N_SHOW;
  const step = () => {
    i++;
    drawChart(i);
    if (i < N_SHOW + N_REVEAL) {
      setTimeout(step, reduced ? 0 : 190);
    } else {
      const final = game.prices[N_SHOW + N_REVEAL - 1];
      const wentUp = final >= game.base;
      const won = (dir === 'up') === wentUp;
      if (won) {
        game.you++;
        wallet.coins += 50;
        wallet.xp += 25;
        wallet.streak++;
        wallet.best = Math.max(wallet.best, wallet.streak);
        setGary('sad');
        garySay(wallet.streak >= 3 ? GARY.streak : GARY.win);
        quest('q1');
        if (wallet.streak >= 3) quest('q3');
        toast(`You won 50 G Coins. Streak ${wallet.streak}.`);
      } else {
        game.gary++;
        wallet.streak = 0;
        setGary('happy');
        garySay(GARY.lose);
      }
      $('s-you').textContent = game.you;
      $('s-gary').textContent = game.gary;
      saveWallet();
      game.round++;
      setTimeout(newRound, 1600);
    }
  };
  setTimeout(step, reduced ? 0 : 240);
}

$('call-up').addEventListener('click', () => call('up'));
$('call-down').addEventListener('click', () => call('down'));

// -------------------------------------------------------- leaderboard

const RIVALS = [
  ['mia.eth', 2140], ['candle_cam', 1885], ['soupgod', 1560],
  ['theta_gang_greg', 1220], ['lena.k', 990], ['diamond_dan', 610],
];
function paintBoard() {
  const rows = [
    { name: 'Gary', pts: 999999, cls: 'gary', badge: 'the house' },
    ...RIVALS.map(([name, pts]) => ({ name, pts, cls: '', badge: '' })),
    { name: 'you', pts: wallet.coins, cls: 'you', badge: `best streak ${wallet.best}` },
  ];
  rows.sort((a, b) => b.pts - a.pts);
  $('board').innerHTML = rows.map((r, i) => `
    <div class="brow-item ${r.cls}">
      <span class="rank">${i + 1}</span>
      <b>${r.name}</b>
      ${r.badge ? `<span class="badge">${r.badge}</span>` : ''}
      <span class="pts">${r.pts.toLocaleString()}g</span>
    </div>`).join('');
}

// ---------------------------------------------------------------- go

buildTape();
paintWallet();
newRound();

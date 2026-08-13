// site.js
// The home shell: streak card, quests, G Coins, Gary the helper, and a
// playable Higher/Lower behind the green card. Every market number is
// synthetic; no money anywhere.

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ wallet

const W_KEY = 'ot.wallet.v1';
function loadWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(W_KEY));
    if (w && typeof w.coins === 'number') return w;
  } catch { /* fresh */ }
  return { coins: 100, xp: 0, streak: 0, days: 0, q1: false, q2: false, q3: false };
}
const wallet = loadWallet();
function saveWallet() { localStorage.setItem(W_KEY, JSON.stringify(wallet)); paintWallet(); }
function paintWallet() {
  $('st-coins').textContent = wallet.coins.toLocaleString();
  $('st-xp').textContent = wallet.xp.toLocaleString();
  $('st-streak').textContent = (wallet.days || 0) + 'd';
  $('sc-days').textContent = wallet.days || 0;
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

// -------------------------------------------------------- streak week

const WEEK = ['F', 'S', 'S', 'M', 'T', 'W'];
$('sc-week').innerHTML = WEEK.map((d, i) =>
  `<span class="wd${i < (wallet.days || 0) ? ' done' : ''}"><span>${d}</span><i></i></span>`).join('');

// -------------------------------------------------------------- nav

for (const el of document.querySelectorAll('[data-toast]')) {
  el.addEventListener('click', e => {
    if (el.tagName === 'A') e.preventDefault();
    toast(el.dataset.toast);
    if (el.dataset.quest) quest(el.dataset.quest);
  });
}
$('create-game').addEventListener('click', () => {
  toast('Game builder opens in the app');
  quest('q1');
});
$('bubble-x').addEventListener('click', () => $('helper').classList.add('tucked'));

// ------------------------------------------------ Higher/Lower, real

const GARY = {
  idle: ["Gary bets you can't beat him.", 'Gary picks stocks by smell.', 'Take the bet. Gary needs kibble money.'],
  win: ["Beginner's luck. Run it back.", 'Gary was distracted by a squirrel.', 'Fine. One for you.'],
  lose: ['Gary keeps your pride. It smells nice.', 'The house always wags last.', 'Gary called it from the couch.'],
};
const TICKS = ['$GARY', '$BONE', '$HOWL', '$FETCH', '$ZOOM'];
const N_SHOW = 26, N_REVEAL = 7;
const game = { prices: [], round: 1, you: 0, gary: 0, busy: false, base: 0 };

function synthSeries(n, start) {
  const out = [start];
  let drift = (Math.random() - 0.5) * 0.004;
  for (let i = 1; i < n; i++) {
    if (Math.random() < 0.08) drift = (Math.random() - 0.5) * 0.006;
    out.push(Math.max(4, out[i - 1] * (1 + drift + (Math.random() - 0.5) * 0.028)));
  }
  return out;
}

function drawChart(upto) {
  const cv = $('chart');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, pad = 12;
  g.clearRect(0, 0, W, H);
  const ps = game.prices.slice(0, upto);
  const lo = Math.min(...game.prices) * 0.995, hi = Math.max(...game.prices) * 1.005;
  const x = i => pad + i * ((W - pad * 2) / (N_SHOW + N_REVEAL));
  const y = p => H - pad - ((p - lo) / (hi - lo)) * (H - pad * 2);
  g.strokeStyle = 'rgba(246, 164, 31, 0.4)';
  g.setLineDash([3, 5]);
  g.beginPath();
  g.moveTo(x(N_SHOW - 1) + 4, pad); g.lineTo(x(N_SHOW - 1) + 4, H - pad);
  g.stroke();
  g.setLineDash([]);
  const cw = Math.max(3, (W - pad * 2) / (N_SHOW + N_REVEAL) * 0.55);
  for (let i = 1; i < ps.length; i++) {
    const o = ps[i - 1], c = ps[i];
    g.strokeStyle = g.fillStyle = c >= o ? '#3fa842' : '#d5453a';
    g.beginPath();
    g.moveTo(x(i), y(Math.max(o, c)) - 3); g.lineTo(x(i), y(Math.min(o, c)) + 3);
    g.stroke();
    g.fillRect(x(i) - cw / 2, Math.min(y(o), y(c)), cw, Math.max(2, Math.abs(y(o) - y(c))));
  }
  $('hl-price').textContent = ps[ps.length - 1].toFixed(2);
}

function garySay(pool, mood) {
  $('gary-says').textContent = Array.isArray(pool) ? pool[Math.floor(Math.random() * pool.length)] : pool;
  if (mood) $('hl-gary').src = `assets/brand/gary-emotions/${mood}.webp`;
}

function newRound() {
  game.busy = false;
  game.prices = synthSeries(N_SHOW + N_REVEAL, 30 + Math.random() * 300);
  game.base = game.prices[N_SHOW - 1];
  $('hl-name').textContent = TICKS[Math.floor(Math.random() * TICKS.length)];
  $('hl-round').textContent = 'round ' + game.round;
  $('call-up').disabled = $('call-down').disabled = false;
  if (game.round === 1) garySay(GARY.idle, 'confident');
  drawChart(N_SHOW);
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
      const won = (dir === 'up') === (final >= game.base);
      if (won) {
        game.you++;
        wallet.coins += 50;
        wallet.xp += 25;
        garySay(GARY.win, 'sad');
        quest('q3');
        toast('You won 50 G Coins.');
      } else {
        game.gary++;
        garySay(GARY.lose, 'happy');
      }
      $('hl-score').textContent = `you ${game.you} · gary ${game.gary}`;
      saveWallet();
      game.round++;
      setTimeout(newRound, 1500);
    }
  };
  setTimeout(step, reduced ? 0 : 240);
}

$('call-up').addEventListener('click', () => call('up'));
$('call-down').addEventListener('click', () => call('down'));

const openHL = () => { $('hl-back').hidden = false; newRound(); };
const closeHL = () => { $('hl-back').hidden = true; };
$('card-hl').addEventListener('click', openHL);
$('quickstart').addEventListener('click', openHL);
$('bubble-cta').addEventListener('click', openHL);
$('hl-x').addEventListener('click', closeHL);
$('hl-back').addEventListener('click', e => { if (e.target === $('hl-back')) closeHL(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('hl-back').hidden) closeHL(); });

// ---------------------------------------------------------------- go

paintWallet();

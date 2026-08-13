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

// sheet open/close wiring lives in the physics layer below

// ---------------------------------------------------------------- go

paintWallet();

/* ═══ the physics layer: springs, flight, tilt, ambient life ═══
   Every effect here has one psychological job: entrances orient,
   living cards invite, coins make reward spatial, the sheet obeys the
   hand, and the locked door pushes back. */

// ------------------------------------------------- tiny spring engine

function spring(state, target, opts, onFrame, onDone) {
  const response = opts.response ?? 0.35;
  const ratio = opts.damping ?? 1;
  const k = Math.pow((2 * Math.PI) / response, 2);
  const c = 2 * ratio * Math.sqrt(k);
  state.v = opts.v0 ?? state.v ?? 0;
  cancelAnimationFrame(state.raf);
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const a = -k * (state.y - target) - c * state.v;
    state.v += a * dt;
    state.y += state.v * dt;
    if (Math.abs(state.y - target) < 0.3 && Math.abs(state.v) < 8) {
      state.y = target; state.v = 0;
      onFrame(state.y);
      onDone && onDone();
      return;
    }
    onFrame(state.y);
    state.raf = requestAnimationFrame(tick);
  };
  state.raf = requestAnimationFrame(tick);
}
const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);
const rubber = (x, dim = 300, c = 0.55) => (x * dim * c) / (dim + c * Math.abs(x));

// ---------------------------------------- coins fly to the wallet

function flyCoins(fromEl, n = 3) {
  const statEl = $('st-coins').closest('.stat');
  if (!fromEl || !statEl) return;
  const a = fromEl.getBoundingClientRect();
  const b = statEl.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  for (let i = 0; i < n; i++) {
    const coin = document.createElement('span');
    coin.className = 'flycoin';
    coin.style.left = x0 - 8 + 'px';
    coin.style.top = y0 - 8 + 'px';
    document.body.appendChild(coin);
    const dx = x1 - x0, dy = y1 - y0;
    const anim = coin.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5 + (i - 1) * 22}px, ${dy * 0.5 - 70}px) scale(0.9)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.9 },
    ], { duration: reduced ? 1 : 560, delay: reduced ? 0 : i * 70, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    anim.onfinish = () => {
      coin.remove();
      statEl.classList.remove('pop');
      void statEl.offsetWidth;
      statEl.classList.add('pop');
    };
  }
}

// reward sources: completing a quest pays FROM the thing you did
const questSources = { q1: () => $('create-game'), q2: () => document.querySelector('[data-quest="q2"]'), q3: () => $('hl-modal') };
const _quest = quest;
quest = function (q) {
  const fresh = !wallet[q];
  _quest(q);
  if (fresh) flyCoins(questSources[q] ? questSources[q]() : null);
};

// ------------------------------------------------- pointer-tracked tilt

if (!reduced) {
  for (const card of document.querySelectorAll('.game')) {
    let tracking = false;
    card.addEventListener('pointerenter', () => { tracking = true; card.classList.remove('settling'); });
    card.addEventListener('pointermove', e => {
      if (!tracking) return;
      const r = card.getBoundingClientRect();
      const rx = -((e.clientY - r.top) / r.height - 0.5) * 5;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
      card.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => {
      tracking = false;
      card.classList.add('settling');
      card.style.transform = '';
    });
  }
}

// ------------------------------------------------- living card details

// higher/lower: a chart that never stops thinking
const sparkCv = document.querySelector('.spark');
if (sparkCv && !reduced) {
  const sg = sparkCv.getContext('2d');
  let sp = [], phase = 0;
  const seed = () => { sp = synthSeries(46, 100); phase = 0; };
  seed();
  (function sparkTick() {
    phase += 0.24;
    if (phase >= 46 + 26) seed();
    const upto = Math.min(46, Math.floor(phase));
    const W = sparkCv.width, H = sparkCv.height;
    sg.clearRect(0, 0, W, H);
    if (upto > 1) {
      const seg = sp.slice(0, upto);
      const lo = Math.min(...sp), hi = Math.max(...sp);
      const up = seg[seg.length - 1] >= seg[0];
      sg.strokeStyle = up ? 'rgba(62, 155, 96, 0.9)' : 'rgba(219, 85, 77, 0.9)';
      sg.lineWidth = 2;
      sg.lineJoin = 'round';
      sg.beginPath();
      seg.forEach((p, i) => {
        const x = (i / 45) * (W - 4) + 2;
        const y = H - 4 - ((p - lo) / (hi - lo || 1)) * (H - 8);
        i ? sg.lineTo(x, y) : sg.moveTo(x, y);
      });
      sg.stroke();
    }
    if (!document.hidden) requestAnimationFrame(sparkTick);
    else setTimeout(sparkTick, 400);
  })();
}

// tickerdle: one tile flips now and then, wondering about you
const tiles = [...document.querySelectorAll('.tkd i')];
if (tiles.length && !reduced) {
  setInterval(() => {
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 1400);
  }, 3800);
}

// news: the wire keeps printing
const WIRES = [
  'Fed holds. Markets shrug.',
  '$WOOF up 4% on treat rumors.',
  'Earnings szn. Buckle up.',
  'Analysts split. As always.',
  '$BONE splits 2 for 1.',
];
const wireEl = $('wire-line');
if (wireEl && !reduced) {
  let wi = 0;
  setInterval(() => {
    wireEl.classList.add('swap');
    setTimeout(() => {
      wi = (wi + 1) % WIRES.length;
      wireEl.textContent = WIRES[wi];
      wireEl.classList.remove('swap');
    }, 300);
  }, 4600);
}

// streak: today's dot asks for today's play
const firstOpen = document.querySelector('.wd:not(.done)');
if (firstOpen) firstOpen.classList.add('today');

// flags: the thumb slides, the choice feels physical
const flags = [...document.querySelectorAll('.flag')];
flags.forEach((f, i) => f.addEventListener('click', () => {
  flags.forEach(x => x.classList.toggle('on', x === f));
  $('flag-thumb').style.transform = `translateX(${i * 52}px)`;
}));

// real money: the door is locked and it tells you so
$('money-card').addEventListener('click', () => {
  const mc = $('money-card');
  mc.classList.remove('deny');
  void mc.offsetWidth;
  mc.classList.add('deny');
});

// ------------------------------------------------- the sheet, for real

const sheet = { y: 0, v: 0, raf: 0 };
let sheetSource = null, dragging = false;

function setSheetY(y) {
  sheet.y = y;
  $('hl-modal').style.transform = y ? `translateY(${y}px)` : '';
  $('hl-back').style.background = `rgba(8, 8, 12, ${Math.max(0.2, 0.72 - (y / 700) * 0.6)})`;
}

function openSheet(srcEl) {
  sheetSource = srcEl || $('card-hl');
  $('hl-back').hidden = false;
  newRound();
  const modal = $('hl-modal');
  setSheetY(0);
  if (!reduced && sheetSource) {
    const s = sheetSource.getBoundingClientRect();
    const m = modal.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (m.left + m.width / 2);
    const dy = s.top + s.height / 2 - (m.top + m.height / 2);
    const sc = Math.max(0.25, s.width / m.width);
    modal.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.4 },
      { transform: 'none', opacity: 1 },
    ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
}

function closeSheet(viaDrag = false, v0 = 0) {
  const modal = $('hl-modal');
  const done = () => { $('hl-back').hidden = true; setSheetY(0); };
  if (reduced) { done(); return; }
  if (viaDrag) {
    // momentum carries it out the way it was moving
    spring(sheet, window.innerHeight, { response: 0.4, damping: 1, v0 }, setSheetY, done);
  } else if (sheetSource) {
    // no momentum: it returns where it came from
    const s = sheetSource.getBoundingClientRect();
    const m = modal.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (m.left + m.width / 2);
    const dy = s.top + s.height / 2 - (m.top + m.height / 2) - sheet.y;
    const sc = Math.max(0.25, s.width / m.width);
    const anim = modal.animate([
      { transform: sheet.y ? `translateY(${sheet.y}px)` : 'none', opacity: 1 },
      { transform: `translate(${dx}px, ${dy + sheet.y}px) scale(${sc})`, opacity: 0 },
    ], { duration: 320, easing: 'cubic-bezier(0.55, 0, 0.68, 0.4)' });
    anim.onfinish = done;
  } else done();
}

// drag: 1:1 with the hand, rubber up, momentum decides
{
  const modal = $('hl-modal');
  let startY = 0, baseY = 0, history = [];
  modal.addEventListener('pointerdown', e => {
    if (e.target.closest('button, canvas, a, input')) return;
    cancelAnimationFrame(sheet.raf);
    dragging = true;
    startY = e.clientY;
    baseY = sheet.y;
    history = [{ y: e.clientY, t: e.timeStamp }];
    modal.setPointerCapture(e.pointerId);
  });
  modal.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = baseY + (e.clientY - startY);
    setSheetY(dy >= 0 ? dy : rubber(dy));
    history.push({ y: e.clientY, t: e.timeStamp });
    if (history.length > 5) history.shift();
  });
  const release = e => {
    if (!dragging) return;
    dragging = false;
    const a = history[0], b = history[history.length - 1];
    const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
    const landing = sheet.y + project(v);
    if (landing > 240 && v > -60) closeSheet(true, v);
    else spring(sheet, 0, { response: 0.35, damping: 1, v0: v }, setSheetY);
  };
  modal.addEventListener('pointerup', release);
  modal.addEventListener('pointercancel', release);
}

// the sheet's doors
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('hl-back').hidden) closeSheet(false); });
$('card-hl').onclick = () => openSheet($('card-hl'));
$('quickstart').onclick = () => openSheet($('quickstart'));
$('bubble-cta').onclick = () => openSheet($('bubble-cta'));
$('hl-x').onclick = () => closeSheet(false);
$('hl-back').onclick = e => { if (e.target === $('hl-back')) closeSheet(false); };

// win pays out visibly, from the table to your pocket
const _saveWallet = saveWallet;
let lastCoins = wallet.coins;
saveWallet = function () {
  if (wallet.coins > lastCoins && !$('hl-back').hidden) flyCoins($('hl-score'));
  lastCoins = wallet.coins;
  _saveWallet();
};

// ------------------------------------------------- ambient: the lobby glow

const glow = $('aurora');
if (glow) {
  const ggl = glow.getContext('webgl', { alpha: true, antialias: false });
  if (ggl) {
    glow.width = 64; glow.height = 36;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;uniform float t;uniform vec2 m;
      float blob(vec2 uv, vec2 c, float r){ return smoothstep(r, 0.0, length(uv - c)); }
      void main(){
        vec2 uv = gl_FragCoord.xy / vec2(64.0, 36.0);
        uv.x *= 1.78;
        vec2 drift = m * 0.06;
        float a = blob(uv, vec2(0.5 + 0.18 * sin(t * 0.11), 0.75 + 0.1 * cos(t * 0.07)) + drift, 0.62);
        float b = blob(uv, vec2(1.25 + 0.2 * cos(t * 0.09), 0.3 + 0.12 * sin(t * 0.13)) + drift, 0.7);
        float c = blob(uv, vec2(0.9 + 0.24 * sin(t * 0.05), 0.55) + drift * 0.5, 0.85);
        vec3 col = vec3(0.078, 0.078, 0.078);
        col += vec3(0.13, 0.10, 0.24) * a * 0.55;
        col += vec3(0.16, 0.13, 0.07) * b * 0.4;
        col += vec3(0.07, 0.09, 0.13) * c * 0.35;
        gl_FragColor = vec4(col, 0.9);
      }`;
    const mk = (ty, src) => { const s = ggl.createShader(ty); ggl.shaderSource(s, src); ggl.compileShader(s); return s; };
    const pr = ggl.createProgram();
    ggl.attachShader(pr, mk(ggl.VERTEX_SHADER, vs));
    ggl.attachShader(pr, mk(ggl.FRAGMENT_SHADER, fs));
    ggl.linkProgram(pr); ggl.useProgram(pr);
    const buf = ggl.createBuffer();
    ggl.bindBuffer(ggl.ARRAY_BUFFER, buf);
    ggl.bufferData(ggl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ggl.STATIC_DRAW);
    const loc = ggl.getAttribLocation(pr, 'p');
    ggl.enableVertexAttribArray(loc);
    ggl.vertexAttribPointer(loc, 2, ggl.FLOAT, false, 0, 0);
    const uT = ggl.getUniformLocation(pr, 't'), uM = ggl.getUniformLocation(pr, 'm');
    let mx = 0, my = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    const draw = t => {
      mx += (tx - mx) * 0.03; my += (ty - my) * 0.03;
      ggl.uniform1f(uT, t / 1000);
      ggl.uniform2f(uM, mx, -my);
      ggl.drawArrays(ggl.TRIANGLES, 0, 3);
      if (!reduced && !document.hidden) requestAnimationFrame(draw);
      else setTimeout(() => requestAnimationFrame(draw), 600);
    };
    requestAnimationFrame(draw);
  }
}

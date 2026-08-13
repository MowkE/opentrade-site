// higherlower.js
// The flagship, playable right at the table: call the next candle,
// win G Coins, keep the streak. Same rules as the app.

import { store, verdict, fmt } from '../engine.js?v7';

const N_SHOW = 26, N_REVEAL = 7;
const TICKS = ['$GARY', '$BONE', '$HOWL', '$FETCH', '$ZOOM'];

function synth(n, start) {
  const out = [start];
  let drift = (Math.random() - 0.5) * 0.004;
  for (let i = 1; i < n; i++) {
    if (Math.random() < 0.08) drift = (Math.random() - 0.5) * 0.006;
    out.push(Math.max(4, out[i - 1] * (1 + drift + (Math.random() - 0.5) * 0.028)));
  }
  return out;
}

export default {
  id: 'higherlower',
  name: 'HIGHER OR LOWER',
  tag: 'Call the next candle before Gary does',
  odds: 'win pays 50 G Coins',
  glyph: '',

  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">call the next candle · win pays 50 g coins</div>
        <div class="hl-room">
          <div class="hl-room-head"><b id="fhl-tick">$GARY</b><span id="fhl-price">100.00</span><i id="fhl-round">round 1</i></div>
          <canvas id="fhl-chart" width="720" height="300"></canvas>
        </div>
      </div>
      <div class="console">
        <div class="hl-room-score">you <b id="fhl-you">0</b> · gary <b id="fhl-gary">0</b></div>
        <p class="house-note"></p>
        <div class="actions">
          <button class="ghost-btn hl-up" id="fhl-up">Higher</button>
          <button class="ghost-btn hl-down" id="fhl-down">Lower</button>
        </div>
      </div>`;

    const $ = sel => body.querySelector(sel);
    const table = body.querySelector('.table');
    const cv = $('#fhl-chart');
    const g = cv.getContext('2d');
    const game = { prices: [], round: 1, you: 0, gary: 0, busy: false, base: 0 };

    const draw = upto => {
      const W = cv.width, H = cv.height, pad = 14;
      g.clearRect(0, 0, W, H);
      const ps = game.prices.slice(0, upto);
      const lo = Math.min(...game.prices) * 0.995, hi = Math.max(...game.prices) * 1.005;
      const x = i => pad + i * ((W - pad * 2) / (N_SHOW + N_REVEAL));
      const y = p => H - pad - ((p - lo) / (hi - lo)) * (H - pad * 2);
      g.strokeStyle = 'rgba(185, 165, 111, 0.5)';
      g.setLineDash([4, 6]);
      g.beginPath(); g.moveTo(x(N_SHOW - 1) + 5, pad); g.lineTo(x(N_SHOW - 1) + 5, H - pad); g.stroke();
      g.setLineDash([]);
      const cw = Math.max(4, (W - pad * 2) / (N_SHOW + N_REVEAL) * 0.55);
      for (let i = 1; i < ps.length; i++) {
        const o = ps[i - 1], c = ps[i];
        g.strokeStyle = g.fillStyle = c >= o ? '#3fa842' : '#d5453a';
        g.beginPath(); g.moveTo(x(i), y(Math.max(o, c)) - 4); g.lineTo(x(i), y(Math.min(o, c)) + 4); g.stroke();
        g.fillRect(x(i) - cw / 2, Math.min(y(o), y(c)), cw, Math.max(2.5, Math.abs(y(o) - y(c))));
      }
      $('#fhl-price').textContent = ps[ps.length - 1].toFixed(2);
    };

    const newRound = () => {
      game.busy = false;
      game.prices = synth(N_SHOW + N_REVEAL, 30 + Math.random() * 300);
      game.base = game.prices[N_SHOW - 1];
      $('#fhl-tick').textContent = TICKS[Math.floor(Math.random() * TICKS.length)];
      $('#fhl-round').textContent = 'round ' + game.round;
      $('#fhl-up').disabled = $('#fhl-down').disabled = false;
      draw(N_SHOW);
    };

    const call = dir => {
      if (game.busy) return;
      game.busy = true;
      $('#fhl-up').disabled = $('#fhl-down').disabled = true;
      let i = N_SHOW;
      const step = () => {
        i++;
        draw(i);
        if (i < N_SHOW + N_REVEAL) { setTimeout(step, 180); return; }
        const final = game.prices[N_SHOW + N_REVEAL - 1];
        const won = (dir === 'up') === (final >= game.base);
        if (won) {
          game.you++;
          store.credit(50);
          verdict(table, 'win', 'You won 50 G Coins');
        } else {
          game.gary++;
          verdict(table, 'lose', 'Gary called it');
        }
        $('#fhl-you').textContent = game.you;
        $('#fhl-gary').textContent = game.gary;
        game.round++;
        setTimeout(newRound, 1500);
      };
      setTimeout(step, 220);
    };

    $('#fhl-up').addEventListener('click', () => call('up'));
    $('#fhl-down').addEventListener('click', () => call('down'));
    newRound();
  },
};

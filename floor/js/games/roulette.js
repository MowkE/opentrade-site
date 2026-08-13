// roulette.js
// European single-zero roulette: 37 pockets, straight numbers pay 35
// to 1, dozens and columns 2 to 1, the even chances 1 to 1. Every bet
// carries the same house edge, 1 in 37, about 2.7 percent; the single
// zero is the whole business model.

import { CHIP_VALUES, rng, store, verdict, fmt } from '../engine.js?v7';

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
// physical wheel order, for the spin
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export default {
  id: 'roulette',
  name: 'ROULETTE',
  tag: 'Pick numbers, spin the wheel, pray in French',
  odds: 'single zero · house edge 2.7 percent',
  glyph: `<svg width="54" height="54" viewBox="0 0 54 54">
    <circle cx="27" cy="27" r="24" fill="none" stroke="#f4f1f7" stroke-width="2" opacity="0.7"/>
    <circle cx="27" cy="27" r="16" fill="none" stroke="#ff4fa3" stroke-width="10" stroke-dasharray="4 4"/>
    <circle cx="27" cy="10" r="3.4" fill="#f5c64f"/>
  </svg>`,

  init(body) {
    const cells = [];
    let grid = '';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        const n = col * 3 + (3 - row);
        grid += `<button class="rc n ${REDS.has(n) ? 'r' : 'b'}" data-bet="n${n}" style="grid-area:${row + 1}/${col + 2}">${n}</button>`;
      }
    }
    const outs = [
      ['d1', '1st 12', '2/2/3/6'], ['d2', '2nd 12', '2/6/3/10'], ['d3', '3rd 12', '2/10/3/14'],
      ['low', '1 to 18', '4/2/5/4'], ['even', 'Even', '4/4/5/6'], ['red', 'Red', '4/6/5/8'],
      ['black', 'Black', '4/8/5/10'], ['odd', 'Odd', '4/10/5/12'], ['high', '19 to 36', '4/12/5/14'],
    ];
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">straight 35 to 1 · dozens and columns 2 to 1 · even chances 1 to 1</div>
        <div class="placard"><b>How to play</b>Pick a chip, then tap any number or outside bet, as many spots as you like. The same spot twice stacks it. Spin settles everything at once.</div>
        <div style="flex:1;display:flex;gap:22px;align-items:center;justify-content:center;padding-top:16px;min-height:0">
          <div id="rl-wheelbox" style="position:relative;width:190px;height:190px;flex:none">
            <div id="rl-wheel" style="position:absolute;inset:0;border-radius:50%;
              background:repeating-conic-gradient(#c8404f 0deg 4.86deg, #2b2733 4.86deg 9.73deg);
              border:7px solid #241a14; box-shadow:inset 0 0 20px rgba(0,0,0,0.6);
              transition:transform 4s cubic-bezier(0.16, 0.9, 0.24, 1)"></div>
            <div style="position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:0;height:0;
              border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #f5c64f"></div>
            <div id="rl-hit" style="position:absolute;inset:0;display:grid;place-items:center;
              font:32px var(--sign);color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.8)"></div>
          </div>
          <div id="rl-board" style="display:grid;grid-template-columns:44px repeat(12, minmax(30px, 44px));
            grid-template-rows:repeat(3, 40px) 34px 34px;gap:5px;align-content:center">
            <button class="rc z" data-bet="n0" style="grid-area:1/1/4/2">0</button>
            ${grid}
            ${outs.map(([k, label, area]) =>
              `<button class="rc o" data-bet="${k}" style="grid-area:${area.split('/').join('/')}">${label}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="console">
        <div class="rack" id="rl-rack"></div>
        <div class="actions">
          <span id="rl-total" style="font-variant-numeric:tabular-nums;color:var(--gold);font-weight:700;font-size:15px">bet 0</span>
          <button class="ghost-btn" id="rl-clear">Clear</button>
          <button class="play-btn" id="rl-spin" disabled>Spin</button>
        </div>
      </div>
      <style>
        .rc { border:1px solid rgba(244,241,247,0.28); border-radius:7px; background:rgba(0,0,0,0.22);
          color:#f4f1f7; font-size:12.5px; font-weight:700; font-variant-numeric:tabular-nums;
          position:relative; transition:transform 0.12s var(--spring), border-color 0.12s; }
        .rc:hover { border-color:#f5c64f; }
        .rc:active { transform:scale(0.94); }
        .rc.r { background:rgba(200,64,79,0.55); }
        .rc.b { background:rgba(20,16,26,0.6); }
        .rc.z { background:rgba(31,138,92,0.6); }
        .rc .amt { position:absolute; top:-7px; right:-5px; background:var(--gold); color:#221a2e;
          font-size:9.5px; border-radius:999px; padding:1px 5px; font-weight:800; }
        .rc.won { border-color:var(--gold); box-shadow:0 0 18px -2px rgba(245,198,79,0.8); }
        #rl-rack .chip.sel { outline:3px solid var(--gold); outline-offset:2px; }
      </style>`;

    const $ = sel => body.querySelector(sel);
    const table = body.querySelector('.table');
    const bets = new Map();
    let chipVal = 5, spinning = false, angle = 0;

    // chip rack with a selected denomination
    const rack = $('#rl-rack');
    CHIP_VALUES.forEach(v => {
      const c = document.createElement('button');
      c.className = 'chip v' + v + (v === 5 ? ' sel' : '');
      c.innerHTML = `<b>${v}</b>`;
      c.addEventListener('click', () => {
        chipVal = v;
        rack.querySelectorAll('.chip').forEach(x => x.classList.toggle('sel', x === c));
      });
      rack.appendChild(c);
    });

    const total = () => [...bets.values()].reduce((s, v) => s + v, 0);
    const paint = () => {
      $('#rl-total').textContent = 'bet ' + fmt(total());
      $('#rl-spin').disabled = spinning || total() < 1;
      body.querySelectorAll('.rc').forEach(el => {
        const amt = bets.get(el.dataset.bet) || 0;
        let b = el.querySelector('.amt');
        if (amt > 0) {
          if (!b) { b = document.createElement('span'); b.className = 'amt'; el.appendChild(b); }
          b.textContent = amt;
        } else if (b) b.remove();
      });
    };

    body.querySelectorAll('.rc').forEach(el => {
      el.addEventListener('click', () => {
        if (spinning || !store.debit(chipVal)) return;
        const k = el.dataset.bet;
        bets.set(k, (bets.get(k) || 0) + chipVal);
        paint();
      });
    });

    $('#rl-clear').addEventListener('click', () => {
      if (spinning) return;
      store.credit(total());
      bets.clear();
      paint();
    });

    const wins = n => {
      const col = n === 0 ? 0 : ((n - 1) % 3) + 1;   // 1 bottom, 3 top
      return key => {
        if (key === 'n' + n) return 36;
        if (n === 0) return 0;
        if (key === 'red') return REDS.has(n) ? 2 : 0;
        if (key === 'black') return REDS.has(n) ? 0 : 2;
        if (key === 'even') return n % 2 === 0 ? 2 : 0;
        if (key === 'odd') return n % 2 === 1 ? 2 : 0;
        if (key === 'low') return n <= 18 ? 2 : 0;
        if (key === 'high') return n >= 19 ? 2 : 0;
        if (key === 'd1') return n <= 12 ? 3 : 0;
        if (key === 'd2') return n >= 13 && n <= 24 ? 3 : 0;
        if (key === 'd3') return n >= 25 ? 3 : 0;
        return 0;
      };
    };

    $('#rl-spin').addEventListener('click', () => {
      if (spinning || total() < 1) return;
      spinning = true;
      $('#rl-spin').disabled = true;
      $('#rl-hit').textContent = '';
      body.querySelectorAll('.rc.won').forEach(el => el.classList.remove('won'));

      const n = rng.int(37);
      const idx = WHEEL.indexOf(n);
      const seg = 360 / 37;
      angle += 4 * 360 + (360 - idx * seg) - (angle % 360);
      $('#rl-wheel').style.transform = `rotate(${angle}deg)`;

      setTimeout(() => {
        const payFor = wins(n);
        let returned = 0;
        for (const [key, amt] of bets) {
          const mult = payFor(key);
          if (mult > 0) {
            returned += amt * mult;
            const el = body.querySelector(`[data-bet="${key}"]`);
            if (el) el.classList.add('won');
          }
        }
        const hitEl = body.querySelector(`[data-bet="n${n}"]`);
        if (hitEl) hitEl.classList.add('won');
        $('#rl-hit').textContent = n;
        const staked = total();
        if (returned > 0) store.credit(returned);
        const net = returned - staked;
        verdict(table, net > 0 ? 'win' : net < 0 ? 'lose' : 'push',
          net > 0 ? `${n} pays ${fmt(net)}` : net < 0 ? `${n}. House takes ${fmt(-net)}` : `${n}. Even night`);
        bets.clear();
        setTimeout(() => { spinning = false; paint(); }, 1400);
      }, 4100);
    });

    paint();
  },
};

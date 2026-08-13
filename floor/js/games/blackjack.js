// blackjack.js
// Six-deck shoe, dealer stands on all 17s, blackjack pays 3 to 2,
// double on any two cards, one split (split aces get one card each).
// House edge with sensible play is about half a percent, which is why
// this table has the best sign on the floor.

import { newShoe, dealTo, betBox, verdict, store, toast, fmt } from '../engine.js?v10';

let shoe = newShoe(6);
const draw = () => {
  if (shoe.length < 52) shoe = newShoe(6);
  return shoe.pop();
};

const val = cards => {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { total += 11; aces++; }
    else if ('JQK'.includes(c.rank)) total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};
const soft = cards => {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { total += 11; aces++; }
    else if ('JQK'.includes(c.rank)) total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return aces > 0;
};
const isBJ = cards => cards.length === 2 && val(cards) === 21;

export default {
  id: 'blackjack',
  name: 'BLACKJACK',
  tag: 'Beat the dealer to 21 without going over',
  odds: 'best odds in the house',
  glyph: `<svg width="66" height="50" viewBox="0 0 66 50" fill="none">
    <rect x="6" y="8" width="24" height="34" rx="4" fill="#f4f1f7" transform="rotate(-8 18 25)"/>
    <rect x="30" y="6" width="24" height="34" rx="4" fill="#f4f1f7" transform="rotate(7 42 23)"/>
    <text x="16" y="30" font-size="14" fill="#d02a4b" transform="rotate(-8 18 25)">A</text>
    <text x="38" y="28" font-size="14" fill="#1c1a22" transform="rotate(7 42 23)">J</text>
  </svg>`,

  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">blackjack pays 3 to 2 · dealer stands on 17</div>
        <div class="placard"><b>House rules</b>Chips to the circle, then Deal. Hit takes a card, Stand keeps your total, Double doubles the bet for one final card, Split turns a pair into two hands.</div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:26px 0 6px">
          <div>
            <div class="hand" id="bj-dealer"></div>
            <div class="score" id="bj-dscore" style="text-align:center;margin-top:6px;font-size:13px;color:rgba(244,241,247,0.75);font-variant-numeric:tabular-nums"></div>
          </div>
          <div style="display:flex;gap:36px;align-items:flex-end">
            <div class="seat" id="bj-seat-0">
              <div class="hand" id="bj-hand-0"></div>
              <div class="score" id="bj-score-0" style="text-align:center;margin-top:6px;font-size:13px;color:rgba(244,241,247,0.75);font-variant-numeric:tabular-nums"></div>
            </div>
            <div class="seat" id="bj-seat-1" hidden>
              <div class="hand" id="bj-hand-1"></div>
              <div class="score" id="bj-score-1" style="text-align:center;margin-top:6px;font-size:13px;color:rgba(244,241,247,0.75);font-variant-numeric:tabular-nums"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="console">
        <div id="bj-bet"></div>
        <div class="actions">
          <button class="ghost-btn" id="bj-hit" disabled>Hit</button>
          <button class="ghost-btn" id="bj-stand" disabled>Stand</button>
          <button class="ghost-btn" id="bj-double" disabled>Double</button>
          <button class="ghost-btn" id="bj-split" disabled>Split</button>
          <button class="play-btn" id="bj-deal" disabled>Deal</button>
        </div>
      </div>`;

    const $ = id => body.querySelector('#' + id);
    const table = body.querySelector('.table');
    const bet = betBox($('bj-bet'), { min: 1, onChange: a => { $('bj-deal').disabled = a < 1 || playing; } });

    let dealer = [], hands = [], active = 0, playing = false, extra = [0, 0];

    const paintScores = revealDealer => {
      $('bj-dscore').textContent = revealDealer ? val(dealer) : '';
      hands.forEach((h, i) => {
        const s = val(h);
        $('bj-score-' + i).textContent = s + (soft(h) && s <= 21 ? ' soft' : '');
        $('bj-seat-' + i).style.opacity = hands.length > 1 && i !== active && playing ? 0.55 : 1;
      });
    };

    const buttons = state => {
      $('bj-hit').disabled = !state.hit;
      $('bj-stand').disabled = !state.stand;
      $('bj-double').disabled = !state.double;
      $('bj-split').disabled = !state.split;
      $('bj-deal').disabled = !state.deal || bet.amount < 1;
    };

    const handDone = () => {
      if (active < hands.length - 1) {
        active++;
        dealTo($('bj-hand-' + active), draw());
        paintScores(false);
        turn();
      } else {
        dealerPlay();
      }
    };

    const turn = () => {
      const h = hands[active];
      if (val(h) >= 21) { handDone(); return; }
      const canDouble = h.length === 2 && store.canBet(bet.amount);
      const canSplit = hands.length === 1 && h.length === 2 &&
        val([h[0]]) === val([h[1]]) && store.canBet(bet.amount);
      buttons({ hit: true, stand: true, double: canDouble, split: canSplit, deal: false });
    };

    const dealerPlay = async () => {
      buttons({ deal: false });
      dealer[1].el.flip();
      paintScores(true);
      const anyLive = hands.some(h => val(h) <= 21);
      while (anyLive && val(dealer.map(d => d.c)) < 17) {
        await new Promise(r => setTimeout(r, 550));
        const c = draw();
        dealer.push({ c, el: dealTo($('bj-dealer'), c) });
        $('bj-dscore').textContent = val(dealer.map(d => d.c));
      }
      settle();
    };

    const settle = () => {
      const d = val(dealer.map(x => x.c));
      let returned = 0, net = 0;
      hands.forEach((h, i) => {
        const stake = bet.amount + extra[i];
        const p = val(h);
        if (p > 21) { net -= stake; return; }
        if (isBJ(h) && hands.length === 1 && !isBJ(dealer.map(x => x.c))) {
          returned += stake * 2.5; net += stake * 1.5; return;
        }
        if (d > 21 || p > d) { returned += stake * 2; net += stake; }
        else if (p === d) { returned += stake; }
        else { net -= stake; }
      });
      bet.settle(returned);
      const kind = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
      verdict(table, kind,
        net > 0 ? `You won ${fmt(net)}` : net < 0 ? `House takes ${fmt(-net)}` : 'Push');
      playing = false;
      extra = [0, 0];
      setTimeout(() => { bet.unlock(); buttons({ deal: true }); }, 1200);
    };

    $('bj-deal').addEventListener('click', () => {
      if (playing || bet.amount < 1) return;
      playing = true;
      bet.lock();
      dealer = []; hands = [[]]; active = 0; extra = [0, 0];
      $('bj-dealer').textContent = '';
      $('bj-hand-0').textContent = ''; $('bj-hand-1').textContent = '';
      $('bj-seat-1').hidden = true;
      $('bj-score-1').textContent = '';

      const seq = [
        () => { const c = draw(); hands[0].push(c); dealTo($('bj-hand-0'), c); },
        () => { const c = draw(); dealer.push({ c, el: dealTo($('bj-dealer'), c) }); },
        () => { const c = draw(); hands[0].push(c); dealTo($('bj-hand-0'), c); },
        () => { const c = draw(); dealer.push({ c, el: dealTo($('bj-dealer'), c, { faceDown: true }) }); },
      ];
      seq.forEach((fn, i) => setTimeout(fn, i * 260));
      setTimeout(() => {
        paintScores(false);
        if (isBJ(hands[0]) || isBJ(dealer.map(x => x.c))) dealerPlay();
        else turn();
      }, seq.length * 260 + 120);
    });

    $('bj-hit').addEventListener('click', () => {
      const c = draw();
      hands[active].push(c);
      dealTo($('bj-hand-' + active), c);
      paintScores(false);
      if (val(hands[active]) >= 21) handDone();
      else turn();
    });

    $('bj-stand').addEventListener('click', handDone);

    $('bj-double').addEventListener('click', () => {
      if (!store.debit(bet.amount)) { toast('Not enough chips to double'); return; }
      extra[active] += bet.amount;
      const c = draw();
      hands[active].push(c);
      dealTo($('bj-hand-' + active), c);
      paintScores(false);
      handDone();
    });

    $('bj-split').addEventListener('click', () => {
      if (!store.debit(bet.amount)) { toast('Not enough chips to split'); return; }
      extra[1] = 0;
      const [a, b] = hands[0];
      hands = [[a], [b]];
      $('bj-hand-0').textContent = '';
      dealTo($('bj-hand-0'), a);
      $('bj-seat-1').hidden = false;
      dealTo($('bj-hand-1'), b);
      const aces = a.rank === 'A';
      const c1 = draw(); hands[0].push(c1); dealTo($('bj-hand-0'), c1);
      if (aces) {
        const c2 = draw(); hands[1].push(c2); dealTo($('bj-hand-1'), c2);
        paintScores(false);
        dealerPlay();
        return;
      }
      paintScores(false);
      turn();
    });
  },
};

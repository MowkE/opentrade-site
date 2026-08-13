// poker.js
// This table is being felted. A game agent replaces this file whole.

export default {
  id: 'poker',
  name: 'THREE CARD POKER',
  tag: 'Three cards against the dealer',
  odds: 'opening tonight',
  glyph: '<svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="20" fill="none" stroke="#9a93a8" stroke-width="2" stroke-dasharray="5 6"/></svg>',
  init(body) {
    body.innerHTML = '<div class="table"><div style="flex:1;display:grid;place-items:center;color:rgba(244,241,247,0.6)">The THREE CARD POKER table is being felted. Check back in a minute.</div></div>';
  },
};

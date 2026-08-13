// war.js
// This table is being felted. A game agent replaces this file whole.

export default {
  id: 'war',
  name: 'CASINO WAR',
  tag: 'Highest card wins, ties mean war',
  odds: 'opening tonight',
  glyph: '<svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="20" fill="none" stroke="#9a93a8" stroke-width="2" stroke-dasharray="5 6"/></svg>',
  init(body) {
    body.innerHTML = '<div class="table"><div style="flex:1;display:grid;place-items:center;color:rgba(244,241,247,0.6)">The CASINO WAR table is being felted. Check back in a minute.</div></div>';
  },
};

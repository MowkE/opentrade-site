// cashroyale.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'cashroyale',
  name: 'CASH ROYALE',
  tag: 'Draft a deck of tickers, battle a friend',
  odds: '3 minute battles',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">CASH ROYALE</div>
        <div class="otroom">
          <b>CASH ROYALE</b>
          <p>Draft a deck of tickers, battle a friend</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

// fanstocks.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'fanstocks',
  name: 'FANSTOCKS',
  tag: 'Fantasy leagues where the roster is real tickers',
  odds: 'featured this season',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">FANSTOCKS</div>
        <div class="otroom">
          <b>FANSTOCKS</b>
          <p>Fantasy leagues where the roster is real tickers</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

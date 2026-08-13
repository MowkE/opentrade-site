// tickerdle.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'tickerdle',
  name: 'TICKERDLE',
  tag: 'Guess the mystery ticker in six tries',
  odds: 'daily puzzle',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">TICKERDLE</div>
        <div class="otroom">
          <b>TICKERDLE</b>
          <p>Guess the mystery ticker in six tries</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

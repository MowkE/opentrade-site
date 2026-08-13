// league.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'league',
  name: 'LEAGUE',
  tag: 'Your portfolio against ChatGPT, all week',
  odds: 'the main event',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">LEAGUE</div>
        <div class="otroom">
          <b>LEAGUE</b>
          <p>Your portfolio against ChatGPT, all week</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

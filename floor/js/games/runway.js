// runway.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'runway',
  name: 'RUNWAY',
  tag: 'Keep the startup alive one round longer',
  odds: 'survival mode',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">RUNWAY</div>
        <div class="otroom">
          <b>RUNWAY</b>
          <p>Keep the startup alive one round longer</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

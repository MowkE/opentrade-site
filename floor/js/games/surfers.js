// surfers.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'surfers',
  name: 'WALLSTREET SURFERS',
  tag: 'Run the chart, dodge the dips',
  odds: '90 second runs',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">WALLSTREET SURFERS</div>
        <div class="otroom">
          <b>WALLSTREET SURFERS</b>
          <p>Run the chart, dodge the dips</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

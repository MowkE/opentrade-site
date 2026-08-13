// news.js
// OpenTrade floor station. The real game ships in the app; this room
// holds the seat until it plugs in.

export default {
  id: 'news',
  name: 'NEWS',
  tag: 'Trade the headlines before they cool',
  odds: 'live wire',
  glyph: '',
  init(body) {
    body.innerHTML = `
      <div class="table">
        <div class="rail-note">NEWS</div>
        <div class="otroom">
          <b>NEWS</b>
          <p>Trade the headlines before they cool</p>
          <button class="play-btn" onclick="this.textContent='Opens in the app'">Open in the app</button>
        </div>
      </div>`;
  },
};

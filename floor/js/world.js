// world.js
// The OpenTrade floor: a dense cartoon casino in the HEX-maximalist
// tradition. Psychedelic carpet, patterned wallpaper, neon wall art,
// chunky white-rimmed tables for the eight OpenTrade games, blob
// patrons who bob and wander, Gary presiding over the League stage,
// live canvas-texture screens (a chart that trades, a news marquee
// that never stops, a billboard that rotates posters), and your own
// cartoon mitts swinging at the bottom of the frame. Everything is
// primitives and canvas textures; nothing is downloaded.

import * as THREE from 'three';

const ROOM_W = 54, ROOM_D = 36, WALL_H = 7;

const C = {
  ink: 0xfffdf8,
  violet: 0x8f77ef,
  brass: 0xb9a56f,
  teal: 0x2fbfa5,
  orange: 0xf07f3c,
  red: 0xd5453a,
  green: 0x3fa842,
  wood: 0x2a1c14,
  dark: 0x161225,
  felt: 0x1d5c3f,
};

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.04, ...opts });
const glow = (color, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.55 });

// ─────────────────────────────────────────────── canvas texture tools

function cvTex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...opts.repeat); }
  return tex;
}

/* the carpet: loud on purpose, like every good casino */
function carpetTexture() {
  return cvTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1b2038';
    g.fillRect(0, 0, w, h);
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    // big staring circles
    for (let i = 0; i < 7; i++) {
      const x = rnd() * w, y = rnd() * h, r = 34 + rnd() * 40;
      g.strokeStyle = ['#f07f3c', '#2fbfa5', '#b9a56f'][i % 3];
      g.lineWidth = 9;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
      g.fillStyle = ['#d5453a', '#8f77ef', '#f07f3c'][i % 3];
      g.beginPath(); g.arc(x, y, r * 0.4, 0, 7); g.fill();
    }
    // swooshes
    g.lineWidth = 12;
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = ['#2fbfa5', '#8f77ef', '#f07f3c'][i % 3];
      g.beginPath();
      const x = rnd() * w, y = rnd() * h;
      g.arc(x, y, 60 + rnd() * 60, rnd() * 6, rnd() * 6 + 1.6);
      g.stroke();
    }
    // diamonds
    for (let i = 0; i < 10; i++) {
      const x = rnd() * w, y = rnd() * h, s = 12 + rnd() * 16;
      g.fillStyle = ['#b9a56f', '#d5453a', '#2fbfa5', '#8f77ef'][i % 4];
      g.beginPath();
      g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y);
      g.closePath(); g.fill();
    }
    // confetti
    for (let i = 0; i < 90; i++) {
      g.fillStyle = ['#fffdf8', '#f07f3c', '#2fbfa5', '#ff9fb2'][i % 4];
      g.globalAlpha = 0.55;
      g.fillRect(rnd() * w, rnd() * h, 5, 5);
      g.globalAlpha = 1;
    }
  }, { repeat: [5, 3.4] });
}

function wallpaperTexture() {
  return cvTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3258';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        if ((x / 16 + y / 16) % 2 === 0) { g.fillStyle = '#312a4c'; g.fillRect(x, y, 16, 16); }
      }
    }
    g.fillStyle = '#6a5a9a';
    for (let y = 8; y < h; y += 32) for (let x = 8; x < w; x += 32) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
  }, { repeat: [10, 3] });
}

function signTexture(text, accent = '#8f77ef') {
  const size = text.length > 12 ? 84 : 110;
  return cvTex(1024, 224, (g, w, h) => {
    g.fillStyle = '#120e1e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = accent;
    g.lineWidth = 7;
    g.strokeRect(9, 9, w - 18, h - 18);
    g.font = `600 ${size}px Oswald, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = accent;
    g.shadowBlur = 42;
    g.fillStyle = '#fffdf8';
    g.fillText(text, w / 2, h / 2 + 6);
    g.shadowBlur = 12;
    g.fillText(text, w / 2, h / 2 + 6);
  });
}

/* the green instruction plaque every table gets */
function plaqueTexture(text) {
  return cvTex(768, 108, (g, w, h) => {
    g.fillStyle = '#0c2013';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2e6b41';
    g.lineWidth = 5;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.font = 'italic 46px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#7fe0a0';
    g.shadowBlur = 14;
    g.fillStyle = '#8fe8ab';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

/* dark LED board with red/green rows */
function ledTexture(rows) {
  return cvTex(512, 64 + rows.length * 74, (g, w, h) => {
    g.fillStyle = '#0b0a12';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2b2740';
    g.lineWidth = 5;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.font = '600 44px monospace';
    g.textAlign = 'center';
    rows.forEach(([text, color], i) => {
      g.shadowColor = color;
      g.shadowBlur = 16;
      g.fillStyle = color;
      g.fillText(text, w / 2, 84 + i * 74);
    });
  });
}

// ─────────────────────────────────────────────── furniture vocabulary

function legs(group, positions, height = 0.86) {
  for (const [x, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, height, 10), mat(0x14101c));
    leg.position.set(x, height / 2, z);
    group.add(leg);
  }
}

/* chunky rect table with the glowing white rim of the inspo */
function rimTable(w, d, opts = {}) {
  const g = new THREE.Group();
  const topMat = opts.map
    ? new THREE.MeshStandardMaterial({ map: opts.map, emissive: 0xffffff, emissiveMap: opts.map, emissiveIntensity: 0.55, roughness: 1 })
    : mat(opts.color ?? C.dark, { roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), topMat);
  top.position.y = 0.92;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.8, d - 0.12), mat(opts.skirt ?? 0x3a1f2b));
  skirt.position.y = 0.5;
  g.add(top, skirt);
  const rimY = 0.99, rt = 0.09;
  const mkRim = (rw, rd, x, z) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.07, rd), glow(0xffffff, 1.1));
    r.position.set(x, rimY, z);
    g.add(r);
  };
  mkRim(w + 0.1, rt, 0, -d / 2); mkRim(w + 0.1, rt, 0, d / 2);
  mkRim(rt, d + 0.1, -w / 2, 0); mkRim(rt, d + 0.1, w / 2, 0);
  legs(g, [[-w / 2 + 0.3, -d / 2 + 0.3], [w / 2 - 0.3, -d / 2 + 0.3], [-w / 2 + 0.3, d / 2 - 0.3], [w / 2 - 0.3, d / 2 - 0.3]]);
  return g;
}

function roundRimTable(radius, opts = {}) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 36),
    opts.map ? new THREE.MeshStandardMaterial({ map: opts.map, roughness: 0.75 }) : mat(opts.color ?? C.felt, { roughness: 0.85 }));
  top.position.y = 0.92;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 10, 44), glow(0xffffff, 1.1));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.99;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.06, radius * 0.8, 0.8, 36), mat(0x3a1f2b));
  skirt.position.y = 0.5;
  g.add(top, rim, skirt);
  legs(g, [[-radius * 0.6, 0], [radius * 0.6, 0], [0, radius * 0.6], [0, -radius * 0.6]]);
  return g;
}

function stool(x, z, color = 0x8c2f4a) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 14), mat(color, { roughness: 0.6 }));
  seat.position.y = 0.62;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), mat(0x14101c));
  post.position.y = 0.31;
  g.add(seat, post);
  g.position.set(x, 0, z);
  return g;
}

function plant(scale = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.34, 10), mat(0x7a4630));
  pot.position.y = 0.17;
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.85, 6), mat(0x2f7747, { roughness: 0.7 }));
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12, 0.72, Math.sin(a) * 0.12);
    leaf.rotation.set(Math.cos(a) * 0.5, 0, Math.sin(a) * -0.5);
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

function velvetRope(x1, z1, x2, z2) {
  const g = new THREE.Group();
  for (const [x, z] of [[x1, z1], [x2, z2]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1, 10), mat(0xc9a54b, { metalness: 0.6, roughness: 0.35 }));
    post.position.set(x, 0.5, z);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xc9a54b, { metalness: 0.6, roughness: 0.35 }));
    ball.position.set(x, 1.02, z);
    g.add(post, ball);
  }
  const mid = new THREE.Vector3((x1 + x2) / 2, 0.72, (z1 + z2) / 2);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x1, 0.95, z1), mid, new THREE.Vector3(x2, 0.95, z2));
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 6), mat(0xa8324a, { roughness: 0.6 }));
  g.add(rope);
  return g;
}

/* a patron: bright blob, big eyes, small opinions */
function blob(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat(color, { roughness: 0.55 }));
  body.scale.y = 1.55;
  body.position.y = 0.66;
  const eye = side => {
    const e = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(0xffffff, { roughness: 0.3 }));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x14101c));
    pupil.position.z = 0.08;
    e.add(white, pupil);
    e.position.set(side * 0.15, 0.95, 0.34);
    return e;
  };
  g.add(body, eye(-1), eye(1));
  const foot = side => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x14101c));
    f.position.set(side * 0.16, 0.06, 0.06);
    f.scale.set(1, 0.55, 1.4);
    return f;
  };
  g.add(foot(-1), foot(1));
  return g;
}

// ───────────────────────────────────────────────────────── the world

export function buildWorld(canvas, games) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0916);
  scene.fog = new THREE.Fog(0x0b0916, 26, 74);

  const camera = new THREE.PerspectiveCamera(74, 2, 0.1, 130);
  scene.add(camera);

  // floor and shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallpaperTexture(), roughness: 0.9 });
  const mkWall = (w, x, z, ry) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallMat);
    wall.position.set(x, WALL_H / 2, z);
    wall.rotation.y = ry;
    scene.add(wall);
    const wain = new THREE.Mesh(new THREE.BoxGeometry(w, 1, 0.14), mat(0x171226));
    wain.position.set(x, 0.5, z);
    wain.rotation.y = ry;
    scene.add(wain);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), glow(C.violet, 2));
    strip.position.set(x, WALL_H - 0.7, z);
    strip.rotation.y = ry;
    scene.add(strip);
  };
  mkWall(ROOM_W, 0, -ROOM_D / 2, 0);
  mkWall(ROOM_W, 0, ROOM_D / 2, Math.PI);
  mkWall(ROOM_D, -ROOM_W / 2, 0, Math.PI / 2);
  mkWall(ROOM_D, ROOM_W / 2, 0, -Math.PI / 2);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshBasicMaterial({ color: 0x120e1c }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  scene.add(ceiling);

  // interior wall stubs break the hall into bays
  for (const [x, z, w, ry] of [[-13, -1.5, 7, 0], [13, -1.5, 7, 0]]) {
    const stub = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H * 0.62, 0.5), wallMat);
    stub.position.set(x, WALL_H * 0.31, z);
    stub.rotation.y = ry;
    scene.add(stub);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.6), glow(C.teal, 1.4));
    cap.position.set(x, WALL_H * 0.62 + 0.05, z);
    cap.rotation.y = ry;
    scene.add(cap);
  }

  // light: bright enough to see the colors that are the whole point
  scene.add(new THREE.AmbientLight(0x5a5478, 3.6));
  // broad warm fill so the room reads bright like the reference
  for (const [fx, fz] of [[-14, -9], [14, -9], [-14, 7], [14, 7], [0, -1], [0, 14]]) {
    const fill = new THREE.PointLight(0xfff0dc, 300, 30, 1.65);
    fill.position.set(fx, 6.2, fz);
    scene.add(fill);
  }
  scene.add(new THREE.HemisphereLight(0x9a86c8, 0x2a2038, 1.1));

  const spinners = [], liveTex = [], npcs = [];

  // ───────────────────────────── wall dressing

  // neon martini over the bar
  const martini = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshStandardMaterial({
      map: cvTex(256, 256, (g, w, h) => {
        g.strokeStyle = '#7fe8dc';
        g.lineWidth = 10;
        g.shadowColor = '#7fe8dc'; g.shadowBlur = 22;
        g.beginPath();
        g.moveTo(40, 60); g.lineTo(216, 60); g.lineTo(128, 150); g.closePath();
        g.moveTo(128, 150); g.lineTo(128, 210);
        g.moveTo(90, 214); g.lineTo(166, 214);
        g.stroke();
        g.fillStyle = '#f07f3c';
        g.beginPath(); g.arc(150, 84, 12, 0, 7); g.fill();
      }),
      emissive: 0xffffff, emissiveIntensity: 0.6, transparent: true, roughness: 0.6,
      emissiveMap: null,
    }));
  martini.position.set(-26.8, 4.4, -9);
  martini.rotation.y = Math.PI / 2;
  scene.add(martini);

  // script neon on the right wall
  const script = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4),
    new THREE.MeshStandardMaterial({
      map: cvTex(1024, 340, (g, w, h) => {
        g.font = 'italic 700 150px Georgia, serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = '#ff9fb2'; g.shadowBlur = 40;
        g.fillStyle = '#ffd9e2';
        g.fillText('opentrade', w / 2, h / 2);
      }),
      emissive: 0xffffff, emissiveIntensity: 0.7, transparent: true, roughness: 0.6,
    }));
  script.position.set(26.8, 4.6, 6);
  script.rotation.y = -Math.PI / 2;
  scene.add(script);

  // the big billboard: rotating game posters
  const posterNames = games.map(g => g.name);
  const posterCv = document.createElement('canvas');
  posterCv.width = 1024; posterCv.height = 448;
  const posterG = posterCv.getContext('2d');
  const posterTex = new THREE.CanvasTexture(posterCv);
  posterTex.colorSpace = THREE.SRGBColorSpace;
  const posterColors = ['#8f77ef', '#f2bb1e', '#2fbfa5', '#d5453a', '#f07f3c', '#3fa842', '#ff9fb2', '#b9a56f'];
  let posterIdx = 0;
  function paintPoster() {
    const name = posterNames[posterIdx % posterNames.length];
    const col = posterColors[posterIdx % posterColors.length];
    posterG.fillStyle = '#100c1c';
    posterG.fillRect(0, 0, 1024, 448);
    posterG.fillStyle = col;
    posterG.fillRect(0, 0, 1024, 14);
    posterG.fillRect(0, 434, 1024, 14);
    posterG.font = '600 120px Oswald, sans-serif';
    posterG.textAlign = 'center';
    posterG.shadowColor = col; posterG.shadowBlur = 46;
    posterG.fillStyle = '#fffdf8';
    posterG.fillText(name, 512, 250);
    posterG.shadowBlur = 0;
    posterG.font = '600 40px Oswald, sans-serif';
    posterG.fillStyle = col;
    posterG.fillText('TONIGHT ON THE FLOOR', 512, 96);
    posterTex.needsUpdate = true;
    posterIdx++;
  }
  paintPoster();
  setInterval(paintPoster, 6000);
  const billboard = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.8),
    new THREE.MeshStandardMaterial({ map: posterTex, emissive: 0xffffff, emissiveMap: posterTex, emissiveIntensity: 0.85, roughness: 0.6 }));
  billboard.position.set(0, 4.4, ROOM_D / 2 - 0.08);
  billboard.rotation.y = Math.PI;
  scene.add(billboard);

  // standings board on the right wall
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8),
    new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.6 }));
  board.position.set(26.9, 3.6, -6);
  board.rotation.y = -Math.PI / 2;
  scene.add(board);
  function paintBoard(players, activeId) {
    const tex = cvTex(1024, 512, (g, w, h) => {
      g.fillStyle = '#100c1c';
      g.fillRect(0, 0, w, h);
      g.font = '600 64px Oswald, sans-serif';
      g.textAlign = 'center';
      g.shadowColor = '#b9a56f'; g.shadowBlur = 26;
      g.fillStyle = '#fffdf8';
      g.fillText("TONIGHT'S STANDINGS", w / 2, 88);
      g.shadowBlur = 0;
      g.font = '44px Nunito, sans-serif';
      players.slice(0, 5).forEach((p, i) => {
        const y = 180 + i * 70;
        g.textAlign = 'left';
        g.fillStyle = p.id === activeId ? '#b9a56f' : 'rgba(255,253,248,0.85)';
        g.fillText(`${i + 1}. ${p.name}`, 90, y);
        g.textAlign = 'right';
        g.fillStyle = '#f2c14b';
        g.fillText(p.chips.toLocaleString() + 'g', w - 90, y);
      });
    });
    board.material.map = tex;
    board.material.emissiveMap = tex;
    board.material.needsUpdate = true;
  }

  // the bar: counter and a glowing bottle wall
  {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.05, 1.1), mat(C.wood, { roughness: 0.5 }));
    counter.position.set(-23.4, 0.52, -9);
    counter.rotation.y = Math.PI / 2;
    scene.add(counter);
    const shelf = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4),
      new THREE.MeshStandardMaterial({
        map: cvTex(768, 288, (g, w, h) => {
          g.fillStyle = '#17101f'; g.fillRect(0, 0, w, h);
          const cols = ['#7fe8dc', '#ff9fb2', '#f2c14b', '#8f77ef', '#8fe8ab'];
          for (let s = 0; s < 2; s++) {
            const y = 60 + s * 130;
            g.fillStyle = '#2a2138'; g.fillRect(20, y + 62, w - 40, 10);
            for (let i = 0; i < 12; i++) {
              g.fillStyle = cols[(i + s) % 5];
              const x = 44 + i * 58;
              g.fillRect(x, y, 20, 60);
              g.fillRect(x + 6, y - 16, 8, 18);
            }
          }
        }),
        emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.7,
      }));
    shelf.position.set(-26.85, 2.3, -9);
    shelf.rotation.y = Math.PI / 2;
    scene.add(shelf);
    const barLight = new THREE.PointLight(0x7fe8dc, 120, 12, 1.7);
    barLight.position.set(-24, 3.4, -9);
    scene.add(barLight);
  }

  // entrance ropes
  scene.add(velvetRope(-2.4, -17.4, -2.4, -13.6));
  scene.add(velvetRope(2.4, -17.4, 2.4, -13.6));

  // plants
  for (const [x, z, s] of [[-25.5, 15.5, 1.3], [25.5, 15.5, 1.3], [-25.5, -15.5, 1.1], [7, -14, 1], [-4.5, 12.2, 1.1], [4.5, 12.2, 1.1]]) {
    const p = plant(s);
    p.position.set(x, 0, z);
    scene.add(p);
  }

  // ───────────────────────────── the eight stations

  const gary = {};
  const texLoader = new THREE.TextureLoader();
  const garySprite = (file, w = 1.6) => {
    const tex = texLoader.load(`assets/gary/${file}.webp`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    m.position.y = w / 2 + 0.02;
    return m;
  };

  const BUILD = {
    higherlower: () => {
      const g = new THREE.Group();
      // live chart table
      const chartCv = document.createElement('canvas');
      chartCv.width = 512; chartCv.height = 256;
      const chartTex = new THREE.CanvasTexture(chartCv);
      chartTex.colorSpace = THREE.SRGBColorSpace;
      const cg = chartCv.getContext('2d');
      let prices = [100];
      const paintChart = () => {
        const last = prices[prices.length - 1];
        prices.push(Math.max(20, last * (1 + (Math.random() - 0.495) * 0.03)));
        if (prices.length > 30) prices.shift();
        cg.fillStyle = '#0c0a14'; cg.fillRect(0, 0, 512, 256);
        const lo = Math.min(...prices), hi = Math.max(...prices);
        const x = i => 16 + (i / 29) * 480;
        const y = p => 236 - ((p - lo) / (hi - lo || 1)) * 210;
        for (let i = 1; i < prices.length; i++) {
          const up = prices[i] >= prices[i - 1];
          cg.strokeStyle = cg.fillStyle = up ? '#3fa842' : '#d5453a';
          cg.fillRect(x(i) - 5, Math.min(y(prices[i - 1]), y(prices[i])), 10, Math.max(3, Math.abs(y(prices[i]) - y(prices[i - 1]))));
        }
        chartTex.needsUpdate = true;
      };
      paintChart();
      liveTex.push({ every: 0.7, acc: 0, fn: paintChart });
      const t = rimTable(3.6, 2.1, { map: chartTex, skirt: 0x241733 });
      g.add(t);
      // the two big call buttons on the rim
      const btn = (color, x) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.4), glow(color, 0.9));
        b.position.set(x, 1.04, 1.25);
        g.add(b);
      };
      btn(C.green, -0.5); btn(C.red, 0.5);
      g.add(stool(-1.2, 1.9), stool(0, 2.1), stool(1.2, 1.9));
      return g;
    },

    tickerdle: () => {
      const g = new THREE.Group();
      const boardTex = cvTex(384, 448, (gg, w, h) => {
        gg.fillStyle = '#120e1e'; gg.fillRect(0, 0, w, h);
        const states = ['#2a2438', '#2a2438', '#b8963e', '#3fa842'];
        for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
          gg.fillStyle = r < 3 ? states[Math.floor(Math.random() * 4)] : '#1c1729';
          gg.fillRect(20 + c * 70, 20 + r * 70, 60, 60);
        }
      });
      const bd = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.14),
        new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.4, roughness: 0.7 }));
      bd.position.y = 2.2;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 0.1), mat(C.wood));
      frame.position.set(0, 2.2, -0.04);
      g.add(bd, frame);
      const desk = rimTable(2.4, 1.1, { color: 0x1d1830 });
      desk.position.z = 0.9;
      g.add(desk);
      g.add(stool(-0.7, 1.8), stool(0.7, 1.8));
      return g;
    },

    fanstocks: () => {
      const g = roundRimTable(1.7, { color: C.felt });
      // player cards around the edge
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.42), mat(0xf4efe3, { roughness: 0.4 }));
        card.position.set(Math.cos(a) * 1.05, 0.99, Math.sin(a) * 1.05);
        card.rotation.y = -a + Math.PI / 2;
        g.add(card);
      }
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.4, 12), mat(0xf2c14b, { metalness: 0.7, roughness: 0.3 }));
      cup.position.y = 1.2;
      const cupBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.1, 12), mat(0x8a6a1d, { metalness: 0.5 }));
      cupBase.position.y = 1.0;
      g.add(cup, cupBase);
      for (const a of [0.5, 1.6, 2.7, 3.8, 4.9]) g.add(stool(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0x2f4a8c));
      return g;
    },

    league: () => {
      const g = new THREE.Group();
      // the stage
      const stage = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.36, 4.6), mat(0x241a3a, { roughness: 0.6 }));
      stage.position.y = 0.18;
      const lip = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.06, 4.7), glow(C.violet, 1.3));
      lip.position.y = 0.38;
      g.add(stage, lip);
      // two podiums
      const podium = x => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.1), mat(0x171226));
        p.position.set(x, 0.86, 0.6);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.2), glow(C.brass, 0.8));
        cap.position.set(x, 1.4, 0.6);
        g.add(p, cap);
      };
      podium(-2); podium(2);
      // gary vs the blossom
      const gs = garySprite('celebratory', 2.1);
      gs.position.set(-2, 1.5 + 1.05, 0.6);
      gary.league = gs;
      g.add(gs);
      const blossomTex = cvTex(256, 256, (gg, w, h) => {
        gg.strokeStyle = '#fffdf8';
        gg.lineWidth = 15;
        gg.shadowColor = '#fffdf8'; gg.shadowBlur = 16;
        for (let i = 0; i < 6; i++) {
          gg.save();
          gg.translate(128, 128);
          gg.rotate((i / 6) * Math.PI * 2);
          gg.beginPath();
          gg.arc(0, -44, 40, Math.PI * 0.2, Math.PI * 1.4);
          gg.stroke();
          gg.restore();
        }
      });
      const blossom = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
        new THREE.MeshBasicMaterial({ map: blossomTex, transparent: true, side: THREE.DoubleSide }));
      blossom.position.set(2, 2.6, 0.6);
      blossom.name = 'spinner-slow';
      spinners.push(blossom);
      g.add(blossom);
      // VS burst
      const vs = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1),
        new THREE.MeshBasicMaterial({
          map: cvTex(128, 128, (gg, w, h) => {
            gg.font = '700 74px Oswald, sans-serif';
            gg.textAlign = 'center'; gg.textBaseline = 'middle';
            gg.shadowColor = '#f2bb1e'; gg.shadowBlur = 20;
            gg.fillStyle = '#f2c14b';
            gg.fillText('VS', 64, 68);
          }), transparent: true, side: THREE.DoubleSide,
        }));
      vs.position.set(0, 2.4, 0.6);
      g.add(vs);
      return g;
    },

    cashroyale: () => {
      const g = rimTable(2.9, 2.9, { color: 0x1c2a4a, skirt: 0x172038 });
      // battle lanes
      const lane = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 2.6), glow(C.teal, 0.7));
      lane.position.y = 0.99;
      g.add(lane);
      for (const [x, z] of [[-0.9, -0.8], [0.9, -0.8], [-0.9, 0.8], [0.9, 0.8]]) {
        for (let k = 0; k < 3; k++) {
          const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.42), mat(k === 2 ? 0xf2c14b : 0xf4efe3, { roughness: 0.4 }));
          card.position.set(x + k * 0.05, 0.99 + k * 0.014, z);
          card.rotation.y = k * 0.16;
          g.add(card);
        }
      }
      g.add(stool(0, 2.1, 0xb8632f), stool(0, -2.1, 0x2f4a8c));
      return g;
    },

    surfers: () => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 0.8), mat(0x1d1533, { roughness: 0.5, metalness: 0.2 }));
        body.position.y = 1.1;
        const screenTex = cvTex(192, 144, (gg, w, h) => {
          gg.fillStyle = '#0c1420'; gg.fillRect(0, 0, w, h);
          gg.strokeStyle = '#2fbfa5';
          gg.lineWidth = 5;
          gg.beginPath();
          for (let x = 0; x <= w; x += 12) {
            const y = h * 0.6 - Math.sin(x / 26 + i * 2) * 26 - x * 0.12;
            x ? gg.lineTo(x, y) : gg.moveTo(x, y);
          }
          gg.stroke();
          gg.fillStyle = '#f2c14b';
          gg.beginPath(); gg.arc(w * 0.6, h * 0.34, 9, 0, 7); gg.fill();
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6),
          new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.5, roughness: 0.4 }));
        screen.position.set(0, 1.55, 0.41);
        const marquee = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 0.8), glow([C.teal, C.orange, C.violet][i], 0.9));
        marquee.position.y = 2.3;
        m.add(body, screen, marquee);
        m.position.x = (i - 1) * 1.35;
        g.add(m);
      }
      return g;
    },

    runway: () => {
      const g = roundRimTable(1.35, { color: 0x232c1c });
      // the runway tower: months of cash left
      for (let i = 0; i < 6; i++) {
        const level = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.05, 0.14, 0.5 - i * 0.05),
          i < 4 ? mat(0x3fa842, { roughness: 0.5 }) : glow(C.red, 0.5));
        level.position.y = 1.06 + i * 0.15;
        g.add(level);
      }
      for (const a of [0.8, 2.4, 4.0, 5.6]) g.add(stool(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0x3f7a3a));
      return g;
    },

    news: () => {
      const g = new THREE.Group();
      const desk = rimTable(3.2, 1.4, { color: 0x2a1420, skirt: 0x1c0e18 });
      g.add(desk);
      // papers
      for (const [x, z, r] of [[-0.8, 0.1, 0.3], [0.2, -0.2, -0.2], [0.9, 0.2, 0.5]]) {
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.008, 0.3), mat(0xf4efe3, { roughness: 0.5 }));
        paper.position.set(x, 0.99, z);
        paper.rotation.y = r;
        g.add(paper);
      }
      // the marquee overhead: an endless wire
      const marqueeCv = document.createElement('canvas');
      marqueeCv.width = 2048; marqueeCv.height = 128;
      const mg = marqueeCv.getContext('2d');
      mg.fillStyle = '#120b0e'; mg.fillRect(0, 0, 2048, 128);
      mg.font = '600 74px monospace';
      mg.fillStyle = '#ff9f5c';
      mg.shadowColor = '#ff9f5c'; mg.shadowBlur = 18;
      mg.fillText('$WOOF UP 4% ON TREAT RUMORS  ···  FED HOLDS, MARKETS SHRUG  ···  $BONE SPLITS 2 FOR 1  ···  ', 0, 86);
      const marqueeTex = new THREE.CanvasTexture(marqueeCv);
      marqueeTex.colorSpace = THREE.SRGBColorSpace;
      marqueeTex.wrapS = THREE.RepeatWrapping;
      liveTex.push({ every: 0, acc: 0, fn: dt => { marqueeTex.offset.x += dt * 0.045; } });
      const marquee = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.34),
        new THREE.MeshStandardMaterial({ map: marqueeTex, emissive: 0xffffff, emissiveMap: marqueeTex, emissiveIntensity: 0.6, roughness: 0.5, side: THREE.DoubleSide }));
      marquee.position.y = 2.9;
      g.add(marquee);
      const marqueeBox = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.44, 0.12), mat(0x171226));
      marqueeBox.position.set(0, 2.9, -0.07);
      g.add(marqueeBox);
      g.add(stool(-0.9, 1.4, 0xb8632f), stool(0.9, 1.4, 0xb8632f));
      return g;
    },
  };

  const LAYOUT = {
    higherlower: { pos: [-8, -5], rot: 0.35, r: 2.9, accent: '#3fa842', plaque: 'Call the next candle and beat the odds.', led: [['WIN  +50G', '#7fe8ab'], ['STREAK  x3  +50G', '#f2c14b']] },
    news: { pos: [9.5, -6], rot: -0.5, r: 2.6, accent: '#f07f3c', plaque: 'Trade the headlines before they cool.', led: [['WIRE  LIVE', '#ff9f5c'], ['NEW EVERY 30S', '#7fe8ab']] },
    tickerdle: { pos: [-24, 2], rot: Math.PI / 2, r: 2.4, accent: '#3fa842', plaque: 'Guess the ticker in six tries.', led: [['DAILY PUZZLE', '#7fe8ab'], ['STREAKS KEPT', '#f2c14b']] },
    fanstocks: { pos: [-13.5, 8.5], rot: 2.2, r: 3, accent: '#8f77ef', plaque: 'Draft real tickers. Talk unreal trash.', led: [['SEASON  OPEN', '#7fe8ab'], ['8 MANAGER LEAGUES', '#b9a56f']] },
    runway: { pos: [2.5, 4.5], rot: -2.8, r: 2.3, accent: '#3fa842', plaque: 'Keep the startup alive one more round.', led: [['BURN RATE  RISING', '#ff8484'], ['SURVIVE  +100G', '#7fe8ab']] },
    cashroyale: { pos: [14, 4.5], rot: -1.9, r: 2.6, accent: '#2fbfa5', plaque: 'Draft a deck. Battle a friend.', led: [['3 MIN BATTLES', '#7fe8dc'], ['WINNER TAKES POT', '#f2c14b']] },
    surfers: { pos: [24.3, -9], rot: -Math.PI / 2, r: 2.7, accent: '#2fbfa5', plaque: 'Run the chart. Dodge the dips.', led: [['HIGH SCORE 8,412', '#7fe8dc'], ['90 SECOND RUNS', '#f2c14b']] },
    league: { pos: [0, 14.2], rot: Math.PI, r: 3.6, accent: '#f2bb1e', plaque: 'Your portfolio against the machine.', led: [['GARY  VS  CHATGPT', '#f2c14b'], ['ALL WEEK', '#7fe8ab']] },
  };

  const stations = [];
  games.forEach(game => {
    const spec = LAYOUT[game.id];
    if (!spec || !BUILD[game.id]) return;
    const group = BUILD[game.id]();
    group.position.set(spec.pos[0], 0, spec.pos[1]);
    group.rotation.y = spec.rot;
    scene.add(group);

    // neon sign, always readable from the room
    const len = Math.hypot(spec.pos[0], spec.pos[1]) || 1;
    const bx = spec.pos[0] + (spec.pos[0] / len) * 1.7;
    const bz = spec.pos[1] + (spec.pos[1] / len) * 1.7;
    const signMap = signTexture(game.name, spec.accent);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75),
      new THREE.MeshStandardMaterial({ map: signMap, emissive: 0xffffff, emissiveMap: signMap, emissiveIntensity: 1.05, side: THREE.DoubleSide, roughness: 0.6 }));
    sign.position.set(bx, 3.5, bz);
    sign.rotation.y = Math.atan2(-spec.pos[0], -spec.pos[1]);
    scene.add(sign);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.5, 8), mat(0x14101c));
    pole.position.set(bx, 1.75, bz);
    scene.add(pole);

    // the green plaque under the sign
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.36),
      new THREE.MeshStandardMaterial({ map: plaqueTexture(spec.plaque), emissive: 0xffffff, emissiveMap: plaqueTexture(spec.plaque), emissiveIntensity: 0.75, side: THREE.DoubleSide, roughness: 0.6 }));
    plaque.position.set(bx, 2.85, bz);
    plaque.rotation.y = sign.rotation.y;
    scene.add(plaque);

    // LED odds board floating at the table's shoulder
    const ledMap = ledTexture(spec.led);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75),
      new THREE.MeshStandardMaterial({ map: ledMap, emissive: 0xffffff, emissiveMap: ledMap, emissiveIntensity: 0.85, side: THREE.DoubleSide, roughness: 0.6 }));
    const ledA = sign.rotation.y + 0.6;
    led.position.set(spec.pos[0] + Math.sin(ledA) * 2.1, 1.9, spec.pos[1] + Math.cos(ledA) * 2.1);
    led.rotation.y = sign.rotation.y;
    scene.add(led);

    // table light
    const spot = new THREE.SpotLight(0xfff0d8, 520, 13, 0.8, 0.55, 1.5);
    spot.position.set(spec.pos[0], 5.4, spec.pos[1]);
    spot.target.position.set(spec.pos[0], 0.9, spec.pos[1]);
    scene.add(spot, spot.target);
    const accent = new THREE.PointLight(new THREE.Color(spec.accent), 95, 9, 1.8);
    accent.position.set(spec.pos[0], 3.6, spec.pos[1]);
    scene.add(accent);

    stations.push({ game, x: spec.pos[0], z: spec.pos[1], r: spec.r });
  });

  // greeter gary by the entrance
  const greeter = garySprite('confident', 1.9);
  greeter.position.set(3.6, 0.97, -12.5);
  gary.greeter = greeter;
  scene.add(greeter);

  // ───────────────────────────── patrons

  const blobColors = [0x8f5bd9, 0xf07f3c, 0x2fbfa5, 0xe0557f, 0xf2c14b, 0x5b8ff0, 0x8fe86f];
  const statics = [[-6.3, -7.6, 0.5], [-11.5, 10.5, 2.4], [15.5, 3, -1.9], [23, -6.6, -1.6], [-22.4, 1.4, 1.57], [1.2, 6.2, -2.6]];
  statics.forEach(([x, z, ry], i) => {
    const b = blob(blobColors[i % blobColors.length]);
    b.position.set(x, 0, z);
    b.rotation.y = ry + Math.PI;
    npcs.push({ group: b, phase: i * 1.3 });
    scene.add(b);
  });
  const WAYPOINTS = [[-4, -9], [6, -8], [10, 0], [5, 9], [-4, 10], [-9, 1]];
  for (let i = 0; i < 3; i++) {
    const b = blob(blobColors[(i + 3) % blobColors.length]);
    const start = WAYPOINTS[(i * 2) % WAYPOINTS.length];
    b.position.set(start[0], 0, start[1]);
    npcs.push({ group: b, phase: i * 2.1, wp: (i * 2 + 1) % WAYPOINTS.length, speed: 1 + i * 0.15 });
    scene.add(b);
  }

  // the disco rig over the middle of the floor
  {
    const ball = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 2),
      new THREE.MeshStandardMaterial({ color: 0xd8dce8, metalness: 0.95, roughness: 0.12, flatShading: true }));
    ball.position.set(0, 5.9, 1);
    ball.name = 'discoball';
    spinners.push(ball);
    scene.add(ball);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), mat(0x14101c));
    chain.position.set(0, 6.9, 1);
    scene.add(chain);
    const rig = new THREE.Group();
    rig.position.set(0, 5.9, 1);
    const beamCols = [0xff5fa2, 0x2fbfa5, 0x8f77ef];
    beamCols.forEach((bc, i) => {
      const s = new THREE.SpotLight(bc, 900, 34, 0.42, 0.5, 1.4);
      const target = new THREE.Object3D();
      const a = (i / 3) * Math.PI * 2;
      target.position.set(Math.cos(a) * 9, -5.9, Math.sin(a) * 9);
      rig.add(s, target);
      s.target = target;
    });
    rig.name = 'discorig';
    scene.add(rig);
    liveTex.push({ every: 0, acc: 0, fn: dt => { rig.rotation.y += dt * 0.45; } });
  }

  // chase-light strings along every wall top, three phase groups
  {
    const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const phases = [
      new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffd98a, emissiveIntensity: 2 }),
      new THREE.MeshStandardMaterial({ color: 0xff8ac2, emissive: 0xff8ac2, emissiveIntensity: 2 }),
      new THREE.MeshStandardMaterial({ color: 0x8ad9ff, emissive: 0x8ad9ff, emissiveIntensity: 2 }),
    ];
    const spots = [];
    const step = 1.3;
    const edge = 0.42;
    for (let x = -ROOM_W / 2 + 1; x < ROOM_W / 2 - 0.5; x += step) {
      spots.push([x, ROOM_D / 2 - edge], [x, -ROOM_D / 2 + edge]);
    }
    for (let z = -ROOM_D / 2 + 1; z < ROOM_D / 2 - 0.5; z += step) {
      spots.push([ROOM_W / 2 - edge, z], [-ROOM_W / 2 + edge, z]);
    }
    spots.forEach(([x, z], i) => {
      const b = new THREE.Mesh(bulbGeo, phases[i % 3]);
      b.position.set(x, WALL_H - 0.35, z);
      scene.add(b);
    });
    liveTex.push({ every: 0, acc: 0, fn: dt => {
      const t2 = clock.elapsedTime * 5.5;
      phases.forEach((m, i) => { m.emissiveIntensity = 1 + Math.max(0, Math.sin(t2 + i * 2.09)) * 2.2; });
    } });
  }

  // ceiling fixtures
  for (const [x, z] of [[-14, -8], [0, -8], [14, -8], [-14, 6], [14, 6], [0, 2], [-7, 13], [7, 13]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 12, 1, true), mat(0x171226));
    cone.position.set(x, WALL_H - 0.35, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow(0xffdf9e, 2));
    bulb.position.set(x, WALL_H - 0.72, z);
    scene.add(cone, bulb);
  }

  // ───────────────────────────── your hands

  const hands = new THREE.Group();
  const mitt = side => {
    const m = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), new THREE.MeshBasicMaterial({ color: 0xf6c93f }));
    palm.scale.set(1, 0.82, 1.15);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf6c93f }));
    thumb.position.set(side * -0.07, 0.03, 0.05);
    m.add(palm, thumb);
    m.position.set(side * 0.34, -0.31, -0.52);
    m.rotation.x = 0.5;
    return m;
  };
  const leftMitt = mitt(-1), rightMitt = mitt(1);
  hands.add(leftMitt, rightMitt);
  camera.add(hands);

  // ───────────────────────────── the player

  const player = { x: 0, z: -15.5, yaw: Math.PI, pitch: 0, vx: 0, vz: 0 };
  const keys = new Set();
  let locked = false, frozen = false;

  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  canvas.addEventListener('click', () => { if (!frozen && !locked) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    onLock(locked);
  });
  document.addEventListener('mousemove', e => {
    if (!locked || frozen) return;
    player.yaw -= e.movementX * 0.0023;
    player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch - e.movementY * 0.0023));
  });

  let onLock = () => {}, onPrompt = () => {};

  function nearestStation() {
    let best = null, bestD = 1e9;
    for (const s of stations) {
      const d = Math.hypot(player.x - s.x, player.z - s.z);
      if (d < s.r + 2.3 && d < bestD) { bestD = d; best = s; }
    }
    if (!best) return null;
    const dx = best.x - player.x, dz = best.z - player.z;
    const fdx = -Math.sin(player.yaw), fdz = -Math.cos(player.yaw);
    const dot = (dx * fdx + dz * fdz) / (Math.hypot(dx, dz) || 1);
    return dot > 0.3 ? best : null;
  }

  const clock = new THREE.Clock();
  let promptFor = null, walkPhase = 0;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!frozen) {
      const sp = keys.has('ShiftLeft') ? 7.4 : 4.4;
      let ax = 0, az = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) { ax -= Math.sin(player.yaw); az -= Math.cos(player.yaw); }
      if (keys.has('KeyS') || keys.has('ArrowDown')) { ax += Math.sin(player.yaw); az += Math.cos(player.yaw); }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) { ax -= Math.cos(player.yaw); az += Math.sin(player.yaw); }
      if (keys.has('KeyD') || keys.has('ArrowRight')) { ax += Math.cos(player.yaw); az -= Math.sin(player.yaw); }
      const al = Math.hypot(ax, az);
      if (al > 0) { ax /= al; az /= al; }
      player.vx += (ax * sp - player.vx) * Math.min(1, dt * 10);
      player.vz += (az * sp - player.vz) * Math.min(1, dt * 10);
      player.x += player.vx * dt;
      player.z += player.vz * dt;
      player.x = Math.max(-ROOM_W / 2 + 1, Math.min(ROOM_W / 2 - 1, player.x));
      player.z = Math.max(-ROOM_D / 2 + 1, Math.min(ROOM_D / 2 - 1, player.z));
      for (const s of stations) {
        const dx = player.x - s.x, dz = player.z - s.z;
        const d = Math.hypot(dx, dz);
        if (d < s.r && d > 0.001) {
          player.x = s.x + (dx / d) * s.r;
          player.z = s.z + (dz / d) * s.r;
        }
      }
      const near = nearestStation();
      if ((near && near.game) !== (promptFor && promptFor.game)) {
        promptFor = near;
        onPrompt(near ? near.game : null);
      }
      walkPhase += Math.hypot(player.vx, player.vz) * dt * 2.2;
    }

    camera.position.set(player.x, 1.6 + Math.sin(walkPhase * 2) * 0.022 * Math.min(1, Math.hypot(player.vx, player.vz) / 4), player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // hands swing with the walk
    const speedK = Math.min(1, Math.hypot(player.vx, player.vz) / 4);
    leftMitt.position.y = -0.32 + Math.sin(walkPhase) * 0.03 * speedK;
    rightMitt.position.y = -0.32 + Math.sin(walkPhase + Math.PI) * 0.03 * speedK;
    leftMitt.position.x = -0.3 + Math.cos(walkPhase) * 0.012 * speedK;
    rightMitt.position.x = 0.3 - Math.cos(walkPhase) * 0.012 * speedK;

    // npcs live a little
    for (const n of npcs) {
      n.group.position.y = Math.sin(t * 2.1 + n.phase) * 0.045;
      if (n.wp !== undefined) {
        const target = WAYPOINTS[n.wp];
        const dx = target[0] - n.group.position.x, dz = target[1] - n.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) n.wp = (n.wp + 1) % WAYPOINTS.length;
        else {
          n.group.position.x += (dx / d) * n.speed * dt;
          n.group.position.z += (dz / d) * n.speed * dt;
          n.group.rotation.y = Math.atan2(dx, dz);
        }
      }
    }

    // gary breathes; sprites face you
    for (const key of Object.keys(gary)) {
      const s = gary[key];
      s.rotation.y = Math.atan2(player.x - s.getWorldPosition(new THREE.Vector3()).x, player.z - s.getWorldPosition(new THREE.Vector3()).z);
      s.position.y += Math.sin(t * 2.4 + 1) * 0.0006;
    }
    for (const s of spinners) { if (s.name === 'discoball') s.rotation.y = t * 0.6; else s.rotation.z = t * 0.5; }

    // live screens
    for (const lt of liveTex) {
      if (lt.every === 0) { lt.fn(dt); continue; }
      lt.acc += dt;
      if (lt.acc >= lt.every) { lt.acc = 0; lt.fn(); }
    }

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== (w * renderer.getPixelRatio() | 0)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  const ready = document.fonts ? Promise.all([
    document.fonts.load('600 80px Oswald'), document.fonts.load('44px Nunito'),
  ]).catch(() => {}) : Promise.resolve();
  ready.then(() => requestAnimationFrame(frame));

  return {
    paintBoard,
    player,
    stations: stations.map(s => ({ id: s.game.id, name: s.game.name, x: s.x, z: s.z })),
    get currentPrompt() { return promptFor ? promptFor.game : null; },
    onPromptChange(fn) { onPrompt = fn; },
    onLockChange(fn) { onLock = fn; },
    freeze(v) {
      frozen = v;
      if (v && document.pointerLockElement) document.exitPointerLock();
    },
  };
}

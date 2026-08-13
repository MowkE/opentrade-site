// world.js
// The floor, in three dimensions: a dark room with ten glowing tables,
// signage in Bungee, and a first-person walk between them. Everything
// here is built from primitives on purpose; the reference game's charm
// is chunky geometry under theatrical light, not model detail. Tables
// are stations; walk close, face one, and the HUD offers a seat.

import * as THREE from 'three';

const ROOM_W = 46, ROOM_D = 32, WALL_H = 6.5;

const C = {
  carpet: 0x171021,
  carpetGlow: 0x3a1c3f,
  wall: 0x241a2e,
  wainscot: 0x140d1c,
  wood: 0x2a1c14,
  woodLight: 0x3d2a1c,
  felt: 0x0e5c43,
  feltDeep: 0x0a4634,
  neon: 0xff4fa3,
  gold: 0xf5c64f,
  purple: 0x8f5bff,
  white: 0xf4f1f7,
  screen: 0x1b0f24,
};

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
const glow = (color, intensity = 1.6) => new THREE.MeshStandardMaterial({
  color, emissive: color, emissiveIntensity: intensity, roughness: 0.6,
});

// ---------------------------------------------------- canvas textures

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function carpetTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#171021';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,79,163,0.16)';
    g.lineWidth = 3;
    for (const [cx, cy] of [[64, 64], [192, 192]]) {
      g.beginPath();
      g.moveTo(cx, cy - 40); g.lineTo(cx + 40, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 40, cy);
      g.closePath(); g.stroke();
    }
    g.fillStyle = 'rgba(143,91,255,0.10)';
    for (const [cx, cy] of [[64, 192], [192, 64]]) {
      g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
    }
  });
}

function signTexture(text) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#12091a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,79,163,0.4)';
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.font = `${text.length > 10 ? 88 : 110}px Bungee`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = '#ff4fa3';
    g.shadowBlur = 44;
    g.fillStyle = '#ffe9f4';
    g.fillText(text, w / 2, h / 2 + 8);
    g.shadowBlur = 14;
    g.fillText(text, w / 2, h / 2 + 8);
  });
}

function slotScreenTexture(sym = '7 7 7', hot = false) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#120a1c';
    g.fillRect(0, 0, w, h);
    g.font = '64px Bungee';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowBlur = 26;
    g.shadowColor = hot ? '#f5c64f' : '#ff4fa3';
    g.fillStyle = hot ? '#f5c64f' : '#ff8cc4';
    g.fillText(sym, w / 2, h / 2);
  });
}

function kenoBoardTexture() {
  return canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#120a1c';
    g.fillRect(0, 0, w, h);
    g.font = '30px Bungee';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < 80; i++) {
      const col = i % 8, row = (i / 8) | 0;
      const x = 36 + col * 63, y = 46 + row * 60;
      const lit = [3, 11, 17, 24, 38, 41, 56, 62, 70, 77].includes(i);
      g.shadowBlur = lit ? 18 : 0;
      g.shadowColor = '#f5c64f';
      g.fillStyle = lit ? '#f5c64f' : 'rgba(244,241,247,0.35)';
      g.fillText(String(i + 1), x, y);
    }
  });
}

function feltLinesTexture(kind) {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#0e5c43';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(244,241,247,0.5)';
    g.lineWidth = 3;
    if (kind === 'bj') {
      g.beginPath();
      g.arc(w / 2, -60, 300, 0.45, Math.PI - 0.45);
      g.stroke();
      for (let i = 0; i < 5; i++) {
        const a = 0.7 + i * 0.43;
        g.beginPath();
        g.arc(w / 2 + Math.cos(a) * 210 - 210 * Math.cos(Math.PI / 2), 40 + Math.sin(a) * 180, 26, 0, 7);
        g.stroke();
      }
    } else if (kind === 'craps') {
      g.strokeRect(30, 30, w - 60, h - 60);
      g.strokeRect(52, 52, w - 104, 60);
      g.font = '30px Bungee';
      g.fillStyle = 'rgba(244,241,247,0.5)';
      g.textAlign = 'center';
      g.fillText('PASS LINE', w / 2, h - 52);
    } else if (kind === 'roulette') {
      for (let i = 0; i < 12; i++) g.strokeRect(30 + i * 37, 60, 37, 130);
    } else {
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 40, h / 2 - 40, 0, 0, 7);
      g.stroke();
    }
  });
}

// ------------------------------------------------------- table pieces

function legs(group, positions, height = 0.86) {
  for (const [x, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height, 10), mat(C.wainscot));
    leg.position.set(x, height / 2, z);
    group.add(leg);
  }
}

function stool(x, z) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 14), mat(0x8c2f4a, { roughness: 0.6 }));
  seat.position.y = 0.62;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), mat(0x181018));
  post.position.y = 0.31;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 10), mat(0x181018));
  base.position.y = 0.03;
  g.add(seat, post, base);
  g.position.set(x, 0, z);
  return g;
}

function cardsOnFelt(group, y, spots) {
  const geom = new THREE.BoxGeometry(0.16, 0.006, 0.23);
  for (const [x, z, rot] of spots) {
    const card = new THREE.Mesh(geom, mat(C.white, { roughness: 0.4 }));
    card.position.set(x, y, z);
    card.rotation.y = rot;
    group.add(card);
  }
}

function chipStacks(group, y, spots) {
  const colors = [0xc8404f, 0x1f8a5c, 0x7c3aed, 0xf5c64f];
  spots.forEach(([x, z], i) => {
    const n = 2 + (i % 3);
    for (let k = 0; k < n; k++) {
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.014, 16), mat(colors[(i + k) % 4], { roughness: 0.5 }));
      chip.position.set(x, y + 0.007 + k * 0.015, z);
      group.add(chip);
    }
  });
}

function halfMoonTable(feltKind) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.09, 34, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ map: feltLinesTexture(feltKind), roughness: 0.9 }));
  top.position.y = 0.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.09, 10, 30, Math.PI), mat(C.wood, { roughness: 0.55 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.94;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.2, 0.78, 34, 1, true, 0, Math.PI), mat(C.wainscot));
  skirt.position.y = 0.5;
  g.add(top, rim, skirt);
  legs(g, [[-1, 0.3], [1, 0.3], [0, 1]]);
  cardsOnFelt(g, 0.95, [[-0.5, 0.55, 0.3], [-0.3, 0.6, 0.5], [0.35, 0.6, -0.2], [0.1, 0.3, 0.1]]);
  chipStacks(g, 0.945, [[-0.75, 0.35], [0.6, 0.4]]);
  return g;
}

function ovalTable(w = 2.6, d = 1.5) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.09, 36),
    new THREE.MeshStandardMaterial({ map: feltLinesTexture('oval'), roughness: 0.9 }));
  top.scale.set(w / 2, 1, d / 2);
  top.position.y = 0.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 10, 40), mat(C.wood, { roughness: 0.55 }));
  rim.scale.set(w / 2, d / 2, 1);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.94;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.8, 0.78, 36, 1, true), mat(C.wainscot));
  skirt.scale.set(w / 2, 1, d / 2);
  skirt.position.y = 0.5;
  g.add(top, rim, skirt);
  legs(g, [[-w / 3, 0], [w / 3, 0]]);
  cardsOnFelt(g, 0.95, [[-0.4, -0.15, 0.2], [-0.15, -0.2, -0.4], [0.2, -0.1, 0.15], [0.45, -0.2, -0.1], [0, 0.25, 0.05]]);
  chipStacks(g, 0.945, [[-0.7, 0.25], [0.05, 0.3], [0.75, 0.2]]);
  return g;
}

function rectTable(w, d, feltKind, rails = false) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, d),
    new THREE.MeshStandardMaterial({ map: feltLinesTexture(feltKind), roughness: 0.9 }));
  top.position.y = 0.9;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, 0.75, d - 0.15), mat(C.wainscot));
  skirt.position.y = 0.5;
  g.add(top, skirt);
  const railH = rails ? 0.34 : 0.12;
  const railGeoW = new THREE.BoxGeometry(w + 0.18, railH, 0.16);
  const railGeoD = new THREE.BoxGeometry(0.16, railH, d + 0.18);
  for (const [gz, geo, x, z] of [
    ['n', railGeoW, 0, -d / 2 - 0.06], ['s', railGeoW, 0, d / 2 + 0.06],
    ['w', railGeoD, -w / 2 - 0.06, 0], ['e', railGeoD, w / 2 + 0.06, 0],
  ]) {
    const rail = new THREE.Mesh(geo, mat(C.wood, { roughness: 0.5 }));
    rail.position.set(x, 0.9 + railH / 2, z);
    g.add(rail);
  }
  legs(g, [[-w / 2 + 0.25, -d / 2 + 0.25], [w / 2 - 0.25, -d / 2 + 0.25], [-w / 2 + 0.25, d / 2 - 0.25], [w / 2 - 0.25, d / 2 - 0.25]]);
  return g;
}

function rouletteTable() {
  const g = rectTable(3.1, 1.6, 'roulette');
  const wheelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.16, 28), mat(C.wood, { roughness: 0.5 }));
  wheelBase.position.set(-1.1, 1.02, 0);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 37),
    new THREE.MeshStandardMaterial({
      map: canvasTex(256, 256, (gg, w, h) => {
        for (let i = 0; i < 37; i++) {
          gg.fillStyle = i === 0 ? '#1f8a5c' : i % 2 ? '#c8404f' : '#221a2e';
          gg.beginPath();
          gg.moveTo(w / 2, h / 2);
          gg.arc(w / 2, h / 2, w / 2, (i / 37) * 7, ((i + 1) / 37) * 7);
          gg.fill();
        }
        gg.fillStyle = '#f5c64f';
        gg.beginPath(); gg.arc(w / 2, h / 2, 26, 0, 7); gg.fill();
      }), roughness: 0.55,
    }));
  wheel.position.set(-1.1, 1.12, 0);
  wheel.name = 'spinner';
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(C.gold, { metalness: 0.7, roughness: 0.3 }));
  knob.position.set(-1.1, 1.24, 0);
  chipStacks(g, 0.945, [[0.4, 0.3], [0.9, -0.25], [1.3, 0.2]]);
  g.add(wheelBase, wheel, knob);
  return g;
}

function slotBank(count = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.7, 0.6), mat(0x1d1226, { roughness: 0.5, metalness: 0.2 }));
    body.position.y = 0.85;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.36),
      new THREE.MeshStandardMaterial({ map: slotScreenTexture(), emissive: 0xff4fa3, emissiveIntensity: 0.35, emissiveMap: slotScreenTexture(), roughness: 0.4 }));
    screen.position.set(0, 1.22, 0.302);
    screen.name = 'slotscreen';
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.6), glow(C.gold, 0.9));
    crown.position.y = 1.77;
    const lever = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), mat(0x8e93a8, { metalness: 0.8, roughness: 0.3 }));
    rod.position.y = 0.2;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), mat(0xc8404f, { roughness: 0.4 }));
    ball.position.y = 0.42;
    lever.add(rod, ball);
    lever.position.set(0.42, 1.05, 0);
    lever.rotation.z = -0.25;
    m.add(body, screen, crown, lever);
    m.position.x = (i - (count - 1) / 2) * 0.95;
    g.add(m);
  }
  return g;
}

function kenoBoard() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 0.12),
    new THREE.MeshStandardMaterial({ map: kenoBoardTexture(), emissive: 0xffffff, emissiveMap: kenoBoardTexture(), emissiveIntensity: 0.5, roughness: 0.6 }));
  board.position.y = 1.9;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 2.26, 0.08), mat(C.wood));
  frame.position.set(0, 1.9, -0.04);
  const desk = rectTable(1.7, 0.8, 'oval');
  desk.position.z = 0.75;
  g.add(board, frame, desk);
  return g;
}

function sicboTable() {
  const g = rectTable(1.9, 1.9, 'oval');
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14, 0, 7, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xcfd8e8, transparent: true, opacity: 0.3, roughness: 0.1 }));
  dome.position.y = 0.95;
  for (let i = 0; i < 3; i++) {
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), mat(C.white, { roughness: 0.35 }));
    die.position.set(-0.1 + i * 0.11, 1, (i % 2) * 0.1 - 0.05);
    die.rotation.y = i * 0.6;
    g.add(die);
  }
  g.add(dome);
  return g;
}

function machine() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.35, 0.66), mat(0x1d1226, { roughness: 0.5, metalness: 0.2 }));
  body.position.y = 0.67;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42),
    new THREE.MeshStandardMaterial({ map: slotScreenTexture('J Q K', true), emissive: 0xf5c64f, emissiveMap: slotScreenTexture('J Q K', true), emissiveIntensity: 0.4, roughness: 0.4 }));
  screen.position.set(0, 1.05, 0.34);
  screen.rotation.x = -0.35;
  const stool1 = stool(0, 0.75);
  g.add(body, screen, stool1);
  return g;
}

// ------------------------------------------------------------- world

export function buildWorld(canvas, games) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0710);
  scene.fog = new THREE.Fog(0x0a0710, 16, 44);

  const camera = new THREE.PerspectiveCamera(72, 2, 0.1, 120);
  camera.position.set(0, 1.6, 11.5);

  // room shell
  const carpetT = carpetTexture();
  carpetT.wrapS = carpetT.wrapT = THREE.RepeatWrapping;
  carpetT.repeat.set(ROOM_W / 4, ROOM_D / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: carpetT, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = mat(C.wall, { roughness: 0.9 });
  const wainMat = mat(C.wainscot);
  const mkWall = (w, x, z, ry) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallMat);
    wall.position.set(x, WALL_H / 2, z);
    wall.rotation.y = ry;
    scene.add(wall);
    const wain = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.12), wainMat);
    wain.position.set(x, 0.55, z);
    wain.rotation.y = ry;
    scene.add(wain);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.07), glow(C.neon, 2.2));
    strip.position.set(x, WALL_H - 0.9, z);
    strip.rotation.y = ry;
    scene.add(strip);
  };
  mkWall(ROOM_W, 0, -ROOM_D / 2, 0);
  mkWall(ROOM_W, 0, ROOM_D / 2, Math.PI);
  mkWall(ROOM_D, -ROOM_W / 2, 0, Math.PI / 2);
  mkWall(ROOM_D, ROOM_W / 2, 0, -Math.PI / 2);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat(0x0b0812, { roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  scene.add(ceiling);

  // light
  scene.add(new THREE.AmbientLight(0x322845, 2.1));
  const hemi = new THREE.HemisphereLight(0x3a2a50, 0x120a18, 0.5);
  scene.add(hemi);

  const spinners = [], screens = [];

  // stations: where the games live on the floor
  const BUILD = {
    blackjack: () => halfMoonTable('bj'),
    baccarat: () => ovalTable(2.7, 1.6),
    poker: () => ovalTable(3.1, 1.8),
    war: () => halfMoonTable('oval'),
    roulette: () => rouletteTable(),
    craps: () => rectTable(3.4, 1.9, 'craps', true),
    sicbo: () => sicboTable(),
    slots: () => slotBank(3),
    videopoker: () => machine(),
    keno: () => kenoBoard(),
  };
  const LAYOUT = {
    blackjack: { pos: [-9, -5], rot: 0.5, r: 2.3 },
    baccarat: { pos: [-13.5, 1.5], rot: 1.1, r: 2.3 },
    poker: { pos: [-10.5, 8], rot: 2.2, r: 2.5 },
    war: { pos: [-4.5, 11.5], rot: 2.9, r: 2.2 },
    roulette: { pos: [9, -5], rot: -0.5, r: 2.6 },
    craps: { pos: [13.5, 1.5], rot: -1.1, r: 2.8 },
    sicbo: { pos: [10.5, 8], rot: -2.2, r: 2.1 },
    slots: { pos: [0, 14], rot: Math.PI, r: 2.4 },
    videopoker: { pos: [6, 13.5], rot: Math.PI, r: 1.7 },
    keno: { pos: [-6, 13.5], rot: Math.PI, r: 1.9 },
  };

  const stations = [];
  const lightColors = [C.neon, C.gold, C.purple];
  games.forEach((game, i) => {
    const spec = LAYOUT[game.id];
    if (!spec || !BUILD[game.id]) return;
    const group = BUILD[game.id]();
    group.position.set(spec.pos[0], 0, spec.pos[1]);
    group.rotation.y = spec.rot;
    scene.add(group);

    group.traverse(o => {
      if (o.name === 'spinner') spinners.push(o);
      if (o.name === 'slotscreen') screens.push(o);
    });

    // the sign above, always facing the middle of the room
    const signMap = signTexture(game.name);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshStandardMaterial({
        map: signMap, emissive: 0xffffff,
        emissiveMap: signMap, emissiveIntensity: 0.85,
        side: THREE.DoubleSide, roughness: 0.6,
      }));
    sign.position.set(spec.pos[0], 3.1, spec.pos[1]);
    sign.rotation.y = Math.atan2(-spec.pos[0], -spec.pos[1]);
    scene.add(sign);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 8), mat(0x181018));
    pole.position.set(spec.pos[0], 1.55, spec.pos[1]);
    scene.add(pole);

    // warm table wash so the felt reads as felt, neon as the accent
    const spot = new THREE.SpotLight(0xfff0d8, 90, 9.5, 0.72, 0.55, 1.4);
    spot.position.set(spec.pos[0], 4.8, spec.pos[1]);
    spot.target.position.set(spec.pos[0], 0.9, spec.pos[1]);
    scene.add(spot, spot.target);

    const light = new THREE.PointLight(lightColors[i % 3], 34, 11, 1.9);
    light.position.set(spec.pos[0], 3.4, spec.pos[1]);
    scene.add(light);

    // stools for card tables
    if (['blackjack', 'baccarat', 'poker', 'war'].includes(game.id)) {
      for (const a of [-0.6, 0, 0.6]) {
        const s = stool(
          spec.pos[0] + Math.sin(spec.rot + a) * 2,
          spec.pos[1] + Math.cos(spec.rot + a) * 2);
        scene.add(s);
      }
    }

    stations.push({ game, x: spec.pos[0], z: spec.pos[1], r: spec.r });
  });

  // the entrance glow and the standings board
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.4), glow(0x1c1226, 0.6));
  doorGlow.position.set(0, 1.7, -ROOM_D / 2 + 0.05);
  scene.add(doorGlow);

  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6),
    new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.6 }));
  board.position.set(0, 3.4, ROOM_D / 2 - 0.06);
  board.rotation.y = Math.PI;
  scene.add(board);

  function paintBoard(players, activeId) {
    const tex = canvasTex(1024, 512, (g, w, h) => {
      g.fillStyle = '#100a18';
      g.fillRect(0, 0, w, h);
      g.font = '54px Bungee';
      g.textAlign = 'center';
      g.shadowColor = '#ff4fa3'; g.shadowBlur = 30;
      g.fillStyle = '#ffe9f4';
      g.fillText("TONIGHT'S STANDINGS", w / 2, 84);
      g.shadowBlur = 0;
      g.font = '40px -apple-system, BlinkMacSystemFont, sans-serif';
      players.slice(0, 5).forEach((p, i) => {
        const y = 176 + i * 66;
        g.textAlign = 'left';
        g.fillStyle = p.id === activeId ? '#ff4fa3' : 'rgba(244,241,247,0.85)';
        g.fillText(`${i + 1}. ${p.name}`, 90, y);
        g.textAlign = 'right';
        g.fillStyle = '#f5c64f';
        g.fillText(p.chips.toLocaleString(), w - 90, y);
      });
    });
    board.material.map = tex;
    board.material.emissiveMap = tex;
    board.material.needsUpdate = true;
  }

  // ceiling fixtures, cosmetic
  for (const [x, z] of [[-8, -4], [8, -4], [-8, 8], [8, 8], [0, 2], [0, -10]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 12, 1, true), mat(0x181018));
    cone.position.set(x, WALL_H - 0.35, z);
    scene.add(cone);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glow(0xffdf9e, 2));
    bulb.position.set(x, WALL_H - 0.72, z);
    scene.add(bulb);
  }

  // ------------------------------------------------------- the player

  const player = { x: 0, z: -12.5, yaw: Math.PI, pitch: 0, vx: 0, vz: 0 };
  const keys = new Set();
  let locked = false, frozen = false;

  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));

  canvas.addEventListener('click', () => {
    if (!frozen && !locked) canvas.requestPointerLock();
  });
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
      if (d < s.r + 1.15 && d < bestD) { bestD = d; best = s; }
    }
    if (!best) return null;
    const dx = best.x - player.x, dz = best.z - player.z;
    const fdx = -Math.sin(player.yaw), fdz = -Math.cos(player.yaw);
    const dot = (dx * fdx + dz * fdz) / (Math.hypot(dx, dz) || 1);
    return dot > 0.35 ? best : null;
  }

  const clock = new THREE.Clock();
  let promptFor = null;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);

    if (!frozen) {
      const sp = keys.has('ShiftLeft') ? 7 : 4.2;
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

      // stay in the room, slide around tables
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
    }

    camera.position.set(player.x, 1.6, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    const t = clock.elapsedTime;
    for (const s of spinners) s.rotation.y = t * 0.8;
    screens.forEach((s, i) => {
      s.material.emissiveIntensity = 0.3 + 0.15 * Math.sin(t * 3 + i * 2.1);
    });

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * renderer.getPixelRatio() | 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  const fontReady = document.fonts ? document.fonts.load('80px Bungee') : Promise.resolve();
  fontReady.then(() => {
    // repaint signage now that Bungee is real
    scene.traverse(() => {});
  });

  requestAnimationFrame(frame);

  return {
    paintBoard,
    player,   // exposed for tests and future save-position
    get currentPrompt() { return promptFor ? promptFor.game : null; },
    onPromptChange(fn) { onPrompt = fn; },
    onLockChange(fn) { onLock = fn; },
    freeze(v) {
      frozen = v;
      if (v && document.pointerLockElement) document.exitPointerLock();
    },
  };
}

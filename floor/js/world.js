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
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/postprocessing/OutputPass.js';

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
    g.fillStyle = '#101527';
    g.fillRect(0, 0, w, h);
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    // peacock eyes: concentric rings with a hot pupil
    for (let i = 0; i < 8; i++) {
      const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 34;
      g.strokeStyle = ['#b23b2e', '#d8862f', '#2fbfa5', '#8f77ef'][i % 4];
      g.lineWidth = 10;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
      g.strokeStyle = '#c9a54b';
      g.lineWidth = 4;
      g.beginPath(); g.arc(x, y, r * 0.62, 0, 7); g.stroke();
      g.fillStyle = ['#d8862f', '#b23b2e', '#f07f3c'][i % 3];
      g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
      // dot halo
      g.fillStyle = '#c9a54b';
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        g.beginPath(); g.arc(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12), 3.2, 0, 7); g.fill();
      }
    }
    // paisley teardrops
    for (let i = 0; i < 12; i++) {
      const x = rnd() * w, y = rnd() * h, s = 16 + rnd() * 18, a = rnd() * Math.PI * 2;
      g.save();
      g.translate(x, y); g.rotate(a);
      g.fillStyle = ['#8f3a2a', '#2a6b5d', '#5a4a8f', '#a8622a'][i % 4];
      g.beginPath();
      g.moveTo(0, -s);
      g.bezierCurveTo(s, -s * 0.3, s * 0.7, s, 0, s);
      g.bezierCurveTo(-s * 0.7, s, -s, -s * 0.3, 0, -s);
      g.fill();
      g.strokeStyle = '#c9a54b'; g.lineWidth = 2.5; g.stroke();
      g.restore();
    }
    // vine swooshes
    g.lineWidth = 7;
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = ['#2fbfa5', '#8f77ef', '#d8862f', '#b23b2e'][i % 4];
      g.beginPath();
      const x = rnd() * w, y = rnd() * h;
      g.arc(x, y, 46 + rnd() * 60, rnd() * 6, rnd() * 6 + 1.8);
      g.stroke();
    }
    // small diamonds and seeds
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h, s = 6 + rnd() * 10;
      g.fillStyle = ['#c9a54b', '#b23b2e', '#2fbfa5', '#8f77ef', '#d8862f'][i % 5];
      g.beginPath();
      g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y);
      g.closePath(); g.fill();
    }
  }, { repeat: [4.5, 3] });
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
function tableBulbs(g, w, d, railY, rr) {
  const bulbM = glow(0xffe3a0, 2.3);
  const bulbG = new THREE.SphereGeometry(0.032, 6, 5);
  const P = 2 * (w + d);
  const per = Math.round(P / 0.36);
  for (let i = 0; i < per; i++) {
    const dist = (i / per) * P;
    let px, pz;
    if (dist < w) { px = -w / 2 + dist; pz = -d / 2; }
    else if (dist < w + d) { px = w / 2; pz = -d / 2 + (dist - w); }
    else if (dist < 2 * w + d) { px = w / 2 - (dist - w - d); pz = d / 2; }
    else { px = -w / 2; pz = d / 2 - (dist - 2 * w - d); }
    const b = new THREE.Mesh(bulbG, bulbM);
    b.position.set(px, railY + rr + 0.012, pz);
    g.add(b);
  }
}

function rimTable(w, d, opts = {}) {
  const g = new THREE.Group();
  const topMat = opts.map
    ? new THREE.MeshBasicMaterial({ map: opts.map })
    : mat(opts.color ?? C.dark, { roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), topMat);
  top.position.y = 0.92;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.62, d - 0.1), mat(opts.skirt ?? 0x3a1f2b, { roughness: 0.6 }));
  skirt.position.y = 0.55;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.05, d - 0.04), mat(0xc9a54b, { metalness: 0.7, roughness: 0.3 }));
  belt.position.y = 0.87;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.26, d * 0.74), mat(0x120d18, { roughness: 0.4 }));
  plinth.position.y = 0.13;
  g.add(top, skirt, belt, plinth);
  // padded bumper: capsules along the edges, spheres at the corners
  const railMat = mat(opts.rail ?? 0x7a2b42, { roughness: 0.5 });
  const railY = 1.0, rr = 0.085;
  for (const [len, x, z, axis] of [
    [w - 0.06, 0, -d / 2, 'x'], [w - 0.06, 0, d / 2, 'x'],
    [d - 0.06, -w / 2, 0, 'z'], [d - 0.06, w / 2, 0, 'z'],
  ]) {
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(rr, len, 6, 12), railMat);
    if (axis === 'x') c.rotation.z = Math.PI / 2; else c.rotation.x = Math.PI / 2;
    c.position.set(x, railY, z);
    g.add(c);
  }
  for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rr, 10, 8), railMat);
    s.position.set(cx, railY, cz);
    g.add(s);
  }
  tableBulbs(g, w, d, railY, rr);
  return g;
}

function roundRimTable(radius, opts = {}) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.1, 40),
    opts.map ? new THREE.MeshStandardMaterial({ map: opts.map, roughness: 0.75 }) : mat(opts.color ?? C.felt, { roughness: 0.85 }));
  top.position.y = 0.92;
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 12, 48), mat(opts.rail ?? 0x7a2b42, { roughness: 0.5 }));
  bumper.rotation.x = -Math.PI / 2;
  bumper.position.y = 1.0;
  const ped = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.02, 0), new THREE.Vector2(radius * 0.56, 0),
    new THREE.Vector2(radius * 0.5, 0.09), new THREE.Vector2(0.17, 0.22),
    new THREE.Vector2(0.14, 0.56), new THREE.Vector2(0.21, 0.75),
    new THREE.Vector2(radius * 0.62, 0.84), new THREE.Vector2(radius * 0.65, 0.9),
  ], 24), mat(0x2a1a2e, { roughness: 0.5 }));
  g.add(top, bumper, ped);
  const bulbM = glow(0xffe3a0, 2.3);
  const bulbG = new THREE.SphereGeometry(0.032, 6, 5);
  const n = Math.round(radius * Math.PI * 2 / 0.36);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = new THREE.Mesh(bulbG, bulbM);
    b.position.set(Math.cos(a) * radius, 1.1, Math.sin(a) * radius);
    g.add(b);
  }
  return g;
}

function stool(x, z, color = 0x8c2f4a) {
  const g = new THREE.Group();
  const chrome = mat(0xb9bdc9, { metalness: 0.85, roughness: 0.25 });
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.06, 16), chrome);
  foot.position.y = 0.03;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.52, 10), chrome);
  post.position.y = 0.3;
  const rest = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 20), chrome);
  rest.rotation.x = Math.PI / 2;
  rest.position.y = 0.22;
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.13, 20), mat(color, { roughness: 0.55 }));
  cushion.position.y = 0.62;
  const piping = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.038, 10, 24), mat(color, { roughness: 0.5 }));
  piping.rotation.x = Math.PI / 2;
  piping.position.y = 0.675;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), mat(0xc9a54b, { metalness: 0.6, roughness: 0.3 }));
  button.position.y = 0.695;
  g.add(foot, post, rest, cushion, piping, button);
  g.position.set(x, 0, z);
  return g;
}

let leafTex = null;
function plant(scale = 1) {
  if (!leafTex) leafTex = cvTex(128, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#1e5c33');
    grad.addColorStop(0.6, '#2f8a4a');
    grad.addColorStop(1, '#63c276');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w / 2, h);
    g.bezierCurveTo(w * 0.04, h * 0.72, w * 0.08, h * 0.24, w / 2, 4);
    g.bezierCurveTo(w * 0.92, h * 0.24, w * 0.96, h * 0.72, w / 2, h);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) {
      const y = 26 + i * 30;
      g.beginPath(); g.arc(4, y, 9, 0, 7); g.fill();
      g.beginPath(); g.arc(w - 4, y + 15, 9, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#1a4e2c';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, h - 4); g.lineTo(w / 2, 10); g.stroke();
  });
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.02, 0), new THREE.Vector2(0.16, 0),
    new THREE.Vector2(0.2, 0.05), new THREE.Vector2(0.24, 0.28),
    new THREE.Vector2(0.28, 0.42), new THREE.Vector2(0.3, 0.46),
    new THREE.Vector2(0.26, 0.49),
  ], 20), mat(0x2b6f75, { roughness: 0.25, metalness: 0.1 }));
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 14), mat(0x241a12));
  soil.position.y = 0.46;
  g.add(pot, soil);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.15), leafMat);
    leaf.geometry.translate(0, 0.57, 0);
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.35;
    leaf.position.set(Math.cos(a) * 0.05, 0.44, Math.sin(a) * 0.05);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -(0.34 + (i % 3) * 0.24);
    leaf.scale.setScalar(0.78 + (i % 4) * 0.14);
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
function blob(color, hat) {
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
  if (hat === 'fez') {
    const fz = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 14), mat(0xb02c35, { roughness: 0.6 }));
    fz.position.set(0, 1.36, 0.02);
    fz.rotation.z = 0.1;
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xf2c14b));
    tassel.position.set(0.12, 1.42, 0.02);
    g.add(fz, tassel);
  } else if (hat === 'top') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 18), mat(0x17141c, { roughness: 0.4 }));
    brim.position.y = 1.27;
    const crownC = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.3, 16), mat(0x17141c, { roughness: 0.4 }));
    crownC.position.y = 1.43;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 16), mat(0xb02c35));
    band.position.y = 1.31;
    g.add(brim, crownC, band);
  } else if (hat === 'bowler') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3a2c1c, { roughness: 0.5 }));
    dome.position.y = 1.26;
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), mat(0x3a2c1c, { roughness: 0.5 }));
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 1.27;
    g.add(dome, brim);
  } else if (hat === 'crown') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 12), mat(0xf2c14b, { metalness: 0.75, roughness: 0.25 }));
    ring.position.y = 1.32;
    g.add(ring);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 6), mat(0xf2c14b, { metalness: 0.75, roughness: 0.25 }));
      spike.position.set(Math.cos(a) * 0.14, 1.43, Math.sin(a) * 0.14);
      g.add(spike);
    }
  }
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

  // bloom: the neon finally glows
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.38, 0.4, 1.8);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

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
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), glow(C.violet, 1.2));
    strip.position.set(x, WALL_H - 0.7, z);
    strip.rotation.y = ry;
    scene.add(strip);
  };
  mkWall(ROOM_W, 0, -ROOM_D / 2, 0);
  mkWall(ROOM_W, 0, ROOM_D / 2, Math.PI);
  mkWall(ROOM_D, -ROOM_W / 2, 0, Math.PI / 2);
  mkWall(ROOM_D, ROOM_W / 2, 0, -Math.PI / 2);
  // the glowing dome: deep blue radiance, like the reference casino sky
  const ceilTex = cvTex(1024, 768, (g, cw, ch) => {
    const grad = g.createRadialGradient(cw / 2, ch / 2, 52, cw / 2, ch / 2, cw * 0.6);
    grad.addColorStop(0, '#3c58cf');
    grad.addColorStop(0.4, '#293392');
    grad.addColorStop(0.78, '#191047');
    grad.addColorStop(1, '#0d0824');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    const rnd = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(130,150,255,0.06)';
      g.beginPath(); g.arc(rnd() * cw, rnd() * ch, 24 + rnd() * 84, 0, 7); g.fill();
    }
    // the medallion: gold rings and spokes around the room's center
    g.save();
    g.translate(cw / 2, ch / 2);
    g.strokeStyle = 'rgba(201,165,75,0.5)';
    for (const [r, lw] of [[72, 10], [116, 6], [172, 10], [240, 5]]) {
      g.lineWidth = lw;
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    }
    g.lineWidth = 5;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 120, Math.sin(a) * 120);
      g.lineTo(Math.cos(a) * 168, Math.sin(a) * 168);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,210,120,0.75)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.39;
      g.beginPath(); g.arc(Math.cos(a) * 206, Math.sin(a) * 206, 9, 0, 7); g.fill();
    }
    g.restore();
    // sparkle field
    g.fillStyle = 'rgba(200,215,255,0.5)';
    for (let i = 0; i < 60; i++) {
      g.fillRect(rnd() * cw, rnd() * ch, 4, 4);
    }
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshBasicMaterial({ map: ceilTex }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_H;
  scene.add(ceiling);
  // warm cove ring where the dome meets the walls
  for (const [cw2, cd2, cx, cz] of [
    [ROOM_W, 0.16, 0, -ROOM_D / 2 + 0.2], [ROOM_W, 0.16, 0, ROOM_D / 2 - 0.2],
    [0.16, ROOM_D, -ROOM_W / 2 + 0.2, 0], [0.16, ROOM_D, ROOM_W / 2 - 0.2, 0],
  ]) {
    const cove = new THREE.Mesh(new THREE.BoxGeometry(cw2, 0.07, cd2), glow(0xffd9a0, 1.35));
    cove.position.set(cx, WALL_H - 0.05, cz);
    scene.add(cove);
  }

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
  scene.add(new THREE.AmbientLight(0x565073, 3.0));
  // broad warm fill so the room reads bright like the reference
  for (const [fx, fz] of [[-14, -9], [14, -9], [-14, 7], [14, 7], [0, -1], [0, 14]]) {
    const fill = new THREE.PointLight(0xffe2c2, 205, 30, 1.65);
    fill.position.set(fx, 6.2, fz);
    scene.add(fill);
  }
  scene.add(new THREE.HemisphereLight(0x9a86c8, 0x2a2038, 0.85));

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

  const neonPlane = (tex, w2, h2, x, y, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.position.set(x, y, z);
    p.rotation.y = ry;
    scene.add(p);
    return p;
  };

  // the crown, in yellow neon, like the reference
  neonPlane(cvTex(512, 384, (g, w2, h2) => {
    g.strokeStyle = '#ffd24a';
    g.lineWidth = 16;
    g.lineJoin = 'round';
    g.shadowColor = '#ffd24a'; g.shadowBlur = 34;
    g.beginPath();
    g.moveTo(70, 290); g.lineTo(50, 120); g.lineTo(150, 210); g.lineTo(256, 80);
    g.lineTo(362, 210); g.lineTo(462, 120); g.lineTo(442, 290); g.closePath();
    g.stroke();
    g.beginPath(); g.moveTo(80, 320); g.lineTo(432, 320); g.stroke();
  }), 3.4, 2.55, -26.85, 4.3, 5, Math.PI / 2);

  // dice pair on the back wall
  neonPlane(cvTex(512, 384, (g, w2, h2) => {
    g.strokeStyle = '#7fe8dc';
    g.lineWidth = 13;
    g.shadowColor = '#7fe8dc'; g.shadowBlur = 28;
    const die = (x, y, r) => {
      g.save(); g.translate(x, y); g.rotate(r);
      g.strokeRect(-80, -80, 160, 160);
      g.fillStyle = '#ff9fb2';
      g.shadowColor = '#ff9fb2';
      for (const [px, py] of [[-38, -38], [0, 0], [38, 38]]) { g.beginPath(); g.arc(px, py, 15, 0, 7); g.fill(); }
      g.restore();
    };
    die(160, 180, -0.22); die(360, 210, 0.3);
  }), 3, 2.25, -8.5, 4.7, ROOM_D / 2 - 0.09, Math.PI);

  // lightning bolt on the other side
  neonPlane(cvTex(384, 512, (g, w2, h2) => {
    g.strokeStyle = '#ff5fa2';
    g.lineWidth = 15;
    g.lineJoin = 'round';
    g.shadowColor = '#ff5fa2'; g.shadowBlur = 32;
    g.beginPath();
    g.moveTo(230, 40); g.lineTo(120, 260); g.lineTo(195, 260); g.lineTo(140, 470);
    g.lineTo(290, 220); g.lineTo(205, 220); g.lineTo(280, 40); g.closePath();
    g.stroke();
  }), 1.9, 2.55, 8.5, 4.7, ROOM_D / 2 - 0.09, Math.PI);

  // framed patron portraits flanking the entrance
  const portrait = (hue, hat, name2) => cvTex(256, 320, (g, w2, h2) => {
    g.fillStyle = '#1c1426'; g.fillRect(0, 0, w2, h2);
    g.strokeStyle = '#c9a54b'; g.lineWidth = 14; g.strokeRect(7, 7, w2 - 14, h2 - 14);
    g.strokeStyle = '#8a6a1d'; g.lineWidth = 4; g.strokeRect(20, 20, w2 - 40, h2 - 40);
    g.fillStyle = hue;
    g.beginPath(); g.ellipse(w2 / 2, 190, 62, 84, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(w2 / 2 - 22, 160, 16, 0, 7); g.fill();
    g.beginPath(); g.arc(w2 / 2 + 22, 160, 16, 0, 7); g.fill();
    g.fillStyle = '#14101c';
    g.beginPath(); g.arc(w2 / 2 - 18, 162, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(w2 / 2 + 26, 162, 7, 0, 7); g.fill();
    if (hat === 'top') { g.fillRect(w2 / 2 - 34, 84, 68, 34); g.fillRect(w2 / 2 - 50, 112, 100, 8); }
    if (hat === 'fez') {
      g.fillStyle = '#b02c35';
      g.beginPath(); g.moveTo(w2 / 2 - 26, 116); g.lineTo(w2 / 2 + 26, 116); g.lineTo(w2 / 2 + 18, 82); g.lineTo(w2 / 2 - 18, 82); g.closePath(); g.fill();
    }
    g.fillStyle = '#c9a54b';
    g.font = '600 22px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(name2, w2 / 2, h2 - 34);
  });
  neonPlane(portrait('#8f5bd9', 'top', 'THE REGULAR'), 1.5, 1.9, -7.5, 3.5, -ROOM_D / 2 + 0.09, 0);
  neonPlane(portrait('#f07f3c', 'fez', 'BIG SPENDER'), 1.5, 1.9, 7.5, 3.5, -ROOM_D / 2 + 0.09, 0);

  // THE FLOOR over the entrance, ringed in bulbs
  neonPlane(cvTex(1024, 256, (g, w2, h2) => {
    g.fillStyle = '#160f22'; g.fillRect(0, 0, w2, h2);
    g.strokeStyle = '#c9a54b'; g.lineWidth = 8; g.strokeRect(6, 6, w2 - 12, h2 - 12);
    g.font = '600 130px Oswald, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff5fa2'; g.shadowBlur = 40;
    g.fillStyle = '#fffdf8';
    g.fillText('THE FLOOR', w2 / 2, h2 / 2 + 4);
    g.shadowBlur = 0;
    g.fillStyle = '#ffd24a';
    for (let x = 34; x < w2; x += 56) {
      g.beginPath(); g.arc(x, 26, 9, 0, 7); g.fill();
      g.beginPath(); g.arc(x, h2 - 26, 9, 0, 7); g.fill();
    }
  }), 6.4, 1.6, 0, 5.1, -ROOM_D / 2 + 0.09, 0);

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
  {
    const bm = glow(0xffd98a, 2.2);
    const bg2 = new THREE.SphereGeometry(0.06, 8, 6);
    const bw = 11.3, bh = 5.1, per = [];
    for (let x = -bw / 2; x <= bw / 2; x += 0.62) per.push([x, 4.4 - bh / 2], [x, 4.4 + bh / 2]);
    for (let y = 4.4 - bh / 2; y <= 4.4 + bh / 2; y += 0.62) per.push([-bw / 2, y], [bw / 2, y]);
    for (const [bx2, by2] of per) {
      const b = new THREE.Mesh(bg2, bm);
      b.position.set(bx2, by2, ROOM_D / 2 - 0.14);
      scene.add(b);
    }
  }

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
        cg.fillStyle = '#0e2418'; cg.fillRect(0, 0, 512, 256);
        cg.strokeStyle = 'rgba(127,232,171,0.14)';
        cg.lineWidth = 1;
        for (let gy = 32; gy < 256; gy += 32) { cg.beginPath(); cg.moveTo(0, gy); cg.lineTo(512, gy); cg.stroke(); }
        for (let gx = 32; gx < 512; gx += 48) { cg.beginPath(); cg.moveTo(gx, 0); cg.lineTo(gx, 256); cg.stroke(); }
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
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.05, 18), mat(0x14101c, { roughness: 0.4 }));
        plate.position.set(x, 1.0, 0.62);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.09, 18), glow(color, 1.3));
        b.position.set(x, 1.06, 0.62);
        g.add(plate, b);
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
      const stage = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.36, 4.6), mat(0x1a1230, { roughness: 0.95 }));
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
      // the champion, crowned, vs the blossom
      const champ = blob(0xf2c14b, 'crown');
      champ.scale.setScalar(0.9);
      champ.position.set(-2, 1.44, 0.6);
      g.add(champ);
      const blossomTex = cvTex(256, 256, (gg, w, h) => {
        gg.strokeStyle = '#ff9fb2';
        gg.lineWidth = 15;
        gg.shadowColor = '#ff9fb2'; gg.shadowBlur = 16;
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
      blossom.position.set(2, 2.05, 0.6);
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
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.34), mat(0x14101c, { roughness: 0.4 }));
        shelf.position.set(0, 0.98, 0.52);
        shelf.rotation.x = -0.2;
        m.add(body, screen, marquee, shelf);
        [0xd5453a, 0xf2c14b, 0x3fa842].forEach((bc, k) => {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), glow(bc, 1.5));
          b.position.set((k - 1) * 0.2, 1.03, 0.53);
          b.rotation.x = -0.2;
          m.add(b);
        });
        for (const sx of [-0.52, 0.52]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.16, 0.05), glow([C.teal, C.orange, C.violet][i], 1.5));
          strip.position.set(sx, 1.1, 0.35);
          m.add(strip);
        }
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
        new THREE.MeshStandardMaterial({ map: marqueeTex, emissive: 0xffffff, emissiveMap: marqueeTex, emissiveIntensity: 0.6, roughness: 0.5 }));
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
      new THREE.MeshStandardMaterial({ map: signMap, emissive: 0xffffff, emissiveMap: signMap, emissiveIntensity: 1.05, roughness: 0.6 }));
    sign.position.set(bx, 3.5, bz);
    sign.rotation.y = Math.atan2(-spec.pos[0], -spec.pos[1]);
    scene.add(sign);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.5, 8), mat(0x14101c));
    pole.position.set(bx, 1.75, bz);
    scene.add(pole);

    // the green plaque under the sign
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.36),
      new THREE.MeshStandardMaterial({ map: plaqueTexture(spec.plaque), emissive: 0xffffff, emissiveMap: plaqueTexture(spec.plaque), emissiveIntensity: 0.75, roughness: 0.6 }));
    plaque.position.set(bx, 2.85, bz);
    plaque.rotation.y = sign.rotation.y;
    scene.add(plaque);

    // LED odds board floating at the table's shoulder
    const ledMap = ledTexture(spec.led);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75),
      new THREE.MeshStandardMaterial({ map: ledMap, emissive: 0xffffff, emissiveMap: ledMap, emissiveIntensity: 0.85, roughness: 0.6 }));
    const ledA = sign.rotation.y + 0.6;
    led.position.set(spec.pos[0] + Math.sin(ledA) * 2.1, 1.9, spec.pos[1] + Math.cos(ledA) * 2.1);
    led.rotation.y = sign.rotation.y;
    scene.add(led);

    // table light
    const spot = new THREE.SpotLight(0xfff0d8, 370, 13, 0.8, 0.55, 1.5);
    spot.position.set(spec.pos[0], 5.4, spec.pos[1]);
    spot.target.position.set(spec.pos[0], 0.9, spec.pos[1]);
    scene.add(spot, spot.target);
    const accent = new THREE.PointLight(new THREE.Color(spec.accent), 95, 9, 1.8);
    accent.position.set(spec.pos[0], 3.6, spec.pos[1]);
    scene.add(accent);

    // pendant lamp hanging over the felt
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, WALL_H - 4.7, 6), mat(0x14101c));
    cord.position.set(spec.pos[0], (WALL_H + 4.7) / 2, spec.pos[1]);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.38, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1d4038, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
    shade.position.set(spec.pos[0], 4.7, spec.pos[1]);
    const pendantBulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow(0xffdf9e, 2.4));
    pendantBulb.position.set(spec.pos[0], 4.55, spec.pos[1]);
    scene.add(cord, shade, pendantBulb);

    stations.push({ game, x: spec.pos[0], z: spec.pos[1], r: spec.r });
  });

  // a top-hatted doorman minds the ropes
  const doorman = blob(0x8f5bd9, 'top');
  doorman.position.set(3.4, 0, -14.6);
  doorman.rotation.y = Math.PI;
  npcs.push({ group: doorman, phase: 0.7 });
  scene.add(doorman);

  // ───────────────────────────── patrons

  const blobColors = [0x8f5bd9, 0xf07f3c, 0x2fbfa5, 0xe0557f, 0xf2c14b, 0x5b8ff0, 0x8fe86f];
  const statics = [[-6.3, -7.6, 0.5], [-11.5, 10.5, 2.4], [15.5, 3, -1.9], [23, -6.6, -1.6], [-22.4, 1.4, 1.57], [1.2, 6.2, -2.6]];
  statics.forEach(([x, z, ry], i) => {
    const b = blob(blobColors[i % blobColors.length], ['fez', null, 'bowler', 'top', null, 'fez'][i]);
    b.position.set(x, 0, z);
    b.rotation.y = ry + Math.PI;
    npcs.push({ group: b, phase: i * 1.3 });
    scene.add(b);
  });
  const WAYPOINTS = [[-4, -9], [6, -8], [10, 0], [5, 9], [-4, 10], [-9, 1]];
  for (let i = 0; i < 3; i++) {
    const b = blob(blobColors[(i + 3) % blobColors.length], ['top', 'bowler', null][i]);
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
      // the visible shaft of light
      const dir = new THREE.Vector3(Math.cos(a) * 9, -5.9, Math.sin(a) * 9);
      const len = dir.length();
      const coneGeo = new THREE.ConeGeometry(2.1, len, 18, 1, true);
      coneGeo.translate(0, -len / 2, 0);
      const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
        color: bc, transparent: true, opacity: 0.055,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
      rig.add(cone);
    });
    rig.name = 'discorig';
    scene.add(rig);
    const rings = [];
    [[2.1, 0xff5fa2, 0.16], [2.9, 0x2fbfa5, -0.13]].forEach(([rr, rc, tilt]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.045, 8, 64), glow(rc, 2.2));
      ring.position.set(0, 5.9, 1);
      ring.rotation.x = Math.PI / 2 + tilt;
      rings.push({ ring, tilt });
      scene.add(ring);
    });
    liveTex.push({ every: 0, acc: 0, fn: dt => {
      rig.rotation.y += dt * 0.45;
      rings.forEach(({ ring, tilt }, i) => {
        ring.rotation.y += dt * (i ? -0.3 : 0.4);
        ring.rotation.x = Math.PI / 2 + tilt + Math.sin(clock.elapsedTime * 0.6 + i * 2) * 0.09;
      });
    } });
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

  // pendants over the bar
  for (const bz of [-11.2, -6.8]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, WALL_H - 3.6, 6), mat(0x14101c));
    cord.position.set(-23.4, (WALL_H + 3.6) / 2, bz);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x5c1d2e, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }));
    shade.position.set(-23.4, 3.6, bz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glow(0xffdf9e, 2.4));
    bulb.position.set(-23.4, 3.49, bz);
    scene.add(cord, shade, bulb);
  }

  // ───────────────────────────── loose coins on the carpet
  let onCoin = () => {};
  const coins = [];
  {
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14b, metalness: 0.7, roughness: 0.25,
      emissive: 0xf2a91b, emissiveIntensity: 1.1,
    });
    const rimMat = mat(0x8a6a1d, { metalness: 0.6, roughness: 0.3 });
    for (const [cx, cz] of [[-3, -12], [8, -10], [-12, -3], [-18, 8], [-6, 3], [6, 8],
      [12, -1], [19, 1], [22, 9], [-20, -8], [-9, 13], [16, 12]]) {
      const cg = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 18), coinMat);
      face.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 22), rimMat);
      cg.add(face, rim);
      cg.position.set(cx, 0.55, cz);
      scene.add(cg);
      coins.push({ mesh: cg, x: cx, z: cz, live: true, t: 0, phase: cx * 0.7 + cz });
    }
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

    for (const s of spinners) { if (s.name === 'discoball') s.rotation.y = t * 0.6; else s.rotation.z = t * 0.5; }

    // coins spin, bob, and jump into your pocket
    for (const c of coins) {
      if (!c.live) {
        c.t -= dt;
        if (c.t <= 0) { c.live = true; c.mesh.visible = true; }
        continue;
      }
      c.mesh.rotation.y = t * 2.6 + c.phase;
      c.mesh.position.y = 0.55 + Math.sin(t * 2 + c.phase) * 0.08;
      if (!frozen && Math.hypot(player.x - c.x, player.z - c.z) < 0.8) {
        c.live = false;
        c.mesh.visible = false;
        c.t = 30;
        onCoin();
      }
    }

    // live screens
    for (const lt of liveTex) {
      if (lt.every === 0) { lt.fn(dt); continue; }
      lt.acc += dt;
      if (lt.acc >= lt.every) { lt.acc = 0; lt.fn(); }
    }

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== (w * renderer.getPixelRatio() | 0)) {
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    composer.render();
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
    onCoinPickup(fn) { onCoin = fn; },
    onLockChange(fn) { onLock = fn; },
    freeze(v) {
      frozen = v;
      if (v && document.pointerLockElement) document.exitPointerLock();
    },
  };
}

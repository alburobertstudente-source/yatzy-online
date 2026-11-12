/**
 * Cosmetici in 3D (stile cartoon ma con luce, riflessi e ombre veri):
 * carte, tavoli, cornici, animazioni di lancio e casse.
 *
 * Tutto viene disegnato una volta con il renderer nascosto condiviso
 * (renderThumb) e mostrato come immagine: niente contesti WebGL in più.
 *   artSpan('card', skin, size, fallback)   → anteprima della skin delle carte
 *   artSpan('table', theme, size, fallback) → tavolino con il tema
 *   artSpan('roll', style, size, fallback)  → icona dell'animazione di lancio
 *   artSpan('chest', type, size, fallback)  → cassa del negozio
 *   artSpan('frame', frame, size, fallback) → anello della cornice
 * Le cornici vere attorno agli avatar (.av-frame) ricevono l'anello 3D
 * sopra, tramite un foglio di stile generato (classe .frames3d su <html>).
 */
import { THREE, has3D, registerArt, renderThumb, studioLights, shadowCatcher, disposeScene } from './core.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FOIL } from '../ui/skins.js';
import { THEME_PAL, makeCanvas, seeded, woodCanvas, shade, hexA } from './cosmTextures.js';

/* ================================================================== */
/* utilità                                                             */
/* ================================================================== */
function tex(canvas, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const color = (c) => new THREE.Color(c);

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Lastra con angoli tondi e smusso; UV delle facce = posizione normalizzata. */
function slabGeometry(w, h, depth, r, bevel = 0.012, holes = null) {
  const shape = roundedRectShape(w, h, r);
  if (holes) shape.holes.push(holes);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  geo.computeVertexNormals();
  return geo;
}

function holePath(w, h, r) {
  const p = new THREE.Path();
  const x = -w / 2;
  const y = -h / 2;
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x, y, x, y + r);
  p.lineTo(x, y + h - r);
  p.quadraticCurveTo(x, y + h, x + r, y + h);
  p.lineTo(x + w - r, y + h);
  p.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  p.lineTo(x + w, y + r);
  p.quadraticCurveTo(x + w, y, x + w - r, y);
  p.lineTo(x + r, y);
  return p;
}

/** Telecamera che inquadra l'oggetto dall'alto in 3/4. */
function fitCamera(obj, { fov = 24, elev = 0.5, azim = 0.5, pad = 1, lift = 0 } = {}) {
  const box = new THREE.Box3().setFromObject(obj);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const c = sphere.center.clone();
  c.y += lift;
  const dist = (sphere.radius * pad) / Math.sin(THREE.MathUtils.degToRad(fov / 2));
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 200);
  cam.position.set(c.x + dist * Math.cos(elev) * Math.sin(azim), c.y + dist * Math.sin(elev), c.z + dist * Math.cos(elev) * Math.cos(azim));
  cam.lookAt(c);
  return cam;
}

/**
 * Disegna un oggetto con luce da studio e ombra morbida a terra.
 * make(scene) → Object3D; opts.cam per l'inquadratura, opts.ground=false senza ombra.
 */
function thumb(key, size, make, opts = {}) {
  return renderThumb(
    key,
    (_T, renderer) => {
      // esposizione un po' più bassa del renderer condiviso: colori pieni, niente bianchi bruciati
      const prevExposure = renderer.toneMappingExposure;
      const scene = new THREE.Scene();
      scene.environmentIntensity = opts.env ?? 0.55;
      studioLights(scene, { shadows: opts.ground !== false, intensity: opts.light ?? 0.82 });
      if (opts.accent) {
        const a = new THREE.PointLight(opts.accent, opts.accentPower ?? 6, 8, 1.6);
        a.position.set(...(opts.accentPos || [1.6, 1.2, 1.6]));
        scene.add(a);
      }
      const obj = make(scene);
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = o.userData.noShadow ? false : true;
          o.receiveShadow = true;
        }
      });
      scene.add(obj);
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      if (opts.ground !== false) {
        const sc = shadowCatcher(30, opts.shadow ?? 0.3);
        sc.position.y = (opts.groundY ?? box.min.y) + 0.002;
        scene.add(sc);
      }
      const camera = opts.camera ? opts.camera(obj) : fitCamera(obj, opts.cam);
      renderer.toneMappingExposure = opts.exposure ?? 0.86;
      return {
        scene,
        camera,
        dispose: () => {
          renderer.toneMappingExposure = prevExposure;
          disposeScene(scene);
        },
      };
    },
    size,
  );
}

/* ================================================================== */
/* dado piccolo (per tavoli e icone dei lanci)                         */
/* ================================================================== */
const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

function pipCanvas(n, { body = '#fbf7ee', pip = '#e8434f' } = {}) {
  const S = 128;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S * 0.4, S * 0.35, 4, S / 2, S / 2, S * 0.75);
  gr.addColorStop(0, shade(body, 0.25));
  gr.addColorStop(1, shade(body, -0.06));
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  for (const [x, y] of PIPS[n]) {
    const px = x * S;
    const py = y * S;
    const r = S * 0.1;
    // incavo: ombra in alto a sinistra, riflesso in basso a destra
    const pg = g.createRadialGradient(px - r * 0.25, py - r * 0.25, r * 0.1, px, py, r);
    pg.addColorStop(0, shade(pip, -0.45));
    pg.addColorStop(0.7, pip);
    pg.addColorStop(1, shade(pip, 0.25));
    g.fillStyle = pg;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(px, py, r + 0.6, 0.1 * Math.PI, 0.6 * Math.PI);
    g.stroke();
  }
  return c;
}

const DIE_FACES = [3, 4, 5, 2, 1, 6]; // +x, -x, +y (sopra), -y, +z, -z
function miniDie(size = 0.4, opts = {}) {
  const geo = new RoundedBoxGeometry(size, size, size, 4, size * 0.2);
  const mats = DIE_FACES.map(
    (n) =>
      new THREE.MeshPhysicalMaterial({
        map: tex(pipCanvas(n, opts)),
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: opts.opacity != null,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ? color(opts.emissive) : color('#000'),
        emissiveIntensity: opts.emissive ? 0.5 : 0,
      }),
  );
  const m = new THREE.Mesh(geo, mats);
  return m;
}

/* ================================================================== */
/* CARTE                                                               */
/* ================================================================== */
const CARD_W = 1.25;
const CARD_H = 1.75;
const METAL_CARDS = new Set(['silver', 'bronze', 'gold']);
const IRI_CARDS = new Set(['holo', 'rainbow', 'prism']);

function starPath(g, cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r : R;
    const a = rot + (i * Math.PI) / n;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Disegno della faccia della carta (e, per alcune skin, la mappa luminosa). */
function cardCanvases(skin) {
  const W = 512;
  const H = 716;
  const f = FOIL[skin] || FOIL.silver;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const glow = makeCanvas(W, H);
  const gg = glow.getContext('2d');
  gg.fillStyle = '#000';
  gg.fillRect(0, 0, W, H);
  let glowing = false;
  const rnd = seeded(skin.length * 131 + skin.charCodeAt(0));

  // fondo: lamina con i colori della skin
  const gr = g.createLinearGradient(0, 0, W, H);
  f.stops.forEach((s, i) => gr.addColorStop(i / (f.stops.length - 1), s));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);

  // materiale
  if (METAL_CARDS.has(skin) || skin === 'carbon') {
    for (let i = 0; i < 900; i++) {
      const y = rnd() * H;
      g.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
      g.lineWidth = 0.6 + rnd();
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y + (rnd() - 0.5) * 6);
      g.stroke();
    }
  }
  if (skin === 'carbon') {
    for (let y = 0; y < H; y += 16)
      for (let x = 0; x < W; x += 16) {
        g.fillStyle = (x / 16 + y / 16) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.18)';
        g.fillRect(x, y, 16, 8);
      }
  }
  if (skin === 'kraft') {
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = rnd() > 0.5 ? 'rgba(90,60,20,0.15)' : 'rgba(255,240,210,0.15)';
      g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1);
    }
  }
  if (skin === 'ocean') {
    for (let i = 0; i < 22; i++) {
      const y = (i / 22) * H;
      g.strokeStyle = `rgba(255,255,255,${0.08 + rnd() * 0.1})`;
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 40 + i) * 10);
      g.stroke();
    }
  }
  if (skin === 'forest') {
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const a = rnd() * Math.PI * 2;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = rnd() > 0.5 ? 'rgba(20,70,25,0.28)' : 'rgba(170,230,140,0.22)';
      g.beginPath();
      g.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  if (skin === 'neon') {
    glowing = true;
    for (const ctx of [g, gg]) {
      ctx.strokeStyle = '#5dff9c';
      ctx.lineWidth = 2;
      ctx.globalAlpha = ctx === g ? 0.35 : 0.8;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  if (skin === 'frost') {
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 12; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const R = 18 + rnd() * 30;
      g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
        g.stroke();
      }
    }
  }
  if (skin === 'lava') {
    glowing = true;
    for (const ctx of [g, gg]) {
      ctx.strokeStyle = ctx === g ? '#ffb02e' : '#ff8a1a';
      ctx.lineCap = 'round';
      const r2 = seeded(7);
      for (let i = 0; i < 16; i++) {
        let x = r2() * W;
        let y = r2() * H;
        ctx.lineWidth = 2 + r2() * 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (r2() - 0.5) * 120;
          y += (r2() - 0.5) * 120;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  if (skin === 'galaxy') {
    glowing = true;
    for (let i = 0; i < 3; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const neb = g.createRadialGradient(x, y, 0, x, y, 220);
      neb.addColorStop(0, i % 2 ? 'rgba(47,208,255,0.45)' : 'rgba(255,61,187,0.4)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb;
      g.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = rnd() * 2.4 + 0.4;
      for (const ctx of [g, gg]) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (IRI_CARDS.has(skin)) {
    const bands = skin === 'rainbow' ? ['#ff4d4d', '#ffa64d', '#ffe14d', '#59e36b', '#4db8ff', '#9b6bff'] : f.stops;
    g.globalAlpha = skin === 'rainbow' ? 0.55 : 0.35;
    for (let i = -4; i < 14; i++) {
      g.fillStyle = bands[(i + 40) % bands.length];
      g.save();
      g.translate(W / 2, H / 2);
      g.rotate(-0.6);
      g.fillRect(-W * 1.5 + i * 70, -H, 70, H * 2);
      g.restore();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 70; i++) {
      g.fillStyle = 'rgba(255,255,255,0.8)';
      starPath(g, rnd() * W, rnd() * H, 6 + rnd() * 6, 2, 4, 0);
      g.fill();
    }
  }

  // puntini della lamina
  g.fillStyle = f.dots;
  for (let y = 18; y < H; y += 26) for (let x = 18 + ((y / 26) % 2) * 13; x < W; x += 26) {
    g.beginPath();
    g.arc(x, y, 2.6, 0, Math.PI * 2);
    g.fill();
  }

  // cornice in rilievo
  const bevel = (inset, wdt, light, dark) => {
    const lg = g.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, light);
    lg.addColorStop(1, dark);
    g.strokeStyle = lg;
    g.lineWidth = wdt;
    roundRect(g, inset, inset, W - inset * 2, H - inset * 2, 40 - inset * 0.3);
    g.stroke();
  };
  bevel(26, 10, 'rgba(255,255,255,0.85)', 'rgba(0,0,0,0.35)');
  bevel(38, 3, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.5)');

  // medaglione con la stella
  const cx = W / 2;
  const cy = H * 0.43;
  const mr = 132;
  const ring = g.createLinearGradient(cx - mr, cy - mr, cx + mr, cy + mr);
  ring.addColorStop(0, 'rgba(255,255,255,0.95)');
  ring.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = ring;
  g.beginPath();
  g.arc(cx, cy, mr + 12, 0, Math.PI * 2);
  g.fill();
  const med = g.createRadialGradient(cx - 40, cy - 50, 10, cx, cy, mr);
  med.addColorStop(0, shade(f.stops[1], 0.35));
  med.addColorStop(1, shade(f.stops[0], -0.1));
  g.fillStyle = med;
  g.beginPath();
  g.arc(cx, cy, mr, 0, Math.PI * 2);
  g.fill();
  // stella in rilievo: ombra, corpo, luce
  g.fillStyle = 'rgba(0,0,0,0.3)';
  starPath(g, cx + 6, cy + 8, 92, 40);
  g.fill();
  const sg = g.createLinearGradient(cx - 90, cy - 90, cx + 90, cy + 90);
  sg.addColorStop(0, shade(f.ink, 0.5));
  sg.addColorStop(1, f.ink);
  g.fillStyle = sg;
  starPath(g, cx, cy, 92, 40);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 3;
  starPath(g, cx - 2, cy - 2, 86, 37);
  g.stroke();
  if (glowing) {
    gg.fillStyle = skin === 'neon' ? '#5dff9c' : skin === 'lava' ? '#ffb02e' : '#b38bff';
    starPath(gg, cx, cy, 92, 40);
    gg.fill();
  }

  // scritta
  g.font = '700 58px Fredoka, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillText('YATZY', cx + 3, H * 0.8 + 4);
  g.fillStyle = f.ink;
  g.fillText('YATZY', cx, H * 0.8);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillText('YATZY', cx - 1.5, H * 0.8 - 2);

  // lucentezza diagonale (dà subito l'idea di superficie lucida)
  const sh = g.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0.28, 'rgba(255,255,255,0)');
  sh.addColorStop(0.4, 'rgba(255,255,255,0.16)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = sh;
  g.fillRect(0, 0, W, H);
  return { face: c, glow: glowing ? glow : null };
}

function cardMaterials(skin) {
  const f = FOIL[skin] || FOIL.silver;
  const { face, glow } = cardCanvases(skin);
  const metal = METAL_CARDS.has(skin);
  const iri = IRI_CARDS.has(skin);
  const faceMat = phys({
    map: tex(face),
    roughness: metal ? 0.26 : skin === 'kraft' ? 0.85 : 0.42,
    metalness: metal ? 0.75 : skin === 'carbon' ? 0.4 : 0.05,
    envMapIntensity: metal ? 2.4 : 1,
    clearcoat: skin === 'kraft' ? 0.1 : 0.7,
    clearcoatRoughness: 0.14,
    iridescence: iri ? 1 : skin === 'galaxy' || skin === 'frost' ? 0.5 : 0,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 820],
    emissive: glow ? color('#ffffff') : color('#000000'),
    emissiveMap: glow ? tex(glow) : null,
    emissiveIntensity: glow ? 0.9 : 0,
  });
  const edgeMat = phys({ color: color(shade(f.stops[0], metal ? 0.1 : 0.3)), roughness: 0.35, metalness: metal ? 0.9 : 0.1, clearcoat: 0.6 });
  return [faceMat, edgeMat];
}

function cardModel(skin) {
  const group = new THREE.Group();
  const geo = slabGeometry(CARD_W, CARD_H, 0.035, 0.13, 0.014);
  const mats = cardMaterials(skin);
  const front = new THREE.Mesh(geo, mats);
  // una seconda carta dietro, a ventaglio: dà subito l'idea del mazzo
  const back = new THREE.Mesh(geo, mats);
  back.position.set(-0.32, 0.02, -0.12);
  back.rotation.z = 0.22;
  group.add(back, front);
  group.rotation.set(-0.12, -0.42, -0.06);
  group.position.y = CARD_H / 2 + 0.25;
  return group;
}

export function cardThumb(skin, size = 96) {
  return thumb(`card:${skin}`, size, () => cardModel(skin), {
    cam: { fov: 22, elev: 0.3, azim: 0.2, pad: 0.76, lift: 0.1 },
    shadow: 0.22,
    env: 0.5,
    accent: skin === 'neon' ? '#5dff9c' : skin === 'lava' ? '#ff7a1a' : skin === 'galaxy' ? '#b38bff' : null,
  });
}

/* ================================================================== */
/* TAVOLI                                                              */
/* ================================================================== */
function feltCanvas(theme) {
  const pal = THEME_PAL[theme] || THEME_PAL.classic;
  const W = 512;
  const H = 352;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const half = (y0, cols, flip) => {
    const gr = g.createRadialGradient(W / 2, flip ? y0 + H / 2 - 30 : y0 + 30, 20, W / 2, flip ? y0 + H / 2 - 30 : y0 + 30, W * 0.75);
    gr.addColorStop(0, shade(cols[1], 0.12));
    gr.addColorStop(0.55, cols[1]);
    gr.addColorStop(1, cols[2]);
    g.fillStyle = gr;
    g.fillRect(0, y0, W, H / 2);
  };
  half(0, pal.red, false);
  half(H / 2, pal.blue, true);
  const rnd = seeded(theme.length * 53 + 7);
  // motivo del tema
  if (pal.tex === 'stars' || theme === 'night' || theme === 'space') {
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${0.4 + rnd() * 0.6})`;
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, rnd() * 1.6 + 0.4, 0, Math.PI * 2);
      g.fill();
    }
  } else if (pal.tex === 'grid') {
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1.5;
    for (let x = 0; x <= W; x += 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
    }
    for (let y = 0; y <= H; y += 24) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
  } else if (pal.tex === 'water') {
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = 'rgba(255,255,255,0.16)';
      g.lineWidth = 3;
      g.beginPath();
      const y = (i / 18) * H;
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 30 + i) * 5);
      g.stroke();
    }
  } else if (pal.tex === 'sugar' || pal.tex === 'cloud') {
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, 2 + rnd() * 5, 0, Math.PI * 2);
      g.fill();
    }
  } else if (pal.tex === 'sand') {
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = 4;
      g.beginPath();
      const y = (i / 12) * H;
      for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin(x / 60 + i * 0.6) * 8);
      g.stroke();
    }
  } else if (pal.tex === 'ice') {
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      let x = rnd() * W;
      let y = rnd() * H;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rnd() - 0.5) * 90;
        y += (rnd() - 0.5) * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else if (pal.tex === 'rock') {
    g.strokeStyle = 'rgba(255,176,46,0.7)';
    g.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      let x = rnd() * W;
      let y = rnd() * H;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rnd() - 0.5) * 100;
        y += (rnd() - 0.5) * 100;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  } else {
    // pallini del panno classico
    g.fillStyle = 'rgba(255,255,255,0.13)';
    for (let y = 12; y < H; y += 22) for (let x = 12 + ((y / 22) % 2) * 11; x < W; x += 22) {
      g.beginPath();
      g.arc(x, y, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  // fibre del panno
  for (let i = 0; i < 3500; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1);
  }
  // linea di metà campo
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(24, H / 2 - 2, W - 48, 4);
  return c;
}

function rimMaterial(kind) {
  switch (kind) {
    case 'wood':
      return phys({ map: tex(woodCanvas('#a0632e', '#5a3214', { seed: 4 })), roughness: 0.5, clearcoat: 0.8, clearcoatRoughness: 0.25 });
    case 'lightwood':
      return phys({ map: tex(woodCanvas('#d9a066', '#9a6232', { seed: 5 })), roughness: 0.55, clearcoat: 0.6 });
    case 'driftwood':
      return phys({ map: tex(woodCanvas('#b8aa94', '#6f6556', { seed: 6 })), roughness: 0.75 });
    case 'darkwood':
      return phys({ map: tex(woodCanvas('#4a2c1c', '#22120a', { seed: 8 })), roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.15 });
    case 'candy': {
      const c = makeCanvas(256, 64);
      const g = c.getContext('2d');
      for (let x = -64; x < 320; x += 32) {
        g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#ff6fa8';
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 16, 0);
        g.lineTo(x + 48, 64);
        g.lineTo(x + 32, 64);
        g.fill();
      }
      return phys({ map: tex(c, { repeat: [4, 1] }), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
    }
    case 'sandstone': {
      const c = makeCanvas(256, 128);
      const g = c.getContext('2d');
      g.fillStyle = '#d9a86a';
      g.fillRect(0, 0, 256, 128);
      const r = seeded(11);
      for (let i = 0; i < 2500; i++) {
        g.fillStyle = r() > 0.5 ? 'rgba(120,70,30,0.2)' : 'rgba(255,240,200,0.25)';
        g.fillRect(r() * 256, r() * 128, 1.5, 1.5);
      }
      for (let y = 20; y < 128; y += 24) {
        g.fillStyle = 'rgba(150,90,40,0.25)';
        g.fillRect(0, y, 256, 3);
      }
      return phys({ map: tex(c), roughness: 0.9 });
    }
    case 'ice':
      return phys({ color: color('#cfefff'), roughness: 0.08, transmission: 0.85, thickness: 0.4, ior: 1.31, clearcoat: 1, attenuationColor: color('#7fc8ff'), attenuationDistance: 0.8 });
    case 'obsidian':
      return phys({ color: color('#1a1016'), roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    case 'chrome':
      return phys({ color: color('#d9dfea'), roughness: 0.16, metalness: 1, clearcoat: 0.5 });
    case 'neon':
      return phys({ color: color('#14122a'), roughness: 0.3, metalness: 0.6, clearcoat: 1 });
    case 'gold':
      return phys({ color: color('#ffc83a'), roughness: 0.22, metalness: 1, clearcoat: 0.6 });
    default:
      return phys({ color: color('#8a5a32'), roughness: 0.5 });
  }
}

function tableModel(theme) {
  const pal = THEME_PAL[theme] || THEME_PAL.classic;
  const group = new THREE.Group();
  const TW = 2.5;
  const TH = 1.7;
  // piano di gioco (panno con il tema)
  const top = new THREE.Mesh(slabGeometry(TW, TH, 0.08, 0.16, 0.01), [phys({ map: tex(feltCanvas(theme)), roughness: 0.9, sheen: 0.6, sheenRoughness: 0.7, sheenColor: color(pal.red[0]), envMapIntensity: 0.4 }), phys({ color: color(pal.red[2]), roughness: 0.8 })]);
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.04;
  group.add(top);
  // bordo rialzato
  const rimMat = rimMaterial(pal.rim);
  const rim = new THREE.Mesh(slabGeometry(TW + 0.32, TH + 0.32, 0.16, 0.3, 0.035, holePath(TW - 0.02, TH - 0.02, 0.16)), rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.09;
  group.add(rim);
  if (pal.rim === 'neon') {
    const tubeMat = new THREE.MeshStandardMaterial({ color: color('#ff3dbb'), emissive: color('#ff3dbb'), emissiveIntensity: 2.2 });
    const tube2 = new THREE.MeshStandardMaterial({ color: color('#20e3ff'), emissive: color('#20e3ff'), emissiveIntensity: 2.2 });
    const curve = (w, h) => {
      const pts = roundedRectShape(w, h, 0.25).getPoints(16).map((p) => new THREE.Vector3(p.x, 0, -p.y));
      return new THREE.CatmullRomCurve3(pts, true);
    };
    const t1 = new THREE.Mesh(new THREE.TubeGeometry(curve(TW + 0.3, TH + 0.3), 120, 0.025, 8, true), tubeMat);
    t1.position.y = 0.18;
    const t2 = new THREE.Mesh(new THREE.TubeGeometry(curve(TW + 0.06, TH + 0.06), 120, 0.018, 8, true), tube2);
    t2.position.y = 0.18;
    t1.userData.noShadow = true;
    t2.userData.noShadow = true;
    group.add(t1, t2);
  }
  // base del tavolo
  const base = new THREE.Mesh(new RoundedBoxGeometry(TW + 0.2, 0.22, TH + 0.2, 3, 0.08), phys({ color: color(shade(pal.red[2], -0.35)), roughness: 0.6, clearcoat: 0.4 }));
  base.position.y = -0.1;
  group.add(base);
  // due dadi, rosso e blu
  const d1 = miniDie(0.36, { pip: '#e8434f' });
  d1.position.set(-0.55, 0.26, -0.32);
  d1.rotation.set(0, 0.5, 0);
  const d2 = miniDie(0.36, { pip: '#2f7fe0' });
  d2.position.set(0.5, 0.26, 0.36);
  d2.rotation.set(0, -0.35, 0);
  group.add(d1, d2);
  return group;
}

export function tableThumb(theme, size = 96) {
  const pal = THEME_PAL[theme] || THEME_PAL.classic;
  return thumb(`table:${theme}`, size, () => tableModel(theme), {
    cam: { fov: 24, elev: 0.72, azim: 0.42, pad: 0.84 },
    shadow: 0.3,
    accent: pal.accent,
    accentPower: theme === 'neoncity' || theme === 'volcano' || theme === 'space' ? 8 : 3,
    accentPos: [1.2, 1.4, 1.4],
  });
}

/* ================================================================== */
/* CORNICI (anelli visti di fronte, centro trasparente)                */
/* ================================================================== */
const RING_VIEW = 1.32; // metà del riquadro in unità: l'anello (raggio 1) sta al 76% del bordo

function ringGeo(tube = 0.11, radius = 1) {
  return new THREE.TorusGeometry(radius, tube, 28, 128);
}

function rainbowRingMaterial() {
  return phys({ vertexColors: true, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.4 });
}

function paintRingByAngle(geo, fn) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const a = (Math.atan2(pos.getY(i), pos.getX(i)) + Math.PI * 2) % (Math.PI * 2);
    fn(a / (Math.PI * 2), c);
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

function placeAround(group, n, make, radius = 1, phase = 0) {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    const m = make(i, a);
    m.position.x += Math.cos(a) * radius;
    m.position.y += Math.sin(a) * radius;
    group.add(m);
  }
}

function frameModel(frame) {
  const g = new THREE.Group();
  const gem = (c, s = 0.12) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), phys({ color: color(c), roughness: 0.05, metalness: 0, transmission: 0.6, thickness: 0.3, ior: 2.2, clearcoat: 1, emissive: color(c), emissiveIntensity: 0.25 }));
    m.scale.z = 0.6;
    return m;
  };
  switch (frame) {
    case 'wood': {
      const t = tex(woodCanvas('#b0703a', '#5a3214', { w: 1024, h: 64, seed: 9 }), { repeat: [3, 1] });
      g.add(new THREE.Mesh(ringGeo(0.13), phys({ map: t, roughness: 0.45, clearcoat: 0.9, clearcoatRoughness: 0.2 })));
      placeAround(g, 4, () => new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), phys({ color: color('#c9a06a'), metalness: 0.9, roughness: 0.3 })), 1, Math.PI / 4);
      break;
    }
    case 'silver':
      g.add(new THREE.Mesh(ringGeo(0.12), phys({ color: color('#e3e8f0'), metalness: 1, roughness: 0.18, clearcoat: 0.6 })));
      g.add(new THREE.Mesh(ringGeo(0.04, 1.13), phys({ color: color('#aab3c4'), metalness: 1, roughness: 0.25 })));
      placeAround(g, 4, () => gem('#5ab0ff', 0.09), 1, Math.PI / 2);
      break;
    case 'gold':
      g.add(new THREE.Mesh(ringGeo(0.13), phys({ color: color('#ffc83a'), metalness: 1, roughness: 0.2, clearcoat: 0.7 })));
      g.add(new THREE.Mesh(ringGeo(0.04, 1.15), phys({ color: color('#e8a400'), metalness: 1, roughness: 0.25 })));
      placeAround(g, 6, (i) => gem(i % 2 ? '#ff3d5a' : '#2f8cff', 0.11), 1, Math.PI / 2);
      break;
    case 'flowers': {
      g.add(new THREE.Mesh(ringGeo(0.07), phys({ color: color('#3fae4a'), roughness: 0.5, clearcoat: 0.4 })));
      const petal = new THREE.SphereGeometry(0.075, 14, 10);
      const cols = ['#ff7ac8', '#ffe14d', '#ffffff', '#b98bff', '#ff9a5a'];
      placeAround(
        g,
        10,
        (i) => {
          const f = new THREE.Group();
          const pm = phys({ color: color(cols[i % cols.length]), roughness: 0.4, clearcoat: 0.6, sheen: 0.6 });
          for (let k = 0; k < 5; k++) {
            const p = new THREE.Mesh(petal, pm);
            const a = (k / 5) * Math.PI * 2;
            p.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.05);
            p.scale.set(1, 1, 0.5);
            f.add(p);
          }
          const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), phys({ color: color('#ffb400'), roughness: 0.4 }));
          center.position.z = 0.08;
          f.add(center);
          f.scale.setScalar(i % 2 ? 1.1 : 0.85);
          return f;
        },
        1,
        0.2,
      );
      placeAround(
        g,
        10,
        (i, a) => {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), phys({ color: color('#5fd16a'), roughness: 0.45 }));
          leaf.scale.set(1.6, 0.6, 0.4);
          leaf.rotation.z = a + Math.PI / 2;
          return leaf;
        },
        1,
        0.5,
      );
      break;
    }
    case 'flame': {
      const fireMat = (c, e) => new THREE.MeshStandardMaterial({ color: color(c), emissive: color(e), emissiveIntensity: 1.6, roughness: 0.4 });
      g.add(new THREE.Mesh(ringGeo(0.12), phys({ color: color('#3a1208'), roughness: 0.35, metalness: 0.4, emissive: color('#ff5a1a'), emissiveIntensity: 0.35 })));
      placeAround(
        g,
        18,
        (i, a) => {
          const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32 + (i % 3) * 0.08, 12), fireMat(i % 2 ? '#ffb02e' : '#ff6a1a', i % 2 ? '#ffb02e' : '#ff5a00'));
          f.rotation.z = a - Math.PI / 2;
          f.position.x = Math.cos(a) * 0.14;
          f.position.y = Math.sin(a) * 0.14;
          f.userData.noShadow = true;
          return f;
        },
        1,
      );
      break;
    }
    case 'frost': {
      g.add(new THREE.Mesh(ringGeo(0.13), phys({ color: color('#d8f3ff'), roughness: 0.05, transmission: 0.75, thickness: 0.5, ior: 1.31, clearcoat: 1, attenuationColor: color('#6fc3ff'), attenuationDistance: 0.6 })));
      placeAround(
        g,
        12,
        (i, a) => {
          const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 + (i % 3) * 0.03, 0), phys({ color: color('#eefaff'), roughness: 0.02, transmission: 0.7, thickness: 0.3, ior: 1.5, clearcoat: 1 }));
          s.scale.set(0.55, 1.6, 0.55);
          s.rotation.z = a - Math.PI / 2;
          s.position.x = Math.cos(a) * 0.12;
          s.position.y = Math.sin(a) * 0.12;
          return s;
        },
        1,
      );
      break;
    }
    case 'neon': {
      const neon = (c, r, t) => {
        const m = new THREE.Mesh(ringGeo(t, r), new THREE.MeshStandardMaterial({ color: color(c), emissive: color(c), emissiveIntensity: 2.4, roughness: 0.3 }));
        m.userData.noShadow = true;
        return m;
      };
      g.add(new THREE.Mesh(ringGeo(0.11), phys({ color: color('#15132a'), roughness: 0.25, metalness: 0.7, clearcoat: 1 })));
      g.add(neon('#20e3ff', 0.94, 0.035), neon('#ff3d7f', 1.09, 0.035));
      break;
    }
    case 'rainbow': {
      const geo = paintRingByAngle(ringGeo(0.13), (t, c) => c.setHSL(t, 0.85, 0.58));
      g.add(new THREE.Mesh(geo, rainbowRingMaterial()));
      placeAround(g, 8, () => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: color('#ffffff'), emissive: color('#ffffff'), emissiveIntensity: 1.5 }));
        s.position.z = 0.12;
        return s;
      });
      break;
    }
    case 'cosmic': {
      const geo = paintRingByAngle(ringGeo(0.13), (t, c) => c.setHSL(0.72 + Math.sin(t * Math.PI * 4) * 0.12, 0.8, 0.35 + 0.15 * Math.sin(t * Math.PI * 6)));
      g.add(new THREE.Mesh(geo, phys({ vertexColors: true, roughness: 0.15, metalness: 0.5, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8 })));
      const r = seeded(21);
      placeAround(g, 14, (i) => {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025 + r() * 0.03, 0), new THREE.MeshStandardMaterial({ color: color('#fff'), emissive: color(i % 3 ? '#ffffff' : '#7fe8ff'), emissiveIntensity: 2 }));
        s.position.set((r() - 0.5) * 0.25, (r() - 0.5) * 0.25, 0.15);
        s.userData.noShadow = true;
        return s;
      });
      // pianetini
      placeAround(g, 3, (i) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), phys({ color: color(['#ff7a1a', '#2fd0ff', '#56ff9e'][i]), roughness: 0.35, clearcoat: 1 }));
        p.position.z = 0.1;
        return p;
      }, 1.02, 0.6);
      break;
    }
    default:
      g.add(new THREE.Mesh(ringGeo(0.1), phys({ color: color('#ffffff'), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 })));
      g.add(new THREE.Mesh(ringGeo(0.03, 1.1), phys({ color: color('#d6dbe6'), roughness: 0.3, clearcoat: 1 })));
  }
  return g;
}

export function frameThumb(frame, size = 160) {
  return thumb(`frame:${frame}`, size, () => frameModel(frame), {
    ground: false,
    camera: () => {
      const cam = new THREE.OrthographicCamera(-RING_VIEW, RING_VIEW, RING_VIEW, -RING_VIEW, 0.1, 20);
      cam.position.set(0, 0, 6);
      cam.lookAt(0, 0, 0);
      return cam;
    },
    accent: frame === 'flame' ? '#ff7a1a' : frame === 'neon' ? '#20e3ff' : frame === 'cosmic' ? '#b38bff' : null,
    accentPos: [0, 0, 1.2],
    accentPower: 3,
  });
}

/* ================================================================== */
/* ANIMAZIONI DI LANCIO (icone)                                        */
/* ================================================================== */
const glowMat = (c, k = 1.8, extra = {}) => new THREE.MeshStandardMaterial({ color: color(c), emissive: color(c), emissiveIntensity: k, roughness: 0.4, ...extra });

function dotsAlong(curve, n, r, mat, fade = true) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * (fade ? 0.4 + t * 0.6 : 1), 12, 10), mat);
    m.position.copy(curve.getPoint(t));
    g.add(m);
  }
  return g;
}

function rollModel(style) {
  const g = new THREE.Group();
  const die = miniDie(0.9);
  die.position.set(0, 0.75, 0);
  die.rotation.set(0.5, 0.6, 0.25);
  // scie e linee di velocità azzurro-grigie: si vedono anche sulle caselle bianche
  const white = phys({ color: color('#8fa6d6'), roughness: 0.3, clearcoat: 1, emissive: color('#5a78c0'), emissiveIntensity: 0.25 });
  switch (style) {
    case 'bounce': {
      die.position.set(0.5, 1.45, 0);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.5, 0.15, 0), new THREE.Vector3(-0.6, 2.2, 0), new THREE.Vector3(0.3, 1.2, 0));
      g.add(dotsAlong(curve, 9, 0.07, white));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 10, 40), white);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1, 1, 0.6);
      ring.position.set(-1.5, 0.03, 0);
      g.add(ring);
      break;
    }
    case 'hop': {
      die.position.set(0.7, 0.9, 0);
      for (const [a, b] of [
        [-1.6, -0.6],
        [-0.6, 0.3],
      ]) {
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a, 0.1, 0), new THREE.Vector3((a + b) / 2, 1.1, 0), new THREE.Vector3(b, 0.1, 0));
        g.add(dotsAlong(curve, 7, 0.055, white, false));
      }
      break;
    }
    case 'bubbles': {
      const bub = (r, x, y, z) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), phys({ color: color('#dff6ff'), roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 700], clearcoat: 1, specularIntensity: 1 }));
        m.position.set(x, y, z);
        m.userData.noShadow = true;
        return m;
      };
      g.add(bub(0.95, 0, 0.8, 0), bub(0.25, 1.05, 1.6, 0.2), bub(0.18, -1.0, 1.5, 0.3), bub(0.14, 0.9, 0.3, 0.6), bub(0.1, -0.8, 0.4, 0.7));
      die.scale.setScalar(0.85);
      die.position.y = 0.8;
      break;
    }
    case 'tornado': {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const a = t * Math.PI * 7;
        const r = 0.25 + t * 0.95;
        pts.push(new THREE.Vector3(Math.cos(a) * r, t * 2.3, Math.sin(a) * r));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.045, 8), phys({ color: color('#9fc4ec'), roughness: 0.35, transparent: true, opacity: 0.9, clearcoat: 1 }));
      g.add(tube);
      die.position.y = 1.3;
      die.scale.setScalar(0.7);
      break;
    }
    case 'confetti': {
      const r = seeded(33);
      const cols = ['#ff3d7f', '#ffd23f', '#2fd0ff', '#56ff9e', '#a54dff', '#ff7a1a'];
      for (let i = 0; i < 46; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.012), phys({ color: color(cols[i % cols.length]), roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide }));
        const a = r() * Math.PI * 2;
        const rad = 0.7 + r() * 1.0;
        m.position.set(Math.cos(a) * rad, 0.3 + r() * 2.1, Math.sin(a) * rad * 0.6);
        m.rotation.set(r() * 6, r() * 6, r() * 6);
        g.add(m);
      }
      break;
    }
    case 'ghost': {
      for (let i = 1; i <= 2; i++) {
        const c = miniDie(0.9, { opacity: 0.45 - i * 0.15, emissive: '#9fd8ff' });
        c.position.set(-0.75 * i, 0.75 + i * 0.25, -0.2 * i);
        c.rotation.set(0.5 - i * 0.3, 0.6 - i * 0.4, 0.25);
        c.userData.noShadow = true;
        g.add(c);
      }
      die.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.85;
        m.emissive = color('#bfe6ff');
        m.emissiveIntensity = 0.35;
      });
      break;
    }
    case 'rocket': {
      die.position.y = 1.35;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 24), glowMat('#ff5a00', 1.1));
      flame.rotation.x = Math.PI;
      flame.position.y = 0.55;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.6, 20), glowMat('#ffc400', 1.3));
      inner.rotation.x = Math.PI;
      inner.position.y = 0.66;
      flame.userData.noShadow = true;
      inner.userData.noShadow = true;
      g.add(flame, inner);
      const smoke = phys({ color: color('#f3f3f7'), roughness: 0.9 });
      [
        [-0.45, 0.18, 0.2, 0.28],
        [0.4, 0.15, 0.1, 0.3],
        [0, 0.12, 0.45, 0.24],
        [-0.15, 0.2, -0.35, 0.22],
      ].forEach(([x, y, z, s]) => {
        const p = new THREE.Mesh(new THREE.SphereGeometry(s, 20, 16), smoke);
        p.position.set(x, y, z);
        g.add(p);
      });
      break;
    }
    case 'meteor': {
      die.position.set(0.55, 0.65, 0);
      // scia di fuoco: stretta lontano, larga vicino al dado
      const trail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 24, 1, true), glowMat('#ff4a00', 0.9, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      trail.position.set(-0.3, 1.5, 0);
      trail.rotation.z = Math.PI / 4;
      trail.userData.noShadow = true;
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.8, 20, 1, true), glowMat('#ffa800', 1.1, { transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      core.position.set(-0.09, 1.29, 0.05);
      core.rotation.z = Math.PI / 4;
      core.userData.noShadow = true;
      g.add(trail, core);
      break;
    }
    case 'lightning': {
      const s = new THREE.Shape();
      const P = [
        [0.05, 2.6],
        [0.55, 2.6],
        [0.25, 1.75],
        [0.62, 1.75],
        [-0.15, 0.6],
        [0.08, 1.45],
        [-0.3, 1.45],
      ];
      s.moveTo(...P[0]);
      P.slice(1).forEach((p) => s.lineTo(...p));
      s.closePath();
      const bolt = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), glowMat('#ffe14d', 1.6));
      bolt.position.set(-0.75, 0.1, 0);
      g.add(bolt);
      die.position.set(0.55, 0.5, 0.1);
      break;
    }
    case 'glitch': {
      const ghostCopy = (c, dx) => {
        const m = miniDie(0.9, { opacity: 0.55, emissive: c });
        m.position.set(dx, 0.75, -0.05);
        m.rotation.copy(die.rotation);
        m.material.forEach((mm) => {
          mm.color = color(c);
          mm.blending = THREE.AdditiveBlending;
          mm.depthWrite = false;
        });
        m.userData.noShadow = true;
        return m;
      };
      g.add(ghostCopy('#ff2a5a', -0.16), ghostCopy('#20e3ff', 0.16));
      const r = seeded(5);
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.3 + r() * 0.8, 0.05, 0.05), glowMat(r() > 0.5 ? '#20e3ff' : '#ff3d7f', 1.5));
        b.position.set((r() - 0.5) * 2.2, 0.2 + r() * 1.8, 0.6);
        b.userData.noShadow = true;
        g.add(b);
      }
      break;
    }
    case 'portal': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 20, 80), glowMat('#a54dff', 1.4));
      ring.position.set(0, 1.15, -0.2);
      const c = makeCanvas(256, 256);
      const cg = c.getContext('2d');
      const rg = cg.createRadialGradient(128, 128, 4, 128, 128, 128);
      rg.addColorStop(0, '#ffffff');
      rg.addColorStop(0.3, '#2fd0ff');
      rg.addColorStop(0.7, '#5a1fbf');
      rg.addColorStop(1, '#1a0636');
      cg.fillStyle = rg;
      cg.fillRect(0, 0, 256, 256);
      cg.strokeStyle = 'rgba(255,255,255,0.4)';
      cg.lineWidth = 6;
      for (let k = 0; k < 5; k++) {
        cg.beginPath();
        for (let t = 0; t < 1; t += 0.01) {
          const a = t * Math.PI * 3 + (k * Math.PI * 2) / 5;
          cg.lineTo(128 + Math.cos(a) * t * 128, 128 + Math.sin(a) * t * 128);
        }
        cg.stroke();
      }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 48), new THREE.MeshBasicMaterial({ map: tex(c) }));
      disc.position.copy(ring.position);
      disc.position.z -= 0.01;
      disc.userData.noShadow = true;
      g.add(ring, disc);
      die.position.set(0.45, 0.9, 0.5);
      die.scale.setScalar(0.75);
      break;
    }
    case 'stardust': {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.07 : 0.17;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      star.closePath();
      const sg = new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-1.6, 2.2, -0.2), new THREE.Vector3(-0.9, 0.9, 0.2), new THREE.Vector3(0.1, 0.9, 0.1));
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const m = new THREE.Mesh(sg, phys({ color: color('#ffd23f'), metalness: 0.9, roughness: 0.2, emissive: color('#ffb400'), emissiveIntensity: 0.5 }));
        m.position.copy(curve.getPoint(t));
        m.scale.setScalar(0.5 + t * 0.7);
        m.rotation.z = t * 2;
        g.add(m);
      }
      die.position.set(0.7, 0.75, 0);
      break;
    }
    case 'rainbow': {
      const cols = ['#ff4d4d', '#ffa64d', '#ffe14d', '#59e36b', '#4db8ff', '#9b6bff'];
      cols.forEach((c, i) => {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(1.5 - i * 0.12, 0.06, 12, 64, Math.PI), phys({ color: color(c), roughness: 0.3, clearcoat: 1, emissive: color(c), emissiveIntensity: 0.25 }));
        arc.position.set(-0.3, 0.05, -0.3);
        g.add(arc);
      });
      die.position.set(1.15, 0.45, 0.2);
      die.scale.setScalar(0.7);
      break;
    }
    case 'blackhole': {
      const hole = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 30), phys({ color: color('#000000'), roughness: 0.2, clearcoat: 1 }));
      hole.position.set(-0.3, 1.1, -0.2);
      const c = makeCanvas(256, 256);
      const cg = c.getContext('2d');
      const rg = cg.createRadialGradient(128, 128, 40, 128, 128, 128);
      rg.addColorStop(0, 'rgba(255,240,200,1)');
      rg.addColorStop(0.35, 'rgba(255,140,40,1)');
      rg.addColorStop(0.7, 'rgba(140,60,255,0.8)');
      rg.addColorStop(1, 'rgba(40,10,80,0)');
      cg.fillStyle = rg;
      cg.fillRect(0, 0, 256, 256);
      const disk = new THREE.Mesh(new THREE.RingGeometry(0.62, 1.45, 64), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      disk.position.copy(hole.position);
      disk.rotation.x = -1.2;
      disk.rotation.y = 0.2;
      disk.userData.noShadow = true;
      g.add(disk, hole);
      die.position.set(0.95, 0.5, 0.45);
      die.scale.setScalar(0.55);
      break;
    }
    default: {
      // classico: dado in volo con le linee di velocità
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.7 - i * 0.12, 4, 10), white);
        l.rotation.z = Math.PI / 2 + 0.35;
        l.position.set(-0.95 - i * 0.12, 1.15 - i * 0.28, -0.1);
        g.add(l);
      }
    }
  }
  g.add(die);
  return g;
}

export function rollThumb(style, size = 96) {
  return thumb(`roll:${style}`, size, () => rollModel(style), {
    cam: { fov: 26, elev: 0.3, azim: 0.32, pad: style === 'tornado' ? 1.04 : 0.92, lift: style === 'tornado' ? 0.15 : 0 },
    groundY: 0,
    shadow: 0.25,
    accent: { meteor: '#ff7a1a', rocket: '#ff8a1a', lightning: '#ffe14d', portal: '#a54dff', blackhole: '#ff8a2a', glitch: '#20e3ff' }[style] || null,
    accentPos: [0, 1.4, 1.2],
    accentPower: 5,
  });
}

/* ================================================================== */
/* CASSE                                                               */
/* ================================================================== */
const CHEST_STYLE = {
  daily: { wood: ['#3dbb6e', '#1f7a44'], metal: '#ffd23f', metalRough: 0.25, gem: null, ribbon: '#ffe14d' },
  small: { wood: ['#b9773f', '#6d3f18'], metal: '#9aa3b5', metalRough: 0.35, gem: null },
  medium: { wood: ['#3d8bff', '#1d55b0'], metal: '#e3e8f0', metalRough: 0.2, gem: '#2fd0ff' },
  large: { wood: ['#a54dff', '#5e1fa8'], metal: '#ffc83a', metalRough: 0.18, gem: '#ff3d7f' },
};

function chestModel(type) {
  const st = CHEST_STYLE[type] || CHEST_STYLE.small;
  const g = new THREE.Group();
  const W = 1.7;
  const D = 1.1;
  const H = 0.85;
  const woodTex = tex(woodCanvas(st.wood[0], st.wood[1], { w: 512, h: 256, seed: type.length * 7, planks: 4 }));
  const woodMat = phys({ map: woodTex, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const metal = phys({ color: color(st.metal), metalness: 1, roughness: st.metalRough, clearcoat: 0.4 });
  // corpo
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.06), woodMat);
  body.position.y = H / 2;
  g.add(body);
  // coperchio a botte
  const lid = new THREE.Group();
  // semicilindro (con i tappi a mezzaluna) sdraiato lungo X, parte curva in alto
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 40, 1, false, 0, Math.PI), woodMat);
  shell.rotation.set(0, 0, Math.PI / 2);
  lid.add(shell);
  lid.position.y = H;
  g.add(lid);
  // fasce di metallo sul corpo e sul coperchio
  for (const x of [-W * 0.32, W * 0.32]) {
    const band = new THREE.Mesh(new RoundedBoxGeometry(0.16, H + 0.02, D + 0.04, 2, 0.02), metal);
    band.position.set(x, H / 2, 0);
    g.add(band);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.015, 0.035, 10, 40, Math.PI), metal);
    arc.rotation.y = Math.PI / 2;
    arc.scale.set(1, 1, 2.2);
    arc.position.set(x, H, 0);
    g.add(arc);
  }
  // angoli
  for (const x of [-W / 2, W / 2])
    for (const z of [-D / 2, D / 2]) {
      const k = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.16, 2, 0.04), metal);
      k.position.set(x, 0.08, z);
      g.add(k);
    }
  // bordo del coperchio
  const rimBand = new THREE.Mesh(new RoundedBoxGeometry(W + 0.04, 0.09, D + 0.04, 2, 0.03), metal);
  rimBand.position.y = H;
  g.add(rimBand);
  // serratura
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.42, 0.08, 3, 0.05), metal);
  plate.position.set(0, H - 0.05, D / 2 + 0.03);
  g.add(plate);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16), phys({ color: color('#1a1210'), roughness: 0.6 }));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, H - 0.1, D / 2 + 0.075);
  g.add(hole);
  if (st.gem) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), phys({ color: color(st.gem), roughness: 0.03, transmission: 0.55, thickness: 0.3, ior: 2.2, clearcoat: 1, emissive: color(st.gem), emissiveIntensity: 0.35 }));
    gem.scale.set(1, 1.2, 0.6);
    gem.position.set(0, H + 0.12, D / 2 + 0.06);
    g.add(gem);
    if (type === 'large')
      for (const x of [-W * 0.32, W * 0.32]) {
        const s = gem.clone();
        s.scale.multiplyScalar(0.6);
        s.position.set(x, H * 0.5, D / 2 + 0.05);
        g.add(s);
      }
  }
  if (st.ribbon) {
    const rib = phys({ color: color(st.ribbon), roughness: 0.35, clearcoat: 1, sheen: 0.5 });
    const strap = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.03, 0.05, 8, 40, Math.PI), rib);
    strap.rotation.y = Math.PI / 2;
    strap.scale.set(1, 1, 3);
    strap.position.set(0, H, 0);
    g.add(strap);
    const vert = new THREE.Mesh(new THREE.BoxGeometry(0.15, H, D + 0.06), rib);
    vert.position.set(0, H / 2, 0);
    g.add(vert);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 10, 28), rib);
      loop.position.set(s * 0.17, H + D / 2 + 0.12, 0);
      loop.rotation.set(0.3, s * 0.5, s * 0.6);
      loop.scale.set(1.3, 0.85, 1);
      g.add(loop);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), rib);
    knot.position.set(0, H + D / 2 + 0.08, 0);
    g.add(knot);
  }
  g.rotation.y = -0.18;
  return g;
}

export function chestThumb(type, size = 96) {
  return thumb(`chest:${type}`, size, () => chestModel(type), {
    cam: { fov: 24, elev: 0.36, azim: 0.36, pad: 0.84 },
    shadow: 0.32,
    accent: type === 'large' ? '#ffcf5a' : type === 'medium' ? '#9fd8ff' : null,
    accentPower: 3,
  });
}

/* ================================================================== */
/* registrazione e cornici vere                                        */
/* ================================================================== */
const FRAMES = ['basic', 'wood', 'silver', 'gold', 'flowers', 'flame', 'frost', 'neon', 'rainbow', 'cosmic'];
let framesInstalled = false;

/** Anelli 3D sopra tutte le cornici degli avatar (.av-frame f-*). */
async function installFrames() {
  if (framesInstalled) return;
  framesInstalled = true;
  try {
    const urls = [];
    for (const f of FRAMES) urls.push([f, await frameThumb(f, 200)]);
    const css = urls.map(([f, u]) => `.frames3d .av-frame.f-${f}::after{background-image:url("${u}")}`).join('\n');
    const style = document.createElement('style');
    style.dataset.frames3d = '';
    style.textContent = css;
    document.head.append(style);
    document.documentElement.classList.add('frames3d');
  } catch {
    framesInstalled = false;
  }
}

/* riflesso delle carte che segue il dito (solo CSS: funziona anche senza WebGL) */
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target?.closest?.('.card-face.big, .scratch-card');
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      el.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    },
    { passive: true },
  );
}

if (typeof document !== 'undefined' && has3D()) {
  registerArt('card', (key, size) => cardThumb(key, size));
  registerArt('table', (key, size) => tableThumb(key, size));
  registerArt('roll', (key, size) => rollThumb(key, size));
  registerArt('chest', (key, size) => chestThumb(key, size));
  registerArt('frame', (key, size) => frameThumb(key, size));
  setTimeout(installFrames, 400);
}

export { hexA };

/**
 * Attrezzi per l'avatar 3D: materiali PBR in stile "giocattolo" (pelle, stoffa,
 * pelle conciata, gomma, plastica, metallo, vetro, luce), texture disegnate al
 * volo (righe, quadri, mimetico, fiori, stelle…) e geometrie riusate.
 * Tutto è in cache: le immagini dei vestiti si disegnano tante volte.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ---------------- proporzioni del personaggio (unità del mondo) ---------------- */
export const BODY = {
  head: { y: 2.42, r: 0.7, sx: 1, sy: 0.96, sz: 0.94 },
  neck: { y0: 1.74, y1: 1.98, r: 0.13 },
  torso: { y0: 0.92, y1: 1.88, depth: 0.74 },
  shoulder: { x: 0.43, y: 1.66 },
  wrist: { x: 0.6, y: 1.0 },
  hip: { x: 0.2, y: 1.0 },
  ankle: { y: 0.2 },
  leg: { r: 0.155 },
  arm: { r: 0.115 },
};

/* ---------------- cache ---------------- */
const cache = new Map();
const keep = (o) => {
  // segnato come condiviso: disposeScene non lo libera
  if (o && o.isTexture) o.userData.shared = true;
  return o;
};
export function cached(key, make) {
  let v = cache.get(key);
  if (!v) {
    v = make();
    cache.set(key, v);
  }
  return v;
}

/* ---------------- colori ---------------- */
export const col = (c) => new THREE.Color(c);
export function shade(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k)));
}
export function hexOf(c) {
  return `#${new THREE.Color(c).getHexString()}`;
}

/* ---------------- materiali ---------------- */
const M = (key, make) => cached(`m:${key}`, make);

export function skinMat(tone) {
  return M(`skin${tone}`, () => {
    const c = col(tone);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.58,
      sheen: 0.55,
      sheenColor: new THREE.Color('#ffb59c'),
      sheenRoughness: 0.5,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
    });
  });
}

/** Stoffa: opaca con il "velluto" (sheen) che illumina i bordi. */
export function fabric(color, { map = null, key = '', emissiveMap = null, emissive = null, sheen = 1 } = {}) {
  return M(`fab${hexOf(color)}${key}`, () => {
    const c = col(color);
    return new THREE.MeshPhysicalMaterial({
      color: map ? 0xffffff : c,
      map,
      roughness: 0.82,
      sheen,
      sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.55),
      sheenRoughness: 0.45,
      emissiveMap,
      emissive: emissive ? col(emissive) : new THREE.Color(0),
      emissiveIntensity: emissive ? 1.4 : 0,
    });
  });
}

export function leather(color) {
  return M(`lea${hexOf(color)}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.32, sheen: 0.3, sheenColor: shade(color, 1.8) }));
}

export function rubber(color) {
  return M(`rub${hexOf(color)}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.62, clearcoat: 0.15 }));
}

/** Plastica lucida da giocattolo. */
export function plastic(color, gloss = 0.7) {
  return M(`pla${hexOf(color)}${gloss}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.3, clearcoat: gloss, clearcoatRoughness: 0.12 }));
}

export function metal(color, rough = 0.22) {
  return M(`met${hexOf(color)}${rough}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), metalness: 1, roughness: rough, clearcoat: 0.4, clearcoatRoughness: 0.1, envMapIntensity: 1.35 }));
}

export function glass(color = '#cfe8ff', opacity = 0.35) {
  return M(`gla${hexOf(color)}${opacity}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.04, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, depthWrite: false }));
}

/** Lucido scuro (lenti degli occhiali da sole, visiera). */
export function gloss(color) {
  return M(`glo${hexOf(color)}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }));
}

/** Luce propria (neon, lava, laser). */
export function glow(color, intensity = 2.2, opacity = 1) {
  return M(`glw${hexOf(color)}${intensity}${opacity}`, () => {
    const m = new THREE.MeshStandardMaterial({ color: col(color), emissive: col(color), emissiveIntensity: intensity, roughness: 0.4, toneMapped: false });
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
    }
    return m;
  });
}

/** Alone morbido (sprite additivo) per fuoco, aureole, effetti cosmici. */
export function haloSprite(color, size = 1, opacity = 0.75) {
  const tex = cached('t:halo', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return keep(new THREE.CanvasTexture(c));
  });
  const m = M(`spr${hexOf(color)}${opacity}`, () => new THREE.SpriteMaterial({ map: tex, color: col(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

/** Iridescente (effetto cosmico): cambia colore con l'angolo. */
export function cosmic(color, emissive = null) {
  return M(`cos${hexOf(color)}${emissive || ''}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: col(color),
      roughness: 0.25,
      metalness: 0.35,
      iridescence: 1,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [200, 900],
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: emissive ? col(emissive) : col(color),
      emissiveIntensity: emissive ? 0.6 : 0.25,
    }),
  );
}

/** Materiale per un oggetto in base al suo effetto (fx) del catalogo. */
export function fxMat(it, color, base = 'fabric') {
  if (it?.fx === 'shine') return metal(color, 0.18);
  if (it?.fx === 'cosmic') return cosmic(color, it.c2);
  if (it?.fx === 'glow') return M(`fxg${hexOf(color)}${base}`, () => new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.3, clearcoat: 0.8, emissive: col(color), emissiveIntensity: 0.55 }));
  if (base === 'leather') return leather(color);
  if (base === 'plastic') return plastic(color);
  if (base === 'rubber') return rubber(color);
  if (base === 'metal') return metal(color);
  return fabric(color);
}

/* ---------------- texture disegnate ---------------- */
function canvasTex(key, w, h, draw, { repeat = null, color = true } = {}) {
  return cached(`t:${key}`, () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(...repeat);
    }
    return keep(t);
  });
}

/** Trama leggera di stoffa sopra un colore pieno. */
function weave(g, w, h, base, k = 0.06) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = k;
  for (let y = 0; y < h; y += 2) {
    g.fillStyle = y % 4 ? '#000' : '#fff';
    g.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 2) {
    g.fillStyle = x % 4 ? '#000' : '#fff';
    g.fillRect(x, 0, 1, h);
  }
  g.globalAlpha = 1;
}

export const TEX = {
  plain: (c, k = 0.05) => canvasTex(`plain${c}${k}`, 64, 64, (g, w, h) => weave(g, w, h, c, k), { repeat: [6, 6] }),
  stripes: (c1, c2) =>
    canvasTex(`str${c1}${c2}`, 64, 256, (g, w, h) => {
      weave(g, w, h, c1);
      g.fillStyle = c2;
      for (let y = 10; y < h; y += 42) g.fillRect(0, y, w, 18);
    }),
  plaid: (c1, c2) =>
    canvasTex(
      `pla${c1}${c2}`,
      128,
      128,
      (g, w, h) => {
        weave(g, w, h, c1);
        g.globalAlpha = 0.55;
        g.fillStyle = c2;
        for (let i = 0; i < w; i += 32) {
          g.fillRect(i + 8, 0, 10, h);
          g.fillRect(0, i + 8, w, 10);
        }
        g.globalAlpha = 0.35;
        g.fillStyle = '#ffe14d';
        for (let i = 0; i < w; i += 32) {
          g.fillRect(i + 24, 0, 2, h);
          g.fillRect(0, i + 24, w, 2);
        }
        g.globalAlpha = 1;
      },
      { repeat: [3, 3] },
    ),
  camo: (c1, c2) =>
    canvasTex(
      `cam${c1}${c2}`,
      128,
      128,
      (g, w, h) => {
        weave(g, w, h, c1);
        const blobs = [c2, hexOf(shade(c1, 1.35)), '#2b2a1a'];
        let s = 7;
        const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 26; i++) {
          g.fillStyle = blobs[i % 3];
          g.beginPath();
          const x = r() * w;
          const y = r() * h;
          for (let a = 0; a < 7; a++) {
            const ang = (a / 7) * Math.PI * 2;
            const rad = 6 + r() * 12;
            g.lineTo(x + Math.cos(ang) * rad * 1.4, y + Math.sin(ang) * rad);
          }
          g.fill();
        }
      },
      { repeat: [2, 2] },
    ),
  hawaii: (c1, c2) =>
    canvasTex(
      `haw${c1}${c2}`,
      128,
      128,
      (g, w, h) => {
        weave(g, w, h, c1);
        const flower = (x, y, r, c) => {
          g.fillStyle = c;
          for (let a = 0; a < 5; a++) {
            g.beginPath();
            g.ellipse(x + Math.cos((a / 5) * 6.283) * r * 0.6, y + Math.sin((a / 5) * 6.283) * r * 0.6, r * 0.55, r * 0.38, (a / 5) * 6.283, 0, 6.283);
            g.fill();
          }
          g.fillStyle = '#ffe14d';
          g.beginPath();
          g.arc(x, y, r * 0.25, 0, 6.283);
          g.fill();
        };
        g.fillStyle = '#1f8a5a';
        for (const [x, y] of [[20, 100], [90, 30], [60, 80], [110, 110]]) {
          g.beginPath();
          g.ellipse(x, y, 16, 6, 0.7, 0, 6.283);
          g.fill();
        }
        flower(30, 30, 16, c2);
        flower(96, 78, 18, '#ffffff');
        flower(64, 116, 12, c2);
        flower(6, 76, 12, '#ffd23f');
        flower(118, 8, 10, '#ffffff');
      },
      { repeat: [2, 2] },
    ),
  stars: (c1, c2) =>
    canvasTex(
      `sta${c1}${c2}`,
      128,
      128,
      (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, c1);
        gr.addColorStop(1, hexOf(shade(c1, 1.5)));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const star = (x, y, r) => {
          g.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * 6.283 - Math.PI / 2;
            const rr = i % 2 ? r * 0.45 : r;
            g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          g.fill();
        };
        g.fillStyle = c2;
        for (const [x, y, r] of [[20, 24, 9], [80, 18, 6], [56, 64, 11], [110, 70, 7], [24, 100, 7], [90, 112, 9], [118, 30, 4]]) star(x, y, r);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) g.fillRect((i * 53) % w, (i * 97) % h, 1.5, 1.5);
      },
      { repeat: [2, 2] },
    ),
  rainbow: () =>
    canvasTex('rainbow', 16, 256, (g, w, h) => {
      const cs = ['#9b6bff', '#4db8ff', '#59e36b', '#ffe14d', '#ffa64d', '#ff4d4d'];
      cs.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(0, (i / cs.length) * h, w, h / cs.length + 1);
      });
    }),
  /** crepe di lava: mappa dei colori e della luce */
  lava: (c1, c2, emissive = false) =>
    canvasTex(
      `lav${c1}${c2}${emissive}`,
      128,
      128,
      (g, w, h) => {
        g.fillStyle = emissive ? '#000' : c1;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = emissive ? '#fff' : c2;
        g.lineWidth = 4;
        g.lineCap = 'round';
        let s = 3;
        const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 9; i++) {
          g.beginPath();
          let x = r() * w;
          let y = r() * h;
          g.moveTo(x, y);
          for (let k = 0; k < 5; k++) {
            x += (r() - 0.5) * 40;
            y += r() * 26;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      },
      { repeat: [2, 2], color: !emissive },
    ),
  /** fiamme che salgono dall'orlo (per la maglia di fuoco) */
  flames: (c1, c2, emissive = false) =>
    canvasTex(`fla${c1}${c2}${emissive}`, 256, 256, (g, w, h) => {
      if (emissive) {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
      } else weave(g, w, h, c1);
      const gr = g.createLinearGradient(0, h, 0, h * 0.35);
      gr.addColorStop(0, emissive ? '#fff' : '#ffe14d');
      gr.addColorStop(0.5, emissive ? '#ddd' : c2);
      gr.addColorStop(1, emissive ? '#444' : '#d6283d');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, h);
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * w;
        const tip = h * (0.3 + ((i * 37) % 5) * 0.06);
        g.quadraticCurveTo(x - w / n / 2, h * 0.75, x - w / (n * 4), tip);
        g.quadraticCurveTo(x, h * 0.7, x + w / (n * 2), h * 0.78);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }),
  /** numero sul petto (maglia da calcio), centrato davanti */
  jersey: (c1, c2, text) =>
    canvasTex(`jer${c1}${c2}${text}`, 256, 256, (g, w, h) => {
      weave(g, w, h, c1);
      g.fillStyle = c2;
      g.font = 'bold 92px Fredoka, Arial Rounded MT Bold, Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 8;
      g.strokeStyle = hexOf(shade(c1, 0.6));
      g.strokeText(text, w * 0.5, h * 0.52);
      g.fillText(text, w * 0.5, h * 0.52);
      // bordo delle maniche/fianchi
      g.fillStyle = c2;
      g.fillRect(0, h * 0.08, w, 6);
    }),
  /** veste cosmica: cielo stellato con nebulosa */
  galaxy: (c1, c2) =>
    canvasTex(`gal${c1}${c2}`, 256, 256, (g, w, h) => {
      g.fillStyle = c1;
      g.fillRect(0, 0, w, h);
      for (const [x, y, r, c] of [[60, 80, 90, c2], [190, 170, 110, '#ff3dbb'], [120, 230, 70, '#7a4dff']]) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `${c}aa`);
        gr.addColorStop(1, `${c}00`);
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
      g.fillStyle = '#fff';
      for (let i = 0; i < 120; i++) {
        const s = (i * 7) % 3 === 0 ? 2 : 1;
        g.fillRect((i * 151) % w, (i * 89 + i * i) % h, s, s);
      }
    }),
  /** pois (bandana) */
  dots: (c1, c2) =>
    canvasTex(
      `dot${c1}${c2}`,
      64,
      64,
      (g, w, h) => {
        weave(g, w, h, c1);
        g.fillStyle = c2;
        for (const [x, y] of [[16, 16], [48, 48], [48, 14], [16, 50]]) {
          g.beginPath();
          g.arc(x, y, 5, 0, 6.283);
          g.fill();
        }
      },
      { repeat: [4, 2] },
    ),
  /** jeans: cuciture arancioni */
  denim: (c1, c2) =>
    canvasTex(
      `den${c1}${c2}`,
      64,
      64,
      (g, w, h) => {
        g.fillStyle = c1;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.12;
        for (let i = -h; i < w; i += 3) {
          g.strokeStyle = i % 6 ? '#fff' : '#000';
          g.beginPath();
          g.moveTo(i, 0);
          g.lineTo(i + h, h);
          g.stroke();
        }
        g.globalAlpha = 1;
      },
      { repeat: [5, 5] },
    ),
  /** maglia lavorata (berretto) */
  knit: (c1) =>
    canvasTex(
      `kni${c1}`,
      64,
      64,
      (g, w, h) => {
        g.fillStyle = c1;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = hexOf(shade(c1, 0.7));
        g.lineWidth = 2;
        for (let x = 0; x < w; x += 8)
          for (let y = 0; y < h; y += 8) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + 4, y + 6);
            g.lineTo(x + 8, y);
            g.stroke();
          }
      },
      { repeat: [10, 4] },
    ),
  /** maschera da eroe / dorata: forma con i fori per gli occhi (trasparenza) */
  maskAlpha: () =>
    canvasTex(
      'maskA',
      256,
      128,
      (g, w, h) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(w * 0.08, h * 0.38);
        g.quadraticCurveTo(w * 0.3, h * 0.12, w * 0.5, h * 0.36);
        g.quadraticCurveTo(w * 0.7, h * 0.12, w * 0.92, h * 0.38);
        g.quadraticCurveTo(w * 0.94, h * 0.82, w * 0.7, h * 0.8);
        g.quadraticCurveTo(w * 0.56, h * 0.78, w * 0.5, h * 0.62);
        g.quadraticCurveTo(w * 0.44, h * 0.78, w * 0.3, h * 0.8);
        g.quadraticCurveTo(w * 0.06, h * 0.82, w * 0.08, h * 0.38);
        g.fill();
        // fori per gli occhi
        g.fillStyle = '#000';
        for (const x of [0.33, 0.67]) {
          g.beginPath();
          g.ellipse(w * x, h * 0.52, w * 0.085, h * 0.15, 0, 0, 6.283);
          g.fill();
        }
      },
      { color: false },
    ),
  /** barba: forma a ferro di cavallo attorno alla bocca */
  beardAlpha: () =>
    canvasTex(
      'beardA',
      256,
      256,
      (g, w, h) => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(w * 0.02, h * 0.05);
        g.quadraticCurveTo(w * 0.04, h * 0.9, w * 0.5, h * 0.98);
        g.quadraticCurveTo(w * 0.96, h * 0.9, w * 0.98, h * 0.05);
        g.lineTo(w * 0.86, h * 0.05);
        g.quadraticCurveTo(w * 0.8, h * 0.38, w * 0.66, h * 0.4);
        g.quadraticCurveTo(w * 0.5, h * 0.3, w * 0.34, h * 0.4);
        g.quadraticCurveTo(w * 0.2, h * 0.38, w * 0.14, h * 0.05);
        g.closePath();
        g.fill();
        // bocca libera
        g.fillStyle = '#000';
        g.beginPath();
        g.ellipse(w * 0.5, h * 0.52, w * 0.15, h * 0.08, 0, 0, 6.283);
        g.fill();
      },
      { color: false },
    ),
  /** ciuffi di peli: rilievo per barba e capelli */
  hairBump: () =>
    canvasTex(
      'hairB',
      128,
      128,
      (g, w, h) => {
        g.fillStyle = '#808080';
        g.fillRect(0, 0, w, h);
        let s = 11;
        const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
        for (let i = 0; i < 500; i++) {
          const x = r() * w;
          const y = r() * h;
          g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + (r() - 0.5) * 4, y + 10);
          g.stroke();
        }
      },
      { repeat: [3, 3], color: false },
    ),
};

/* ---------------- geometrie ---------------- */
export const G = {
  sphere: (seg = 32) => cached(`g:sph${seg}`, () => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75))),
  /** calotta: theta da 0 (polo nord) a len */
  dome: (len = Math.PI / 2, seg = 40) => cached(`g:dome${len}${seg}`, () => new THREE.SphereGeometry(1, seg, 20, 0, Math.PI * 2, 0, len)),
  /** fascia sferica davanti (per visiere, maschere, barba): phi centrata sul davanti */
  band: (phiLen, thStart, thLen, seg = 48) => cached(`g:band${phiLen}${thStart}${thLen}`, () => new THREE.SphereGeometry(1, seg, 24, Math.PI / 2 - phiLen / 2, phiLen, thStart, thLen)),
  cyl: (rt = 1, rb = 1, h = 1, seg = 32, open = false) => cached(`g:cyl${rt}${rb}${h}${seg}${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)),
  capsule: (r = 1, len = 1, seg = 24) => cached(`g:cap${r}${len}${seg}`, () => new THREE.CapsuleGeometry(r, len, 8, seg)),
  torus: (r = 1, tube = 0.1, arc = Math.PI * 2, seg = 48) => cached(`g:tor${r}${tube}${arc}${seg}`, () => new THREE.TorusGeometry(r, tube, 14, seg, arc)),
  cone: (r = 1, h = 1, seg = 32) => cached(`g:cone${r}${h}${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  box: (w, h, d, r = 0.05, seg = 3) => cached(`g:box${w}${h}${d}${r}`, () => new RoundedBoxGeometry(w, h, d, seg, r)),
  lathe: (key, pts, seg = 48) => cached(`g:lat${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg, Math.PI, Math.PI * 2)),
  tube: (key, points, r = 0.03, closed = false, seg = 40) => cached(`g:tube${key}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed), seg, r, 10, closed)),
  extrude: (key, shapeFn, depth = 0.05, bevel = 0.02) =>
    cached(`g:ext${key}`, () => {
      const g = new THREE.ExtrudeGeometry(shapeFn(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
      g.center();
      return g;
    }),
};

/** Mesh pronta: geometria, materiale, posizione, scala, rotazione, ombre. */
export function mesh(geo, mat, { p = [0, 0, 0], s = 1, r = [0, 0, 0], shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  if (typeof s === 'number') m.scale.setScalar(s);
  else m.scale.set(...s);
  m.rotation.set(...r);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

/** Arto (capsula) fra due punti. */
export function limb(a, b, r, mat, seg = 20) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(G.capsule(r, Math.max(0.001, len), seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Cilindro (tubo aperto o chiuso) fra due punti, raggio diverso alle estremità. */
export function segment(a, b, ra, rb, mat, seg = 24) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(G.cyl(rb, ra, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ---------------- posizioni sulla testa ---------------- */
const H = BODY.head;
/**
 * Punto sulla superficie della testa (ellissoide): yaw = gira a destra/sinistra
 * (0 = davanti), pitch = su/giù (0 = altezza degli occhi), out = distanza in più.
 */
export function onHead(yaw, pitch, out = 0) {
  const r = H.r + out;
  const x = Math.sin(yaw) * Math.cos(pitch) * r * H.sx;
  const y = Math.sin(pitch) * r * H.sy;
  const z = Math.cos(yaw) * Math.cos(pitch) * r * H.sz;
  const p = new THREE.Vector3(x, H.y + y, z);
  const n = new THREE.Vector3(x / (H.sx * H.sx), y / (H.sy * H.sy), z / (H.sz * H.sz)).normalize();
  return { p, n };
}

/** Mette un oggetto sulla testa orientato lungo la normale (asse +Z verso fuori). */
export function placeOnHead(obj, yaw, pitch, out = 0, roll = 0) {
  const { p, n } = onHead(yaw, pitch, out);
  obj.position.copy(p);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  if (roll) obj.rotateZ(roll);
  return obj;
}

/** Guscio che segue la testa (calotta/fascia) scalato come la testa. */
export function headShell(geo, mat, out = 0.02) {
  const m = new THREE.Mesh(geo, mat);
  const r = H.r + out;
  m.scale.set(r * H.sx, r * H.sy, r * H.sz);
  m.position.set(0, H.y, 0);
  m.castShadow = m.receiveShadow = true;
  return m;
}

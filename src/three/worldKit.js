/**
 * Mondi 3D: ordine dei temi, atmosfera (luci e colori) e texture dipinte del terreno.
 */
export const THEME_ORDER = ['pond', 'beach', 'forest', 'ice', 'sea', 'desert', 'chaos', 'castle', 'sky', 'throne'];

/** Luci e sfumature per tema. glows: bagliori dipinti sopra (x, y, r in frazioni della larghezza). */
export const MOODS = {
  pond: { bg: '#4fb7d6', key: 0xfff2d0, keyI: 2.7, sky: 0xe6fbff, ground: 0x3f7a4a, haze: 'rgba(255,250,210,0.30)', groundRough: 0.28, groundCoat: 0.6, vignette: 'rgba(8,40,50,0.40)', glows: [{ x: 0.12, y: 0.04, r: 0.7, c: 'rgba(255,244,190,0.35)' }] },
  beach: { bg: '#2f9fd8', key: 0xfff0c4, keyI: 3.0, sky: 0xfff6e0, ground: 0xd8a860, haze: 'rgba(255,240,200,0.28)', groundRough: 0.25, groundCoat: 0.6, vignette: 'rgba(90,40,10,0.30)', glows: [{ x: 0.95, y: 0.02, r: 0.8, c: 'rgba(255,230,150,0.40)' }] },
  forest: { bg: '#1c2a2c', key: 0xb8c8ff, keyI: 1.7, sky: 0x6a7ab8, ground: 0x1a2a20, hemiI: 0.6, rim: 0xa07aff, rimI: 1.2, env: 0.3, haze: 'rgba(150,130,220,0.34)', vignette: 'rgba(10,4,30,0.62)', exposure: 1.1, glows: [{ x: 0.5, y: 0.5, r: 0.9, c: 'rgba(120,90,200,0.14)' }] },
  ice: { bg: '#dff1ff', key: 0xffffff, keyI: 2.5, sky: 0xe8f6ff, ground: 0x9ab8e0, haze: 'rgba(255,255,255,0.40)', vignette: 'rgba(30,70,140,0.36)', glows: [{ x: 0.85, y: 0.05, r: 0.7, c: 'rgba(200,240,255,0.45)' }] },
  sea: { bg: '#1466b0', key: 0xfff0d0, keyI: 2.6, sky: 0xcfeaff, ground: 0x10407a, haze: 'rgba(200,235,255,0.26)', groundRough: 0.22, groundCoat: 0.7, vignette: 'rgba(4,20,60,0.50)' },
  desert: { bg: '#e0903c', key: 0xffe0a8, keyI: 3.0, sky: 0xffe6c0, ground: 0xb8501c, haze: 'rgba(255,200,120,0.34)', vignette: 'rgba(110,30,0,0.42)', glows: [{ x: 0.5, y: 0.92, r: 0.8, c: 'rgba(255,90,20,0.22)' }] },
  chaos: { bg: '#140a2e', key: 0xc8b0ff, keyI: 1.9, sky: 0x7a5ae0, ground: 0x10002a, hemiI: 0.7, rim: 0x2fe0ff, rimI: 1.6, env: 0.35, haze: 'rgba(90,40,200,0.30)', vignette: 'rgba(4,0,20,0.62)', exposure: 1.12, glows: [{ x: 0.2, y: 0.3, r: 0.6, c: 'rgba(47,208,255,0.12)' }, { x: 0.8, y: 0.7, r: 0.6, c: 'rgba(255,60,200,0.12)' }] },
  castle: { bg: '#1a1826', key: 0xa8b8ff, keyI: 1.8, sky: 0x5a62a0, ground: 0x14121c, hemiI: 0.6, rim: 0xff5a5a, rimI: 0.9, env: 0.3, haze: 'rgba(120,130,200,0.30)', vignette: 'rgba(6,2,14,0.66)', exposure: 1.1, glows: [{ x: 0.82, y: 0.06, r: 0.55, c: 'rgba(210,225,255,0.34)' }] },
  sky: { bg: '#6aa8ea', key: 0xfff6e0, keyI: 2.6, sky: 0xf0f8ff, ground: 0x7a8ad0, haze: 'rgba(255,255,255,0.30)', vignette: 'rgba(30,30,90,0.42)', glows: [{ x: 0.5, y: 0.93, r: 0.9, c: 'rgba(60,50,120,0.30)', op: 'multiply' }] },
  throne: { bg: '#3a1048', key: 0xffe8b8, keyI: 2.7, sky: 0xffe0f0, ground: 0x4a1030, rim: 0xffc040, rimI: 1.0, haze: 'rgba(255,210,120,0.24)', groundRough: 0.3, groundCoat: 0.7, vignette: 'rgba(30,0,30,0.52)', glows: [{ x: 0.5, y: 0.9, r: 0.8, c: 'rgba(255,200,80,0.24)' }] },
};

const TW = 512;
const TH = 1280;

function noise(ctx, rng, n, colors, rmin = 1, rmax = 3, alpha = 1) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.beginPath();
    ctx.arc(rng() * TW, rng() * TH, rmin + rng() * (rmax - rmin), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function patches(ctx, rng, n, colors, rmin, rmax, alpha = 0.35) {
  for (let i = 0; i < n; i++) {
    const x = rng() * TW;
    const y = rng() * TH;
    const r = rmin + rng() * (rmax - rmin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = colors[Math.floor(rng() * colors.length)];
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function ripples(ctx, rng, n, color, lw = 2.2) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rng() * TW;
    const y = rng() * TH;
    const w = 14 + rng() * 26;
    ctx.lineWidth = lw * (0.6 + rng() * 0.8);
    ctx.globalAlpha = 0.35 + rng() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 5 - rng() * 4, x + w, y);
    ctx.quadraticCurveTo(x + w * 1.5, y + 5, x + w * 2, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function vgrad(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);
}

const PAINT = {
  pond(ctx, r) {
    vgrad(ctx, [[0, '#7fdcea'], [0.5, '#4fbfdc'], [1, '#2f9ccc']]);
    patches(ctx, r, 26, ['#2a8fc0', '#39b0c8', '#8fe8ee'], 50, 150, 0.45);
    ripples(ctx, r, 150, '#d8fbff');
    noise(ctx, r, 140, ['#ffffff'], 0.8, 2, 0.5);
  },
  beach(ctx, r) {
    vgrad(ctx, [[0, '#58c8f0'], [0.5, '#2fa4e0'], [1, '#1f84cc']]);
    patches(ctx, r, 22, ['#8fe4ff', '#1c78c0'], 60, 160, 0.4);
    ripples(ctx, r, 170, '#eaffff', 2.6);
  },
  forest(ctx, r) {
    vgrad(ctx, [[0, '#2f4a3c'], [0.5, '#24402f'], [1, '#1c3226']]);
    patches(ctx, r, 40, ['#3a5a36', '#1a2a24', '#4a4a6a', '#2f5a4a'], 40, 130, 0.5);
    noise(ctx, r, 900, ['#3f6a3a', '#1a2a1e', '#5a7a4a', '#2a3a4a'], 1, 3.4, 0.7);
  },
  ice(ctx, r) {
    vgrad(ctx, [[0, '#f6fbff'], [0.5, '#e4f1ff'], [1, '#d2e6fb']]);
    patches(ctx, r, 34, ['#bcd8f6', '#ffffff', '#a8ccf0'], 50, 150, 0.5);
    noise(ctx, r, 500, ['#ffffff', '#c4dcf6'], 1, 3, 0.8);
  },
  sea(ctx, r) {
    vgrad(ctx, [[0, '#2f8fd8'], [0.5, '#1d6fc0'], [1, '#14509c']]);
    patches(ctx, r, 30, ['#0f3f88', '#3aa0e0', '#1a5cae'], 60, 170, 0.5);
    ripples(ctx, r, 230, '#cfeaff', 2.8);
    ripples(ctx, r, 60, '#ffffff', 3.4);
  },
  desert(ctx, r) {
    vgrad(ctx, [[0, '#f6c070'], [0.55, '#eea050'], [1, '#d87030']]);
    patches(ctx, r, 30, ['#ffd890', '#c86028', '#f0b060'], 60, 170, 0.45);
    ctx.strokeStyle = 'rgba(160,70,20,0.22)';
    ctx.lineWidth = 3;
    for (let y = 20; y < TH; y += 26 + r() * 22) {
      ctx.beginPath();
      ctx.moveTo(-10, y);
      for (let x = 0; x <= TW + 40; x += 40) ctx.quadraticCurveTo(x + 20, y - 8 - r() * 8, x + 40, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    noise(ctx, r, 700, ['#ffe0a0', '#c06828'], 0.8, 2.2, 0.6);
  },
  chaos(ctx, r) {
    vgrad(ctx, [[0, '#24104e'], [0.5, '#1a0a3c'], [1, '#12062c']]);
    patches(ctx, r, 26, ['#5a1ea8', '#0a2a6a', '#8a1a8a'], 60, 170, 0.45);
    ctx.lineWidth = 1.6;
    for (let x = 0; x < TW; x += 32) {
      ctx.strokeStyle = 'rgba(80,220,255,0.16)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TH);
      ctx.stroke();
    }
    for (let y = 0; y < TH; y += 39) {
      ctx.strokeStyle = 'rgba(255,90,220,0.14)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TW, y);
      ctx.stroke();
    }
    noise(ctx, r, 260, ['#ffffff', '#7ae8ff', '#ff9af0'], 0.6, 1.8, 0.8);
  },
  castle(ctx, r) {
    vgrad(ctx, [[0, '#3a3c50'], [0.5, '#2e3044'], [1, '#262838']]);
    // acciottolato
    for (let y = 0; y < TH; y += 24) {
      for (let x = (Math.floor(y / 24) % 2) * 14 - 14; x < TW; x += 28) {
        const k = r();
        ctx.fillStyle = k > 0.66 ? '#4a4c64' : k > 0.33 ? '#3c3e54' : '#34364a';
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, 24, 20, 7);
        ctx.fill();
      }
    }
    patches(ctx, r, 30, ['#2a4a30', '#1a1a28', '#3a5a3a'], 50, 140, 0.55);
  },
  sky(ctx, r) {
    vgrad(ctx, [[0, '#9ad0ff'], [0.45, '#78b4f4'], [1, '#5a7ad8']]);
    patches(ctx, r, 40, ['#ffffff', '#d8ecff'], 50, 150, 0.4);
    patches(ctx, r, 16, ['#4a5ac0'], 80, 200, 0.3);
  },
  throne(ctx, r) {
    const s = 64;
    for (let y = 0; y < TH; y += s) {
      for (let x = 0; x < TW; x += s) {
        const dark = (x / s + y / s) % 2 === 0;
        ctx.fillStyle = dark ? '#5a2070' : '#f2e2c8';
        ctx.fillRect(x, y, s, s);
        const g = ctx.createLinearGradient(x, y, x + s, y + s);
        g.addColorStop(0, 'rgba(255,255,255,0.22)');
        g.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.strokeStyle = 'rgba(255,200,80,0.8)';
    ctx.lineWidth = 3;
    for (let y = 0; y <= TH; y += s) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TW, y);
      ctx.stroke();
    }
    for (let x = 0; x <= TW; x += s) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TH);
      ctx.stroke();
    }
    patches(ctx, r, 18, ['#2a0a3a'], 80, 200, 0.35);
  },
};

export function paintGround(theme, rng) {
  const cv = document.createElement('canvas');
  cv.width = TW;
  cv.height = TH;
  const ctx = cv.getContext('2d');
  (PAINT[theme] || PAINT.pond)(ctx, rng);
  return cv;
}

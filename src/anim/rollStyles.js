/**
 * Stili di lancio sbloccabili: cambiano il salto del dado e aggiungono
 * particelle (bolle, scintille, fiamme…) attorno al dado che rotola.
 */
import { ms } from './animations.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Fotogrammi del salto (elemento .die-toss) per lo stile scelto. */
export function tossFrames(style, { entering, dx, lift }) {
  if (entering && !['meteor', 'portal', 'blackhole', 'ghost'].includes(style)) return null; // ingresso classico
  switch (style) {
    case 'bounce':
      return [
        { transform: 'translate(0,0) scale(1)', offset: 0 },
        { transform: `translate(${dx}px,-${lift * 1.7}px) scale(1.3)`, offset: 0.28 },
        { transform: 'translate(0,0) scale(1.08,.88)', offset: 0.5 },
        { transform: 'translate(0,-34px) scale(1.08)', offset: 0.64 },
        { transform: 'translate(0,0) scale(1.05,.92)', offset: 0.78 },
        { transform: 'translate(0,-10px) scale(1.02)', offset: 0.88 },
        { transform: 'translate(0,0) scale(1)', offset: 1 },
      ];
    case 'hop':
      return [0, 0.16, 0.32, 0.48, 0.64, 0.8, 1].map((o, k) => ({ transform: k % 2 ? `translate(${dx * (k / 6)}px,-${lift * 0.55}px) scale(1.1)` : 'translate(0,0) scale(1.03,.96)', offset: o }));
    case 'tornado':
      return [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0 },
        { transform: `translate(${dx}px,-${lift}px) scale(1.35) rotate(360deg)`, offset: 0.35 },
        { transform: 'translate(0,0) scale(1.03,.95) rotate(720deg)', offset: 0.65 },
        { transform: 'translate(0,-8px) scale(1.02) rotate(720deg)', offset: 0.8 },
        { transform: 'translate(0,0) scale(1) rotate(720deg)', offset: 1 },
      ];
    case 'ghost':
      return [
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate(${dx}px,-${lift}px) scale(1.25)`, opacity: 0.15, offset: 0.3 },
        { transform: `translate(${-dx}px,-${lift * 0.6}px) scale(1.15)`, opacity: 0.35, offset: 0.48 },
        { transform: 'translate(0,0) scale(1.02,.96)', opacity: 1, offset: 0.66 },
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 1 },
      ];
    case 'rocket':
      return [
        { transform: 'translate(0,0) scale(1)', offset: 0 },
        { transform: 'translate(0,6px) scale(1.1,.85)', offset: 0.1 },
        { transform: `translate(${dx * 0.3}px,-${lift * 2.4}px) scale(.9,1.2)`, offset: 0.38 },
        { transform: 'translate(0,0) scale(1.08,.9)', offset: 0.66 },
        { transform: 'translate(0,-8px) scale(1)', offset: 0.8 },
        { transform: 'translate(0,0) scale(1)', offset: 1 },
      ];
    case 'meteor':
      return [
        { transform: 'translate(120px,-190px) scale(1.4)', opacity: 0, offset: 0 },
        { transform: 'translate(60px,-95px) scale(1.25)', opacity: 1, offset: 0.25 },
        { transform: 'translate(0,0) scale(1.1,.86)', offset: 0.55 },
        { transform: 'translate(0,-14px) scale(1.04)', offset: 0.72 },
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 1 },
      ];
    case 'portal':
    case 'blackhole':
      return [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: entering ? 0 : 1, offset: 0 },
        { transform: `translate(0,-${lift * 0.4}px) scale(.05) rotate(${style === 'blackhole' ? 540 : 0}deg)`, opacity: 0.2, offset: 0.32 },
        { transform: `translate(0,-${lift * 0.5}px) scale(1.35) rotate(${style === 'blackhole' ? 720 : 0}deg)`, opacity: 1, offset: 0.55 },
        { transform: 'translate(0,0) scale(1.02,.95)', offset: 0.75 },
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 1 },
      ];
    case 'glitch':
      return [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1].map((o, k) => ({
        transform: k === 8 ? 'translate(0,0) scale(1)' : `translate(${rnd(-14, 14)}px,${-rnd(0, lift)}px) scale(${rnd(0.9, 1.3)})`,
        offset: o,
        easing: 'steps(1)',
      }));
    default:
      return null; // classic, bubbles, confetti, lightning, stardust, rainbow: salto classico + particelle
  }
}

const FX = {
  bubbles: { count: 9, cls: 'bubble', during: true },
  confetti: { count: 16, cls: 'confetti', land: true },
  rocket: { count: 10, cls: 'smoke', during: true },
  meteor: { count: 12, cls: 'flame', during: true },
  lightning: { count: 1, cls: 'bolt', land: true },
  stardust: { count: 12, cls: 'star', during: true },
  rainbow: { count: 12, cls: 'rainbow', during: true },
  portal: { count: 1, cls: 'portal', during: true },
  blackhole: { count: 1, cls: 'hole', during: true },
  glitch: { count: 3, cls: 'glitch', during: true },
  ghost: { count: 4, cls: 'wisp', during: true },
  tornado: { count: 6, cls: 'wind', during: true },
};

/**
 * Particelle attorno al dado (dentro lo slot del vassoio).
 * @param {string} style @param {HTMLElement} host slot del dado
 */
export function rollParticles(style, host, { delay = 0, duration = 950, landAt = 0.6 } = {}) {
  const fx = FX[style];
  if (!fx || !host) return;
  const start = ms(delay + (fx.land ? duration * landAt : 0));
  const life = ms(fx.land ? 700 : duration * 0.75);
  setTimeout(() => {
    for (let i = 0; i < fx.count; i++) {
      const p = document.createElement('i');
      p.className = `rfx rfx-${fx.cls}`;
      p.style.setProperty('--x', `${rnd(-30, 30).toFixed(0)}px`);
      p.style.setProperty('--y', `${rnd(-60, -10).toFixed(0)}px`);
      p.style.setProperty('--r', `${rnd(-200, 200).toFixed(0)}deg`);
      p.style.setProperty('--h', `${Math.floor(rnd(0, 360))}`);
      p.style.setProperty('--d', `${life}ms`);
      p.style.animationDelay = `${((i / fx.count) * life * (fx.during ? 0.6 : 0.1)).toFixed(0)}ms`;
      host.append(p);
      setTimeout(() => p.remove(), life * 1.7 + 50);
    }
  }, start);
}

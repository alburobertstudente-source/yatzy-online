/**
 * Effetti visivi di alto livello: scintille, coriandoli, banner del turno,
 * etichette delle combinazioni, bonus +35 e "+100 YATZY BONUS".
 */
import { play, ms, EASE, wait } from './animations.js';
import { h } from '../ui/dom.js';
import { ICONS } from '../ui/icons.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Esplosione di scintille centrata in (x, y) del layer. */
export function sparkle(layer, x, y, { colors = ['#fff', '#ffd54a'], count = 14, spread = 70, size = 9, duration = 700 } = {}) {
  const ring = h('div', { class: 'fx-ring' });
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  layer.append(ring);
  play(ring, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], {
    duration: duration * 0.8,
    easing: EASE.out,
  }).then(() => ring.remove());

  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r = spread * rnd(0.55, 1);
    const s = size * rnd(0.6, 1.2);
    const p = h('div', { class: i % 3 === 0 ? 'fx-star' : 'fx-dot', html: i % 3 === 0 ? ICONS.star : '' });
    p.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;color:${colors[i % colors.length]};background:${i % 3 === 0 ? 'none' : colors[i % colors.length]}`;
    layer.append(p);
    parts.push(
      play(
        p,
        [
          { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(1) rotate(${rnd(90, 270)}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.15}px), calc(-50% + ${Math.sin(a) * r * 1.15 + 10}px)) scale(.2) rotate(${rnd(270, 400)}deg)`, opacity: 0 },
        ],
        { duration: duration * rnd(0.85, 1.15), easing: EASE.out },
      ).then(() => p.remove()),
    );
  }
  return Promise.all(parts);
}

/** Pioggia di coriandoli dentro `layer` (larghezza/altezza del layer). */
export function confetti(layer, { colors, count = 60, duration = 2600, fromTop = true } = {}) {
  const w = layer.clientWidth || 390;
  const hgt = layer.clientHeight || 800;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const p = h('div', { class: 'confetti' });
    const c = colors[i % colors.length];
    const sw = rnd(6, 11);
    p.style.cssText = `left:${rnd(0, w)}px;top:${fromTop ? -20 : hgt * 0.45}px;width:${sw}px;height:${sw * rnd(1.3, 2)}px;background:${c};border-radius:${Math.random() < 0.3 ? '50%' : '2px'}`;
    layer.append(p);
    const drift = rnd(-80, 80);
    const fall = fromTop ? hgt + 40 : rnd(-hgt * 0.4, hgt * 0.5);
    pieces.push(
      play(
        p,
        fromTop
          ? [
              { transform: `perspective(400px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotate(0deg)`, opacity: 1 },
              { transform: `perspective(400px) translate3d(${drift * 0.5}px, ${fall * 0.5}px, ${rnd(-60, 60)}px) rotateX(${rnd(360, 900)}deg) rotateY(${rnd(180, 540)}deg) rotate(${rnd(180, 540)}deg)`, opacity: 1, offset: 0.5 },
              { transform: `perspective(400px) translate3d(${drift}px, ${fall}px, 0) rotateX(${rnd(900, 1800)}deg) rotateY(${rnd(540, 1080)}deg) rotate(${rnd(360, 1080)}deg)`, opacity: 0.9 },
            ]
          : [
              { transform: 'perspective(400px) translate(0,0) scale(.3)', opacity: 1 },
              { transform: `perspective(400px) translate(${drift * 1.6}px, ${-Math.abs(fall)}px) scale(1) rotateX(${rnd(300, 700)}deg) rotate(${rnd(200, 600)}deg)`, opacity: 1, offset: 0.45 },
              { transform: `perspective(400px) translate(${drift * 2}px, ${hgt * 0.6}px) rotateX(${rnd(900, 1500)}deg) rotate(${rnd(600, 1200)}deg)`, opacity: 0 },
            ],
        { duration: duration * rnd(0.7, 1.2), delay: rnd(0, fromTop ? 900 : 120), easing: fromTop ? 'cubic-bezier(.3,.1,.6,1)' : EASE.out },
      ).then(() => p.remove()),
    );
  }
  return Promise.all(pieces);
}

/** Etichetta breve sopra il vassoio (es. "SCALA GRANDE!"). */
export function toast(layer, text, { x, y, kind = '' } = {}) {
  const t = h('div', { class: `fx-toast ${kind}` }, text);
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  layer.append(t);
  return play(
    t,
    [
      { transform: 'translate(-50%, 10px) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -6px) scale(1.08)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%, -10px) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%, -26px) scale(.96)', opacity: 0 },
    ],
    { duration: 1300, easing: EASE.out },
  ).then(() => t.remove());
}

/** Banner centrale del cambio turno ("Tocca al Blu"). */
export async function turnBanner(host, { text, sub, color, rotated }) {
  const b = h(
    'div',
    { class: `turn-banner ${color}`, style: { transform: rotated ? 'rotate(180deg)' : '' } },
    h('div', { class: 'tb-inner' }, h('div', { class: 'tb-sub' }, sub), h('div', { class: 'tb-text' }, text)),
  );
  host.append(b);
  const inner = b.firstChild;
  await play(inner, [
    { transform: 'scale(.4) translateY(30px)', opacity: 0 },
    { transform: 'scale(1.08) translateY(0)', opacity: 1, offset: 0.65 },
    { transform: 'scale(1)', opacity: 1 },
  ], { duration: 460, easing: EASE.out });
  return {
    el: b,
    async hide() {
      await play(inner, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.85) translateY(-20px)', opacity: 0 }], {
        duration: 320,
        easing: EASE.inOut,
      });
      b.remove();
    },
  };
}

/** Animazione dedicata "+100 YATZY BONUS". */
export async function yatzyBonusBurst(layer, { x, y, color }) {
  const wrap = h(
    'div',
    { class: `yb-burst ${color}` },
    h('div', { class: 'yb-rays' }),
    h('div', { class: 'yb-plate' }, h('div', { class: 'yb-amount' }, '+100'), h('div', { class: 'yb-label' }, 'YATZY BONUS')),
  );
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;
  layer.append(wrap);
  const rays = wrap.querySelector('.yb-rays');
  play(rays, [{ transform: 'translate(-50%,-50%) rotate(0deg) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(40deg) scale(1)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-50%) rotate(160deg) scale(1.1)', opacity: 0 }], {
    duration: 1900,
    easing: 'linear',
  });
  const plate = wrap.querySelector('.yb-plate');
  await play(plate, [
    { transform: 'translate(-50%,-50%) scale(.2) rotate(-14deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.25) rotate(4deg)', opacity: 1, offset: 0.55 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-2deg)', opacity: 1 },
  ], { duration: 520, easing: EASE.out });
  sparkle(layer, x, y, { colors: ['#fff6c2', '#ffd23f', '#ffffff', '#ffb000'], count: 22, spread: 130, size: 12, duration: 900 });
  await wait(ms(900));
  return {
    el: wrap,
    /** Il bollino vola verso il bersaglio (la casella Yatzy) e sparisce. */
    async flyTo(tx, ty) {
      await play(plate, [
        { transform: 'translate(-50%,-50%) scale(1) rotate(-2deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx - x}px), calc(-50% + ${ty - y}px)) scale(.18) rotate(8deg)`, opacity: 0.9 },
      ], { duration: 520, easing: EASE.inOut });
      wrap.remove();
    },
  };
}

/** "+35 BONUS" che sale dall'anello del bonus superiore. */
export function upperBonusLabel(layer, { x, y, color }) {
  const el = h('div', { class: `ub-label ${color}` }, h('span', {}, '+35'), h('small', {}, 'BONUS'));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.append(el);
  return play(el, [
    { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
    { transform: 'translate(-50%,-110%) scale(1.15)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%,-140%) scale(1)', opacity: 1, offset: 0.8 },
    { transform: 'translate(-50%,-190%) scale(.9)', opacity: 0 },
  ], { duration: 1500, easing: EASE.out }).then(() => el.remove());
}

/** Grande scritta "YATZY!" quando escono 5 dadi uguali. */
export function yatzyFlash(layer, { x, y }) {
  const el = h('div', { class: 'yatzy-flash' }, 'YATZY!');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.append(el);
  return play(el, [
    { transform: 'translate(-50%,-50%) scale(.2) rotate(-10deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.2) rotate(3deg)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.75 },
    { transform: 'translate(-50%,-80%) scale(1.1) rotate(0deg)', opacity: 0 },
  ], { duration: 1500, easing: EASE.out }).then(() => el.remove());
}

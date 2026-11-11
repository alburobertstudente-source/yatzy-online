/**
 * Primitive di animazione (Web Animations API): dadi 3D, volo dei dadi,
 * conteggi, rotazione del tavolo. Solo transform/opacity per restare fluidi.
 */
import { TIMING } from '../config.js';
import { pipsSvg } from '../ui/icons.js';
import { h, wait } from '../ui/dom.js';
import { tossFrames, rollParticles } from './rollStyles.js';

export const ms = (t) => t / (TIMING.ANIM_SPEED || 1);

export const EASE = {
  out: 'cubic-bezier(.16,.84,.3,1)',
  inOut: 'cubic-bezier(.65,0,.35,1)',
  back: 'cubic-bezier(.34,1.56,.64,1)',
  settle: 'cubic-bezier(.12,.72,.22,1)',
};

/** Avvia un'animazione e restituisce una promessa che si risolve alla fine. */
export function play(el, keyframes, opts = {}) {
  if (!el?.animate) return Promise.resolve();
  const a = el.animate(keyframes, {
    duration: ms(opts.duration ?? 300),
    delay: ms(opts.delay ?? 0),
    easing: opts.easing ?? EASE.out,
    fill: opts.fill ?? 'both',
    iterations: opts.iterations ?? 1,
  });
  return a.finished.then(() => a, () => a);
}

/* ------------------------------------------------------------------ */
/* Dadi 3D                                                             */
/* ------------------------------------------------------------------ */

/** Rotazione del cubo che porta la faccia `v` verso lo spettatore. */
export const FACE_ROT = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const cubeTransform = ({ x, y, z }) => `rotateZ(${z}deg) rotateX(${x}deg) rotateY(${y}deg)`;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Prossimo angolo ≡ base (mod 360) con almeno `minTurns` giri in avanti. */
function spinTo(current, base, minTurns, dir = 1) {
  const norm = (n) => ((n % 360) + 360) % 360;
  let target = current + dir * minTurns * 360;
  const diff = norm(dir * (base - target));
  target += dir * diff;
  return target;
}

/** Imposta subito la faccia mostrata (senza animazione). */
export function setDieFace(die, value) {
  const cube = die.querySelector('.cube');
  const base = FACE_ROT[value] || FACE_ROT[1];
  const rot = { x: base.x, y: base.y, z: die._rot?.z ? (((die._rot.z % 360) + 360) % 360) : pick([0, 90, 180, 270]) };
  die._rot = rot;
  cube.style.transform = cubeTransform(rot);
  die.dataset.value = String(value);
}

/**
 * Animazione di lancio di un dado: salta, rotola su sé stesso e si ferma
 * ESATTAMENTE sulla faccia `value` (decisa prima dal motore).
 * @returns {Promise<void>} risolta quando il dado è fermo
 */
export function tumbleDie(die, value, { delay = 0, duration = 950, entering = false, onLand, style = 'classic' } = {}) {
  const cube = die.querySelector('.cube');
  const toss = die.querySelector('.die-toss');
  const shadow = die.querySelector('.die-shadow');
  const from = die._rot || { x: rnd(-40, 40), y: rnd(-40, 40), z: 0 };
  const base = FACE_ROT[value];
  const dirX = Math.random() < 0.5 ? -1 : 1;
  const dirY = Math.random() < 0.5 ? -1 : 1;
  const to = {
    x: spinTo(from.x, base.x, Math.random() < 0.5 ? 1 : 2, dirX),
    y: spinTo(from.y, base.y, Math.random() < 0.5 ? 1 : 2, dirY),
    z: spinTo(from.z, pick([0, 90, 180, 270]), 0, Math.random() < 0.5 ? -1 : 1),
  };
  die._rot = to;
  die.dataset.value = String(value);
  die.classList.add('is-rolling');

  const dx = rnd(-10, 10);
  const lift = rnd(40, 58);
  const tossFrames_ = entering
    ? [
        { transform: `translate(${rnd(-30, 30)}px, -150px) scale(1.55)`, opacity: 0, offset: 0 },
        { transform: `translate(${dx}px, -60px) scale(1.3)`, opacity: 1, offset: 0.25 },
        { transform: 'translate(0, 0) scale(1.02, .96)', offset: 0.6 },
        { transform: 'translate(0, -12px) scale(1.04)', offset: 0.74 },
        { transform: 'translate(0, 0) scale(1.02,.97)', offset: 0.87 },
        { transform: 'translate(0, -2px) scale(1)', offset: 0.94 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 1 },
      ]
    : [
        { transform: 'translate(0, 0) scale(1)', offset: 0 },
        { transform: `translate(${dx}px, -${lift}px) scale(1.24)`, offset: 0.3 },
        { transform: 'translate(0, 0) scale(1.03, .95)', offset: 0.6 },
        { transform: 'translate(0, -11px) scale(1.04)', offset: 0.73 },
        { transform: 'translate(0, 0) scale(1.02,.97)', offset: 0.86 },
        { transform: 'translate(0, -2px) scale(1)', offset: 0.93 },
        { transform: 'translate(0, 0) scale(1)', offset: 1 },
      ];
  const custom = style !== 'classic' ? tossFrames(style, { entering, dx, lift }) : null;
  if (custom) tossFrames_.splice(0, tossFrames_.length, ...custom);
  if (style !== 'classic') rollParticles(style, die.parentElement, { delay, duration });
  const shadowFrames = [
    { transform: 'scale(1)', opacity: entering ? 0 : 0.55, offset: 0 },
    { transform: 'scale(.55)', opacity: 0.25, offset: 0.3 },
    { transform: 'scale(1.05)', opacity: 0.6, offset: 0.6 },
    { transform: 'scale(.85)', opacity: 0.45, offset: 0.73 },
    { transform: 'scale(1)', opacity: 0.55, offset: 1 },
  ];
  const landAt = duration * 0.6;
  if (onLand) setTimeout(onLand, ms(delay + landAt));
  const p1 = play(toss, tossFrames_, { duration, delay, easing: 'linear', fill: 'none' });
  play(shadow, shadowFrames, { duration, delay, easing: 'linear', fill: 'none' });
  const p2 = play(cube, [{ transform: cubeTransform(from) }, { transform: cubeTransform(to) }], {
    duration: duration * 0.86,
    delay,
    easing: EASE.settle,
    fill: 'forwards',
  });
  return Promise.all([p1, p2]).then(([, a2]) => {
    // normalizza gli angoli (stesso aspetto, numeri piccoli)
    const n = (v) => ((v % 360) + 360) % 360;
    die._rot = { x: n(to.x), y: n(to.y), z: n(to.z) };
    cube.style.transform = cubeTransform(die._rot);
    a2?.cancel?.();
    die.classList.remove('is-rolling');
  });
}

/* ------------------------------------------------------------------ */
/* Volo dei dadi verso la casella                                      */
/* ------------------------------------------------------------------ */

/** Faccia piatta di un dado usata per il volo. */
export function flatDie(value, size) {
  return h('div', { class: 'fly-die', style: { width: `${size}px`, height: `${size}px` }, html: pipsSvg(value) });
}

/**
 * Fa volare una faccia di dado da `from` a `to` (rettangoli locali al layer fx).
 * @returns {Promise<void>} risolta all'arrivo
 */
export function flyDie(layer, value, from, to, { delay = 0, duration = 560, rotate = 360 } = {}) {
  const size = from.w;
  const el = flatDie(value, size);
  el.style.left = `${from.x}px`;
  el.style.top = `${from.y}px`;
  el.style.opacity = '0';
  layer.append(el);
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  const endScale = Math.max(0.25, (to.w * 0.55) / size);
  const arc = Math.min(-30, dy * 0.25 - 40);
  return play(
    el,
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.18}px, ${arc * 0.6}px) scale(1.12) rotate(${rotate * 0.2}deg)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${dx * 0.62}px, ${dy * 0.55 + arc}px) scale(${(1 + endScale) / 2}) rotate(${rotate * 0.65}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale}) rotate(${rotate}deg)`, opacity: 0.85, offset: 1 },
    ],
    { duration, delay, easing: EASE.inOut, fill: 'forwards' },
  ).then(() => {
    el.remove();
  });
}

/* ------------------------------------------------------------------ */
/* Numeri e piccoli effetti                                            */
/* ------------------------------------------------------------------ */

/** Conta da `from` a `to` aggiornando il testo di `el`. */
export function countUp(el, from, to, duration = 600) {
  return new Promise((resolve) => {
    const d = ms(duration);
    if (from === to || d <= 0) {
      el.textContent = String(to);
      resolve();
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / d);
      const e = 1 - (1 - k) ** 3;
      el.textContent = String(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export function pop(el, scale = 1.18, duration = 320) {
  return play(el, [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.4 }, { transform: 'scale(1)' }], {
    duration,
    easing: EASE.out,
    fill: 'none',
  });
}

export function shake(el, amount = 6, duration = 380) {
  return play(
    el,
    [0, -amount, amount, -amount * 0.7, amount * 0.5, -amount * 0.3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration, easing: 'linear', fill: 'none' },
  );
}

/** Rotazione del tavolo tra i due giocatori (180°), con leggero "respiro". */
export function rotateTable(table, fromDeg, toDeg, duration = 1100) {
  const mid = (fromDeg + toDeg) / 2;
  return play(
    table,
    [
      { transform: `rotate(${fromDeg}deg) scale(1)` },
      { transform: `rotate(${fromDeg + (toDeg - fromDeg) * 0.08}deg) scale(.97)`, offset: 0.12 },
      { transform: `rotate(${mid}deg) scale(.8)`, offset: 0.5 },
      { transform: `rotate(${toDeg}deg) scale(1.015)`, offset: 0.88 },
      { transform: `rotate(${toDeg}deg) scale(1)` },
    ],
    { duration, easing: EASE.inOut, fill: 'none' },
  );
}

export { wait };

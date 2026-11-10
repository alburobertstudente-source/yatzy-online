/**
 * Scene animate delle tradizioni della casa:
 *  - Contratto col Dottore (Full segnato nel Full)
 *  - Rifiuti il Dottore (Full fatto ma segnato altrove)
 *  - Rinuncia a Satana (0 nella casella Yatzy)
 * Ogni scena vive dentro il tavolo (orientata verso il giocatore di turno)
 * e si può saltare con un tocco.
 */
import { h, localRect } from '../ui/dom.js';
import { doctorSvg, devilSvg, QUILL, SIGNATURE_PATH, flamesSvg, HALO_BADGE, DOCTOR_BADGE } from '../ui/memeArt.js';
import { play, EASE, ms, pop, shake } from './animations.js';
import { sparkle, confetti } from './effects.js';
import { sound } from '../audio/sound.js';

const PLAYER_SPARK = {
  red: ['#ff5a66', '#ffd23f', '#ffffff'],
  blue: ['#3d9bff', '#ffd23f', '#ffffff'],
};

/** Attese che si interrompono subito se il giocatore tocca per saltare. */
class Timeline {
  constructor() {
    this.skipped = false;
    this.timers = new Set();
  }

  /** Attende `t` ms (scalati); restituisce false se la scena è stata saltata. */
  wait(t) {
    if (this.skipped) return Promise.resolve(false);
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        this.timers.delete(entry);
        resolve(!this.skipped);
      }, ms(t));
      const entry = { id, resolve };
      this.timers.add(entry);
    });
  }

  skip() {
    if (this.skipped) return;
    this.skipped = true;
    for (const e of this.timers) {
      clearTimeout(e.id);
      e.resolve(false);
    }
    this.timers.clear();
  }
}

export class MemeFx {
  /**
   * @param {object} o
   * @param {HTMLElement} o.table tavolo (host delle scene)
   * @param {HTMLElement} o.fx layer degli effetti
   * @param {() => boolean} o.isRotated
   */
  constructor({ table, fx, isRotated }) {
    this.table = table;
    this.fx = fx;
    this.isRotated = isRotated;
    this.active = null;
  }

  rect(el) {
    return localRect(el, this.table, this.isRotated());
  }

  /** Salta la scena in corso (usato anche dai test). */
  skip() {
    this.active?.skip();
  }

  #scene(cls) {
    const tl = new Timeline();
    const el = h('div', { class: `meme-scene ${cls}`, onpointerdown: (e) => { e.preventDefault(); tl.skip(); } });
    el.append(h('div', { class: 'ms-hint' }, 'tocca per continuare'));
    this.table.append(el);
    this.active = tl;
    play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' });
    return { el, tl };
  }

  async #close(el) {
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'linear' });
    el.remove();
    this.active = null;
  }

  #contract(name, color) {
    const sig = h('div', {
      class: 'ct-sig',
      html: `<svg viewBox="0 0 170 50" aria-hidden="true"><path class="sig-path" d="${SIGNATURE_PATH}" fill="none" stroke="${color === 'blue' ? '#1b5fb4' : '#bf2c3f'}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    });
    const doctor = h('div', { class: 'ct-doctor', html: doctorSvg('happy') });
    const el = h(
      'div',
      { class: `contract c-${color}` },
      h('div', { class: 'ct-head' }, doctor, h('div', { class: 'ct-heading' }, h('small', {}, 'CONTRATTO'), h('b', {}, 'col Dottore'), h('span', {}, 'N. 25 · Full'))),
      h('div', { class: 'ct-body' }, 'Il giocatore ', h('b', {}, name), ' ha fatto ', h('b', {}, 'FULL'), ' e si affida alle cure del Dottore. Visita garantita, ricetta inclusa.'),
      h('div', { class: 'ct-sign' }, sig, h('div', { class: 'ct-line' }), h('small', {}, 'Firma del paziente')),
    );
    return { el, doctor, sig };
  }

  /** Full segnato nel Full: si firma il contratto col Dottore. */
  async doctorContract({ name, color, targetEl }) {
    const { el: scene, tl } = this.#scene('doctor-scene');
    const title = h('div', { class: 'ms-title doctor' }, 'FULL! ARRIVA IL DOTTORE');
    const { el: contract, sig } = this.#contract(name, color);
    const quill = h('div', { class: 'ct-quill', html: QUILL });
    const stamp = h('div', { class: 'ct-stamp' }, 'FIRMATO');
    contract.append(quill, stamp);
    scene.append(title, contract);
    const finish = async () => {
      // anche saltando, il contratto finisce archiviato nella casella Full
      if (targetEl) {
        const c = this.rect(targetEl);
        pop(targetEl, 1.25, 400);
        sparkle(this.fx, c.x + c.w / 2, c.y + c.h / 2, { colors: PLAYER_SPARK[color], count: 14, spread: 50, size: 8 });
      }
      await this.#close(scene);
    };

    sound.doctor();
    play(title, [{ transform: 'translateY(-30px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE.back });
    await play(contract, [
      { transform: 'translateY(260px) rotate(14deg) scale(.7)', opacity: 0 },
      { transform: 'translateY(-10px) rotate(-3deg) scale(1.02)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ], { duration: 560, easing: EASE.out });
    if (!(await tl.wait(250))) return finish();

    // la firma
    const path = sig.querySelector('.sig-path');
    const len = path.getTotalLength ? path.getTotalLength() : 400;
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    sound.scribble(0.95);
    play(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 950, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'forwards' });
    play(quill, [
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(40px, -8px) rotate(-6deg)', offset: 0.25 },
      { transform: 'translate(80px, 4px) rotate(4deg)', offset: 0.5 },
      { transform: 'translate(120px, -6px) rotate(-4deg)', offset: 0.75 },
      { transform: 'translate(160px, 0) rotate(0deg)', opacity: 1 },
    ], { duration: 950, easing: 'linear', fill: 'forwards' });
    if (!(await tl.wait(1050))) return finish();
    play(quill, [{ opacity: 1 }, { opacity: 0, transform: 'translate(190px, -40px) rotate(30deg)' }], { duration: 300, easing: EASE.out, fill: 'forwards' });

    // il timbro
    sound.stamp();
    await play(stamp, [
      { transform: 'translate(-50%,-50%) scale(3) rotate(-35deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(.92) rotate(-14deg)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(-14deg)', opacity: 1 },
    ], { duration: 260, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    shake(contract, 7, 300);
    const cr = { x: contract.offsetLeft + contract.offsetWidth * 0.68, y: contract.offsetTop + contract.offsetHeight * 0.74 };
    sparkle(scene, cr.x, cr.y, { colors: ['#ff5a66', '#ffffff', '#ffd23f'], count: 16, spread: 80, size: 9 });
    confetti(scene, { colors: [...PLAYER_SPARK[color], '#7fd0ff'], count: 40 });
    sound.doctor();
    title.textContent = 'CONTRATTO COL DOTTORE FIRMATO!';
    pop(title, 1.12, 360);
    if (!(await tl.wait(1250))) return finish();

    // il contratto vola nella casella Full
    if (targetEl) {
      const t = this.rect(targetEl);
      const sx = contract.offsetLeft + contract.offsetWidth / 2;
      const sy = contract.offsetTop + contract.offsetHeight / 2;
      await play(contract, [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${(t.x + t.w / 2 - sx) * 0.4}px, ${(t.y + t.h / 2 - sy) * 0.4 - 40}px) scale(.55) rotate(-8deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${t.x + t.w / 2 - sx}px, ${t.y + t.h / 2 - sy}px) scale(.08) rotate(12deg)`, opacity: 0.6 },
      ], { duration: 620, easing: EASE.inOut, fill: 'forwards' });
    }
    return finish();
  }

  /** Full fatto ma non giocato: il contratto si strappa. */
  async doctorRefused({ name, color }) {
    const { el: scene, tl } = this.#scene('doctor-scene refused');
    const title = h('div', { class: 'ms-title doctor' }, 'HAI UN FULL...');
    const sub = h('div', { class: 'ms-sub' }, `${name} non vuole fare la visita dal Dottore`);
    const { el: contract, doctor } = this.#contract(name, color);
    scene.append(title, contract, sub);
    const finish = () => this.#close(scene);

    play(title, [{ transform: 'translateY(-30px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE.back });
    await play(contract, [
      { transform: 'translateY(260px) rotate(-12deg) scale(.7)', opacity: 0 },
      { transform: 'translateY(-10px) rotate(2deg) scale(1.02)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ], { duration: 520, easing: EASE.out });
    if (!(await tl.wait(500))) return finish();

    // il Dottore ci resta male
    doctor.innerHTML = doctorSvg('sad');
    shake(doctor, 5, 400);
    title.textContent = 'RIFIUTI IL DOTTORE!';
    title.classList.add('bad');
    pop(title, 1.15, 380);
    if (!(await tl.wait(550))) return finish();

    // strappo del contratto in due metà
    sound.rip();
    const w = contract.offsetWidth;
    const hgt = contract.offsetHeight;
    const jag = [];
    for (let i = 0; i <= 10; i++) jag.push([w * (0.5 + (i % 2 ? 0.05 : -0.05)), (hgt * i) / 10]);
    const leftClip = `polygon(0 0, ${jag.map(([x, y]) => `${x}px ${y}px`).join(', ')}, 0 ${hgt}px)`;
    const rightClip = `polygon(${w}px 0, ${jag.map(([x, y]) => `${x}px ${y}px`).join(', ')}, ${w}px ${hgt}px)`;
    const left = contract.cloneNode(true);
    const right = contract.cloneNode(true);
    for (const [half, clip] of [[left, leftClip], [right, rightClip]]) {
      half.style.clipPath = clip;
      half.style.webkitClipPath = clip;
      half.classList.add('ct-half');
      scene.append(half);
    }
    contract.remove();
    play(left, [
      { transform: 'none', opacity: 1 },
      { transform: 'translate(-34px, 10px) rotate(-10deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-120px, 260px) rotate(-38deg)', opacity: 0 },
    ], { duration: 1300, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
    play(right, [
      { transform: 'none', opacity: 1 },
      { transform: 'translate(34px, 14px) rotate(9deg)', opacity: 1, offset: 0.3 },
      { transform: 'translate(120px, 280px) rotate(34deg)', opacity: 0 },
    ], { duration: 1300, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
    sound.sadTrombone();
    play(sub, [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, delay: 300, easing: EASE.out });
    if (!(await tl.wait(2100))) return finish();
    return finish();
  }

  /** 0 nella casella Yatzy: rinuncia a Satana. */
  async renounceSatan({ name, color, targetEl }) {
    const { el: scene, tl } = this.#scene('satan-scene');
    const flames = h('div', { class: 'ss-flames', html: flamesSvg() });
    const devil = h('div', { class: 'ss-devil', html: devilSvg() });
    const title = h('div', { class: 'ms-title satan' });
    const words = 'RINUNCIA A SATANA!'.split(' ');
    words.forEach((w) => title.append(h('span', {}, w)));
    const sub = h('div', { class: 'ms-sub' }, `${name} mette 0 sullo Yatzy`);
    const light = h('div', { class: 'ss-light' });
    const halo = h('div', { class: 'ss-halo', html: HALO_BADGE });
    const vow = h('div', { class: 'ss-vow' }, 'RINUNCIO!');
    scene.append(flames, light, devil, halo, title, sub, vow);
    const finish = async () => {
      if (targetEl) {
        const c = this.rect(targetEl);
        pop(targetEl, 1.25, 400);
        sparkle(this.fx, c.x + c.w / 2, c.y + c.h / 2, { colors: ['#fff6c2', '#ffd23f', '#ffffff'], count: 14, spread: 50, size: 8 });
      }
      await this.#close(scene);
    };

    sound.satan();
    play(flames, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 500, easing: EASE.out, fill: 'forwards' });
    shake(this.table.querySelector('.play-area'), 6, 700);
    await play(devil, [
      { transform: 'translate(-50%, 220px) scale(.5)', opacity: 0 },
      { transform: 'translate(-50%, -14px) scale(1.08)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
    ], { duration: 760, easing: EASE.out, fill: 'forwards' });
    devil.classList.add('is-laughing');
    title.querySelectorAll('span').forEach((s, i) =>
      play(s, [{ transform: 'scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(4deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], {
        duration: 380,
        delay: i * 160,
        easing: EASE.out,
      }),
    );
    play(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 450, easing: 'linear' });
    if (!(await tl.wait(1350))) return finish();

    // la luce scaccia il diavolo
    sound.holy();
    play(light, [{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0.85 }], {
      duration: 1100,
      easing: EASE.out,
      fill: 'forwards',
    });
    play(halo, [{ transform: 'translate(-50%, -160px) scale(.4)', opacity: 0 }, { transform: 'translate(-50%, 0) scale(1)', opacity: 1 }], { duration: 600, easing: EASE.back, fill: 'forwards' });
    devil.classList.remove('is-laughing');
    play(flames, [{ transform: 'translateY(0)' }, { transform: 'translateY(110%)' }], { duration: 700, delay: 200, easing: EASE.inOut, fill: 'forwards' });
    if (!(await tl.wait(520))) return finish();
    sound.poof();
    await play(devil, [
      { transform: 'translate(-50%, 0) scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'translate(-50%, 30px) scale(.1) rotate(540deg)', opacity: 0, filter: 'brightness(3)' },
    ], { duration: 520, easing: EASE.inOut, fill: 'forwards' });
    const dc = { x: this.table.offsetWidth / 2, y: devil.offsetTop + devil.offsetHeight / 2 };
    sparkle(scene, dc.x, dc.y, { colors: ['#d9d9e3', '#a6a6b5', '#ffffff'], count: 18, spread: 90, size: 16, duration: 900 });
    play(vow, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], {
      duration: 460,
      easing: EASE.back,
      fill: 'forwards',
    });
    play(title, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'linear', fill: 'forwards' });
    confetti(scene, { colors: ['#ffffff', '#fff6c2', '#ffd23f', color === 'blue' ? '#7fd0ff' : '#ffb3b8'], count: 36 });
    if (!(await tl.wait(1100))) return finish();

    // l'aureola va sulla casella Yatzy
    if (targetEl) {
      const t = this.rect(targetEl);
      const sx = this.table.offsetWidth / 2;
      const sy = halo.offsetTop + halo.offsetHeight / 2;
      await play(halo, [
        { transform: 'translate(-50%, 0) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${t.x + t.w / 2 - sx}px), ${t.y + t.h / 2 - sy}px) scale(.3)`, opacity: 0.9 },
      ], { duration: 560, easing: EASE.inOut, fill: 'forwards' });
    }
    return finish();
  }
}

export { DOCTOR_BADGE, HALO_BADGE };

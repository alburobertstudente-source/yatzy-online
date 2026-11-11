/**
 * Stage di gioco a dimensione di progetto fissa (390 px di larghezza) scalato
 * per adattarsi a qualsiasi smartphone senza elementi tagliati o sovrapposti.
 * L'altezza si adatta allo schermo; il contenuto è distribuito in verticale.
 */
import { h } from './dom.js';

export const DESIGN_WIDTH = 390;
export const MIN_HEIGHT = 790;
const MAX_SCALE = 1.9;

export class Stage {
  constructor(app) {
    this.app = app;
    this.bg = h('div', { class: 'bg' }, h('div', { class: 'bg-layer bg-red' }), h('div', { class: 'bg-layer bg-blue' }), h('div', { class: 'bg-pattern' }));
    this.table = h('main', { class: 'table', id: 'table' });
    this.overlay = h('div', { class: 'overlay' });
    this.screens = h('div', { class: 'screens' });
    /** livello sopra tutto: finestre del menu, casse, avvisi */
    this.top = h('div', { class: 'top-layer' });
    this.stage = h('div', { class: 'stage' }, this.table, this.overlay, this.screens, this.top);
    this.safe = h('div', { class: 'safe' }, this.stage);
    this.dim = h('div', { class: 'dim' });
    this.rotateHint = h(
      'div',
      { class: 'rotate-hint' },
      h('div', { class: 'rh-phone' }, h('div', { class: 'rh-dot' })),
      h('div', { class: 'rh-text' }, 'Ruota il telefono in verticale'),
    );
    app.append(this.bg, this.dim, this.safe, this.rotateHint);
    this.rotation = 0;
    this.scale = 1;
    this.fit = this.fit.bind(this);
    window.addEventListener('resize', this.fit);
    window.visualViewport?.addEventListener('resize', this.fit);
    window.addEventListener('orientationchange', () => setTimeout(this.fit, 150));
    this.fit();
  }

  fit() {
    const r = this.safe.getBoundingClientRect();
    const vw = Math.max(200, r.width);
    const vh = Math.max(300, r.height);
    const scale = Math.min(vw / DESIGN_WIDTH, vh / MIN_HEIGHT, MAX_SCALE);
    const height = Math.max(MIN_HEIGHT, Math.floor(vh / scale));
    this.scale = scale;
    this.height = height;
    Object.assign(this.stage.style, {
      width: `${DESIGN_WIDTH}px`,
      height: `${height}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
    });
    this.app.style.setProperty('--stage-scale', String(scale));
    // spazio verticale in più rispetto al minimo: usato per ingrandire righe e dadi
    this.stage.style.setProperty('--extra', `${height - MIN_HEIGHT}px`);
  }

  /** Imposta subito la rotazione del tavolo (0 o 180). */
  setRotation(deg) {
    this.rotation = deg;
    this.table.style.transform = deg ? `rotate(${deg}deg)` : '';
    this.table.classList.toggle('is-flipped', deg === 180);
  }

  get rotated() {
    return this.rotation === 180;
  }

  /** Colore dello sfondo in base al giocatore di turno. */
  setTurnColor(color) {
    this.app.dataset.turn = color;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color === 'blue' ? '#2a78d6' : '#e2475a');
  }

  setDim(on) {
    this.dim.classList.toggle('is-on', on);
  }
}

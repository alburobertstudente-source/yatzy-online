/**
 * Carta gratta e vinci: uno strato argentato su <canvas> da grattare col dito.
 * Scoperto più del 50% la carta si rivela con un effetto in base alla rarità.
 * Vive dentro il tavolo, quindi è sempre orientata verso il giocatore di turno.
 */
import { h, wait } from './dom.js';
import { bigCard, miniCard, CARD_BACK } from './cardArt.js';
import { CARDS, RARITY_INFO } from '../core/cards.js';
import { play, EASE, ms } from '../anim/animations.js';
import { sparkle, confetti } from '../anim/effects.js';
import { sound } from '../audio/sound.js';

const CARD_W = 230;
const CARD_H = 318;
const REVEAL_AT = 0.5;

const RARITY_COLORS = {
  common: ['#ffffff', '#c9d0dd', '#8e98ad'],
  rare: ['#ffffff', '#7fd6f5', '#22a6d8'],
  epic: ['#ffffff', '#d6b8ff', '#9a5ae0'],
  legendary: ['#fff6c2', '#ffd23f', '#ffffff', '#ffb21e'],
};

export class ScratchView {
  /**
   * @param {object} o
   * @param {HTMLElement} o.host elemento del tavolo (ruota col giocatore)
   * @param {() => boolean} o.isRotated il tavolo è ruotato di 180°?
   */
  constructor({ host, isRotated }) {
    this.host = host;
    this.isRotated = isRotated;
    this.active = null;
  }

  /**
   * Mostra la carta da grattare. Si risolve quando il giocatore la prende
   * (o, con la mano piena, sceglie la carta da scartare).
   * @param {{entry:{uid:number,id:string}, playerName:string, color:string, round:number, totalRounds:number,
   *          handFull:boolean, hand:object[], onDiscard:(uid:number)=>void, extra?:boolean}} o
   */
  show(o) {
    return new Promise((resolve) => {
      const def = CARDS[o.entry.id];
      const face = bigCard(o.entry.id);
      const canvas = h('canvas', { class: 'foil', 'aria-label': 'Gratta la carta' });
      const hint = h('div', { class: 'scratch-hint' }, h('span', { class: 'sh-coin' }), 'GRATTA COL DITO');
      const box = h('div', { class: 'scratch-card' }, h('div', { class: `sc-glow r-${def.rarity}` }), face, canvas, hint);
      const title = h('div', { class: 'sc-title' }, o.extra ? 'CARTA EXTRA!' : 'GRATTA LA CARTA!');
      const sub = h('div', { class: 'sc-sub' }, `Turno del ${o.playerName} · Round ${o.round}/${o.totalRounds}`);
      const actions = h('div', { class: 'sc-actions' });
      const screen = h('div', { class: `scratch-screen c-${o.color}` }, h('div', { class: 'sc-head' }, title, sub), box, actions);
      this.host.append(screen);
      this.active = {
        screen,
        revealNow: () => reveal(),
        cancel: () => {
          screen.remove();
          this.active = null;
          resolve({ action: 'cancelled' });
        },
      };

      play(screen, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' });
      play(box, [{ transform: 'translateY(40px) scale(.7) rotate(-6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: 460,
        easing: EASE.back,
      });

      /* ---------- strato da grattare ---------- */
      const dpr = Math.min(2, (globalThis.devicePixelRatio || 1) * (Number(getComputedStyle(document.getElementById('app')).getPropertyValue('--stage-scale')) || 1));
      canvas.width = Math.round(CARD_W * dpr);
      canvas.height = Math.round(CARD_H * dpr);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      drawFoil(ctx, canvas.width, canvas.height, dpr);
      if (document.fonts?.load) document.fonts.load('700 30px Fredoka').then(() => { if (!revealed && !scratched) drawFoil(ctx, canvas.width, canvas.height, dpr); }).catch(() => {});

      let revealed = false;
      let scratched = false;
      let last = null;
      let lastCheck = 0;
      let lastSound = 0;

      const toLocal = (ev) => {
        const r = canvas.getBoundingClientRect();
        const kx = canvas.width / r.width;
        const ky = canvas.height / r.height;
        return this.isRotated()
          ? { x: (r.right - ev.clientX) * kx, y: (r.bottom - ev.clientY) * ky }
          : { x: (ev.clientX - r.left) * kx, y: (ev.clientY - r.top) * ky };
      };
      const scratchTo = (p) => {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 40 * dpr;
        ctx.beginPath();
        ctx.moveTo((last || p).x, (last || p).y);
        ctx.lineTo(p.x + 0.01, p.y);
        ctx.stroke();
        last = p;
        const now = performance.now();
        if (now - lastSound > 70) {
          lastSound = now;
          sound.scratch();
        }
        if (now - lastCheck > 120) {
          lastCheck = now;
          if (clearedFraction(ctx, canvas.width, canvas.height) >= REVEAL_AT) reveal();
        }
      };
      const onDown = (ev) => {
        if (revealed) return;
        ev.preventDefault();
        sound.unlock();
        canvas.setPointerCapture?.(ev.pointerId);
        if (!scratched) {
          scratched = true;
          hint.classList.add('is-gone');
        }
        last = null;
        scratchTo(toLocal(ev));
      };
      const onMove = (ev) => {
        if (revealed || !last) return;
        ev.preventDefault();
        scratchTo(toLocal(ev));
      };
      const onUp = () => {
        last = null;
        if (!revealed && clearedFraction(ctx, canvas.width, canvas.height) >= REVEAL_AT) reveal();
      };
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);

      /* ---------- rivelazione ---------- */
      const reveal = async () => {
        if (revealed) return;
        revealed = true;
        hint.classList.add('is-gone');
        canvas.style.pointerEvents = 'none';
        await play(canvas, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'linear' });
        canvas.remove();
        box.classList.add('is-revealed');
        sound.reveal(def.rarity);
        const cx = box.offsetLeft + CARD_W / 2;
        const cy = box.offsetTop + CARD_H / 2;
        play(face, [{ transform: 'scale(1)' }, { transform: 'scale(1.1) rotate(2deg)', offset: 0.4 }, { transform: 'scale(1)' }], {
          duration: 520,
          easing: EASE.out,
          fill: 'none',
        });
        const colors = RARITY_COLORS[def.rarity];
        sparkle(screen, cx, cy, { colors, count: def.rarity === 'common' ? 10 : 22, spread: def.rarity === 'common' ? 120 : 170, size: 11 });
        if (def.rarity === 'legendary') confetti(screen, { colors: ['#ffd23f', '#ffb21e', '#ffffff', '#fff2a8'], count: 60 });
        if (def.rarity === 'epic' || def.rarity === 'legendary') sparkle(screen, cx, cy, { colors, count: 16, spread: 230, size: 8, duration: 1100 });
        sub.textContent = `${RARITY_INFO[def.rarity].label.toUpperCase()}!`;
        sub.className = `sc-sub sc-rarity r-${def.rarity}`;
        await wait(ms(380));
        if (o.handFull) showDiscard();
        else showTake();
      };

      const finish = async (value) => {
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        await play(screen, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
        screen.remove();
        this.active = null;
        resolve(value);
      };

      const showTake = () => {
        const btn = h('button', { class: 'btn btn-menu primary sc-take', type: 'button', onclick: () => finish({ action: 'take', rect: faceRect() }) }, 'PRENDI LA CARTA');
        actions.replaceChildren(btn);
        play(btn, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: EASE.back });
      };

      const faceRect = () => ({ x: box.offsetLeft, y: box.offsetTop, w: CARD_W, h: CARD_H });

      const showDiscard = () => {
        const row = h('div', { class: 'discard-row' });
        for (const entry of o.hand) {
          const m = miniCard(entry, {
            onTap: (uid) => {
              o.onDiscard(uid);
              sound.tap();
              finish({ action: uid === o.entry.uid ? 'discardNew' : 'discard', discardUid: uid, rect: faceRect() });
            },
          });
          if (entry.uid === o.entry.uid) m.classList.add('is-new');
          row.append(m);
        }
        actions.replaceChildren(h('div', { class: 'discard-title' }, 'Hai già 5 carte: tocca quella da scartare'), row);
        play(actions, [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE.out });
      };
    });
  }

  /**
   * Online: l'avversario sta grattando la sua carta. Mostra il retro con
   * l'attesa; reveal() scopre la carta trovata e chiude la vista.
   */
  spectate({ playerName, color, round, totalRounds, extra = false }) {
    const back = h('div', { class: `card-back c-${color}` }, h('div', { class: 'cb-star', html: CARD_BACK }), h('div', { class: 'cb-dots' }, h('span'), h('span'), h('span')));
    const box = h('div', { class: 'scratch-card spectating' }, back);
    const title = h('div', { class: 'sc-title' }, extra ? 'CARTA EXTRA' : `${playerName} GRATTA...`);
    const sub = h('div', { class: 'sc-sub' }, `Turno del ${playerName} · Round ${round}/${totalRounds}`);
    const note = h('div', { class: 'sc-note' }, 'Aspetta che scopra il suo potenziamento');
    const screen = h('div', { class: `scratch-screen spectator c-${color}` }, h('div', { class: 'sc-head' }, title, sub), box, note);
    this.host.append(screen);
    play(screen, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' });
    play(box, [{ transform: 'translateY(40px) scale(.7) rotate(6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: EASE.back });
    return {
      reveal: async (entry, discardedId) => {
        const def = CARDS[entry.id];
        const face = bigCard(entry.id);
        await play(box, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 220, easing: EASE.inOut });
        box.replaceChildren(h('div', { class: `sc-glow r-${def.rarity}` }), face);
        box.classList.add('is-revealed');
        await play(box, [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 260, easing: EASE.out });
        sound.reveal(def.rarity);
        title.textContent = `${playerName} HA TROVATO:`;
        sub.textContent = `${RARITY_INFO[def.rarity].label.toUpperCase()}!`;
        sub.className = `sc-sub sc-rarity r-${def.rarity}`;
        note.textContent = discardedId ? `e ha scartato ${CARDS[discardedId].name}` : '';
        await wait(ms(1300));
        await play(screen, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'linear' });
        screen.remove();
      },
    };
  }

  /** Chiude la carta in corso senza sceglierla (partita sostituita). */
  cancel() {
    this.active?.cancel?.();
    this.host.querySelectorAll('.scratch-screen').forEach((el) => el.remove());
  }

  /** Scopre subito la carta (usato dai test). */
  revealNow() {
    this.active?.revealNow();
  }
}

/* ------------------------------------------------------------------ */

function roundRect(ctx, x, y, w, hgt, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, r);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
  ctx.arcTo(x, y + hgt, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Disegna lo strato argentato con motivo a puntini di dado e la scritta. */
function drawFoil(ctx, w, hgt, s) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, hgt);
  roundRect(ctx, 0, 0, w, hgt, 24 * s);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, w, hgt);
  g.addColorStop(0, '#aeb7c8');
  g.addColorStop(0.3, '#eef1f6');
  g.addColorStop(0.55, '#b3bccc');
  g.addColorStop(0.8, '#e6eaf1');
  g.addColorStop(1, '#9ea8bb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, hgt);
  // strisce diagonali
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 6 * s;
  for (let x = -hgt; x < w; x += 22 * s) {
    ctx.beginPath();
    ctx.moveTo(x, hgt);
    ctx.lineTo(x + hgt, 0);
    ctx.stroke();
  }
  // motivo a puntini di dado
  ctx.fillStyle = 'rgba(70,80,110,0.13)';
  const step = 26 * s;
  for (let y = step / 2; y < hgt; y += step) {
    for (let x = (Math.round(y / step) % 2 ? step : step / 2); x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // cornice
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4 * s;
  roundRect(ctx, 9 * s, 9 * s, w - 18 * s, hgt - 18 * s, 18 * s);
  ctx.setLineDash([10 * s, 8 * s]);
  ctx.stroke();
  ctx.setLineDash([]);
  // medaglione centrale
  const cx = w / 2;
  const cy = hgt / 2 - 10 * s;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, 52 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc531';
  ctx.strokeStyle = '#c98600';
  ctx.lineWidth = 4 * s;
  star(ctx, cx, cy, 34 * s, 15 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#262a3d';
  ctx.font = `700 ${30 * s}px Fredoka, 'Arial Rounded MT Bold', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GRATTA!', cx, cy + 82 * s);
  ctx.font = `600 ${13 * s}px Fredoka, 'Arial Rounded MT Bold', sans-serif`;
  ctx.fillStyle = 'rgba(38,42,61,0.7)';
  ctx.fillText('POTENZIAMENTO MISTERIOSO', cx, cy + 110 * s);
  ctx.restore();
}

function star(ctx, cx, cy, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
}

/** Frazione di strato già grattata (campionata per velocità). */
function clearedFraction(ctx, w, hgt) {
  const data = ctx.getImageData(0, 0, w, hgt).data;
  let clear = 0;
  let total = 0;
  const stride = 4 * 7;
  for (let i = 3; i < data.length; i += stride) {
    total++;
    if (data[i] < 40) clear++;
  }
  return total ? clear / total : 0;
}

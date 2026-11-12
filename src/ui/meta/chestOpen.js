/**
 * Apertura di una cassa: la cassa trema (più forte se dentro c'è qualcosa di
 * raro), il coperchio salta via con un lampo del colore della rarità e gli
 * oggetti escono uno alla volta. Un tocco passa al successivo.
 */
import { h, wait, buzz } from '../dom.js';
import { play, EASE, ms } from '../../anim/animations.js';
import { sparkle, confetti } from '../../anim/effects.js';
import { sound } from '../../audio/sound.js';
import { chestSvg, MI } from '../metaIcons.js';
import { ITEMS, RARITY, rarityRank } from '../../meta/catalog.js';
import { CHESTS } from '../../meta/economy.js';
import { ChestScene } from '../../three/chestOpen3d.js';
import { itemArt, rarityChip, fmt } from './common.js';

const tapOrWait = (el, t) =>
  new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      el.removeEventListener('pointerdown', go);
      resolve();
    };
    el.addEventListener('pointerdown', go);
    if (t) setTimeout(go, t);
  });

/**
 * @param {HTMLElement} host livello sopra lo stage
 * @param {string} chestId
 * @param {{items:{id,rarity,dup,coins}[], coins:number, bonus:number}} result
 */
export async function openChestAnimation(host, chestId, result) {
  const best = result.items.reduce((m, it) => (rarityRank(it.rarity) > rarityRank(m) ? it.rarity : m), 'common');
  const color = RARITY[best].color;
  const rays = h('div', { class: 'co-rays', style: { '--rc': color } });
  const chest = h('div', { class: 'co-chest', html: chestSvg(chestId, 190, { parts: true }) });
  const hint = h('div', { class: 'co-hint' }, 'TOCCA PER APRIRE');
  const stageEl = h('div', { class: 'co-stage' }, rays, chest);
  const title = h('div', { class: 'co-title' }, CHESTS[chestId].name.toUpperCase());
  const fx = h('div', { class: 'co-fx' });
  const el = h('div', { class: 'chest-open', style: { '--rc': color } }, title, stageEl, hint, fx);
  host.append(el);
  await play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' });
  sound.whoosh();
  // cassa in 3D (la versione disegnata resta come riserva)
  const scene3d = ChestScene.create(stageEl, chestId, color, rarityRank(best));
  if (scene3d) {
    chest.style.visibility = 'hidden';
    el.classList.add('is-3d');
  }
  if (scene3d) await scene3d.drop();
  else await play(chest, [{ transform: 'translateY(-260px) scale(.6)' }, { transform: 'translateY(0) scale(1.08,.9)', offset: 0.7 }, { transform: 'none' }], { duration: 650, easing: EASE.out });
  if (!sound.fx('cupSlam', { rate: 0.85 })) sound.land();
  buzz(20);

  // scuote: più a lungo per le casse con oggetti rari
  await tapOrWait(el, 1400);
  hint.textContent = '';
  const shakes = 2 + rarityRank(best);
  for (let k = 0; k < shakes; k++) {
    if (!sound.fx('chestShake', { rate: 1 + k * 0.06 })) sound.tone({ freq: 180 + k * 40, type: 'square', dur: 0.08, gain: 0.12 });
    buzz(15);
    if (scene3d) await scene3d.shake(k);
    else await play(chest, [{ transform: 'rotate(0)' }, { transform: `rotate(${k % 2 ? 7 : -7}deg) scale(${1 + k * 0.02})` }, { transform: 'rotate(0)' }], { duration: 170, easing: 'ease-in-out' });
  }
  chest.classList.add('is-open');
  rays.classList.add('is-on');
  if (scene3d) scene3d.openLid();
  sound.chestOpen();
  sound.reveal(best);
  buzz([30, 40, 60]);
  const r = chest.getBoundingClientRect();
  const hr = el.getBoundingClientRect();
  const s = hr.width / el.offsetWidth || 1;
  sparkle(fx, (r.left + r.width / 2 - hr.left) / s, (r.top + r.height * 0.3 - hr.top) / s, { colors: [color, '#fff', '#ffe27a'], count: 26, spread: 170, size: 12 });
  if (rarityRank(best) >= 4) confetti(fx, { colors: [color, '#ffffff', '#ffd23f'], count: 70 });
  await wait(ms(450));

  scene3d?.dim();
  // oggetti uno alla volta
  const shelf = h('div', { class: 'co-shelf' });
  for (const [k, it] of result.items.entries()) {
    const def = ITEMS[it.id];
    const card = h(
      'div',
      { class: `co-item r-${it.rarity}`, style: { '--rc': RARITY[it.rarity].color } },
      h('div', { class: 'co-glow' }),
      h('div', { class: 'co-art', html: itemArt(it.id, 110) }),
      rarityChip(it.rarity),
      h('div', { class: 'co-name' }, def.name),
      h('div', { class: 'co-cat' }, catLabel(def.cat)),
      it.dup ? h('div', { class: 'co-dup' }, h('span', { html: MI.coin }), `Doppione: +${fmt(it.coins)}`) : h('div', { class: 'co-new' }, 'NUOVO!'),
    );
    const front = h('div', { class: 'co-front' }, card, h('div', { class: 'co-count' }, `${k + 1} / ${result.items.length}`), h('div', { class: 'co-hint' }, 'TOCCA PER CONTINUARE'));
    el.append(front);
    sound.reveal(it.rarity);
    await play(card, [{ transform: 'perspective(700px) translateY(160px) scale(.15) rotateY(540deg) rotateX(30deg)', opacity: 0 }, { transform: 'perspective(700px) translateY(-14px) scale(1.1) rotateY(-12deg)', opacity: 1, offset: 0.72 }, { transform: 'perspective(700px) none', opacity: 1 }], { duration: 700, easing: EASE.out });
    if (rarityRank(it.rarity) >= 3) sparkle(fx, el.offsetWidth / 2, el.offsetHeight * 0.42, { colors: [RARITY[it.rarity].color, '#fff'], count: 22, spread: 160, size: 11 });
    await tapOrWait(front);
    sound.tap();
    await play(front, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], { duration: 160, easing: 'linear' });
    front.remove();
    shelf.append(h('div', { class: `co-mini r-${it.rarity}`, style: { '--rc': RARITY[it.rarity].color }, html: itemArt(it.id, 58) }));
  }

  // riepilogo
  const sum = h(
    'div',
    { class: 'co-summary' },
    h('h3', {}, 'HAI TROVATO'),
    shelf,
    result.coins > 0 ? h('div', { class: 'co-coins' }, h('span', { html: MI.coin }), `+${fmt(result.coins)} monete`) : null,
    h('button', { class: 'btn btn-menu primary', type: 'button' }, 'FANTASTICO!'),
  );
  el.append(sum);
  await play(sum, [{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE.back });
  await new Promise((resolve) => sum.querySelector('button').addEventListener('click', resolve, { once: true }));
  sound.tap();
  await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear' });
  scene3d?.dispose();
  el.remove();
}

const CAT = { dice: 'Skin dadi', roll: 'Animazione di lancio', cards: 'Skin carte', table: 'Tema del tavolo', hat: 'Cappello', face: 'Accessorio viso', shirt: 'Maglietta', pants: 'Pantaloni', shoes: 'Scarpe', back: 'Schiena', frame: 'Cornice profilo', title: 'Titolo' };
export const catLabel = (c) => CAT[c] || c;

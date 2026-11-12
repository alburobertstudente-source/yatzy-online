/** Pezzi comuni delle schermate del menu: pagina, monete, caselle degli oggetti. */
import { h } from '../dom.js';
import { MI } from '../metaIcons.js';
import { ITEMS, RARITY } from '../../meta/catalog.js';
import { diceSwatch } from '../skins.js';
import { itemPreviewSvg, avatarSvg } from '../avatar.js';
import { play, EASE } from '../../anim/animations.js';
import { artSpan } from '../../three/core.js';
import '../../three/cosmetics3d.js';

export const fmt = (n) => Math.round(n).toLocaleString('it-IT');

export function coinPill(amount, { big = false } = {}) {
  const el = h('div', { class: `coin-pill${big ? ' big' : ''}` }, h('span', { class: 'cp-ico', html: MI.coin }), h('b', {}, fmt(amount)));
  el.set = (v) => {
    el.lastChild.textContent = fmt(v);
  };
  return el;
}

/** Pagina a tutto schermo con intestazione (indietro, titolo, monete). */
export function pageShell({ title, onBack, coins = null, cls = '', icon = '' }) {
  const pill = coins !== null ? coinPill(coins) : null;
  const body = h('div', { class: 'page-body' });
  const el = h(
    'div',
    { class: `screen page ${cls}` },
    h(
      'div',
      { class: 'page-inner anim-in' },
      h(
        'header',
        { class: 'page-head' },
        h('button', { class: 'icon-btn page-back', type: 'button', 'aria-label': 'Indietro', html: MI.back, onclick: onBack }),
        h('h2', {}, icon ? h('span', { class: 'ph-ico', html: icon }) : null, title),
        pill || h('span', { class: 'ph-spacer' }),
      ),
      body,
    ),
  );
  return { el, body, pill };
}

export function rarityChip(r) {
  return h('span', { class: `rarity-chip r-${r}`, style: { '--rc': RARITY[r].color } }, RARITY[r].label);
}

/** Anteprima di un oggetto in base alla categoria. */
export function itemArt(id, size = 64) {
  const it = ITEMS[id];
  if (!it) return '';
  switch (it.cat) {
    case 'dice':
      return diceSwatch(id, 5, Math.round(size * 0.7));
    case 'roll':
      return artSpan('roll', it.style, size, `<span class="roll-art roll-${it.style}" style="width:${size}px;height:${size}px">${diceSwatch('dice.classic', 3, Math.round(size * 0.46))}</span>`);
    case 'cards':
      return artSpan('card', it.skin, size, `<span class="cardskin-art cs-${it.skin}" style="width:${Math.round(size * 0.62)}px;height:${Math.round(size * 0.86)}px"></span>`);
    case 'table':
      return artSpan('table', it.theme, size, `<span class="theme-art" data-theme-art="${it.theme}" style="width:${Math.round(size * 0.8)}px;height:${Math.round(size * 0.9)}px"><i class="ta-red"></i><i class="ta-blue"></i></span>`);
    case 'frame':
      return `<span class="av-frame f-${it.frame}" style="width:${Math.round(size * 0.78)}px;height:${Math.round(size * 0.78)}px">${avatarSvg({}, { size: Math.round(size * 0.7), bust: true })}</span>`;
    case 'title':
      return `<span class="title-art r-${it.rarity}"><span>${it.name}</span></span>`;
    default:
      return itemPreviewSvg(id, size);
  }
}

/** Casella di un oggetto (negozio, armadio, ricompense). */
export function itemTile(id, { owned = true, equipped = false, onTap, extra = null, size = 64 } = {}) {
  const it = ITEMS[id];
  return h(
    'button',
    {
      class: `item-tile r-${it.rarity}${owned ? '' : ' is-locked'}${equipped ? ' is-equipped' : ''}`,
      type: 'button',
      style: { '--rc': RARITY[it.rarity].color },
      dataset: { item: id },
      onclick: onTap ? () => onTap(id) : undefined,
    },
    h('span', { class: 'it-art', html: itemArt(id, size) }),
    h('span', { class: 'it-name' }, it.name),
    owned ? null : h('span', { class: 'it-lock', html: MI.lock }),
    equipped ? h('span', { class: 'it-on' }, 'IN USO') : null,
    extra,
  );
}

/** Piccolo popup sopra la pagina corrente. */
export function sheet(host, content, { onClose, cls = '' } = {}) {
  const box = h('div', { class: `sheet ${cls}` }, content);
  const el = h('div', { class: 'sheet-back', onclick: (e) => e.target === el && close() }, box);
  host.append(el);
  play(box, [{ transform: 'translateY(40px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 280, easing: EASE.back });
  play(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear' });
    el.remove();
    onClose?.();
  }
  return { el, box, close };
}

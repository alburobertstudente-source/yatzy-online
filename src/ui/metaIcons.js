import { toon } from './toon.js';
/** Icone del menu principale, del negozio e della campagna (SVG originali). */
const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const MI = {
  coin: s('<circle cx="12" cy="12" r="10" fill="#ffc531"/><circle cx="12" cy="12" r="7.2" fill="#ffd95e" stroke="#d98c00" stroke-width="1.4"/><path d="M12 7.5v9M9.6 9.6h3.6a1.6 1.6 0 0 1 0 3.2h-2.4a1.6 1.6 0 0 0 0 3.2h3.6" fill="none" stroke="#a86400" stroke-width="1.6" stroke-linecap="round"/>'),
  back: s(`<path d="M15 5l-7 7 7 7" ${st}/>`),
  gear: s(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/>`),
  map: s(`<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" ${st}/><path d="M9 4v14M15 6v14" ${st}/>`),
  sword: s(`<path d="M14.5 3.5H20.5V9.5L9 21l-3-3L17.5 6.5" ${st}/><path d="M4 14l6 6M3 21l3-3" ${st}/>`),
  globe: s(`<circle cx="12" cy="12" r="9.5" ${st}/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" ${st}/>`),
  duo: s(`<circle cx="8" cy="8" r="3.4" ${st}/><circle cx="16.5" cy="9" r="2.8" ${st}/><path d="M2.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5M13.5 15.2c1-.6 2-.9 3-.9 2.4 0 4.3 1.7 4.9 5.2" ${st}/>`),
  shop: s(`<path d="M4 8h16l-1.3 12H5.3z" ${st}/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" ${st}/>`),
  shirt: s(`<path d="M8 3.5L3 6.5l2 4 2-1V20.5h10V9.5l2 1 2-4-5-3c-.6 1.6-2.2 2.6-4 2.6S8.6 5.1 8 3.5z" ${st}/>`),
  user: s(`<circle cx="12" cy="8" r="4" ${st}/><path d="M4 21c.8-4.4 3.8-6.6 8-6.6s7.2 2.2 8 6.6" ${st}/>`),
  podium: s(`<path d="M8.5 21V10h7v11M2.5 21v-7h6M15.5 21v-5h6v5M1.5 21h21" ${st}/><path d="M12 3.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="currentColor"/>`),
  rules: s(`<path d="M5 4.5h11l3 3v12H5z" ${st}/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" ${st}/>`),
  star: s('<path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4-4.9-4.4 6.5-.7z" fill="currentColor"/>'),
  lock: s(`<rect x="5" y="10.5" width="14" height="10" rx="2.5" ${st}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  crown: s('<path d="M3 18.5L2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 11.5z" fill="currentColor"/>'),
  gift: s(`<rect x="3.5" y="9" width="17" height="11.5" rx="2" ${st}/><path d="M2.5 9h19v-3.5h-19zM12 5.5v15M12 5.5C10.5 2.5 6.5 2.5 7 5.5M12 5.5c1.5-3 5.5-3 5 0" ${st}/>`),
  logout: s(`<path d="M14 4.5H6.5v15H14M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" ${st}/>`),
  install: s(`<path d="M12 3v11M7 10l5 5 5-5" ${st}/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" ${st}/>`),
  skull: s('<path d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.7 1.3 4.8 3.3 6v3.5h10.4V16.5c2-1.2 3.3-3.3 3.3-6 0-4.6-3.5-8-8.5-8z" fill="currentColor"/><circle cx="8.6" cy="11" r="2.2" fill="#fff"/><circle cx="15.4" cy="11" r="2.2" fill="#fff"/><path d="M10 20v-2.5M14 20v-2.5" stroke="#fff" stroke-width="1.6"/>'),
  dice: s(`<rect x="3.5" y="3.5" width="17" height="17" rx="4" ${st}/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`),
};

/** Cassa disegnata (stile per tipo) con il coperchio separato per l'animazione. */
export function chestSvg(type = 'small', size = 120) {
  return toon(chestRaw(type, size), { outline: 1.6 });
}

function chestRaw(type, size) {
  const pal = {
    daily: ['#35c46a', '#1f8a48', '#ffe14d', '#ffffff'],
    small: ['#b9773f', '#7a4a22', '#d9dee8', '#8b94a8'],
    medium: ['#3d8bff', '#1d55b0', '#e9eef8', '#a9b6cc'],
    large: ['#a54dff', '#5e1fa8', '#ffcf33', '#d98c00'],
  }[type] || ['#b9773f', '#7a4a22', '#d9dee8', '#8b94a8'];
  const [a, b, c, d] = pal;
  return `<svg class="chest-svg chest-${type}" viewBox="0 0 120 110" width="${size}" height="${Math.round(size * 0.92)}" aria-hidden="true">
<ellipse cx="60" cy="104" rx="46" ry="5" fill="rgba(0,0,0,.25)" data-flat/>
<g class="chest-body"><rect x="14" y="52" width="92" height="50" rx="8" fill="${a}"/><rect x="14" y="52" width="92" height="12" fill="${b}" opacity=".45"/>
<rect x="24" y="52" width="10" height="50" fill="${c}"/><rect x="86" y="52" width="10" height="50" fill="${c}"/><rect x="14" y="94" width="92" height="8" rx="4" fill="${b}"/>
<rect x="50" y="58" width="20" height="22" rx="4" fill="${c}" stroke="${d}" stroke-width="2.5"/><circle cx="60" cy="67" r="3.4" fill="${b}"/><rect x="58.5" y="68" width="3" height="7" fill="${b}"/></g>
<g class="chest-lid"><path d="M14 54 V40 Q14 18 60 18 Q106 18 106 40 V54 Z" fill="${a}"/><path d="M14 46 Q14 24 60 24 Q106 24 106 46" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>
<rect x="24" y="22" width="10" height="32" fill="${c}"/><rect x="86" y="22" width="10" height="32" fill="${c}"/><rect x="12" y="48" width="96" height="8" rx="4" fill="${b}"/>${type === 'daily' ? `<path d="M60 18 V54" stroke="${c}" stroke-width="7"/><path d="M60 18 C48 4 38 12 46 18 Z M60 18 C72 4 82 12 74 18 Z" fill="${c}"/>` : ''}</g>
</svg>`;
}

/** Medaglia del rango online. */
export function rankBadge(rank, size = 34) {
  return `<span class="rank-badge" style="--rc:${rank.color};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l8.6 3.4v6.2c0 5.2-3.6 9.2-8.6 10.8C7 20.6 3.4 16.6 3.4 11.4V5.2z" fill="var(--rc)" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><path d="M12 6.2l1.6 3.4 3.7.4-2.8 2.5.8 3.7L12 14.3l-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#fff" opacity=".92"/></svg></span>`;
}

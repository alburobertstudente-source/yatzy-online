/**
 * Il croupier del Casinò Yatzy (SVG originale): occhiali tondi dorati, baffi a
 * manubrio, gilet scuro con bottoni d'oro, papillon, coppa dorata per i dadi.
 * Parti animabili: .dl-arm (braccio con la coppa), .dl-eyes (palpebre),
 * .dl-mouth-* (espressioni: neutral, happy, wow, sad).
 */
import { toon } from './toon.js';

export function dealerSvg(size = 190) {
  const skin = '#f0bf98';
  const body = `
<ellipse cx="100" cy="198" rx="72" ry="6" fill="rgba(10,4,12,.35)" data-flat/>
<path d="M34 204 Q36 140 100 130 Q164 140 166 204 Z" fill="#f6f2ea"/>
<path d="M54 204 L60 144 Q100 134 140 144 L146 204 Z" fill="#3a2a24"/>
<path d="M60 150 Q100 142 140 150" fill="none" stroke="#5a4438" stroke-width="2"/>
<path d="M100 136 L82 204 M100 136 L118 204" fill="none" stroke="#241814" stroke-width="2"/>
<path d="M100 140 L84 204 L116 204 Z" fill="#f6f2ea"/>
<path d="M100 150 L100 204" stroke="#d8d0c4" stroke-width="1.4"/>
<circle cx="92" cy="166" r="2.8" fill="#e0b050"/><circle cx="92" cy="180" r="2.8" fill="#e0b050"/><circle cx="92" cy="194" r="2.8" fill="#e0b050"/>
<circle cx="108" cy="166" r="2.8" fill="#e0b050"/><circle cx="108" cy="180" r="2.8" fill="#e0b050"/><circle cx="108" cy="194" r="2.8" fill="#e0b050"/>
<path d="M126 156 h10 v4 h-10 Z" fill="#e0b050"/><path d="M128 160 q4 10 0 18" fill="none" stroke="#e0b050" stroke-width="1.2"/>
<rect x="89" y="118" width="22" height="18" rx="6" fill="${skin}"/>
<path d="M86 132 L100 140 L114 132 L112 128 L88 128 Z" fill="#f6f2ea"/>
<path d="M82 133 L99 140 L82 147 Q79 140 82 133 Z M118 133 L101 140 L118 147 Q121 140 118 133 Z" fill="#15131a"/><rect x="96" y="136" width="8" height="8" rx="3" fill="#2a2630"/>
<path d="M40 170 Q32 188 48 198 L62 196 Q54 182 58 168 Z" fill="#f6f2ea"/>
<circle cx="54" cy="196" r="8" fill="${skin}"/>`;
  const head = `
<ellipse cx="62" cy="86" rx="8" ry="11" fill="${skin}"/><ellipse cx="138" cy="86" rx="8" ry="11" fill="${skin}"/>
<path d="M60 84 q2 -5 5 0" fill="none" stroke="rgba(150,80,50,.5)" stroke-width="1.4"/><path d="M140 84 q-2 -5 -5 0" fill="none" stroke="rgba(150,80,50,.5)" stroke-width="1.4"/>
<path d="M64 78 Q64 36 100 36 Q136 36 136 78 Q136 118 100 122 Q64 118 64 78 Z" fill="${skin}"/>
<path d="M68 96 Q72 116 100 120 Q128 116 132 96 Q126 112 100 114 Q74 112 68 96 Z" fill="rgba(160,80,50,.14)" data-flat/>
<path d="M62 74 Q58 30 100 28 Q144 30 138 74 Q134 52 120 46 Q104 50 92 44 Q74 46 66 58 Q62 64 62 74 Z" fill="#6a4026"/>
<path d="M92 44 Q84 34 70 40" fill="none" stroke="#4a2a16" stroke-width="2.4" stroke-linecap="round"/>
<path d="M98 34 Q114 30 128 38" fill="none" stroke="rgba(255,220,180,.45)" stroke-width="3" stroke-linecap="round"/>
<path d="M75 74 Q84 69 93 74" fill="none" stroke="#4a2a16" stroke-width="3" stroke-linecap="round"/><path d="M107 74 Q116 69 125 74" fill="none" stroke="#4a2a16" stroke-width="3" stroke-linecap="round"/>
<g class="dl-eyes">
<ellipse cx="84" cy="86" rx="4.6" ry="5.4" fill="#ffffff" data-flat stroke="#2a1a14" stroke-width=".9"/><ellipse cx="116" cy="86" rx="4.6" ry="5.4" fill="#ffffff" data-flat stroke="#2a1a14" stroke-width=".9"/>
<circle cx="85" cy="87" r="2.8" fill="#4a7a3a" data-flat/><circle cx="117" cy="87" r="2.8" fill="#4a7a3a" data-flat/>
<circle cx="85" cy="87" r="1.5" fill="#0f0a08" data-flat/><circle cx="117" cy="87" r="1.5" fill="#0f0a08" data-flat/>
<circle cx="86.2" cy="85.6" r="1" fill="#ffffff" data-flat/><circle cx="118.2" cy="85.6" r="1" fill="#ffffff" data-flat/>
</g>
<g fill="none" stroke="#c99a3a" stroke-width="2.6"><circle cx="84" cy="86" r="10"/><circle cx="116" cy="86" r="10"/><path d="M94 85 Q100 81 106 85"/><path d="M74 84 L64 80 M126 84 L136 80"/></g>
<path d="M78 80 q4 -3 9 -2 M110 80 q4 -3 9 -2" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6" stroke-linecap="round"/>
<path d="M97 92 Q92 102 98 104 Q104 105 104 101" fill="${skin}" stroke="rgba(150,80,50,.6)" stroke-width="1.4"/>
<path d="M100 106 Q88 102 80 108 Q72 114 66 106 Q68 118 82 114 Q92 112 100 110 Q108 112 118 114 Q132 118 134 106 Q128 114 120 108 Q112 102 100 106 Z" fill="#5a3418"/>
<g class="dl-mouth dl-mouth-neutral"><path d="M91 115 Q100 120 109 115" fill="none" stroke="#6a2418" stroke-width="2.2" stroke-linecap="round"/></g>
<g class="dl-mouth dl-mouth-happy"><path d="M88 113 Q100 126 112 113 Z" fill="#8a2a1c" stroke="#5a1810" stroke-width="1.2"/><path d="M92 115 h16" stroke="#ffffff" stroke-width="2.4"/></g>
<g class="dl-mouth dl-mouth-wow"><ellipse cx="100" cy="117" rx="5" ry="6" fill="#5a1810"/></g>
<g class="dl-mouth dl-mouth-sad"><path d="M91 119 Q100 112 109 119" fill="none" stroke="#6a2418" stroke-width="2.2" stroke-linecap="round"/></g>
<ellipse cx="76" cy="100" rx="5.5" ry="3.2" fill="#ff8a7a" opacity=".4" data-flat/><ellipse cx="124" cy="100" rx="5.5" ry="3.2" fill="#ff8a7a" opacity=".4" data-flat/>`;
  const arm = `
<g class="dl-arm">
<path d="M150 172 Q170 152 168 120 L152 118 Q154 142 138 160 Z" fill="#f6f2ea"/>
<rect x="148" y="110" width="24" height="10" rx="4" fill="#f6f2ea"/>
<circle cx="160" cy="106" r="9" fill="${skin}"/>
<g class="dl-cup">
<path d="M146 100 L148 58 L176 58 L178 100 Z" fill="#d9a43a"/>
<path d="M148 58 L176 58" stroke="#fff0b8" stroke-width="5" stroke-linecap="round"/>
<path d="M146 100 L178 100" stroke="#a87418" stroke-width="5" stroke-linecap="round"/>
<path d="M153 64 L152 94" stroke="rgba(255,255,255,.55)" stroke-width="3.4" stroke-linecap="round"/>
<path d="M162 70 l3.6 7.4 l8 1 l-6 5.4 l1.6 8 l-7.2 -4 l-7.2 4 l1.6 -8 l-6 -5.4 l8 -1 Z" fill="#a87418"/>
</g>
</g>`;
  return toon(`<svg class="dealer-svg" viewBox="0 20 200 186" width="${size}" height="${Math.round((size * 186) / 200)}" aria-hidden="true">${body}${head}${arm}</svg>`, { outline: 1.3, light: 0.32, dark: -0.28 });
}

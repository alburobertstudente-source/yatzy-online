/**
 * Catalogo degli oggetti sbloccabili (skin, animazioni, vestiti dell'avatar…).
 * Tutto è disegnato dal gioco (CSS / SVG): qui ci sono solo i parametri.
 *
 * Ogni oggetto: { id, cat, name, rarity, ...parametri di disegno }.
 * Gli oggetti con `base: true` sono posseduti fin dall'inizio.
 */

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'absurd'];

export const RARITY = {
  common: { label: 'Comune', color: '#9aa3b5', dup: 10 },
  uncommon: { label: 'Non comune', color: '#35c46a', dup: 25 },
  rare: { label: 'Rara', color: '#3d8bff', dup: 60 },
  epic: { label: 'Epica', color: '#a54dff', dup: 150 },
  legendary: { label: 'Leggendaria', color: '#ffb31a', dup: 400 },
  mythic: { label: 'Mitica', color: '#ff3d7f', dup: 1000 },
  /** solo dadi con effetti assurdi (atterraggi esplosivi, suoni speciali) */
  absurd: { label: 'Assurda', color: '#00d9ff', dup: 2500 },
};

/** Categorie, nell'ordine in cui compaiono nell'armadio. */
export const CATEGORIES = [
  { id: 'dice', label: 'Dadi', group: 'gioco' },
  { id: 'roll', label: 'Lancio', group: 'gioco' },
  { id: 'cards', label: 'Carte', group: 'gioco' },
  { id: 'table', label: 'Tavolo', group: 'gioco' },
  { id: 'hat', label: 'Cappelli', group: 'avatar' },
  { id: 'face', label: 'Viso', group: 'avatar' },
  { id: 'shirt', label: 'Magliette', group: 'avatar' },
  { id: 'pants', label: 'Pantaloni', group: 'avatar' },
  { id: 'shoes', label: 'Scarpe', group: 'avatar' },
  { id: 'back', label: 'Schiena', group: 'avatar' },
  { id: 'frame', label: 'Cornici', group: 'profilo' },
  { id: 'title', label: 'Titoli', group: 'profilo' },
];

/** Categorie che si possono lasciare vuote (nessun oggetto indossato). */
export const OPTIONAL = new Set(['hat', 'face', 'back']);

const items = [];
const add = (cat, list) => {
  for (const [id, name, rarity, params = {}] of list) items.push({ id: `${cat}.${id}`, cat, name, rarity, ...params });
};

/* ---------------- DADI ----------------
 * face: sfondo CSS della faccia · pip: colore dei punti · edge: colore dell'interno
 * shape: dot | star | heart | diamond | square | skull · fx: effetto animato */
add('dice', [
  ['classic', 'Classico', 'common', { base: true, face: 'radial-gradient(circle at 32% 26%,#fff 0%,#f6f6f9 55%,#e4e4ec 100%)', pip: '#262a3d', edge: '#dcdce6', voice: 'classic' }],
  ['ivory', 'Avorio', 'common', { face: 'radial-gradient(circle at 32% 26%,#fffaf0,#f3e6c8)', pip: '#5b4630', edge: '#e6d6b0', voice: 'classic' }],
  ['mint', 'Menta', 'common', { face: 'radial-gradient(circle at 32% 26%,#e9fff5,#9de7c4)', pip: '#11573a', edge: '#86d6b1', voice: 'candy' }],
  ['peach', 'Pesca', 'common', { face: 'radial-gradient(circle at 32% 26%,#fff1e8,#ffb894)', pip: '#7a2f16', edge: '#f5a07c', voice: 'candy' }],
  ['sky', 'Cielo', 'common', { face: 'radial-gradient(circle at 32% 26%,#eef8ff,#8fcaff)', pip: '#0f3e73', edge: '#79b8f2', voice: 'classic' }],
  ['lavender', 'Lavanda', 'common', { face: 'radial-gradient(circle at 32% 26%,#f6f0ff,#c6a8ff)', pip: '#43217f', edge: '#b394f2', voice: 'classic' }],
  ['coal', 'Carbone', 'common', { face: 'radial-gradient(circle at 32% 26%,#555a70,#23263a)', pip: '#ffffff', edge: '#1b1d2c', voice: 'stone' }],
  ['lemon', 'Limone', 'common', { face: 'radial-gradient(circle at 32% 26%,#fffde6,#ffe45c)', pip: '#6a5200', edge: '#f0d140', voice: 'juicy' }],
  ['wood', 'Legno', 'uncommon', { face: 'repeating-linear-gradient(100deg,#c98b4f 0 5px,#b77a41 5px 9px,#d29a5e 9px 14px)', pip: '#3a210d', edge: '#9a6232', voice: 'wood' }],
  ['marble', 'Marmo', 'uncommon', { face: 'linear-gradient(135deg,#fafafa 0%,#e5e5ea 30%,#fff 45%,#d9d9e2 60%,#f7f7f9 100%)', pip: '#2b2b33', edge: '#cfcfd8', voice: 'stone' }],
  ['candy', 'Caramella', 'uncommon', { face: 'repeating-linear-gradient(45deg,#fff 0 6px,#ff8fb4 6px 12px)', pip: '#b0124b', edge: '#ff8fb4', voice: 'candy' }],
  ['tomato', 'Pomodoro', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#ff8a7a,#e2312b)', pip: '#ffffff', edge: '#b92420', voice: 'juicy' }],
  ['pistachio', 'Pistacchio', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#e8f7c8,#a7d36a)', pip: '#3e5a14', edge: '#93c057', voice: 'crunch' }],
  ['denim', 'Jeans', 'uncommon', { face: 'repeating-linear-gradient(135deg,#3f6fb0 0 2px,#4c7cbf 2px 4px)', pip: '#f4e9c8', edge: '#2d548c', voice: 'wood' }],
  ['terracotta', 'Terracotta', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#f0a77c,#c8643a)', pip: '#fff3e6', edge: '#a9512c', voice: 'stone' }],
  ['neon', 'Neon Verde', 'rare', { face: 'radial-gradient(circle at 32% 26%,#2b3346,#121624)', pip: '#5dff9c', edge: '#0c0f19', fx: 'glow', voice: 'synth' }],
  ['ocean', 'Oceano', 'rare', { face: 'linear-gradient(160deg,#5ee0ff 0%,#1b8fd6 55%,#0b4f8f 100%)', pip: '#ffffff', edge: '#0b4f8f', fx: 'wave', voice: 'bubble' }],
  ['choco', 'Cioccolato', 'rare', { face: 'radial-gradient(circle at 32% 26%,#9b6a45,#4e2d18)', pip: '#ffe7c4', edge: '#3c2112', voice: 'crunch' }],
  ['ice', 'Ghiaccio', 'rare', { face: 'linear-gradient(140deg,rgba(235,250,255,.95),rgba(150,215,255,.85) 60%,rgba(220,245,255,.95))', pip: '#1f6ea8', edge: '#a8dcff', fx: 'frost', voice: 'glass' }],
  ['ruby', 'Rubino', 'rare', { face: 'linear-gradient(140deg,#ff6d8a,#c3123d 60%,#ff3a62)', pip: '#ffe9ee', edge: '#8f0c2c', fx: 'gem', voice: 'gem' }],
  ['emerald', 'Smeraldo', 'rare', { face: 'linear-gradient(140deg,#6dffb4,#0e9c5a 60%,#2fe08a)', pip: '#eafff3', edge: '#0a6b3e', fx: 'gem', voice: 'gem' }],
  ['sapphire', 'Zaffiro', 'rare', { face: 'linear-gradient(140deg,#7fb2ff,#1846c9 60%,#3e78ff)', pip: '#eef3ff', edge: '#11318f', fx: 'gem', voice: 'gem' }],
  ['hearts', 'Cuoricini', 'rare', { face: 'radial-gradient(circle at 32% 26%,#fff0f6,#ffb3d1)', pip: '#e8175d', edge: '#ff9cc4', shape: 'heart', voice: 'candy' }],
  ['gold', 'Oro', 'epic', { face: 'linear-gradient(140deg,#fff3a8 0%,#ffcf33 35%,#d98c00 70%,#ffe27a 100%)', pip: '#5a3a00', edge: '#b97700', fx: 'shine', voice: 'metal' }],
  ['galaxy', 'Galassia', 'epic', { face: 'radial-gradient(circle at 30% 30%,#7a4dff 0%,#2b0f6b 45%,#0b0626 100%)', pip: '#ffffff', edge: '#0b0626', fx: 'stars', shape: 'star', voice: 'space' }],
  ['lava', 'Lava', 'epic', { face: 'radial-gradient(circle at 50% 50%,#3a1208,#140603)', pip: '#ffb02e', edge: '#140603', fx: 'lava', voice: 'lava' }],
  ['ghost', 'Fantasma', 'epic', { face: 'radial-gradient(circle at 32% 26%,rgba(255,255,255,.92),rgba(210,225,255,.55))', pip: '#6a7cff', edge: 'rgba(200,215,255,.4)', fx: 'ghost', voice: 'ghost' }],
  ['stars', 'Notte Stellata', 'epic', { face: 'radial-gradient(circle at 32% 26%,#2a3a7a,#0f1638)', pip: '#ffd94a', edge: '#0f1638', shape: 'star', voice: 'space' }],
  ['pixel', 'Pixel', 'epic', { face: 'repeating-conic-gradient(#9cf06a 0 25%,#7fd84f 0 50%) 0 0/12px 12px', pip: '#123b07', edge: '#5aa52f', shape: 'square', voice: 'retro' }],
  ['holo', 'Olografico', 'legendary', { face: 'linear-gradient(120deg,#ff9de2,#9de6ff,#b5ff9d,#fff59d,#ffb39d,#d99dff)', pip: '#262a3d', edge: '#c9b6ff', fx: 'holo', voice: 'gem' }],
  ['rainbow', 'Arcobaleno', 'legendary', { face: 'linear-gradient(90deg,#ff4d4d,#ffa64d,#ffe14d,#59e36b,#4db8ff,#9b6bff,#ff4d4d)', pip: '#ffffff', edge: '#9b6bff', fx: 'rainbow', voice: 'musical' }],
  ['diamond', 'Diamante', 'legendary', { face: 'linear-gradient(135deg,#ffffff,#dff4ff 30%,#ffffff 50%,#e9e2ff 70%,#ffffff)', pip: '#3aa0ff', edge: '#cfe8ff', shape: 'diamond', fx: 'sparkle', voice: 'glass' }],
  ['dragon', 'Drago', 'legendary', { face: 'radial-gradient(circle at 30% 30%,#ff5b3a 0 10%,transparent 11%) 0 0/10px 10px,linear-gradient(140deg,#c4151c,#5e0408)', pip: '#ffcf33', edge: '#4a0306', fx: 'fire', voice: 'fire' }],
  ['cosmic', 'Prisma Cosmico', 'mythic', { face: 'linear-gradient(120deg,#ff3dbb,#7a4dff,#2fd0ff,#56ff9e,#ffe14d,#ff3dbb)', pip: '#ffffff', edge: '#2b0f6b', shape: 'star', fx: 'cosmic', voice: 'cosmic' }],
  ['divine', 'Oro Divino', 'mythic', { face: 'linear-gradient(140deg,#fffbe0,#ffd84a 40%,#fff3a8 55%,#e09a00)', pip: '#ffffff', edge: '#c98300', shape: 'diamond', fx: 'divine', voice: 'divine' }],
]);

/* ---------------- DADI A TEMA (ognuno col suo suono) ----------------
 * ring: bordo interno della faccia · voice: suono · landFx: effetto quando atterra */
add('dice', [
  ['bubblegum', 'Gomma da masticare', 'common', { face: 'radial-gradient(circle at 32% 26%,#ffe3f1,#ff9cc9)', pip: '#c2185b', edge: '#ff8cbf', voice: 'candy' }],
  ['sand', 'Sabbia', 'common', { face: 'radial-gradient(#c9a86a 0.6px,transparent 0.8px) 0 0/5px 5px,radial-gradient(circle at 32% 26%,#fff3d6,#e8c98f)', pip: '#7a5a2a', edge: '#d9b878', voice: 'crunch' }],
  ['cloud', 'Nuvoletta', 'common', { face: 'radial-gradient(circle at 30% 30%,#ffffff 0 30%,#eaf4ff 60%,#cfe4ff)', pip: '#5aa0ff', edge: '#cfe4ff', shape: 'heart', voice: 'jelly' }],
  ['popit', 'Pop It Pastello', 'uncommon', { face: 'linear-gradient(135deg,#d6c8ff,#bff2e2)', pip: '#9a7bff', edge: '#b9a6ff', shape: 'bubble', voice: 'popit' }],
  ['pizza', 'Pizza Margherita', 'uncommon', { face: 'radial-gradient(circle at 26% 30%,#ffe9a0 0 9%,transparent 10%),radial-gradient(circle at 72% 62%,#ffe08a 0 11%,transparent 12%),radial-gradient(circle at 64% 24%,#fff1b8 0 7%,transparent 8%),radial-gradient(circle at 30% 74%,#ffe08a 0 8%,transparent 9%),radial-gradient(circle at 50% 50%,#ef5a3c,#cf3324)', pip: '#b02a1c', edge: '#d99a52', ring: '0 0 0 4px #e3a95e', shape: 'pepperoni', voice: 'pizza' }],
  ['watermelon', 'Anguria', 'uncommon', { face: 'radial-gradient(circle at 40% 35%,#ff8a98,#e8384f)', pip: '#2b1b17', edge: '#3fae4a', ring: '0 0 0 3px #f6ffe9, inset 0 0 0 6px #3fae4a', shape: 'seed', voice: 'juicy' }],
  ['cookie', 'Biscotto', 'uncommon', { face: 'radial-gradient(#b8854a 0.8px,transparent 1px) 0 0/6px 6px,radial-gradient(circle at 35% 30%,#f0c98a,#d49a52)', pip: '#4a2a12', edge: '#b8803f', shape: 'chip', voice: 'crunch' }],
  ['cheese', 'Formaggio', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#fff2a8,#ffcf3a)', pip: '#e3a500', edge: '#f2b800', shape: 'hole', voice: 'candy' }],
  ['bamboo', 'Bambù', 'uncommon', { face: 'repeating-linear-gradient(90deg,#c4e27a 0 9px,#a2c955 9px 11px)', pip: '#2f4a10', edge: '#8fb444', voice: 'wood' }],
  ['duck', 'Paperella', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#fff7b0,#ffd21a)', pip: '#ff7a1a', edge: '#f2c200', voice: 'duck' }],
  ['soccer', 'Pallone', 'uncommon', { face: 'radial-gradient(circle at 0 0,#2a2a33 0 16%,transparent 17%),radial-gradient(circle at 100% 0,#2a2a33 0 16%,transparent 17%),radial-gradient(circle at 0 100%,#2a2a33 0 16%,transparent 17%),radial-gradient(circle at 100% 100%,#2a2a33 0 16%,transparent 17%),#fafafa', pip: '#e8384f', edge: '#d9d9e2', voice: 'ball' }],
  ['donut', 'Ciambella', 'rare', { face: 'linear-gradient(135deg,#ffb3d6,#ff6fa8)', pip: '#ffffff', edge: '#d99a5a', ring: '0 0 0 4px #e0a868', shape: 'sprinkle', voice: 'candy' }],
  ['sushi', 'Sushi', 'rare', { face: 'radial-gradient(#e9e4d6 0.7px,transparent 1px) 0 0/4px 4px,radial-gradient(circle,#ffffff,#f3efe2)', pip: '#ff8a5c', edge: '#1f3a2a', ring: '0 0 0 5px #1d3527', shape: 'salmon', voice: 'juicy' }],
  ['musical', 'Dadi Musicali', 'rare', { face: 'linear-gradient(90deg,transparent 0 22%,#1b1b2a 22% 30%,transparent 30% 47%,#1b1b2a 47% 55%,transparent 55% 72%,#1b1b2a 72% 80%,transparent 80%) 0 0/100% 38% no-repeat,repeating-linear-gradient(90deg,#fff 0 8px,#d9d9e4 8px 9px)', pip: '#5a2bd8', edge: '#e9e9f2', shape: 'note', voice: 'musical', landFx: 'notes' }],
  ['popit_rainbow', 'Pop It Arcobaleno', 'rare', { face: 'linear-gradient(90deg,#ff8a8a,#ffc46b,#fff07b,#86e39a,#7bc8ff,#c19bff)', pip: '#ffffff', edge: '#c19bff', shape: 'bubble', voice: 'popit' }],
  ['gummy', 'Orsetto Gommoso', 'rare', { face: 'radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),rgba(255,90,120,.8) 55%,rgba(200,30,70,.9))', pip: '#ffffff', edge: '#e0405e', shape: 'heart', fx: 'jelly', voice: 'jelly' }],
  ['paw', 'Zampetta', 'rare', { face: 'radial-gradient(circle at 32% 26%,#ffffff,#f6e3ea)', pip: '#ff8fb4', edge: '#f2cdd9', shape: 'paw', voice: 'cat' }],
  ['money', 'Dollaroni', 'rare', { face: 'repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 3px,transparent 3px 7px),linear-gradient(135deg,#bfe8b0,#6cbf5a)', pip: '#1f6b2a', edge: '#5aa84a', shape: 'dollar', voice: 'coin' }],
  ['arcade', 'Arcade', 'rare', { face: 'linear-gradient(rgba(255,61,242,.25) 1px,transparent 1px) 0 0/8px 8px,linear-gradient(90deg,rgba(32,227,255,.25) 1px,transparent 1px) 0 0/8px 8px,#14102a', pip: '#ff3df2', edge: '#0b0818', shape: 'square', fx: 'glow', voice: 'retro' }],
  ['slime', 'Slime', 'rare', { face: 'radial-gradient(circle at 35% 25%,#efffc2,#86e43f 50%,#3fa31a)', pip: '#1f4a0a', edge: '#3fa31a', fx: 'jelly', voice: 'slime' }],
  ['drum', 'Batteria', 'epic', { face: 'radial-gradient(circle,#fdfdfd 0 60%,#dcdce6 61% 64%,#c4102a 65%)', pip: '#262a3d', edge: '#9a0c20', voice: 'drum', landFx: 'rings' }],
  ['aquarium', 'Acquario', 'epic', { face: 'linear-gradient(180deg,#8fe8ff,#1b8fd6 70%,#e8c98f 71%)', pip: '#ff9f1a', edge: '#1b6fb0', shape: 'fish', fx: 'bubbles', voice: 'bubble', landFx: 'bubbles' }],
  ['synthwave', 'Synthwave', 'epic', { face: 'linear-gradient(180deg,#2b0f55 0%,#c2306f 52%,#ff9a3c 53% 60%,#ff3dbb 61%)', pip: '#20e3ff', edge: '#2b0f55', fx: 'glow', voice: 'synth' }],
  ['snowflake', 'Fiocco di Neve', 'epic', { face: 'radial-gradient(circle at 32% 26%,#ffffff,#cfeaff)', pip: '#4f9cf5', edge: '#bfe0ff', shape: 'flake', fx: 'frost', voice: 'glass', landFx: 'snow' }],
  ['pumpkin', 'Zucca', 'epic', { face: 'repeating-linear-gradient(90deg,rgba(0,0,0,.06) 0 2px,transparent 2px 12px),radial-gradient(circle at 40% 35%,#ffb13d,#f07a12)', pip: '#2a1405', edge: '#c45a0a', shape: 'tri', fx: 'glowin', voice: 'spooky' }],
  ['planet', 'Pianeta', 'epic', { face: 'linear-gradient(160deg,transparent 44%,rgba(255,240,210,.85) 46% 52%,transparent 54%),radial-gradient(circle at 35% 30%,#ffd9a8,#c4723a 60%,#6a2f10)', pip: '#ffffff', edge: '#6a2f10', shape: 'star', fx: 'stars', voice: 'space' }],
  ['storm', 'Tempesta', 'epic', { face: 'linear-gradient(180deg,#3a4566,#1b2033)', pip: '#ffe14d', edge: '#1b2033', shape: 'diamond', fx: 'storm', voice: 'thunder', landFx: 'zap' }],
  ['cat', 'Gattino Rosso', 'epic', { face: 'repeating-linear-gradient(100deg,#ffb35a 0 6px,#f08a2a 6px 9px)', pip: '#3a1f0a', edge: '#d9741a', shape: 'paw', voice: 'cat', landFx: 'hearts' }],
  ['geode', 'Geode', 'legendary', { face: 'conic-gradient(from 30deg,#5a2a9a,#b38bff,#3b1d8f,#e0c8ff,#7a4dff,#5a2a9a)', pip: '#ffffff', edge: '#3b1d8f', shape: 'diamond', fx: 'gem', voice: 'gem', landFx: 'sparkle' }],
  ['lavalamp', 'Lampada Lava', 'legendary', { face: 'radial-gradient(circle at 30% 70%,#ffb02e 0 18%,transparent 19%),radial-gradient(circle at 70% 30%,#ff5a3c 0 14%,transparent 15%),linear-gradient(180deg,#5a0f3a,#2a0c2a)', pip: '#fff3a0', edge: '#2a0c2a', fx: 'lavalamp', voice: 'lava', landFx: 'bubbles' }],
  ['hologram', 'Ologramma', 'legendary', { face: 'repeating-linear-gradient(180deg,rgba(168,255,247,.18) 0 2px,transparent 2px 4px),linear-gradient(135deg,rgba(32,227,255,.55),rgba(122,77,255,.45))', pip: '#c8fff9', edge: 'rgba(32,227,255,.4)', fx: 'scan', voice: 'synth', landFx: 'sparkle' }],
  ['piano', 'Gran Pianoforte', 'legendary', { face: 'linear-gradient(160deg,#3a3a46 0%,#0f0f16 45%,#22222c 100%)', pip: '#ffcf33', edge: '#0f0f16', shape: 'note', fx: 'shine', voice: 'piano', landFx: 'notes' }],
  ['goldpizza', "Pizza d'Oro", 'legendary', { face: 'radial-gradient(circle at 26% 30%,#fff6c2 0 9%,transparent 10%),radial-gradient(circle at 72% 62%,#fff1a8 0 11%,transparent 12%),linear-gradient(140deg,#fff3a8,#ffcf33 40%,#d98c00)', pip: '#b06a00', edge: '#c98300', ring: '0 0 0 4px #ffe27a', shape: 'pepperoni', fx: 'shine', voice: 'pizza', landFx: 'coins' }],
  ['aurora', 'Aurora Boreale', 'mythic', { face: 'linear-gradient(160deg,#0b1a3a,#1b6f6a,#56ff9e,#7a4dff,#0b1a3a)', pip: '#e8fff4', edge: '#0b1a3a', shape: 'star', fx: 'holo', voice: 'space', landFx: 'sparkle' }],
  ['crystalheart', 'Cuore di Cristallo', 'mythic', { face: 'linear-gradient(135deg,#ffe0f0,#ff9cd0 35%,#fff 50%,#ffb3e0 65%,#ff6fb8)', pip: '#ff2a8a', edge: '#ff9cd0', shape: 'heart', fx: 'sparkle', voice: 'gem', landFx: 'hearts' }],
]);

/* ---------------- DADI ASSURDI: la rarità più alta ---------------- */
add('dice', [
  ['dj', 'Dado DJ', 'absurd', { face: 'repeating-linear-gradient(90deg,#20e3ff 0 3px,transparent 3px 7px) 0 100%/100% 35% no-repeat,radial-gradient(circle at 50% 30%,#2b1050,#07060f)', pip: '#20e3ff', edge: '#07060f', fx: 'dj', voice: 'dj', landFx: 'dj' }],
  ['blackhole', 'Buco Nero', 'absurd', { face: 'radial-gradient(circle,#000 0 26%,#2a0d55 36%,#ff7a1a 44%,#3b1d8f 52%,#000 68%)', pip: '#ffe9c4', edge: '#000', fx: 'vortex', voice: 'blackhole', landFx: 'blackhole' }],
  ['unicorn', 'Unicorno', 'absurd', { face: 'linear-gradient(135deg,#ffd1f0,#d1e8ff,#d9ffd1,#fff6c8,#ffd1f0)', pip: '#ff5ad0', edge: '#ffd1f0', shape: 'star', fx: 'holo', voice: 'unicorn', landFx: 'unicorn' }],
  ['phoenix', 'Fenice', 'absurd', { face: 'linear-gradient(0deg,#ff2a00,#ff9f1a 50%,#ffe14d)', pip: '#fff7d6', edge: '#c41a00', shape: 'diamond', fx: 'fireflow', voice: 'phoenix', landFx: 'phoenix' }],
  ['infinity', 'Dado Infinito', 'absurd', { face: 'conic-gradient(from 0deg,#ff3dbb,#7a4dff,#2fd0ff,#56ff9e,#ffe14d,#ff3dbb)', pip: '#ffffff', edge: '#2b0f55', shape: 'star', fx: 'kaleido', voice: 'infinity', landFx: 'infinity' }],
  ['disco', 'Palla da Discoteca', 'absurd', { face: 'repeating-conic-gradient(#b9c4da 0 25%,#f4f7ff 0 50%) 0 0/8px 8px', pip: '#ff3dbb', edge: '#8b94a8', fx: 'disco', voice: 'disco', landFx: 'disco' }],
  ['tnt', 'Dinamite', 'absurd', { face: 'repeating-linear-gradient(0deg,#d6283d 0 9px,#b81f30 9px 11px)', pip: '#fff3c4', edge: '#7a0b16', fx: 'fuse', voice: 'tnt', landFx: 'tnt' }],
  ['cosmiccat', 'Gatto Cosmico', 'absurd', { face: 'radial-gradient(circle at 30% 30%,#8f5bff,#1a0c4a)', pip: '#ffd1f0', edge: '#1a0c4a', shape: 'paw', fx: 'stars', voice: 'cosmiccat', landFx: 'cosmiccat' }],
  ['tsunami', 'Tsunami', 'absurd', { face: 'linear-gradient(180deg,#e6fbff 0%,#5fd3ff 40%,#1b8fd6 70%,#0b3f7a)', pip: '#ffffff', edge: '#0b3f7a', shape: 'bubble', fx: 'wave', voice: 'tsunami', landFx: 'tsunami' }],
  ['party', 'Festa Pazza', 'absurd', { face: 'radial-gradient(circle at 20% 25%,#ff3d7f 0 5%,transparent 6%),radial-gradient(circle at 75% 20%,#ffd23f 0 5%,transparent 6%),radial-gradient(circle at 30% 75%,#2fd0ff 0 5%,transparent 6%),radial-gradient(circle at 80% 70%,#56ff9e 0 5%,transparent 6%),radial-gradient(circle at 55% 50%,#a54dff 0 4%,transparent 5%),#fffaf0', pip: '#ff3d7f', edge: '#ffd23f', shape: 'star', fx: 'confettiflow', voice: 'party', landFx: 'party' }],
]);

/* ---------------- ANIMAZIONI DI LANCIO ---------------- */
add('roll', [
  ['classic', 'Classico', 'common', { base: true, style: 'classic' }],
  ['bounce', 'Super Rimbalzo', 'common', { style: 'bounce' }],
  ['hop', 'Saltello', 'common', { style: 'hop' }],
  ['bubbles', 'Bolle', 'uncommon', { style: 'bubbles' }],
  ['tornado', 'Vortice', 'uncommon', { style: 'tornado' }],
  ['confetti', 'Coriandoli', 'rare', { style: 'confetti' }],
  ['ghost', 'Fantasma', 'rare', { style: 'ghost' }],
  ['rocket', 'Razzo', 'rare', { style: 'rocket' }],
  ['meteor', 'Meteora', 'epic', { style: 'meteor' }],
  ['lightning', 'Fulmine', 'epic', { style: 'lightning' }],
  ['glitch', 'Glitch', 'epic', { style: 'glitch' }],
  ['portal', 'Portale', 'legendary', { style: 'portal' }],
  ['stardust', 'Stelle Cadenti', 'legendary', { style: 'stardust' }],
  ['rainbow', 'Scia Arcobaleno', 'legendary', { style: 'rainbow' }],
  ['blackhole', 'Buco Nero', 'mythic', { style: 'blackhole' }],
]);

/* ---------------- CARTE ---------------- */
add('cards', [
  ['silver', 'Argento', 'common', { base: true, skin: 'silver' }],
  ['bronze', 'Bronzo', 'common', { skin: 'bronze' }],
  ['kraft', 'Carta Kraft', 'common', { skin: 'kraft' }],
  ['ocean', 'Oceano', 'uncommon', { skin: 'ocean' }],
  ['forest', 'Foresta', 'uncommon', { skin: 'forest' }],
  ['carbon', 'Carbonio', 'rare', { skin: 'carbon' }],
  ['neon', 'Neon', 'rare', { skin: 'neon' }],
  ['frost', 'Ghiaccio', 'rare', { skin: 'frost' }],
  ['lava', 'Lava', 'epic', { skin: 'lava' }],
  ['galaxy', 'Galassia', 'epic', { skin: 'galaxy' }],
  ['gold', 'Oro', 'epic', { skin: 'gold' }],
  ['holo', 'Olografica', 'legendary', { skin: 'holo' }],
  ['rainbow', 'Arcobaleno', 'legendary', { skin: 'rainbow' }],
  ['prism', 'Prisma Mitico', 'mythic', { skin: 'prism' }],
]);

/* ---------------- TAVOLO ---------------- */
add('table', [
  ['classic', 'Classico', 'common', { base: true, theme: 'classic' }],
  ['sunset', 'Tramonto', 'common', { theme: 'sunset' }],
  ['meadow', 'Prato', 'common', { theme: 'meadow' }],
  ['ocean', 'Oceano', 'uncommon', { theme: 'ocean' }],
  ['candy', 'Caramella', 'uncommon', { theme: 'candy' }],
  ['night', 'Notte', 'rare', { theme: 'night' }],
  ['desert', 'Deserto', 'rare', { theme: 'desert' }],
  ['glacier', 'Ghiacciaio', 'rare', { theme: 'glacier' }],
  ['volcano', 'Vulcano', 'epic', { theme: 'volcano' }],
  ['space', 'Spazio', 'epic', { theme: 'space' }],
  ['neoncity', 'Città Neon', 'legendary', { theme: 'neoncity' }],
  ['aurora', 'Aurora', 'legendary', { theme: 'aurora' }],
  ['heaven', 'Paradiso Dorato', 'mythic', { theme: 'heaven' }],
]);

/* ---------------- AVATAR ----------------
 * type: forma disegnata dall'avatar · c1/c2/c3: colori · fx: effetto */
add('hat', [
  ['cap_red', 'Cappellino rosso', 'common', { type: 'cap', c1: '#e8434f', c2: '#b42c3a' }],
  ['cap_blue', 'Cappellino blu', 'common', { type: 'cap', c1: '#3388e8', c2: '#1d5fb0' }],
  ['beanie', 'Berretto di lana', 'common', { type: 'beanie', c1: '#2fb36f', c2: '#ffffff' }],
  ['bandana', 'Bandana', 'common', { type: 'bandana', c1: '#d8283d', c2: '#ffffff' }],
  ['bucket', 'Cappello da pescatore', 'uncommon', { type: 'bucket', c1: '#e9d9a8', c2: '#bfa76a' }],
  ['headphones', 'Cuffie', 'uncommon', { type: 'headphones', c1: '#2b2f45', c2: '#ff3d7f' }],
  ['chef', 'Cappello da cuoco', 'uncommon', { type: 'chef', c1: '#ffffff', c2: '#e3e6ee' }],
  ['party', 'Cappello da festa', 'uncommon', { type: 'party', c1: '#ffcf33', c2: '#ff4d8d' }],
  ['tophat', 'Cilindro', 'rare', { type: 'tophat', c1: '#22242f', c2: '#d6283d' }],
  ['cowboy', 'Cappello da cowboy', 'rare', { type: 'cowboy', c1: '#a0632e', c2: '#6d3f18' }],
  ['viking', 'Elmo vichingo', 'rare', { type: 'viking', c1: '#9aa6b8', c2: '#fff3d6' }],
  ['pirate', 'Cappello da pirata', 'rare', { type: 'pirate', c1: '#1e1f2a', c2: '#ffffff' }],
  ['bunny', 'Orecchie da coniglio', 'epic', { type: 'bunny', c1: '#ffffff', c2: '#ffb3cf' }],
  ['horns', 'Corna da diavoletto', 'epic', { type: 'horns', c1: '#e01f2f', c2: '#7d0a14' }],
  ['wizard', 'Cappello da mago', 'epic', { type: 'wizard', c1: '#4b2bbf', c2: '#ffd94a' }],
  ['crown', 'Corona', 'legendary', { type: 'crown', c1: '#ffcf33', c2: '#e2314a', fx: 'shine' }],
  ['halo', 'Aureola', 'legendary', { type: 'halo', c1: '#fff1a0', c2: '#ffcf33', fx: 'glow' }],
  ['firecrown', 'Corona di fuoco', 'mythic', { type: 'crown', c1: '#ff7a1a', c2: '#ffe14d', fx: 'fire' }],
  ['cosmic', 'Corona cosmica', 'mythic', { type: 'crown', c1: '#7a4dff', c2: '#2fd0ff', fx: 'cosmic' }],
]);

add('face', [
  ['round', 'Occhiali tondi', 'common', { type: 'glasses', c1: '#2b2f45' }],
  ['sun', 'Occhiali da sole', 'common', { type: 'sunglasses', c1: '#15161f', c2: '#3a3f5c' }],
  ['mustache', 'Baffi', 'common', { type: 'mustache', c1: '#4a2c17' }],
  ['patch', 'Benda da pirata', 'uncommon', { type: 'patch', c1: '#15161f' }],
  ['star', 'Occhiali a stella', 'uncommon', { type: 'starglasses', c1: '#ff4d8d', c2: '#ffe14d' }],
  ['monocle', 'Monocolo', 'rare', { type: 'monocle', c1: '#d9a400' }],
  ['beard', 'Barba', 'rare', { type: 'beard', c1: '#5a3418' }],
  ['hero', 'Maschera da eroe', 'rare', { type: 'mask', c1: '#2f57d8' }],
  ['3d', 'Occhiali 3D', 'epic', { type: '3d', c1: '#ffffff', c2: '#ff3a4a', c3: '#2fb8ff' }],
  ['cyber', 'Visore cyber', 'epic', { type: 'visor', c1: '#20e3ff', c2: '#1b2133', fx: 'glow' }],
  ['laser', 'Occhi laser', 'legendary', { type: 'laser', c1: '#ff2a3d', fx: 'glow' }],
  ['goldmask', "Maschera d'oro", 'legendary', { type: 'mask', c1: '#ffcf33', fx: 'shine' }],
  ['cosmic', 'Occhi cosmici', 'mythic', { type: 'cosmiceyes', c1: '#b38bff', c2: '#2fd0ff', fx: 'cosmic' }],
]);

add('shirt', [
  ['basic', 'Maglietta bianca', 'common', { base: true, type: 'tee', c1: '#f4f5f9', c2: '#d6d9e3' }],
  ['red', 'Maglietta rossa', 'common', { type: 'tee', c1: '#ee4655', c2: '#bf2c3f' }],
  ['blue', 'Maglietta blu', 'common', { type: 'tee', c1: '#2f8ae8', c2: '#1b5fb4' }],
  ['green', 'Maglietta verde', 'common', { type: 'tee', c1: '#1fb36b', c2: '#12814c' }],
  ['stripes', 'Righe marinare', 'common', { type: 'stripes', c1: '#ffffff', c2: '#1d3f8f' }],
  ['hoodie', 'Felpa', 'uncommon', { type: 'hoodie', c1: '#8b5cf6', c2: '#6d3fe0' }],
  ['tank', 'Canotta', 'uncommon', { type: 'tank', c1: '#ffcf33', c2: '#d99c00' }],
  ['jersey', 'Maglia numero 10', 'uncommon', { type: 'jersey', c1: '#2fb36f', c2: '#ffffff', text: '10' }],
  ['hawaii', 'Camicia hawaiana', 'rare', { type: 'hawaii', c1: '#2fc7c0', c2: '#ff7a59' }],
  ['leather', 'Giubbotto di pelle', 'rare', { type: 'jacket', c1: '#26272f', c2: '#4a4b57' }],
  ['tux', 'Smoking', 'rare', { type: 'tux', c1: '#1e1f29', c2: '#ffffff' }],
  ['space', 'Tuta spaziale', 'epic', { type: 'space', c1: '#f1f3f8', c2: '#ff7a1a' }],
  ['armor', 'Armatura', 'epic', { type: 'armor', c1: '#b8c2d4', c2: '#7d889d' }],
  ['flame', 'Maglia di fuoco', 'epic', { type: 'flame', c1: '#2a1a1a', c2: '#ff7a1a', fx: 'fire' }],
  ['goldjacket', 'Giacca dorata', 'legendary', { type: 'jacket', c1: '#ffcf33', c2: '#d98c00', fx: 'shine' }],
  ['dragon', 'Armatura di drago', 'legendary', { type: 'armor', c1: '#d6283d', c2: '#7a0b16', fx: 'fire' }],
  ['cosmic', 'Veste cosmica', 'mythic', { type: 'robe', c1: '#3b1d8f', c2: '#2fd0ff', fx: 'cosmic' }],
]);

add('pants', [
  ['basic', 'Pantaloni grigi', 'common', { base: true, type: 'long', c1: '#6c7488', c2: '#545b6d' }],
  ['jeans', 'Jeans', 'common', { type: 'long', c1: '#3f6fb0', c2: '#2d548c' }],
  ['shorts', 'Pantaloncini', 'common', { type: 'shorts', c1: '#ff9f43', c2: '#d97a1c' }],
  ['track', 'Tuta', 'common', { type: 'track', c1: '#22242f', c2: '#ffffff' }],
  ['cargo', 'Cargo', 'uncommon', { type: 'cargo', c1: '#7c8a4b', c2: '#5d6a33' }],
  ['plaid', 'Scozzesi', 'uncommon', { type: 'plaid', c1: '#c4202f', c2: '#1b2a5c' }],
  ['camo', 'Mimetici', 'uncommon', { type: 'camo', c1: '#5b7a3a', c2: '#3a4f24' }],
  ['pirate', 'Pantaloni da pirata', 'rare', { type: 'pirate', c1: '#f1e3c4', c2: '#7a4b23' }],
  ['leather', 'Pelle nera', 'rare', { type: 'long', c1: '#1e1f27', c2: '#3a3c4a' }],
  ['rainbow', 'Arcobaleno', 'epic', { type: 'rainbow', c1: '#ff4d4d', c2: '#4db8ff' }],
  ['gold', "Pantaloni d'oro", 'legendary', { type: 'long', c1: '#ffcf33', c2: '#d98c00', fx: 'shine' }],
  ['lava', 'Gambe di lava', 'legendary', { type: 'lava', c1: '#2a0c06', c2: '#ff7a1a', fx: 'fire' }],
  ['stars', 'Pantaloni stellari', 'mythic', { type: 'stars', c1: '#171a4a', c2: '#ffe14d', fx: 'cosmic' }],
]);

add('shoes', [
  ['basic', 'Scarpe bianche', 'common', { base: true, type: 'sneaker', c1: '#ffffff', c2: '#c9ced9' }],
  ['flip', 'Ciabatte', 'common', { type: 'flip', c1: '#2fc7c0', c2: '#f3d3b0' }],
  ['rain', 'Stivali da pioggia', 'common', { type: 'boot', c1: '#ffd23f', c2: '#d9a400' }],
  ['red', 'Scarpe rosse', 'common', { type: 'sneaker', c1: '#ee4655', c2: '#ffffff' }],
  ['high', 'Scarpe alte', 'uncommon', { type: 'high', c1: '#2b2f45', c2: '#ffffff' }],
  ['hiking', 'Scarponi', 'uncommon', { type: 'boot', c1: '#8a5a2b', c2: '#5c3a17' }],
  ['neon', 'Scarpe neon', 'rare', { type: 'sneaker', c1: '#5dff9c', c2: '#ff3d7f', fx: 'glow' }],
  ['cowboy', 'Stivali da cowboy', 'rare', { type: 'cowboy', c1: '#a0632e', c2: '#d9a400' }],
  ['flippers', 'Pinne', 'rare', { type: 'flippers', c1: '#2f8ae8', c2: '#1b5fb4' }],
  ['skates', 'Pattini', 'epic', { type: 'skates', c1: '#ff4d8d', c2: '#ffe14d' }],
  ['gold', "Stivali d'oro", 'legendary', { type: 'boot', c1: '#ffcf33', c2: '#d98c00', fx: 'shine' }],
  ['rocket', 'Scarpe razzo', 'legendary', { type: 'rocket', c1: '#e8eef8', c2: '#ff7a1a', fx: 'fire' }],
  ['winged', 'Scarpe alate', 'mythic', { type: 'winged', c1: '#ffffff', c2: '#ffe14d', fx: 'cosmic' }],
]);

add('back', [
  ['backpack', 'Zaino', 'common', { type: 'backpack', c1: '#ee4655', c2: '#bf2c3f' }],
  ['cape', 'Mantello rosso', 'uncommon', { type: 'cape', c1: '#d6283d', c2: '#8f1220' }],
  ['guitar', 'Chitarra', 'uncommon', { type: 'guitar', c1: '#c97b2e', c2: '#3a210d' }],
  ['butterfly', 'Ali di farfalla', 'rare', { type: 'butterfly', c1: '#ff8fd0', c2: '#8fd6ff' }],
  ['wizardcape', 'Mantello da mago', 'rare', { type: 'cape', c1: '#3b2bbf', c2: '#ffd94a' }],
  ['jetpack', 'Jetpack', 'epic', { type: 'jetpack', c1: '#9aa6b8', c2: '#ff7a1a' }],
  ['angel', "Ali d'angelo", 'epic', { type: 'wings', c1: '#ffffff', c2: '#dfe8ff', fx: 'glow' }],
  ['dragon', 'Ali di drago', 'legendary', { type: 'batwings', c1: '#b3141f', c2: '#5e0408' }],
  ['fire', 'Ali di fuoco', 'legendary', { type: 'wings', c1: '#ff7a1a', c2: '#ffe14d', fx: 'fire' }],
  ['cosmic', 'Ali cosmiche', 'mythic', { type: 'wings', c1: '#7a4dff', c2: '#2fd0ff', fx: 'cosmic' }],
]);

/* ---------------- PROFILO ---------------- */
add('frame', [
  ['basic', 'Semplice', 'common', { base: true, frame: 'basic' }],
  ['wood', 'Legno', 'common', { frame: 'wood' }],
  ['silver', 'Argento', 'uncommon', { frame: 'silver' }],
  ['gold', 'Oro', 'rare', { frame: 'gold' }],
  ['flowers', 'Fiori', 'rare', { frame: 'flowers' }],
  ['flame', 'Fiamme', 'epic', { frame: 'flame' }],
  ['frost', 'Ghiaccio', 'epic', { frame: 'frost' }],
  ['neon', 'Neon', 'legendary', { frame: 'neon' }],
  ['rainbow', 'Arcobaleno', 'legendary', { frame: 'rainbow' }],
  ['cosmic', 'Cosmo', 'mythic', { frame: 'cosmic' }],
]);

add('title', [
  ['rookie', 'Principiante', 'common', { base: true }],
  ['roller', 'Lanciatore', 'common'],
  ['lucky', 'Fortunello', 'common'],
  ['shooter', 'Tiratore di dadi', 'uncommon'],
  ['trisking', 'Re del Tris', 'uncommon'],
  ['doctor', 'Amico del Dottore', 'rare'],
  ['exorcist', 'Scacciadiavoli', 'rare'],
  ['straight', 'Cacciatore di Scale', 'rare'],
  ['fullmaster', 'Maestro del Full', 'epic'],
  ['bosstamer', 'Domatore di Boss', 'epic'],
  ['yatzylord', 'Signore degli Yatzy', 'legendary'],
  ['godhand', 'Mano degli Dei', 'legendary'],
  ['legend', 'Leggenda Vivente', 'mythic'],
]);

export const ITEMS = Object.fromEntries(items.map((it) => [it.id, it]));
export const ITEM_LIST = items;

/** Oggetti posseduti da subito. */
export const BASE_ITEMS = items.filter((it) => it.base).map((it) => it.id);

/** Equipaggiamento iniziale: l'avatar standard. */
export const DEFAULT_EQUIP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, OPTIONAL.has(c.id) ? null : items.find((it) => it.cat === c.id && it.base)?.id ?? null]),
);

/** Carnagioni (sempre libere). */
export const SKIN_TONES = ['#ffdcc2', '#f5c39c', '#d99b6c', '#a86b43', '#6e4329', '#ffe0b8'];

export function itemsOf(cat) {
  return items.filter((it) => it.cat === cat);
}

/** Oggetti ottenibili dalle casse (non quelli di base). */
export function droppable(rarity) {
  return items.filter((it) => !it.base && it.rarity === rarity);
}

export function rarityRank(r) {
  return RARITY_ORDER.indexOf(r);
}

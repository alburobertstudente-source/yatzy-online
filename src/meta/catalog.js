/**
 * Catalogo degli oggetti sbloccabili (skin, animazioni, vestiti dell'avatar…).
 * Tutto è disegnato dal gioco (CSS / SVG): qui ci sono solo i parametri.
 *
 * Ogni oggetto: { id, cat, name, rarity, ...parametri di disegno }.
 * Gli oggetti con `base: true` sono posseduti fin dall'inizio.
 */

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITY = {
  common: { label: 'Comune', color: '#9aa3b5', dup: 10 },
  uncommon: { label: 'Non comune', color: '#35c46a', dup: 25 },
  rare: { label: 'Rara', color: '#3d8bff', dup: 60 },
  epic: { label: 'Epica', color: '#a54dff', dup: 150 },
  legendary: { label: 'Leggendaria', color: '#ffb31a', dup: 400 },
  mythic: { label: 'Mitica', color: '#ff3d7f', dup: 1000 },
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
  ['classic', 'Classico', 'common', { base: true, face: 'radial-gradient(circle at 32% 26%,#fff 0%,#f6f6f9 55%,#e4e4ec 100%)', pip: '#262a3d', edge: '#dcdce6' }],
  ['ivory', 'Avorio', 'common', { face: 'radial-gradient(circle at 32% 26%,#fffaf0,#f3e6c8)', pip: '#5b4630', edge: '#e6d6b0' }],
  ['mint', 'Menta', 'common', { face: 'radial-gradient(circle at 32% 26%,#e9fff5,#9de7c4)', pip: '#11573a', edge: '#86d6b1' }],
  ['peach', 'Pesca', 'common', { face: 'radial-gradient(circle at 32% 26%,#fff1e8,#ffb894)', pip: '#7a2f16', edge: '#f5a07c' }],
  ['sky', 'Cielo', 'common', { face: 'radial-gradient(circle at 32% 26%,#eef8ff,#8fcaff)', pip: '#0f3e73', edge: '#79b8f2' }],
  ['lavender', 'Lavanda', 'common', { face: 'radial-gradient(circle at 32% 26%,#f6f0ff,#c6a8ff)', pip: '#43217f', edge: '#b394f2' }],
  ['coal', 'Carbone', 'common', { face: 'radial-gradient(circle at 32% 26%,#555a70,#23263a)', pip: '#ffffff', edge: '#1b1d2c' }],
  ['lemon', 'Limone', 'common', { face: 'radial-gradient(circle at 32% 26%,#fffde6,#ffe45c)', pip: '#6a5200', edge: '#f0d140' }],
  ['wood', 'Legno', 'uncommon', { face: 'repeating-linear-gradient(100deg,#c98b4f 0 5px,#b77a41 5px 9px,#d29a5e 9px 14px)', pip: '#3a210d', edge: '#9a6232' }],
  ['marble', 'Marmo', 'uncommon', { face: 'linear-gradient(135deg,#fafafa 0%,#e5e5ea 30%,#fff 45%,#d9d9e2 60%,#f7f7f9 100%)', pip: '#2b2b33', edge: '#cfcfd8' }],
  ['candy', 'Caramella', 'uncommon', { face: 'repeating-linear-gradient(45deg,#fff 0 6px,#ff8fb4 6px 12px)', pip: '#b0124b', edge: '#ff8fb4' }],
  ['tomato', 'Pomodoro', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#ff8a7a,#e2312b)', pip: '#ffffff', edge: '#b92420' }],
  ['pistachio', 'Pistacchio', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#e8f7c8,#a7d36a)', pip: '#3e5a14', edge: '#93c057' }],
  ['denim', 'Jeans', 'uncommon', { face: 'repeating-linear-gradient(135deg,#3f6fb0 0 2px,#4c7cbf 2px 4px)', pip: '#f4e9c8', edge: '#2d548c' }],
  ['terracotta', 'Terracotta', 'uncommon', { face: 'radial-gradient(circle at 32% 26%,#f0a77c,#c8643a)', pip: '#fff3e6', edge: '#a9512c' }],
  ['neon', 'Neon Verde', 'rare', { face: 'radial-gradient(circle at 32% 26%,#2b3346,#121624)', pip: '#5dff9c', edge: '#0c0f19', fx: 'glow' }],
  ['ocean', 'Oceano', 'rare', { face: 'linear-gradient(160deg,#5ee0ff 0%,#1b8fd6 55%,#0b4f8f 100%)', pip: '#ffffff', edge: '#0b4f8f', fx: 'wave' }],
  ['choco', 'Cioccolato', 'rare', { face: 'radial-gradient(circle at 32% 26%,#9b6a45,#4e2d18)', pip: '#ffe7c4', edge: '#3c2112' }],
  ['ice', 'Ghiaccio', 'rare', { face: 'linear-gradient(140deg,rgba(235,250,255,.95),rgba(150,215,255,.85) 60%,rgba(220,245,255,.95))', pip: '#1f6ea8', edge: '#a8dcff', fx: 'frost' }],
  ['ruby', 'Rubino', 'rare', { face: 'linear-gradient(140deg,#ff6d8a,#c3123d 60%,#ff3a62)', pip: '#ffe9ee', edge: '#8f0c2c', fx: 'gem' }],
  ['emerald', 'Smeraldo', 'rare', { face: 'linear-gradient(140deg,#6dffb4,#0e9c5a 60%,#2fe08a)', pip: '#eafff3', edge: '#0a6b3e', fx: 'gem' }],
  ['sapphire', 'Zaffiro', 'rare', { face: 'linear-gradient(140deg,#7fb2ff,#1846c9 60%,#3e78ff)', pip: '#eef3ff', edge: '#11318f', fx: 'gem' }],
  ['hearts', 'Cuoricini', 'rare', { face: 'radial-gradient(circle at 32% 26%,#fff0f6,#ffb3d1)', pip: '#e8175d', edge: '#ff9cc4', shape: 'heart' }],
  ['gold', 'Oro', 'epic', { face: 'linear-gradient(140deg,#fff3a8 0%,#ffcf33 35%,#d98c00 70%,#ffe27a 100%)', pip: '#5a3a00', edge: '#b97700', fx: 'shine' }],
  ['galaxy', 'Galassia', 'epic', { face: 'radial-gradient(circle at 30% 30%,#7a4dff 0%,#2b0f6b 45%,#0b0626 100%)', pip: '#ffffff', edge: '#0b0626', fx: 'stars', shape: 'star' }],
  ['lava', 'Lava', 'epic', { face: 'radial-gradient(circle at 50% 50%,#3a1208,#140603)', pip: '#ffb02e', edge: '#140603', fx: 'lava' }],
  ['ghost', 'Fantasma', 'epic', { face: 'radial-gradient(circle at 32% 26%,rgba(255,255,255,.92),rgba(210,225,255,.55))', pip: '#6a7cff', edge: 'rgba(200,215,255,.4)', fx: 'ghost' }],
  ['stars', 'Notte Stellata', 'epic', { face: 'radial-gradient(circle at 32% 26%,#2a3a7a,#0f1638)', pip: '#ffd94a', edge: '#0f1638', shape: 'star' }],
  ['pixel', 'Pixel', 'epic', { face: 'repeating-conic-gradient(#9cf06a 0 25%,#7fd84f 0 50%) 0 0/12px 12px', pip: '#123b07', edge: '#5aa52f', shape: 'square' }],
  ['holo', 'Olografico', 'legendary', { face: 'linear-gradient(120deg,#ff9de2,#9de6ff,#b5ff9d,#fff59d,#ffb39d,#d99dff)', pip: '#262a3d', edge: '#c9b6ff', fx: 'holo' }],
  ['rainbow', 'Arcobaleno', 'legendary', { face: 'linear-gradient(90deg,#ff4d4d,#ffa64d,#ffe14d,#59e36b,#4db8ff,#9b6bff,#ff4d4d)', pip: '#ffffff', edge: '#9b6bff', fx: 'rainbow' }],
  ['diamond', 'Diamante', 'legendary', { face: 'linear-gradient(135deg,#ffffff,#dff4ff 30%,#ffffff 50%,#e9e2ff 70%,#ffffff)', pip: '#3aa0ff', edge: '#cfe8ff', shape: 'diamond', fx: 'sparkle' }],
  ['dragon', 'Drago', 'legendary', { face: 'radial-gradient(circle at 30% 30%,#ff5b3a 0 10%,transparent 11%) 0 0/10px 10px,linear-gradient(140deg,#c4151c,#5e0408)', pip: '#ffcf33', edge: '#4a0306', fx: 'fire' }],
  ['cosmic', 'Prisma Cosmico', 'mythic', { face: 'linear-gradient(120deg,#ff3dbb,#7a4dff,#2fd0ff,#56ff9e,#ffe14d,#ff3dbb)', pip: '#ffffff', edge: '#2b0f6b', shape: 'star', fx: 'cosmic' }],
  ['divine', 'Oro Divino', 'mythic', { face: 'linear-gradient(140deg,#fffbe0,#ffd84a 40%,#fff3a8 55%,#e09a00)', pip: '#ffffff', edge: '#c98300', shape: 'diamond', fx: 'divine' }],
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

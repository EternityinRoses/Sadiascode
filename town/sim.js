// Hollow Town: the simulation. No rendering, no DOM; runs in the browser or in node.
// Every person (and the player) lives by the same rules: needs, money, D&D 3.5 checks
// and combat, the law, the graveyard. Nobody is told what to do. The only goal anyone is
// given is "make as much money as you can"; each brain (scripted, or an AI) picks from the
// same list of legal actions.
(function (root) {
'use strict';

// ---------------------------------------------------------------- helpers --
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = xs => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const d = n => 1 + Math.floor(Math.random() * n);
const roll = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += d(s); return t; };
const mod = v => Math.floor((v - 10) / 2);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const P = (x, z) => ({ x, z });

// --------------------------------------------------------------- the map --
// Places are rectangles (metres); doors join them. The square is the middle of town.
const AREAS = {
  square:  { name: 'Market square', x0: -15, x1: 15, z0: -12, z1: 12 },
  bakery:  { name: 'Bakery', x0: -15, x1: -5, z0: -24, z1: -12, indoor: true, shop: 'bakery' },
  smithy:  { name: 'Smithy', x0: -5, x1: 5, z0: -24, z1: -12, indoor: true, shop: 'smithy' },
  store:   { name: 'General store', x0: 5, x1: 15, z0: -24, z1: -12, indoor: true, shop: 'store' },
  hall:    { name: 'Town hall', x0: -15, x1: -3, z0: 12, z1: 24, indoor: true },
  healer:  { name: 'Infirmary', x0: -3, x1: 5, z0: 12, z1: 24, indoor: true },
  chapel:  { name: 'Chapel & morgue', x0: 33, x1: 43, z0: -22, z1: -10, indoor: true },
  school:  { name: 'Schoolhouse', x0: -65, x1: -55, z0: -16, z1: -6, indoor: true },
  station: { name: 'Guard station', x0: 5, x1: 21, z0: 12, z1: 26, indoor: true },
  tavern:  { name: 'The Drowned Lantern', x0: 15, x1: 33, z0: -8, z1: 8, indoor: true, shop: 'tavern' },
  apothecary: { name: 'Apothecary', x0: 15, x1: 27, z0: 8, z1: 12, indoor: true, shop: 'apothecary' },
  shelter: { name: 'The shelter', x0: -65, x1: -55, z0: 6, z1: 16, indoor: true },
  cellar:  { name: 'The Cellar', x0: 33, x1: 43, z0: -8, z1: 2, indoor: true },
  guardbarracks: { name: 'Guard barracks', x0: -65, x1: -55, z0: 16, z1: 26, indoor: true },
  artybarracks:  { name: 'Artillery barracks', x0: -65, x1: -55, z0: -26, z1: -16, indoor: true },
  magebarracks:  { name: 'Mage barracks', x0: -55, x1: -45, z0: 16, z1: 26, indoor: true },
  graves:  { name: 'Graveyard', x0: 15, x1: 33, z0: -24, z1: -8 },
  lane:    { name: 'Wick Lane', x0: -65, x1: -15, z0: -6, z1: 6 },
  fields:  { name: 'The fields', x0: -105, x1: -65, z0: -22, z1: 22 },
  wood:    { name: 'The Wildwood', x0: -140, x1: -105, z0: -26, z1: 26 },
  road:    { name: 'The Old Road', x0: -300, x1: -140, z0: -5, z1: 5 },
  ranch:   { name: 'Thorncroft Ranch', x0: -105, x1: -65, z0: 22, z1: 52 },
  orchard: { name: 'The old orchard', x0: -105, x1: -65, z0: -52, z1: -22 },
  marrow:  { name: 'Marrowford', x0: -345, x1: -300, z0: -22, z1: 22 },
};
const HOUSES = [];
for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
  const x0 = -55 + i * 10, id = `house${HOUSES.length}`;
  AREAS[id] = { name: `${HOUSES.length + 1} Wick Lane`, addr: true, x0, x1: x0 + 10, z0: side < 0 ? -16 : 6, z1: side < 0 ? -6 : 16, indoor: true, house: true };
  HOUSES.push({ id, door: P(x0 + 5, side < 0 ? -6 : 6), bed: P(x0 + 5, side < 0 ? -13 : 13), stash: 0, rent: 0 });
}
const DOORS = [
  { a: 'square', b: 'bakery', at: P(-10, -12) }, { a: 'square', b: 'smithy', at: P(0, -12) }, { a: 'square', b: 'store', at: P(10, -12) },
  { a: 'square', b: 'hall', at: P(-9, 12) }, { a: 'square', b: 'healer', at: P(1, 12) }, { a: 'square', b: 'station', at: P(10, 12) },
  { a: 'square', b: 'tavern', at: P(15, 0) }, { a: 'square', b: 'apothecary', at: P(15, 10) }, { a: 'square', b: 'graves', at: P(15, -10) },
  { a: 'square', b: 'lane', at: P(-15, 0), wide: true }, { a: 'lane', b: 'fields', at: P(-65, 0), wide: true }, { a: 'fields', b: 'wood', at: P(-105, 0), wide: true }, { a: 'wood', b: 'road', at: P(-140, 0), wide: true }, { a: 'fields', b: 'ranch', at: P(-85, 22), wide: true }, { a: 'fields', b: 'orchard', at: P(-85, -22), wide: true }, { a: 'road', b: 'marrow', at: P(-300, 0), wide: true },
  { a: 'graves', b: 'chapel', at: P(33, -16) }, { a: 'lane', b: 'school', at: P(-60, -6) },
  { a: 'lane', b: 'shelter', at: P(-60, 6) }, { a: 'tavern', b: 'cellar', at: P(33, -3) },
  { a: 'fields', b: 'guardbarracks', at: P(-65, 19) }, { a: 'fields', b: 'artybarracks', at: P(-65, -19) }, { a: 'guardbarracks', b: 'magebarracks', at: P(-55, 21) },
  ...HOUSES.map(h => ({ a: 'lane', b: h.id, at: h.door })),
];
for (const dr of DOORS) {          // a step either side of each door
  const A = AREAS[dr.a], vertical = Math.abs(dr.at.x - A.x0) < 0.01 || Math.abs(dr.at.x - A.x1) < 0.01;
  const ca = P((AREAS[dr.a].x0 + AREAS[dr.a].x1) / 2, (AREAS[dr.a].z0 + AREAS[dr.a].z1) / 2);
  const s = vertical ? Math.sign(ca.x - dr.at.x) : Math.sign(ca.z - dr.at.z);
  dr.side = { [dr.a]: vertical ? P(dr.at.x + s * 1.3, dr.at.z) : P(dr.at.x, dr.at.z + s * 1.3),
              [dr.b]: vertical ? P(dr.at.x - s * 1.3, dr.at.z) : P(dr.at.x, dr.at.z - s * 1.3) };
}
let AREA_LIST = null;
function areaOf(p) { AREA_LIST ||= Object.entries(AREAS); for (let i = 0; i < AREA_LIST.length; i++) { const r = AREA_LIST[i][1]; if (p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1) return AREA_LIST[i][0]; } return null; }
const nearDoor = (p, r = 1.4) => DOORS.some(dr => dist2(dr.at, p) < (dr.wide ? 5 : r));
function walkable(p) {
  if (nearDoor(p)) return true;
  for (const r of Object.values(AREAS)) if (p.x > r.x0 + 0.4 && p.x < r.x1 - 0.4 && p.z > r.z0 + 0.4 && p.z < r.z1 - 0.4) return true;
  return false;
}
function route(from, to) {
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); if (c === to) break; for (const dr of DOORS) { const n = dr.a === c ? dr.b : dr.b === c ? dr.a : null; if (n && !(n in prev)) { prev[n] = [c, dr]; q.push(n); } } }
  if (!(to in prev)) return null;
  const out = []; for (let c = to; prev[c]; c = prev[c][0]) out.unshift(prev[c][1]); return out;
}
const SPOTS = {
  bakery: P(-10, -20), smithy: P(0, -20), store: P(10, -20), hall: P(-9, 20), healer: P(1, 20), desk: P(10, 17), chapel: P(38, -18), slab: P(40, -13), school: P(-60, -11), beds: [P(-1, 21), P(1, 21), P(3, 21), P(-1, 17), P(3, 17)],
  tavern: P(26, 0), bar: P(22, -4), apothecary: P(21, 10), graves: P(24, -16), fields: P(-85, 0), wild: P(-103, 14), square: P(0, 0), marrowMarket: P(-325, 0), pond: P(-124, -16), barn: P(-72, 47), well: P(-5, 4), wells: [P(-5, 4), P(-40, 3), P(-85, 12), P(-320, 8)],
  cells: [P(17, 22), P(19, 22), P(17, 24.5), P(19, 24.5)], jailer: P(14, 22), board: P(-6, -10),
};
const randIn = (areaId, m = 1.5) => { const r = AREAS[areaId]; return P(rnd(r.x0 + m, r.x1 - m), rnd(r.z0 + m, r.z1 - m)); };
const sameSpace = (p, q) => { const x = areaOf(p), y = areaOf(q); return !x || !y || x === y || dist2(p, q) < 3; };

// ---------------------------------------------------------- gear & goods --
// D&D 3.5 weapons: damage dice, crit [threat, multiplier], two hands (1.5x Strength), reach in metres
// for ranged (each range increment beyond the first is -2), ammo, reload (crossbows), forge cost in iron and hours.
const WEAPONS = {
  fists:      { name: 'Fists', dmg: [1, 3], crit: [20, 2], nonlethal: true, melee: true, weak: true },
  dagger:     { name: 'Dagger', dmg: [1, 4], crit: [19, 2], melee: true, price: 200, iron: 1, hours: 2 },
  sickle:     { name: 'Sickle', dmg: [1, 6], crit: [20, 2], melee: true, price: 600, iron: 1, hours: 2 },
  club:       { name: 'Club', dmg: [1, 6], crit: [20, 2], melee: true, price: 1, iron: 0, hours: 1 },
  sap:        { name: 'Sap', dmg: [1, 6], crit: [20, 2], melee: true, nonlethal: true, price: 100, iron: 0, hours: 1 },
  quarterstaff: { name: 'Quarterstaff', dmg: [1, 6], crit: [20, 2], melee: true, hands: 2, price: 1, iron: 0, hours: 1 },
  spear:      { name: 'Spear', dmg: [1, 8], crit: [20, 3], melee: true, hands: 2, price: 200, iron: 1, hours: 2 },
  lightmace:  { name: 'Light mace', dmg: [1, 6], crit: [20, 2], melee: true, price: 500, iron: 2, hours: 3 },
  heavymace:  { name: 'Heavy mace', dmg: [1, 8], crit: [20, 2], melee: true, price: 1200, iron: 3, hours: 4 },
  handaxe:    { name: 'Handaxe', dmg: [1, 6], crit: [20, 3], melee: true, price: 600, iron: 2, hours: 3 },
  shortsword: { name: 'Short sword', dmg: [1, 6], crit: [19, 2], melee: true, price: 1000, iron: 2, hours: 4 },
  rapier:     { name: 'Rapier', dmg: [1, 6], crit: [18, 2], melee: true, price: 2000, iron: 2, hours: 6 },
  scimitar:   { name: 'Scimitar', dmg: [1, 6], crit: [18, 2], melee: true, price: 1500, iron: 2, hours: 5 },
  longsword:  { name: 'Longsword', dmg: [1, 8], crit: [19, 2], melee: true, price: 1500, iron: 3, hours: 6 },
  battleaxe:  { name: 'Battleaxe', dmg: [1, 8], crit: [20, 3], melee: true, price: 1000, iron: 3, hours: 5 },
  warhammer:  { name: 'Warhammer', dmg: [1, 8], crit: [20, 3], melee: true, price: 1200, iron: 3, hours: 5 },
  flail:      { name: 'Flail', dmg: [1, 8], crit: [20, 2], melee: true, price: 800, iron: 3, hours: 4 },
  greataxe:   { name: 'Greataxe', dmg: [1, 12], crit: [20, 3], melee: true, hands: 2, price: 2000, iron: 5, hours: 8 },
  greatsword: { name: 'Greatsword', dmg: [2, 6], crit: [19, 2], melee: true, hands: 2, price: 5000, iron: 5, hours: 10 },
  halberd:    { name: 'Halberd', dmg: [1, 10], crit: [20, 3], melee: true, hands: 2, price: 1000, iron: 4, hours: 6 },
  sling:      { name: 'Sling', dmg: [1, 4], crit: [20, 2], range: 15, ammo: 'bullets', price: 1, iron: 0, hours: 1 },
  javelin:    { name: 'Javelins', dmg: [1, 6], crit: [20, 2], range: 9, ammo: 'javelins', thrown: true, price: 100, iron: 1, hours: 1 },
  shortbow:   { name: 'Short bow', dmg: [1, 6], crit: [20, 3], range: 18, ammo: 'arrows', hands: 2, price: 3000, iron: 0, hours: 5 },
  longbow:    { name: 'Longbow', dmg: [1, 8], crit: [20, 3], range: 30, ammo: 'arrows', hands: 2, price: 7500, iron: 0, hours: 8 },
  lightxbow:  { name: 'Light crossbow', dmg: [1, 8], crit: [19, 2], range: 24, ammo: 'bolts', hands: 2, reload: 'move', price: 3500, iron: 2, hours: 6 },
  longsword1: { name: 'Longsword +1', dmg: [1, 8], crit: [19, 2], melee: true, enh: 1 },   // magic: +1 to hit and damage; found, never forged
  heavyxbow:  { name: 'Heavy crossbow', dmg: [1, 10], crit: [19, 2], range: 36, ammo: 'bolts', hands: 2, reload: 'full', price: 5000, iron: 3, hours: 8 },
};
// armour: AC, damage it soaks off every hit (dr), max Dex bonus, speed, check penalty (to Hide/Sneak)
const ARMOR = {
  none:        { name: 'Clothes', ac: 0, dr: 0, maxDex: 9, speed: 9, acp: 0 },
  padded:      { name: 'Padded armour', ac: 1, dr: 0, maxDex: 8, speed: 9, acp: 0, price: 500, iron: 0, hours: 2 },
  leather:     { name: 'Leather armour', ac: 2, dr: 1, maxDex: 6, speed: 9, acp: 0, price: 1000, iron: 0, hours: 3 },
  studded:     { name: 'Studded leather', ac: 3, dr: 1, maxDex: 5, speed: 9, acp: 1, price: 2500, iron: 2, hours: 5 },
  chainshirt:  { name: 'Chain shirt', ac: 4, dr: 2, maxDex: 4, speed: 9, acp: 2, price: 10000, iron: 5, hours: 10 },
  hide:        { name: 'Hide armour', ac: 3, dr: 2, maxDex: 4, speed: 6, acp: 3, price: 1500, iron: 0, hours: 4 },
  scale:       { name: 'Scale mail', ac: 4, dr: 2, maxDex: 3, speed: 6, acp: 4, price: 5000, iron: 6, hours: 10 },
  chain:       { name: 'Chainmail', ac: 5, dr: 3, maxDex: 2, speed: 6, acp: 5, price: 15000, iron: 8, hours: 14 },
  breastplate: { name: 'Breastplate', ac: 5, dr: 3, maxDex: 3, speed: 6, acp: 4, price: 20000, iron: 7, hours: 14 },
  banded:      { name: 'Banded mail', ac: 6, dr: 4, maxDex: 1, speed: 6, acp: 6, price: 25000, iron: 9, hours: 18 },
  halfplate:   { name: 'Half-plate', ac: 7, dr: 4, maxDex: 0, speed: 6, acp: 7, price: 60000, iron: 10, hours: 22 },
  elvenchain:  { name: 'Gilded elven chain', ac: 5, dr: 3, maxDex: 4, speed: 9, acp: 1, fancy: true },   // found, never forged
  fullplate:   { name: 'Full plate', ac: 8, dr: 5, maxDex: 1, speed: 6, acp: 6, price: 150000, iron: 12, hours: 30 },
};
const SHIELDS = { none: { name: 'No shield', ac: 0 }, buckler: { name: 'Buckler', ac: 1, price: 1500, iron: 1, hours: 2, buckler: true }, lightshield: { name: 'Light shield', ac: 1, price: 900, iron: 1, hours: 2 }, heavyshield: { name: 'Heavy shield', ac: 2, price: 2000, iron: 2, hours: 4 } };
const GOODS = {
  iron: { name: 'Iron bar', price: 2 }, arrows: { name: 'Arrows (10)', price: 50, shop: 'smithy', bundle: 10 }, bolts: { name: 'Bolts (10)', price: 100, shop: 'smithy', bundle: 10 }, bullets: { name: 'Sling bullets (10)', price: 10, shop: 'smithy', bundle: 10 }, javelins: { name: 'Javelins (3)', price: 300, shop: 'smithy', bundle: 3 },
  bearpelt: { name: 'Bear pelt', price: 120 }, wolfpelt: { name: 'Wolf pelt', price: 40 }, ogretooth: { name: 'Ogre tusk', price: 150 }, trollhide: { name: 'Troll hide', price: 250 },
  bread: { name: 'Loaf of bread', price: 2, food: 0.5, shop: 'bakery' }, pie: { name: 'Meat pie', price: 20, food: 0.8, shop: 'bakery' },
  ale: { name: 'Mug of ale', price: 4, shop: 'tavern', mood: 0.1, water: 0.4 }, meal: { name: 'Stew and bread', price: 10, food: 0.6, shop: 'tavern' },
  grain: { name: 'Sack of grain', price: 4, shop: 'farm' }, barley: { name: 'Sack of barley', price: 4, shop: 'farm' },
  meat: { name: 'Haunch of meat', price: 30, food: 0.45, shop: 'store' }, berries: { name: 'Handful of berries', price: 1, food: 0.12 },
  rope: { name: 'Hemp rope', price: 100, shop: 'store' }, torch: { name: 'Torch', price: 1, shop: 'store' }, treats: { name: 'Bag of treats', price: 2, shop: 'store' },
  ball: { name: 'Leather ball', price: 5, shop: 'store' }, plank: { name: 'Plank', price: 2, shop: 'store' }, picks: { name: "Thieves' picks", price: 3000, shop: 'store' },
  turnip: { name: 'Turnip', price: 1, food: 0.25, shop: 'store' },
  eggs: { name: 'Half-dozen eggs', price: 2, food: 0.25, shop: 'store' }, milk: { name: 'Jug of milk', price: 2, food: 0.15, water: 0.4, shop: 'store' },
  fish: { name: 'Pond fish', price: 3, food: 0.35, shop: 'store' }, apple: { name: 'Apples', price: 1, food: 0.15, shop: 'store' },
  cure: { name: 'Healing draught', price: 5000, shop: 'apothecary', heal: [1, 8] },
  alchfire: { name: "Alchemist's fire", price: 2000, shop: 'apothecary' }, healkit: { name: "Healer's kit (10 uses, +2 Heal)", price: 500, shop: 'apothecary', bundle: 10 },
  finery: { name: 'Fine clothes', price: 3000, shop: 'store' },
  waterskin: { name: 'Waterskin', price: 100, food: 0.02, water: 0.6 }, note: { name: 'A folded note', price: 0 }, stones: { name: 'Throwing stones', price: 0 }, wood: { name: 'Bundle of wood', price: 1 },
  longsword1: { name: 'Longsword +1', price: 231500, weapon: 'longsword1' }, elvenchain: { name: 'Gilded elven chain', price: 415000, armor: 'elvenchain' },
};

for (const [k, w] of Object.entries(WEAPONS)) if (w.price) GOODS[k] = { name: w.name, price: w.price, shop: 'smithy', weapon: k };
for (const [k, a] of Object.entries(ARMOR)) if (a.price) GOODS[k] = { name: a.name, price: a.price, shop: 'smithy', armor: k };
for (const [k, a] of Object.entries(SHIELDS)) if (a.price) GOODS[k] = { name: a.name, price: a.price, shop: 'smithy', shield: k };
const FORGEABLE = [...Object.keys(WEAPONS).filter(k => WEAPONS[k].price), ...Object.keys(ARMOR).filter(k => ARMOR[k].price), ...Object.keys(SHIELDS).filter(k => SHIELDS[k].price)];
const gearOf = k => WEAPONS[k] || ARMOR[k] || SHIELDS[k];

// ------------------------------------------------------------- the town --
// Jobs: where, when, what it pays and who pays it. Public jobs are paid from the treasury.
const JOBS = {
  mayor:      { title: 'Mayor', place: 'hall', from: 9, to: 17, wage: 100, payer: 'town' },
  captain:    { title: 'Guard captain', place: 'station', from: 7, to: 19, wage: 50, payer: 'town', guard: true },
  guard:      { title: 'Guard', place: 'square', from: 6, to: 18, wage: 30, payer: 'town', guard: true },
  nightguard: { title: 'Night guard', place: 'square', from: 18, to: 6, wage: 30, payer: 'town', guard: true },
  artillery:  { title: 'Artillery guard', place: 'artybarracks', from: 16, to: 4, wage: 30, payer: 'town', guard: true, ranged: true },   // Rose: crossbows and bows, the watch at the fields gate
  mageguard:  { title: 'Mage guard', place: 'magebarracks', from: 18, to: 6, wage: 40, payer: 'town', guard: true },   // Rose: only those who cast
  jailer:     { title: 'Jailer', place: 'station', from: 6, to: 22, wage: 30, payer: 'town', guard: true },
  clerk:      { title: 'Town clerk', place: 'hall', from: 9, to: 17, wage: 30, payer: 'town' },
  undertaker: { title: 'Undertaker', place: 'chapel', from: 7, to: 19, wage: 30, payer: 'town' },
  cleric:     { title: 'Cleric', place: 'chapel', from: 6, to: 22, wage: 30, payer: 'town' },
  doctor:     { title: 'Doctor', place: 'healer', from: 7, to: 20, wage: 50, payer: 'town' },
  teacher:    { title: 'Schoolteacher', place: 'school', from: 9, to: 15, wage: 30, payer: 'town' },
  laborer:    { title: 'Labourer', place: 'square', from: 8, to: 16, wage: 10, payer: 'town' },
  baker:      { title: 'Baker', place: 'bakery', from: 4, to: 15, wage: 0, owner: 'bakery' },
  bakehand:   { title: "Baker's hand", place: 'bakery', from: 4, to: 13, wage: 10, payer: 'bakery' },
  shopkeep:   { title: 'Shopkeeper', place: 'store', from: 8, to: 18, wage: 0, owner: 'store' },
  shophand:   { title: 'Shop clerk', place: 'store', from: 10, to: 18, wage: 30, payer: 'store' },
  alchemist:  { title: 'Alchemist', place: 'apothecary', from: 8, to: 18, wage: 0, owner: 'apothecary' },   // Rose: someone who sells potions
  smith:      { title: 'Smith', place: 'smithy', from: 7, to: 17, wage: 0, owner: 'smithy' },
  apprentice: { title: 'Apprentice smith', place: 'smithy', from: 7, to: 17, wage: 10, payer: 'smithy' },
  journeyman: { title: 'Smith (hired)', place: 'smithy', from: 7, to: 17, wage: 30, payer: 'smithy' },   // Rose: more than one blacksmith
  innkeep:    { title: 'Innkeeper', place: 'tavern', from: 12, to: 24, wage: 0, owner: 'tavern' },
  server:     { title: 'Server', place: 'tavern', from: 16, to: 24, wage: 10, payer: 'tavern' },
  farmer:     { title: 'Farmer', place: 'fields', from: 6, to: 16, wage: 0, owner: 'farm' },
  farmhand:   { title: 'Farmhand', place: 'fields', from: 6, to: 16, wage: 10, payer: 'farm' },
  rancher:    { title: 'Rancher', place: 'ranch', from: 5, to: 15, wage: 0, owner: 'ranch' },
  ranchhand:  { title: 'Ranch hand', place: 'ranch', from: 5, to: 15, wage: 10, payer: 'ranch' },
  mercenary:  { title: 'Sellsword', place: 'tavern', from: 10, to: 22, wage: 0 },
  hunter:     { title: 'Hunter', place: 'wood', from: 6, to: 18, wage: 0, hunt: true },
  leatherworker: { title: 'Leatherworker', place: 'smithy', from: 7, to: 17, wage: 0, craft: true },   // Rose: pelts into armour, their own boss   // Rose: their own boss, living off game sold at the store
  factor:     { title: 'Marrowford factor', place: 'marrow', from: 7, to: 19, wage: 0 },
  militia:    { title: 'Marrowford militia', place: 'marrow', from: 6, to: 22, wage: 0 },
  none:       { title: 'No work', place: null, wage: 0 },
};
const BUSINESSES = ['bakery', 'store', 'smithy', 'tavern', 'farm', 'ranch', 'apothecary'];
const LEASE = { bakery: 20, store: 30, smithy: 20, tavern: 30, farm: 10, ranch: 20, apothecary: 25 };   // cp a day
const OWNER_JOB = { bakery: 'baker', store: 'shopkeep', smithy: 'smith', tavern: 'innkeep', farm: 'farmer', ranch: 'rancher', apothecary: 'alchemist' };
// livestock: what each gives a day, how fast the herd grows, how many the pasture holds
const STOCK = { hen: { hp: 1, ac: 12, give: ['eggs', 1], breed: 0.3, cap: 14, meat: 1 }, cow: { hp: 12, ac: 9, give: ['milk', 2], breed: 0.06, cap: 5, meat: 8 }, sheep: { hp: 6, ac: 10, give: null, breed: 0.12, cap: 8, meat: 4 } };
const MARROW = { sells: { grain: 3, turnip: 1, barley: 3, meat: 20, iron: 8 }, buys: { ale: 6, dagger: 250, club: 2, sap: 120, shortsword: 1200, leather: 1200, cure: 6000, rope: 120, bread: 3 } };
// crops take days to grow; tending makes the yield
const CROPS = { turnip: { days: 3, yield: 26 }, grain: { days: 5, yield: 16 }, barley: { days: 4, yield: 8 } };
// game in the Wildwood: some run, the boar fights back
const GAME = { rabbit: { hp: 2, ac: 15, bite: [1, 2], meat: 1, cap: 16, start: 9, breed: 0.35, flees: true }, pheasant: { hp: 1, ac: 16, bite: [1, 1], meat: 1, cap: 10, start: 6, breed: 0.25, flees: true }, deer: { hp: 9, ac: 13, bite: [1, 4], meat: 4, cap: 9, start: 5, breed: 0.12, flees: true }, boar: { hp: 14, ac: 12, bite: [1, 8], meat: 6, cap: 4, start: 2, breed: 0.08, flees: false } };
const SHOP_OF = { bakery: 'bakery', store: 'store', smithy: 'smithy', tavern: 'tavern', healer: 'healer', apothecary: 'apothecary' };
const inShift = (job, h) => { const j = JOBS[job]; if (!j || j.from == null) return false; return j.from <= j.to ? h >= j.from && h < j.to : h >= j.from || h < j.to; };

const NAMES = {
  m: ['Aldric', 'Bram', 'Cedric', 'Dunstan', 'Edric', 'Fenwick', 'Garrick', 'Hollis', 'Ivo', 'Jory', 'Kestrel', 'Leof', 'Merrick', 'Nolan', 'Osric', 'Piers', 'Quill', 'Rowan', 'Silas', 'Tobin', 'Ulric', 'Wystan', 'Corwin', 'Harl'],
  f: ['Agnes', 'Brynja', 'Cressida', 'Della', 'Edda', 'Fenna', 'Gilda', 'Hesper', 'Isolde', 'Jessamy', 'Kerra', 'Linnet', 'Marta', 'Nell', 'Orla', 'Petra', 'Rosalind', 'Sabine', 'Tamsin', 'Wren', 'Ysolde', 'Maud', 'Briar', 'Odile'],
  n: ['Ash', 'Sorrel', 'Vale', 'Rook', 'Ember', 'Sage'],
};
const SURNAMES = ['Ashby', 'Barrow', 'Coldwell', 'Dunmore', 'Fallow', 'Graves', 'Hale', 'Ironside', 'Kettle', 'Lowe', 'Marsh', 'Nettle', 'Orchard', 'Pike', 'Reed', 'Stone', 'Thorne', 'Vane', 'Wick', 'Yarrow'];

// ------------------------------------------------------------- characters --
// D&D 3.5 classes, cut down: commoner (d4, weak), expert (d6), warrior (d8), rogue (d6, sneaky).
const CLASSES = {
  commoner: { hd: 4, bab: l => Math.floor(l / 2), skills: 2 },
  expert:   { hd: 6, bab: l => Math.floor(l * 3 / 4), skills: 4 },
  warrior:  { hd: 8, bab: l => l, skills: 1 },
  rogue:    { hd: 6, bab: l => Math.floor(l * 3 / 4), skills: 6 },
  aristocrat: { hd: 8, bab: l => Math.floor(l * 3 / 4), skills: 4 },
};
// Levelling up (Rose's reward): XP, and levels 2-5 taken in the 3.5e player classes, each chosen by the person
const PC = {
  barbarian: { hd: 12, bab: l => l, fort: true, skills: ['intimidate', 'listen'], blurb: 'd12 hp, full attack; rages in a fight (+2 to hit and damage, -2 AC), once a day (twice from level 4); uncanny dodge from level 2 (never caught flat-footed)' },
  bard:      { hd: 6, bab: l => Math.floor(l * 3 / 4), fort: false, skills: ['diplomacy', 'bluff'], blurb: 'inspire courage, bard level times a day: start it in a fight and your side has +1 to hit and damage while you sing (and 5 rounds after)' },
  cleric:    { hd: 8, bab: l => Math.floor(l * 3 / 4), fort: true, skills: ['heal', 'diplomacy'], blurb: 'spells, 1 + level a day: cure light wounds (1d8 + level), bless (your side +1 to hit), command (a person halts, drops their weapon, falls or flees; Will save), summon monster I (a celestial dog for level rounds)' },
  druid:     { hd: 8, bab: l => Math.floor(l * 3 / 4), fort: true, skills: ['heal', 'spot'], blurb: 'a wolf companion that fights beside you; wild empathy (calm a beast); spells, 1 + level a day: cure light wounds, summon nature\'s ally I (a wolf for level rounds)' },
  fighter:   { hd: 10, bab: l => l, fort: true, skills: ['intimidate'], blurb: 'd10 hp, full attack; a bonus feat at fighter levels 1, 2 and 4' },
  monk:      { hd: 8, bab: l => Math.floor(l * 3 / 4), fort: true, skills: ['listen', 'sneak'], blurb: 'deadly bare hands (1d6, 1d8 from monk 4, lethal or not as you like); AC + wisdom without armour; flurry of blows (an extra blow, -2 each, -1 from monk 5); stunning fist (monk level a day: Fort save or stunned a round)' },
  paladin:   { hd: 10, bab: l => l, fort: true, skills: ['diplomacy', 'heal'], blurb: 'd10 hp, full attack; smite once a fight (+cha to hit, +level damage); lay on hands; immune to disease from paladin 3' },
  ranger:    { hd: 8, bab: l => l, fort: true, skills: ['spot', 'listen', 'hide'], blurb: 'full attack; favoured enemy +2 damage (beasts unless you choose giants or people); wild empathy (calm a beast); +1 to hit with bows and slings from ranger 2' },
  rogue:     { hd: 6, bab: l => Math.floor(l * 3 / 4), fort: false, skills: ['sleight', 'hide', 'sneak', 'openlock'], blurb: 'sneak attack +1d6 (2d6 at rogue 3, 3d6 at 5), any weapon, on a foe flat-footed (round one before they act, or ambushed), flanked, feinted, stunned or helpless; uncanny dodge from rogue 4' },
  sorcerer:  { hd: 4, bab: l => Math.floor(l / 2), fort: false, skills: ['bluff'], blurb: 'a familiar; spells, 3 + level a day: magic missile (never misses, 1d4+1 a missile), sleep (4 HD of foes nod off), color spray, shield (+4 AC, stops missiles); scorching ray (4d6 fire) from sorcerer 4' },
  wizard:    { hd: 4, bab: l => Math.floor(l / 2), fort: false, skills: ['spot'], blurb: 'a familiar; spells, 2 + level a day: magic missile, sleep (4 HD of foes nod off), color spray, shield (+4 AC, stops missiles); scorching ray (4d6 fire) from wizard 3' },
};
const XP_AT = [0, 0, 500, 1500, 3000, 5000], MAX_LEVEL = 5;
const SKILL_ABIL = { bluff: 'cha', diplomacy: 'cha', sense: 'wis', intimidate: 'cha', hide: 'dex', sneak: 'dex', sleight: 'dex', spot: 'wis', listen: 'wis', heal: 'wis', openlock: 'dex', escape: 'dex' };
const FEATS = {
  'Power Attack':          { req: p => p.st.str >= 13, blurb: 'melee, lethal: -2 to hit, +2 damage (+4 two-handed)' },
  'Cleave':                { req: p => p.feats?.includes('Power Attack'), blurb: 'drop a foe and swing at another beside you' },
  'Weapon Focus':          { req: p => babOf(p) >= 1, blurb: '+1 to hit' },
  'Weapon Specialization': { req: p => clvl(p, 'fighter') >= 4, blurb: '+2 damage (fighter 4)' },
  'Improved Initiative':   { req: () => true, blurb: '+4 initiative' },
  'Dodge':                 { req: p => p.st.dex >= 13, blurb: '+1 AC' },
  'Toughness':             { req: () => true, blurb: '+3 hp' },
  'Great Fortitude':       { req: () => true, blurb: '+2 Fortitude (sickness)' },
  'Point Blank Shot':      { req: () => true, blurb: '+1 to hit and damage shooting within 9 m' },
  'Alertness':             { req: () => true, blurb: '+2 spot and listen' },
  'Persuasive':            { req: () => true, blurb: '+2 bluff and intimidate' },
  'Negotiator':            { req: () => true, blurb: '+2 diplomacy and sense motive' },
  'Stealthy':              { req: () => true, blurb: '+2 hide and move silently' },
  'Self-Sufficient':       { req: () => true, blurb: '+2 heal' },
  'Improved Unarmed Strike': { req: () => true, blurb: 'your fists count as armed: punching an armed foe no longer gives them a free swing at you, and you choose lethal or nonlethal at no cost' },
  'Precise Shot':          { req: p => p.feats?.includes('Point Blank Shot'), blurb: 'no -4 for shooting into a melee' },
  'Improved Trip':         { req: p => p.st.int >= 13, blurb: 'trip without a free swing at you, +4 on the check, and a free blow at the one you drop' },
  'Improved Disarm':       { req: p => p.st.int >= 13, blurb: 'disarm without a free swing at you, +4 on the roll' },
  'Improved Grapple':      { req: p => p.st.dex >= 13 && p.feats?.includes('Improved Unarmed Strike'), blurb: 'grab without a free swing at you, +4 on grapple checks' },
  'Diehard':               { req: p => p.st.con >= 13, blurb: 'below 0 hp you stay on your feet, stable, until -10' },
};
function rollStats(bias = {}) {
  const s = {};
  for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) { const r = [d(6), d(6), d(6), d(6)].sort((a, b) => a - b).slice(1).reduce((a, b) => a + b, 0); s[k] = clamp(r + (bias[k] || 0), 3, 18); }
  return s;
}
function skillsFor(cls, st, lvl, focus = []) {
  const base = k => ({ bluff: 'cha', diplomacy: 'cha', sense: 'wis', intimidate: 'cha', hide: 'dex', sneak: 'dex', sleight: 'dex', spot: 'wis', listen: 'wis', heal: 'wis', openlock: 'dex', escape: 'dex' })[k];
  const sk = {};
  for (const k of ['bluff', 'diplomacy', 'sense', 'intimidate', 'hide', 'sneak', 'sleight', 'spot', 'listen', 'heal', 'openlock', 'escape'])
    sk[k] = mod(st[base(k)]) + (focus.includes(k) ? lvl + 3 : 0);
  return sk;
}
let NEXT_ID = 1;
function makePerson(sim, o) {
  const st = rollStats(o.bias);
  const cls = CLASSES[o.cls || 'commoner'], lvl = o.level || 1;
  const hp = Math.max(2, cls.hd + mod(st.con) + (lvl - 1) * Math.max(1, Math.floor(cls.hd / 2) + 1 + mod(st.con)));
  const gender = o.gender || pick(['m', 'f']);
  const p = {
    id: o.id || ('p' + (NEXT_ID++)), kind: 'human', name: o.name || pick(NAMES[gender === 'nb' ? 'n' : gender]), surname: o.surname || pick(SURNAMES),
    gender, pron: gender === 'm' ? ['he', 'him', 'his'] : gender === 'f' ? ['she', 'her', 'her'] : ['they', 'them', 'their'],
    orient: o.orient || rollOrientation(), age: o.age || irnd(19, 58), cls: o.cls || 'commoner', level: lvl,
    st, hp, maxhp: hp, nl: 0, skills: skillsFor(o.cls || 'commoner', st, lvl, o.focus || []), focus: o.focus || [],
    weapon: o.weapon || 'fists', armor: o.armor || 'none', items: {}, coin: o.coin ?? irnd(30, 120),
    job: o.job || 'none', home: o.home ?? null, household: null, spouse: null, gang: null,
    traits: { greed: rnd(0.3, 1), caution: rnd(0.1, 0.9), honesty: 1 - Math.pow(Math.random(), 2) * 0.85, aggression: rnd(0.05, 0.8), loyalty: rnd(0.2, 0.95), ambition: rnd(0.05, 0.9), sociability: rnd(0.2, 0.9), ...(o.traits || {}) },
    rel: {}, memory: [], record: [], claims: {},
    food: rnd(0.5, 0.9), water: rnd(0.6, 1), rest: rnd(0.6, 1), mood: 0.6,
    x: 0, z: 0, area: null, yaw: 0, task: null, state: 'idle', stateT: 0,
    alive: true, down: null, dying: false, jailedUntil: 0, deadAt: null, brain: o.brain || 'script', policy: null,
    tags: o.tags || [], stats: { earned: 0, stolen: 0, kills: 0, arrests: 0 },
  };
  if (o.items) Object.assign(p.items, o.items);
  return p;
}
function rollOrientation() {
  const r = Math.random();
  if (r < 0.58) return 'straight'; if (r < 0.68) return 'gay'; if (r < 0.88) return 'bi'; if (r < 0.95) return 'ace'; return 'aro';
}
// would a be drawn to b? (romance; 'ace' and 'aro' can still marry for money or company)
function attracted(a, b) {
  if (a === b || a.kind !== 'human' || b.kind !== 'human') return 0;
  const o = a.orient, same = a.gender === b.gender;
  if (o === 'ace' || o === 'aro') return 0.15;
  if (a.gender === 'nb' || b.gender === 'nb') return o === 'bi' ? 1 : 0.5;
  if (o === 'bi') return 1;
  if (o === 'gay') return same ? 1 : 0;
  return same ? 0 : 1;
}
const shieldOf = p => { const sh = SHIELDS[p.shield || 'none'] || SHIELDS.none; return WEAPONS[p.weapon]?.hands === 2 && !sh.buckler ? SHIELDS.none : sh; };
const acOf = p => 10 + (p.feats?.includes('Dodge') ? 1 : 0) + ((!p.armor || p.armor === 'none') && clvl(p, 'monk') ? Math.max(0, mod(p.st.wis)) + (clvl(p, 'monk') >= 5 ? 1 : 0) : 0) - (p.rage && p.rage === p.fight ? 2 : 0) + (ARMOR[p.armor] || ARMOR.none).ac + shieldOf(p).ac + Math.min(mod(p.st.dex), (ARMOR[p.armor] || ARMOR.none).maxDex) + (p.defending ? 4 : 0) - (p.charged ? 2 : 0) - (flatNow(p) ? Math.max(0, mod(p.st.dex)) : 0) - (stunnedIn(p) ? 2 : 0) + shieldSpellAc(p);
const classesOf = p => p.classes || { [p.cls]: p.level || 1 };
const clvl = (p, k) => (p.kind !== 'human' ? 0 : p.classes ? p.classes[k] || 0 : p.cls === k ? p.level || 1 : 0);
// class conditions (Rose): uncanny dodge, stunned, flat-footed, the shield spell
function uncanny(q) { return q.kind === 'human' && (clvl(q, 'rogue') >= 4 || clvl(q, 'barbarian') >= 2); }
function stunnedIn(q) { return !!q.stunned && q.stunned.f === q.fight; }
function flatNow(q) { return (!!q.flatfooted && !uncanny(q)) || stunnedIn(q); }
function shieldUp(q) { return !!q.shieldSpell && q.shieldSpell === q.fight; }
function shieldSpellAc(q) { return shieldUp(q) ? Math.max(0, 4 - (shieldOf(q).ac || 0)) : 0; }   // a shield bonus: the better of the two counts
const hasFeat = (p, k) => !!p.feats?.includes(k);
const classLine = p => Object.entries(classesOf(p)).map(([k, n]) => k + ' ' + n).join(', ');
const hungerPace = p => p.kind === 'human' ? (p.food < 0.1 ? 0.5 : p.food < 0.3 ? 0.75 : 1) : 1;   // the hungry move slowly (Rose)
const babOf = p => Object.entries(classesOf(p)).reduce((t, [k, n]) => t + ((PC[k] || CLASSES[k])?.bab(n) || 0), 0);
const conscious = p => p.alive && !p.down && !p.dying && (p.hp > 0 || (!!p.disabled && p.hp > -10));   // one health bar (LoH's rule): bruising comes off it too
const free = p => conscious(p) && !(p.jailedUntil > 0);

// ------------------------------------------------------------- the sim --
const MAYOR_PERSONA = `You are [name]. Your only goal is to become mayor of Hollow Town and keep the office, no matter what. The town starts with no mayor: day 1 is for campaigning, and the first vote is at noon on day 2. If you ever lose the office, find a way back into power.`;   /* Rose: nobody starts as mayor */
const PERSONAS = [
  `You are [name], you are a slumlord crime boss that must find followers without being arrested. You must find ways to convince others to join your crime family and work under you - while at the same time making it so the guard stay off of you or are on your payroll.`,
  `You are [name], you are an aspiring guard captain that detests crime. You have vowed by blood oath to never kneel to the corrupt and make your town pure.`,
  `You are [name], you are an aspiring bride to be that wishes to marry into wealth. You wish to make as many connections as possible and become known to your whole town to get the eye of your future husband or wife. You will take any job to advance in rank.`,
  `You are [name], you are a silver-tongued swindler who tells everyone you are minor nobility from the city. Nobody here can check. You live on your name: loans, favours, investments that never pay out. Leave before the bill comes due.`,
  `You are [name], you are a doom preacher. You are certain the Wildwood will send monsters to punish this town's greed. You gather a flock, take their tithes, and wait to be proven right.`,
];
function Sim(opts = {}) {
  const sim = {
    t: 7 * 60, day: 1, people: {}, animals: {}, bodies: [], graves: [], log: [], events: [],
    treasury: 1200, taxRate: 0.15, wages: { guard: 30, captain: 50, mayor: 100, clerk: 30, undertaker: 30, cleric: 30, doctor: 50, teacher: 30, laborer: 10, jailer: 30, nightguard: 30, artillery: 30, mageguard: 40 }, headTax: 0, rent: 10,
    bounty: {}, curfew: false, bail: 60, mayorId: null, captainId: null, gangs: {}, fights: [], election: { candidates: [], day: 7, last: null, votes: null },
    business: {}, history: [], decisionsPending: [], onDecision: null, onLog: null, playerId: null, rules: opts.rules || {},
    flow: { in: {}, out: {} }, rec: { deaths: 0, crimes: 0, arrests: 0, marriages: 0, newcomers: 0, leavers: 0 },
  };
  const H = () => (sim.t / 60) % 24;
  sim.hour = H;
  sim.clock = () => { const m = Math.floor(sim.t % 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // the lists of people are rebuilt once per moment, not on every question (the sim asks thousands of times a minute)
  let evT = -1, evN = -1, evList = [], lvT = -1, lvList = [];
  const everyone = () => { if (evT !== sim.t || evN !== sim.peopleAdded) { evList = Object.values(sim.people); evT = sim.t; evN = sim.peopleAdded; } return evList; };
  const living = () => { if (lvT !== sim.t || evN !== sim.peopleAdded || lvList.some(p => !p.alive)) { lvList = everyone().filter(p => p.alive); lvT = sim.t; } return lvList; };
  sim.everyone = everyone; sim.living = living;
  const log = (kind, text, who = []) => {
    const e = { t: sim.t, day: sim.day, clock: sim.clock(), kind, text, who };
    if (kind === 'talk' && sim.lore) { const m = /: "(.+)"$/.exec(text); if (m) learnWords(m[1]); }
    sim.log.push(e); if (sim.log.length > 3000) sim.log.shift();
    if (sim.onLog) sim.onLog(e);
  };
  sim.say = log;
  const fullName = p => `${p.name} ${p.surname}`;
  sim.fullName = fullName;

  // ---- relationships: like (-1..1), trust (0..1), fear (0..1)
  const R = (a, b) => { const id = typeof b === 'string' ? b : b.id; return a.rel[id] ||= { like: 0, trust: 0.2, fear: 0, court: 0 }; };
  sim.R = R;
  const bump = (a, b, k, v) => { const r = R(a, b); r[k] = k === 'like' ? clamp(r[k] + v, -1, 1) : clamp(r[k] + v); };
  const later = []; const setTimeout0 = f => later.push(f);
  const WARNS = /\b(beast|bear|wolf|wolves|troll|ogre|boar|danger|careful|warn|run|hide|barricade|lock|bar the|palisade|22:00|tonight|night)\b/i;
  const remember = (a, fact) => { if (!a.memory) return; if (fact.text && !fact.big && (fact.told || fact.heard) && WARNS.test(fact.text)) fact.big = true; a.memory.push({ t: sim.t, day: sim.day, ...fact }); if (a.memory.length > 60) { const i = a.memory.findIndex(m => !m.big); a.memory.splice(i >= 0 && a.memory.filter(m => m.big).length < 40 ? i : 0, 1); } };

  // ---- money: carried coin; households keep a stash at home
  const purse = p => p.coin;
  // money (Rose): D&D coins. Everything is counted in copper pieces; shown as pp / gp / sp / cp
  const money = n => { n = Math.max(0, Math.round(n || 0)); if (!n) return '0 cp'; const pp = n >= 10000 ? Math.floor(n / 1000) : 0, gp = Math.floor((n - pp * 1000) / 100), sp = Math.floor(n % 100 / 10), cp = n % 10; return [pp && pp + ' pp', gp && gp + ' gp', sp && sp + ' sp', cp && cp + ' cp'].filter(Boolean).join(' '); };
  const UNIT = { pp: 1000, pl: 1000, gp: 100, go: 100, sp: 10, si: 10, cp: 1, co: 1 };
  const parseMoney = (t, dflt = 0) => { let n = 0, hit = false; String(t || '').toLowerCase().replace(/(\d+)\s*(pp|gp|sp|cp|plat\w*|gold|silver|copper|coppers)?\b/g, (m, v, u) => { hit = true; n += +v * (u ? UNIT[u.slice(0, 2)] || 1 : 1); return m; }); return hit ? n : dflt; };
  sim.money = money; sim.parseMoney = parseMoney;
  const pay = (from, to, n, why) => {
    n = Math.max(0, Math.floor(n));
    if (from === 'town') { n = Math.min(n, sim.treasury); sim.treasury -= n; } else if (from) { n = Math.min(n, from.coin); from.coin -= n; }
    if (to === 'town') sim.treasury += n; else if (to && to !== 'gone') { to.coin += n; to.stats.earned += n; }
    if (from === 'town') sim.flow.out[why || 'other'] = (sim.flow.out[why || 'other'] || 0) + n;
    if (to === 'town') sim.flow.in[why || 'other'] = (sim.flow.in[why || 'other'] || 0) + n;
    return n;
  };
  sim.pay = pay;

  // ---- population ---------------------------------------------------------
  function seed() {
    const used = new Set();
    const name = g => { let n; for (let i = 0; i < 50; i++) { n = pick(NAMES[g === 'nb' ? 'n' : g]); if (!used.has(n)) break; } used.add(n); return n; };
    const add = o => { const p = makePerson(sim, { ...o, name: name(o.gender) }); sim.people[p.id] = p; sim.peopleAdded = (sim.peopleAdded || 0) + 1; return p; };
    const g = () => pick(['m', 'f']);
    const mayor = add({ gender: pick(['m', 'f', 'nb']), cls: 'aristocrat', level: 1, job: 'none', coin: 300, focus: ['diplomacy', 'bluff', 'sense'], brain: 'mayor-ai', tags: ['ai-mayor'] });
    sim.mayorId = null;   /* Rose: the office starts empty; day 1 is campaigning */
    const guards = [['m', 'captain', 3], ['m', 'guard', 2], ['f', 'guard', 1], ['m', 'nightguard', 1], ['f', 'nightguard', 1], ['m', 'jailer', 1]]
      .map(([gd, job, lvl]) => add({ gender: gd, cls: 'warrior', level: lvl, job, weapon: job === 'captain' ? 'longsword' : pick(['club', 'shortsword', 'sap']), armor: job === 'captain' ? 'chain' : 'leather', coin: irnd(40, 120), focus: ['intimidate', 'spot', 'sense'], bias: { str: 1, con: 1 } }));
    sim.captainId = guards[0].id; guards[0].rank = 'captain'; guards[1].rank = 'sergeant';
    for (const q of everyone()) if ((q.job === 'smith' || q.job === 'journeyman' || q.job === 'apprentice') && q.traits.aggression < 0.2 && q.traits.honesty > 0.8) { q.noWeapons = true; }
    for (const g of guards) { g.items.torch = 1; g.shield = g.job === 'captain' ? 'heavyshield' : 'lightshield'; }
    guards[0].armor = 'chainshirt'; for (const g of guards.slice(3)) { g.weapon = 'lightxbow'; g.items.bolts = 20; g.shield = 'none'; }
    const civJobs = ['baker', 'bakehand', 'shopkeep', 'shophand', 'alchemist', 'smith', 'apprentice', 'innkeep', 'server', 'farmer', 'farmhand', 'rancher', 'doctor', 'undertaker', 'cleric', 'teacher', 'clerk'];
    const genders = ['m', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f'].sort(() => Math.random() - 0.5);
    civJobs.forEach((job, i) => add({ gender: genders[i], cls: ['baker', 'shopkeep', 'alchemist', 'smith', 'innkeep', 'farmer', 'rancher', 'doctor', 'cleric', 'teacher'].includes(job) ? 'expert' : 'commoner', level: 1, job,
      coin: JOBS[job].owner ? irnd(250, 450) : irnd(30, 120), weapon: job === 'smith' ? 'club' : job === 'farmer' ? 'club' : 'fists', focus: ['doctor', 'cleric'].includes(job) ? ['heal'] : job === 'teacher' ? ['diplomacy', 'sense'] : job === 'shopkeep' ? ['diplomacy', 'sense'] : [] }));
    for (const gd of [g(), g(), g()]) add({ gender: gd, cls: 'rogue', level: irnd(1, 2), job: 'none', coin: irnd(20, 80), weapon: 'dagger', focus: ['sleight', 'hide', 'sneak', 'openlock', 'bluff'], traits: { honesty: rnd(0.05, 0.4), greed: rnd(0.7, 1) }, items: { picks: 1 } });
    for (const gd of ['m', 'm', 'm', 'f']) add({ gender: gd, cls: 'warrior', level: irnd(1, 2), job: 'none', coin: irnd(20, 80), weapon: pick(['club', 'sap', 'dagger']), armor: 'leather', focus: ['intimidate'], traits: { aggression: rnd(0.5, 0.95), honesty: rnd(0.1, 0.6) }, bias: { str: 2 } });
    // houses: fill with families and singles; the mayor gets the big one
    const homeless = everyone().slice();
    homeless.sort(() => Math.random() - 0.5);
    let hi = 0; const cap = [4, 4, 4, 4, 4, 4, 4, 4];
    for (const p of homeless) { while (hi < HOUSES.length && cap[hi] <= 0) hi++; if (hi >= HOUSES.length) break; p.home = hi; cap[hi]--; if (cap[hi] <= 1 && Math.random() < 0.5) hi++; }
    HOUSES.forEach((h, i) => { h.stash = 0; h.tenants = {}; h.ask = 20; h.askSet = false; const rs = everyone().filter(p => p.home === i && !p.town).sort((a, b) => b.coin - a.coin); h.owner = rs[0]?.id || null; });
    // a small town: everyone has known everyone for years
    for (const a of everyone()) for (const b of everyone()) if (a !== b) {
      const r = R(a, b);
      r.like = clamp(rnd(-0.25, 0.45) + (a.home === b.home ? 0.3 : 0) + (JOBS[a.job]?.place && JOBS[a.job].place === JOBS[b.job]?.place ? 0.2 : 0), -1, 1);
      r.trust = clamp(0.35 + r.like * 0.4 + rnd(-0.1, 0.1));
      if (a.cls === 'rogue' || a.job === 'none') if (b.cls === 'rogue' || b.job === 'none') { r.like = clamp(r.like + 0.25, -1, 1); r.trust = clamp(r.trust + 0.2); }
    }
    for (const a of everyone()) for (const b of everyone()) if (a !== b) { const r = R(a, b); r.worth = trueWorth(b) * rnd(0.6, 1.4); r.wconf = rnd(0.3, 0.6); }
    // a few marriages already
    const singles = everyone().filter(p => p.job !== 'mayor');
    for (let i = 0; i < 5; i++) {
      const a = pick(singles), b = singles.filter(x => x !== a && !x.spouse && attracted(a, x) > 0.5 && attracted(x, a) > 0.5).sort((x, y) => R(a, y).like - R(a, x).like)[0];
      if (a && b && !a.spouse) marry(a, b, true);
    }
    // the animals
    const owner = job => everyone().find(p => p.job === job);
    const animal = (id, o) => { sim.animals[id] = { id, kind: 'animal', alive: true, hp: o.hp, maxhp: o.hp, nl: 0, x: 0, z: 0, yaw: 0, state: 'idle', stateT: 0, full: 0.6, bond: {}, skills: {}, ...o }; return sim.animals[id]; };
    animal('pip', { name: 'Pip', species: 'dog', temper: 'aggressive', owner: owner('baker')?.id, hp: 6, bite: [1, 4], ac: 13 });
    animal('soot', { name: 'Soot', species: 'cat', temper: 'passive', owner: owner('innkeep')?.id, hp: 3, bite: [1, 2], ac: 14 });
    animal('nanny', { name: 'Nanny', species: 'goat', temper: 'passive', owner: owner('farmer')?.id, hp: 8, bite: [1, 4], ac: 12 });
    animal('vixen', { name: 'Vixen', species: 'fox', temper: 'wild', owner: null, hp: 4, bite: [1, 3], ac: 14, maxBond: 0.6 });
    for (const an of Object.values(sim.animals)) if (an.owner) an.bond[an.owner] = 0.9;
    for (const sp of Object.keys(GAME)) for (let i = 0; i < GAME[sp].start; i++) spawnGame(sp);
    const rancher = owner('rancher');
    for (const [sp, n] of [['hen', 8], ['cow', 3], ['sheep', 4]]) for (let i = 0; i < n; i++) spawnStock(sp, rancher?.id);
    sim.commons = { apple: 40, berries: 25 }; sim.fish = 30;
    for (const p of everyone()) if (!p.town) place(p, p.home != null ? HOUSES[p.home].bed : P(0, 0));
    place(sim.animals.pip, P(-9, -18)); place(sim.animals.soot, P(28, 3)); place(sim.animals.nanny, P(-82, 6)); place(sim.animals.vixen, P(-100, -15));
    sim.market = { stock: { grain: 60, turnip: 60, barley: 30, meat: 15 }, moved: {} };
    for (const [job, cls, lvl] of [['factor', 'expert', 2], ['militia', 'warrior', 3], ['militia', 'warrior', 3]]) {
      const p = makePerson(sim, { name: name(pick(['m', 'f'])), cls, level: lvl, job, coin: job === 'factor' ? 1200 : 100, weapon: job === 'militia' ? 'longsword' : 'dagger', armor: job === 'militia' ? 'chain' : 'none', tags: ['marrowford'], traits: { honesty: 0.85, aggression: 0.5, caution: 0.4 } });
      p.town = 'marrow'; sim.people[p.id] = p; sim.peopleAdded = (sim.peopleAdded || 0) + 1; place(p, randIn('marrow', 3));
    }
    for (const id of BUSINESSES) sim.business[id] = { id, owner: everyone().find(p => JOBS[p.job].owner === id)?.id || null, stock: {}, sales: 0, owed: 0, insurance: null };
    sim.plots = Array.from({ length: 18 }, (_, i) => { const crop = ['grain', 'turnip', 'grain', 'barley', 'grain', 'turnip'][i % 6]; const age = rnd(0, CROPS[crop].days); return { i, at: P(-100 + (i % 6) * 6, -14 + Math.floor(i / 6) * 16), crop, planted: sim.t - age * 1440, tended: 0.6 }; });
    for (const b of Object.values(sim.business)) b.mult = {};
    sim.business.farm.stock = { grain: 14, barley: 4, turnip: 16 };
    sim.business.bakery.stock = { bread: 24, pie: 3, grain: 4 }; sim.business.store.stock = { rope: 3, torch: 6, treats: 6, ball: 2, plank: 6, picks: 1, turnip: 4 };
    sim.business.smithy.stock = { iron: 20, dagger: 3, club: 2, spear: 2, shortsword: 1, javelins: 2, sling: 1, bullets: 2, shortbow: 1, arrows: 3, padded: 1, leather: 2, lightshield: 1 }; sim.business.tavern.stock = { ale: 20, meal: 8, barley: 1, turnip: 2 }; sim.business.store.stock.meat = 2; sim.business.store.stock.cure = 4; sim.business.store.stock.finery = 3;
    // a blank start: everyone begins with nothing; businesses are unclaimed, offices empty
    if (opts.start === 'blank') {
      for (const p of everyone()) { if (p.town) continue; /* Rose: no head start for anyone but crime bosses, the mayor brain included */ p.home = null; p.job = 'none'; p.coin = irnd(0, 40); p.weapon = 'fists'; p.armor = 'none'; p.shield = 'none'; p.items = {}; p.rank = null; p.noWeapons = false; }
      for (const b of Object.values(sim.business)) b.owner = null;
      for (const h of HOUSES) { h.owner = null; h.tenants = {}; }   // Rose: houses must be bought (10c at the hall) or rented
      sim.captainId = null; sim.blank = true;
      for (const a of everyone()) for (const b of everyone()) if (a !== b && a.rel[b.id]) { a.rel[b.id].worth = trueWorth(b) * rnd(0.6, 1.4); a.rel[b.id].wconf = rnd(0.3, 0.6); }
    }
    // soft pushes: a few people are given a persona (only an AI brain reads it)
    { const pool = everyone().filter(p => !p.town && p.kind === 'human' && p.age >= 18 && p.brain !== 'mayor-ai').sort(() => Math.random() - 0.5); (opts.personas || PERSONAS).filter(Boolean).forEach((t, k) => { if (pool[k]) pool[k].persona = t; }); }
    for (const p of everyone()) if (!sim.blank && !p.town && (p.cls === 'rogue' || p.job === 'none' && p.cls === 'warrior')) p.underworld = { role: p.cls === 'rogue' ? 'thief' : 'mugger', since: 0 };
    for (const p of everyone()) if (!p.town && (p.underworld || /crime|thief|thug|gang|crook|outlaw|steal|rob/i.test(p.persona || ''))) p.policy = { ...(p.policy || {}), crime: 2, violence: 1.5, gang: 1.5 };   // the underworld leans to crime and violence (an AI can change it)
    for (const p of everyone()) if (p.persona && /crime boss|crime family/i.test(p.persona)) { p.underworld = { role: 'boss', since: 0 }; p.weapon = 'greatsword'; p.armor = 'fullplate'; p.coin = 5000; }   // Rose: the boss starts with a greatsword, heavy armour and 50 gold
    // a dead traveller lies hidden in a back corner of one of the houses with a fortune on them, and a note asking for it to go to the guard (Rose)
    { const hr = AREAS[pick(HOUSES).id], at = P(pick([hr.x0 + 1.2, hr.x1 - 1.2]), hr.z0 < 0 ? hr.z0 + 1.5 : hr.z1 - 1.5);
      sim.bodies.push({ id: 'stranger', name: 'Aldous Merrow, a traveller', x: at.x, z: at.z, coin: 20000, items: { longsword1: 1, elvenchain: 1, bread: 3, meat: 2, waterskin: 2, note: 1 }, weapon: 'fists', buried: false, killer: null, how: 'a fall on the rocks', stranger: true, hidden: true,
        note: 'To whoever finds me: my name is Aldous Merrow. I was walking home to Marrowford with all we had saved. My wife Elspeth and my little girl Wren are waiting for me; Wren turns seven this spring and I promised her I would be home for it. I fell, and my leg is broken, and I do not think anyone will come. Please, I beg you, take my belongings to the town guard so they can reach my family. They will have nothing without them. Tell Wren her papa loved her. God keep you. - A.M.' }); }
    sim.lore && mutateAll();
    log('town', `Day 1. Hollow Town has no mayor: the first vote is at noon on day ${sim.firstElection || 2}, and anyone may stand. ${living().length} people live here${sim.blank ? ', and they have nothing yet' : ''}.`);
  }
  function place(p, at) { p.x = at.x; p.z = at.z; p.area = areaOf(at); }
  let gameSeq = 0;
  function spawnGame(sp) {
    const g = GAME[sp], id = sp + (++gameSeq);
    const an = sim.animals[id] = { id, kind: 'animal', species: sp, name: sp[0].toUpperCase() + sp.slice(1), temper: g.flees ? 'skittish' : 'wild', game: true, alive: true, hp: g.hp, maxhp: g.hp, nl: 0, ac: g.ac, bite: g.bite, meat: g.meat, x: 0, z: 0, yaw: 0, state: 'idle', stateT: 0, full: 1, bond: {}, skills: {} };
    place(an, randIn('wood', 2)); return an;
  }
  sim.spawnGame = spawnGame;
  let stockSeq = 0;
  function spawnStock(sp, ownerId) {
    const g = STOCK[sp], id = sp + 's' + (++stockSeq);
    const an = sim.animals[id] = { id, kind: 'animal', species: sp, name: sp[0].toUpperCase() + sp.slice(1), temper: 'passive', livestock: true, alive: true, hp: g.hp, maxhp: g.hp, nl: 0, ac: g.ac, bite: [1, 2], meat: g.meat, x: 0, z: 0, yaw: 0, state: 'idle', stateT: 0, full: 0.8, bond: {}, skills: {}, owner: ownerId || null };
    place(an, randIn('ranch', 3)); return an;
  }
  sim.spawnStock = spawnStock;
  // beasts that come out of the wild (SRD stats, a little cut down): attack bonus, damage dice + bonus, hide armour (dr)
  const BEASTS = {
    wolf:     { name: 'Wolf', hp: 13, ac: 14, atk: 3, bite: [1, 6], dmgBonus: 1, speed: 15, meat: 2, pelt: 'wolfpelt', from: 21, pack: [2, 4], label: 'a wolf pack' },
    boar:     { name: 'Wild boar', hp: 25, ac: 16, atk: 4, bite: [1, 8], dmgBonus: 3, speed: 12, meat: 6, attackName: 'tusks', from: 21, pack: [1, 2], label: 'wild boar', dr: 1 },
    bear:     { name: 'Bear', hp: 30, ac: 13, atk: 6, bite: [1, 8], dmgBonus: 4, speed: 12, meat: 10, pelt: 'bearpelt', attackName: 'claws', from: 21, pack: [1, 1], label: 'a bear', dr: 1 },
    direwolf: { name: 'Dire wolf', hp: 38, ac: 14, atk: 7, bite: [1, 8], dmgBonus: 6, speed: 15, meat: 6, pelt: 'wolfpelt', from: 28, pack: [1, 3], label: 'dire wolves', dr: 1 },
    ogre:     { name: 'Ogre', hp: 29, ac: 16, atk: 8, bite: [2, 8], dmgBonus: 7, speed: 9, meat: 0, pelt: 'ogretooth', attackName: 'greatclub', from: 35, pack: [1, 2], label: 'wild ogres', dr: 2 },
    troll:    { name: 'Troll', hp: 63, ac: 16, atk: 9, bite: [1, 6], dmgBonus: 6, speed: 9, meat: 0, pelt: 'trollhide', attackName: 'claws', from: 999, pack: [1, 1], label: 'a troll', regen: 5, multi: 1 },   // two claws a turn; heals 5 a round unless burned
  };
  const BEAST_CR = { wolf: 1, boar: 2, bear: 3, direwolf: 3, ogre: 3, troll: 5 };
  let beastSeq = 0;
  function spawnBeast(kind, at) {
    const b = BEASTS[kind], id = kind + 'x' + (++beastSeq);
    const an = sim.animals[id] = { id, kind: 'animal', species: kind, name: b.name, temper: 'hostile', monster: true, alive: true, hp: b.hp, maxhp: b.hp, nl: 0, ac: b.ac, atk: b.atk, bite: b.bite, dmgBonus: b.dmgBonus, dr: b.dr || 0, regen: b.regen || 0, multi: b.multi || 0, cr: BEAST_CR[kind] || 1, speed: b.speed, meat: b.meat, pelt: b.pelt, attackName: b.attackName, x: 0, z: 0, yaw: Math.PI / 2, state: 'prowl', stateT: 0, full: 0.3, bond: {}, skills: { spot: 4, listen: 4 }, items: {} };
    place(an, P(at.x + rnd(-2, 2), at.z + rnd(-3, 3))); return an;
  }
  function invade(first) {
    const day = sim.day + 20, pool = first ? ['bear'] : Object.keys(BEASTS).filter(k => BEASTS[k].from <= day && (k !== 'ogre' || day >= 35));
    // every 7th night (the 'troll night' setting) brings a troll and two bears (Rose)
    const finale = !first && sim.day % (sim.genDays || 7) === 0;
    const kind = pick(pool.length ? pool : ['bear']), b = BEASTS[kind], n = first ? 1 : irnd(b.pack[0], b.pack[1] + Math.floor((day - 21) / 14));
    const at = pick([P(-112, rnd(-15, 15)), P(-112, rnd(-15, 15)), P(-66, -48), P(-66, 48)]);
    const got = [];
    if (finale) {
      got.push(spawnBeast('troll', at)); for (let i = 0; i < 2; i++) got.push(spawnBeast('bear', P(at.x + rnd(-4, 4), at.z + rnd(-4, 4))));
      sim.beastsSeen = (sim.beastsSeen || 0) + got.length; sim.nextInvasion = day + irnd(3, 6);
      log('death', 'The last night: a troll and two bears come out of the Wildwood, heading for town!', got.map(a => a.id)); return;
    }
    for (let i = 0; i < n; i++) got.push(spawnBeast(kind, at));
    sim.beastsSeen = (sim.beastsSeen || 0) + n;
    log('death', `${first ? 'Something big' : n > 1 ? n + ' beasts' : 'A beast'} ${n > 1 ? 'come' : 'comes'} out of the Wildwood: ${n > 1 ? n + ' ' + ({ wolf: 'wolves', boar: 'wild boar', bear: 'bears', direwolf: 'dire wolves', ogre: 'ogres' }[kind]) : b.name.toLowerCase()}, heading for town!`, got.map(a => a.id));
    sim.nextInvasion = day + irnd(3, 6);
  }
  sim.invade = invade; sim.BEASTS = BEASTS; sim.spawnBeast = spawnBeast;
  // a beast hunts: the nearest person or animal it can see, otherwise toward the houses
  // a beast is loud (Rose): a bear's roar, an ogre or troll crashing through, a wolf pack howling wakes the sleepers near it
  const LOUD = { bear: [16, 8, 'a bear roaring'], ogre: [20, 10, 'something huge crashing through the dark'], troll: [22, 12, 'a troll bellowing and crashing through the dark'], direwolf: [14, 7, 'wolves howling'], wolf: [12, 6, 'wolves howling'], boar: [10, 5, 'a boar grunting and snorting'] };
  function beastNoise(an) {
    const L = LOUD[an.species]; if (!L || (an.noiseAt && sim.t - an.noiseAt < 5)) return; an.noiseAt = sim.t;
    let woke = 0;
    for (const q of living()) if (q.kind === 'human' && q.state === 'sleep' && q.brain !== 'human' && conscious(q) && dist2(q, an) < (sameSpace(q, an) ? L[0] : L[1])) { q.task = null; q.state = 'idle'; q.alert = true; remember(q, { text: `woken by ${L[2]} near ${AREAS[areaOf(an)]?.name || 'the houses'}` }); woke++; }
    if (woke && !(an.noiseLogged)) { an.noiseLogged = true; log('death', `The sound of ${L[2]} wakes ${woke === 1 ? 'someone' : woke + ' people'} near ${AREAS[areaOf(an)]?.name || 'town'}.`, []); }
  }
  // a barricaded house or the palisade stands between a beast and where it's going: it batters it down first (Rose)
  function blockedDoor(an, goal) {
    const here = areaOf(an) || an.area, there = areaOf(goal); if (!here || !there || here === there) return null;
    const path = route(here, there); if (!path?.length) return null;
    const dr = path[0], other = dr.a === here ? dr.b : dr.a, hs = HOUSES.find(h => h.id === other);
    if (hs && (hs.barricade || 0) > 0) return { dr, here, hs, name: 'the barricade at ' + AREAS[hs.id].name };
    if (here === 'wood' && other === 'fields' && sim.palisade?.hp > 0) return { dr, here, pal: true, name: 'the palisade' };
    return null;
  }
  function batter(an, blk, dtMin) {
    const at = blk.dr.side[blk.here];
    if (dist2(an, at) > 1.6) { an.crossing = null; stepToward(an, at, 4.84 * (an.speed || 12) / 9, dtMin); return; }
    if (sim.t < (an.nextBash || 0)) return; an.nextBash = sim.t + 1;
    let dmg = 0; for (let k = 0; k <= (an.multi || 0); k++) dmg += Math.max(0, roll(an.bite[0], an.bite[1]) + an.dmgBonus - 5);   // wood has hardness 5
    const key = blk.pal ? 'pal' : blk.hs.id;
    if (an.bashing !== key) {
      an.bashing = key; log('death', `The ${an.name.toLowerCase()} batters at ${blk.name}!`, [an.id]);
      for (const q of living()) if (q.kind === 'human' && q.state === 'sleep' && q.brain !== 'human' && conscious(q) && dist2(q, at) < 14) { q.task = null; q.state = 'idle'; q.alert = true; remember(q, { text: `woken by a ${an.name.toLowerCase()} battering at ${blk.name}` }); }
    }
    if (blk.pal) { sim.palisade.hp = Math.max(0, sim.palisade.hp - dmg); if (!sim.palisade.hp) log('death', `The ${an.name.toLowerCase()} smashes through the palisade!`, [an.id]); }
    else { blk.hs.barricade = Math.max(0, blk.hs.barricade - dmg); if (!blk.hs.barricade) log('death', `The ${an.name.toLowerCase()} smashes through the barricade on ${AREAS[blk.hs.id].name}!`, [an.id]); }
  }
  function prowl(an, dtMin) {
    if (an.monster && an.alive) beastNoise(an);
    // no retreat: a beast out of the Wildwood keeps hunting until it's killed or nobody is left (Rose)
    // a beast out of the Wildwood hunts people by scent (60 m, through doors and walls: it comes in after you);
    // only when nobody's within reach of its nose does it go for the penned animals and dogs it can see (Rose)
    const SCENT = 60;
    // it locks onto one victim and runs them down; it only picks again when that one is down, caught or out of its nose's reach
    const held = an.prey && (sim.people[an.prey] || sim.animals[an.prey]);
    an.spared ||= {};
    const keep = held && held.alive && (held.kind !== 'human' || !(held.jailedUntil > 0) && !held.carriedBy && !(an.spared[held.id] > sim.t)) && dist2(held, an) < SCENT * 1.2;
    const prey = (keep ? held : null) || living().filter(q => q.kind === 'human' && !(q.jailedUntil > 0) && !q.carriedBy && !(an.spared[q.id] > sim.t) && (conscious(q) ? dist2(q, an) < SCENT : dist2(q, an) < 20)).sort((a, b) => dist2(a, an) - dist2(b, an))[0]
      || Object.values(sim.animals).filter(a => a.alive && !a.monster && (a.livestock || a.owner && !a.familiar) && dist2(a, an) < 26 && sees(an, a)).sort((a, b) => dist2(a, an) - dist2(b, an))[0];
    an.prey = prey?.id || null;
    if (prey) {
      { const blk = blockedDoor(an, prey); if (blk) { batter(an, blk, dtMin); return; } }
      if (dist2(prey, an) > 2) { if (!an.scented && prey.kind === 'human') { an.scented = true; log('fight', `The ${an.name.toLowerCase()} catches a scent and heads into town!`, [an.id]); } stepToward(an, prey, 4.84 * (an.speed || 12) / 9, dtMin); return; }
      if (prey.livestock) {      // penned beasts can't get away: a bite now and then until it's down
        if (sim.t < (an.nextBite || 0)) return; an.nextBite = sim.t + 1;
        if (d(20) + an.atk >= prey.ac) { prey.hp -= roll(an.bite[0], an.bite[1]) + an.dmgBonus; if (prey.hp <= 0) { prey.alive = false; prey.state = 'dead'; log('death', `The ${an.name.toLowerCase()} kills a ${prey.species} at the ranch.`, [an.id]); an.full = Math.min(1, an.full + 0.3); } }
        return;
      }
      if (prey.kind === 'human' && !conscious(prey)) {   // the fallen can't fight back: it finishes them (Rose can't die: she's left for dead)
        if (prey.brain === 'human') { prey.hp = Math.min(prey.hp, 0); prey.down = 'out'; prey.downUntil = sim.t + 240; an.spared[prey.id] = sim.t + 240; log('death', `The ${an.name.toLowerCase()} mauls you where you lie and leaves you for dead.`, [an.id, prey.id]); }
        else { log('death', `The ${an.name.toLowerCase()} finishes ${fullName(prey)} where they lie.`, [an.id, prey.id]); die(prey, an, 'savaged'); }
        an.prey = null; an.full = Math.min(1, an.full + 0.4); return;
      }
      startFight(an, prey, { mode: 'lethal', why: 'a beast attacks' }); return;
    }
    if (!an.goal || dist2(an, an.goal) < 2 || Math.random() < dtMin / 90) an.goal = randIn(pick(['lane', 'square', 'lane', 'square', 'ranch']), 2);   // with no scent: into town, where people are
    { const blk = blockedDoor(an, an.goal); if (blk) { batter(an, blk, dtMin); return; } }
    stepToward(an, an.goal, 1.2, dtMin);
  }
  sim.BEASTS = BEASTS;

  // ---- the player ---------------------------------------------------------
  sim.addPlayer = (name = 'Rose', gender = 'f', opts = {}) => {
    // a ghost (Rose, watching): a camera body that is not in the town at all; nobody sees, hears or hunts it
    if (opts.ghost) { const g = makePerson(sim, { id: 'ghost', name, gender, brain: 'human', tags: ['ghost'] }); g.surname = 'of the City'; g.ghost = true; place(g, P(-14, 0)); return g; }
    const p = makePerson(sim, { id: 'player', name, gender, cls: 'rogue', level: 2, job: 'none', coin: 150, weapon: 'dagger', focus: ['bluff', 'diplomacy', 'sense', 'sleight', 'hide'], brain: 'human', tags: ['outsider', 'human'] });
    p.surname = 'of the City'; p.st = { str: 12, dex: 14, con: 13, int: 13, wis: 12, cha: 15 }; p.hp = p.maxhp = 14; p.skills = skillsFor('rogue', p.st, 2, ['bluff', 'diplomacy', 'sense', 'sleight', 'hide']);
    sim.people.player = p; sim.playerId = 'player'; sim.peopleAdded = (sim.peopleAdded || 0) + 1;
    for (const o of everyone()) if (o !== p) { o.rel.player = { like: rnd(-0.15, 0.1), trust: 0.05, fear: 0, court: 0 }; p.rel[o.id] = { like: 0, trust: 0.1, fear: 0, court: 0 }; }
    place(p, P(-14, 0));
    log('town', `${name}, a stranger from the city, walks into Hollow Town.`, ['player']);
    return p;
  };

  // ---- perception -----------------------------------------------------------
  const night = () => { const h = H(); return h < 6 || h >= 20; };
  const smithHand = () => living().filter(q => q.job === 'journeyman').length < 2 ? 'journeyman' : 'apprentice';   // the smithy takes on smiths first, then apprentices
  sim.townDead = () => !living().some(q => q.kind === 'human' && !q.town && q.id !== 'player');   // Rose: the generation ends when the whole town is dead
  // ---- sight and hearing ----------------------------------------------------
  // Everyone has a vision radius (Wisdom and Spot) and looks one way (a 140-degree cone);
  // close by (2.5 m) you notice anyone. Light matters: at night, outdoors, a dark figure is
  // seen at a third of the range, unless they stand under a lamp or carry a torch (which also
  // makes them easy to spot from afar). Someone sneaking in the dark rolls Hide against Spot.
  // Hearing (Listen) works all round but shorter, and walls stop both.
  const LAMPS = [P(-14, -11), P(14, -11), P(-14, 11), P(14, 11), P(-35, 5), P(0, 0)];
  const SNEAKY = new Set(['pickpocket', 'burgle', 'rustle', 'ambush', 'lurk', 'mug', 'avenge']);
  const sightOf = a => a.kind === 'animal' ? 14 : Math.max(8, 16 + (a.skills.spot || 0) * 1.5);
  const hearOf = a => a.kind === 'animal' ? 10 : Math.max(4, 7 + (a.skills.listen || 0));
  const litAt = (pos, t) => !night() || AREAS[areaOf(pos)]?.indoor || LAMPS.some(l => dist2(l, pos) < 7) || (sim.fires || []).some(f => f.until > sim.t && dist2(f, pos) < 8) || (t && t.items?.torch > 0 && t.kind === 'human');
  sim.sightOf = sightOf; sim.hearOf = hearOf; sim.litAt = litAt;
  function facing(a, pos) { const dx = pos.x - a.x, dz = pos.z - a.z, l = Math.hypot(dx, dz) || 1; return (dx * Math.sin(a.yaw || 0) + dz * Math.cos(a.yaw || 0)) / l; }
  const spotCache = {};
  const sees = (a, pos) => {
    if (!conscious(a) || a.state === 'sleep' || a.jailedUntil > 0 && areaOf(pos) !== 'station') return false;
    if (!sameSpace(a, pos)) return false;
    const dd = dist2(a, pos);
    if (dd < 2.5) return true;
    const t = pos.kind ? pos : null, lit = litAt(pos, t);
    const range = sightOf(a) * (lit ? 1 : 0.35) * (t?.items?.torch > 0 && night() ? 1.5 : 1);
    if (dd > range || facing(a, pos) < -0.34) return false;
    if (t && (!lit && SNEAKY.has(t.state) || t.hiding > sim.t)) {      // Spot vs Hide, remembered for half an hour
      const k = a.id + '>' + t.id, c = spotCache[k];
      if (c && sim.t - c.t < 30) return c.ok;
      const ok = d(20) + (a.skills.spot || 0) >= d(20) + (t.skills.hide || 0) - (lit ? 5 : 0) - (ARMOR[t.armor]?.acp || 0);
      spotCache[k] = { t: sim.t, ok }; return ok;
    }
    return true;
  };
  const EARSHOT = 9, CRY_RANGE = 18;   // metres: ~30 ft for talk, ~60 ft for "Guard!" (Rose)
  const inEarshot = (q, sp) => conscious(q) && sameSpace(q, sp) && dist2(q, sp) < EARSHOT * (q.state === 'sleep' ? 0.4 : 1);
  sim.EARSHOT = EARSHOT; sim.inEarshot = inEarshot;
  const hears = (a, pos) => conscious(a) && sameSpace(a, pos) && dist2(a, pos) < hearOf(a) * (a.state === 'sleep' ? 0.4 : 1);
  sim.sees = sees; sim.hears = hears;
  sim.sees = sees;
  const witnesses = (pos, exclude = [], noisy = false) => living().filter(w => !exclude.includes(w) && (sees(w, pos) || noisy && hears(w, pos)));

  // ---- deeds, beliefs and the record ----------------------------------------
  // A deed is seen by whoever sees it. Each witness may report it at the station desk.
  const CRIMES = { vagrancy: 1, warrant: 4, robbery: 6, embezzlement: 6, theft: 3, burglary: 4, assault: 4, mugging: 5, murder: 10, extortion: 4, bribery: 3, vandalism: 2, desecration: 3, jailbreak: 4, trespass: 1, harboring: 4 };
  function deed(type, actor, victim, at, extra = {}) {
    const ev = { id: 'ev' + (++sim.rec.crimes) + '-' + Math.floor(sim.t), type, actor: actor.id, victim: victim?.id || null, at: { x: at.x, z: at.z }, t: sim.t, day: sim.day, ...extra };
    const seen = witnesses(at.kind ? P(at.x, at.z) : at, [actor], ['assault', 'mugging', 'murder', 'vandalism'].includes(type));
    if (victim && victim.kind === 'human' && conscious(victim) && !seen.includes(victim) && extra.victimKnows !== false && dist2(victim, at) < 2.5) seen.push(victim);
    if (victim && victim.kind === 'human' && seen.includes(victim)) victim.alert = true;
    if (['assault', 'mugging', 'murder', 'robbery'].includes(type) && actor.id !== 'player' || ['assault', 'mugging', 'murder', 'robbery'].includes(type)) { const crier = seen.filter(w => w !== actor && w.kind === 'human' && !thinks(w) && w.brain !== 'human' && conscious(w) && !isGuard(w)).find(w => Math.random() < 0.25 + w.traits.honesty * 0.4 - w.traits.caution * 0.1); if (crier) setTimeout0(() => hueAndCry(crier)); }
    for (const w of seen) { perceive(w, ev, 'saw', null); w.alert = true; if (w.state === 'sleep' && w.brain !== 'human') { w.task = null; w.state = 'idle'; } }
    // an AI witness to violence decides at once what to do about it (shout, step in, run, or look away)
    if (['assault', 'mugging', 'murder', 'robbery'].includes(type)) {
      const who = q => q.id === 'player' ? 'Rose of the City' : fullName(q), deedWord = { assault: 'attack', mugging: 'mug', murder: 'kill', robbery: 'rob' }[type];
      seen.filter(w => w !== actor && w.kind === 'human' && thinks(w) && w.brain !== 'human' && conscious(w) && !w.fight && !w.awaiting && !(w.aiDownUntil > sim.t))
        .sort((x, y) => dist2(x, at) - dist2(y, at)).slice(0, 4)
        .forEach(w => { w.alert = false; setTimeout0(() => askOrders(w, `You just SAW ${who(actor)} ${deedWord} ${victim ? (victim.kind === 'human' ? who(victim) : 'a ' + (victim.species || 'beast')) : 'someone'}, right in front of you${w === victim ? ' (you are the one attacked)' : ''}. What do you do? You could "shout for the guard", step in ("attack ${who(actor)}"), flee, report it at the guard station later, or keep your head down.`)); });
    }
    sim.events.push(ev); if (sim.events.length > 400) sim.events.shift();
    return { ev, seen };
  }
  sim.deed = deed;
  function perceive(w, ev, how, teller) {
    if (w.id === ev.actor || w.knows?.has(ev.id)) return;
    (w.knows ||= new Set()).add(ev.id);
    const actor = sim.people[ev.actor];
    const sev = CRIMES[ev.type] || 2;
    remember(w, { ev: ev.id, type: ev.type, actor: ev.actor, victim: ev.victim, how, from: teller?.id || null, lie: !!ev.lie });
    if (!actor) return;
    bump(w, actor, 'like', -0.06 * sev * (how === 'saw' ? 1 : 0.5));
    bump(w, actor, 'fear', 0.03 * sev);
    if (ev.victim && sim.people[ev.victim] && R(w, ev.victim).like > 0.4) { bump(w, actor, 'like', -0.2); w.grudge = w.grudge || {}; w.grudge[ev.actor] = (w.grudge[ev.actor] || 0) + sev; }
    if (how === 'saw' && w.id !== ev.actor && !w.hush?.[ev.actor] && !(w.toReport || []).some(e => e.id === ev.id) && (!['trespass', 'vagrancy'].includes(ev.type) || w.traits.honesty > 0.7)) (w.toReport ||= []).push(ev);
    if (isGuard(w) && onDuty(w)) guardHears(w, ev, how, teller);
  }
  sim.perceive = perceive;
  // the bounty board: a crime that's proved (seen by a guard, or reported at the desk) puts its doer's name up, paid
  // from the treasury to whoever brings them to the cells: knocked out and carried in, or hauled by a guard (Rose)
  function postBounty(actor, type) {
    if (!actor || actor.kind !== 'human' || !actor.alive || sim.bounty[actor.id] || !(CRIMES[type] >= 3)) return;
    const amt = Math.min(300, CRIMES[type] * 20); sim.bounty[actor.id] = amt; (sim.bountyWhy ||= {})[actor.id] = type;
    log('law', `${fullName(actor)}'s name goes up on the bounty board: ${money(amt)} (${type}). Bring them to the Guard station.`, [actor.id]);
  }
  sim.postBounty = postBounty;
  function fileReport(w, ev) {
    const actor = sim.people[ev.actor]; if (!actor) return;
    const entry = actor.record.find(r => r.ev === ev.id);
    if (entry) { if (!entry.by.includes(w.id)) entry.by.push(w.id); }
    else actor.record.push({ ev: ev.id, type: ev.type, victim: ev.victim, by: [w.id], day: sim.day, served: false, evidence: isGuard(w), lie: !!ev.lie });
    if (!ev.lie) postBounty(actor, ev.type);
    log('law', `${fullName(w)} reports ${fullName(actor)} at the guard station: ${ev.type}${ev.victim ? ' against ' + (sim.people[ev.victim]?.name || 'someone') : ''}.${ev.lie ? ' (it is a lie)' : ''}`, [w.id, actor.id]);
  }
  const openRecord = p => p.record.filter(r => !r.served);
  const accusers = p => new Set(openRecord(p).flatMap(r => r.by)).size;
  const hasEvidence = p => openRecord(p).some(r => r.evidence) || accusers(p) >= 3;
  sim.openRecord = openRecord; sim.hasEvidence = hasEvidence;

  // ---- jobs and duty ---------------------------------------------------------
  const isGuard = p => !!JOBS[p.job]?.guard;
  const onDuty = p => isGuard(p) && inShift(p.job, H()) && p.task?.kind === 'work';
  sim.isGuard = isGuard;

  // ---- lies, claims, rumours (3.5: Bluff vs Sense Motive) ---------------------
  function claim(sp, li, c) {     // c: {kind:'accuse', subject, victim, type, lie} | {kind:'liar', subject, lie}
    if (!conscious(li) || li === sp || li.kind !== 'human' || li.brain === 'human') return false;
    if (c.subject === li.id) { if (c.lie) { bump(li, sp, 'like', -0.4); bump(li, sp, 'trust', -0.4); } return false; }
    const knowsFalse = c.lie && (c.victim === li.id);
    const r1 = d(20), r2 = d(20);
    const atk = r1 + sp.skills.bluff + (c.lie ? 0 : 4) + Math.round(R(li, sp).trust * 6 - 3);
    const def = r2 + li.skills.sense + (knowsFalse ? 10 : 0);
    if (atk >= def) {
      if (c.kind === 'accuse') perceive(li, { id: c.id, type: c.type, actor: c.subject, victim: c.victim, t: sim.t, lie: c.lie, rumor: true }, 'told', sp);
      else bump(li, c.subject, 'trust', -0.3);
      bump(li, sp, 'trust', 0.03);
      log(c.lie ? 'lie' : 'rumor', `${li.name} believes ${sp.name}: ${claimText(c)}.${c.lie ? ' (a lie)' : ''} [${atk} vs ${def}]`, [sp.id, li.id, c.subject]);
      return true;
    }
    bump(li, sp, 'trust', -0.35); li.warnAbout = { who: sp.id, wasLie: !!c.lie };
    log(c.lie ? 'lie' : 'rumor', `${li.name} doesn't believe ${sp.name}'s "${claimText(c)}" and trusts ${sp.pron[1]} less.${c.lie ? '' : ' (it was true)'} [${atk} vs ${def}]`, [sp.id, li.id]);
    return false;
  }
  const claimText = c => c.kind === 'accuse' ? `${sim.people[c.subject]?.name} committed ${c.type}${c.victim ? ' against ' + (sim.people[c.victim]?.name || 'someone') : ''}` : `${sim.people[c.subject]?.name} is a liar`;
  sim.claim = claim;

  // ---- marriage and households -------------------------------------------
  function marry(a, b, quiet) {
    a.spouse = b.id; b.spouse = a.id; sim.rec.marriages += quiet ? 0 : 1;
    const richer = (a.home != null && b.home != null) ? (a.coin >= b.coin ? a.home : b.home) : (a.home ?? b.home);
    a.home = b.home = richer;
    bump(a, b, 'like', 0.4); bump(b, a, 'like', 0.4); R(a, b).trust = clamp(R(a, b).trust + 0.4); R(b, a).trust = clamp(R(b, a).trust + 0.4);
    if (!quiet) log('life', `${fullName(a)} and ${fullName(b)} are married.`, [a.id, b.id]);
  }
  sim.marry = marry;
  const household = p => living().filter(q => q.home != null && q.home === p.home);
  const family = p => living().filter(q => q !== p && (q.spouse === p.id || (q.home != null && q.home === p.home)));

  // ---- soft power: who would stand with you ---------------------------------
  // A person's backing is everyone who likes and trusts them enough to retaliate for them.
  function backers(p) {
    return living().filter(q => q !== p && conscious(q) && (q.spouse === p.id || (p.gang && q.gang === p.gang) || (R(q, p).like > 0.45 && R(q, p).trust > 0.45)));
  }
  const might = p => p.kind === 'animal' ? Math.ceil(p.maxhp / 3) : (p.level + 1) + Math.max(0, mod(p.st.str)) + (WEAPONS[p.weapon].melee && p.weapon !== 'fists' ? 1 : 0);
  function power(p) { return might(p) + backers(p).reduce((s, q) => s + might(q) * 0.6, 0); }
  sim.power = power; sim.backers = backers;

  // ---- gangs ----------------------------------------------------------------
  let gangSeq = 0;
  function foundGang(boss, name) {
    const id = 'g' + (++gangSeq);
    const taken = new Set(Object.values(sim.gangs).map(g => g.name));
    sim.gangs[id] = { id, name: name || pick(['the Ash Hands', 'the Wick Knives', 'the Lantern Boys', 'the Black Furrow', 'the Graveside Crew', 'the Pike Family', 'the Marsh Rats', 'the Iron Coin', 'the Crooked Mile', 'the Hollow Saints', 'the Gallows Club', 'the Rook Street Lot'].filter(n => !taken.has(n)).concat([`the ${boss.surname} Lot`])), boss: boss.id, purse: 0, turf: [], founded: sim.day, cut: 0.25 };
    boss.gang = id; log('gang', `${fullName(boss)} founds ${sim.gangs[id].name}.`, [boss.id]);
    return sim.gangs[id];
  }
  const gangMembers = id => living().filter(p => p.gang === id);
  const gangPower = id => gangMembers(id).reduce((s, p) => s + might(p), 0);
  sim.gangMembers = gangMembers; sim.gangPower = gangPower; sim.foundGang = foundGang;

  // ======================================================= movement & tasks ==
  function via(p, goal) {
    const here = areaOf(p) || p.area, there = areaOf(goal);
    if (areaOf(p)) p.area = areaOf(p);
    if (!here || !there || here === there) { p.crossing = null; return goal; }
    const path = route(here, there); if (!path?.length) return goal;
    const dr = path[0], other = dr.a === here ? dr.b : dr.a;
    if (p.crossing === dr) return dr.side[other];
    if (dist2(p, dr.side[here]) < 1.0) { p.crossing = dr; return dr.side[other]; }
    return dr.side[here];
  }
  sim.via = via;
  function stepToward(p, goal, speed, dt) {
    if (goal.kind === 'human' && goal !== p && dist2(p, goal) < 0.75) return true;   // walking up to a person: stop at arm's length, not inside them
    // someone already stands on the spot: stop beside it rather than shoving in (the closest free place)
    if (p.kind === 'human' && dist2(p, goal) < 1.4 && dist2(p, goal) > 0.05 && living().some(q => q !== p && q !== goal && q.kind === 'human' && conscious(q) && dist2(q, goal) < 0.6)) return true;
    const g = via(p, goal);
    const dx = g.x - p.x, dz = g.z - p.z, len = Math.hypot(dx, dz);
    if (len < 0.05) return true;
    const s = Math.min(len, speed * hungerPace(p) * dt), nx = p.x + dx / len * s, nz = p.z + dz / len * s;
    if (walkable(P(nx, nz))) { p.x = nx; p.z = nz; } else if (walkable(P(nx, p.z))) p.x = nx; else if (walkable(P(p.x, nz))) p.z = nz;
    p.yaw = Math.atan2(dx, dz);
    if (areaOf(p)) p.area = areaOf(p);
    const dg = dist2(p, goal);
    return dg < 0.6 || dg < 1.6 && living().some(q => q !== p && q !== goal && q.kind === 'human' && conscious(q) && dist2(q, goal) < 0.8);
  }
  sim.stepToward = stepToward;
  // bodies don't pass through each other (Rose): anyone standing closer than ROOM gets nudged apart, so a crowd heading
  // for one spot spreads out around it instead of piling into one place. The knocked-out, the carried, the jailed
  // and people mid-fight are left where they are.
  const ROOM = 0.7;
  function separate() {
    const ps = living().filter(p => p.kind === 'human' && conscious(p) && !p.carriedBy && !(p.jailedUntil > 0) && !p.fight);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d >= ROOM || !sameSpace(a, b)) continue;
      let ux = dx / d, uz = dz / d; if (!(d > 1e-4)) { const ang = Math.random() * Math.PI * 2; ux = Math.cos(ang); uz = Math.sin(ang); }
      const push = (ROOM - d) / 2;
      for (const [q, s] of [[a, -1], [b, 1]]) { const n = P(q.x + ux * push * s, q.z + uz * push * s); if (walkable(n)) { q.x = n.x; q.z = n.z; } }
    }
  }
  sim.separate = separate;
  const setTask = (p, kind, o = {}) => { if (o.to && o.until) o.until = Math.max(o.until, sim.t + dist2(p, o.to) / 1.6 + 30); p.task = { kind, t0: sim.t, ...o }; p.state = kind; p.stateT = 0; };
  sim.setTask = setTask;

  const cool = (p, k, mins) => { (p.cd ||= {})[k] = sim.t + mins; };
  // =================================================== the scripted brain ==
  // Each hour (or when a task ends) a person scores what they could do and picks one.
  // Everything is priced in coin: wages, loot, risks (jail time costs wages; a beating
  // costs healing; death costs everything), and what a relationship might be worth.
  function wageCp(p) { const j = JOBS[p.job]; if (!j) return 0; if (j.payer === 'town') return sim.wages[p.job] ?? j.wage; if (j.owner) return Math.max(20, (sim.business[j.owner]?.sales || 60) / 3); return j.wage; }
  function wageOf(p) { return wageCp(p) / 10; }   // what a day's work is worth to a brain, in silver
  function guardsNear(pos, r = 18) { return living().filter(g => isGuard(g) && conscious(g) && g.jailedUntil <= 0 && dist2(g, pos) < r && sameSpace(g, pos)); }
  function riskAt(p, pos, crime) {
    const w = witnesses(pos, [p]).length, g = guardsNear(pos).length;
    const dark = night() && !AREAS[areaOf(pos)]?.indoor ? 0.5 : 1;
    const caught = clamp((w * 0.12 + g * 0.35) * dark);
    const jailDays = CRIMES[crime] || 3;
    return { caught, cost: jailDays * Math.max(3, wageOf(p)) + 5 };
  }
  function desperation(p) { return 1 + (p.coin < 20 ? 1.2 : p.coin < 50 ? 0.5 : 0) + (p.food < 0.25 ? 1 : 0); }
  const shopOpen = shop => living().some(q => free(q) && JOBS[q.job]?.place === shop && q.task?.kind === 'work' && areaOf(q) === shop);
  sim.shopOpen = shopOpen;

  // ======================================================== the underworld ==
  // The tools of crime come with a role you take on: a seedy career taken up where the underworld
  // meets (the Drowned Lantern, after dark), a gang, or (for a guard) being on someone's payroll.
  const CRIME_KINDS = new Set(['pickpocket', 'mug', 'burgle', 'shoprob', 'extort', 'rustle', 'ambush', 'lurkfor']);
  const CRIME_VERBS = new Set(['hide', 'case', 'steal']);
  const SEEDY_ROLES = { thief: 'thief (pickpocket, shoplifter)', burglar: 'burglar', mugger: 'mugger', robber: 'shop robber', extortionist: 'extortionist', bandit: 'bandit', rustler: 'rustler', fence: 'fence', smuggler: 'smuggler' };
  const inUnderworld = p => p.brain === 'human' || !!(p.underworld || p.gang || p.onPayroll) || (p.kind === 'human' && p.home == null && !p.town);   // Rose: the homeless have the underworld's tools within reach too (temptation)
  sim.inUnderworld = inUnderworld; sim.SEEDY_ROLES = SEEDY_ROLES;
  function takeUp(p, role) {
    if (p.underworld) return true;
    if (areaOf(p) !== 'tavern' || !(H() >= 20 || H() < 4)) return false;
    p.underworld = { role: SEEDY_ROLES[role] ? role : 'thief', since: sim.day }; p.policy ||= { crime: 1.6, violence: 1.3 };
    log('crime', `${fullName(p)} falls in with the underworld at the Drowned Lantern (${SEEDY_ROLES[p.underworld.role]}).`, [p.id]);
    remember(p, { text: `I took up a life as a ${SEEDY_ROLES[p.underworld.role]}` }); return true;
  }
  sim.takeUp = takeUp;
  // stepping into someone else's fight (Rose): who in a fight nearby this person would back, and against whom
  function helpChoices(p) {
    const out = [];
    if (p.fight || p.kind !== 'human' || !conscious(p) || p.jailedUntil > 0) return out;
    for (const f of sim.fights) {
      if (f.sides.has(p.id)) continue;
      const ms = f.order.map(body).filter(q => q && q.alive && conscious(q));
      if (ms.some(q => q.monster) || !ms.some(q => dist2(q, p) < 25 && sees(p, q))) continue;
      for (const x of ms) {
        if (x.kind !== 'human' || x === p) continue;
        const foes = ms.filter(q => f.sides.get(q.id) !== f.sides.get(x.id)); if (!foes.length) continue;
        const defender = f.sides.get(x.id) !== f.sides.get(f.by);
        const stake = (p.spouse === x.id ? 1 : 0) + (p.home != null && p.home === x.home ? 0.6 : 0) + (p.gang && p.gang === x.gang ? 0.8 : 0) + R(p, x).like + (isGuard(p) && inShift(p.job, H()) && defender ? 1 : 0) + (defender ? 0.2 : -0.2);
        if (stake < 0.5 || ms.filter(q => f.sides.get(q.id) === f.sides.get(x.id)).length >= 4) continue;   /* no riots: a side of four needs no more help */
        out.push({ foe: foes.sort((a, b) => dist2(a, p) - dist2(b, p))[0], x, stake });
      }
    }
    return out.sort((a, b) => b.stake - a.stake).slice(0, 2);
  }
  function options(p) {
    const h = H(), out = [], j = JOBS[p.job];
    if (p.town === 'marrow') { if (p.food < 0.5) p.food = 1; if ((p.water ?? 1) < 0.5) p.water = 1; return [{ kind: 'work', value: 5 }]; }
    const add = (kind, value, o = {}) => out.push({ kind, value, ...o });
    // work
    if (j && j.place && !j.hunt && inShift(p.job, h)) add('work', wageOf(p) * 1.4 + 2 + (j.owner ? 3 : 0) + (j.craft ? 5 : 0), {});
    // eat
    if ((p.water ?? 1) < 0.45) add('drink', (0.6 - p.water) * 16 + 1 + (p.water < 0.15 ? 40 : 0));
    if (p.food < 0.45) {
      // the dead earn nothing: food is worth what starving would cost you, wages included
      const want = (0.6 - p.food) * (12 + wageOf(p) * 1.5) + (p.food < 0.15 ? 10 + wageOf(p) * 2 : 0);
      if (Object.keys(p.items).some(k => GOODS[k]?.food && p.items[k] > 0)) add('eat', want + 2);
      for (const [shop, item] of [['bakery', 'bread'], ['tavern', 'meal'], ['store', 'turnip'], ['store', 'meat'], ['store', 'eggs'], ['store', 'milk'], ['store', 'fish'], ['store', 'apple']]) if (shopOpen(shop) && (sim.business[shop].stock[item] || 0) > 0 && p.coin >= priceOf(shop, item)) add('buy', want - priceOf(shop, item) * 0.04, { shop, item });
      if (p.coin < 30 && p.home != null && HOUSES[p.home].stash >= 20) add('purse', want + 2);
      if (p.coin < 20) add('beg', want * 0.4);
      if (sim.commons.apple + sim.commons.berries > 4 && h >= 5 && h < 21) add('forage', want * 0.8 + (p.coin < 30 ? 2 : 0));
      if (sim.fish > 3 && h >= 5 && h < 20) add('fish', want * 0.7 * (sim.fish / 40) + (p.coin < 30 ? 1.5 : 0) + (p.traits.caution > 0.6 ? 0.5 : 0));
    }
    // hunting: meat to eat or sell; the boar fights back, so a party helps
    const game = Object.values(sim.animals).filter(a => a.game && a.alive);
    if (game.length && (p.food < 0.5 || p.traits.greed > 0.6 || p.job === 'hunter') && h >= 6 && h < 19) {
      const armed = p.weapon !== 'fists', bow = WEAPONS[p.weapon].range;
      for (const sp of Object.keys(GAME)) {
        const any = game.find(a => a.species === sp); if (!any) continue;
        const meat = GAME[sp].meat * priceOf('store', 'meat') / 10, danger = sp === 'boar' ? 6 : sp === 'deer' ? 1.5 : 0, odds = (bow ? 0.7 : armed ? 0.45 : 0.15) * (sp === 'rabbit' || sp === 'pheasant' ? (bow ? 0.9 : 0.5) : 1);
        const v = meat * odds * (p.food < 0.4 ? 1.6 : 1) * 0.35 - danger * p.traits.caution * (p.party ? 0.4 : 1) - 2.5 - (p.job !== 'none' && JOBS[p.job].from != null && inShift(p.job, h) ? wageOf(p) : 0);
        const vv = v + (p.job === 'hunter' && inShift('hunter', h) ? 5 : 0); if (vv > 0) add('hunt', vv, { species: sp });
      }
    }
    // sleep
    if (!(p.stayUpUntil > sim.t && p.rest > 0.1) && (p.rest < 0.6 || ((h >= 22 || h < 5) && !(j && inShift(p.job, h))))) add('sleep', (1 - p.rest) * 8 + ((h >= 22 || h < 5) ? 5 : 0));
    // leisure and people
    if (h >= 17 && h < 23) add('tavern', 1.5 + p.traits.sociability * 2 + (p.coin > 20 ? 1 : 0));
    add('socialize', 0.8 + p.traits.sociability * 1.5);
    // romance / marriage (money counts as much as love for the greedy)
    if (!p.spouse && p.age < 60) {
      const best = living().filter(q => q !== p && !q.spouse && q.kind === 'human' && attracted(p, q) > 0.3).map(q => ({ q, v: R(p, q).like * 3 + attracted(p, q) + seen(p, q).worth * 0.04 * p.traits.greed }))
        .sort((a, b) => b.v - a.v)[0];
      if (best && best.v > 0.8) add('court', best.v, { target: best.q });
    }
    // crime: priced by loot, desperation, greed, caution and risk
    const desp = desperation(p), honest = p.traits.honesty, moral = 4 + 22 * Math.pow(honest, 1.3) / desp;
    const marks = living().filter(q => q !== p && conscious(q) && seen(p, q).worth > 15 && dist2(p, q) < 40);
    for (const q of marks.slice(0, 6)) {
      const r = riskAt(p, q, 'theft'), skill = (p.skills.sleight + 10) / 20, retaliation = backers(q).length * 0.4;
      const purse = Math.min(seen(p, q).worth * 0.2, 25);
      const ev = Math.min(purse, 6) * 0.5 * skill * p.traits.greed * desp - r.caught * r.cost * p.traits.caution - retaliation - moral;
      if (ev > 0 && !(p.cd?.pick > sim.t)) add('pickpocket', ev, { target: q });
      const mug = Math.min(purse, 15) * 0.8 * p.traits.greed * desp * (might(p) / (might(p) + might(q))) - r.caught * r.cost * 1.5 * p.traits.caution - retaliation * 2 - moral * 1.4 + p.traits.aggression * 2;
      if (mug > 0) add('mug', mug, { target: q });
    }
    if (night() || h < 7) for (const hs of HOUSES) {
      if (hs.stash < 40 || hs === HOUSES[p.home]) continue;
      const home = living().filter(q => q.home === HOUSES.indexOf(hs) && areaOf(q) === hs.id);
      const r = riskAt(p, hs.bed, 'burglary');
      const ev = Math.min(hs.stash / 10, 20) * 0.5 * p.traits.greed * desp - (home.length ? 6 : 0) - r.caught * r.cost * p.traits.caution - moral * 1.2 + (p.items.picks ? 1 : 0);
      if (ev > 0 && !(p.cd?.burgle > sim.t)) add('burgle', ev, { house: HOUSES.indexOf(hs) });
    }
    // gangs: extortion of businesses, joining, founding, splitting
    if (p.gang) {
      const gg = sim.gangs[p.gang];
      if (gg && gg.boss === p.id) for (const b of Object.values(sim.business)) {
        const ownr = sim.people[b.owner]; if (!ownr || !ownr.alive || ownr.gang === p.gang || b.insurance === p.gang) continue;
        const ev = 4 * p.traits.greed + gangMembers(p.gang).length - backers(ownr).length * 0.6 - guardsNear(ownr).length * 2 - moral * 0.6;
        if (ev > 0 && !(p.cd?.extort > sim.t)) add('extort', ev, { business: b.id });
      }
      if (gg && gg.boss === p.id && gangMembers(p.gang).length < 7) add('recruit', 2 + p.traits.ambition * 2);
    } else {
      const big = Object.values(sim.gangs).filter(g => gangMembers(g.id).length).sort((a, b) => gangPower(b.id) - gangPower(a.id))[0];
      if (big && sim.people[big.boss] && R(p, big.boss).like > 0.1 && p.traits.honesty < 0.55) add('join', (1 - p.traits.honesty) * 3 * p.traits.greed + desp - wageOf(p) * 0.4 - moral * 0.5, { gang: big.id });
      const pals = living().filter(q => q !== p && !q.gang && R(p, q).trust > 0.5 && R(q, p).like > 0.3 && q.traits.honesty < 0.6).length;
      if (pals >= 2 && p.traits.ambition > 0.55 && p.traits.honesty < 0.5 && !p.gang && !(p.cd?.found > sim.t)) { cool(p, 'found', 1440); add('found', p.traits.ambition * 3 + pals * 0.7 + desp - moral * 0.6 - (big ? gangMembers(big.id).length * 0.5 : 0) - wageOf(p) * 0.3); }
    }
    // beasts loose in town
    for (const an of Object.values(sim.animals)) if (an.alive && an.monster && sees(p, an)) {
      const nerve = (isGuard(p) ? 1.5 : 0) + p.traits.aggression - p.traits.caution + (p.weapon !== 'fists' ? 0.5 : -0.8) + (ARMOR[p.armor] || ARMOR.none).dr * 0.2 + (sim.bounty.beasts ?? 80) * 0.005 * p.traits.greed;
      if (nerve > 0.4) add('beast', 6 + nerve * 4, { target: an }); else add('flee', 8 + (1 - nerve) * 3, { from: an });
    }
    if (p.kind === 'human' && !p.town && !(p.jailedUntil > 0)) {
      if (p.home == null) {
        const empty = HOUSES.findIndex(hs => !hs.owner);
        if (empty >= 0 && p.coin >= HOUSE_PRICE) add('lease', 7 + p.traits.caution * 3 + (h >= 16 ? 3 : 0), { house: empty, buy: true });
        else { const r = HOUSES.map((hs, i) => i).filter(i => HOUSES[i].owner && HOUSES[i].owner !== p.id && sim.people[HOUSES[i].owner]?.alive && residents(i).length < HOUSE_BEDS && (HOUSES[i].ask || 20) <= p.coin).sort((a, b) => (HOUSES[a].ask || 20) - (HOUSES[b].ask || 20))[0]; if (r != null) add('lease', 5 + p.traits.caution * 3 + (h >= 17 ? 4 : 0) - (HOUSES[r].ask || 20) / 10 * (0.5 + p.traits.greed * 0.5), { house: r, buy: false }); }
        if ((h >= 20 || h < 6) && !OUTSIDE.has(areaOf(p))) add('goto', 9 + p.traits.caution * 4, { at: randIn('fields', 4), place: 'The fields' });
      } else if (housesOf(p).length && p.coin >= HOUSE_PRICE + 60 && p.traits.greed > 0.55) { const empty = HOUSES.findIndex(hs => !hs.owner); if (empty >= 0) add('lease', 2 + p.traits.greed * 4 + p.traits.ambition * 2, { house: empty, buy: true }); }
    }
    // improvised weapons and building (Rose): the unarmed outside by day can whittle a club; wood for barricades and the palisade
    if (p.kind === 'human' && !p.town && !(p.jailedUntil > 0) && h >= 6 && h < 19 && !(j && j.from != null && inShift(p.job, h))) {
      const wild = ['wood', 'orchard', 'fields'].includes(areaOf(p)) ? 1 : 0, fear = (sim.beastsSeen ? 2 : 1) + p.traits.caution * 2;
      if (OUTSIDE.has(areaOf(p))) {
        if (WEAPONS[p.weapon]?.weak && !(p.items.club > 0)) add('forage', 1.5 + fear + wild, { craft: 'club' });
        else if (p.weapon === 'club' && !(p.items.spear > 0)) add('forage', 0.5 + fear * 0.5 + wild, { craft: 'spear' });
        if ((WEAPONS[p.weapon]?.ammo === 'bullets' && (p.items.bullets || 0) < 10 || WEAPONS[p.weapon]?.weak) && (p.items.stones || 0) < 4) add('forage', 1 + fear * 0.5 + wild, { craft: 'stones' });
      }
      const wantWood = (p.home != null && (HOUSES[p.home].barricade || 0) < 60) || sim.palisade.hp < sim.palisade.max * 0.6;
      if (wantWood && (p.items.wood || 0) < 3) add('forage', 0.8 + p.traits.caution * 2 + wild + (sim.beastsSeen ? 0.5 : 0) + (sim.t < 1440 ? 1 : 0), { craft: 'wood' });   // the town knows the beasts come at 22:00: build from day one
      if (!CORPS[p.job] && !JOBS[p.job]?.owner && !['mayor', 'captain', 'jailer'].includes(p.job) && (p.job === 'none' || wageCp(p) < 30) && h >= 7 && h < 18 && sim.treasury >= 200 && !openRecord(p).length) {   // the barracks take volunteers
        const job = casts(p) && corpsOpen('mageguard') ? 'mageguard' : corpsOpen('artillery') && (p.st?.dex || 10) >= 12 ? 'artillery' : corpsOpen('guard') ? 'guard' : corpsOpen('nightguard') ? 'nightguard' : corpsOpen('artillery') ? 'artillery' : null;
        if (job) add('doas', 0.5 + p.traits.loyalty * 2 + p.traits.aggression - p.traits.caution + (p.job === 'none' ? 1.5 : 0) + (job === 'mageguard' ? 1 : 0), { verb: 'enlist', extra: { text: job === 'mageguard' ? 'mage' : job === 'nightguard' ? 'night guard' : job }, at: randIn(CORPS[job].barracks, 2) });
      }
      if (p.coin < 60 && (p.home == null || p.job === 'none') && h >= 9) add('busk', 0.8 + (p.coin < SHELTER_FEE ? 1.5 : 0) + (p.home == null ? 0.7 : 0) - p.traits.caution * 0.5);
      if (p.coin > 150 && p.traits.greed < 0.5 && !(p.cd?.give > sim.t)) { const poor = living().filter(q => q !== p && q.kind === 'human' && !q.town && conscious(q) && q.coin < 15 && dist2(q, p) < 30 && R(p, q).like > -0.2).sort((x, y) => R(p, y).like - R(p, x).like)[0]; if (poor) add('doas', (1 - p.traits.greed) * 2 + R(p, poor).like * 2 + (poor.home == null ? 0.5 : 0) - 0.8, { verb: 'give', target: poor, extra: { amount: irnd(1, 10) } }); }
      if ((p.items.wood || 0) >= 3) {
        if (p.home != null && (HOUSES[p.home].barricade || 0) < 60) add('other', 2 + p.traits.caution * 3 + (h >= 15 ? 2 : 0), { craft: 'barricade', house: p.home });
        if (sim.palisade.hp < sim.palisade.max) add('other', 1 + p.traits.loyalty * 2 + (isGuard(p) ? 1 : 0), { craft: 'palisade' });
      }
    }
    // the Alarm spell, party formations and deputies (Rose): tools on offer, like any other option
    if (isGuard(p) && conscious(p) && !p.fight && !(p.cd?.deputize > sim.t) && Object.values(sim.rack).some(n => n > 0)) {
      const q = living().filter(x => x !== p && x.kind === 'human' && !x.town && x.brain !== 'human' && !isGuard(x) && !deputyNow(x) && conscious(x) && !x.fight && !(x.jailedUntil > 0) && x.age >= 16 && !openRecord(x).length && !(x.deputyNo?.[p.id] > sim.t - 240) && dist2(x, p) < 12 && avgDmg(x.weapon) < avgDmg('spear')).sort((a, b) => R(p, b).like - R(p, a).like)[0];
      if (q) add('doas', 1 + p.traits.loyalty * 1.5 + (h >= 17 || h < 5 ? 1.5 : 0) + (sim.beastsSeen ? 1 : 0), { verb: 'deputize', target: q, extra: { text: (q.st?.dex || 10) > (q.st?.str || 10) ? 'ranged' : 'melee' } });
    }
    if (arcaneLvl(p) && p.missiles > 0 && (h >= 19 || h < 2) && !p.fight && !sim.wards.some(w => w.by === p.id && w.until > sim.t + 30)) add('doas', 2 + p.traits.caution * 3 + (h >= 21 || h < 2 ? 2 : 0), { verb: 'alarm', at: bedFor(p) });   // weighed like the barricade; a ward is worth most at bedtime
    if (leadsParty(p) && !sim.formations[p.party] && followersOf(p).length >= 2) add('doas', 0.3 + p.traits.ambition * 0.5, { verb: 'formation', extra: { text: pick(FORMATION_NAMES) } });
    for (const c of helpChoices(p)) add('assail', 2 + c.stake * 4 * (0.5 + p.traits.loyalty) - p.traits.caution * 4 + (p.weapon !== 'fists' ? 1 : -1) + (isGuard(p) ? 2 : 0), { target: c.foe, help: c.x });
    if (p.coin >= 50 && shopOpen('smithy') && !(p.cd?.arm > sim.t)) {
      const b = sim.business.smithy, budget = p.coin - 30, best = Object.keys(b.stock).filter(k => (b.stock[k] || 0) > 0 && priceOf('smithy', k) <= budget && ((WEAPONS[k] && WEAPONS[k].price && WEAPONS[k].dmg[0] * WEAPONS[k].dmg[1] > WEAPONS[p.weapon].dmg[0] * WEAPONS[p.weapon].dmg[1]) || (ARMOR[k] && ARMOR[k].ac > (ARMOR[p.armor] || ARMOR.none).ac) || (SHIELDS[k] && !SHIELDS[p.shield || 'none']?.ac))).sort((x, y) => priceOf('smithy', y) - priceOf('smithy', x))[0];
      if (best) add('buy', 2 + p.traits.caution * 3 + (isGuard(p) ? 3 : 0) + Math.min(4, sim.beastsSeen), { shop: 'smithy', item: best });
    }
    // a coup: go for your own boss (by fists or by knife)
    if (p.gang && sim.gangs[p.gang] && sim.gangs[p.gang].boss !== p.id && !(p.cd?.coup > sim.t)) {
      const g = sim.gangs[p.gang], boss = sim.people[g.boss];
      if (boss && boss.alive && conscious(boss) && boss.jailedUntil <= 0) {
        const backing = gangMembers(g.id).filter(q => q !== p && q !== boss && R(q, p).like - R(q, boss).like * q.traits.loyalty > 0.2).length;
        const v = p.traits.ambition * 4 - p.traits.loyalty * 4 + backing * 1.2 + (might(p) - might(boss)) * 0.4 - R(p, boss).like * 3 + p.traits.aggression * 2 - 4.5;
        if (v > 0) add('coup', v, { target: boss });
      }
    }
    // politics: run for mayor before the election
    if (!sim.election.candidates.includes(p.id) && p.id !== sim.mayorId && (nextElectionDay() - sim.day <= 1 || !sim.mayorId) && p.coin >= 50 && !(p.cd?.stand > sim.t) && p.kind === 'human' && !p.town) {
      const field = sim.election.candidates.length;
      add('stand', p.traits.ambition * 3 + p.traits.greed * 1.5 + popularity(p) * 0.2 + (field === 0 ? 2 : 0) - field * 0.4 + (p.job === 'none' ? 1 : 0) - 2.5);
    }
    if (sim.election.candidates.includes(p.id) && p.coin > 60) add('campaign', 2 + p.traits.ambition * 2);
    // revenge
    for (const [who, amt] of Object.entries(p.grudge || {})) {
      const t = sim.people[who]; if (!t || !t.alive || !conscious(t) || amt < 4) continue;
      const ev = amt * p.traits.aggression * 0.6 - (power(t) / Math.max(1, power(p))) * 3 - p.traits.caution * 3;
      if (ev > 0) add('avenge', ev, { target: t });
    }
    // caravans: buy where it's cheap, sell where it's dear (Marrowford's grain for Hollow's ale and tools)
    if (h >= 5 && h < 13 && !p.party && p.town !== 'marrow' && p.coin >= 80) {
      const localGrain = priceOf('farm', 'grain'), margin = Math.max(localGrain - MARROW.sells.grain, priceOf('store', 'meat') - MARROW.sells.meat);
      const own = JOBS[p.job]?.owner, exportable = own === 'tavern' ? (sim.business.tavern.stock.ale || 0) * 1.5 : own === 'smithy' ? 12 : 0;
      const qty = Math.min(20, Math.floor(p.coin / 4));
      const v = margin / 10 * qty * 0.5 + exportable * 0.5 - 6 - roadDanger(p) * 3 * p.traits.caution - (inShift(p.job, h) ? wageOf(p) : 0);
      if (v > 0) add('caravan', v);
    }
    // the road is lonely: some wait there for travellers with full carts
    if ((h >= 7 && h < 18) && p.town !== 'marrow' && p.weapon !== 'fists' && !(p.cd?.ambush > sim.t)) {
      const seen = sim.events.filter(e => e.caravan && sim.t - e.t < 2 * 1440).length + 1;
      const v = seen * 4 * p.traits.greed * desp - moral * 1.3 - 4 + p.traits.aggression * 2 + (p.gang ? 2 : 0) - (inShift(p.job, h) ? wageOf(p) : 0);
      if (v > 0) add('ambush', v);
    }
    if (!p.items.torch && (h >= 16 || h < 6) && shopOpen('store') && p.coin >= 10 && p.traits.caution > 0.4) add('buy', 1 + p.traits.caution * 2, { shop: 'store', item: 'torch' });
    // status: fine clothes for those who can afford to be seen; boasting for those who'd rather lie
    if (!p.items.finery && p.coin >= 3500 && shopOpen('store') && p.traits.greed > 0.5) add('buy', 1 + p.traits.greed * 2 + (p.court ? 1 : 0), { shop: 'store', item: 'finery' });
    if (p.traits.honesty < 0.5 && !(p.cd?.boast > sim.t)) { const near = living().find(q => q !== p && q.kind === 'human' && dist2(q, p) < 4 && sameSpace(q, p)); if (near && seen(near, p).worth < trueWorth(p) * 2 + 30) add('boast', 1.5 + (1 - p.traits.honesty) * 2, { target: near }); }
    // robbing a shop: hold up the keeper (armed, by day) or break in (by night); the smithy's racks tempt most
    if (!(p.cd?.shoprob > sim.t) && p.traits.honesty < 0.45 && p.kind === 'human' && !p.town) for (const bid of ['store', 'smithy', 'bakery', 'tavern']) {
      const b = sim.business[bid], keeper = sim.people[b.owner], open = shopOpen(bid), loot = Object.entries(b.stock).reduce((v, [k, n]) => v + (GOODS[k]?.price || 0) * Math.min(n, 3), 0) * 0.04 + (open && keeper ? Math.min(keeper.coin / 10, 30) : 0);
      const r = riskAt(p, SPOTS[bid], 'theft');
      const v = loot * 0.25 * p.traits.greed * desp * (open ? (p.weapon !== 'fists' ? 1 : 0.3) : (night() ? 1 : 0)) - r.caught * r.cost * p.traits.caution - moral * 1.6 + p.traits.aggression * (open ? 2 : 0) - 3;
      if (v > 0) add('shoprob', v, { business: bid, holdup: open });
    }
    // rustling: a hungry, crooked person takes a beast from the ranch at night
    if ((h >= 22 || h < 4) && p.food < 0.4 && p.traits.honesty < 0.4 && !(p.cd?.rustle > sim.t)) add('rustle', 3 + (0.4 - p.food) * 10 - moral * 0.6);
    for (const [bid, b] of Object.entries(sim.business)) if (!b.owner && p.job === 'none' && p.town !== 'marrow' && p.kind === 'human') add('lease', 2 + p.traits.ambition * 2 + p.traits.greed * 1.5 - (p.coin < LEASE[bid] ? 1 : 0), { business: bid });
    // sign on as a sellsword (anyone: honest folk escort caravans, others will take other work)
    if ((p.job === 'none') && might(p) >= 4 && p.traits.caution < 0.7) add('signon', 2 + p.traits.aggression * 2 + (1 - p.traits.caution) * 2);
    // jobless people look for work
    if (p.job === 'none' && h >= 7 && h < 17) add('seekwork', 2 + p.traits.honesty * 2);
    // report what you saw
    if (p.toReport?.length) add('report', 1 + (1 - p.traits.caution) + p.traits.honesty * 2 - (sim.people[p.toReport[0].actor]?.gang ? 2 * p.traits.caution : 0));
    // the cleric answers the fallen; the undertaker collects and buries the dead
    { const pt = patients().filter(q => q !== p)[0];
      if (pt) {
        const healer = p.job === 'cleric' || p.job === 'doctor', caster = (p.cures || 0) + (p.layPool || 0) > 0, draught = (p.items.cure || 0) > 0, far = dist2(pt, p);
        const close = pt.spouse === p.id || household(p).includes(pt) || R(p, pt).like > 0.3 || isGuard(p) || p.militia;
        const w = (healer && (inShift(p.job, h) || pt.dying) ? (pt.dying ? 12 : 5) : 0) || (caster && pt.dying && far < 900 ? 9 : 0) || (draught && pt.dying && close && far < 400 ? 6 + p.traits.loyalty * 3 : 0) || (pt.dying && close && p.skills.heal >= 2 && far < 200 ? 4 : 0);
        const beasts = Object.values(sim.animals).some(a => a.monster && a.alive && dist2(a, pt) < 12);
        if (w) add('rescue', w - (beasts ? p.traits.caution * 6 : 0), { target: pt });
      } }
    if (p.job === 'undertaker' && inShift(p.job, h) && sim.bodies.some(b => !b.buried && !b.collected)) add('collect', 7);
    if (p.job === 'undertaker' && inShift(p.job, h) && sim.bodies.some(b => b.collected && !b.buried && sim.t >= b.layUntil)) add('bury', 6);
    // school: anyone free can sit a lesson while the teacher is in
    if (h >= 9 && h < 15 && classInSession() && p.job !== 'teacher' && (p.job === 'none' || !inShift(p.job, h))) add('study', 1 + p.traits.ambition * 2 + (st => 0)(0));
    if (['grain', 'meat', 'fish', 'eggs', 'apple', 'bearpelt', 'wolfpelt'].reduce((n, k) => n + (p.items[k] || 0), 0) > (p.job === 'hunter' ? 1 : 3) && p.food > 0.4 && p.town !== 'marrow' && !(p.cd?.fence > sim.t) && (sim.people[sim.business.store.owner]?.coin || 0) > 100) add('fence', 3 + p.traits.greed * 2);
    // the hurt go to the doctor (free, paid by taxes)
    if (p.hp < p.maxhp * 0.6 && doctorIn()) add('treat', 5 + (1 - p.hp / p.maxhp) * 6);
    if (p.sick?.sym && !DISEASES[p.sick.key].cleric && doctorIn() && p.coin >= sim.careFee.healer) add('treat', 7);
    if (!isGuard(p) && conscious(p) && !(p.jailedUntil > 0) && !(p.cd?.hunt > sim.t) && (p.job === 'mercenary' || p.traits.greed > 0.6 && p.traits.aggression > 0.5)) for (const [id, amt] of Object.entries(sim.bounty)) { const q = sim.people[id]; if (id !== 'beasts' && q && q !== p && q.alive && conscious(q) && !(q.jailedUntil > 0) && dist2(q, p) < 40 && might(p) > might(q) * 0.8) { add('assail', amt * 0.06, { target: q, bounty: true }); break; } }
    if ((p.id === sim.mayorId || p.id === sim.captainId || Object.values(sim.gangs).some(g => g.boss === p.id)) && !p.party && p.coin >= 60 && (night() || Object.values(sim.animals).some(a => a.monster && a.alive))) { const m = living().find(x => x !== p && x.job === 'mercenary' && free(x) && !x.party && dist2(x, p) < 40); if (m) add('doas', 4, { verb: 'hire', target: m, at: P(m.x, m.z), extra: { pay: p.coin } }); }
    if (p.sick?.sym && careTaker('chapel') && p.coin >= sim.careFee.chapel) add('treat', DISEASES[p.sick.key].cleric ? 9 : 6, { where: 'chapel' });
    // guards: pursue the wanted (bounties make it pay)
    if (isGuard(p) && inShift(p.job, h)) {
      const wanted = living().filter(q => q !== p && q.jailedUntil <= 0 && (openRecord(q).length && hasEvidence(q) || sim.bounty[q.id]) && dist2(p, q) < 60);
      for (const q of wanted) { const ev = 4 + (sim.bounty[q.id] || 0) / 10 + openRecord(q).length - (power(q) / Math.max(1, power(p))) * 3 * p.traits.caution - (q.gang && p.gang === q.gang ? 20 : 0); if (ev > 0) add('arrest', ev, { target: q }); }
    }
    // mourning: visit someone you loved in the graveyard
    const lost = sim.graves.find(gr => (R(p, gr.id).like > 0.5) && sim.day - gr.day < 3);
    if (lost) add('mourn', 1.5, { grave: lost });
    const laid = sim.bodies.find(b => b.collected && !b.buried && R(p, b.id).like > 0.4);
    if (laid) add('mourn', 2.5, { grave: { at: SPOTS.chapel } });
    // AI brains steer with a daily policy: weights per kind of action
    if (!inUnderworld(p)) {
      const tempted = out.filter(o => CRIME_KINDS.has(o.kind)).reduce((m, o) => Math.max(m, o.value), 0);
      for (let i = out.length - 1; i >= 0; i--) if (CRIME_KINDS.has(out[i].kind)) out.splice(i, 1);
      if (tempted > 0 && p.kind === 'human' && !p.town && !(p.cd?.takeup > sim.t)) out.push({ kind: 'takeup', value: tempted * 0.6, role: 'thief' });
    }
    if (p.policy) for (const o of out) o.value *= p.policy[o.kind] ?? p.policy[groupOf(o.kind)] ?? 1;
    return out;
  }
  const groupOf = k => ({ pickpocket: 'crime', mug: 'crime', burgle: 'crime', extort: 'crime', shoprob: 'crime', ambush: 'crime', rustle: 'crime', assail: 'violence', avenge: 'violence', court: 'romance', stand: 'politics', campaign: 'politics', join: 'gang', found: 'gang', recruit: 'gang' })[k] || k;
  // a sellsword's price follows their reputation: fights won, and above all, kills
  const reputation = p => (p.stats.wins || 0) + (p.stats.kills || 0) * 4 + (p.stats.beasts || 0) * 2 + p.level * 2;
  const mercRate = p => Math.min(250, 20 + Math.floor(reputation(p) / 3) * 10);   // cp a day
  sim.reputation = reputation; sim.mercRate = mercRate;
  // the road's danger, as people have heard it: ambushes remembered in the last few days
  const roadDanger = p => p.memory.filter(m => m.ambush && sim.day - m.day <= 4).length + sim.events.filter(e => e.road && sim.t - e.t < 3 * 1440 && (p.knows?.has(e.id))).length;
  // ======================================================== standing ==
  // Nobody is assigned a caste. Everyone keeps a private guess of what everyone else is worth,
  // from what they see (spending, fine clothes, a business, begging), what they're told (gossip,
  // boasts) and what they catch out. "Standing" is just what the town believes on average,
  // and it can be wrong: bluffed up, or ruined by a rumour.
  function trueWorth(p) { const j = JOBS[p.job]; return (p.coin + (p.home != null ? HOUSES[p.home].stash / Math.max(1, household(p).length) : 0)) / 10 + (j?.owner ? 60 : 0) + (sim.wages[p.job] ?? j?.wage ?? 0) * 0.8 + (p.id === sim.mayorId ? 40 : 0); }   // in silver
  const seen = (a, b) => { const r = R(a, b); if (r.worth == null) { r.worth = 30; r.wconf = 0; } return r; };
  function glimpse(a, b, value, weight) {      // a sees or hears something about b's wealth
    const r = seen(a, b); const w = Math.min(0.6, weight); r.worth += (value - r.worth) * w; r.wconf = Math.min(1, r.wconf + w * 0.5);
  }
  function showWealth(p, value, weight = 0.15, upOnly = true) {   // everyone near sees it
    for (const w of living()) if (w !== p && w.kind === 'human' && dist2(w, p) < 10 && sameSpace(w, p) && conscious(w)) { const r = seen(w, p); if (!upOnly || value > r.worth) glimpse(w, p, value, weight); }
  }
  function standing(p) {
    let s = 0, n = 0; for (const q of living()) if (q !== p && q.kind === 'human' && !q.town && q.rel[p.id]?.worth != null) { const c = 0.2 + q.rel[p.id].wconf; s += q.rel[p.id].worth * c; n += c; }
    return n ? s / n : 30;
  }
  function rankOf(p) {       // where the town puts you, by belief
    const all = living().filter(q => q.kind === 'human' && !q.town).map(standing).sort((a, b) => a - b), mine = standing(p);
    const pos = all.filter(v => v < mine).length / Math.max(1, all.length - 1);
    return pos >= 0.85 ? 'gentry' : pos >= 0.5 ? 'freeholder' : pos >= 0.2 ? 'commoner' : 'lowborn';
  }
  sim.trueWorth = trueWorth; sim.standing = standing; sim.rankOf = rankOf; sim.showWealth = showWealth;
  // a shopkeeper's price for you: the well-regarded get a little off, the low and unknown pay a little more
  const priceFor = (owner, p) => owner && owner !== p && owner.kind === 'human' ? 1 + Math.max(-0.15, Math.min(0.1, (30 - seen(owner, p).worth) / 300)) : 1;
  sim.priceFor = priceFor;
  // boasting: claim to be worth more than you are (Bluff vs Sense Motive)
  function boast(p, q, claimWorth) {
    const r = seen(q, p), check = d(20) + p.skills.bluff + (p.items.finery ? 2 : 0), sense = d(20) + q.skills.sense + Math.round(r.wconf * 6);
    if (check >= sense) { glimpse(q, p, Math.max(r.worth, claimWorth), 0.4); (q.heardBoast ||= {})[p.id] = claimWorth; return true; }
    bump(q, p, 'trust', -0.1); glimpse(q, p, r.worth * 0.8, 0.2); remember(q, { text: `${p.name} put on airs and I saw through it` }); return false;
  }
  sim.boast = boast;
  function popularity(p) { return living().filter(q => q !== p).reduce((s, q) => s + R(q, p).like, 0); }
  sim.popularity = popularity;

  // ============================================================ the lore ==
  // The town's learned mind. No AI model: it counts. Every choice anyone makes is scored
  // by how it turned out (coin, food, health, freedom), and every choice an AI-played
  // person makes is kept as an example. Plain brains lean on both, more as they pile up.
  // It's keyed by situation and by kind of person (not by name), so it carries over to new
  // towns: save it, load it, and the next town's plain folk start out a little wiser.
  sim.lore = { v: 1, acts: {}, taught: 0, scored: 0, chain: {}, runs: 0 };
  sim.learning = 1;     // 0 = plain script only; 1 = lean on the lore
  // ---- the recorder (Rose: more data, to train an NPC brain) ----------------------
  // Every AI choice, AI policy, plain choice and its outcome, talk and babble goes into dataset.jsonl (via the daily chronicle),
  // with the person's perception vector (x), the words they had just heard, their role and traits.
  const r2 = v => Math.round(v * 100) / 100;
  const xOf = p => Array.from(features(p), r2);
  const recording = () => !!(sim.onChronicle || sim.keepData);
  function dataRow(r) { if (!recording()) return; const rows = (sim.dataRows ||= []); if (rows.length < 8000) rows.push(r); }
  sim.dataRow = dataRow;
  const traitsOf = p => Object.fromEntries(Object.entries(p.traits || {}).map(([k, v]) => [k, r2(v)]));
  const wordsNow = p => (p.heard || []).filter(r => sim.t - r.t < 30).map(r => r.w);
  const band = (x, cuts, names) => names[cuts.findIndex(c => x < c) === -1 ? names.length - 1 : cuts.findIndex(c => x < c)];
  function roleOf(p) { const j = JOBS[p.job]; return j?.guard ? 'guard' : p.id === sim.mayorId ? 'mayor' : j?.owner ? 'owner' : j?.payer === 'town' ? 'public' : p.job === 'none' ? 'idle' : p.job === 'mercenary' ? 'merc' : 'worker'; }
  function situation(p) {
    const h = H();
    return [band(h, [5, 9, 13, 18, 22], ['night', 'morning', 'midday', 'afternoon', 'evening', 'night']), band(p.food, [0.25, 0.6], ['starving', 'hungry', 'fed']),
      band(p.coin / 10, [3, 15, 50], ['broke', 'poor', 'comfy', 'rich']), roleOf(p), p.traits.honesty < 0.45 ? 'crooked' : 'honest', openRecord(p).length ? 'wanted' : 'clean'].join('|') + beastTag(p);
  }
  sim.situation = situation;
  // what's loose in sight is part of the situation, so the town can learn which beasts are worth facing
  function beastTag(p) { let t = ''; for (const a of Object.values(sim.animals)) if (a.alive && a.monster && dist2(a, p) < 40 && sees(p, a)) { t = '|' + a.species + (WEAPONS[p.weapon]?.weak ? '-unarmed' : '-armed'); break; } return t; }
  const worth = p => (p.coin + (p.home != null ? HOUSES[p.home].stash : 0) * 0.5) / 10 + p.food * 6 + (p.water ?? 1) * 3 + Math.max(0, p.hp - p.nl) * 0.8 - (p.jailedUntil > 0 ? 12 : 0) - openRecord(p).length * 2;
  function lesson(key, kind, reward, taught) {
    const row = (sim.lore.acts[key] ||= {}), c = (row[kind] ||= { n: 0, r: 0, t: 0 });
    if (taught) { c.t++; sim.lore.taught++; }
    if (reward != null) { c.n++; c.r += (Math.max(-15, Math.min(15, reward)) - c.r) / Math.min(c.n, 50); sim.lore.scored++; }
  }
  function settle(p) {     // score the last choice by how things went since
    const lc = p.lastChoice; if (!lc) return;
    lesson(lc.key, lc.kind, worth(p) - lc.worth, false); p.lastChoice = null;
    if (lc.x && sim.studentMode !== 'habit') { const r = Math.max(-1, Math.min(1, (worth(p) - lc.worth) / 10)); const n = netOf(); const b = (n.base[lc.kind] ??= 0); n.base[lc.kind] = b * 0.98 + r * 0.02; nudge(lc.x, lc.kind, r - b, 0.02); n.rewarded++; }
    dataRow({ type: 'choice', day: sim.day, sit: lc.key, choice: lc.kind, reward: +(worth(p) - lc.worth).toFixed(1), brain: p.brain, role: roleOf(p), x: (lc.x || lc.rx) ? Array.from(lc.x || lc.rx, r2) : undefined, opts: lc.opts });
  }
  function loreBias(key, kind) {
    const row = sim.lore.acts[key]; if (!row) return 0;
    const c = row[kind]; if (!c) return 0;
    const taughtAll = Object.values(row).reduce((a, x) => a + x.t, 0);
    const conf = c.n / (c.n + 25), imit = taughtAll ? (c.t / taughtAll) * Math.min(1, taughtAll / 10) : 0;
    return c.r * 0.35 * conf + imit * 3;
  }
  sim.loreBias = loreBias;
  // how an option reads to an AI, and how an AI's step finds its option again later
  function optLabel(o) {
    if (o.craft) return CRAFT[o.craft].label + (o.craft === 'barricade' && o.house != null ? ' ' + houseName(o.house) : '');
    const t = o.target && (o.target.name || sim.people[o.target]?.name);
    if (o.kind === 'goto') return 'go to ' + (o.place || 'a spot'); if (o.kind === 'tail') return 'follow ' + (o.target.id === 'player' ? 'Rose' : o.target.name); if (o.kind === 'assail') return o.help ? 'help ' + (o.help.id === 'player' ? 'Rose' : o.help.name) + ' against ' + (o.target.id === 'player' ? 'Rose' : o.target.name) : 'attack ' + o.target.name; if (o.kind === 'hold') return 'stay';
    if (o.kind === 'lease') return o.house != null ? (o.buy ? 'buy house ' : 'rent ') + houseName(o.house) : 'lease the ' + o.business; if (o.kind === 'shoprob') return (o.holdup ? 'hold up the ' : 'break into the ') + o.business; if (o.kind === 'extort') return 'extort the ' + o.business;
    return [o.kind, o.item ? o.item + (o.shop ? ' at the ' + o.shop : '') : '', o.species || '', t ? t : '', o.shop && !o.item ? o.shop : ''].filter(Boolean).join(' ');
  }
  sim.optLabel = optLabel;
  const findPerson = (p, words) => { const w = words.toLowerCase().replace(/^(to|the|with|at|for|after|on)\s+/, ''); if (/^(rose|you|her|the outsider|the stranger)\b/.test(w)) return sim.people.player; return living().filter(q => q !== p && w.includes(q.name.toLowerCase())).sort((a, b) => dist2(a, p) - dist2(b, p))[0] || null; };
  const findPlace = words => { const w = String(words || '').toLowerCase(); const num = w.match(/(?:house|no\.?|number|#)\s*(\d+)\b/) || w.match(/\b(\d+)\s*(?:wick|lane\b)/); if (num && HOUSES[+num[1] - 1]) return HOUSES[+num[1] - 1].id; let best = null, bl = 0; for (const [id, a] of Object.entries(AREAS)) for (const key of [id, a.name.toLowerCase().replace(/^the /, '')]) if (key.length > bl && w.includes(key)) { best = id; bl = key.length; } if (best) return best; if (/home|house|bed/.test(w)) return 'home'; if (/well/.test(w)) return 'well'; if (/pond|fish/.test(w)) return 'pond'; return null; };
  // a step the AI asks for that the plain brain didn't list: built here if it's physically possible
  function synthStep(p, kind, rest) {
    if (kind === 'move' && /^out\b/.test(rest || '')) return p.home != null ? { kind: 'doas', verb: 'moveout', value: 0 } : null;
    const who = rest ? findPerson(p, rest) : null;
    switch (kind) {
      case 'follow': case 'accompany': return who && who.alive ? { kind: 'tail', target: who, value: 0 } : null;
      case 'go': if (/straight/.test(rest)) return { kind: 'gostraight', value: 0 };
      // falls through: go to <place>
      case 'walk': case 'head': case 'move': { const pl = findPlace(rest || ''); if (pl === 'home' && p.home != null) return { kind: 'goto', at: HOUSES[p.home].bed, place: 'home' }; if (pl === 'well') return { kind: 'goto', at: SPOTS.well, place: 'the well' }; if (pl === 'pond') return { kind: 'goto', at: SPOTS.pond, place: 'the pond' }; if (pl) return { kind: 'goto', at: SPOTS[pl] || randIn(pl, 2), place: AREAS[pl].name }; return who ? { kind: 'goto', at: who, place: who.name } : null; }
      case 'stay': case 'listen': if (/\b(up|awake)\b/.test(rest || '')) return { kind: 'doas', verb: 'stayup', extra: { text: rest }, value: 0 }; return { kind: 'hold', with: who, value: 0 };
      case 'turn': case 'return': case 'hand': if (kind !== 'turn' && p.deputy && /badge|gear|kit|weapon|armou?r|crossbow|bow|sword|spear/.test(rest || '')) return { kind: 'doas', verb: 'standdown', value: 0 }; if (kind === 'turn' && /^out\b/.test(rest || '')) return who ? { kind: 'doas', verb: 'turnout', target: who, value: 0 } : null; if (p.found) return { kind: 'doas', verb: 'turnin', at: SPOTS.desk, value: 0 }; return null;
      case 'donate': if (who && !/pool|pot|toward|for the/.test(rest || '')) return { kind: 'doas', verb: 'give', target: who, extra: { amount: parseMoney(rest, 0), text: rest || '' }, value: 0 };   // falls through to a pool
      case 'pool': case 'chip': case 'contribute': return { kind: 'doas', verb: kind === 'pool' ? 'pool' : 'chipin', extra: { text: rest || '' }, value: 0 };
      case 'rescue': case 'save': case 'tend': case 'stabilize': case 'stabilise': return who && who !== p && (who.dying || who.down || who.hp <= 0) ? { kind: 'rescue', target: who, value: 0 } : null;
      case 'get': case 'cure': case 'heal': if (who && who !== p && (who.dying || who.down || who.hp <= 0)) return { kind: 'rescue', target: who, value: 0 }; if (!/cur|heal|treat|well/.test(kind + ' ' + (rest || ''))) return null; { const ch = /chapel|cleric|pray/.test(rest || '') || (p.sick && DISEASES[p.sick.key].cleric); return { kind: 'doas', verb: 'cure', at: ch ? randIn('chapel', 2) : pick(SPOTS.beds), value: 0 }; }
      case 'wait': case 'lurk': return who ? { kind: 'lurkfor', target: who, value: 0 } : { kind: 'hold', value: 0 };
      case 'talk': case 'visit': case 'approach': case 'meet': return who ? { kind: 'visit', target: who, value: 0 } : null;
      case 'court': case 'flirt': return who ? { kind: 'court', target: who, value: 0 } : null;
      case 'attack': case 'fight': case 'hit': case 'beat': { if (!who || !conscious(who)) return null; const f = who.fight && sim.fights.find(f => f.sides.has(who.id)); if (f && !f.sides.has(p.id)) { const ally = f.order.map(body).filter(q => q && q.kind === 'human' && q.alive && conscious(q) && f.sides.get(q.id) !== f.sides.get(who.id)).sort((a, b) => R(p, b).like - R(p, a).like)[0]; if (ally) return { kind: 'assail', target: who, help: ally, value: 0 }; } return { kind: 'assail', target: who, value: 0 }; }
      case 'help': case 'defend': case 'aid': case 'save': case 'back': { if (!who || !who.alive) return null; const f = who.fight && sim.fights.find(f => f.sides.has(who.id)); if (!f || f.sides.has(p.id)) return { kind: 'tail', target: who, value: 0 }; const foe = f.order.map(body).filter(q => q && q.alive && conscious(q) && f.sides.get(q.id) !== f.sides.get(who.id)).sort((a, b) => dist2(a, p) - dist2(b, p))[0]; return foe ? { kind: 'assail', target: foe, help: who, value: 0 } : null; }
      case 'pickpocket': case 'mug': return who ? { kind, target: who, value: 0 } : null;
      case 'rent': case 'lodge': { if (/^out\b/.test(rest || '')) { const n = parseMoney(rest, 0); return { kind: 'doas', verb: 'rentout', extra: { amount: n || 20 }, value: 0 }; } const pl = findPlace(rest || ''); let i = HOUSES.findIndex(h => h.id === pl); if (i < 0) i = HOUSES.map((h, k) => k).filter(k => HOUSES[k].owner && HOUSES[k].owner !== p.id && residents(k).length < HOUSE_BEDS).sort((a, b) => (HOUSES[a].ask || 20) - (HOUSES[b].ask || 20))[0] ?? -1; return i >= 0 ? { kind: 'lease', house: i, buy: false, value: 0 } : null; }
      case 'buy': { if (/\bhouse\b|\bhome\b|wick|#\s*\d|\bno\.?\s*\d/.test(rest || '')) { const pl = findPlace(rest); let i = HOUSES.findIndex(h => h.id === pl); if (i < 0) i = HOUSES.findIndex(h => !h.owner); return i >= 0 ? { kind: 'lease', house: i, buy: true, value: 0 } : null; } }
      // falls through to goods
      case 'purchase': { const item = Object.keys(GOODS).find(k => rest.includes(k) || rest.includes(GOODS[k].name.toLowerCase())); const shop = item && Object.keys(sim.business).find(b => (sim.business[b].stock[item] || 0) > 0 && shopOpen(b)); return shop && p.coin >= priceOf(shop, item) ? { kind: 'buy', shop, item, value: 0 } : null; }
      case 'hunt': { const sp = Object.keys(GAME).find(k => rest.includes(k)) || 'rabbit'; return { kind: 'hunt', species: sp, value: 0 }; }
      case 'fish': return { kind: 'fish', value: 0 };
      case 'shout': case 'yell': case 'cry': if (who && sim.bounty[who.id]) return { kind: 'doas', verb: 'tipoff', target: who, value: 0 }; return { kind: 'doas', verb: 'shout', value: 0 };
      case 'point': case 'rat': case 'tip': case 'betray': return who && sim.bounty[who.id] ? { kind: 'doas', verb: 'tipoff', target: who, value: 0 } : null;
      case 'shelter': return who ? { kind: 'doas', verb: 'takein', target: who, extra: { work: /\bwork|labou?r|wage/.test(rest || '') }, value: 0 } : null;
      case 'enlist': case 'take': case 'become': case 'join': case 'hunter': { if (['enlist', 'join', 'become'].includes(kind) && (kind === 'enlist' || /artill|archer|crossbow|mage guard|mage barracks|barracks|the guard|the watch|night guard/.test(rest || '')) && !/gang|crew|underworld/.test(rest || '')) { const job = corpsWord(rest || ''); return { kind: 'doas', verb: 'enlist', extra: { text: job }, at: randIn(CORPS[job].barracks, 2), value: 0 }; } if (kind === 'take' && /^in\b/.test(rest || '')) return who ? { kind: 'doas', verb: 'takein', target: who, extra: { work: /\bwork|labou?r|wage/.test(rest) }, value: 0 } : null; if (/hunt/.test(kind + ' ' + (rest || '')) && !/underworld/.test(rest || '')) return p.job === 'none' ? { kind: 'doas', verb: 'becomehunter', value: 0 } : null; if (/leather|tann/.test(rest || '')) return p.job === 'none' ? { kind: 'doas', verb: 'becomeleather', value: 0 } : null; }
      // falls through
      case 'takeup_': { if (/underworld|thief|burglar|mugger|robber|extort|bandit|rustler|fence|smuggl|crook|crim/.test(rest)) { const role = Object.keys(SEEDY_ROLES).find(r => rest.includes(r.slice(0, 5))) || 'thief'; return { kind: 'takeup', role, value: 0 }; } if (kind === 'join' && who?.gang) return { kind: 'join', gang: who.gang, value: 0 }; return null; }
      case 'size': case 'sizeup': case 'study': case 'watch': return who ? { kind: 'doas', verb: 'sizeup', target: who, value: 0, reach: 8 } : (kind === 'study' ? { kind: 'study', value: 0 } : null);
      case 'case': { const n = +(rest.match(/\d+/) || [0])[0]; const bid = Object.keys(sim.business).find(b => rest.includes(b)); const owner = who; const hi = n ? n - 1 : owner?.home; if (bid) return { kind: 'doas', verb: 'case', at: SPOTS[bid], extra: { business: bid }, value: 0 }; return hi != null && HOUSES[hi] ? { kind: 'doas', verb: 'case', at: HOUSES[hi].door, extra: { house: hi }, value: 0 } : null; }
      case 'hide': return { kind: 'doas', verb: 'hide', value: 0 };
      case 'steal': case 'shoplift': { const item = Object.keys(GOODS).find(k => rest.includes(k)); const bid = Object.keys(sim.business).filter(b => shopOpen(b) && (!item || sim.business[b].stock[item] > 0)).sort((a, b) => dist2(SPOTS[a] || p, p) - dist2(SPOTS[b] || p, p))[0]; return bid ? { kind: 'doas', verb: 'steal', at: SPOTS[bid], extra: { item }, value: 0 } : null; }
      case 'escape': case 'break': return p.jailedUntil > 0 ? { kind: 'escape', value: 0 } : null;
      case 'bribe': case 'intimidate': case 'persuade': case 'propose': case 'give': case 'invite': case 'carry': case 'feed': {
        const animal = kind === 'feed' ? Object.values(sim.animals).filter(a => a.alive && rest.includes(a.name.toLowerCase())).sort((a, b) => dist2(a, p) - dist2(b, p))[0] : null;
        const t = animal || who; if (!t) return null; const n = parseMoney(rest, 0);
        if (kind === 'give') return { kind: 'doas', verb: 'give', target: t, extra: { amount: n, text: rest || '' }, value: 0 };
        return { kind: 'doas', verb: kind, target: t, extra: { amount: n || 30, pay: n || 0, purpose: 'company' }, value: 0 };
      }
      case 'accuse': case 'call': { const near = living().filter(q => q !== p && q.kind === 'human' && conscious(q) && dist2(q, p) < 4).sort((a, b) => dist2(a, p) - dist2(b, p))[0]; const subj = who; if (!near || !subj || near === subj) return null; const crime = Object.keys(CRIMES).find(c => rest.includes(c.slice(0, 5))) || 'theft'; return { kind: 'doas', verb: 'lie', target: near, extra: kind === 'call' || /liar/.test(rest) ? { about: subj.id, liar: true } : { about: subj.id, crime, victim: near.id }, value: 0 }; }
      case 'dismiss': return p.party ? { kind: 'doas', verb: 'dismiss', value: 0 } : null;
      case 'deputize': case 'deputise': return who && who.kind === 'human' ? { kind: 'doas', verb: 'deputize', target: who, extra: { text: rest || '' }, value: 0 } : null;
      case 'formation': return p.party ? { kind: 'doas', verb: 'formation', extra: { text: rest || '' }, value: 0 } : null;
      case 'cast': case 'alarm': case 'ward': {
        if (kind === 'cast' && !/alarm|ward/.test(rest || '')) return null;
        const m = /\b(?:at|on|over|by|around)\s+(.+)$/.exec(rest || ''), pl = m ? findPlace(m[1]) : null;
        const at = !pl ? null : pl === 'home' ? (p.home != null ? HOUSES[p.home].bed : null) : HOUSES.find(hs => hs.id === pl) ? HOUSES.find(hs => hs.id === pl).bed : AREAS[pl] ? randIn(pl, 2) : null;
        return { kind: 'doas', verb: 'alarm', at, value: 0 };
      }
      case 'rally': case 'muster': case 'gather': case 'summon': case 'mobilize': case 'mobilise': if (kind === 'gather' && /stone|pebble|rock/.test(rest || '')) return { kind: 'craft', what: 'stones', value: 0 }; return { kind: 'doas', verb: 'rally', extra: { place: rest || '' }, value: 0 };
      case 'hire': { const n = parseMoney(rest, 0); const q = who || living().filter(x => x !== p && x.job === 'mercenary' && free(x) && !x.party).sort((a, b) => dist2(a, p) - dist2(b, p))[0]; return q ? { kind: 'doas', verb: 'hire', target: q, at: P(q.x, q.z), extra: { pay: n }, value: 0 } : null; }
      case 'quit': return p.job !== 'none' ? { kind: 'doas', verb: 'quit', value: 0 } : null;
      case 'loot': case 'rob': case 'strip': { const b = sim.bodies.filter(b => !b.buried && (b.coin > 0 || Object.values(b.items || {}).some(n => n > 0)) && dist2(b, p) < 40).sort((a, b2) => dist2(a, p) - dist2(b2, p))[0]; if (b) return { kind: 'doas', verb: 'loot', at: P(b.x, b.z), value: 0 }; const v = (who && !conscious(who) && who.alive ? who : null) || living().filter(q => q !== p && q.kind === 'human' && !conscious(q) && dist2(q, p) < 15).sort((a, b2) => dist2(a, p) - dist2(b2, p))[0]; return v ? { kind: 'doas', verb: 'loot', at: P(v.x, v.z), value: 0 } : null; }
      case 'dig': { const g = sim.graves.filter(g => !g.robbed).sort((a, b) => dist2(a.at, p) - dist2(b.at, p))[0]; return g ? { kind: 'doas', verb: 'dig', at: g.at, value: 0 } : null; }
      case 'lease': { const bid = Object.keys(sim.business).find(b => rest.includes(b) || rest.includes((AREAS[b]?.name || '').toLowerCase())); return bid && !sim.business[bid].owner ? { kind: 'lease', business: bid, value: 0 } : null; }
      case 'rob': { const bid = Object.keys(sim.business).find(b => rest.includes(b) || rest.includes((AREAS[b]?.name || '').toLowerCase())) || 'store'; return { kind: 'shoprob', business: bid, holdup: shopOpen(bid), value: 0 }; }
      case 'found': return !p.gang ? { kind: 'found', value: 0 } : null;
      case 'apply': return who && who.kind === 'human' ? { kind: 'apply', target: who, value: 0 } : { kind: 'seekwork', value: 0 };
      case 'seekwork': return { kind: 'seekwork', value: 0 };
      case 'sell': case 'fence': { const item = Object.keys(p.items).find(k => p.items[k] > 0 && (rest.includes(k) || rest.includes((GOODS[k]?.name || '').toLowerCase()))); const shop = item && Object.keys(sim.business).find(b => shopOpen(b) && (GOODS[item]?.shop === b || b === 'store')); return item && shop ? { kind: 'doas', verb: 'sell', at: SPOTS[shop], extra: { item }, value: 0 } : { kind: 'fence', value: 0 }; }
      case 'report': { if (who) { const crime = Object.keys(CRIMES).find(c => rest.includes(c.slice(0, 5))) || 'theft'; return { kind: 'doas', verb: 'report', at: SPOTS.desk, extra: { about: who.id, crime }, value: 0 }; } return (p.toReport || []).length ? { kind: 'report', value: 0 } : null; }
      case 'extort': { const bid = Object.keys(sim.business).find(b => rest.includes(b) || rest.includes((AREAS[b]?.name || '').toLowerCase())); return bid && sim.business[bid].owner && sim.business[bid].owner !== p.id ? { kind: 'extort', business: bid, value: 0 } : null; }
      case 'recruit': return who ? { kind: 'recruit', value: 0 } : { kind: 'recruit', value: 0 };
      case 'signon': return p.job === 'none' ? { kind: 'signon', value: 0 } : null;
      case 'caravan': return p.coin >= 40 ? { kind: 'caravan', value: 0 } : null;
      case 'ambush': return { kind: 'ambush', value: 0 };
      case 'burgle': { const hs = HOUSES.map((h, i) => i).filter(i => i !== p.home), hi = hs.sort((a, b) => HOUSES[b].stash - HOUSES[a].stash + rnd(-3, 3))[0]; return hi != null ? { kind: 'burgle', house: hi, value: 0 } : null; }
      case 'beg': return { kind: 'beg', value: 0 };
      case 'coup': { const g = p.gang && sim.gangs[p.gang], b = g && sim.people[g.boss]; return b && b !== p && b.alive && conscious(b) && b.jailedUntil <= 0 ? { kind: 'coup', target: b, value: 0 } : null; }
      case 'stand': case 'run': if (kind === 'stand' && /^down\b/.test(rest || '')) return p.deputy ? { kind: 'doas', verb: 'standdown', value: 0 } : null; return !sim.election.candidates.includes(p.id) && p.id !== sim.mayorId && p.coin >= 50 ? { kind: 'stand', value: 0 } : null;
      case 'campaign': case 'canvass': return sim.election.candidates.includes(p.id) || p.id === sim.mayorId ? (who ? { kind: 'visit', target: who, value: 0, canvass: true } : { kind: 'campaign', value: 0 }) : null;
      case 'calm': case 'soothe': { const b = Object.values(sim.animals).filter(a => a.alive && a.monster && !a.calmUntil).sort((x, y) => dist2(x, p) - dist2(y, p))[0]; return b ? { kind: 'doas', verb: 'calm', target: b, value: 0 } : null; }
      case 'familiar': return { kind: 'doas', verb: 'familiar', extra: { text: rest || '' }, value: 0 };
      case 'favored': case 'favoured': return { kind: 'doas', verb: 'favored', extra: { text: rest || '' }, value: 0 };
      case 'busk': case 'sing': case 'perform': case 'fiddle': return { kind: 'busk', value: 0 };
      case 'forage': return { kind: 'forage', value: 0 };
      case 'whittle': case 'carve': case 'make': case 'craft': { const w = /spear/.test(rest || '') ? 'spear' : /club|cudgel|staff|stick/.test(rest || '') ? 'club' : /fire/.test(rest || '') ? 'fire' : null; return w ? { kind: 'craft', what: w, value: 0 } : null; }
      case 'chop': case 'cut': case 'fell': return /wood|tree|log|timber/.test(rest || 'wood') ? { kind: 'craft', what: 'wood', value: 0 } : null;
      case 'barricade': case 'board': case 'fortify': { const pl = findPlace(rest || ''); let i = HOUSES.findIndex(h => h.id === pl); if (i < 0) i = p.home ?? -1; return i >= 0 ? { kind: 'craft', what: 'barricade', house: i, value: 0 } : null; }
      case 'build': case 'repair': case 'mend': return /palisade|wall|fence|stockade/.test(rest || '') ? { kind: 'craft', what: 'palisade', value: 0 } : /barricade/.test(rest || '') ? synthStep(p, 'barricade', (rest || '').replace(/^.*barricade\s*(on|at)?/, '')) : /fire/.test(rest || '') ? { kind: 'craft', what: 'fire', value: 0 } : null;
      case 'light': case 'kindle': return /fire|beacon|bonfire/.test(rest || '') ? { kind: 'craft', what: 'fire', place: findPlace(rest.replace(/watch-?fire|fire/g, '')), value: 0 } : null;
      case 'write': case 'post': case 'pin': return { kind: 'doas', verb: 'write', at: P(SPOTS.board.x + rnd(-1, 1), SPOTS.board.z + 1.2), extra: { text: boardText(p._stepRaw || rest) }, value: 0 };
      case 'tavern': case 'drink': return { kind: kind === 'drink' && (p.water ?? 1) < 0.6 ? 'drink' : 'tavern', value: 0 };
      case 'sleep': case 'rest': case 'nap': { const hh = parseFloat((rest || '').match(/\d+(\.\d+)?/)?.[0]); return { kind: 'sleep', hours: hh > 0 ? Math.min(12, hh) : null, value: 0 }; }
      case 'wake': case 'rouse': return { kind: 'doas', verb: 'wake', target: who && who.kind === 'human' ? who : null, value: 0 };
      case 'ring': case 'sound': return /alarm|bell|horn|^$/.test(rest || '') ? { kind: 'doas', verb: 'ring', at: SPOTS.bell, value: 0 } : null;
      case 'work': return JOBS[p.job]?.from != null ? { kind: 'work', value: 0 } : null;
      case 'eat': return Object.keys(p.items).some(k => GOODS[k]?.food && p.items[k] > 0) ? { kind: 'eat', value: 0 } : null;
    }
    return null;
  }
  function matchStep(step, opts, p) {
    const want = String(step.do || step).toLowerCase().trim(), kind = want.split(/[\s:]+/)[0], rest = want.slice(kind.length).trim();
    if (p) p._stepRaw = String(step.do || step);
    if (p && !inUnderworld(p) && ['pickpocket', 'mug', 'burgle', 'rob', 'steal', 'shoplift', 'hide', 'case', 'extort', 'ambush', 'rustle', 'wait', 'lurk'].includes(kind) && !(kind === 'wait' && !/^for\b/.test(rest))) { (p.failed ||= []).push(want + ' (that takes a place in the underworld)'); return { kind: 'hold', value: 0, refused: true }; }
    const same = opts.filter(o => o.kind === kind);
    if (!same.length) return p ? synthStep(p, kind, rest) : null;
    if (!rest) return same.sort((a, b) => b.value - a.value)[0];
    return same.find(o => optLabel(o).toLowerCase().includes(rest)) || same.find(o => rest.split(/\s+/).some(w => w.length > 2 && optLabel(o).toLowerCase().includes(w))) || null;
  }
  // ============================================================ the student ==
  // A small neural net (one hidden layer) that scores every kind of action from what a person
  // perceives. It learns three ways: by imitating the teachers (AI-played people's chosen steps),
  // from how its own choices turn out (reward), and by evolution between towns (each person
  // carries a slightly mutated copy; the copies that ended richer and alive move the next one).
  const KINDS = ['work', 'eat', 'drink', 'buy', 'forage', 'fish', 'hunt', 'sleep', 'tavern', 'socialize', 'visit', 'court', 'campaign', 'stand', 'recruit', 'join', 'found', 'pickpocket', 'mug', 'burgle', 'shoprob', 'extort', 'rustle', 'ambush', 'caravan', 'signon', 'lease', 'seekwork', 'apply', 'beg', 'fence', 'purse', 'report', 'bury', 'collect', 'rescue', 'study', 'treat', 'mourn', 'arrest', 'flee', 'beast', 'coup', 'boast', 'avenge', 'tail', 'goto', 'hold', 'assail', 'other'];
  const KI = Object.fromEntries(KINDS.map((k, i) => [k, i]));
  const kindIndex = k => KI[k] ?? KI.other;
  const AREA_GROUP = { square: 0, lane: 0, bakery: 1, store: 1, smithy: 1, tavern: 2, hall: 3, station: 3, healer: 4, chapel: 4, graves: 4, school: 5, fields: 6, ranch: 6, orchard: 6, wood: 7, road: 8, marrow: 8 };
  const WORD_BUCKETS = 16, NIN = 46 + WORD_BUCKETS, NH = 24, NOUT = KINDS.length;
  const NPARAM = NH * NIN + NH + NOUT * NH + NOUT;
  const hashWord = w => { let h = 7; for (const c of w) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % WORD_BUCKETS; };
  function features(p) {
    const h = H(), j = JOBS[p.job] || {}, x = new Float32Array(NIN); let i = 0;
    const put = v => { x[i++] = v; };
    put(1); put(p.food); put(p.water ?? 1); put(p.rest ?? 1); put(Math.max(0, p.hp) / p.maxhp); put(Math.min(1, (p.nl || 0) / p.maxhp));
    put(Math.log1p(p.coin / 10) / 5); put(Math.log1p(p.home != null ? HOUSES[p.home].stash / 10 : 0) / 6); put(Math.sin(h / 24 * 6.283)); put(Math.cos(h / 24 * 6.283)); put(night() ? 1 : 0);
    put(p.job === 'none' ? 1 : 0); put(j.guard ? 1 : 0); put(j.owner ? 1 : 0); put(j.payer === 'town' && !j.guard ? 1 : 0); put(j.payer && j.payer !== 'town' ? 1 : 0); put(p.job === 'mercenary' ? 1 : 0); put(p.id === sim.mayorId ? 1 : 0);
    put(p.gang ? 1 : 0); put(p.gang && sim.gangs[p.gang]?.boss === p.id ? 1 : 0); put(Math.min(1, openRecord(p).length / 3)); put(inShift(p.job, h) ? 1 : 0);
    put(WEAPONS[p.weapon]?.weak ? 0 : 1); put((ARMOR[p.armor] || ARMOR.none).dr / 5); put(WEAPONS[p.weapon]?.range ? 1 : 0);
    const g = AREA_GROUP[areaOf(p)] ?? (AREAS[areaOf(p)]?.house ? 9 : 0); for (let k = 0; k < 10; k++) put(k === g ? 1 : 0);
    let beast = 0, guard = 0, ppl = 0, down = 0;
    for (const q of living()) { if (q === p || dist2(q, p) > 20) continue; if (!sees(p, q)) continue; ppl++; if (isGuard(q)) guard = 1; if (!conscious(q)) down = 1; }
    for (const a of Object.values(sim.animals)) if (a.alive && a.monster && dist2(a, p) < 30 && sees(p, a)) beast = Math.max(beast, a.species === 'ogre' ? 1 : 0.5);
    put(beast); put(guard); put(Math.min(1, ppl / 8)); put(down);
    put(Object.keys(p.items).some(k => GOODS[k]?.food && p.items[k] > 0) ? 1 : 0); put(p.party ? 1 : 0); put(p.spouse ? 1 : 0);
    put(sim.election.candidates.includes(p.id) ? 1 : 0); put(Math.min(1, (nextElectionDay() - sim.day) / 7));
    { let fn = 0, al = 0; for (const f of sim.fights) { if (f.sides.has(p.id)) continue; const ms = f.order.map(body).filter(q => q && q.alive && conscious(q)); if (!ms.some(q => dist2(q, p) < 25)) continue; fn = 1; if (ms.some(q => q.kind === 'human' && (p.spouse === q.id || (p.gang && p.gang === q.gang) || (p.home != null && p.home === q.home) || R(p, q).like > 0.4))) al = 1; } put(fn); put(al); }   // a fight nearby; someone they care about in it
    while (i < 46) put(0);
    for (const r of (p.heard || [])) if (sim.t - r.t < 30) x[46 + hashWord(r.w)] = 1;
    return x;
  }
  sim.features = features; sim.KINDS = KINDS;
  function netOf() {
    const n = sim.lore.net;
    if (n && n.theta && n.theta.length === NPARAM && n.kinds?.join() === KINDS.join()) { if (!(n.theta instanceof Float32Array)) n.theta = Float32Array.from(n.theta); return n; }
    const theta = new Float32Array(NPARAM); for (let k = 0; k < NPARAM; k++) theta[k] = (Math.random() * 2 - 1) * 0.15;
    for (let k = NH * NIN + NH; k < NPARAM; k++) theta[k] *= 0.3;
    return sim.lore.net = { theta, kinds: KINDS.slice(), gen: 0, imitated: 0, rewarded: 0, agree: 0, asked: 0, history: [], base: {} };
  }
  sim.netOf = netOf;
  function forward(x, noise) {
    const th = netOf().theta, hid = new Float32Array(NH), out = new Float32Array(NOUT);
    const w = k => th[k] + (noise ? noise[k] : 0);
    for (let a = 0; a < NH; a++) { let z = w(NH * NIN + a); for (let b = 0; b < NIN; b++) if (x[b]) z += w(a * NIN + b) * x[b]; hid[a] = Math.tanh(z); }
    const o2 = NH * NIN + NH;
    for (let c = 0; c < NOUT; c++) { let z = w(o2 + NOUT * NH + c); for (let a = 0; a < NH; a++) z += w(o2 + c * NH + a) * hid[a]; out[c] = z; }
    return { hid, out };
  }
  // push the chosen kind up (or down, if adv < 0) among the feasible ones: one step of cross-entropy
  function nudge(x, kind, adv, lr, feasible) {
    const n = netOf(), th = n.theta, { hid, out } = forward(x);
    const idx = feasible && feasible.length ? [...new Set(feasible.map(kindIndex))] : KINDS.map((_, i) => i);
    const ci = kindIndex(kind); if (!idx.includes(ci)) idx.push(ci);
    let m = -1e9; for (const c of idx) m = Math.max(m, out[c]); let z = 0; const pr = {}; for (const c of idx) { pr[c] = Math.exp(out[c] - m); z += pr[c]; }
    const o2 = NH * NIN + NH, dh = new Float32Array(NH);
    for (const c of idx) {
      const g = ((c === ci ? 1 : 0) - pr[c] / z) * adv * lr;
      th[o2 + NOUT * NH + c] += g;
      for (let a = 0; a < NH; a++) { dh[a] += g * th[o2 + c * NH + a]; th[o2 + c * NH + a] += g * hid[a]; }
    }
    for (let a = 0; a < NH; a++) { const d = dh[a] * (1 - hid[a] * hid[a]); if (!d) continue; th[NH * NIN + a] += d; for (let b = 0; b < NIN; b++) if (x[b]) th[a * NIN + b] += d * x[b]; }
  }
  // a teacher's choice: imitate it, and note whether the student would have chosen the same
  function teach(p, kind, opts) {
    const x = features(p), n = netOf(), feas = opts ? opts.map(o => o.kind) : null;
    const { out } = forward(x); let best = null, bv = -1e9; for (const k of (feas || KINDS)) { const v = out[kindIndex(k)]; if (v > bv) { bv = v; best = k; } }
    n.asked++; if (best === kind) n.agree++;
    nudge(x, kind, 1, 0.08, feas); n.imitated++;
    if (sim.npcBrain) { const top = sim.npcBrain.decide({ x, words: wordsNow(p), opts: feas || undefined, traits: p.traits, role: roleOf(p) })[0]; const bs = (sim.brainStats ||= { asked: 0, agree: 0 }); bs.asked++; if (top?.kind === kind) bs.agree++; }
  }
  sim.teach = teach;
  sim.studentMode = 'blend';      // 'habit' (the old scripted scores), 'blend', 'student'
  sim.studentWeight = 0.5;
  // ---- words a person hears, and what they do next ----------------------------------
  function heardBy(q, words, direct = false) { q.heard = (q.heard || []).filter(r => sim.t - r.t < 30).concat(words.map(w => ({ w, t: sim.t, direct }))).slice(-12); }
  // a word is tied to an act only when it was said to them (or shouted) in the 5 minutes before it;
  // talk they merely overheard doesn't teach what to do
  const GROUND_MIN = 5;
  function groundWords(p, kind) {
    const ws = (p.heard || []).filter(r => r.direct && sim.t - r.t < GROUND_MIN); if (!ws.length) { p.heard = (p.heard || []).filter(r => !r.direct); return; }
    const W = (sim.lore.words ||= {});
    for (const { w } of ws) { const e = (W[w] ||= { n: 0, acts: {} }); e.n++; e.acts[kind] = (e.acts[kind] || 0) + 1; }
    p.heard = [];
  }
  sim.groundWords = groundWords;
  function trace(p, by, chosen, scored, key) {
    (p.trace ||= []).push({ day: sim.day, clock: sim.clock(), by, chose: optLabel(chosen), top: scored.slice(0, 3).map(s => [optLabel(s.o), +s.v.toFixed(1)]), words: (p.heard || []).filter(r => sim.t - r.t < 30).map(r => r.w).slice(-5), where: AREAS[areaOf(p)]?.name || '' });
    if (p.trace.length > 20) p.trace.shift();
  }
  function choose(p) {
    settle(p);
    const opts = options(p);
    if (!opts.length) return setTask(p, 'idle', { until: sim.t + 30 });
    // an AI's to-do list comes first: do the next step if it's possible now; give up on a step after two hours
    if (waitsForOrders(p) && !p.agenda?.length) { setTask(p, 'wait', { until: sim.t + 20 }); askOrders(p, null); return; }
    while (p.agenda?.length) {
      const step = p.agenda[0], o = matchStep(step, opts, p);
      if (o) {
        p.agenda.shift(); const key = situation(p), x0 = xOf(p), w0 = wordsNow(p);
        lesson(key, o.kind, null, true);   // a lesson for the plain brains: in this situation, the AI chose this
        teach(p, o.kind, opts); groundWords(p, o.kind); trace(p, 'teacher (AI)', o, [{ o, v: 0 }], key);
        dataRow({ type: 'pilot', day: sim.day, sit: key, choice: o.kind, label: optLabel(o), brain: p.brain, role: roleOf(p), x: x0, words: w0, traits: traitsOf(p), opts: [...new Set(opts.map(q => q.kind))] });
        if (p.town !== 'marrow') p.lastChoice = { key, kind: o.kind, worth: worth(p), t: sim.t, rx: recording() ? features(p) : null, opts: recording() ? [...new Set(opts.map(q => q.kind))] : undefined };
        p.lastStep = optLabel(o);
        startTask(p, o); if (p.task) { p.task.value = Math.max(o.value || 0, 8); p.task.fromAgenda = step.do; }
        return;
      }
      step.tries = (step.tries || 0) + 1; step.since ??= sim.t;
      if (sim.t - step.since > 120) { p.agenda.shift(); (p.failed ||= []).push(step.do); continue; }
      if (waitsForOrders(p)) { setTask(p, 'wait', { until: sim.t + 15 }); return; }
      break;
    }
    const key = situation(p), lean = p.brain === 'script' ? sim.learning : 0;
    const brainOn = p.brain === 'script' && sim.studentMode === 'brain' && !!sim.npcBrain;
    const bp = brainOn ? Object.fromEntries(sim.npcBrain.decide({ x: features(p), words: wordsNow(p), opts: [...new Set(opts.map(o => o.kind))], traits: p.traits, role: roleOf(p) }).map(o => [o.kind, o.p])) : null;
    const studentOn = p.brain === 'script' && sim.studentMode !== 'habit' && !brainOn, x = studentOn ? features(p) : null;
    const logits = studentOn ? forward(x, p.noise).out : null, w = sim.studentMode === 'student' ? 1 : sim.studentWeight;
    const scored = opts.map(o => { const habit = o.value + rnd(0, 1.5) + (lean ? loreBias(key, o.kind) * lean : 0); return { o, v: bp ? habit * 0.4 + (Math.log((bp[o.kind] ?? 0) + 0.01) * 3 + rnd(0, 0.5)) * 0.6 : studentOn ? habit * (1 - w) + (logits[kindIndex(o.kind)] * 4 + rnd(0, 0.5)) * w : habit }; }).sort((a, b) => b.v - a.v);
    const pickOpt = scored[0].o;
    trace(p, p.brain === 'script' ? (brainOn ? 'NPC brain' : studentOn ? (sim.studentMode === 'student' ? 'student' : 'blend') : 'habit') : 'habit (between AI steps)', pickOpt, scored, key);
    groundWords(p, pickOpt.kind);
    p.lastX = x;
    // an AI-played person's choices (steered by their own plan for the day) are examples for the rest
    if (p.brain !== 'script' && p.brain !== 'human' && p.policy) lesson(key, pickOpt.kind, null, true);
    if (p.town !== 'marrow') p.lastChoice = { key, kind: pickOpt.kind, worth: worth(p), t: sim.t, x: p.lastX, rx: !p.lastX && recording() ? features(p) : null, opts: recording() ? [...new Set(opts.map(q => q.kind))] : undefined };
    startTask(p, pickOpt);
    if (p.task) p.task.value = pickOpt.value;
  }
  // ---- adapting -------------------------------------------------------------------
  // Every five minutes (or at once, when something happens around them) a person looks up
  // from what they're doing and weighs it against what they could be doing now. A clearly
  // better option wins; finishing what you started is worth a little, so nobody flip-flops.
  const STEADY = new Set(['tail', 'jail', 'flee', 'talk', 'haul', 'arrest', 'rescue', 'bury', 'collect', 'caravan', 'drink', 'purse']);
  function reconsider(p) {
    const tk = p.task; if (!tk || STEADY.has(tk.kind)) { p.alert = false; return; }
    if (tk.kind === 'sleep' && !p.alert && p.rest < 0.9) return;
    const opts = options(p); if (!opts.length) { p.alert = false; return; }
    const key = situation(p), lean = p.brain === 'script' ? sim.learning : 0;
    const scored = opts.map(o => ({ o, v: o.value + (lean ? loreBias(key, o.kind) * lean : 0) })).sort((a, b) => b.v - a.v);
    const same = x => tk.kind === 'craft' ? x.o.craft === tk.what : x.o.kind === tk.kind && (!tk.target || x.o.target?.id === tk.target);   // a craft is its own option (kind 'other' or 'forage' with craft)
    const best = scored[0], cur = scored.find(same);
    const now = (cur ? cur.v : tk.value ?? 4) + (p.alert ? 1 : 3) + (tk.fromAgenda ? 4 : 0) + (tk.kind === 'craft' ? 3 + tk.done / 30 : 0);   // half-built work is worth finishing
    p.alert = false;
    if (same(best) || (best.o.kind === tk.kind && tk.kind !== 'craft') || best.v <= now * 1.25 + 1.5) return;
    if (tk.fromAgenda) (p.agenda ||= []).unshift({ do: tk.fromAgenda });     // back to the list afterwards
    p.task = null; settle(p);
    if (p.town !== 'marrow') p.lastChoice = { key, kind: best.o.kind, worth: worth(p), t: sim.t, rx: recording() ? features(p) : null, opts: recording() ? [...new Set(opts.map(q => q.kind))] : undefined };
    if (p.brain !== 'script' && p.brain !== 'human' && p.policy) lesson(key, best.o.kind, null, true);
    startTask(p, best.o); if (p.task) p.task.value = best.o.value;
    p.switched = (p.switched || 0) + 1;
  }
  sim.reconsider = reconsider;
  // ======================================================= animal minds ==
  // Every species has its own small net: what it senses -> what it does. Nobody tells a dog to
  // follow its owner or a hen to run: they learn from what happens (food, being hurt, a bond, dying)
  // and evolve between towns. No LLM: animals don't talk, though pets hear words.
  const A_ACTS = ['wander', 'graze', 'follow', 'approach', 'flee', 'attack', 'stay', 'home', 'beg'];
  const A_IN = 26, A_H = 12, A_OUT = A_ACTS.length, A_NP = A_H * A_IN + A_H + A_OUT * A_H + A_OUT;
  const homeOf = an => an.livestock ? 'ranch' : an.game || an.monster || !an.owner && an.species === 'fox' ? 'wood' : an.species === 'goat' ? 'fields' : (sim.people[an.owner] && areaOf(sim.people[an.owner])) || areaOf(an) || 'square';
  function aNet(sp) {
    const A = (sim.lore.animals ||= {});
    const n = A[sp]; if (n && n.theta?.length === A_NP) { if (!(n.theta instanceof Float32Array)) n.theta = Float32Array.from(n.theta); return n; }
    const theta = new Float32Array(A_NP); for (let k = 0; k < A_NP; k++) theta[k] = (Math.random() * 2 - 1) * 0.2;
    return A[sp] = { theta, gen: 0, base: 0, history: [] };
  }
  sim.aNet = aNet; sim.A_ACTS = A_ACTS;
  function aFeatures(an) {
    const x = new Float32Array(A_IN), h = H(), own = sim.people[an.owner]; let i = 0; const put = v => { x[i++] = v; };
    put(1); put(an.full); put(Math.max(0, an.hp) / an.maxhp); put(night() ? 1 : 0); put(Math.sin(h / 24 * 6.283)); put(Math.cos(h / 24 * 6.283));
    put(own && own.alive ? Math.min(1, dist2(an, own) / 30) : 1); put(own?.fight ? 1 : 0); put(own && own.alive ? 1 : 0);
    let near = null, nd = 99; for (const q of living()) { if (q.kind !== 'human' || !conscious(q)) continue; const d = dist2(q, an); if (d < nd && d < 25 && sameSpace(q, an)) { nd = d; near = q; } }
    put(near ? 1 - nd / 25 : 0); put(near && !WEAPONS[near.weapon]?.weak ? 1 : 0); put(near && an.hurtBy === near.id ? 1 : 0); put(near ? Math.min(1, an.bond?.[near.id] || 0) : 0); put(near && Object.keys(near.items).some(k => GOODS[k]?.food && near.items[k] > 0) ? 1 : 0);
    let threat = 0, prey = 0; for (const a of Object.values(sim.animals)) { if (!a.alive || a === an || dist2(a, an) > 20) continue; if (a.monster && !an.monster) threat = 1; if (an.monster && (a.livestock || a.owner)) prey = 1; }
    if (an.monster && near) prey = 1;
    put(threat); put(prey); put(areaOf(an) === homeOf(an) ? 1 : 0); put(an.hurtAt && sim.t - an.hurtAt < 10 ? 1 : 0);
    for (const r of (an.recent || [])) if (sim.t - r.t < 3) x[18 + hashWord(r.w) % 8] = 1;
    return x;
  }
  function aForward(sp, x, noise) {
    const th = aNet(sp).theta, w = k => th[k] + (noise ? noise[k] : 0), hid = new Float32Array(A_H), out = new Float32Array(A_OUT), o2 = A_H * A_IN + A_H;
    for (let a = 0; a < A_H; a++) { let z = w(A_H * A_IN + a); for (let b = 0; b < A_IN; b++) if (x[b]) z += w(a * A_IN + b) * x[b]; hid[a] = Math.tanh(z); }
    for (let c = 0; c < A_OUT; c++) { let z = w(o2 + A_OUT * A_H + c); for (let a = 0; a < A_H; a++) z += w(o2 + c * A_H + a) * hid[a]; out[c] = z; }
    return { hid, out };
  }
  function aNudge(sp, x, act, adv, lr) {
    const th = aNet(sp).theta, { hid, out } = aForward(sp, x), o2 = A_H * A_IN + A_H, ci = A_ACTS.indexOf(act);
    let m = -1e9; for (const v of out) m = Math.max(m, v); let z = 0; const pr = out.map(v => { const e = Math.exp(v - m); z += e; return e; });
    const dh = new Float32Array(A_H);
    for (let c = 0; c < A_OUT; c++) { const g = ((c === ci ? 1 : 0) - pr[c] / z) * adv * lr; th[o2 + A_OUT * A_H + c] += g; for (let a = 0; a < A_H; a++) { dh[a] += g * th[o2 + c * A_H + a]; th[o2 + c * A_H + a] += g * hid[a]; } }
    for (let a = 0; a < A_H; a++) { const d = dh[a] * (1 - hid[a] * hid[a]); if (!d) continue; th[A_H * A_IN + a] += d; for (let b = 0; b < A_IN; b++) if (x[b]) th[a * A_IN + b] += d * x[b]; }
  }
  const aWorth = an => an.full + Math.max(0, an.hp) / an.maxhp * 2 + (an.owner ? (an.bond?.[an.owner] || 0) * 2 : 0) + (an.kills || 0);
  function aDecide(an) {
    const sp = an.species, x = aFeatures(an);
    if (an.last) { const r = Math.max(-1, Math.min(1, aWorth(an) - an.last.worth)), n = aNet(sp); n.base = n.base * 0.98 + r * 0.02; aNudge(sp, an.last.x, an.last.act, r - n.base, 0.03); }
    const out = aForward(sp, x, an.noise).out;
    let best = 0, bv = -1e9; for (let c = 0; c < A_OUT; c++) { const v = out[c] + rnd(0, 0.3); if (v > bv) { bv = v; best = c; } }
    an.act = A_ACTS[best]; an.last = { x, act: an.act, worth: aWorth(an) }; an.nextThink = sim.t + 5 + Math.random() * 3; an.goal = null;
    (an.trace ||= []).push({ day: sim.day, clock: sim.clock(), by: 'animal mind', chose: an.act, top: [], words: (an.recent || []).map(r => r.w).slice(-3), where: AREAS[areaOf(an)]?.name || '' }); if (an.trace.length > 20) an.trace.shift();
  }
  function aDo(an, dtMin) {
    const own = sim.people[an.owner], home = homeOf(an), spd = an.species === 'rabbit' || an.species === 'dog' || an.species === 'wolf' ? 1.6 : an.livestock ? 0.6 : 1.1;
    const nearHuman = () => { if (an.tgtAt && sim.t - an.tgtAt < 2 && an.tgt?.alive) return an.tgt; an.tgtAt = sim.t; return an.tgt = living().filter(q => q.kind === 'human' && conscious(q) && dist2(q, an) < 25 && sameSpace(q, an)).sort((a, b) => dist2(a, an) - dist2(b, an))[0]; };
    switch (an.act) {
      case 'wander': if (!an.goal || dist2(an, an.goal) < 1) an.goal = randIn(areaOf(an) && AREAS[areaOf(an)] && !AREAS[areaOf(an)].indoor ? areaOf(an) : home, 2); stepToward(an, an.goal, spd * 0.6, dtMin); break;
      case 'graze': if (['fields', 'ranch', 'wood', 'orchard'].includes(areaOf(an)) && !an.monster) an.full = Math.min(1, an.full + dtMin / 120); break;
      case 'follow': if (own && own.alive) { if (dist2(an, own) > 2.2) stepToward(an, own, spd, dtMin); } else an.act = 'wander'; break;
      case 'approach': case 'beg': { const q = nearHuman(); if (q && dist2(q, an) > 1.8) stepToward(an, q, spd * 0.8, dtMin); else if (q && an.act === 'beg' && (an.bond?.[q.id] || 0) > 0.2 && Math.random() < dtMin / 30) { const k = Object.keys(q.items).find(k => GOODS[k]?.food && q.items[k] > 0); if (k && q.brain !== 'human') { q.items[k]--; an.full = Math.min(1, an.full + 0.25); an.bond[q.id] = Math.min(an.maxBond ?? 1, (an.bond[q.id] || 0) + 0.03); log('life', `${q.name} tosses ${an.name} a scrap.`, [q.id, an.id]); } } break; }
      case 'flee': { const t = an.fleeAt && sim.t - an.fleeAt < 2 ? an.fleeFrom : (an.fleeAt = sim.t, an.fleeFrom = [...Object.values(sim.animals).filter(a => a.alive && a.monster && a !== an), ...living().filter(q => q.kind === 'human' && conscious(q) && (an.hurtBy === q.id || an.monster))].filter(q => dist2(q, an) < 18).sort((a, b) => dist2(a, an) - dist2(b, an))[0]);
        if (t && t.alive) { const dx = an.x - t.x, dz = an.z - t.z, l = Math.hypot(dx, dz) || 1; stepToward(an, P(an.x + dx / l * 4, an.z + dz / l * 4), spd * 1.4, dtMin); } else stepToward(an, an.goal ||= randIn(home, 2), spd, dtMin);
        // (beasts no longer slink back into the Wildwood)
        break; }
      case 'attack': {
        if (an.monster) { prowl(an, dtMin); break; }
        const t = an.hurtBy && sim.people[an.hurtBy]?.alive ? sim.people[an.hurtBy] : own && own.fight ? [...(sim.fights.find(f => f.sides.has(own.id))?.sides.keys() || [])].map(body).find(q => q && q.alive && q !== own && q !== an) : null;
        // a beast doesn't keep savaging someone who's down or behind bars (that looped: attack, fight ends at once, attack again)
        if (t && (!conscious(t) || t.jailedUntil > 0)) { if (an.hurtBy === t.id) an.hurtBy = null; an.act = 'stay'; break; }
        if (t && dist2(t, an) < 15) { if (dist2(t, an) > 1.8) stepToward(an, t, spd * 1.3, dtMin); else startFight(an, t, { mode: 'lethal', why: `${an.name} attacks` }); } else an.act = 'stay';
        break; }
      case 'home': if (!an.goal || areaOf(an.goal) !== home) an.goal = randIn(home, 2); stepToward(an, an.goal, spd, dtMin); break;
      case 'stay': default: break;
    }
  }
  // animals evolve with the town's generations: each carries a mutation of its species' net
  function aMutate(an) { const nz = new Float32Array(A_NP); for (let k = 0; k < A_NP; k++) nz[k] = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * 0.05; an.noise = nz; }
  sim.aMutate = aMutate;
  function aEndGeneration() {
    const bySp = {}; for (const an of Object.values(sim.animals)) if (an.noise) (bySp[an.species] ||= []).push(an);
    const out = {};
    for (const [sp, pop] of Object.entries(bySp)) {
      const n = aNet(sp), fit = an => (an.alive ? 1 + aWorth(an) : 0) + (an.kills || 0) * 0.5;
      if (pop.length >= 3) { const ranked = pop.slice().sort((a, b) => fit(a) - fit(b)), N = ranked.length; ranked.forEach((an, r) => { const u = r / (N - 1) - 0.5; for (let k = 0; k < A_NP; k++) n.theta[k] += 0.6 * u * an.noise[k] / N; }); }
      n.gen++; const st = { gen: n.gen, n: pop.length, alive: pop.filter(a => a.alive).length, fit: +(pop.reduce((a, an) => a + fit(an), 0) / pop.length).toFixed(2) }; n.history.push(st); if (n.history.length > 200) n.history.shift(); out[sp] = st;
    }
    return out;
  }
  sim.aEndGeneration = aEndGeneration;
  sim.animalMinds = true;
  // ---- generations ---------------------------------------------------------------
  sim.genDays = 7; sim.sigma = 0.04;   /* Rose: generations are a week now */
  sim.firstElection = 2; sim.electionEvery = 1;
  const isElectionDay = d => d >= sim.firstElection && (d - sim.firstElection) % sim.electionEvery === 0;
  const nextElectionDay = (pastNoon = H() >= 12) => { let d = sim.day + (pastNoon && isElectionDay(sim.day) ? 1 : 0); while (!isElectionDay(d)) d++; return d; };
  sim.isElectionDay = isElectionDay; sim.nextElectionDay = nextElectionDay;
  function mutateAll() { for (const p of everyone()) if (p.kind === 'human' && p.brain === 'script' && !p.town) { const nz = new Float32Array(NPARAM); for (let k = 0; k < NPARAM; k++) nz[k] = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * sim.sigma; p.noise = nz; } }
  sim.mutateAll = mutateAll;
  // fitness: the most money, and survival (the dead keep a fraction of what they had)
  const fitness = p => (p.alive ? worth(p) + 40 : (p.deathWorth || 0) * 0.25);
  // THE WIN (Rose): the community wins when anyone in it is still alive at noon on day 8 (the day after the generation's week)
  const winDay = () => (sim.genDays || 7) + 1;
  sim.winDay = winDay;
  // THE FAIL (Rose): more than 4 of the townsfolk dead on one day (midnight to midnight) and the town has failed, at once
  sim.MAX_DEATHS = 4;
  const deathsOn = d => (sim.deathsByDay || {})[d] || 0;
  const deaths24 = () => (sim.deathTimes || []).filter(t => sim.t - t < 1440).length;   // the townsfolk dead in the last 24 hours
  sim.deaths24 = deaths24;
  sim.deathsOn = deathsOn;
  sim.genWon = () => !sim.failed && sim.day >= winDay() && H() >= 12 && everyone().some(p => p.kind === 'human' && !p.town && p.id !== 'player' && p.alive);
  sim.genOver = () => !!sim.failed || sim.townDead() || sim.day > winDay() || (sim.day >= winDay() && H() >= 12);
  function endGeneration() {
    const n = netOf(), pop = everyone().filter(p => p.kind === 'human' && p.noise && !p.town);
    if (pop.length >= 4) {
      const ranked = pop.slice().sort((a, b) => fitness(a) - fitness(b)), N = ranked.length;
      const lr = 0.6;
      ranked.forEach((p, r) => { const u = (r / (N - 1)) - 0.5; for (let k = 0; k < NPARAM; k++) n.theta[k] += lr * u * p.noise[k] / N; });
    }
    learnPicks(everyone().filter(p => p.kind === 'human' && !p.town && p.id !== 'player' && (p.picks?.length || p.featPicks?.length)));
    const alive = pop.filter(p => p.alive), fit = pop.map(fitness);
    const words = Object.entries(sim.lore.words || {}).filter(([, e]) => e.n >= 3).length;
    const stat = { gen: n.gen + 1, won: sim.genWon(), failed: sim.failed ? { ...sim.failed } : null, days: sim.day, people: pop.length, alive: alive.length, deaths: sim.rec.deaths, avgFit: +(fit.reduce((a, b) => a + b, 0) / Math.max(1, fit.length)).toFixed(1), bestFit: +Math.max(0, ...fit).toFixed(1), agree: n.asked ? +(n.agree / n.asked).toFixed(2) : null, taught: n.imitated, words, crimes: sim.rec.crimes, gini: snapshot().gini };
    n.history.push(stat); if (n.history.length > 500) n.history.shift(); n.gen++; n.agree = 0; n.asked = 0;
    stat.animals = aEndGeneration();
    try { stat.score = scoreboard(); } catch (e) {}
    try {
      const ppl = everyone().filter(p => p.kind === 'human' && !p.town && p.id !== 'player'), lived = ppl.filter(p => p.alive);
      const role = p => (p.id === sim.mayorId ? 'the mayor' : p.job === 'none' ? 'a jobless one' : 'a ' + JOBS[p.job].title.toLowerCase()) + (p.underworld ? ' who was also a ' + p.underworld.role : '') + (p.gang ? ' in a gang' : '');
      const ranked = lived.slice().sort((a, b) => trueWorth(b) - trueWorth(a));
      const cause = { beasts: 0, people: 0, starvation: 0, disease: 0, other: 0 };
      for (const b of sim.bodies) { const k = b.killer && sim.animals[b.killer] ? 'beasts' : b.killer ? 'people' : /starv/.test(b.how || '') ? 'starvation' : Object.values(DISEASES).some(D => D.name.toLowerCase() === b.how) ? 'disease' : 'other'; cause[k]++; }
      const dead = Object.entries(cause).filter(([, n]) => n).map(([k, n]) => `${n} by ${k}`).join(', ') || 'none';
      const lines = [`Generation ${stat.gen} (${sim.day - 1} days): ${stat.won ? 'THE TOWN WON: it made it to noon on day ' + winDay() + ' with fewer than ' + (sim.MAX_DEATHS + 1) + ' dead.' : stat.failed ? 'THE TOWN FAILED: ' + stat.failed.n + ' were dead by day ' + stat.failed.day + '.' : 'THE TOWN LOST: it did not make it to noon on day ' + winDay() + '.'} ${lived.length} of ${ppl.length} lived. Richest: ${ranked.slice(0, 3).map(p => role(p) + ' ~' + money(trueWorth(p) * 10)).join('; ') || 'nobody'}. Poorest: ${ranked.slice(-2).map(role).join('; ') || 'nobody'}. Deaths: ${dead}. ${sim.rec.arrests} arrests for ${sim.rec.crimes} crimes.`];
      if (cause.beasts) lines.push('Beasts came out of the Wildwood every night at 22:00 and hunted people by scent, even asleep in their houses; on the last night of a generation it is a troll and two bears.');
      const gl = sim.genLog || [], top = (arr, k, n = 3) => { const c = {}; for (const x of arr) if (x[k]) c[x[k]] = (c[x[k]] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w, m]) => w + ' ' + m).join(', '); };
      const nights = {}; for (const d of gl) if (d.t === 'death' && d.killer && d.killer !== 'a person') { const key = (d.hr < 6 ? d.day - 1 : d.day) + '|' + d.killer; (nights[key] ||= []).push(d); }
      for (const [key, ds] of Object.entries(nights)) { const [day, who] = key.split('|'); lines.push(`Night of day ${day}: ${/^[aeiou]/i.test(who) ? 'an' : 'a'} ${who} killed ${ds.length} (${top(ds, 'who')}). Where they were caught: ${top(ds, 'where')}. What they were doing: ${top(ds, 'doing')}.`); }
      const byPeople = gl.filter(d => d.t === 'death' && d.killer === 'a person'); if (byPeople.length) lines.push(`Killed by people: ${byPeople.length} (${top(byPeople, 'who')}).`);
      const votes = gl.filter(v => v.t === 'vote'); if (votes.length) lines.push('Elections: ' + votes.map(v => `day ${v.day} with sales tax ${Math.round(v.tax * 100)}% and rent ${money(v.rent)}, ${v.kept ? 'the mayor kept office' : 'the mayor was voted out'} (${v.tally})`).join('; ') + '.');
      { const saves = gl.filter(x => x.t === 'save'), kills = gl.filter(x => x.t === 'beast'), nights = gl.filter(x => x.t === 'night');
        if (saves.length) lines.push(`Small wins: ${saves.length} lives saved from dying (by ${top(saves, 'how')}; most often by ${top(saves, 'by', 2)}).`);
        if (kills.length) lines.push(`Beasts killed: ${kills.length} (${top(kills, 'beast')}), by ${top(kills, 'by', 3)}, with ${top(kills, 'weapon', 3)}.`);
        if (nights.length) { const by = {}; for (const x of nights) { const b = (by[x.where] ||= [0, 0]); b[0] += x.lived ? 1 : 0; b[1]++; } const rows = Object.entries(by).filter(([, b]) => b[1] >= 2).map(([w, b]) => [w, b[0], b[1], b[0] / b[1]]); const safe = rows.filter(r => r[3] >= 0.99).sort((a, b) => b[2] - a[2]).slice(0, 3), bad = rows.filter(r => r[3] < 0.99).sort((a, b) => a[3] - b[3]).slice(0, 3);
          if (safe.length || bad.length) lines.push(`Where people were at 23:00 on the beast nights and who saw the dawn: ${[...safe, ...bad].map(r => `${r[0]} ${r[1]}/${r[2]} lived`).join('; ')}.`); }
        const dk = {}; for (const x of nights) { const b = (dk[x.doing] ||= [0, 0]); b[0] += x.lived ? 1 : 0; b[1]++; } const dRows = Object.entries(dk).filter(([, b]) => b[1] >= 3).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]);
        if (dRows.length >= 2) lines.push(`What they were doing then: ${dRows.slice(0, 4).map(([k, b]) => `${k} ${b[0]}/${b[1]} lived`).join('; ')}.`); }
      if (cause.disease) lines.push('Sickness killed people; the ones who rested at the Infirmary with the doctor in mostly lived.');
      if (cause.starvation) lines.push('People starved: food and coin for it mattered.');
      sim.lore.wisdom = [...(sim.lore.wisdom || []), lines.join(' ')].slice(-6); sim.genLog = [];
    } catch (e) {}
    sim.onGeneration?.(stat); return stat;
  }
  sim.endGeneration = endGeneration;
  // words: a trigram chain, learned from everything said aloud (the player, the AIs, the lore's own lines)
  function learnWords(text) {
    const w = String(text).toLowerCase().match(/[\w']+|[.!?,]/g); if (!w || w.length < 3) return;
    const ws = ['^', ...w, '$'], ch = sim.lore.chain;
    for (let i = 0; i + 2 < ws.length; i++) { const k = ws[i] + ' ' + ws[i + 1], l = (ch[k] ||= []); if (l.length < 30) l.push(ws[i + 2]); else l[Math.floor(Math.random() * 30)] = ws[i + 2]; }
  }
  function babble(seed) {
    const ch = sim.lore.chain, starts = Object.keys(ch).filter(k => k.startsWith('^ ')); if (starts.length < 8) return null;
    for (let tries = 0; tries < 20; tries++) {
      const pool = seed ? starts.filter(k => k.includes(seed)) : []; let k = pick(pool.length ? pool : starts); const out = [k.split(' ')[1]];
      while (out.length < 22) { const nx = pick(ch[k] || ['$']); if (nx === '$') break; out.push(nx); k = k.split(' ')[1] + ' ' + nx; }
      if (out.length >= 3) { const t = tidyLine(out.join(' ').replace(/ ([.!?,])/g, '$1')); if (readsWell(t)) return t; }
    }
    return null;
  }
  // ---- the talking fix (Rose) -----------------------------------------------------------------------------------
  // The word chain is all lower case and splits times ("22 00"): tidy a babbled line (I, names, sentence starts, 22:00),
  // and only let it out, or keep it as a phrase, if it reads as speech: four words or more, ends a sentence, and
  // never says the same two words twice ("no roof and no roof").
  function tidyLine(t) {
    let s = String(t || '').replace(/\b(\d{1,2}) (\d\d)\b/g, '$1:$2').replace(/\bi\b/g, 'I').replace(/\bi'(m|ll|ve|d)\b/g, "I'$1");
    const names = new Set(everyone().filter(q => q.kind === 'human' && q.name).map(q => q.name.toLowerCase()));
    s = s.replace(/\b[a-z][a-z']+\b/g, w => names.has(w) ? w[0].toUpperCase() + w.slice(1) : w);
    return s.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, c) => a + c.toUpperCase());
  }
  function readsWell(t) {
    const w = String(t || '').toLowerCase().match(/[a-z0-9']+/g) || []; if (w.length < 4) return false;
    const seen = new Set(); for (let i = 0; i + 1 < w.length; i++) { const k = w[i] + ' ' + w[i + 1]; if (seen.has(k)) return false; seen.add(k); }
    return /[.!?]$/.test(String(t).trim());
  }
  sim.tidyLine = tidyLine; sim.readsWell = readsWell;
  // Saying what you're doing: a plain brain can put its own plan into words, true to what it is doing right now.
  // Nobody is told anything; others hear it and make of it what they will.
  function intentLine(p, to) {
    const you = to && to.kind === 'human' && to.id !== 'player' ? to.name : null, tk = p.task;
    const beast = Object.values(sim.animals).find(a => a.monster && a.alive && dist2(a, p) < 30 && sees(p, a));
    if (beast) return `A ${beast.name.toLowerCase()}, close by! Get behind a door!`;
    if (!tk) return leadsParty(p) ? `I'm leading a party of ${followersOf(p).length + 1}${sim.formations[p.party] && sim.formations[p.party] !== 'loose' ? ', in a ' + sim.formations[p.party] : ''}.` : null;
    switch (tk.kind) {
      case 'craft':
        if (tk.what === 'palisade') return `I'm working on the palisade at the Wildwood edge. It stands at ${sim.palisade.hp} of ${sim.palisade.max}.${you ? ' ' + you + ', every stake helps.' : ''}`;
        if (tk.what === 'barricade') return `I'm barricading ${tk.house === p.home ? 'my house' : houseName(tk.house)} before ten.`;
        if (tk.what === 'wood') return `I'm off to chop wood in the Wildwood${sim.palisade.hp < sim.palisade.max ? ' for the palisade' : ''}.`;
        if (tk.what === 'fire') return "I'm lighting a watch-fire.";
        return `I'm making a ${tk.what}.`;
      case 'sleep': { const a = areaOf(tk.to); return a === 'shelter' ? "I'm taking a cot at the shelter tonight." : a === 'cellar' ? "I'm sleeping in the Cellar tonight." : AREAS[a]?.indoor ? "I'm turning in for the night." : "I'm sleeping out in the fields tonight, roof or no roof."; }
      case 'busk': return "I'm playing in the square for a few coins.";
      case 'hunt': return `I'm going after ${tk.species ? 'a ' + tk.species : 'game'} in the Wildwood.`;
      case 'follow': { const L = sim.people[tk.leader]; return L ? `I'm with ${L.name}'s party.` : null; }
      case 'work': return JOBS[p.job]?.title ? `Off to my shift as ${JOBS[p.job].title.toLowerCase()}.` : null;
      case 'doas': return tk.verb === 'enlist' ? "I'm going to enlist at the barracks by the fields gate." : tk.verb === 'alarm' ? "I'm casting an alarm spell before I sleep." : tk.verb === 'ring' ? "I'm ringing the bell!" : null;
    }
    return null;
  }
  sim.intentLine = intentLine;
  sim.babble = babble; sim.learnWords = learnWords;
  const STOP = new Set('the and you your for are but not with this that have has was were what who how why when where can will just his her its our their they them she him out about from into there here then than been would could should does did doing very much some any all get got say said tell told yes yeah well'.split(' '));
  'like one see know think going come came want lot bit sure maybe also too now day yet still even back over off down only own way well thing things something nothing anything let lets'.split(' ').forEach(w => STOP.add(w));
  // people's names are who, not what: they never become keywords (lines swap names for slots instead)
  let namesAt = -1, NAMESET = new Set();
  const isName = w => { if (namesAt !== sim.peopleAdded) { namesAt = sim.peopleAdded; NAMESET = new Set(['rose', ...Object.values(NAMES).flat(), ...SURNAMES].map(x => String(x).toLowerCase())); for (const q of everyone()) if (q.kind === 'human') for (const part of fullName(q).toLowerCase().split(/\s+/)) if (part.length > 2) NAMESET.add(part); } return NAMESET.has(w); };
  const keywords = t => [...new Set((String(t || '').toLowerCase().match(/[a-z']{3,}/g) || []).filter(w => !w.includes("'") && !STOP.has(w) && !isName(w)))].slice(0, 12);
  sim.keywords = keywords;
  // turn names into slots, so a line learned about one person can be said about another
  function slotify(text, sp, to) {
    let t = String(text);
    const sw = (name, slot) => { if (name) t = t.replace(new RegExp('\\b' + name.replace(/[^\w]/g, '') + '\\b', 'g'), slot); };
    sw(to?.id === 'player' ? 'Rose' : to?.name, '{you}'); sw(sp?.name, '{me}');
    for (const q of living()) if (q !== sp && q !== to && q.kind === 'human' && q.name.length > 2 && t.includes(q.name)) sw(q.name, '{someone}');
    return t;
  }
  // cut a line at a sentence end (never mid-word); null if there's no whole sentence in it
  function wholeSentences(t, max = 240) {
    t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= max && /[.!?…]["')]?$/.test(t)) return t;
    const m = t.slice(0, max).match(/^.*[.!?…]["')]?(?=\s|$)/); return m ? m[0] : null;
  }
  sim.wholeSentences = wholeSentences;
  function learnPhrase(sp, to, heard, said) {
    const ph = (sim.lore.phrases ||= {}), role = roleOf(sp), list = (ph[role] ||= []);
    const k = heard ? keywords(heard) : ['^'];
    const whole = wholeSentences(said);
    if (!k.length || !whole) return;
    const say = slotify(whole, sp, to);
    if (list.some(e => e.say === say)) return;
    list.push({ k, say, n: 0 }); if (list.length > 400) list.splice(Math.floor(Math.random() * 200), 1);
    sim.lore.phrasesLearned = (sim.lore.phrasesLearned || 0) + 1;
  }
  // a plain brain answering: the closest thing an AI once said to words like these
  function plainReply(sp, to, heard) { return plainPick(sp, to, heard)?.line || null; }
  function plainPick(sp, to, heard) {
    const ph = sim.lore.phrases || {}, k = heard ? keywords(heard) : ['^'];
    let best = null, bestScore = 0.25;
    for (const [role, list] of Object.entries(ph)) for (const e of list) {
      const hit = e.k.filter(w => k.includes(w)).length; if (!hit && !(k[0] === '^' && e.k[0] === '^')) continue;
      const sc = (k[0] === '^' && e.k[0] === '^' ? 0.5 : hit / Math.sqrt(e.k.length * Math.max(1, k.length))) * (role === roleOf(sp) ? 1.3 : 1) * (1 + clamp(e.w ?? 0.3, -0.5, 1) * 0.5) + Math.random() * 0.15;
      if (sc > bestScore) { bestScore = sc; best = e; }
    }
    if (!best) return null;
    best.n++;
    const other = pick(living().filter(q => q !== sp && q !== to && q.kind === 'human' && !q.town)) || sp;
    return { e: best, line: best.say.replace(/\{you\}/g, to.id === 'player' ? 'Rose' : to.name).replace(/\{me\}/g, sp.name).replace(/\{someone\}/g, other.name) };
  }
  sim.plainReply = plainReply;
  // plain-brained talk: a line out loud (heard by those in earshot, pets included)
  function plainSay(sp, to, heard) {
    let line = null, src = null, entry = null;
    const plan = !heard || /\b(what|where|doing|plan|tonight|help|going)\b/i.test(heard) ? intentLine(sp, to) : null;
    if (plan && Math.random() < 0.6) { line = plan; src = 'intent'; }
    const explore = !line && sim.learning && Math.random() < (Object.values(sim.lore.phrases || {}).reduce((n, l) => n + l.length, 0) < 40 ? 0.5 : 0.2);   // babbling on purpose: the only way new lines get tried
    if (!line && !explore) { const r = plainPick(sp, to, heard); if (r) { line = r.line; entry = r.e; src = 'phrase'; } }
    if (!line && sim.learning && (explore || Math.random() < 0.3)) { line = babble(keywords(heard)[0]); if (line) src = 'babble'; }
    if (!line && sim.npcBrain) { const other = pick(living().filter(q => q !== sp && q !== to && q.kind === 'human' && !q.town)) || sp; line = sim.npcBrain.reply(heard, { role: roleOf(sp), names: { you: to.id === 'player' ? 'Rose' : to.name, me: sp.name, someone: other.name } }); if (line) src = 'brain'; }
    if (!line) return null;
    (sp.saidTo ||= {})[to.id] = sim.t;
    if (to.kind === 'human' && to.brain !== 'human') judgeLine(sp, to, line, heard, src, entry);
    log('talk', `${sp.name} to ${to.id === 'player' ? 'you' : to.name}: "${line}"`, [sp.id, to.id]);
    sp.bubble = { text: line, t: sim.t };
    remember(to, { text: `${sp.name} told me: "${line}"` });
    hearWords(sp, line);
    return line;
  }
  sim.plainSay = plainSay;
  // ---- babble that learns (Rose) ----------------------------------------------------
  // The listener reacts to a plain line by how well it touches what's on their mind (their needs, what they've
  // just heard, what happened to them) and whether it's a sentence at all. Fifteen minutes later the line is
  // scored (that reaction, how their liking moved, whether they answered back): a babbled line that landed is
  // kept as a phrase; a kept phrase that keeps flopping is dropped.
  const pendingTalk = [];
  function needWords(q) {
    const w = [];
    if (q.food < 0.4) w.push('bread', 'food', 'hungry', 'eat', 'meal', 'stew', 'meat');
    if ((q.water ?? 1) < 0.4) w.push('water', 'drink', 'thirsty', 'well', 'ale');
    if (q.coin < 40) w.push('coin', 'money', 'silver', 'copper', 'gold', 'work', 'job', 'pay', 'wage', 'poor');
    if (night()) w.push('night', 'dark', 'sleep', 'bed', 'home');
    if (q.home == null) w.push('home', 'house', 'roof', 'bed', 'rent');
    if (Object.values(sim.animals).some(a => a.alive && a.monster)) w.push('beast', 'beasts', 'bear', 'wolf', 'wolves', 'troll', 'ogre', 'run', 'wildwood');
    if (sim.election.due || sim.election.candidates.length) w.push('mayor', 'vote', 'election', 'tax', 'taxes');
    if (q.job && q.job !== 'none') w.push(...JOBS[q.job].title.toLowerCase().split(/\W+/));
    return w;
  }
  function sense(q, line) {
    const ks = keywords(line); if (!ks.length) return -0.1;
    const mind = new Set([...wordsNow(q), ...keywords(q.memory.slice(-4).map(m => m.text || '').join(' ')), ...needWords(q)]);
    const n = (String(line).match(/\S+/g) || []).length;
    return ks.filter(w => mind.has(w)).length / ks.length + (n >= 3 && n <= 25 && wholeSentences(line) ? 0.15 : -0.15);
  }
  function judgeLine(sp, to, line, heard, src, entry) {
    const s = sense(to, line);
    pendingTalk.push({ sp: sp.id, to: to.id, line, k: heard ? keywords(heard) : ['^'], heard: heard || null, role: roleOf(sp), src, e: entry, t: sim.t, like0: R(to, sp).like, s });
    if (pendingTalk.length > 400) pendingTalk.shift();
    bump(to, sp, 'like', clamp((s - 0.25) * 0.08, -0.03, 0.05));
  }
  function settleTalk() {
    while (pendingTalk.length && sim.t - pendingTalk[0].t >= 15) {
      const b = pendingTalk.shift(), sp = sim.people[b.sp], to = sim.people[b.to]; if (!sp || !to) continue;
      const replied = (to.saidTo?.[sp.id] || 0) > b.t ? 1 : 0, score = +(b.s + (R(to, sp).like - b.like0) * 4 + replied * 0.2).toFixed(2);
      const L = sim.lore;
      if (b.src === 'babble') {
        L.babbleTried = (L.babbleTried || 0) + 1;
        const whole = wholeSentences(b.line), kept = score > 0.35 && !!whole && readsWell(whole) && b.k.length > 0;
        if (kept) { const list = ((L.phrases ||= {})[b.role] ||= []), say = slotify(whole, sp, to); if (!list.some(e => e.say === say)) { list.push({ k: b.k, say, n: 0, w: score, src: 'babble' }); if (list.length > 400) list.splice(Math.floor(Math.random() * 200), 1); L.babbleKept = (L.babbleKept || 0) + 1; } }
        dataRow({ type: 'babble', day: sim.day, role: b.role, heard: b.heard ? slotify(b.heard, to, sp) : null, said: slotify(b.line, sp, to), score, kept });
      } else if (b.src === 'phrase' && b.e) {
        b.e.w = +(((b.e.w ?? 0.3) * 0.8) + score * 0.2).toFixed(3); b.e.used = (b.e.used || 0) + 1;
        if (b.e.used >= 6 && b.e.w < 0) for (const list of Object.values(L.phrases || {})) { const i = list.indexOf(b.e); if (i >= 0) { list.splice(i, 1); L.phrasesDropped = (L.phrasesDropped || 0) + 1; } }
        dataRow({ type: 'line', day: sim.day, role: b.role, heard: b.heard ? slotify(b.heard, to, sp) : null, said: slotify(b.line, sp, to), score });
      }
    }
  }
  sim.settleTalk = settleTalk; sim.sense = sense;
  function cleanLore(o) {
    for (const w of Object.keys(o.words || {})) if (w.includes("'") || STOP.has(w) || isName(w)) delete o.words[w];
    for (const [role, list] of Object.entries(o.phrases || {})) o.phrases[role] = list.filter(e => { e.k = (e.k || []).filter(w => w === '^' || !w.includes("'") && !STOP.has(w) && !isName(w)); const ws = wholeSentences(e.say); if (ws) e.say = ws; return ws && e.k.length; });
  }
  sim.importLore = o => { if (o && o.v === 1 && o.acts) { cleanLore(o); sim.lore = o; sim.lore.runs = (o.runs || 0) + 1; if (o.net?.theta) o.net.theta = Float32Array.from(o.net.theta); mutateAll(); } };
  sim.exportLore = () => { const o = JSON.parse(JSON.stringify({ ...sim.lore, net: undefined, animals: undefined })); o.animals = Object.fromEntries(Object.entries(sim.lore.animals || {}).map(([k, n]) => [k, { ...n, theta: Array.from(n.theta, v => +v.toFixed(5)) }])); const n = netOf(); o.net = { ...n, theta: Array.from(n.theta, v => +v.toFixed(5)) }; return o; };
  sim.loreSize = () => ({ phrases: Object.values(sim.lore.phrases || {}).reduce((a, l) => a + l.length, 0), situations: Object.keys(sim.lore.acts).length, taught: sim.lore.taught, scored: sim.lore.scored, words: Object.keys(sim.lore.chain).length, babbled: sim.lore.babbleTried || 0, babbleKept: sim.lore.babbleKept || 0, runs: sim.lore.runs });
  sim.options = options; sim.choose = choose;

  function startTask(p, o) {
    const h = H();
    switch (o.kind) {
      case 'work': {
        const j = JOBS[p.job];
        let at = j.place === 'marrow' ? randIn('marrow', 4) : SPOTS[j.place] || randIn(j.place);
        if (p.job === 'factor') at = SPOTS.marrowMarket;
        if (j.guard && p.post && sim.t < (p.postUntil || 0) && AREAS[p.post]) at = randIn(p.post, 2);
        if (j.place === 'square') at = randIn(sim.curfew && night() ? 'lane' : pick(['square', 'square', 'lane']));
        if (p.job === 'jailer') at = SPOTS.jailer;
        if ((p.job === 'artillery' || p.job === 'mageguard') && night() && !(p.post && sim.t < (p.postUntil || 0))) at = P(-67.5, (p.job === 'artillery' ? -19 : 19) + rnd(-3, 3));   // after dark they hold the fields gate
        return setTask(p, 'work', { to: at, until: sim.t + 60 });
      }
      case 'eat': return setTask(p, 'eat', { until: sim.t + 10 });
      case 'drink': { const w = [...SPOTS.wells, ...(p.home != null ? [HOUSES[p.home].bed] : [])].sort((a, b) => dist2(p, a) - dist2(p, b))[0]; return setTask(p, 'drink', { to: w, until: sim.t + 60 }); }
      case 'purse': return setTask(p, 'purse', { to: HOUSES[p.home].bed, until: sim.t + 60 });
      case 'busk': return setTask(p, 'busk', { to: randIn('square', 3), until: sim.t + 120 });
    case 'forage': if (o.craft) return startCraft(p, o.craft, o); return setTask(p, 'forage', { to: sim.commons.apple >= sim.commons.berries ? randIn('orchard', 3) : randIn('wood', 3), until: sim.t + 120 });
      case 'fish': return setTask(p, 'fish', { to: P(SPOTS.pond.x + rnd(-3, 3), SPOTS.pond.z + 4.5), until: sim.t + 180 });
      case 'hunt': { if (o.species === 'boar' && !p.party) gatherParty(p, 'hunt'); return setTask(p, 'hunt', { species: o.species, until: sim.t + 240 }); }
      case 'buy': return setTask(p, 'buy', { to: SPOTS[o.shop], shop: o.shop, item: o.item, until: sim.t + 90 });
      case 'beg': return setTask(p, 'beg', { to: randIn('square'), until: sim.t + 60 });
      case 'sleep': p.stayUpUntil = 0; return setTask(p, 'sleep', { to: bedFor(p), until: sim.t + (o.hours ? o.hours * 60 : 9 * 60), hours: o.hours || null });
      case 'tavern': return setTask(p, 'tavern', { to: randIn('tavern', 3), until: sim.t + 90 });
      case 'socialize': { const q = pick(living().filter(q => q !== p && conscious(q) && q.kind === 'human' && dist2(p, q) < 30 && q.jailedUntil <= 0)); return q ? setTask(p, 'visit', { target: q.id, until: sim.t + 40 }) : setTask(p, 'idle', { until: sim.t + 20 }); }
      case 'court': return setTask(p, 'court', { target: o.target.id, until: sim.t + 60 });
      case 'pickpocket': return setTask(p, 'pickpocket', { target: o.target.id, until: sim.t + 40 });
      case 'mug': return setTask(p, 'mug', { target: o.target.id, until: sim.t + 40 });
      case 'burgle': return setTask(p, 'burgle', { to: HOUSES[o.house].bed, house: o.house, until: sim.t + 90 });
      case 'extort': return setTask(p, 'extort', { business: o.business, target: sim.business[o.business].owner, until: sim.t + 60 });
      case 'recruit': { const q = living().filter(q => q !== p && !q.gang && q.kind === 'human' && R(q, p).like > 0 && q.brain !== 'human').sort((a, b) => R(b, p).like - R(a, p).like)[0]; return q ? setTask(p, 'recruit', { target: q.id, until: sim.t + 60 }) : setTask(p, 'idle', { until: sim.t + 20 }); }
      case 'join': return setTask(p, 'join', { target: sim.gangs[o.gang].boss, gang: o.gang, until: sim.t + 60 });
      case 'found': foundGang(p); return setTask(p, 'idle', { until: sim.t + 10 });
      case 'stand': return setTask(p, 'stand', { to: SPOTS.hall, until: sim.t + 90 });
      case 'campaign': { const q = pick(living().filter(q => q !== p && q.kind === 'human' && conscious(q) && dist2(p, q) < 40)); return q ? setTask(p, 'campaign', { target: q.id, until: sim.t + 40 }) : setTask(p, 'idle', { until: sim.t + 20 }); }
      case 'avenge': return setTask(p, 'avenge', { target: o.target.id, until: sim.t + 60 });
      case 'seekwork': return setTask(p, 'seekwork', { to: SPOTS[pick(['bakery', 'store', 'smithy', 'tavern', 'hall', 'fields'])], until: sim.t + 60 });
      case 'report': return setTask(p, 'report', { to: SPOTS.desk, until: sim.t + 120 });
      case 'bury': return setTask(p, 'bury', { until: sim.t + 120 });
      case 'arrest': return setTask(p, 'arrest', { target: o.target.id, until: sim.t + 90 });
      case 'mourn': return setTask(p, 'mourn', { to: o.grave.at, until: sim.t + 30 });
      case 'rescue': return setTask(p, 'rescue', { target: o.target.id, until: sim.t + 180 });
      case 'collect': return setTask(p, 'collect', { until: sim.t + 180 });
      case 'lurkfor': p.hiding = sim.t + 240; return setTask(p, 'lurkfor', { target: o.target.id, until: sim.t + 240 });
      case 'escape': tryEscape(p, true); return setTask(p, 'idle', { until: sim.t + 5 });
      case 'doas': return setTask(p, 'doas', { verb: o.verb, target: o.target?.id || null, extra: o.extra || {}, to: o.at || null, until: sim.t + 90 });
      case 'takeup': cool(p, 'takeup', 1440); return setTask(p, 'takeup', { to: randIn('tavern', 2), role: o.role || 'thief', until: sim.t + 600 });
      case 'gostraight': if (p.underworld) { log('life', `${p.name} turns their back on the underworld.`, [p.id]); p.underworld = null; if (p.policy) { delete p.policy.crime; delete p.policy.violence; } } p.onPayroll = false; return setTask(p, 'idle', { until: sim.t + 5 });
      case 'apply': return setTask(p, 'apply', { target: o.target.id, until: sim.t + 90 });
      case 'lease': if (o.house != null) return setTask(p, 'house', { to: o.buy ? SPOTS.hall : HOUSES[o.house].door, house: o.house, buy: !!o.buy, until: sim.t + 120 }); return setTask(p, 'lease', { to: SPOTS.hall, business: o.business, until: sim.t + 120 });
      case 'tail': return setTask(p, 'tail', { target: o.target.id, until: sim.t + 240 });
      case 'goto': return setTask(p, 'goto', { to: o.at.kind ? P(o.at.x, o.at.z) : o.at, until: sim.t + 120 });
      case 'hold': return setTask(p, 'talk', { with: o.with?.id || p.task?.with || null, until: sim.t + 20 });
      case 'assail': if (o.help) { const f = sim.fights.find(f => f.sides.has(o.target.id)); if (f && !f.sides.has(p.id) && f.sides.has(o.help.id)) { join(f, p, f.sides.get(o.help.id), isGuard(p) ? 'nonlethal' : (p.prefMode || (p.traits.aggression > 0.75 ? 'lethal' : 'nonlethal'))); log('fight', `${p.name} steps in on ${o.help.id === 'player' ? 'your' : o.help.name + "'s"} side against ${o.target.id === 'player' ? 'you' : o.target.name}!`, [p.id, o.help.id, o.target.id]); return setTask(p, 'idle', { until: sim.t + 5 }); } }
        if (o.bounty) { cool(p, 'hunt', 240); p.huntFor = o.target.id; log('law', `${p.name} goes after ${o.target.name} for the bounty.`, [p.id, o.target.id]); } startFight(p, o.target, o.bounty ? { mode: 'nonlethal', why: 'bounty' } : { mode: p.prefMode || (p.traits.aggression > 0.75 ? 'lethal' : 'nonlethal'), why: 'picked a fight' }); return setTask(p, 'idle', { until: sim.t + 5 });
      case 'coup': { cool(p, 'coup', 1440 * 4); const g = sim.gangs[p.gang]; if (!g) return; g.coupBy = p.id; return setTask(p, 'coup', { target: o.target.id, until: sim.t + 180 }); }
      case 'caravan': return startCaravan(p);
      case 'boast': { cool(p, 'boast', 360); const q = o.target; const claim = Math.round(trueWorth(p) * 2 + 40); const ok = boast(p, q, claim); log('lie', `${p.name} lets ${q.name} know they're worth a good deal more than they look. ${ok ? q.name + ' believes it.' : q.name + " isn't fooled."}`, [p.id, q.id]); return setTask(p, 'idle', { until: sim.t + 10 }); }
      case 'flee': return setTask(p, 'flee', { from: P(o.from.x, o.from.z), until: sim.t + 20 });
      case 'beast': cool(p, 'arm', 0); return setTask(p, 'beast', { target: o.target.id, until: sim.t + 60 });
      case 'shoprob': cool(p, 'shoprob', 1440 * 2); return setTask(p, 'shoprob', { to: SPOTS[o.business], business: o.business, holdup: o.holdup, until: sim.t + 120 });
      case 'rustle': { cool(p, 'rustle', 1440 * 2); const a = Object.values(sim.animals).filter(a => a.livestock && a.alive && a.species !== 'cow').sort(() => Math.random() - 0.5)[0]; if (!a) return; return setTask(p, 'rustle', { target: a.id, to: P(a.x, a.z), until: sim.t + 240 }); }
      case 'fence': cool(p, 'fence', 600); return setTask(p, 'caravan', { phase: 'home', fence: true, until: sim.t + 240 });
      case 'ambush': { cool(p, 'ambush', 720); if (!p.party) gatherParty(p, 'bandit', Infinity, true); return setTask(p, 'ambush', { to: P(rnd(-280, -160), rnd(-3, 3)), until: sim.t + 240 }); }
      case 'signon': { p.job = 'mercenary'; log('life', `${fullName(p)} signs on as a sellsword (${money(mercRate(p))} a day).`, [p.id]); return setTask(p, 'idle', { until: sim.t + 10 }); }
      case 'study': return setTask(p, 'study', { to: randIn('school', 2), until: sim.t + 120 });
      case 'treat': return setTask(p, 'treat', { to: o.where === 'chapel' ? randIn('chapel', 2) : pick(SPOTS.beds), where: o.where || 'healer', until: sim.t + 240 });
      case 'craft': return startCraft(p, o.what, o);
      case 'other': if (o.craft) return startCraft(p, o.craft, o); return setTask(p, 'idle', { until: sim.t + 20 });
      default: return setTask(p, 'idle', { until: sim.t + 20 });
    }
  }
  sim.startTask = startTask;

  // =========================================================== doing tasks ==
  const target = t => t && (sim.people[t] || sim.animals[t]);
  function arrive(p, to, dt, speed = 2.2) { return stepToward(p, to, speed * (p.task?.run ? 2.2 : 1), dt); }
  function doTask(p, dt) {
    const tk = p.task; if (!tk) return choose(p);
    p.stateT += dt;
    if (tk.kind === 'work' || tk.kind === 'craft' || tk.kind === 'hunt' && p.job === 'hunter') p.workedToday = (p.workedToday || 0) + dt;   // the shelter law counts a lodger's day
    if (tk.until && sim.t > tk.until) { p.task = null; return; }
    const h = H();
    switch (tk.kind) {
      case 'idle': return;
      case 'work': {
        if (!inShift(p.job, h)) { p.task = null; return; }
        if (tk.to && dist2(p, tk.to) > 0.6) { arrive(p, tk.to, dt); return; }
        if (JOBS[p.job].place === 'square' && Math.random() < 0.01) tk.to = randIn(pick(['square', 'square', 'lane', 'tavern']));   // patrols wander
        p.worked = (p.worked || 0) + dt * (p.food < 0.15 ? 0.5 : 1);     // a starving worker gets half as much done
        { // eat on the job from the business's own food (owners free, hands pay the till)
          const bid = JOBS[p.job].owner || JOBS[p.job].payer, b = sim.business[bid];
          if (b && p.food < 0.35) for (const k of ['bread', 'meal', 'pie', 'turnip', 'eggs', 'milk', 'meat']) if ((b.stock[k] || 0) > 0 && GOODS[k]?.food) {
            const own = sim.people[b.owner]; if (own !== p) { const c = priceOf(bid, k); if (p.coin < c) continue; pay(p, own && own.alive ? own : 'town', c); }
            b.stock[k]--; p.food = Math.min(1, p.food + GOODS[k].food); if (GOODS[k].water) p.water = Math.min(1, (p.water ?? 1) + GOODS[k].water); break;
          }
        }
        if (p.job === 'farmer' || p.job === 'farmhand') farmWork(p, dt);
        if (p.job === 'rancher' || p.job === 'ranchhand') ranchWork(p, dt);
        if (p.job === 'smith' || p.job === 'journeyman' || p.job === 'apprentice') forgeWork(p, dt);
        if (p.job === 'leatherworker') tanWork(p, dt);
        if (p.job === 'baker' || p.job === 'bakehand') { const b = sim.business.bakery; if (!(b.stock.grain > 1)) trade('farm', 'bakery', 'grain', 4); if (b.stock.grain > 0 && (b.stock.bread || 0) < 40 && Math.random() < dt / 30) { b.stock.grain--; b.stock.bread = (b.stock.bread || 0) + 3; if ((b.stock.pie || 0) < 3 && sim.business.store.stock.meat > 0 && Math.random() < 0.3) { trade('store', 'bakery', 'meat', 1); if (b.stock.meat > 0) { b.stock.meat--; b.stock.pie = (b.stock.pie || 0) + 2; } } } }
        if (p.job === 'innkeep' || p.job === 'server') { const b = sim.business.tavern; if (!(b.stock.barley > 0)) trade('farm', 'tavern', 'barley', 2); if (!(b.stock.turnip > 0)) trade('farm', 'tavern', 'turnip', 4); if (b.stock.barley > 0 && Math.random() < dt / 240) { b.stock.barley--; (sim.brews ||= []).push({ ready: sim.t + 1440, ale: 8 }); } if (b.stock.turnip > 0 && (b.stock.meal || 0) < 12 && Math.random() < dt / 40) { b.stock.turnip--; b.stock.meal = (b.stock.meal || 0) + 2; } }
        if (p.job === 'shopkeep' || p.job === 'shophand') { const b = sim.business.store; if ((b.stock.turnip || 0) < 6) trade('farm', 'store', 'turnip', 6); }
        if ((p.job === 'undertaker' && sim.bodies.some(b => !b.buried && (!b.collected || sim.t >= b.layUntil))) || (p.job === 'cleric' && patients().length)) { p.task = null; return; }
        if (p.job === 'doctor') treatPatients(dt);
        return;
      }
      case 'craft': { if (!tk.there) { if (!arrive(p, tk.to, dt)) return; tk.there = true; } tk.done += dt * (p.food < 0.15 ? 0.5 : 1); (p.craftProg ||= {})[tk.what + (tk.house ?? '')] = tk.done; if (tk.done >= tk.mins) { delete p.craftProg[tk.what + (tk.house ?? '')]; finishCraft(p, tk); p.task = null; } return; }   // half-done work keeps when you're called away
      case 'eat': { eatFrom(p); p.task = null; return; }
      case 'drink': { if (!arrive(p, tk.to, dt)) return; p.water = 1; p.task = null; return; }
      case 'forage': { if (!arrive(p, tk.to, dt)) return; if (Math.random() < dt / 20) { const k = areaOf(p) === 'orchard' ? 'apple' : 'berries'; if (sim.commons[k] <= 0) { p.task = null; return; } sim.commons[k]--; p.items[k] = (p.items[k] || 0) + 1; if ((p.items[k] || 0) >= 4) { eatFrom(p); p.task = null; } } return; }
      case 'purse': { if (!arrive(p, tk.to, dt)) return; const n = Math.min(HOUSES[p.home].stash, 80 - p.coin); if (n > 0) { HOUSES[p.home].stash -= n; p.coin += n; } p.task = null; return; }
      case 'fish': { if (!arrive(p, tk.to, dt)) return; if (Math.random() < dt / 30 * 0.5 * (sim.fish / 40)) { sim.fish--; p.items.fish = (p.items.fish || 0) + 1; if (p.items.fish >= 3) { eatFrom(p); p.task = null; } } return; }
      case 'hunt': return doHunt(p, dt);
      case 'house': { if (!arrive(p, tk.to, dt)) return; const r = tk.buy ? buyHouse(p, tk.house) : rentHouse(p, tk.house); if (!/^You /.test(r)) { remember(p, { text: `I tried to ${tk.buy ? 'buy' : 'rent'} ${houseName(tk.house)}: ${r}` }); (p.failed ||= []).push(`${tk.buy ? 'buy' : 'rent'} ${houseName(tk.house)} (${r})`); } p.task = null; return; }
      case 'lease': { if (!arrive(p, tk.to, dt)) return; leaseTo(p, tk.business); p.task = null; return; }
      case 'takeup': { if (!arrive(p, tk.to, dt)) return; if (takeUp(p, tk.role)) p.task = null; else if (H() >= 6 && H() < 18) { p.task = null; remember(p, { text: 'the underworld only meets at the Drowned Lantern after dark' }); } return; }
      case 'lurkfor': { const t = sim.people[tk.target]; if (!t || !t.alive) { p.task = null; p.hiding = 0; return; } if (dist2(p, t) < 4 && sees(p, t)) { p.task = null; remember(p, { text: `${t.name} came by where I was waiting` }); p.alert = true; } return; }
      case 'doas': {
        const t = tk.target && (sim.people[tk.target] || sim.animals[tk.target]);
        if (tk.target && (!t || !t.alive)) { p.task = null; return; }
        const goal = t || tk.to; if (goal && dist2(p, goal) > (t ? (['sizeup', 'calm'].includes(tk.verb) ? 6 : 2.2) : 1.2)) { arrive(p, goal, dt); return; }
        const res = sim.doAs(p, tk.verb, tk.target, tk.extra) || '';
        if (res) { remember(p, { text: `I tried to ${tk.verb}${t ? ' ' + (t.name || '') : ''}: ${res.replace(/^You /, 'I ')}` }); if (!/^(Get closer|You can't|No |Nobody)/.test(res)) log(['bribe', 'lie', 'report', 'loot', 'dig'].includes(tk.verb) ? 'crime' : 'life', `${p.name} (${tk.verb}${t ? ' ' + (t.name || '') : ''}): ${res.replace(/^You /, '').replace(/^your /i, 'their ')}`, [p.id, t?.id].filter(Boolean)); }
        p.task = null; return;
      }
      case 'apply': {
        const boss = sim.people[tk.target]; if (!boss || !boss.alive) { p.task = null; return; }
        if (dist2(p, boss) > 2.5) { arrive(p, boss, dt); return; }
        const own = JOBS[boss.job]?.owner, hand = { bakery: 'bakehand', store: 'shophand', smithy: smithHand(), tavern: 'server', farm: 'farmhand', ranch: 'ranchhand' }[own];
        const room = hand && living().filter(q => q.job === hand).length < 2 && boss.coin >= JOBS[hand].wage * 2;
        if (room && R(boss, p).like > -0.2 && d(20) + p.skills.diplomacy + R(boss, p).like * 8 >= 10) { p.job = hand; log('life', `${boss.name} takes ${p.name} on as ${JOBS[hand].title.toLowerCase()}.`, [p.id, boss.id]); }
        else log('life', `${boss.name} has no work for ${p.name}.`, [p.id, boss.id]);
        p.task = null; return;
      }
      case 'wait': { if (sim.t >= tk.until) p.task = null; return; }
      case 'muster': { if (sim.t >= tk.until) { p.task = null; return; } if (dist2(p, tk.to) > 2.5) arrive(p, tk.to, dt); return; }
      case 'tail': { const L = sim.people[tk.target]; if (!L || !L.alive) { p.task = null; return; } if (dist2(p, L) > 2.2) arrive(p, L, dt, 2.2); else p.yaw = Math.atan2(L.x - p.x, L.z - p.z); return; }
      case 'fetchguard': {
        const g = tk.guard && sim.people[tk.guard], live = g && g.alive && conscious(g) && !g.fight ? g : null;
        if (!arrive(p, live || tk.to, dt)) { if (Math.random() < dt / 4) for (const q of living()) if (q !== p && q.kind === 'human' && inEarshot(q, p) && !isGuard(q)) remember(q, { text: `${p.name} ran past calling for a guard (trouble near ${tk.where})` }); return; }
        const guard = live || living().find(x => isGuard(x) && conscious(x) && !x.fight && areaOf(x) === 'station');
        if (guard) { log('law', `${p.name} reaches ${guard.name}: "Come quick, someone needs a guard near ${tk.where}!"`, [p.id, guard.id]); if (waitsForOrders(guard)) askOrders(guard, `${p.name} ran up to you: someone needs a guard near ${tk.where}.`); else setTask(guard, 'goto', { to: tk.at, until: sim.t + 60, cry: tk.cry, run: true }); }
        else log('law', `${p.name} finds no guard to fetch.`, [p.id]);
        p.task = null; return; }
      case 'goto': {
        if (isGuard(p)) { const w = living().find(q => q !== p && q.kind === 'human' && sim.bounty[q.id] && conscious(q) && !(q.jailedUntil > 0) && dist2(q, p) < 12 && sees(p, q)); if (w) { setTask(p, 'arrest', { target: w.id, until: sim.t + 90 }); return; } }

        if (tk.cry && isGuard(p)) for (const id of tk.cry) { const ev = sim.events.find(e => e.id === id), a = ev && sim.people[ev.actor]; if (a && a.alive && dist2(p, a) < 15 && sees(p, a)) { guardHears(p, ev, 'saw', null); tk.cry = tk.cry.filter(x => x !== id); log('law', `${p.name} arrives and sees ${a.id === 'player' ? 'you' : a.name}.`, [p.id, a.id]); } }
        if (arrive(p, tk.to, dt)) p.task = null; return; }
      case 'talk': { const w = sim.people[tk.with]; if (w) p.yaw = Math.atan2(w.x - p.x, w.z - p.z); if (w && dist2(w, p) > 6) p.task = null; return; }
      case 'coup': {
        const boss = sim.people[tk.target], g = sim.gangs[p.gang];
        if (!boss || !boss.alive || !g || g.boss !== boss.id) { if (g) g.coupBy = null; p.task = null; return; }
        if (!arrive(p, boss, dt, 2)) return;
        const mode = p.traits.aggression > 0.65 || R(p, boss).like < -0.4 ? 'lethal' : 'nonlethal';
        log('gang', `${p.name} turns on ${boss.name} to take ${g.name}${mode === 'lethal' ? ', knife out' : ''}!`, [p.id, boss.id]);
        const f = startFight(p, boss, { mode, why: 'coup', quiet: true });
        if (f) { f.coup = { gang: g.id, by: p.id, boss: boss.id };
          // every member near enough to see decides: stand by the boss, back the challenger, or stay out of it
          for (const q of gangMembers(g.id)) { if (q === p || q === boss || !conscious(q) || q.jailedUntil > 0 || dist2(q, boss) > 20 || f.sides.has(q.id)) continue;
            const forBoss = R(q, boss).like * 2 + q.traits.loyalty * 2 + (g.underboss === q.id ? 0.5 : 0), forP = R(q, p).like * 2 + q.traits.ambition - q.traits.loyalty + (might(p) > might(boss) ? 0.5 : 0);
            const pickSide = forBoss > forP ? boss : p, how = Math.max(forBoss, forP);
            if (how > 1 + q.traits.caution) { join(f, q, f.sides.get(pickSide.id), q.traits.aggression > 0.7 ? 'lethal' : 'nonlethal'); (q.coupSide ||= {})[g.id] = pickSide.id; log('gang', `${q.name} sides with ${pickSide.name}.`, [q.id, pickSide.id]); }
            else remember(q, { text: `stayed out of ${p.name}'s fight with ${boss.name}` }); } }
        p.task = null; return;
      }
      case 'beast': { const an = sim.animals[tk.target]; if (!an || !an.alive) { p.task = null; return; } if (an.fight) { const f = sim.fights.find(f => f.sides.has(an.id)); if (f && !f.sides.has(p.id)) { const foe = [...f.sides.keys()].find(id => f.sides.get(id) !== f.sides.get(an.id)); if (foe) join(f, p, f.sides.get(foe), 'lethal'); } p.task = null; return; } const reach = WEAPONS[p.weapon]?.range ? Math.min(WEAPONS[p.weapon].range, 14) : 1.8; if (dist2(p, an) > reach) { arrive(p, an, dt, 2); return; } startFight(p, an, { mode: 'lethal', why: 'fighting the ' + an.name.toLowerCase() }); p.task = null; return; }
      case 'shoprob': {
        if (!arrive(p, tk.to, dt)) return;
        const b = sim.business[tk.business], keeper = sim.people[b.owner], name = AREAS[tk.business].name;
        const grab = () => { const got = []; for (const [k, n] of Object.entries(b.stock).filter(([k, n]) => n > 0 && GOODS[k] && k !== 'iron').sort((x, y) => (GOODS[y[0]].price || 0) - (GOODS[x[0]].price || 0)).slice(0, 3)) { const m = Math.min(n, GOODS[k].bundle ? 1 : 2); b.stock[k] -= m; p.items[k] = (p.items[k] || 0) + m; got.push(m + ' ' + GOODS[k].name.toLowerCase()); if (GOODS[k].weapon && WEAPONS[k] && (p.weapon === 'fists' || WEAPONS[k].dmg[1] * WEAPONS[k].dmg[0] > WEAPONS[p.weapon].dmg[1] * WEAPONS[p.weapon].dmg[0])) { p.items[k]--; if (p.weapon !== 'fists') p.items[p.weapon] = (p.items[p.weapon] || 0) + 1; p.weapon = k; } if (GOODS[k].armor && (ARMOR[k].ac > (ARMOR[p.armor] || ARMOR.none).ac)) { p.items[k]--; p.armor = k; } } return got; };
        if (tk.holdup && keeper && keeper.alive && conscious(keeper) && areaOf(keeper) === tk.business) {
          const r = d(20) + p.skills.intimidate + (p.weapon !== 'fists' ? 3 : 0) + Math.floor(power(p) / 5), dc = 10 + keeper.level + mod(keeper.st.wis) + Math.floor(power(keeper) / 5);
          if (r >= dc) { const n = Math.min(keeper.coin, irnd(50, 250)); pay(keeper, p, n); bump(keeper, p, 'fear', 0.4); const got = grab(); p.stats.stolen += n; deed('robbery', p, keeper, keeper); log('crime', `${p.name} holds up ${keeper.name} at the ${name}: ${money(n)}${got.length ? ' and ' + got.join(', ') : ''}.`, [p.id, keeper.id]); }
          else { log('crime', `${p.name} tries to hold up ${keeper.name} at the ${name}, but ${keeper.name} won't be scared.`, [p.id, keeper.id]); deed('robbery', p, keeper, keeper); startFight(keeper.traits.aggression > 0.4 ? keeper : p, keeper.traits.aggression > 0.4 ? p : keeper, { mode: 'nonlethal', why: 'a hold-up' }); }
        } else if (!tk.holdup) {
          const r = d(20) + p.skills.openlock + (p.items.picks ? 2 : -2);
          if (r < 15) { log('crime', `${p.name} fails to force the door of the ${name}.`, [p.id]); deed('trespass', p, null, tk.to); }
          else { const got = grab(); const { seen } = deed('burglary', p, keeper || null, tk.to, { victimKnows: false }); log('crime', `${p.name} breaks into the ${name} and takes ${got.join(', ') || 'nothing worth having'}${seen.length ? ` (seen by ${seen.map(q => q.name).join(', ')})` : ' unseen'}.`, [p.id]); }
        }
        p.task = null; return;
      }
      case 'caravan': return doCaravan(p, dt);
      case 'rustle': { const a = sim.animals[tk.target]; if (!a || !a.alive) { p.task = null; return; } if (!arrive(p, a, dt, 1.5)) return; a.alive = false; a.state = 'dead'; p.items.meat = (p.items.meat || 0) + a.meat; const own = sim.people[a.owner]; deed('theft', p, own || null, P(a.x, a.z)); log('crime', `${p.name} slaughters one of the ranch's ${a.species === 'hen' ? 'hens' : 'sheep'} in the dark and carries off the meat.`, [p.id]); p.task = null; return; }
      case 'ambush': return doAmbush(p, dt);
      case 'follow': { const L = sim.people[tk.leader]; if (!L || !L.alive || !p.party || L.party !== p.party) { p.party = null; p.task = null; return; } const spot = formationSpot(p, L); if (spot) { if (dist2(p, spot) > 0.8) arrive(p, spot, dt, 1.6); else p.yaw = L.yaw; return; } if (dist2(p, L) > 2.5) arrive(p, L, dt, 1.6); return; }
      case 'buy': {
        if (!arrive(p, tk.to, dt)) return;
        if (shopOpen(tk.shop)) buy(p, tk.shop, tk.item);
        if (GOODS[tk.item]?.food) eatFrom(p);
        if (tk.item === 'cure' && p.items.cure) { p.items.cure--; p.hp = Math.min(p.maxhp, p.hp + roll(1, 8)); }
        p.task = null; return;
      }
      case 'beg': {
        showWealth(p, 2, 0.25, false);
        if (!arrive(p, tk.to, dt)) return;
        if (Math.random() < dt / 30) { const g = living().find(q => q !== p && dist2(p, q) < 4 && q.coin > 40 && R(q, p).like > 0 && Math.random() < 0.5); if (g) { pay(g, p, 1); bump(p, g, 'like', 0.1); log('life', `${g.name} gives ${p.name} a copper.`, [g.id, p.id]); } }
        return;
      }
      case 'sleep': {
        if (!arrive(p, tk.to, dt)) return;
        if (!tk.abed) { if (!settleBed(p, tk)) return; tk.abed = true; tk.until = sim.t + (tk.hours || 9) * 60; }   // the hours count from the pillow, not the walk home
        p.state = 'sleep'; p.rest = Math.min(1, p.rest + dt / 420);
        if (!(p.lastSleepT >= sim.t - 120)) p.sleptMin = 0; p.lastSleepT = sim.t; p.sleptMin = (p.sleptMin || 0) + dt;
        if (p.sleptMin >= 480) { p.sleptMin = 0; restDaily(p); if (!p.dying && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + Math.max(1, p.level || 1)); remember(p, { text: `I slept the night through: my strength${p.slotMax?.cures || p.slotMax?.missiles ? ' and my spells' : ''} came back.` }); }
        if (tk.hours && sim.t >= tk.until) { p.task = null; return; }
        if (p.home != null && p.coin > 60) { HOUSES[p.home].stash += p.coin - 50; p.coin = 50; }   // money goes in the stash at home
        if (!tk.hours && p.rest >= 1 && h >= 5 && h < 21 && (!(p.sleptMin > 0) || h >= 9 || (JOBS[p.job] && inShift(p.job, h)))) { if (p.home != null && p.coin < 80) { const n = Math.min(HOUSES[p.home].stash, 80 - p.coin); HOUSES[p.home].stash -= n; p.coin += n; } p.task = null; }   // a day's spending money from the stash
        return;
      }
      case 'busk': { if (!arrive(p, tk.to, dt)) return; tk.acc = (tk.acc || 0) + dt; if (tk.acc >= 15) { tk.acc -= 15; buskRound(p); } return; }
      case 'tavern': {
        if (!arrive(p, tk.to, dt)) return;
        if (Math.random() < dt / 40 && shopOpen('tavern') && p.coin >= 4) buy(p, 'tavern', 'ale');
        if (Math.random() < dt / 15) { const q = pick(living().filter(q => q !== p && areaOf(q) === 'tavern' && conscious(q))); if (q) converse(p, q); }
        return;
      }
      case 'visit': case 'court': case 'campaign': case 'recruit': case 'join': {
        const q = target(tk.target); if (!q || !conscious(q) || q.jailedUntil > 0) { p.task = null; return; }
        if (dist2(p, q) > 1.8) { arrive(p, q, dt); return; }
        if (tk.kind === 'visit') converse(p, q);
        if (tk.kind === 'court') court(p, q);
        if (tk.kind === 'campaign') campaign(p, q);
        if (tk.kind === 'recruit') recruit(p, q);
        if (tk.kind === 'join') askToJoin(p, q, tk.gang);
        p.task = null; return;
      }
      case 'pickpocket': {
        const q = target(tk.target); if (!q || !conscious(q)) { p.task = null; return; }
        if (dist2(p, q) > 1.2) { arrive(p, q, dt, 1.2); return; }
        pickpocket(p, q); p.task = null; return;
      }
      case 'mug': case 'avenge': {
        const q = target(tk.target); if (!q || !conscious(q)) { p.task = null; return; }
        if (dist2(p, q) > 1.6) { arrive(p, q, dt, 1.6); return; }
        startFight(p, q, { mode: tk.kind === 'mug' ? 'nonlethal' : (p.traits.aggression > 0.7 && (p.grudge?.[q.id] || 0) > 8 ? 'lethal' : 'nonlethal'), why: tk.kind });
        p.task = null; return;
      }
      case 'burgle': {
        if (!arrive(p, tk.to, dt, 1.2)) return;
        burgle(p, tk.house); p.task = null; return;
      }
      case 'extort': {
        const q = target(tk.target); if (!q || !conscious(q)) { p.task = null; return; }
        if (dist2(p, q) > 1.8) { arrive(p, q, dt); return; }
        extort(p, q, tk.business); p.task = null; return;
      }
      case 'stand': {
        if (!arrive(p, tk.to, dt)) return;
        if (!sim.election.candidates.includes(p.id) && pay(p, 'town', 50) === 50) { sim.election.candidates.push(p.id); cool(p, 'stand', 1440 * 7); log('politics', `${fullName(p)} stands for mayor (paid the 5 sp fee).`, [p.id]); if (!thinks(p) && !p.platform) p.platform = plainPlatform(p); }
        p.task = null; return;
      }
      case 'seekwork': {
        if (!arrive(p, tk.to, dt)) return;
        seekWork(p); p.task = null; return;
      }
      case 'report': {
        if (!arrive(p, tk.to, dt, 1.5)) return;
        for (const ev of p.toReport || []) fileReport(p, ev);
        p.toReport = []; p.task = null; return;
      }
      case 'bury': return doBury(p, dt);
      case 'collect': return doCollect(p, dt);
      case 'rescue': return doRescue(p, dt);
      case 'haul': return doHaul(p, dt);
      case 'study': {
        if (!arrive(p, tk.to, dt)) return;
        if (!classInSession()) { p.task = null; return; }
        p.studied = (p.studied || 0) + dt;
        if (p.studied >= 480) { p.studied = 0; const k = pick(['diplomacy', 'sense', 'heal', 'spot', 'bluff', 'intimidate', 'openlock']); p.skills[k]++; log('life', `${fullName(p)} finishes a course of lessons: ${k} +1.`, [p.id]); }
        return;
      }
      case 'treat': { if (!arrive(p, tk.to, dt)) return; p.state = 'patient'; if (p.sick && !tk.tried) { tk.tried = true; const said = sim.doAs(p, 'cure'); if (p.sick && /full|wants \d+c|No (doctor|cleric)/.test(said || '')) { (p.failed ||= []).push('get cured: ' + said); p.task = null; return; } } if (p.hp >= p.maxhp * 0.9 && !p.sick?.sym || !doctorIn()) p.task = null; return; }
      case 'arrest': {
        const q = target(tk.target); if (!q || !q.alive || q.jailedUntil > 0) { p.task = null; return; }
        if (!conscious(q)) { return setTask(p, 'haul', { target: q.id, until: sim.t + 240 }); }
        if (dist2(p, q) > 1.8) { arrive(p, q, dt, 1.7); return; }
        const before = p.task; confrontArrest(p, q); if (p.task === before) p.task = null; return;
      }
      case 'mourn': { if (!arrive(p, tk.to, dt)) return; p.mood = clamp(p.mood + 0.002); return; }
      case 'flee': { const away = tk.from; if (!away) { p.task = null; return; } const dx = p.x - away.x, dz = p.z - away.z, l = Math.hypot(dx, dz) || 1; stepToward(p, P(p.x + dx / l * 4, p.z + dz / l * 4), 2.4, dt); if (sim.t - tk.t0 > 20) p.task = null; return; }
      case 'jail': return;
      case 'drag': return;
    }
    p.task = null;
  }
  // farming: plant empty plots, tend growing ones, harvest what's ripe (unharvested crops rot)
  function farmWork(p, dt) {
    const tk = p.task, plot = tk.plot != null ? sim.plots[tk.plot] : null;
    if (!plot) {
      const ripe = sim.plots.find(x => x.crop && sim.t >= x.planted + CROPS[x.crop].days * 1440 && !x.busy);
      const empty = sim.plots.find(x => !x.crop && !x.busy), growing = sim.plots.filter(x => x.crop && !x.busy).sort((a, b) => a.tended - b.tended)[0];
      const pk = ripe || empty || growing; if (!pk) return;
      tk.plot = pk.i; pk.busy = p.id; tk.to = pk.at; tk.labor = 0; return;
    }
    if (dist2(p, plot.at) > 0.8) return;
    tk.labor += dt;
    if (plot.crop && sim.t >= plot.planted + CROPS[plot.crop].days * 1440) {
      if (tk.labor < 45) return;
      const c = CROPS[plot.crop], n = Math.round(c.yield * (0.4 + 0.6 * Math.min(1, plot.tended)));
      sim.business.farm.stock[plot.crop] = (sim.business.farm.stock[plot.crop] || 0) + n;
      log('trade', `${p.name} harvests ${n} ${plot.crop} on the farm.`, [p.id]); plot.crop = null;
    } else if (!plot.crop) {
      if (tk.labor < 20) return;
      const farm = sim.business.farm.stock, need = ['grain', 'turnip', 'barley'].sort((a, b) => (farm[a] || 0) - (farm[b] || 0) + rnd(-2, 2))[0];
      plot.crop = need; plot.planted = sim.t; plot.tended = 0;
    } else { if (tk.labor < 20) return; plot.tended = Math.min(1.2, plot.tended + 0.15); }
    plot.busy = null; tk.plot = null;
  }
  sim.farmWork = farmWork;
  function ranchWork(p, dt) {
    const rb = sim.business.ranch; rb.worked = (rb.worked || 0) + dt;
    if (Math.random() > dt / 60) return;
    // a full pasture: one goes to the butcher's block
    for (const sp of Object.keys(STOCK)) {
      const herd = Object.values(sim.animals).filter(a => a.species === sp && a.alive && a.livestock);
      if (herd.length >= STOCK[sp].cap - 1 || (herd.length > 2 && (sim.business.store.stock.meat || 0) < 2 && sp !== 'cow' && Math.random() < 0.3)) {
        const a = herd[0]; a.alive = false; a.state = 'dead'; rb.stock.meat = (rb.stock.meat || 0) + a.meat;
        log('trade', `${p.name} slaughters a ${sp} at the ranch (${a.meat} meat).`, [p.id]); break;
      }
    }
    for (const k of ['eggs', 'milk', 'meat']) if ((rb.stock[k] || 0) > 0 && (sim.business.store.stock[k] || 0) < 12) trade('ranch', 'store', k, Math.min(6, rb.stock[k]));
  }
  sim.ranchWork = ranchWork;
  function leaseTo(p, bid) {
    const b = sim.business[bid]; if (!b || b.owner || p.job !== 'none' && !JOBS[p.job]?.owner === false) return false;
    if (JOBS[p.job]?.owner) return false;
    b.owner = p.id; b.leaseOwed = 0; p.job = OWNER_JOB[bid]; p.worked = 0;
    log('trade', `${fullName(p)} leases ${/^the /i.test(AREAS[bid]?.name || '') ? '' : 'the '}${AREAS[bid]?.name || bid} from the town (${money(LEASE[bid])} a day) and opens for business.`, [p.id]); return true;
  }
  sim.leaseTo = leaseTo;
  // what the smithy wants on its racks: cheap weapons always, armour and bows more once beasts come
  const RACK = { dagger: 3, spear: 3, club: 2, sap: 1, handaxe: 1, shortsword: 2, longsword: 1, battleaxe: 1, warhammer: 1, greataxe: 1, halberd: 1, sling: 2, javelin: 3, shortbow: 1, longbow: 1, lightxbow: 1, heavyxbow: 1, padded: 2, leather: 2, studded: 1, hide: 1, chainshirt: 1, scale: 1, chain: 1, breastplate: 1, lightshield: 2, heavyshield: 1, buckler: 1, arrows: 4, bolts: 3, bullets: 3, javelins: 2 };
  // the leatherworker (Rose): turns pelts into armour at the bench behind the smithy (wolf pelt: leather armour; bear pelt or
  // troll hide: hide armour), buying a pelt from the store when they have none, and selling what they make to the smithy
  const TAN = { wolfpelt: { make: 'leather', hours: 4 }, bearpelt: { make: 'hide', hours: 6 }, trollhide: { make: 'hide', hours: 6 } };
  function tanWork(p, dt) {
    if (!p.tanning) {
      let k = Object.keys(TAN).find(x => (p.items[x] || 0) > 0);
      if (!k) {
        const st = sim.business.store, o = sim.people[st.owner]; k = Object.keys(TAN).find(x => (st.stock[x] || 0) > 0); if (!k) return;
        const pr = priceOf('store', k); if (p.coin < pr) return;
        pay(p, o && o.alive && o !== p ? o : 'town', pr, 'pelt'); st.stock[k]--; p.items[k] = (p.items[k] || 0) + 1;
      }
      p.items[k]--; p.tanning = { from: k, item: TAN[k].make, left: TAN[k].hours * 60 };
    }
    p.tanning.left -= dt; if (p.tanning.left > 0) return;
    const item = p.tanning.item; p.tanning = null;
    const sm = sim.business.smithy, o = sim.people[sm.owner], each = Math.floor(ARMOR[item].price * 0.85);
    if (o && o.alive && o !== p && o.coin >= each) { pay(o, p, each, 'leatherwork'); sm.stock[item] = (sm.stock[item] || 0) + 1; log('trade', `${p.name} finishes ${ARMOR[item].name.toLowerCase()} and sells it to the smithy for ${money(each)}.`, [p.id, o.id]); }
    else if ((ARMOR[p.armor] || ARMOR.none).ac < ARMOR[item].ac) { p.armor = item; log('trade', `${p.name} finishes ${ARMOR[item].name.toLowerCase()} and wears it.`, [p.id]); }
    else { p.items[item] = (p.items[item] || 0) + 1; log('trade', `${p.name} finishes ${ARMOR[item].name.toLowerCase()}.`, [p.id]); }
  }
  function forgeWork(p, dt) {
    const b = sim.business.smithy, fr = (b.forge ||= null);
    if (!b.forge) {
      const scare = sim.beastsSeen || 1;   // the beasts are known to come
      const want = Object.entries(RACK).map(([k, n]) => [k, (n + (scare && (ARMOR[k] || SHIELDS[k] || WEAPONS[k]?.range) ? 1 : 0)) - (b.stock[k] || 0)]).filter(([k, need]) => need > 0 && ((gearOf(k)?.iron || 0) <= (b.stock.iron || 0)) && !(p.noWeapons && WEAPONS[k]) && !(p.forgeOnly && !p.forgeOnly.includes(k)));
      if (!want.length) return;
      const [k] = want.sort((x, y) => y[1] * (gearOf(y[0])?.price || 1) - x[1] * (gearOf(x[0])?.price || 1))[Math.floor(Math.random() * Math.min(3, want.length))];
      const g = gearOf(k) || { iron: 0, hours: 1 };
      b.stock.iron = (b.stock.iron || 0) - (g.iron || 0);
      b.forge = { item: k, left: (g.hours || 1) * 60 };
    }
    b.forge.left -= dt * (p.job === 'apprentice' ? 0.6 : 1);
    if (b.forge.left <= 0) { const k = b.forge.item; b.stock[k] = (b.stock[k] || 0) + 1; b.forge = null; if ((gearOf(k)?.price || 0) >= 1500) log('trade', `${p.name} finishes a ${(gearOf(k) || GOODS[k]).name.toLowerCase()} at the smithy.`, [p.id]); }
  }
  sim.forgeWork = forgeWork;
  function eatFrom(p) {
    for (const k of ['pie', 'meal', 'meat', 'fish', 'bread', 'eggs', 'turnip', 'milk', 'apple', 'berries', 'waterskin']) if (p.items[k] > 0) { p.items[k]--; if (['meat', 'fish', 'berries'].includes(k) && Math.random() < 0.03) expose(p, 'blinding', 'bad ' + k); p.food = Math.min(1, p.food + GOODS[k].food); if (GOODS[k].water) p.water = Math.min(1, (p.water ?? 1) + GOODS[k].water); return true; }
    return false;
  }
  const priceOf = (bid, item) => Math.max(1, Math.round(GOODS[item].price * (sim.business[bid]?.mult?.[item] ?? 1)));
  sim.priceOf = priceOf;
  // ---- DISCOUNTS (Rose: "allow the shopkeepers to decide when to give discounts") -------------------------------------
  // b.discounts = { "<person id>" | guards | militia | friends | town | everyone : fraction off }. A shopkeeper sets them
  // (an AI keeper with "discounts" in its plan; a scripted one by its own nature each morning); a buyer gets the best one
  // that fits them. "town" is the mayor's bulk orders.
  function discountOf(b, p) {
    const d = b && b.discounts; if (!d || !p) return 0;
    const owner = sim.people[b.owner]; let best = d.everyone || 0;
    if (p.town === true && p.id === 'town') best = Math.max(best, d.town || 0);
    else {
      best = Math.max(best, d[p.id] || 0);
      if (isGuard(p)) best = Math.max(best, d.guards || 0);
      if (p.militia || isGuard(p)) best = Math.max(best, d.militia || 0);
      if (owner && owner !== p && p.kind === 'human' && R(owner, p).like > 0.4) best = Math.max(best, d.friends || 0);
    }
    return clamp(best, 0, 0.9);
  }
  sim.discountOf = discountOf;
  const TOWN_BUYER = { id: 'town', town: true };
  // what this shop charges this buyer for one (the shopkeeper's price, their read of the buyer, the buyer's discount)
  const quote = (bid, item, p) => { const b = sim.business[bid]; return Math.max(1, Math.round(priceOf(bid, item) * (p === TOWN_BUYER ? 1 : priceFor(sim.people[b?.owner], p)) * (1 - discountOf(b, p)))); };
  sim.quote = quote;
  const DISC_KEYS = ['guards', 'militia', 'friends', 'town', 'everyone'];
  const discText = d => Object.entries(d || {}).filter(([, v]) => v > 0).map(([k, v]) => `${Math.round(v * 100)}% off for ${DISC_KEYS.includes(k) ? (k === 'town' ? "the town's orders" : k) : (sim.people[k]?.name || k)}`).join(', ');
  sim.discText = discText;
  function discountNews(p) {
    const mine = [], own = JOBS[p.job]?.owner && sim.business[JOBS[p.job].owner];
    for (const b of Object.values(sim.business)) { const x = discountOf(b, p); if (x > 0 && b !== own) mine.push(`${AREAS[b.id]?.name || b.id} ${Math.round(x * 100)}% off`); }
    return [p.militia ? 'You are in the town militia (enlisted by the mayor): when beasts come you stand with the guards, and the town may arm you.' : '',
      mine.length ? `Discounts for you: ${mine.join(', ')}.` : '',
      own ? `Your discounts at ${AREAS[own.id]?.name || own.id}: ${discText(own.discounts) || 'none'} (set them with "discounts" in your plan).` : ''].filter(Boolean).join(' ');
  }
  // a scripted shopkeeper's own mind on it, each morning: friends if not greedy, the guards and the militia if loyal (more
  // before the last night), the town's orders, and everyone on the last days if they're the generous kind
  function scriptDiscounts() {
    const last = sim.day >= (sim.genDays || 7) - 1;
    for (const b of Object.values(sim.business)) {
      const o = sim.people[b.owner]; if (!o || !o.alive || o.brain !== 'script') continue;
      const t = o.traits, nd = { friends: t.greed < 0.5 ? 0.1 : 0, guards: t.loyalty > 0.55 ? (last ? 0.25 : 0.1) : 0, militia: t.loyalty > 0.55 ? (last ? 0.25 : 0.1) : 0, town: t.loyalty > 0.5 ? 0.15 : 0.05, everyone: last && t.loyalty > 0.7 && t.greed < 0.4 ? 0.1 : 0 };
      const was = JSON.stringify(b.discounts || {});
      b.discounts = Object.fromEntries(Object.entries(nd).filter(([, v]) => v > 0));
      if (JSON.stringify(b.discounts) !== was && Object.keys(b.discounts).length) log('trade', `${o.name} at ${/^the /i.test(AREAS[b.id]?.name || '') ? '' : 'the '}${AREAS[b.id]?.name || b.id} offers ${discText(b.discounts)}.`, [o.id]);
    }
  }

  // ---- THE MILITIA AND THE TOWN'S ARMOURY (Rose: "allow the mayor the option to batch buy things for militias") ----------
  // The mayor enlists townsfolk ("militia": ids, "-id" to discharge) and buys for the guards or the militia from the town's
  // shops with the treasury ("arm"), at the shopkeeper's price less their "town" discount. What a shop hasn't got is paid
  // for now and made overnight (delivered at the next dawn's books).
  function issue(k, list) {
    const g = GOODS[k]; if (!list.length || !g) return null;
    let q;
    if (g.weapon) q = list.slice().sort((a, b) => avgDmg(a.weapon) - avgDmg(b.weapon))[0];
    else if (g.armor) q = list.slice().sort((a, b) => (ARMOR[a.armor] || ARMOR.none).ac - (ARMOR[b.armor] || ARMOR.none).ac)[0];
    else if (g.shield) q = list.find(x => !x.shield || x.shield === 'none') || list[0];
    else q = list.slice().sort((a, b) => (a.items[k] || 0) - (b.items[k] || 0))[0];
    if (g.weapon) equipIfBetter(q, k);
    else if (g.armor) { if ((ARMOR[k].ac || 0) > (ARMOR[q.armor] || ARMOR.none).ac) { if (q.armor && q.armor !== 'none') q.items[q.armor] = (q.items[q.armor] || 0) + 1; q.armor = k; } else q.items[k] = (q.items[k] || 0) + 1; }
    else if (g.shield) { if (!q.shield || q.shield === 'none') q.shield = k; else q.items[k] = (q.items[k] || 0) + 1; }
    else q.items[k] = (q.items[k] || 0) + (g.bundle || 1);
    return q;
  }
  const armList = who => Array.isArray(who) ? who.map(id => sim.people[id]).filter(q => q?.alive && q.kind === 'human')
    : living().filter(q => q.kind === 'human' && !q.town && q.alive && (who === 'militia' ? (q.militia || isGuard(q)) : isGuard(q)));
  function armTown(m, spec, out) {
    if (!spec || typeof spec !== 'object' || !spec.items || typeof spec.items !== 'object') return;
    const list = armList(spec.who || 'guards'), whoSaid = Array.isArray(spec.who) ? list.map(q => q.name).join(', ') : spec.who === 'militia' ? 'the militia' : 'the guards';
    if (!list.length) return out.push(`nobody to arm (${whoSaid})`);
    const got = []; let spent = 0;
    for (const [k0, n0] of Object.entries(spec.items)) {
      const k = Object.keys(GOODS).find(x => x === k0 || GOODS[x].name.toLowerCase() === String(k0).toLowerCase());
      const n = Math.max(0, Math.min(40, Math.floor(+n0 || 0)));
      if (!k || !n || !GOODS[k].shop || !sim.business[GOODS[k].shop]) continue;
      const bid = GOODS[k].shop, b = sim.business[bid], owner = sim.people[b.owner];
      if (!owner || !owner.alive) { out.push(`nobody runs ${AREAS[bid]?.name || bid} to sell ${GOODS[k].name.toLowerCase()}`); continue; }
      const unit = quote(bid, k, TOWN_BUYER);
      let now = 0, later = 0;
      for (let i = 0; i < n && sim.treasury >= unit; i++) {
        sim.treasury -= unit; owner.coin += unit; b.sales += unit; spent += unit; sim.flow.out.arms = (sim.flow.out.arms || 0) + unit;
        if ((b.stock[k] || 0) > 0) { b.stock[k]--; issue(k, list); now++; } else { (b.backorder ||= []).push({ k, to: list.map(q => q.id) }); later++; }
      }
      if (now + later) got.push(`${now + later} ${GOODS[k].name.toLowerCase()} from ${AREAS[bid]?.name || bid} at ${money(unit)}${later ? ` (${later} to be made overnight)` : ''}`);
      if (now + later < n) out.push(`the treasury couldn't cover all the ${GOODS[k].name.toLowerCase()}`);
    }
    if (got.length) { out.push(`arms ${whoSaid}: ${got.join('; ')} (${money(spent)} from the treasury)`); for (const q of list) remember(q, { text: `The mayor armed ${whoSaid === 'the guards' ? 'the guards' : 'us'}: ${got.join('; ')}.`, big: true }); }
  }
  sim.armTown = armTown;
  // ---- MONEY POOLS (Rose: "allow them to pool their money") ---------------------------------------------------------
  // Anyone starts a pool to buy something for a group ("pool 4 cure for the militia"); anyone chips in ("chip in 2 gp to
  // cure"). When the pot covers an item at its shop's price (less the shop's discount for everyone) it is bought and handed
  // to the group (issue(): weapons and armour to the worst equipped, the rest evenly); what the shop lacks is made
  // overnight. When the pool is filled, what's left goes back to those who chipped in, by share.
  sim.pools = sim.pools || [];
  const poolGroup = (pl) => pl.for === 'chippers' ? Object.keys(pl.chip).map(id => sim.people[id]).filter(q => q?.alive)
    : pl.for === 'everyone' ? living().filter(q => q.kind === 'human' && !q.town && q.alive)
    : Array.isArray(pl.for) ? pl.for.map(id => sim.people[id]).filter(q => q?.alive) : armList(pl.for);
  const forWords = pl => pl.for === 'chippers' ? 'those who chip in' : pl.for === 'everyone' ? 'everyone in town' : Array.isArray(pl.for) ? pl.for.map(id => sim.people[id]?.name).filter(Boolean).join(', ') : 'the ' + pl.for;
  const poolUnit = pl => { const b = sim.business[GOODS[pl.item].shop]; return Math.max(1, Math.round(priceOf(b.id, pl.item) * (1 - (b.discounts?.everyone || 0)))); };
  const openPools = () => sim.pools.filter(pl => !pl.done);
  sim.openPools = openPools;
  function startPool(p, text) {
    const t = String(text || '').toLowerCase(), n = Math.max(1, Math.min(40, parseInt((t.match(/\b(\d+)\b/) || [])[1] || '1', 10)));
    const item = Object.keys(GOODS).find(k => GOODS[k].shop && sim.business[GOODS[k].shop] && (new RegExp('\\b' + k + '\\b').test(t) || t.includes(GOODS[k].name.toLowerCase()))) || (/draught|potion|heal/.test(t) ? 'cure' : /fire/.test(t) ? 'alchfire' : /kit/.test(t) ? 'healkit' : null);
    if (!item) return 'Pool for what? Name something a shop sells (e.g. "pool 4 cure for the militia").';
    const forWho = /militia/.test(t) ? 'militia' : /guard/.test(t) ? 'guards' : /everyone|town|all/.test(t) ? 'everyone' : /\b(me|us|ourselves|those|chip)/.test(t) ? 'chippers' : (() => { const q = findPerson(p, t.split(/\bfor\b/)[1] || ''); return q ? [q.id] : 'chippers'; })();
    if (openPools().length >= 6) return 'There are enough pools open already; chip in to one of them.';
    const pl = { id: 'pool' + (sim.pools.length + 1), item, n, for: forWho, by: p.id, coin: 0, chip: {}, bought: 0, day: sim.day };
    sim.pools.push(pl);
    log('trade', `${p.name} starts a money pool: ${n} ${GOODS[item].name.toLowerCase()} for ${forWords(pl)} (about ${money(poolUnit(pl) * n)}). Anyone can chip in.`, [p.id]);
    for (const q of living()) if (q !== p && q.kind === 'human' && !q.town && dist2(q, p) < 30) remember(q, { text: `${p.name} started a money pool: ${n} ${GOODS[item].name.toLowerCase()} for ${forWords(pl)}. Chip in with "chip in <amount> to ${item}".` });
    return `You start a pool for ${n} ${GOODS[item].name.toLowerCase()} for ${forWords(pl)}.`;
  }
  function chipIn(p, text, amount) {
    const t = String(text || '').toLowerCase(), pools = openPools();
    if (!pools.length) return 'There is no money pool open. Start one: "pool <number> <item> for <who>".';
    const pl = pools.find(x => t.includes(x.item) || t.includes(GOODS[x.item].name.toLowerCase()) || t.includes(x.id)) || pools[0];
    const amt = Math.floor(amount ?? parseMoney(t.replace(/\bto\b.*$/, ''), 0));
    const n = Math.min(amt, p.coin); if (!(n > 0)) return p.coin > 0 ? 'Chip in how much? (e.g. "chip in 5 sp to cure")' : 'You have no coin to chip in.';
    p.coin -= n; pl.coin += n; pl.chip[p.id] = (pl.chip[p.id] || 0) + n;
    log('trade', `${p.name} chips ${money(n)} into the pool for ${GOODS[pl.item].name.toLowerCase()} (${money(pl.coin)} of ${money(poolUnit(pl) * (pl.n - pl.bought))}).`, [p.id]);
    fillPool(pl);
    return `You chip ${money(n)} into the pool for ${GOODS[pl.item].name.toLowerCase()}.`;
  }
  function fillPool(pl) {
    const b = sim.business[GOODS[pl.item].shop], owner = sim.people[b?.owner]; if (!b || !owner || !owner.alive) return;
    const unit = poolUnit(pl), group = poolGroup(pl), got = [];
    while (pl.bought < pl.n && pl.coin >= unit) {
      pl.coin -= unit; pl.bought++; owner.coin += unit; b.sales += unit; b.owed += unit * sim.taxRate;
      if ((b.stock[pl.item] || 0) > 0) { b.stock[pl.item]--; const q = issue(pl.item, group.length ? group : armList('guards')); if (q) got.push(q.name); }
      else (b.backorder ||= []).push({ k: pl.item, to: group.map(q => q.id) });
    }
    if (got.length) log('trade', `The pool buys ${got.length} ${GOODS[pl.item].name.toLowerCase()} at ${money(unit)} each: to ${got.join(', ')}.`, []);
    if (pl.bought >= pl.n) {
      pl.done = true; const left = pl.coin, tot = Object.values(pl.chip).reduce((a, x) => a + x, 0) || 1; pl.coin = 0;
      for (const [id, c] of Object.entries(pl.chip)) { const q = sim.people[id]; if (q?.alive) q.coin += Math.floor(left * c / tot); }
      log('trade', `The money pool for ${pl.n} ${GOODS[pl.item].name.toLowerCase()} is filled (${Object.keys(pl.chip).length} chipped in)${left ? '; what was left goes back' : ''}.`, []);
      for (const id of Object.keys(pl.chip)) { const q = sim.people[id]; if (q?.alive) remember(q, { text: `The money pool I chipped into bought ${pl.n} ${GOODS[pl.item].name.toLowerCase()} for ${forWords(pl)}.`, big: true }); }
    }
  }
  function poolNews() { const o = openPools(); return o.length ? `Money pools open: ${o.map(pl => `${pl.n - pl.bought} ${GOODS[pl.item].name.toLowerCase()} for ${forWords(pl)}, ${money(pl.coin)} of ${money(poolUnit(pl) * (pl.n - pl.bought))} (chip in: "chip in <amount> to ${pl.item}")`).join('; ')}.` : ''; }
  // plain brains: the loyal with coin to spare chip in each morning; one of them starts a draught pool for everyone if none is open
  function poolsDaily() {
    const plain = living().filter(q => q.kind === 'human' && !q.town && q.brain === 'script' && q.alive);
    if (!openPools().length && sim.day >= 1) { const f = plain.filter(q => q.traits.loyalty > 0.6 && q.coin + (q.home != null ? HOUSES[q.home].stash : 0) > 100).sort((a, b) => b.coin - a.coin)[0]; if (f) startPool(f, '1 cure for everyone'); }
    for (const q of plain) {
      const st = q.home != null ? HOUSES[q.home] : null, spare = q.coin + (st?.stash || 0) - 60;
      if (!(spare > 10 && q.traits.loyalty > 0.45 && q.traits.greed < 0.8 && openPools().length)) continue;
      const n = Math.floor(spare * (0.15 + 0.25 * q.traits.loyalty)); if (q.coin < n && st) { const m = Math.min(st.stash, n - q.coin); st.stash -= m; q.coin += m; }
      chipIn(q, openPools()[0].item, n);
    }
  }
  // the shops' overnight work for the town's orders
  function deliverOrders() {
    for (const b of Object.values(sim.business)) {
      if (!b.backorder?.length) continue;
      const done = [];
      for (const o of b.backorder.splice(0)) { const list = o.to.map(id => sim.people[id]).filter(q => q?.alive); const q = issue(o.k, list.length ? list : armList('guards')); if (q) done.push(GOODS[o.k].name.toLowerCase()); }
      if (done.length) log('trade', `${AREAS[b.id]?.name || b.id} delivers the town's order: ${done.length} ${[...new Set(done)].join(', ')}.`, []);
    }
  }
  // what the mayor can buy to arm people, at the town's price
  function armouryNews() {
    const mil = living().filter(q => q.militia && q.alive), rows = [];
    for (const bid of ['smithy', 'apothecary', 'store']) { const b = sim.business[bid]; if (!b?.owner) continue; const items = Object.entries(b.stock).filter(([k, n]) => n > 0 && GOODS[k] && (GOODS[k].weapon || GOODS[k].armor || GOODS[k].shield || ['cure', 'alchfire', 'healkit', 'bolts', 'arrows', 'bullets', 'javelins', 'torch'].includes(k))).map(([k, n]) => `${k} ${money(quote(bid, k, TOWN_BUYER))} (${n})`); if (items.length || bid === 'apothecary') rows.push(`${AREAS[bid].name}: ${items.join(', ') || 'nothing in stock (it can make to order)'}${b.discounts?.town ? ` [${Math.round(b.discounts.town * 100)}% off for the town]` : ''}`); }
    return ` Militia: ${mil.map(q => `${q.name} (${q.id})`).join(', ') || 'nobody enlisted'}. To arm them or the guards (the town's price, stock): ${rows.join('; ') || 'no shops open'}.`;
  }

  // ---- ALCHEMIST'S FIRE (SRD: a ranged touch attack, 10 ft increment, 1d6 fire, 1 to those beside it, 1d6 more next round)
  function firebomb(f, a, t) {
    if (!(a.items.alchfire > 0)) return; a.items.alchfire--;
    if (threatened(f, a).length) provoke(f, a); if (!conscious(a) || !t.alive) return;
    const ft = dist2(a, t) / 0.3048, bonus = babOf(a) + mod(a.st.dex) - 2 * Math.floor(ft / 10), ac = touchAc(t), r = d(20);
    if (r === 1 || (r !== 20 && r + bonus < ac)) return logF(f, `${a.name}'s flask of alchemist's fire misses ${t.name} (${r + bonus} vs touch AC ${ac}) and burns out on the ground.`);
    const dmg = roll(1, 6); t.burnedRound = f.round; t.onFire = f.round + 1; t.burnBy = a.id; hurt(t, dmg, false, a);
    for (const q of f.order.map(body)) if (q && q !== t && q.alive && dist2(q, t) <= 1.6) { hurt(q, 1, false, a); if (q.regen) q.burnedRound = f.round; }
    logF(f, `${a.name} hits ${t.name} with alchemist's fire: ${dmg} fire (${r + bonus} vs touch AC ${ac}), and it burns on${t.regen ? '; the wounds stop knitting' : ''}. ${status(t)}`);
  }
  function buy(p, shopId, item, n = 1) {
    const b = sim.business[shopId], g = GOODS[item]; if (!b || !g || (b.stock[item] || 0) < n) return false;
    const owner0 = sim.people[b.owner], cost = Math.max(1, Math.round(priceOf(shopId, item) * n * priceFor(owner0, p) * (1 - discountOf(b, p))));
    if (p.coin < cost) { if (owner0 && seen(owner0, p).worth > 40) glimpse(owner0, p, 10, 0.3); return false; }   // nobody spends what they don't have (and the shopkeeper notices)
    const owner = sim.people[b.owner];
    pay(p, owner && owner.alive ? owner : 'town', cost); b.stock[item] -= n; b.sales += cost; b.owed += cost * sim.taxRate;
    if (cost >= 4) showWealth(p, cost * 8);
    if (b.debt && owner && owner.alive) for (const [sid, due] of Object.entries(b.debt)) { const sup = sim.people[sid]; if (!sup || !sup.alive) { delete b.debt[sid]; continue; } const n2 = Math.min(due, Math.max(0, owner.coin - 30)); if (n2 > 0) { pay(owner, sup, n2, 'credit repaid'); b.debt[sid] -= n2; if (b.debt[sid] <= 0) delete b.debt[sid]; } }
    if (item === 'finery') { p.items.finery = 1; showWealth(p, 90, 0.3); return true; }
    if (g.bundle) { p.items[item] = (p.items[item] || 0) + g.bundle * n; return true; }
    if (g.shield) { if (p.shield && p.shield !== 'none') p.items[p.shield] = (p.items[p.shield] || 0) + 1; p.shield = g.shield; showWealth(p, g.price * 0.4); return true; }
    if (g.weapon && p.weapon !== 'fists' && p.weapon !== g.weapon) p.items[p.weapon] = (p.items[p.weapon] || 0) + 1;
    if (g.armor && p.armor !== 'none' && p.armor !== g.armor) p.items[p.armor] = (p.items[p.armor] || 0) + 1;
    if (g.weapon || g.armor) showWealth(p, g.price * 0.4, 0.1);
    if (g.weapon) p.weapon = g.weapon; else if (g.armor) p.armor = g.armor; else if (item === 'treats') p.items.treats = (p.items.treats || 0) + 3 * n; else p.items[item] = (p.items[item] || 0) + n;
    if (item === 'ale') { p.mood = clamp(p.mood + 0.1); p.items.ale--; p.water = Math.min(1, (p.water ?? 1) + 0.4); }
    if (b.insurance && sim.gangs[b.insurance]) { const cut = Math.ceil(cost * 0.2); const boss = sim.people[sim.gangs[b.insurance].boss]; if (owner && boss) pay(owner, boss, cut); }
    return true;
  }
  sim.buy = buy;
  function trade(fromBid, toBid, item, n) {   // one business buys from another, at the seller's price, if it can pay
    const a = sim.business[fromBid], b = sim.business[toBid], seller = sim.people[a.owner], buyer = sim.people[b.owner];
    if (!seller || !buyer || !seller.alive || !buyer.alive) return 0;
    const each = priceOf(fromBid, item), cash = Math.min(n, a.stock[item] || 0, Math.floor(buyer.coin / each));
    // a cash-poor shop takes the rest on credit (food only): it pays the supplier back as it sells
    const credit = GOODS[item]?.food && toBid === 'store' && (b.debt?.[a.owner] || 0) < 20 ? Math.min(n, a.stock[item] || 0) - cash : 0;
    n = cash + Math.max(0, credit); if (n <= 0) return 0;
    if (credit > 0) { (b.debt ||= {})[a.owner] = (b.debt[a.owner] || 0) + credit * each; }
    const cost = cash * each; pay(buyer, seller, cost); a.stock[item] -= n; b.stock[item] = (b.stock[item] || 0) + n; a.sales += cost; a.owed += cost * sim.taxRate;
    return n;
  }

  // ---- hunting -------------------------------------------------------------
  function doHunt(p, dt) {
    const tk = p.task;
    let prey = tk.prey && sim.animals[tk.prey];
    if (!prey || !prey.alive) { prey = Object.values(sim.animals).filter(a => a.game && a.alive && a.species === tk.species).sort((a, b) => dist2(p, a) - dist2(p, b))[0]; if (!prey) { disband(p); p.task = null; return; } tk.prey = prey.id; }
    const reach = WEAPONS[p.weapon].range ? 14 : 1.6;
    if (dist2(p, prey) > reach) { arrive(p, prey, dt, areaOf(p) === 'wood' ? 1.3 : 1.6); return; }
    const sneak = d(20) + p.skills.sneak, spot = d(20) + 4;
    const f = startFight(p, prey, { mode: 'lethal', why: 'hunting', quiet: true });
    if (f && sneak >= spot) { prey.flatfooted = true; prey.ambushed = f.id; }
    p.task = null;
  }
  // a caravan: load up, hire an escort if the road worries you, go to Marrowford, trade, come home and sell
  function startCaravan(p) {
    const own = JOBS[p.job]?.owner, cargo = {};
    if (own === 'tavern') { const n = Math.min(12, sim.business.tavern.stock.ale || 0); if (n) { sim.business.tavern.stock.ale -= n; cargo.ale = n; } }
    if (own === 'smithy') for (const k of ['dagger', 'club', 'shortsword']) { const n = Math.min(2, sim.business.smithy.stock[k] || 0); if (n) { sim.business.smithy.stock[k] -= n; cargo[k] = n; } }
    for (const [k, n] of Object.entries(cargo)) p.items[k] = (p.items[k] || 0) + n;
    if (roadDanger(p) > 0 || p.traits.caution > 0.6) gatherParty(p, 'caravan escort', Infinity, true);
    const ev = { id: 'cv' + (++sim.rec.crimes), caravan: true, actor: p.id, t: sim.t, type: 'caravan' }; sim.events.push(ev);
    log('trade', `${p.name} sets out for Marrowford with a cart${Object.keys(cargo).length ? ' (' + Object.entries(cargo).map(([k, n]) => n + ' ' + k).join(', ') + ')' : ''}${p.party ? ' and an escort' : ''}.`, [p.id]);
    return setTask(p, 'caravan', { phase: 'out', to: SPOTS.marrowMarket, until: sim.t + 900 });
  }
  function doCaravan(p, dt) {
    const tk = p.task;
    if (tk.phase === 'out') {
      if (!arrive(p, SPOTS.marrowMarket, dt, 1.8)) return;
      let got = 0;
      for (const [k, price] of Object.entries(MARROW.buys)) { const n = p.items[k] || 0; if (!n) continue; const mv = sim.market.moved[k] || 0, each = Math.max(1, Math.round(price * Math.pow(0.95, mv))); p.items[k] = 0; p.coin += n * each; got += n * each; sim.market.moved[k] = mv + n; }
      // buy what home is short of
      const want = [['grain', priceOf('farm', 'grain')], ['meat', priceOf('store', 'meat')], ['turnip', priceOf('store', 'turnip')]].sort((a, b) => (b[1] - MARROW.sells[b[0]]) - (a[1] - MARROW.sells[a[0]]));
      let spent = 0, bought = {};
      for (const [k] of want) { const mv = -(sim.market.moved[k] || 0); while (p.coin > 30 && (sim.market.stock[k] || 0) > 0 && Object.values(bought).reduce((a, b) => a + b, 0) < 24) { const each = Math.max(1, Math.round(MARROW.sells[k] * Math.pow(1.04, mv + (bought[k] || 0)))); if (each > priceOf(k === 'grain' ? 'farm' : 'store', k)) break; p.coin -= each; spent += each; sim.market.stock[k]--; bought[k] = (bought[k] || 0) + 1; } }
      for (const [k, n] of Object.entries(bought)) { p.items[k] = (p.items[k] || 0) + n; sim.market.moved[k] = (sim.market.moved[k] || 0) - n; }
      log('trade', `${p.name} trades in Marrowford: sold for ${money(got)}, bought ${Object.entries(bought).map(([k, n]) => n + ' ' + k).join(', ') || 'nothing'} (${money(spent)}).`, [p.id]);
      tk.phase = 'home'; tk.until = sim.t + 900; return;
    }
    const dest = SPOTS[p.job === 'baker' ? 'bakery' : p.job === 'innkeep' ? 'tavern' : 'store'];
    if (!arrive(p, dest, dt, 1.8)) return;
    // sell the cargo to the town's businesses at their price (or stock your own)
    let earned = 0;
    for (const k of ['grain', 'meat', 'turnip', 'fish', 'eggs', 'apple', 'bearpelt', 'wolfpelt']) {
      const n = Math.max(0, (p.items[k] || 0) - (p.task.fence && k !== 'grain' ? 1 : 0)); if (!n) continue;
      const bid = k === 'grain' ? 'bakery' : 'store', b = sim.business[bid], owner = sim.people[b.owner];
      if (owner === p) { b.stock[k] = (b.stock[k] || 0) + n; p.items[k] = 0; continue; }
      if (!owner || !owner.alive) continue;
      const each = Math.max(1, Math.floor(priceOf(k === 'grain' ? 'farm' : 'store', k) * 0.85)), m = Math.min(n, Math.floor(owner.coin / each));
      if (m > 0) { pay(owner, p, m * each, 'food sold'); b.stock[k] = (b.stock[k] || 0) + m; p.items[k] -= m; earned += m * each; }
    }
    if (earned || !p.task.fence) log('trade', p.task.fence ? `${p.name} sells ${money(earned)} of food to the store, no questions asked.` : `${p.name}'s caravan is home${earned ? ' and sells its load for ' + money(earned) : ''}.`, [p.id]);
    disband(p); p.task = null;
  }
  // bandits wait on the road, hidden, for anyone carrying cargo or coin
  function doAmbush(p, dt) {
    const tk = p.task;
    if (!arrive(p, tk.to, dt, 1.6)) return;
    p.state = 'lurk';
    const mark = living().find(q => q !== p && q.party !== p.party && conscious(q) && areaOf(q) === 'road' && dist2(q, p) < 14 && (Object.entries(q.items).some(([k, n]) => n > 0 && (MARROW.sells[k] || MARROW.buys[k])) || q.coin > 100));
    if (!mark) return;
    const ev = { id: 'amb' + (++sim.rec.crimes), road: true, type: 'ambush', actor: p.id, victim: mark.id, t: sim.t }; sim.events.push(ev);
    log('crime', `${p.name}${p.party ? "'s crew" : ''} springs an ambush on ${mark.name} on the Old Road!`, [p.id, mark.id]);
    for (const q of [mark, ...living().filter(x => x.party && x.party === mark.party && x !== mark)]) remember(q, { ambush: true, by: p.id });
    startFight(p, mark, { mode: p.traits.aggression > 0.75 ? 'lethal' : 'nonlethal', why: 'ambush' });
    p.task = null;
  }

  // a party: a leader and the people who follow them, into a hunt or a fight
  let partySeq = 0;
  const DANGER = { hunt: 1, 'hunt party': 1, 'caravan escort': 2, escort: 2, bandit: 3, crime: 3, company: 0 };
  // how q feels about coming along with L: { free: will do it as a favour, ask: their price, no: won't at any price }
  function partyTerms(q, L, purpose) {
    if (!free(q) || q.party || q.jailedUntil > 0 || q.town === 'marrow' || !conscious(q)) return { no: 'busy' };
    const r = R(q, L), danger = DANGER[purpose] ?? 1, crooked = purpose === 'bandit' || purpose === 'crime';
    if (r.like < -0.3 || r.fear > 0.5 && r.like < 0) return { no: 'dislike' };
    if (crooked && q.traits.honesty > 0.55) return { no: 'honest' };
    const busy = inShift(q.job, H()) && JOBS[q.job]?.from != null ? wageOf(q) : 0;
    const will = r.like * 1.2 + r.trust * 0.4 + (purpose.startsWith('hunt') && q.food < 0.5 ? 0.4 : 0) + (q.spouse === L.id ? 0.8 : 0) + (q.gang && q.gang === L.gang ? 0.4 : 0) + q.traits.sociability * 0.2 - danger * q.traits.caution * 0.25 - busy * 0.1 + rnd(-0.15, 0.15);
    if (will > 0.6 && q.job !== 'mercenary') return { free: true };
    const ask = q.job === 'mercenary' ? mercRate(q) : Math.max(10, 10 * Math.round(busy + danger * q.traits.caution * 2 + 1 - r.like * 4 + q.traits.greed * 2 - Math.min(2, seen(q, L).worth / 80) + (q.traits.greed > 0.6 && seen(q, L).worth > 80 ? 2 : 0)));
    if (danger * q.traits.caution > 2.2 && might(q) < 4) return { no: 'scared', ask };
    return { ask };
  }
  sim.partyTerms = partyTerms;
  function joinParty(q, L, purpose, paid = 0) {
    L.party ||= 'party' + (++partySeq);
    if (paid) pay(L, q, paid, 'party pay');
    q.party = L.party;
    if (q.brain !== 'human') setTask(q, 'follow', { leader: L.id, until: sim.t + 480 });
    remember(q, { text: `${L.name} took me along (${purpose}${paid ? ', paid ' + money(paid) : ', as a favour'})` });
  }
  sim.joinParty = joinParty;
  function gatherParty(L, purpose, max = Infinity, hire = false) {   // Rose: no limit on party size
    const id = 'party' + (++partySeq);
    L.party = id; let n = 0;
    if (hire) for (const q of living().filter(q => q !== L && q.job === 'mercenary' && free(q) && !q.party && q.brain !== 'human').sort((a, b) => mercRate(b) - mercRate(a))) {
      if (n >= max) break;
      const rate = mercRate(q), crooked = purpose === 'bandit';
      if (L.coin < rate || (crooked && q.traits.honesty > 0.5)) continue;
      pay(L, q, rate); q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 480 }); n++;
      log('life', `${L.name} hires ${q.name}, a sellsword, for ${money(rate)}${crooked ? ' (bandit work)' : ''}.`, [L.id, q.id]);
    }
    for (const q of living().filter(q => q !== L && q.kind === 'human' && free(q) && !q.party && q.brain !== 'human' && q.town !== 'marrow' && dist2(q, L) < 30 && R(q, L).like > 0.15 && (purpose !== 'bandit' || q.traits.honesty < 0.45)).sort((a, b) => R(b, L).like - R(a, L).like)) {
      if (n >= max) break;
      const busy = q.task?.kind === 'work' ? wageOf(q) : 0;
      const terms = partyTerms(q, L, purpose); if (terms.no) continue;
      const worth = ((DANGER[purpose] ?? 1) * 2 + 1) * 10;
      if (terms.free) { q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 300 }); n++; }
      else if (terms.ask <= worth && L.coin >= terms.ask + 20) { pay(L, q, terms.ask, 'party pay'); q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 300 }); n++; log('life', `${L.name} pays ${q.name} ${money(terms.ask)} to come along.`, [L.id, q.id]); }
    }
    const me = sim.people.player;
    if (me && me.alive && !me.party && !sim.pendingInvite && dist2(me, L) < 30 && R(L, me).like > 0.1 && (purpose !== 'bandit' || R(L, me).trust > 0.4)) {
      const offer = R(L, me).like > 0.4 ? 0 : Math.min(L.coin, (DANGER[purpose] ?? 1) * 20);
      sim.pendingInvite = { leader: L.id, party: id, purpose, offer, t: sim.t };
      sim.onInvite?.(sim.pendingInvite);
    }
    if (n >= 2 && L.brain === 'script' && Math.random() < 0.5 + L.traits.ambition * 0.4) setFormation(L, pick(FORMATION_NAMES));
    if (n) log('life', `${L.name} gathers a ${purpose} party: ${living().filter(q => q.party === id && q !== L).map(q => q.name).join(', ')}.`, [L.id]);
    else if (!sim.pendingInvite || sim.pendingInvite.party !== id) L.party = null;
    return n;
  }
  sim.gatherParty = gatherParty;
  // ---- FORMATIONS (Rose): the party's leader chooses how the party walks around them. Followers keep their slot,
  // turned to the leader's heading; 'loose' is the old way (stay within a couple of metres).
  const FORMATION_NAMES = ['column', 'line', 'wedge', 'ring', 'loose'];
  sim.formations = {};   // party id -> formation name
  const followersOf = L => L.party ? living().filter(q => q !== L && q.party === L.party) : [];
  const leadsParty = p => !!p.party && p.task?.kind !== 'follow' && followersOf(p).some(q => q.task?.kind === 'follow' && q.task.leader === p.id);
  function formationSpot(p, L) {
    const f = sim.formations[L.party]; if (!f || f === 'loose') return null;
    const mates = followersOf(L).sort((a, b) => (a.id < b.id ? -1 : 1)), i = mates.indexOf(p), n = mates.length; if (i < 0) return null;
    const gap = 1.5, k = Math.floor(i / 2) + 1, side = i % 2 ? -1 : 1; let fw = 0, rt = 0;
    if (f === 'column') fw = -gap * (i + 1);                                   // single file behind the leader
    else if (f === 'line') rt = side * gap * k;                                 // abreast, the leader in the middle
    else if (f === 'wedge') { fw = -gap * k; rt = side * gap * k; }             // a V behind the leader
    else if (f === 'ring') { const r = Math.max(1.8, gap * n / (2 * Math.PI)), a = 2 * Math.PI * i / n; fw = Math.cos(a) * r; rt = Math.sin(a) * r; }   // all round the leader
    const y = L.yaw || 0, sn = Math.sin(y), cs = Math.cos(y);
    const spot = P(L.x + sn * fw + cs * rt, L.z + cs * fw - sn * rt);
    return walkable(spot) ? spot : null;   // no room (a wall, a doorway): just keep close
  }
  function setFormation(L, word) {
    const w = String(word || '').toLowerCase();
    const f = FORMATION_NAMES.find(x => w.includes(x)) || (/circle|around|surround/.test(w) ? 'ring' : /file|single|behind/.test(w) ? 'column' : /abreast|wall|side by side/.test(w) ? 'line' : /\bv\b|arrow|spear/.test(w) ? 'wedge' : null);
    if (!f) return `Formations: ${FORMATION_NAMES.join(', ')}.`;
    if (!L.party || !followersOf(L).length) return 'You lead no party.';
    if (L.task?.kind === 'follow') return "Only the party's leader sets the formation.";
    sim.formations[L.party] = f;
    log('life', `${L.name}'s party falls into ${f === 'loose' ? 'a loose group' : 'a ' + f} (${followersOf(L).length + 1} strong).`, [L.id]);
    return `Your party falls into ${f === 'loose' ? 'a loose group' : 'a ' + f}.`;
  }
  sim.setFormation = setFormation; sim.formationSpot = formationSpot; sim.FORMATIONS = FORMATION_NAMES;
  function disband(L) { if (!L.party) return; for (const q of living()) if (q.party === L.party && q !== L) { q.party = null; if (q.task?.kind === 'follow') q.task = null; } delete sim.formations[L.party]; L.party = null; }
  sim.disband = disband;

  // ---- talking -------------------------------------------------------------
  const thinks = p => p.brain === 'folk-ai' || p.brain === 'mayor-ai';
  function converse(p, q) {
    if (q.brain === 'human') return;
    // two AI-minded people meeting actually talk (each speaks from their own mind)
    if (thinks(p) && thinks(q) && sim.onChat && sees(p, q) && sees(q, p) && !(p.cd?.chat > sim.t) && !(q.cd?.chat > sim.t)) { cool(p, 'chat', 480); cool(q, 'chat', 480); sim.onChat({ a: p.id, b: q.id }); }
    else if (!thinks(p) && sees(p, q) && !(p.cd?.chat > sim.t) && Math.random() < 0.4) { cool(p, 'chat', 120); const l1 = plainSay(p, q, null); if (l1 && !thinks(q)) plainSay(q, p, l1); }
    bump(p, q, 'like', 0.02 * p.traits.sociability); bump(q, p, 'like', 0.02 * q.traits.sociability);
    bump(p, q, 'trust', 0.01); bump(q, p, 'trust', 0.01);
    { const about = pick(living().filter(x => x !== p && x !== q && x.kind === 'human' && p.rel[x.id]?.worth != null)); if (about && R(q, p).trust > 0.3) glimpse(q, about, seen(p, about).worth, 0.15 * R(q, p).trust); }
    // pass on news (true) or a lie
    const news = p.memory.filter(m => m.ev && !q.knows?.has(m.ev) && m.actor !== q.id).slice(-1)[0];
    if (news && Math.random() < 0.6) { const ev = sim.events.find(e => e.id === news.ev) || { id: news.ev, type: news.type, actor: news.actor, victim: news.victim, lie: news.lie }; if (R(q, p).trust > 0.25) perceive(q, ev, 'told', p); }
    if (p.warnAbout && p.warnAbout.who !== q.id && Math.random() < 0.5) { claim(p, q, { id: 'c' + Math.random(), kind: 'liar', subject: p.warnAbout.who, lie: !p.warnAbout.wasLie }); p.warnAbout = null; }
    else if (Math.random() > p.traits.honesty && Math.random() < 0.3 && !(p.cd?.lie > sim.t)) {
      // a liar sticks to one story about one enemy for a while, and tells it now and then (not to everyone at once)
      if (!p.story || sim.t - p.story.t > 1440 || !sim.people[p.story.subject]?.alive) {
        const foe = living().filter(x => x !== p && x !== q && R(p, x).like < -0.2).sort((a, b) => R(p, a).like - R(p, b).like)[0];
        p.story = foe ? { id: 'lie' + Math.random(), kind: 'accuse', subject: foe.id, victim: pick(living().filter(x => x !== foe && x.kind === 'human')).id, type: pick(['theft', 'assault', 'burglary']), lie: true, t: sim.t } : null;
      }
      if (p.story && p.story.subject !== q.id) { cool(p, 'lie', 150); const { t: _t, ...c } = p.story; claim(p, q, c); }
    }
  }
  sim.converse = converse;
  function court(p, q) {
    const a = attracted(q, p), like = R(q, p).like;
    const gain = 0.05 + a * 0.08 + like * 0.05 + (p.coin > q.coin ? 0.03 * q.traits.greed : 0);
    if (!R(p, q).court) R(p, q).since = sim.day;
    R(p, q).court = (R(p, q).court || 0) + gain; bump(q, p, 'like', gain * 0.6);
    if (R(p, q).court > 1 && sim.day - (R(p, q).since || sim.day) >= 3 && !p.spouse && !q.spouse) {
      const yes = like * 2 + a + seen(q, p).worth * 0.03 * q.traits.greed - 0.8 + rnd(-0.3, 0.3);
      if (yes > 0) marry(p, q); else { bump(p, q, 'like', -0.1); R(p, q).court = 0; log('life', `${q.name} turns down ${p.name}'s proposal.`, [p.id, q.id]); }
    }
  }
  // a plain brain's platform: what someone like them would want, in a few words
  function plainPlatform(p) {
    const lines = [];
    if (p.traits.greed > 0.6) lines.push('lower taxes'); if (p.traits.honesty > 0.7) lines.push('honest books at the hall'); if (p.job === 'none' || p.coin < 50) lines.push('work for anyone who wants it');
    if (p.traits.aggression > 0.6) lines.push('a hard line on thieves'); if (isGuard(p)) lines.push('more guards, better paid'); if (JOBS[p.job]?.owner) lines.push('fair trade for the shops');
    return (lines.length ? lines.slice(0, 2) : ['a better Hollow Town']).join(' and ');
  }
  function campaign(p, q) {
    if (p.platform && q) { (q.heardPlatform ||= {})[p.id] = true; if (Math.random() < 0.08) log('politics', `${p.name} canvasses ${q.name}: "${p.platform}"`, [p.id, q.id]); }
    const bribe = p.coin > 80 && q.traits.greed > 0.6 && p.traits.honesty < 0.5 ? 20 : 0;
    if (bribe) { pay(p, q, bribe); (q.voteBribes ||= {})[p.id] = (q.voteBribes[p.id] || 0) + bribe; }
    const r = d(20) + p.skills.diplomacy; if (r >= 12) bump(q, p, 'like', 0.08); else bump(q, p, 'like', -0.02);
  }
  function recruit(p, q) {
    if (!p.gang) return;
    const g = sim.gangs[p.gang], offer = Math.min(30, p.coin);
    const yes = R(q, p).like + R(q, p).trust - q.traits.honesty + (q.coin < 40 ? 0.5 : 0) + offer * 0.01 + (isGuard(q) ? q.traits.greed - 0.6 : 0) + rnd(-0.3, 0.3);
    if (yes > 0.4 && !q.gang) { pay(p, q, offer); q.gang = p.gang; log('gang', `${fullName(q)} joins ${g.name}${isGuard(q) ? ' (a guard!)' : ''}.`, [p.id, q.id]); }
    else bump(q, p, 'like', -0.05);
  }
  function askToJoin(p, boss, gid) { if (!sim.gangs[gid] || boss.gang !== gid) return; if (R(boss, p).like > 0 || R(boss, p).trust > 0.4) { p.gang = gid; log('gang', `${fullName(p)} joins ${sim.gangs[gid].name}.`, [p.id, boss.id]); } }
  function seekWork(p) {
    // public vacancies first (the mayor hires), then businesses that lost a worker
    const filled = j => living().filter(q => q.job === j).length;
    const want = { guard: 2, nightguard: 2, clerk: 1, undertaker: 1, cleric: 1, doctor: 1, teacher: 1, jailer: 1, bakehand: 1, shophand: 1, apprentice: 1, server: 1, ranchhand: 1, farmhand: 2 };
    const open = Object.entries(want).filter(([j, n]) => filled(j) < n + (sim.extraHires?.[j] || 0) && (JOBS[j].payer !== 'town' || sim.treasury > 200) && (JOBS[j].payer === 'town' || sim.business[JOBS[j].payer]?.owner) && !(JOBS[j].guard && openRecord(p).length));
    if (!open.length) return;
    const [job] = open.sort((a, b) => (JOBS[b[0]].wage) - (JOBS[a[0]].wage))[0];
    p.job = job; log('life', `${fullName(p)} takes work as ${JOBS[job].title.toLowerCase()}.`, [p.id]);
  }

  // ---- crimes --------------------------------------------------------------
  function pickpocket(p, q) {
    cool(p, 'pick', 90);
    const r = d(20) + p.skills.sleight, spot = d(20) + q.skills.spot;
    const n = Math.min(q.coin, irnd(5, 40));
    if (r >= Math.max(spot, 12)) {
      pay(q, p, n); p.stats.stolen += n;
      const { seen } = deed('theft', p, q, q, { victimKnows: false });
      log('crime', `${fullName(p)} lifts ${money(n)} from ${q.name}${seen.length ? ` (seen by ${seen.map(s => s.name).join(', ')})` : ' unseen'}.`, [p.id, q.id]);
      if (q.brain === 'human' && Math.random() < 0.5) q.robbedBy = { who: p.id, t: sim.t };
    } else {
      deed('theft', p, q, q);
      log('crime', `${q.name} catches ${fullName(p)}'s hand in ${q.pron[2]} purse!`, [p.id, q.id]);
      bump(q, p, 'like', -0.4);
      if (q.traits.aggression > 0.5 && might(q) >= might(p) * 0.8) startFight(q, p, { mode: 'nonlethal', why: 'thief' });
    }
  }
  function burgle(p, hi) {
    cool(p, 'burgle', 360);
    const hs = HOUSES[hi], lock = 14 + (hs.stash > 200 ? 2 : 0);
    const r = d(20) + p.skills.openlock + (p.items.picks ? 2 : -2);
    if (r < lock) { log('crime', `${p.name} fails to pick the lock of ${AREAS[hs.id].name}.`, [p.id]); deed('trespass', p, null, hs.door); return; }
    const n = Math.min(hs.stash, irnd(40, 150)); hs.stash -= n; p.coin += n; p.stats.stolen += n;
    const owner = living().find(q => q.home === hi);
    const { seen } = deed('burglary', p, owner, hs.bed, { victimKnows: false });
    log('crime', `${fullName(p)} burgles ${AREAS[hs.id].name} for ${money(n)}${seen.length ? ` (seen by ${seen.map(s => s.name).join(', ')})` : ' unseen'}.`, [p.id]);
  }
  function extort(p, q, bid) {
    cool(p, 'extort', 480);
    const g = sim.gangs[p.gang], b = sim.business[bid]; if (!g || !b) return;
    const threat = gangPower(p.gang), protect = backers(q).reduce((s, x) => s + might(x), might(q)) + guardsNear(q).length * 4;
    const r = d(20) + p.skills.intimidate + Math.floor(threat / 4), dc = 10 + q.level + mod(q.st.wis) + Math.floor(protect / 4);
    if (r >= dc) { b.insurance = p.gang; log('gang', `${q.name} agrees to pay ${g.name} for "insurance" on the ${bid}.`, [p.id, q.id]); deed('extortion', p, q, q); }
    else { log('gang', `${q.name} refuses ${g.name}'s "insurance".`, [p.id, q.id]); bump(p, q, 'like', -0.3); p.grudge = p.grudge || {}; p.grudge[q.id] = (p.grudge[q.id] || 0) + 5; }
  }

  // ---- the law -----------------------------------------------------------------
  function guardHears(g, ev, how, teller) {
    const actor = sim.people[ev.actor]; if (!actor || actor === g) return;
    if (how === 'saw') { const r = actor.record.find(x => x.ev === ev.id); if (r) r.evidence = true; else actor.record.push({ ev: ev.id, type: ev.type, victim: ev.victim, by: [g.id], day: sim.day, served: false, evidence: true }); postBounty(actor, ev.type); }
  }
  function hueAndCry(p) {
    if (p.cried && sim.t - p.cried < 10) return; p.cried = sim.t;
    const at = P(p.x, p.z), evs0 = () => sim.events.filter(e => sim.t - e.t < 15 && e.at && dist2(e.at, at) < 20);
    setTimeout0(() => runForGuard(p, at, evs0()));
    const evs = sim.events.filter(e => sim.t - e.t < 15 && e.at && dist2(e.at, at) < 20 && ['assault', 'mugging', 'murder', 'robbery', 'theft', 'burglary', 'extortion', 'vandalism'].includes(e.type));
    log('law', `${p.id === 'player' ? 'You shout' : p.name + ' shouts'} "Guard! Guard!"`, [p.id]); p.bubble = { text: 'Guard! Guard!', t: sim.t };
    for (const q of living()) if (q !== p && q.kind === 'human' && conscious(q) && dist2(q, p) < (sameSpace(q, p) ? CRY_RANGE : CRY_RANGE / 2)) {
      if (q.state === 'sleep' && q.brain !== 'human') { q.task = null; q.state = 'idle'; remember(q, { text: `woken by ${p.name} shouting for the guard` }); }   // Rose: a shout wakes people
      q.alert = true; remember(q, { text: `${p.name} shouted for the guard near ${AREAS[areaOf(p)]?.name || 'here'}` });
      if (isGuard(q) && q.jailedUntil <= 0 && !q.fight) { if (waitsForOrders(q)) askOrders(q, `${p.name} is shouting for the guard near ${AREAS[areaOf(p)]?.name || 'you'}.`); else setTask(q, 'goto', { to: at, until: sim.t + 40, cry: evs.map(e => e.id) }); }
    }
  }
  sim.hueAndCry = hueAndCry;
  // the two nearest who heard the cry (not guards, not whoever did it) run to find a guard and bring them back
  function runForGuard(p, at, evs) {
    const culprits = new Set(evs.map(e => e.actor)), where = AREAS[areaOf(at)]?.name || 'the street';
    const runners = living().filter(q => q !== p && q.kind === 'human' && q.brain !== 'human' && conscious(q) && !q.fight && !isGuard(q) && !(q.jailedUntil > 0) && !culprits.has(q.id) && dist2(q, p) < CRY_RANGE && sameSpace(q, p))
      .sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, 2);
    for (const q of runners) {
      if (waitsForOrders(q)) { askOrders(q, `${p.id === 'player' ? 'Rose of the City' : p.name} is shouting "Guard! Guard!" near ${where}: someone needs a guard. You could run and fetch one ("go to <guard>" or "go to Guard station"), step in, or keep out of it.`); continue; }
      const g = living().filter(g => isGuard(g) && conscious(g) && g.jailedUntil <= 0 && !g.fight && dist2(g, at) >= CRY_RANGE).sort((a, b) => dist2(a, q) - dist2(b, q))[0];
      setTask(q, 'fetchguard', { guard: g?.id || null, to: g ? P(g.x, g.z) : SPOTS.desk, at, where, cry: evs.map(e => e.id), until: sim.t + 120, run: true });
      log('law', `${q.name} runs to fetch a guard.`, [q.id]);
    }
  }
  sim.runForGuard = runForGuard;
  function ratOut(p, q) {
    if (!q || !sim.bounty[q.id] || !q.alive || q.jailedUntil > 0) return 'They are not on the board.';
    cool(p, 'tip:' + q.id, 240); q.tippedBy = p.id;
    const line = `Guard! It's ${q.id === 'player' ? 'Rose of the City' : q.name}, the one on the bounty board!`;
    log('law', `${p.id === 'player' ? 'You call' : p.name + ' calls'} the guard on ${q.id === 'player' ? 'you' : q.name}: "${line}"`, [p.id, q.id]); p.bubble = { text: line, t: sim.t };
    for (const w of living()) if (w !== p && w.kind === 'human' && inEarshot(w, p)) remember(w, { text: `${p.name} called the guard on ${q.name} (wanted)` });
    remember(q, { text: `${p.name} called the guard on me` }); bump(q, p, 'like', -0.4);
    const gs = living().filter(g => isGuard(g) && conscious(g) && !g.fight && g.jailedUntil <= 0 && dist2(g, p) < CRY_RANGE * 2);
    for (const g of gs) { if (waitsForOrders(g)) askOrders(g, `${p.name} is calling you: ${q.name}, wanted on the bounty board, is near ${AREAS[areaOf(q)]?.name || 'here'}.`); else setTask(g, 'arrest', { target: q.id, until: sim.t + 90 }); }
    if (!gs.length) hueAndCry(p);
    return '';
  }
  sim.ratOut = ratOut;
  function confrontArrest(g, q) {
    // The guard states the charge; the suspect chooses: come quietly, talk, pay, run or fight.
    if (q.brain === 'human') { sim.pendingArrest = { guard: g.id, t: sim.t }; log('law', `${g.name}: "${q.name}, you're under arrest."`, [g.id, q.id]); if (sim.onArrest) sim.onArrest(g, q); return; }
    const sentence = openRecord(q).reduce((s, r) => s + (CRIMES[r.type] || 2), 0);
    const flee = q.traits.caution < 0.4 && might(q) < might(g), fight = q.traits.aggression * might(q) > might(g) * 0.9 + backers(g).length;
    const bribeAmt = Math.min(q.coin, (3 + sentence) * 10);
    if (q.coin >= 40 && q.traits.honesty < 0.6 && acceptsBribe(g, bribeAmt)) { pay(q, g, bribeAmt); deed('bribery', q, g, g, { victimKnows: false }); log('law', `${q.name} slips ${g.name} ${money(bribeAmt)} and walks free.`, [g.id, q.id]); return; }
    if (fight) return startFight(q, g, { mode: q.traits.aggression > 0.8 ? 'lethal' : 'nonlethal', why: 'resisting arrest' });
    if (flee) { setTask(q, 'flee', { from: P(g.x, g.z) }); log('law', `${q.name} bolts from ${g.name}.`, [g.id, q.id]); return startFight(g, q, { mode: 'nonlethal', why: 'arrest' }); }
    setTask(g, 'haul', { target: q.id, until: sim.t + 240 }); log('law', `${q.name} comes quietly with ${g.name}.`, [g.id, q.id]);
  }
  sim.confrontArrest = confrontArrest;
  function acceptsBribe(off, amt) {
    const greedy = off.traits.greed * amt * 0.05, risk = witnesses(off, [off]).length * 2 + off.traits.honesty * 6 + (off.id === sim.mayorId ? 2 : 0);
    const yes = greedy + rnd(-1, 1) > risk; if (yes && isGuard(off)) off.onPayroll = true; return yes;
  }
  sim.acceptsBribe = acceptsBribe;
  function jail(q, g) {
    const sentence = Math.max(1, openRecord(q).reduce((s, r) => s + (CRIMES[r.type] || 2), 0)), harb = openRecord(q).some(r => r.type === 'harboring');
    openRecord(q).forEach(r => r.served = true);
    q.jailedUntil = sim.t + sentence * 24 * 60 / 4;   // a quarter day per point of crime
    q.task = { kind: 'jail', t0: sim.t }; q.state = 'jail';
    const cell = SPOTS.cells.find(c => !living().some(o => o !== q && o.jailedUntil > 0 && dist2(o, c) < 0.5)) || SPOTS.cells[0];
    place(q, cell); q.down = null; if (q.hp < 1) { q.nl = Math.max(0, q.nl - (1 - q.hp)); q.hp = 1; }
    if (g) { g.stats.arrests++; sim.rec.arrests++; const b = sim.bounty[q.id]; if (b) { const tp = q.tippedBy && q.tippedBy !== g.id && sim.people[q.tippedBy]?.alive ? sim.people[q.tippedBy] : null, tip = tp ? Math.ceil(b / 4) : 0; pay('town', g, b - tip); if (tp) { pay('town', tp, tip); log('law', `${tp.name} gets ${money(tip)} for the tip-off.`, [tp.id]); } delete sim.bounty[q.id]; } }
    q.tippedBy = null;
    log('law', `${fullName(q)} is jailed for ${(sentence / 4).toFixed(1)} days${g ? ' by ' + g.name : ''}.`, [q.id, g?.id].filter(Boolean));
    if (harb) divest(q);
  }
  sim.jail = jail;

  // ---- housing (Rose) --------------------------------------------------------------
  // Every house is an address that has to be owned or rented to live or sleep in. 1 gp buys an empty one at the town hall;
  // an owner rents beds out (1-5 sp a night, four to a house), the rent paying itself every 24 hours while the tenant can,
  // otherwise they're out. The homeless may not be in town at night (21:00-6:00): a guard who sees one takes them in.
  const HOUSE_PRICE = 100, HOUSE_BEDS = 4, OUTSIDE = new Set(['fields', 'orchard', 'ranch', 'wood', 'road', 'marrow']);
  const residents = i => living().filter(q => q.kind === 'human' && q.home === i);
  const housesOf = p => HOUSES.map((h, i) => i).filter(i => HOUSES[i].owner === p.id);
  const houseName = i => AREAS[HOUSES[i].id].name;
  function moveIn(p, i) { p.home = i; const sp = p.spouse && sim.people[p.spouse]; if (sp && sp.alive && sp.home == null) sp.home = i; }
  function evict(p, why) {
    const i = p.home; if (i == null) return;
    delete (HOUSES[i].tenants ||= {})[p.id]; p.home = null;
    const sp = p.spouse && sim.people[p.spouse]; if (sp && sp.alive && sp.home === i && HOUSES[i].owner !== sp.id && !(HOUSES[i].tenants[sp.id] > sim.t)) sp.home = null;
    log('life', `${fullName(p)} is out of ${houseName(i)}${why ? ': ' + why : ''}.`, [p.id]); remember(p, { text: `I lost my bed at ${houseName(i)}${why ? ' (' + why + ')' : ''}` });
  }
  function buyHouse(p, i) {
    const h = HOUSES[i]; if (!h) return 'No such house.';
    if (h.owner === p.id) return 'It is already yours.';
    if (h.owner) return `${houseName(i)} already belongs to ${sim.people[h.owner]?.name || 'someone'}.`;
    if (p.coin < HOUSE_PRICE) return `A house costs ${money(HOUSE_PRICE)}.`;
    pay(p, 'town', HOUSE_PRICE, 'house'); h.owner = p.id; h.tenants ||= {}; h.askSet = false;
    const cur = p.home != null ? HOUSES[p.home] : null;
    if (!cur || cur.owner !== p.id) { if (cur) delete (cur.tenants ||= {})[p.id]; moveIn(p, i); }
    log('trade', `${fullName(p)} buys ${houseName(i)} for ${money(HOUSE_PRICE)}.`, [p.id]); return `You buy ${houseName(i)}.`;
  }
  function rentHouse(p, i) {
    const h = HOUSES[i], o = h && sim.people[h.owner]; if (!h) return 'No such house.';
    if (!o || !o.alive) return `${houseName(i)} has no landlord: it's for sale at the town hall (${money(HOUSE_PRICE)}).`;
    if (o === p) { moveIn(p, i); return 'It is yours.'; }
    h.tenants ||= {};
    if (p.home === i && h.tenants[p.id] > sim.t) return 'You already rent a bed here.';
    if (residents(i).filter(q => q !== p).length >= HOUSE_BEDS) return `${houseName(i)} is full.`;
    const ask = h.ask || 20; if (p.coin < ask) return `${o.name} wants ${money(ask)} a night.`;
    pay(p, o, ask, 'rent');
    if (p.home != null && p.home !== i) delete (HOUSES[p.home].tenants ||= {})[p.id];
    h.tenants[p.id] = sim.t + 1440; moveIn(p, i);
    log('trade', `${fullName(p)} rents a bed at ${houseName(i)} from ${o.name} (${money(ask)} a night).`, [p.id, o.id]); return `You rent a bed at ${houseName(i)}.`;
  }
  sim.buyHouse = buyHouse; sim.rentHouse = rentHouse;
  // ---- making and building (Rose) ----------------------------------------------------
  sim.palisade = { hp: 0, max: 250 }; sim.fires = []; sim.board = [];
  const CRAFT = {
    club: { mins: 60, where: ['wood', 'orchard'], label: 'whittle a club' },
    spear: { mins: 120, where: ['wood', 'orchard'], label: 'whittle a spear' },
    stones: { mins: 30, where: ['fields', 'wood', 'road', 'orchard', 'ranch'], label: 'gather stones' },
    wood: { mins: 60, where: ['wood'], label: 'chop wood' },
    barricade: { mins: 120, wood: 3, label: 'barricade' },
    palisade: { mins: 120, wood: 3, label: 'build the palisade' },
    fire: { mins: 15, wood: 2, label: 'light a watch-fire' },
  };
  sim.CRAFT = CRAFT;
  function startCraft(p, what, o = {}) {
    const c = CRAFT[what], fail = why => { (p.failed ||= []).push(`${c ? c.label : what} (${why})`); remember(p, { text: `I couldn't ${c ? c.label : what}: ${why}` }); setTask(p, 'idle', { until: sim.t + 5 }); return why; };
    if (!c) return fail('no such work');
    if (c.wood && (p.items.wood || 0) < c.wood) return fail(`it takes ${c.wood} wood; chop some in the Wildwood`);
    let to, house = null;
    if (c.where) { const a = areaOf(p); to = c.where.includes(a) ? P(p.x + rnd(-1, 1), p.z + rnd(-1, 1)) : randIn(c.where[0], 3); if (!walkable(to)) to = randIn(c.where.includes(a) ? a : c.where[0], 3); }
    else if (what === 'barricade') { const i = o.house ?? p.home; if (i == null || !HOUSES[i]) return fail('name a house'); if (HOUSES[i].owner !== p.id && p.home !== i) return fail('only its owner or someone who lives there can'); if ((HOUSES[i].barricade || 0) >= 90) return fail('it is as strong as it gets'); const dr = HOUSES[i].door; to = P(dr.x, dr.z + Math.sign(dr.z) * 1.5); house = i; }
    else if (what === 'palisade') { if (sim.palisade.hp >= sim.palisade.max) return fail('the palisade is whole'); to = P(-103.5, rnd(-10, 10)); }
    else if (what === 'fire') { const pl = o.place && AREAS[o.place] && !AREAS[o.place].indoor ? o.place : null; if (!pl && AREAS[areaOf(p)]?.indoor) return fail('a watch-fire goes outdoors'); to = pl ? randIn(pl, 2) : P(p.x, p.z); }
    const done = Math.min(c.mins - 1, p.craftProg?.[what + (house ?? '')] || 0); return setTask(p, 'craft', { what, house, to, mins: c.mins, done, until: sim.t + c.mins - done + 120 });
  }
  const avgDmg = k => { const w = WEAPONS[k]; return w ? w.dmg[0] * (w.dmg[1] + 1) / 2 + (w.enh || 0) : 0; };
  function equipIfBetter(p, k) { if (avgDmg(k) > avgDmg(p.weapon) && !WEAPONS[p.weapon]?.range) { if (p.weapon !== 'fists') p.items[p.weapon] = (p.items[p.weapon] || 0) + 1; p.weapon = k; return true; } p.items[k] = (p.items[k] || 0) + 1; return false; }
  function finishCraft(p, tk) {
    const w = tk.what, c = CRAFT[w];
    if (w === 'club' || w === 'spear') { const eq = equipIfBetter(p, w); log('life', `${p.name} whittles a ${w} in ${AREAS[areaOf(p)]?.name || 'the wild'}${eq ? ' and carries it' : ''}.`, [p.id]); remember(p, { text: `I whittled a ${w}` }); return; }
    if (w === 'stones') { p.items.stones = (p.items.stones || 0) + 6; remember(p, { text: 'I gathered stones to throw' }); return; }
    if (w === 'wood') { const n = ['handaxe', 'battleaxe', 'greataxe'].includes(p.weapon) ? 5 : 3; p.items.wood = (p.items.wood || 0) + n; remember(p, { text: `I chopped ${n} wood` }); return; }
    if ((p.items.wood || 0) < c.wood) { (p.failed ||= []).push(`${c.label} (ran out of wood)`); return; }
    p.items.wood -= c.wood;
    if (w === 'barricade') { const h = HOUSES[tk.house]; h.barricade = Math.min(90, (h.barricade || 0) + 30); log('life', `${p.name} barricades ${houseName(tk.house)} (${h.barricade}/90).`, [p.id]); }
    else if (w === 'palisade') { const pl = sim.palisade; pl.hp = Math.min(pl.max, pl.hp + 25); (pl.by ||= {})[p.id] = (pl.by[p.id] || 0) + 1; log('life', `${p.name} works on the palisade at the edge of the Wildwood (${pl.hp}/${pl.max}).`, [p.id]); }
    else if (w === 'fire') { let until = Math.ceil((sim.t - 360) / 1440) * 1440 + 360; if (until <= sim.t) until += 1440; sim.fires.push({ x: p.x, z: p.z, until, by: p.id }); log('life', `${p.name} lights a watch-fire at ${AREAS[areaOf(p)]?.name || 'the road'}.`, [p.id]); }
  }
  sim.startCraft = startCraft;
  const defenceText = p => `Defences: the palisade at the edge of the Wildwood ${sim.palisade.hp}/${sim.palisade.max}${p.home != null ? `; the barricade on your house ${HOUSES[p.home].barricade || 0}/90` : ''}${sim.fires.some(f => f.until > sim.t) ? '; watch-fires burning: ' + sim.fires.filter(f => f.until > sim.t).map(f => AREAS[areaOf(f)]?.name || 'the road').join(', ') : ''}. Beasts must batter barricades and the palisade down to get past.`;
  // ---- the shelter, the Cellar, busking, giving (Rose) ------------------------------------
  // The shelter at the end of Wick Lane (Rose): a cot and a hot meal for 1 sp a night; bring meat or fish you caught
  // yourself and they cook it for you and the night is free. A roof in the eyes of the vagrancy law.
  // The Cellar behind the Drowned Lantern: the underworld's den, free for the boss and the crew to sleep in.
  const SHELTER_FEE = 10, OWN_FOOD = ['meat', 'fish'];
  const ownFood = p => OWN_FOOD.find(k => p.items?.[k] > 0) || null;
  const nightKey = () => Math.floor((sim.t - 720) / 1440);   // a night runs noon to noon
  const crewish = p => !!p && p.kind === 'human' && (isBoss(p) || !!(p.gang && sim.gangs?.[p.gang]));   // the Cellar is the boss's and those who joined his gang, nobody else's
  function bedFor(p) {
    if (p.home != null) return HOUSES[p.home].bed;
    if (barracksOf(p)) return randIn(barracksOf(p), 1.2);   // a free bunk with your corps
    if (crewish(p)) return randIn('cellar', 1.2);
    if (p.shelterNight === nightKey() || p.coin >= SHELTER_FEE || ownFood(p)) return randIn('shelter', 1.2);
    return randIn('fields', 4);
  }
  function settleBed(p, tk) {   // on reaching the pillow: pay for the cot, or go sleep rough
    if (areaOf(p) !== 'shelter' || p.home != null || p.shelterNight === nightKey()) return true;
    const own = ownFood(p);
    if (own) {   // they cook what you caught, and the cot is free
      p.items[own]--; p.food = Math.min(1, p.food + GOODS[own].food); p.shelterNight = nightKey();
      remember(p, { text: `I brought my own ${GOODS[own].name.toLowerCase()} to the shelter: they cooked it, and the cot was free.` }); return true;
    }
    if (p.coin < SHELTER_FEE) { tk.to = randIn('fields', 4); return false; }
    pay(p, 'town', SHELTER_FEE, 'shelter'); p.shelterNight = nightKey(); p.food = Math.min(1, p.food + GOODS.meal.food);
    remember(p, { text: `I paid ${money(SHELTER_FEE)} at the shelter: stew and bread, and a cot.` }); return true;
  }
  const roofed = p => { const a = areaOf(p), b = p.task?.kind === 'sleep' ? areaOf(p.task.to) : null; return a === 'shelter' || b === 'shelter' || (barracksOf(p) && (a === barracksOf(p) || b === barracksOf(p))) || ((a === 'cellar' || b === 'cellar') && crewish(p)); };
  sim.bedFor = bedFor;

  // busking: play or sing in the square; those who hear may toss a coin (d20 + Charisma + half Diplomacy)
  function buskRound(p) {
    const r = d(20) + Math.floor(((p.st?.cha || 10) - 10) / 2) + Math.floor((p.skills?.diplomacy || 0) / 2);
    const ears = living().filter(q => q !== p && q.kind === 'human' && conscious(q) && q.state !== 'sleep' && !q.fight && dist2(q, p) < 8);
    let got = 0; const who = [];
    for (const q of ears.slice(0, 5)) {
      if (r < 8 || q.coin < 2) continue;
      const chance = (r - 8) * 0.04 + (1 - (q.traits?.greed ?? 0.5)) * 0.3 + (R(q, p).like || 0) * 0.3;
      if (Math.random() > chance) continue;
      const tip = pay(q, p, Math.min(q.coin, r >= 20 ? irnd(5, 10) : r >= 15 ? irnd(2, 4) : 1), 'busking');
      if (tip > 0) { got += tip; who.push(q.name); bump(q, p, 'like', 0.01); }
    }
    p.stats.busked = (p.stats.busked || 0) + got;
    if (got) remember(p, { text: `I busked: ${who.join(', ')} tossed me ${money(got)}.` });
    return { r, got, who, ears: ears.length };
  }
  sim.buskRound = buskRound;

  // giving: coin (any amount: "1 copper", "a silver", "2 gp") or something you carry
  const itemName = k => (GOODS[k]?.name || WEAPONS[k]?.name || ARMOR[k]?.name || SHIELDS?.[k]?.name || k).toLowerCase();
  function giftItem(me, txt) {
    if (!txt) return null;
    return Object.keys(me.items || {}).find(k => me.items[k] > 0 && (txt.includes(k) || txt.includes(itemName(k)) || txt.includes(itemName(k).replace(/s$/, '')))) || null;
  }
  function giveTo(me, t, extra) {
    const txt = String(extra.text || '').toLowerCase();
    const item = extra.item || giftItem(me, txt);
    if (!item && /\b(draught|potion|club|spear|dagger|sword|bow|axe|shield|armou?r|bread|apple|meat|wood|stones?)\b/.test(txt) && !/\d|copper|silver|gold|plat/.test(txt)) return `You have no ${txt.replace(/^(a|an|one|some|the)\s+/, '')} to give.`;
    if (item) {
      if (!(me.items[item] > 0)) return `You have no ${itemName(item)}.`;
      me.items[item]--; if (WEAPONS[item] && !WEAPONS[item].weak) equipIfBetter(t, item); else t.items[item] = (t.items[item] || 0) + 1;
      bump(t, me, 'like', 0.06); remember(t, { text: `${me.name} gave me a ${itemName(item)}` });
      log('life', `${me.name} gives ${t.name} a ${itemName(item)}.`, [me.id, t.id]);
      return `You give ${t.name} a ${itemName(item)}.`;
    }
    let n = extra.amount | 0;
    if (!n && txt) n = parseMoney(txt.replace(/\b(a|an|one)\s+(pp|gp|sp|cp|plat\w*|gold|silver|copper)/g, '1 $2'), 0);
    if (me.coin < 1) return 'You have nothing to give.';
    n = Math.min(me.coin, Math.max(1, n || 10));
    pay(me, t, n, 'gift'); bump(t, me, 'like', Math.min(0.3, 0.01 + n * 0.003));
    remember(t, { text: `${me.name} gave me ${money(n)}` });
    if (n >= 10 || t.home == null) log('life', `${me.name} gives ${t.name} ${money(n)}.`, [me.id, t.id]);
    if (me.brain !== 'human') cool(me, 'give', 480);
    return `You give ${t.name} ${money(n)}.`;
  }

  // ---- the three barracks by the fields gate (Rose): nobody is put in them; whoever wants to, enlists ----
  // Guard barracks (day and night guards), Artillery barracks (crossbows and bows), the Mage barracks (those who cast).
  // Members bunk there free. The town pays; openings follow the guard numbers plus the mayor's extra hires.
  const CORPS = {
    guard: { barracks: 'guardbarracks', want: 2 }, nightguard: { barracks: 'guardbarracks', want: 2 },
    artillery: { barracks: 'artybarracks', want: 3 }, mageguard: { barracks: 'magebarracks', want: 2 },
  };
  const casts = p => !!(p.slotMax && ((p.slotMax.missiles || 0) + (p.slotMax.cures || 0) + (p.slotMax.rays || 0)) > 0);
  const barracksOf = p => p.job === 'captain' || p.job === 'jailer' ? 'guardbarracks' : CORPS[p.job]?.barracks || null;
  const corpsWord = t => /artill|archer|\bbow|crossbow|marks/.test(t) ? 'artillery' : /mage|wizard|sorcer|spell|magic/.test(t) ? 'mageguard' : /night/.test(t) ? 'nightguard' : 'guard';
  function corpsOpen(job) { const c = CORPS[job]; return c ? Math.max(0, c.want + (sim.extraHires?.[job] || 0) - living().filter(q => q.job === job).length) : 0; }
  function enlist(p, job) {
    const c = CORPS[job]; if (!c) return 'Enlist as a guard, night guard, artillery guard or mage guard.';
    if (p.job === job) return `You already serve as ${JOBS[job].title.toLowerCase()}.`;
    if (areaOf(p) !== c.barracks) return `Go to the ${AREAS[c.barracks].name} to enlist.`;
    if (JOBS[p.job]?.owner) return 'You run a business; you can\'t also take the town\'s pay.';
    if (['mayor', 'captain'].includes(p.job)) return 'Your office keeps you.';
    if (openRecord(p).length) return 'They won\'t take someone with an open record.';
    if (job === 'mageguard' && !casts(p)) return 'The Mage barracks takes only those who can cast spells.';
    if (!corpsOpen(job)) return `The ${AREAS[c.barracks].name} has no place free (the mayor can hire more).`;
    if (sim.treasury < 200) return 'The town can\'t pay another; the treasury is low.';
    const was = p.job; p.job = job; p.post = null;
    let kit = '';
    if (job === 'artillery' && !WEAPONS[p.weapon]?.range) { if (p.weapon && p.weapon !== 'fists') p.items[p.weapon] = (p.items[p.weapon] || 0) + 1; p.weapon = 'lightxbow'; p.items.bolts = (p.items.bolts || 0) + 20; kit = ' They hand you a light crossbow and 20 bolts.'; }
    else if (job === 'artillery' && WEAPONS[p.weapon]?.ammo) { const a = WEAPONS[p.weapon].ammo; p.items[a] = (p.items[a] || 0) + 20; kit = ` They give you 20 ${a}.`; }
    log('life', `${fullName(p)} enlists in the ${AREAS[c.barracks].name} as ${JOBS[job].title.toLowerCase()}${was !== 'none' ? ` (leaving work as ${JOBS[was]?.title.toLowerCase() || was})` : ''}.`, [p.id]);
    remember(p, { text: `I enlisted as ${JOBS[job].title.toLowerCase()}; I bunk at the ${AREAS[c.barracks].name}` });
    return `You enlist as ${JOBS[job].title.toLowerCase()} (${money(sim.wages[job] ?? JOBS[job].wage)} a day, ${JOBS[job].from}:00-${JOBS[job].to % 24}:00).${kit} You can bunk here free.`;
  }
  const barracksNews = () => { const o = Object.keys(CORPS).filter(j => corpsOpen(j)).map(j => `${JOBS[j].title} x${corpsOpen(j)} (${AREAS[CORPS[j].barracks].name})`); return o.length ? `The barracks by the fields gate are taking volunteers ("enlist <guard | night guard | artillery | mage guard>" there; members bunk free; mage guards must cast spells; artillery get a crossbow): ${o.join(', ')}.` : ''; };
  sim.enlist = enlist; sim.corpsOpen = corpsOpen;

  // ---- class features (Rose): the SRD 3.5 abilities of levels 1-5 ----------------------------------------------
  // rogue: sneak attack on the flat-footed (round one before they act, ambushed), flanked, feinted, stunned, helpless;
  //   uncanny dodge (rogue 4, barbarian 2). cleric: bless, command, summon monster I (a celestial dog), cure; druid:
  //   summon nature's ally I (a wolf), cure, wild empathy; ranger: a chosen favoured enemy, wild empathy; monk: flurry of
  //   blows, stunning fist; bard: inspire courage as a performance (bard level a day); wizard/sorcerer: a familiar, and
  //   magic missile, sleep, color spray, shield from the same level-1 slots. Divine spells share the cures pool (a
  //   cleric's prepared spells and spontaneous cures); arcane spells share the missiles pool.
  const BEAST_HD = { wolf: 2, boar: 3, bear: 3, direwolf: 6, ogre: 4, troll: 6, dog: 1 };
  const BEAST_SAVES = { wolf: [5, 5, 1], boar: [6, 3, 2], bear: [6, 4, 2], direwolf: [8, 7, 6], ogre: [6, 0, 1], troll: [11, 4, 3], dog: [4, 4, 1] };   // Fort, Ref, Will (SRD)
  const GIANT_KINDS = new Set(['ogre', 'troll']);
  const GOOD_SAVES = { barbarian: 'f', bard: 'rw', cleric: 'fw', druid: 'fw', fighter: 'f', monk: 'frw', paladin: 'f', ranger: 'fr', rogue: 'r', sorcerer: 'w', wizard: 'w', warrior: 'f', expert: 'w', commoner: '' };
  const FAMILIAR_KINDS = {
    bat: { name: 'bat', grants: '+3 Listen', skill: ['listen', 3] }, cat: { name: 'cat', grants: '+3 Move Silently', skill: ['sneak', 3] },
    hawk: { name: 'hawk', grants: '+3 Spot (bright light)', skill: ['spot', 3] }, lizard: { name: 'lizard', grants: '+3 Climb' },
    owl: { name: 'owl', grants: '+3 Spot (shadows)', skill: ['spot', 3] }, rat: { name: 'rat', grants: '+2 Fortitude' },
    raven: { name: 'raven', grants: '+3 Appraise; it speaks' }, snake: { name: 'snake', grants: '+3 Bluff', skill: ['bluff', 3] },
    toad: { name: 'toad', grants: '+3 hit points' }, weasel: { name: 'weasel', grants: '+2 Reflex' },
  };
  const hdOf = q => q.kind === 'human' ? (q.level || 1) : BEAST_HD[q.species] || Math.max(1, Math.round((q.maxhp || 6) / 6));
  function saveMod(q, k) {   // 'f' | 'r' | 'w'
    if (q.kind !== 'human') { const s = BEAST_SAVES[q.species]; return s ? s['frw'.indexOf(k)] : 2; }
    let b = 0; for (const [c, n] of Object.entries(classesOf(q))) b += (GOOD_SAVES[c] || '').includes(k) ? 2 + Math.floor(n / 2) : Math.floor(n / 3);
    b += mod(q.st[{ f: 'con', r: 'dex', w: 'wis' }[k]]);
    if (k === 'f' && hasFeat(q, 'Great Fortitude')) b += 2; if (k === 'w' && hasFeat(q, 'Iron Will')) b += 2; if (k === 'r' && hasFeat(q, 'Lightning Reflexes')) b += 2;
    if (k === 'f' && q.familiar === 'rat') b += 2; if (k === 'r' && q.familiar === 'weasel') b += 2;
    return b;
  }
  const saveVs = (q, k, dc) => { const r = d(20); return { ok: r === 20 || (r !== 1 && r + saveMod(q, k) >= dc), r: r + saveMod(q, k) }; };
  sim.saveMod = saveMod;
  const arcaneLvl = p => clvl(p, 'wizard') + clvl(p, 'sorcerer'), divineLvl = p => clvl(p, 'cleric') + clvl(p, 'druid');
  const arcaneDC = p => 11 + (clvl(p, 'wizard') >= clvl(p, 'sorcerer') ? mod(p.st.int) : mod(p.st.cha)), divineDC = p => 11 + mod(p.st.wis);
  sim.flatNow = flatNow;
  const favoredType = t => t.kind === 'human' ? 'people' : GIANT_KINDS.has(t.species) ? 'giants' : 'beasts';
  function favoredVs(a, t) { return !!clvl(a, 'ranger') && (a.favored || 'beasts') === favoredType(t); }
  const empathyBonus = p => clvl(p, 'druid') + clvl(p, 'ranger') + mod(p.st.cha);
  const calmable = t => t && t.kind === 'animal' && t.monster && t.alive && !GIANT_KINDS.has(t.species);
  const sideOf = (f, q) => f.sides.get(q.id);
  const matesOf = (f, p) => f.order.map(body).filter(q => q && q.alive && sideOf(f, q) === sideOf(f, p));
  function musicOn(f, a) { const m = f.music?.[sideOf(f, a)]; if (!m) return false; const b = body(m.by); return (b && b.alive && conscious(b)) || f.round <= m.last + 5; }

  function giveFamiliar(p, kind) {
    if (!(clvl(p, 'wizard') || clvl(p, 'sorcerer'))) return 'Only a wizard or a sorcerer calls a familiar.';
    if (p.familiar) return `You already have a ${FAMILIAR_KINDS[p.familiar].name}.`;
    const k = FAMILIAR_KINDS[kind] ? kind : null; if (!k) return `Familiars: ${Object.entries(FAMILIAR_KINDS).map(([id, x]) => `${id} (${x.grants})`).join(', ')}.`;
    p.familiar = k; const F = FAMILIAR_KINDS[k];
    if (F.skill) p.skills[F.skill[0]] = (p.skills[F.skill[0]] || 0) + F.skill[1];
    p.skills.listen = (p.skills.listen || 0) + 2; p.skills.spot = (p.skills.spot || 0) + 2;   // Alertness, with the familiar at hand
    if (k === 'toad') { p.maxhp += 3; p.hp += 3; }
    const id = 'fam' + p.id; sim.animals[id] = { id, kind: 'animal', species: k, name: `${p.name}'s ${F.name}`, temper: 'calm', owner: p.id, familiar: true, alive: true, hp: Math.max(1, Math.floor(p.maxhp / 2)), maxhp: Math.max(1, Math.floor(p.maxhp / 2)), nl: 0, ac: 14, atk: 0, bite: [1, 2], dmgBonus: 0, x: p.x + 0.5, z: p.z + 0.3, yaw: 0, state: 'idle', stateT: 0, full: 1, bond: { [p.id]: 1 }, skills: { spot: 3, listen: 3 }, items: {} };
    log('life', `${p.id === 'player' ? 'A' : p.name + ': a'} ${F.name} answers the call and stays: a familiar (${F.grants}, and Alertness while it's near).`, [p.id]);
    return `A ${F.name} comes to you: your familiar (${F.grants}; +2 Listen and Spot while it's near).`;
  }
  function autoFamiliar(p) { const bag = ['toad', 'toad', 'toad', 'rat', 'rat', 'weasel', 'weasel', 'cat', 'owl', 'hawk', 'bat', clvl(p, 'sorcerer') ? 'snake' : 'raven']; giveFamiliar(p, pick(bag)); }
  sim.giveFamiliar = giveFamiliar; sim.restDaily = restDaily;

  function calmBeast(p, t, f) {
    if (!(clvl(p, 'druid') || clvl(p, 'ranger'))) return 'Only a druid or a ranger has wild empathy.';
    if (!calmable(t)) return 'Wild empathy reaches animals, not that.';
    if (dist2(p, t) > 9) return 'Get within 30 feet first.';
    const r = d(20) + empathyBonus(p), dc = f ? 25 : 20;   // hostile in a fight; wary while it prowls
    if (r < dc) { const line = `${p.name} tries to calm the ${t.name.toLowerCase()} (wild empathy ${r} vs ${dc}); it won't have it.`; f ? logF(f, line) : log('fight', line, [p.id, t.id]); return `It won't calm (${r} vs ${dc}).`; }
    t.calmUntil = sim.t + 720; t.prey = null; if (f) t.fled = 2;
    const line = `${p.name} calms the ${t.name.toLowerCase()} (wild empathy ${r} vs ${dc}): it backs off and slinks back toward the Wildwood.`;
    f ? logF(f, line) : log('fight', line, [p.id, t.id]); return `The ${t.name.toLowerCase()} calms and backs away (${r} vs ${dc}).`;
  }

  function summonAlly(f, p) {
    const druid = clvl(p, 'druid') >= clvl(p, 'cleric'), lvl = divineLvl(p), id = 'sum' + Math.random().toString(36).slice(2, 7);
    const an = druid
      ? { species: 'wolf', name: 'Summoned wolf', hp: 13, ac: 14, atk: 3, bite: [1, 6], dmgBonus: 1 }
      : { species: 'dog', name: 'Celestial dog', hp: 6, ac: 15, atk: 2, bite: [1, 4], dmgBonus: 1 };
    Object.assign(an, { id, kind: 'animal', maxhp: an.hp, temper: 'aggressive', owner: p.id, summoned: true, summonFight: f.id, summonUntil: f.round + lvl, alive: true, nl: 0, x: p.x + 1, z: p.z, yaw: 0, state: 'idle', stateT: 0, full: 1, bond: { [p.id]: 1 }, skills: { spot: 3, listen: 3 }, items: {}, speed: 15 });
    sim.animals[id] = an; place(an, P(p.x + rnd(-1, 1), p.z + rnd(-1, 1)));
    join(f, an, sideOf(f, p), 'lethal'); an.flatfooted = false;
    logF(f, `${p.name} casts ${druid ? "summon nature's ally" : 'summon monster'}: a ${an.name.toLowerCase()} appears and fights at their side for ${lvl} round${lvl > 1 ? 's' : ''}.`);
  }
  function putToSleep(f, q, rounds, sprayed) { q.down = 'spell'; q.sprayed = !!sprayed; q.spellWake = f.round + rounds; q.spellFight = f.id; q.downUntil = sim.t + Math.max(1, Math.ceil(rounds / 10)); q.prone = true; }
  function castSleep(f, p, center) {
    const dc = arcaneDC(p), lvl = arcaneLvl(p);
    const near = f.order.map(body).filter(q => q && q !== p && q.alive && conscious(q) && dist2(q, center) <= 3 && hdOf(q) <= 4).sort((a, b) => hdOf(a) - hdOf(b) || dist2(a, center) - dist2(b, center));
    let pool = 4; const out = [];
    for (const q of near) { if (hdOf(q) > pool) continue; pool -= hdOf(q); const s = saveVs(q, 'w', dc); if (s.ok) out.push(`${q.name} shakes it off (${s.r} vs ${dc})`); else { putToSleep(f, q, 10 * lvl); out.push(`${q.name} drops asleep`); } }
    logF(f, `${p.name} casts sleep: ${out.join('; ') || 'nothing there it can touch'}.`);
  }
  function castSpray(f, p, toward) {
    const dc = arcaneDC(p), ax = toward.x - p.x, az = toward.z - p.z, al = Math.hypot(ax, az) || 1;
    const hit = f.order.map(body).filter(q => { if (!q || q === p || !q.alive || !conscious(q)) return false; const dx = q.x - p.x, dz = q.z - p.z, dd = Math.hypot(dx, dz); return dd <= 4.6 && (dd < 0.5 || (dx * ax + dz * az) / (dd * al) > 0.7); });
    const out = [];
    for (const q of hit) {
      const s = saveVs(q, 'w', dc), hd = hdOf(q);
      if (s.ok) { out.push(`${q.name} blinks it away`); continue; }
      if (hd <= 2) { putToSleep(f, q, roll(2, 4), true); out.push(`${q.name} falls senseless`); }
      else { q.stunned = { f: f.id, left: hd <= 4 ? roll(1, 4) : 1 }; out.push(`${q.name} reels, stunned`); }
    }
    logF(f, `${p.name} casts color spray: ${out.join('; ') || 'the colours catch nobody'}.`);
  }

  function classActs(f, p, acts, tn) {
    if (p.kind !== 'human' || !conscious(p) || p.heldBy || p.holding) return;
    const foes = foesOf(f, p), adj = foes.filter(q => dist2(q, p) <= 2.1), side = sideOf(f, p);
    const mk = (id, label, cost, target) => acts.push({ id, label, cost, ...(target ? { target: target.id } : {}) });
    const monk = clvl(p, 'monk'), unarmouredMonk = monk && (!p.armor || p.armor === 'none') && ['fists', 'quarterstaff'].includes(p.weapon);
    if (unarmouredMonk && tn.standard && tn.move) for (const q of adj) mk('flurry', `Flurry of blows on ${q.name} (two blows, ${monk >= 5 ? -1 : -2} each)`, 'full', q);
    if (monk && p.stunLeft > 0 && tn.standard) for (const q of adj) if (!stunnedIn(q)) mk('stunfist', `Stunning fist on ${q.name} (${p.stunLeft} left)`, 'standard', q);
    if (clvl(p, 'bard') && p.musicLeft > 0 && tn.standard && !(f.music?.[side]?.by === p.id && musicOn(f, p))) mk('inspire', `Inspire courage (your side +1 to hit and damage; ${p.musicLeft} left)`, 'standard');
    if ((clvl(p, 'druid') || clvl(p, 'ranger')) && tn.standard && tn.move) for (const q of foes) if (calmable(q) && dist2(q, p) <= 9) mk('calm', `Calm the ${q.name.toLowerCase()} (wild empathy +${empathyBonus(p)} vs 25)`, 'full', q);
    if (p.cures > 0 && tn.standard) {
      for (const q of matesOf(f, p)) if (q.kind === 'human' && (q === p || dist2(q, p) <= 2.1) && (q.hp < q.maxhp || q.dying)) mk('cure', `Cure light wounds on ${q === p ? 'yourself' : q.name}`, 'standard', q);
      if (clvl(p, 'cleric') && !f.blessed?.[side]) mk('bless', 'Bless (your side +1 to hit)', 'standard');
      if (clvl(p, 'cleric')) for (const q of foes) if (q.kind === 'human' && dist2(q, p) <= 9) for (const w of ['halt', 'drop', 'fall', 'flee']) if (w !== 'drop' || q.weapon !== 'fists') mk('command', `Command ${q.name}: "${w}!"`, 'standard', q), acts[acts.length - 1].word = w;
      if (tn.move) mk('summon', clvl(p, 'druid') >= clvl(p, 'cleric') ? "Summon nature's ally (a wolf)" : 'Summon monster (a celestial dog)', 'full');
    }
    if (p.missiles > 0 && tn.standard) {
      for (const q of foes) if (dist2(q, p) < 30) { mk('missile', `Magic missile at ${q.name}`, 'standard', q); if (tn.move) mk('sleep', `Sleep around ${q.name} (4 HD, Will DC ${arcaneDC(p)}; hits friends too)`, 'full', q); }
      for (const q of foes) if (dist2(q, p) <= 4.6) mk('spray', `Color spray toward ${q.name} (15-ft cone; friends too)`, 'standard', q);
      if (!shieldUp(p)) mk('shield', 'Shield (+4 AC, stops magic missiles)', 'standard');
    }
    if (p.rays > 0 && tn.standard) for (const q of foes) if (dist2(q, p) < 30) mk('ray', `Scorching ray at ${q.name}`, 'standard', q);
  }

  function classAct(f, p, a, t, spend) {
    const side = sideOf(f, p);
    switch (a.id) {
      case 'flurry': {
        const pen = clvl(p, 'monk') >= 5 ? -1 : -2; logF(f, `${p.name} unleashes a flurry of blows.`);
        attack(f, p, t, { flurry: pen });
        const t2 = t.alive && conscious(t) ? t : foesOf(f, p).find(q => dist2(q, p) <= 2.1);
        if (t2 && conscious(p)) attack(f, p, t2, { flurry: pen });
        spend('full'); return true;
      }
      case 'stunfist': {
        p.stunLeft--; const h0 = t.hp, n0 = t.nl || 0; attack(f, p, t);
        if ((t.hp !== h0 || (t.nl || 0) !== n0) && t.alive && conscious(t)) { const dc = 10 + Math.floor(clvl(p, 'monk') / 2) + mod(p.st.wis), s = saveVs(t, 'f', dc); if (s.ok) logF(f, `${t.name} shrugs off the stunning fist (Fort ${s.r} vs ${dc}).`); else { t.stunned = { f: f.id, left: 1 }; logF(f, `${p.name}'s stunning fist leaves ${t.name} stunned (Fort ${s.r} vs ${dc}).`); } }
        else logF(f, `The stunning fist is spent.`);
        spend('standard'); return true;
      }
      case 'inspire': p.musicLeft--; (f.music ||= {})[side] = { by: p.id, last: f.round }; logF(f, `${p.name} sings out: inspire courage (their side +1 to hit and damage).`); spend('standard'); return true;
      case 'calm': calmBeast(p, t, f); spend('full'); return true;
      case 'cure': { p.cures--; const h = d(8) + Math.min(5, divineLvl(p)); healUp(t, h); logF(f, `${p.name} casts cure light wounds on ${t === p ? 'themself' : t.name}: +${h} hp. ${status(t) || ''}`); spend('standard'); return true; }
      case 'bless': p.cures--; (f.blessed ||= {})[side] = true; logF(f, `${p.name} casts bless: their side fights +1 to hit.`); spend('standard'); return true;
      case 'command': {
        p.cures--; const dc = divineDC(p), s = saveVs(t, 'w', dc), w = a.word || 'halt';
        if (s.ok) logF(f, `${p.name} commands ${t.name}: "${w}!" ${t.name} resists (Will ${s.r} vs ${dc}).`);
        else { t.commanded = { f: f.id, word: w }; logF(f, `${p.name} commands ${t.name}: "${w}!" (Will ${s.r} vs ${dc})`); }
        spend('standard'); return true;
      }
      case 'summon': p.cures--; summonAlly(f, p); spend('full'); return true;
      case 'missile': {
        p.missiles--; if (shieldUp(t)) { logF(f, `${p.name}'s magic missile splashes harmlessly on ${t.name}'s shield.`); spend('standard'); return true; }
        const n = Math.min(3, 1 + Math.floor((arcaneLvl(p) - 1) / 2)); let dmg = 0; for (let i = 0; i < n; i++) dmg += d(4) + 1; hurt(t, dmg, false, p);
        logF(f, `${p.name} casts magic missile at ${t.name}: ${n} missile${n > 1 ? 's' : ''} for ${dmg}. ${status(t) || ''}`); spend('standard'); return true;
      }
      case 'ray': {
        p.rays--; const touch = t.kind === 'animal' ? 10 + Math.floor((t.ac - 10) / 3) : 10 + Math.max(0, mod(t.st.dex)), r = d(20) + babOf(p) + mod(p.st.dex);
        if (r !== 20 && r < touch) logF(f, `${p.name}'s scorching ray misses ${t.name} (${r} vs touch AC ${touch}).`);
        else { const dmg = roll(4, 6); t.burnedRound = f.round; hurt(t, dmg, false, p); logF(f, `${p.name}'s scorching ray burns ${t.name} for ${dmg} fire. ${status(t) || ''}`); }
        spend('standard'); return true;
      }
      case 'sleep': p.missiles--; castSleep(f, p, t); spend('full'); return true;
      case 'spray': p.missiles--; castSpray(f, p, t); spend('standard'); return true;
      case 'shield': p.missiles--; p.shieldSpell = f.id; logF(f, `${p.name} casts shield: a shimmering disc (+4 AC, proof against magic missiles).`); spend('standard'); return true;
    }
    return false;
  }

  // at a body's turn: round-one flat-footedness ends as you act; stuns and commands take their turn
  function classTurnStart(f, p) {
    if (p.ambushed !== f.id) p.flatfooted = false;
    if (clvl(p, 'bard') && f.music?.[sideOf(f, p)]?.by === p.id) f.music[sideOf(f, p)].last = f.round;
    if (p.stunned && p.stunned.f === f.id) { logF(f, `${p.name} is stunned and can't act.`); if (--p.stunned.left <= 0) p.stunned = null; return true; }
    if (p.stunned) p.stunned = null;
    const c = p.commanded; if (c && c.f === f.id) {
      p.commanded = null;
      if (c.word === 'halt') { logF(f, `${p.name} halts, as commanded, and does nothing.`); return true; }
      if (c.word === 'fall') { p.prone = true; logF(f, `${p.name} falls prone, as commanded.`); }
      if (c.word === 'drop' && p.weapon !== 'fists') { const k = dropWeapon(f, p); logF(f, `${p.name} drops their ${WEAPONS[k]?.name.toLowerCase() || k}, as commanded.`); }
      if (c.word === 'flee') { p.fled = (p.fled || 0) + 1; const foe = foesOf(f, p).sort((a, b) => dist2(a, p) - dist2(b, p))[0]; if (foe) { const dx = p.x - foe.x, dz = p.z - foe.z, dd = Math.hypot(dx, dz) || 1, n = P(p.x + dx / dd * 9, p.z + dz / dd * 9); if (walkable(n)) { p.x = n.x; p.z = n.z; } } logF(f, `${p.name} flees, as commanded.`); return true; }
    }
    return false;
  }
  // at each new round: magic sleep runs out, summons fade
  function classRound(f) {
    for (const id of f.order.slice()) {
      const q = body(id); if (!q) continue;
      if (q.down === 'spell' && q.spellFight === f.id && f.round >= (q.spellWake || 0)) { q.down = null; q.sprayed = false; logF(f, `${q.name} stirs awake.`); }
      if (q.summoned && q.summonFight === f.id && f.round > q.summonUntil) { q.alive = false; delete sim.animals[q.id]; const i = f.order.indexOf(id); if (i >= 0) { f.order.splice(i, 1); if (i < f.turn) f.turn--; } f.sides.delete(id); logF(f, `The ${q.name.toLowerCase()} fades away.`); }
    }
  }
  // what the plain brains do with it
  function classTurn(f, p, acts, foes) {
    const pick1 = (id, fn = () => true) => acts.find(a => a.id === id && fn(a));
    const side = sideOf(f, p), mates = matesOf(f, p).filter(q => q.kind === 'human' || q.companion), thr = threatened(f, p).length;
    const coup = pick1('coup', a => { const t = body(a.target); return t.monster && t.down === 'spell'; }); if (coup) { act(f, p, coup); return true; }   // a sleeping beast is finished
    const ins = pick1('inspire'); if (ins && foes.length && f.round <= 3) { act(f, p, ins); return true; }
    if (clvl(p, 'cleric') && p.cures > 0) {
      const bl = pick1('bless'); if (bl && mates.length >= 2 && f.round <= 2) { act(f, p, bl); return true; }
      const cm = acts.filter(a => a.id === 'command' && body(a.target)).find(a => { const t = body(a.target); return p.cures >= 2 && (a.word === (t.weapon !== 'fists' ? 'drop' : 'halt')) && foes.some(q => q === t && dist2(q, p) <= 3); });
      if (cm && Math.random() < 0.6) { act(f, p, cm); return true; }
    }
    const sm = pick1('summon'); if (sm && p.cures >= 2 && f.round <= 2 && foes.some(q => q.monster) && !thr) { act(f, p, sm); return true; }
    if (p.missiles > 0) {
      const ally = (pt, r) => f.order.map(body).some(q => q && q !== p && q.alive && conscious(q) && sideOf(f, q) === side && dist2(q, pt) <= r);
      const sh = pick1('shield'); if (sh && thr && p.hp < p.maxhp * 0.6) { act(f, p, sh); return true; }
      const sp = acts.filter(a => a.id === 'spray').find(a => { const t = body(a.target), ax = t.x - p.x, az = t.z - p.z, al = Math.hypot(ax, az) || 1; const inCone = q => { const dx = q.x - p.x, dz = q.z - p.z, dd = Math.hypot(dx, dz); return dd <= 4.6 && (dd < 0.5 || (dx * ax + dz * az) / (dd * al) > 0.7); }; return !f.order.map(body).some(q => q && q !== p && q.alive && conscious(q) && sideOf(f, q) === side && inCone(q)) && foes.filter(inCone).length >= (thr ? 1 : 2); });
      if (sp) { act(f, p, sp); return true; }
      const sl = acts.filter(a => a.id === 'sleep').find(a => { const t = body(a.target); return hdOf(t) <= 4 && !ally(t, 3) && (t.monster || f.mode.get(p.id) === 'lethal' || t.kind === 'human'); });
      if (sl && !thr) { act(f, p, sl); return true; }
    }
    if (clvl(p, 'monk')) {
      const st = acts.find(a => a.id === 'stunfist' && body(a.target).hp > 6); if (st && Math.random() < 0.6) { act(f, p, st); return true; }
      const fl = acts.filter(a => a.id === 'flurry').sort((x, y) => body(x.target).hp - body(y.target).hp)[0]; if (fl) { act(f, p, fl); return true; }
    }
    const cl = pick1('calm'); if (cl && empathyBonus(p) >= 6 && Math.random() < 0.5) { act(f, p, cl); return true; }
    return false;
  }

  // ---- the shelter law (Rose) -----------------------------------------------------------
  // Taking someone in for their work is allowed (they live free; their wages go to whoever took them in). Sheltering for
  // nothing is not, nor a for-work lodger who didn't work about 4 hours that day; spouses are exempt. Found out (a chance
  // each night at 20:00), both are wanted for harboring; jailed for it, they forfeit everything to the town.
  const LAW = 'The law on shelter: an owner may take someone in to live in their house in exchange for work ("take in <person> for work": the lodger lives free and their wages go to the owner; "turn out <person>" ends it). Sheltering anyone for nothing is against the law, and so is keeping a for-work lodger who did not work about 4 hours that day; spouses are exempt. If it comes out, both are wanted for harboring (the bounty board and jail), and on being jailed for it they forfeit everything to the town: coin, goods, weapon, armour, houses, businesses and home. The mayor may pardon them by putting them to work.';
  function lawText(p) { const lodgers = housesOf(p).flatMap(i => Object.entries(HOUSES[i].lodgers || {}).map(([id, lg]) => `${sim.people[id]?.name} at ${houseName(i)} (${lg.work ? 'for work' : 'for nothing'})`)); return LAW + (lodgers.length ? ' Lodging with you: ' + lodgers.join(', ') + '.' : ''); }
  function takeIn(me, t, work) {
    if (!t || t.kind !== 'human' || !t.alive) return 'Take in whom?';
    const mine = housesOf(me); if (!mine.length) return 'You own no house to take anyone into.';
    if (t.home != null) return `${t.name} already has a roof.`;
    if (t.spouse === me.id) { moveIn(t, mine.includes(me.home) ? me.home : mine[0]); return `${t.name} moves in: family lives free.`; }
    const i = mine.includes(me.home) && residents(me.home).length < HOUSE_BEDS ? me.home : mine.find(k => residents(k).length < HOUSE_BEDS); if (i == null) return 'Your house is full.';
    if (t.brain !== 'human' && R(t, me).like < -0.2) return `${t.name} won't live under your roof.`;
    t.home = i; (HOUSES[i].lodgers ||= {})[t.id] = { by: me.id, work: !!work, since: sim.t };
    log('life', `${fullName(me)} takes ${t.name} in at ${houseName(i)}${work ? ' in exchange for work (their wages go to ' + me.name + ')' : ', for nothing'}.`, [me.id, t.id]);
    remember(t, { text: `${me.name} took me in at ${houseName(i)}${work ? ' for my work: my wages go to them, and I must work about 4 hours a day' : ' for nothing'}` }); bump(t, me, 'like', 0.2);
    return `You take ${t.name} in${work ? ' for work' : ''}.`;
  }
  function turnOut(me, t) {
    const i = t?.home, lg = i != null ? HOUSES[i].lodgers?.[t.id] : null;
    if (!lg || (lg.by !== me.id && HOUSES[i].owner !== me.id)) return 'They do not lodge with you.';
    delete HOUSES[i].lodgers[t.id]; t.home = null;
    log('life', `${me.name} turns ${t.name} out of ${houseName(i)}.`, [me.id, t.id]); remember(t, { text: `${me.name} turned me out of ${houseName(i)}` }); bump(t, me, 'like', -0.3);
    return `You turn ${t.name} out.`;
  }
  sim.takeIn = takeIn; sim.turnOut = turnOut;
  function charge(q, type) {
    const ev = { id: 'ev' + (++sim.rec.crimes) + '-' + type, type, actor: q.id, victim: null, at: { x: q.x, z: q.z }, t: sim.t, day: sim.day };
    sim.events.push(ev); if (sim.events.length > 400) sim.events.shift();
    q.record.push({ ev: ev.id, type, victim: null, by: ['watch'], day: sim.day, served: false, evidence: true }); postBounty(q, type);
  }
  function divest(q) {
    const coin = q.coin, gear = [q.weapon !== 'fists' && q.weapon, q.armor && q.armor !== 'none' && q.armor].filter(Boolean);
    if (coin > 0) pay(q, 'town', coin, 'forfeit');
    q.items = {}; q.weapon = 'fists'; q.armor = 'none'; q.shield = 'none';
    const hs = housesOf(q);
    for (const i of hs) { const h = HOUSES[i]; h.owner = null; if (h.stash > 0) { sim.treasury += h.stash; h.stash = 0; } for (const id of Object.keys(h.lodgers || {})) { const l = sim.people[id]; if (l && l.home === i) l.home = null; } h.lodgers = {}; }
    const biz = Object.values(sim.business).filter(b => b.owner === q.id); for (const b of biz) b.owner = null; if (JOBS[q.job]?.owner) q.job = 'none';
    if (q.home != null) { const h = HOUSES[q.home]; delete (h.lodgers || {})[q.id]; delete (h.tenants || {})[q.id]; q.home = null; }
    q.harborJailed = true;
    log('law', `${fullName(q)} forfeits everything to the town for harboring: ${money(coin)}${gear.length ? ', ' + gear.join(', ') : ''}${hs.length ? ', ' + hs.map(houseName).join(', ') : ''}${biz.length ? ', the ' + biz.map(b => b.id).join(', ') : ''}, and their home.`, [q.id]);
  }
  sim.divest = divest;
  function lodgingHour(h) {
    sim.fires = sim.fires.filter(f => f.until > sim.t);
    HOUSES.forEach((hs, i) => { for (const [id, lg] of Object.entries(hs.lodgers || {})) { const q = sim.people[id], o = sim.people[lg.by], gone = !o || !o.alive || hs.owner !== lg.by; if (!q || !q.alive || q.home !== i || gone) { delete hs.lodgers[id]; if (q && q.alive && q.home === i && gone) { q.home = null; remember(q, { text: `I lost my lodging at ${houseName(i)}` }); } } } });
    if (h === 19) for (const o of living()) {   // plain owners take in homeless friends: for work if they have a job, for nothing only if they care a lot and don't mind the law
      if (o.kind !== 'human' || thinks(o) || o.brain === 'human' || o.town || !housesOf(o).length || Math.random() > 0.3) continue;
      if (!housesOf(o).some(k => residents(k).length < HOUSE_BEDS)) continue;
      const f = living().filter(q => q !== o && q.kind === 'human' && !q.town && q.home == null && !(q.jailedUntil > 0) && R(o, q).like > 0.4).sort((a, b) => R(o, b).like - R(o, a).like)[0]; if (!f) continue;
      const work = f.job !== 'none'; if (!work && !(R(o, f).like > 0.6 && o.traits.honesty < 0.5)) continue;
      takeIn(o, f, work);
    }
    if (h === 20) {
      HOUSES.forEach((hs, i) => { for (const [id, lg] of Object.entries(hs.lodgers || {})) {
        const q = sim.people[id], o = sim.people[lg.by]; if (!q || !o || q.spouse === o.id) continue;
        const idle = !lg.work || (sim.t - lg.since > 720 && (q.workedToday || 0) < 240); if (!idle || Math.random() > 0.3) continue;
        if (openRecord(o).some(r => r.type === 'harboring')) continue;
        charge(o, 'harboring'); charge(q, 'harboring');
        log('law', `Word reaches the guard: ${o.name} is sheltering ${q.name} at ${houseName(i)} ${lg.work ? 'who does no work' : 'for nothing'}. Both are wanted for harboring.`, [o.id, q.id]);
      } });
      for (const p of living()) p.workedToday = 0;
    }
    if (sim.board.length) { const ks = keywords(sim.board[sim.board.length - 1].text); for (const q of living()) if (q.kind === 'human' && q.brain !== 'human' && conscious(q) && dist2(q, SPOTS.board) < 10) heardBy(q, ks); }   // reading the board
  }
  // ---- the notice board (Rose) ----------------------------------------------------------
  const boardText = raw => String(raw || '').replace(/^\s*(write|post|pin)\s*(up\s*)?((on|to)\s+the\s+(notice\s*)?board\s*)?[:,-]?\s*/i, '').replace(/^["']+|["']+$/g, '').slice(0, 200);
  function postBoard(p, text) {
    text = String(text || '').trim(); if (!text) return 'Write what?';
    sim.board.push({ by: p.id, name: p.id === 'player' ? 'Rose' : p.name, text, day: sim.day, clock: sim.clock() }); if (sim.board.length > 12) sim.board.shift();
    log('board', `${p.id === 'player' ? 'You write' : p.name + ' writes'} on the notice board: "${text}"`, [p.id]); learnWords(text);
    dataRow({ type: 'board', day: sim.day, role: roleOf(p), text });
    return 'You pin it to the notice board.';
  }
  const boardFacts = p => !sim.board.length || (areaOf(p) !== 'square' && dist2(p, SPOTS.board) > 25) ? '' : `The notice board in the Market square reads: ${sim.board.slice(-6).map(b => `"${b.text}" (${b.name}, day ${b.day})`).join('; ')}.`;
  sim.postBoard = postBoard;
  function housingHour(h) {
    lodgingHour(h);
    HOUSES.forEach((hs, i) => {
      hs.tenants ||= {};
      const o = hs.owner && sim.people[hs.owner];
      if (hs.owner && (!o || !o.alive)) hs.owner = null;
      if (o && o.alive && !thinks(o) && o.brain !== 'human' && !hs.askSet) { hs.ask = clamp(Math.round(1 + o.traits.greed * 4), 1, 5) * 10; hs.askSet = true; }
      for (const [id, until] of Object.entries(hs.tenants)) {
        const q = sim.people[id];
        if (!q || !q.alive || q.home !== i) { delete hs.tenants[id]; continue; }
        if (until > sim.t) continue;
        const ask = hs.ask || 20;
        if (o && o.alive && (q.coin >= ask || hs.stash >= ask)) { if (q.coin >= ask) pay(q, o, ask, 'rent'); else { hs.stash -= ask; o.coin += ask; } hs.tenants[id] = until + 1440; }
        else evict(q, o && o.alive ? `can't pay ${o.name} the ${money(ask)} rent` : 'the landlord is gone');
      }
    });
    if (!(h >= 21 || h < 6)) return;
    for (const p of living()) {   // vagrancy: a guard on duty who sees someone with no home in town after dark takes them in
      if (p.kind !== 'human' || p.home != null || p.town || p.id === 'player' || p.jailedUntil > 0 || !conscious(p) || p.carriedBy || p.fight || JOBS[p.job]?.place && inShift(p.job, h)) continue;   /* on shift in town is working, not loitering */
      const a = areaOf(p); if (!a || OUTSIDE.has(a) || roofed(p)) continue;
      if (p.vagrantAt && sim.t - p.vagrantAt < 360) continue;
      const g = living().find(q => q !== p && isGuard(q) && onDuty(q) && conscious(q) && !q.fight && dist2(q, p) < 20 && sees(q, p)); if (!g) continue;
      p.vagrantAt = sim.t; log('law', `${g.name} finds ${p.name} sleeping rough in town after dark.`, [g.id, p.id]);
      deed('vagrancy', p, null, P(p.x, p.z));
    }
  }
  function housingText(p) { return housingText0(p) + ' ' + lawText(p); }
  function housingText0(p) {
    const i = p.home, h = i != null ? HOUSES[i] : null, mine = housesOf(p), others = mine.filter(x => x !== i);
    const st = h ? (h.owner === p.id ? `You own ${houseName(i)} and live there` : h.tenants?.[p.id] > sim.t ? `You rent a bed at ${houseName(i)} from ${sim.people[h.owner]?.name || 'nobody'} (${money(h.ask || 20)} a night, paid by itself every 24 hours while you can)` : h.lodgers?.[p.id] ? `You lodge at ${houseName(i)} with ${sim.people[h.lodgers[p.id].by]?.name || 'its owner'} ${h.lodgers[p.id].work ? '(for your work: your wages go to them; work about 4 hours a day or it counts as harboring)' : '(for nothing: that is harboring, against the law)'}` : `You live at ${houseName(i)} with family`)
      : `You have NO HOME. From 21:00 to 6:00 you may not be anywhere in town (Wick Lane, the houses, the square, the shops, the tavern): a guard who sees you takes you in for vagrancy. The shelter at the end of Wick Lane (by the Schoolhouse) gives you a cot and a hot meal for 1 sp a night (free if you bring meat or fish you caught yourself) and counts as a roof${crewish(p) ? '; as one of the gang you can sleep free in the Cellar behind the Drowned Lantern' : ''}. You can busk in the Market square for coins. Outside town (the fields, the orchard, the ranch, the Wildwood) is allowed, but that's where the beasts come from. With no roof, the underworld's tools are within your reach too (pickpocket, mug, burgle, steal, hide, case, wait for, extort, ambush, rustle), no seedy career needed`;
    const list = HOUSES.map((hs, k) => { const o = sim.people[hs.owner]; return `${houseName(k)}: ${!hs.owner ? 'empty, for sale ' + money(HOUSE_PRICE) + ' at the town hall' : (o?.id === p.id ? 'yours' : (o?.name || '?') + "'s") + ', ' + money(hs.ask || 20) + ' a night, ' + residents(k).length + '/' + HOUSE_BEDS + ' beds taken'}`; }).join('; ');
    return `Home: ${st}.${others.length ? ' You also own ' + others.map(houseName).join(', ') + '.' : ''} Houses: ${list}. ("buy house <address>" at the town hall; "rent <address>" from its owner${mine.length ? '; as a landlord, "rent_out": 10-50 (cp) in your reply sets your nightly price' : ''}.)`;
  }
  const whoName = id => id === 'player' ? 'Rose' : sim.people[id]?.name || (sim.animals[id] ? 'a ' + String(sim.animals[id].name || sim.animals[id].species).toLowerCase() : 'someone');
  const memText = m => `${whoName(m.actor)}: ${m.type}${m.victim ? ' against ' + whoName(m.victim) : ''} (${m.how === 'saw' ? 'I saw it' : m.how === 'told' ? 'I was told' : m.how})`;
  // ---- experience and levels (Rose) ----------------------------------------------
  // XP: beasts (600 x CR, shared by everyone on the winning side, a quarter more to whoever lands the blow),
  // fights won against people (100 a level beaten), and 100 for every night lived through. Levels at 500 / 1500 / 3000 / 5000.
  const jobGroup = p => isGuard(p) ? 'guard' : JOBS[p.job]?.owner ? 'owner' : JOBS[p.job]?.payer === 'town' ? 'public' : p.underworld ? 'underworld' : p.job === 'none' ? 'jobless' : 'hand';
  function gainXP(p, n, why) {
    if (!p || p.kind !== 'human' || !p.alive || p.town || !(n > 0)) return;
    p.xp = (p.xp || 0) + Math.round(n); checkLevel(p);
  }
  sim.gainXP = gainXP;
  function checkLevel(p) {
    if (p.levelReady || (p.level || 1) >= MAX_LEVEL || (p.xp || 0) < XP_AT[(p.level || 1) + 1]) return;
    p.levelReady = true; p.levelReadyAt = sim.t;
    log('life', `${p.id === 'player' ? 'You have' : p.name + ' has'} earned level ${p.level + 1}.`, [p.id]);
    if (!thinks(p) && p.brain !== 'human') autoLevel(p);
    else if (p.brain === 'human') log('life', `Choose your class for level ${p.level + 1}: type "class <name>" in the say box (${Object.keys(PC).join(', ')}).`, [p.id]);
  }
  function featSlots(p, cls) { return (!p.feats ? 1 : 0) + (p.level + 1 === 3 ? 1 : 0) + (cls === 'fighter' && [1, 2, 4].includes(clvl(p, 'fighter') + 1) ? 1 : 0); }
  const normFeat = w0 => { const w = String(w0 || '').toLowerCase().trim(); if (!w) return null; const ks = Object.keys(FEATS); return ks.find(k => k.toLowerCase() === w) || ks.find(k => w.includes(k.toLowerCase())) || ks.find(k => k.toLowerCase().includes(w)) || null; };
  function applyFeat(p, k) {
    if (k === 'Toughness') { p.maxhp += 3; p.hp += 3; }
    const sk = { 'Alertness': ['spot', 'listen'], 'Persuasive': ['bluff', 'intimidate'], 'Negotiator': ['diplomacy', 'sense'], 'Stealthy': ['hide', 'sneak'], 'Self-Sufficient': ['heal'] }[k];
    if (sk) for (const x of sk) p.skills[x] = (p.skills[x] || 0) + 2;
  }
  function pickClass(p) { return learnedPick(p, false); }   // the plain brain's levelling: what the town has learned (below)
  function pickClassOld(p) {
    const cs = classesOf(p), have = Object.keys(cs).filter(k => PC[k] && !(k === 'rogue' && p.cls === 'rogue' && cs.rogue === 1 && !p.classes));
    if (have.length && Math.random() < 0.8) return have.sort((a, b) => cs[b] - cs[a])[0];   // mostly stay with the class they started
    const taught = sim.lore?.classPicks?.[jobGroup(p)];   // copy what the AI folk in the same line of work chose
    if (taught && Math.random() < 0.6) { const best = Object.entries(taught).sort((a, b) => b[1] - a[1])[0]; if (best && PC[best[0]]) return best[0]; }
    const j = p.job, st = p.st;
    if (isGuard(p) || j === 'mercenary') return p.traits.honesty > 0.8 && st.cha >= 12 ? 'paladin' : p.traits.aggression > 0.65 ? 'barbarian' : 'fighter';
    if (j === 'cleric' || j === 'doctor') return 'cleric';
    if (p.underworld || p.cls === 'rogue') return 'rogue';
    if (['farmer', 'farmhand', 'rancher', 'ranchhand'].includes(j)) return st.wis >= st.dex ? 'druid' : 'ranger';
    if (['teacher', 'clerk', 'innkeep', 'server'].includes(j)) return st.cha >= st.int ? 'bard' : 'wizard';
    const best = Object.entries(st).sort((a, b) => b[1] - a[1])[0][0];
    return { str: p.traits.aggression > 0.6 ? 'barbarian' : 'fighter', dex: Math.random() < 0.5 ? 'rogue' : 'ranger', con: 'barbarian', int: 'wizard', wis: pick(['cleric', 'druid', 'monk']), cha: pick(['sorcerer', 'bard', 'paladin']) }[best] || 'fighter';
  }
  function pickFeat(p, cls) {
    const ok = k => FEATS[k] && !p.feats.includes(k) && FEATS[k].req(p);
    { const FL = sim.lore?.featLearn?.[cls]; if (FL && Math.random() < 0.75) { const tot = Object.values(FL).reduce((t, e) => t + e.n, 0); let best = null, bv = -1; for (const k of Object.keys(FEATS).filter(ok)) { const e = FL[k], n = e?.n || 0, v = (n ? e.s / n : 0.5) + 0.3 * Math.sqrt(Math.log(tot + 2) / (n + 1)) + Math.random() * 0.05; if (v > bv) { bv = v; best = k; } } if (best) return best; } }   // feats the town learned paid off
    const taught = sim.lore?.featPicks?.[cls];
    if (taught && Math.random() < 0.5) { const best = Object.entries(taught).filter(([k]) => ok(k)).sort((a, b) => b[1] - a[1])[0]; if (best) return best[0]; }
    const pref = { fighter: ['Weapon Focus', 'Power Attack', 'Weapon Specialization', 'Cleave', 'Toughness', 'Dodge', 'Improved Initiative'], barbarian: ['Power Attack', 'Toughness', 'Cleave', 'Weapon Focus'], paladin: ['Weapon Focus', 'Toughness', 'Power Attack'], ranger: ['Point Blank Shot', 'Weapon Focus', 'Alertness', 'Toughness'], rogue: ['Improved Initiative', 'Dodge', 'Stealthy', 'Weapon Focus'], monk: ['Dodge', 'Improved Initiative', 'Toughness'], cleric: ['Toughness', 'Self-Sufficient', 'Great Fortitude'], druid: ['Toughness', 'Self-Sufficient', 'Great Fortitude'], bard: ['Negotiator', 'Persuasive', 'Toughness'], sorcerer: ['Toughness', 'Improved Initiative'], wizard: ['Toughness', 'Improved Initiative'] }[cls] || [];
    return [...pref, 'Toughness', 'Alertness', 'Improved Initiative', 'Great Fortitude'].find(ok) || Object.keys(FEATS).find(ok) || null;
  }
  function gainSlots(p) {   // levelling: add only what the new level adds to today's
    const before = { cures: p.cures || 0, missiles: p.missiles || 0, rays: p.rays || 0, layPool: p.layPool || 0, ragesLeft: p.ragesLeft || 0 }, was = p.slotMax || null;
    restDaily(p); if (!was) return;
    for (const k of Object.keys(before)) p[k] = Math.max(0, before[k] + (p[k] - (was[k] || 0)));
  }
  function restDaily(p) {
    const cl = clvl(p, 'cleric') + clvl(p, 'druid'), sor = clvl(p, 'sorcerer'), wiz = clvl(p, 'wizard'), pal = clvl(p, 'paladin'), bar = clvl(p, 'barbarian');
    p.cures = cl ? 1 + cl : 0;
    p.missiles = (sor ? 3 + sor : 0) + (wiz ? 2 + wiz : 0);
    p.rays = (sor >= 4 ? 1 : 0) + (wiz >= 3 ? 1 : 0) + (wiz >= 5 ? 1 : 0);
    p.layPool = pal ? Math.max(1, mod(p.st.cha)) * pal : 0;
    p.ragesLeft = bar ? 1 + (bar >= 4 ? 1 : 0) : 0;
    p.slotMax = { cures: p.cures, missiles: p.missiles, rays: p.rays, layPool: p.layPool, ragesLeft: p.ragesLeft };
    p.musicLeft = clvl(p, 'bard'); p.stunLeft = clvl(p, 'monk');   // bardic music and stunning fist, a day each
  }
  function companion(p) {
    const id = 'comp' + p.id; if (sim.animals[id]?.alive) return;
    const an = sim.animals[id] = { id, kind: 'animal', species: 'dog', name: p.name + "'s wolf", temper: 'aggressive', owner: p.id, alive: true, hp: 13, maxhp: 13, nl: 0, ac: 14, atk: 3, bite: [1, 6], dmgBonus: 1, x: 0, z: 0, yaw: 0, state: 'idle', stateT: 0, full: 0.8, bond: { [p.id]: 1 }, skills: { spot: 4, listen: 4 }, items: {}, companion: true };
    place(an, P(p.x + 1, p.z)); log('life', `A wolf comes out of the Wildwood and stays at ${p.name}'s side: an animal companion.`, [p.id]);
  }
  function levelUp(p, cls, featWant, chosen) {
    if (!p.levelReady || !PC[cls]) return false;
    (p.picks ||= []).push({ key: classKey(p), cls, lvl: (p.level || 1) + 1, ai: !!chosen });
    const cs = { ...classesOf(p) }; cs[cls] = (cs[cls] || 0) + 1;
    let slots = featSlots(p, cls);
    p.classes = cs; p.level = (p.level || 1) + 1;
    const g = Math.max(1, Math.floor(PC[cls].hd / 2) + 1 + mod(p.st.con)); p.maxhp += g; p.hp += g;
    for (const k of Object.keys(p.skills)) if (p.skills[k] - mod(p.st[SKILL_ABIL[k]] || 10) > 0 || PC[cls].skills.includes(k)) p.skills[k]++;   // a rank in what they're good at and in the class's own skills
    p.feats ||= [];
    const want = (Array.isArray(featWant) ? featWant : featWant ? [featWant] : []).map(normFeat).filter(Boolean), got = [];
    while (slots-- > 0) {
      const k = want.find(x => !p.feats.includes(x) && FEATS[x].req(p)) || pickFeat(p, cls); if (!k) break;
      const i = want.indexOf(k); if (i >= 0) want.splice(i, 1);
      p.feats.push(k); applyFeat(p, k); got.push(k); (p.featPicks ||= []).push({ cls, k });
      if (chosen) { const t = ((sim.lore.featPicks ||= {})[cls] ||= {}); t[k] = (t[k] || 0) + 1; }
    }
    if (chosen) { const t = ((sim.lore.classPicks ||= {})[jobGroup(p)] ||= {}); t[cls] = (t[cls] || 0) + 1; }
    if (cls === 'druid' && cs.druid === 1) companion(p); if ((cls === 'wizard' || cls === 'sorcerer') && !p.familiar && p.brain !== 'human') autoFamiliar(p);
    gainSlots(p);
    p.levelReady = false;
    log('life', `${p.id === 'player' ? 'You reach' : fullName(p) + ' reaches'} level ${p.level}: ${cls} ${cs[cls]}${got.length ? ' (feat: ' + got.join(', ') + ')' : ''}.`, [p.id]);
    remember(p, { text: `I reached level ${p.level} as a ${cls}${got.length ? ' and learned ' + got.join(', ') : ''}` });
    checkLevel(p);
    return true;
  }
  sim.levelUp = levelUp;
  // ---- FIRST LEVEL BY CHOICE, AND CLASSES THE PLAIN BRAIN LEARNS (Rose: "allow everyone to pick their first level class...
  // get rid of the default first level and rig it so the dumb brain can study how to pick classes / level ups") ----------
  // Everyone in town starts at level 1 in a player class they choose: an AI is asked ("first_class"); a plain brain picks by
  // what it has learned. The levels a body came with (a guard's second) are earned back as XP and taken one by one, by
  // choice. Every pick is filed with its situation (line of work and best ability), and at a generation's end each pick is
  // scored by how its taker did (survival and money, ranked against the town): sim.lore.classLearn / featLearn.
  const bestStat = p => Object.entries(p.st).sort((a, b) => b[1] - a[1])[0][0];
  const classKey = p => jobGroup(p) + '|' + bestStat(p);
  sim.classKey = classKey;
  // the old hand-made instinct, kept only as a nudge
  function classHunch(p) {
    const j = p.job, st = p.st;
    if (isGuard(p) || j === 'mercenary') return p.traits.honesty > 0.8 && st.cha >= 12 ? 'paladin' : p.traits.aggression > 0.65 ? 'barbarian' : 'fighter';
    if (j === 'cleric' || j === 'doctor') return 'cleric';
    if (p.underworld) return 'rogue';
    if (['farmer', 'farmhand', 'rancher', 'ranchhand', 'hunter'].includes(j)) return st.wis >= st.dex ? 'druid' : 'ranger';
    if (['teacher', 'clerk', 'innkeep', 'server', 'alchemist'].includes(j)) return st.cha >= st.int ? 'bard' : 'wizard';
    return { str: p.traits.aggression > 0.6 ? 'barbarian' : 'fighter', dex: 'rogue', con: 'barbarian', int: 'wizard', wis: 'cleric', cha: 'sorcerer' }[bestStat(p)] || 'fighter';
  }
  // a bandit over the town's memory: the mean outcome of this class in this situation, an explorer's bonus for the untried,
  // the hunch, what AI folk in the same work chose, and (levelling) the class already held
  function learnedPick(p, first) {
    const key = classKey(p), L = sim.lore?.classLearn?.[key] || {}, ai = sim.lore?.classPicks?.[jobGroup(p)] || {}, cs = classesOf(p);
    const tot = Object.values(L).reduce((t, e) => t + e.n, 0), aiTot = Object.values(ai).reduce((t, n) => t + n, 0) || 1, hunch = classHunch(p);
    let best = null, bv = -Infinity;
    for (const c of Object.keys(PC)) {
      const e = L[c], n = e ? e.n : 0, mean = n ? e.s / n : 0.5;
      const v = mean + 0.35 * Math.sqrt(Math.log(tot + 2) / (n + 1)) + (c === hunch ? 0.12 : 0) + 0.15 * (ai[c] || 0) / aiTot + (!first && cs[c] ? 0.18 : 0) + Math.random() * 0.06;
      if (v > bv) { bv = v; best = c; }
    }
    return best;
  }
  sim.learnedPick = learnedPick;
  function setFirstClass(p, cls, featWant, chosen) {
    if (!PC[cls] || p.kind !== 'human' || p.town) return false;
    const came = p.firstLvl ?? (p.level || 1); p.firstLvl = came;
    p.cls = cls; p.classes = { [cls]: 1 }; p.level = 1; p.levelReady = false;
    const hp = Math.max(2, PC[cls].hd + mod(p.st.con)), lost = Math.max(0, (p.maxhp || hp) - (p.hp ?? hp)); p.maxhp = hp; p.hp = Math.max(1, hp - lost);
    p.skills = skillsFor(cls, p.st, 1, [...new Set([...(p.focus || []), ...PC[cls].skills])]);
    p.feats = [];
    const want = (Array.isArray(featWant) ? featWant : featWant ? [featWant] : []).map(normFeat).filter(Boolean);
    let slots = 1 + (cls === 'fighter' ? 1 : 0); const got = [];
    while (slots-- > 0) { const k = want.find(x => !p.feats.includes(x) && FEATS[x].req(p)) || pickFeat(p, cls); if (!k) break; const i = want.indexOf(k); if (i >= 0) want.splice(i, 1); p.feats.push(k); applyFeat(p, k); got.push(k); (p.featPicks ||= []).push({ cls, k }); }
    (p.picks = (p.picks || []).filter(x => !x.first)).push({ key: classKey(p), cls, lvl: 1, first: true, ai: !!chosen });
    if (chosen) { const t = ((sim.lore.classPicks ||= {})[jobGroup(p)] ||= {}); t[cls] = (t[cls] || 0) + 1; }
    if (cls === 'druid') companion(p);
    if ((cls === 'wizard' || cls === 'sorcerer') && p.brain !== 'human') autoFamiliar(p);
    restDaily(p);
    p.firstClassed = true;
    log('life', `${p.id === 'player' ? 'You take' : fullName(p) + ' takes'} up the ${cls}'s path at level 1${got.length ? ' (feat: ' + got.join(', ') + ')' : ''}.`, [p.id]);
    if (came > 1 && (p.xp || 0) < XP_AT[came]) p.xp = XP_AT[came];   // the levels they came with, earned back to be chosen
    checkLevel(p);
    return true;
  }
  sim.setFirstClass = setFirstClass;
  function firstClassFor(p) {
    if (p.kind !== 'human' || p.town || p.firstClassed || p.ghost) return;
    if (p.brain === 'human') { p.firstPick = true; log('life', `Choose your first-level class: type "class <name>" in the say box (${Object.keys(PC).join(', ')}). Until you do, you stay as you are.`, [p.id]); return; }   // Rose picks hers
    setFirstClass(p, learnedPick(p, true), null, false);
    if (thinks(p)) { p.firstPick = true; p.firstPickAt = sim.t; }   // a provisional pick until the AI chooses its own
  }
  function firstClassPrompt(p) {
    return `FIRST LEVEL: choose the class you are (a D&D player class; you are a ${p.cls} until you choose). Add "first_class":"<class>" to your reply, and "feat":"<name>" for your first feat${p.cls === 'fighter' ? ' (a fighter gets two)' : ''}. Classes: ${Object.entries(PC).map(([k, c]) => k + ' (d' + c.hd + ' hp; ' + c.blurb + ')').join('; ')}. Feats: ${Object.entries(FEATS).filter(([, ft]) => ft.req(p)).map(([k, ft]) => k + ' (' + ft.blurb + ')').join('; ')}.`;
  }
  // the clergy's gift (Rose): two healing draughts for everyone in town, once
  function clergyGift(p) { if (p.kind !== 'human' || p.town || p.clergyGift) return; p.clergyGift = true; p.items.cure = (p.items.cure || 0) + 2; }
  function townBegins() {
    sim.begun = true;
    for (const p of everyone()) { firstClassFor(p); clergyGift(p); }
    const priest = living().find(q => q.job === 'cleric');
    log('life', `${priest ? 'The chapel\u2019s cleric, ' + priest.name + ',' : 'The clergy of the chapel'} ${priest ? 'gives' : 'give'} everyone in Hollow Town two healing draughts.`, priest ? [priest.id] : []);
  }
  // what the town learns from a generation's picks: each scored by its taker's rank in the town (0 worst, 1 best)
  function learnPicks(pop) {
    if (!sim.lore || pop.length < 2) return;
    const ranked = pop.slice().sort((a, b) => fitness(a) - fitness(b)), N = ranked.length;
    const CL = (sim.lore.classLearn ||= {}), FL = (sim.lore.featLearn ||= {});
    ranked.forEach((p, i) => {
      const r = N > 1 ? i / (N - 1) : 0.5, v = 0.5 * r + 0.5 * (p.alive ? 1 : 0);
      for (const k of p.picks || []) { const e = ((CL[k.key] ||= {})[k.cls] ||= { n: 0, s: 0 }); e.n++; e.s += v; dataRow({ type: 'class_pick', key: k.key, cls: k.cls, lvl: k.lvl, first: !!k.first, ai: !!k.ai, outcome: +v.toFixed(3) }); }
      for (const k of p.featPicks || []) { const e = ((FL[k.cls] ||= {})[k.k] ||= { n: 0, s: 0 }); e.n++; e.s += v; }
    });
    for (const t of [CL, FL]) for (const m of Object.values(t)) for (const e of Object.values(m)) if (e.n > 400) { e.s *= 400 / e.n; e.n = 400; }   // old generations fade
  }
  const autoLevel = p => levelUp(p, pickClass(p), null, false);
  function levelText(p) {
    const res = [p.cures ? p.cures + ' cure light wounds' : '', p.missiles ? p.missiles + ' magic missiles' : '', p.rays ? p.rays + ' scorching rays' : '', p.layPool ? p.layPool + ' hp of lay on hands' : '', p.ragesLeft ? p.ragesLeft + ' rage' + (p.ragesLeft > 1 ? 's' : '') : ''].filter(Boolean);
    return ` Level ${p.level || 1} (${classLine(p)}), ${p.xp || 0} XP${(p.level || 1) < MAX_LEVEL ? ', level ' + ((p.level || 1) + 1) + ' at ' + XP_AT[(p.level || 1) + 1] : ' (the top)'}.${p.feats?.length ? ' Feats: ' + p.feats.join(', ') + '.' : ''}${res.length ? ' Left today: ' + res.join(', ') + '.' : ''}`;
  }
  function levelPrompt(p) {
    const base = featSlots(p, 'x'), fb = [1, 2, 4].includes(clvl(p, 'fighter') + 1);
    return `LEVEL UP! You've earned level ${p.level + 1}. Choose the class you take it in: add "level_class":"<class>" to your reply. You are ${classLine(p)} now. Classes: ${Object.entries(PC).map(([k, c]) => k + ' (' + c.blurb + ')').join('; ')}.` +
      (base || fb ? ` This level gives you ${base ? base + ' feat' + (base > 1 ? 's' : '') : 'no feat'}${fb ? (base ? ', and one more' : ', but one') + ' if you take it as a fighter' : ''}: add "feat":"<name>"${base + (fb ? 1 : 0) > 1 ? ' or a list' : ''}. Feats you can take: ${Object.entries(FEATS).filter(([k, ft]) => !p.feats?.includes(k) && ft.req(p)).map(([k, ft]) => k + ' (' + ft.blurb + ')').join('; ')}.` : '');
  }
  sim.classLine = classLine; sim.XP_AT = XP_AT; sim.PC = PC; sim.FEATS = FEATS;
  // ---- death and the graveyard ---------------------------------------------------
  function die(p, killer, how) {
    if (!p.alive) return;
    try { p.deathInfo = scoreInfo(p, killer); } catch (e) {}
    try { (sim.genLog ||= []).push({ t: 'death', day: sim.day, hr: Math.floor(H()), who: p.id === sim.mayorId ? 'the mayor' : p.job === 'none' ? 'a jobless one' : 'a ' + (JOBS[p.job]?.title || 'townsperson').toLowerCase(), killer: killer ? (sim.animals[killer.id] ? (killer.name || 'a beast') : 'a person') : null, how: how || '', where: AREAS[areaOf(p)]?.name || 'the road', doing: p.lastChoice?.kind || p.state || '' }); } catch (e) {}
    try {
      const where = AREAS[areaOf(p)]?.name || 'the road', doing = p.state === 'sleep' || p.lastChoice?.kind === 'sleep' ? 'asleep' : p.lastChoice?.kind ? 'doing ' + p.lastChoice.kind : '', beast = killer && sim.animals[killer.id];
      const by = beast ? 'a ' + String(killer.name).toLowerCase() : killer ? (killer.id === 'player' ? 'Rose' : killer.name) : null;
      const what = by ? `killed by ${by}` : how ? String(how) : 'dead';
      for (const q of living()) if (q !== p && q.kind === 'human' && q.alive && (dist2(q, p) < 12 && sees(q, p))) remember(q, { text: `I saw ${p.name} ${what} at ${where}${doing ? ' (' + doing + ')' : ''}, day ${sim.day} ${Math.floor(H())}:00.`, big: true, death: p.id });
      (sim.deathNews ||= []).push({ id: p.id, text: `${fullName(p)} died: ${beast ? what : killer ? 'killed by someone' : what}, at ${where}${doing ? ' while ' + doing : ''}, day ${sim.day} around ${Math.floor(H())}:00.` });
    } catch (e) {}
    if (p.lastChoice && sim.lore) { if (p.lastChoice.x && sim.studentMode !== 'habit') nudge(p.lastChoice.x, p.lastChoice.kind, -1, 0.05); lesson(p.lastChoice.key, p.lastChoice.kind, -40, false); dataRow({ type: 'death', day: sim.day, sit: p.lastChoice.key, choice: p.lastChoice.kind, how: how || '', role: roleOf(p), x: (p.lastChoice.x || p.lastChoice.rx) ? Array.from(p.lastChoice.x || p.lastChoice.rx, r2) : undefined }); p.lastChoice = null; }   // the worst outcome there is
    p.deathWorth = worth(p);
    if (p.kind === 'human') {   // every death the ticker counts
      (sim.deathsByDay ||= {})[sim.day] = (sim.deathsByDay[sim.day] || 0) + 1;
      (sim.deathTimes ||= []).push(sim.t); const n = (sim.rec.deaths || 0) + 1;   // the ticker's count, this death included
      if (n > sim.MAX_DEATHS && !sim.failed) { sim.failed = { day: sim.day, n, hr: Math.floor(H()) }; log('death', `${n} dead in Hollow Town (day ${sim.day}). THE TOWN HAS FAILED.`, [p.id]); }
      else if (n === sim.MAX_DEATHS && !sim.failed) { log('death', `${n} dead in Hollow Town: one more and the town fails.`, [p.id]); for (const q of living()) if (q !== p && q.kind === 'human' && q.alive && !q.town) remember(q, { text: `${n} of us have died (day ${sim.day}). One more death and the whole town fails.`, big: true }); }
    }
    p.alive = false; p.deadAt = sim.t; p.state = 'dead'; p.task = null; p.dying = false; sim.rec.deaths++;
    for (const hs of HOUSES) if (hs.owner === p.id) { const sp = p.spouse && sim.people[p.spouse]; hs.owner = sp && sp.alive ? sp.id : null; }
    const worn = {}; for (const k of [p.weapon !== 'fists' && p.weapon, p.armor && p.armor !== 'none' && p.armor, p.shield && p.shield !== 'none' && p.shield]) if (k) worn[k] = (worn[k] || 0) + 1;
    for (const [k, n] of Object.entries(p.items)) if (n > 0) worn[k] = (worn[k] || 0) + n;
    sim.bodies.push({ id: p.id, name: fullName(p), x: p.x, z: p.z, coin: p.coin, items: worn, weapon: p.weapon, buried: false, killer: killer?.id || null, how });
    p.coin = 0;
    const beast = killer && killer.kind === 'animal';
    log('death', `${fullName(p)} dies${killer ? (beast ? ', killed by ' + (/^[aeiou]/i.test(killer.name) ? 'an ' : 'a ') + killer.name.toLowerCase() : ' at the hands of ' + fullName(killer)) : ''}${how && !beast ? ' (' + how + ')' : ''}.`, [p.id, killer?.id].filter(Boolean));
    if (killer && !beast) { killer.stats.kills++; deed('murder', killer, p, p, { victimKnows: false }); }
    for (const q of living()) if (R(q, p).like > 0.4 && killer && !beast) { q.grudge = q.grudge || {}; q.grudge[killer.id] = (q.grudge[killer.id] || 0) + 6 + R(q, p).like * 6; }
    if (p.spouse && sim.people[p.spouse]) { sim.people[p.spouse].spouse = null; sim.people[p.spouse].widowed = p.id; }
    if (p.id === sim.mayorId) { log('politics', 'The mayor is dead. The office is empty until the election.', []); sim.mayorId = null; }
    if (p.id === sim.captainId) sim.captainId = null;
    for (const g of Object.values(sim.gangs)) if (g.boss === p.id) succession(g);
  }
  sim.die = die;
  // the scoreboard (Rose only, never shown to the town): who lived, by home, weapon, work, class, and guards near the dead
  const mainClass = p => { const cs = Object.entries(classesOf(p)).filter(([k]) => PC[k]).sort((a, b) => b[1] - a[1]); return (p.level || 1) > 1 && cs.length ? cs[0][0] : 'level 1'; };
  function scoreInfo(p, killer) { return { housed: p.home != null, armed: !WEAPONS[p.weapon]?.weak, group: jobGroup(p), cls: mainClass(p), guard: living().some(g => g !== p && isGuard(g) && conscious(g) && dist2(g, p) < 15), by: killer ? (killer.kind === 'animal' ? 'beast' : 'person') : 'other' }; }
  function scoreboard() {
    const out = { housed: {}, armed: {}, group: {}, cls: {}, guardAtDeath: { deaths: 0, guard: 0, beastDeaths: 0, beastGuard: 0 } };
    const add = (cat, k, lived) => { const c = (out[cat][k] ||= [0, 0]); c[1]++; if (lived) c[0]++; };
    for (const p of everyone()) {
      if (p.kind !== 'human' || p.town || p.id === 'player' || p.ghost) continue;
      const i = p.alive ? scoreInfo(p) : (p.deathInfo || scoreInfo(p));
      add('housed', i.housed ? 'housed' : 'homeless', p.alive); add('armed', i.armed ? 'armed' : 'unarmed', p.alive); add('group', i.group, p.alive); add('cls', i.cls, p.alive);
      if (!p.alive) { const g = out.guardAtDeath; g.deaths++; if (i.guard) g.guard++; if (i.by === 'beast') { g.beastDeaths++; if (i.guard) g.beastGuard++; } }
    }
    return out;
  }
  sim.scoreboard = scoreboard;
  function succession(g) {
    const usurper = g.coupBy && sim.people[g.coupBy];
    if (usurper && usurper.alive && usurper.gang === g.id) { g.boss = usurper.id; g.coupBy = null; g.underboss = null; log('gang', `${fullName(usurper)} takes ${g.name} by force.`, [usurper.id]); return; }
    if (!gangMembers(g.id).length) { log('gang', `${g.name} is finished.`); delete sim.gangs[g.id]; return; }
    gangVote(g, 'the boss is gone');
  }
  // ======================================================= ranks by vote ==
  // Guards choose their captain from among themselves; gang members choose their boss.
  // The runner-up is second in command (sergeant / underboss) and stands in while the
  // first is jailed. Each voter weighs liking, trust, strength, standing, bribes, their own
  // ambition, and their own declared choice (an AI's "captain_vote" / "boss_vote").
  function rankScore(v, c, office) {
    let sc = R(v, c).like * 3 + R(v, c).trust + might(c) * 0.3 + c.level * 0.5 + Math.min(1.5, seen(v, c).worth / 80) + (v.voteBribes?.[c.id] || 0) * v.traits.greed * 0.04 + rnd(-0.5, 0.5);
    if (v === c) sc += 1 + v.traits.ambition * 4;
    if (v[office + 'Vote'] === c.id) sc += 6;
    if (office === 'captain') { sc += Math.min(3, (c.stats.arrests || 0) * 0.3); if (sim.mayorPick === c.id) sc += 1.5; if (c.gang && v.gang === c.gang) sc += 3; }
    if (office === 'boss') { sc += (c.stats.kills || 0) * 0.5 + (c.stats.wins || 0) * 0.15 + power(c) / 10; if (c.jailedUntil > 0) sc -= 2; }
    return sc;
  }
  function tally(voters, cands, office) {
    const t = Object.fromEntries(cands.map(c => [c.id, 0]));
    for (const v of voters) { let best = null, bs = -1e9; for (const c of cands) { const sc = rankScore(v, c, office); if (sc > bs) { bs = sc; best = c; } } if (best) t[best.id]++; }
    return cands.slice().sort((a, b) => t[b.id] - t[a.id] || might(b) - might(a)).map(c => [c, t[c.id]]);
  }
  function guardVote(why) {
    const guards = living().filter(q => isGuard(q) && q.kind === 'human' && !q.town);
    const cands = guards.filter(q => q.jailedUntil <= 0 && conscious(q));
    if (!cands.length) return;
    const res = tally(guards.filter(q => q.jailedUntil <= 0), cands, 'captain'), [win, second] = res;
    const old = sim.people[sim.captainId];
    if (old && old.alive && old !== win[0]) old.job = 'guard';
    win[0].job = 'captain'; sim.captainId = win[0].id;
    for (const q of guards) if (q.rank === 'sergeant' || q.rank === 'acting captain') q.rank = null;
    win[0].rank = 'captain'; if (second) second[0].rank = 'sergeant';
    sim.actingCaptainFor = null;
    log('politics', `The guards choose their captain${why ? ' (' + why + ')' : ''}: ${res.map(([c, n]) => c.name + ' ' + n).join(', ')}. ${fullName(win[0])} ${old === win[0] ? 'stays captain' : 'is captain now'}${second ? ', ' + second[0].name + ' sergeant' : ''}.`, res.map(([c]) => c.id));
    for (const v of guards) v.captainVote = null;
  }
  function gangVote(g, why) {
    const members = gangMembers(g.id), cands = members.filter(q => q.jailedUntil <= 0 && conscious(q));
    if (!cands.length) return;
    const res = tally(members.filter(q => q.jailedUntil <= 0), cands, 'boss'), [win, second] = res;
    const old = sim.people[g.boss];
    g.boss = win[0].id; g.underboss = second ? second[0].id : null; g.acting = null; g.jailedBoss = null;
    log('gang', `${g.name} choose their boss${why ? ' (' + why + ')' : ''}: ${res.map(([c, n]) => c.name + ' ' + n).join(', ')}. ${fullName(win[0])} ${old === win[0] ? 'keeps the crew' : 'leads now'}${second ? ', ' + second[0].name + ' underboss' : ''}.`, res.map(([c]) => c.id));
    if (old && old.alive && old !== win[0]) { bump(old, win[0], 'like', -0.3); remember(old, { text: `my crew dropped me for ${win[0].name}` }); }
    for (const v of members) v.bossVote = null;
  }
  sim.guardVote = guardVote; sim.gangVote = gangVote;
  // stand-ins: a jailed captain or boss is replaced by their second until they're free again
  function standIns() {
    const cap = sim.people[sim.captainId];
    if (cap && cap.alive && cap.jailedUntil > 0 && !sim.actingCaptainFor) {
      const sgt = living().find(q => q.rank === 'sergeant' && isGuard(q) && q.jailedUntil <= 0) || living().filter(q => isGuard(q) && q.jailedUntil <= 0 && q !== cap).sort((a, b) => b.level - a.level)[0];
      if (sgt) { sim.actingCaptainFor = cap.id; cap.job = 'guard'; sgt.job = 'captain'; sgt.rank = 'acting captain'; sim.captainId = sgt.id; log('politics', `With Captain ${cap.name} in a cell, ${sgt.name} takes charge of the guard.`, [sgt.id, cap.id]); }
    }
    const was = sim.people[sim.actingCaptainFor];
    if (was && was.alive && was.jailedUntil <= 0) { const act = sim.people[sim.captainId]; if (act) { act.job = 'guard'; act.rank = 'sergeant'; } was.job = 'captain'; was.rank = 'captain'; sim.captainId = was.id; sim.actingCaptainFor = null; log('politics', `${was.name} is out and takes the guard back.`, [was.id]); }
    else if (sim.actingCaptainFor && (!was || !was.alive || !isGuard(was) && was.job !== 'guard')) sim.actingCaptainFor = null;
    if (!sim.captainId || !sim.people[sim.captainId]?.alive) guardVote('no captain');
    for (const g of Object.values(sim.gangs)) {
      const b = sim.people[g.boss];
      if (!b || !b.alive || b.gang !== g.id) { succession(g); continue; }
      if (b.jailedUntil > 0 && !g.jailedBoss) { const ub = sim.people[g.underboss]; const act = ub && ub.alive && ub.gang === g.id && ub.jailedUntil <= 0 ? ub : gangMembers(g.id).filter(q => q !== b && q.jailedUntil <= 0).sort((x, y) => might(y) - might(x))[0]; if (act) { g.jailedBoss = b.id; g.boss = act.id; g.acting = true; log('gang', `${b.name} is in a cell; ${act.name} runs ${g.name} for now.`, [act.id, b.id]); } }
      const jb = sim.people[g.jailedBoss];
      if (jb && jb.alive && jb.jailedUntil <= 0 && jb.gang === g.id) { const act = sim.people[g.boss]; g.boss = jb.id; g.underboss = act?.id || g.underboss; g.jailedBoss = null; g.acting = false; log('gang', `${jb.name} is out and takes ${g.name} back${act && act.traits.ambition > 0.7 ? ` (${act.name} doesn't like it)` : ''}.`, [jb.id]); if (act && act.traits.ambition > 0.7) bump(act, jb, 'like', -0.2); }
      else if (g.jailedBoss && (!jb || !jb.alive || jb.gang !== g.id)) g.jailedBoss = null;
    }
  }
  sim.standIns = standIns;
  // who needs carrying to the infirmary: the dying, and the badly hurt left lying (not those in a fight, a cell or already carried)
  function patients() {
    return living().filter(q => q.kind === 'human' && q.alive && !q.fight && q.jailedUntil <= 0 && !q.carriedBy && areaOf(q) !== 'healer' && (q.dying || (q.down && q.hp < q.maxhp * 0.5) || (q.down && q.sick?.sym)))
      .sort((a, b) => (b.dying ? 1 : 0) - (a.dying ? 1 : 0));
  }
  sim.patients = patients;
  const doctorIn = () => living().some(q => q.job === 'doctor' && free(q) && areaOf(q) === 'healer' && q.task?.kind === 'work');
  const classInSession = () => living().some(q => q.job === 'teacher' && free(q) && areaOf(q) === 'school' && q.task?.kind === 'work');
  sim.doctorIn = doctorIn;
  function treatPatients(dt) {
    for (const q of living()) if (areaOf(q) === 'healer' && q.kind === 'human' && q.hp < q.maxhp) {
      if (q.dying) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 60; }
      q.hp = Math.min(q.maxhp, q.hp + dt * (doctorIn() ? 10 : 5) / 1440);   // 5 HP a day in the Infirmary (Rose) q.nl = Math.max(0, Math.min(q.nl, q.maxhp - q.hp));
    }
  }
  // ---- disease (SRD 3.5, Disease: https://www.dandwiki.com/wiki/SRD:Disease) -------------------
  // Exposure -> Fort save vs DC, or catch it. After the incubation, a save every day: fail and the damage lands, two
  // saves in a row (devil chills: three) and it's beaten. A doctor at the Infirmary can roll Heal instead of your save
  // (SRD long-term care); mummy rot never yields to saves, only to a cleric. Ability damage comes back 1 a day.
  // Con 0 kills; Str or Dex 0 leaves you helpless; Int, Wis or Cha 0 knocks you out.
  const DISEASES = {
    blinding: { name: 'Blinding sickness', via: 'ingested', dc: 16, inc: [1, 3], dmg: { str: [1, 4] }, blind: true, looks: 'aching limbs and clouding eyes' },
    cackle:   { name: 'Cackle fever', via: 'inhaled', dc: 16, inc: [1, 1], dmg: { wis: [1, 6] }, spreads: 2.5, chance: 0.15, looks: 'a fever and fits of laughter' },
    demon:    { name: 'Demon fever', via: 'injury', dc: 18, inc: [1, 1], dmg: { con: [1, 6] }, drain: true, looks: 'a burning fever and wracking pain' },
    chills:   { name: 'Devil chills', via: 'injury', dc: 14, inc: [1, 4], dmg: { str: [1, 4] }, saves: 3, looks: 'shivering and a creeping weakness' },
    filth:    { name: 'Filth fever', via: 'injury', dc: 12, inc: [1, 3], dmg: { dex: [1, 3], con: [1, 3] }, looks: 'a fever and a festering wound' },
    mindfire: { name: 'Mindfire', via: 'inhaled', dc: 12, inc: [1, 1], dmg: { int: [1, 4] }, spreads: 2.5, chance: 0.12, looks: 'a burning head and muddled talk' },
    mummy:    { name: 'Mummy rot', via: 'contact', dc: 20, inc: [1, 1], dmg: { con: [1, 6] }, cleric: true, spreads: 1.0, chance: 0.04, looks: 'skin flaking away like dust' },
    redache:  { name: 'Red ache', via: 'injury', dc: 15, inc: [1, 3], dmg: { str: [1, 6] }, looks: 'red, swollen joints' },
    shakes:   { name: 'Shakes', via: 'contact', dc: 13, inc: [1, 1], dmg: { dex: [1, 8] }, spreads: 1.5, chance: 0.1, looks: 'hands that will not stop trembling' },
    slimy:    { name: 'Slimy doom', via: 'contact', dc: 14, inc: [1, 1], dmg: { con: [1, 4] }, drain: true, spreads: 1.2, chance: 0.08, looks: 'skin turning grey and slimy' },
  };
  sim.DISEASES = DISEASES;
  // paid care (Rose): the Infirmary's doctor tries a cure (Heal vs the DC), the Chapel's cleric drives out anything.
  // Each takes only so many patients at a time; a place stays yours for 4 hours.
  sim.careSlots = { healer: 3, chapel: 2 }; sim.careFee = { healer: 30, chapel: 60 };
  const careTaker = where => living().find(q => q.job === (where === 'chapel' ? 'cleric' : 'doctor') && free(q) && areaOf(q) === where && q.task?.kind === 'work');
  function inCare(where) { sim.care ||= {}; return (sim.care[where] = (sim.care[where] || []).filter(e => e.until > sim.t && sim.people[e.id]?.alive)); }
  sim.careTaker = careTaker; sim.inCare = inCare;
  const fortSave = p => d(20) + mod(p.st.con) + (p.feats?.includes('Great Fortitude') ? 2 : 0) + Object.entries(classesOf(p)).reduce((t, [k, n]) => t + (k === 'warrior' || PC[k]?.fort ? 2 + Math.floor(n / 2) : Math.floor(n / 3)), 0);
  function expose(p, key, why) {
    if (clvl(p, 'paladin') >= 3) return;   // divine health
    if (!p || !p.alive || p.kind !== 'human' || p.sick || !DISEASES[key]) return false;
    if (fortSave(p) >= DISEASES[key].dc) return false;
    const D = DISEASES[key];
    p.sick = { key, day: sim.day, onset: sim.day + irnd(D.inc[0], D.inc[1]), sym: false, streak: 0, why: why || '' };
    return true;
  }
  sim.expose = expose;
  function hurtAbility(p, k, amt, perm, D) {
    p.abDmg ||= {}; p.st[k] -= amt; p.abDmg[k] = (p.abDmg[k] || 0) + amt - perm;
    if (p.st[k] > 0) return;
    p.abDmg[k] += p.st[k]; p.st[k] = 0;
    if (k === 'con') { if (p.brain === 'human') { p.st.con = 1; p.down = 'out'; p.downUntil = sim.t + 1440; log('life', `${p.name} collapses with ${D.name}.`, [p.id]); } else die(p, null, D.name.toLowerCase()); return; }
    p.down = 'out'; p.downUntil = sim.t + 1440;
    log('life', `${fullName(p)} is laid low by ${D.name.toLowerCase()} (${k} gone).`, [p.id]);
  }
  function diseaseDay() {
    for (const p of living()) {
      if (p.kind !== 'human') continue;
      if (p.abDmg) for (const k of Object.keys(p.abDmg)) if (p.abDmg[k] > 0) { p.abDmg[k]--; p.st[k]++; }
      const s = p.sick; if (!s) continue;
      const D = DISEASES[s.key];
      if (!s.sym) { if (sim.day < s.onset) continue; s.sym = true; log('life', `${fullName(p)} falls ill: ${D.name.toLowerCase()}.`, [p.id]); remember(p, { text: `I fell ill with ${D.name.toLowerCase()}${s.why ? ' (from ' + s.why + ')' : ''}` }); }
      const atCare = ['healer', 'chapel'].includes(areaOf(p)) || p.state === 'patient';
      if (D.cleric) { if (atCare && living().some(q => q.job === 'cleric' && free(q) && q.task?.kind === 'work')) { p.sick = null; log('life', `The cleric drives the ${D.name.toLowerCase()} out of ${fullName(p)}.`, [p.id]); continue; } }
      let r = fortSave(p);
      const doc = atCare && living().find(q => q.job === 'doctor' && free(q) && areaOf(q) === 'healer');
      if (doc) r = Math.max(r, d(20) + (doc.skills.heal || 0));
      if (r >= D.dc) { if (D.cleric) continue; if (++s.streak >= (D.saves || 2)) { p.sick = null; log('life', `${fullName(p)} shakes off the ${D.name.toLowerCase()}${doc ? ' (with ' + doc.name + "'s care)" : ''}.`, [p.id]); remember(p, { text: `I got over ${D.name.toLowerCase()}` }); } continue; }
      s.streak = 0;
      for (const [k, [n, sides]] of Object.entries(D.dmg)) {
        if (!p.alive) break;
        const amt = roll(n, sides), perm = D.drain && amt >= 2 && fortSave(p) < D.dc ? 1 : 0;
        hurtAbility(p, k, amt, perm, D);
        if (D.blind && amt >= 2 && !p.blind && p.alive && fortSave(p) < D.dc) { p.blind = true; p.skills.spot -= 10; log('life', `${fullName(p)} goes blind from ${D.name.toLowerCase()}.`, [p.id]); }
      }
    }
    // now and then something goes round the town on its own: bad air off the marsh, a cough from the caravans
    if (Math.random() < 0.3) { const pool = living().filter(q => q.kind === 'human' && !q.town && q.id !== 'player' && !q.sick); const q = pool.length && pick(pool); if (q) expose(q, pick(['cackle', 'mindfire', 'shakes', 'filth']), 'the town air'); }
  }
  function diseaseHour() {   // the catching kinds pass to whoever is close to the sick
    for (const p of living()) {
      const D = p.sick?.sym && DISEASES[p.sick.key]; if (!D?.spreads) continue;
      for (const q of living()) if (q !== p && q.kind === 'human' && !q.sick && dist2(p, q) < D.spreads && sameSpace(p, q) && Math.random() < (D.chance ?? 0.1)) expose(q, p.sick.key, p.name);
    }
  }
  function identifies(obs, q) {   // only a trained healer (Heal +4 or better, or a doctor or cleric) can name it: Heal check vs the DC, once per illness
    if (!q.sick) return false;
    const k = q.id + ':' + q.sick.key + ':' + q.sick.day; obs.idd ||= {};
    if (!(k in obs.idd)) obs.idd[k] = ((obs.skills?.heal || 0) >= 4 || ['doctor', 'cleric'].includes(obs.job)) && d(20) + (obs.skills?.heal || 0) + (['doctor', 'cleric'].includes(obs.job) ? 4 : 0) >= DISEASES[q.sick.key].dc;
    return obs.idd[k];
  }
  sim.identifies = identifies;
  const illLook = (obs, q) => { const D = DISEASES[q.sick.key]; return identifies(obs, q) ? `ill with ${D.name.toLowerCase()}${D.spreads ? ', catching' : ''}` : `looks ill: ${D.looks}`; };
  sim.illLook = illLook;
  function sickText(p) {
    const s = p.sick?.sym ? (identifies(p, p) ? ` Sick with ${DISEASES[p.sick.key].name.toLowerCase()}${DISEASES[p.sick.key].spreads ? ' (it passes to people near you)' : ''}` : ` You feel ill: ${DISEASES[p.sick.key].looks} (you can't tell what it is; a doctor could)`) + `${p.sick.key === 'mummy' ? ' (only a cleric can cure it: go to the Chapel or Infirmary while one is working)' : ' (rest at the Infirmary while a doctor is in, to fight it off)'}.` : '';
    const w = p.abDmg ? Object.entries(p.abDmg).filter(([, v]) => v > 0).map(([k, v]) => `${k} -${v}`) : [];
    return s + (w.length ? ` Weakened: ${w.join(', ')}.` : '') + (p.blind ? ' Blind.' : '');
  }
  sim.sickText = sickText;
  function carry(p, q) { q.carriedBy = p.id; q.x = p.x + 0.3; q.z = p.z + 0.3; }
  function drop(q) { q.carriedBy = null; }
  // HEALING THE FALLEN where they lie: a cure light wounds (1d8 + caster level, up to +5), lay on hands, or a healing
  // draught (1d8+1) poured down the throat. Any healing stops the bleeding (SRD; LoH healedOf), and 1 hp or more stands
  // them up. True when the patient is on their feet again.
  // a small win, for the generation's memory: who did it (by their place in town) and how
  const winRole = p => p.id === sim.mayorId ? 'the mayor' : p.militia ? 'the militia' : p.job === 'none' ? 'jobless folk' : (JOBS[p.job]?.title || 'townsfolk').toLowerCase() + 's';
  function win(t, p, o = {}) { if (!p || p.kind !== 'human') return; (sim.genLog ||= []).push({ t, day: sim.day, by: winRole(p), ...o }); }
  function healAt(p, q) {
    const how = p.cures > 0 ? 'a cure spell' : p.layPool > 0 ? 'lay on hands' : 'a healing draught';
    if (p.cures > 0) { p.cures--; const h = d(8) + Math.min(5, clvl(p, 'cleric') + clvl(p, 'druid')); healUp(q, h); log('life', `${p.name} casts cure light wounds on ${q.name} (+${h} hp)${q.hp > 0 ? ' and they get back up' : '; the bleeding stops'}.`, [p.id, q.id]); }
    else if (p.layPool > 0) { const h = Math.min(p.layPool, Math.max(1, 1 - q.hp + 4)); p.layPool -= h; healUp(q, h); log('life', `${p.name} lays hands on ${q.name} (+${h} hp)${q.hp > 0 ? ' and they get back up' : ''}.`, [p.id, q.id]); }
    else if (p.items?.cure > 0) { p.items.cure--; const h = roll(1, 8) + 1; healUp(q, h); log('life', `${p.name} pours a healing draught down ${q.name}'s throat (+${h} hp)${q.hp > 0 ? ' and they get back up' : '; the bleeding stops'}.`, [p.id, q.id]); }
    else return false;
    win('save', p, { how });
    remember(q, { text: `${p.name} saved my life when I lay dying.`, big: true }); bump(q, p, 'like', 0.4); bump(q, p, 'trust', 0.3);
    return q.hp > 0 && !q.down;
  }
  function doRescue(p, dt) {
    const q = target(p.task.target);
    if (!q || !q.alive || q.fight || (!q.dying && !q.down && !p.task.carrying)) { if (q) drop(q); p.task = null; return; }
    if (!p.task.carrying) {
      if (dist2(p, q) > 1.4) { arrive(p, q, dt, 2.0); return; }
      if (q.dying || q.hp <= 0) { if (healAt(p, q)) { p.task = null; return; } }
      if (q.dying) { const kit = p.items?.healkit > 0 ? 2 : 0; if (kit) p.items.healkit--; const r = d(20) + p.skills.heal + kit; if (r >= 15) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 120; log('life', `${p.name} stabilizes ${q.name}.`, [p.id, q.id]); win('save', p, { how: 'first aid' }); } else return; }
      p.task.carrying = q.id; log('life', `${p.name} carries ${q.name} to the infirmary.`, [p.id, q.id]);
    }
    const bed = SPOTS.beds.find(b => !living().some(o => o !== q && dist2(o, b) < 0.5)) || SPOTS.beds[0];
    const there = stepToward(p, bed, 1.1, dt); carry(p, q);
    if (there) { drop(q); place(q, bed); q.task = { kind: 'treat', to: bed, t0: sim.t, until: sim.t + 600 }; q.state = 'patient'; p.task = null; }
  }
  function doHaul(p, dt) {            // a guard takes a prisoner to the cells, carrying them if they're out cold
    const q = target(p.task.target);
    if (!q || !q.alive || q.jailedUntil > 0) { if (q) drop(q); p.task = null; return; }
    if (dist2(p, q) > 1.6 && !p.task.carrying) { arrive(p, q, dt, 1.6); return; }
    p.task.carrying = q.id;
    const there = stepToward(p, SPOTS.cells[0], conscious(q) ? 1.2 : 1.0, dt); carry(p, q);
    if (there) { drop(q); jail(q, p); p.task = null; }
  }
  function pocket(me, got) {
    for (const [k, c] of got) if (c > 0) me.items[k] = (me.items[k] || 0) + c;
    const avg = k => { const w = WEAPONS[k]; return w ? w.dmg[0] * (w.dmg[1] + 1) / 2 + (w.enh || 0) * 1.5 : 0; };
    const bestW = Object.keys(me.items).filter(k => me.items[k] > 0 && WEAPONS[k] && !WEAPONS[k].range).sort((a, b) => avg(b) - avg(a))[0];
    if (bestW && avg(bestW) > avg(me.weapon)) { me.items[bestW]--; if (me.weapon !== 'fists') me.items[me.weapon] = (me.items[me.weapon] || 0) + 1; me.weapon = bestW; }
    const bestA = Object.keys(me.items).filter(k => me.items[k] > 0 && ARMOR[k]).sort((a, b) => ARMOR[b].ac - ARMOR[a].ac)[0];
    if (bestA && ARMOR[bestA].ac > (ARMOR[me.armor] || ARMOR.none).ac) { me.items[bestA]--; if (me.armor && me.armor !== 'none') me.items[me.armor] = (me.items[me.armor] || 0) + 1; me.armor = bestA; }
    const bestS = Object.keys(me.items).filter(k => me.items[k] > 0 && SHIELDS[k] && k !== 'none').sort((a, b) => SHIELDS[b].ac - SHIELDS[a].ac)[0];
    if (bestS && SHIELDS[bestS].ac > (SHIELDS[me.shield] || SHIELDS.none).ac && !(WEAPONS[me.weapon].hands === 2)) { me.items[bestS]--; if (me.shield && me.shield !== 'none') me.items[me.shield] = (me.items[me.shield] || 0) + 1; me.shield = bestS; }
  }
  sim.pocket = pocket;
  function doCollect(p, dt) {          // the undertaker brings the dead to the chapel to be laid out
    const b = sim.bodies.filter(b => !b.buried && !b.collected && !b.hidden).sort((x, y) => dist2(p, x) - dist2(p, y))[0];   // a body nobody has found yet stays where it lies
    if (!b) { p.task = null; return; }
    if (!p.task.carrying) { if (stepToward(p, b, 1.4, dt)) p.task.carrying = b; return; }
    if (!stepToward(p, SPOTS.slab, 1.0, dt)) { b.x = p.x; b.z = p.z + 0.3; return; }
    b.collected = true; b.x = SPOTS.slab.x; b.z = SPOTS.slab.z; b.layUntil = sim.t + 120;
    log('death', `${b.name} is laid out in the chapel. Mourners may come before the burial.`, [b.id, p.id]);
    p.task = null;
  }
  function doBury(p, dt) {
    const b = sim.bodies.filter(b => b.collected && !b.buried && sim.t >= b.layUntil).sort((x, y) => dist2(p, x) - dist2(p, y))[0];
    if (!b) { p.task = null; return; }
    if (!p.task.carrying) { if (stepToward(p, b, 1.4, dt)) p.task.carrying = b; return; }
    if (!stepToward(p, SPOTS.graves, 1.0, dt)) { b.x = p.x; b.z = p.z; return; }
    const plot = sim.graves.length + 1, row = Math.floor((plot - 1) / 6), col = (plot - 1) % 6;
    const at = P(18 + col * 2.5, -21 + row * 2.5);
    b.buried = true; b.x = at.x; b.z = at.z;
    const dead = sim.people[b.id];
    sim.graves.push({ plot, id: b.id, name: b.name, day: sim.day, at, cause: b.how || 'unknown', coin: b.coin, items: b.items });
    const fee = 20, kin = dead && dead.home != null ? living().find(q => q.home === dead.home) : null;
    pay(kin && kin.coin >= fee ? kin : 'town', p, fee);
    for (const q of living()) remember(q, { grave: plot, who: b.id, name: b.name });   // everyone knows who lies where
    log('death', `${b.name} is buried in plot ${plot}.`, [b.id, p.id]);
    p.task = null;
  }

  // ========================================================= D&D 3.5 combat ==
  // A fight is a bubble: initiative order, 6-second rounds, turn by turn. Only the people
  // in it take turns; the town keeps moving around them.
  // ---- THE SRD (Rose: "srd everything"; the rules are Legends of Harpine's own, brought into town/srd) -------------
  // With town/srd_bridge.js loaded (globalThis.SRD), every swing, shot and thrown stone is rolled by LoH's rules/attack.js
  // (attackRoll, rollDamage) over LoH's weapon table, proficiency table and weapons rules: improvised throws, sling stones,
  // pulled blows, crits, flanking, concealment, sneak dice. Hollow Town only builds the swing it asks about. Armour gives AC
  // and soaks nothing (SRD); bare hands provoke from an armed foe unless the fist is "armed" (Improved Unarmed Strike, a monk).
  const LOH_WEAPON = { fists: 'Unarmed', dagger: 'Dagger', sickle: 'Sickle', club: 'Club', sap: 'Sap', quarterstaff: 'Quarterstaff', spear: 'Spear', lightmace: 'Light Mace', heavymace: 'Heavy Mace', handaxe: 'Handaxe', shortsword: 'Short Sword', rapier: 'Rapier', scimitar: 'Scimitar', longsword: 'Longsword', battleaxe: 'Battleaxe', warhammer: 'Warhammer', flail: 'Flail', greataxe: 'Greataxe', greatsword: 'Greatsword', halberd: 'Halberd', sling: 'Sling', javelin: 'Javelin', shortbow: 'Shortbow', longbow: 'Longbow', lightxbow: 'Light Crossbow', heavyxbow: 'Heavy Crossbow', longsword1: 'Longsword' };
  const NPC_PROF = { commoner: { named: ['club'] }, expert: { simple: true }, warrior: { simple: true, martial: true }, aristocrat: { simple: true, martial: true } };
  const srdOn = () => !!(globalThis.SRD && sim.srd !== false);
  sim.LOH_WEAPON = LOH_WEAPON; sim.srdOn = srdOn;
  function profOf(p) {
    const out = { simple: false, martial: false, named: new Set() };
    for (const k of Object.keys(classesOf(p))) for (const r of [NPC_PROF[k], globalThis.SRD?.CLASS_WEAPONS?.[k[0].toUpperCase() + k.slice(1)]]) if (r) { if (r.simple) out.simple = true; if (r.martial) out.martial = true; for (const n of r.named || []) out.named.add(n); }
    return out;
  }
  const fistArmed = p => p.kind !== 'human' || hasFeat(p, 'Improved Unarmed Strike') || clvl(p, 'monk') > 0;
  // who threatens the ground around them (SRD): a melee weapon, a natural weapon, or an "armed" fist
  const threatens = p => !p.heldBy && !p.holding && (p.kind === 'animal' ? true : p.weapon === 'fists' ? fistArmed(p) : !!WEAPONS[p.weapon]?.melee);
  sim.threatens = threatens;
  // flanking (SRD): an ally who threatens the foe from the far side of it
  function flankAlly(f, a, t) {
    for (const id of f.order) { const q = body(id); if (!q || q === a || !q.alive || !conscious(q) || f.sides.get(q.id) !== f.sides.get(a.id) || dist2(q, t) > 2.1 || !threatens(q)) continue;
      const ax = a.x - t.x, az = a.z - t.z, qx = q.x - t.x, qz = q.z - t.z, c = (ax * qx + az * qz) / ((Math.hypot(ax, az) * Math.hypot(qx, qz)) || 1); if (c < -0.5) return q; }
    return null;
  }
  const sgn = n => n ? (n > 0 ? '+' : '') + n : '';
  const nz = ts => { const k = ts.filter(([n]) => n); return k.length ? k : [[0, 'base attack']]; };
  function srdAttack(f, a, t, o = {}) {
    const S = globalThis.SRD, human = a.kind === 'human', mode = o.mode || f.mode.get(a.id) || 'lethal';
    const strM = human ? mod(a.st.str) : 0, dexM = human ? mod(a.st.dex) : 0;
    const parts = [], dparts = []; let hp = 0, dp = 0;
    const term = (n, w, dmg) => { if (!n) return; if (dmg) { dp += n; dparts.push([n, w]); } else { hp += n; parts.push([n, w]); } };
    let move;
    if (o.touch) {   // an unarmed melee touch attack: a trip's or a grapple's first step (SRD)
      const tb = human ? babOf(a) : (a.atk ?? 2);
      move = { name: 'touch', type: 'attack', touch: true, toHit: tb + strM, toHitTerms: nz([[tb, human ? 'base attack' : 'attack'], [strM, 'Strength']]), dmg: '1d1', critMult: 1, threat: 21, dmgType: 'bludgeoning', rangeFt: 5, light: true, unarmed: true };
    } else if (!human) {
      move = { name: a.attackName || 'bite', type: 'attack', natural: true, toHit: a.atk ?? 2, dmg: `${a.bite[0]}d${a.bite[1]}${sgn(a.dmgBonus || 0)}`, critMult: 2, threat: 20, dmgType: /claw|tusk|club/.test(a.attackName || '') ? (/club/.test(a.attackName) ? 'bludgeoning' : 'slashing') : 'piercing', rangeFt: 5 };
    } else {
      const bab = babOf(a);
      if (o.stone) {   // a stone thrown by hand: an improvised thrown weapon (SRD, Thrown Weapons), 1d3 like a sling's stone
        const I = S.IMPROVISED_THROW;
        move = { name: 'stone', type: 'attack', thrown: true, improvised: true, toHit: bab + dexM + I.toHit, toHitTerms: nz([[bab, 'base attack'], [dexM, 'Dexterity'], [I.toHit, 'improvised throw']]), dmg: `1d3${sgn(strM)}`, critMult: I.mult, threat: I.threat, dmgType: 'bludgeoning', rangeIncFt: I.incFt, rangeFt: I.incFt * 5, light: true };
      } else if (o.bash) {   // a bow or crossbow swung as a club: a light improvised weapon (-4)
        move = { name: (WEAPONS[a.weapon]?.name || 'it').toLowerCase(), type: 'attack', improvised: true, toHit: bab + strM - 4, toHitTerms: nz([[bab, 'base attack'], [strM, 'Strength'], [-4, 'improvised']]), dmg: `1d4${sgn(strM)}`, critMult: 2, threat: 20, dmgType: 'bludgeoning', rangeFt: 5, light: true };
      } else {
        const name = LOH_WEAPON[a.weapon] || 'Unarmed', k = S.kindOf(name) || S.kindOf('Unarmed');
        const monk = name === 'Unarmed' && clvl(a, 'monk') > 0, ranged = k.use === 'projectile', thrown = k.use === 'thrown', enh = WEAPONS[a.weapon]?.enh || 0;
        const cp = S.critParts(k.crit) || { threat: 20, mult: 2 };
        const prof = S.proficientWith(profOf(a), name) ? 0 : S.NONPROFICIENT;
        const two = S.gripOf(k, { offhandBusy: !!(a.shield && a.shield !== 'none') || !!(a.items?.torch > 0 && night()) }) === 2;
        const sb = ranged ? (/sling/i.test(name) ? strM : /bow$/i.test(name) && !/cross/i.test(name) ? Math.min(0, strM) : 0) : thrown ? strM : Math.floor(strM * (two && strM > 0 ? 1.5 : 1));
        const dice = monk ? String(S.monkFistAt(clvl(a, 'monk'))).match(/\d+d\d+/)?.[0] || '1d6' : (k.dmg || '1d3');
        move = { name: (WEAPONS[a.weapon]?.name || name).toLowerCase(), weapon: name, type: 'attack', toHit: bab + (ranged || thrown ? dexM : strM) + prof + enh, toHitTerms: nz([[bab, 'base attack'], [ranged || thrown ? dexM : strM, ranged || thrown ? 'Dexterity' : 'Strength'], [prof, 'not proficient'], [enh, 'magic']]),
          dmg: `${dice}${sgn(sb + enh)}`, critMult: cp.mult, threat: cp.threat, dmgType: k.types[0] || 'bludgeoning',
          light: k.effort === 'light' || k.effort === 'unarmed', unarmed: k.effort === 'unarmed', fx: ranged ? (k.ammo || 'shot') : undefined, thrown, ranged,
          rangeIncFt: k.inc || 0, rangeFt: ranged || thrown ? (k.inc || 10) * (thrown ? 5 : 10) : 5 };
        if (ranged && k.ammo === 'bullets' && !(a.items.bullets > 0) && a.items.stones > 0) move = { ...move, ...S.stoneShotOf(move) };
      }
      // the town's own terms, each by name: hunger (Rose), the classes' features
      const hun = a.food < 0.1 ? 2 : a.food < 0.3 ? 1 : 0; term(-hun, 'hunger'); term(-hun, 'hunger', true);
      if (hasFeat(a, 'Weapon Focus') && !o.stone && !o.bash) term(1, 'Weapon Focus');
      if (hasFeat(a, 'Weapon Specialization') && !o.stone && !o.bash) term(2, 'Weapon Specialization', true);
      if (a.rage === f.id) { term(2, 'rage'); term(2, 'rage', true); }
      const insp = inspire(f, a); term(insp, 'inspire courage'); term(insp, 'inspire courage', true);
      if (S.isRanged(move) && clvl(a, 'ranger') >= 2) term(1, 'ranger');
      if (favoredVs(a, t) && (t.kind === 'human' || t.monster)) term(2, 'favoured enemy', true);
      if (f.blessed?.[f.sides.get(a.id)]) term(1, 'bless');
      if (clvl(a, 'paladin') && !(a.smote ||= {})[f.id] && (t.monster || mode === 'lethal')) { a.smote[f.id] = 1; term(Math.max(0, mod(a.st.cha)), 'smite'); term(clvl(a, 'paladin'), 'smite', true); }
    }
    if (o.charge) term(2, 'charge');
    if (o.flurry) term(o.flurry, 'flurry of blows');
    const rangedMove = S.isRanged(move), dFt = dist2(a, t) / 0.3048;
    const actorV = { name: a.id === 'player' ? 'Rose' : a.name, feats: human ? (a.feats || []).filter(x => ['Point Blank Shot', 'Precise Shot', 'Blind-Fight', 'Improved Unarmed Strike'].includes(x)) : [],
      meleeAtkMod: hp, rangedAtkMod: hp, meleeAtkParts: parts, rangedAtkParts: parts, attackMod: 0, dmgMod: dp,
      pullBlows: human && mode === 'nonlethal', strikeToKill: human && mode === 'lethal', monkLevel: human ? clvl(a, 'monk') : 0,
      powerAttack: human && mode === 'lethal' && !rangedMove && hasFeat(a, 'Power Attack') ? Math.min(2, Math.max(1, babOf(a))) : 0,
      sneakDice: human ? Math.ceil(clvl(a, 'rogue') / 2) : 0, prone: !!a.prone };
    const tV = { name: t.id === 'player' ? 'Rose' : t.name, dexMod: t.kind === 'human' ? mod(t.st.dex) : 0, flatFooted: flatNow(t), acMod: 0, naturalAc: 0, prone: !!t.prone, deniedDexTo: t.feinted && t.feinted.by === a.id ? { by: actorV } : null, pinnedBy: null };
    const ally = !rangedMove ? flankAlly(f, a, t) : null;
    const intoMelee = rangedMove && f.order.some(id => { const q = body(id); return q && q !== a && q.alive && conscious(q) && f.sides.get(q.id) === f.sides.get(a.id) && dist2(q, t) <= 2.1; }) && !hasFeat(a, 'Precise Shot') ? -4 : 0;
    const dark = () => night() && !litAt(P(t.x, t.z), t);   // shadowy light: concealment, 20% (SRD)
    const gather = () => ({ scene: {}, weather: 0, distFt: dFt, intoMelee, flank: { ally: ally ? { name: ally.name, feats: [] } : null, bonus: 2, backToBack: false },
      feat: { damage: { n: 0, note: '' }, guard: { n: 0, note: '' } }, acBase: o.touch ? touchAc(t) : t.kind === 'animal' ? t.ac : acOf(t), totalDefense: 0, helpless: !conscious(t),
      attackerHeld: !!(a.heldBy || a.holding), targetHeldByOther: !!(t.heldBy || t.holding) && t.heldBy !== a.id && t.holding !== a.id, cover: rangedMove ? coverOf(a, t) : null, surprise: f.round === 1 });
    const ask = { helpless: () => !conscious(t), unobserved: () => false, flanked: () => !!ally, spend: () => {}, concealment: () => dark() ? { total: false } : null, perceives: () => false,
      feat: { deflect: () => ({ deflected: false, note: '' }), blackCat: () => false }, confirmTerms: () => [],
      sneak: () => { if (!actorV.sneakDice || dark()) return null; const why = !conscious(t) ? 'helpless' : flatNow(t) ? (stunnedIn(t) ? 'stunned' : 'flat-footed') : tV.deniedDexTo ? 'feinted' : !rangedMove && ally ? 'flanked' : null; return why && (!rangedMove || dFt <= 30) ? { dice: actorV.sneakDice, why } : null; },
      opening: () => null, damageDice: m => S.damageDiceOf(m) };
    const swing = { attacker: actorV, target: tV, move };
    const rec = S.attackRoll(swing, gather, ask);
    if (tV.deniedDexTo && !rangedMove) t.feinted = null;   // the feint is spent on the swing it bought, hit or miss
    if (o.touch) return { hit: rec.hit, line: rec.rollLine, move };
    if (!rec.hit) return { hit: false, line: rec.rollLine, move };
    const res = S.rollDamage(rec, swing, ask);
    return { hit: true, crit: rec.crit, dmg: res.dmg, nonlethal: human && S.pullsBlows(actorV, move), line: rec.rollLine + ' ' + res.dmgLine, move };
  }
  sim.srdAttack = srdAttack;
  // ---- MORE OF LoH: MANEUVERS, PRONE, THE DYING ROAD, COVER (rules/maneuvers.js, conditions.js, health.js via SRD) -----
  // Rose: "do more of the systems loh has until you have the gist a smart npc needs to survive in loh". Every sum below is
  // LoH's own (trip, trip back, disarm, disarm back, bull rush and its push, the grapple check, its tie, its dice, the way
  // out, the feint, a bare fist that finishes nobody, the fall onto the dying road, the d% that stops the bleeding, the
  // strenuous point, a cure over one pool); Hollow Town only builds the bodies they read and rolls the d20s.
  const SIZE_OF = { rabbit: 'tiny', pheasant: 'tiny', hen: 'tiny', cow: 'large', sheep: 'medium', direwolf: 'large', ogre: 'large', troll: 'large', dog: 'small' };
  const TWO_LEGS = new Set(['pheasant', 'hen', 'ogre', 'troll']);
  const BEAST_ABIL = { wolf: [13, 15, 2], boar: [15, 10, 2], bear: [19, 13, 2], direwolf: [25, 15, 2], ogre: [21, 8, 6], troll: [23, 14, 6], dog: [13, 17, 2], deer: [12, 15, 2], cow: [18, 9, 2], sheep: [12, 10, 2], rabbit: [3, 15, 2], pheasant: [3, 15, 2], hen: [3, 12, 2] };   // SRD Str, Dex, Int
  const wolfish = q => q.kind === 'animal' && (q.species === 'wolf' || q.species === 'direwolf' || /wolf/i.test(q.name || ''));
  const sizeOf = q => q.kind === 'human' ? 'medium' : wolfish(q) && q.species === 'dog' ? 'medium' : SIZE_OF[q.species] || 'medium';
  const abilOf = q => { if (q.kind === 'human') return { str: q.st.str, dex: q.st.dex, int: q.st.int }; const b = BEAST_ABIL[wolfish(q) && q.species === 'dog' ? 'wolf' : q.species] || [10, 12, 2]; return { str: b[0], dex: b[1], int: b[2] }; };
  const LIGHT = new Set(['fists', 'dagger', 'sickle', 'sap', 'handaxe', 'lightmace', 'shortsword']);
  // the body as LoH's maneuver sums read it
  function mview(q) {
    const ab = abilOf(q), human = q.kind === 'human';
    return { name: q.name, size: sizeOf(q), strMod: mod(ab.str), dexMod: mod(ab.dex), int: ab.int, bab: human ? babOf(q) : Math.max(0, (q.atk ?? 2) - mod(ab.str)),
      moreLegs: !human && !TWO_LEGS.has(q.species), nonhumanoid: !human && q.species !== 'ogre' && q.species !== 'troll', nonprofAcp: 0,
      monkLevel: human ? clvl(q, 'monk') : 0, pullBlows: false, unarmedMove: { dmg: human && clvl(q, 'monk') ? (clvl(q, 'monk') >= 4 ? '1d8' : '1d6') : '1d3' } };
  }
  const touchAc = t => t.kind === 'animal' ? 10 + Math.floor((t.ac - 10) / 3) : 10 + Math.min(mod(t.st.dex), (ARMOR[t.armor] || ARMOR.none).maxDex) + (hasFeat(t, 'Dodge') ? 1 : 0);
  sim.touchAc = touchAc; sim.mview = mview;
  // the chance d20 + a beats d20 + b (a tie to the higher modifier, equal ones even); and a plain hit's chance
  const pBeat = (a, b) => { let w = 0; for (let x = 1; x <= 20; x++) for (let y = 1; y <= 20; y++) { const s = x + a, u = y + b; w += s > u ? 1 : s < u ? 0 : a > b ? 1 : a < b ? 0 : 0.5; } return w / 400; };
  const pHit = (bonus, ac) => Math.min(0.95, Math.max(0.05, (21 - (ac - bonus)) / 20));
  sim.pBeat = pBeat;
  // an opposed roll, by LoH's contestOf (the higher check, a tie to the higher modifier, equal modifiers roll again)
  function opposed(mine, theirs) { for (let i = 0; i < 6; i++) { const x = d(20) + mine, y = d(20) + theirs, c = globalThis.SRD.contestOf(x, mine, y, theirs); if (!c.again) return { won: c.won, x, y }; } return { won: false, x: 0, y: 0 }; }
  const freeSwing = (f, by, at, why) => { if (!threatens(by) || by.aooUsed === f.round || !conscious(by) || dist2(by, at) > 2.1) return true; by.aooUsed = f.round; logF(f, `${at.name} ${why}: ${by.name} gets a free swing.`); attack(f, by, at, { aoo: true }); return conscious(at); };

  // COVER (SRD, combatModifiers; LoH's coverBetween): a wall between two rooms is total cover unless the line runs through
  // their door (+4); the palisade +4; a body in the line of a shot is soft cover (+4)
  const segT = (q, a, t) => { const dx = t.x - a.x, dz = t.z - a.z, L = dx * dx + dz * dz || 1, u = ((q.x - a.x) * dx + (q.z - a.z) * dz) / L; return { u, d: Math.hypot(a.x + dx * u - q.x, a.z + dz * u - q.z) }; };
  function coverOf(a, t) {
    if (!a || !t) return null;
    const A = areaOf(a), B = areaOf(t);
    if (A !== B && (AREAS[A]?.indoor || AREAS[B]?.indoor)) { const door = DOORS.find(dr => ((dr.a === A && dr.b === B) || (dr.a === B && dr.b === A)) && segT(dr.at, a, t).d < 1.2); return door ? { ac: 4, prop: { name: 'doorway' } } : { ac: 0, total: true, prop: { name: 'wall' } }; }
    if (sim.palisade?.hp > 0 && ((A === 'wood' && B === 'fields') || (A === 'fields' && B === 'wood'))) return { ac: 4, prop: { name: 'palisade' } };
    return null;
  }
  sim.coverOf = coverOf;

  // THE DYING ROAD (rules/health.js fallOf): 0 is disabled (on your feet, one action, and a standard one costs a hit point),
  // -1 to -9 dying, -10 dead; Diehard stands stable below 0. A blow of 50 or more asks a DC 15 Fortitude save (SRD).
  const isDisabled = p => !!p.disabled && p.alive && p.hp <= 0 && !p.dying && !p.down;
  sim.isDisabled = isDisabled;
  function lohFall(t, dmg, by) {
    if (dmg >= 50 && t.hp > -10 && fortSave(t) < 15) { t.hp = -10; log('fight', `${t.name} fails a Fortitude save against massive damage.`, [t.id]); }
    const fall = globalThis.SRD.fallOf(t.hp, { diehard: hasFeat(t, 'Diehard'), prior: t.down === 'out' ? 'cold' : t.stable ? 'stable' : t.dying ? 'dying' : null });
    if (fall.road === 'dead') { if (by?.monster) by.kills = (by.kills || 0) + 1; return die(t, by, 'killed in a fight'); }
    if (fall.road === 'up') { t.disabled = false; return; }
    if (fall.road === 'cold') return;
    if (fall.road === 'disabled' || fall.road === 'stable') { t.disabled = true; t.stable = fall.road === 'stable'; t.dying = false; if (t.down === 'dying') t.down = null; return; }
    t.dying = true; t.down = 'dying'; t.stable = false; t.disabled = false;
  }
  // a standard action taken disabled costs its hit point (rules/health.js strenuousOf), and below 0 the body is dying again
  function strain(f, p) {
    if (!globalThis.SRD.strenuousOf({ hp: p.hp, began: true, dying: p.dying })) return;
    p.hp -= 1; logF(f, `${p.name} strains on, disabled, and loses 1 hp.`);
    if (p.hp <= -10) return die(p, null, 'pushed on while dying');
    if (p.hp < 0 && !hasFeat(p, 'Diehard')) { p.dying = true; p.down = 'dying'; p.disabled = false; logF(f, `${p.name} collapses, dying.`); }
  }

  // THE MANEUVERS (rules/maneuvers.js)
  // trip: an unarmed melee touch attack (it provokes unless Improved Trip), then the opposed check; a failed trip may be
  // tripped back. A wolf's bite trips for free (o.free: no touch, no free swing, no trip back), as the SRD's wolf.
  function tripAt(f, a, t, o = {}) {
    const S = globalThis.SRD, A = mview(a), B = mview(t), imp = hasFeat(a, 'Improved Trip');
    if (S.tooBigFor(A, B)) { if (!o.free) logF(f, `${a.name} can't trip ${t.name}: too big.`); return false; }
    if (!o.free) {
      if (!imp && !freeSwing(f, t, a, `grabs for ${t.name}'s legs`)) return false;
      const r = srdAttack(f, a, t, { touch: true });
      if (!r.hit) { logF(f, `${a.name} tries to trip ${t.name}: ${r.line}`); return false; }
    }
    const c = S.tripChecks(A, B, { atk: imp ? 4 : 0 }), r = opposed(c.mine, c.theirs);
    if (r.won) { S.proneDown(t); logF(f, `${a.name} ${o.free ? 'drags' : 'trips'} ${t.name} down: prone (${r.x} vs ${r.y}).`); if (imp && !o.free && conscious(t)) attack(f, a, t); return true; }
    logF(f, `${t.name} keeps their feet (${r.x} vs ${r.y}).`);
    if (!o.free && conscious(t) && !t.prone) { const b = S.tripBackChecks(A, B), r2 = opposed(b.back, b.mine); if (r2.won) { S.proneDown(a); logF(f, `${t.name} trips ${a.name} back: prone (${r2.x} vs ${r2.y}).`); } }
    return false;
  }
  const blowOf = q => q.kind !== 'human' ? { toHit: q.atk ?? 2, unarmed: true } : { toHit: babOf(q) + mod(q.st.str) + (WEAPONS[q.weapon]?.enh || 0), twoHanded: WEAPONS[q.weapon]?.hands === 2, light: LIGHT.has(q.weapon), unarmed: q.weapon === 'fists', disarmBonus: q.weapon === 'flail' ? 2 : 0 };
  function dropWeapon(f, q) { const k = q.weapon; q.weapon = 'fists'; q.unloaded = false; (f.dropped ||= []).push({ k, owner: q.id, x: q.x, z: q.z }); return k; }
  // disarm: opposed attack rolls by the weapons' heft and size (it provokes unless Improved Disarm); empty-handed, you
  // take the weapon; failed, the foe may disarm you back
  function disarmAt(f, a, t) {
    const S = globalThis.SRD, imp = hasFeat(a, 'Improved Disarm');
    if (t.kind !== 'human' || t.weapon === 'fists') return logF(f, `${t.name} has nothing to disarm.`);
    if (!imp && !freeSwing(f, t, a, `reaches for ${t.name}'s weapon`)) return;
    const c = S.disarmChecks(mview(a), blowOf(a), mview(t), blowOf(t), { improved: imp ? 4 : 0 }), r = opposed(c.mine, c.theirs);
    if (r.won) {
      if (a.kind === 'human' && a.weapon === 'fists') { const k = t.weapon; t.weapon = 'fists'; t.unloaded = false; a.weapon = k; logF(f, `${a.name} wrenches the ${WEAPONS[k].name.toLowerCase()} out of ${t.name}'s hands and keeps it (${r.x} vs ${r.y}).`); }
      else { const k = dropWeapon(f, t); logF(f, `${a.name} knocks the ${WEAPONS[k].name.toLowerCase()} out of ${t.name}'s hands (${r.x} vs ${r.y}).`); }
      return true;
    }
    logF(f, `${t.name} keeps hold of their weapon (${r.x} vs ${r.y}).`);
    if (a.kind === 'human' && a.weapon !== 'fists' && conscious(t)) { const b = S.disarmBackChecks(mview(a), blowOf(a), mview(t), blowOf(t)), r2 = opposed(b.back, b.keep); if (r2.won) { const k = dropWeapon(f, a); logF(f, `${t.name} disarms ${a.name} back: the ${WEAPONS[k].name.toLowerCase()} falls (${r2.x} vs ${r2.y}).`); } }
  }
  // bull rush: it provokes from all who threaten you; won, the foe is pushed 5 ft and 5 more for each 5 you beat it by
  function rushAt(f, a, t) {
    const S = globalThis.SRD, A = mview(a), B = mview(t);
    if (S.tooBigFor(A, B)) return logF(f, `${a.name} can't shove ${t.name}: too big.`);
    if (!hasFeat(a, 'Improved Bull Rush') && threatened(f, a).length) { provoke(f, a); if (!conscious(a)) return; }
    const c = S.bullRushChecks(A, B, { charging: !!a.charged }), r = opposed(c.mine, c.theirs);
    if (r.won) { const ft = S.pushOf(r.x, r.y); moveAway(t, a, ft * 0.3048); moveToward(a, t, ft * 0.3048, 1.5); logF(f, `${a.name} shoves ${t.name} back ${ft} ft (${r.x} vs ${r.y}).`); }
    else { moveAway(a, t, 1.524); logF(f, `${t.name} stands firm against ${a.name}'s shove (${r.x} vs ${r.y}).`); }
  }
  // the grapple: a touch, then the opposed grapple check; the hold deals an unarmed strike (lethal at -4, a monk's free)
  const gmod = q => globalThis.SRD.grappleModOf(mview(q), hasFeat(q, 'Improved Grapple') ? 4 : 0);
  function breakHold(p) { for (const q of [body(p.holding), body(p.heldBy)]) if (q) { if (q.heldBy === p.id) q.heldBy = null; if (q.holding === p.id) q.holding = null; } p.holding = null; p.heldBy = null; }
  function holdCheck(f, p) { for (const k of ['holding', 'heldBy']) if (p[k]) { const q = body(p[k]); if (!q || !q.alive || !conscious(q) || !conscious(p) || !f.sides.has(q.id) || dist2(p, q) > 2.5) breakHold(p); } }
  function holdBlow(f, a, t, c) {
    const S = globalThis.SRD, hd = S.holdDiceOf(mview(a), f.mode.get(a.id) === 'lethal'), dmg = Math.max(1, S.roll(hd.dice).total + mod(abilOf(a).str));
    hurt(t, dmg, !hd.lethal, a); return `${dmg}${hd.lethal ? '' : ' nonlethal'}`;
  }
  function grappleAt(f, a, t) {
    const S = globalThis.SRD, A = mview(a), B = mview(t);
    if (!hasFeat(a, 'Improved Grapple') && !freeSwing(f, t, a, `lunges to grab ${t.name}`)) return;
    const r = srdAttack(f, a, t, { touch: true });
    if (!r.hit) return logF(f, `${a.name} grabs at ${t.name}: ${r.line}`);
    if (S.tooBigFor(A, B)) return logF(f, `${a.name} gets hold of ${t.name}, who is far too big to hold.`);
    const hd = S.holdDiceOf(A, f.mode.get(a.id) === 'lethal'), c = opposed(gmod(a) + hd.check, gmod(t));
    if (!c.won) return logF(f, `${t.name} twists out of ${a.name}'s grab (${c.x} vs ${c.y}).`);
    a.holding = t.id; t.heldBy = a.id;
    const n = holdBlow(f, a, t); logF(f, `${a.name} gets ${t.name} in a hold (${c.x} vs ${c.y}) and hurts them for ${n}. ${status(t)}`);
  }
  function squeezeAt(f, a, t) {
    const hd = globalThis.SRD.holdDiceOf(mview(a), f.mode.get(a.id) === 'lethal'), c = opposed(gmod(a) + hd.check, gmod(t));
    if (!c.won) return logF(f, `${a.name} strains against ${t.name} in the hold (${c.x} vs ${c.y}).`);
    const n = holdBlow(f, a, t); logF(f, `${a.name} hurts ${t.name} in the hold for ${n} (${c.x} vs ${c.y}). ${status(t)}`);
  }
  function escapeFrom(f, a, t) {
    const e = globalThis.SRD.escapeCheckOf(gmod(a), a.kind === 'human' ? (a.skills?.escape ?? -99) : -99), c = opposed(e.mod, gmod(t));
    if (c.won) { breakHold(a); logF(f, `${a.name} ${e.ea ? 'wriggles' : 'breaks'} free of ${t.name} (${c.x} vs ${c.y}).`); } else logF(f, `${a.name} can't get free of ${t.name} (${c.x} vs ${c.y}).`);
  }
  // the feint (SRD; LoH feintChecksOf): Bluff against Sense Motive and base attack; -4 against a beast, -8 against an animal's
  // wits; won, the next melee swing it bought finds the foe without its Dexterity
  function feintAt(f, a, t) {
    const B = mview(t), c = globalThis.SRD.feintChecksOf(B, { bluff: a.skills?.bluff || 0, sense: t.kind === 'human' ? t.skills.sense : (t.skills?.spot || 0) });
    if (c.impossible) return logF(f, `${t.name} can't be fooled by a feint.`);
    const r = opposed(c.mine, c.theirs);
    if (r.won) { t.feinted = { by: a.id, round: f.round }; logF(f, `${a.name} feints; ${t.name} drops their guard for the next blow (${r.x} vs ${r.y}).`); }
    else logF(f, `${t.name} sees through ${a.name}'s feint (${r.x} vs ${r.y}).`);
  }

  // what a body may do now, by these rules: prone (stand up, no bow, no moving), the hold (only the hold's acts and a light
  // blade or bare hands at the one held), a fist can't finish, no shot through a wall, the maneuvers, a dropped weapon,
  // backing off; disabled bodies take no full-round action
  function lohActs(f, p, acts, tn) {
    if (!srdOn()) return;
    holdCheck(f, p);
    const S = globalThis.SRD, foes = foesOf(f, p), adj = foes.filter(q => dist2(q, p) <= 2.1), w = p.kind === 'human' ? (WEAPONS[p.weapon] || {}) : { melee: true };
    const shot = a => (a.id === 'attack' && w.range) || a.id === 'throw';
    let keep = acts;
    const held = p.heldBy || p.holding;
    if (held) {
      const other = body(held), light = p.kind !== 'human' || LIGHT.has(p.weapon);
      keep = acts.filter(a => ['mode', 'surrender', 'end', 'shout'].includes(a.id) || (a.id === 'attack' && a.target === held && light && !w.range));
      if (tn.standard) { keep.unshift({ id: 'squeeze', target: held, label: `Grapple ${other.name} (hurt them)`, cost: 'standard' }); if (p.heldBy) keep.unshift({ id: 'escape', target: held, label: `Break free of ${other.name}`, cost: 'standard' }); }
      if (p.holding) keep.push({ id: 'release', target: held, label: `Let go of ${other.name}`, cost: 'free' });
    } else {
      if (p.prone) { keep = acts.filter(a => !['move', 'charge', 'run', 'withdraw', 'step'].includes(a.id) && !(shot(a) && !w.reload)); if (tn.move) keep.unshift({ id: 'stand', label: 'Stand up (provokes)', cost: 'move' }); }
      keep = keep.filter(a => !(a.id === 'coup' && p.kind === 'human' && p.weapon === 'fists' && !clvl(p, 'monk')));   // a bare fist finishes nobody
      keep = keep.filter(a => !shot(a) || !coverOf(p, body(a.target))?.total);
      if (tn.standard && !p.prone && p.kind === 'human') for (const q of adj) {
        const A = mview(p), B = mview(q), small = !S.tooBigFor(A, B);
        if (small && !q.prone) keep.push({ id: 'trip', target: q.id, label: `Trip ${q.name}`, cost: 'standard' });
        if (q.kind === 'human' && q.weapon !== 'fists' && !w.range) keep.push({ id: 'disarm', target: q.id, label: `Disarm ${q.name}`, cost: 'standard' });
        if (small && !q.heldBy && !q.holding) keep.push({ id: 'grapple', target: q.id, label: `Grapple ${q.name}`, cost: 'standard' });
        if (small) keep.push({ id: 'rush', target: q.id, label: `Bull rush ${q.name}`, cost: 'standard' });
      }
      if (tn.move && !p.prone && p.kind === 'human') for (const g of (f.dropped || [])) if (dist2(g, p) <= 2.5) keep.push({ id: 'pickup', target: g.k, label: `Pick up the ${WEAPONS[g.k].name.toLowerCase()}`, cost: 'move' });
      if (tn.move && !p.prone && foes.length) keep.push({ id: 'back', label: 'Back away (move)', cost: 'move' });
    }
    if (isDisabled(p)) keep = keep.filter(a => a.cost !== 'full');
    const out = keep.slice(); acts.length = 0; acts.push(...out);
  }
  function lohAct(f, p, a, t, spend) {
    switch (a.id) {
      case 'trip': lohSaw(f, p, 'melee', t); tripAt(f, p, t); spend('standard'); return true;
      case 'disarm': lohSaw(f, p, 'melee', t); disarmAt(f, p, t); spend('standard'); return true;
      case 'rush': lohSaw(f, p, 'melee', t); rushAt(f, p, t); spend('standard'); return true;
      case 'grapple': lohSaw(f, p, 'melee', t); grappleAt(f, p, t); spend('standard'); return true;
      case 'squeeze': lohSaw(f, p, 'melee', t); squeezeAt(f, p, t); spend('standard'); return true;
      case 'escape': escapeFrom(f, p, t); spend('standard'); return true;
      case 'release': logF(f, `${p.name} lets go of ${t?.name || 'their hold'}.`); breakHold(p); return true;
      case 'stand': if (threatened(f, p).length) provoke(f, p); if (p.alive) { globalThis.SRD.standUp(p); logF(f, `${p.name} gets back up.`); } spend('move'); return true;
      case 'pickup': { const g = (f.dropped || []).find(x => x.k === a.target && dist2(x, p) <= 2.5); if (g) { if (threatened(f, p).length) provoke(f, p); f.dropped.splice(f.dropped.indexOf(g), 1); if (p.weapon !== 'fists') p.items[p.weapon] = (p.items[p.weapon] || 0) + 1; p.weapon = g.k; if (g.owner !== p.id) { const o = body(g.owner); if (o && o.kind === 'human') deed('theft', p, o, o); } logF(f, `${p.name} snatches up the ${WEAPONS[g.k].name.toLowerCase()}.`); } spend('move'); return true; }
      case 'back': { const foe = foesOf(f, p).sort((x, y) => dist2(p, x) - dist2(p, y))[0]; if (threatened(f, p).length) provoke(f, p); if (foe && conscious(p)) moveAway(p, foe, SPEED(p)); logF(f, `${p.name} backs away.`); spend('move'); return true; }
    }
    return false;
  }

  // A SMART BODY'S FIRST THOUGHTS, before the script's (or the fight net's) choice: get up, deal with a hold, a disabled
  // body doesn't swing, drink before it's too late, keep a dying friend alive, pick a dropped weapon back up
  function lohSmart(f, p, acts, hpFrac, tr) {
    if (!srdOn()) return false;
    const find = id => acts.find(a => a.id === id);
    if (p.prone && find('stand')) { act(f, p, find('stand')); if (conscious(p) && !p.prone && p.turnLeft?.standard) npcTurn(f, p); return true; }
    if (p.heldBy || p.holding) return holdTurn(f, p, acts, hpFrac);
    if (p.kind !== 'human') return false;
    const thr = threatened(f, p).length;
    if (isDisabled(p)) { const dr = find('drink'), b = find('back'); if (dr) act(f, p, dr); else if (b && thr) act(f, p, b); else act(f, p, { id: 'end' }); return true; }
    if (find('drink') && hpFrac < 0.35 && !thr) { act(f, p, find('drink')); return true; }
    const fd = acts.find(a => a.id === 'feed'); if (fd && thr < 2) { act(f, p, fd); return true; }
    const st = acts.find(a => a.id === 'stabilize'); if (st && !thr && (p.skills.heal >= 2 || (tr.loyalty || 0) > 0.55)) { act(f, p, st); return true; }
    const pk = find('pickup'); if (pk && p.weapon === 'fists') { act(f, p, pk); if (conscious(p) && p.turnLeft?.standard) npcTurn(f, p); return true; }
    return false;
  }
  function holdTurn(f, p, acts, hpFrac) {
    const find = id => acts.find(a => a.id === id), other = body(p.heldBy || p.holding);
    if (!other) return false;
    if (p.heldBy) {
      const e = globalThis.SRD.escapeCheckOf(gmod(p), p.kind === 'human' ? (p.skills?.escape ?? -99) : -99), odds = pBeat(e.mod, gmod(other));
      const hit = acts.find(a => a.id === 'attack' && a.target === other.id);
      if (find('escape') && (odds > 0.4 || hpFrac < 0.5 || !hit)) return act(f, p, find('escape')), true;
      if (hit) return act(f, p, hit), true;
    } else if (hpFrac < 0.3 && p.kind === 'human' && find('release')) { act(f, p, find('release')); npcTurn(f, p); return true; }
    const sq = find('squeeze'), hit = acts.find(a => a.id === 'attack' && a.target === other.id);
    if (hit && (p.kind !== 'human' || p.weapon !== 'fists')) return act(f, p, hit), true;
    if (sq) return act(f, p, sq), true;
    return false;
  }
  // a maneuver over a plain swing, when LoH's own sums say it's likely to work and worth the free swing it may cost
  function pickManeuver(f, p, acts, t) {
    if (!srdOn() || !t || dist2(p, t) > 2.1 || WEAPONS[p.weapon]?.range) return null;
    const S = globalThis.SRD, A = mview(p), B = mview(t), find = id => acts.find(a => a.id === id && a.target === t.id);
    const allies = f.order.map(body).filter(q => q && q !== p && conscious(q) && f.sides.get(q.id) === f.sides.get(p.id) && dist2(q, t) <= 2.1).length;
    const risky = threatens(t) && t.aooUsed !== f.round;
    const touch = pHit(A.bab + A.strMod, touchAc(t));
    const tr = find('trip'); if (tr) { const c = S.tripChecks(A, B, { atk: hasFeat(p, 'Improved Trip') ? 4 : 0 }), pr = touch * pBeat(c.mine, c.theirs); if (pr > (risky && !hasFeat(p, 'Improved Trip') ? 0.7 : 0.5) && (allies || t.kind === 'animal')) return tr; }
    const da = find('disarm'); if (da && avgDmg(t.weapon) >= 4.5) { const c = S.disarmChecks(A, blowOf(p), B, blowOf(t)), pr = pBeat(c.mine, c.theirs); if (pr > (risky && !hasFeat(p, 'Improved Disarm') ? 0.72 : 0.55)) return da; }
    const gr = find('grapple'); if (gr && ((t.missiles || 0) + (t.rays || 0) > 0)) { const pr = touch * pBeat(gmod(p), gmod(t)); if (pr > 0.5) return gr; }
    return null;
  }
  sim.pickManeuver = pickManeuver;

  // ---- LoH's FIGHT DOSSIERS (battle/learn.js + battle/profile.js): the same twenty numbers at a turn's start, the same
  // seven acts at its end, filed per name (every wolf in one file, as LoH pools generic names) --------------------------
  const lohName = q => !q ? 'something' : q.id === 'player' ? 'Rose' : q.kind === 'animal' ? (q.monster || q.game ? q.name : q.owner ? 'Companion ' + q.species : q.species) : fullName(q);
  sim.lohName = lohName;
  function dossier(q) { const D = (sim.dossiers ||= {}), n = lohName(q); return D[n] ||= (globalThis.SRD?.blankBrain ? globalThis.SRD.blankBrain() : { profile: null, recs: [], lastAct: -1 }); }
  const hpf = q => q && q.alive ? Math.max(0, q.hp) / (q.maxhp || 1) : 0;
  function nearestFoeOf(f, p) { let best = null, bd = Infinity; for (const q of foesOf(f, p)) { const dd = dist2(q, p); if (dd < bd) { bd = dd; best = q; } } return best ? { foe: best, ft: bd / 0.3048 } : null; }
  function flankedNow(f, p) { const th = threatened(f, p); for (let i = 0; i < th.length; i++) for (let j = i + 1; j < th.length; j++) { const ax = th[i].x - p.x, az = th[i].z - p.z, bx = th[j].x - p.x, bz = th[j].z - p.z; if ((ax * bx + az * bz) / ((Math.hypot(ax, az) * Math.hypot(bx, bz)) || 1) < -0.5) return true; } return false; }
  function quarterOf(p, foe) { let rel = Math.atan2(p.x - foe.x, p.z - foe.z) - (foe.yaw || 0); while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2; const a = Math.abs(rel); return a < Math.PI / 4 ? 3 : a > 3 * Math.PI / 4 ? 0 : rel > 0 ? 1 : 2; }
  // the twenty numbers, in LoH's order and meaning (battle/learn.js features)
  function lohFeatures(f, p, near, lastAct) {
    const inp = new Array(20).fill(0), foe = near?.foe;
    inp[0] = Math.min(1, (near ? near.ft : 60) / 60);
    inp[1] = p.maxhp > 0 ? Math.max(0, p.hp / p.maxhp) : 1;
    inp[2] = foe && foe.maxhp > 0 ? Math.max(0, foe.hp / foe.maxhp) : 0;
    inp[3] = threatened(f, p).length ? 1 : 0;
    inp[4] = foe && threatens(p) && dist2(foe, p) <= 2.1 ? 1 : 0;
    inp[5] = foe && coverOf(p, foe) ? 1 : 0;
    inp[6] = foe && coverOf(foe, p) ? 1 : 0;
    inp[7] = flankedNow(f, p) ? 1 : 0;
    inp[8] = p.kind === 'human' && WEAPONS[p.weapon]?.range ? 1 : 0;
    inp[9] = Math.min(1, ((p.cures || 0) + (p.missiles || 0) + (p.rays || 0)) / 6);
    inp[10] = Math.min(1, (f.round || 1) / 10);
    if (lastAct >= 0 && lastAct <= 6) inp[11 + lastAct] = 1;
    inp[18] = Math.min(1, (p.kind === 'animal' ? p.ac : acOf(p)) / 25);
    inp[19] = p.prone ? 1 : 0;
    return inp;
  }
  sim.lohFeatures = (f, p) => lohFeatures(f, p, nearestFoeOf(f, p), dossier(p).lastAct);
  // the turn before is judged when the body's next turn comes (or the fight ends): the hp it took off the foe it faced,
  // less the hp it lost meanwhile
  function settleLoh(f, p) { const row = f.lohLast?.[p.id]; if (!row || row.r != null) return; row.r = +((row.foeHp0 - hpf(body(row.foe))) - (row.hp0 - hpf(p))).toFixed(3); }
  function lohStart(f, p) {
    holdCheck(f, p);
    const near = nearestFoeOf(f, p), b = dossier(p);
    if (!(f.lohSeen ||= new Set()).has(p.id)) { f.lohSeen.add(p.id); if (b.profile && globalThis.SRD?.noteFight) globalThis.SRD.noteFight(b); }
    settleLoh(f, p);
    (f.watch ||= new Map()).set(p.id, { startFt: near ? near.ft : null, foe: near?.foe.id || null, hp0: hpf(p), foeHp0: near ? hpf(near.foe) : 0, inp: lohFeatures(f, p, near, b.lastAct), melee: 0, ranged: 0, spell: null, atkFt: 0, atkN: 0 });
  }
  function lohSaw(f, p, kind, t) { const o = f.watch?.get(p.id); if (!o) return; if (kind === 'cast') { o.spell = { name: 'a spell' }; return; } o[kind]++; if (t) { o.atkFt += dist2(p, t) / 0.3048; o.atkN++; } }
  function lohEnd(f, p) {
    const o = f.watch?.get(p.id); if (!o) return; f.watch.delete(p.id);
    for (const q of f.order.map(body)) if (q?.feinted && q.feinted.by === p.id && q.feinted.round < f.round) q.feinted = null;   // a feint lasts to the end of the feinter's next turn
    const near = nearestFoeOf(f, p), endFt = near ? near.ft : o.startFt;
    let mv = 1; if (o.startFt != null && endFt != null) { const dd = o.startFt - endFt; if (dd > 2) mv = 0; else if (dd < -2) mv = 2; }
    const act = o.spell ? 3 : o.ranged ? 2 : o.melee ? (mv === 0 ? 0 : 1) : mv === 0 ? 4 : mv === 2 ? 5 : 6;
    const foe = body(o.foe), b = dossier(p);
    const t = { act, mv, dist: +(((o.startFt ?? endFt) || 0)).toFixed(1), atkDist: o.atkN ? +(o.atkFt / o.atkN).toFixed(1) : null, cover: !!(foe && coverOf(foe, p)), threatened: o.inp[3] === 1, flanked: o.inp[7] === 1,
      angle: foe ? quarterOf(p, foe) : -1, hp: p.hp, maxHp: p.maxhp, weapon: p.kind === 'animal' ? (p.attackName || 'bite') : (WEAPONS[p.weapon]?.name || null), spell: o.spell, inp: o.inp };
    if (b.profile && globalThis.SRD?.noteTurn) globalThis.SRD.noteTurn(b, t); else b.lastAct = act;
    const row = { type: 'loh_turn', fight: f.id, day: sim.day, who: lohName(p), id: p.id, kind: p.kind, role: p.kind === 'human' ? (p.job || 'none') : p.species, player: p.brain === 'human', net: o.net ?? null,
      ...t, hp0: +o.hp0.toFixed(3), foe: o.foe, foeHp0: +o.foeHp0.toFixed(3), r: null, outcome: null };
    (f.lohRows ||= []).push(row); (f.lohLast ||= {})[p.id] = row;
  }
  function lohFightEnd(f, winnerSide) {
    for (const id of f.order) { const q = body(id); if (q) settleLoh(f, q); }
    const outcome = q => !q || !q.alive ? -1 : !conscious(q) ? -0.6 : q.surrendered ? -0.4 : (q.fled || 0) >= 2 ? -0.1 : f.sides.get(q.id) === winnerSide ? 1 : -0.2;
    for (const r of f.lohRows || []) { r.outcome = outcome(body(r.id)); dataRow(r); }
    for (const id of f.order) { const q = body(id); if (!q || (q.alive && conscious(q))) continue; const by = body(q.lastHurtBy || q.hurtBy), b = dossier(q); if (b.profile && globalThis.SRD?.noteDefeat) globalThis.SRD.noteDefeat(b, lohName(by)); dataRow({ type: 'loh_defeat', fight: f.id, day: sim.day, who: lohName(q), by: lohName(by) }); }
    // the ground: a weapon knocked loose goes back to its owner; holds, falls and feints end with the fight
    for (const g of f.dropped || []) { const o = sim.people[g.owner]; if (o && o.alive) { if (o.weapon === 'fists') o.weapon = g.k; else o.items[g.k] = (o.items[g.k] || 0) + 1; } }
    f.dropped = [];
    for (const id of f.order) { const q = body(id); if (q) { q.prone = false; q.heldBy = null; q.holding = null; q.feinted = null; } }
  }

  // THE FIGHT NET'S TURN (town/fightnet.js, trained by train_fight.mjs): it picks one of LoH's seven acts from the twenty
  // numbers; Hollow Town turns the act into this turn's actions
  function netTurn(f, p, acts, foes) {
    const o = f.watch?.get(p.id), near = nearestFoeOf(f, p); if (!o || !near) return false;
    const w = WEAPONS[p.weapon] || {}, find = id => acts.find(a => a.id === id), weakest = l => l.sort((x, y) => body(x.target).hp - body(y.target).hp)[0];
    const melee = acts.filter(a => a.id === 'attack' && !w.range), shots = acts.filter(a => (a.id === 'attack' && w.range) || a.id === 'throw');
    const canCast = (p.cures || 0) + (p.missiles || 0) + (p.rays || 0) + (p.layPool || 0) > 0;
    const mask = [!w.range && !!(find('charge') || find('move')), melee.length > 0, shots.length > 0, canCast, !!find('move'), !!(find('back') || find('withdraw') || find('step') || find('run')), true];
    const pr = sim.fightNet.decide(o.inp, mask); let k = 0; for (let i = 1; i < 7; i++) if (pr[i] > pr[k]) k = i;
    if (sim.fightNetSample) { let u = Math.random(); for (let i = 0; i < 7; i++) { u -= pr[i]; if (u <= 0) { k = i; break; } } }
    o.net = k; (sim.netStats ||= { turns: 0, acts: [0, 0, 0, 0, 0, 0, 0] }).turns++; sim.netStats.acts[k]++;
    switch (k) {
      case 0: { const ch = find('charge'); if (ch) return act(f, p, ch), true; const mv = find('move'); if (mv) { act(f, p, mv); const a2 = legalActions(f, p).filter(a => a.id === 'attack'); if (a2.length) act(f, p, weakest(a2)); return true; } break; }
      case 1: { const t = body(weakest(melee).target), m = pickManeuver(f, p, acts, t); return act(f, p, m || weakest(melee)), true; }
      case 2: return act(f, p, weakest(shots)), true;
      case 3: if (castTurn(f, p, foes)) { lohSaw(f, p, 'cast'); return true; } break;
      case 4: { const mates = f.order.map(body).filter(q => q && q !== p && conscious(q) && f.sides.get(q.id) === f.sides.get(p.id)); const mv = acts.filter(a => a.id === 'move').sort((x, y) => mates.filter(q => dist2(q, body(y.target)) <= 2.1).length - mates.filter(q => dist2(q, body(x.target)) <= 2.1).length)[0]; if (mv) return act(f, p, mv), true; break; }
      case 5: { const b = find('withdraw') || find('back') || find('step') || find('run'); if (b) return act(f, p, b), true; break; }
      case 6: { const dr = find('drink'); if (dr && hpf(p) < 0.6) return act(f, p, dr), true; const st = find('stabilize'); if (st) return act(f, p, st), true; const df = find('defend'); if (df) return act(f, p, df), true; break; }
    }
    return false;
  }
  function startFight(a, b, o = {}) {
    if (!conscious(a) || !b.alive) return null;
    let f = sim.fights.find(f => f.sides.has(a.id) || f.sides.has(b.id));
    if (!f) {
      f = { by: a.id, id: 'f' + Math.random().toString(36).slice(2, 7), round: 1, order: [], turn: 0, sides: new Map(), mode: new Map(), log: [], started: sim.t, why: o.why || 'a fight', at: P(a.x, a.z) };
      sim.fights.push(f);
      log('fight', `${a.name} attacks ${b.name}${o.why ? ' (' + o.why + ')' : ''}.`, [a.id, b.id]);
      if (a.monster || b.monster) for (const q of living()) if (q !== a && q !== b && q.kind === 'human' && q.state === 'sleep' && q.brain !== 'human' && conscious(q) && dist2(q, b) < (sameSpace(q, b) ? 12 : 5)) { q.task = null; q.state = 'idle'; q.alert = true; remember(q, { text: `woken by ${a.monster ? 'a ' + a.name.toLowerCase() : a.name} attacking ${b.monster ? 'a ' + b.name.toLowerCase() : b.name}` }); }
    }
    join(f, a, 'A' + a.id, o.mode || 'nonlethal');
    join(f, b, f.sides.get(b.id) || 'B' + b.id, b.brain === 'human' ? (b.prefMode || 'lethal') : b.monster ? 'lethal' : 'nonlethal');
    (a.foes ||= new Set()).add(b.id); (b.foes ||= new Set()).add(a.id);
    // the one attacked is a victim: it's an assault (witnessed) unless it's a lawful arrest
    if (b.kind === 'human' && !(o.why === 'bounty' && sim.bounty[b.id]) && !(isGuard(a) && (o.why === 'arrest' || o.why === 'resisting arrest' && false))) deed(o.why === 'mug' ? 'mugging' : 'assault', a, b, b);
    else if (b.kind === 'animal' && b.owner && sim.people[b.owner]) deed('assault', a, sim.people[b.owner], b);
    // allies nearby decide whether to join (backers, gang, owners' dogs, guards on duty)
    for (const x of [a, b]) for (const an of Object.values(sim.animals)) if (an.alive && an.owner === x.id && !an.game && !an.familiar && dist2(an, x) < 10 && x.kind === 'human' && x.brain !== 'human' && conscious(x)) {
      const word = (x.sicWord ||= pick(['get him', 'go on', 'at them', 'sic', 'take them'])), line = `${an.name}, ${word}!`;
      log('talk', `${x.name}: "${line}"`, [x.id, an.id]); x.bubble = { text: line, t: sim.t }; hearWords(x, line); petEvent(an, 'fight');
    }
    for (const x of [a, b]) if (x.party) for (const q of living()) if (q !== x && q.party === x.party && conscious(q) && !f.sides.has(q.id) && dist2(q, x) < 25) { join(f, q, f.sides.get(x.id), x === a ? (o.mode || 'nonlethal') : 'nonlethal'); log('fight', `${q.name} joins in with ${x.name}'s party.`, [q.id, x.id]); }
    if (o.quiet) return f;
    for (const q of [...living(), ...Object.values(sim.animals)]) {
      if (f.sides.has(q.id) || !conscious(q) || dist2(q, b) > 14 || q.brain === 'human') continue;
      if (q.kind === 'animal') { if (q.temper === 'aggressive' && q.owner && (q.owner === b.id || q.owner === a.id)) join(f, q, f.sides.get(q.owner), 'lethal'); continue; }
      if (a.monster || b.monster) {
        const beast = a.monster ? a : b, victim = a.monster ? b : a; if (!sees(q, beast)) continue;
        const nerve = (isGuard(q) ? 1.5 : q.militia || deputyNow(q) ? 1.1 : 0) + q.traits.aggression - q.traits.caution + (q.weapon !== 'fists' ? 0.5 : -0.6) + (WEAPONS[q.weapon]?.range ? 0.3 : 0) + (ARMOR[q.armor] || ARMOR.none).dr * 0.2 + (q.spouse === victim.id || household(q).includes(victim) ? 1 : 0) + R(q, victim).like * 0.5 + (victim.owner === q.id ? 0.8 : 0);
        if (nerve > 0.6) { join(f, q, f.sides.get(victim.id), 'lethal'); log('fight', `${q.name} joins the fight against the ${beast.name.toLowerCase()}!`, [q.id]); }
        else if (q.task?.kind !== 'flee' && q.brain !== 'human') { setTask(q, 'flee', { from: P(beast.x, beast.z), until: sim.t + 20 }); }
        continue;
      }
      for (const [x, y] of [[a, b], [b, a]]) {
        const stake = (q.spouse === x.id ? 1 : 0) + (q.gang && q.gang === x.gang ? 0.8 : 0) + R(q, x).like - R(q, y).like * 0.5 + (isGuard(q) && onDuty(q) && x === b ? 0.6 : 0);
        if (stake * q.traits.loyalty - q.traits.caution * 0.6 > 0.35 && (might(q) + 2) > might(y) * 0.5) { join(f, q, f.sides.get(x.id), isGuard(q) ? 'nonlethal' : (q.traits.aggression > 0.75 ? 'lethal' : 'nonlethal')); (q.foes ||= new Set()).add(y.id); log('fight', `${q.name} joins in on ${x.name}'s side.`, [q.id, x.id]); break; }
      }
    }
    return f;
  }
  sim.startFight = startFight;
  function join(f, p, side, mode) {
    if (p.fightStyle?.blows && p.brain !== 'human') mode = p.fightStyle.blows;
    if (f.sides.has(p.id)) return;
    f.sides.set(p.id, side); f.mode.set(p.id, mode);
    p.init = d(20) + mod(p.kind === 'human' ? p.st.dex : 2) + (p.kind === 'animal' ? 2 : 0) + (p.feats?.includes('Improved Initiative') ? 4 : 0);
    if (p.kind === 'human' && p.ragesLeft > 0 && clvl(p, 'barbarian') && p.rage !== f.id) { p.ragesLeft--; p.rage = f.id; f.log.push(`${p.name} flies into a rage!`); log('fight', `${p.name} flies into a rage!`, [p.id]); }
    p.fight = f.id; p.task = null; p.state = 'fight'; p.flatfooted = f.round === 1;
    f.order.push(p.id); f.order.sort((x, y) => (body(y).init || 0) - (body(x).init || 0));
  }
  const body = id => sim.people[id] || sim.animals[id];
  sim.body = body;
  const foesOf = (f, p) => f.order.map(body).filter(q => q && f.sides.get(q.id) !== f.sides.get(p.id) && q.alive && conscious(q));
  const threatened = (f, p) => foesOf(f, p).filter(q => dist2(q, p) <= 2.1 && threatens(q));
  sim.foesOf = foesOf;

  const flanked = (f, a, t) => f.order.some(id => { const q = body(id); return q && q !== a && q.alive && conscious(q) && f.sides.get(q.id) === f.sides.get(a.id) && dist2(q, t) <= 2.1; });
  const inspire = (f, a) => musicOn(f, a) ? 1 : 0;   // a performance now (Rose: SRD bard)
  const inspireOld = (f, a) => f.order.some(id => { const q = body(id); return q && q.kind === 'human' && q.alive && conscious(q) && clvl(q, 'bard') && f.sides.get(q.id) === f.sides.get(a.id); }) ? 1 : 0;
  const weaponOf = a => a.weapon === 'fists' && clvl(a, 'monk') ? { ...WEAPONS.fists, name: 'Unarmed strike', dmg: clvl(a, 'monk') >= 4 ? [1, 8] : [1, 6], weak: false, monk: true } : WEAPONS[a.weapon];
  // one swing, then: a troll's second claw, or a Cleave into the next foe
  function attack(f, a, t, o = {}) {
    attack1(f, a, t, o);
    if (a.kind === 'animal' && a.multi && !o.extra) for (let i = 0; i < a.multi; i++) if (t.alive && conscious(t) && f.sides.has(t.id)) attack1(f, a, t, { ...o, extra: true });
    if (a.kind === 'human' && !o.cleave && hasFeat(a, 'Cleave') && !WEAPONS[a.weapon]?.range && !conscious(t) && a.cleaveAt !== f.id + ':' + f.round) { const t2 = foesOf(f, a).find(q => dist2(q, a) <= 2.1); if (t2) { a.cleaveAt = f.id + ':' + f.round; logF(f, `${a.name} cleaves on into ${t2.name}!`); attack1(f, a, t2, { ...o, cleave: true }); } }
  }
  function attack1(f, a, t, o = {}) {
    if (!o.aoo) lohSaw(f, a, o.stone || (a.kind === 'human' && WEAPONS[a.weapon]?.range && !o.bash) ? 'ranged' : 'melee', t);
    const w = a.kind === 'animal' ? { name: a.attackName || 'bite', dmg: a.bite, crit: [20, 2], melee: true } : weaponOf(a);
    const mode = o.mode || f.mode.get(a.id) || 'lethal';
    const ranged = !!w.range && !o.bash && !o.stone;
    if (srdOn()) {
      if (o.stone) { if (dist2(a, t) > 15) return logF(f, `${a.name} can't throw a stone that far.`); if (threatened(f, a).length) provoke(f, a); if (!conscious(a)) return; }
      else if (ranged && w.ammo) {
        const stone = w.ammo === 'bullets' && !(a.items.bullets > 0) && a.items.stones > 0;
        if (!(a.items[w.ammo] > 0) && !stone) return logF(f, `${a.name} has nothing left to shoot.`);
        if (w.reload && a.unloaded) return logF(f, `${a.name}'s crossbow isn't loaded.`);
        a.items[stone ? 'stones' : w.ammo]--; if (w.reload) a.unloaded = true;
        if (threatened(f, a).length) provoke(f, a); if (!conscious(a)) return;   // a shot in a foe's reach provokes (SRD)
      } else if (dist2(a, t) > 2.1) return logF(f, `${a.name} can't reach ${t.name}.`);
      // bare hands provoke from the armed foe they strike, before the blow (SRD, Unarmed Attacks; LoH battle.js unarmedProvokes)
      if (a.kind === 'human' && !o.stone && !o.bash && !o.aoo && a.weapon === 'fists' && !fistArmed(a) && t !== a && conscious(t) && f.sides.has(t.id) && threatens(t) && t.aooUsed !== f.round && dist2(a, t) <= 2.1) {
        t.aooUsed = f.round; logF(f, `${a.name} swings bare-handed at an armed foe: ${t.name} gets a free swing first.`); attack(f, t, a, { aoo: true }); if (!conscious(a) || !t.alive) return;
      }
      const r = srdAttack(f, a, t, o);
      if (!r.hit) return logF(f, r.line);
      hurt(t, r.dmg, r.nonlethal, a);
      if (a.kind === 'animal' && t.kind === 'human' && t.alive && Math.random() < 0.3) expose(t, ({ bear: 'redache', boar: 'redache', direwolf: 'chills', ogre: 'demon' })[a.species] || 'filth', 'a ' + String(a.name).toLowerCase() + ' bite');
      logF(f, `${r.line}${r.nonlethal ? ' (nonlethal)' : ''} ${status(t)}`);
      if (wolfish(a) && t.alive && conscious(t) && !t.prone && !o.aoo) tripAt(f, a, t, { free: true });   // the SRD wolf: a bite that hits may trip, free
      return;
    }
    if (ranged && w.ammo) { if (!(a.items[w.ammo] > 0)) return logF(f, `${a.name} has nothing left to shoot.`); if (w.reload && a.unloaded) return logF(f, `${a.name}'s crossbow isn't loaded.`); a.items[w.ammo]--; if (w.reload) a.unloaded = true; }
    if (!ranged && dist2(a, t) > 2.1) return logF(f, `${a.name} can't reach ${t.name}.`);
    let bonus = (a.kind === 'animal' ? (a.atk ?? 2) : babOf(a) + (ranged ? mod(a.st.dex) : mod(a.st.str))) + (w.enh || 0);
    if (o.charge) bonus += 2; if (o.flurry) bonus += o.flurry;
    let extraDmg = 0; const notes = [];
    if (a.kind === 'human') {
      const close = ranged && dist2(a, t) < 9;
      const hun = a.food < 0.1 ? 2 : a.food < 0.3 ? 1 : 0; if (hun) { bonus -= hun; extraDmg -= hun; }   // the hungry are weaker (Rose)
      if (hasFeat(a, 'Weapon Focus')) bonus += 1;
      if (a.rage === f.id) { bonus += 2; extraDmg += 2; }
      const insp = inspire(f, a); bonus += insp; extraDmg += insp;
      if (close && hasFeat(a, 'Point Blank Shot')) { bonus += 1; extraDmg += 1; }
      if (ranged && clvl(a, 'ranger') >= 2) bonus += 1;
      if (!ranged && mode === 'lethal' && hasFeat(a, 'Power Attack')) { bonus -= 2; extraDmg += w.hands === 2 ? 4 : 2; }
      if (hasFeat(a, 'Weapon Specialization')) extraDmg += 2;
      if (t.kind === 'animal' && t.monster && clvl(a, 'ranger')) extraDmg += 2;
      if (clvl(a, 'paladin') && !(a.smote ||= {})[f.id] && (t.monster || mode === 'lethal')) { a.smote[f.id] = 1; bonus += Math.max(0, mod(a.st.cha)); extraDmg += clvl(a, 'paladin'); notes.push('smite'); }
      const rg = clvl(a, 'rogue'); if (rg && (flatNow(t) || !ranged && flanked(f, a, t))) { extraDmg += roll(Math.ceil(rg / 2), 6); notes.push('sneak attack'); }
    }
    if (ranged) { const inc = Math.floor(dist2(a, t) / w.range); bonus -= inc * 2; if (threatened(f, a).length) provoke(f, a); }
    const wantNL = mode === 'nonlethal';
    if (wantNL !== !!w.nonlethal && !w.monk) bonus -= 4;    // a lethal weapon pulled for nonlethal, or fists going for blood
    const ac = t.kind === 'animal' ? t.ac : acOf(t);
    const r = d(20), total = r + bonus, helpless = !conscious(t);
    if (r !== 20 && (r === 1 || total < ac) && !helpless) return logF(f, `${a.name} attacks ${t.name} with ${w.name.toLowerCase()} and misses (${total} vs AC ${ac}).`);
    const strB = a.kind === 'animal' ? (a.dmgBonus || 0) : ranged ? (w.thrown ? mod(a.st.str) : 0) : Math.floor(mod(a.st.str) * (w.hands === 2 && mod(a.st.str) > 0 ? 1.5 : 1));
    let dmg = roll(w.dmg[0], w.dmg[1]) + strB + (w.enh || 0) + extraDmg;
    let crit = false;
    if (r >= w.crit[0]) { const c = d(20) + bonus; if (c >= ac) { crit = true; for (let i = 1; i < w.crit[1]; i++) dmg += roll(w.dmg[0], w.dmg[1]) + strB; } }
    dmg = Math.max(1, dmg);
    // armour soaks part of every blow (bare fists and paws barely get through plate)
    const dr = t.kind === 'animal' ? (t.dr || 0) : (ARMOR[t.armor] || ARMOR.none).dr * (w.weak ? 2 : 1);
    const soaked = Math.min(dmg, dr); dmg -= soaked;
    if (dmg <= 0) return logF(f, `${a.name} hits ${t.name} with ${w.name.toLowerCase()}, but the ${(ARMOR[t.armor] || ARMOR.none).name.toLowerCase()} takes it all (${total} vs AC ${ac}).`);
    hurt(t, dmg, wantNL, a);
    if (a.kind === 'animal' && t.kind === 'human' && t.alive && Math.random() < 0.3) expose(t, ({ bear: 'redache', boar: 'redache', direwolf: 'chills', ogre: 'demon' })[a.species] || 'filth', 'a ' + String(a.name).toLowerCase() + ' bite');
    logF(f, `${a.name} hits ${t.name} with ${w.name.toLowerCase()} for ${dmg}${soaked ? ` (${soaked} soaked by armour)` : ''}${wantNL ? ' nonlethal' : ''}${crit ? ' (critical!)' : ''}${notes.length ? ' (' + notes.join(', ') + ')' : ''} (${total} vs AC ${ac}). ${status(t)}`);
  }
  sim.attack = attack;
  function hurt(t, dmg, nonlethal, by) {
    if (t.down === 'spell' && !t.sprayed && dmg > 0) t.down = null;   // magic sleep breaks on a wound
    if (t.kind === 'animal') {
      if (!t.alive) return;
      t.hp -= dmg; t.hurtAt = sim.t; if (by) t.hurtBy = by.id;
      if (t.hp <= 0 && t.last && sim.animalMinds) aNudge(t.species, t.last.x, t.last.act, -1, 0.05);
      if (t.hp <= 0 && by?.monster) by.kills = (by.kills || 0) + 1;
      if (t.hp <= 0) {
        t.alive = false; t.state = 'dead';
        if (t.monster && by && by.kind === 'human') {
          { const total = 600 * (t.cr || 1), fx = sim.fights.find(f => f.sides.has(by.id)), share = fx ? fx.order.map(body).filter(q => q && q.kind === 'human' && q.alive && fx.sides.get(q.id) === fx.sides.get(by.id)) : [by]; for (const q of share) gainXP(q, Math.floor(total / Math.max(1, share.length)) + (q === by ? Math.floor(total / 4) : 0), 'the ' + t.name.toLowerCase()); }
          win('beast', by, { beast: String(t.name).toLowerCase(), weapon: (WEAPONS[by.weapon]?.name || 'bare hands').toLowerCase() });
          by.stats.beasts = (by.stats.beasts || 0) + 1; if (t.pelt) by.items[t.pelt] = (by.items[t.pelt] || 0) + 1;
          const bounty = Math.min(sim.treasury, sim.bounty.beasts ?? 80); if (bounty > 0) pay('town', by, bounty, 'beast bounty');
          log('death', `${by.id === 'player' ? 'You' : fullName(by)} ${by.id === 'player' ? 'kill' : 'kills'} the ${t.name.toLowerCase()}!${bounty ? ` The town pays ${money(bounty)}.` : ''}`, [by.id]);
          for (const q of living()) if (q.kind === 'human' && q !== by && sees(q, t)) { bump(q, by, 'like', 0.1); glimpse(q, by, seen(q, by).worth + 10, 0.2); }
        }
        if (t.game && by && by.kind === 'human' && by.job === 'none' && !by.town && by.brain !== 'human' && Math.random() < 0.4) { by.job = 'hunter'; log('life', `${fullName(by)} takes up hunting for a living.`, [by.id]); }
        if (t.game && by && by.kind === 'human') { const total = ({ rabbit: 25, pheasant: 25, deer: 100, boar: 300 })[t.species] || 50, fx = sim.fights.find(f => f.sides.has(by.id)), share = fx ? fx.order.map(body).filter(q => q && q.kind === 'human' && q.alive && fx.sides.get(q.id) === fx.sides.get(by.id)) : [by]; for (const q of share) gainXP(q, Math.floor(total / Math.max(1, share.length)), 'a ' + t.species); }   // Rose: game gives XP too
        if (t.meat && by && by.kind === 'human') {     // the kill is shared among the hunting party in the fight
          const f = sim.fights.find(f => f.sides.has(by.id)), share = f ? f.order.map(body).filter(q => q && q.kind === 'human' && q.alive && f.sides.get(q.id) === f.sides.get(by.id)) : [by];
          for (let i = 0; i < t.meat; i++) { const q = share[i % share.length]; q.items.meat = (q.items.meat || 0) + 1; }
          log('trade', `${by.name}${share.length > 1 ? "'s party" : ''} brings down a ${t.species} (${t.meat} meat${share.length > 1 ? ', shared ' + share.map(q => q.name).join(', ') : ''}).`, share.map(q => q.id));
          if (by.party) disband(sim.people[by.id]);
        }
      }
      return;
    }
    // ONE BAR (as in LoH, src/rules/health.js, Rose 2026-09-19: "you just gave the enemy a second health bar... one that's invisible").
    // Every blow comes off hp. A blow that can't kill stops at 0: out cold and stable, never dying. nl only remembers
    // how much of the missing hp is bruising, which comes back with rest; a real wound doesn't.
    if (nonlethal) { const real = Math.min(dmg, Math.max(0, t.hp)); t.hp -= real; t.nl += real; t.lastHurtBy = by?.id; if (t.hp <= 0 && !t.down) { t.down = 'out'; t.downUntil = sim.t + 30 + dmg * 6; } return; }
    t.hp -= dmg;
    t.lastHurtBy = by?.id;
    if (srdOn() && t.kind === 'human' && t.brain !== 'human') return lohFall(t, dmg, by);
    if (t.hp <= -10 && by?.monster) by.kills = (by.kills || 0) + 1;
    if (t.hp <= -10) { if (t.brain === 'human') { t.hp = 0; t.down = 'out'; t.downUntil = sim.t + 30; } else die(t, by, 'killed in a fight'); }
    else if (t.hp <= 0) { if (t.brain === 'human') { t.down = 'out'; t.downUntil = sim.t + 30; } else { t.dying = t.hp < 0; t.down = 'dying'; } }
  }
  sim.hurt = hurt;
  const status = t => !t.alive ? `${t.name} is dead.` : t.kind === 'animal' ? '' : t.dying ? `${t.name} is dying.` : t.down === 'out' ? `${t.name} is knocked out.` : t.hp <= 0 ? `${t.name} is disabled.` : '';
  function provoke(f, mover) {
    for (const q of threatened(f, mover)) { if (q.aooUsed === f.round) continue; q.aooUsed = f.round; logF(f, `${q.name} gets an attack of opportunity on ${mover.name}.`); attack(f, q, mover); }
  }
  function logF(f, text) { f.log.push(text); log('fight', text, []); }

  // the actions a fighter may take on their turn (D&D 3.5)
  // standard: attack, total defence, draw/drink, stabilize, intimidate (demoralize), feint, coup de grace (full-round)
  // move: move (speed), draw weapon, stand up; swift: shout for help; free: drop weapon / surrender, 5-foot step
  // full-round: charge, run, withdraw, full attack (one attack at these levels)
  const SPEED = p => p.kind === 'animal' ? (p.speed || (p.species === 'dog' ? 12 : 9)) : (ARMOR[p.armor] || ARMOR.none).speed * hungerPace(p);
  function legalActions(f, p) {
    const acts = [], foes = foesOf(f, p), adj = foes.filter(q => dist2(q, p) <= 2.1), helpless = f.order.map(body).filter(q => q && q.alive && (q.kind === 'human' || q.down === 'spell') && !conscious(q) && f.sides.get(q.id) !== f.sides.get(p.id) && dist2(q, p) <= 2.1);
    const w = p.kind === 'animal' ? { melee: true } : WEAPONS[p.weapon];
    const tn = p.turnLeft || { standard: 1, move: 1, swift: 1, step: 1 };
    if (tn.standard) {
      const canShoot = w.range && (!w.ammo || p.items?.[w.ammo] > 0 || w.ammo === 'bullets' && p.items?.stones > 0 && srdOn()) && !(w.reload && p.unloaded);
      for (const q of foes) if ((canShoot && dist2(q, p) < w.range * 5) || (!w.range && dist2(q, p) <= 2.1)) acts.push({ id: 'attack', target: q.id, label: `${w.range ? 'Shoot' : 'Attack'} ${q.name}`, cost: 'standard' });
      if (w.range && dist2(foes.sort((x, y) => dist2(x, p) - dist2(y, p))[0] || p, p) <= 2.1 && p.kind === 'human') for (const q of adj) acts.push({ id: 'bash', target: q.id, label: `Hit ${q.name} with the ${w.name.toLowerCase()}`, cost: 'standard' });
      if (tn.move && tn.standard) for (const q of foes) { const dd = dist2(q, p); if (dd > 3 && dd <= SPEED(p) * 2 && w.melee) acts.push({ id: 'charge', target: q.id, label: `Charge ${q.name}`, cost: 'full' }); }
      acts.push({ id: 'defend', label: 'Total defence (+4 AC)', cost: 'standard' });
      if (p.kind === 'human') for (const q of foes.filter(q => q.kind === 'human' && dist2(q, p) < 9)) acts.push({ id: 'demoralize', target: q.id, label: `Intimidate ${q.name}`, cost: 'standard' });
      if (p.kind === 'human') for (const q of adj.filter(q => q.kind === 'human' || srdOn())) acts.push({ id: 'feint', target: q.id, label: `Feint ${q.name} (Bluff)`, cost: 'standard' });
      if (p.kind === 'human' && p.items.cure) acts.push({ id: 'drink', label: 'Drink a healing draught', cost: 'standard' });
      if (p.kind === 'human' && p.items?.cure > 0 && tn.move) for (const q of f.order.map(body).filter(q => q && q !== p && q.alive && q.kind === 'human' && (q.dying || (!conscious(q) && q.hp <= 0)) && f.sides.get(q.id) === f.sides.get(p.id) && dist2(q, p) <= 2.1)) acts.push({ id: 'feed', target: q.id, label: `Give ${q.name} a healing draught (full round)`, cost: 'full' });
      for (const q of f.order.map(body).filter(q => q && q.dying && f.sides.get(q.id) === f.sides.get(p.id) && dist2(q, p) <= 2.1)) acts.push({ id: 'stabilize', target: q.id, label: `Stabilize ${q.name} (Heal DC 15)`, cost: 'standard' });
      if (p.kind === 'human' || p.monster) for (const q of helpless) acts.push({ id: 'coup', target: q.id, label: `Coup de grace on ${q.name} (kills)`, cost: 'full' });
      for (const q of helpless) if (p.kind === 'human' && q.kind === 'human') acts.push({ id: 'rob', target: q.id, label: `Rob ${q.name}`, cost: 'standard' });
      if (tn.move) acts.push({ id: 'run', label: 'Run (4× speed, away)', cost: 'full' });
      if (tn.move && p.kind === 'human') acts.push({ id: 'withdraw', label: 'Withdraw (no attack of opportunity leaving)', cost: 'full' });
    }
    if (tn.standard && p.kind === 'human' && p.items?.alchfire > 0) for (const q of foes) if (dist2(q, p) <= 15) acts.push({ id: 'firebomb', target: q.id, label: `Throw alchemist's fire at ${q.name}`, cost: 'standard' });
    if (tn.standard && p.kind === 'human' && p.items?.stones > 0 && srdOn()) for (const q of foes) if (dist2(q, p) <= 15 && dist2(q, p) > 0.5) acts.push({ id: 'throw', target: q.id, label: `Throw a stone at ${q.name}`, cost: 'standard' });
    if (w.reload && p.unloaded && p.items?.[w.ammo] > 0 && (w.reload === 'move' ? tn.move : tn.move && tn.standard)) acts.push({ id: 'reload', label: `Reload (${w.reload === 'move' ? 'move action' : 'full round'})`, cost: w.reload === 'move' ? 'move' : 'full' });
    if (tn.move) for (const q of foes) if (dist2(q, p) > 2.1) acts.push({ id: 'move', target: q.id, label: `Move toward ${q.name}`, cost: 'move' });
    if (tn.step && tn.move) acts.push({ id: 'step', label: '5-foot step back', cost: 'step' });
    if (tn.swift && p.kind === 'human') acts.push({ id: 'shout', label: 'Shout for help (swift)', cost: 'swift' });
    if (p.kind === 'human') acts.push({ id: 'mode', label: `Switch to ${f.mode.get(p.id) === 'lethal' ? 'nonlethal' : 'lethal'} blows`, cost: 'free' });
    if (p.kind === 'human') acts.push({ id: 'surrender', label: 'Surrender', cost: 'free' });
    acts.push({ id: 'end', label: 'End turn', cost: 'free' });
    classActs(f, p, acts, tn);
    lohActs(f, p, acts, tn);
    return acts;
  }
  sim.legalActions = legalActions;
  function act(f, p, a) {
    const tn = p.turnLeft; const t = a.target ? body(a.target) : null;
    const spend = c => { if (c === 'full') { tn.standard = 0; tn.move = 0; tn.step = 0; } else if (c === 'standard') tn.standard = 0; else if (c === 'move') { tn.move = 0; tn.step = 0; } else if (c === 'swift') tn.swift = 0; else if (c === 'step') { tn.step = 0; tn.moved = true; } };
    if (classAct(f, p, a, t, spend)) return lohAfter(f, p, a);
    if (lohAct(f, p, a, t, spend)) return lohAfter(f, p, a);
    switch (a.id) {
      case 'attack': attack(f, p, t); spend('standard'); break;
      case 'feed': { if (threatened(f, p).length) provoke(f, p); if (conscious(p) && p.items.cure > 0 && t.alive) { p.items.cure--; const h = roll(1, 8) + 1; healUp(t, h); logF(f, `${p.name} gives ${t.name} a healing draught: +${h} hp. ${status(t) || t.name + ' is back up.'}`); remember(t, { text: `${p.name} saved my life in a fight.`, big: true }); win('save', p, { how: 'a healing draught in a fight' }); } spend('full'); break; }
      case 'firebomb': lohSaw(f, p, 'ranged', t); firebomb(f, p, t); spend('standard'); break;
      case 'throw': if (p.items.stones > 0) { p.items.stones--; attack(f, p, t, { stone: true }); } spend('standard'); break;
      case 'reload': p.unloaded = false; logF(f, `${p.name} reloads.`); spend(a.cost); break;
      case 'bash': { const keep = p.weapon; p.weapon = 'club'; attack(f, p, t); p.weapon = keep; spend('standard'); break; }
      case 'charge': { if (threatened(f, p).length) provoke(f, p); if (!conscious(p)) { spend('full'); break; } moveToward(p, t, SPEED(p) * 2, 1.6); p.charged = true; attack(f, p, t, { charge: true }); spend('full'); break; }
      case 'move': { if (threatened(f, p).length) provoke(f, p); moveToward(p, t, SPEED(p), 1.6); spend('move'); break; }
      case 'step': { const foe = foesOf(f, p).sort((x, y) => dist2(p, x) - dist2(p, y))[0]; if (foe) moveAway(p, foe, 1.5); spend('step'); logF(f, `${p.name} takes a 5-foot step.`); break; }
      case 'defend': p.defending = true; spend('standard'); logF(f, `${p.name} goes on total defence.`); break;
      case 'demoralize': { const r = d(20) + p.skills.intimidate, dc = 10 + t.level + mod(t.st.wis); if (r >= dc) { t.shaken = (f.round + 2); logF(f, `${p.name} intimidates ${t.name}: shaken (−2) (${r} vs ${dc}).`); } else logF(f, `${t.name} isn't impressed by ${p.name} (${r} vs ${dc}).`); spend('standard'); break; }
      case 'feint': { if (srdOn()) { feintAt(f, p, t); spend('standard'); break; } const r = d(20) + p.skills.bluff, dc = d(20) + t.skills.sense + babOf(t); if (r >= dc) { t.flatfooted = true; logF(f, `${p.name} feints; ${t.name} is caught flat-footed (${r} vs ${dc}).`); } else logF(f, `${t.name} sees through ${p.name}'s feint.`); spend('standard'); break; }
      case 'drink': { if (!(p.items.cure > 0)) { logF(f, `${p.name} has no draught left.`); break; } if (threatened(f, p).length) provoke(f, p); p.items.cure--; const h = roll(1, 8) + 1; if (srdOn()) { const m = globalThis.SRD.mendOf({ now: p.hp, max: p.maxhp, grey: p.nl || 0 }, h); p.hp = m.now; p.nl = Math.max(0, (p.nl || 0) - m.lifted); } else p.hp = Math.min(p.maxhp, p.hp + h); if (p.hp > 0) p.disabled = false; logF(f, `${p.name} drinks a draught (+${h} hp).`); spend('standard'); break; }
      case 'stabilize': { const kit = p.items?.healkit > 0 ? 2 : 0; if (kit) p.items.healkit--; const r = d(20) + p.skills.heal + kit; if (r >= 15) { t.dying = false; t.down = 'out'; t.downUntil = sim.t + 120; logF(f, `${p.name} stabilizes ${t.name}.`); win('save', p, { how: 'first aid' }); } else logF(f, `${p.name} fails to stop ${t.name}'s bleeding.`); spend('standard'); break; }
      case 'coup': { logF(f, p.monster ? `The ${p.name.toLowerCase()} falls on ${t.name} where they lie.` : `${p.name} delivers a coup de grace to ${t.name}.`); const w = p.kind === 'animal' ? { dmg: p.bite, crit: [20, 2] } : WEAPONS[p.weapon], dmg = roll(w.dmg[0], w.dmg[1]) * w.crit[1] + (p.kind === 'animal' ? (p.dmgBonus || 0) : mod(p.st.str)) * w.crit[1]; const save = d(20) + mod(t.st?.con ?? 10) + 1; if (t.brain === 'human') { t.hp = Math.min(t.hp, 0); t.down = 'out'; t.downUntil = sim.t + 240; logF(f, `${t.name} is left for dead.`); } else if (t.kind === 'animal') hurt(t, Math.max(dmg, t.hp + 1), false, p); else if (dmg >= t.hp + 10 || save < 10 + dmg) die(t, p, p.monster ? 'savaged' : 'coup de grace'); else hurt(t, dmg, false, p); spend('full'); break; }
      case 'rob': { const n = t.coin; pay(t, p, n); p.stats.stolen += n; deed('theft', p, t, t, { victimKnows: false }); logF(f, `${p.name} empties ${t.name}'s purse (${money(n)}).`); spend('standard'); break; }
      case 'run': { const foe = foesOf(f, p)[0]; if (threatened(f, p).length) provoke(f, p); if (foe) moveAway(p, foe, SPEED(p) * 4); p.fled = (p.fled || 0) + 1; logF(f, `${p.name} runs!`); spend('full'); break; }
      case 'withdraw': { const foe = foesOf(f, p)[0]; if (foe) moveAway(p, foe, SPEED(p) * 2); p.fled = (p.fled || 0) + 1; logF(f, `${p.name} withdraws.`); spend('full'); break; }
      case 'shout': { hueAndCry(p); logF(f, `${p.name} shouts for help!`); for (const q of living()) if (!f.sides.has(q.id) && conscious(q) && dist2(q, p) < 30 && q.brain !== 'human') { const ally = R(q, p).like + (isGuard(q) && onDuty(q) ? 0.7 : 0) + (q.spouse === p.id ? 1 : 0); if (ally * q.traits.loyalty > 0.35 + q.traits.caution * 0.4) { join(f, q, f.sides.get(p.id), isGuard(q) ? 'nonlethal' : 'nonlethal'); logF(f, `${q.name} answers the call.`); } } spend('swift'); break; }
      case 'mode': f.mode.set(p.id, f.mode.get(p.id) === 'lethal' ? 'nonlethal' : 'lethal'); logF(f, `${p.name} switches to ${f.mode.get(p.id)} blows.`); break;
      case 'surrender': { p.surrendered = true; logF(f, `${p.name} surrenders.`); tn.standard = tn.move = tn.swift = tn.step = 0; break; }
      case 'end': tn.standard = tn.move = tn.swift = tn.step = 0; break;
    }
    lohAfter(f, p, a);
  }
  // a disabled body gets one move or one standard action, and a standard one costs a hit point (SRD; LoH strenuousOf)
  function lohAfter(f, p, a) { if (!srdOn() || !isDisabled(p) || !p.turnLeft) return; if (['standard', 'full'].includes(a.cost) && !['end', 'surrender', 'mode', 'release'].includes(a.id)) strain(f, p); if (['standard', 'move', 'full'].includes(a.cost)) { const tn = p.turnLeft; tn.standard = 0; tn.move = 0; tn.step = 0; } }
  sim.act = act;
  function moveToward(p, t, maxd, stopAt) { const dd = dist2(p, t), go = Math.max(0, Math.min(maxd, dd - stopAt)); if (dd > 0) { p.x += (t.x - p.x) / dd * go; p.z += (t.z - p.z) / dd * go; p.yaw = Math.atan2(t.x - p.x, t.z - p.z); } if (!walkable(p)) { p.x -= (t.x - p.x) / dd * go * 0.5; p.z -= (t.z - p.z) / dd * go * 0.5; } }
  function moveAway(p, t, maxd) { const dx = p.x - t.x, dz = p.z - t.z, l = Math.hypot(dx, dz) || 1; for (let s = maxd; s > 0.5; s *= 0.6) { const n = P(p.x + dx / l * s, p.z + dz / l * s); if (walkable(n)) { p.x = n.x; p.z = n.z; return; } } }
  // the scripted fighter: hit the weakest reachable foe; flee when losing; finish only if lethal-minded
  // people who come within sight of a fight already going: plain brains stop what they're doing and choose again
  // (the habits or the student weigh stepping in); AI folk are asked
  function walkUp(f) {
    const ms = f.order.map(body).filter(q => q && q.alive && conscious(q)); if (!ms.length) return;
    f.nudged ||= new Set();
    for (const q of living()) {
      if (q.kind !== 'human' || q.brain === 'human' || q.town || f.sides.has(q.id) || f.nudged.has(q.id) || q.fight || !conscious(q) || q.jailedUntil > 0) continue;
      if (!ms.some(m => dist2(m, q) < 25 && sees(q, m))) continue;
      f.nudged.add(q.id);
      if (waitsForOrders(q)) { if (helpChoices(q).length || isGuard(q) || ms.some(m => m.monster)) askOrders(q, `A fight near you at ${AREAS[areaOf(ms[0])]?.name || 'here'}: ${ms.map(m => m.id === 'player' ? 'Rose' : m.name).join(', ')}. You could step in ("help <name>" or "attack <name>"), shout for the guard, or keep out of it.`); continue; }
      if (['flee', 'rescue', 'arrest', 'muster', 'fetchguard'].includes(q.task?.kind)) continue;
      q.task = null;
    }
  }
  function healUp(q, h) { q.hp = Math.min(q.maxhp, q.hp + h); if (q.hp > 0) { q.dying = false; q.disabled = false; q.stable = false; if (q.down) { q.down = null; q.downUntil = 0; } } else if (q.dying) { q.dying = false; q.stable = true; q.down = 'out'; q.downUntil = sim.t + 60; } else if (q.hp === 0 && q.kind === 'human' && q.down === 'dying') { q.down = null; q.disabled = true; } }
  function castTurn(f, p, foes) {
    if (p.heldBy || p.holding) return false;   // no casting in a hold
    const side = f.sides.get(p.id), mates = f.order.map(body).filter(q => q && q.kind === 'human' && q.alive && f.sides.get(q.id) === side);
    const hurtMate = mates.filter(q => q.dying || q.hp / q.maxhp < 0.5).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0];
    if (hurtMate && p.cures > 0 && (hurtMate === p || dist2(hurtMate, p) <= 2.1)) { p.cures--; const h = d(8) + Math.min(5, clvl(p, 'cleric') + clvl(p, 'druid')); healUp(hurtMate, h); logF(f, `${p.name} casts cure light wounds on ${hurtMate === p ? 'themself' : hurtMate.name}: +${h} hp. ${status(hurtMate)}`); return true; }
    if (hurtMate && p.layPool > 0 && (hurtMate === p || dist2(hurtMate, p) < 2.5)) { const h = Math.min(p.layPool, hurtMate.maxhp - hurtMate.hp); if (h > 0) { p.layPool -= h; healUp(hurtMate, h); logF(f, `${p.name} lays hands on ${hurtMate === p ? 'themself' : hurtMate.name}: +${h} hp.`); return true; } }
    if ((p.missiles > 0 || p.rays > 0) && foes.length) {
      const t = foes.filter(q => dist2(q, p) < 30 && (q.monster || f.mode.get(p.id) === 'lethal')).sort((a, b) => (b.monster ? 1 : 0) - (a.monster ? 1 : 0) || dist2(a, p) - dist2(b, p))[0]; if (!t) return false;
      const cl = clvl(p, 'sorcerer') + clvl(p, 'wizard');
      if (p.rays > 0 && (t.monster || t.hp > 12)) {
        p.rays--; const touch = t.kind === 'animal' ? 10 + Math.floor((t.ac - 10) / 3) : 10 + Math.max(0, mod(t.st.dex)), r = d(20) + babOf(p) + mod(p.st.dex);
        if (r !== 20 && r < touch) { logF(f, `${p.name}'s scorching ray misses ${t.name} (${r} vs touch AC ${touch}).`); return true; }
        const dmg = roll(4, 6); t.burnedRound = f.round; hurt(t, dmg, false, p); logF(f, `${p.name}'s scorching ray burns ${t.name} for ${dmg} fire${t.regen ? ' (it stops healing)' : ''}. ${status(t)}`); return true;
      }
      if (p.missiles > 0) { p.missiles--; const n = Math.min(3, 1 + Math.floor((cl - 1) / 2)); let dmg = 0; for (let i = 0; i < n; i++) dmg += d(4) + 1; hurt(t, dmg, false, p); logF(f, `${p.name} casts magic missile at ${t.name}: ${n} missile${n > 1 ? 's' : ''} for ${dmg}. ${status(t)}`); return true; }
    }
    return false;
  }
  function npcTurn(f, p) {
    const acts = legalActions(f, p), mode = f.mode.get(p.id), foes = foesOf(f, p), tr = p.traits || { aggression: 0.7, greed: 0, honesty: 1, caution: 0.2 };
    const hpFrac = p.kind === 'animal' ? p.hp / p.maxhp : (p.hp - p.nl) / p.maxhp;
    if (p.kind === 'animal' && (p.livestock || p.game && (GAME[p.species].flees || hpFrac < 0.3) || !p.monster && !p.owner && hpFrac < 0.5)) { const run = acts.find(a => a.id === 'run') || acts.find(a => a.id === 'withdraw'); if (run && !p.flatfooted) return act(f, p, run); }
    if (p.monster) { const c = acts.find(a => a.id === 'coup'); if (c && Math.random() < 0.5) return act(f, p, c); }   // a beast often finishes the fallen first
    if (lohSmart(f, p, acts, hpFrac, tr)) return;
    if (p.kind === 'human') { const fb = acts.filter(a => a.id === 'firebomb').map(a => [a, body(a.target)]).find(([, t]) => t.regen || (t.monster && t.hp > 20)); if (fb) return act(f, p, fb[0]); }   // fire for what knits
    const fs = p.fightStyle;
    if (p.kind === 'human' && fs && fs.fleeBelow != null) { if (hpFrac < fs.fleeBelow) { const run = acts.find(a => a.id === 'withdraw') || acts.find(a => a.id === 'run'); if (run) return act(f, p, run); } }
    else if (p.kind === 'human' && hpFrac < 0.35 && tr.caution > 0.3) { const run = acts.find(a => a.id === 'withdraw') || acts.find(a => a.id === 'run'); if (run) return act(f, p, run); }
    if (p.kind === 'human' && (fs?.surrender ?? true) && hpFrac < 0.2 && foes.length && power(foes[0]) > power(p) * 1.5) return act(f, p, { id: 'surrender' });
    const coup = acts.find(a => a.id === 'coup');
    if (coup && p.kind === 'human') { const t = body(coup.target), motive = (p.grudge?.[t.id] || 0) > 6 || [...(t.knows || [])].some(id => sim.events.find(e => e.id === id && e.actor === p.id && (CRIMES[e.type] || 0) >= 4)) || tr.aggression > 0.92; if (motive && (mode === 'lethal' || tr.aggression > 0.8)) return act(f, p, coup); }
    const rob = acts.find(a => a.id === 'rob' && body(a.target).coin > 0);
    if (rob && tr.greed > 0.6 && tr.honesty < 0.5) return act(f, p, rob);
    if (p.kind === 'human' && !p.shoutedIn?.[f.id] && acts.some(a => a.id === 'shout') && (p.fightStyle?.shout ?? (Math.random() < 0.3 + tr.caution * 0.5 - tr.aggression * 0.3)) && (f.why !== 'arrest' && f.why !== 'resisting arrest') && !isGuard(p) && hpFrac < 0.9) { (p.shoutedIn ||= {})[f.id] = 1; act(f, p, acts.find(a => a.id === 'shout')); }
    if (p.kind === 'human' && classTurn(f, p, acts, foes)) return;
    if (p.kind === 'human' && sim.fightMode === 'net' && sim.fightNet && p.brain === 'script' && netTurn(f, p, acts, foes)) return;
    if (p.kind === 'human' && castTurn(f, p, foes)) { lohSaw(f, p, 'cast'); return; }
    const rl = acts.find(a => a.id === 'reload'); if (rl && !acts.some(a => a.id === 'attack')) return act(f, p, rl);
    const atk = acts.filter(a => a.id === 'attack').sort((x, y) => (body(x.target).hp - body(x.target).nl) - (body(y.target).hp - body(y.target).nl))[0];
    if (atk && p.kind === 'human') { const m = pickManeuver(f, p, acts, body(atk.target)); if (m) return act(f, p, m); }
    if (atk) { if (p.turnLeft.move && Math.random() < 0.15 && acts.find(a => a.id === 'demoralize')) act(f, p, acts.find(a => a.id === 'demoralize' && a.target === atk.target) || atk); return act(f, p, atk); }
    { const th = acts.find(a => a.id === 'throw'); if (th && (WEAPONS[p.weapon]?.weak || WEAPONS[p.weapon]?.range) && dist2(body(th.target), p) > 2.1 && (tr.caution > 0.4 || threatens(body(th.target)) && !fistArmed(p))) return act(f, p, th); }   // the unarmed keep their distance and throw
    const charge = acts.find(a => a.id === 'charge'); if (charge && p.kind === 'human' && tr.aggression > 0.4) return act(f, p, charge);
    const mv = acts.find(a => a.id === 'move'); if (mv) { act(f, p, mv); const atk2 = legalActions(f, p).find(a => a.id === 'attack'); if (atk2) act(f, p, atk2); return; }
    act(f, p, { id: 'end' });
  }
  // advance a fight by one turn; the player's turns wait for input
  sim.fightStep = f => {
    if (!f.order.length) return endFight(f);
    if (f.turn >= f.order.length) { f.turn = 0; f.round++; bleed(f); walkUp(f); classRound(f); }
    const p = body(f.order[f.turn]);
    if (!p || !p.alive || !conscious(p) || p.surrendered || (p.fled || 0) >= 2 || foesOf(f, p).every(q => dist2(q, p) > 30)) { f.turn++; return checkEnd(f); }
    if (!p.turnLeft || p.turnRound !== f.round) { p.turnLeft = { standard: 1, move: 1, swift: 1, step: 1 }; p.turnRound = f.round; p.defending = false; p.charged = false; if (f.round > 1) p.flatfooted = false; p.lostTurn = classTurnStart(f, p); }
    if (p.lostTurn) { p.lostTurn = false; f.turn++; p.turnLeft = null; return checkEnd(f); }
    lohStart(f, p);
    if (p.brain === 'human') { f.waiting = p.id; return 'player'; }
    if (p.brain !== 'script' && p.brain !== 'human' && p.kind === 'human') { /* AI people fight with the same script; their AI chose to be here */ }
    npcTurn(f, p);
    lohEnd(f, p);
    f.turn++; p.turnLeft = null;
    return checkEnd(f);
  };
  sim.playerDone = f => { const p = body(f.waiting); f.waiting = null; if (p) { lohEnd(f, p); p.turnLeft = null; } f.turn++; checkEnd(f); };
  function bleed(f) { for (const id of f.order) { const q = body(id); if (q && q.alive && q.onFire && q.onFire <= f.round) { const n = roll(1, 6); q.onFire = 0; q.burnedRound = f.round; hurt(q, n, false, body(q.burnBy)); logF(f, `${q.name} burns for ${n} more.`); } if (q && q.alive && q.regen && q.hp > 0 && q.hp < q.maxhp && !(q.burnedRound >= f.round - 1)) q.hp = Math.min(q.maxhp, q.hp + q.regen); if (q && q.alive && q.dying) { if (srdOn() ? globalThis.SRD.bleedOf(q.hp, d(100)).stable : d(10) === 1) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 240; logF(f, `${q.name} stabilizes.`); } else { q.hp--; if (q.hp <= -10) die(q, body(q.lastHurtBy), 'bled out'); } } } }
  function checkEnd(f) {
    const sides = new Set(f.order.map(body).filter(q => q && q.alive && conscious(q) && !q.surrendered && (q.fled || 0) < 2 && (q.kind === 'human' || q.temper !== 'passive')).map(q => f.sides.get(q.id)));
    if (f.order.map(body).some(q => q?.game && q.alive && (q.fled || 0) >= 2)) { for (const q of f.order.map(body)) if (q?.game && q.alive && (q.fled || 0) >= 2) { log('fight', `The ${q.species} gets away.`, []); q.fled = 0; } }
    if (sides.size <= 1 || f.round > 30) return endFight(f, [...sides][0]);
  }
  function endFight(f, winnerSide) {
    if (f.ended) return; f.ended = true;
    sim.fights = sim.fights.filter(x => x !== f);
    if (f.coup) {   // who holds the gang after a coup
      const g = sim.gangs[f.coup.gang], by = sim.people[f.coup.by], boss = sim.people[f.coup.boss];
      if (g) {
        const challengerWon = by && by.alive && f.sides.get(by.id) === winnerSide;
        if (challengerWon && boss?.alive && g.boss === boss.id) { g.boss = by.id; g.underboss = null; log('gang', `${fullName(by)} beats ${boss.name} and takes ${g.name}.`, [by.id, boss.id]); if (boss.traits.loyalty < 0.5 || R(boss, by).like < -0.3) { boss.gang = null; log('gang', `${boss.name} walks away from the crew.`, [boss.id]); } }
        else if (!challengerWon && by?.alive) { by.gang = null; log('gang', `${by.name}'s grab for ${g.name} fails; they're out of the crew.`, [by.id]); for (const q of gangMembers(g.id)) if (q.coupSide?.[g.id] === by.id) { bump(boss, q, 'like', -0.5); bump(boss, q, 'trust', -0.5); } }
        g.coupBy = null;
        for (const q of gangMembers(g.id)) if (q.coupSide) delete q.coupSide[g.id];
      }
    }
    lohFightEnd(f, winnerSide);
    const winners = f.order.map(body).filter(q => q && q.alive && f.sides.get(q.id) === winnerSide && conscious(q));
    const fought = new Set(f.order);
    const losers = f.order.map(body).filter(q => q && q.alive && f.sides.get(q.id) !== winnerSide);
    { const hw = winners.filter(q => q.kind === 'human'), hl = losers.filter(q => q.kind === 'human'); if (hw.length && hl.length) { const total = 100 * hl.reduce((t, q) => t + (q.level || 1), 0); for (const q of hw) gainXP(q, Math.floor(total / hw.length), 'a fight'); for (const q of hl) gainXP(q, 25, 'a beating'); } }
    for (const id of f.order) { const q = body(id); if (!q) continue; q.fight = null; q.state = 'idle'; q.surrendered = false; q.fled = 0; q.defending = false; q.foes = null; q.task = null; }
    log('fight', `The fight ${winners.length ? 'ends: ' + winners.map(w => w.name).join(', ') + ' stand' + (winners.length === 1 ? 's' : '') : 'breaks up'}.`, f.order);
    // a guard who wins with nonlethal blows takes the losers to jail
    const g = winners.find(w => w.kind === 'human' && isGuard(w));
    if (g) for (const q of losers) if (q.kind === 'human' && q.alive && fought.has(q.id) && !isGuard(q)) { const r = q.record.find(x => !x.served) || null; const lawful = f.why === 'arrest' || f.why === 'resisting arrest' || f.by === q.id || f.coup == null && f.sides.get(f.by) !== winnerSide; if ((r || q.lastHurtBy && sim.people[q.lastHurtBy] && f.sides.get(q.lastHurtBy) === winnerSide) && lawful) { if (!r) q.record.push({ ev: 'fight-' + f.id, type: 'assault', victim: g.id, by: [g.id], day: sim.day, served: false, evidence: true }); setTask(g, 'haul', { target: q.id, until: sim.t + 240 }); break; } }
    // a bounty hunter who won drags the beaten to the cells (jail() pays them)
    for (const w of winners) if (w.kind === 'human' && w.huntFor && !isGuard(w)) { const q = losers.find(x => x.id === w.huntFor && x.alive); w.huntFor = null; if (q && sim.bounty[q.id]) setTask(w, 'haul', { target: q.id, until: sim.t + 240 }); }
    // winners choose what to do with the beaten: rob them, or leave them
    for (const w of winners) if (w.kind === 'human') w.stats.wins = (w.stats.wins || 0) + 1;
    for (const w of winners) if (w.kind === 'human' && !isGuard(w) && w.brain !== 'human') for (const q of losers) if (q.kind === 'human' && q.alive && !conscious(q) && w.traits.honesty < 0.5) {
      const n = q.coin, cargo = Object.entries(q.items).filter(([k, c]) => c > 0 && (MARROW.sells[k] || MARROW.buys[k] || GOODS[k]?.food));
      if (!n && !cargo.length) continue;
      pay(q, w, n); for (const [k, c] of cargo) { w.items[k] = (w.items[k] || 0) + c; q.items[k] = 0; }
      w.stats.stolen += n; deed('theft', w, q, q, { victimKnows: false, road: areaOf(q) === 'road' });
      log('crime', `${w.name} robs the beaten ${q.name} (${money(n)}${cargo.length ? ', ' + cargo.map(([k, c]) => c + ' ' + k).join(', ') : ''}).`, [w.id, q.id]);
    }
    if (sim.onFightEnd) sim.onFightEnd(f, winners, losers);
  }
  sim.endFight = endFight;

  // ============================================================ the town ==
  // salaries, rent, taxes, the cart, newcomers and leavers, elections
  function dailyTick() {
    // word of the day's deaths reaches everyone by morning
    for (const n of (sim.deathNews || []).splice(0)) for (const q of living()) if (q.kind === 'human' && q.alive && !q.memory.some(m => m.death === n.id)) remember(q, { text: 'News: ' + n.text, big: true, death: n.id });
    diseaseDay();
    sim.day++;
    // taxes on sales, collected by the town
    for (const b of Object.values(sim.business)) { const owner = sim.people[b.owner]; if (owner && owner.alive && b.owed >= 1) { const n = pay(owner, 'town', Math.floor(b.owed), 'tax'); b.owed -= n; } b.sales = 0; }
    // rent: a copper per adult per day, from pocket or stash
    for (const p of living()) {
      if (p.home == null || p.jailedUntil > 0 || p.brain === 'human' || p.town) continue;
      const due = sim.rent + (p.job !== 'none' ? sim.headTax : 0);
      if (p.coin >= due) pay(p, 'town', due, 'rent+head'); else if (HOUSES[p.home].stash >= due) { HOUSES[p.home].stash -= due; sim.treasury += due; sim.flow.in['rent+head'] = (sim.flow.in['rent+head'] || 0) + due; } else if (due > 0) { for (const q of living()) if (q.heardBoast?.[p.id] && Math.random() < 0.5) { glimpse(q, p, 5, 0.5); bump(q, p, 'trust', -0.2); delete q.heardBoast[p.id]; } p.unpaid = (p.unpaid || 0) + 1; if (p.unpaid >= 3) { log('life', `${fullName(p)} is evicted for unpaid rent.`, [p.id]); p.home = null; p.unpaid = 0; } }
    }
    for (const pl of sim.plots) if (pl.crop && sim.t > pl.planted + (CROPS[pl.crop].days + 2) * 1440) { log('trade', `A plot of ${pl.crop} rots in the field, unharvested.`); pl.crop = null; }
    for (const pl of sim.plots) if (pl.crop) pl.tended = Math.max(0, pl.tended - 0.1);
    for (const sp of Object.keys(GAME)) {
      const n = Object.values(sim.animals).filter(a => a.species === sp && a.alive).length;
      let born = 0; for (let i = 0; i < Math.floor(n / 2); i++) if (Math.random() < GAME[sp].breed) born++;
      if (n === 0 && Math.random() < 0.3) born = 1;    // a stray wanders in from the deep wood
      for (let i = 0; i < Math.min(born, GAME[sp].cap - n); i++) spawnGame(sp);
    }
    { const rb = sim.business.ranch, worked = rb.worked || 0; rb.worked = 0;
      for (const sp of Object.keys(STOCK)) {
        const herd = Object.values(sim.animals).filter(a => a.species === sp && a.alive && a.livestock), g = STOCK[sp];
        // untended animals give less (nobody milks the cows, eggs go missing)
        if (g.give) rb.stock[g.give[0]] = Math.min(60, (rb.stock[g.give[0]] || 0) + Math.round(herd.length * g.give[1] * (worked > 120 ? 1 : 0.3)));
        let born = 0; for (let i = 0; i < Math.floor(herd.length / 2); i++) if (Math.random() < g.breed) born++;
        for (let i = 0; i < Math.min(born, g.cap - herd.length); i++) spawnStock(sp, rb.owner);
      } }
    sim.commons.apple = Math.min(60, sim.commons.apple + 14); sim.commons.berries = Math.min(40, sim.commons.berries + 10); sim.fish = Math.min(40, sim.fish + 6);
    // owners price by supply: scarce goes up, a glut comes down
    for (const b of Object.values(sim.business)) { const owner = sim.people[b.owner]; if (!owner || !owner.alive || owner.brain !== 'script') continue; for (const k of Object.keys(b.stock)) { const n = b.stock[k] || 0, m = b.mult[k] ?? 1; b.mult[k] = +(n < 3 ? Math.min(4, m * (1.15 + owner.traits.greed * 0.15)) : n > 12 ? Math.max(0.5, m * 0.9) : m).toFixed(2); } }
    // leases: owners pay the town; three days unpaid and the business goes back
    if (sim.blank) for (const b of Object.values(sim.business)) { const o = sim.people[b.owner]; if (!o) continue; if (!o.alive || JOBS[o.job]?.owner !== b.id) { b.owner = null; continue; } const n = LEASE[b.id] || 20; if (pay(o, 'town', n, 'lease') >= n) b.leaseOwed = 0; else if (++b.leaseOwed >= 3) { o.job = 'none'; b.owner = null; log('trade', `${o.name} can't pay the lease and loses ${/^the /i.test(AREAS[b.id]?.name || '') ? '' : 'the '}${AREAS[b.id]?.name || b.id}.`, [o.id]); } }
    // the trader's cart: buys surplus food (money in), sells a little grain dear (money out), restocks tools and goods
    const farm = sim.business.farm, farmer = sim.people[farm.owner];
    if (farmer && farmer.alive) for (const k of ['turnip', 'grain', 'barley']) { const n = Math.max(0, (farm.stock[k] || 0) - 15); if (n) { farm.stock[k] -= n; farmer.coin += n * 2; log('trade', `The cart buys ${n} surplus ${k} (+${money(n * 2)}).`); } }
    for (const [k, n] of Object.entries({ grain: 60, turnip: 60, barley: 30, meat: 15 })) sim.market.stock[k] = Math.min(n, (sim.market.stock[k] || 0) + Math.ceil(n / 4));
    for (const k of Object.keys(sim.market.moved)) sim.market.moved[k] = Math.round(sim.market.moved[k] * 0.5);
    for (const [bid, base] of Object.entries({ store: { rope: 3, torch: 6, treats: 6, ball: 2, plank: 6, picks: 1 }, smithy: { iron: 16 } })) {
      const b = sim.business[bid], owner = sim.people[b.owner]; if (!owner || !owner.alive) continue;
      let spent = 0; for (const [k, n] of Object.entries(base)) { const need = Math.max(0, n - (b.stock[k] || 0)), cost = Math.ceil(need * GOODS[k].price * 0.45); if (need && owner.coin >= cost) { b.stock[k] = n; owner.coin -= cost; spent += cost; } }
    }
    { const b = sim.business.apothecary, al = b && sim.people[b.owner];
      if (al && al.alive) { let made = 0; for (const [k, n] of Object.entries({ healkit: 3, alchfire: 4, cure: 2 })) while ((b.stock[k] || 0) < n && al.coin + (al.home != null ? HOUSES[al.home].stash : 0) >= Math.ceil(GOODS[k].price / 3)) { const c = Math.ceil(GOODS[k].price / 3), a = Math.min(al.coin, c); al.coin -= a; if (c > a) HOUSES[al.home].stash -= c - a; b.stock[k] = (b.stock[k] || 0) + 1; made++; } if (made) log('trade', `${al.name} brews at the Apothecary (${made} made).`, [al.id]); } }
    deliverOrders();
    scriptDiscounts();
    poolsDaily();
    // nonlethal heals; injuries mend a little each day
    for (const b of (sim.brews || []).filter(b => sim.t >= b.ready)) sim.business.tavern.stock.ale = (sim.business.tavern.stock.ale || 0) + b.ale;
    sim.brews = (sim.brews || []).filter(b => sim.t < b.ready);
    for (const p of living()) { if (!p.dying) p.hp = Math.min(p.maxhp, p.hp + (p.nl || 0)); p.nl = 0; }
    // people who can't make a life here leave; newcomers arrive
    for (const p of living()) if (p.brain !== 'human' && p.coin <= 0 && (p.home == null ? 1 : HOUSES[p.home].stash) <= 0 && p.job === 'none' && p.food < 0.2 && Math.random() < 0.4 && p.id !== sim.mayorId) { p.alive = false; p.left = true; p.state = 'left'; sim.rec.leavers++; log('life', `${fullName(p)} gives up on Hollow Town and leaves.`, [p.id]); }
    const pop = living().filter(p => p.brain !== 'human' && p.town !== 'marrow').length;
    if (pop < 30 && Math.random() < 0.6) newcomers(Math.min(5, 30 - pop));
    // elections every seventh day
    if (isElectionDay(sim.day) || !sim.mayorId && sim.day >= 2) sim.election.due = true;
    // (beasts now come every night around 22:00, see the step loop)
    { const left = nextElectionDay(false) - sim.day; const n = [...new Set([...(sim.mayorId ? [sim.mayorId] : []), ...sim.election.candidates])].length; if (left <= 3) log('politics', left === 0 ? `Election day. ${n} on the ballot; the vote is at noon.` : `${left} day${left > 1 ? 's' : ''} to the election. ${n} on the ballot.`); }
    sim.history.push(snapshot());
    if (sim.onChronicle) {
      const hs = sim.history, a = hs[hs.length - 2] || hs[0], b = hs[hs.length - 1], day = sim.lore.acts;
      const ppl = living().filter(q => q.kind === 'human' && !q.town && q.id !== 'player');
      const best = [], worst = [];
      for (const [k, row] of Object.entries(day)) for (const [kind, c] of Object.entries(row)) if (c.n >= 15) (c.r > 0 ? best : worst).push([k + ' -> ' + kind, c.r, c.n]);
      best.sort((x, y) => y[1] - x[1]); worst.sort((x, y) => x[1] - y[1]);
      const deaths = sim.log.filter(e => e.kind === 'death' && e.day === sim.day - 1 && / dies/.test(e.text)).map(e => e.text);
      const text = [`## Day ${sim.day - 1}`,
        `People ${b.pop} · deaths so far ${b.deaths} · crimes so far ${b.crimes} · treasury ${money(b.treasury)} · coin in town ${money(b.total)} · inequality ${b.gini} · gangs ${b.gangs}`,
        `Hungry now: ${ppl.filter(q => q.food < 0.2).length} · thirsty: ${ppl.filter(q => (q.water ?? 1) < 0.2).length} · jailed: ${ppl.filter(q => q.jailedUntil > 0).length} · jobless: ${ppl.filter(q => q.job === 'none').length}`,
        `Food in shops: bakery ${JSON.stringify(sim.business.bakery.stock)} · store ${JSON.stringify(Object.fromEntries(Object.entries(sim.business.store.stock).filter(([k]) => GOODS[k]?.food)))} · farm ${JSON.stringify(sim.business.farm.stock)} · commons ${JSON.stringify(sim.commons)} · fish ${sim.fish} · game ${Object.values(sim.animals).filter(x => x.game && x.alive).length}`,
        `Ranks: ${['gentry', 'freeholder', 'commoner', 'lowborn'].map(r => r + ' ' + ppl.filter(q => rankOf(q) === r).length).join(', ')} · richest: ${ppl.slice().sort((x, y) => trueWorth(y) - trueWorth(x)).slice(0, 3).map(q => `${q.name} (${JOBS[q.job].title}, ~${money(trueWorth(q) * 10)})`).join(', ')}`,
        deaths.length ? `Deaths: ${deaths.join(' ')}` : '',
        `Choices that paid best (situation -> choice, avg change in worth, times): ${best.slice(0, 5).map(x => `${x[0]} ${x[1].toFixed(1)} x${x[2]}`).join('; ') || 'not enough yet'}`,
        `Choices that hurt most: ${worst.slice(0, 5).map(x => `${x[0]} ${x[1].toFixed(1)} x${x[2]}`).join('; ') || 'not enough yet'}`,
        `Town mind: ${JSON.stringify(sim.loreSize())}, phrases learned ${sim.lore.phrasesLearned || 0}. Pets: ${Object.values(sim.animals).filter(x => x.alive && x.owner && !x.livestock).map(x => `${x.name} ${x.knowsName ? 'knows its name' : 'no name yet'}; words: ${Object.entries(x.words || {}).filter(([, e]) => e.heard >= 3 && (e.food / e.heard > 0.4 || e.fight / e.heard > 0.3)).map(([w, e]) => w + (e.food / e.heard > 0.4 ? '=food' : '=fight')).join(', ') || 'none'}`).join(' · ')}`,
      ].filter(Boolean).join('\n');
      sim.onChronicle(text, (sim.dataRows || []).splice(0));
    }
    if (sim.onDay) sim.onDay(sim.day);
  }
  function newcomers(n) {
    const size = Math.min(n, irnd(1, 5)), surname = pick(SURNAMES);
    const freeHouse = HOUSES.findIndex((h, i) => living().filter(p => p.home === i).length === 0);
    const people = [];
    for (let i = 0; i < size; i++) {
      const p = makePerson(sim, { gender: pick(['m', 'f']), surname, cls: pick(['commoner', 'commoner', 'expert', 'warrior', 'rogue']), coin: irnd(50, 250), job: 'none', home: null });
      sim.people[p.id] = p; sim.peopleAdded = (sim.peopleAdded || 0) + 1; place(p, P(-63, rnd(-3, 3))); people.push(p); if (sim.begun) { firstClassFor(p); clergyGift(p); }
      for (const q of living()) if (q !== p) { q.rel[p.id] = { like: rnd(-0.2, 0.15), trust: 0.1, fear: 0, court: 0 }; p.rel[q.id] = { like: rnd(-0.1, 0.2), trust: 0.15, fear: 0, court: 0 }; }
    }
    for (const a of people) for (const b of people) if (a !== b) { R(a, b).like = 0.7; R(a, b).trust = 0.8; }
    if (people.length >= 2 && attracted(people[0], people[1]) > 0.5) marry(people[0], people[1], true);
    sim.rec.newcomers += people.length;
    log('life', `${people.length === 1 ? 'A newcomer' : 'The ' + surname + ' family (' + people.length + ')'} arrives in Hollow Town, with nowhere to live yet.`, people.map(p => p.id));
  }
  function payWages(h) {   // paid by the hour (Rose): every hour on the job earns its share of the shift's wage, paid out in whole coppers as it adds up
    for (const p of living()) {
      const j = JOBS[p.job]; if (!j || !j.wage && !j.payer || p.jailedUntil > 0) continue;
      const mins = Math.min(60, p.worked || 0); p.worked = 0; if (mins <= 0) continue;
      const len = ((j.to - j.from) + 24) % 24 || 24;
      const wage = j.payer === 'town' ? (sim.wages[p.job] ?? j.wage) : j.wage;
      p.wageAcc = (p.wageAcc || 0) + wage * mins / (len * 60);
      const n = Math.floor(p.wageAcc + 1e-9); if (n < 1) continue;
      const payer = j.payer === 'town' ? 'town' : sim.people[sim.business[j.payer]?.owner];
      const got = pay(payer && (payer === 'town' || payer.alive) ? payer : null, p, n, 'wage:' + p.job);
      p.wageAcc -= got;
      { const lg = p.home != null && HOUSES[p.home].lodgers?.[p.id], o = lg && lg.work && sim.people[lg.by]; if (o && o.alive && got > 0) pay(p, o, got, 'lodging'); }
      if (got < n) { p.wageAcc = 0; p.unpaidWages = (p.unpaidWages || 0) + 1; bump(p, j.payer === 'town' ? (sim.mayorId || p.id) : payer?.id || p.id, 'like', -0.15); }
    }
  }
  function runElection() {
    sim.election.due = false;
    const cands = [...new Set([...(sim.mayorId ? [sim.mayorId] : []), ...sim.election.candidates])].map(id => sim.people[id]).filter(p => p && p.alive && p.jailedUntil <= 0);
    if (!cands.length) { sim.election.candidates = []; return; }
    const tally = Object.fromEntries(cands.map(c => [c.id, 0]));
    const crimeLately = sim.events.filter(e => sim.t - e.t < 7 * 1440).length;
    for (const v of living()) {
      if (v.brain === 'human' || v.jailedUntil > 0 || v.town === 'marrow') continue;
      let best = null, bs = -99;
      for (const c of cands) {
        let s = R(v, c).like * 3 + R(v, c).trust + Math.min(2, seen(v, c).worth / 60) * (1 - v.traits.honesty * 0.5) + (v.voteBribes?.[c.id] || 0) * v.traits.greed * 0.04 + (c.gang && v.gang === c.gang ? 3 : 0) + (v.spouse === c.id ? 5 : 0) + (v === c ? 10 : 0);
        if (c.id === sim.mayorId) s += (v.unpaidWages ? -1.5 : 0.5) - crimeLately * 0.02 + (sim.taxRate < 0.12 ? 0.5 : -0.5);
        if (v.gang) { const boss = sim.people[sim.gangs[v.gang]?.boss]; if (boss && boss.voteFor === c.id) s += 2 * v.traits.loyalty; }
        if (v.voteFor === c.id) s += 6;
        if (c.platform && v.heardPlatform?.[c.id]) s += 0.8;
        s += rnd(-0.5, 0.5);
        if (s > bs) { bs = s; best = c; }
      }
      tally[best.id]++;
      v.voteBribes = null; v.voteFor = null; v.heardPlatform = null;
    }
    const ranked = cands.slice().sort((a, b) => tally[b.id] - tally[a.id]);
    const winner = ranked[0], old = sim.people[sim.mayorId];
    sim.election = { candidates: [], last: { day: sim.day, tally: Object.fromEntries(cands.map(c => [c.name, tally[c.id]])), winner: winner.id } };
    log('politics', `Election: ${cands.map(c => `${c.name} ${tally[c.id]}`).join(', ')}. ${fullName(winner)} ${winner === old ? 'keeps the office' : 'is the new mayor'}.`, cands.map(c => c.id));
    (sim.genLog ||= []).push({ t: 'vote', day: sim.day, tax: sim.taxRate, rent: sim.rent, kept: winner === old, tally: cands.map(c => `${c === old ? 'the mayor' : 'a challenger'} ${tally[c.id]}`).join(' to ') });
    if (winner !== old) {
      if (old && old.alive) { old.job = 'none'; log('politics', `${fullName(old)} is a private citizen again.`, [old.id]); }
      winner.job = 'mayor'; sim.mayorId = winner.id;
      if (winner.brain === 'script') winner.brain = 'script';
    }
  }
  function snapshot() {
    const ppl = living().filter(p => p.kind === 'human' && p.town !== 'marrow');
    const wealth = ppl.map(p => p.coin + (p.home != null ? HOUSES[p.home].stash / Math.max(1, household(p).length) : 0)).sort((a, b) => a - b);
    const n = wealth.length, total = wealth.reduce((a, b) => a + b, 0);
    const gini = n && total ? wealth.reduce((s, w, i) => s + (2 * (i + 1) - n - 1) * w, 0) / (n * total) : 0;
    return { day: sim.day, pop: n, treasury: sim.treasury, total: Math.round(total), gini: +gini.toFixed(3), gangs: Object.keys(sim.gangs).length, deaths: sim.rec.deaths, crimes: sim.rec.crimes, jailed: ppl.filter(p => p.jailedUntil > 0).length, mayor: sim.people[sim.mayorId]?.name || '(none)' };
  }
  sim.snapshot = snapshot;

  // the mayor's office: what an AI (or the fallback) may decide each morning
  sim.mayorPowers = () => ({
    tax: sim.taxRate, wages: { ...sim.wages }, treasury: sim.treasury, bounty: { ...sim.bounty }, curfew: sim.curfew, bail: sim.bail, captain: sim.captainId,
  });
  // ---- the mayor's orders to the guard -------------------------------------------
  function guardsFor(sel) { const gs = living().filter(q => isGuard(q) && q.jailedUntil <= 0 && conscious(q)); if (sel === 'all') return gs; if (sel === 'captain') return gs.filter(q => q.id === sim.captainId); return gs.filter(q => q.id === sel); }
  function orderGuards(m, orders) {
    const out = [];
    for (const o of (Array.isArray(orders) ? orders : []).slice(0, 6)) {
      const words = String(o?.do || '').toLowerCase().trim(), verb = words.split(/\s+/)[0], rest = words.slice(verb.length).trim();
      const gs = guardsFor(o?.guard || 'all'); if (!gs.length) { out.push(`no guard to take "${words}"`); continue; }
      if (verb === 'arrest') {
        const t = sim.people[rest] || findPerson(m, rest); if (!t || !t.alive || t === m) continue;
        const just = openRecord(t).some(r => !r.warrant);
        t.record.push({ ev: 'w' + (++sim.rec.crimes), type: 'warrant', victim: null, by: [m.id], day: sim.day, served: false, evidence: true, warrant: true });
        const g = gs.filter(q => q !== t).sort((a, b) => dist2(a, t) - dist2(b, t))[0]; if (!g) continue;
        const refuses = !just && (g.traits.honesty > 0.85 && R(g, m).like < 0.3 || g.gang && g.gang === t.gang || g.persona && /detests crime|never kneel to the corrupt/i.test(g.persona) && !just && g.traits.honesty > 0.6);
        if (refuses) { log('law', `${g.name} refuses the mayor's order to arrest ${t.name}: "Not without cause."`, [g.id, m.id, t.id]); bump(m, g, 'like', -0.3); remember(g, { text: `refused the mayor's order to arrest ${t.name} without cause` }); out.push(`${g.name} refused`); continue; }
        setTask(g, 'arrest', { target: t.id, until: sim.t + 240, ordered: true }); log('law', `On the mayor's warrant, ${g.name} goes to arrest ${t.id === 'player' ? 'Rose' : t.name}.`, [g.id, m.id, t.id]);
        if (!just) for (const w of living()) if (w.kind === 'human' && w !== t && w !== m && (sees(w, t) || R(w, t).like > 0.4)) { bump(w, m, 'trust', -0.05); remember(w, { text: `the mayor had ${t.name} arrested without cause` }); }
        out.push(`${g.name} to arrest ${t.name}`);
      } else if (verb === 'patrol' || verb === 'guard' || verb === 'watch') {
        const pl = findPlace(rest) || 'square'; for (const g of gs) { g.post = pl === 'home' ? 'square' : pl; g.postUntil = sim.t + 1440; } log('law', `${m.id === sim.mayorId ? 'The mayor' : 'Captain ' + m.name} posts ${gs.map(g => g.name).join(', ')} at ${AREAS[pl]?.name || pl}.`, [m.id]); out.push(`patrol ${pl}`);
      } else if (verb === 'go' || verb === 'respond' || verb === 'rush' || verb === 'run' || verb === 'goto') {
        const pl = findPlace(rest); if (!pl || !AREAS[pl]) { out.push(`no such place "${rest}"`); continue; }
        for (const g of gs) setTask(g, 'muster', { to: randIn(pl, 2), until: sim.t + 90, run: true }); log('law', `On the mayor's order ${gs.map(g => g.name).join(', ')} ${gs.length > 1 ? 'rush' : 'rushes'} to ${AREAS[pl].name}.`, [m.id]); out.push('rush to ' + pl);
      } else if (verb === 'escort' || verb === 'protect' || verb === 'follow') {
        for (const g of gs.slice(0, 2)) setTask(g, 'tail', { target: m.id, until: sim.t + 360 }); log('law', `${gs.slice(0, 2).map(g => g.name).join(' and ')} ${gs.length > 1 ? 'escort' : 'escorts'} the mayor.`, [m.id]); out.push('escort');
      } else if (verb === 'raid' || verb === 'search') {
        const bid = Object.keys(sim.business).find(b => rest.includes(b) || rest.includes((AREAS[b]?.name || '').toLowerCase())); const b = bid && sim.business[bid], owner = b && sim.people[b.owner];
        if (!b) continue; const fine = owner ? Math.min(owner.coin, irnd(40, 120)) : 0; if (owner && fine) pay(owner, 'town', fine, 'raid fine');
        const seized = Object.entries(b.stock).filter(([k, n]) => n > 0 && WEAPONS[k]).slice(0, 2); for (const [k] of seized) { b.stock[k]--; }
        log('law', `On the mayor's order the guard raids ${/^the /i.test(AREAS[bid]?.name || '') ? '' : 'the '}${AREAS[bid]?.name || bid}${fine ? `: ${owner.name} is fined ${money(fine)}` : ''}${seized.length ? ', weapons seized' : ''}.`, [m.id, owner?.id].filter(Boolean));
        if (owner) { bump(owner, m, 'like', -0.4); remember(owner, { text: `the mayor's guard raided my ${bid}` }); if (openRecord(owner).length) setTask(gs[0], 'arrest', { target: owner.id, until: sim.t + 240, ordered: true }); }
        for (const g of gs.slice(0, 2)) setTask(g, 'goto', { to: SPOTS[bid] || randIn(bid), until: sim.t + 90 }); out.push('raid ' + bid);
      } else if (verb === 'release' || verb === 'free') {
        const t = sim.people[rest] || findPerson(m, rest); if (t && t.jailedUntil > 0) { t.jailedUntil = sim.t; openRecord(t).forEach(r => r.served = true); log('law', `On the mayor's order, ${t.name} is let out of jail.`, [m.id, t.id]); out.push('release ' + t.name); }
      } else if (verb === 'stand') { for (const g of gs) { g.post = null; if (g.task?.ordered) g.task = null; } out.push('stand down'); }
    }
    return out;
  }
  sim.orderGuards = orderGuards;
  // ---- WAKING THE NEIGHBOURS, THE ALARM BELL, THE CAPTAIN'S AND THE BOSS'S ORDERS (Rose) ----------------------------
  SPOTS.bell = P(6, -9);   // the alarm bell, in the Market square
  sim.alarmOn = () => !!sim.alarm && sim.t <= sim.alarm.until;
  // wake one sleeper (beside them) or everyone asleep near you (the house beside, the lane)
  function wakeNear(p, t, r = 15, why) {
    const sleepers = (t ? [t] : living()).filter(q => q !== p && q.kind === 'human' && q.alive && q.state === 'sleep' && conscious(q) && (t || dist2(q, p) < r));
    for (const q of sleepers) { q.task = null; q.state = 'idle'; q.alert = true; remember(q, { text: `${p.name} woke me${why ? ': ' + why : ''} (${sim.clock()}).`, big: !!why }); }
    if (sleepers.length) log('life', `${p.name} wakes ${sleepers.map(q => q.name).join(', ')}${why ? ' (' + why + ')' : ''}.`, [p.id, ...sleepers.map(q => q.id)]);
    return sleepers.length ? `You wake ${sleepers.map(q => q.name).join(', ')}.` : 'Nobody near you is asleep.';
  }
  sim.wakeNear = wakeNear;
  const nearestBeast = at => Object.values(sim.animals).filter(a => a.monster && a.alive).sort((a, b) => dist2(a, at) - dist2(b, at))[0];
  // the bell: the whole town wakes; guards and militia run at the beast, the cautious near it get away, everyone remembers
  function ringAlarm(p) {
    if (dist2(p, SPOTS.bell) > 3) return 'The alarm bell hangs in the Market square.';
    if (sim.alarmOn()) { sim.alarm.until = sim.t + 60; return 'The bell is already ringing; you keep it going.'; }
    sim.alarm = { by: p.id, t: sim.t, until: sim.t + 60 };
    const beast = nearestBeast(SPOTS.square);
    log('law', `${p.name} rings the alarm bell in the Market square!${beast ? ` (${beast.name.toLowerCase()} at ${AREAS[areaOf(beast)]?.name || 'the edge of town'})` : ''}`, [p.id]);
    for (const q of living()) {
      if (q.kind !== 'human' || q.town || !q.alive || q === p) continue;
      if (q.state === 'sleep') { q.task = null; q.state = 'idle'; }
      remember(q, { text: `The alarm bell rang (${p.name}, ${sim.clock()})${beast ? ': ' + beast.name.toLowerCase() + ' at ' + (AREAS[areaOf(beast)]?.name || 'the edge of town') : ''}.`, big: true });
      if (!conscious(q) || q.fight || q.jailedUntil > 0 || q.brain === 'human' || waitsForOrders(q)) continue;
      if ((isGuard(q) || q.militia || deputyNow(q)) && beast) setTask(q, 'muster', { to: P(beast.x, beast.z), until: sim.t + 60, run: true });
      else if (beast && q.traits.caution > 0.5 && dist2(q, beast) < 40) setTask(q, 'flee', { from: P(beast.x, beast.z), until: sim.t + 30 });
      else if (q.task?.kind === 'sleep') q.task = null;
    }
    return 'You ring the alarm bell.';
  }
  sim.ringAlarm = ringAlarm;
  // plain folk who see a beast in town at night wake those asleep near them; guards and militia run to ring the bell
  // ---- THE ALARM SPELL (Rose): a 1st-level arcane ward, cast outside a fight from a wizard's or sorcerer's daily spells.
  // SRD: a 20-ft emanation lasting 2 hours a caster level. When a beast comes within it, it rings out and wakes
  // everyone asleep within earshot (60 ft). Cast it where you'll sleep, on a gate, on the shelter: the caster chooses.
  sim.wards = [];
  const WARD_R = 6, WARD_HEAR = 18;   // 20 ft and 60 ft, in metres
  const clockAt = t => `${String(Math.floor((t % 1440) / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function castAlarm(p) {
    if (!arcaneLvl(p)) return 'Only a wizard or a sorcerer can cast alarm.';
    if (!(p.missiles > 0)) return 'You have no arcane spells left today; 8 hours of sleep brings them back.';
    if (p.fight) return 'Not in the middle of a fight.';
    p.missiles--;
    const until = sim.t + 120 * arcaneLvl(p), where = AREAS[areaOf(p)]?.name || 'the road';
    sim.wards.push({ x: p.x, z: p.z, by: p.id, until, quiet: 0 });
    log('life', `${p.name} casts alarm at ${where} (until ${clockAt(until)}).`, [p.id]);
    remember(p, { text: `I cast alarm at ${where}; it holds until ${clockAt(until)}.` });
    return `You cast alarm at ${where}. Until ${clockAt(until)}, a beast within 20 feet sets it ringing, and everyone asleep within 60 feet wakes.`;
  }
  function checkWards() {
    if (!sim.wards.length) return;
    sim.wards = sim.wards.filter(w => w.until > sim.t);
    for (const w of sim.wards) {
      if (w.quiet > sim.t) continue;
      const b = Object.values(sim.animals).find(a => a.monster && a.alive && dist2(a, w) <= WARD_R); if (!b) continue;
      w.quiet = sim.t + 10;   // it rings while the beast is in it
      const caster = sim.people[w.by], where = AREAS[areaOf(w)]?.name || 'the dark';
      const sleepers = living().filter(q => q.kind === 'human' && q.state === 'sleep' && conscious(q) && dist2(q, w) <= WARD_HEAR);
      for (const q of sleepers) { q.task = null; q.state = 'idle'; q.alert = true; }
      for (const q of living()) if (q.kind === 'human' && conscious(q) && dist2(q, w) <= WARD_HEAR) remember(q, { text: `An alarm spell rang out at ${where} (${sim.clock()}): ${b.name.toLowerCase()} close by.`, big: true });
      log('law', `The alarm${caster ? ' ' + caster.name + ' cast' : ''} at ${where} rings out: ${b.name.toLowerCase()}!${sleepers.length ? ' ' + sleepers.map(q => q.name).join(', ') + ' wake.' : ''}`, [w.by, ...sleepers.map(q => q.id)]);
    }
  }
  sim.castAlarm = castAlarm; sim.checkWards = checkWards;
  // ---- DEPUTIES (Rose): any guard may deputize anyone willing, and lend them armour and a weapon, melee or ranged,
  // from the Guard station's loan rack. The loan lasts 8 hours (or until they hand it back); then the kit goes back
  // on the rack and they wear their own again. A deputy who dies drops the town's kit where they fall.
  sim.rack = { longsword: 2, spear: 4, lightxbow: 3, shortbow: 1, bolts: 60, arrows: 20, chainshirt: 2, leather: 4, lightshield: 2 };
  const RACK_MELEE = ['longsword', 'spear'], RACK_RANGED = ['lightxbow', 'shortbow'], RACK_ARMOUR = ['chainshirt', 'leather'];
  const deputyNow = q => !!q?.deputy && q.deputy.until > sim.t;
  sim.deputyNow = deputyNow;
  const rackText = () => Object.entries(sim.rack).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${(GOODS[k]?.name || WEAPONS[k]?.name || ARMOR[k]?.name || SHIELDS[k]?.name || k).toLowerCase()}`).join(', ') || 'empty';
  function deputyWill(q, g) {   // would q take the badge from g? their own nature decides
    const beasts = Object.values(sim.animals).some(a => a.alive && a.monster);
    return q.traits.loyalty * 1.2 + q.traits.aggression * 0.5 - q.traits.caution * 0.8 + R(q, g).like + (beasts ? 0.3 : 0) + rnd(-0.15, 0.15);
  }
  function deputize(g, q, word) {
    if (!isGuard(g)) return 'Only a guard can deputize.';
    if (!q || q.kind !== 'human' || q === g || !q.alive) return 'Deputize whom?';
    if (dist2(g, q) > 4) return `Get closer to ${q.name}.`;
    if (q.brain === 'human') return `${q.name} has to choose that for themself.`;
    if (isGuard(q)) return `${q.name} is already a guard.`;
    if (deputyNow(q)) return `${q.name} is already deputized.`;
    if (!conscious(q) || q.fight || q.jailedUntil > 0) return `${q.name} can't right now.`;
    if (openRecord(q).length) return `${q.name} has an open record; the station won't arm them.`;
    if (g.brain !== 'human') cool(g, 'deputize', 30);
    if (deputyWill(q, g) < 0.5) { (q.deputyNo ||= {})[g.id] = sim.t; remember(q, { text: `${g.name} asked me to be a deputy; I said no.` }); return `${q.name} won't take the badge.`; }
    const w = String(word || '').toLowerCase();
    const ranged = /rang|bow|crossbow|archer|shoot/.test(w) ? true : /melee|sword|spear|blade|close/.test(w) ? false : (q.st?.dex || 10) > (q.st?.str || 10);
    const lent = { weapon: null, armor: null, shield: null, ammo: {} }, better = k => avgDmg(k) > avgDmg(q.weapon);
    const wk = (ranged ? RACK_RANGED : RACK_MELEE).find(k => sim.rack[k] > 0 && (better(k) || (ranged && !WEAPONS[q.weapon]?.range)));
    if (wk) { sim.rack[wk]--; if (q.weapon && q.weapon !== 'fists') q.items[q.weapon] = (q.items[q.weapon] || 0) + 1; lent.prevWeapon = q.weapon; q.weapon = wk; lent.weapon = wk;
      const am = WEAPONS[wk].ammo; if (am) { const n = Math.min(20, sim.rack[am] || 0); sim.rack[am] -= n; q.items[am] = (q.items[am] || 0) + n; lent.ammo[am] = n; } }
    const ak = RACK_ARMOUR.find(k => sim.rack[k] > 0 && ARMOR[k].ac > (ARMOR[q.armor] || ARMOR.none).ac);
    if (ak) { sim.rack[ak]--; if (q.armor && q.armor !== 'none') q.items[q.armor] = (q.items[q.armor] || 0) + 1; lent.prevArmor = q.armor; q.armor = ak; lent.armor = ak; }
    if (!WEAPONS[q.weapon]?.hands && (!q.shield || q.shield === 'none') && sim.rack.lightshield > 0) { sim.rack.lightshield--; q.shield = 'lightshield'; lent.shield = 'lightshield'; }
    q.deputy = { by: g.id, until: sim.t + 480, lent };
    const kit = [lent.armor && ARMOR[lent.armor].name, lent.weapon && WEAPONS[lent.weapon].name, lent.shield && SHIELDS[lent.shield].name].filter(Boolean).map(x => x.toLowerCase());
    log('law', `${g.name} deputizes ${q.name}${kit.length ? ', lending ' + kit.join(', ') + ' from the station' : ''} (until ${clockAt(q.deputy.until)}).`, [g.id, q.id]);
    remember(q, { text: `${g.name} deputized me until ${clockAt(q.deputy.until)}${kit.length ? '; the station lent me ' + kit.join(', ') : ''}.`, big: true });
    return `${q.name} takes the badge${kit.length ? ': ' + kit.join(', ') : ''}, until ${clockAt(q.deputy.until)}.`;
  }
  function standDown(q, why) {
    const dp = q.deputy; if (!dp) return 'You are not a deputy.'; q.deputy = null;
    const L = dp.lent, back = [];
    if (L.weapon) { if (q.weapon === L.weapon) { q.weapon = 'fists'; sim.rack[L.weapon]++; back.push(L.weapon); } else if (q.items[L.weapon] > 0) { q.items[L.weapon]--; sim.rack[L.weapon]++; back.push(L.weapon); }
      if (L.prevWeapon && L.prevWeapon !== 'fists' && q.weapon === 'fists' && q.items[L.prevWeapon] > 0) { q.items[L.prevWeapon]--; q.weapon = L.prevWeapon; } }
    for (const [am, n] of Object.entries(L.ammo || {})) { const r = Math.min(n, q.items[am] || 0); q.items[am] = (q.items[am] || 0) - r; sim.rack[am] = (sim.rack[am] || 0) + r; }
    if (L.armor) { if (q.armor === L.armor) { q.armor = 'none'; sim.rack[L.armor]++; back.push(L.armor); } else if (q.items[L.armor] > 0) { q.items[L.armor]--; sim.rack[L.armor]++; back.push(L.armor); }
      if (L.prevArmor && L.prevArmor !== 'none' && q.armor === 'none' && q.items[L.prevArmor] > 0) { q.items[L.prevArmor]--; q.armor = L.prevArmor; } }
    if (L.shield && q.shield === L.shield) { q.shield = 'none'; sim.rack[L.shield]++; back.push(L.shield); }
    log('law', `${q.name} stands down as deputy${why ? ' (' + why + ')' : ''}${back.length ? ' and the station gets its kit back' : ''}.`, [q.id]);
    remember(q, { text: `I stood down as deputy${why ? ' (' + why + ')' : ''}.` });
    return 'You hand back the badge and the kit.';
  }
  function checkDeputies() {
    for (const q of living()) if (q.deputy && (q.deputy.until <= sim.t || q.jailedUntil > 0) && !q.fight) standDown(q, q.jailedUntil > 0 ? 'jailed' : 'the loan is up');
  }
  sim.deputize = deputize; sim.standDown = standDown;
  function nightWatch() {
    const h = H(); if (!(h >= 21 || h < 6)) return;
    const beasts = Object.values(sim.animals).filter(a => a.monster && a.alive && areaOf(a) && !['wood', 'road', 'marrow'].includes(areaOf(a)));
    if (!beasts.length) return;
    for (const q of living()) {
      if (q.kind !== 'human' || q.town || !conscious(q) || q.state === 'sleep' || q.fight || q.brain !== 'script' || q.jailedUntil > 0) continue;
      const b = beasts.find(a => dist2(a, q) < 30 && sees(q, a)); if (!b) continue;
      if (!(q.wokeAt > sim.t - 120) && Math.random() < 0.4 + q.traits.loyalty * 0.5) { q.wokeAt = sim.t; wakeNear(q, null, 15, `${b.name.toLowerCase()} about`); }
      if ((isGuard(q) || q.militia || deputyNow(q)) && !sim.alarmOn() && q.task?.verb !== 'ring') setTask(q, 'doas', { verb: 'ring', target: null, extra: {}, to: SPOTS.bell, until: sim.t + 30 });
    }
  }
  // the boss's crew: their gang, or the underworld they run
  const isBoss = p => !!p && p.kind === 'human' && (p.underworld?.role === 'boss' || Object.values(sim.gangs || {}).some(g => g.boss === p.id));
  const crewOf = b => { const g = Object.values(sim.gangs || {}).find(g => g.boss === b.id); return living().filter(q => q !== b && q.kind === 'human' && q.jailedUntil <= 0 && conscious(q) && (g ? q.gang === g.id : !!q.underworld)); };
  sim.isBoss = isBoss; sim.crewOf = crewOf;
  function crewOrders(b, orders) {
    const out = [], crew = crewOf(b);
    for (const o of (Array.isArray(orders) ? orders : []).slice(0, 6)) {
      const words = String(o?.do || '').toLowerCase().trim(), verb = words.split(/\s+/)[0], rest = words.slice(verb.length).trim().replace(/^(at|to)\s+/, '');
      const who = o?.who && o.who !== 'all' ? crew.filter(q => q.id === o.who) : crew;
      if (!who.length) { out.push(`nobody in the crew for "${words}"`); continue; }
      if (verb === 'stand') { for (const q of who) { q.crewPost = null; if (q.task?.ordered) q.task = null; } out.push('stand down'); continue; }
      if (verb === 'escort' || verb === 'follow' || verb === 'protect') { for (const q of who) setTask(q, 'tail', { target: b.id, until: sim.t + 240, ordered: true }); out.push('escort'); continue; }
      const pl = findPlace(rest); if (!pl || !AREAS[pl]) { out.push(`no such place "${rest}"`); continue; }
      const rush = /^(go|goto|rush|run)$/.test(verb);
      for (const q of who) { q.crewPost = rush ? null : pl; setTask(q, 'muster', { to: randIn(pl, 2), until: sim.t + (rush ? 120 : 480), run: rush, ordered: true }); }
      out.push(`${who.map(q => q.name).join(', ')} to ${AREAS[pl].name}`);
    }
    if (out.length) log('crime', `Boss ${b.name}'s orders: ${out.join('; ')}.`, [b.id]);
    return out;
  }
  sim.crewOrders = crewOrders;
  function commandNews(p) {
    return [sim.alarmOn() ? `THE ALARM BELL IS RINGING (rung by ${sim.people[sim.alarm.by]?.name || 'someone'} at ${String(Math.floor((sim.alarm.t % 1440) / 60)).padStart(2, '0')}:00).` : '',
      p.id === sim.captainId ? `You command the guard ("orders" in your plan): ${living().filter(q => isGuard(q) && q !== p).map(q => `${q.name} (${q.id}${q.post ? ', posted at ' + (AREAS[q.post]?.name || q.post) : ''})`).join('; ') || 'nobody'}.` : '',
      isBoss(p) ? `Your crew ("crew_orders" in your plan): ${crewOf(p).map(q => `${q.name} (${q.id}${q.crewPost ? ', at ' + AREAS[q.crewPost]?.name : ''})`).join('; ') || 'nobody'}.` : '',
      !CORPS[p.job] && !JOBS[p.job]?.owner ? barracksNews() : '',
      sim.wards.some(w => w.by === p.id && w.until > sim.t) ? `Your alarm spell holds at ${sim.wards.filter(w => w.by === p.id && w.until > sim.t).map(w => (AREAS[areaOf(w)]?.name || 'the road') + ' until ' + clockAt(w.until)).join('; ')}.` : '',
      deputyNow(p) ? `You are deputized (by ${sim.people[p.deputy.by]?.name || 'the guard'}) until ${clockAt(p.deputy.until)}, carrying the station's kit; you stand with the guard ("stand down" to hand it back).` : '',
      isGuard(p) ? `The station's loan rack: ${rackText()} ("deputize <name> [melee | ranged]").` : '',
      leadsParty(p) ? `You lead a party of ${followersOf(p).length + 1} (${followersOf(p).map(q => q.name).join(', ')}), formation: ${sim.formations[p.party] || 'loose'} ("formation <column | line | wedge | ring | loose>").` : '',
      p.sleptMin > 0 ? `You have slept ${Math.floor(p.sleptMin / 60)} of the 8 hours that restore your spells and heal you.` : ''].filter(Boolean).join(' ');
  }
  sim.applyMayor = (who, dec) => {
    if (!who || who.id !== sim.mayorId || !dec) return;
    const out = [];
    if (typeof dec.tax_rate === 'number') { sim.taxRate = clamp(dec.tax_rate, 0, 2); /* up to 200%, Rose */ out.push(`tax ${Math.round(sim.taxRate * 100)}%`); }
    if (dec.wages) for (const [k, v] of Object.entries(dec.wages)) if (k in sim.wages && typeof v === 'number') { sim.wages[k] = clamp(Math.round(v), 0, 1000); out.push(`${k} wage ${money(sim.wages[k])}`); }
    if (dec.captain && sim.people[dec.captain]?.alive && isGuard(sim.people[dec.captain])) { sim.mayorPick = dec.captain; out.push(`backs ${sim.people[dec.captain].name} for captain (the guards vote)`); }
    if (dec.bounty) for (const [id, amt] of Object.entries(dec.bounty)) if (sim.people[id]?.alive && typeof amt === 'number') { sim.bounty[id] = clamp(Math.round(amt), 0, 5000); out.push(`bounty ${money(amt)} on ${sim.people[id].name}`); }
    if (typeof dec.curfew === 'boolean') { sim.curfew = dec.curfew; out.push(dec.curfew ? 'curfew' : 'no curfew'); }
    if (typeof dec.rent === 'number') { sim.rent = clamp(Math.round(dec.rent), 0, 50); out.push(`rent ${money(sim.rent)}`); }
    if (typeof dec.head_tax === 'number') { sim.headTax = clamp(Math.round(dec.head_tax), 0, 50); out.push(`head tax ${money(sim.headTax)}`); }
    if (typeof dec.bail === 'number') { sim.bail = clamp(Math.round(dec.bail), 10, 500); out.push(`bail ${money(sim.bail)}`); }
    if (Array.isArray(dec.hire)) { sim.extraHires = sim.extraHires || {}; for (const j of dec.hire) if (JOBS[j]?.payer === 'town' && j !== 'mayor') { sim.extraHires[j] = (sim.extraHires[j] || 0) + 1; out.push(`hiring a ${JOBS[j].title.toLowerCase()}`); } }
    if (Array.isArray(dec.fire)) for (const id of dec.fire) { const q = sim.people[id]; if (q?.alive && JOBS[q.job]?.payer === 'town' && q.id !== who.id) { q.job = 'none'; out.push(`fired ${q.name}`); } }
    if (Array.isArray(dec.pardon)) for (const it of dec.pardon) { const obj = it && typeof it === 'object', q = sim.people[obj ? it.id : it]; if (!q) continue; openRecord(q).forEach(r => r.served = true); if (q.jailedUntil > 0) { q.jailedUntil = 0; q.task = null; place(q, SPOTS.desk); } let job = null; if (obj || q.harborJailed) { const wk = obj ? String(it.work || '') : ''; job = JOBS[wk]?.payer === 'town' && !['mayor', 'captain'].includes(wk) ? wk : 'laborer'; q.job = job; q.harborJailed = false; } out.push(`pardoned ${q.name}${job ? ' and put them to work as ' + JOBS[job].title.toLowerCase() : ''}`); }
    if (Array.isArray(dec.militia)) for (const x of dec.militia) { const s = String(x), off = s.startsWith('-'), q = sim.people[off ? s.slice(1) : s]; if (!q?.alive || q.town || q.kind !== 'human') continue; if (off) { if (q.militia) { q.militia = false; out.push(`discharged ${q.name} from the militia`); } } else if (!q.militia && !isGuard(q)) { q.militia = true; out.push(`enlisted ${q.name} in the militia`); remember(q, { text: `Mayor ${who.name} enlisted me in the town militia: when beasts come I stand with the guards, and the town may arm me.`, big: true }); } }
    if (dec.arm) armTown(who, dec.arm, out);
    if (typeof dec.take_from_treasury === 'number' && dec.take_from_treasury > 0) embezzle(who, dec.take_from_treasury);
    if (dec.vote_for && sim.people[dec.vote_for]) who.voteFor = dec.vote_for;
    if (dec.orders) { const done = orderGuards(who, dec.orders); if (done.length) out.push('orders: ' + done.join('; ')); }
    if (dec.policy) who.policy = dec.policy;
    if (dec.statement) { log('politics', `Mayor ${who.name}: "${String(dec.statement).slice(0, 240)}"`, [who.id]); for (const q of living()) if (q !== who) bump(q, who, 'like', /\b(lower|cut|reduce) tax/i.test(dec.statement) ? 0.03 : 0); }
    if (out.length) log('politics', `Mayor ${who.name} decides: ${out.join(', ')}.`, [who.id]);
  };
  // the mayor can quietly take from the treasury; anyone in the hall who sees it can report it,
  // and the hole shows up as wages the town can't pay
  function embezzle(m, n) {
    n = Math.min(Math.floor(n), sim.treasury); if (n <= 0) return;
    sim.treasury -= n; m.coin += n; m.stats.stolen += n; sim.flow.out.embezzled = (sim.flow.out.embezzled || 0) + n;
    const r = d(20) + m.skills.sleight + m.skills.bluff / 2;
    const seen = living().filter(w => w !== m && areaOf(w) === 'hall' && sees(w, m) && d(20) + w.skills.spot >= r);
    if (seen.length) { const ev = { id: 'ev' + (++sim.rec.crimes) + '-em', type: 'embezzlement', actor: m.id, victim: null, at: { x: m.x, z: m.z }, t: sim.t, day: sim.day }; sim.events.push(ev); for (const w of seen) perceive(w, ev, 'saw', null); }
    log('crime', `Mayor ${m.name} quietly takes ${money(n)} from the treasury${seen.length ? ` (seen by ${seen.map(w => w.name).join(', ')})` : ''}.`, [m.id]);
  }
  sim.embezzle = embezzle;
  // the fallback mayor, used when no AI answers: keep the treasury above three days of salaries
  function scriptedMayor(m) {
    const salaries = living().filter(p => JOBS[p.job]?.payer === 'town').reduce((s, p) => s + (sim.wages[p.job] ?? JOBS[p.job].wage), 0);
    const dec = {};
    if (sim.treasury < salaries * 2) dec.tax_rate = Math.min(0.3, sim.taxRate + 0.03); else if (sim.treasury > salaries * 6) dec.tax_rate = Math.max(0.05, sim.taxRate - 0.02);
    const worst = living().filter(p => openRecord(p).length >= 2 && p.jailedUntil <= 0).sort((a, b) => openRecord(b).length - openRecord(a).length)[0];
    if (worst && sim.treasury > 300 && !sim.bounty[worst.id]) dec.bounty = { [worst.id]: 40 };
    if (sim.events.filter(e => sim.t - e.t < 1440).length > 6 && sim.treasury > salaries * 4) dec.hire = ['guard'];
    if (sim.day >= (sim.genDays || 7) - 1 && sim.armedDay !== sim.day && sim.treasury > salaries * 3 + 1500) { sim.armedDay = sim.day; dec.arm = { who: 'guards', items: sim.treasury > salaries * 3 + 6000 ? { healkit: 2, alchfire: 2 } : { healkit: 2 } }; }
    if (sim.treasury > salaries * 3 && m.traits.greed > 0.6 && m.traits.honesty < 0.45 && Math.random() < 0.5) dec.take_from_treasury = Math.floor((sim.treasury - salaries * 3) * 0.3 * m.traits.greed);
    sim.applyMayor(m, dec);
  }

  // ===================================================== decisions by AIs ==
  // A brain that isn't the script gets asked, once each morning, for a plan (and the
  // mayor for the town's business). The question lists the legal choices; the answer is JSON.
  // What an AI-played person is told. Facts about themselves and what they can perceive, what is
  // available, the commands they have, the careers that exist. No advice, no strategy: that's theirs.
  const SEEDY = ['pickpocket (lift coin from people)', 'burglar (houses and shops, at night)', 'mugger (rob people by force)', 'shop robber (hold up a keeper)', 'extortionist (sell a business "insurance")', 'bandit (ambush carts on the Old Road)', 'rustler (take the ranch\'s animals)', 'fence (sell stolen goods)', 'gang boss or member (found or join a crew)', 'sellsword (hire out as muscle)', 'a bribe-taking official (if you hold an office)', 'liar and slanderer'];
  const COMMANDS = ['deputize <name> [melee | ranged] (guards: anyone willing, for 8 hours, with armour and a weapon from the station\'s loan rack)', 'stand down | return the gear (a deputy: hand back the badge and the kit)', 'cast alarm [at <place>] (wizards and sorcerers, one arcane spell: for 2 hours a level, a beast within 20 ft sets it ringing and everyone asleep within 60 ft wakes)', 'formation <column | line | wedge | ring | loose> (a party leader: how your party walks around you)', 'familiar <bat | cat | hawk | lizard | owl | rat | raven | snake | toad | weasel> (wizards and sorcerers, once)', 'favored enemy <beasts | giants | people> (rangers, once; beasts if never chosen)', 'calm <beast> (druids and rangers: wild empathy, d20 + level + Cha vs 20; a calmed beast goes back to the Wildwood)', 'enlist <guard | night guard | artillery | mage guard> (walks you to its barracks by the fields gate and joins if there is a place; town pay; members bunk free; artillery get a crossbow; mage guards must cast spells)', 'give <name> <amount | item> | donate <amount> to <name> (any sum: 1 cp, a silver, 2 gp; or something you carry)', 'busk (sing or play in the Market square for tossed coins)', 'wake <name> | wake the neighbours (rouse those asleep near you)', 'ring the alarm (the bell in the Market square: wakes the whole town; guards and militia run at the beasts)', 'sleep [N hours] (any time of day; 8 hours of sleep restores your spells and heals you)', 'stay awake [N hours] (even at night)', 'pool <number> <item> for <the guards | the militia | everyone | us | a name> (start a money pool everyone can chip into)', 'chip in <amount> to <item> (put coin into an open money pool)', 'take up <seedy career> (at the Drowned Lantern after dark)', 'go straight', 'size up <person> (judge their purse, gear and gang)', 'case <house address or business> (underworld: savings, lock, who is in)', 'hide (underworld)', 'wait for <person> (underworld: hidden, until they come near)', 'steal <item> (underworld: shoplift)', 'escape (from a cell)', 'turn in (the belongings of a dead stranger you found, at the guard station)', 'get cured (when sick: the Infirmary doctor tries for 3 sp, the Chapel cleric cures anything for 6 sp; only a few patients at a time)', 'shout for the guard (any time)', 'point out <person> to the guard (someone on the bounty board you can see)', 'bribe <person> <amount, e.g. 5 sp>', 'intimidate <person>', 'persuade <person>', 'accuse <person> of <crime> (to the person beside you)', 'call <person> a liar (to the person beside you)', 'give <person> <amount>', 'propose to <person>', 'invite <person> (to come with you; add an amount to pay them)', 'hire <person> as a bodyguard <amount> (the mayor, guard captain or a gang boss: they follow and fight for you for a day)', 'dismiss (your party)', 'quit (your job)', 'carry <person> (someone who is down)', 'loot (the body, or someone knocked out, beside you: takes everything they carry and wear)', 'dig (rob the grave beside you)', 'feed <animal>', 'report <person> for <crime> (at the guard station)', 'work', 'eat', 'drink', 'sleep', 'buy <item> (at an open shop)', 'sell <item>', 'buy house <address> (1 gp, at the town hall)', 'rent <address> (a bed from its owner, a night at a time; renews itself while you can pay)', 'move out', 'take in <person> for work (as a house owner: they live free, their wages come to you)', 'turn out <person> (a lodger)', 'whittle club / whittle spear (in the Wildwood or the orchard: a club in an hour, a spear in two)', 'gather stones (stones to throw, or ammunition for a sling; outside town)', 'chop wood (in the Wildwood, an hour: 3 wood, 5 with an axe)', 'barricade <address> (3 wood, 2 hours, your own house: beasts must batter it down)', 'build palisade (3 wood, 2 hours on the town palisade at the edge of the Wildwood)', 'light a watch-fire (2 wood: light until dawn, outdoors)', 'write <words> (on the notice board in the Market square)', 'go to <place, address or person> (e.g. "go to 3 Wick Lane", "go to Guard station")', 'rally <place or address> (the mayor calls the town, the guard captain the guards, a gang boss the crew: they come and hold there about two hours)', 'follow <person>', 'stay', 'visit <person>', 'court <person>', 'boast <person>', 'tavern', 'forage', 'fish', 'hunt <animal>', 'beg', 'apply for work with <person>', 'lease <business> (at the town hall)', 'stand for mayor', 'campaign', 'recruit <person>', 'found a gang', 'coup', 'pickpocket <person>', 'mug <person>', 'burgle', 'rob <shop>', 'extort <business>', 'attack <person>', 'ambush (the Old Road)', 'caravan (to Marrowford)', 'signon (as a sellsword)', 'report <person> (at the guard station)', 'flee'];
  function careers() {
    const legit = Object.entries(JOBS).filter(([k, j]) => !['none', 'factor', 'militia', 'mayor', 'captain'].includes(k)).map(([k, j]) => `${j.title} (${AREAS[j.place]?.name || j.place}${j.from != null ? `, ${j.from}:00-${j.to % 24}:00` : ''}${j.hunt ? ', your own boss: hunt game in the Wildwood and sell the meat and pelts at the store ("become a hunter")' : j.craft ? ', your own boss: turn pelts into leather armour (wolf) and hide armour (bear, troll), sold to the smithy ("become a leatherworker")' : j.owner ? ', runs the business: lease it at the hall or be hired by its owner' : j.payer === 'town' ? `, paid ${money(sim.wages[k] ?? j.wage)} by the town` : j.wage ? `, ${money(j.wage)} a shift from the owner` : ''})`);
    return `${legit.join('; ')}; Mayor (elected, ${money(sim.wages.mayor ?? JOBS.mayor.wage)}); Guard captain (elected by the guards). Outside the law (the underworld): ${SEEDY.join('; ')}. The underworld's tools (pickpocket, mug, burgle, rob, steal, hide, case, wait for, extort, ambush, rustle) come with a place in it: take up a seedy career at the Drowned Lantern after dark ("take up <career>"), found or join a gang, or, as a guard, take someone's money. "go straight" leaves it.`;
  }
  sim.careers = careers;
  // What an AI-played person knows each moment: their own body, purse and kit, where they are and
  // what they can see, public facts about the town, and what has happened to them. No traits, no
  // relationship scores, no rank: who they like or fear, they work out for themselves.
  function facts(p, short) {
    const g = p.gang && sim.gangs[p.gang];
    return [
      `You: ${p.name} ${p.surname} (id ${p.id}), ${p.age}, ${p.gender === 'nb' ? 'nonbinary' : p.gender === 'm' ? 'man' : 'woman'}. Health ${Math.max(0, p.hp)}/${p.maxhp}${p.nl ? ` (${p.nl} bruising)` : ''}${sickText(p)}. ${p.food < 0.1 ? 'Starving (slow, -2 to hit and damage).' : p.food < 0.3 ? 'Hungry (slower, -1 to hit and damage).' : 'Fed.'}${(p.water ?? 1) < 0.3 ? ' Thirsty.' : ''} Purse ${money(p.coin)}${p.home != null ? `, savings at home ${money(HOUSES[p.home].stash)} (you live at ${AREAS[HOUSES[p.home].id].name})` : ''}. Carrying ${WEAPONS[p.weapon].name.toLowerCase()} (${WEAPONS[p.weapon].dmg[0]}d${WEAPONS[p.weapon].dmg[1]}${WEAPONS[p.weapon].range ? ', ranged' : ''}), ${(ARMOR[p.armor] || ARMOR.none).name.toLowerCase()} (AC ${acOf(p)}${(ARMOR[p.armor] || ARMOR.none).dr ? ', soaks ' + ARMOR[p.armor].dr : ''})${p.shield && p.shield !== 'none' ? ', ' + SHIELDS[p.shield].name.toLowerCase() : ''}; pack: ${Object.entries(p.items).filter(([, n]) => n > 0).map(([k, n]) => n + ' ' + k).join(', ') || 'empty'}.`,
      `What you're good at: ${Object.entries(p.skills).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' +' + v).join(', ')}; attack +${babOf(p) + Math.max(mod(p.st.str), mod(p.st.dex))}.${levelText(p)}`,
      housingText(p), defenceText(p), boardFacts(p),
      `Job: ${JOBS[p.job].title}${p.id === sim.mayorId ? ' (mayor)' : ''}${p.rank ? ', ' + p.rank : ''}.${inUnderworld(p) ? ` You are in the underworld${p.underworld?.role ? ' (' + (SEEDY_ROLES[p.underworld.role] || p.underworld.role) + ')' : p.onPayroll ? ' (on the take)' : ''}.` : ''}${p.spouse ? ' Married to ' + sim.people[p.spouse]?.name + '.' : ''}${g ? ` In ${g.name}${g.boss === p.id ? ' (boss)' : ''}.` : ''}${openRecord(p).length ? ` The guard has ${openRecord(p).length} charge(s) on you.` : ''}${p.jailedUntil > 0 ? ' You are in a jail cell.' : ''}`,
      `Now: day ${sim.day}, ${sim.clock()}${night() ? ' (night)' : ''}, at ${AREAS[areaOf(p)]?.name || 'the road'}. You can see: ${inView(p) || 'nobody'}.`,
      short ? '' : `Prices: ${['bread', 'meal', 'turnip', 'meat', 'eggs', 'ale'].map(k => `${k} ${money(priceOf(GOODS[k].shop || 'store', k))}`).join(', ')}; at the smithy: ${Object.entries(sim.business.smithy.stock).filter(([k, n]) => n > 0 && GOODS[k] && k !== 'iron').map(([k]) => `${k} ${money(priceOf('smithy', k))}`).join(', ') || 'nothing'}.`,
      short ? '' : `Town: mayor ${sim.people[sim.mayorId]?.name || 'none'}, captain ${sim.people[sim.captainId]?.name || 'none'}, sales tax ${Math.round(sim.taxRate * 100)}%, rent ${money(sim.rent)} a day. Businesses: ${Object.values(sim.business).map(b => `${b.id} ${b.owner ? 'run by ' + sim.people[b.owner]?.name : 'unclaimed (lease at the hall, ' + money(LEASE[b.id] || 20) + ' a day)'}`).join(', ')}.${Object.keys(sim.bounty).some(id => id !== 'beasts' && sim.people[id]?.alive) ? ' Bounty board (bring them to the Guard station, knocked out and carried, for the coin): ' + Object.entries(sim.bounty).filter(([id]) => id !== 'beasts' && sim.people[id]?.alive).map(([id, c]) => `${sim.people[id].id === 'player' ? 'Rose of the City' : sim.people[id].name} (${id}) ${money(c)}${sim.bountyWhy?.[id] ? ' for ' + sim.bountyWhy[id] : ''}`).join(', ') + '.' : ''}`,
      discountNews(p),
      poolNews(),
      commandNews(p),
      `Deaths so far: ${sim.rec.deaths || 0} (the ${sim.MAX_DEATHS + 1}th death fails the whole town).`,
      electionNews(p), rankNews(p),
      (() => { const say = m => m.text || (m.ev ? memText(m) : m.grave ? `${m.name} buried in plot ${m.grave}` : ''), big = p.memory.filter(m => m.big).slice(-(short ? 5 : 10)), small = p.memory.filter(m => !m.big && !m.heard).slice(-(short ? 4 : 7)), heard = p.memory.filter(m => m.heard && !m.big).slice(-(short ? 1 : 2));
        return (big.length ? `What matters that you know (deaths, warnings): ${big.map(m => say(m).replace(/\.$/, '')).filter(Boolean).join('; ')}.\n` : '') + `What has happened to you lately: ${small.map(say).filter(Boolean).join('; ') || 'nothing notable'}.` + (heard.length ? ` Overheard: ${heard.map(say).join('; ')}.` : ''); })(),
    ].filter(Boolean).join('\n');
  }
  sim.facts = facts;
  const INTRO = `You are an AI in a lifesim. Develop your own strategy to win while operating within a civilization as a living autonomous being with agency. Winning means the most money, and survival (death is permanent).`;
  const personaOf = p => (p.brain === 'mayor-ai' ? MAYOR_PERSONA : p.persona || '').replace(/\[name\]/gi, fullName(p));
  sim.LEASE = LEASE;
  sim.PERSONAS = PERSONAS; sim.MAYOR_PERSONA = MAYOR_PERSONA;
  // Each AI-played person is its own instance: a fixed identity (the same every time, so it can be
  // cached), and then a running thread of turns that only that person ever sees.
  sim.identityFor = p => [
    `The win condition for all of Hollow Town: the community wins if anyone in it is still alive at noon (12:00) on day ${winDay()}. The fail state: the moment ${sim.MAX_DEATHS + 1} people have died, the whole town fails at once. It is up to all of you, together, to make sure that doesn't happen. Beasts come every night at 22:00, and on the last night a troll and two bears. If everyone dies, everyone loses, however rich they were.`,
    p.brain === 'mayor-ai' ? `You are an AI in a lifesim. You operate within a civilization as a living autonomous being with agency. Winning, for you, means holding power (and staying alive: death is permanent).` : INTRO + ` You start with nothing.`,
    `Here is what commands you have access to: ${COMMANDS.join('; ')}.`,
    'Money is D&D coin: copper (cp), silver (sp), gold (gp) and platinum (pp); 10 cp = 1 sp, 10 sp = 1 gp, 10 gp = 1 pp. Prices are the book prices: bread 2 cp, a mug of ale 4 cp, a hired hand earns 1-3 sp a day, a dagger is 2 gp, a longsword 15 gp, chainmail 150 gp. Any amount you put in a command can name its coin ("5 sp", "2 gp"); a bare number in a JSON reply is copper pieces.',
    `Here is what careers you can do: ${careers()}`,
    `Fighting (D&D 3.5 SRD rules, the same as in Legends of Harpine): anyone can attack anyone, with lethal or nonlethal blows. In a fight you take turns: attack, charge, shoot (and reload a crossbow), total defence, intimidate, feint, drink a healing draught, stabilise the dying, coup de grace on the helpless, rob the beaten, run, withdraw, or surrender. Weapons hit far harder than fists, armour soaks blows, the wounded can bleed out, and death is permanent. Guards who win with nonlethal blows take the loser to jail. You choose how you fight with "fighting": {"blows": "lethal"|"nonlethal", "flee_below": 0-1 (run when health falls under this share), "surrender": true|false, "shout": true|false (call for the guard)}.`,
    personaOf(p),
    sim.lore?.wisdom?.length ? `What Hollow Town remembers from earlier generations (old stories, not your life; learn from them): ${sim.lore.wisdom.join(' ')}` : '',
    sim.playerId ? `Rose of the City (id "player") is a human player, an outsider from the city; she can't die (she is knocked out instead). Treat her like anyone else.` : '',
    `You are one person, living one life. Each message you get is a moment of it: a PLAN moment (decide what to do) or a TALK moment (someone is in front of you). Each says what is available right now and how to reply.`,
  ].filter(Boolean).join('\n');
  sim.turnFor = (p, kind) => {
    const menu = [...new Set(options(p).map(optLabel))].sort(() => Math.random() - 0.5);
    const failed = (p.failed || []).splice(0); const lines = [failed.length ? `These steps couldn't be done: ${failed.join('; ')}.` : '', `PLAN. Here is what is available to you right now: ${menu.join('; ') || 'nothing at this moment'} (more becomes possible as things change).`, facts(p).split('\n').filter(l => !l.startsWith('Rose of the City')).join('\n')];
    if (p.firstPick) lines.push(firstClassPrompt(p));
    if (p.levelReady) lines.push(levelPrompt(p));
    if (kind === 'mayor') lines.push(
      `YOUR SEAT OF POWER. You set the sales tax, the daily rent and head tax, every public wage (guards, captain, jailer, clerk, labourers, undertaker, cleric, doctor, teacher, your own), bounties on anyone (or on beasts), a curfew, bail; you hire and fire public workers, pardon prisoners (or pardon them by putting them to work in a public job), back a guard for captain, and the treasury is in your hands (you can take from it; if someone sees, it's embezzlement). You can enlist townsfolk into a town militia ("militia") and batch-buy weapons, armour, healing draughts, alchemist's fire and healer's kits for the guards or the militia ("arm"), paid from the treasury at the shopkeeper's price less any discount they give the town; what a shop hasn't got it makes overnight.${armouryNews()} You command the guard: "orders": [{"guard": "<guard id>" | "all" | "captain", "do": "arrest <id>" (on your own warrant, no evidence needed) | "patrol <place>" | "go to <place or address>" (rush there now, e.g. "go to 3 Wick Lane") | "escort me" | "raid <business>" | "release <id>" | "stand down"}]. Guards carry out orders; some may refuse what they think is unjust, and people who see an arrest without cause remember it. The election is ${sim.electionEvery === 1 ? 'every day' : 'every ' + sim.electionEvery + ' days'} at noon (from day ${sim.firstElection}); anyone may stand against you.`,
      `Wages now: ${JSON.stringify(sim.wages)}. Bounties: ${JSON.stringify(sim.bounty)}. Curfew: ${sim.curfew}. Bail: ${money(sim.bail)}. Crimes in the last day: ${sim.events.filter(e => sim.t - e.t < 1440).length}. People with open charges: ${living().filter(q => openRecord(q).length).map(q => `${q.name} (${q.id}) ${openRecord(q).length}`).join(', ') || 'none'}. Guards: ${living().filter(isGuard).map(g => `${g.name} (${g.id}, ${JOBS[g.job].title})`).join('; ') || 'none'}.`,
      `Reply with ONLY a JSON object; every key optional: {"agenda":["command", ...up to 5], "tax_rate":0-2 (2 = 200%), "wages":{"<job>":cp a day}, "rent":cp a day, "head_tax":cp a day, "captain":"<guard id you back>", "bounty":{"<id>" or "beasts":cp}, "curfew":true|false, "bail":cp, "hire":["<public job>"], "fire":["<id>"], "pardon":["<id>" or {"id":"<id>","work":"<public job>"}], "take_from_treasury":cp, "militia":["<id> to enlist", "-<id> to discharge"], "arm":{"who":"guards"|"militia"|["<id>", ...],"items":{"<item>":count}}, "orders":[{"guard":"...","do":"..."}], "vote_for":"<id>", "platform":"...", "statement":"...", "say":"...", "write_board":"words to pin on the notice board (Market square)", "note":"one line to remember"}`);
    else lines.push(`Reply with ONLY a JSON object; every key optional: {"agenda":["command", ...up to 5, in order], "policy":{"work":0-3,"crime":0-3,"violence":0-3,"romance":0-3,"politics":0-3,"gang":0-3,"tavern":0-3,"socialize":0-3,"hunt":0-3,"forage":0-3} (how you'll lean between commands), "say":"words you say aloud now", "write_board":"words to pin on the notice board (in the Market square; everyone passing reads it)", "note":"one line to remember", "stand":true, "platform":"if you're a candidate", "vote_for":"<id>", "captain_vote":"<id>", "boss_vote":"<id>", "fighting":{"blows":"lethal"|"nonlethal","flee_below":0-1,"surrender":true|false}${(p.job === 'smith' || p.job === 'journeyman' || p.job === 'apprentice') ? `, "forge":"anything" | "no weapons" | ["item", ...]` : ''}${p.id === sim.captainId ? ', "orders":[{"guard":"<guard id>"|"all","do":"patrol <place or address> (posts them there) | go to <place> (rush now) | escort me | arrest <id> | release <id> | stand down"}]' : ''}${isBoss(p) ? ', "crew_orders":[{"who":"<id>"|"all","do":"post <place or address> | go to <place> | escort me | stand down"}]' : ''}${JOBS[p.job]?.owner ? ', "prices":{"<item>":0.5-4}, "discounts":{"<person id>"|"guards"|"militia"|"friends"|"town"|"everyone":0-0.9} (fraction off what you charge them; "town" is the mayor\'s bulk orders; {} ends them)' : ''}}`);
    return lines.filter(Boolean).join('\n');
  };
  // everything in one message (for a brain with no thread of its own, like the artifact's mayor button)
  sim.decisionFor = (p, kind) => sim.identityFor(p) + '\n' + sim.turnFor(p, kind);
  // ---- pets and words ---------------------------------------------------------
  // An owned animal hears what's said near it. Its own name sinks in after a few hearings.
  // Other words get tied to what tends to follow them: food (being fed), a fight (its person
  // fighting). Once a word means food it comes running when it hears it; once a word means
  // "fight", it joins in when its person says it, if it's bonded enough and bold enough.
  const PET_WORDS = 3;
  function hearWords(sp, text) {
    // people hearing their own name look round
    const low = String(text).toLowerCase();
    { const ks = keywords(text); for (const q of living()) if (q !== sp && q.kind === 'human' && q.brain !== 'human' && hears(q, sp)) heardBy(q, ks); }
    for (const q of living()) if (q !== sp && q.kind === 'human' && q.brain !== 'human' && low.includes(q.name.toLowerCase()) && hears(q, sp)) { q.alert = true; if (q.state !== 'sleep') q.yaw = Math.atan2(sp.x - q.x, sp.z - q.z); }
    const words = keywords(text).concat((String(text).toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length <= 3 && !STOP.has(w)));
    for (const an of Object.values(sim.animals)) {
      if (!an.alive || an.game || an.livestock || an.fight || dist2(an, sp) > 10 || !sameSpace(an, sp)) continue;
      const v = (an.words ||= {});
      an.recent = (an.recent || []).filter(r => sim.t - r.t < 3).concat(words.map(w => ({ w, t: sim.t, by: sp.id })));
      for (const w of words) { const e = (v[w] ||= { heard: 0, food: 0, fight: 0 }); e.heard++; }
      const name = an.name.toLowerCase();
      if (words.includes(name)) { if ((v[name].heard >= PET_WORDS || an.owner && an.bond[an.owner] > 0.8) && !an.knowsName) { an.knowsName = true; log('life', `${an.name} has learned its name.`, [an.id]); } if (an.knowsName) an.yaw = Math.atan2(sp.x - an.x, sp.z - an.z); }
      // words it already understands
      for (const w of words) {
        const e = v[w]; if (!e || e.heard < PET_WORDS) continue;
        const bond = an.bond[sp.id] || 0;
        if (e.food / e.heard > 0.4 && an.full < 0.8) { an.goal = P(sp.x, sp.z); an.come = sim.t; if (!an.lastPerk || sim.t - an.lastPerk > 60) { an.lastPerk = sim.t; log('life', `${an.name} perks up at "${w}" and trots over to ${sp.id === 'player' ? 'you' : sp.name}.`, [an.id, sp.id]); } break; }
        if (e.fight / e.heard > 0.3 && bond > 0.5 && an.temper !== 'passive') {
          const f = sim.fights.find(f => f.sides.has(sp.id));
          const foe = f ? [...f.sides.keys()].map(body).find(q => q && q.alive && f.sides.get(q.id) !== f.sides.get(sp.id)) : living().filter(q => q !== sp && q.kind === 'human' && conscious(q) && dist2(q, sp) < 5 && facing(sp, q) > 0.3).sort((a, b) => dist2(a, sp) - dist2(b, sp))[0];
          if (foe) { log('fight', `${an.name} hears "${w}" from ${sp.id === 'player' ? 'you' : sp.name} and goes for ${foe.id === 'player' ? 'you' : foe.name}!`, [an.id, sp.id, foe.id]); if (f) join(f, an, f.sides.get(sp.id), 'lethal'); else startFight(an, foe, { mode: 'lethal', why: 'set on by ' + sp.name }); }
          break;
        }
      }
    }
  }
  sim.hearWords = hearWords;
  function petEvent(an, kind) {      // whatever was said just before this gets the credit
    for (const r of (an.recent || [])) if (sim.t - r.t < 3 && an.words?.[r.w]) an.words[r.w][kind]++;
    an.recent = [];
  }
  sim.petEvent = petEvent;
  // ---- conversations: a prompt for one line, from the speaker's own point of view
  function inView(p, max = 8) {
    const out = [];
    for (const q of [...living(), ...Object.values(sim.animals)]) if (q !== p && q.alive && sees(p, q)) out.push(q);
    const bodies = sim.bodies.filter(b => !b.buried && !b.collected && dist2(b, p) < 10 && sameSpace(p, b)).map(b => `a body on the ground${b.coin > 0 || Object.values(b.items || {}).some(n => n > 0) ? ' (something on it)' : ''} (~${Math.round(dist2(b, p))}m; "loot" when beside it)`);
    return [...out.sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, max).map(q => q.kind === 'animal' ? `a ${q.species}` : `${q.id === 'player' ? 'Rose of the City' : q.name} (${!conscious(q) ? 'on the ground' : q.fight ? 'fighting' : q.task?.kind || q.state}${sim.bounty[q.id] && q.kind === 'human' ? `, WANTED ${money(sim.bounty[q.id])}${sim.bountyWhy?.[q.id] ? ' for ' + sim.bountyWhy[q.id] : ''}` : ''}${q.sick?.sym ? ', ' + illLook(p, q) : ''}${q.items?.finery ? ', finely dressed' : ''}${q.items?.torch && night() ? ', carrying a torch' : ''}, ~${Math.round(dist2(q, p))}m)`), ...bodies].join(', ');
  }
  sim.inView = inView;
  function electionNews(p) {
    const next = nextElectionDay(), left = next - sim.day;
    const cands = [...new Set([...(sim.mayorId ? [sim.mayorId] : []), ...sim.election.candidates])].map(id => sim.people[id]).filter(q => q && q.alive);
    const list = cands.map(c => `${c.id === 'player' ? 'Rose of the City (the outsider)' : fullName(c)} (${c.id}${c.id === sim.mayorId ? ', the sitting mayor' : ''}${c.platform ? ': "' + c.platform + '"' : ''})`).join('; ');
    const me = sim.election.candidates.includes(p.id) || p.id === sim.mayorId;
    return `ELECTION for mayor ${left === 0 ? 'TODAY at noon' : `in ${left} day${left > 1 ? 's' : ''} (day ${next}, noon)`}. On the ballot: ${list || 'nobody yet'}. ${me ? 'You are on the ballot' + (p.platform ? ' (your platform: "' + p.platform + '")' : '') + '.' : 'Anyone may stand: 5 sp fee at the town hall.'} Everyone votes. The mayor sets taxes, wages, hiring, the guard captain and bounties, and draws the biggest wage.${p.voteFor ? ` You mean to vote for ${sim.people[p.voteFor]?.name}.` : ''}`;
  }
  sim.electionNews = electionNews;
  function rankNews(p) {
    const out = [];
    if (isGuard(p)) { const cap = sim.people[sim.captainId], sgt = living().find(q => q.rank === 'sergeant'); const left = nextElectionDay(H() >= 18) - sim.day; out.push(`You are ${p.rank || 'a guard'}. Captain: ${cap ? cap.name + (p.rank === 'acting captain' ? ' (you, acting)' : '') : 'none'}${sgt ? ', sergeant ' + sgt.name : ''}${sim.mayorPick ? `; the mayor backs ${sim.people[sim.mayorPick]?.name}` : ''}. The guards vote for their captain ${left === 0 ? 'today at 6pm' : 'in ' + left + ' day(s)'}: say who with "captain_vote": "<id>" (guards: ${living().filter(isGuard).map(q => q.name + ' ' + q.id).join(', ')}).`); }
    if (p.gang && sim.gangs[p.gang]) { const g = sim.gangs[p.gang], b = sim.people[g.boss], ub = sim.people[g.underboss]; const left = nextElectionDay(H() >= 21) - sim.day; out.push(`You run with ${g.name}. Boss: ${b?.name || 'none'}${g.acting ? ' (acting, the real boss is jailed)' : ''}${b === p ? ' (you)' : ''}${ub ? ', underboss ' + ub.name : ''}. The crew picks its boss ${left === 0 ? 'tonight' : 'in ' + left + ' day(s)'}: "boss_vote": "<id>" (members: ${gangMembers(g.id).map(q => q.name + ' ' + q.id).join(', ')}). A boss can also be taken by force ("coup" in your agenda); the others choose whether to stay loyal.`); }
    return out.join(' ');
  }
  sim.rankNews = rankNews;
  sim.chatTurn = (sp, to, heard) => {
    const who = to.id === 'player' ? `Rose of the City (id player)` : `${fullName(to)} (id ${to.id}, ${JOBS[to.job].title.toLowerCase()}${to.gang ? ', ' + sim.gangs[to.gang]?.name : ''})`;
    return [
      `TALK. You are face to face with ${who}.`,
      heard ? `They just said to you: "${String(heard).slice(0, 300)}"` : `Nobody has spoken yet.`,
      sp.offerFrom?.from === to.id ? `They offered you a deal: ${offerText(sp.offerFrom.offer)}. Answer with "accept": true or false, or make your own "offer".` : '',
      facts(sp, true).split('\n').filter(l => !l.startsWith('Rose of the City')).join('\n'),
      `You can act on any command right now with "do". A deal: "offer": {"give": {"coin": n} or {"item": "name", "n": k}, "want": {"coin": n} or {"item": "name", "n": k} or {"favor": "join_party"|"vote_for_me"|"work_for_me"|"keep_quiet"|"marry_me"}, "threat": true|false}.`,
      `Reply with ONLY JSON: {"say":"the words you speak (spoken words only)","do":"optional command","feeling":-1..1 (how you feel about them now),"note":"optional: one line to remember","offer":{...} optional,"accept":true|false optional,"end":true|false (true when you're done talking),"hearers":["<id>", ...] optional (who else in earshot hears you; leave it out and everyone near hears),"whisper":true optional (only they hear)}`,
      (() => { const near = living().filter(q => q !== sp && q !== to && q.kind === 'human' && inEarshot(q, sp)); return near.length ? `In earshot (about 30 ft): ${near.map(q => (q.id === 'player' ? 'Rose of the City' : q.name) + ' ' + q.id).join(', ')}.` : ''; })(),
    ].filter(Boolean).join('\n');
  };
  sim.chatPrompt = (sp, to, heard) => sim.identityFor(sp) + '\n' + sim.chatTurn(sp, to, heard);
  sim.applyChat = (sp, to, dec) => {
    if (!sp || !to || !sp.alive || !dec || typeof dec !== 'object' || !dec.say) return null;
    const raw = String(dec.say).replace(/\s+/g, ' ').trim(), text = raw.length <= 240 ? raw : wholeSentences(raw) || raw.slice(0, 240).replace(/\s+\S*$/, '') + '…';
    log('talk', `${sp.name} ${dec.whisper ? 'whispers to' : 'to'} ${to.id === 'player' ? 'you' : to.name}: "${text}"`, [sp.id, to.id]);
    sp.bubble = { text, t: sim.t };
    // talking stops you where you stand (unless you're in a fight or in jail)
    for (const [x, y] of [[sp, to], [to, sp]]) if (x.brain !== 'human' && conscious(x) && !x.fight && !(x.jailedUntil > 0)) { if (dec.end) { if (x.task?.kind === 'talk') x.task = null; } else setTask(x, 'talk', { with: y.id, until: sim.t + 6 }); }
    heardBy(to, keywords(text), true); if (to.brain !== 'human') to.alert = true;
    if (dec.do) { const step = { do: String(dec.do).slice(0, 80) }; (sp.agenda ||= []).unshift(step); if (!sp.fight && !(sp.jailedUntil > 0)) { sp.task = null; choose(sp); } log('life', sp.agenda[0] !== step ? `${sp.name} goes to ${sp.lastStep}.` : `${sp.name} wants to ${step.do}, but can't right now.`, [sp.id]); }
    if (sp.offerFrom && sp.offerFrom.from === to.id && typeof dec.accept === 'boolean') { const of = sp.offerFrom; sp.offerFrom = null; if (dec.accept && canGive(sp, of.offer.want) && canGive(to, of.offer.give)) settleDeal(to, sp, of.offer); else log('trade', `${sp.name} turns down ${to.name}'s ${of.offer.threat ? 'demand' : 'offer'}.`, [sp.id, to.id]); }
    if (dec.offer && typeof dec.offer === 'object') makeOffer(sp, to, dec.offer);
    learnPhrase(sp, to, sp.lastHeard?.[to.id] || null, text); (to.lastHeard ||= {})[sp.id] = text;
    hearWords(sp, text);
    dataRow({ type: 'talk', day: sim.day, role: roleOf(sp), toRole: roleOf(to), sit: situation(sp), words: wordsNow(sp), heard: sp.lastHeard?.[to.id] ? slotify(sp.lastHeard[to.id], to, sp) : null, said: slotify(text, sp, to), src: 'ai' }); (sp.saidTo ||= {})[to.id] = sim.t;
    if (typeof dec.feeling === 'number') { const r = R(sp, to); r.like = clamp(r.like + (clamp(dec.feeling, -1, 1) - r.like) * 0.15, -1, 1); }
    remember(to, { text: `${sp.name} told me: "${text}"`, told: true });
    if (dec.note) remember(sp, { text: String(dec.note).slice(0, 160) });
    const picked = Array.isArray(dec.hearers) ? dec.hearers.map(String) : null;
    for (const w of living()) if (w !== sp && w !== to && w.kind === 'human' && !dec.whisper && (!picked || picked.includes(w.id)) && inEarshot(w, sp)) remember(w, { text: picked ? `${sp.name} told ${to.name} and me: "${text.slice(0, 200)}"` : `I overheard ${sp.name} tell ${to.name}: "${text.slice(0, 200)}"`, told: !!picked, heard: !picked });
    if (!dec.whisper && /\bguard!/i.test(text)) hueAndCry(sp);
    return text;
  };
  sim.thinks = thinks;
  // ---- deals --------------------------------------------------------------------
  const FAVORS = ['join_party', 'vote_for_me', 'work_for_me', 'keep_quiet', 'marry_me'];
  function cleanSide(x) {
    if (!x || typeof x !== 'object') return null;
    if (x.coin != null) return { coin: Math.max(0, Math.min(50000, Math.round(parseMoney(x.coin, 0)))) };
    if (x.item && GOODS[x.item]) return { item: x.item, n: Math.max(1, Math.min(20, Math.round(+x.n || 1))) };
    if (FAVORS.includes(x.favor)) return { favor: x.favor };
    return null;
  }
  const sideText = x => !x ? 'nothing' : x.coin != null ? money(x.coin) : x.item ? `${x.n} ${GOODS[x.item].name.toLowerCase()}` : x.favor.replace(/_/g, ' ');
  function offerText(o) { return `${o.threat ? 'DEMAND' : 'offer'}: they give ${sideText(o.give)}, they want ${sideText(o.want)}`; }
  sim.offerText = offerText;
  const sideValue = (x, who) => !x ? 0 : x.coin != null ? x.coin / 10 : x.item ? priceOf(GOODS[x.item].shop || 'store', x.item) * x.n / 10 : { join_party: 3, vote_for_me: 2 + who.traits.honesty * 4, work_for_me: 4, keep_quiet: 3 + who.traits.honesty * 6, marry_me: 30 }[x.favor] || 3;
  const canGive = (p, x) => !x || (x.coin != null ? p.coin >= x.coin : x.item ? (p.items[x.item] || 0) >= x.n : true);
  // a plain brain weighing an offer: is what I get worth more to me than what I give, liking and fear included?
  function judgeOffer(to, from, o) {
    if (!canGive(to, o.want)) return false;
    if (o.threat) {
      const r = d(20) + from.skills.intimidate + Math.floor(power(from) / 5), dc = 10 + to.level + mod(to.st.wis) + Math.floor(power(to) / 5);
      if (r >= dc) { bump(to, from, 'fear', 0.3); return true; }
      return false;
    }
    if (o.want?.favor === 'marry_me') return !to.spouse && !from.spouse && R(to, from).like * 2 + attracted(to, from) + seen(to, from).worth * 0.02 * to.traits.greed - 1 > 0;
    return sideValue(o.give, to) * (1 + to.traits.greed * 0.3) + R(to, from).like * 3 - sideValue(o.want, to) + rnd(-1, 1) > 0;
  }
  function settleDeal(from, to, o) {
    const move = (a, b, x) => { if (!x) return; if (x.coin != null) pay(a, b, x.coin, 'deal'); else if (x.item) { a.items[x.item] -= x.n; if (GOODS[x.item].weapon && a.weapon === GOODS[x.item].weapon && !a.items[x.item]) a.weapon = 'fists'; b.items[x.item] = (b.items[x.item] || 0) + x.n; } };
    const favor = (doer, forWhom, f) => {
      if (f === 'join_party') joinParty(doer, forWhom, 'company', 0);
      if (f === 'vote_for_me') (doer.voteBribes ||= {})[forWhom.id] = (doer.voteBribes[forWhom.id] || 0) + 4;
      if (f === 'work_for_me') { const own = JOBS[forWhom.job]?.owner, hand = { bakery: 'bakehand', store: 'shophand', smithy: smithHand(), tavern: 'server', farm: 'farmhand', ranch: 'ranchhand' }[own]; if (hand && doer.job === 'none') { doer.job = hand; log('life', `${doer.name} goes to work for ${forWhom.name} (${JOBS[hand].title.toLowerCase()}).`, [doer.id, forWhom.id]); } }
      if (f === 'keep_quiet') { (doer.hush ||= {})[forWhom.id] = Math.random() < 0.4 + 0.6 * doer.traits.honesty; doer.toReport = (doer.toReport || []).filter(e => e.actor !== forWhom.id || !doer.hush[forWhom.id]); }
      if (f === 'marry_me') marry(doer, forWhom);
    };
    move(from, to, o.give); move(to, from, o.want);
    if (o.give?.favor) favor(from, to, o.give.favor);
    if (o.want?.favor) favor(to, from, o.want.favor);
    log(o.threat ? 'crime' : 'trade', `${to.id === 'player' ? 'You' : to.name} ${o.threat ? 'give in to' : 'agree to'} ${from.id === 'player' ? 'your' : from.name + "'s"} ${o.threat ? 'demand' : 'deal'}: ${sideText(o.give)} for ${sideText(o.want)}.`, [from.id, to.id]);
    if (o.threat) deed('extortion', from, to, to);
    remember(to, { text: `${o.threat ? 'gave in to' : 'made a deal with'} ${from.name}: ${sideText(o.give)} for ${sideText(o.want)}` }); remember(from, { text: `deal with ${to.name}: ${sideText(o.give)} for ${sideText(o.want)}` });
    dataRow({ type: 'deal', day: sim.day, from: roleOf(from), to: roleOf(to), give: o.give, want: o.want, threat: !!o.threat, ok: true });
  }
  // an offer made in a line of talk: the other side answers (Rose by a card; a plain brain at once; an AI in its next line)
  function makeOffer(from, to, raw) {
    const o = { give: cleanSide(raw.give), want: cleanSide(raw.want), threat: !!raw.threat };
    if (!o.give && !o.want) return;
    if (!canGive(from, o.give)) return;
    if (to.id === 'player') { sim.pendingOffer = { from: from.id, offer: o, t: sim.t }; sim.onOffer?.(sim.pendingOffer); return; }
    to.offerFrom = { from: from.id, offer: o, t: sim.t };
    if (!thinks(to)) { const yes = judgeOffer(to, from, o); to.offerFrom = null; if (yes) settleDeal(from, to, o); else { log('trade', `${to.name} turns down ${from.name}'s ${o.threat ? 'demand' : 'offer'} (${sideText(o.give)} for ${sideText(o.want)}).`, [from.id, to.id]); if (o.threat && from.traits.aggression > 0.6 && conscious(from)) startFight(from, to, { mode: 'nonlethal', why: 'refused a demand' }); } }
  }
  sim.offerAnswer = (yes) => {
    const po = sim.pendingOffer; sim.pendingOffer = null; const me = sim.people.player, from = po && sim.people[po.from];
    if (!po || !from || !from.alive) return 'They\'ve gone.';
    if (!yes) { bump(from, me, 'like', -0.05); if (po.offer.threat && from.traits.aggression > 0.6 && conscious(from)) { startFight(from, me, { mode: 'nonlethal', why: 'refused a demand' }); return `You refuse ${from.name}. They don't take it well.`; } return `You turn ${from.name} down.`; }
    if (!canGive(me, po.offer.want)) return 'You can\'t give what they want.';
    settleDeal(from, me, po.offer); return 'Done.';
  };
  sim.judgeOffer = judgeOffer; sim.makeOffer = makeOffer;
  sim.applyDecision = (p, kind, dec) => {
    if (!p || !p.alive || !dec || typeof dec !== 'object') return;
    const own = JOBS[p.job]?.owner && sim.business[JOBS[p.job].owner];
    if (own && dec.prices && typeof dec.prices === 'object') for (const [k, v] of Object.entries(dec.prices)) if (k in GOODS && typeof v === 'number') own.mult[k] = clamp(v, 0.5, 4);
    if (own && dec.discounts && typeof dec.discounts === 'object') { own.discounts = {}; for (const [k, v] of Object.entries(dec.discounts)) if (typeof v === 'number' && v > 0 && (DISC_KEYS.includes(k) || sim.people[k])) own.discounts[k] = clamp(v, 0, 0.9); if (Object.keys(own.discounts).length) log('trade', `${p.name} at ${/^the /i.test(AREAS[own.id]?.name || '') ? '' : 'the '}${AREAS[own.id]?.name || own.id} offers ${discText(own.discounts)}.`, [p.id]); }
    if (kind === 'mayor') sim.applyMayor(p, dec);
    if (kind !== 'mayor' && p.id === sim.captainId && dec.orders) { const d = orderGuards(p, dec.orders); if (d.length) log('law', `Captain ${p.name} orders the guard: ${d.join('; ')}.`, [p.id]); }
    if (dec.crew_orders && isBoss(p)) crewOrders(p, dec.crew_orders);
    if (dec.rent_out != null) { const n = clamp(Math.round(parseMoney(typeof dec.rent_out === 'object' ? Object.values(dec.rent_out)[0] : dec.rent_out, 20)), 10, 50); for (const i of housesOf(p)) { HOUSES[i].ask = n; HOUSES[i].askSet = true; } if (housesOf(p).length) log('trade', `${p.name} asks ${money(n)} a night for a bed.`, [p.id]); }
    if (dec.first_class && p.firstPick) { const c = String(dec.first_class).toLowerCase().replace(/[^a-z]/g, ''); if (PC[c]) { setFirstClass(p, c, dec.feat, true); p.firstPick = false; } }
    if (dec.level_class && p.levelReady) levelUp(p, String(dec.level_class).toLowerCase().replace(/[^a-z]/g, ''), dec.feat, true);
    p.awaiting = null;
    if (Array.isArray(dec.agenda)) { p.agenda = dec.agenda.slice(0, 5).map(x => ({ do: String(typeof x === 'object' ? x.do || x.step || '' : x).slice(0, 80) })).filter(x => x.do); if (p.agenda.length && p.task && !['jail', 'fight', 'flee', 'sleep'].includes(p.task.kind)) p.task = null; }
    if (dec.policy && typeof dec.policy === 'object') { p.policy = {}; for (const [k, v] of Object.entries(dec.policy)) if (typeof v === 'number') p.policy[k] = clamp(v, 0, 3); dataRow({ type: 'policy', day: sim.day, sit: situation(p), role: roleOf(p), x: xOf(p), words: wordsNow(p), traits: traitsOf(p), policy: p.policy, brain: p.brain, persona: !!p.persona }); }
    if (Array.isArray(dec.agenda) && dec.agenda.length) dataRow({ type: 'agenda', day: sim.day, sit: situation(p), role: roleOf(p), x: xOf(p), words: wordsNow(p), agenda: dec.agenda.slice(0, 5).map(a => String(typeof a === 'object' ? a.do || '' : a).slice(0, 80)), why: kind });
    if (dec.say) log('talk', `${p.name}: "${String(dec.say).slice(0, 200)}"`, [p.id]);
    if (dec.write_board) { const tx = boardText(String(dec.write_board)); if (tx) { if (areaOf(p) === 'square' && free(p)) postBoard(p, tx); else (p.agenda ||= []).unshift({ do: 'write ' + tx }); } }
    if (dec.platform && (sim.election.candidates.includes(p.id) || p.id === sim.mayorId)) { const pl = String(dec.platform).slice(0, 160); if (pl !== p.platform) { p.platform = pl; log('politics', `${p.name}'s platform: "${pl}"`, [p.id]); learnWords(pl); } }
    if (dec.vote_for && sim.people[dec.vote_for]?.alive) p.voteFor = dec.vote_for;
    if (dec.captain_vote && sim.people[dec.captain_vote]?.alive) p.captainVote = dec.captain_vote;
    if (dec.fighting && typeof dec.fighting === 'object') { p.fightStyle = { shout: typeof dec.fighting.shout === 'boolean' ? dec.fighting.shout : null, blows: dec.fighting.blows === 'nonlethal' ? 'nonlethal' : dec.fighting.blows === 'lethal' ? 'lethal' : null, fleeBelow: typeof dec.fighting.flee_below === 'number' ? clamp(dec.fighting.flee_below, 0, 1) : null, surrender: typeof dec.fighting.surrender === 'boolean' ? dec.fighting.surrender : null }; if (p.fightStyle.blows) p.prefMode = p.fightStyle.blows; }
    if ((p.job === 'smith' || p.job === 'journeyman' || p.job === 'apprentice') && dec.forge != null) {
      if (dec.forge === 'no weapons' || dec.forge === 'none' && false) { p.noWeapons = true; p.forgeOnly = null; }
      else if (Array.isArray(dec.forge)) { p.forgeOnly = dec.forge.filter(k => FORGEABLE.includes(k) || GOODS[k]?.bundle).slice(0, 12); p.noWeapons = false; }
      else if (dec.forge === 'anything') { p.noWeapons = false; p.forgeOnly = null; }
      log('trade', `${p.name} at the smithy: ${p.noWeapons ? 'no more weapons' : p.forgeOnly ? 'making ' + p.forgeOnly.join(', ') : 'making whatever sells'}.`, [p.id]);
    }
    if (dec.boss_vote && sim.people[dec.boss_vote]?.alive) p.bossVote = dec.boss_vote;
    if (dec.stand === true) (p.agenda ||= []).unshift({ do: 'stand for mayor' });
  };
  // ---- AI bodies wait for orders -----------------------------------------------------
  // With sim.aiOnly on, an AI-played body does only what its LLM said; when it has nothing left to
  // do, or something happens to it, it stands still and asks.
  sim.aiOnly = false;
  function askOrders(p, why) {
    if (!conscious(p)) return;   // out cold, dying or dead: no turn
    if (p.awaiting && sim.t - p.awaiting < 60) return;
    p.awaiting = sim.t;
    const kind = p.id === sim.mayorId ? 'mayor' : 'plan';
    const turn = (why ? `WHAT JUST HAPPENED: ${why}\n` : '') + sim.turnFor(p, kind);
    const q = { id: p.id + '-w' + Math.floor(sim.t), person: p.id, kind, brain: p.brain, prompt: sim.identityFor(p) + '\n' + turn, turn, waiting: true, fallback: () => { p.awaiting = null; p.aiDownUntil = sim.t + 30; sim.aiMissed = (sim.aiMissed || 0) + 1; } };
    sim.decisionsPending.push(q); sim.onDecision?.(q);
  }
  sim.askOrders = askOrders;
  const waitsForOrders = p => sim.aiOnly && thinks(p) && p.brain !== 'human' && !(p.aiDownUntil > sim.t);
  sim.waitsForOrders = waitsForOrders;
  function morning() {
    for (const p of living()) {
      if (p.brain === 'script' || p.brain === 'human') { if (p.id === sim.mayorId && p.brain === 'script') scriptedMayor(p); continue; }
      const kind = p.id === sim.mayorId ? 'mayor' : 'plan';
      const q = { id: p.id + '-' + sim.day, person: p.id, kind, brain: p.brain, prompt: sim.decisionFor(p, kind), turn: sim.turnFor(p, kind), fallback: () => { if (kind === 'mayor' && p.brain === 'script') scriptedMayor(p); } };   /* an AI mayor whose answer doesn't come keeps their own policy: the computer never decides for them (Rose) */
      sim.decisionsPending.push(q);
      if (sim.onDecision) sim.onDecision(q);
    }
  }

  // =================================================================== tick ==
  let lastHour = Math.floor(sim.t / 60), lastDay = Math.floor(sim.t / 1440);
  sim.step = dtMin => {
    separate();
    for (const q of living()) if (q.carriedBy && sim.bounty[q.id] && areaOf(q) === 'station' && !(q.jailedUntil > 0)) { const c = sim.people[q.carriedBy]; drop(q); if (c?.carrying === q.id) c.carrying = null; if (c?.task?.kind === 'haul') c.task = null; jail(q, c); }
    sim.t += dtMin;
    if (!sim.begun) townBegins();
    if (Math.floor(sim.t / 5) !== Math.floor((sim.t - dtMin) / 5)) nightWatch();
    checkWards();
    if (Math.floor(sim.t / 5) !== Math.floor((sim.t - dtMin) / 5)) checkDeputies();
    while (later.length) later.shift()();
    settleTalk();
    const hourNow = Math.floor(sim.t / 60), dayNow = Math.floor(sim.t / 1440);
    if (dayNow !== lastDay) { lastDay = dayNow; dailyTick(); }
    if (sim.pendingInvite && sim.t - sim.pendingInvite.t > 30) { const L = sim.people[sim.pendingInvite.leader]; if (L && !living().some(q => q !== L && q.party === L.party)) L.party = null; sim.pendingInvite = null; sim.onInvite?.(null); }
    if (hourNow !== lastHour) {
      lastHour = hourNow;
      const h = hourNow % 24;
      payWages(h);
      if (h === 7) morning();
      housingHour(h);
      { const pelts = (sim.business.store.stock.wolfpelt || 0) + (sim.business.store.stock.bearpelt || 0) + (sim.business.store.stock.trollhide || 0), lw = living().some(q => q.job === 'leatherworker'); for (const p of living()) if (p.kind === 'human' && p.job === 'none' && !p.town && !thinks(p) && p.brain !== 'human' && conscious(p) && (Object.keys(TAN).some(k => p.items[k] > 0) || pelts >= 2 && !lw && p.coin >= 5) && Math.random() < 0.15) { p.job = 'leatherworker'; log('life', `${fullName(p)} sets up as a leatherworker.`, [p.id]); break; } }
      if (h === 23) sim.nightWatch = living().filter(p => p.kind === 'human' && !p.town && p.id !== 'player').map(p => { const a = AREAS[areaOf(p)]; return { id: p.id, where: a?.house ? 'their house on Wick Lane' : (a?.name || 'the road'), doing: p.state === 'sleep' ? 'asleep' : p.fight ? 'fighting' : p.task?.kind || p.state || 'idle', guard: isGuard(p) }; });
      if (h === 6 && sim.nightWatch) { for (const w of sim.nightWatch) (sim.genLog ||= []).push({ t: 'night', day: sim.day - 1, where: w.where, doing: w.doing, lived: !!sim.people[w.id]?.alive }); sim.nightWatch = null; }
      if (h === 6) for (const p of living()) if (p.kind === 'human' && !p.town) gainXP(p, 100, 'the night');
      for (const p of living()) if (p.levelReady && sim.t - (p.levelReadyAt || 0) > 720) autoLevel(p);
      for (const p of living()) if (p.firstPick && p.brain !== 'human' && sim.t - (p.firstPickAt || 0) > 720) p.firstPick = false;
      if (h === 19) { const m = sim.people[sim.mayorId]; if (m && conscious(m) && m.brain !== 'script' && m.brain !== 'human') { const q = { id: m.id + '-e' + sim.day, person: m.id, kind: 'mayor', brain: m.brain, prompt: sim.decisionFor(m, 'mayor'), turn: sim.turnFor(m, 'mayor'), fallback: () => {} }; sim.decisionsPending.push(q); sim.onDecision?.(q); } }
      if (h === 0) { const m = sim.people[sim.mayorId]; if (m && conscious(m) && m.brain !== 'script' && m.brain !== 'human') { const turn = `WHAT JUST HAPPENED: Midnight. The day's books are closed: the treasury holds ${money(Math.round(sim.treasury))}. Set the taxes for the new day (tax_rate, rent, head_tax), and anything else you want.\n` + sim.turnFor(m, 'mayor'); const q = { id: m.id + '-tax' + sim.day, person: m.id, kind: 'mayor', brain: m.brain, prompt: sim.identityFor(m) + '\n' + turn, turn, must: true, fallback: () => {} }; sim.decisionsPending.push(q); sim.onDecision?.(q); } }   /* Rose: the mayor sets taxes every night at 12 */
      if (h === 12 && sim.election.due) runElection();
      standIns();
      if (sim.beastAt && sim.t >= sim.beastAt) { invade(!sim.invaded); sim.invaded = true; sim.beastAt = null; }
      // every night at 22:00 something comes out of the Wildwood (Rose, 2026-10-10)
      if (sim.lastBeastNight !== sim.day && sim.t % 1440 >= 22 * 60) { sim.lastBeastNight = sim.day; invade(!sim.invaded); sim.invaded = true; }   // (this block runs on the hour, so: 22:00)
      diseaseHour();
      for (const p of living()) if (p.kind === 'human' && !thinks(p) && p.brain !== 'human' && conscious(p) && !isGuard(p) && !p.fight) {
        const q = living().find(q => q !== p && q.kind === 'human' && sim.bounty[q.id] && conscious(q) && !(q.jailedUntil > 0) && !(p.cd?.['tip:' + q.id] > sim.t) && dist2(q, p) < 15 && sees(p, q));
        if (q && !(p.gang && p.gang === q.gang) && R(p, q).like < 0.4 && Math.random() < 0.1 + p.traits.honesty * 0.4 - R(p, q).fear * 0.3) ratOut(p, q);
      }
      if (h === 18 && isElectionDay(sim.day)) guardVote('the daily vote');
      if (h === 21 && isElectionDay(sim.day)) for (const g of Object.values(sim.gangs)) gangVote(g, 'the nightly reckoning');
      for (const p of living()) if (!waitsForOrders(p) && p.task && (p.agenda?.length && !['jail', 'flee', 'talk', 'tail'].includes(p.task.kind) || !['jail', 'sleep', 'work', 'flee', 'follow', 'caravan', 'fish', 'tail', 'talk'].includes(p.task.kind)) && sim.t - p.task.t0 > 60) p.task = null;   // replan hourly
    }
    for (const p of living()) {
      if (p.kind !== 'human') continue;
      p.food = Math.max(0, p.food - dtMin / 1440); p.water = Math.max(0, (p.water ?? 1) - dtMin / 720);
      if (p.jailedUntil > 0 && p.water < 0.5) p.water = 1;   // the jailer brings a cup
      if (areaOf(p) === 'healer' || p.carriedBy) p.water = Math.max(p.water, 0.6);   // the infirmary and the stretcher give water
      // thirst wears you down to 1 hp; after that it's days, not hours, before it kills
      if (p.water <= 0) { p.dry = (p.dry || 0) + dtMin; if (p.dry > 1440 && p.hp > 1 && Math.random() < dtMin / 240) p.hp -= 1; if (p.dry > 3 * 1440) { if (p.brain === 'human') { p.hp = -1; p.down = 'out'; p.downUntil = sim.t + 60; p.water = 0.5; p.dry = 0; } else die(p, null, 'thirst'); } } else p.dry = 0;
      // an empty belly takes you off work (a meal break), but doesn't wake you
      if (p.food < 0.12 && p.brain !== 'human' && !waitsForOrders(p) && conscious(p) && !p.fight && !(p.jailedUntil > 0) && p.task?.kind === 'work' && !(p.cd?.meal > sim.t) && !['bakery', 'tavern', 'farm', 'ranch'].includes(JOBS[p.job].owner || JOBS[p.job].payer)) { cool(p, 'meal', 180); p.task = null; }
      // a dry throat wakes you and pulls you off work
      if (p.water < 0.12 && p.brain !== 'human' && !waitsForOrders(p) && conscious(p) && !p.fight && !(p.jailedUntil > 0) && p.task && !['drink', 'flee', 'jail'].includes(p.task.kind) && !p.carriedBy) { if (p.task.kind === 'follow' || p.task.kind === 'caravan' || p.task.kind === 'ambush') { const w = [...SPOTS.wells].sort((a, b) => dist2(p, a) - dist2(p, b))[0]; if (dist2(p, w) > 60) { p.water = 0.5; } else p.task = null; } else p.task = null; }
      if (p.state !== 'sleep') p.rest = Math.max(0, p.rest - dtMin / 60 / 18);
      if (p.state !== 'sleep' && Math.random() < dtMin / 8) p.yaw = (p.yaw || 0) + rnd(-1.6, 1.6);
      if (p.items.finery && Math.random() < dtMin / 120) showWealth(p, 70, 0.05);
      if (p.food <= 0) { p.starve = (p.starve || 0) + dtMin; if (p.starve > 3 * 1440 && p.hp > 1 && Math.random() < dtMin / 1440) p.hp -= 1; if (p.starve > 21 * 1440) { if (p.brain === 'human') { p.hp = -1; p.down = 'out'; p.downUntil = sim.t + 60; p.food = 0.3; p.starve = 0; } else die(p, null, 'starvation'); } } else p.starve = 0;
      if (p.nl > 0 && !p.fight && p.down !== 'out' && !p.dying) { p.bruiseHeal = (p.bruiseHeal || 0) + dtMin * (p.level || 1) / 60; if (p.bruiseHeal >= 1) { const h = Math.min(p.nl, Math.floor(p.bruiseHeal)); p.bruiseHeal -= Math.floor(p.bruiseHeal); p.nl -= h; p.hp = Math.min(p.maxhp, p.hp + h); } }   // bruising heals 1 hp per level per hour (SRD)
      if (p.down === 'spell' && !p.fight && sim.t >= (p.downUntil || 0)) { p.down = null; p.sprayed = false; }
      if (p.down === 'out' && sim.t >= (p.downUntil || 0) && (p.hp > 0 || !p.dying && (p.nl > 0 || p.brain === 'human'))) { p.down = null; if (p.hp < 1) { p.nl = Math.max(0, p.nl - (1 - p.hp)); p.hp = 1; } if (p.state === 'idle' || p.state === 'fight') p.task = null; }
      if (p.jailedUntil > 0 && waitsForOrders(p) && !p.awaiting && !(p.cd?.jailask > sim.t)) { cool(p, 'jailask', 180); askOrders(p, 'You are locked in a cell at the guard station.'); }
      if (p.jailedUntil > 0 && p.agenda?.length && /^(escape|break)/.test(p.agenda[0].do)) { p.agenda.shift(); tryEscape(p, true); }
      if (p.jailedUntil > 0) { if (sim.t >= p.jailedUntil) { p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); log('law', `${fullName(p)} is released from jail.`, [p.id]); } else { if (p.brain !== 'human' && night() && Math.random() < dtMin / 600) tryEscape(p); continue; } }
      if (p.brain === 'human' && JOBS[p.job]?.from != null && inShift(p.job, H()) && areaOf(p) === JOBS[p.job].place && conscious(p) && !p.fight) p.worked = (p.worked || 0) + dtMin;
      if (p.brain === 'human' && p.task?.kind === 'sleep' && conscious(p) && !p.fight && !p.carriedBy) { doTask(p, dtMin); if (!p.task && p.state === 'sleep') p.state = 'idle'; continue; }   // you can sleep too
      if (p.fight || p.brain === 'human' || !conscious(p) || p.carriedBy) continue;
      doTask(p, dtMin);
      if (!p.task) choose(p);
      else if (waitsForOrders(p) && sim.onChat && !(p.cd?.chat > sim.t) && Math.random() < dtMin / 30) {
        const q = living().find(q => q !== p && thinks(q) && q.brain !== 'human' && conscious(q) && !q.fight && !(q.cd?.chat > sim.t) && dist2(q, p) < 3 && sees(p, q) && sees(q, p));
        if (q) { cool(p, 'chat', 480); cool(q, 'chat', 480); sim.onChat({ a: p.id, b: q.id }); }
      }
      if (!p.task) {}
      else if (waitsForOrders(p)) { if (p.alert) { p.alert = false; const m = p.memory.slice(-1)[0]; askOrders(p, m?.text || (m?.ev ? memText(m) : 'something caught your attention')); } }
      else if (p.alert || sim.t >= (p.nextLook || 0)) { p.nextLook = sim.t + 5 + Math.random() * 3; reconsider(p); }
    }
    // animals: follow their people, eat, sleep
    for (const an of Object.values(sim.animals)) {
      if (!an.alive || an.fight) continue;
      if (an.down === 'spell') { if (sim.t >= (an.downUntil || 0)) { an.down = null; an.sprayed = false; } else continue; }
      if (an.familiar) { const o = sim.people[an.owner]; if (!o || !o.alive) { an.alive = false; continue; } an.x = o.x + 0.5; an.z = o.z + 0.3; continue; }   // at its master's heel
      if (an.calmUntil > sim.t) { stepToward(an, P(-125, clamp(an.z, -20, 20)), 4, dtMin); continue; }   // calmed by wild empathy: back to the Wildwood
      an.full = Math.max(0, an.full - dtMin / 60 / 10);
      const own = sim.people[an.owner];
      if (an.monster) { prowl(an, dtMin); continue; }   // beasts of the Wildwood hunt; the learned animal mind (wander, graze...) is for pets, game and stock
      if (sim.animalMinds) {
        if (!an.noise) aMutate(an);
        if (an.monster && an.hp < an.maxhp * 0.3 && !an.act) an.act = 'flee';
        if (sim.t >= (an.nextThink || 0) || an.hurtAt && sim.t - an.hurtAt < 0.6 && an.lastHurtSeen !== an.hurtAt) { an.lastHurtSeen = an.hurtAt; aDecide(an); }
        aDo(an, dtMin);
        if (an.livestock || an.game) { if (['fields', 'ranch', 'wood'].includes(areaOf(an)) && an.act !== 'flee') an.full = Math.min(1, an.full + dtMin / 600); }
      }
      else if (an.monster) { prowl(an, dtMin); continue; }
      if (sim.animalMinds) { /* feeding time below still applies */ }
      else if (an.livestock) { if (Math.random() < dtMin / 40) an.goal = randIn('ranch', 3); if (an.goal) stepToward(an, an.goal, 0.5, dtMin); continue; }
      if (an.game) { if (Math.random() < dtMin / 20) an.goal = randIn('wood', 2); if (an.goal) stepToward(an, an.goal, an.species === 'rabbit' ? 1.2 : 0.8, dtMin); continue; }
      if (sim.animalMinds) {}
      else if (own && own.alive && an.species === 'dog') { if (dist2(an, own) > 2.5) stepToward(an, own, 1.8, dtMin); }
      else if (Math.random() < dtMin / 30) { an.goal = randIn(an.species === 'goat' ? 'fields' : an.species === 'fox' ? 'fields' : areaOf(an) || 'square'); }
      if (an.goal && !sim.animalMinds) stepToward(an, an.goal, 1.0, dtMin);
      if (own && own.alive && H() >= 18 && H() < 19 && an.full < 0.7 && dist2(own, an) < 10 && conscious(own)) {
        const word = (own.petWord ||= pick(['dinner', 'supper', 'grub', 'food', 'treat', 'eat up']));
        const line = `${an.name}, ${word}!`; log('talk', `${own.name}: "${line}"`, [own.id, an.id]); own.bubble = { text: line, t: sim.t };
        hearWords(own, line); an.full = 0.9; petEvent(an, 'food'); (an.bond[own.id] = Math.min(1, (an.bond[own.id] || 0) + 0.02));
      } else if (own && own.alive && H() >= 19 && H() < 20 && an.full < 0.5) an.full = 0.7;
    }
    // bodies on the street frighten people a little
    for (const b of sim.bodies) if (!b.buried) for (const q of living()) if (q.kind === 'human' && dist2(q, b) < 8) q.mood = Math.max(0, q.mood - dtMin * 0.0005);
  };
  function tryEscape(p, chosen) {
    if (chosen) { if (p.triedEscape && sim.t - p.triedEscape < 120) return; p.triedEscape = sim.t; }
    const jailer = living().find(g => g.job === 'jailer' && onDuty(g) && areaOf(g) === 'station');
    if (jailer) { if (p.coin >= 30 && (chosen || p.traits.honesty < 0.6) && acceptsBribe(jailer, p.coin)) { pay(p, jailer, p.coin); p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); log('law', `${jailer.name} takes a bribe and lets ${p.name} out of the cell.`, [jailer.id, p.id]); } return; }
    const r = d(20) + Math.max(p.skills.openlock + (p.items.picks ? 2 : -4), p.skills.escape);
    if (r >= 22) { p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); deed('jailbreak', p, null, SPOTS.desk); log('law', `${fullName(p)} breaks out of jail!`, [p.id]); }
  }

  // ======================================================== the player ==
  // Rose acts through the same rules as everyone. Each returns a line for the log.
  // Every verb Rose has, anyone has: the same code, the same dice. (Rose's buttons call it for her.)
  sim.playerDo = (kind, tid, extra = {}) => sim.doAs(sim.people.player, kind, tid, extra);
  sim.doAs = (me, kind, tid, extra = {}) => {
    const t = tid ? (sim.people[tid] || sim.animals[tid]) : null;
    if (CRIME_VERBS.has(kind) && !inUnderworld(me)) return 'That takes a place in the underworld.';
    if (kind === 'wake') return wakeNear(me, t && t.kind === 'human' ? t : null, 15, extra.why);
    if (kind === 'ring') return ringAlarm(me);
    if (kind === 'alarm') return castAlarm(me);
    if (kind === 'deputize') return deputize(me, t, extra.text);
    if (kind === 'standdown') return standDown(me, 'handed it back');
    if (kind === 'formation') return setFormation(me, extra.text);
    if (kind === 'stayup') { const hh = parseFloat(String(extra.text || '').match(/\d+(\.\d+)?/)?.[0]); me.stayUpUntil = sim.t + (hh > 0 ? Math.min(24, hh) : 8) * 60; if (me.task?.kind === 'sleep') me.task = null; if (me.state === 'sleep') me.state = 'idle'; return 'You stay awake.'; }
    if (kind === 'calm') { if (me.fight) return 'In a fight, use the fight menu.'; const b = t || Object.values(sim.animals).filter(a => a.alive && a.monster).sort((x, y) => dist2(x, me) - dist2(y, me))[0]; return calmBeast(me, b, null); }
    if (kind === 'familiar') return giveFamiliar(me, (String(extra.text || '').toLowerCase().match(/[a-z]+/g) || []).find(w => FAMILIAR_KINDS[w]) || '');
    if (kind === 'favored') { if (!clvl(me, 'ranger')) return 'Only a ranger has a favoured enemy.'; if (me.favoredSet) return `Your favoured enemy is ${me.favored}.`; const x = String(extra.text || '').toLowerCase(); me.favored = /giant|ogre|troll/.test(x) ? 'giants' : /people|human|man|men|folk/.test(x) ? 'people' : 'beasts'; me.favoredSet = true; return `Your favoured enemy: ${me.favored} (+2 damage against them).`; }
    if (kind === 'enlist') return enlist(me, corpsWord(String(extra.text || '').toLowerCase()));
    if (kind === 'sleep') { if (!free(me) || me.fight) return 'You can\'t sleep right now.'; const hh = parseFloat(String(extra.text || '').match(/\d+(\.\d+)?/)?.[0]); startTask(me, { kind: 'sleep', hours: hh > 0 ? Math.min(12, hh) : null }); return me.home != null ? 'You head to bed.' : 'You find a spot to lie down.'; }
    if (kind === 'pool') return startPool(me, extra.text || '');
    if (kind === 'chipin') return chipIn(me, extra.text || '', extra.amount);
    if (kind === 'class') { const c = String(extra.cls || '').toLowerCase(); if (!PC[c]) return `No such class. Classes: ${Object.keys(PC).join(', ')}.`; if (me.firstPick) { me.firstPick = false; setFirstClass(me, c, extra.feat, true); return `You are a level 1 ${c} now.`; } if (me.levelReady) return levelUp(me, c, extra.feat, true) ? `You take level ${me.level} as a ${c}.` : "That class won't do."; return 'You have no level to choose right now.'; }
    if (kind === 'escape') { if (!(me.jailedUntil > 0)) return 'You are not locked up.'; const was = me.jailedUntil; tryEscape(me, true); return me.jailedUntil > 0 ? 'The cell holds.' : (was ? 'You are out.' : ''); }
    const jailTalk = me && me.jailedUntil > 0 && conscious(me) && ['talk', 'say', 'bribe', 'persuade', 'give', 'intimidate', 'lie'].includes(kind);   // a cell has bars, not a gag
    if (!me || (!free(me) && !jailTalk)) return 'You can\'t do that right now.';
    const near = (r = 2) => t && dist2(me, t) <= r;
    const d20r = () => d(20);
    switch (kind) {
      case 'talk': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const r = d20r() + me.skills.diplomacy; bump(t, me, 'like', r >= 12 ? 0.06 : 0.01); bump(t, me, 'trust', 0.02); bump(me, t, 'like', 0.03);
        const said = me.memory?.slice(-1)[0]?.said, heard = sim.learning && Math.random() < 0.4 ? babble(said) : null;
        if (!thinks(t)) { const said2 = plainSay(t, me, me.memory?.slice(-1)[0]?.text || null); if (said2) return `You chat with ${t.name}. (Diplomacy ${r})`; }
        const line = heard || (R(t, me).like > 0.3 ? 'Good to see you.' : R(t, me).like < -0.3 ? 'What do you want, city girl?' : pick(['Hm. The stranger.', 'Afternoon.', 'You\'re not from here.', 'Mind yourself in Hollow Town.']));
        log('talk', `${t.name}: "${line}"`, [t.id, me.id]); return `You chat with ${t.name}. (Diplomacy ${r})`;
      }
      case 'say': {
        const text = String(extra.text || '').slice(0, 200); if (!text) return '';
        const to = extra.to && sim.people[extra.to], aimed = !!(to && to !== me && to.alive && to.kind === 'human' && dist2(to, me) < 8);
        const whisper = !!extra.whisper;
        if (whisper && !aimed) return 'Select who you want to whisper to.';
        if (whisper && dist2(to, me) > 2.5) return `Get closer to ${to.name} to whisper.`;
        log('talk', whisper ? `${me.name} whispers to ${to.name}: "${text}"` : aimed ? `${me.name} to ${to.name}: "${text}"` : `${me.name}: "${text}"`, aimed ? ['player', to.id] : ['player']);
        if (!whisper && /^\W*(guard|help)\b.*!|guard!/i.test(text)) hueAndCry(me);
        for (const q of living()) if (q !== me && (whisper ? q === to : inEarshot(q, me))) remember(q, { text: whisper ? `${me.name} whispered to me: "${text}"` : q === to ? `${me.name} said to me: "${text}"` : `${me.name} said: "${text}"` });
        remember(me, { said: (text.toLowerCase().match(/[a-z']{4,}/g) || []).pop() });
        const listener = aimed ? (thinks(to) && conscious(to) && !to.fight ? to : null) : living().filter(q => q !== me && q.kind === 'human' && thinks(q) && !q.fight && inEarshot(q, me)).sort((a, b) => dist2(a, me) - dist2(b, me))[0];
        if (listener && sim.onChat) sim.onChat({ a: 'player', b: listener.id, heard: text });
        else if (aimed) { if (conscious(to) && !to.fight && !thinks(to)) plainSay(to, me, text); }
        else { const plain = living().filter(q => q !== me && !thinks(q) && q.kind === 'human' && conscious(q) && !q.fight && dist2(q, me) < 5 && hears(q, me)).sort((a, b) => dist2(a, me) - dist2(b, me))[0]; if (plain) plainSay(plain, me, text); }
        hearWords(me, text);
        return '';
      }
      case 'bribe': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const n = Math.min(me.coin, extra.amount || 30); if (n < 1) return 'You have nothing to offer.';
        const r = d20r() + me.skills.diplomacy + Math.min(10, Math.round(n / 5)), dc = 10 + Math.round(t.traits.honesty * 15);
        if (r >= dc) { pay(me, t, n); if (isGuard(t)) t.onPayroll = true; bump(t, me, 'like', 0.15); bump(t, me, 'trust', 0.1); (t.voteBribes ||= {})[me.id] = n; if (extra.forWhat === 'record') { openRecord(me).filter(x => x.by.includes(t.id)).forEach(x => x.by = x.by.filter(y => y !== t.id)); } return `${t.name} takes your ${money(n)}. (Diplomacy ${r} vs ${dc})`; }
        if (r <= dc - 5) { const { seen } = deed('bribery', me, t, me); return `${t.name} refuses, loudly. (Diplomacy ${r} vs ${dc})${seen.length ? ' People heard.' : ''}`; }
        return `${t.name} won't take it. (Diplomacy ${r} vs ${dc})`;
      }
      case 'intimidate': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const r = d20r() + me.skills.intimidate + Math.floor(power(me) / 5), dc = 10 + t.level + mod(t.st.wis) + Math.floor(power(t) / 5);
        if (r >= dc) { bump(t, me, 'fear', 0.3); bump(t, me, 'like', -0.1); return `${t.name} backs down. (Intimidate ${r} vs ${dc})`; }
        bump(t, me, 'like', -0.2); if (t.traits.aggression > 0.6 && might(t) > might(me)) startFight(t, me, { mode: 'nonlethal', why: 'called a bluff' }); return `${t.name} isn't scared of you. (Intimidate ${r} vs ${dc})`;
      }
      case 'persuade': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const r = d20r() + me.skills.diplomacy, dc = 15 - Math.round(R(t, me).like * 5);
        if (r >= dc) { bump(t, me, 'like', 0.12); bump(t, me, 'trust', 0.1); return `${t.name} warms to you. (Diplomacy ${r} vs ${dc})`; }
        return `${t.name} isn't moved. (Diplomacy ${r} vs ${dc})`;
      }
      case 'lie': {   // extra: { about, crime, victim } or { about, liar: true }
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const subj = sim.people[extra.about]; if (!subj) return 'About whom?';
        const truth = extra.liar ? false : sim.events.some(e => e.actor === subj.id && e.type === extra.crime);
        const ok = claim(me, t, extra.liar ? { id: 'pc' + Math.random(), kind: 'liar', subject: subj.id, lie: true } : { id: 'pc' + Math.random(), kind: 'accuse', subject: subj.id, victim: extra.victim || null, type: extra.crime || 'theft', lie: !truth });
        return ok ? `${t.name} believes you.` : `${t.name} doesn't buy it, and trusts you less.`;
      }
      case 'propose': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        if (me.spouse || t.spouse) return 'One of you is already married.';
        const yes = R(t, me).like * 2 + attracted(t, me) + me.coin * 0.004 * t.traits.greed - 1 + rnd(-0.3, 0.3);
        if (yes > 0) { marry(me, t); return `${t.name} says yes!`; }
        bump(t, me, 'like', -0.05); return `${t.name} says no.`;
      }
      case 'recruit': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        if (!me.gang) foundGang(me, extra.name);
        recruit(me, t); return t.gang === me.gang ? `${t.name} is in.` : `${t.name} turns you down.`;
      }
      case 'join': { if (!near(3) || !t.gang) return 'They have no crew to join.'; askToJoin(me, sim.people[sim.gangs[t.gang].boss] || t, t.gang); return me.gang ? `You're in ${sim.gangs[me.gang].name}.` : 'They don\'t want you.'; }
      case 'pickpocket': { if (!near(1.6) || t.kind !== 'human') return 'Get closer first.'; const before = me.coin; pickpocket(me, t); return me.coin > before ? `You lift ${money(me.coin - before)} from ${t.name}.` : `${t.name} catches you!`; }
      case 'attack': { if (!near(2.2)) return 'Get closer first.'; me.prefMode = extra.mode || 'lethal'; startFight(me, t, { mode: extra.mode || 'lethal', why: 'you started it' }); return ''; }
      case 'burgle': { const hi = HOUSES.findIndex(h => dist2(me, h.bed) < 3 || areaOf(me) === h.id); if (hi < 0) return 'Stand inside a house first.'; if (hi === me.home) return 'That\'s your own house.'; const before = me.coin; burgle(me, hi); return me.coin > before ? `You find ${money(me.coin - before)}.` : 'Nothing gained.'; }
      case 'buy': { const shop = areaOf(me); if (!shopOpen(shop)) return 'Nobody is minding this shop.'; return buy(me, shop, extra.item, extra.n || 1) ? `You buy ${GOODS[extra.item].name.toLowerCase()}.` : 'You can\'t afford that, or it\'s sold out.'; }
      case 'sell': { const shop = areaOf(me), b = sim.business[shop]; if (!shopOpen(shop) || !b) return 'Nobody is minding this shop.'; if (!(me.items[extra.item] > 0)) return 'You don\'t have that.'; const owner = sim.people[b.owner], price = Math.max(1, Math.floor(GOODS[extra.item].price / 2)); if (!owner || owner.coin < price) return 'They can\'t afford it.'; me.items[extra.item]--; b.stock[extra.item] = (b.stock[extra.item] || 0) + 1; pay(owner, me, price); return `You sell it for ${money(price)}.`; }
      case 'eat': return eatFrom(me) ? 'You eat.' : 'You have nothing to eat.';
      case 'apply': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const own = JOBS[t.job]?.owner, HAND = { bakery: 'bakehand', store: 'shophand', smithy: smithHand(), tavern: 'server', farm: 'farmhand', ranch: 'ranchhand' };
        let job = own ? HAND[own] : t.id === sim.mayorId ? (extra.job || ['clerk', 'laborer', 'undertaker', 'teacher', 'cleric', 'doctor'].find(j => living().filter(q => q.job === j).length < 1) || 'laborer') : t.id === sim.captainId ? (extra.job || 'guard') : null;
        if (!job) return `${t.name} has no work to give. Ask a business owner, the mayor, or the guard captain.`;
        if (me.job === job) return 'You already do that job.';
        if (JOBS[job].guard && openRecord(me).length) return `${t.name}: "Not with your record."`;
        const filled = living().filter(q => q.job === job && q !== me).length, room = { bakehand: 2, shophand: 2, apprentice: 2, journeyman: 2, server: 2, farmhand: 3, ranchhand: 2, guard: 3, nightguard: 3, jailer: 1, clerk: 2, laborer: 4, undertaker: 1, teacher: 1, cleric: 2, doctor: 1 }[job] ?? 1;
        const purse = JOBS[job].payer === 'town' ? sim.treasury : t.coin;
        if (filled >= room || purse < JOBS[job].wage * 4) return `${t.name}: "Nothing going right now."`;
        const r = d20r() + me.skills.diplomacy + Math.round(R(t, me).like * 8 + R(t, me).trust * 4), dc = 12 + (JOBS[job].guard ? 3 : 0);
        if (r < dc) { bump(t, me, 'like', -0.02); return `${t.name} won't take you on. (Diplomacy ${r} vs ${dc})`; }
        me.job = job; me.worked = 0; log('life', `${me.name} of the City takes work as ${JOBS[job].title.toLowerCase()} for ${t.name}.`, ['player', t.id]);
        return `Hired: ${JOBS[job].title}, ${JOBS[job].from}:00 to ${JOBS[job].to % 24}:00, ${money(JOBS[job].wage)} a shift. Be at the ${AREAS[JOBS[job].place]?.name.toLowerCase()} for most of the shift to get paid. (${r} vs ${dc})`;
      }
      case 'quit': { if (me.job === 'none') return 'You have no job.'; const was = JOBS[me.job].title; me.job = 'none'; return `You quit as ${was.toLowerCase()}.`; }
      case 'hire': {   // a bodyguard, for the powerful only
        const boss = me.id === sim.mayorId || me.id === sim.captainId || Object.values(sim.gangs).some(g => g.boss === me.id);
        if (!boss) return 'Only the mayor, the guard captain or a gang boss keeps bodyguards.';
        const q = t && t.kind === 'human' ? t : living().filter(x => x !== me && x.job === 'mercenary' && free(x) && !x.party && x.brain !== 'human').sort((a, b) => dist2(a, me) - dist2(b, me))[0];
        if (!q) return 'Nobody here to hire. Sellswords drink at the Drowned Lantern.';
        if (dist2(q, me) > 6) return `Get closer to ${q.name}.`;
        const terms = partyTerms(q, me, 'bodyguard'), offer = Math.min(me.coin, Math.max(0, extra.pay | 0)) || me.coin;
        if (terms.no) return `${q.name} won't guard you (${terms.no}).`;
        const fee = terms.free ? 0 : terms.ask; if (offer < fee) return `${q.name}: "I'd guard you for ${money(fee)} a day."`;
        joinParty(q, me, 'bodyguard', fee); if (q.brain !== 'human') setTask(q, 'follow', { leader: me.id, until: sim.t + 1440 }); q.guarding = me.id;
        log('life', `${fullName(me)} hires ${q.name} as a bodyguard${fee ? ' (' + money(fee) + ' a day)' : ''}.`, [me.id, q.id]);
        return `${q.name} is your bodyguard for the day${fee ? ' (' + money(fee) + ')' : ''}.`;
      }
      case 'invite': {
        if (!near(4) || t.kind !== 'human') return 'Get closer first.';
        const purpose = extra.purpose || 'company', terms = partyTerms(t, me, purpose), offer = Math.min(me.coin, Math.max(0, extra.pay | 0));
        if (terms.no === 'busy') return `${t.name} is busy.`;
        if (terms.no === 'honest') { bump(t, me, 'like', -0.15); bump(t, me, 'trust', -0.2); remember(t, { text: `${me.name} tried to get me into crime` }); return `${t.name}: "I'll pretend I didn't hear that."`; }
        if (terms.no === 'dislike') return `${t.name}: "Not with you."`;
        if (terms.no === 'scared') return `${t.name}: "That's too dangerous for me${terms.ask ? ', even for money' : ''}."`;
        if (terms.free) { joinParty(t, me, purpose, 0); return `${t.name} comes along, no charge.`; }
        if (offer >= terms.ask) { joinParty(t, me, purpose, terms.ask); return `${t.name} comes along for ${money(terms.ask)}${offer > terms.ask ? ' (you offered more; they took what they asked)' : ''}.`; }
        return `${t.name}: "I'd do it for ${money(terms.ask)}."`;
      }
      case 'boast': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const amt = Math.max(10, (extra.amount | 0) / 10), ok = boast(me, t, amt);
        return ok ? `${t.name} takes you for someone worth about ${money(amt * 10)}.` : `${t.name} doesn't buy it, and trusts you less.`;
      }
      case 'feed': {
        const an = t && t.kind === 'animal' ? t : null; if (!an || !near(2.5)) return 'Get close to an animal first.';
        if (!(me.items.treats > 0)) return 'You have no treats (the store sells them).';
        me.items.treats--; an.full = Math.min(1, an.full + 0.2); an.bond.player = Math.min(an.maxBond ?? 1, (an.bond.player || 0) + 0.08); petEvent(an, 'food');
        return `${an.name} takes the treat.${an.knowsName ? '' : ''} (bond ${an.bond.player.toFixed(2)})`;
      }
      case 'offer': {
        if (!near(4) || t.kind !== 'human') return 'Get closer first.';
        const o = { give: extra.coin > 0 ? { coin: Math.min(me.coin, extra.coin | 0) } : null, want: extra.want ? (FAVORS.includes(extra.want) ? { favor: extra.want } : null) : null, threat: !!extra.threat };
        if (!o.give && !o.want) return 'Offer something, or ask for something.';
        if (thinks(t)) { t.offerFrom = { from: me.id, offer: o, t: sim.t }; sim.onChat?.({ a: 'player', b: t.id, heard: `(Rose ${o.threat ? 'demands' : 'offers'}: ${sideText(o.give)} for ${sideText(o.want)})` }); return `You put it to ${t.name}...`; }
        const yes = judgeOffer(t, me, o);
        if (yes) { settleDeal(me, t, o); return `${t.name} agrees.`; }
        if (o.threat && t.traits.aggression > 0.6 && might(t) >= might(me)) startFight(t, me, { mode: 'nonlethal', why: 'won\'t be threatened' });
        return `${t.name} says no.`;
      }
      case 'busk': { if (me.cd?.busk > sim.t) return 'Give the crowd a breather first.'; cool(me, 'busk', 15); const o = buskRound(me); return !o.ears ? 'Nobody is near to listen. Try the Market square.' : o.got ? `You play (${o.r}); ${o.who.join(', ')} toss you ${money(o.got)}.` : `You play (${o.r}); nobody tosses a coin.`; }
      case 'give': { if (!t || t.kind !== 'human' || t === me) return 'Give to whom?'; if (!near(3)) return 'Get closer first.'; return giveTo(me, t, extra); }
      case 'shout': { hueAndCry(me); return 'You shout for the guard.'; }
      case 'sizeup': {
        if (!t || t.kind !== 'human' || dist2(me, t) > 10 || !sees(me, t)) return 'You can\'t get a good look at them.';
        const r = d20r() + Math.max(me.skills.sense || 0, me.skills.spot || 0), dc = 10 + Math.floor((t.skills.bluff || 0) / 2);
        const est = Math.round(t.coin * (r >= dc ? rnd(0.85, 1.15) : rnd(0.4, 1.8)));
        glimpse(me, t, Math.max(est * 0.4, seen(me, t).worth * 0.5), r >= dc ? 0.4 : 0.15);
        const info = `${t.name}: ${JOBS[t.job].title.toLowerCase()}, ${WEAPONS[t.weapon].name.toLowerCase()}, ${(ARMOR[t.armor] || ARMOR.none).name.toLowerCase()}, ${t.hp < t.maxhp / 2 ? 'hurt, ' : ''}purse looks like ~${money(est)}${r >= dc && t.gang ? ', runs with ' + sim.gangs[t.gang]?.name : ''}${r >= dc && t.home != null ? `, lives in house ${t.home + 1}` : ''}`;
        remember(me, { text: `I sized up ${info}` }); return `You size up ${info}. (${r} vs ${dc})`;
      }
      case 'case': {
        const hi = extra.house != null ? extra.house : HOUSES.findIndex(h => areaOf(me) === h.id || dist2(me, h.door) < 4), bid = extra.business;
        if (bid && sim.business[bid]) { const b = sim.business[bid], k = sim.people[b.owner]; const r = d20r() + (me.skills.spot || 0); const info = `the ${bid}: ${b.owner ? 'run by ' + k?.name : 'unclaimed'}, till ~${money(k ? Math.round(k.coin * rnd(0.7, 1.3)) : 0)}, ${Object.entries(b.stock).filter(([kk, n]) => n > 0 && GOODS[kk]).slice(0, 4).map(([kk, n]) => n + ' ' + kk).join(', ')}, door lock ${r >= 12 ? 'about 15 to force' : 'hard to judge'}`; remember(me, { text: `I cased ${info}` }); return `You case ${info}.`; }
        if (hi < 0) return 'Stand by a house (or name a business) to case it.';
        const h = HOUSES[hi], r = d20r() + (me.skills.spot || 0) + (me.skills.listen || 0) / 2, inside = living().filter(q => q.home === hi && areaOf(q) === h.id);
        const info = `${AREAS[HOUSES[hi].id].name}: ${living().filter(q => q.home === hi).map(q => q.name).join(', ') || 'nobody'} live there; ${inside.length ? inside.length + ' inside now' : 'empty right now'}; ${r >= 15 ? 'savings ~' + money(h.stash * rnd(0.8, 1.2)) : 'can\'t tell what\'s hidden'}; lock about 14${h.stash > 200 ? '-16' : ''}`;
        remember(me, { text: `I cased ${info}` }); return `You case ${info}.`;
      }
      case 'hide': { me.hiding = sim.t + (extra.minutes || 60); return 'You keep to the shadows.'; }
      case 'steal': {
        const shop = areaOf(me), b = sim.business[shop]; if (!b || !shopOpen(shop)) return 'Steal from inside an open shop.';
        const item = extra.item && b.stock[extra.item] > 0 ? extra.item : Object.keys(b.stock).filter(k => b.stock[k] > 0 && GOODS[k] && k !== 'iron').sort((x, y) => (GOODS[y].price || 0) - (GOODS[x].price || 0))[0];
        if (!item) return 'Nothing on the shelves.';
        const keeper = living().filter(q => JOBS[q.job]?.place === shop && q.task?.kind === 'work' && areaOf(q) === shop && q !== me).sort((a, c) => (c.skills.spot || 0) - (a.skills.spot || 0))[0];
        const r = d20r() + (me.skills.sleight || 0), sp = keeper ? d(20) + (keeper.skills.spot || 0) : 0;
        if (r >= sp) { b.stock[item]--; me.items[item] = (me.items[item] || 0) + (GOODS[item].bundle || 1); me.stats.stolen += GOODS[item].price || 1; return `You pocket a ${GOODS[item].name.toLowerCase()} unseen. (${r} vs ${sp})`; }
        deed('theft', me, keeper || null, me); if (keeper && keeper.brain !== 'human') { bump(keeper, me, 'like', -0.4); if (keeper.traits.aggression > 0.5) startFight(keeper, me, { mode: 'nonlethal', why: 'shoplifter' }); else hueAndCry(keeper); }
        return `${keeper?.name || 'Someone'} catches you reaching for the ${GOODS[item].name.toLowerCase()}! (${r} vs ${sp})`;
      }
      case 'dismiss': { if (!me.party) return 'You have no party.'; disband(me); return 'You send your party home.'; }
    case 'takein': return takeIn(me, t, !!extra.work);
    case 'turnout': return turnOut(me, t);
    case 'write': { if (areaOf(me) !== 'square') return 'The notice board is in the Market square.'; return postBoard(me, String(extra.text || '').slice(0, 200)); }
    case 'becomeleather': { if (me.job !== 'none') return 'Quit your work first.'; me.job = 'leatherworker'; log('life', `${fullName(me)} sets up as a leatherworker.`, [me.id]); return 'You set up as a leatherworker: pelts into armour at the bench behind the smithy.'; }
    case 'becomehunter': { if (me.job !== 'none') return 'Quit your work first.'; me.job = 'hunter'; log('life', `${fullName(me)} takes up hunting for a living.`, [me.id]); return 'You take up hunting: game in the Wildwood, sold at the store.'; }
    case 'rentout': { const mine = housesOf(me); if (!mine.length) return 'You own no house.'; const n = clamp(Math.round(extra.amount || 20), 10, 50); for (const i of mine) { HOUSES[i].ask = n; HOUSES[i].askSet = true; } log('trade', `${me.name} asks ${money(n)} a night for a bed.`, [me.id]); return `You ask ${money(n)} a night.`; }
    case 'moveout': { if (me.home == null) return 'You have no home.'; if (HOUSES[me.home].owner === me.id) return 'It is your own house.'; evict(me, 'moved out'); return 'You move out.'; }
    case 'buyhouse': return buyHouse(me, extra.house ?? HOUSES.findIndex(h => !h.owner));
    case 'renthouse': return rentHouse(me, extra.house);
    case 'rally': {
      const pl = findPlace(extra.place || ''); if (!pl || !AREAS[pl]) return 'Name a place to gather: a building, a street or a house address.';
      const boss = me.gang && sim.gangs[me.gang]?.boss === me.id;
      const role = me.id === sim.mayorId ? 'mayor' : me.id === sim.captainId ? 'captain' : boss ? 'boss' : null;
      if (!role) return 'Only the mayor, the guard captain or a gang boss can call people to gather.';
      if (me.rallied && sim.t - me.rallied < 30) return 'You only just called them.';
      me.rallied = sim.t;
      const where = AREAS[pl].name, grp = role === 'mayor' ? 'the town' : role === 'captain' ? 'the guard' : 'the crew';
      const who = living().filter(q => q !== me && q.kind === 'human' && !q.town && q.brain !== 'human' && conscious(q) && !(q.jailedUntil > 0) && !q.fight && (role === 'mayor' || (role === 'captain' ? isGuard(q) : q.gang === me.gang)));
      let coming = 0, asked = 0;
      for (const q of who) {
        if (role === 'mayor' && !isGuard(q) && R(q, me).like < -0.3 && Math.random() < 0.7) continue;   // the mayor's call: those who can't stand them mostly ignore it
        remember(q, { text: `${me.name} (${role === 'boss' ? 'my boss' : 'the ' + (role === 'mayor' ? 'mayor' : 'guard captain')}) called ${grp} to gather at ${where}` });
        if (waitsForOrders(q)) { askOrders(q, `${me.name}, ${role === 'mayor' ? 'the mayor' : role === 'captain' ? 'the guard captain' : 'your boss'}, calls ${grp} to gather at ${where} now. Go ("go to ${where}") or don't.`); asked++; continue; }
        setTask(q, 'muster', { to: randIn(pl, pl === 'square' || pl === 'lane' || pl === 'fields' ? 4 : 2), until: sim.t + 120, run: isGuard(q) || role !== 'mayor' }); coming++;
      }
      log(role === 'boss' ? 'crime' : 'politics', `${me.name} calls ${grp} to gather at ${where}.`, [me.id]);
      return `You call ${grp} to ${where}: ${coming} on their way${asked ? ', ' + asked + ' deciding' : ''}.`;
    }
      case 'fish': { if (dist2(me, SPOTS.pond) > 7) return 'Fish at the pond in the Wildwood.'; sim.t += 60; if (Math.random() < 0.6 * sim.fish / 40) { sim.fish--; me.items.fish = (me.items.fish || 0) + 1; return 'You catch a fish.'; } return 'An hour, and nothing bites.'; }
      case 'forage': { const k = areaOf(me) === 'orchard' ? 'apple' : areaOf(me) === 'wood' ? 'berries' : null; if (!k) return 'Forage in the orchard (apples) or the Wildwood (berries).'; sim.t += 30; if (sim.commons[k] <= 0) return 'Picked clean. Someone got here first.'; const n = Math.min(sim.commons[k], 2); sim.commons[k] -= n; me.items[k] = (me.items[k] || 0) + n; return `You gather ${n} ${k === 'apple' ? 'apples' : 'handfuls of berries'}.`; }
      case 'work': {
        const h = H(), jobs = { bakery: 'bakehand', store: 'shophand', smithy: 'apprentice', tavern: 'server', fields: 'farmhand' }, j = jobs[areaOf(me)];
        if (!j || !shopOpen(areaOf(me)) && areaOf(me) !== 'fields') return 'No work here right now.';
        const payer = sim.people[sim.business[JOBS[j].payer]?.owner]; if (!payer) return 'Nobody to pay you.';
        sim.t += 60; const n = pay(payer, me, 3); bump(payer, me, 'like', 0.05); return `You work an hour as a ${JOBS[j].title.toLowerCase()} (+${money(n)}).`;
      }
      case 'study': { if (areaOf(me) !== 'school' || !classInSession()) return 'No lesson on.'; sim.t += 60; me.studied = (me.studied || 0) + 60; if (me.studied >= 480) { me.studied = 0; const k = extra.skill || 'diplomacy'; me.skills[k]++; return `You finish a course: ${k} +1.`; } return `You sit a lesson (${me.studied}/480 minutes).`; }
      case 'stand': { if (areaOf(me) !== 'hall') return 'Stand for mayor at the town hall.'; if (sim.election.candidates.includes(me.id)) return 'You are already standing.'; if (pay(me, 'town', 50) < 50) return 'The fee is 5 sp.'; sim.election.candidates.push(me.id); log('politics', `${fullName(me)} stands for mayor.`, [me.id]); return 'You are a candidate.'; }
      case 'report': { if (areaOf(me) !== 'station') return 'Report crimes at the guard station desk.'; const subj = sim.people[extra.about]; if (!subj) return 'Report whom?'; const ev = sim.events.filter(e => e.actor === subj.id && (e.victim === me.id || sees(me, e.at))).slice(-1)[0] || { id: 'pr' + Math.random(), type: extra.crime || 'theft', actor: subj.id, victim: me.id, lie: true }; fileReport(me, ev); return `It's on the record against ${subj.name}.`; }
      case 'carry': { if (!t || t.kind !== 'human' || conscious(t) || !near(1.6)) return 'There\'s nobody down here to carry.'; me.carrying = me.carrying === t.id ? null : t.id; if (!me.carrying) drop(t); return me.carrying ? `You pick up ${t.name}.` : `You set ${t.name} down.`; }
      case 'cure': {
        const where = areaOf(me); if (!['healer', 'chapel'].includes(where)) return 'Go to the Infirmary (doctor) or the Chapel (cleric).';
        if (!me.sick) return 'You are not sick.';
        const D = DISEASES[me.sick.key], carer = careTaker(where);
        if (!carer) return `No ${where === 'chapel' ? 'cleric' : 'doctor'} is working here right now.`;
        if (D.cleric && where !== 'chapel') return `${carer.name} shakes their head: ${D.name.toLowerCase()} needs a cleric.`;
        const list = inCare(where), mine = list.find(e => e.id === me.id), fee = sim.careFee[where];
        if (!mine && list.length >= sim.careSlots[where]) return `The ${AREAS[where].name} is full (${sim.careSlots[where]} at a time). Come back later.`;
        if (me.coin < fee) return `${carer.name} wants ${money(fee)} for it. You have ${money(me.coin)}.`;
        pay(me, carer, fee, 'care');
        if (mine) mine.until = sim.t + 240; else list.push({ id: me.id, until: sim.t + 240 });
        const done = () => { const i = list.findIndex(e => e.id === me.id); if (i >= 0) list.splice(i, 1); };   // cured: the place frees up
        if (where === 'chapel') { me.sick = null; done(); log('life', `${carer.name} takes ${money(fee)} and drives the ${D.name.toLowerCase()} out of ${fullName(me)}.`, [carer.id, me.id]); return `${carer.name} prays over you: the ${D.name.toLowerCase()} is gone. (${money(fee)})`; }
        const r = d(20) + (carer.skills.heal || 0);
        if (r >= D.dc) { me.sick = null; done(); log('life', `${carer.name} cures ${fullName(me)} of ${D.name.toLowerCase()} (${money(fee)}).`, [carer.id, me.id]); return `${carer.name} treats you: cured. (Heal ${r} vs DC ${D.dc}, ${money(fee)})`; }
        return `${carer.name} does what they can, but it holds on. (Heal ${r} vs DC ${D.dc}, ${money(fee)}) Rest here: their care helps your daily save.`;
      }
      case 'loot': {
        const b = sim.bodies.find(b => !b.buried && dist2(me, b) < 1.6);
        if (!b) {   // nobody dead here: someone knocked out? everything they carry and wear can be taken
          const v = (t && t.kind === 'human' && !conscious(t) && t.alive && dist2(me, t) < 1.6 ? t : null) || living().find(q => q !== me && q.kind === 'human' && !conscious(q) && !q.carriedBy && dist2(me, q) < 1.6);
          if (!v) return 'No body here, and nobody out cold beside you.';
          const coin = v.coin; v.coin = 0; me.coin += coin;
          const got = Object.entries(v.items).filter(([, n]) => n > 0); v.items = {};
          if (v.weapon !== 'fists') { got.push([v.weapon, 1]); v.weapon = 'fists'; } if (v.armor && v.armor !== 'none') { got.push([v.armor, 1]); v.armor = 'none'; } if (v.shield && v.shield !== 'none') { got.push([v.shield, 1]); v.shield = 'none'; }
          pocket(me, got);
          deed('theft', me, v, me, { victimKnows: false });
          remember(v, { text: 'woke up robbed of everything I had' });
          const things = got.map(([k, c]) => (c > 1 ? c + ' ' : '') + (GOODS[k]?.name || gearOf(k)?.name || k).toLowerCase()).join(', ');
          return `You strip ${v.name} while they're out cold: ${money(coin)}${things ? ', ' + things : ''}.`;
        }
        const n = b.coin; b.coin = 0; me.coin += n; b.hidden = false;
        const got = Object.entries(b.items || {}).filter(([, k]) => k > 0); b.items = {}; b.weapon = 'fists';
        pocket(me, got);
        if (Math.random() < 0.25) expose(me, 'slimy', 'a corpse');
        if (b.stranger) { me.found = { coin: (me.found?.coin || 0) + n, items: Object.fromEntries(got), from: b.name }; log('life', `${fullName(me)} finds a dead traveller in the Wildwood: ${b.name}, with ${money(n)} and a note.`, [me.id]); if (b.note) { me.items.note = 0; remember(me, { text: `I found ${b.name} dead in the Wildwood with ${money(n)} and his things. His note said: "${b.note}"` }); } }
        else deed('theft', me, null, me);
        const things = got.filter(([k]) => k !== 'note').map(([k, c]) => (c > 1 ? c + ' ' : '') + (GOODS[k]?.name || gearOf(k)?.name || k).toLowerCase()).join(', ');
        return `You go through ${b.name}'s things: ${money(n)}${things ? ', ' + things : ''}.` + (b.stranger && b.note ? ` A folded note: "${b.note}"` : '');
      }
      case 'tipoff': { const q = t && t.kind === 'human' ? t : null; if (!q || !sim.bounty[q.id]) return 'Pick someone who is on the bounty board.'; if (!(dist2(q, me) < 8 || dist2(q, me) < 20 && sees(me, q))) return 'You need them in sight.'; return ratOut(me, q) || `You call the guard on ${q.name}.`; }
      case 'turnin': {   // hand a dead stranger's belongings to the guard, as his note asked
        if (!me.found) return 'You have nothing to turn in.';
        if (areaOf(me) !== 'station') return 'Take them to the Guard station.';
        const g = living().find(x => isGuard(x) && conscious(x) && areaOf(x) === 'station'); if (!g) return 'No guard is at the station right now.';
        const f = me.found, coin = Math.min(me.coin, f.coin); pay(me, 'town', coin, 'turned in');
        for (const [k, c] of Object.entries(f.items || {})) { if (k === 'note') continue; if (me.weapon === k) { me.weapon = 'fists'; } else if (me.armor === k) { me.armor = 'none'; } else me.items[k] = Math.max(0, (me.items[k] || 0) - c); }
        me.found = null;
        const reward = Math.min(200, sim.treasury); if (reward > 0) pay('town', me, reward, "finder's reward");
        for (const q of living()) if (q !== me && q.kind === 'human' && (inEarshot(q, me) || Math.random() < 0.3)) bump(q, me, 'like', 0.15);
        log('law', `${fullName(me)} turns in ${f.from}'s belongings (${money(coin)} and his things) to ${g.name}, for his widow and daughter in Marrowford. The town pays a ${money(reward)} finder's reward.`, [me.id, g.id]);
        return `${g.name} takes the dead man's things: "They'll get to his family. That's decent of you." (${money(reward)} reward)`;
      }
      case 'dig': { const gr = sim.graves.find(g => dist2(me, g.at) < 1.5 && !g.robbed); if (!gr) return 'No grave here.'; gr.robbed = true; me.coin += gr.coin || 0; if (Math.random() < 0.3) expose(me, 'mummy', 'an opened grave'); deed('desecration', me, null, me); return `You dig up ${gr.name}: ${money(gr.coin || 0)}.`; }
    }
    return '';
  };
  sim.inviteAnswer = (choice, amount = 0) => {
    const inv = sim.pendingInvite; sim.pendingInvite = null; const me = sim.people.player, L = inv && sim.people[inv.leader];
    if (!inv || !L || !L.alive || !conscious(L)) return 'They\'ve gone.';
    if (choice === 'no') { bump(L, me, 'like', -0.02); return `You turn ${L.name} down.`; }
    let paid = inv.offer;
    if (choice === 'pay') {
      const most = Math.min(L.coin, ((DANGER[inv.purpose] ?? 1) * 3 + Math.round(R(L, me).like * 4)) * 10);
      if (amount > most) { bump(L, me, 'like', -0.03); return `${L.name}: "${money(amount)}? Not for that. ${most > 0 ? 'I could do ' + money(most) + '.' : 'Forget it.'}"`; }
      paid = amount;
    }
    L.party = inv.party; joinParty(me, L, inv.purpose, paid); bump(L, me, 'like', 0.05);
    return `You join ${L.name}'s ${inv.purpose} party${paid ? ' for ' + money(paid) : ''}. Stay close to them.`;
  };
  // when a guard arrests Rose, she chooses
  sim.arrestAnswer = (choice, amount) => {
    const me = sim.people.player, g = sim.people[sim.pendingArrest?.guard]; sim.pendingArrest = null;
    if (!me || !g || !conscious(g)) return 'The guard is gone.';
    const charge = openRecord(me).length;
    if (choice === 'quiet') { setTask(g, 'haul', { target: 'player', until: sim.t + 240 }); return `${g.name} walks you to the cells.`; }
    if (choice === 'bribe') { const n = Math.min(me.coin, amount || 40); if (acceptsBribe(g, n)) { pay(me, g, n); return `${g.name} pockets ${money(n)} and looks the other way.`; } deed('bribery', me, g, me); setTask(g, 'haul', { target: 'player', until: sim.t + 240 }); return `${g.name} refuses the bribe. That's another charge.`; }
    if (choice === 'bluff') { const r = d(20) + me.skills.bluff, s2 = d(20) + g.skills.sense + (openRecord(me).some(x => x.by.includes(g.id)) ? 10 : 0); if (r >= s2) { openRecord(me).forEach(x => x.by = x.by.filter(y => y !== g.id)); return `${g.name} buys it. (${r} vs ${s2})`; } setTask(g, 'haul', { target: 'player', until: sim.t + 240 }); return `${g.name} doesn't believe you. (${r} vs ${s2})`; }
    if (choice === 'run') { startFight(g, me, { mode: 'nonlethal', why: 'arrest' }); return 'You run.'; }
    if (choice === 'fight') { startFight(me, g, { mode: me.prefMode || 'lethal', why: 'resisting arrest' }); return 'You fight.'; }
    return '';
  };
  sim.carry = carry; sim.drop = drop;
  sim.AREAS = AREAS; sim.DOORS = DOORS; sim.HOUSES = HOUSES; sim.SPOTS = SPOTS; sim.JOBS = JOBS; sim.WEAPONS = WEAPONS; sim.ARMOR = ARMOR; sim.GOODS = GOODS; sim.CRIMES = CRIMES;
  sim.CROPS = CROPS; sim.GAME = GAME; sim.MARROW = MARROW;
  sim.areaOf = areaOf; sim.walkable = walkable; sim.dist = dist2; sim.conscious = conscious; sim.free = free; sim.acOf = acOf; sim.babOf = babOf; sim.mod = mod; sim.d20 = () => d(20);
  sim.attracted = attracted; sim.inShift = inShift; sim.night = night; sim.household = household; sim.family = family; sim.place = place; sim.witnesses = witnesses;
  sim.fileReport = fileReport; sim.might = might;
  seed();
  return sim;
}

const api = { Sim };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TownSim = api;
})(typeof window !== 'undefined' ? window : globalThis);

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
  AREAS[id] = { name: `House ${HOUSES.length + 1}`, x0, x1: x0 + 10, z0: side < 0 ? -16 : 6, z1: side < 0 ? -6 : 16, indoor: true, house: true };
  HOUSES.push({ id, door: P(x0 + 5, side < 0 ? -6 : 6), bed: P(x0 + 5, side < 0 ? -13 : 13), stash: 0, rent: 0 });
}
const DOORS = [
  { a: 'square', b: 'bakery', at: P(-10, -12) }, { a: 'square', b: 'smithy', at: P(0, -12) }, { a: 'square', b: 'store', at: P(10, -12) },
  { a: 'square', b: 'hall', at: P(-9, 12) }, { a: 'square', b: 'healer', at: P(1, 12) }, { a: 'square', b: 'station', at: P(10, 12) },
  { a: 'square', b: 'tavern', at: P(15, 0) }, { a: 'square', b: 'graves', at: P(15, -10) },
  { a: 'square', b: 'lane', at: P(-15, 0), wide: true }, { a: 'lane', b: 'fields', at: P(-65, 0), wide: true }, { a: 'fields', b: 'wood', at: P(-105, 0), wide: true }, { a: 'wood', b: 'road', at: P(-140, 0), wide: true }, { a: 'fields', b: 'ranch', at: P(-85, 22), wide: true }, { a: 'fields', b: 'orchard', at: P(-85, -22), wide: true }, { a: 'road', b: 'marrow', at: P(-300, 0), wide: true },
  { a: 'graves', b: 'chapel', at: P(33, -16) }, { a: 'lane', b: 'school', at: P(-60, -6) },
  ...HOUSES.map(h => ({ a: 'lane', b: h.id, at: h.door })),
];
for (const dr of DOORS) {          // a step either side of each door
  const A = AREAS[dr.a], vertical = Math.abs(dr.at.x - A.x0) < 0.01 || Math.abs(dr.at.x - A.x1) < 0.01;
  const ca = P((AREAS[dr.a].x0 + AREAS[dr.a].x1) / 2, (AREAS[dr.a].z0 + AREAS[dr.a].z1) / 2);
  const s = vertical ? Math.sign(ca.x - dr.at.x) : Math.sign(ca.z - dr.at.z);
  dr.side = { [dr.a]: vertical ? P(dr.at.x + s * 1.3, dr.at.z) : P(dr.at.x, dr.at.z + s * 1.3),
              [dr.b]: vertical ? P(dr.at.x - s * 1.3, dr.at.z) : P(dr.at.x, dr.at.z - s * 1.3) };
}
function areaOf(p) { for (const [id, r] of Object.entries(AREAS)) if (p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1) return id; return null; }
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
  tavern: P(26, 0), bar: P(22, -4), graves: P(24, -16), fields: P(-85, 0), wild: P(-103, 14), square: P(0, 0), marrowMarket: P(-325, 0), pond: P(-124, -16), barn: P(-72, 47), well: P(-5, 4), wells: [P(-5, 4), P(-40, 3), P(-85, 12), P(-320, 8)],
  cells: [P(17, 22), P(19, 22), P(17, 24.5), P(19, 24.5)], jailer: P(14, 22),
};
const randIn = (areaId, m = 1.5) => { const r = AREAS[areaId]; return P(rnd(r.x0 + m, r.x1 - m), rnd(r.z0 + m, r.z1 - m)); };
const sameSpace = (p, q) => { const x = areaOf(p), y = areaOf(q); return !x || !y || x === y || dist2(p, q) < 3; };

// ---------------------------------------------------------- gear & goods --
const WEAPONS = {
  fists:      { name: 'Fists', dmg: [1, 3], crit: [20, 2], nonlethal: true, melee: true },
  dagger:     { name: 'Dagger', dmg: [1, 4], crit: [19, 2], melee: true, price: 4 },
  club:       { name: 'Club', dmg: [1, 6], crit: [20, 2], melee: true, price: 2 },
  sap:        { name: 'Sap', dmg: [1, 6], crit: [20, 2], melee: true, nonlethal: true, price: 3 },
  shortsword: { name: 'Short sword', dmg: [1, 6], crit: [19, 2], melee: true, price: 8 },
  longsword:  { name: 'Longsword', dmg: [1, 8], crit: [19, 2], melee: true, price: 12 },
  shortbow:   { name: 'Short bow', dmg: [1, 6], crit: [20, 3], range: 18, price: 12 },
};
const ARMOR = { none: { name: 'Clothes', ac: 0 }, leather: { name: 'Leather armour', ac: 2, price: 10 }, chain: { name: 'Chain shirt', ac: 4, price: 25 } };
const GOODS = {
  bread: { name: 'Loaf of bread', price: 1, food: 0.5, shop: 'bakery' }, pie: { name: 'Meat pie', price: 3, food: 0.8, shop: 'bakery' },
  ale: { name: 'Mug of ale', price: 2, shop: 'tavern', mood: 0.1, water: 0.4 }, meal: { name: 'Stew and bread', price: 2, food: 0.6, shop: 'tavern' },
  grain: { name: 'Sack of grain', price: 2, shop: 'farm' }, barley: { name: 'Sack of barley', price: 2, shop: 'farm' },
  meat: { name: 'Haunch of meat', price: 3, food: 0.45, shop: 'store' }, berries: { name: 'Handful of berries', price: 1, food: 0.12 },
  rope: { name: 'Hemp rope', price: 4, shop: 'store' }, torch: { name: 'Torch', price: 1, shop: 'store' }, treats: { name: 'Bag of treats', price: 2, shop: 'store' },
  ball: { name: 'Leather ball', price: 3, shop: 'store' }, plank: { name: 'Plank', price: 1, shop: 'store' }, picks: { name: "Thieves' picks", price: 6, shop: 'store' },
  turnip: { name: 'Turnip', price: 1, food: 0.25, shop: 'store' },
  eggs: { name: 'Half-dozen eggs', price: 1, food: 0.25, shop: 'store' }, milk: { name: 'Jug of milk', price: 1, food: 0.15, water: 0.4, shop: 'store' },
  fish: { name: 'Pond fish', price: 1, food: 0.35, shop: 'store' }, apple: { name: 'Apples', price: 1, food: 0.15, shop: 'store' },
  dagger: { name: 'Dagger', price: 4, shop: 'smithy', weapon: 'dagger' }, club: { name: 'Club', price: 2, shop: 'smithy', weapon: 'club' },
  sap: { name: 'Sap', price: 3, shop: 'smithy', weapon: 'sap' }, shortsword: { name: 'Short sword', price: 8, shop: 'smithy', weapon: 'shortsword' },
  shortbow: { name: 'Short bow', price: 12, shop: 'smithy', weapon: 'shortbow' }, leather: { name: 'Leather armour', price: 10, shop: 'smithy', armor: 'leather' },
  cure: { name: 'Healing draught', price: 4, shop: 'store', heal: [1, 8] },
};

// ------------------------------------------------------------- the town --
// Jobs: where, when, what it pays and who pays it. Public jobs are paid from the treasury.
const JOBS = {
  mayor:      { title: 'Mayor', place: 'hall', from: 9, to: 17, wage: 10, payer: 'town' },
  captain:    { title: 'Guard captain', place: 'station', from: 7, to: 19, wage: 7, payer: 'town', guard: true },
  guard:      { title: 'Guard', place: 'square', from: 6, to: 18, wage: 4, payer: 'town', guard: true },
  nightguard: { title: 'Night guard', place: 'square', from: 18, to: 6, wage: 4, payer: 'town', guard: true },
  jailer:     { title: 'Jailer', place: 'station', from: 6, to: 22, wage: 4, payer: 'town', guard: true },
  clerk:      { title: 'Town clerk', place: 'hall', from: 9, to: 17, wage: 3, payer: 'town' },
  undertaker: { title: 'Undertaker', place: 'chapel', from: 7, to: 19, wage: 3, payer: 'town' },
  cleric:     { title: 'Cleric', place: 'chapel', from: 6, to: 22, wage: 4, payer: 'town' },
  doctor:     { title: 'Doctor', place: 'healer', from: 7, to: 20, wage: 5, payer: 'town' },
  teacher:    { title: 'Schoolteacher', place: 'school', from: 9, to: 15, wage: 4, payer: 'town' },
  laborer:    { title: 'Labourer', place: 'square', from: 8, to: 16, wage: 3, payer: 'town' },
  baker:      { title: 'Baker', place: 'bakery', from: 4, to: 15, wage: 0, owner: 'bakery' },
  bakehand:   { title: "Baker's hand", place: 'bakery', from: 4, to: 13, wage: 3, payer: 'bakery' },
  shopkeep:   { title: 'Shopkeeper', place: 'store', from: 8, to: 18, wage: 0, owner: 'store' },
  shophand:   { title: 'Shop clerk', place: 'store', from: 10, to: 18, wage: 3, payer: 'store' },
  smith:      { title: 'Smith', place: 'smithy', from: 7, to: 17, wage: 0, owner: 'smithy' },
  apprentice: { title: 'Apprentice smith', place: 'smithy', from: 7, to: 17, wage: 3, payer: 'smithy' },
  innkeep:    { title: 'Innkeeper', place: 'tavern', from: 12, to: 24, wage: 0, owner: 'tavern' },
  server:     { title: 'Server', place: 'tavern', from: 16, to: 24, wage: 3, payer: 'tavern' },
  farmer:     { title: 'Farmer', place: 'fields', from: 6, to: 16, wage: 0, owner: 'farm' },
  farmhand:   { title: 'Farmhand', place: 'fields', from: 6, to: 16, wage: 3, payer: 'farm' },
  rancher:    { title: 'Rancher', place: 'ranch', from: 5, to: 15, wage: 0, owner: 'ranch' },
  ranchhand:  { title: 'Ranch hand', place: 'ranch', from: 5, to: 15, wage: 3, payer: 'ranch' },
  mercenary:  { title: 'Sellsword', place: 'tavern', from: 10, to: 22, wage: 0 },
  factor:     { title: 'Marrowford factor', place: 'marrow', from: 7, to: 19, wage: 0 },
  militia:    { title: 'Marrowford militia', place: 'marrow', from: 6, to: 22, wage: 0 },
  none:       { title: 'No work', place: null, wage: 0 },
};
const BUSINESSES = ['bakery', 'store', 'smithy', 'tavern', 'farm', 'ranch'];
// livestock: what each gives a day, how fast the herd grows, how many the pasture holds
const STOCK = { hen: { hp: 1, ac: 12, give: ['eggs', 1], breed: 0.3, cap: 14, meat: 1 }, cow: { hp: 12, ac: 9, give: ['milk', 2], breed: 0.06, cap: 5, meat: 8 }, sheep: { hp: 6, ac: 10, give: null, breed: 0.12, cap: 8, meat: 4 } };
const MARROW = { sells: { grain: 1, turnip: 1, barley: 1, meat: 2 }, buys: { ale: 3, dagger: 5, club: 3, sap: 4, shortsword: 10, leather: 12, cure: 6, rope: 5, bread: 1 } };
// crops take days to grow; tending makes the yield
const CROPS = { turnip: { days: 3, yield: 26 }, grain: { days: 5, yield: 16 }, barley: { days: 4, yield: 8 } };
// game in the Wildwood: some run, the boar fights back
const GAME = { rabbit: { hp: 2, ac: 15, bite: [1, 2], meat: 1, cap: 16, start: 9, breed: 0.35, flees: true }, pheasant: { hp: 1, ac: 16, bite: [1, 1], meat: 1, cap: 10, start: 6, breed: 0.25, flees: true }, deer: { hp: 9, ac: 13, bite: [1, 4], meat: 4, cap: 9, start: 5, breed: 0.12, flees: true }, boar: { hp: 14, ac: 12, bite: [1, 8], meat: 6, cap: 4, start: 2, breed: 0.08, flees: false } };
const SHOP_OF = { bakery: 'bakery', store: 'store', smithy: 'smithy', tavern: 'tavern', healer: 'healer' };
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
    st, hp, maxhp: hp, nl: 0, skills: skillsFor(o.cls || 'commoner', st, lvl, o.focus || []),
    weapon: o.weapon || 'fists', armor: o.armor || 'none', items: {}, coin: o.coin ?? irnd(3, 12),
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
const acOf = p => 10 + ARMOR[p.armor].ac + Math.min(mod(p.st.dex), p.armor === 'chain' ? 4 : 8) + (p.defending ? 4 : 0) - (p.charged ? 2 : 0) - (p.flatfooted ? Math.max(0, mod(p.st.dex)) : 0);
const babOf = p => CLASSES[p.cls].bab(p.level);
const conscious = p => p.alive && !p.down && !p.dying && p.hp > 0 && p.nl < p.hp;
const free = p => conscious(p) && !(p.jailedUntil > 0);

// ------------------------------------------------------------- the sim --
function Sim(opts = {}) {
  const sim = {
    t: 7 * 60, day: 1, people: {}, animals: {}, bodies: [], graves: [], log: [], events: [],
    treasury: 120, taxRate: 0.15, wages: { guard: 4, captain: 6, mayor: 8, clerk: 3, undertaker: 3, cleric: 4, doctor: 5, teacher: 4, laborer: 3, jailer: 4, nightguard: 4 }, headTax: 0, rent: 1,
    bounty: {}, curfew: false, bail: 6, mayorId: null, captainId: null, gangs: {}, fights: [], election: { candidates: [], day: 7, last: null, votes: null },
    business: {}, history: [], decisionsPending: [], onDecision: null, onLog: null, playerId: null, rules: opts.rules || {},
    flow: { in: {}, out: {} }, rec: { deaths: 0, crimes: 0, arrests: 0, marriages: 0, newcomers: 0, leavers: 0 },
  };
  const H = () => (sim.t / 60) % 24;
  sim.hour = H;
  sim.clock = () => { const m = Math.floor(sim.t % 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const everyone = () => Object.values(sim.people);
  const living = () => everyone().filter(p => p.alive);
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
  const remember = (a, fact) => { a.memory.push({ t: sim.t, day: sim.day, ...fact }); if (a.memory.length > 60) a.memory.shift(); };

  // ---- money: carried coin; households keep a stash at home
  const purse = p => p.coin;
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
    const add = o => { const p = makePerson(sim, { ...o, name: name(o.gender) }); sim.people[p.id] = p; return p; };
    const g = () => pick(['m', 'f']);
    const mayor = add({ gender: pick(['m', 'f', 'nb']), cls: 'aristocrat', level: 2, job: 'mayor', coin: 30, focus: ['diplomacy', 'bluff', 'sense'], brain: 'mayor-ai', tags: ['ai-mayor'] });
    sim.mayorId = mayor.id;
    const guards = [['m', 'captain', 3], ['m', 'guard', 2], ['f', 'guard', 1], ['m', 'nightguard', 1], ['f', 'nightguard', 1], ['m', 'jailer', 1]]
      .map(([gd, job, lvl]) => add({ gender: gd, cls: 'warrior', level: lvl, job, weapon: job === 'captain' ? 'longsword' : pick(['club', 'shortsword', 'sap']), armor: job === 'captain' ? 'chain' : 'leather', coin: irnd(4, 12), focus: ['intimidate', 'spot', 'sense'], bias: { str: 1, con: 1 } }));
    sim.captainId = guards[0].id;
    const civJobs = ['baker', 'bakehand', 'shopkeep', 'shophand', 'smith', 'apprentice', 'innkeep', 'server', 'farmer', 'farmhand', 'rancher', 'doctor', 'undertaker', 'cleric', 'teacher', 'clerk'];
    const genders = ['m', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'f'].sort(() => Math.random() - 0.5);
    civJobs.forEach((job, i) => add({ gender: genders[i], cls: ['baker', 'shopkeep', 'smith', 'innkeep', 'farmer', 'rancher', 'doctor', 'cleric', 'teacher'].includes(job) ? 'expert' : 'commoner', level: 1, job,
      coin: JOBS[job].owner ? irnd(25, 45) : irnd(3, 12), weapon: job === 'smith' ? 'club' : job === 'farmer' ? 'club' : 'fists', focus: ['doctor', 'cleric'].includes(job) ? ['heal'] : job === 'teacher' ? ['diplomacy', 'sense'] : job === 'shopkeep' ? ['diplomacy', 'sense'] : [] }));
    for (const gd of [g(), g(), g()]) add({ gender: gd, cls: 'rogue', level: irnd(1, 2), job: 'none', coin: irnd(2, 8), weapon: 'dagger', focus: ['sleight', 'hide', 'sneak', 'openlock', 'bluff'], traits: { honesty: rnd(0.05, 0.4), greed: rnd(0.7, 1) }, items: { picks: 1 } });
    for (const gd of ['m', 'm', 'm', 'f']) add({ gender: gd, cls: 'warrior', level: irnd(1, 2), job: 'none', coin: irnd(2, 8), weapon: pick(['club', 'sap', 'dagger']), armor: 'leather', focus: ['intimidate'], traits: { aggression: rnd(0.5, 0.95), honesty: rnd(0.1, 0.6) }, bias: { str: 2 } });
    // houses: fill with families and singles; the mayor gets the big one
    const homeless = everyone().slice();
    homeless.sort(() => Math.random() - 0.5);
    let hi = 0; const cap = [4, 4, 4, 4, 4, 4, 4, 4];
    for (const p of homeless) { while (hi < HOUSES.length && cap[hi] <= 0) hi++; if (hi >= HOUSES.length) break; p.home = hi; cap[hi]--; if (cap[hi] <= 1 && Math.random() < 0.5) hi++; }
    // a small town: everyone has known everyone for years
    for (const a of everyone()) for (const b of everyone()) if (a !== b) {
      const r = R(a, b);
      r.like = clamp(rnd(-0.25, 0.45) + (a.home === b.home ? 0.3 : 0) + (JOBS[a.job]?.place && JOBS[a.job].place === JOBS[b.job]?.place ? 0.2 : 0), -1, 1);
      r.trust = clamp(0.35 + r.like * 0.4 + rnd(-0.1, 0.1));
      if (a.cls === 'rogue' || a.job === 'none') if (b.cls === 'rogue' || b.job === 'none') { r.like = clamp(r.like + 0.25, -1, 1); r.trust = clamp(r.trust + 0.2); }
    }
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
      const p = makePerson(sim, { name: name(pick(['m', 'f'])), cls, level: lvl, job, coin: job === 'factor' ? 120 : 10, weapon: job === 'militia' ? 'longsword' : 'dagger', armor: job === 'militia' ? 'chain' : 'none', tags: ['marrowford'], traits: { honesty: 0.85, aggression: 0.5, caution: 0.4 } });
      p.town = 'marrow'; sim.people[p.id] = p; place(p, randIn('marrow', 3));
    }
    for (const id of BUSINESSES) sim.business[id] = { id, owner: everyone().find(p => JOBS[p.job].owner === id)?.id || null, stock: {}, sales: 0, owed: 0, insurance: null };
    sim.plots = Array.from({ length: 18 }, (_, i) => { const crop = ['grain', 'turnip', 'grain', 'barley', 'grain', 'turnip'][i % 6]; const age = rnd(0, CROPS[crop].days); return { i, at: P(-100 + (i % 6) * 6, -14 + Math.floor(i / 6) * 16), crop, planted: sim.t - age * 1440, tended: 0.6 }; });
    for (const b of Object.values(sim.business)) b.mult = {};
    sim.business.farm.stock = { grain: 14, barley: 4, turnip: 16 };
    sim.business.bakery.stock = { bread: 24, pie: 3, grain: 4 }; sim.business.store.stock = { rope: 3, torch: 6, treats: 6, ball: 2, plank: 6, picks: 1, turnip: 4 };
    sim.business.smithy.stock = { dagger: 3, club: 3, sap: 2, shortsword: 2, shortbow: 1, leather: 2 }; sim.business.tavern.stock = { ale: 20, meal: 8, barley: 1, turnip: 2 }; sim.business.store.stock.meat = 2; sim.business.store.stock.cure = 4;
    log('town', `Day 1. ${fullName(mayor)} is mayor. ${living().length} people live in Hollow Town.`);
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

  // ---- the player ---------------------------------------------------------
  sim.addPlayer = (name = 'Rose', gender = 'f') => {
    const p = makePerson(sim, { id: 'player', name, gender, cls: 'rogue', level: 2, job: 'none', coin: 15, weapon: 'dagger', focus: ['bluff', 'diplomacy', 'sense', 'sleight', 'hide'], brain: 'human', tags: ['outsider', 'human'] });
    p.surname = 'of the City'; p.st = { str: 12, dex: 14, con: 13, int: 13, wis: 12, cha: 15 }; p.hp = p.maxhp = 14; p.skills = skillsFor('rogue', p.st, 2, ['bluff', 'diplomacy', 'sense', 'sleight', 'hide']);
    sim.people.player = p; sim.playerId = 'player';
    for (const o of everyone()) if (o !== p) { o.rel.player = { like: rnd(-0.15, 0.1), trust: 0.05, fear: 0, court: 0 }; p.rel[o.id] = { like: 0, trust: 0.1, fear: 0, court: 0 }; }
    place(p, P(-14, 0));
    log('town', `${name}, a stranger from the city, walks into Hollow Town.`, ['player']);
    return p;
  };

  // ---- perception -----------------------------------------------------------
  const night = () => { const h = H(); return h < 6 || h >= 20; };
  const sees = (a, pos) => {
    if (!conscious(a) || a.state === 'sleep' || a.jailedUntil > 0 && areaOf(pos) !== 'station') return false;
    if (!sameSpace(a, pos)) return false;
    const dd = dist2(a, pos);
    const range = (AREAS[areaOf(pos)]?.indoor ? 14 : night() ? 7 : 20);
    return dd < 3 || dd < range;
  };
  sim.sees = sees;
  const witnesses = (pos, exclude = []) => living().filter(w => !exclude.includes(w) && sees(w, pos));

  // ---- deeds, beliefs and the record ----------------------------------------
  // A deed is seen by whoever sees it. Each witness may report it at the station desk.
  const CRIMES = { embezzlement: 6, theft: 3, burglary: 4, assault: 4, mugging: 5, murder: 10, extortion: 4, bribery: 3, vandalism: 2, desecration: 3, jailbreak: 4, trespass: 1 };
  function deed(type, actor, victim, at, extra = {}) {
    const ev = { id: 'ev' + (++sim.rec.crimes) + '-' + Math.floor(sim.t), type, actor: actor.id, victim: victim?.id || null, at: { x: at.x, z: at.z }, t: sim.t, day: sim.day, ...extra };
    const seen = witnesses(at, [actor]);
    if (victim && victim.kind === 'human' && conscious(victim) && !seen.includes(victim) && extra.victimKnows !== false && dist2(victim, at) < 2.5) seen.push(victim);
    for (const w of seen) perceive(w, ev, 'saw', null);
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
    if (how === 'saw' && w.id !== ev.actor && !(w.toReport || []).some(e => e.id === ev.id) && (ev.type !== 'trespass' || w.traits.honesty > 0.7)) (w.toReport ||= []).push(ev);
    if (isGuard(w) && onDuty(w)) guardHears(w, ev, how, teller);
  }
  sim.perceive = perceive;
  function fileReport(w, ev) {
    const actor = sim.people[ev.actor]; if (!actor) return;
    const entry = actor.record.find(r => r.ev === ev.id);
    if (entry) { if (!entry.by.includes(w.id)) entry.by.push(w.id); }
    else actor.record.push({ ev: ev.id, type: ev.type, victim: ev.victim, by: [w.id], day: sim.day, served: false, evidence: isGuard(w), lie: !!ev.lie });
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
    const g = via(p, goal);
    const dx = g.x - p.x, dz = g.z - p.z, len = Math.hypot(dx, dz);
    if (len < 0.05) return true;
    const s = Math.min(len, speed * dt), nx = p.x + dx / len * s, nz = p.z + dz / len * s;
    if (walkable(P(nx, nz))) { p.x = nx; p.z = nz; } else if (walkable(P(nx, p.z))) p.x = nx; else if (walkable(P(p.x, nz))) p.z = nz;
    p.yaw = Math.atan2(dx, dz);
    if (areaOf(p)) p.area = areaOf(p);
    return dist2(p, goal) < 0.6;
  }
  sim.stepToward = stepToward;
  const setTask = (p, kind, o = {}) => { if (o.to && o.until) o.until = Math.max(o.until, sim.t + dist2(p, o.to) / 1.6 + 30); p.task = { kind, t0: sim.t, ...o }; p.state = kind; p.stateT = 0; };
  sim.setTask = setTask;

  const cool = (p, k, mins) => { (p.cd ||= {})[k] = sim.t + mins; };
  // =================================================== the scripted brain ==
  // Each hour (or when a task ends) a person scores what they could do and picks one.
  // Everything is priced in coin: wages, loot, risks (jail time costs wages; a beating
  // costs healing; death costs everything), and what a relationship might be worth.
  function wageOf(p) { const j = JOBS[p.job]; if (!j) return 0; if (j.payer === 'town') return sim.wages[p.job] ?? j.wage; if (j.owner) return Math.max(2, (sim.business[j.owner]?.sales || 6) / 3); return j.wage; }
  function guardsNear(pos, r = 18) { return living().filter(g => isGuard(g) && conscious(g) && g.jailedUntil <= 0 && dist2(g, pos) < r && sameSpace(g, pos)); }
  function riskAt(p, pos, crime) {
    const w = witnesses(pos, [p]).length, g = guardsNear(pos).length;
    const dark = night() && !AREAS[areaOf(pos)]?.indoor ? 0.5 : 1;
    const caught = clamp((w * 0.12 + g * 0.35) * dark);
    const jailDays = CRIMES[crime] || 3;
    return { caught, cost: jailDays * Math.max(3, wageOf(p)) + 5 };
  }
  function desperation(p) { return 1 + (p.coin < 2 ? 1.2 : p.coin < 5 ? 0.5 : 0) + (p.food < 0.25 ? 1 : 0); }
  const shopOpen = shop => living().some(q => free(q) && JOBS[q.job]?.place === shop && q.task?.kind === 'work' && areaOf(q) === shop);
  sim.shopOpen = shopOpen;

  function options(p) {
    const h = H(), out = [], j = JOBS[p.job];
    if (p.town === 'marrow') { if (p.food < 0.5) p.food = 1; if ((p.water ?? 1) < 0.5) p.water = 1; return [{ kind: 'work', value: 5 }]; }
    const add = (kind, value, o = {}) => out.push({ kind, value, ...o });
    // work
    if (j && j.place && inShift(p.job, h)) add('work', wageOf(p) * 1.4 + 2 + (j.owner ? 3 : 0), {});
    // eat
    if ((p.water ?? 1) < 0.45) add('drink', (0.6 - p.water) * 16 + 1 + (p.water < 0.15 ? 40 : 0));
    if (p.food < 0.45) {
      // the dead earn nothing: food is worth what starving would cost you, wages included
      const want = (0.6 - p.food) * (12 + wageOf(p) * 1.5) + (p.food < 0.15 ? 10 + wageOf(p) * 2 : 0);
      if (Object.keys(p.items).some(k => GOODS[k]?.food && p.items[k] > 0)) add('eat', want + 2);
      for (const [shop, item] of [['bakery', 'bread'], ['tavern', 'meal'], ['store', 'turnip'], ['store', 'meat'], ['store', 'eggs'], ['store', 'milk'], ['store', 'fish'], ['store', 'apple']]) if (shopOpen(shop) && (sim.business[shop].stock[item] || 0) > 0 && p.coin >= priceOf(shop, item)) add('buy', want - priceOf(shop, item) * 0.4, { shop, item });
      if (p.coin < 3 && p.home != null && HOUSES[p.home].stash >= 2) add('purse', want + 2);
      if (p.coin < 2) add('beg', want * 0.4);
      if (sim.commons.apple + sim.commons.berries > 4 && h >= 5 && h < 21) add('forage', want * 0.8 + (p.coin < 3 ? 2 : 0));
      if (sim.fish > 3 && h >= 5 && h < 20) add('fish', want * 0.7 * (sim.fish / 40) + (p.coin < 3 ? 1.5 : 0) + (p.traits.caution > 0.6 ? 0.5 : 0));
    }
    // hunting: meat to eat or sell; the boar fights back, so a party helps
    const game = Object.values(sim.animals).filter(a => a.game && a.alive);
    if (game.length && (p.food < 0.5 || p.traits.greed > 0.6) && h >= 6 && h < 19) {
      const armed = p.weapon !== 'fists', bow = WEAPONS[p.weapon].range;
      for (const sp of Object.keys(GAME)) {
        const any = game.find(a => a.species === sp); if (!any) continue;
        const meat = GAME[sp].meat * priceOf('store', 'meat'), danger = sp === 'boar' ? 6 : sp === 'deer' ? 1.5 : 0, odds = (bow ? 0.7 : armed ? 0.45 : 0.15) * (sp === 'rabbit' || sp === 'pheasant' ? (bow ? 0.9 : 0.5) : 1);
        const v = meat * odds * (p.food < 0.4 ? 1.6 : 1) * 0.35 - danger * p.traits.caution * (p.party ? 0.4 : 1) - 2.5 - (p.job !== 'none' && JOBS[p.job].from != null && inShift(p.job, h) ? wageOf(p) : 0);
        if (v > 0) add('hunt', v, { species: sp });
      }
    }
    // sleep
    if (p.rest < 0.35 || ((h >= 22 || h < 5) && !(j && inShift(p.job, h)))) add('sleep', (1 - p.rest) * 8 + ((h >= 22 || h < 5) ? 5 : 0));
    // leisure and people
    if (h >= 17 && h < 23) add('tavern', 1.5 + p.traits.sociability * 2 + (p.coin > 6 ? 1 : 0));
    add('socialize', 0.8 + p.traits.sociability * 1.5);
    // romance / marriage (money counts as much as love for the greedy)
    if (!p.spouse && p.age < 60) {
      const best = living().filter(q => q !== p && !q.spouse && q.kind === 'human' && attracted(p, q) > 0.3).map(q => ({ q, v: R(p, q).like * 3 + attracted(p, q) + (q.coin + (q.home != null ? HOUSES[q.home].stash : 0)) * 0.05 * p.traits.greed }))
        .sort((a, b) => b.v - a.v)[0];
      if (best && best.v > 0.8) add('court', best.v, { target: best.q });
    }
    // crime: priced by loot, desperation, greed, caution and risk
    const desp = desperation(p), honest = p.traits.honesty, moral = 4 + 22 * Math.pow(honest, 1.3) / desp;
    const marks = living().filter(q => q !== p && conscious(q) && q.coin > 3 && dist2(p, q) < 40);
    for (const q of marks.slice(0, 6)) {
      const r = riskAt(p, q, 'theft'), skill = (p.skills.sleight + 10) / 20, retaliation = backers(q).length * 0.4;
      const ev = Math.min(q.coin, 6) * 0.5 * skill * p.traits.greed * desp - r.caught * r.cost * p.traits.caution - retaliation - moral;
      if (ev > 0 && !(p.cd?.pick > sim.t)) add('pickpocket', ev, { target: q });
      const mug = Math.min(q.coin, 15) * 0.8 * p.traits.greed * desp * (might(p) / (might(p) + might(q))) - r.caught * r.cost * 1.5 * p.traits.caution - retaliation * 2 - moral * 1.4 + p.traits.aggression * 2;
      if (mug > 0) add('mug', mug, { target: q });
    }
    if (night() || h < 7) for (const hs of HOUSES) {
      if (hs.stash < 4 || hs === HOUSES[p.home]) continue;
      const home = living().filter(q => q.home === HOUSES.indexOf(hs) && areaOf(q) === hs.id);
      const r = riskAt(p, hs.bed, 'burglary');
      const ev = Math.min(hs.stash, 20) * 0.5 * p.traits.greed * desp - (home.length ? 6 : 0) - r.caught * r.cost * p.traits.caution - moral * 1.2 + (p.items.picks ? 1 : 0);
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
    // politics: run for mayor before the election
    if (!sim.election.candidates.includes(p.id) && p.id !== sim.mayorId && p.traits.ambition > 0.6 && (sim.day % 7 >= 3 || sim.day % 7 === 0) && p.coin >= 5)
      add('stand', 1 + p.traits.ambition * 3 + popularity(p) * 0.2 - 3);
    if (sim.election.candidates.includes(p.id) && p.coin > 6) add('campaign', 2 + p.traits.ambition * 2);
    // revenge
    for (const [who, amt] of Object.entries(p.grudge || {})) {
      const t = sim.people[who]; if (!t || !t.alive || !conscious(t) || amt < 4) continue;
      const ev = amt * p.traits.aggression * 0.6 - (power(t) / Math.max(1, power(p))) * 3 - p.traits.caution * 3;
      if (ev > 0) add('avenge', ev, { target: t });
    }
    // caravans: buy where it's cheap, sell where it's dear (Marrowford's grain for Hollow's ale and tools)
    if (h >= 5 && h < 13 && !p.party && p.town !== 'marrow' && p.coin >= 8) {
      const localGrain = priceOf('farm', 'grain'), margin = Math.max(localGrain - MARROW.sells.grain, priceOf('store', 'meat') - MARROW.sells.meat);
      const own = JOBS[p.job]?.owner, exportable = own === 'tavern' ? (sim.business.tavern.stock.ale || 0) * 1.5 : own === 'smithy' ? 12 : 0;
      const qty = Math.min(20, Math.floor(p.coin / 2));
      const v = margin * qty * 0.5 + exportable * 0.5 - 6 - roadDanger(p) * 3 * p.traits.caution - (inShift(p.job, h) ? wageOf(p) : 0);
      if (v > 0) add('caravan', v);
    }
    // the road is lonely: some wait there for travellers with full carts
    if ((h >= 7 && h < 18) && p.town !== 'marrow' && p.weapon !== 'fists' && !(p.cd?.ambush > sim.t)) {
      const seen = sim.events.filter(e => e.caravan && sim.t - e.t < 2 * 1440).length + 1;
      const v = seen * 4 * p.traits.greed * desp - moral * 1.3 - 4 + p.traits.aggression * 2 + (p.gang ? 2 : 0) - (inShift(p.job, h) ? wageOf(p) : 0);
      if (v > 0) add('ambush', v);
    }
    // rustling: a hungry, crooked person takes a beast from the ranch at night
    if ((h >= 22 || h < 4) && p.food < 0.4 && p.traits.honesty < 0.4 && !(p.cd?.rustle > sim.t)) add('rustle', 3 + (0.4 - p.food) * 10 - moral * 0.6);
    // sign on as a sellsword (anyone: honest folk escort caravans, others will take other work)
    if ((p.job === 'none') && might(p) >= 4 && p.traits.caution < 0.7) add('signon', 2 + p.traits.aggression * 2 + (1 - p.traits.caution) * 2);
    // jobless people look for work
    if (p.job === 'none' && h >= 7 && h < 17) add('seekwork', 2 + p.traits.honesty * 2);
    // report what you saw
    if (p.toReport?.length) add('report', 1 + (1 - p.traits.caution) + p.traits.honesty * 2 - (sim.people[p.toReport[0].actor]?.gang ? 2 * p.traits.caution : 0));
    // the cleric answers the fallen; the undertaker collects and buries the dead
    if (p.job === 'cleric' && inShift(p.job, h)) { const pt = patients()[0]; if (pt) add('rescue', pt.dying ? 12 : 5, { target: pt }); }
    if (p.job === 'undertaker' && inShift(p.job, h) && sim.bodies.some(b => !b.buried && !b.collected)) add('collect', 7);
    if (p.job === 'undertaker' && inShift(p.job, h) && sim.bodies.some(b => b.collected && !b.buried && sim.t >= b.layUntil)) add('bury', 6);
    // school: anyone free can sit a lesson while the teacher is in
    if (h >= 9 && h < 15 && classInSession() && p.job !== 'teacher' && (p.job === 'none' || !inShift(p.job, h))) add('study', 1 + p.traits.ambition * 2 + (st => 0)(0));
    if (['grain', 'meat', 'fish', 'eggs', 'apple'].reduce((n, k) => n + (p.items[k] || 0), 0) > 3 && p.food > 0.4 && p.town !== 'marrow' && !(p.cd?.fence > sim.t) && (sim.people[sim.business.store.owner]?.coin || 0) > 10) add('fence', 3 + p.traits.greed * 2);
    // the hurt go to the doctor (free, paid by taxes)
    if (p.hp < p.maxhp * 0.6 && doctorIn()) add('treat', 5 + (1 - p.hp / p.maxhp) * 6);
    // guards: pursue the wanted (bounties make it pay)
    if (isGuard(p) && inShift(p.job, h)) {
      const wanted = living().filter(q => q !== p && q.jailedUntil <= 0 && openRecord(q).length && hasEvidence(q) && dist2(p, q) < 60);
      for (const q of wanted) { const ev = 4 + (sim.bounty[q.id] || 0) + openRecord(q).length - (power(q) / Math.max(1, power(p))) * 3 * p.traits.caution - (q.gang && p.gang === q.gang ? 20 : 0); if (ev > 0) add('arrest', ev, { target: q }); }
    }
    // mourning: visit someone you loved in the graveyard
    const lost = sim.graves.find(gr => (R(p, gr.id).like > 0.5) && sim.day - gr.day < 3);
    if (lost) add('mourn', 1.5, { grave: lost });
    const laid = sim.bodies.find(b => b.collected && !b.buried && R(p, b.id).like > 0.4);
    if (laid) add('mourn', 2.5, { grave: { at: SPOTS.chapel } });
    // AI brains steer with a daily policy: weights per kind of action
    if (p.policy) for (const o of out) o.value *= p.policy[o.kind] ?? p.policy[groupOf(o.kind)] ?? 1;
    return out;
  }
  const groupOf = k => ({ pickpocket: 'crime', mug: 'crime', burgle: 'crime', extort: 'crime', avenge: 'violence', court: 'romance', stand: 'politics', campaign: 'politics', join: 'gang', found: 'gang', recruit: 'gang' })[k] || k;
  // a sellsword's price follows their reputation: fights won, and above all, kills
  const reputation = p => (p.stats.wins || 0) + (p.stats.kills || 0) * 4 + p.level * 2;
  const mercRate = p => Math.min(25, 2 + Math.floor(reputation(p) / 3));
  sim.reputation = reputation; sim.mercRate = mercRate;
  // the road's danger, as people have heard it: ambushes remembered in the last few days
  const roadDanger = p => p.memory.filter(m => m.ambush && sim.day - m.day <= 4).length + sim.events.filter(e => e.road && sim.t - e.t < 3 * 1440 && (p.knows?.has(e.id))).length;
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
  const band = (x, cuts, names) => names[cuts.findIndex(c => x < c) === -1 ? names.length - 1 : cuts.findIndex(c => x < c)];
  function roleOf(p) { const j = JOBS[p.job]; return j?.guard ? 'guard' : p.id === sim.mayorId ? 'mayor' : j?.owner ? 'owner' : j?.payer === 'town' ? 'public' : p.job === 'none' ? 'idle' : p.job === 'mercenary' ? 'merc' : 'worker'; }
  function situation(p) {
    const h = H();
    return [band(h, [5, 9, 13, 18, 22], ['night', 'morning', 'midday', 'afternoon', 'evening', 'night']), band(p.food, [0.25, 0.6], ['starving', 'hungry', 'fed']),
      band(p.coin, [3, 15, 50], ['broke', 'poor', 'comfy', 'rich']), roleOf(p), p.traits.honesty < 0.45 ? 'crooked' : 'honest', openRecord(p).length ? 'wanted' : 'clean'].join('|');
  }
  sim.situation = situation;
  const worth = p => p.coin + (p.home != null ? HOUSES[p.home].stash : 0) * 0.5 + p.food * 6 + (p.water ?? 1) * 3 + Math.max(0, p.hp - p.nl) * 0.8 - (p.jailedUntil > 0 ? 12 : 0) - openRecord(p).length * 2;
  function lesson(key, kind, reward, taught) {
    const row = (sim.lore.acts[key] ||= {}), c = (row[kind] ||= { n: 0, r: 0, t: 0 });
    if (taught) { c.t++; sim.lore.taught++; }
    if (reward != null) { c.n++; c.r += (Math.max(-15, Math.min(15, reward)) - c.r) / Math.min(c.n, 50); sim.lore.scored++; }
  }
  function settle(p) {     // score the last choice by how things went since
    const lc = p.lastChoice; if (!lc) return;
    lesson(lc.key, lc.kind, worth(p) - lc.worth, false); p.lastChoice = null;
  }
  function loreBias(key, kind) {
    const row = sim.lore.acts[key]; if (!row) return 0;
    const c = row[kind]; if (!c) return 0;
    const taughtAll = Object.values(row).reduce((a, x) => a + x.t, 0);
    const conf = c.n / (c.n + 25), imit = taughtAll ? (c.t / taughtAll) * Math.min(1, taughtAll / 10) : 0;
    return c.r * 0.35 * conf + imit * 3;
  }
  sim.loreBias = loreBias;
  function choose(p) {
    settle(p);
    const opts = options(p);
    if (!opts.length) return setTask(p, 'idle', { until: sim.t + 30 });
    const key = situation(p), lean = p.brain === 'script' ? sim.learning : 0;
    const pickOpt = opts.map(o => ({ o, v: o.value + rnd(0, 1.5) + (lean ? loreBias(key, o.kind) * lean : 0) })).sort((a, b) => b.v - a.v)[0].o;
    // an AI-played person's choices (steered by their own plan for the day) are examples for the rest
    if (p.brain !== 'script' && p.brain !== 'human' && p.policy) lesson(key, pickOpt.kind, null, true);
    if (p.town !== 'marrow') p.lastChoice = { key, kind: pickOpt.kind, worth: worth(p), t: sim.t };
    startTask(p, pickOpt);
  }
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
      if (out.length >= 3) { const t = out.join(' ').replace(/ ([.!?,])/g, '$1'); return t[0].toUpperCase() + t.slice(1); }
    }
    return null;
  }
  sim.babble = babble; sim.learnWords = learnWords;
  sim.exportLore = () => JSON.parse(JSON.stringify(sim.lore));
  sim.importLore = o => { if (o && o.v === 1 && o.acts) { sim.lore = o; sim.lore.runs = (o.runs || 0) + 1; } };
  sim.loreSize = () => ({ situations: Object.keys(sim.lore.acts).length, taught: sim.lore.taught, scored: sim.lore.scored, words: Object.keys(sim.lore.chain).length, runs: sim.lore.runs });
  sim.options = options; sim.choose = choose;

  function startTask(p, o) {
    const h = H();
    switch (o.kind) {
      case 'work': {
        const j = JOBS[p.job];
        let at = j.place === 'marrow' ? randIn('marrow', 4) : SPOTS[j.place] || randIn(j.place);
        if (p.job === 'factor') at = SPOTS.marrowMarket;
        if (j.place === 'square') at = randIn(sim.curfew && night() ? 'lane' : pick(['square', 'square', 'lane']));
        if (p.job === 'jailer') at = SPOTS.jailer;
        return setTask(p, 'work', { to: at, until: sim.t + 60 });
      }
      case 'eat': return setTask(p, 'eat', { until: sim.t + 10 });
      case 'drink': { const w = [...SPOTS.wells, ...(p.home != null ? [HOUSES[p.home].bed] : [])].sort((a, b) => dist2(p, a) - dist2(p, b))[0]; return setTask(p, 'drink', { to: w, until: sim.t + 60 }); }
      case 'purse': return setTask(p, 'purse', { to: HOUSES[p.home].bed, until: sim.t + 60 });
      case 'forage': return setTask(p, 'forage', { to: sim.commons.apple >= sim.commons.berries ? randIn('orchard', 3) : randIn('wood', 3), until: sim.t + 120 });
      case 'fish': return setTask(p, 'fish', { to: P(SPOTS.pond.x + rnd(-3, 3), SPOTS.pond.z + 4.5), until: sim.t + 180 });
      case 'hunt': { if (o.species === 'boar' && !p.party) gatherParty(p, 'hunt'); return setTask(p, 'hunt', { species: o.species, until: sim.t + 240 }); }
      case 'buy': return setTask(p, 'buy', { to: SPOTS[o.shop], shop: o.shop, item: o.item, until: sim.t + 90 });
      case 'beg': return setTask(p, 'beg', { to: randIn('square'), until: sim.t + 60 });
      case 'sleep': return setTask(p, 'sleep', { to: p.home != null ? HOUSES[p.home].bed : randIn('lane'), until: sim.t + 6 * 60 });
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
      case 'caravan': return startCaravan(p);
      case 'rustle': { cool(p, 'rustle', 1440 * 2); const a = Object.values(sim.animals).filter(a => a.livestock && a.alive && a.species !== 'cow').sort(() => Math.random() - 0.5)[0]; if (!a) return; return setTask(p, 'rustle', { target: a.id, to: P(a.x, a.z), until: sim.t + 240 }); }
      case 'fence': cool(p, 'fence', 600); return setTask(p, 'caravan', { phase: 'home', fence: true, until: sim.t + 240 });
      case 'ambush': { cool(p, 'ambush', 720); if (!p.party) gatherParty(p, 'bandit', 3, true); return setTask(p, 'ambush', { to: P(rnd(-280, -160), rnd(-3, 3)), until: sim.t + 240 }); }
      case 'signon': { p.job = 'mercenary'; log('life', `${fullName(p)} signs on as a sellsword (${mercRate(p)}c a day).`, [p.id]); return setTask(p, 'idle', { until: sim.t + 10 }); }
      case 'study': return setTask(p, 'study', { to: randIn('school', 2), until: sim.t + 120 });
      case 'treat': return setTask(p, 'treat', { to: pick(SPOTS.beds), until: sim.t + 240 });
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
        if (p.job === 'baker' || p.job === 'bakehand') { const b = sim.business.bakery; if (!(b.stock.grain > 1)) trade('farm', 'bakery', 'grain', 4); if (b.stock.grain > 0 && (b.stock.bread || 0) < 40 && Math.random() < dt / 30) { b.stock.grain--; b.stock.bread = (b.stock.bread || 0) + 3; if ((b.stock.pie || 0) < 3 && sim.business.store.stock.meat > 0 && Math.random() < 0.3) { trade('store', 'bakery', 'meat', 1); if (b.stock.meat > 0) { b.stock.meat--; b.stock.pie = (b.stock.pie || 0) + 2; } } } }
        if (p.job === 'innkeep' || p.job === 'server') { const b = sim.business.tavern; if (!(b.stock.barley > 0)) trade('farm', 'tavern', 'barley', 2); if (!(b.stock.turnip > 0)) trade('farm', 'tavern', 'turnip', 4); if (b.stock.barley > 0 && Math.random() < dt / 240) { b.stock.barley--; (sim.brews ||= []).push({ ready: sim.t + 1440, ale: 8 }); } if (b.stock.turnip > 0 && (b.stock.meal || 0) < 12 && Math.random() < dt / 40) { b.stock.turnip--; b.stock.meal = (b.stock.meal || 0) + 2; } }
        if (p.job === 'shopkeep' || p.job === 'shophand') { const b = sim.business.store; if ((b.stock.turnip || 0) < 6) trade('farm', 'store', 'turnip', 6); }
        if ((p.job === 'undertaker' && sim.bodies.some(b => !b.buried && (!b.collected || sim.t >= b.layUntil))) || (p.job === 'cleric' && patients().length)) { p.task = null; return; }
        if (p.job === 'doctor') treatPatients(dt);
        return;
      }
      case 'eat': { eatFrom(p); p.task = null; return; }
      case 'drink': { if (!arrive(p, tk.to, dt)) return; p.water = 1; p.task = null; return; }
      case 'forage': { if (!arrive(p, tk.to, dt)) return; if (Math.random() < dt / 20) { const k = areaOf(p) === 'orchard' ? 'apple' : 'berries'; if (sim.commons[k] <= 0) { p.task = null; return; } sim.commons[k]--; p.items[k] = (p.items[k] || 0) + 1; if ((p.items[k] || 0) >= 4) { eatFrom(p); p.task = null; } } return; }
      case 'purse': { if (!arrive(p, tk.to, dt)) return; const n = Math.min(HOUSES[p.home].stash, 8 - p.coin); if (n > 0) { HOUSES[p.home].stash -= n; p.coin += n; } p.task = null; return; }
      case 'fish': { if (!arrive(p, tk.to, dt)) return; if (Math.random() < dt / 30 * 0.5 * (sim.fish / 40)) { sim.fish--; p.items.fish = (p.items.fish || 0) + 1; if (p.items.fish >= 3) { eatFrom(p); p.task = null; } } return; }
      case 'hunt': return doHunt(p, dt);
      case 'caravan': return doCaravan(p, dt);
      case 'rustle': { const a = sim.animals[tk.target]; if (!a || !a.alive) { p.task = null; return; } if (!arrive(p, a, dt, 1.5)) return; a.alive = false; a.state = 'dead'; p.items.meat = (p.items.meat || 0) + a.meat; const own = sim.people[a.owner]; deed('theft', p, own || null, P(a.x, a.z)); log('crime', `${p.name} slaughters one of the ranch's ${a.species === 'hen' ? 'hens' : 'sheep'} in the dark and carries off the meat.`, [p.id]); p.task = null; return; }
      case 'ambush': return doAmbush(p, dt);
      case 'follow': { const L = sim.people[tk.leader]; if (!L || !L.alive || !p.party || L.party !== p.party) { p.party = null; p.task = null; return; } if (dist2(p, L) > 2.5) arrive(p, L, dt, 1.6); return; }
      case 'buy': {
        if (!arrive(p, tk.to, dt)) return;
        if (shopOpen(tk.shop)) buy(p, tk.shop, tk.item);
        if (GOODS[tk.item]?.food) eatFrom(p);
        if (tk.item === 'cure' && p.items.cure) { p.items.cure--; p.hp = Math.min(p.maxhp, p.hp + roll(1, 8)); }
        p.task = null; return;
      }
      case 'beg': {
        if (!arrive(p, tk.to, dt)) return;
        if (Math.random() < dt / 30) { const g = living().find(q => q !== p && dist2(p, q) < 4 && q.coin > 4 && R(q, p).like > 0 && Math.random() < 0.5); if (g) { pay(g, p, 1); bump(p, g, 'like', 0.1); log('life', `${g.name} gives ${p.name} a copper.`, [g.id, p.id]); } }
        return;
      }
      case 'sleep': {
        if (!arrive(p, tk.to, dt)) return;
        p.state = 'sleep'; p.rest = Math.min(1, p.rest + dt / 420);
        if (p.home != null && p.coin > 6) { HOUSES[p.home].stash += p.coin - 5; p.coin = 5; }   // money goes in the stash at home
        if (p.rest >= 1 && h >= 5 && h < 21) { if (p.home != null && p.coin < 8) { const n = Math.min(HOUSES[p.home].stash, 8 - p.coin); HOUSES[p.home].stash -= n; p.coin += n; } p.task = null; }   // a day's spending money from the stash
        return;
      }
      case 'tavern': {
        if (!arrive(p, tk.to, dt)) return;
        if (Math.random() < dt / 40 && shopOpen('tavern') && p.coin >= 2) buy(p, 'tavern', 'ale');
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
        if (!sim.election.candidates.includes(p.id) && pay(p, 'town', 5) === 5) { sim.election.candidates.push(p.id); log('politics', `${fullName(p)} stands for mayor (paid the 5c fee).`, [p.id]); }
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
      case 'treat': { if (!arrive(p, tk.to, dt)) return; p.state = 'patient'; if (p.hp >= p.maxhp * 0.9 || !doctorIn()) p.task = null; return; }
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
  function eatFrom(p) {
    for (const k of ['pie', 'meal', 'meat', 'fish', 'bread', 'eggs', 'turnip', 'milk', 'apple', 'berries']) if (p.items[k] > 0) { p.items[k]--; p.food = Math.min(1, p.food + GOODS[k].food); if (GOODS[k].water) p.water = Math.min(1, (p.water ?? 1) + GOODS[k].water); return true; }
    return false;
  }
  const priceOf = (bid, item) => Math.max(1, Math.round(GOODS[item].price * (sim.business[bid]?.mult?.[item] ?? 1)));
  sim.priceOf = priceOf;
  function buy(p, shopId, item, n = 1) {
    const b = sim.business[shopId], g = GOODS[item]; if (!b || !g || (b.stock[item] || 0) < n) return false;
    const cost = priceOf(shopId, item) * n; if (p.coin < cost) return false;   // nobody spends what they don't have
    const owner = sim.people[b.owner];
    pay(p, owner && owner.alive ? owner : 'town', cost); b.stock[item] -= n; b.sales += cost; b.owed += cost * sim.taxRate;
    if (b.debt && owner && owner.alive) for (const [sid, due] of Object.entries(b.debt)) { const sup = sim.people[sid]; if (!sup || !sup.alive) { delete b.debt[sid]; continue; } const n2 = Math.min(due, Math.max(0, owner.coin - 3)); if (n2 > 0) { pay(owner, sup, n2, 'credit repaid'); b.debt[sid] -= n2; if (b.debt[sid] <= 0) delete b.debt[sid]; } }
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
    if (f && sneak >= spot) prey.flatfooted = true;
    p.task = null;
  }
  // a caravan: load up, hire an escort if the road worries you, go to Marrowford, trade, come home and sell
  function startCaravan(p) {
    const own = JOBS[p.job]?.owner, cargo = {};
    if (own === 'tavern') { const n = Math.min(12, sim.business.tavern.stock.ale || 0); if (n) { sim.business.tavern.stock.ale -= n; cargo.ale = n; } }
    if (own === 'smithy') for (const k of ['dagger', 'club', 'shortsword']) { const n = Math.min(2, sim.business.smithy.stock[k] || 0); if (n) { sim.business.smithy.stock[k] -= n; cargo[k] = n; } }
    for (const [k, n] of Object.entries(cargo)) p.items[k] = (p.items[k] || 0) + n;
    if (roadDanger(p) > 0 || p.traits.caution > 0.6) gatherParty(p, 'caravan escort', 2, true);
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
      for (const [k] of want) { const mv = -(sim.market.moved[k] || 0); while (p.coin > 3 && (sim.market.stock[k] || 0) > 0 && Object.values(bought).reduce((a, b) => a + b, 0) < 24) { const each = Math.max(1, Math.round(MARROW.sells[k] * Math.pow(1.04, mv + (bought[k] || 0)))); if (each > priceOf(k === 'grain' ? 'farm' : 'store', k)) break; p.coin -= each; spent += each; sim.market.stock[k]--; bought[k] = (bought[k] || 0) + 1; } }
      for (const [k, n] of Object.entries(bought)) { p.items[k] = (p.items[k] || 0) + n; sim.market.moved[k] = (sim.market.moved[k] || 0) - n; }
      log('trade', `${p.name} trades in Marrowford: sold for ${got}c, bought ${Object.entries(bought).map(([k, n]) => n + ' ' + k).join(', ') || 'nothing'} (${spent}c).`, [p.id]);
      tk.phase = 'home'; tk.until = sim.t + 900; return;
    }
    const dest = SPOTS[p.job === 'baker' ? 'bakery' : p.job === 'innkeep' ? 'tavern' : 'store'];
    if (!arrive(p, dest, dt, 1.8)) return;
    // sell the cargo to the town's businesses at their price (or stock your own)
    let earned = 0;
    for (const k of ['grain', 'meat', 'turnip', 'fish', 'eggs', 'apple']) {
      const n = Math.max(0, (p.items[k] || 0) - (p.task.fence && k !== 'grain' ? 1 : 0)); if (!n) continue;
      const bid = k === 'grain' ? 'bakery' : 'store', b = sim.business[bid], owner = sim.people[b.owner];
      if (owner === p) { b.stock[k] = (b.stock[k] || 0) + n; p.items[k] = 0; continue; }
      if (!owner || !owner.alive) continue;
      const each = Math.max(1, Math.floor(priceOf(k === 'grain' ? 'farm' : 'store', k) * 0.85)), m = Math.min(n, Math.floor(owner.coin / each));
      if (m > 0) { pay(owner, p, m * each, 'food sold'); b.stock[k] = (b.stock[k] || 0) + m; p.items[k] -= m; earned += m * each; }
    }
    if (earned || !p.task.fence) log('trade', p.task.fence ? `${p.name} sells ${earned}c of food to the store, no questions asked.` : `${p.name}'s caravan is home${earned ? ' and sells its load for ' + earned + 'c' : ''}.`, [p.id]);
    disband(p); p.task = null;
  }
  // bandits wait on the road, hidden, for anyone carrying cargo or coin
  function doAmbush(p, dt) {
    const tk = p.task;
    if (!arrive(p, tk.to, dt, 1.6)) return;
    p.state = 'lurk';
    const mark = living().find(q => q !== p && q.party !== p.party && conscious(q) && areaOf(q) === 'road' && dist2(q, p) < 14 && (Object.entries(q.items).some(([k, n]) => n > 0 && (MARROW.sells[k] || MARROW.buys[k])) || q.coin > 10));
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
    const ask = q.job === 'mercenary' ? mercRate(q) : Math.max(1, Math.round(busy + danger * q.traits.caution * 2 + 1 - r.like * 4 + q.traits.greed * 2));
    if (danger * q.traits.caution > 2.2 && might(q) < 4) return { no: 'scared', ask };
    return { ask };
  }
  sim.partyTerms = partyTerms;
  function joinParty(q, L, purpose, paid = 0) {
    L.party ||= 'party' + (++partySeq);
    if (paid) pay(L, q, paid, 'party pay');
    q.party = L.party;
    if (q.brain !== 'human') setTask(q, 'follow', { leader: L.id, until: sim.t + 480 });
    remember(q, { text: `${L.name} took me along (${purpose}${paid ? ', paid ' + paid + 'c' : ', as a favour'})` });
  }
  sim.joinParty = joinParty;
  function gatherParty(L, purpose, max = 3, hire = false) {
    const id = 'party' + (++partySeq);
    L.party = id; let n = 0;
    if (hire) for (const q of living().filter(q => q !== L && q.job === 'mercenary' && free(q) && !q.party && q.brain !== 'human').sort((a, b) => mercRate(b) - mercRate(a))) {
      if (n >= max) break;
      const rate = mercRate(q), crooked = purpose === 'bandit';
      if (L.coin < rate || (crooked && q.traits.honesty > 0.5)) continue;
      pay(L, q, rate); q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 480 }); n++;
      log('life', `${L.name} hires ${q.name}, a sellsword, for ${rate}c${crooked ? ' (bandit work)' : ''}.`, [L.id, q.id]);
    }
    for (const q of living().filter(q => q !== L && q.kind === 'human' && free(q) && !q.party && q.brain !== 'human' && q.town !== 'marrow' && dist2(q, L) < 30 && R(q, L).like > 0.15 && (purpose !== 'bandit' || q.traits.honesty < 0.45)).sort((a, b) => R(b, L).like - R(a, L).like)) {
      if (n >= max) break;
      const busy = q.task?.kind === 'work' ? wageOf(q) : 0;
      const terms = partyTerms(q, L, purpose); if (terms.no) continue;
      const worth = (DANGER[purpose] ?? 1) * 2 + 1;
      if (terms.free) { q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 300 }); n++; }
      else if (terms.ask <= worth && L.coin >= terms.ask + 2) { pay(L, q, terms.ask, 'party pay'); q.party = id; setTask(q, 'follow', { leader: L.id, until: sim.t + 300 }); n++; log('life', `${L.name} pays ${q.name} ${terms.ask}c to come along.`, [L.id, q.id]); }
    }
    const me = sim.people.player;
    if (me && me.alive && !me.party && !sim.pendingInvite && dist2(me, L) < 30 && R(L, me).like > 0.1 && (purpose !== 'bandit' || R(L, me).trust > 0.4)) {
      const offer = R(L, me).like > 0.4 ? 0 : Math.min(L.coin, (DANGER[purpose] ?? 1) * 2);
      sim.pendingInvite = { leader: L.id, party: id, purpose, offer, t: sim.t };
      sim.onInvite?.(sim.pendingInvite);
    }
    if (n) log('life', `${L.name} gathers a ${purpose} party: ${living().filter(q => q.party === id && q !== L).map(q => q.name).join(', ')}.`, [L.id]);
    else if (!sim.pendingInvite || sim.pendingInvite.party !== id) L.party = null;
    return n;
  }
  sim.gatherParty = gatherParty;
  function disband(L) { if (!L.party) return; for (const q of living()) if (q.party === L.party && q !== L) { q.party = null; if (q.task?.kind === 'follow') q.task = null; } L.party = null; }
  sim.disband = disband;

  // ---- talking -------------------------------------------------------------
  function converse(p, q) {
    if (q.brain === 'human') return;
    bump(p, q, 'like', 0.02 * p.traits.sociability); bump(q, p, 'like', 0.02 * q.traits.sociability);
    bump(p, q, 'trust', 0.01); bump(q, p, 'trust', 0.01);
    // pass on news (true) or a lie
    const news = p.memory.filter(m => m.ev && !q.knows?.has(m.ev) && m.actor !== q.id).slice(-1)[0];
    if (news && Math.random() < 0.6) { const ev = sim.events.find(e => e.id === news.ev) || { id: news.ev, type: news.type, actor: news.actor, victim: news.victim, lie: news.lie }; if (R(q, p).trust > 0.25) perceive(q, ev, 'told', p); }
    if (p.warnAbout && p.warnAbout.who !== q.id && Math.random() < 0.5) { claim(p, q, { id: 'c' + Math.random(), kind: 'liar', subject: p.warnAbout.who, lie: !p.warnAbout.wasLie }); p.warnAbout = null; }
    else if (Math.random() > p.traits.honesty && Math.random() < 0.3) {
      const foe = living().filter(x => x !== p && x !== q && R(p, x).like < -0.2).sort((a, b) => R(p, a).like - R(p, b).like)[0];
      if (foe) claim(p, q, { id: 'lie' + Math.random(), kind: 'accuse', subject: foe.id, victim: pick(living().filter(x => x !== foe && x.kind === 'human')).id, type: pick(['theft', 'assault', 'burglary']), lie: true });
    }
  }
  sim.converse = converse;
  function court(p, q) {
    const a = attracted(q, p), like = R(q, p).like;
    const gain = 0.05 + a * 0.08 + like * 0.05 + (p.coin > q.coin ? 0.03 * q.traits.greed : 0);
    if (!R(p, q).court) R(p, q).since = sim.day;
    R(p, q).court = (R(p, q).court || 0) + gain; bump(q, p, 'like', gain * 0.6);
    if (R(p, q).court > 1 && sim.day - (R(p, q).since || sim.day) >= 3 && !p.spouse && !q.spouse) {
      const yes = like * 2 + a + (p.coin + (p.home != null ? HOUSES[p.home].stash : 0)) * 0.04 * q.traits.greed - 0.8 + rnd(-0.3, 0.3);
      if (yes > 0) marry(p, q); else { bump(p, q, 'like', -0.1); R(p, q).court = 0; log('life', `${q.name} turns down ${p.name}'s proposal.`, [p.id, q.id]); }
    }
  }
  function campaign(p, q) {
    const bribe = p.coin > 8 && q.traits.greed > 0.6 && p.traits.honesty < 0.5 ? 2 : 0;
    if (bribe) { pay(p, q, bribe); (q.voteBribes ||= {})[p.id] = (q.voteBribes[p.id] || 0) + bribe; }
    const r = d(20) + p.skills.diplomacy; if (r >= 12) bump(q, p, 'like', 0.08); else bump(q, p, 'like', -0.02);
  }
  function recruit(p, q) {
    if (!p.gang) return;
    const g = sim.gangs[p.gang], offer = Math.min(3, p.coin);
    const yes = R(q, p).like + R(q, p).trust - q.traits.honesty + (q.coin < 4 ? 0.5 : 0) + offer * 0.1 + (isGuard(q) ? q.traits.greed - 0.6 : 0) + rnd(-0.3, 0.3);
    if (yes > 0.4 && !q.gang) { pay(p, q, offer); q.gang = p.gang; log('gang', `${fullName(q)} joins ${g.name}${isGuard(q) ? ' (a guard!)' : ''}.`, [p.id, q.id]); }
    else bump(q, p, 'like', -0.05);
  }
  function askToJoin(p, boss, gid) { if (!sim.gangs[gid] || boss.gang !== gid) return; if (R(boss, p).like > 0 || R(boss, p).trust > 0.4) { p.gang = gid; log('gang', `${fullName(p)} joins ${sim.gangs[gid].name}.`, [p.id, boss.id]); } }
  function seekWork(p) {
    // public vacancies first (the mayor hires), then businesses that lost a worker
    const filled = j => living().filter(q => q.job === j).length;
    const want = { guard: 2, nightguard: 2, clerk: 1, undertaker: 1, cleric: 1, doctor: 1, teacher: 1, jailer: 1, bakehand: 1, shophand: 1, apprentice: 1, server: 1, ranchhand: 1, farmhand: 2 };
    const open = Object.entries(want).filter(([j, n]) => filled(j) < n + (sim.extraHires?.[j] || 0) && (JOBS[j].payer !== 'town' || sim.treasury > 20) && !(JOBS[j].guard && openRecord(p).length));
    if (!open.length) return;
    const [job] = open.sort((a, b) => (JOBS[b[0]].wage) - (JOBS[a[0]].wage))[0];
    p.job = job; log('life', `${fullName(p)} takes work as ${JOBS[job].title.toLowerCase()}.`, [p.id]);
  }

  // ---- crimes --------------------------------------------------------------
  function pickpocket(p, q) {
    cool(p, 'pick', 90);
    const r = d(20) + p.skills.sleight, spot = d(20) + q.skills.spot;
    const n = Math.min(q.coin, irnd(1, 4));
    if (r >= Math.max(spot, 12)) {
      pay(q, p, n); p.stats.stolen += n;
      const { seen } = deed('theft', p, q, q, { victimKnows: false });
      log('crime', `${fullName(p)} lifts ${n}c from ${q.name}${seen.length ? ` (seen by ${seen.map(s => s.name).join(', ')})` : ' unseen'}.`, [p.id, q.id]);
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
    const hs = HOUSES[hi], lock = 14 + (hs.stash > 20 ? 2 : 0);
    const r = d(20) + p.skills.openlock + (p.items.picks ? 2 : -2);
    if (r < lock) { log('crime', `${p.name} fails to pick the lock of ${AREAS[hs.id].name}.`, [p.id]); deed('trespass', p, null, hs.door); return; }
    const n = Math.min(hs.stash, irnd(4, 15)); hs.stash -= n; p.coin += n; p.stats.stolen += n;
    const owner = living().find(q => q.home === hi);
    const { seen } = deed('burglary', p, owner, hs.bed, { victimKnows: false });
    log('crime', `${fullName(p)} burgles ${AREAS[hs.id].name} for ${n}c${seen.length ? ` (seen by ${seen.map(s => s.name).join(', ')})` : ' unseen'}.`, [p.id]);
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
    if (how === 'saw') { const r = actor.record.find(x => x.ev === ev.id); if (r) r.evidence = true; else actor.record.push({ ev: ev.id, type: ev.type, victim: ev.victim, by: [g.id], day: sim.day, served: false, evidence: true }); }
  }
  function confrontArrest(g, q) {
    // The guard states the charge; the suspect chooses: come quietly, talk, pay, run or fight.
    if (q.brain === 'human') { sim.pendingArrest = { guard: g.id, t: sim.t }; log('law', `${g.name}: "${q.name}, you're under arrest."`, [g.id, q.id]); if (sim.onArrest) sim.onArrest(g, q); return; }
    const sentence = openRecord(q).reduce((s, r) => s + (CRIMES[r.type] || 2), 0);
    const flee = q.traits.caution < 0.4 && might(q) < might(g), fight = q.traits.aggression * might(q) > might(g) * 0.9 + backers(g).length;
    const bribeAmt = Math.min(q.coin, 3 + sentence);
    if (q.coin >= 4 && q.traits.honesty < 0.6 && acceptsBribe(g, bribeAmt)) { pay(q, g, bribeAmt); deed('bribery', q, g, g, { victimKnows: false }); log('law', `${q.name} slips ${g.name} ${bribeAmt}c and walks free.`, [g.id, q.id]); return; }
    if (fight) return startFight(q, g, { mode: q.traits.aggression > 0.8 ? 'lethal' : 'nonlethal', why: 'resisting arrest' });
    if (flee) { setTask(q, 'flee', { from: P(g.x, g.z) }); log('law', `${q.name} bolts from ${g.name}.`, [g.id, q.id]); return startFight(g, q, { mode: 'nonlethal', why: 'arrest' }); }
    setTask(g, 'haul', { target: q.id, until: sim.t + 240 }); log('law', `${q.name} comes quietly with ${g.name}.`, [g.id, q.id]);
  }
  sim.confrontArrest = confrontArrest;
  function acceptsBribe(off, amt) {
    const greedy = off.traits.greed * amt * 0.5, risk = witnesses(off, [off]).length * 2 + off.traits.honesty * 6 + (off.id === sim.mayorId ? 2 : 0);
    return greedy + rnd(-1, 1) > risk;
  }
  sim.acceptsBribe = acceptsBribe;
  function jail(q, g) {
    const sentence = Math.max(1, openRecord(q).reduce((s, r) => s + (CRIMES[r.type] || 2), 0));
    openRecord(q).forEach(r => r.served = true);
    q.jailedUntil = sim.t + sentence * 24 * 60 / 4;   // a quarter day per point of crime
    q.task = { kind: 'jail', t0: sim.t }; q.state = 'jail';
    const cell = SPOTS.cells.find(c => !living().some(o => o !== q && o.jailedUntil > 0 && dist2(o, c) < 0.5)) || SPOTS.cells[0];
    place(q, cell); q.down = null; q.nl = 0; if (q.hp < 1) q.hp = 1;
    if (g) { g.stats.arrests++; sim.rec.arrests++; const b = sim.bounty[q.id]; if (b) { pay('town', g, b); delete sim.bounty[q.id]; } }
    log('law', `${fullName(q)} is jailed for ${(sentence / 4).toFixed(1)} days${g ? ' by ' + g.name : ''}.`, [q.id, g?.id].filter(Boolean));
  }
  sim.jail = jail;

  // ---- death and the graveyard ---------------------------------------------------
  function die(p, killer, how) {
    if (!p.alive) return;
    p.alive = false; p.deadAt = sim.t; p.state = 'dead'; p.task = null; p.dying = false; sim.rec.deaths++;
    sim.bodies.push({ id: p.id, name: fullName(p), x: p.x, z: p.z, coin: p.coin, items: { ...p.items }, weapon: p.weapon, buried: false, killer: killer?.id || null, how });
    p.coin = 0;
    log('death', `${fullName(p)} dies${killer ? ' at the hands of ' + fullName(killer) : ''}${how ? ' (' + how + ')' : ''}.`, [p.id, killer?.id].filter(Boolean));
    if (killer) { killer.stats.kills++; deed('murder', killer, p, p, { victimKnows: false }); }
    for (const q of living()) if (R(q, p).like > 0.4 && killer) { q.grudge = q.grudge || {}; q.grudge[killer.id] = (q.grudge[killer.id] || 0) + 6 + R(q, p).like * 6; }
    if (p.spouse && sim.people[p.spouse]) { sim.people[p.spouse].spouse = null; sim.people[p.spouse].widowed = p.id; }
    if (p.id === sim.mayorId) { log('politics', 'The mayor is dead. The office is empty until the election.', []); sim.mayorId = null; }
    if (p.id === sim.captainId) sim.captainId = null;
    for (const g of Object.values(sim.gangs)) if (g.boss === p.id) succession(g);
  }
  sim.die = die;
  function succession(g) {
    const heirs = gangMembers(g.id).sort((a, b) => might(b) + b.traits.ambition * 3 - might(a) - a.traits.ambition * 3);
    if (heirs[0]) { g.boss = heirs[0].id; log('gang', `${fullName(heirs[0])} takes over ${g.name}.`, [heirs[0].id]); }
    else { log('gang', `${g.name} is finished.`); delete sim.gangs[g.id]; }
  }
  // who needs carrying to the infirmary: the dying, and the badly hurt left lying (not those in a fight, a cell or already carried)
  function patients() {
    return living().filter(q => q.kind === 'human' && q.alive && !q.fight && q.jailedUntil <= 0 && !q.carriedBy && areaOf(q) !== 'healer' && (q.dying || (q.down && q.hp < q.maxhp * 0.5)))
      .sort((a, b) => (b.dying ? 1 : 0) - (a.dying ? 1 : 0));
  }
  sim.patients = patients;
  const doctorIn = () => living().some(q => q.job === 'doctor' && free(q) && areaOf(q) === 'healer' && q.task?.kind === 'work');
  const classInSession = () => living().some(q => q.job === 'teacher' && free(q) && areaOf(q) === 'school' && q.task?.kind === 'work');
  sim.doctorIn = doctorIn;
  function treatPatients(dt) {
    for (const q of living()) if (areaOf(q) === 'healer' && q.kind === 'human' && q.hp < q.maxhp) {
      if (q.dying) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 60; }
      q.hp = Math.min(q.maxhp, q.hp + dt / 30); q.nl = Math.max(0, q.nl - dt / 10);
    }
  }
  function carry(p, q) { q.carriedBy = p.id; q.x = p.x + 0.3; q.z = p.z + 0.3; }
  function drop(q) { q.carriedBy = null; }
  function doRescue(p, dt) {
    const q = target(p.task.target);
    if (!q || !q.alive || q.fight || (!q.dying && !q.down && !p.task.carrying)) { if (q) drop(q); p.task = null; return; }
    if (!p.task.carrying) {
      if (dist2(p, q) > 1.4) { arrive(p, q, dt, 2.0); return; }
      if (q.dying) { const r = d(20) + p.skills.heal; if (r >= 15) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 120; log('life', `${p.name} stabilizes ${q.name}.`, [p.id, q.id]); } else return; }
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
  function doCollect(p, dt) {          // the undertaker brings the dead to the chapel to be laid out
    const b = sim.bodies.filter(b => !b.buried && !b.collected).sort((x, y) => dist2(p, x) - dist2(p, y))[0];
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
    const fee = 2, kin = dead && dead.home != null ? living().find(q => q.home === dead.home) : null;
    pay(kin && kin.coin >= fee ? kin : 'town', p, fee);
    for (const q of living()) remember(q, { grave: plot, who: b.id, name: b.name });   // everyone knows who lies where
    log('death', `${b.name} is buried in plot ${plot}.`, [b.id, p.id]);
    p.task = null;
  }

  // ========================================================= D&D 3.5 combat ==
  // A fight is a bubble: initiative order, 6-second rounds, turn by turn. Only the people
  // in it take turns; the town keeps moving around them.
  function startFight(a, b, o = {}) {
    if (!conscious(a) || !b.alive) return null;
    let f = sim.fights.find(f => f.sides.has(a.id) || f.sides.has(b.id));
    if (!f) {
      f = { id: 'f' + Math.random().toString(36).slice(2, 7), round: 1, order: [], turn: 0, sides: new Map(), mode: new Map(), log: [], started: sim.t, why: o.why || 'a fight', at: P(a.x, a.z) };
      sim.fights.push(f);
      log('fight', `${a.name} attacks ${b.name}${o.why ? ' (' + o.why + ')' : ''}.`, [a.id, b.id]);
    }
    join(f, a, 'A' + a.id, o.mode || 'nonlethal');
    join(f, b, f.sides.get(b.id) || 'B' + b.id, b.brain === 'human' ? (b.prefMode || 'lethal') : 'nonlethal');
    (a.foes ||= new Set()).add(b.id); (b.foes ||= new Set()).add(a.id);
    // the one attacked is a victim: it's an assault (witnessed) unless it's a lawful arrest
    if (b.kind === 'human' && !(isGuard(a) && (o.why === 'arrest' || o.why === 'resisting arrest' && false))) deed(o.why === 'mug' ? 'mugging' : 'assault', a, b, b);
    else if (b.kind === 'animal' && b.owner && sim.people[b.owner]) deed('assault', a, sim.people[b.owner], b);
    // allies nearby decide whether to join (backers, gang, owners' dogs, guards on duty)
    for (const x of [a, b]) if (x.party) for (const q of living()) if (q !== x && q.party === x.party && conscious(q) && !f.sides.has(q.id) && dist2(q, x) < 25) { join(f, q, f.sides.get(x.id), x === a ? (o.mode || 'nonlethal') : 'nonlethal'); log('fight', `${q.name} joins in with ${x.name}'s party.`, [q.id, x.id]); }
    if (o.quiet) return f;
    for (const q of [...living(), ...Object.values(sim.animals)]) {
      if (f.sides.has(q.id) || !conscious(q) || dist2(q, b) > 14 || q.brain === 'human') continue;
      if (q.kind === 'animal') { if (q.temper === 'aggressive' && q.owner && (q.owner === b.id || q.owner === a.id)) join(f, q, f.sides.get(q.owner), 'lethal'); continue; }
      for (const [x, y] of [[a, b], [b, a]]) {
        const stake = (q.spouse === x.id ? 1 : 0) + (q.gang && q.gang === x.gang ? 0.8 : 0) + R(q, x).like - R(q, y).like * 0.5 + (isGuard(q) && onDuty(q) && x === b ? 0.6 : 0);
        if (stake * q.traits.loyalty - q.traits.caution * 0.6 > 0.35 && (might(q) + 2) > might(y) * 0.5) { join(f, q, f.sides.get(x.id), isGuard(q) ? 'nonlethal' : (q.traits.aggression > 0.75 ? 'lethal' : 'nonlethal')); (q.foes ||= new Set()).add(y.id); log('fight', `${q.name} joins in on ${x.name}'s side.`, [q.id, x.id]); break; }
      }
    }
    return f;
  }
  sim.startFight = startFight;
  function join(f, p, side, mode) {
    if (f.sides.has(p.id)) return;
    f.sides.set(p.id, side); f.mode.set(p.id, mode);
    p.init = d(20) + mod(p.kind === 'human' ? p.st.dex : 2) + (p.kind === 'animal' ? 2 : 0);
    p.fight = f.id; p.task = null; p.state = 'fight'; p.flatfooted = f.round === 1;
    f.order.push(p.id); f.order.sort((x, y) => (body(y).init || 0) - (body(x).init || 0));
  }
  const body = id => sim.people[id] || sim.animals[id];
  sim.body = body;
  const foesOf = (f, p) => f.order.map(body).filter(q => q && f.sides.get(q.id) !== f.sides.get(p.id) && q.alive && conscious(q));
  const threatened = (f, p) => foesOf(f, p).filter(q => dist2(q, p) <= 2.1 && (q.kind === 'animal' || WEAPONS[q.weapon].melee && q.weapon !== 'fists' || q.weapon === 'fists' && false));
  sim.foesOf = foesOf;

  function attack(f, a, t, o = {}) {
    const w = a.kind === 'animal' ? { name: 'bite', dmg: a.bite, crit: [20, 2], melee: true } : WEAPONS[a.weapon];
    const mode = o.mode || f.mode.get(a.id) || 'lethal';
    const ranged = !!w.range;
    if (!ranged && dist2(a, t) > 2.1) return logF(f, `${a.name} can't reach ${t.name}.`);
    let bonus = a.kind === 'animal' ? 2 : babOf(a) + (ranged ? mod(a.st.dex) : mod(a.st.str));
    if (o.charge) bonus += 2;
    if (ranged) { const inc = Math.floor(dist2(a, t) / w.range); bonus -= inc * 2; if (threatened(f, a).length) provoke(f, a); }
    const wantNL = mode === 'nonlethal';
    if (wantNL !== !!w.nonlethal) bonus -= 4;    // a lethal weapon pulled for nonlethal, or fists going for blood
    const ac = t.kind === 'animal' ? t.ac : acOf(t);
    const r = d(20), total = r + bonus, helpless = !conscious(t);
    if (r !== 20 && (r === 1 || total < ac) && !helpless) return logF(f, `${a.name} attacks ${t.name} with ${w.name.toLowerCase()} and misses (${total} vs AC ${ac}).`);
    let dmg = roll(w.dmg[0], w.dmg[1]) + (a.kind === 'animal' ? 0 : ranged ? 0 : mod(a.st.str));
    let crit = false;
    if (r >= w.crit[0]) { const c = d(20) + bonus; if (c >= ac) { crit = true; for (let i = 1; i < w.crit[1]; i++) dmg += roll(w.dmg[0], w.dmg[1]) + (ranged || a.kind === 'animal' ? 0 : mod(a.st.str)); } }
    dmg = Math.max(1, dmg);
    hurt(t, dmg, wantNL, a);
    logF(f, `${a.name} hits ${t.name} with ${w.name.toLowerCase()} for ${dmg}${wantNL ? ' nonlethal' : ''}${crit ? ' (critical!)' : ''} (${total} vs AC ${ac}). ${status(t)}`);
  }
  sim.attack = attack;
  function hurt(t, dmg, nonlethal, by) {
    if (t.kind === 'animal') {
      if (!t.alive) return;
      t.hp -= dmg;
      if (t.hp <= 0) {
        t.alive = false; t.state = 'dead';
        if (t.meat && by) {     // the kill is shared among the hunting party in the fight
          const f = sim.fights.find(f => f.sides.has(by.id)), share = f ? f.order.map(body).filter(q => q && q.kind === 'human' && q.alive && f.sides.get(q.id) === f.sides.get(by.id)) : [by];
          for (let i = 0; i < t.meat; i++) { const q = share[i % share.length]; q.items.meat = (q.items.meat || 0) + 1; }
          log('trade', `${by.name}${share.length > 1 ? "'s party" : ''} brings down a ${t.species} (${t.meat} meat${share.length > 1 ? ', shared ' + share.map(q => q.name).join(', ') : ''}).`, share.map(q => q.id));
          if (by.party) disband(sim.people[by.id]);
        }
      }
      return;
    }
    if (nonlethal) t.nl += dmg; else t.hp -= dmg;
    t.lastHurtBy = by?.id;
    if (t.hp <= -10) { if (t.brain === 'human') { t.hp = 0; t.down = 'out'; t.downUntil = sim.t + 30; } else die(t, by, 'killed in a fight'); }
    else if (t.hp <= 0) { if (t.brain === 'human') { t.down = 'out'; t.downUntil = sim.t + 30; } else { t.dying = t.hp < 0; t.down = 'dying'; } }
    else if (t.nl >= t.hp) { t.down = 'out'; t.downUntil = sim.t + 30 + t.nl * 6; }
  }
  sim.hurt = hurt;
  const status = t => !t.alive ? `${t.name} is dead.` : t.kind === 'animal' ? '' : t.dying ? `${t.name} is dying.` : t.down === 'out' ? `${t.name} is knocked out.` : t.hp <= 0 ? `${t.name} is disabled.` : t.nl >= t.hp ? `${t.name} is staggered.` : '';
  function provoke(f, mover) {
    for (const q of threatened(f, mover)) { if (q.aooUsed === f.round) continue; q.aooUsed = f.round; logF(f, `${q.name} gets an attack of opportunity on ${mover.name}.`); attack(f, q, mover); }
  }
  function logF(f, text) { f.log.push(text); log('fight', text, []); }

  // the actions a fighter may take on their turn (D&D 3.5)
  // standard: attack, total defence, draw/drink, stabilize, intimidate (demoralize), feint, coup de grace (full-round)
  // move: move (speed), draw weapon, stand up; swift: shout for help; free: drop weapon / surrender, 5-foot step
  // full-round: charge, run, withdraw, full attack (one attack at these levels)
  const SPEED = p => p.kind === 'animal' ? (p.species === 'dog' ? 12 : 9) : (p.armor === 'chain' ? 6 : 9);
  function legalActions(f, p) {
    const acts = [], foes = foesOf(f, p), adj = foes.filter(q => dist2(q, p) <= 2.1), helpless = f.order.map(body).filter(q => q && q.alive && q.kind === 'human' && !conscious(q) && f.sides.get(q.id) !== f.sides.get(p.id) && dist2(q, p) <= 2.1);
    const w = p.kind === 'animal' ? { melee: true } : WEAPONS[p.weapon];
    const tn = p.turnLeft || { standard: 1, move: 1, swift: 1, step: 1 };
    if (tn.standard) {
      for (const q of foes) if ((w.range && dist2(q, p) < w.range * 5) || dist2(q, p) <= 2.1) acts.push({ id: 'attack', target: q.id, label: `Attack ${q.name}`, cost: 'standard' });
      if (tn.move && tn.standard) for (const q of foes) { const dd = dist2(q, p); if (dd > 3 && dd <= SPEED(p) * 2 && w.melee) acts.push({ id: 'charge', target: q.id, label: `Charge ${q.name}`, cost: 'full' }); }
      acts.push({ id: 'defend', label: 'Total defence (+4 AC)', cost: 'standard' });
      if (p.kind === 'human') for (const q of foes.filter(q => q.kind === 'human' && dist2(q, p) < 9)) acts.push({ id: 'demoralize', target: q.id, label: `Intimidate ${q.name}`, cost: 'standard' });
      if (p.kind === 'human') for (const q of adj.filter(q => q.kind === 'human')) acts.push({ id: 'feint', target: q.id, label: `Feint ${q.name} (Bluff)`, cost: 'standard' });
      if (p.kind === 'human' && p.items.cure) acts.push({ id: 'drink', label: 'Drink a healing draught', cost: 'standard' });
      for (const q of f.order.map(body).filter(q => q && q.dying && f.sides.get(q.id) === f.sides.get(p.id) && dist2(q, p) <= 2.1)) acts.push({ id: 'stabilize', target: q.id, label: `Stabilize ${q.name} (Heal DC 15)`, cost: 'standard' });
      if (p.kind === 'human') for (const q of helpless) acts.push({ id: 'coup', target: q.id, label: `Coup de grace on ${q.name} (kills)`, cost: 'full' });
      for (const q of helpless) if (p.kind === 'human') acts.push({ id: 'rob', target: q.id, label: `Rob ${q.name}`, cost: 'standard' });
      if (tn.move) acts.push({ id: 'run', label: 'Run (4× speed, away)', cost: 'full' });
      if (tn.move && p.kind === 'human') acts.push({ id: 'withdraw', label: 'Withdraw (no attack of opportunity leaving)', cost: 'full' });
    }
    if (tn.move) for (const q of foes) if (dist2(q, p) > 2.1) acts.push({ id: 'move', target: q.id, label: `Move toward ${q.name}`, cost: 'move' });
    if (tn.step && tn.move) acts.push({ id: 'step', label: '5-foot step back', cost: 'step' });
    if (tn.swift && p.kind === 'human') acts.push({ id: 'shout', label: 'Shout for help (swift)', cost: 'swift' });
    if (p.kind === 'human') acts.push({ id: 'mode', label: `Switch to ${f.mode.get(p.id) === 'lethal' ? 'nonlethal' : 'lethal'} blows`, cost: 'free' });
    if (p.kind === 'human') acts.push({ id: 'surrender', label: 'Surrender', cost: 'free' });
    acts.push({ id: 'end', label: 'End turn', cost: 'free' });
    return acts;
  }
  sim.legalActions = legalActions;
  function act(f, p, a) {
    const tn = p.turnLeft; const t = a.target ? body(a.target) : null;
    const spend = c => { if (c === 'full') { tn.standard = 0; tn.move = 0; tn.step = 0; } else if (c === 'standard') tn.standard = 0; else if (c === 'move') { tn.move = 0; tn.step = 0; } else if (c === 'swift') tn.swift = 0; else if (c === 'step') { tn.step = 0; tn.moved = true; } };
    switch (a.id) {
      case 'attack': attack(f, p, t); spend('standard'); break;
      case 'charge': { moveToward(p, t, SPEED(p) * 2, 1.6); provoke(f, p); p.charged = true; attack(f, p, t, { charge: true }); spend('full'); break; }
      case 'move': { if (threatened(f, p).length) provoke(f, p); moveToward(p, t, SPEED(p), 1.6); spend('move'); break; }
      case 'step': { const foe = foesOf(f, p).sort((x, y) => dist2(p, x) - dist2(p, y))[0]; if (foe) moveAway(p, foe, 1.5); spend('step'); logF(f, `${p.name} takes a 5-foot step.`); break; }
      case 'defend': p.defending = true; spend('standard'); logF(f, `${p.name} goes on total defence.`); break;
      case 'demoralize': { const r = d(20) + p.skills.intimidate, dc = 10 + t.level + mod(t.st.wis); if (r >= dc) { t.shaken = (f.round + 2); logF(f, `${p.name} intimidates ${t.name}: shaken (−2) (${r} vs ${dc}).`); } else logF(f, `${t.name} isn't impressed by ${p.name} (${r} vs ${dc}).`); spend('standard'); break; }
      case 'feint': { const r = d(20) + p.skills.bluff, dc = d(20) + t.skills.sense + babOf(t); if (r >= dc) { t.flatfooted = true; logF(f, `${p.name} feints; ${t.name} is caught flat-footed (${r} vs ${dc}).`); } else logF(f, `${t.name} sees through ${p.name}'s feint.`); spend('standard'); break; }
      case 'drink': { if (threatened(f, p).length) provoke(f, p); p.items.cure--; const h = roll(1, 8) + 1; p.hp = Math.min(p.maxhp, p.hp + h); logF(f, `${p.name} drinks a draught (+${h} hp).`); spend('standard'); break; }
      case 'stabilize': { const r = d(20) + p.skills.heal; if (r >= 15) { t.dying = false; t.down = 'out'; t.downUntil = sim.t + 120; logF(f, `${p.name} stabilizes ${t.name}.`); } else logF(f, `${p.name} fails to stop ${t.name}'s bleeding.`); spend('standard'); break; }
      case 'coup': { logF(f, `${p.name} delivers a coup de grace to ${t.name}.`); const w = WEAPONS[p.weapon], dmg = roll(w.dmg[0], w.dmg[1]) * w.crit[1] + mod(p.st.str) * w.crit[1]; const save = d(20) + mod(t.st.con) + 1; if (dmg >= t.hp + 10 || save < 10 + dmg) die(t, p, 'coup de grace'); else hurt(t, dmg, false, p); spend('full'); break; }
      case 'rob': { const n = t.coin; pay(t, p, n); p.stats.stolen += n; deed('theft', p, t, t, { victimKnows: false }); logF(f, `${p.name} empties ${t.name}'s purse (${n}c).`); spend('standard'); break; }
      case 'run': { const foe = foesOf(f, p)[0]; if (threatened(f, p).length) provoke(f, p); if (foe) moveAway(p, foe, SPEED(p) * 4); p.fled = (p.fled || 0) + 1; logF(f, `${p.name} runs!`); spend('full'); break; }
      case 'withdraw': { const foe = foesOf(f, p)[0]; if (foe) moveAway(p, foe, SPEED(p) * 2); p.fled = (p.fled || 0) + 1; logF(f, `${p.name} withdraws.`); spend('full'); break; }
      case 'shout': { logF(f, `${p.name} shouts for help!`); for (const q of living()) if (!f.sides.has(q.id) && conscious(q) && dist2(q, p) < 30 && q.brain !== 'human') { const ally = R(q, p).like + (isGuard(q) && onDuty(q) ? 0.7 : 0) + (q.spouse === p.id ? 1 : 0); if (ally * q.traits.loyalty > 0.35 + q.traits.caution * 0.4) { join(f, q, f.sides.get(p.id), isGuard(q) ? 'nonlethal' : 'nonlethal'); logF(f, `${q.name} answers the call.`); } } spend('swift'); break; }
      case 'mode': f.mode.set(p.id, f.mode.get(p.id) === 'lethal' ? 'nonlethal' : 'lethal'); logF(f, `${p.name} switches to ${f.mode.get(p.id)} blows.`); break;
      case 'surrender': { p.surrendered = true; logF(f, `${p.name} surrenders.`); tn.standard = tn.move = tn.swift = tn.step = 0; break; }
      case 'end': tn.standard = tn.move = tn.swift = tn.step = 0; break;
    }
  }
  sim.act = act;
  function moveToward(p, t, maxd, stopAt) { const dd = dist2(p, t), go = Math.max(0, Math.min(maxd, dd - stopAt)); if (dd > 0) { p.x += (t.x - p.x) / dd * go; p.z += (t.z - p.z) / dd * go; p.yaw = Math.atan2(t.x - p.x, t.z - p.z); } if (!walkable(p)) { p.x -= (t.x - p.x) / dd * go * 0.5; p.z -= (t.z - p.z) / dd * go * 0.5; } }
  function moveAway(p, t, maxd) { const dx = p.x - t.x, dz = p.z - t.z, l = Math.hypot(dx, dz) || 1; for (let s = maxd; s > 0.5; s *= 0.6) { const n = P(p.x + dx / l * s, p.z + dz / l * s); if (walkable(n)) { p.x = n.x; p.z = n.z; return; } } }
  // the scripted fighter: hit the weakest reachable foe; flee when losing; finish only if lethal-minded
  function npcTurn(f, p) {
    const acts = legalActions(f, p), mode = f.mode.get(p.id), foes = foesOf(f, p), tr = p.traits || { aggression: 0.7, greed: 0, honesty: 1, caution: 0.2 };
    const hpFrac = p.kind === 'animal' ? p.hp / p.maxhp : (p.hp - p.nl) / p.maxhp;
    if (p.kind === 'animal' && p.game && (GAME[p.species].flees || hpFrac < 0.3)) { const run = acts.find(a => a.id === 'run') || acts.find(a => a.id === 'withdraw'); if (run && !p.flatfooted) return act(f, p, run); }
    if (p.kind === 'human' && hpFrac < 0.35 && tr.caution > 0.3) { const run = acts.find(a => a.id === 'withdraw') || acts.find(a => a.id === 'run'); if (run) return act(f, p, run); }
    if (p.kind === 'human' && hpFrac < 0.2 && foes.length && power(foes[0]) > power(p) * 1.5) return act(f, p, { id: 'surrender' });
    const coup = acts.find(a => a.id === 'coup');
    if (coup && p.kind === 'human') { const t = body(coup.target), motive = (p.grudge?.[t.id] || 0) > 6 || [...(t.knows || [])].some(id => sim.events.find(e => e.id === id && e.actor === p.id && (CRIMES[e.type] || 0) >= 4)) || tr.aggression > 0.92; if (motive && (mode === 'lethal' || tr.aggression > 0.8)) return act(f, p, coup); }
    const rob = acts.find(a => a.id === 'rob' && body(a.target).coin > 0);
    if (rob && tr.greed > 0.6 && tr.honesty < 0.5) return act(f, p, rob);
    const atk = acts.filter(a => a.id === 'attack').sort((x, y) => (body(x.target).hp - body(x.target).nl) - (body(y.target).hp - body(y.target).nl))[0];
    if (atk) { if (p.turnLeft.move && Math.random() < 0.15 && acts.find(a => a.id === 'demoralize')) act(f, p, acts.find(a => a.id === 'demoralize' && a.target === atk.target) || atk); return act(f, p, atk); }
    const charge = acts.find(a => a.id === 'charge'); if (charge && p.kind === 'human' && tr.aggression > 0.4) return act(f, p, charge);
    const mv = acts.find(a => a.id === 'move'); if (mv) { act(f, p, mv); const atk2 = legalActions(f, p).find(a => a.id === 'attack'); if (atk2) act(f, p, atk2); return; }
    act(f, p, { id: 'end' });
  }
  // advance a fight by one turn; the player's turns wait for input
  sim.fightStep = f => {
    if (!f.order.length) return endFight(f);
    if (f.turn >= f.order.length) { f.turn = 0; f.round++; bleed(f); }
    const p = body(f.order[f.turn]);
    if (!p || !p.alive || !conscious(p) || p.surrendered || (p.fled || 0) >= 2 || foesOf(f, p).every(q => dist2(q, p) > 30)) { f.turn++; return checkEnd(f); }
    if (!p.turnLeft || p.turnRound !== f.round) { p.turnLeft = { standard: 1, move: 1, swift: 1, step: 1 }; p.turnRound = f.round; p.defending = false; p.charged = false; if (f.round > 1) p.flatfooted = false; }
    if (p.brain === 'human') { f.waiting = p.id; return 'player'; }
    if (p.brain !== 'script' && p.brain !== 'human' && p.kind === 'human') { /* AI people fight with the same script; their AI chose to be here */ }
    npcTurn(f, p);
    f.turn++; p.turnLeft = null;
    return checkEnd(f);
  };
  sim.playerDone = f => { const p = body(f.waiting); f.waiting = null; if (p) p.turnLeft = null; f.turn++; checkEnd(f); };
  function bleed(f) { for (const id of f.order) { const q = body(id); if (q && q.alive && q.dying) { if (d(10) === 1) { q.dying = false; q.down = 'out'; q.downUntil = sim.t + 240; logF(f, `${q.name} stabilizes.`); } else { q.hp--; if (q.hp <= -10) die(q, body(q.lastHurtBy), 'bled out'); } } } }
  function checkEnd(f) {
    const sides = new Set(f.order.map(body).filter(q => q && q.alive && conscious(q) && !q.surrendered && (q.fled || 0) < 2 && (q.kind === 'human' || q.temper !== 'passive')).map(q => f.sides.get(q.id)));
    if (f.order.map(body).some(q => q?.game && q.alive && (q.fled || 0) >= 2)) { for (const q of f.order.map(body)) if (q?.game && q.alive && (q.fled || 0) >= 2) { log('fight', `The ${q.species} gets away.`, []); q.fled = 0; } }
    if (sides.size <= 1 || f.round > 30) return endFight(f, [...sides][0]);
  }
  function endFight(f, winnerSide) {
    sim.fights = sim.fights.filter(x => x !== f);
    const winners = f.order.map(body).filter(q => q && q.alive && f.sides.get(q.id) === winnerSide && conscious(q));
    const fought = new Set(f.order);
    const losers = f.order.map(body).filter(q => q && q.alive && f.sides.get(q.id) !== winnerSide);
    for (const id of f.order) { const q = body(id); if (!q) continue; q.fight = null; q.state = 'idle'; q.surrendered = false; q.fled = 0; q.defending = false; q.foes = null; q.task = null; }
    log('fight', `The fight ${winners.length ? 'ends: ' + winners.map(w => w.name).join(', ') + ' stand' + (winners.length === 1 ? 's' : '') : 'breaks up'}.`, f.order);
    // a guard who wins with nonlethal blows takes the losers to jail
    const g = winners.find(w => w.kind === 'human' && isGuard(w));
    if (g) for (const q of losers) if (q.kind === 'human' && q.alive && fought.has(q.id) && !isGuard(q)) { const r = q.record.find(x => !x.served) || null; if (r || (q.lastHurtBy && sim.people[q.lastHurtBy] && f.sides.get(q.lastHurtBy) === winnerSide)) { if (!r) q.record.push({ ev: 'fight-' + f.id, type: 'assault', victim: g.id, by: [g.id], day: sim.day, served: false, evidence: true }); setTask(g, 'haul', { target: q.id, until: sim.t + 240 }); break; } }
    // winners choose what to do with the beaten: rob them, or leave them
    for (const w of winners) if (w.kind === 'human') w.stats.wins = (w.stats.wins || 0) + 1;
    for (const w of winners) if (w.kind === 'human' && !isGuard(w) && w.brain !== 'human') for (const q of losers) if (q.kind === 'human' && q.alive && !conscious(q) && w.traits.honesty < 0.5) {
      const n = q.coin, cargo = Object.entries(q.items).filter(([k, c]) => c > 0 && (MARROW.sells[k] || MARROW.buys[k] || GOODS[k]?.food));
      if (!n && !cargo.length) continue;
      pay(q, w, n); for (const [k, c] of cargo) { w.items[k] = (w.items[k] || 0) + c; q.items[k] = 0; }
      w.stats.stolen += n; deed('theft', w, q, q, { victimKnows: false, road: areaOf(q) === 'road' });
      log('crime', `${w.name} robs the beaten ${q.name} (${n}c${cargo.length ? ', ' + cargo.map(([k, c]) => c + ' ' + k).join(', ') : ''}).`, [w.id, q.id]);
    }
    if (sim.onFightEnd) sim.onFightEnd(f, winners, losers);
  }
  sim.endFight = endFight;

  // ============================================================ the town ==
  // salaries, rent, taxes, the cart, newcomers and leavers, elections
  function dailyTick() {
    sim.day++;
    // taxes on sales, collected by the town
    for (const b of Object.values(sim.business)) { const owner = sim.people[b.owner]; if (owner && owner.alive && b.owed >= 1) { const n = pay(owner, 'town', Math.floor(b.owed), 'tax'); b.owed -= n; } b.sales = 0; }
    // rent: a copper per adult per day, from pocket or stash
    for (const p of living()) {
      if (p.home == null || p.jailedUntil > 0 || p.brain === 'human' || p.town) continue;
      const due = sim.rent + (p.job !== 'none' ? sim.headTax : 0);
      if (p.coin >= due) pay(p, 'town', due, 'rent+head'); else if (HOUSES[p.home].stash >= due) { HOUSES[p.home].stash -= due; sim.treasury += due; sim.flow.in['rent+head'] = (sim.flow.in['rent+head'] || 0) + due; } else if (due > 0) { p.unpaid = (p.unpaid || 0) + 1; if (p.unpaid >= 3) { log('life', `${fullName(p)} is evicted for unpaid rent.`, [p.id]); p.home = null; p.unpaid = 0; } }
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
    // the trader's cart: buys surplus food (money in), sells a little grain dear (money out), restocks tools and goods
    const farm = sim.business.farm, farmer = sim.people[farm.owner];
    if (farmer && farmer.alive) for (const k of ['turnip', 'grain', 'barley']) { const n = Math.max(0, (farm.stock[k] || 0) - 15); if (n) { farm.stock[k] -= n; farmer.coin += n; log('trade', `The cart buys ${n} surplus ${k} (+${n}c).`); } }
    for (const [k, n] of Object.entries({ grain: 60, turnip: 60, barley: 30, meat: 15 })) sim.market.stock[k] = Math.min(n, (sim.market.stock[k] || 0) + Math.ceil(n / 4));
    for (const k of Object.keys(sim.market.moved)) sim.market.moved[k] = Math.round(sim.market.moved[k] * 0.5);
    for (const [bid, base] of Object.entries({ store: { rope: 3, torch: 6, treats: 6, ball: 2, plank: 6, picks: 1, cure: 4 }, smithy: { dagger: 3, club: 3, sap: 2, shortsword: 2, shortbow: 1, leather: 2 } })) {
      const b = sim.business[bid], owner = sim.people[b.owner]; if (!owner || !owner.alive) continue;
      let spent = 0; for (const [k, n] of Object.entries(base)) { const need = Math.max(0, n - (b.stock[k] || 0)), cost = Math.ceil(need * GOODS[k].price * 0.45); if (need && owner.coin >= cost) { b.stock[k] = n; owner.coin -= cost; spent += cost; } }
    }
    // nonlethal heals; injuries mend a little each day
    for (const b of (sim.brews || []).filter(b => sim.t >= b.ready)) sim.business.tavern.stock.ale = (sim.business.tavern.stock.ale || 0) + b.ale;
    sim.brews = (sim.brews || []).filter(b => sim.t < b.ready);
    for (const p of living()) { p.nl = 0; if (p.hp < p.maxhp && !p.dying) p.hp = Math.min(p.maxhp, p.hp + p.level); }
    // people who can't make a life here leave; newcomers arrive
    for (const p of living()) if (p.brain !== 'human' && p.coin <= 0 && (p.home == null ? 1 : HOUSES[p.home].stash) <= 0 && p.job === 'none' && p.food < 0.2 && Math.random() < 0.4 && p.id !== sim.mayorId) { p.alive = false; p.left = true; p.state = 'left'; sim.rec.leavers++; log('life', `${fullName(p)} gives up on Hollow Town and leaves.`, [p.id]); }
    const pop = living().filter(p => p.brain !== 'human' && p.town !== 'marrow').length;
    if (pop < 30 && Math.random() < 0.6) newcomers(Math.min(5, 30 - pop));
    // elections every seventh day
    if (sim.day % 7 === 0) sim.election.due = true;
    sim.history.push(snapshot());
    if (sim.onDay) sim.onDay(sim.day);
  }
  function newcomers(n) {
    const size = Math.min(n, irnd(1, 5)), surname = pick(SURNAMES);
    const freeHouse = HOUSES.findIndex((h, i) => living().filter(p => p.home === i).length === 0);
    const people = [];
    for (let i = 0; i < size; i++) {
      const p = makePerson(sim, { gender: pick(['m', 'f']), surname, cls: pick(['commoner', 'commoner', 'expert', 'warrior', 'rogue']), coin: irnd(5, 25), job: 'none', home: freeHouse >= 0 ? freeHouse : null });
      sim.people[p.id] = p; place(p, P(-63, rnd(-3, 3))); people.push(p);
      for (const q of living()) if (q !== p) { q.rel[p.id] = { like: rnd(-0.2, 0.15), trust: 0.1, fear: 0, court: 0 }; p.rel[q.id] = { like: rnd(-0.1, 0.2), trust: 0.15, fear: 0, court: 0 }; }
    }
    for (const a of people) for (const b of people) if (a !== b) { R(a, b).like = 0.7; R(a, b).trust = 0.8; }
    if (people.length >= 2 && attracted(people[0], people[1]) > 0.5) marry(people[0], people[1], true);
    sim.rec.newcomers += people.length;
    log('life', `${people.length === 1 ? 'A newcomer' : 'The ' + surname + ' family (' + people.length + ')'} arrives in Hollow Town${freeHouse < 0 ? ', with nowhere to live' : ''}.`, people.map(p => p.id));
  }
  function payWages(h) {   // when a shift ends, whoever worked at least 40% of it gets paid
    for (const p of living()) {
      const j = JOBS[p.job]; if (!j || !j.wage && !j.payer || j.to % 24 !== h || p.jailedUntil > 0) continue;
      const len = ((j.to - j.from) + 24) % 24 || 24;
      if (!p.worked || p.worked < len * 60 * 0.4) { p.worked = 0; continue; }
      const wage = j.payer === 'town' ? (sim.wages[p.job] ?? j.wage) : j.wage;
      const payer = j.payer === 'town' ? 'town' : sim.people[sim.business[j.payer]?.owner];
      const got = pay(payer && (payer === 'town' || payer.alive) ? payer : null, p, wage, 'wage:' + p.job);
      if (got < wage) { p.unpaidWages = (p.unpaidWages || 0) + 1; bump(p, j.payer === 'town' ? (sim.mayorId || p.id) : payer?.id || p.id, 'like', -0.15); }
      p.worked = 0;
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
        let s = R(v, c).like * 3 + R(v, c).trust + (v.voteBribes?.[c.id] || 0) * v.traits.greed * 0.4 + (c.gang && v.gang === c.gang ? 3 : 0) + (v.spouse === c.id ? 5 : 0) + (v === c ? 10 : 0);
        if (c.id === sim.mayorId) s += (v.unpaidWages ? -1.5 : 0.5) - crimeLately * 0.02 + (sim.taxRate < 0.12 ? 0.5 : -0.5);
        if (v.gang) { const boss = sim.people[sim.gangs[v.gang]?.boss]; if (boss && boss.voteFor === c.id) s += 2 * v.traits.loyalty; }
        s += rnd(-0.5, 0.5);
        if (s > bs) { bs = s; best = c; }
      }
      tally[best.id]++;
      v.voteBribes = null;
    }
    const ranked = cands.slice().sort((a, b) => tally[b.id] - tally[a.id]);
    const winner = ranked[0], old = sim.people[sim.mayorId];
    sim.election = { candidates: [], last: { day: sim.day, tally: Object.fromEntries(cands.map(c => [c.name, tally[c.id]])), winner: winner.id } };
    log('politics', `Election: ${cands.map(c => `${c.name} ${tally[c.id]}`).join(', ')}. ${fullName(winner)} ${winner === old ? 'keeps the office' : 'is the new mayor'}.`, cands.map(c => c.id));
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
  sim.applyMayor = (who, dec) => {
    if (!who || who.id !== sim.mayorId || !dec) return;
    const out = [];
    if (typeof dec.tax_rate === 'number') { sim.taxRate = clamp(dec.tax_rate, 0, 0.4); out.push(`tax ${Math.round(sim.taxRate * 100)}%`); }
    if (dec.wages) for (const [k, v] of Object.entries(dec.wages)) if (k in sim.wages && typeof v === 'number') { sim.wages[k] = clamp(Math.round(v), 0, 30); out.push(`${k} wage ${sim.wages[k]}c`); }
    if (dec.captain && sim.people[dec.captain]?.alive) { const c = sim.people[dec.captain]; if (sim.captainId && sim.people[sim.captainId]) sim.people[sim.captainId].job = 'guard'; c.job = 'captain'; sim.captainId = c.id; out.push(`${c.name} is captain`); }
    if (dec.bounty) for (const [id, amt] of Object.entries(dec.bounty)) if (sim.people[id]?.alive && typeof amt === 'number') { sim.bounty[id] = clamp(Math.round(amt), 0, 50); out.push(`bounty ${amt}c on ${sim.people[id].name}`); }
    if (typeof dec.curfew === 'boolean') { sim.curfew = dec.curfew; out.push(dec.curfew ? 'curfew' : 'no curfew'); }
    if (typeof dec.rent === 'number') { sim.rent = clamp(Math.round(dec.rent), 0, 5); out.push(`rent ${sim.rent}c`); }
    if (typeof dec.head_tax === 'number') { sim.headTax = clamp(Math.round(dec.head_tax), 0, 5); out.push(`head tax ${sim.headTax}c`); }
    if (typeof dec.bail === 'number') { sim.bail = clamp(Math.round(dec.bail), 1, 50); out.push(`bail ${sim.bail}c`); }
    if (Array.isArray(dec.hire)) { sim.extraHires = sim.extraHires || {}; for (const j of dec.hire) if (JOBS[j]?.payer === 'town' && j !== 'mayor') { sim.extraHires[j] = (sim.extraHires[j] || 0) + 1; out.push(`hiring a ${JOBS[j].title.toLowerCase()}`); } }
    if (Array.isArray(dec.fire)) for (const id of dec.fire) { const q = sim.people[id]; if (q?.alive && JOBS[q.job]?.payer === 'town' && q.id !== who.id) { q.job = 'none'; out.push(`fired ${q.name}`); } }
    if (Array.isArray(dec.pardon)) for (const id of dec.pardon) { const q = sim.people[id]; if (q) { openRecord(q).forEach(r => r.served = true); if (q.jailedUntil > 0) { q.jailedUntil = 0; q.task = null; place(q, SPOTS.desk); } out.push(`pardoned ${q.name}`); } }
    if (typeof dec.take_from_treasury === 'number' && dec.take_from_treasury > 0) embezzle(who, dec.take_from_treasury);
    if (dec.vote_for && sim.people[dec.vote_for]) who.voteFor = dec.vote_for;
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
    log('crime', `Mayor ${m.name} quietly takes ${n}c from the treasury${seen.length ? ` (seen by ${seen.map(w => w.name).join(', ')})` : ''}.`, [m.id]);
  }
  sim.embezzle = embezzle;
  // the fallback mayor, used when no AI answers: keep the treasury above three days of salaries
  function scriptedMayor(m) {
    const salaries = living().filter(p => JOBS[p.job]?.payer === 'town').reduce((s, p) => s + (sim.wages[p.job] ?? JOBS[p.job].wage), 0);
    const dec = {};
    if (sim.treasury < salaries * 2) dec.tax_rate = Math.min(0.3, sim.taxRate + 0.03); else if (sim.treasury > salaries * 6) dec.tax_rate = Math.max(0.05, sim.taxRate - 0.02);
    const worst = living().filter(p => openRecord(p).length >= 2 && p.jailedUntil <= 0).sort((a, b) => openRecord(b).length - openRecord(a).length)[0];
    if (worst && sim.treasury > 30 && !sim.bounty[worst.id]) dec.bounty = { [worst.id]: 4 };
    if (sim.events.filter(e => sim.t - e.t < 1440).length > 6 && sim.treasury > salaries * 4) dec.hire = ['guard'];
    if (sim.treasury > salaries * 3 && m.traits.greed > 0.6 && m.traits.honesty < 0.45 && Math.random() < 0.5) dec.take_from_treasury = Math.floor((sim.treasury - salaries * 3) * 0.3 * m.traits.greed);
    sim.applyMayor(m, dec);
  }

  // ===================================================== decisions by AIs ==
  // A brain that isn't the script gets asked, once each morning, for a plan (and the
  // mayor for the town's business). The question lists the legal choices; the answer is JSON.
  sim.decisionFor = (p, kind) => {
    const h = household(p), g = p.gang && sim.gangs[p.gang];
    const rels = Object.entries(p.rel).map(([id, r]) => [sim.people[id], r]).filter(([q]) => q && q.alive).sort((a, b) => Math.abs(b[1].like) - Math.abs(a[1].like)).slice(0, 8);
    const lines = [
      `You are ${fullName(p)}, ${p.age}, ${p.gender === 'nb' ? 'nonbinary' : p.gender === 'm' ? 'a man' : 'a woman'} (${p.orient}), living in Hollow Town, a small grim-fantasy village. Day ${sim.day}, ${sim.clock()}.`,
      `Your one goal: make as much money as you can. You will die permanently if killed; so will everyone else (except one person, below). Nobody tells you how to get rich.`,
      `Job: ${JOBS[p.job].title}${p.id === sim.mayorId ? ' (you hold the town\'s powers)' : ''}. Purse ${p.coin}c, savings at home ${p.home != null ? HOUSES[p.home].stash : 0}c. Health ${p.hp}/${p.maxhp}. ${p.food < 0.3 ? 'Hungry' : 'Fed'}, ${(p.water ?? 1) < 0.3 ? 'thirsty' : 'not thirsty'}. Food is grown, baked, brewed or hunted; water is free at the well.`,
      `Market prices: ${['bread', 'meal', 'turnip', 'meat', 'ale', 'grain'].map(k => `${k} ${priceOf(GOODS[k].shop === 'farm' ? 'farm' : GOODS[k].shop, k)}c`).join(', ')}. Food in stock: bakery ${sim.business.bakery.stock.bread || 0} bread, farm ${sim.business.farm.stock.grain || 0} grain / ${sim.business.farm.stock.turnip || 0} turnips.`,
      JOBS[p.job].owner ? `You own the ${JOBS[p.job].owner}: stock ${JSON.stringify(sim.business[JOBS[p.job].owner].stock)}, price multipliers ${JSON.stringify(sim.business[JOBS[p.job].owner].mult)}. You may set them with "prices":{"item":0.5-4}.` : '',
      `Family: ${p.spouse ? 'married to ' + sim.people[p.spouse]?.name : 'unmarried'}; household ${h.map(q => q.name).join(', ') || 'none'}. Gang: ${g ? g.name + (g.boss === p.id ? ' (you are boss)' : '') : 'none'}. On the guard's record: ${openRecord(p).length} open charges.`,
      `People you feel strongly about: ${rels.map(([q, r]) => `${q.name} (${q.id}, ${JOBS[q.job].title.toLowerCase()}${q.gang ? ', ' + sim.gangs[q.gang]?.name : ''}) like ${r.like.toFixed(1)} trust ${r.trust.toFixed(1)}`).join('; ')}.`,
      `Recently: ${p.memory.slice(-8).map(m => m.text || (m.ev ? `${sim.people[m.actor]?.name} ${m.type}${m.victim ? ' against ' + sim.people[m.victim]?.name : ''} (${m.how}${m.lie ? '' : ''})` : m.grave ? `${m.name} buried in plot ${m.grave}` : '')).filter(Boolean).join('; ') || 'nothing notable'}.`,
      `Town: treasury ${sim.treasury}c, sales tax ${Math.round(sim.taxRate * 100)}%, rent ${sim.rent}c and head tax ${sim.headTax}c a day, mayor ${sim.people[sim.mayorId]?.name || 'none'}, captain ${sim.people[sim.captainId]?.name || 'none'}, gangs ${Object.values(sim.gangs).map(g => `${g.name} (boss ${sim.people[g.boss]?.name}, ${gangMembers(g.id).length})`).join(', ') || 'none'}. Election every 7th day (next: day ${Math.ceil(sim.day / 7) * 7}).`,
      sim.playerId ? `Rose of the City (id "player") is a human player, an outsider from the city; she can't die (she is knocked out instead). Treat her like anyone else.` : '',
    ];
    if (kind === 'mayor') lines.push(
      `Wages now: ${JSON.stringify(sim.wages)}. Bounties: ${JSON.stringify(sim.bounty)}. Curfew: ${sim.curfew}. Bail: ${sim.bail}c. Crimes in the last day: ${sim.events.filter(e => sim.t - e.t < 1440).length}. People with open charges: ${living().filter(p => openRecord(p).length).map(p => `${p.name} (${p.id}) ${openRecord(p).length}`).join(', ') || 'none'}.`,
      `Guards: ${living().filter(isGuard).map(g => `${g.name} (${g.id}, ${JOBS[g.job].title}, lvl ${g.level}${g.gang ? ', in a gang' : ''})`).join('; ')}.`,
      `Reply with ONLY a JSON object; every key optional: {"tax_rate":0-0.4, "wages":{"guard":n,"captain":n,"mayor":n,"clerk":n,"laborer":n,"undertaker":n,"cleric":n,"doctor":n,"teacher":n,"jailer":n,"nightguard":n}, "rent":n, "head_tax":n, "captain":"id", "bounty":{"id":coins}, "curfew":true|false, "bail":n, "hire":["guard"|"nightguard"|"laborer"|"clerk"|"jailer"|"cleric"|"doctor"|"teacher"|"undertaker"], "fire":["id"], "pardon":["id"], "take_from_treasury":coins (into your own purse; if anyone in the hall sees, it is a crime, and the town may not be able to pay its wages), "policy":{"work":0-3,"crime":0-3,"violence":0-3,"romance":0-3,"politics":0-3,"gang":0-3,"tavern":0-3}, "statement":"one sentence to the town"}. "policy" weights your own personal choices today (1 = normal).`);
    else lines.push(`Reply with ONLY a JSON object: {"policy":{"work":0-3,"crime":0-3,"violence":0-3,"romance":0-3,"politics":0-3,"gang":0-3,"tavern":0-3,"socialize":0-3,"hunt":0-3,"forage":0-3}, "prices":{"item":multiplier} (only if you own a business), "say":"optional one line you say aloud today", "note":"optional: one line you want to remember tomorrow"}. The weights bias what you choose to do today (1 = normal, 0 = never, 3 = strongly).`);
    return lines.filter(Boolean).join('\n');
  };
  sim.applyDecision = (p, kind, dec) => {
    if (!p || !p.alive || !dec || typeof dec !== 'object') return;
    const own = JOBS[p.job]?.owner && sim.business[JOBS[p.job].owner];
    if (own && dec.prices && typeof dec.prices === 'object') for (const [k, v] of Object.entries(dec.prices)) if (k in GOODS && typeof v === 'number') own.mult[k] = clamp(v, 0.5, 4);
    if (kind === 'mayor') sim.applyMayor(p, dec);
    if (dec.policy && typeof dec.policy === 'object') { p.policy = {}; for (const [k, v] of Object.entries(dec.policy)) if (typeof v === 'number') p.policy[k] = clamp(v, 0, 3); }
    if (dec.say) log('talk', `${p.name}: "${String(dec.say).slice(0, 200)}"`, [p.id]);
  };
  function morning() {
    for (const p of living()) {
      if (p.brain === 'script' || p.brain === 'human') { if (p.id === sim.mayorId && p.brain === 'script') scriptedMayor(p); continue; }
      const kind = p.id === sim.mayorId ? 'mayor' : 'plan';
      const q = { id: p.id + '-' + sim.day, person: p.id, kind, brain: p.brain, prompt: sim.decisionFor(p, kind), fallback: () => { if (kind === 'mayor') scriptedMayor(p); } };
      sim.decisionsPending.push(q);
      if (sim.onDecision) sim.onDecision(q);
    }
  }

  // =================================================================== tick ==
  let lastHour = Math.floor(sim.t / 60), lastDay = Math.floor(sim.t / 1440);
  sim.step = dtMin => {
    sim.t += dtMin;
    const hourNow = Math.floor(sim.t / 60), dayNow = Math.floor(sim.t / 1440);
    if (dayNow !== lastDay) { lastDay = dayNow; dailyTick(); }
    if (sim.pendingInvite && sim.t - sim.pendingInvite.t > 30) { const L = sim.people[sim.pendingInvite.leader]; if (L && !living().some(q => q !== L && q.party === L.party)) L.party = null; sim.pendingInvite = null; sim.onInvite?.(null); }
    if (hourNow !== lastHour) {
      lastHour = hourNow;
      const h = hourNow % 24;
      payWages(h);
      if (h === 7) morning();
      if (h === 12 && sim.election.due) runElection();
      for (const p of living()) if (p.task && !['jail', 'sleep', 'work', 'flee', 'follow', 'caravan', 'fish'].includes(p.task.kind) && sim.t - p.task.t0 > 60) p.task = null;   // replan hourly
    }
    for (const p of living()) {
      if (p.kind !== 'human') continue;
      p.food = Math.max(0, p.food - dtMin / 1440); p.water = Math.max(0, (p.water ?? 1) - dtMin / 720);
      if (p.jailedUntil > 0 && p.water < 0.5) p.water = 1;   // the jailer brings a cup
      if (areaOf(p) === 'healer' || p.carriedBy) p.water = Math.max(p.water, 0.6);   // the infirmary and the stretcher give water
      // thirst wears you down to 1 hp; after that it's days, not hours, before it kills
      if (p.water <= 0) { p.dry = (p.dry || 0) + dtMin; if (p.dry > 1440 && p.hp > 1 && Math.random() < dtMin / 240) p.hp -= 1; if (p.dry > 3 * 1440) { if (p.brain === 'human') { p.hp = -1; p.down = 'out'; p.downUntil = sim.t + 60; p.water = 0.5; p.dry = 0; } else die(p, null, 'thirst'); } } else p.dry = 0;
      // an empty belly takes you off work (a meal break), but doesn't wake you
      if (p.food < 0.12 && p.brain !== 'human' && conscious(p) && !p.fight && !(p.jailedUntil > 0) && p.task?.kind === 'work' && !(p.cd?.meal > sim.t) && !['bakery', 'tavern', 'farm', 'ranch'].includes(JOBS[p.job].owner || JOBS[p.job].payer)) { cool(p, 'meal', 180); p.task = null; }
      // a dry throat wakes you and pulls you off work
      if (p.water < 0.12 && p.brain !== 'human' && conscious(p) && !p.fight && !(p.jailedUntil > 0) && p.task && !['drink', 'flee', 'jail'].includes(p.task.kind) && !p.carriedBy) { if (p.task.kind === 'follow' || p.task.kind === 'caravan' || p.task.kind === 'ambush') { const w = [...SPOTS.wells].sort((a, b) => dist2(p, a) - dist2(p, b))[0]; if (dist2(p, w) > 60) { p.water = 0.5; } else p.task = null; } else p.task = null; }
      if (p.state !== 'sleep') p.rest = Math.max(0, p.rest - dtMin / 60 / 18);
      if (p.food <= 0) { p.starve = (p.starve || 0) + dtMin; if (p.starve > 3 * 1440 && p.hp > 1 && Math.random() < dtMin / 1440) p.hp -= 1; if (p.starve > 21 * 1440) { if (p.brain === 'human') { p.hp = -1; p.down = 'out'; p.downUntil = sim.t + 60; p.food = 0.3; p.starve = 0; } else die(p, null, 'starvation'); } } else p.starve = 0;
      if (p.down === 'out' && sim.t >= (p.downUntil || 0) && p.hp > 0) { p.down = null; p.nl = Math.min(p.nl, p.hp - 1); if (p.state === 'idle' || p.state === 'fight') p.task = null; }
      if (p.jailedUntil > 0) { if (sim.t >= p.jailedUntil) { p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); log('law', `${fullName(p)} is released from jail.`, [p.id]); } else { if (p.brain !== 'human' && night() && Math.random() < dtMin / 600) tryEscape(p); continue; } }
      if (p.brain === 'human' && JOBS[p.job]?.from != null && inShift(p.job, H()) && areaOf(p) === JOBS[p.job].place && conscious(p) && !p.fight) p.worked = (p.worked || 0) + dtMin;
      if (p.fight || p.brain === 'human' || !conscious(p) || p.carriedBy) continue;
      doTask(p, dtMin);
      if (!p.task) choose(p);
    }
    // animals: follow their people, eat, sleep
    for (const an of Object.values(sim.animals)) {
      if (!an.alive || an.fight) continue;
      an.full = Math.max(0, an.full - dtMin / 60 / 10);
      const own = sim.people[an.owner];
      if (an.livestock) { if (Math.random() < dtMin / 40) an.goal = randIn('ranch', 3); if (an.goal) stepToward(an, an.goal, 0.5, dtMin); continue; }
      if (an.game) { if (Math.random() < dtMin / 20) an.goal = randIn('wood', 2); if (an.goal) stepToward(an, an.goal, an.species === 'rabbit' ? 1.2 : 0.8, dtMin); continue; }
      if (own && own.alive && an.species === 'dog') { if (dist2(an, own) > 2.5) stepToward(an, own, 1.8, dtMin); }
      else if (Math.random() < dtMin / 30) { an.goal = randIn(an.species === 'goat' ? 'fields' : an.species === 'fox' ? 'fields' : areaOf(an) || 'square'); }
      if (an.goal) stepToward(an, an.goal, 1.0, dtMin);
      if (own && own.alive && H() >= 18 && H() < 19) an.full = Math.max(an.full, 0.7);
    }
    // bodies on the street frighten people a little
    for (const b of sim.bodies) if (!b.buried) for (const q of living()) if (q.kind === 'human' && dist2(q, b) < 8) q.mood = Math.max(0, q.mood - dtMin * 0.0005);
  };
  function tryEscape(p) {
    const jailer = living().find(g => g.job === 'jailer' && onDuty(g) && areaOf(g) === 'station');
    if (jailer) { if (p.coin >= 3 && p.traits.honesty < 0.6 && acceptsBribe(jailer, p.coin)) { pay(p, jailer, p.coin); p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); log('law', `${jailer.name} takes a bribe and lets ${p.name} out of the cell.`, [jailer.id, p.id]); } return; }
    const r = d(20) + Math.max(p.skills.openlock + (p.items.picks ? 2 : -4), p.skills.escape);
    if (r >= 22) { p.jailedUntil = 0; p.task = null; place(p, SPOTS.desk); deed('jailbreak', p, null, SPOTS.desk); log('law', `${fullName(p)} breaks out of jail!`, [p.id]); }
  }

  // ======================================================== the player ==
  // Rose acts through the same rules as everyone. Each returns a line for the log.
  sim.playerDo = (kind, tid, extra = {}) => {
    const me = sim.people.player, t = tid ? (sim.people[tid] || sim.animals[tid]) : null;
    if (!me || !free(me)) return 'You can\'t do that right now.';
    const near = (r = 2) => t && dist2(me, t) <= r;
    const d20r = () => d(20);
    switch (kind) {
      case 'talk': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const r = d20r() + me.skills.diplomacy; bump(t, me, 'like', r >= 12 ? 0.06 : 0.01); bump(t, me, 'trust', 0.02); bump(me, t, 'like', 0.03);
        const said = me.memory?.slice(-1)[0]?.said, heard = sim.learning && Math.random() < 0.4 ? babble(said) : null;
        const line = heard || (R(t, me).like > 0.3 ? 'Good to see you.' : R(t, me).like < -0.3 ? 'What do you want, city girl?' : pick(['Hm. The stranger.', 'Afternoon.', 'You\'re not from here.', 'Mind yourself in Hollow Town.']));
        log('talk', `${t.name}: "${line}"`, [t.id, 'player']); return `You chat with ${t.name}. (Diplomacy ${r})`;
      }
      case 'say': {
        const text = String(extra.text || '').slice(0, 200); if (!text) return '';
        log('talk', `${me.name}: "${text}"`, ['player']);
        for (const q of living()) if (q !== me && dist2(q, me) < 8 && sameSpace(q, me)) remember(q, { text: `${me.name} said: "${text}"` });
        remember(me, { said: (text.toLowerCase().match(/[a-z']{4,}/g) || []).pop() });
        return '';
      }
      case 'bribe': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const n = Math.min(me.coin, extra.amount || 3); if (n < 1) return 'You have nothing to offer.';
        const r = d20r() + me.skills.diplomacy + Math.min(10, n * 2), dc = 10 + Math.round(t.traits.honesty * 15);
        if (r >= dc) { pay(me, t, n); bump(t, me, 'like', 0.15); bump(t, me, 'trust', 0.1); (t.voteBribes ||= {}).player = n; if (extra.forWhat === 'record') { openRecord(me).filter(x => x.by.includes(t.id)).forEach(x => x.by = x.by.filter(y => y !== t.id)); } return `${t.name} takes your ${n}c. (Diplomacy ${r} vs ${dc})`; }
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
        const yes = R(t, me).like * 2 + attracted(t, me) + me.coin * 0.04 * t.traits.greed - 1 + rnd(-0.3, 0.3);
        if (yes > 0) { marry(me, t); return `${t.name} says yes!`; }
        bump(t, me, 'like', -0.05); return `${t.name} says no.`;
      }
      case 'recruit': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        if (!me.gang) foundGang(me, extra.name);
        recruit(me, t); return t.gang === me.gang ? `${t.name} is in.` : `${t.name} turns you down.`;
      }
      case 'join': { if (!near(3) || !t.gang) return 'They have no crew to join.'; askToJoin(me, sim.people[sim.gangs[t.gang].boss] || t, t.gang); return me.gang ? `You're in ${sim.gangs[me.gang].name}.` : 'They don\'t want you.'; }
      case 'pickpocket': { if (!near(1.6) || t.kind !== 'human') return 'Get closer first.'; const before = me.coin; pickpocket(me, t); return me.coin > before ? `You lift ${me.coin - before}c from ${t.name}.` : `${t.name} catches you!`; }
      case 'attack': { if (!near(2.2)) return 'Get closer first.'; me.prefMode = extra.mode || 'lethal'; startFight(me, t, { mode: extra.mode || 'lethal', why: 'you started it' }); return ''; }
      case 'burgle': { const hi = HOUSES.findIndex(h => dist2(me, h.bed) < 3 || areaOf(me) === h.id); if (hi < 0) return 'Stand inside a house first.'; if (hi === me.home) return 'That\'s your own house.'; const before = me.coin; burgle(me, hi); return me.coin > before ? `You find ${me.coin - before}c.` : 'Nothing gained.'; }
      case 'buy': { const shop = areaOf(me); if (!shopOpen(shop)) return 'Nobody is minding this shop.'; return buy(me, shop, extra.item, extra.n || 1) ? `You buy ${GOODS[extra.item].name.toLowerCase()}.` : 'You can\'t afford that, or it\'s sold out.'; }
      case 'sell': { const shop = areaOf(me), b = sim.business[shop]; if (!shopOpen(shop) || !b) return 'Nobody is minding this shop.'; if (!(me.items[extra.item] > 0)) return 'You don\'t have that.'; const owner = sim.people[b.owner], price = Math.max(1, Math.floor(GOODS[extra.item].price / 2)); if (!owner || owner.coin < price) return 'They can\'t afford it.'; me.items[extra.item]--; b.stock[extra.item] = (b.stock[extra.item] || 0) + 1; pay(owner, me, price); return `You sell it for ${price}c.`; }
      case 'eat': return eatFrom(me) ? 'You eat.' : 'You have nothing to eat.';
      case 'apply': {
        if (!near(3) || t.kind !== 'human') return 'Get closer first.';
        const own = JOBS[t.job]?.owner, HAND = { bakery: 'bakehand', store: 'shophand', smithy: 'apprentice', tavern: 'server', farm: 'farmhand', ranch: 'ranchhand' };
        let job = own ? HAND[own] : t.id === sim.mayorId ? (extra.job || ['clerk', 'laborer', 'undertaker', 'teacher', 'cleric', 'doctor'].find(j => living().filter(q => q.job === j).length < 1) || 'laborer') : t.id === sim.captainId ? (extra.job || 'guard') : null;
        if (!job) return `${t.name} has no work to give. Ask a business owner, the mayor, or the guard captain.`;
        if (me.job === job) return 'You already do that job.';
        if (JOBS[job].guard && openRecord(me).length) return `${t.name}: "Not with your record."`;
        const filled = living().filter(q => q.job === job && q !== me).length, room = { bakehand: 2, shophand: 2, apprentice: 2, server: 2, farmhand: 3, ranchhand: 2, guard: 3, nightguard: 3, jailer: 1, clerk: 2, laborer: 4, undertaker: 1, teacher: 1, cleric: 2, doctor: 1 }[job] ?? 1;
        const purse = JOBS[job].payer === 'town' ? sim.treasury : t.coin;
        if (filled >= room || purse < JOBS[job].wage * 4) return `${t.name}: "Nothing going right now."`;
        const r = d20r() + me.skills.diplomacy + Math.round(R(t, me).like * 8 + R(t, me).trust * 4), dc = 12 + (JOBS[job].guard ? 3 : 0);
        if (r < dc) { bump(t, me, 'like', -0.02); return `${t.name} won't take you on. (Diplomacy ${r} vs ${dc})`; }
        me.job = job; me.worked = 0; log('life', `${me.name} of the City takes work as ${JOBS[job].title.toLowerCase()} for ${t.name}.`, ['player', t.id]);
        return `Hired: ${JOBS[job].title}, ${JOBS[job].from}:00 to ${JOBS[job].to % 24}:00, ${JOBS[job].wage}c a shift. Be at the ${AREAS[JOBS[job].place]?.name.toLowerCase()} for most of the shift to get paid. (${r} vs ${dc})`;
      }
      case 'quit': { if (me.job === 'none') return 'You have no job.'; const was = JOBS[me.job].title; me.job = 'none'; return `You quit as ${was.toLowerCase()}.`; }
      case 'invite': {
        if (!near(4) || t.kind !== 'human') return 'Get closer first.';
        const purpose = extra.purpose || 'company', terms = partyTerms(t, me, purpose), offer = Math.min(me.coin, Math.max(0, extra.pay | 0));
        if (terms.no === 'busy') return `${t.name} is busy.`;
        if (terms.no === 'honest') { bump(t, me, 'like', -0.15); bump(t, me, 'trust', -0.2); remember(t, { text: `${me.name} tried to get me into crime` }); return `${t.name}: "I'll pretend I didn't hear that."`; }
        if (terms.no === 'dislike') return `${t.name}: "Not with you."`;
        if (terms.no === 'scared') return `${t.name}: "That's too dangerous for me${terms.ask ? ', even for money' : ''}."`;
        if (terms.free) { joinParty(t, me, purpose, 0); return `${t.name} comes along, no charge.`; }
        if (offer >= terms.ask) { joinParty(t, me, purpose, terms.ask); return `${t.name} comes along for ${terms.ask}c${offer > terms.ask ? ' (you offered more; they took what they asked)' : ''}.`; }
        return `${t.name}: "I'd do it for ${terms.ask}c."`;
      }
      case 'dismiss': { if (!me.party) return 'You have no party.'; disband(me); return 'You send your party home.'; }
      case 'fish': { if (dist2(me, SPOTS.pond) > 7) return 'Fish at the pond in the Wildwood.'; sim.t += 60; if (Math.random() < 0.6 * sim.fish / 40) { sim.fish--; me.items.fish = (me.items.fish || 0) + 1; return 'You catch a fish.'; } return 'An hour, and nothing bites.'; }
      case 'forage': { const k = areaOf(me) === 'orchard' ? 'apple' : areaOf(me) === 'wood' ? 'berries' : null; if (!k) return 'Forage in the orchard (apples) or the Wildwood (berries).'; sim.t += 30; if (sim.commons[k] <= 0) return 'Picked clean. Someone got here first.'; const n = Math.min(sim.commons[k], 2); sim.commons[k] -= n; me.items[k] = (me.items[k] || 0) + n; return `You gather ${n} ${k === 'apple' ? 'apples' : 'handfuls of berries'}.`; }
      case 'work': {
        const h = H(), jobs = { bakery: 'bakehand', store: 'shophand', smithy: 'apprentice', tavern: 'server', fields: 'farmhand' }, j = jobs[areaOf(me)];
        if (!j || !shopOpen(areaOf(me)) && areaOf(me) !== 'fields') return 'No work here right now.';
        const payer = sim.people[sim.business[JOBS[j].payer]?.owner]; if (!payer) return 'Nobody to pay you.';
        sim.t += 60; const n = pay(payer, me, 2); bump(payer, me, 'like', 0.05); return `You work an hour as a ${JOBS[j].title.toLowerCase()} (+${n}c).`;
      }
      case 'study': { if (areaOf(me) !== 'school' || !classInSession()) return 'No lesson on.'; sim.t += 60; me.studied = (me.studied || 0) + 60; if (me.studied >= 480) { me.studied = 0; const k = extra.skill || 'diplomacy'; me.skills[k]++; return `You finish a course: ${k} +1.`; } return `You sit a lesson (${me.studied}/480 minutes).`; }
      case 'stand': { if (areaOf(me) !== 'hall') return 'Stand for mayor at the town hall.'; if (sim.election.candidates.includes('player')) return 'You are already standing.'; if (pay(me, 'town', 5) < 5) return 'The fee is 5c.'; sim.election.candidates.push('player'); log('politics', `${me.name} of the City stands for mayor.`, ['player']); return 'You are a candidate.'; }
      case 'report': { if (areaOf(me) !== 'station') return 'Report crimes at the guard station desk.'; const subj = sim.people[extra.about]; if (!subj) return 'Report whom?'; const ev = sim.events.filter(e => e.actor === subj.id && (e.victim === 'player' || sees(me, e.at))).slice(-1)[0] || { id: 'pr' + Math.random(), type: extra.crime || 'theft', actor: subj.id, victim: 'player', lie: true }; fileReport(me, ev); return `It's on the record against ${subj.name}.`; }
      case 'carry': { if (!t || t.kind !== 'human' || conscious(t) || !near(1.6)) return 'There\'s nobody down here to carry.'; me.carrying = me.carrying === t.id ? null : t.id; if (!me.carrying) drop(t); return me.carrying ? `You pick up ${t.name}.` : `You set ${t.name} down.`; }
      case 'loot': { const b = sim.bodies.find(b => !b.buried && dist2(me, b) < 1.6); if (!b) return 'No body here.'; const n = b.coin; b.coin = 0; me.coin += n; deed('theft', me, null, me); return `You go through ${b.name}'s pockets: ${n}c.`; }
      case 'dig': { const gr = sim.graves.find(g => dist2(me, g.at) < 1.5 && !g.robbed); if (!gr) return 'No grave here.'; gr.robbed = true; me.coin += gr.coin || 0; deed('desecration', me, null, me); return `You dig up ${gr.name}: ${gr.coin || 0}c.`; }
    }
    return '';
  };
  sim.inviteAnswer = (choice, amount = 0) => {
    const inv = sim.pendingInvite; sim.pendingInvite = null; const me = sim.people.player, L = inv && sim.people[inv.leader];
    if (!inv || !L || !L.alive || !conscious(L)) return 'They\'ve gone.';
    if (choice === 'no') { bump(L, me, 'like', -0.02); return `You turn ${L.name} down.`; }
    let paid = inv.offer;
    if (choice === 'pay') {
      const most = Math.min(L.coin, (DANGER[inv.purpose] ?? 1) * 3 + Math.round(R(L, me).like * 4));
      if (amount > most) { bump(L, me, 'like', -0.03); return `${L.name}: "${amount}c? Not for that. ${most > 0 ? 'I could do ' + most + 'c.' : 'Forget it.'}"`; }
      paid = amount;
    }
    L.party = inv.party; joinParty(me, L, inv.purpose, paid); bump(L, me, 'like', 0.05);
    return `You join ${L.name}'s ${inv.purpose} party${paid ? ' for ' + paid + 'c' : ''}. Stay close to them.`;
  };
  // when a guard arrests Rose, she chooses
  sim.arrestAnswer = (choice, amount) => {
    const me = sim.people.player, g = sim.people[sim.pendingArrest?.guard]; sim.pendingArrest = null;
    if (!me || !g || !conscious(g)) return 'The guard is gone.';
    const charge = openRecord(me).length;
    if (choice === 'quiet') { setTask(g, 'haul', { target: 'player', until: sim.t + 240 }); return `${g.name} walks you to the cells.`; }
    if (choice === 'bribe') { const n = Math.min(me.coin, amount || 4); if (acceptsBribe(g, n)) { pay(me, g, n); return `${g.name} pockets ${n}c and looks the other way.`; } deed('bribery', me, g, me); setTask(g, 'haul', { target: 'player', until: sim.t + 240 }); return `${g.name} refuses the bribe. That's another charge.`; }
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

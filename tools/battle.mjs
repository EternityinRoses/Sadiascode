// Hollow Town battle test: a squad at the palisade against the beasts, many nights over.
// node tools/battle.mjs <town folder with sim.js and srd_bridge.js> <none|basic|full|fire> <bear|troll> <trials>
// setup: none | basic | full     night: bear | troll
import { createRequire } from 'module'; import path from 'path';
const [,, dir, setup = 'full', night = 'troll', trials = '10'] = process.argv;
const require = createRequire(import.meta.url);
await import(path.resolve(dir, 'srd_bridge.js'));
const { Sim } = require(path.resolve(dir, 'sim.js'));
const put = (p, x, z) => { p.x = x; p.z = z; p.area = 'fields'; };
const tally = { trials: 0, townDead: 0, squadDead: 0, beastsKilled: 0, beasts: 0, wins: 0, palisadeLeft: 0, aimed: 0, readied: 0, barks: 0, potions: 0, cures: 0 };
for (let t = 0; t < +trials; t++) {
  const S = Sim({}); S.genDays = 7; S.fightMode = 'script';
  S.step(0.5);
  for (const f of S.fights.slice()) S.fights.splice(S.fights.indexOf(f), 1);
  S.t = 21 * 60 + 30; S.invaded = true; S.lastBeastNight = S.day;   // we bring the beasts ourselves
  const town = Object.values(S.people).filter(p => p.kind === 'human' && !p.town && p.id !== 'player' && p.alive);
  for (const p of town) { p.task = null; p.state = 'sleep'; p.fight = null; if (p.home != null) { p.x = S.HOUSES[p.home].bed.x; p.z = S.HOUSES[p.home].bed.z; p.area = S.HOUSES[p.home].id; } }
  const squad = [];
  if (setup !== 'none') {
    S.palisade.hp = S.palisade.max;
    const adults = town.filter(p => p.age >= 16).sort((a, b) => (b.st.str + b.st.con) - (a.st.str + a.st.con));
    const full = setup === 'full' || setup === 'fire';
    const lvl = (p, cls) => { p.firstPick = false; S.setFirstClass(p, cls, null, false); if (full) for (let i = 0; i < 2; i++) { p.levelReady = true; S.levelUp(p, cls, null, false); } };
    const tanks = adults.slice(0, 6), rest = adults.slice(6), archers = rest.sort((a, b) => b.st.dex - a.st.dex).slice(0, 6), healers = rest.filter(p => !archers.includes(p)).sort((a, b) => b.st.wis - a.st.wis).slice(0, 3);
    const cap = tanks[0]; const old = S.people[S.captainId]; if (old && old !== cap) { old.job = 'guard'; old.rank = null; } cap.job = 'captain'; cap.rank = 'captain'; S.captainId = cap.id;
    tanks.forEach((p, i) => { lvl(p, 'fighter'); p.armor = full ? 'fullplate+1' : 'chain'; p.shield = full ? 'heavyshield+1' : 'heavyshield'; p.weapon = full ? 'longsword1' : 'spear'; put(p, -100, -7.5 + i * 3); p.role = 'tank'; p.fightStyle = { ready: true, blows: 'lethal', fleeBelow: 0.15, bark: 'attack' }; });
    archers.forEach((p, i) => { lvl(p, full ? 'ranger' : 'fighter'); p.weapon = full ? 'longbow+1' : 'shortbow'; p.items.arrows = 80; p.armor = 'chainshirt'; put(p, -88, -7.5 + i * 3); p.role = 'archer'; p.fightStyle = { aim: full ? ['legs', 'feet', 'arms'][i % 3] : null, blows: 'lethal', fleeBelow: 0.3 }; });
    healers.forEach((p, i) => { lvl(p, 'cleric'); p.items.curemod = full ? 4 : 0; p.items.cure = 3; p.armor = 'chain'; p.weapon = 'heavymace'; put(p, -93, -3 + i * 3); p.role = 'healer'; p.fightStyle = { blows: 'lethal', fleeBelow: 0.4 }; });
    if (full) for (const p of tanks) { p.items.bullstr = 1; p.items.curemod = 2; }
    if (setup === 'fire') for (const p of [...tanks, ...archers]) p.items.alchfire = 2;
    squad.push(...tanks, ...archers, ...healers);
    for (const p of squad) { p.listens = p !== cap; p.state = 'idle'; p.stayUpUntil = S.t + 24 * 60; p.post = { x: p.x, z: p.z }; p.hp = p.maxhp; }
  }
  // the beasts, at the Wildwood edge
  const beasts = night === 'troll' ? [S.spawnBeast('troll', { x: -115, z: 0 }), S.spawnBeast('bear', { x: -116, z: 3 }), S.spawnBeast('bear', { x: -116, z: -3 })] : [S.spawnBeast('bear', { x: -115, z: 0 })];
  const log = []; S.onLog = e => log.push(e.text);
  let steps = 0;
  while (steps < 2 * 60 * 5) {   // five hours
    S.step(0.5); steps++;
    for (const p of squad) if (p.alive && !p.fight && S.fights.length === 0 && p.post && (!p.task || p.task.kind !== 'muster')) { p.task = { kind: 'muster', to: p.post, until: S.t + 30, ordered: true }; }
    for (const f of S.fights.slice()) { let g = 0; while (S.fights.includes(f) && g++ < 400) S.fightStep(f); }
    for (const q of S.decisionsPending.splice(0)) { q.done = true; q.fallback?.(); }
    if (S.pendingInvite) S.inviteAnswer('no'); if (S.pendingArrest) S.arrestAnswer('quiet');
    if (beasts.every(b => !b.alive)) break;
  }
  const dead = town.filter(p => !p.alive);
  tally.trials++; tally.townDead += dead.length; tally.squadDead += squad.filter(p => !p.alive).length;
  tally.beasts += beasts.length; tally.beastsKilled += beasts.filter(b => !b.alive).length; if (beasts.every(b => !b.alive) && dead.length < 5) tally.wins++;
  tally.palisadeLeft += S.palisade.hp;
  const all = log.join('\n');
  tally.aimed += (all.match(/shot (takes|pierces|pins)/g) || []).length; tally.readied += (all.match(/readied attack goes off/g) || []).length; tally.barks += (all.match(/barks: "/g) || []).length; tally.waits = (tally.waits || 0) + (all.match(/waits for the captain/g) || []).length;
  tally.potions += (all.match(/drinks the potion|drinks a draught/g) || []).length; tally.cures += (all.match(/casts cure/g) || []).length;
  if (t === 0 && process.env.SHOW) console.log(log.filter(l => !/runs to fetch|shouts "Guard/.test(l)).slice(0, +process.env.SHOW).join('\n'));
}
const n = tally.trials;
console.log(JSON.stringify({ setup, night, trials: n, beastsKilledPct: Math.round(100 * tally.beastsKilled / tally.beasts), winsPct: Math.round(100 * tally.wins / n), townDeadAvg: +(tally.townDead / n).toFixed(2), squadDeadAvg: +(tally.squadDead / n).toFixed(2), palisadeAvg: Math.round(tally.palisadeLeft / n), aimedHits: tally.aimed, readied: tally.readied, barks: tally.barks, waits: tally.waits, potions: tally.potions, cures: tally.cures }));

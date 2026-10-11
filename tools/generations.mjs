// Run Hollow Town generations headless (no browser, no AI calls) and report how each one went.
// The town keeps its learned mind (lore) from one generation to the next, as the page does.
//
//   node tools/generations.mjs <path to town folder> [generations] [lore in | -] [lore out]
//   REMEMBER=1 node tools/generations.mjs ...   start every town knowing the beasts come
//
// Prints one JSON line per generation: won/failed, days lasted, deaths by cause, and how often
// people barricaded, built the palisade, lit watch-fires, woke others, rang the alarm bell, gave coin,
// where they slept (shelter, Cellar, fields) and how much busking earned (in copper).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const [,, dir, gens = '10', loreIn = '-', loreOut = 'lore.generations.json'] = process.argv;
if (!dir) { console.error('usage: node tools/generations.mjs <town folder> [generations] [lore in | -] [lore out]'); process.exit(1); }
const require = createRequire(import.meta.url);
try { await import(path.resolve(dir, 'srd_bridge.js')); } catch (e) { console.error('rules bridge not loaded, using the rough rules:', e.message); }
const { Sim } = require(path.resolve(dir, 'sim.js'));

let lore = loreIn !== '-' ? JSON.parse(fs.readFileSync(loreIn, 'utf8')) : null;
for (let g = 0; g < +gens; g++) {
  const t0 = Date.now();
  const S = Sim({});
  S.studentMode = process.env.MODE || 'blend'; S.genDays = 7; S.fightMode = 'script';
  if (lore) S.importLore(lore);
  if (process.env.REMEMBER) S.beastsSeen = 1;
  const acts = { barricade: 0, palisade: 0, fire: 0, wake: 0, bell: 0, give: 0 };
  S.onLog = e => {
    if (/ barricades /.test(e.text)) acts.barricade++;
    if (/works on the palisade/.test(e.text)) acts.palisade++;
    if (/lights a watch-fire/.test(e.text)) acts.fire++;
    if (e.kind === 'life' && / wakes /.test(e.text)) acts.wake++;
    if (/rings the alarm bell/.test(e.text)) acts.bell++;
    if (e.kind === 'life' && / gives /.test(e.text)) acts.give++;
  };
  const nights = { shelter: 0, cellar: 0, fields: 0 };   // where people sleep at midnight, summed over nights
  let lastDay = S.day;
  let steps = 0;
  while (!S.genOver() && steps < 2 * 60 * 24 * 9) {   // half-minute steps, as the page does
    S.step(0.5); steps++;
    const me = S.people.player;
    for (const f of S.fights.slice()) { if (me && f.sides && f.sides.has('player')) { S.act(f, me, { id: 'end' }); S.playerDone(f); } S.fightStep(f); }
    for (const q of S.decisionsPending.splice(0)) { q.done = true; q.fallback?.(); }
    if (S.pendingInvite) S.inviteAnswer('no');
    if (S.pendingArrest) S.arrestAnswer('quiet');
    if (S.day !== lastDay) {
      lastDay = S.day;
      for (const p of S.living()) if (p.kind === 'human' && !p.town && p.state === 'sleep') { const a = S.areaOf(p); if (a in nights) nights[a]++; }
    }
  }
  const causes = {}, beastWhere = {};
  for (const b of S.bodies) {
    if (b.stranger) continue;
    const k = b.killer && S.animals[b.killer] ? 'beasts' : b.killer ? 'people' : (b.how || 'other');
    causes[k] = (causes[k] || 0) + 1;
    if (k === 'beasts') { const a = S.AREAS[S.areaOf(b)]?.name || 'somewhere'; beastWhere[a] = (beastWhere[a] || 0) + 1; }
  }
  const busked = S.everyone().reduce((a, p) => a + (p.stats?.busked || 0), 0);
  const st = S.endGeneration();
  lore = S.exportLore();
  console.log(JSON.stringify({ gen: st.gen, won: st.won, failed: st.failed, days: st.days, alive: st.alive, people: st.people,
    avgFit: st.avgFit, crimes: st.crimes, causes, beastWhere, acts, nights, busked, secs: +((Date.now() - t0) / 1000).toFixed(1) }));
}
fs.writeFileSync(loreOut, JSON.stringify(lore));

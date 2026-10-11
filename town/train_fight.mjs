// Train the fight net, and write LoH fight dossiers, from Hollow Town's recorded fights (Rose).  Run:  node train_fight.mjs [epochs]
// Reads the 'loh_turn' rows in dataset.jsonl (and .old): each is one fight turn in Legends of Harpine's own format, the twenty
// numbers battle/learn.js builds and one of battle/profile.js's seven acts, with what followed it.
// Writes fightnet.json (pick "Trained fight net" under Settings > Fight brains, reload the page) and dossiers/<name>.learn.json,
// each a LoH dossier as profile.js keeps it in chars/ ({ profile, recs, lastAct }), built by LoH's own noteTurn.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FightNet = require('./fightnet.js');
const P = await import('./srd/battle/profile.js');
const here = path.dirname(fileURLToPath(import.meta.url)), epochs = +process.argv[2] || 30;
const rows = [], defeats = [];
for (const f of process.argv[3] ? [process.argv[3]] : ['dataset.jsonl.old', 'dataset.jsonl']) {
  const p = path.resolve(here, f); if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) { if (!line.includes('"loh_')) continue; try { const r = JSON.parse(line); if (r.type === 'loh_turn' && Array.isArray(r.inp) && r.inp.length === 20) rows.push(r); else if (r.type === 'loh_defeat') defeats.push(r); } catch (e) {} }
}
console.log(`${rows.length} fight turns, ${defeats.length} defeats, from ${new Set(rows.map(r => r.fight)).size} fights`);
if (rows.length < 50) { console.log('Not enough recorded fight turns yet. Run the town (with beasts) for a while first.'); process.exit(0); }

// the dossiers, by LoH's own counters
const brains = {}, seen = new Set();
for (const r of rows) { const b = brains[r.who] ||= P.blankBrain(); if (!seen.has(r.who + '|' + r.fight)) { seen.add(r.who + '|' + r.fight); P.noteFight(b); } P.noteTurn(b, r); }
for (const d of defeats) if (brains[d.who]) P.noteDefeat(brains[d.who], d.by);
const dir = path.join(here, 'dossiers'); fs.mkdirSync(dir, { recursive: true });
const fileOf = name => String(name || 'she').trim().replace(/[^\w -]/g, '') + '.learn.json';   // profile.js fileOf
for (const [n, b] of Object.entries(brains)) fs.writeFileSync(path.join(dir, fileOf(n)), JSON.stringify(b));
console.log(`wrote ${Object.keys(brains).length} dossiers to dossiers/`);
for (const n of Object.keys(brains).sort((x, y) => brains[y].profile.turns - brains[x].profile.turns).slice(0, 3)) console.log(`  ${n}: ${P.readout(brains[n]).map(l => l.s).join(' ')}`);

// the net: advantage-weighted, held-out check on a tenth of the fights
const fights = [...new Set(rows.map(r => r.fight))], held = new Set(fights.filter((_, i) => i % 10 === 9));
const train = rows.filter(r => !held.has(r.fight)), test = rows.filter(r => held.has(r.fight));
const net = new FightNet();
net.train(FightNet.weigh(train), { epochs, log: s => console.log('  ' + s) });
const good = test.filter(r => (r.r || 0) + 0.5 * (r.outcome || 0) > 0), agree = good.filter(r => { const p = net.forward(r.inp).p; return p.indexOf(Math.max(...p)) === r.act; }).length;
const hist = [0, 0, 0, 0, 0, 0, 0]; for (const r of rows) hist[r.act]++;
net.stats = { turns: rows.length, fights: fights.length, acts: hist, epochs, heldOutGood: good.length, agreeGood: good.length ? +(agree / good.length).toFixed(3) : null, trained: new Date().toISOString() };
fs.writeFileSync(path.join(here, 'fightnet.json'), JSON.stringify(net.save()));
console.log('wrote fightnet.json', JSON.stringify(net.stats));

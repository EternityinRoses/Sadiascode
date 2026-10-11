// Train the NPC brain on Hollow Town's dataset (Rose).  Run:  node train_brain.js [epochs]
// Reads dataset.jsonl (and dataset.jsonl.old), writes npcbrain.json. The town page loads it on the next reload;
// pick "Trained NPC brain" under Settings > Plain brains to let plain folk run on it.
const fs = require('fs'), path = require('path');
const NPCBrain = require('./npcbrain.js');
const here = __dirname, epochs = +process.argv[2] || 4;
const rows = [];
for (const f of ['dataset.jsonl.old', 'dataset.jsonl']) {
  const p = path.join(here, f); if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) { if (!line.trim()) continue; try { rows.push(JSON.parse(line)); } catch (e) {} }
}
const by = {}; for (const r of rows) by[r.type] = (by[r.type] || 0) + 1;
console.log(`${rows.length} rows: ${JSON.stringify(by)}`);
const usable = rows.filter(r => r.x || r.said);
if (usable.length < 50) { console.log('Not enough recorded data yet (rows need the new recorder). Run the town for a while first.'); process.exit(0); }
const b = NPCBrain.fromRows(usable);
console.log(`brain: ${b.raw.kinds.length} kinds, ${b.raw.vocab.length} words`);
const st = b.train(usable, { epochs, log: s => console.log('  ' + s) });
fs.writeFileSync(path.join(here, 'npcbrain.json'), JSON.stringify(b.save()));
console.log('wrote npcbrain.json', JSON.stringify(st));

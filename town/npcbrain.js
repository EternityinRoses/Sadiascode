// NPC brain (Rose): a small, self-contained NPC mind, trained on Hollow Town's dataset and loadable by any game.
// Three parts:
//   1. action scorer   - what to do: perception vector + words just heard -> a score for every kind of action
//   2. policy regressor - how to lean: perception + traits + words -> leanings 0-3 (work, crime, violence, ...)
//   3. dialogue        - what to say: the best stored line for the words heard, by role and by how well it landed
// No game code in here. The host gives it: x (numbers describing the NPC's situation), words (recently heard),
// opts (the actions possible right now), traits ({greed, caution, ...}) and role.
// API: NPCBrain.create(cfg) | NPCBrain.load(json) ; b.train(rows, {epochs}) ; b.decide(state) ; b.lean(state) ;
//      b.reply(heard, state) ; b.save() -> json
(function (root) {
'use strict';
const STOP = new Set('the and you your for are but not with this that have has was were what who how why when where can will just his her its our their they them she him out about from into there here then than been would could should does did doing very much some any all get got say said tell told yes yeah well like one see know think going come came want lot bit sure maybe also too now day yet still even back over off down only own way thing things something nothing anything let lets'.split(' '));
const keywords = t => [...new Set((String(t || '').toLowerCase().replace(/\{\w+\}/g, ' ').match(/[a-z']{3,}/g) || []).filter(w => !w.includes("'") && !STOP.has(w)))].slice(0, 12);
const TRAITS = ['greed', 'caution', 'honesty', 'aggression', 'loyalty', 'ambition', 'sociability'];
const POLICY = ['work', 'crime', 'violence', 'romance', 'politics', 'gang', 'tavern', 'socialize', 'hunt', 'forage'];
const GROUP = { pickpocket: 'crime', mug: 'crime', burgle: 'crime', extort: 'crime', shoprob: 'crime', ambush: 'crime', rustle: 'crime', assail: 'violence', avenge: 'violence', court: 'romance', stand: 'politics', campaign: 'politics', join: 'gang', found: 'gang', recruit: 'gang' };
const randn = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.8;
const mat = (r, c, s) => Array.from({ length: r }, () => Float32Array.from({ length: c }, () => randn() * s));
const sig = z => 1 / (1 + Math.exp(-z));

function create(cfg = {}) {
  const b = { v: 1, NX: cfg.NX || 62, D: cfg.D || 8, H: cfg.H || 32, H2: cfg.H2 || 16, vocab: cfg.vocab || [], kinds: cfg.kinds || [], groups: { ...GROUP, ...(cfg.groups || {}) }, lines: [], stats: {} };
  init(b); return wrap(b);
}
function init(b) {
  const NI = b.NX + b.D, NP = b.NX + TRAITS.length + b.D;
  b.E = mat(b.vocab.length, b.D, 0.3); b.W1 = mat(b.H, NI, 1 / Math.sqrt(NI)); b.b1 = new Float32Array(b.H);
  b.W2 = mat(b.kinds.length, b.H, 1 / Math.sqrt(b.H)); b.b2 = new Float32Array(b.kinds.length);
  b.P1 = mat(b.H2, NP, 1 / Math.sqrt(NP)); b.pb1 = new Float32Array(b.H2); b.P2 = mat(POLICY.length, b.H2, 1 / Math.sqrt(b.H2)); b.pb2 = new Float32Array(POLICY.length);
  b.base = {};
}
function wrap(b) {
  const VI = new Map(b.vocab.map((w, i) => [w, i])), KI = new Map(b.kinds.map((k, i) => [k, i]));
  const xin = x => { const v = new Float32Array(b.NX); for (let i = 0; i < b.NX && x && i < x.length; i++) v[i] = +x[i] || 0; return v; };
  const bag = words => { const ids = []; for (const w of words || []) { const i = VI.get(String(w).toLowerCase()); if (i != null) ids.push(i); } const e = new Float32Array(b.D); for (const i of ids) for (let d = 0; d < b.D; d++) e[d] += b.E[i][d] / ids.length; return { ids, e }; };
  function score(st) {
    const x = xin(st.x), { ids, e } = bag(st.words), inp = new Float32Array(b.NX + b.D); inp.set(x); inp.set(e, b.NX);
    const h = new Float32Array(b.H); for (let a = 0; a < b.H; a++) { let z = b.b1[a]; const row = b.W1[a]; for (let k = 0; k < inp.length; k++) if (inp[k]) z += row[k] * inp[k]; h[a] = Math.tanh(z); }
    const z = new Float32Array(b.kinds.length); for (let c = 0; c < z.length; c++) { let s = b.b2[c]; const row = b.W2[c]; for (let a = 0; a < b.H; a++) s += row[a] * h[a]; z[c] = s; }
    return { inp, ids, e, h, z };
  }
  function policyFwd(st, e) {
    const x = xin(st.x), inp = new Float32Array(b.NX + TRAITS.length + b.D); inp.set(x); TRAITS.forEach((t, i) => inp[b.NX + i] = +(st.traits?.[t] ?? 0.5)); inp.set(e || bag(st.words).e, b.NX + TRAITS.length);
    const h = new Float32Array(b.H2); for (let a = 0; a < b.H2; a++) { let z = b.pb1[a]; const row = b.P1[a]; for (let k = 0; k < inp.length; k++) if (inp[k]) z += row[k] * inp[k]; h[a] = Math.tanh(z); }
    const o = new Float32Array(POLICY.length); for (let c = 0; c < o.length; c++) { let s = b.pb2[c]; const row = b.P2[c]; for (let a = 0; a < b.H2; a++) s += row[a] * h[a]; o[c] = s; }
    return { inp, h, o, y: Array.from(o, v => 3 * sig(v)) };
  }
  const maskOf = opts => { const m = (opts && opts.length ? opts : b.kinds).map(k => KI.get(k)).filter(i => i != null); return m.length ? m : b.kinds.map((_, i) => i); };
  // one step of masked softmax cross-entropy; wt < 0 pushes the choice down
  function stepScorer(st, kind, wt, lr) {
    const ci = KI.get(kind); if (ci == null) return null;
    const f = score(st), m = maskOf(st.opts); if (!m.includes(ci)) m.push(ci);
    let mx = -1e9; for (const c of m) mx = Math.max(mx, f.z[c]); let Z = 0; const p = {}; for (const c of m) { p[c] = Math.exp(f.z[c] - mx); Z += p[c]; }
    const top = m.reduce((a, c) => f.z[c] > f.z[a] ? c : a, m[0]);
    const dh = new Float32Array(b.H);
    for (const c of m) { const g = (p[c] / Z - (c === ci ? 1 : 0)) * wt * lr; b.b2[c] -= g; const row = b.W2[c]; for (let a = 0; a < b.H; a++) { dh[a] += g * row[a]; row[a] -= g * f.h[a]; } }
    const din = new Float32Array(f.inp.length);
    for (let a = 0; a < b.H; a++) { const d = dh[a] * (1 - f.h[a] * f.h[a]); if (!d) continue; b.b1[a] -= d; const row = b.W1[a]; for (let k = 0; k < f.inp.length; k++) { din[k] += d * row[k]; if (f.inp[k]) row[k] -= d * f.inp[k]; } }
    if (f.ids.length) for (const i of f.ids) for (let d = 0; d < b.D; d++) b.E[i][d] -= din[b.NX + d] / f.ids.length;
    return { hit: top === ci, loss: -Math.log(p[ci] / Z + 1e-9) };
  }
  function stepPolicy(st, target, lr) {
    const f = policyFwd(st); let loss = 0; const dh = new Float32Array(b.H2);
    POLICY.forEach((k, c) => { const t = target[k]; if (typeof t !== 'number') return; const s = sig(f.o[c]), err = f.y[c] - t; loss += err * err; const g = 2 * err * 3 * s * (1 - s) * lr; b.pb2[c] -= g; const row = b.P2[c]; for (let a = 0; a < b.H2; a++) { dh[a] += g * row[a]; row[a] -= g * f.h[a]; } });
    for (let a = 0; a < b.H2; a++) { const d = dh[a] * (1 - f.h[a] * f.h[a]); if (!d) continue; b.pb1[a] -= d; const row = b.P1[a]; for (let k = 0; k < f.inp.length; k++) if (f.inp[k]) row[k] -= d * f.inp[k]; }
    return loss;
  }
  const api = {
    raw: b, keywords,
    // what to do: every possible action with its probability, best first (leanings tilt the scores)
    decide(st) {
      const f = score(st), m = maskOf(st.opts), lean = (b.stats.policyRows || 0) >= 20 ? api.lean(st, f.e) : {};   // an untrained regressor doesn't tilt anything
      const s = m.map(c => { const k = b.kinds[c], g = lean[b.groups[k] || k]; return { kind: k, v: f.z[c] + (g != null ? Math.log(Math.max(0.05, g)) : 0) }; });
      const mx = Math.max(...s.map(o => o.v)); let Z = 0; for (const o of s) Z += (o.p = Math.exp(o.v - mx)); for (const o of s) o.p = +(o.p / Z).toFixed(3);
      return s.sort((a, c) => c.v - a.v);
    },
    // how to lean today: 0-3 per group (1 = neutral)
    lean(st, e) { const y = policyFwd(st, e).y; return Object.fromEntries(POLICY.map((k, i) => [k, +y[i].toFixed(2)])); },
    // what to say: the best stored line for the words heard ('^' = opening a conversation); slots {you} {me} {someone}
    reply(heard, st = {}) {
      const k = heard ? keywords(heard) : ['^']; let best = null, bs = 0.2;
      for (const e of b.lines) {
        const hit = e.k.filter(w => k.includes(w)).length; if (!hit && !(k[0] === '^' && e.k[0] === '^')) continue;
        const sc = (k[0] === '^' && e.k[0] === '^' ? 0.5 : hit / Math.sqrt(e.k.length * Math.max(1, k.length))) * (e.role === st.role ? 1.3 : 1) * (1 + Math.max(-0.5, Math.min(1, e.w)) * 0.5) + Math.random() * 0.1;
        if (sc > bs) { bs = sc; best = e; }
      }
      if (!best) return null;
      const n = st.names || {}; return best.say.replace(/\{you\}/g, n.you || 'friend').replace(/\{me\}/g, n.me || 'I').replace(/\{someone\}/g, n.someone || 'someone');
    },
    // rows: Hollow Town dataset rows. pilot = AI choice (imitate); choice = a choice and how it paid; death = never again;
    // policy = an AI's leanings; talk / babble / line = dialogue
    train(rows, o = {}) {
      const epochs = o.epochs || 4, lr = o.lr || 0.02, log = o.log || (() => {});
      const act = rows.filter(r => r.x && r.choice && (r.type === 'pilot' || r.type === 'choice' || r.type === 'death'));
      const pol = rows.filter(r => r.type === 'policy' && r.x && r.policy);
      // the reward baseline per kind, so a choice is judged against what that choice usually brings
      const base = b.base; for (const r of act) if (r.type === 'choice') { const c = (base[r.choice] ||= { n: 0, r: 0 }); c.n++; c.r += (Math.max(-15, Math.min(15, r.reward)) - c.r) / Math.min(c.n, 200); }
      const pilots = act.filter(r => r.type === 'pilot'), held = new Set(pilots.filter((_, i) => i % 10 === 0));
      for (let ep = 0; ep < epochs; ep++) {
        const order = act.filter(r => !held.has(r)).sort(() => Math.random() - 0.5); let L = 0, n = 0;
        for (const r of order) {
          const wt = r.type === 'pilot' ? 1 : r.type === 'death' ? -1 : 0.3 * Math.max(-1, Math.min(1, (Math.max(-15, Math.min(15, r.reward)) - (base[r.choice]?.r || 0)) / 8));
          if (Math.abs(wt) < 0.01) continue;
          const res = stepScorer({ x: r.x, words: r.words, opts: r.opts }, r.choice, wt, lr * (ep < epochs - 1 ? 1 : 0.5)); if (res && wt > 0) { L += res.loss; n++; }
        }
        let PL = 0; for (const r of pol.slice().sort(() => Math.random() - 0.5)) PL += stepPolicy({ x: r.x, words: r.words, traits: r.traits }, r.policy, lr);
        log(`epoch ${ep + 1}: scorer loss ${(L / Math.max(1, n)).toFixed(3)} (${n}), policy mse ${(PL / Math.max(1, pol.length)).toFixed(3)} (${pol.length})`);
      }
      let hit = 0; for (const r of held) { const top = api.decide({ x: r.x, words: r.words, opts: r.opts })[0]; if (top && top.kind === r.choice) hit++; }
      // dialogue: AI lines, and plain lines that landed
      for (const r of rows) {
        if (!['talk', 'babble', 'line'].includes(r.type) || !r.said || (r.type === 'talk' && !r.src)) continue;   // old talk rows kept real names; new ones have {you}/{me} slots
        const w = r.type === 'talk' ? 0.4 : r.score; if (r.type !== 'talk' && !(r.score > 0.3)) continue;
        const k = r.heard ? keywords(r.heard) : ['^'], say = String(r.said).trim(); if (!k.length || say.length < 4 || say.length > 240) continue;
        const ex = b.lines.find(e => e.say === say); if (ex) { ex.w = ex.w * 0.8 + w * 0.2; continue; }
        b.lines.push({ k, say, role: r.role || null, w: +w.toFixed(2) });
      }
      if (b.lines.length > 3000) b.lines = b.lines.sort((a, c) => c.w - a.w).slice(0, 3000);
      b.stats = { trainedAt: new Date().toISOString(), actRows: act.length, pilots: pilots.length, policyRows: pol.length, lines: b.lines.length, heldOut: held.size, agree: held.size ? +(hit / held.size).toFixed(3) : null };
      log(`agrees with the AI on ${held.size} held-out choices: ${b.stats.agree == null ? 'n/a' : Math.round(b.stats.agree * 100) + '%'}; ${b.lines.length} lines`);
      return b.stats;
    },
    save() { const arr = m => m.map(r => Array.from(r, v => +v.toFixed(4))); return { v: 1, NX: b.NX, D: b.D, H: b.H, H2: b.H2, vocab: b.vocab, kinds: b.kinds, groups: b.groups, policyKeys: POLICY, traits: TRAITS, E: arr(b.E), W1: arr(b.W1), b1: Array.from(b.b1), W2: arr(b.W2), b2: Array.from(b.b2), P1: arr(b.P1), pb1: Array.from(b.pb1), P2: arr(b.P2), pb2: Array.from(b.pb2), base: b.base, lines: b.lines, stats: b.stats }; },
  };
  return api;
}
function load(j) {
  const F = a => Float32Array.from(a), M = m => m.map(F);
  const b = { ...j, E: M(j.E), W1: M(j.W1), b1: F(j.b1), W2: M(j.W2), b2: F(j.b2), P1: M(j.P1), pb1: F(j.pb1), P2: M(j.P2), pb2: F(j.pb2), lines: j.lines || [], base: j.base || {}, stats: j.stats || {} };
  return wrap(b);
}
// build a fresh brain sized to a dataset: the kinds seen, and the most-heard words
function fromRows(rows, cfg = {}) {
  const kinds = [...new Set(rows.filter(r => r.choice).map(r => r.choice))].sort();
  const wc = {}; for (const r of rows) for (const w of r.words || []) wc[w] = (wc[w] || 0) + 1;
  for (const r of rows) if (r.said) for (const w of keywords(r.said)) wc[w] = (wc[w] || 0) + 0.2;
  const vocab = Object.entries(wc).filter(([, n]) => n >= 2).sort((a, c) => c[1] - a[1]).slice(0, cfg.vocabSize || 600).map(([w]) => w);
  const nx = rows.find(r => r.x)?.x.length || 62;
  return create({ ...cfg, NX: nx, kinds, vocab });
}
const NPCBrain = { create, load, fromRows, keywords, POLICY, TRAITS };
if (typeof module !== 'undefined' && module.exports) module.exports = NPCBrain; else root.NPCBrain = NPCBrain;
})(typeof window !== 'undefined' ? window : globalThis);

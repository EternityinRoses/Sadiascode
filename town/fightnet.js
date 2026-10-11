// THE FIGHT NET (Rose: "do more of the systems loh has until you have the gist a smart npc needs to survive in loh").
// Its input is Legends of Harpine's own: the twenty numbers battle/learn.js builds at the start of a turn, slot for slot
// (0 nearest foe ft/60, 1 my hp, 2 its hp, 3 I'm threatened, 4 I threaten it, 5 it has cover from me, 6 I have cover from
// it, 7 I'm flanked, 8 I hold a ranged weapon, 9 spells/6, 10 round/10, 11-17 my last act one-hot, 18 AC/25, 19 prone).
// Its output is LoH's seven acts (battle/profile.js ACTS, in that order). So a net trained here on Hollow Town's fights
// reads a LoH turn as it is, and a LoH turn's {inp, act} (chars/<name>.learn.json recs) can train it.
// It learns what kept a body standing: each recorded turn is weighted by what followed it (the hp it took off its foe less
// the hp it lost before its next turn, and how its fight ended), advantage-weighted imitation. 20 -> 8 tanh -> 7 softmax.
(function (root) {
  const NIN = 20, NH = 8, NOUT = 7;
  const ACTS = ['close and swing', 'stand and swing', 'shoot', 'cast', 'advance', 'back off', 'guard or drink'];
  const r = n => (Math.random() * 2 - 1) * n;
  class FightNet {
    constructor(j) {
      if (j && j.w1) { Object.assign(this, JSON.parse(JSON.stringify(j))); return; }
      this.v = 1; this.nin = NIN; this.nh = NH; this.nout = NOUT; this.acts = ACTS.slice();
      this.slots = 'LoH battle/learn.js features(): the twenty numbers, in order';
      this.w1 = Array.from({ length: NH }, () => Array.from({ length: NIN }, () => r(0.4))); this.b1 = new Array(NH).fill(0);
      this.w2 = Array.from({ length: NOUT }, () => Array.from({ length: NH }, () => r(0.4))); this.b2 = new Array(NOUT).fill(0);
      this.stats = {};
    }
    forward(inp) {
      const h = this.w1.map((w, i) => Math.tanh(w.reduce((s, x, j) => s + x * (+inp[j] || 0), this.b1[i])));
      const z = this.w2.map((w, k) => w.reduce((s, x, i) => s + x * h[i], this.b2[k]));
      const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), t = e.reduce((a, b) => a + b, 0);
      return { h, p: e.map(v => v / t) };
    }
    // the act's chances, with the acts this body can't take now masked out
    decide(inp, mask) {
      const p = this.forward(inp).p.map((v, k) => (!mask || mask[k]) ? v : 0), t = p.reduce((a, b) => a + b, 0) || 1;
      return p.map(v => v / t);
    }
    // rows: [{ inp, act, w }]; plain SGD on weighted cross-entropy
    train(rows, o = {}) {
      const lr = o.lr || 0.05, epochs = o.epochs || 20; let loss = 0;
      for (let ep = 0; ep < epochs; ep++) {
        loss = 0; const order = rows.map((_, i) => i).sort(() => Math.random() - 0.5);
        for (const i of order) {
          const { inp, act, w = 1 } = rows[i]; if (!(act >= 0 && act < NOUT)) continue;
          const { h, p } = this.forward(inp); loss += -Math.log(Math.max(1e-9, p[act])) * w;
          const dz = p.map((v, k) => (v - (k === act ? 1 : 0)) * w);
          const dh = h.map((hv, i2) => dz.reduce((s, d, k) => s + d * this.w2[k][i2], 0) * (1 - hv * hv));
          for (let k = 0; k < NOUT; k++) { for (let i2 = 0; i2 < NH; i2++) this.w2[k][i2] -= lr * dz[k] * h[i2]; this.b2[k] -= lr * dz[k]; }
          for (let i2 = 0; i2 < NH; i2++) { for (let j = 0; j < NIN; j++) this.w1[i2][j] -= lr * dh[i2] * (+inp[j] || 0); this.b1[i2] -= lr * dh[i2]; }
        }
        if (o.log && (ep % 5 === 4 || ep === epochs - 1)) o.log(`epoch ${ep + 1}: loss ${(loss / Math.max(1, rows.length)).toFixed(3)}`);
      }
      return loss / Math.max(1, rows.length);
    }
    // what a recorded turn is worth: what it did to the foe less what it cost, and how the fight ended for this body
    static weigh(rows, beta = 2) {
      const v = rows.map(x => (+x.r || 0) + 0.5 * (+x.outcome || 0)), mean = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
      return rows.map((x, i) => ({ inp: x.inp, act: x.act, w: Math.exp(Math.max(-3, Math.min(2, (v[i] - mean) * beta))) }));
    }
    save() { return JSON.parse(JSON.stringify(this)); }
    static load(j) { return new FightNet(j); }
  }
  FightNet.ACTS = ACTS; FightNet.NIN = NIN;
  if (typeof module !== 'undefined' && module.exports) module.exports = FightNet; else root.FightNet = FightNet;
})(typeof globalThis !== 'undefined' ? globalThis : this);

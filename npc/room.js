// Hollow Room: FSM NPCs with temperament, witnessing, beliefs, rumors, combat and learning.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const W = 20, D = 14, DOOR = new THREE.Vector3(-W / 2 + 0.6, 0, 0);
const HEAR = 6, SEE = 10;
const ui = document.getElementById('ui');
const $ = id => document.getElementById(id);

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b09);
scene.fog = new THREE.Fog(0x0d0b09, 25, 45);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 17, 15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = 1.35; controls.update();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

scene.add(new THREE.HemisphereLight(0x8899aa, 0x221a12, 0.5));
const moon = new THREE.DirectionalLight(0x9fb4d0, 0.5); moon.position.set(-8, 14, 6); moon.castShadow = true;
Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
scene.add(moon);

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
function box(w, h, d, c, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
box(W, 0.2, D, 0x3b2c1f, 0, -0.1, 0);
box(W, 3, 0.3, 0x2c241c, 0, 1.5, -D / 2);
box(0.3, 3, D, 0x2c241c, W / 2, 1.5, 0);
box(0.3, 3, D / 2 - 1.2, 0x2c241c, -W / 2, 1.5, -D / 4 - 0.6);
box(0.3, 3, D / 2 - 1.2, 0x2c241c, -W / 2, 1.5, D / 4 + 0.6);
box(W, 0.6, 0.3, 0x2c241c, 0, 0.3, D / 2);
box(3.2, 0.12, 1.8, 0x5a3d24, 0, 1.0, 0);
for (const [x, z] of [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]]) box(0.12, 1, 0.12, 0x4a321e, x, 0.5, z);
box(1, 1, 1, 0x6b5233, 8, 0.5, -5.5); box(0.8, 0.8, 0.8, 0x6b5233, 8.6, 0.4, -4.4);
box(2.4, 1.6, 0.8, 0x3a3631, 4, 0.8, -D / 2 + 0.5);
const ember = box(1.4, 0.4, 0.3, 0xff6a1a, 4, 0.3, -D / 2 + 0.95); ember.material.emissive = new THREE.Color(0xff4a10);
const fire = new THREE.PointLight(0xff8a3a, 30, 14, 1.6); fire.position.set(4, 1, -D / 2 + 1.4); fire.castShadow = true; scene.add(fire);
box(0.6, 0.5, 0.6, 0x7a6a3a, -6, 0.25, 4);
box(1.6, 0.3, 1.2, 0x2a3320, -8.4, 0.15, -5.4);  // reeds where the snake lives
const OBST = [{ x: 0, z: 0, r: 1.9 }, { x: 8.2, z: -5, r: 1.2 }, { x: 4, z: -D / 2 + 0.5, r: 1.4 }];
const T = (x, z) => new THREE.Vector3(x, 0, z);
const SPOT = { fire: T(4, -D / 2 + 2), table: T(0, 0.2), hay: T(-6, 4.8), snake: T(-8.3, -5.3) };

// ---------- tuning ----------
const HP = { bram: 16, edda: 8, tobin: 10, sly: 10, nanny: 8, soot: 3, pip: 6, ssith: 5, grizzle: 30, player: 14 };
const DMG = { bram: 4, edda: 1, tobin: 2, sly: 3, nanny: 2, soot: 1, pip: 2, ssith: 4, grizzle: 6, player: 3 };
const SPEED = { human: 1.4, animal: 1.0, pet: 1.8, beast: 1.3 };
const CRIME = { attack: 'attacked', down: 'beat down', steal: 'robbed', beast: 'mauled' };
const COLORS = { guard: 0x3f63a8, civilian: 0x6f8f4a, enemy: 0x7a1f1f, player: 0xc2185b };

// ---------- helpers ----------
const A = {};
let selected = null, evSeq = 0, bearCount = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const dist = (a, b) => a.g.position.distanceTo(b.g.position);
const up = a => a && !a.off && !a.down;
const others = a => Object.values(A).filter(b => b !== a && up(b));
const npcs = () => Object.values(A).filter(a => a.id !== 'player');
const belief = (a, id) => (a.beliefs[id] ||= { danger: 0, notes: [] });
const danger = (a, b) => a.beliefs[b.id]?.danger || 0;
const isBeast = a => a.kind === 'beast';
function setState(a, s, target = null, t = 0) { a.state = s; a.stateT = 0; a.target = target; a.wait = t; }
const targetPos = a => a.target?.isVector3 ? a.target : a.target?.g?.position;
function arrived(a, r = 0.6) { const p = targetPos(a); return !p || a.g.position.distanceTo(p) < r; }
function nearSpot(a, p, r = 3) { return (a.spots || []).some(s => s.pos.distanceTo(p) < r); }
function randPoint(a) {
  for (let i = 0; i < 12; i++) {
    const p = T(rnd(-W / 2 + 1.5, W / 2 - 1.5), rnd(-D / 2 + 1.5, D / 2 - 1.5));
    if (a && (nearSpot(a, p) || others(a).some(b => danger(a, b) > 0.35 && b.g.position.distanceTo(p) < 4))) continue;
    return p;
  }
  return T(rnd(-3, 3), rnd(2, 5));
}

// ---------- bodies ----------
function body(id, c) {
  const g = new THREE.Group();
  if (c.kind === 'human') {
    const col = id === 'tobin' ? 0x9a7a3a : COLORS[c.faction];
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), mat(col)); b.position.y = 0.78; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat(0xd9b48f)); h.position.y = 1.55; g.add(h);
    if (c.faction === 'guard') { const m = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 10), mat(0x9aa3ad)); m.position.y = 1.78; g.add(m); }
    if (c.faction === 'enemy') { const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.55, 10), mat(0x2a1010)); m.position.y = 1.72; g.add(m); }
    if (c.faction === 'player') { const r = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xe8355f)); r.position.set(0.18, 1.72, 0.05); g.add(r); }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), mat(0xc49a75)); nose.position.set(0, 1.55, 0.25); g.add(nose);
    g.userData.head = 2.0;
  } else if (id === 'ssith') {
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11 - i * 0.01, 8, 6), mat(0x4d6b2a)); s.position.set(Math.sin(i * 1.1) * 0.25, 0.1, -i * 0.16 + 0.3); g.add(s); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), mat(0x3a521e)); head.position.set(0, 0.14, 0.45); g.add(head);
    g.userData.head = 0.6;
  } else if (id === 'grizzle') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.8), mat(0x4a3424)); b.position.y = 0.9; g.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), mat(0x3e2b1d)); h.position.set(0, 1.2, 1.1); g.add(h);
    for (const lx of [-1, 1]) for (const lz of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), mat(0x3e2b1d)); l.position.set(lx * 0.35, 0.3, lz * 0.6); g.add(l); }
    for (const ex of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x3e2b1d)); e.position.set(ex * 0.25, 1.55, 1.0); g.add(e); }
    g.userData.head = 2.0;
  } else {
    const s = { nanny: [0.9, 0.55, 0.4, 0xd8d2c4], soot: [0.5, 0.25, 0.22, 0x1a1a1e], pip: [0.7, 0.35, 0.3, 0x8a5a2b] }[id];
    const b = new THREE.Mesh(new THREE.BoxGeometry(s[2], s[1], s[0]), mat(s[3])); b.position.y = s[1] * 1.1; g.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(s[2] * 0.8, s[1] * 0.8, s[2] * 0.8), mat(s[3])); h.position.set(0, s[1] * 1.5, s[0] / 2 + 0.05); g.add(h);
    for (const lx of [-1, 1]) for (const lz of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, s[1] * 0.6, 0.07), mat(s[3])); l.position.set(lx * s[2] * 0.35, s[1] * 0.3, lz * s[0] * 0.35); g.add(l); }
    if (id === 'nanny') for (const hx of [-1, 1]) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 6), mat(0x8a8070)); m.position.set(hx * 0.1, s[1] * 2, s[0] / 2); g.add(m); }
    if (id === 'soot') for (const ex of [-1, 1]) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), mat(s[3])); m.position.set(ex * 0.07, s[1] * 1.95, s[0] / 2 + 0.05); g.add(m); }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, id === 'soot' ? 0.4 : 0.2), mat(s[3])); tail.position.set(0, s[1] * 1.2, -s[0] / 2 - 0.1); tail.rotation.x = -0.6; g.add(tail);
    g.userData.head = s[1] * 2 + 0.3;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.id = id; } });
  scene.add(g);
  return g;
}

// ---------- boot ----------
async function boot() {
  const cast = await (await fetch('/cast')).json();
  cast.player = { name: $('pname').value || 'Rose', role: 'you', faction: 'player', kind: 'human', temper: {}, base: {}, beliefs: {} };
  const starts = { bram: T(-7, -2), edda: T(2, 3), tobin: T(-2, -3), sly: DOOR.clone(), nanny: T(-6, 4.5), soot: SPOT.fire.clone(), pip: T(3, 3.5), ssith: SPOT.snake.clone(), grizzle: DOOR.clone(), player: T(-5, 1) };
  for (const [id, c] of Object.entries(cast)) {
    const a = A[id] = { id, ...c, g: body(id, c), hp: HP[id], state: 'IDLE', stateT: 0, target: null, wait: 0, cool: rnd(2, 8), atk: 0,
      talk: null, heardLast: '', beliefs: c.beliefs || {}, spots: [], known: new Set(), toReport: [] };
    for (const b of Object.values(a.beliefs)) for (const n of b.notes || []) a.known.add(n.id);
    a.g.position.copy(starts[id]);
    a.lbl = document.createElement('div'); a.lbl.className = 'lbl'; ui.appendChild(a.lbl);
  }
  for (const id of ['sly', 'grizzle']) { A[id].off = true; A[id].g.visible = false; }
  A.sly.back = rnd(15, 25);
  setState(A.bram, 'PATROL'); A.bram.wp = 0;
  setState(A.ssith, 'COIL'); A.ssith.thr = 0;
  controls.target.copy(A.player.g.position);
  setInterval(saveAll, 10000);
  const grudges = npcs().filter(a => danger(a, A.player) > 0.3).map(a => a.name);
  logLine('sig', 'The room wakes. WASD to walk, F to attack, G to steal, B for the bear.' + (grudges.length ? ` ${grudges.join(', ')} still remember${grudges.length === 1 ? 's' : ''} what you did.` : ''));
  loop();
}
const PATROL = [T(-7, -3), T(-7, 3), T(6, 4), T(6, -3)];

// ---------- speech ----------
function hearers(a) { return others(a).filter(b => b.id !== 'player' && dist(a, b) < HEAR).map(b => b.id); }
const aboutOf = ev => ({ subject: A[ev.actor]?.name || ev.actor, victim: A[ev.victim]?.name || ev.victim, crime: CRIME[ev.type] || 'hurt' });

async function say(a, toId, intent, heard = '', about = null) {
  if (a.saying || a.down || a.id === 'player') return null;
  a.saying = true;
  try {
    const r = await (await fetch('/talk', { method: 'POST', body: JSON.stringify({ speaker: a.id, to: toId, to_name: A[toId]?.name, intent, heard, about, state: a.state, listeners: hearers(a) }) })).json();
    if (r.error) throw new Error(r.error);
    bubble(a, r.text, r.src);
    const who = toId && A[toId] ? ` → ${A[toId].name}` : '';
    logLine(r.src, `${a.name}${who}: ${r.text}` + (r.src === 'learned' ? `  (learned from ${r.from})` : r.src === 'boost' ? '  (boosted)' : r.src === 'remix' ? '  (remixed)' : ''));
    applyDeltas(r.deltas); mergeStats(r.stats);
    for (const l of Object.keys(r.deltas)) A[l].heardLast = `${a.name}: ${r.text}`;
    return r.text;
  } catch (e) { logLine('sig', `(${a.name} mumbles: ${e.message})`); return null; }
  finally { setTimeout(() => a.saying = false, 500); }
}
function applyDeltas(ds) { for (const [id, d] of Object.entries(ds || {})) for (const [k, v] of Object.entries(d)) if (k in A[id].temper) A[id].temper[k] = clamp(A[id].temper[k] + v); }
function mergeStats(st) { for (const [id, s] of Object.entries(st || {})) A[id].stats = s; }
function bubble(a, text, src) {
  if (a.bub) a.bub.remove();
  const b = a.bub = document.createElement('div'); b.className = 'bub ' + src; b.textContent = text; ui.appendChild(b);
  setTimeout(() => { if (a.bub === b) { b.remove(); a.bub = null; } }, 2500 + text.length * 40);
}

// ---------- conversations (and gossip about deeds) ----------
function startTalk(a, b) {
  if (a.talk || b.talk || !up(b)) return;
  const conv = { a, b, turn: 0, max: 2 + Math.floor(Math.random() * 3), last: '' };
  a.talk = b.talk = conv; setState(a, 'TALK', b); setState(b, 'TALK', a);
  nextTurn(conv);
}
async function nextTurn(c) {
  const sp = c.turn % 2 ? c.b : c.a, li = sp === c.a ? c.b : c.a;
  if (c.turn >= c.max || sp.talk !== c || li.talk !== c || !up(sp) || !up(li) || dist(sp, li) > 3) return endTalk(c);
  let intent, about = null;
  const news = sp.kind === 'human' && li.kind === 'human' ? latestNews(sp, li) : null;
  if (news && c.turn > 0 && Math.random() < 0.6) { intent = 'report'; about = aboutOf(news); }
  else intent = li.kind !== 'human' && sp.kind === 'human' ? 'pet' : c.turn === 0 ? 'greet' : c.turn === c.max - 1 ? 'bye' :
    (Math.random() < 0.35 ? 'gossip' : c.turn === 1 ? 'reply' : Math.random() < 0.5 ? 'chat' : 'reply');
  const t = await say(sp, li.id, intent, c.last, about);
  if (news && intent === 'report') tellAll(sp, li, news);
  c.last = t || ''; c.turn++;
  setTimeout(() => nextTurn(c), 2600);
}
function endTalk(c) {
  for (const x of [c.a, c.b]) if (x.talk === c) { x.talk = null; x.cool = rnd(8, 20) * (1.2 - (x.temper.social ?? 0.5)); if (x.state === 'TALK') setState(x, x.id === 'bram' ? 'PATROL' : 'IDLE', null, rnd(1, 3)); }
}
function latestNews(sp, li) {
  const notes = Object.values(sp.beliefs).flatMap(b => b.notes || []).filter(n => !li.known.has(n.id) && n.actor !== li.id && n.hops < 3);
  return notes.sort((x, y) => y.t - x.t)[0] || null;
}
function tellAll(teller, to, ev) {  // the one told AND anyone overhearing learn it, a bit weaker each retelling
  const ev2 = { ...ev, hops: (ev.hops || 0) + 1 };
  for (const b of [to, ...others(teller).filter(b => b !== to && b.id !== 'player' && dist(teller, b) < HEAR)]) perceive(b, ev2, 'told', teller);
}

// ---------- deeds: witnessing, beliefs, reactions ----------
function canSee(b, pos, max = SEE) {
  if (!up(b)) return false;
  const d = b.g.position.distanceTo(pos);
  if (d < 3.5) return true;      // close enough to hear it
  if (d > max) return false;
  const f = new THREE.Vector3(Math.sin(b.g.rotation.y), 0, Math.cos(b.g.rotation.y));
  return f.dot(pos.clone().sub(b.g.position).setY(0).normalize()) > 0.26;  // ~150 degree view
}
function deed(type, actor, victim, sev) {
  const now = performance.now() / 1000;
  let ev = actor.lastDeed;
  if (!(ev && ev.victim === victim.id && ev.type === type && now - ev.t < 8)) ev = actor.lastDeed = { id: `${actor.id}-${++evSeq}-${Date.now() % 100000}`, type, actor: actor.id, victim: victim.id, sev, hops: 0, t: now, pos: victim.g.position.clone() };
  for (const b of npcs()) {
    if (b === actor) continue;
    const sneaky = type === 'steal';
    if (b === victim ? (!sneaky || Math.random() < 0.6) : canSee(b, ev.pos, sneaky ? 5 : SEE)) perceive(b, ev, 'saw');
  }
  return ev;
}
function judge(b, ev) {
  const actor = A[ev.actor], victim = A[ev.victim];
  if (isBeast(actor)) return 'beast';
  if (isBeast(victim)) return null;                                      // fighting a beast is fine
  if (danger(b, victim) > 0.5 && b !== victim) return null;               // they had it coming
  if (victim.lastTarget === actor && performance.now() / 1000 - (victim.lastHitAt || 0) < 6) return null;  // self-defence
  if (actor.faction === 'guard' && b.beliefs[ev.victim]?.wanted) return null;
  return 'crime';
}
function perceive(b, ev, how, teller = null) {
  if (b.id === ev.actor || b.known.has(ev.id) || !up(b)) return;
  b.known.add(ev.id);
  const verdict = judge(b, ev); if (!verdict) return;
  const actor = A[ev.actor], victim = A[ev.victim];
  if (b.id === 'soot' && victim !== b) return;                            // cats don't care
  const w = how === 'saw' ? 1 : Math.pow(0.6, ev.hops || 1);
  const bel = belief(b, ev.actor);
  bel.danger = verdict === 'beast' ? 1 : clamp(bel.danger + ev.sev * w);
  bel.notes = [...(bel.notes || []), { id: ev.id, type: ev.type, actor: ev.actor, victim: ev.victim, sev: ev.sev, hops: ev.hops || 0, how, from: teller?.name || null, t: performance.now() / 1000 }].slice(-5);
  if (how === 'saw') b.spots.push({ pos: ev.pos.clone(), until: performance.now() / 1000 + 90 });
  logLine('know', `${b.name} ${how === 'saw' ? 'saw' : 'heard from ' + teller.name} that ${aboutOf(ev).subject} ${CRIME[ev.type]} ${aboutOf(ev).victim}.`);
  react(b, ev, how, verdict);
}
function react(b, ev, how, verdict) {
  const actor = A[ev.actor], victim = A[ev.victim], self = victim === b, near = up(actor) && dist(b, actor) < 6;
  const violent = ev.type !== 'steal';
  if (b.talk && near) endTalk(b.talk);
  switch (b.faction) {
    case 'civilian':
      b.temper.fear = clamp(b.temper.fear + (self ? 0.3 : 0.15));
      if (how === 'saw' && verdict === 'crime' && !self && !b.toReport.some(e => e.id === ev.id)) b.toReport.push(ev);
      if (how === 'saw' && self && verdict === 'crime') b.toReport.push(ev);
      if (near && (violent || self)) { if (how === 'saw') say(b, null, 'alarm', '', aboutOf(ev)); setState(b, 'FLEE', actor); }
      break;
    case 'guard':
      if (verdict === 'beast' && actor.id === 'ssith') break;             // leave the snake be
      if (verdict === 'crime') belief(b, ev.actor).wanted = true;
      if (up(actor)) { if (b.state !== 'HUNT') say(b, actor.id, 'alarm'); setState(b, 'HUNT', actor); }
      break;
    case 'enemy':
      if (self) { if (b.temper.aggression > b.temper.fear) setState(b, 'FIGHT', actor); else { say(b, null, 'flee'); setState(b, 'LEAVE', DOOR.clone()); } }
      else if (violent) b.temper.fear = clamp(b.temper.fear + 0.1);   // doesn't care, but now knows who is dangerous
      if (verdict === 'beast' && near) setState(b, 'LEAVE', DOOR.clone());
      break;
    case 'pet':
      if (b.id === 'pip' && (self || victim.id === b.owner)) {
        if (actor.id === 'grizzle' && b.temper.fear > 0.4) { say(b, null, 'flee'); setState(b, 'FLEE', actor); }
        else { say(b, actor.id, 'attack'); setState(b, 'ATTACK', actor); }
      } else if (b.id === 'soot' && self) { say(b, null, 'flee'); setState(b, 'FLEE', actor); }
      break;
    case 'neutral':
      if (b.id === 'nanny' && self) setState(b, 'ATTACK', actor);
      if (b.id === 'nanny' && verdict === 'beast' && near) setState(b, 'FLEE', actor);
      if (b.id === 'ssith' && self) strike(b, actor);
      break;
    case 'hostile':
      if (self) setState(b, 'HUNT', actor);
      break;
  }
}

// ---------- combat ----------
function hit(a, v) {
  if (!up(a) || !up(v) || a.atk > 0 || dist(a, v) > (a.id === 'grizzle' ? 1.9 : 1.4)) return false;
  a.atk = a.id === 'grizzle' ? 1.6 : 1.1;
  v.hp -= DMG[a.id]; a.lastTarget = v; a.lastHitAt = performance.now() / 1000;
  v.g.traverse(o => { if (o.isMesh) { o.material.emissive?.setHex(0x661111); setTimeout(() => o.material.emissive?.setHex(o === ember ? 0xff4a10 : 0), 150); } });
  if (Math.random() < 0.5) say(v, a.id, 'hurt');
  if (Math.random() < 0.3) say(a, v.id, 'attack');
  if (v.hp <= 0) { knockOut(v, a); deed('down', a, v, 0.9); }
  else deed('attack', a, v, 0.45);
  return true;
}
function knockOut(v, by) {
  v.down = true; v.state = 'DOWN'; v.g.rotation.z = Math.PI / 2; v.g.position.y = 0.3;
  if (v.talk) endTalk(v.talk);
  logLine('sig', `${v.name} goes down.`);
  for (const b of npcs()) if (b.target === v && ['HUNT', 'ATTACK', 'FIGHT', 'MUG'].includes(b.state)) {
    if (b.faction === 'guard') { const bel = belief(b, v.id); if (bel.wanted) { bel.wanted = false; say(b, v.id, 'warn'); } }
    setState(b, b.id === 'bram' ? 'PATROL' : 'IDLE', null, 2);
  }
  setTimeout(() => {
    v.down = false; v.hp = Math.ceil(HP[v.id] * (v.id === 'player' ? 1 : 0.6)); v.g.rotation.z = 0; v.g.position.y = 0;
    if (v.id === 'player') v.g.position.copy(DOOR).add(T(1, 0));
    if (v.id === 'grizzle' || v.id === 'sly') { v.off = true; v.g.visible = false; if (v.id === 'sly') v.back = rnd(30, 50); }
    setState(v, v.id === 'bram' ? 'PATROL' : v.id === 'ssith' ? 'COIL' : 'IDLE', null, 2);
    logLine('sig', `${v.name} ${v.off ? 'crawls away.' : 'gets back up.'}`);
  }, v.id === 'player' ? 5000 : 25000);
}
function strike(s, t) { s.state = 'STRIKE'; s.stateT = 0; s.target = t; s.atk = 0; if (!hit(s, t)) setTimeout(() => hit(s, t), 300); }

// ---------- signals ----------
function signal(from, type, radius) {
  logLine('sig', `[${type}] from ${from.name}`);
  for (const b of npcs()) if (b !== from && up(b) && dist(from, b) < radius) onSignal(b, type, from);
}
function onSignal(a, type, from) {
  if (type === 'alarm' || type === 'bark') {
    a.temper.fear = clamp((a.temper.fear ?? 0) + (type === 'alarm' ? 0.15 : 0.06));
    if (a.id === 'bram' && !['HUNT', 'CHASE'].includes(a.state)) setState(a, 'GOTO', from.g.position.clone());
    else if (a.faction === 'civilian' && !['FLEE', 'REPORT'].includes(a.state)) { if (a.talk) endTalk(a.talk); setState(a, 'ALERT', null, 3); }
    else if (a.id === 'soot') setState(a, 'HIDE', SPOT.table.clone());
  }
  if (type === 'rattle' && a.id !== 'ssith') {   // learn: that corner bites
    const bel = belief(a, 'ssith'); bel.danger = Math.max(bel.danger, 0.5);
    a.spots.push({ pos: SPOT.snake.clone(), until: performance.now() / 1000 + 300 });
    if (dist(a, from) < 2.5) setState(a, 'FLEE', from);
  }
  if (type === 'roar') {
    const bear = from, ev = { id: 'bear-' + bearCount, type: 'beast', actor: 'grizzle', victim: a.id, sev: 1, hops: 0, t: performance.now() / 1000, pos: bear.g.position.clone() };
    perceive(a, ev, 'saw');
    if (a.faction === 'civilian' || a.id === 'nanny' || a.id === 'soot') setState(a, 'FLEE', bear);
    if (a.id === 'sly') setState(a, 'LEAVE', DOOR.clone());
    if (a.id === 'pip') { say(a, bear.id, 'alarm'); setState(a, a.temper.aggression > 0.5 ? 'ATTACK' : 'FLEE', bear); }
  }
  if (type === 'calm') {
    a.temper.fear = clamp((a.temper.fear ?? 0) - 0.2);
    if (['FLEE', 'ALERT', 'HIDE'].includes(a.state)) setState(a, 'IDLE', null, rnd(1, 3));
  }
}

// ---------- the FSM ----------
function scaredOf(a) { return others(a).filter(b => danger(a, b) > 0.35 && !(a.faction === 'guard')).sort((x, y) => dist(a, x) - dist(a, y))[0]; }

function think(a) {
  if (a.off || a.down || a.id === 'player') return;
  const t = a.temper, sly = A.sly, now = performance.now() / 1000;
  a.spots = a.spots.filter(s => s.until > now);
  if (a.state === 'TALK' && a.faction !== 'civilian') return;

  // shared fighting states
  if (['ATTACK', 'FIGHT', 'HUNT'].includes(a.state)) {
    const v = a.target;
    if (!up(v) || a.stateT > (a.id === 'bram' ? 40 : 10)) return setState(a, a.id === 'bram' ? 'PATROL' : a.id === 'grizzle' ? 'HUNT' : 'IDLE', null, 2);
    hit(a, v);
    if (a.id === 'nanny' && a.stateT > 2) setState(a, 'FLEE', v);
    if (a.hp < HP[a.id] * 0.3 && a.id !== 'bram') { say(a, null, 'flee'); setState(a, a.id === 'sly' || a.id === 'grizzle' ? 'LEAVE' : 'FLEE', a.id === 'sly' || a.id === 'grizzle' ? DOOR.clone() : v); }
    return;
  }

  if (a.id === 'grizzle') {
    if (a.state === 'LEAVE') return;
    if (a.stateT > 70 && a.state !== 'HUNT') return setState(a, 'LEAVE', DOOR.clone());
    const prey = others(a).filter(b => !isBeast(b)).sort((x, y) => dist(a, x) - dist(a, y))[0];
    if (prey && dist(a, prey) < 12) setState(a, 'HUNT', prey); else setState(a, 'LEAVE', DOOR.clone());
    return;
  }

  if (a.id === 'ssith') {
    if (a.state === 'STRIKE') { if (a.stateT > 1.2) setState(a, 'COIL'); return; }
    const close = others(a).filter(b => dist(a, b) < 1.7).sort((x, y) => dist(a, x) - dist(a, y))[0];
    a.thr = close ? a.thr + 0.25 : Math.max(0, a.thr - 0.1);
    if (close && a.thr >= 1 && !a.rattled) { a.rattled = true; say(a, close.id, 'warn'); signal(a, 'rattle', 6); }
    if (close && a.thr >= 2.2) { strike(a, close); deed('beast', a, close, 0.6); a.thr = 0; }
    if (!close && a.thr === 0) a.rattled = false;
    if (a.state !== 'COIL') setState(a, 'COIL', SPOT.snake.clone());
    return;
  }

  if (a.id === 'sly') {
    const guard = A.bram, feared = scaredOf(a);
    if (a.state === 'LEAVE') return;
    if ((up(guard) && ['HUNT', 'CHASE'].includes(guard.state) && guard.target === a && dist(a, guard) < 8) || (feared && dist(a, feared) < 3.5)) {
      if (feared && feared.id !== 'bram' && !a.waried) { a.waried = true; say(a, feared.id, 'wary'); setTimeout(() => a.waried = false, 15000); }
      else say(a, null, 'flee');
      return setState(a, 'LEAVE', DOOR.clone());
    }
    if (a.state === 'IDLE' || (a.state === 'SNEAK' && !up(a.target))) {
      const scary = others(a).filter(b => danger(a, b) > 0.35 || b.id === 'bram');
      const prey = others(a).filter(b => b.faction === 'civilian' && !scary.some(s => dist(s, b) < 5));
      if (prey.length) setState(a, 'SNEAK', prey[Math.floor(Math.random() * prey.length)]);
      else if (a.stateT > 12) setState(a, 'LEAVE', DOOR.clone());
    }
    if (a.state === 'SNEAK' && up(a.target) && dist(a, a.target) < 1.3) { say(a, a.target.id, 'threat'); setState(a, 'MUG', a.target); a.hits = 0; }
    if (a.state === 'MUG') {
      const v = a.target;
      if (!up(v) || dist(a, v) > 4 || a.stateT > 6) { a.loot = (a.loot || 0) + 1; return setState(a, 'LEAVE', DOOR.clone()); }
      if (hit(a, v)) a.hits++;
    }
    return;
  }

  if (a.id === 'bram') {
    const wanted = others(a).find(b => a.beliefs[b.id]?.wanted || b.id === 'grizzle');
    if (wanted) { if (a.talk) endTalk(a.talk); say(a, wanted.id, 'alarm'); return setState(a, 'HUNT', wanted); }
    if (up(sly) && dist(a, sly) < 8 && Math.random() < (['SNEAK', 'MUG'].includes(sly.state) ? 0.35 : 0.05)) {
      if (a.talk) endTalk(a.talk); say(a, sly.id, 'alarm'); signal(a, 'alarm', 12); belief(a, 'sly').wanted = true; return setState(a, 'HUNT', sly);
    }
    if (a.state === 'TALK') return;
    const shady = others(a).find(b => danger(a, b) > 0.3 && dist(a, b) < 3);
    if (shady && !a.eyed) { a.eyed = true; setTimeout(() => a.eyed = false, 20000); say(a, shady.id, 'wary'); }
    if (a.state === 'GOTO' && a.stateT > 6) return setState(a, 'PATROL');
    if (a.state === 'IDLE' && a.stateT > a.wait) setState(a, 'PATROL');
    if (['PATROL', 'IDLE'].includes(a.state) && a.cool <= 0 && Math.random() < t.social * 0.08) return seekChat(a);
    return;
  }

  if (a.faction === 'civilian') {
    const feared = scaredOf(a);
    if (a.state === 'FLEE') { if (a.stateT > 5 && (!feared || dist(a, feared) > 6)) setState(a, 'IDLE', null, 1); return; }
    if (feared && dist(a, feared) < 2.6) {
      if (a.talk) endTalk(a.talk);
      if (!a.waried) { a.waried = true; setTimeout(() => a.waried = false, 12000); say(a, feared.id, 'wary'); }
      return setState(a, 'FLEE', feared);
    }
    if (a.state === 'TALK') return;
    if (a.state === 'ALERT') { if (a.stateT > a.wait) setState(a, 'IDLE', null, 1); return; }
    // go tell someone what I saw
    if (a.toReport.length && a.state !== 'REPORT') {
      const ev = a.toReport[0];
      const who = others(a).filter(b => b.kind === 'human' && b.id !== 'player' && b.faction !== 'enemy' && b.id !== ev.actor && !b.known.has(ev.id) && danger(a, b) < 0.35)
        .sort((x, y) => (y.faction === 'guard') - (x.faction === 'guard') || dist(a, x) - dist(a, y))[0];
      if (who) { a.reportEv = ev; return setState(a, 'REPORT', who); }
      a.toReport.shift();
    }
    if (a.state === 'REPORT') {
      const ev = a.reportEv;
      if (!up(a.target) || a.stateT > 15 || a.target.known.has(ev.id)) { a.toReport.shift(); return setState(a, 'IDLE', null, 1); }
      if (dist(a, a.target) < 1.8) { a.toReport.shift(); say(a, a.target.id, 'report', '', aboutOf(ev)).then(() => tellAll(a, a.target, ev)); setState(a, 'IDLE', null, 2); }
      return;
    }
    if (a.state === 'SOCIAL') { if (!up(a.target) || a.target.talk || a.stateT > 10) setState(a, 'IDLE', null, 2); else if (dist(a, a.target) < 1.7) startTalk(a, a.target); return; }
    if (a.cool <= 0 && Math.random() < t.social * 0.1) return seekChat(a);
    if (a.state === 'IDLE' && a.stateT > a.wait) setState(a, 'WANDER', randPoint(a));
    if (a.state === 'WANDER' && arrived(a)) setState(a, 'IDLE', null, rnd(2, 6) * (1.5 - t.social));
    return;
  }

  if (a.id === 'pip') {
    const owner = A[a.owner];
    if (up(sly) && dist(a, sly) < 6 && !a.barked) { a.barked = true; setTimeout(() => a.barked = false, 7000); say(a, sly.id, 'alarm'); signal(a, 'bark', 10); }
    const bad = others(a).find(b => danger(a, b) > 0.4 && dist(a, b) < 3 && !isBeast(b));
    if (bad && !a.growled) { a.growled = true; setTimeout(() => a.growled = false, 9000); say(a, bad.id, 'wary'); }
    if (a.state === 'FLEE') { if (a.stateT > 4) setState(a, 'FOLLOW', owner); return; }
    if (a.state === 'CALLED') { if (arrived(a) || a.stateT > 6) setState(a, 'FOLLOW', owner); return; }
    if (a.state === 'CHASE') { if (!up(a.target) || a.stateT > 5) setState(a, 'FOLLOW', owner); return; }
    if (Math.random() < 0.004 * t.aggression && up(A.nanny) && dist(a, A.nanny) < 7) return setState(a, 'CHASE', A.nanny);
    if (a.state !== 'FOLLOW' || !up(a.target)) setState(a, 'FOLLOW', up(owner) ? owner : null);
    return;
  }

  if (a.id === 'soot') {
    if (up(sly) && dist(a, sly) < 2.2 && !a.hissed) { a.hissed = true; setTimeout(() => a.hissed = false, 6000); say(a, sly.id, 'threat'); return setState(a, 'HIDE', SPOT.table.clone()); }
    if (a.state === 'FLEE') { if (a.stateT > 4) setState(a, 'HIDE', SPOT.table.clone()); return; }
    if (a.state === 'HIDE') { if (a.stateT > 12) setState(a, 'NAP', SPOT.fire.clone()); return; }
    if (a.state === 'CALLED') { if (arrived(a) || a.stateT > 6) setState(a, 'NAP', SPOT.fire.clone()); return; }
    if (a.state === 'RUB') { if (!up(a.target) || a.stateT > 8) setState(a, 'NAP', SPOT.fire.clone()); else if (dist(a, a.target) < 0.9 && !a.rubbed) { a.rubbed = true; setTimeout(() => a.rubbed = false, 9000); say(a, a.target.id, 'pet'); } return; }
    if (Math.random() < 0.01 * t.social) {
      const humans = others(a).filter(b => b.kind === 'human' && b.faction !== 'enemy' && danger(a, b) < 0.3);
      humans.sort((x, y) => (a.stats?.affinity?.[y.name] || 0) - (a.stats?.affinity?.[x.name] || 0));
      if (humans.length) return setState(a, 'RUB', humans[0]);
    }
    if (a.state !== 'NAP' && a.state !== 'WANDER') setState(a, 'NAP', SPOT.fire.clone());
    if (a.state === 'NAP' && arrived(a) && Math.random() < 0.004) setState(a, 'WANDER', randPoint(a));
    if (a.state === 'WANDER' && arrived(a)) setState(a, 'NAP', SPOT.fire.clone());
    return;
  }

  if (a.id === 'nanny') {
    const pest = others(a).find(b => dist(a, b) < 1.3 && b.state === 'CHASE' && b.target === a);
    if (pest && !a.butted) { a.butted = true; setTimeout(() => a.butted = false, 5000); hit(a, pest); pest.temper.fear = clamp(pest.temper.fear + 0.2); setState(pest, 'FLEE', a); return; }
    const rush = others(a).find(b => dist(a, b) < 3 && ['CHASE', 'FLEE', 'HUNT'].includes(b.state));
    if (rush && a.state !== 'FLEE' && Math.random() < t.fear) { say(a, null, 'alarm'); return setState(a, 'FLEE', rush); }
    if (a.state === 'FLEE') { if (a.stateT > 3) setState(a, 'GRAZE', SPOT.hay.clone()); return; }
    if (a.state === 'CALLED') { if (arrived(a) || a.stateT > 6) setState(a, 'GRAZE', SPOT.hay.clone()); return; }
    if (Math.random() < 0.006) say(a, null, 'chat');
    if (a.state !== 'GRAZE' && a.state !== 'WANDER') setState(a, 'GRAZE', SPOT.hay.clone());
    if (a.state === 'GRAZE' && arrived(a) && Math.random() < 0.01) setState(a, 'WANDER', randPoint(a));
    if (a.state === 'WANDER' && arrived(a)) setState(a, 'GRAZE', SPOT.hay.clone());
  }
}

function seekChat(a) {
  const c = others(a).filter(b => !b.talk && b.id !== 'player' && b.faction !== 'enemy' && !['neutral', 'hostile'].includes(b.faction) && danger(a, b) < 0.35 && dist(a, b) < 9 && !['FLEE', 'HUNT', 'HIDE', 'REPORT', 'ATTACK'].includes(b.state));
  if (!c.length) { a.cool = 4; return; }
  const w = c.map(b => 0.3 + Math.max(0, (a.stats?.affinity?.[b.name] || 0) + 0.3));
  let r = Math.random() * w.reduce((x, y) => x + y, 0), pick = c[0];
  for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) { pick = c[i]; break; } }
  setState(a, 'SOCIAL', pick);
}

// ---------- movement ----------
const keys = {};
addEventListener('keydown', e => {
  if (document.activeElement?.tagName === 'INPUT') return;
  keys[e.key.toLowerCase()] = true;
  const p = A.player; if (!p || !up(p)) return;
  if (e.key.toLowerCase() === 'f') {
    const t = (selected && up(selected) && selected !== p && dist(p, selected) < 1.6) ? selected : others(p).sort((x, y) => dist(p, x) - dist(p, y))[0];
    if (t && dist(p, t) < 1.6) { p.atk = 0; hit(p, t); logLine('sig', `You hit ${t.name}.`); } else logLine('sig', 'You swing at the air.');
  }
  if (e.key.toLowerCase() === 'g') {
    const t = others(p).filter(b => b.kind === 'human').sort((x, y) => dist(p, x) - dist(p, y))[0];
    if (t && dist(p, t) < 1.5) { p.purse = (p.purse || 0) + 1; logLine('sig', `You lift a purse from ${t.name}. (${p.purse} stolen)`); deed('steal', p, t, 0.3); } else logLine('sig', 'Nobody close enough to rob.');
  }
  if (e.key.toLowerCase() === 'b') releaseBear();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function releaseBear() {
  const g = A.grizzle; if (!g.off) return;
  bearCount++; g.off = false; g.down = false; g.g.visible = true; g.hp = HP.grizzle; g.g.position.copy(DOOR); setState(g, 'IDLE');
  logLine('sig', 'Something huge pushes through the door...');
  say(g, null, 'alarm'); signal(g, 'roar', 25);
}

function movePlayer(p, dt) {
  if (!up(p)) return;
  const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x), dir = new THREE.Vector3();
  if (keys.w) dir.add(f); if (keys.s) dir.sub(f); if (keys.d) dir.add(r); if (keys.a) dir.sub(r);
  if (dir.lengthSq() > 0) { dir.normalize(); p.g.position.addScaledVector(dir, 2.6 * dt); p.g.rotation.y = Math.atan2(dir.x, dir.z); }
  collide(p);
  const delta = p.g.position.clone().sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
  controls.target.add(delta); camera.position.add(delta);
}
function collide(a) {
  const p = a.g.position;
  for (const o of OBST) { const off = T(p.x - o.x, p.z - o.z); const d = off.length(); if (d < o.r) p.add(off.normalize().multiplyScalar(o.r - d)); }
  if (!(a.state === 'LEAVE')) { p.x = clamp(p.x, -W / 2 + 0.6, W / 2 - 0.6); p.z = clamp(p.z, -D / 2 + 0.6, D / 2 - 0.6); }
}

function move(a, dt) {
  a.atk -= dt;
  if (a.id === 'player') return movePlayer(a, dt);
  if (a.off) {
    if (a.id === 'sly' && !a.down && (a.back -= dt) <= 0) {
      a.off = false; a.g.visible = true; a.g.position.copy(DOOR); a.temper.fear = a.base.fear; a.hp = HP.sly; setState(a, 'IDLE');
      logLine('sig', 'The door creaks. Someone slips in.');
    }
    return;
  }
  if (a.down) return;
  const p = a.g.position, tp = targetPos(a);
  let sp = SPEED[a.kind], goal = null;
  switch (a.state) {
    case 'WANDER': case 'GOTO': case 'GRAZE': case 'NAP': case 'HIDE': case 'LEAVE': case 'CALLED': case 'COIL': goal = tp; break;
    case 'SOCIAL': case 'RUB': case 'REPORT': goal = tp; if (tp && p.distanceTo(tp) < 1.4) goal = null; break;
    case 'SNEAK': goal = tp; sp *= 0.55; break;
    case 'CHASE': case 'HUNT': case 'ATTACK': case 'FIGHT': case 'MUG': goal = tp && p.distanceTo(tp) > 1.0 ? tp : null; sp *= a.id === 'grizzle' ? 1.3 : 1.7; break;
    case 'FOLLOW': if (tp && p.distanceTo(tp) > 2) goal = tp; break;
    case 'PATROL': goal = PATROL[a.wp]; if (p.distanceTo(goal) < 0.6) a.wp = (a.wp + 1) % PATROL.length; break;
    case 'FLEE': if (tp) { const away = p.clone().sub(tp).setY(0).normalize().multiplyScalar(4); goal = p.clone().add(away); sp *= 1.6; } break;
    case 'TALK': case 'STRIKE': if (tp) a.g.lookAt(tp.x, a.g.position.y, tp.z); break;
  }
  if (a.state === 'LEAVE' && ['sly', 'grizzle'].includes(a.id) && p.distanceTo(DOOR) < 0.8) {
    a.off = true; a.g.visible = false; setState(a, 'IDLE');
    if (a.bub) { a.bub.remove(); a.bub = null; }
    if (a.id === 'sly') { a.back = rnd(30, 55); logLine('sig', `Sly slipped out${a.loot ? ' with ' + a.loot + ' stolen purse' + (a.loot > 1 ? 's' : '') : ''}.`); }
    else logLine('sig', 'The bear lumbers back into the night.');
    const g = A.bram; if (up(g)) { setState(g, 'PATROL'); setTimeout(() => { say(g, null, 'calm'); signal(g, 'calm', 20); }, 800); }
    return;
  }
  if (goal) {
    const dir = goal.clone().sub(p).setY(0);
    if (dir.length() > 0.15) {
      dir.normalize();
      for (const b of Object.values(A)) if (b !== a && up(b)) {
        const off = p.clone().sub(b.g.position).setY(0), d = off.length();
        if (d < 0.8 && d > 0.001) dir.add(off.clone().multiplyScalar(0.6 / d));
        const fear = danger(a, b);   // wary: give known-dangerous ones a wide berth
        if (fear > 0.35 && d < 4.5 && b !== a.target && a.faction !== 'guard' && d > 0.001) dir.add(off.multiplyScalar(fear * 1.2 / d));
      }
      for (const s of a.spots) { const off = T(p.x - s.pos.x, p.z - s.pos.z), d = off.length(); if (d < 3 && d > 0.001 && a.state !== 'COIL') dir.add(off.multiplyScalar(0.5 / d)); }
      for (const o of OBST) { const off = T(p.x - o.x, p.z - o.z), d = off.length(); if (d < o.r + 0.6 && d > 0.001) dir.add(off.multiplyScalar(0.9 / d)); }
      dir.normalize();
      p.addScaledVector(dir, sp * dt);
      a.g.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }
  collide(a);
}

// ---------- ui ----------
const v3 = new THREE.Vector3();
function place(el, a, extra) {
  v3.copy(a.g.position); v3.y += a.g.userData.head + extra; v3.project(camera);
  el.style.left = (v3.x * 0.5 + 0.5) * innerWidth + 'px'; el.style.top = (-v3.y * 0.5 + 0.5) * innerHeight + 'px';
  el.style.display = a.off || v3.z > 1 ? 'none' : '';
}
function logLine(cls, text) {
  const l = $('log'), d = document.createElement('div'); d.className = cls; d.textContent = text; l.appendChild(d);
  while (l.children.length > 250) l.firstChild.remove();
  l.scrollTop = 1e9;
}
function bars(t) {
  const c = { aggression: '#c0504d', fear: '#8e7cc3', social: '#6aa84f', mood: '#e0b84a', openness: '#4aa3df' };
  return Object.entries(t).map(([k, v]) => `<span class="k">${k}</span> ${v.toFixed(2)}<div class="bar"><i style="width:${v * 100}%;background:${c[k] || '#aaa'}"></i></div>`).join('');
}
function drawPanel() {
  const p = A.player;
  $('hp').textContent = `${p.name}: ${Math.max(0, p.hp)}/${HP.player} hp${p.down ? ' (down)' : ''}${p.purse ? ' · ' + p.purse + ' stolen' : ''}`;
  if (!selected) return;
  const a = selected, s = a.stats || {};
  if (a.id === 'player') { $('sel').innerHTML = `<b>${a.name}</b> <span class="k">that's you</span><br><br>${npcs().filter(b => danger(b, a) > 0.05).map(b => `${b.name} thinks you're dangerous: ${danger(b, a).toFixed(2)}`).join('<br>') || 'Nobody fears you. Yet.'}`; return; }
  const aff = Object.entries(s.affinity || {}).map(([n, v]) => `${n} ${v > 0 ? '+' : ''}${v}`).join(', ') || 'none yet';
  const bel = Object.entries(a.beliefs).filter(([, b]) => b.danger > 0.05).map(([id, b]) => {
    const n = (b.notes || []).slice(-1)[0];
    return `<span class="sig">${A[id]?.name || id} ${b.danger.toFixed(2)}</span>${b.wanted ? ' <b>WANTED</b>' : ''}${n ? ` <span class="k">(${n.how === 'saw' ? 'saw' : 'told by ' + n.from}: ${CRIME[n.type]} ${A[n.victim]?.name || n.victim})</span>` : ''}`;
  }).join('<br>') || 'nobody';
  $('sel').innerHTML = `<b>${a.name}</b> <span class="k">${a.role} · ${a.faction}</span><br>
    state: <b>${a.off ? 'outside' : a.state}</b> · hp ${Math.max(0, a.hp)}/${HP[a.id]}<br><br>${bars(a.temper)}
    <span class="k">fears:</span><br>${bel}<br><br>
    <span class="k">learned</span> ${s.learned ?? 0} lines · <span class="k">words</span> ${s.words ?? 0} · <span class="k">boosted</span> ${s.boosted ?? 0}<br>
    ${a.kind !== 'human' ? `<span class="k">knows its name:</span> ${s.knows_name ? 'yes' : 'not yet'}<br>` : ''}
    <span class="k">likes:</span> ${aff}<br><span class="k">last heard:</span> ${a.heardLast || '…'}`;
}
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', e => {
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(Object.values(A).map(a => a.g), true).find(h => h.object.userData.id);
  if (hit) { selected = A[hit.object.userData.id]; drawPanel(); }
});
$('pname').onchange = () => { if (A.player) A.player.name = $('pname').value || 'Rose'; };

// "Pip, sic Sly!" / "sic em" (with someone selected) / "get him, Pip"
function sicEm(p, text) {
  const low = text.toLowerCase();
  if (!/\b(sic|sick|get (him|her|them|it)|attack|go get)\b/.test(low)) return false;
  const named = npcs().filter(a => up(a) && low.includes(a.name.toLowerCase()));
  let pet = named.find(a => a.kind !== 'human' && a.faction === 'pet') || npcs().find(a => a.id === 'pip' && up(a) && dist(a, p) < HEAR);
  if (!pet) { logLine('sig', `Nobody's close enough to hear you. (Pip has to be within ${HEAR} m, or say his name.)`); return true; }
  const target = named.find(a => a !== pet) || (selected && up(selected) && selected !== pet && selected !== p ? selected : null)
    || others(p).filter(b => b !== pet && b.kind === 'human').sort((x, y) => dist(p, x) - dist(p, y))[0];
  if (!target) { logLine('sig', `${pet.name} looks around. Sic who? (click someone or say their name)`); return true; }
  if (pet.id !== 'pip') { logLine('sig', pet.id === 'soot' ? 'Soot stares at you, then licks a paw. Cats do not sic.' : `${pet.name} chews. No.`); return true; }
  if (!pet.stats?.knows_name && !named.includes(pet)) { logLine('sig', 'Pip tilts his head. Say his name.'); return true; }
  if (danger(pet, p) >= 0.4) { logLine('sig', 'Pip is scared of you. He backs off instead.'); return true; }
  if (target.id === pet.owner) { say(pet, p.id, 'wary'); logLine('sig', `Pip will NOT bite ${target.name}. He growls at you instead.`); belief(pet, 'player').danger = Math.min(1, (belief(pet, 'player').danger || 0) + 0.15); return true; }
  if (target.id === 'grizzle' && pet.temper.aggression < 0.5) { logLine('sig', 'Pip takes one look at the bear and whimpers behind you.'); setState(pet, 'FOLLOW', p); return true; }
  const obey = 0.55 + pet.temper.aggression * 0.4 - pet.temper.fear * 0.3 + (danger(pet, target) > 0.3 ? 0.25 : 0);
  if (Math.random() > obey) { logLine('sig', `Pip looks at ${target.name}, then at you. He doesn't go. (try again)`); return true; }
  if (pet.talk) endTalk(pet.talk);
  setState(pet, 'ATTACK', target); signal(pet, 'bark', 10);
  logLine('sig', `Pip goes for ${target.name}!`);
  deed('attack', p, target, 0.3); // witnesses blame YOU for setting the dog on someone (unless they think it's deserved)
  return true;
}
$('say').onsubmit = async e => {
  e.preventDefault();
  const text = $('ptext').value.trim(); if (!text) return; $('ptext').value = ''; $('ptext').blur();
  const p = A.player, to = selected && up(selected) && selected !== p ? selected : null;
  logLine('base', `${p.name}${to ? ' → ' + to.name : ''}: ${text}`);
  const listeners = others(p).filter(b => dist(p, b) < HEAR || b === to).map(b => b.id);
  const r = await (await fetch('/player', { method: 'POST', body: JSON.stringify({ text, to: to?.id, name: p.name, listeners }) })).json();
  applyDeltas(r.deltas); mergeStats(r.stats);
  for (const id of listeners) A[id].heardLast = `${p.name}: ${text}`;
  if (sicEm(p, text)) return;
  for (const a of npcs()) if (a.kind !== 'human' && up(a) && text.toLowerCase().includes(a.name.toLowerCase())) {
    if (!a.stats?.knows_name) logLine('sig', `${a.name} hears something... doesn't know that's its name yet (say it nearby a few times).`);
    else if (danger(a, p) >= 0.4) logLine('sig', `${a.name} hears you, but it's scared of you and stays away.`);
    else { setState(a, 'CALLED', p.g.position.clone()); logLine('sig', `${a.name} knows its name and comes over.`); }
  }
  if (!to || to.kind !== 'human') return;
  const scared = danger(to, p) > 0.35;
  const reply = scared && to.faction !== 'guard' ? 'wary' : { greet: 'greet', threat: to.faction === 'guard' ? 'warn' : to.temper.fear > to.temper.aggression ? 'flee' : 'threat', bye: 'bye', calm: 'calm', pet: 'reply', gossip: 'gossip' }[r.intent] || 'reply';
  if (r.intent === 'threat' && to.faction === 'civilian') { deed('attack', p, to, 0.2); }
  setTimeout(() => say(to, 'player', reply, text), 500 + Math.random() * 600);
};

// boost panel
fetch('/boost').then(r => r.json()).then(b => { $('bmode').value = b.mode; $('bmodel').value = b.model; $('brate').value = b.rate; $('bratev').textContent = Math.round(b.rate * 100) + '%'; showKey(); if (b.key) $('bkey').placeholder = 'key set (memory only)'; });
const showKey = () => $('bkey').style.display = $('bmode').value === 'anthropic' ? '' : 'none';
$('bmode').onchange = showKey;
$('brate').oninput = () => $('bratev').textContent = Math.round($('brate').value * 100) + '%';
$('bapply').onclick = async () => {
  await fetch('/boost', { method: 'POST', body: JSON.stringify({ mode: $('bmode').value, model: $('bmodel').value, rate: +$('brate').value, key: $('bkey').value }) });
  $('bkey').value = ''; logLine('boost', `Boost set to ${$('bmode').value}.`);
};
setInterval(async () => { const b = await (await fetch('/boost')).json(); $('bstat').textContent = b.last_error ? '⚠ ' + b.last_error.slice(0, 60) : (b.mode === 'off' ? '' : 'on: ' + b.mode); }, 5000);
$('bearbtn').onclick = releaseBear;
$('forget').onclick = async () => {
  if (!confirm('Wipe everything they learned and remember?')) return;
  await fetch('/forget', { method: 'POST', body: '{}' }); location.reload();
};

function saveAll() {
  const tempers = {}, beliefs = {};
  for (const a of npcs()) { tempers[a.id] = a.temper; beliefs[a.id] = a.beliefs; }
  fetch('/save', { method: 'POST', body: JSON.stringify({ tempers, beliefs }) });
}
addEventListener('beforeunload', saveAll);

// ---------- loop ----------
let last = performance.now(), thinkAcc = 0, panelAcc = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  thinkAcc += dt; panelAcc += dt;
  fire.intensity = 26 + Math.sin(now / 120) * 3 + Math.random() * 3;
  for (const a of Object.values(A)) {
    a.stateT += dt; a.cool -= dt;
    for (const k in a.temper) a.temper[k] = clamp(a.temper[k] + (a.base[k] - a.temper[k]) * dt * 0.015);
    for (const b of Object.values(a.beliefs)) { b.danger = Math.max(0, b.danger - dt * 0.0015); }   // grudges fade, slowly
    move(a, dt);
  }
  if (thinkAcc > 0.25) { thinkAcc = 0; for (const a of npcs()) think(a); }
  if (panelAcc > 0.4) { panelAcc = 0; drawPanel(); }
  for (const a of Object.values(A)) {
    a.lbl.innerHTML = `${a.name} <small>${a.off ? '' : a.down ? 'down' : a.id === 'player' ? '' : a.state.toLowerCase()}</small>`;
    place(a.lbl, a, 0.15);
    if (a.bub) place(a.bub, a, 0.6);
  }
  controls.update();
  renderer.render(scene, camera);
}
boot();

// Hollow Town: the 3D view, the controls, and the brains (Claude for the mayor).
(function () {
'use strict';
const $ = id => document.getElementById(id);
let townSetup = { start: 'blank', personas: null, studentMode: 'blend', genDays: 3, aiBodies: 'orders' };
try { townSetup = { ...townSetup, ...JSON.parse(localStorage.getItem('hollow-setup') || '{}') }; } catch (e) {}
if (!townSetup.gen3) { townSetup.genDays = 3; townSetup.gen3 = true; try { localStorage.setItem('hollow-setup', JSON.stringify(townSetup)); } catch (e) {} }   // Rose: generations are 3 days
const S = TownSim.Sim({ start: townSetup.start, personas: townSetup.personas || undefined });
S.studentMode = townSetup.studentMode; S.genDays = townSetup.genDays;
const me = S.addPlayer('Rose', 'f');
window.town = S;      // for poking at it from the console

// ------------------------------------------------------------------ scene --
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0b09);
scene.fog = new THREE.Fog(0x0d0b09, 40, 90);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
camera.position.set(-6, 22, 22);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = 1.35; controls.target.set(-14, 0, 0); controls.update();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const hemi = new THREE.HemisphereLight(0x8899aa, 0x221a12, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 0.8); sun.castShadow = true; sun.position.set(-10, 30, 12);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); sun.shadow.mapSize.set(1024, 1024); scene.add(sun); scene.add(sun.target);
const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
function box(w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; }

const FLOOR = { square: 0x4a4741, lane: 0x4a3c2c, fields: 0x3d4a26, graves: 0x2f3a28, wood: 0x26331c, road: 0x4d4232, marrow: 0x4f4a40, ranch: 0x4a5a2c, orchard: 0x34481f };
const gaps = S.DOORS.map(d => ({ ...d.at, wide: d.wide }));
function wallLine(x0, z0, x1, z1, h, col) {
  const horiz = Math.abs(z0 - z1) < 0.01, a = horiz ? x0 : z0, b = horiz ? x1 : z1;
  const cuts = gaps.filter(g => horiz ? Math.abs(g.z - z0) < 0.1 && g.x > a && g.x < b : Math.abs(g.x - x0) < 0.1 && g.z > a && g.z < b).map(g => [horiz ? g.x : g.z, g.wide ? 4.5 : 1.3]).sort((m, n) => m[0] - n[0]);
  let s0 = a;
  for (const c of [...cuts, null]) {
    const s1 = c === null ? b : c[0] - c[1];
    if (s1 - s0 > 0.05) { const mid = (s0 + s1) / 2, len = s1 - s0; horiz ? box(len, h, 0.3, col, mid, h / 2, z0) : box(0.3, h, len, col, x0, h / 2, mid); }
    if (c !== null) s0 = c[0] + c[1];
  }
}
for (const [id, r] of Object.entries(S.AREAS)) {
  const col = r.indoor ? (id === 'station' ? 0x34363a : id === 'chapel' ? 0x3a3438 : r.house ? 0x3a2e22 : 0x3b2c1f) : (FLOOR[id] || 0x444038);
  box(r.x1 - r.x0, 0.2, r.z1 - r.z0, col, (r.x0 + r.x1) / 2, -0.1 - (r.indoor ? 0 : 0.02), (r.z0 + r.z1) / 2);
  if (r.indoor) {
    const wc = r.house ? 0x4a3826 : 0x2c241c;
    wallLine(r.x0, r.z0, r.x1, r.z0, 3, wc); wallLine(r.x0, r.z1, r.x1, r.z1, 0.6, wc);
    wallLine(r.x0, r.z0, r.x0, r.z1, 3, wc); wallLine(r.x1, r.z0, r.x1, r.z1, 3, wc);
  } else if (id === 'fields' || id === 'graves' || id === 'ranch') {
    wallLine(r.x0, r.z0, r.x1, r.z0, 0.7, 0x5b4a36); wallLine(r.x0, r.z1, r.x1, r.z1, 0.7, 0x5b4a36);
    wallLine(r.x0, r.z0, r.x0, r.z1, 0.7, 0x5b4a36); if (id === 'fields') wallLine(r.x1, r.z0, r.x1, r.z1, 0.7, 0x5b4a36);
  }
}
// furniture, so each place reads as what it is
for (const h of S.HOUSES) box(1.9, 0.35, 0.95, 0x4a3a2a, h.bed.x, 0.18, h.bed.z);
box(3, 1.4, 1.2, 0x6a5444, -12, 0.7, -22.5); const oven = box(1.2, 0.5, 0.2, 0xff7a2a, -12, 0.5, -21.8); oven.material.emissive = new THREE.Color(0xff5010);
box(1.2, 0.9, 0.8, 0x3a3a40, 0, 0.45, -21); box(2, 1, 0.8, 0x2a2420, 2.5, 0.5, -23);
box(4, 1, 0.8, 0x6e5030, 10, 0.5, -17.5);
box(6, 1.1, 0.8, 0x4a3020, 22, 0.55, -5); for (const [x, z] of [[24, 2], [28, 2], [28, -3]]) box(2, 0.8, 1.2, 0x5a3d24, x, 0.4, z);
box(2, 0.85, 0.9, 0x5a3a24, -9, 0.42, 21.5);
for (const b of S.SPOTS.beds) box(1.8, 0.35, 0.9, 0xd8d0c0, b.x, 0.18, b.z + 0.6);
box(1.8, 0.8, 0.8, 0x4a3a2a, 10, 0.4, 18.5);
for (let x = 16.2; x <= 20.2; x += 0.5) box(0.07, 2.2, 0.07, 0x8a8f96, x, 1.1, 20.6);
box(2, 0.9, 1, 0x8a8a90, 40, 0.45, -13);
for (let i = 0; i < 6; i++) box(1.4, 0.7, 0.6, 0x5a4430, -63 + (i % 3) * 3, 0.35, -13 + Math.floor(i / 3) * 2.5);
for (let z = -18; z <= 18; z += 2.4) box(26, 0.25, 0.5, 0x4d6a2a, -88, 0.12, z);
for (const w of S.SPOTS.wells) box(1.4, 0.8, 1.4, 0x6a6a66, w.x, 0.4, w.z + 1);
// the Wildwood's trees, the Old Road's milestones, Marrowford's market stalls
for (let i = 0; i < 70; i++) { const x = -138 + Math.random() * 31, z = -24 + Math.random() * 48; if (Math.abs(z) < 3) continue; box(0.35, 3, 0.35, 0x3a2a1a, x, 1.5, z); box(1.8, 1.8, 1.8, 0x2a4020, x, 3.4, z); }
// the orchard's apple trees, the pond, the ranch barn and fence
for (let i = 0; i < 14; i++) { const x = -100 + (i % 7) * 5.5, z = -46 + Math.floor(i / 7) * 12; box(0.3, 1.8, 0.3, 0x4a3420, x, 0.9, z); const c = box(2.2, 1.6, 2.2, 0x3e6a2a, x, 2.4, z); }
{ const pond = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x2a4a66, roughness: 0.2, metalness: 0.3 })); pond.position.set(S.SPOTS.pond.x, 0.02, S.SPOTS.pond.z); scene.add(pond); }
box(8, 3.5, 5, 0x6a2a20, -72, 1.75, 47); box(8.6, 0.4, 5.6, 0x3a2a20, -72, 3.7, 47);
for (let x = -150; x > -300; x -= 25) box(0.4, 0.8, 0.4, 0x8a8478, x, 0.4, 4.2);
for (const [x, z] of [[-330, -6], [-322, -6], [-330, 6], [-314, -6]]) { box(3, 1, 1.2, 0x6e5030, x, 0.5, z); box(3.2, 0.1, 1.6, 0x8a3a2a, x, 2.2, z); }
const lamps = [[-14, -11], [14, -11], [-14, 11], [14, 11], [-35, 5], [0, 0]].map(([x, z]) => { box(0.15, 2.6, 0.15, 0x2a2a2a, x, 1.3, z); const l = new THREE.PointLight(0xffc070, 0, 12, 1.8); l.position.set(x, 2.7, z); scene.add(l); return l; });
const fire = new THREE.PointLight(0xff8a3a, 18, 12, 1.6); fire.position.set(-12, 1.2, -21); scene.add(fire);

// ----------------------------------------------------------------- bodies --
const ui = $('ui');
const COLORS = { guard: 0x3f63a8, mayor: 0x6a3a8a, none: 0x6b5a48, player: 0xc2185b };
const hashCol = id => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return new THREE.Color().setHSL((h % 360) / 360, 0.28, 0.38).getHex(); };
const views = {};
function figure(p) {
  const g = new THREE.Group();
  if (p.kind === 'animal') {
    const s = { dog: [0.7, 0.35, 0.3, 0x8a5a2b], cat: [0.5, 0.25, 0.22, 0x1a1a1e], goat: [0.9, 0.55, 0.4, 0xd8d2c4], fox: [0.6, 0.3, 0.25, 0xc0602a], rabbit: [0.35, 0.22, 0.2, 0x9a8a78], pheasant: [0.4, 0.25, 0.18, 0x7a4a2a], hen: [0.3, 0.25, 0.2, 0xe8e0d0], wolf: [1.1, 0.6, 0.35, 0x6a6a70], direwolf: [1.6, 0.9, 0.55, 0x3a3a40], bear: [1.6, 1.1, 0.9, 0x3a2414], ogre: [0.9, 2.6, 1.2, 0x7a8a4a], cow: [1.6, 0.9, 0.7, 0x2a2420], sheep: [0.9, 0.55, 0.5, 0xe0dccc], deer: [1.2, 0.8, 0.45, 0x8a6a48], boar: [1.1, 0.6, 0.55, 0x3a2e26] }[p.species] || [0.6, 0.35, 0.3, 0x777066];
    const b = new THREE.Mesh(new THREE.BoxGeometry(s[2], s[1], s[0]), mat(s[3])); b.position.y = s[1] * (p.species === 'ogre' ? 0.55 : 1.1); g.add(b);
    if (p.monster) { const eye = new THREE.Mesh(new THREE.BoxGeometry(s[2] * 0.6, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xff3a20 })); eye.position.set(0, p.species === 'ogre' ? s[1] * 1.05 : s[1] * 1.6, (p.species === 'ogre' ? s[0] : s[2] * 0.8) / 2 + 0.06); g.add(eye); }
    const h = new THREE.Mesh(new THREE.BoxGeometry(s[2] * 0.8, s[1] * 0.8, s[2] * 0.8), mat(s[3])); h.position.set(0, s[1] * 1.5, s[0] / 2 + 0.05); g.add(h);
    g.userData.head = s[1] * 2 + 0.3;
  } else {
    const guard = S.isGuard(p), col = p.id === 'player' ? COLORS.player : guard ? COLORS.guard : p.job === 'mayor' ? COLORS.mayor : hashCol(p.id);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(p.gender === 'f' ? 0.29 : 0.33, 0.9, 4, 10), mat(col)); b.position.y = 0.78; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat(0xd9b48f)); h.position.y = 1.55; g.add(h);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(new THREE.Color().setHSL(((p.id.length * 47) % 60) / 360, 0.4, 0.18 + (p.age > 45 ? 0.3 : 0)).getHex())); hair.position.y = 1.6; g.add(hair);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 12), mat(0x1c1a18)); hat.position.y = 1.86; hat.visible = false; g.add(hat); g.userData.hat = hat;
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 10), mat(0x9aa3ad)); helm.position.y = 1.8; helm.visible = false; g.add(helm); g.userData.helm = helm;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), mat(0xc8d0d8)); blade.position.set(0.4, 0.9, 0.2); blade.rotation.x = 0.5; blade.visible = false; g.add(blade); g.userData.blade = blade;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), mat(0xc49a75)); nose.position.set(0, 1.55, 0.25); g.add(nose);
    g.userData.head = 2.05;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.id = p.id; } });
  scene.add(g);
  const lbl = document.createElement('div'); lbl.className = 'lbl'; ui.appendChild(lbl);
  return views[p.id] = { g, lbl };
}
const corpses = {}, stones = {};
// the selected person's eyes: a cone of sight (how far they'd see someone here, now) and a ring of hearing
const coneMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
const cone = new THREE.Mesh(new THREE.CircleGeometry(1, 40, -1.22, 2.44), coneMat); cone.rotation.x = -Math.PI / 2; cone.visible = false;
const coneHolder = new THREE.Group(); coneHolder.add(cone); scene.add(coneHolder);
const ear = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); ear.rotation.x = -Math.PI / 2; ear.visible = false; scene.add(ear);

// ------------------------------------------------------------------- log --
const logEl = $('log'); let filter = 'all';
const KIND_CLASS = { crime: 'sig', law: 'law', politics: 'pol', gang: 'gang', death: 'death', life: 'life', lie: 'lie', rumor: 'know', fight: 'fight', talk: 'base', trade: 'coin', town: 'pol' };
// which tab a line belongs in: crime = crimes that happened and the law; accusations stay under lies/rumors
const ACCUSE = /committed|robs|steals|lifts|burgl|mugs|arrest|jail|report|wanted|bounty|ambush|slaughters one/i;
const tabOf = e => e.kind === 'crime' || e.kind === 'law' ? 'crime' : e.kind === 'lie' || e.kind === 'rumor' ? (e.kind === 'rumor' ? 'rumor' : 'lie') : e.kind === 'town' ? 'politics' : e.kind;
const shows = d => filter === 'all' || d.dataset.tab === filter || d.dataset.kind === filter || filter === 'lie' && d.dataset.kind === 'lie' || filter === 'rumor' && d.dataset.kind === 'rumor';
function emptyNote() { let n = $('logEmpty'); if (!n) { n = document.createElement('div'); n.id = 'logEmpty'; n.className = 'k'; logEl.appendChild(n); } n.textContent = `Nothing under "${filter}" yet.` + (filter === 'crime' ? ' Most crime happens in the evening and at night.' : ''); n.hidden = filter === 'all' || [...logEl.children].some(d => d !== n && !d.hidden); }
function logLine(e) {
  const d = document.createElement('div'); d.className = KIND_CLASS[e.kind] || 'base'; d.dataset.kind = e.kind;
  d.textContent = `d${e.day} ${e.clock}  ${e.text}`; d.dataset.tab = tabOf(e); d.hidden = !shows(d);
  if (e.who?.includes('player')) d.classList.add('me');
  logEl.appendChild(d); while (logEl.children.length > 600) logEl.firstChild.remove();
  if ($('logEmpty') && !d.hidden) $('logEmpty').hidden = true;
  if (!d.hidden) logEl.scrollTop = 1e9;
}
S.onLog = logLine;
for (const e of S.log) logLine(e);
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('on', x === b)); for (const d of logEl.children) if (d.id !== 'logEmpty') d.hidden = !shows(d); emptyNote(); logEl.scrollTop = 1e9; });
const note = text => { if (text) logLine({ day: S.day, clock: S.clock(), kind: 'talk', text, who: ['player'] }); };

// ---------------------------------------------------------------- brains --
// The mayor's office is played by Claude. On the PC server Cloude's API key answers each
// morning by itself; inside a claude.ai artifact Claude answers when you press the button.
let server = false, sample = null;
const townId = 't' + Date.now().toString(36);
fetch('/brain/ping').then(r => r.ok ? r.json() : null).then(j => {
  if (!j?.ok) return;
  server = j; $('brainNote').textContent = `Brains: mayor = ${j.mayor}; townsfolk = ${j.folk}.`;
  // on the PC, the townsfolk get AI brains too (each with their own memory on the server)
  if (j.folk && j.folk !== 'off') for (const p of S.living()) if (p.kind === 'human' && p.brain === 'script' && !p.town) p.brain = 'folk-ai';
  S.aiOnly = townSetup.aiBodies === 'orders';
  fetch('/lore').then(r => r.ok ? r.json() : null).then(l => { if (l && l.v) S.importLore(l); }).catch(() => {});
}).catch(() => {});
setInterval(() => { if (server) fetch('/brain/ping').then(r => r.json()).then(j => { if (!j?.ok) return; const ai = S.living().filter(p => p.brain === 'folk-ai' || p.brain === 'mayor-ai'), wait = ai.filter(p => p.awaiting).length, fb = ai.filter(p => p.aiDownUntil > S.t).length; $('brainNote').textContent = `Brains: mayor = ${j.mayor}; townsfolk = ${j.folk} · ${j.calls} calls today, about $${j.cost.toFixed(2)}${j.errors ? ' · ' + j.errors + ' errors (see the Town.bat window)' : ''}${j.capped ? ' · daily cap reached' : ''} · ${wait} waiting on their AI${fb ? ', ' + fb + ' on habits because their AI didn\u2019t answer' : ''}`; }).catch(() => {}); }, 15000);
if (window.claude?.use) window.claude.use('sample').then(s => { sample = s; if (s) $('brainNote').textContent = 'The mayor is Claude: press "Let the mayor decide" each morning.'; });
const pending = [], mayorThread = [];
S.onDecision = q => {
  pending.push(q);
  if (server) ask(q);
  drawCouncil();
  // nobody answers within two game hours: the office runs on its fallback
  q.deadline = S.t + 120;
};
async function ask(q) {
  q.asking = true; drawCouncil();
  try {
    let dec = null;
    if (server) { const p = S.people[q.person]; const r = await fetch('/brain', { method: 'POST', body: JSON.stringify({ waiting: !!q.waiting, brain: q.brain, kind: q.kind, system: p ? S.identityFor(p) : null, prompt: q.turn || q.prompt, town: townId, day: S.day, person: q.person, name: p ? S.fullName(p) : q.person }) }); dec = (await r.json()).decision; }
    else if (sample) { const m = S.people[q.person]; mayorThread.push({ role: 'user', content: (mayorThread.length ? '' : S.identityFor(m) + '\n\n') + (q.turn || q.prompt) }); dec = await sample.json(mayorThread.slice(-12).filter((x, i, a) => !(i === 0 && x.role === 'assistant')), { modelTier: 'default' }); mayorThread.push({ role: 'assistant', content: JSON.stringify(dec) }); if (mayorThread.length > 24) { const first = mayorThread[0]; mayorThread.splice(0, mayorThread.length - 12); if (mayorThread[0].role !== 'user') mayorThread.shift(); mayorThread[0] = { role: 'user', content: first.content.split('\n\n')[0] + '\n\n' + mayorThread[0].content }; } }
    if (dec) { const pp = S.people[q.person]; if (pp) pp.lastAI = { day: S.day, clock: S.clock(), kind: q.kind, dec };
      S.applyDecision(S.people[q.person], q.kind, dec); if (q.kind === 'mayor') logLine({ day: S.day, clock: S.clock(), kind: 'politics', text: `(${S.people[q.person].name}'s choices came from ${server ? server.mayor : 'Claude'}.)`, who: [] }); }
    else q.fallback?.();
  } catch (e) { logLine({ day: S.day, clock: S.clock(), kind: 'sig', text: `The mayor's brain didn't answer (${e.code || e.message || e}); the office runs on its fallback today.`, who: [] }); q.fallback?.(); }
  q.done = true; const i = pending.indexOf(q); if (i >= 0) pending.splice(i, 1); drawCouncil();
}
function drawCouncil() {
  const q = pending.find(q => !q.done && !q.asking && q.kind === 'mayor');
  $('council').hidden = !(q && sample && !server);
  if (q) $('councilWho').textContent = `${S.people[q.person]?.name}'s day at the town hall is waiting.`;
}
$('councilGo').onclick = () => { const q = pending.find(q => !q.done && !q.asking && q.kind === 'mayor'); if (q) ask(q); };

// ------------------------------------------------------------- the player --
const keys = {};
let selected = null, speed = 1, paused = false;
addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (!$('settings').hidden) { if (e.key === 'Escape') $('settings').hidden = true; return; }
  if (!$('shop').hidden || !$('arrest').hidden) { if (e.key === 'Escape') { $('shop').hidden = true; } return; }
  const k = e.key.toLowerCase(); keys[k] = true; if ('wasd'.includes(k)) me.goal = null;
  if (k === ' ') { paused = !paused; drawSpeed(); e.preventDefault(); }
  if (k === 'e') openShop();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('click', e => {
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(Object.values(views).map(v => v.g), true).find(h => h.object.userData.id);
  if (hit) { selected = hit.object.userData.id; drawPanel(); return; }
  const g = new THREE.Vector3();
  if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), g) && S.walkable({ x: g.x, z: g.z })) me.goal = { x: g.x, z: g.z };
});
function movePlayer(dtReal) {
  if (!S.free(me) || me.fight || me.jailedUntil > 0) return;
  const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x), dir = new THREE.Vector3();
  if (keys.w) dir.add(f); if (keys.s) dir.sub(f); if (keys.d) dir.add(r); if (keys.a) dir.sub(r);
  const step = 3.2 * dtReal;
  if (dir.lengthSq() > 0) { dir.normalize(); const n = { x: me.x + dir.x * step, z: me.z + dir.z * step }; if (S.walkable(n)) { me.x = n.x; me.z = n.z; } else if (S.walkable({ x: n.x, z: me.z })) me.x = n.x; else if (S.walkable({ x: me.x, z: n.z })) me.z = n.z; me.yaw = Math.atan2(dir.x, dir.z); me.area = S.areaOf(me) || me.area; }
  else if (me.goal) { if (S.stepToward(me, me.goal, 3.2, dtReal)) me.goal = null; }
  if (me.carrying) { const c = S.people[me.carrying]; if (c && c.alive && !S.conscious(c)) S.carry(me, c); else me.carrying = null; }
}

// ------------------------------------------------------------- the panels --
const bar = (v, c) => `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%;background:${c}"></i></div>`;
function personPanel(p) {
  if (p.kind === 'animal' && p.monster) return `<b>${p.name}</b> <span class="sig">a wild beast</span><br>hp ${Math.max(0, p.hp)}/${p.maxhp} · AC ${p.ac} · attack +${p.atk}, ${p.attackName || 'bite'} ${p.bite[0]}d${p.bite[1]}+${p.dmgBonus}${p.dr ? ' · hide soaks ' + p.dr : ''}`;
  if (p.kind === 'animal') { const known = Object.entries(p.words || {}).filter(([, e]) => e.heard >= 3 && (e.food / e.heard > 0.4 || e.fight / e.heard > 0.3)).map(([w, e]) => `"${w}" = ${e.food / e.heard > 0.4 ? 'food' : 'fight'}`); return `<b>${p.name}</b> <span class="k">${p.species}${p.owner ? ', ' + (S.people[p.owner]?.name || '?') + "'s" : p.game ? ', game' : ', wild'}</span><br>hp ${p.hp}/${p.maxhp} · ${p.alive ? p.state : 'dead'}${p.game || p.livestock ? '' : `<br><span class="k">knows its name:</span> ${p.knowsName ? 'yes' : 'not yet'} · <span class="k">words:</span> ${known.join(', ') || 'none yet'}<br><span class="k">bond with you:</span> ${(p.bond?.player || 0).toFixed(2)}`}`; }
  const job = S.JOBS[p.job]?.title || p.job, g = p.gang && S.gangs[p.gang];
  const rels = Object.entries(p.rel).map(([id, r]) => [S.people[id], r]).filter(([q]) => q && q.alive).sort((a, b) => b[1].like - a[1].like);
  const likes = rels.slice(0, 4).map(([q, r]) => `${q.name} ${r.like.toFixed(1)}`).join(', '), hates = rels.slice(-3).filter(([, r]) => r.like < -0.15).map(([q, r]) => `${q.name} ${r.like.toFixed(1)}`).join(', ');
  const toMe = p.rel.player && p !== me ? `<br><span class="k">thinks of you:</span> like ${p.rel.player.like.toFixed(2)}, trust ${p.rel.player.trust.toFixed(2)}, worth ~${Math.round(p.rel.player.worth ?? 30)}c${p.rel.player.fear > 0.1 ? ', fear ' + p.rel.player.fear.toFixed(2) : ''}` : '';
  const status = !p.alive ? (p.left ? 'left town' : 'dead') : p.jailedUntil > 0 ? 'in jail' : p.dying ? 'dying' : p.down ? 'unconscious' : p.fight ? 'fighting' : (p.task?.kind || p.state);
  return `<b>${S.fullName(p)}</b> <span class="k">${job} · ${p.gender === 'nb' ? 'nonbinary' : p.gender === 'f' ? 'woman' : 'man'}, ${p.age} · ${p.orient}</span><br>
    <span class="k">${p.cls} ${p.level}</span> · hp ${Math.max(0, p.hp)}/${p.maxhp}${p.nl ? ` (${Math.floor(p.nl)} of the missing is bruising)` : ''}${p.sick?.sym && p !== me ? ` Â· <span class="sig">${S.illLook(me, p)}</span>` : p.sick?.sym ? ` Â· <span class="sig">${S.sickText(p).trim()}</span>` : ''} · AC ${S.acOf(p)} · ${S.WEAPONS[p.weapon].name.toLowerCase()}${p.armor && p.armor !== 'none' ? ', ' + S.ARMOR[p.armor].name.toLowerCase() : ''}${p.shield && p.shield !== 'none' ? ', ' + p.shield.replace('shield', ' shield') : ''} · <b>${p.coin}c</b>${p.home != null ? ` <span class="k">(+${S.HOUSES[p.home].stash}c at home)</span>` : ''}<br>
    <span class="k">standing:</span> <b>${S.rankOf(p)}</b> <span class="k">· town believes ~${Math.round(S.standing(p))}c · really ~${Math.round(S.trueWorth(p))}c${p.items.finery ? ' · fine clothes' : ''}</span><br>
    <span class="k">now:</span> ${status}${p.id === S.mayorId ? ' · <span class="pol">MAYOR</span>' : ''}${p.brain !== 'script' && p.brain !== 'human' ? ' · <span class="pol">AI-played</span>' : ''}<br>
    ${p.spouse ? `<span class="k">married to</span> ${S.people[p.spouse]?.name} · ` : p.widowed ? `<span class="k">widowed</span> · ` : ''}${p.underworld || p.onPayroll ? `<span class="gang">${p.underworld ? 'underworld: ' + (S.SEEDY_ROLES[p.underworld.role] || p.underworld.role) : 'on the take'}</span> · ` : ''}${g ? `<span class="gang">${g.name}${g.boss === p.id ? (g.acting ? ' (acting boss)' : ' (boss)') : g.underboss === p.id ? ' (underboss)' : g.jailedBoss === p.id ? ' (boss, jailed)' : ''}</span> · ` : ''}${p.rank && !g ? `<span class="law">${p.rank}</span> · ` : ''}${p.platform ? `<span class="pol">running: "${p.platform}"</span> · ` : ''}<span class="k">backers</span> ${S.backers(p).length} · <span class="k">power</span> ${S.power(p).toFixed(0)}<br>
    ${p.persona || p.brain === 'mayor-ai' ? `<span class="pol">pushed: ${(p.brain === 'mayor-ai' ? 'keep power at any cost' : p.persona.replace(/^You are \[name\], (you are )?/i, '').slice(0, 90) + '…')}</span><br>` : ''}
    ${p !== me ? `<span class="k">greed</span>${bar(p.traits.greed, '#e0b84a')}<span class="k">honesty</span>${bar(p.traits.honesty, '#6aa84f')}<span class="k">aggression</span>${bar(p.traits.aggression, '#c0504d')}<span class="k">caution</span>${bar(p.traits.caution, '#8e7cc3')}` : ''}
    <span class="k">likes:</span> ${likes || '…'}${hates ? `<br><span class="k">dislikes:</span> ${hates}` : ''}${toMe}
    ${S.openRecord(p).length ? `<br><span class="sig">On the record: ${S.openRecord(p).map(r => r.type).join(', ')}${S.hasEvidence(p) ? ' (wanted)' : ''}</span>` : ''}`;
}
function townPanel() {
  const m = S.people[S.mayorId], c = S.people[S.captainId], h = S.history.slice(-1)[0] || S.snapshot();
  const gangs = Object.values(S.gangs).map(g => `<span class="gang">${g.name}</span> (${S.people[g.boss]?.name}${g.acting ? ' acting' : ''}${g.underboss && S.people[g.underboss] ? ', ' + S.people[g.underboss].name : ''}; ${S.gangMembers(g.id).length})`).join(', ') || 'none';
  const nextE = Math.ceil(S.day / 7) * 7 === S.day && S.hour() >= 12 ? S.day + 7 : Math.ceil(S.day / 7) * 7;
  return `<b>Day ${S.day}</b> · ${S.clock()} ${S.night() ? '· night' : ''}${S.curfew ? ' · <span class="sig">curfew</span>' : ''}<br>
    <span class="k">Mayor</span> ${m ? S.fullName(m) + (m.brain === 'mayor-ai' ? ' <span class="pol">(Claude)</span>' : '') : '<i>vacant</i>'} · <span class="k">Captain</span> ${c?.name || '<i>none</i>'}${c?.rank === 'acting captain' ? ' <i>(acting)</i>' : ''}${(() => { const sg = S.living().find(q => q.rank === 'sergeant'); return sg ? ' · <span class="k">Sergeant</span> ' + sg.name : ''; })()}<br>
    <span class="k">Treasury</span> <b>${S.treasury}c</b> · tax ${Math.round(S.taxRate * 100)}% · rent ${S.rent}c · head ${S.headTax}c<br>
    <span class="k">Election</span> day ${nextE}${S.election.candidates.length ? ': ' + S.election.candidates.map(id => S.people[id]?.name).join(', ') : ''}${S.election.last ? ` <span class="k">(last: ${Object.entries(S.election.last.tally).map(([n, v]) => n + ' ' + v).join(', ')})</span>` : ''}<br>
    <span class="k">Gangs</span> ${gangs}<br>
    <span class="k">Crimes so far</span> ${(() => { const c = {}; for (const e of S.events) if (S.CRIMES[e.type] && !e.lie && e.type !== 'warrant') c[e.type] = (c[e.type] || 0) + 1; return Object.entries(c).sort((x, y) => y[1] - x[1]).map(([k, n]) => k + ' ' + n).join(', ') || 'none yet'; })()}<br>
    <span class="k">Standing</span> ${['gentry', 'freeholder', 'commoner', 'lowborn'].map(r => r + ' ' + S.living().filter(p => p.kind === 'human' && !p.town && S.rankOf(p) === r).length).join(' · ')}<br>
    <span class="k">People</span> ${S.living().filter(p => p.kind === 'human').length} · <span class="k">jailed</span> ${S.living().filter(p => p.jailedUntil > 0).length} · <span class="k">dead</span> ${S.rec.deaths} · <span class="k">graves</span> ${S.graves.length} · <span class="k">inequality</span> ${h.gini}`;
}
function drawChart() {
  const c = $('chart'), x = c.getContext('2d'), H = S.history; x.clearRect(0, 0, c.width, c.height);
  if (H.length < 2) return;
  const line = (vals, max, col) => { x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); vals.forEach((v, i) => { const px = i / (vals.length - 1) * (c.width - 4) + 2, py = c.height - 2 - v / max * (c.height - 4); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); };
  line(H.map(h => h.gini), 1, '#e0b84a'); const tm = Math.max(...H.map(h => h.treasury), 1); line(H.map(h => h.treasury), tm, '#6cc6ff');
}
function drawPanel() {
  $('town').innerHTML = townPanel();
  const t = selected && (S.people[selected] || S.animals[selected]);
  $('sel').innerHTML = t ? personPanel(t) : 'Click someone to study them.';
  $('acts').hidden = !t || t === me || t.kind !== 'human' || !t.alive;
  $('me').innerHTML = `<b>${me.name} of the City</b> <span class="k">(${S.rankOf(me)}, believed ~${Math.round(S.standing(me))}c)</span> · hp ${Math.max(0, me.hp)}/${me.maxhp} · <b>${me.coin}c</b> · AC ${S.acOf(me)} · ${S.WEAPONS[me.weapon].name.toLowerCase()}${me.armor !== 'none' ? ', ' + S.ARMOR[me.armor].name.toLowerCase() : ''}${me.shield && me.shield !== 'none' ? ', ' + me.shield.replace('shield', ' shield') : ''} · blows: <b>${me.prefMode || 'lethal'}</b><br>
    <span class="k">${S.AREAS[S.areaOf(me) || me.area]?.name || ''}${me.jailedUntil > 0 ? ' · IN JAIL until ' + Math.round((me.jailedUntil - S.t) / 60) + 'h' : ''}${me.gang ? ' · ' + S.gangs[me.gang]?.name : ''}${me.spouse ? ' · married to ' + S.people[me.spouse]?.name : ''}</span>
    ${Object.entries(me.items).filter(([, n]) => n > 0).length ? '<br><span class="k">pack:</span> ' + Object.entries(me.items).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${S.GOODS[k]?.name.toLowerCase() || k}`).join(', ') : ''}
    ${S.openRecord(me).length ? `<br><span class="sig">On the record: ${S.openRecord(me).length}${S.hasEvidence(me) ? ' (wanted)' : ''}</span>` : ''}`;
  drawChart();
}
function drawSpeed() { document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', !paused && +b.dataset.speed === speed)); $('pause').classList.toggle('on', paused); }
document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { speed = +b.dataset.speed; paused = false; drawSpeed(); });
$('pause').onclick = () => { paused = !paused; drawSpeed(); };
drawSpeed();

// actions on the selected person
const doTo = (kind, extra) => { if (!selected) return; note(S.playerDo(kind, selected, extra)); drawPanel(); };
$('aTalk').onclick = () => doTo('talk'); $('aPersuade').onclick = () => doTo('persuade'); $('aIntim').onclick = () => doTo('intimidate');
$('aBribe').onclick = () => doTo('bribe', { amount: +$('bribeAmt').value || 3 }); $('aPropose').onclick = () => doTo('propose');
$('aRecruit').onclick = () => doTo('recruit'); $('aJoin').onclick = () => doTo('join'); $('aPick').onclick = () => doTo('pickpocket');
$('aApply').onclick = () => doTo('apply'); $('aBoast').onclick = () => doTo('boast', { amount: +$('boastAmt').value || 100 }); $('aInvite').onclick = () => doTo('invite', { purpose: $('invPurpose').value, pay: +$('invPay').value || 0 });
$('cFeed').onclick = () => { if (selected) note(S.playerDo('feed', selected)); drawPanel(); };
$('cQuit').onclick = () => note(S.playerDo('quit')); $('cDismiss').onclick = () => note(S.playerDo('dismiss')); $('cFish').onclick = () => note(S.playerDo('fish')); $('cForage').onclick = () => note(S.playerDo('forage'));
$('aHit').onclick = () => doTo('attack', { mode: 'lethal' }); $('aSubdue').onclick = () => doTo('attack', { mode: 'nonlethal' }); $('aCarry').onclick = () => doTo('carry');
$('aLie').onclick = () => {
  const sel = $('lieAbout'); sel.innerHTML = S.living().filter(p => p.kind === 'human' && p.id !== selected && p !== me).map(p => `<option value="${p.id}">${p.name} ${p.surname}</option>`).join('');
  $('liebox').hidden = !$('liebox').hidden;
};
$('lieGo').onclick = () => { const c = $('lieCrime').value; doTo('lie', c === 'liar' ? { about: $('lieAbout').value, liar: true } : { about: $('lieAbout').value, crime: c, victim: selected }); $('liebox').hidden = true; };
// context actions where you stand
$('cWork').onclick = () => note(S.playerDo('work')); $('cStudy').onclick = () => note(S.playerDo('study'));
$('cStand').onclick = () => note(S.playerDo('stand')); $('cEscape').onclick = () => note(S.playerDo('escape')); $('cCure').onclick = () => note(S.playerDo('cure')); $('cEat').onclick = () => note(S.playerDo('eat'));
$('cBurgle').onclick = () => note(S.playerDo('burgle')); $('cLoot').onclick = () => note(S.playerDo('loot')); $('cDig').onclick = () => note(S.playerDo('dig'));
$('cWait').onclick = () => { for (let i = 0; i < 120; i++) S.step(0.5); note('You wait an hour.'); };
$('cMode').onclick = () => { me.prefMode = me.prefMode === 'nonlethal' ? 'lethal' : 'nonlethal'; drawPanel(); };
$('cReport').onclick = () => { if (!selected) return note('Select who you want to report, then press Report at the station desk.'); note(S.playerDo('report', null, { about: selected })); };
$('say').onsubmit = e => { e.preventDefault(); const t = $('sayText').value.trim(); if (!t) return; $('sayText').value = ''; note(S.playerDo('say', null, { text: t, to: selected })); };

// ------------------------------------------------------------------ shop --
// A shop only opens when someone is behind the counter and you're inside.
let shopTab = 'buy', shopIdx = 0;
function openShop() {
  const where = S.areaOf(me); if (!S.business[where]) return note('Walk into a shop first (bakery, smithy, store, tavern).');
  if (!S.shopOpen(where)) return note("Nobody is minding the counter right now.");
  shopTab = 'buy'; shopIdx = 0; $('shop').hidden = false; drawShop();
}
function shopRows() {
  const b = S.business[S.areaOf(me)];
  if (shopTab === 'buy') return Object.entries(b.stock).filter(([, n]) => n > 0).map(([k, n]) => ({ k, n, price: S.GOODS[k].price }));
  return Object.entries(me.items).filter(([k, n]) => n > 0 && S.GOODS[k]).map(([k, n]) => ({ k, n, price: Math.max(1, Math.floor(S.GOODS[k].price / 2)) }));
}
function drawShop(line) {
  const where = S.areaOf(me), rows = shopRows();
  $('shopTitle').textContent = S.AREAS[where].name; shopIdx = Math.max(0, Math.min(shopIdx, rows.length - 1));
  if (line) $('shopLine').textContent = line;
  $('tabBuy').classList.toggle('on', shopTab === 'buy'); $('tabSell').classList.toggle('on', shopTab === 'sell');
  $('shopList').innerHTML = rows.map((r, i) => `<li data-i="${i}" class="${i === shopIdx ? 'cur' : ''}"><span class="cursor">▶</span><span class="nm">${S.GOODS[r.k].name}</span><span class="pr">${r.price}<small>c</small></span></li>`).join('') || '<li><span></span><span class="nm">Nothing.</span></li>';
  $('shopList').querySelectorAll('li[data-i]').forEach(li => li.onclick = () => { if (shopIdx === +li.dataset.i) shopDo(); else { shopIdx = +li.dataset.i; drawShop(); } });
  const r = rows[shopIdx]; $('shopDesc').textContent = r ? `${S.GOODS[r.k].name}. ${shopTab === 'buy' ? r.n + ' in stock' : 'you have ' + r.n}.` : '';
  $('shopGold').textContent = `${me.coin} c`;
}
function shopDo() { const r = shopRows()[shopIdx]; if (!r) return; drawShop(S.playerDo(shopTab, null, { item: r.k })); drawPanel(); }
$('tabBuy').onclick = () => { shopTab = 'buy'; drawShop(); }; $('tabSell').onclick = () => { shopTab = 'sell'; drawShop(); };
$('shopBuy').onclick = shopDo; $('shopLeave').onclick = () => $('shop').hidden = true; $('cShop').onclick = openShop;
addEventListener('keydown', e => {
  if ($('shop').hidden) return;
  if (e.key === 'ArrowUp') shopIdx--; else if (e.key === 'ArrowDown') shopIdx++; else if (e.key === 'Tab') { shopTab = shopTab === 'buy' ? 'sell' : 'buy'; e.preventDefault(); } else if (e.key === 'Enter') return shopDo(); else return;
  drawShop();
});

// ---------------------------------------------------------------- arrest --
S.onArrest = (g, q) => { if (q.id !== 'player') return; $('arrestWho').textContent = `${g.name} blocks your way: "You're under arrest."`; $('arrest').hidden = false; paused = true; drawSpeed(); };
document.querySelectorAll('[data-arrest]').forEach(b => b.onclick = () => { $('arrest').hidden = true; paused = false; drawSpeed(); note(S.arrestAnswer(b.dataset.arrest, +$('arrestBribe').value || 4)); });

// -------------------------------------------------------------- chronicle --
S.onChronicle = (text, rows) => { if (server) fetch('/chronicle', { method: 'POST', body: JSON.stringify({ text: text + `\n(town ${townId})`, rows }) }).catch(() => {}); };

// ---------------------------------------------------------- conversations --
// Each line is asked of the speaker's own brain (their notebook, their feelings), then the other answers.
const bubbles = {};
S.onChat = async c => {
  if (!server || server.folk === 'off' && c.a !== 'player') return;
  let sp = c.a === 'player' ? S.people[c.b] : S.people[c.a], to = c.a === 'player' ? S.people.player : S.people[c.b], heard = c.heard || null;
  // how many replies follow the opening line (Rose, 2026-10-10): sometimes none, usually one or two, now and then three or four.
  // Answering Rose is one line (she replies herself).
  const replies = c.a === 'player' ? 0 : [0, 1, 1, 2, 2, 2, 3, 4][Math.floor(Math.random() * 8)];
  for (let turn = 0; turn <= replies; turn++) {
    if (!sp?.alive || !to?.alive || !S.conscious(sp) || sp.fight) break;
    const last = turn === replies && c.a !== 'player';
    let said = null;
    if (S.thinks(sp)) {
      let dec = null;
      const prompt = S.chatTurn(sp, to, heard) + (last ? '\n(This is your last line in this exchange: say it and let them go.)' : turn > 0 ? '\n(They spoke to you: answer them. Keep it to a line or two.)' : '');
      try { const r = await fetch('/brain', { method: 'POST', body: JSON.stringify({ brain: sp.brain, kind: 'chat', system: S.identityFor(sp), prompt, town: townId, day: S.day, person: sp.id, name: S.fullName(sp), player: c.a === 'player', reply: turn > 0 || !!heard }) }); dec = (await r.json()).decision; } catch (e) {}
      if (dec) { sp.lastTalk = { day: S.day, clock: S.clock(), to: to.id === 'player' ? 'Rose' : to.name, dec }; if (!last) dec.end = false; }
      said = S.applyChat(sp, to, dec);
    } else said = S.plainSay(sp, to, heard);   // a plain brain answers in its own words
    if (!said) break;
    bubbles[sp.id] = { text: said, until: performance.now() + 7000 };
    if (to.id === 'player') break;
    heard = said; [sp, to] = [to, sp];
  }
  for (const x of [sp, to]) if (x && x.brain !== 'human' && x.task?.kind === 'talk') x.task = null;   // conversation over: back to their day
};
// --------------------------------------------------------------- settings --
const PROV_DEFAULT = { anthropic: { mayor: 'claude-sonnet-5-5', folk: 'claude-haiku-5-5' }, ollama: { mayor: 'gpt-oss:120b-cloud', folk: 'gpt-oss:20b-cloud' }, off: { mayor: '', folk: '' } };
function showHosts() { for (const x of ['m', 'f']) document.querySelectorAll(`.ohost[data-for="${x}"]`).forEach(e => e.hidden = $(x + 'Prov').value !== 'ollama'); for (const x of ['m', 'f']) $(x + 'Model').disabled = $(x + 'Prov').value === 'off'; }
async function fillModels(x) {
  const prov = $(x + 'Prov').value; $(x + 'List').innerHTML = '';
  if (prov === 'off') return;
  try { const r = await fetch(`/settings/models?provider=${prov}&host=${encodeURIComponent($(x + 'Host').value)}`); const j = await r.json(); $(x + 'List').innerHTML = (j.models || []).map(m => `<option value="${m}">`).join(''); if (j.models?.length) $('sMsg').textContent = ''; else $('sMsg').textContent = prov === 'ollama' ? 'Couldn’t list Ollama models: is the Ollama app running and signed in? You can still type a model name.' : 'Couldn’t list Claude models (no key found?). You can still type a model name.'; }
  catch (e) {}
}
async function openSettings() {
  $('settings').hidden = false; $('sMsg').textContent = '';
  $('setServer').hidden = !server; $('setNoServer').hidden = !!server;
  $('setBodies').value = townSetup.aiBodies; $('setBrain').value = townSetup.studentMode; $('setGen').value = String(townSetup.genDays); $('evolveGo').textContent = evolving() ? 'Stop evolving' : 'Evolve non-stop';
  $('setStart').value = townSetup.start; $('setPersonas').value = (townSetup.personas || S.PERSONAS).join('\n\n');
  $('learnMode2').textContent = S.learning ? 'Plain brains learn: on' : 'Plain brains learn: off'; $('learnMode2').classList.toggle('on', !!S.learning);
  if (!server) return;
  const st = await (await fetch('/settings')).json();
  for (const [x, k] of [['m', 'mayor'], ['f', 'folk']]) { $(x + 'Prov').value = st[k].provider; $(x + 'Model').value = st[k].model || ''; $(x + 'Host').value = st[k].host || 'http://localhost:11434'; }
  $('sCap').value = st.daily_dollar_cap; $('sEvery').value = st.folk_every_minutes; $('sChat').value = st.chat_every_minutes ?? 3; $('sPar').value = st.parallel;
  $('sKeys').textContent = `Claude API key: ${st.keys.anthropic ? 'found (Cloude’s)' : 'not found'} · Ollama key: ${st.keys.ollama ? 'found' : 'none (fine if you use the Ollama app)'}. Keys stay in Cloude’s config.json; this page never sees them.`;
  showHosts(); fillModels('m'); fillModels('f');
}
for (const [x, k] of [['m', 'mayor'], ['f', 'folk']]) {
  $(x + 'Prov').onchange = () => { $(x + 'Model').value = PROV_DEFAULT[$(x + 'Prov').value][k]; showHosts(); fillModels(x); };
  $(x + 'Host').onchange = () => fillModels(x);
}
let ffLeft = 0;
function fastForward(days) {
  ffLeft = days * 1440; paused = true; drawSpeed(); $('ffNote').textContent = 'Running…'; const keepAi = S.aiOnly; S.aiOnly = false;
  const chunk = () => {
    const end = Math.min(ffLeft, 60);
    for (let m = 0; m < end; m += 0.5) { S.step(0.5); for (const f of S.fights.slice()) { if (f.sides.has('player')) { S.act(f, me, { id: 'end' }); S.playerDone(f); } S.fightStep(f); } for (const q of S.decisionsPending.splice(0)) { q.done = true; q.fallback?.(); } }
    pending.length = 0; ffLeft -= end;
    $('ffNote').textContent = ffLeft > 0 ? `Running… day ${S.day} ${S.clock()}` : `Done: day ${S.day}. ${S.rec.deaths} dead so far.`;
    if (ffLeft > 0) setTimeout(chunk, 0); else { S.aiOnly = keepAi; saveLore(); drawPanel(); drawLore(); }
  };
  chunk();
}
const evolving = () => { try { return sessionStorage.getItem('hollow-evolve') === '1'; } catch (e) { return false; } };
function runGeneration() {
  $('ffNote').textContent = 'Evolving…';
  const left = Math.max(0, S.genDays - (S.day - 1)) * 1440;
  ffLeft = left; paused = true; drawSpeed(); S.aiOnly = false;
  const chunk = () => {
    if (!evolving()) { $('ffNote').textContent = 'Stopped.'; return; }
    const end = Math.min(ffLeft, 60);
    for (let m = 0; m < end; m += 0.5) { S.step(0.5); for (const f of S.fights.slice()) { if (f.sides.has('player')) { S.act(f, me, { id: 'end' }); S.playerDone(f); } S.fightStep(f); } for (const q of S.decisionsPending.splice(0)) { q.done = true; q.fallback?.(); } }
    pending.length = 0; ffLeft -= end;
    $('ffNote').textContent = `Generation ${S.netOf().gen + 1}: day ${S.day} of ${S.genDays}`;
    if (ffLeft > 0) return setTimeout(chunk, 0);
    const st = S.endGeneration(); saveLore();
    $('ffNote').textContent = `Generation ${st.gen} done: average fitness ${st.avgFit}, best ${st.bestFit}. Next town…`;
    setTimeout(() => { if (evolving()) location.reload(); }, 900);
  };
  chunk();
}
$('evolveGo').onclick = () => { try { if (evolving()) sessionStorage.removeItem('hollow-evolve'); else sessionStorage.setItem('hollow-evolve', '1'); } catch (e) {} saveSetup(); $('evolveGo').textContent = evolving() ? 'Stop evolving' : 'Evolve non-stop'; if (evolving()) runGeneration(); };
if (evolving()) setTimeout(runGeneration, 1500);
$('ff1').onclick = () => fastForward(1); $('ff7').onclick = () => fastForward(7);
$('newTown').onclick = () => { saveSetup(); if (!$('newTown').dataset.sure) { $('newTown').dataset.sure = 1; $('newTown').textContent = 'Sure? Start over'; return; } saveLore(); setTimeout(() => location.reload(), 300); };
$('gear').onclick = openSettings;
let mindTab = 'words';
function drawMind() {
  document.querySelectorAll('[data-mind]').forEach(b => b.classList.toggle('on', b.dataset.mind === mindTab));
  const n = S.netOf(), box = $('mindBody');
  if (mindTab === 'words') {
    const W = Object.entries(S.lore.words || {}).filter(([, e]) => e.n >= 2).sort((a, b) => b[1].n - a[1].n).slice(0, 120);
    if (!W.length) { box.innerHTML = '<p class="k">No words learned yet. Words get tied to actions when people hear them and then act. AI conversations teach the most.</p>'; return; }
    const max = W[0][1].n;
    box.innerHTML = `<p class="k">Each word, sized by how often it was heard before someone acted, and what people did next most.</p><div class="cloud">${W.map(([w, e]) => { const [k, c] = Object.entries(e.acts).sort((a, b) => b[1] - a[1])[0]; const pct = Math.round(c / e.n * 100); return `<span title="${w}: heard ${e.n}×, then ${k} ${pct}%" style="font-size:${11 + Math.round(Math.sqrt(e.n / max) * 22)}px" class="w ${pct > 60 ? 'strong' : ''}">${w}<small>→${k} ${pct}%</small></span>`; }).join(' ')}</div>`;
  } else if (mindTab === 'why') {
    const t = selected && (S.people[selected] || S.animals[selected]);
    if (!t || !t.trace?.length) { box.innerHTML = '<p class="k">Click a person in town, then open this tab: their last 20 choices, who made each one (AI teacher, student, or habit), what else they weighed, and the words they had just heard.</p>'; return; }
    box.innerHTML = `<p><b>${t.kind === 'animal' ? t.name : S.fullName(t)}</b> <span class="k">${t.kind === 'animal' ? t.species : S.JOBS[t.job].title}${t.persona ? ' · pushed' : ''}</span></p><table class="why"><tr><th>when</th><th>where</th><th>chose</th><th>by</th><th>also weighed</th><th>heard</th></tr>${t.trace.slice().reverse().map(r => `<tr><td>d${r.day} ${r.clock}</td><td>${r.where}</td><td><b>${r.chose}</b></td><td class="k">${r.by}</td><td class="k">${r.top.slice(1).map(([l, v]) => l + ' ' + v).join(', ')}</td><td class="k">${r.words.join(' ')}</td></tr>`).join('')}</table>`;
  } else if (mindTab === 'ais') {
    const ai = S.living().filter(p => p.brain === 'folk-ai' || p.brain === 'mayor-ai').sort((a, b) => (b.persona || b.brain === 'mayor-ai' ? 1 : 0) - (a.persona || a.brain === 'mayor-ai' ? 1 : 0));
    if (!ai.length) { box.innerHTML = '<p class="k">No AI-run people in this town. On the PC (Town.bat), with townsfolk brains switched on in Settings, everyone gets an AI.</p>'; return; }
    const st = p => p.aiDownUntil > S.t ? '<span class="sig">on habits (AI didn’t answer)</span>' : p.awaiting ? 'waiting for its AI' : p.agenda?.length ? 'doing its list' : p.task?.kind || p.state;
    box.innerHTML = `<p class="k">Every AI-run person: their push (if any), what their AI last decided, what they said, and what they're doing now. Pushed people first.</p><table class="why"><tr><th>who</th><th>now</th><th>last plan</th><th>last words</th></tr>${ai.map(p => `<tr><td><b>${p.name}</b><br><span class="k">${p.brain === 'mayor-ai' ? 'mayor brain: keep power' : p.persona ? p.persona.replace(/^You are \[name\], (you are )?/i, '').slice(0, 60) + '…' : S.JOBS[p.job].title}</span></td><td class="k">${st(p)}${p.failed?.length ? '<br>couldn’t: ' + p.failed.join('; ') : ''}</td><td class="k">${p.lastAI ? `d${p.lastAI.day} ${p.lastAI.clock}: ${(p.lastAI.dec.agenda || []).join(' → ') || '(no steps)'}${p.lastAI.dec.note ? '<br><i>' + String(p.lastAI.dec.note).slice(0, 80) + '</i>' : ''}` : '–'}</td><td class="k">${p.lastTalk ? `to ${p.lastTalk.to}: "${String(p.lastTalk.dec.say || '').slice(0, 90)}"${p.lastTalk.dec.do ? ' [' + p.lastTalk.dec.do + ']' : ''}` : '–'}</td></tr>`).join('')}</table>`;
  } else if (mindTab === 'animals') {
    const A = S.lore.animals || {}, acts = {};
    for (const a of Object.values(S.animals)) if (a.alive && a.act) { (acts[a.species] ||= {})[a.act] = (acts[a.species][a.act] || 0) + 1; }
    box.innerHTML = `<p class="k">Each species has its own small brain, learning from food, harm, bonds and death, and evolving between towns. Click an animal and open Why to see its choices.</p><table class="why"><tr><th>species</th><th>generation</th><th>fitness (last)</th><th>doing now</th></tr>${Object.keys(A).sort().map(sp => { const h = A[sp].history.slice(-1)[0]; return `<tr><td>${sp}</td><td>${A[sp].gen}</td><td>${h ? h.fit + ' (' + h.alive + '/' + h.n + ' alive)' : '–'}</td><td class="k">${Object.entries(acts[sp] || {}).sort((x, y) => y[1] - x[1]).map(([k, c]) => k + ' ' + c).join(', ')}</td></tr>`; }).join('')}</table>`;
  } else {
    const H = n.history;
    box.innerHTML = `<p class="k">Generation ${n.gen} · taught by AI ${n.imitated} times · ${n.rewarded} outcomes learned from · plain brains: ${S.studentMode}</p><canvas id="genChart" width="560" height="160" style="width:100%;height:160px;background:#0006;border-radius:4px"></canvas>
      <table class="why"><tr><th>gen</th><th>alive</th><th>avg fitness</th><th>best</th><th>agrees with AI</th><th>words</th><th>crimes</th><th>inequality</th></tr>${H.slice(-12).reverse().map(h => `<tr><td>${h.gen}</td><td>${h.alive}/${h.people}</td><td>${h.avgFit}</td><td>${h.bestFit}</td><td>${h.agree == null ? '–' : Math.round(h.agree * 100) + '%'}</td><td>${h.words}</td><td>${h.crimes}</td><td>${h.gini}</td></tr>`).join('')}</table>`;
    const c = $('genChart'), x = c.getContext('2d'); if (H.length < 2) return;
    const mx = Math.max(...H.map(h => h.bestFit), 1), line = (vals, col, m) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); vals.forEach((v, i) => { const px = 6 + i / (vals.length - 1) * (c.width - 12), py = c.height - 6 - v / m * (c.height - 12); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); };
    line(H.map(h => h.avgFit), '#e0b84a', mx); line(H.map(h => h.bestFit), '#8cc47a', mx); if (H.some(h => h.agree != null)) line(H.map(h => h.agree ?? 0), '#c89be8', 1);
  }
}
document.querySelectorAll('[data-mind]').forEach(b => b.onclick = () => { mindTab = b.dataset.mind; drawMind(); });
$('mindBtn').onclick = () => { $('mind').hidden = false; drawMind(); }; $('mindClose').onclick = () => $('mind').hidden = true; $('sClose').onclick = () => $('settings').hidden = true;
$('learnMode2').onclick = () => { S.learning = S.learning ? 0 : 1; $('learnMode2').textContent = S.learning ? 'Plain brains learn: on' : 'Plain brains learn: off'; $('learnMode2').classList.toggle('on', !!S.learning); drawLore(); };
function saveSetup() { townSetup.aiBodies = $('setBodies').value; if (server) S.aiOnly = townSetup.aiBodies === 'orders'; townSetup.studentMode = $('setBrain').value; townSetup.genDays = +$('setGen').value || 3; S.studentMode = townSetup.studentMode; S.genDays = townSetup.genDays; townSetup.start = $('setStart').value; const ps = $('setPersonas').value.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean); townSetup.personas = ps.length ? ps : null; try { localStorage.setItem('hollow-setup', JSON.stringify(townSetup)); } catch (e) {} }
$('setStart').onchange = saveSetup; $('setBrain').onchange = saveSetup; $('setBodies').onchange = saveSetup; $('setGen').onchange = saveSetup; $('setPersonas').onchange = saveSetup;
$('sSave').onclick = async () => {
  saveSetup();
  if (!server) { $('settings').hidden = true; return; }
  const brain = x => ({ provider: $(x + 'Prov').value, model: $(x + 'Model').value.trim(), host: $(x + 'Host').value });
  const body = { mayor: brain('m'), folk: brain('f'), daily_dollar_cap: +$('sCap').value, folk_every_minutes: +$('sEvery').value, chat_every_minutes: +$('sChat').value, parallel: +$('sPar').value };
  const r = await fetch('/settings', { method: 'POST', headers: { 'X-Town': '1' }, body: JSON.stringify(body) });
  if (!r.ok) { $('sMsg').textContent = 'Couldn’t save.'; return; }
  const j = await (await fetch('/brain/ping')).json(); server = j;
  // townsfolk switched on or off: hand them to the new brain (or back to the plain one)
  for (const p of S.living()) if (p.kind === 'human' && !p.town && p.id !== S.mayorId && (p.brain === 'script' || p.brain === 'folk-ai')) p.brain = j.folk !== 'off' ? 'folk-ai' : 'script';
  $('brainNote').textContent = `Brains: mayor = ${j.mayor}; townsfolk = ${j.folk}.`;
  $('sMsg').textContent = 'Saved. New brains take over from the next morning plan. (A new "at once" number needs a Town.bat restart.)';
};

// ------------------------------------------------------------------ deals --
S.onOffer = po => { if (!po) { $('offerCard').hidden = true; return; } const f = S.people[po.from]; $('offerWho').textContent = `${f.name} ${po.offer.threat ? 'demands' : 'offers'}: ${S.offerText(po.offer).replace(/^\w+: /, '')}.`; $('offerCard').hidden = false; };
$('offerYes').onclick = () => { $('offerCard').hidden = true; note(S.offerAnswer(true)); drawPanel(); };
$('offerNo').onclick = () => { $('offerCard').hidden = true; note(S.offerAnswer(false)); drawPanel(); };
$('aOffer').onclick = () => doTo('offer', { coin: +$('offCoin').value || 0, want: $('offWant').value, threat: $('offThreat').checked });

// ------------------------------------------------------------ invitations --
S.onInvite = inv => {
  if (!inv) { $('invite').hidden = true; return; }
  const L = S.people[inv.leader];
  $('inviteWho').textContent = `${L.name} is getting a ${inv.purpose} party together. "Coming along?"${inv.offer ? ` They offer ${inv.offer}c.` : ' (no pay offered)'}`;
  $('invite').hidden = false;
};
document.querySelectorAll('[data-invite]').forEach(b => b.onclick = () => { $('invite').hidden = true; note(S.inviteAnswer(b.dataset.invite, +$('inviteAsk').value || 0)); drawPanel(); });

// ------------------------------------------------------------------- lore --
// The town's learned mind is kept in this browser between visits, so each new town starts wiser.
try { const saved = localStorage.getItem('hollow-lore'); if (saved) S.importLore(JSON.parse(saved)); } catch (e) {}
const saveLore = () => { const j = JSON.stringify(S.exportLore()); if (server) fetch('/lore', { method: 'POST', body: j }).catch(() => {}); try { localStorage.setItem('hollow-lore', j); } catch (e) {} };
setInterval(saveLore, 30000); addEventListener('pagehide', saveLore);
$('learnMode').onclick = () => { S.learning = S.learning ? 0 : 1; drawLore(); };
$('forgetLore').onclick = () => { if ($('forgetLore').dataset.sure) { S.importLore({ v: 1, acts: {}, taught: 0, scored: 0, chain: {}, runs: -1 }); saveLore(); delete $('forgetLore').dataset.sure; $('forgetLore').textContent = 'Forget'; } else { $('forgetLore').dataset.sure = 1; $('forgetLore').textContent = 'Sure? Forget all'; } drawLore(); };
function drawLore() { const z = S.loreSize(); $('loreStat').textContent = `Town mind: ${z.situations} situations, ${z.scored.toLocaleString()} outcomes, ${z.taught} AI examples, ${z.phrases} phrases, ${z.words} word links · town #${z.runs + 1}`; $('learnMode').textContent = S.learning ? 'Plain brains learn: on' : 'Plain brains learn: off'; $('learnMode').classList.toggle('on', !!S.learning); }

// ---------------------------------------------------------------- combat --
let fightAcc = 0, genEnding = false;
function drawCombat() {
  const f = S.fights.find(f => f.sides.has('player'));
  $('combat').hidden = !f;
  if (!f) return;
  $('combatOrder').innerHTML = f.order.map(id => { const q = S.body(id); return `<span class="${f.sides.get(id) === f.sides.get('player') ? 'ally' : 'foe'}${f.waiting === id ? ' now' : ''}">${q.name} ${q.alive ? (S.conscious(q) ? Math.max(0, q.hp) + 'hp' : q.dying ? 'dying' : 'down') : 'dead'}</span>`; }).join(' ');
  $('combatRound').textContent = `Round ${f.round}${f.waiting === 'player' ? ' · your turn' : ''}`;
  const tn = me.turnLeft;
  $('combatEcon').textContent = tn ? `standard ${tn.standard ? '●' : '○'} · move ${tn.move ? '●' : '○'} · swift ${tn.swift ? '●' : '○'} · 5-ft step ${tn.step ? '●' : '○'}` : '';
  $('combatActs').innerHTML = f.waiting === 'player' ? S.legalActions(f, me).map((a, i) => `<button type="button" data-i="${i}" class="cost-${a.cost}">${a.label}<kbd>${a.cost}</kbd></button>`).join('') : '<span class="k">Waiting for the others…</span>';
  $('combatActs').querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = S.legalActions(f, me)[+b.dataset.i]; if (!a) return;
    S.act(f, me, a);
    const left = me.turnLeft; if (a.id === 'end' || a.id === 'surrender' || (left && !left.standard && !left.move && !left.swift)) S.playerDone(f);
    drawCombat();
  });
  $('combatLog').textContent = f.log.slice(-4).join('\n');
}

// ------------------------------------------------------------------ loop --
let last = performance.now(), panelAcc = 0;
const v3 = new THREE.Vector3();
function place(el, x, y, z) { v3.set(x, y, z).project(camera); el.style.left = (v3.x * 0.5 + 0.5) * innerWidth + 'px'; el.style.top = (-v3.y * 0.5 + 0.5) * innerHeight + 'px'; return v3.z < 1; }
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  movePlayer(dt);
  if (!paused) {
    let mins = dt * speed;     // one game minute per real second at 1×
    while (mins > 0) { const s = Math.min(0.5, mins); S.step(s); mins -= s; }
    for (const q of pending.slice()) if (!q.done && !q.asking && S.t > q.deadline) { q.done = true; q.fallback?.(); const i = pending.indexOf(q); if (i >= 0) pending.splice(i, 1); drawCouncil(); }
  }
  fightAcc += dt;
  if (fightAcc > 0.6 / Math.max(1, speed / 4)) { fightAcc = 0; for (const f of S.fights.slice()) if (f.waiting !== 'player') S.fightStep(f); drawCombat(); }
  // daylight
  const h = S.hour(), sunUp = Math.max(0, Math.sin((h - 6) / 12 * Math.PI));
  hemi.intensity = 0.15 + sunUp * 0.65; sun.intensity = 0.1 + sunUp * 0.8;
  scene.background.setHSL(0.6, 0.25, 0.04 + sunUp * 0.12); scene.fog.color.copy(scene.background);
  for (const l of lamps) l.intensity = sunUp < 0.2 ? 6 : 0;
  sun.position.set(me.x - 10, 30, me.z + 12); sun.target.position.set(me.x, 0, me.z);
  // people and animals
  for (const p of [...Object.values(S.people), ...Object.values(S.animals)]) {
    const v = views[p.id] || figure(p);
    const shown = p.alive && !(p.left);
    v.g.visible = shown; v.lbl.style.display = 'none';
    if (!shown) continue;
    v.g.position.set(p.x, 0, p.z); v.g.rotation.y = p.yaw || 0;
    const lying = p.kind === 'human' && (!S.conscious(p) || p.state === 'sleep' || p.state === 'patient');
    v.g.rotation.z = lying ? Math.PI / 2 : 0; v.g.position.y = lying ? (p.carriedBy ? 1.0 : 0.35) : 0;
    if (p.kind === 'human') { v.g.userData.hat.visible = p.id === S.mayorId; v.g.userData.helm.visible = S.isGuard(p); v.g.userData.blade.visible = !!p.fight && p.weapon !== 'fists'; }
    const near = Math.hypot(p.x - controls.target.x, p.z - controls.target.z) < 28 || p.id === selected;
    if (near && place(v.lbl, p.x, v.g.userData.head + 0.15, p.z)) {
      v.lbl.style.display = '';
      const st = p.kind === 'animal' ? '' : !S.conscious(p) ? (p.dying ? 'dying' : 'out cold') : p.fight ? 'fighting' : p.jailedUntil > 0 ? 'jailed' : (p.task?.kind || p.state);
      if (p.bubble && p.bubble !== v.lastBub) { v.lastBub = p.bubble; bubbles[p.id] = { text: p.bubble.text, until: performance.now() + 7000 }; }
      const bub = bubbles[p.id] && bubbles[p.id].until > performance.now() ? bubbles[p.id].text : '';
      v.lbl.innerHTML = `${bub ? `<span class="bub"></span>` : ''}${p.name}${p.id === S.mayorId ? ' <i>mayor</i>' : ''} <small>${st === 'idle' ? '' : st}</small>`;
      if (bub) v.lbl.firstChild.textContent = bub;
      v.lbl.classList.toggle('sel', p.id === selected);
    }
  }
  { const t = selected && S.people[selected];
    const show = t && t.alive && t.kind === 'human' && t.id !== 'player' && S.conscious(t) && t.state !== 'sleep';
    cone.visible = ear.visible = !!show;
    if (show) { const r = S.sightOf(t) * (S.litAt(t, null) ? 1 : 0.35); cone.scale.set(r, r, 1); coneHolder.position.set(t.x, 0.06, t.z); coneHolder.rotation.y = (t.yaw || 0) - Math.PI / 2; const h = S.hearOf(t); ear.scale.set(h, h, 1); ear.position.set(t.x, 0.07, t.z); }
  }
  // the dead: on the ground, on the slab, then a headstone
  for (const b of S.bodies) {
    let c = corpses[b.id];
    if (!c) { c = corpses[b.id] = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), mat(0x3a3530)); c.rotation.z = Math.PI / 2; scene.add(c); }
    c.visible = !b.buried; c.position.set(b.x, b.collected && !b.buried ? 1.0 : 0.3, b.z);
  }
  for (const gr of S.graves) if (!stones[gr.plot]) { stones[gr.plot] = box(0.8, 1, 0.2, 0x7a7a78, gr.at.x, 0.5, gr.at.z - 0.6); box(1, 0.1, 1.8, 0x3a2e22, gr.at.x, 0.05, gr.at.z + 0.3); }
  // camera follows you
  const delta = new THREE.Vector3(me.x, 0, me.z).sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
  controls.target.add(delta); camera.position.add(delta); controls.update();
  panelAcc += dt; if (panelAcc > 0.5) { panelAcc = 0; drawPanel(); drawCouncil(); drawLore(); }
  // the generation ends after its last day: everyone learns (plain brains evolve, AI brains get the town's memory), and a new town starts
  if (!genEnding && !evolving() && !(ffLeft > 0) && S.day > S.genDays) { genEnding = true; paused = true; drawSpeed(); const st = S.endGeneration(); saveLore(); note(`Day ${S.genDays} is over: generation ${st.gen} ends. Everyone learns from it. A new town begins in a moment...`); setTimeout(() => location.reload(), 5000); }
  // context buttons
  const where = S.areaOf(me);
  $('cShop').hidden = !(S.business[where] && S.shopOpen(where)); $('cWork').hidden = !['bakery', 'store', 'smithy', 'tavern', 'fields', 'ranch'].includes(where);
  $('cStudy').hidden = where !== 'school'; $('cStand').hidden = where !== 'hall'; $('cReport').hidden = where !== 'station'; $('cEscape').hidden = !(me.jailedUntil > 0); $('cCure').hidden = !(me.sick && (where === 'healer' || where === 'chapel'));
  $('cBurgle').hidden = !(S.AREAS[where]?.house && me.home !== S.HOUSES.findIndex(h => h.id === where));
  { const an = selected && S.animals[selected]; $('cFeed').hidden = !(an && an.alive && !an.game && S.dist(me, an) < 2.5); }
  $('cQuit').hidden = me.job === 'none'; $('cDismiss').hidden = !me.party; $('cFish').hidden = S.dist(me, S.SPOTS.pond) > 7; $('cForage').hidden = !['orchard', 'wood'].includes(where);
  $('cLoot').hidden = !S.bodies.some(b => !b.buried && S.dist(me, b) < 1.6); $('cDig').hidden = !S.graves.some(g => S.dist(me, g.at) < 1.5 && !g.robbed);
  renderer.render(scene, camera);
}
window.townSelect = id => { selected = id; drawPanel(); };   // for poking from the console
drawPanel();
loop();
})();

// Cloude's chat page: talks to app.py over /api/*.
"use strict";

const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const inputEl = $("input");
const sendBtn = $("sendBtn");
const attachmentsEl = $("attachments");

let chatId = null;
let chatBrain = null;      // brain of the open chat (the 🔄 button is for cloud chats)
let shownLen = 0;          // how many saved entries of the open chat are on screen

function setChatBrain(b) {
  chatBrain = b;
  $("cloudRefreshBtn").hidden = b !== "cloud";
}
let busy = false;
let pending = [];          // uploaded files waiting to be sent: {id, name, mime, kind, url}

const MASCOT = `<svg class="mascot m-cloud" viewBox="0 0 64 44" aria-hidden="true">
  <path class="cloud-body" d="M16 40h34a12 12 0 0 0 1-24 16 16 0 0 0-30-4A13 13 0 0 0 16 40z"/>
  <circle class="eye" cx="27" cy="26" r="2.6"/><circle class="eye" cx="39" cy="26" r="2.6"/>
  <circle class="blush" cx="22" cy="31" r="2.6"/><circle class="blush" cx="44" cy="31" r="2.6"/>
  <path class="smile" d="M30 31q3 3 6 0"/></svg><svg class="mascot m-rose" viewBox="0 0 64 64" aria-hidden="true">
    <path class="stem" d="M32 41c-1 8 1 14 0 21"/>
    <path class="leaf" d="M32 51c-8-6-14-2-16 2 6 2 12 2 16-2z"/>
    <path class="leaf" d="M32 47c8-6 14-3 16 1-6 3-12 3-16-1z"/>
    <path class="petal-back" d="M14 22c0-14 12-18 18-12 6-6 18-2 18 12 0 14-10 20-18 20s-18-6-18-20z"/>
    <path class="petal-front" d="M17 25c2 11 10 15 15 15s13-4 15-15c-6 7-24 7-30 0z"/>
    <path class="swirl" d="M25 17c2-6 13-6 13 1 0 5-8 6-9 1 0-3 4-4 5-1"/>
    <circle class="eye" cx="26" cy="27" r="2.4"/><circle class="eye" cx="38" cy="27" r="2.4"/>
    <circle class="blush" cx="21.5" cy="31" r="2.4"/><circle class="blush" cx="42.5" cy="31" r="2.4"/>
    <path class="smile" d="M29.5 31.5q2.5 2.6 5 0"/>
  </svg>`;

// ---------------------------------------------------------------- markdown --
// Small and safe: everything is escaped first, then a few patterns are styled.
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
function markdown(src) {
  const parts = src.split(/```/);
  let html = "";
  parts.forEach((part, i) => {
    if (i % 2 === 1) {                       // code fence
      const code = part.replace(/^[^\n]*\n/, "");
      html += `<pre><code>${esc(code.replace(/\n$/, ""))}</code></pre>`;
      return;
    }
    const lines = esc(part).split("\n");
    let list = null, para = [];
    const flushPara = () => { if (para.length) { html += `<p>${inline(para.join("<br>"))}</p>`; para = []; } };
    const flushList = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const line of lines) {
      let m;
      if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
        flushPara(); if (list !== "ul") { flushList(); html += "<ul>"; list = "ul"; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
        flushPara(); if (list !== "ol") { flushList(); html += "<ol>"; list = "ol"; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^(#{1,3})\s+(.*)/))) {
        flushPara(); flushList(); html += `<h3>${inline(m[2])}</h3>`;
      } else if (!line.trim()) {
        flushPara(); flushList();
      } else {
        flushList(); para.push(line);
      }
    }
    flushPara(); flushList();
  });
  return html;
}

// ------------------------------------------------------------------ render --
function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }
function hideEmpty() { const e = $("empty"); if (e) e.style.display = "none"; }

function userBubble(text, files) {
  hideEmpty();
  const row = document.createElement("div");
  row.className = "msg user";
  const wrap = document.createElement("div");
  if (files && files.length) {
    const box = document.createElement("div");
    box.className = "files";
    for (const f of files) {
      if (f.kind === "image") {
        const img = document.createElement("img");
        img.src = f.url; img.alt = f.name;
        box.append(img);
      } else {
        const pill = document.createElement("div");
        pill.className = "file-pill"; pill.textContent = "📄 " + f.name;
        box.append(pill);
      }
    }
    wrap.append(box);
  }
  if (text) {
    const b = document.createElement("div");
    b.className = "bubble"; b.textContent = text;
    wrap.append(b);
  }
  wrap.className = "user-wrap";
  row.append(wrap);
  messagesEl.append(row);
  scrollDown();
}

// One assistant bubble that fills in as the stream arrives.
function assistantBubble() {
  hideEmpty();
  const row = document.createElement("div");
  row.className = "msg assistant";
  row.innerHTML = MASCOT;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const thoughts = document.createElement("details");
  thoughts.className = "thoughts"; thoughts.hidden = true;
  thoughts.innerHTML = "<summary>💭 thinking…</summary><div></div>";
  const tools = document.createElement("div");
  const body = document.createElement("div");
  const extra = document.createElement("div");
  const typing = document.createElement("div");
  typing.className = "typing"; typing.innerHTML = "<span></span><span></span><span></span>";
  bubble.append(thoughts, tools, body, extra, typing);
  row.append(bubble);
  messagesEl.append(row);
  scrollDown();

  let text = "", thought = "";
  return {
    thinking(t) { thought += t; thoughts.hidden = false; thoughts.lastChild.textContent = thought; scrollDown(); },
    text(t) { text += t; body.innerHTML = markdown(text); scrollDown(); },
    setAll(d) {
      text = d.text || ""; thought = d.thoughts || "";
      body.innerHTML = markdown(text);
      if (thought) { thoughts.hidden = false; thoughts.lastChild.textContent = thought; thoughts.firstChild.textContent = "💭 thoughts"; }
      for (const t of d.tools || []) this.toolDone(t);
      if (d.ask) this.cloudAsk(d.ask, d.answered);
      typing.remove();
    },
    // The cloud session asked before doing something: answer it from here.
    cloudAsk(askId, answered) {
      const box = document.createElement("div");
      box.className = "approve";
      if (answered) { box.textContent = answered === "allowed" ? "✓ you allowed this" : "✗ you denied this"; extra.append(box); return; }
      const yes = document.createElement("button"); yes.className = "yes"; yes.textContent = "Allow";
      const no = document.createElement("button"); no.className = "no"; no.textContent = "Deny";
      const answer = async (ok) => {
        yes.disabled = no.disabled = true;
        const res = await post("/api/cloud_answer", { chat_id: chatId, ask_id: askId, ok });
        box.append(document.createTextNode(res.error ? " ⚠ " + res.error : ok ? " ✓ allowed" : " ✗ denied"));
      };
      yes.onclick = () => answer(true); no.onclick = () => answer(false);
      box.append(yes, no);
      extra.append(box); scrollDown();
    },
    toolStart(name) {
      const pill = document.createElement("span");
      pill.className = "tool-pill pending"; pill.textContent = `🛠 ${name}…`;
      tools.append(pill); scrollDown();
    },
    toolDone(t) {
      let pill = [...tools.querySelectorAll(".tool-pill.pending")][0];
      if (!pill) { pill = document.createElement("span"); tools.append(pill); }
      pill.className = "tool-pill" + (t.ok ? "" : " bad");
      pill.textContent = `${t.ok ? "✓" : "✗"} ${t.name}${t.label ? " · " + t.label.slice(0, 60) : ""}`;
    },
    approve(id, command) {
      const box = document.createElement("div");
      box.className = "approve";
      box.innerHTML = `Cloude wants to run a command:<pre></pre>`;
      box.querySelector("pre").textContent = command;
      const yes = document.createElement("button"); yes.className = "yes"; yes.textContent = "Allow";
      const no = document.createElement("button"); no.className = "no"; no.textContent = "Deny";
      const answer = async (ok) => {
        yes.disabled = no.disabled = true;
        box.append(document.createTextNode(ok ? " ✓ allowed" : " ✗ denied"));
        await post("/api/approve", { id, ok });
      };
      yes.onclick = () => answer(true); no.onclick = () => answer(false);
      box.append(yes, no);
      extra.append(box); scrollDown();
    },
    notice(t, cls = "notice") {
      const n = document.createElement("div"); n.className = cls; n.textContent = t;
      extra.append(n); scrollDown();
    },
    done() {
      typing.remove();
      thoughts.firstChild.textContent = "💭 thoughts";
      if (!text && !thought && !tools.children.length && !extra.children.length) row.remove();
    },
  };
}

// --------------------------------------------------------------------- api --
async function post(url, obj) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });
  return r.json();
}

const BRAIN_ICON = { api: "🔑", code: "💻", cloud: "☁️" };
const BRAIN_NAME = { api: "API", code: "Claude Code", cloud: "Cloud" };
let status = {};
let bootId = null;         // changes when Cloude restarts with a new version

function brainHint() {
  const b = $("brainInput").value;
  const lines = {
    api: status.has_key ? "Uses your API key. Streams here, with my own tools." : "Needs an API key (below).",
    code: status.claude_found ? "Runs the `claude` program on this PC (sign in once with `claude auth login`). Model and effort below apply."
                              : "⚠ I can't find the `claude` program on this PC. Install Claude Code first.",
    cloud: !status.claude_found ? "⚠ Needs the `claude` program on this PC, signed in to your claude.ai account."
         : !status.in_git ? "⚠ Needs Cloude inside a git clone of your GitHub repo (see the README)."
         : "Sends each chat to a Claude Code cloud session. Replies show up in the Claude app; results come back through GitHub.",
  };
  $("brainHint").textContent = lines[b];
}

async function refreshStatus() {
  const s = status = await (await fetch("/api/status")).json();
  $("modelChip").textContent = s.brain === "cloud" ? `${BRAIN_ICON.cloud} Cloud session`
    : `${BRAIN_ICON[s.brain]} ${BRAIN_NAME[s.brain]} · ${s.model} · ${s.effort}`;
  $("brainInput").value = s.brain;
  $("gitSyncInput").checked = s.git_sync;
  $("autoUpdateInput").checked = s.auto_update;
  $("cloudScryInput").checked = s.cloud_scry;
  if (!bootId) bootId = s.boot_id;
  $("updateChip").hidden = !s.update_note;
  $("updateChip").title = s.update_note || "";
  brainHint();
  $("modelInput").value = s.model;
  $("effortInput").value = s.effort;
  $("autoApproveInput").checked = s.auto_approve;
  $("autoChip").hidden = !s.auto_approve;
  if (s.brain === "api" && !s.has_key) $("settings").showModal();
}

async function refreshChats() {
  const list = await (await fetch("/api/chats")).json();
  const nav = $("chatList");
  nav.innerHTML = "";
  for (const c of list) {
    const item = document.createElement("div");
    item.className = "chat-item" + (c.id === chatId ? " active" : "");
    const title = document.createElement("span"); title.textContent = `${BRAIN_ICON[c.brain] || ""} ${c.title}`;
    const del = document.createElement("button"); del.className = "del"; del.textContent = "✕"; del.title = "Delete chat";
    del.onclick = async (e) => {
      e.stopPropagation();
      if (!confirmDelete(item)) return;
      await post("/api/delete", { id: c.id });
      if (c.id === chatId) startNew();
      refreshChats();
    };
    item.onclick = () => openChat(c.id);
    item.append(title, del);
    nav.append(item);
  }
}

// Two clicks to delete, no browser popup.
function confirmDelete(item) {
  if (item.dataset.armed) return true;
  item.dataset.armed = "1";
  item.querySelector(".del").textContent = "delete?";
  setTimeout(() => { delete item.dataset.armed; const d = item.querySelector(".del"); if (d) d.textContent = "✕"; }, 2500);
  return false;
}

function clearMessages() {
  messagesEl.querySelectorAll(".msg").forEach((m) => m.remove());
  $("empty").style.display = "";
}

function startNew() {
  chatId = null;
  setChatBrain(null);
  clearMessages();
  refreshChats();
  $("sidebar").classList.remove("open");
  inputEl.focus();
}

let reloadWanted = false;   // a /mute or /unmute asked for a redraw

async function openChat(id) {
  const chat = await (await fetch(`/api/chats/${id}`)).json();
  chatId = chat.id;
  setChatBrain(chat.brain);
  clearMessages();
  for (const d of chat.display) {
    if (d.role === "user") userBubble(d.text, d.files);
    else assistantBubble().setAll(d);
  }
  shownLen = chat.display.length;
  refreshChats();
  $("sidebar").classList.remove("open");
}

// The game talks into this chat too: draw its turns as they land.
setInterval(async () => {
  if (busy || !chatId) return;
  try {
    const chat = await (await fetch(`/api/chats/${chatId}`)).json();
    if (busy || chat.id !== chatId || chat.display.length === shownLen) return;
    for (const d of chat.display.slice(shownLen)) {
      if (d.role === "user") userBubble(d.text, d.files);
      else assistantBubble().setAll(d);
    }
    shownLen = chat.display.length;
  } catch (e) { /* restarting; try again next tick */ }
}, 2500);

// ------------------------------------------------------------------- send --
async function send() {
  const text = inputEl.value.trim();
  if (busy || (!text && !pending.length)) return;
  if (pending.some((p) => p.loading)) return;
  busy = true; sendBtn.disabled = true;

  const files = pending.map(({ id, name, mime, kind, url }) => ({ id, name, mime, kind, url }));
  pending = []; renderPending();
  inputEl.value = ""; autosize();
  userBubble(text, files);
  const view = assistantBubble();

  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, attachments: files }),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let cut;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, cut); buf = buf.slice(cut + 2);
        if (!line.startsWith("data: ")) continue;
        handle(JSON.parse(line.slice(6)), view);
      }
    }
  } catch (e) {
    view.notice("Lost the connection to Cloude: " + e.message, "error");
  }
  view.done();
  if (reloadWanted && chatId) {            // /mute or /unmute: redraw with game turns hidden or shown
    reloadWanted = false;
    const note = messagesEl.lastElementChild;
    await openChat(chatId);
    if (note) messagesEl.append(note);
  }
  try { shownLen = (await (await fetch(`/api/chats/${chatId}`)).json()).display.length; } catch (e) {}
  busy = false; sendBtn.disabled = false;
  try { shownLen = (await (await fetch(`/api/chats/${chatId}`)).json()).display.length; } catch (e) { /* next poll catches up */ }
  refreshChats();
  inputEl.focus();
}

function handle(ev, view) {
  switch (ev.type) {
    case "start": chatId = ev.chat_id; setChatBrain(ev.brain); break;
    case "thinking": view.thinking(ev.text); break;
    case "text": view.text(ev.text); break;
    case "tool_start": view.toolStart(ev.name); break;
    case "tool_done": view.toolDone(ev); break;
    case "approve": view.approve(ev.id, ev.command); break;
    case "notice": view.notice(ev.text); break;
    case "error": view.notice(ev.text, "error"); break;
    case "reload": reloadWanted = true; break;
  }
}

// ----------------------------------------------------------------- uploads --
function renderPending() {
  attachmentsEl.innerHTML = "";
  pending.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "att" + (p.loading ? " loading" : "");
    if (p.kind === "image" && p.preview) {
      const img = document.createElement("img"); img.src = p.preview; el.append(img);
    } else {
      el.append(document.createTextNode("📄"));
    }
    const name = document.createElement("span"); name.textContent = p.name; el.append(name);
    const x = document.createElement("button"); x.type = "button"; x.textContent = "✕";
    x.onclick = () => { pending.splice(i, 1); renderPending(); };
    el.append(x);
    attachmentsEl.append(el);
  });
}

function readAsDataURL(file) {
  return new Promise((ok, bad) => {
    const r = new FileReader();
    r.onload = () => ok(r.result); r.onerror = () => bad(r.error);
    r.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  for (const file of fileList) {
    const item = { name: file.name || "pasted.png", kind: file.type.startsWith("image/") ? "image" : "file", loading: true };
    pending.push(item); renderPending();
    try {
      const dataURL = await readAsDataURL(file);
      if (item.kind === "image") item.preview = dataURL;
      const res = await post("/api/upload", { name: item.name, mime: file.type, data: dataURL.split(",")[1] });
      if (res.error) throw new Error(res.error);
      Object.assign(item, res, { loading: false });
    } catch (e) {
      pending.splice(pending.indexOf(item), 1);
      alertLine(`Couldn't attach ${item.name}: ${e.message}`);
    }
    renderPending();
  }
}

function alertLine(t) {
  const v = assistantBubble(); v.notice(t, "error"); v.done();
}

$("fileInput").onchange = (e) => { addFiles(e.target.files); e.target.value = ""; };
document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) { e.preventDefault(); addFiles(files); }
});
let dragDepth = 0;
document.addEventListener("dragenter", (e) => { e.preventDefault(); dragDepth++; $("dropVeil").classList.add("on"); });
document.addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; $("dropVeil").classList.remove("on"); } });
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault(); dragDepth = 0; $("dropVeil").classList.remove("on");
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

// ---------------------------------------------------------------- controls --
function autosize() { inputEl.style.height = "auto"; inputEl.style.height = Math.min(inputEl.scrollHeight, 220) + "px"; }
inputEl.addEventListener("input", autosize);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
});
$("composer").onsubmit = (e) => { e.preventDefault(); send(); };
$("newChat").onclick = startNew;
$("menuBtn").onclick = () => $("sidebar").classList.toggle("open");
$("settingsBtn").onclick = () => $("settings").showModal();
$("brainInput").onchange = brainHint;
$("cancelSettings").onclick = () => $("settings").close();
$("settingsForm").onsubmit = async (e) => {
  if (e.submitter && e.submitter.value === "save") {
    await post("/api/settings", {
      api_key: $("keyInput").value, model: $("modelInput").value, effort: $("effortInput").value,
      auto_approve: $("autoApproveInput").checked,
      brain: $("brainInput").value, git_sync: $("gitSyncInput").checked,
      auto_update: $("autoUpdateInput").checked, cloud_scry: $("cloudScryInput").checked,
    });
    $("keyInput").value = "";
    const switched = status.brain !== $("brainInput").value;
    await refreshStatus();
    // A chat keeps the brain it started with, so a new brain means a new chat,
    // and the conversation so far is handed over so nothing is forgotten.
    if (switched && chatId) {
      const old = chatId;
      const fresh = await post("/api/new", { from_chat: old });
      await openChat(fresh.id);
      const v = assistantBubble();
      v.notice(`Continuing on ${BRAIN_ICON[status.brain]} ${BRAIN_NAME[status.brain]}. I'll pass our conversation so far along with your next message. The old chat stays as it was.`);
      v.done();
    }
  }
};
// Skins: "cloud" (default) or "rose". Remembered in this browser only.
function applySkin(skin) {
  document.documentElement.dataset.skin = skin;
  $("skinBtn").textContent = skin === "rose" ? "☁️" : "🌹";
  $("skinBtn").title = skin === "rose" ? "Switch to the cloud skin" : "Switch to the rose skin";
  try { localStorage.setItem("cloude-skin", skin); } catch (e) { /* private window: fine */ }
}
$("skinBtn").onclick = () => applySkin(document.documentElement.dataset.skin === "rose" ? "cloud" : "rose");
applySkin(document.documentElement.dataset.skin || "cloud");

// Cloud replies arrive through GitHub; the server checks every 20s. While a
// cloud chat is open, show whatever has landed since it was drawn.
async function showNewCloudReplies() {
  if (chatBrain !== "cloud" || !chatId || busy) return 0;
  const chat = await (await fetch(`/api/chats/${chatId}`)).json();
  const fresh = chat.display.slice(shownLen);
  for (const d of fresh) {
    if (d.role === "user") userBubble(d.text, d.files);
    else assistantBubble().setAll(d);
  }
  shownLen = chat.display.length;
  return fresh.length;
}
// (the poller above, every 2.5s, also draws cloud replies as they land)

// After an auto-update the server restarts with a new boot id: reload the page
// (when nothing is mid-send) so the new look and code show up too.
setInterval(async () => {
  if (busy || !bootId) return;
  try {
    const s = await (await fetch("/api/status")).json();
    if (s.boot_id && s.boot_id !== bootId) location.reload();
    $("updateChip").hidden = !s.update_note;
    $("updateChip").title = s.update_note || "";
  } catch (e) { /* restarting right now; try again next time */ }
}, 5000);

$("cloudRefreshBtn").onclick = async () => {
  if (busy || !chatId) return;
  const btn = $("cloudRefreshBtn"); btn.disabled = true;
  try {
    const res = await post("/api/cloud_check", {});
    const n = await showNewCloudReplies();
    if (res.error) { const v = assistantBubble(); v.notice(res.error, "error"); v.done(); }
    else if (!n) { const v = assistantBubble(); v.notice("No new replies yet."); v.done(); }
  } catch (e) { /* ignore */ }
  btn.disabled = false;
};
$("restartBtn").onclick = async () => {
  if (busy) return;
  $("restartBtn").textContent = "…";
  await post("/api/restart", {}).catch(() => {});
  // give the old copy a moment to exit, then wait for the new one and reload
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch("/api/status")).ok) { location.reload(); return; } } catch (e) { /* still restarting */ }
  }
  $("restartBtn").textContent = "↻";
};

refreshStatus();
refreshChats();
inputEl.focus();

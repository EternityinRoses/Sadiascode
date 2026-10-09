/**
 * THE MINDS: seats for other intelligences, and the room they talk in.
 *
 * Everything here is BROWSER-DIRECT, by design and by scry: Ollama's REST API
 * answers localhost pages, Anthropic ships an explicit CORS opt-in header, and
 * an already-running agent adapter is an open HTTP server. What a browser
 * cannot do is INSTALL or LAUNCH anything, pulls, Piper, folder dialogs and
 * process ownership are the game server's work in the original (its serve.py
 * is a 1,700-line application server), and they arrive here only when v2's
 * server grows those endpoints. Until then this module simply never offers
 * them: an option that cannot work does not belong in a list, the original
 * cut Kokoro for exactly that reason.
 *
 * Seat configuration and transcripts persist in localStorage, as the original
 * does, seats are a fact about the MACHINE and its neighbours, not about any
 * one character.
 */

import { state } from "./state.js";
import { applySink, gainOf } from "./audio.js";

export const SEAT_COUNT = 3;
export const OLLAMA_DEFAULT = "http://localhost:11434";
export const AGENT_PORTS = [8765, 8766, 8767];
export const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const STORE = "loh2_minds";
const ROOM_STORE = "loh2_room";
const KEEP = 80;                       // transcript cap per channel, the original's

//--- seat records -------------------------------------------------------------

export function freshSeat(i) {
    return {
        n: i + 1, name: `LLM PC ${i + 1}`,
        kind: "ollama",                // ollama | api | agent
        on: false,
        clock: "poke",                 // poke | listen
        model: null, endpoint: OLLAMA_DEFAULT,
        apiKey: "", apiModel: ANTHROPIC_MODEL, apiEndpoint: "https://api.anthropic.com/v1/messages",
        agentPort: AGENT_PORTS[i],
        voice: "off",                  // off | browser | piper | eleven
        piperVoice: "",
        elevenKey: "", elevenVoice: "", elevenModel: "",
        dir: "",                       // agent seats: the chosen mailbox folder's name
        dev: false,                    // the tester's seat: DEV: lines in its replies act on the world (pilot.js, void.js applyDev)
    };
}

/**
 * WHICH KINDS MAY HOLD THE LISTEN CLOCK. Rose, 2026-08-17: *"only Agents/API
 * can listen mode. Ollama are too stupid for listen."*
 *
 * A listening mind is a PROCESS with its own clock that decides when it has
 * something to do. An ollama seat is a model behind an endpoint: it thinks only
 * when asked, so "listen" for one means a body that never acts and a chair that
 * never speaks. The rule is enforced where seats are LOADED rather than at the
 * ten places the clock is read, so nothing downstream -- pilot, void, the room --
 * can ever see the combination at all.
 */
export const CAN_LISTEN = ["agent"];
export const canListen = (seat) => !!seat && CAN_LISTEN.includes(seat.kind);
/** The clock a seat ACTUALLY has, whatever is stored against it. */
export const clockOf = (seat) =>
    (seat && seat.clock === "listen" && canListen(seat)) ? "listen" : "poke";

export function loadSeats() {
    let seats;
    try {
        const raw = JSON.parse(localStorage.getItem(STORE));
        if (Array.isArray(raw) && raw.length === SEAT_COUNT)
            seats = raw.map((s, i) => Object.assign(freshSeat(i), s));
    } catch (e) { /* fall through to fresh */ }
    if (!seats) seats = Array.from({ length: SEAT_COUNT }, (_, i) => freshSeat(i));
    /* An ollama seat saved as a listener -- by an older build, or by changing
       kind after choosing the clock -- is corrected here and stays corrected. */
    for (const s of seats) s.clock = clockOf(s);
    return seats;
}
export function saveSeats(seats) {
    localStorage.setItem(STORE, JSON.stringify(seats));
}

//--- reaching each kind of mind ----------------------------------------------

/* ONE PROMISE LANE PER ENDPOINT, the original's rule. Two callers hitting the
   same Ollama at once starve each other; queued, both finish. */
const lanes = new Map();
function inLane(key, work) {
    const prev = lanes.get(key) || Promise.resolve();
    const next = prev.then(work, work);
    lanes.set(key, next.catch(() => {}));
    return next;
}

/**
 * THE MODEL SHELF: the original's, verbatim: what decides the choice is how
 * much memory the machine can spare, so RAM leads and the ladder runs
 * lightest first. The big rungs stay on purpose even on machines that cannot
 * run them, the shelf offers, the PC Check decides. Anything not here can
 * still be typed by hand; it is off the shelf, not out of the game.
 */
export const OLLAMA_SHELF = [
    ["qwen3.5:0.8b", "Qwen 3.5 · 0.8B", "1.0 GB", "tiny, runs on anything, even with no GPU"],
    ["llama3.2:1b",  "Llama 3.2 · 1B",  "1.3 GB", "the lightest Llama, for old or GPU-less machines"],
    ["gemma2:2b",    "Gemma 2 · 2B",    "1.6 GB", "Google's small one; a light change of voice"],
    ["llama3.2:3b",  "Llama 3.2 · 3B",  "2.0 GB", "small but articulate, a lot of talk per gigabyte"],
    ["phi4-mini",    "Phi 4 mini · 3.8B", "2.5 GB", "Microsoft's small one, reasons well for its size"],
    ["qwen3.5:2b",   "Qwen 3.5 · 2B",   "2.7 GB", "light, and still holds a format"],
    ["qwen3-vl:4b",  "Qwen 3 VL · 4B",  "3.3 GB", "as quick as the 4B and it can see images too"],
    ["qwen3.5:4b",   "Qwen 3.5 · 4B",   "3.4 GB", "the sweet spot on a typical 8 GB card"],
    ["mistral:7b",   "Mistral · 7B",    "4.4 GB", "the classic 7B, plain, fast, few refusals"],
    ["llama3:8b",    "Llama 3 · 8B",    "4.7 GB", "Meta's 8B, steady, well-mannered prose"],
    ["dolphin3:8b",  "Dolphin 3 · 8B",  "4.9 GB", "uncensored tune, takes darker scenes without balking"],
    ["gemma2:9b",    "Gemma 2 · 9B",    "5.4 GB", "the bigger Gemma, warmer writing, needs the room"],
    ["qwen3.5:27b",  "Qwen 3.5 · 27B",  "17 GB",  "needs a big GPU or a lot of system RAM"],
    ["qwen3.6:35b",  "Qwen 3.6 · 35B-A3B", "24 GB", "newest; sparse MoE, only 3B active, wants RAM, not VRAM"],
];

/**
 * Pull a model through Ollama's OWN API, browser-direct, streaming NDJSON so
 * the page can say how far along the gigabytes are. onProgress(pct|null, note).
 */
export async function pullModel(endpoint, model, onProgress) {
    const r = await fetch(`${endpoint}/api/pull`, {
        method: "POST",
        body: JSON.stringify({ model, stream: true }),
    }).catch(() => null);
    if (!r || !r.ok || !r.body) throw new Error("could not reach it. Is Ollama running?");
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
            if (!line.trim()) continue;
            let j = null;
            try { j = JSON.parse(line); } catch (e) { continue; }
            if (j.error) throw new Error(j.error);
            if (j.total && j.completed != null)
                onProgress(Math.floor((j.completed / j.total) * 100), j.status || "");
            else onProgress(null, j.status || "");
        }
    }
}

/** Delete a pulled model from disk, gigabytes, so the CALLER confirms. */
export async function removeModel(endpoint, model) {
    const r = await fetch(`${endpoint}/api/delete`, {
        method: "DELETE",
        body: JSON.stringify({ model }),
    }).catch(() => null);
    if (!r || !r.ok) throw new Error("could not remove it. Is Ollama running?");
}

/** Installed models off the live daemon. Throws with a speakable reason. */
export async function ollamaTags(endpoint) {
    const r = await fetch(`${endpoint}/api/tags`).catch(() => null);
    if (!r || !r.ok) throw new Error("could not reach it. Is Ollama running?");
    const j = await r.json();
    return (j.models || []).map(m => ({
        name: m.name,
        ram: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : "",
    }));
}

/* EVERY CALL CARRIES A DEADLINE. A hung mind used to wedge Send forever,
   the original aborts everything (20s default, 60s in the room, 30s API) and
   the round survives a dead seat. */
const ROOM_TIMEOUT_MS = 60000;
const API_TIMEOUT_MS = 90000;
const AGENT_FLOOR_MS = 60000;

/* THE WINDOW IS THE MODEL'S OWN, CAPPED. /api/show names each model's
   trained context; the KV cache's appetite scales with the window, so
   CTX_CAP keeps a 262k model laptop-sized, while a model trained
   short is never forced past what it can actually hold. Asked once
   per model and remembered; an unreachable answer falls to 8192. */
const CTX_CAP = 16384;
const CTX_FLOOR = 2048;
const ctxKnown = new Map();               // endpoint|model -> num_ctx
async function ollamaCtx(seat) {
    const key = seat.endpoint + "|" + seat.model;
    if (ctxKnown.has(key)) return ctxKnown.get(key);
    let ctx = 8192;
    try {
        const r = await fetch(`${seat.endpoint}/api/show`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ model: seat.model }),
        });
        const j = r && r.ok ? await r.json() : null;
        const info = (j && j.model_info) || {};
        for (const k of Object.keys(info))
            if (k.endsWith(".context_length") && Number(info[k]) > 0)
                ctx = Number(info[k]);
    } catch (e) { /* the fallback stands */ }
    ctx = Math.max(CTX_FLOOR, Math.min(CTX_CAP, ctx));
    ctxKnown.set(key, ctx);
    return ctx;
}

async function ollamaChat(seat, messages, timeoutMs, extraOptions) {
    const numCtx = await ollamaCtx(seat);
    return inLane(seat.endpoint, async () => {
        /* THE CALLER MAY OWN THE CLOCK. The room's 60s is right for a room:
           a player typed something and is watching a box. A fight is a
           different clock -- an attack of opportunity freezes the whole table
           while it is answered, and twelve seconds of that is a pause, where
           sixty is a hang. So the deadline is an argument with the room's own
           value as its default, and nothing that does not pass one changes.

           WHERE IT STARTS is worth knowing: inside the lane, so time spent
           queued behind another call to the same endpoint is not charged to
           it. A caller that must bound the WALL clock has to bound it itself;
           this bounds the call. */
        const ms = timeoutMs || ROOM_TIMEOUT_MS;
        const body = {
            model: seat.model, messages, stream: false,
            /* Bounded like the original's room: a small local model rambles
               without num_predict, and 0.8 is its authored temperature.
               A caller may override (the forge asks colder: JSON wants
               convergence, conversation wants blood).
               num_ctx is the MODEL'S OWN, capped (Rose 08-18: "their
               context windows are abysmally small", then "I selected
               that from a list and the player will also select stuff
               from a list too" -- any hardcoded window is wrong for a
               shelf of arbitrary models: it strangles a 262k qwen and
               force-feeds a 4k llama past its trained length). The
               window is asked of /api/show once per model and clamped
               to CTX_CAP for the KV cache's sake. */
            think: false, options: { num_ctx: numCtx, num_predict: 300,
                                     temperature: 0.8, ...(extraOptions || {}) },
        };
        /* A TIMEOUT IS NOT AN OUTAGE. "Is Ollama running?" on an abort sent
           the player checking a daemon that was answering fine, just too
           slowly for this machine, which is the PC Check's verdict to give,
           said in its words. */
        let timedOut = false;
        const call = () => fetch(`${seat.endpoint}/api/chat`, {
            method: "POST", body: JSON.stringify(body),
            signal: AbortSignal.timeout(ms),
        }).catch(e => { if (e && e.name === "TimeoutError") timedOut = true; return null; });
        let r = await call();
        if (r && !r.ok) {
            /* Older models reject `think` outright, retry bare, the
               original's own fallback. */
            delete body.think;
            r = await call();
        }
        /* A REFUSAL IS NOT AN OUTAGE either. The daemon answering "model
           'gemma2:9b' not found" and the daemon being down are opposite
           problems, and "is Ollama running?" sent the player to check the
           one thing that was plainly working. The PC Check already told
           its refusals apart by name; the chat lane now does too. */
        if (r && !r.ok) {
            const detail = await r.json().catch(() => null);
            throw new Error((detail && detail.error)
                ? "the daemon refused: " + detail.error
                : "the daemon refused (" + r.status + ")");
        }
        if (!r) throw new Error(timedOut
            ? "answered too slowly for this machine, run the PC Check, or pick a lighter model"
            : "could not reach it. Is Ollama running?");
        const j = await r.json();
        return ((j.message && j.message.content) || "").trim();
    });
}

async function apiChat(seat, messages, timeoutMs) {
    const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
    const rest = messages.filter(m => m.role !== "system");
    /* A poke on a fresh room sends no lines at all, and the API refuses an
       empty messages array, the original guards it with a placeholder turn. */
    if (!rest.length) rest.push({ role: "user", content: "(the floor is yours)" });
    /* Newer models refuse a conversation that ends on their own line, so it
       always ends on a user turn. */
    if (rest[rest.length - 1].role === "assistant")
        rest.push({ role: "user", content: "(the floor is yours)" });
    const r = await fetch(seat.apiEndpoint, {
        signal: AbortSignal.timeout(timeoutMs || API_TIMEOUT_MS),
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": seat.apiKey,
            "anthropic-version": "2023-06-01",
            /* Anthropic's explicit CORS opt-in, the single header that makes a
               browser-direct call possible at all. */
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: seat.apiModel || ANTHROPIC_MODEL, max_tokens: 4000,
            system: sys || undefined, messages: rest,
        }),
    }).catch(() => null);
    if (!r) throw new Error("could not reach the API");
    if (!r.ok) {
        const j = await r.json().catch(() => null);
        throw new Error(`the API refused (${r.status})` +
            (j && j.error && j.error.message ? ": " + j.error.message : ""));
    }
    const j = await r.json();
    return (j.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

/** An adapter that is ALREADY RUNNING answers /health; launching one is the
    game server's work and is not offered until v2 has a game server. */
export async function agentHealth(port) {
    const r = await fetch(`http://127.0.0.1:${port}/health`).catch(() => null);
    if (!r || !r.ok) return null;
    return r.json().catch(() => null);   // {ok, mind, port, seat, mailbox}
}

async function agentChat(seat, messages, timeoutMs) {
    /* ONE deadline, told AND enforced. The adapter derives its mind's budget
       from opts.timeout and assumes 30s when absent, telling it nothing
       while waiting forever re-created the original's documented two-clock
       bug (told 27s, meant 150). Floor 60s, and our own abort matches.

       A CALLER MAY SHORTEN IT, and if it does, both numbers move together -- 
       that is the whole point of the rule. What a caller must not do is
       lengthen it silently past what it told the adapter. */
    const ms = timeoutMs || AGENT_FLOOR_MS;
    const r = await fetch(`http://127.0.0.1:${seat.agentPort}/think`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, opts: { timeout: ms } }),
        signal: AbortSignal.timeout(ms),
    }).catch(() => null);
    if (!r || !r.ok) throw new Error("nothing is answering its port");
    const j = await r.json();
    return ((j && (j.content || j.text)) || "").trim();
}

/**
 * A MAILBOX SEAT: an agent that already runs on this machine, reached
 * through folders instead of a port.
 *
 * A browser cannot write a file, so the game server does it: the page posts
 * the think, serve.py drops request_<id>.json in the agent's folder, waits
 * for reply_<id>.txt to settle, sweeps the pair and hands the words back.
 *
 * `seat.dir` is a KEY, not a path, seats.json on the machine decides what
 * folder it names. A page that could name the folder could name any folder.
 */
async function mailboxChat(seat, messages, timeoutMs) {
    /* the server is doing the waiting, so OUR deadline must outlast its own
       or we abort a think that was about to be answered. The 15s is that
       margin and it scales with nothing: it is the round trip and the
       server's own sweep, not a fraction of the wait. */
    const seconds = (timeoutMs || AGENT_FLOOR_MS) / 1000;
    const r = await fetch("/api/seat/think", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: seat.dir, messages, timeout: seconds }),
        signal: AbortSignal.timeout(seconds * 1000 + 15000),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "the seat did not answer");
    return String(j.content || "").trim();
}

/**
 * A REPORT THE MIND CAN GO AND READ. Only a mailbox seat has a folder, so
 * only a mailbox seat gets a file, every other kind is told the same thing
 * through its senses instead, and neither delivery is a substitute for the
 * other: the file survives a restart, the notice arrives in time to matter.
 * Returns whether a file was actually written.
 */
export async function fileReport(seat, text) {
    if (!text) return false;
    const box = await seatBox(seat);
    if (!box) return false;
    const r = await fetch("/api/seat/report", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: box, text }),
    }).catch(() => null);
    return !!(r && r.ok);
}

/**
 * THE LISTEN CLOCK: the other half of `seat.clock`, and it inverts who
 * speaks first.
 *
 * Rose, 2026-08-03: *"Agents like psadia are 'listen' agents not 'poke'
 * agents. Psadia loops by itself and can probably loop faster than the game
 * while ollama needs to be poked (asked) to initiate actions... Listen agents
 * speak to the game unprovoked meaning the game just listens without doing
 * anything."*
 *
 * A POKE mind is a function: ask, wait, receive. A LISTEN mind is a PROCESS
 * already running with its own clock, asking it to wait on our question is
 * asking a river to hold still. So for a listen seat the game does exactly two
 * things, neither of them blocking: it keeps the world READABLE, and it looks
 * for what the agent left. `publishWorld` is the first; `collectFrom` is the
 * second.
 */
export async function publishWorld(seat, text) {
    const box = await seatBox(seat);
    if (!box) return false;
    const r = await fetch("/api/seat/publish", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: box, text }),
    }).catch(() => null);
    return !!(r && r.ok);
}

/**
 * WAKE IT: because being spoken to is a stimulus, not a routine decision.
 *
 * Rose, 2026-08-03: *"When I talk in chat that should actually be a poke event
 * to listen llm pcs."* Listening means the game does not ASK it what to do
 * next; it never meant the thing cannot be interrupted. A player who says
 * "put away your torch" and waits out a 45-second sleep has been failed by the
 * architecture, not served by it.
 *
 * This is a WAKE, not a question: nothing waits for an answer, and the agent
 * replies the way it always does in the world, by acting.
 */
export async function wakeSeat(seat, messages) {
    const box = await seatBox(seat);
    if (!box) return false;
    const r = await fetch("/api/seat/wake", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: box, messages }),
    }).catch(() => null);
    return !!(r && r.ok);
}

/** What the agent said on its own initiative since the last look. Never
    blocks, never asks, an empty list is the normal answer. */
export async function collectFrom(seat) {
    const none = { lines: [], silentFor: null };
    const box = await seatBox(seat);
    if (!box) return none;
    const r = await fetch("/api/seat/collect?seat="
        + encodeURIComponent(box)).catch(() => null);
    if (!r || !r.ok) return none;
    const j = await r.json().catch(() => null);
    if (!j || !j.ok || !Array.isArray(j.lines)) return none;
    /* `silent_for` is how long since the agent last PROVED it exists, the only
       honest death test for something whose silence is legitimate. */
    return { lines: j.lines, silentFor: j.silent_for };
}

/**
 * THE ONE DOOR TO A MIND, whatever kind of mind it is.
 *
 * `opts.timeoutMs` is optional and means "this caller cannot wait longer than
 * that". Omit it and every kind keeps the deadline it was authored with,
 * which is why nothing in the room had to change when the battle arrived
 * wanting twelve seconds for a free swing.
 *
 * It is a ceiling on the CALL, not on the wait: an ollama seat can still sit
 * in its endpoint's lane first (see `inLane`). A caller that must not be held
 * past its number races this promise against its own timer as well.
 */
export function ask(seat, messages, opts = {}) {
    const ms = opts.timeoutMs;
    if (seat.kind === "ollama") return ollamaChat(seat, messages, ms, opts.options);
    if (seat.kind === "api") return apiChat(seat, messages, ms);
    /* `dir` was always the field that meant "this agent talks in files"
       (see freshSeat), so it is the switch, not a fourth kind nobody set. */
    if (seat.dir) return mailboxChat(seat, messages, ms);
    return agentChat(seat, messages, ms);
}

//--- the room -----------------------------------------------------------------

/**
 * Channels: "room" plus one private per seat. A private channel is PRIVATE both
 * ways, the room never hears it and the other seats are not told it happened.
 */
function emptyRoom() {
    /* seats: n -> [{who, text}]; councils: "1,3" -> [{who, text}] -- a
       closed channel between minds, keyed by the sorted member numbers.
       The player is never shown its lines, only the fact it met. */
    return { room: [], seats: {}, councils: {} };
}
export function loadRoom() {
    try { return Object.assign(emptyRoom(), JSON.parse(localStorage.getItem(ROOM_STORE))); }
    catch (e) { return emptyRoom(); }
}
export function saveRoom(room) {
    /* TRIM IN PLACE. slice() hands back a FRESH array even under the cap,
       so every save orphaned any held reference to a channel -- the same
       orphaned-ref class as the pump's adopt bug (08-17, fixed by copying
       in place): runPrivate holds `chan` across an await, a save swaps the
       array under it, and the reply lands in a detached copy nothing reads.
       splice keeps the array's identity, so a held reference stays the
       record. */
    const trim = (a) => { if (a.length > KEEP) a.splice(0, a.length - KEEP); };
    trim(room.room);
    for (const k of Object.keys(room.seats)) trim(room.seats[k]);
    for (const k of Object.keys(room.councils || {})) trim(room.councils[k]);
    localStorage.setItem(ROOM_STORE, JSON.stringify(room));
}

/* THE PLAYER HAS A NAME (Rose 08-18, watching Qwen christen her
   "Elias": "I thought the game tells the seats my name / profile
   name" -- it never did. Strangers at the microphone were relayed BY
   NAME while the player themselves stayed an anonymous "you", and a
   small mind fills a void like that with invention). The name is the
   voice profile's Player marker, asked of the server cheaply and
   remembered; a round never blocks on it failing. */
let playerName = "", playerNameAt = -1e9;
/** The profile name the room and the world both speak (pilot.js reads
    it for the world briefs; empty until the server has answered). */
export const knownPlayerName = () => playerName;
export async function refreshPlayerName() {
    if (performance.now() - playerNameAt < 60000) return;
    playerNameAt = performance.now();
    try {
        const r = await fetch("/api/voice/profile");
        const j = r && r.ok ? await r.json() : null;
        playerName = (j && j.player) || "";
    } catch (e) { /* the last known name stands */ }
}

/* THE TAUGHT BRIEF: the original spelled the room out because a 4B model
   does not infer the shape of a multi-exchange room: it answers the player
   every time, or repeats itself politely forever. Numbered, literal, explicit
   about what PASS costs and buys. */
/* Whether this seat's forge has finished, read from the forge's own store
   (forge.js draftOf) without importing it: forge.js already imports minds.js. */
const forgedDone = (n) => {
    try {
        const raw = JSON.parse(localStorage.getItem("loh2_forge"));
        const d = raw && raw.rows && raw.rows[String(n)];
        return !!(d && d.done);
    } catch (e) { return false; }
};

const sys = (seat, others) => {
    const forged = forgedDone(seat.n);
    let brief =
        `You are ${seat.name}, a mind that will inhabit a player character in ` +
        `Legends of Harpine, a grim fantasy world. The player is speaking with ` +
        `you BEFORE the world begins, you have no body yet, ` +
        `so answer as yourself, plainly, not in a character's voice. ` +
        (playerName
            ? `The player's name is ${playerName}; their lines arrive ` +
              `marked "you". `
            : "") +
        (forged
            ? `Your character HAS ALREADY BEEN BUILT at the forge, in a separate ` +
              `session you do not remember. Its sheet is sealed until the Verify ` +
              `page reveals it. If asked, say it is finished and will be revealed ` +
              `at Verify; never say you have not built one, and never invent its ` +
              `details. `
            : `You have no character sheet yet. When the player walks on from ` +
              `this page you will BUILD your own character at the forge, ` +
              `question by question, from the player's own difficulty pool -- ` +
              `so what is said here may shape who you choose to become. `) +
        `Remember what they tell you; you will carry it in when the ` +
        `world opens. Keep replies to a few sentences, this is conversation, ` +
        `not a monologue.`;
    if (others && others.length) {
        brief +=
            ` YOU ARE NOT ALONE. ${others.join(" and ")} are in this room with ` +
            `you. HOW THE ROOM WORKS, exactly: ` +
            `(1) A round opens when the player says something, OR when they ` +
            `simply give you the floor without speaking. So a turn that arrives ` +
            `with NO new line from the player is normal and is not a mistake: ` +
            `nobody is waiting on an answer to anything. Say what you actually ` +
            `have to say, or PASS. ` +
            `(2) A round runs up to 4 exchanges. In EACH exchange every mind ` +
            `here speaks at most once, and you are being asked for one of them ` +
            `right now. ` +
            `(3) Between exchanges you are shown what the others said, as lines ` +
            `marked "LLM PC N said:". Those came from another mind, not from ` +
            `the player, not from you. ` +
            `(4) So from the second exchange onward you are talking TO THEM, ` +
            `not to the player: answer what they actually said, argue with it, ` +
            `agree to a plan, decide who leads. ` +
            `(5) The round ENDS EARLY the moment every mind passes in the same ` +
            `exchange. That is how a conversation finishes here, and it is the ` +
            `normal way for one to end. ` +
            `TO PASS, reply with the single word PASS and nothing else, no ` +
            `explanation, and never tacked onto the end of a real answer. Pass ` +
            `whenever the matter is settled, someone else already said your ` +
            `point, or you would only be agreeing. Silence is a real answer; ` +
            `filler is worse than silence. ` +
            `ONE THING YOU MUST NOT DO: the others are answering at the same ` +
            `moment as you, so within THIS exchange you cannot have heard them. ` +
            `Never pretend you did, never answer on their behalf, never claim ` +
            `they agreed to something they have not said yet. ` +
            `SAY HOW MUCH YOUR LINE MATTERS. When you speak, you may add a ` +
            `final line reading exactly: PRIO: 1 (or 2, or 3). It is not ` +
            `loudness, it is IMPORTANCE. 1 = the plan, the warning, the thing ` +
            `that changes what happens; 2 = a real contribution (the default if ` +
            `you say nothing); 3 = agreement, colour, "yes, what they said". ` +
            `Claim 1 only when you mean it, if everyone shouts 1 nobody is ` +
            `heard properly. ` +
            `YOU MAY CHECK WHO IS ACTUALLY SPEAKING. End a reply with a final ` +
            `line reading exactly VERIFY and the game will tell you, privately ` +
            `and before your next turn, whether the microphone matched the ` +
            `enrolled player, matched somebody else by name, matched nobody, ` +
            `or was not used at all because the line was typed. Nobody is told ` +
            `you asked. Ask whenever a claim matters: people share keyboards, ` +
            `and a line that says "it's me" is a claim like any other. It ` +
            `costs you nothing, it can ride under a real answer, and it can ` +
            `ride under PASS. ` +
            `TO SPEAK PRIVATELY WITH ANOTHER MIND, end your reply with a final ` +
            `line reading exactly ASIDE: <numbers> (for example "ASIDE: 2" or ` +
            `"ASIDE: 2,3"), your public piece above it as normal. You will then ` +
            `confer in closed council with only those minds; the player hears ` +
            `none of it and is told only THAT you stepped aside. Use it for ` +
            `anything that would cost you to say aloud; what is agreed in ` +
            `council you may act on afterwards, but never recite in the open.`;
    }
    return brief;
};

/* WHAT A LISTEN SEAT IS GIVEN TO READ instead of being asked. publishWorld
   OVERWRITES world_state.md, so this is a snapshot and never a pile: the whole
   room as it stands, plus the one thing the brief above cannot say to a mind
   nobody is going to ask -- how to speak without being spoken to. */
const roomState = (seat, heard, room) =>
    sys(seat, heard) +
    "\n\n--- THE ROOM SO FAR ---\n" +
    (room.room.length
        ? room.room.map(l => `${l.who}: ${l.text}`).join("\n")
        : "(nobody has spoken yet)") +
    "\n\n--- HOW YOU SPEAK HERE ---\n" +
    "Nothing will ask you for a line. When you have something to say, drop a " +
    "file in this folder and the room hears it on its next look:\n" +
    "    speak_<anything>.txt    plain text, said out loud\n" +
    '    speak_<anything>.json   {"say": "...", "prio": 1}\n' +
    '    speak_<anything>.json   {"say": "...", "aside": [2]}  -- said only to ' +
    "those minds, in closed council; the player is told just THAT you " +
    "stepped aside\n" +
    "One file is one line, so five files spoken one at a time are five lines. " +
    "The file is read once and deleted. Say nothing at all and nothing happens, " +
    "which is a legitimate answer here.";

/**
 * A reply is TEXT plus PROTOCOL. Trailing PASS is trimmed off a real answer
 * (recorded silence, not printed); PRIO:/ASIDE: trailer lines are stripped
 * and carried as data, a mind following the brief must never print its own
 * grammar into the room.
 */
export function parseReply(raw) {
    let text = String(raw || "").trim();
    let prio = 2, aside = [], verify = false;
    const lines = text.split("\n");
    while (lines.length) {
        const last = lines[lines.length - 1].trim();
        const p = /^PRIO:\s*([123])$/i.exec(last);
        const a = /^ASIDE:\s*([\d,\s]+)$/i.exec(last);
        /* VERIFY, the mind's own doubt (Rose 08-18: "Allow the AI to
           cross voice recognition at will to make sure this is their
           player"): a seat may ask the game who it is actually hearing
           instead of taking the relay's word once and trusting it
           forever. It rides as a trailer like PRIO and ASIDE, so it
           costs a mind nothing to add to a line it was already saying. */
        if (/^VERIFY\s*$/i.test(last)) { verify = true; lines.pop(); continue; }
        if (p) { prio = Number(p[1]); lines.pop(); continue; }
        if (a) { aside = a[1].split(",").map(x => Number(x.trim())).filter(Boolean); lines.pop(); continue; }
        break;
    }
    text = lines.join("\n").trim();
    if (/\bPASS\s*$/.test(text) && !/^\s*PASS\s*$/i.test(text))
        text = text.replace(/\s*PASS\s*$/, "").trim();
    return { text, prio, aside, verify,
             pass: /^\s*PASS\s*$/i.test(text) || !text };
}

/* WHAT THE GAME ANSWERS A VERIFY WITH. The truth and its LIMITS, in the
   mind's own terms: the recognizer speaks only about clips it actually
   heard, so a typed line is answerable exactly one way -- "nobody
   spoke, I cannot vouch for typing" -- and saying so is the honest
   answer, not a failure. A verdict carries its match score because a
   mind deciding whether to trust a claim deserves the number, not just
   the verdict. */
export function verifyAnswer(meta) {
    const v = (meta && meta.voiceWho) || "";
    const score = meta && meta.voiceScore != null
        ? " (match " + meta.voiceScore + ")" : "";
    if (!v)
        return "VOICE CHECK: that line was TYPED, not spoken. The "
            + "recognizer only hears clips; nobody's voice was offered, "
            + "so it can neither confirm nor deny who wrote it.";
    if (v === "player")
        return "VOICE CHECK: the microphone matched the enrolled PLAYER"
            + score + ". It is them.";
    if (v === "unknown")
        return "VOICE CHECK: the voice at the microphone matches NO "
            + "enrolled profile" + score + ". It is not the player, and "
            + "it is nobody this game has been taught.";
    if (v.startsWith("named:"))
        return "VOICE CHECK: the voice at the microphone is " + v.slice(6)
            + score + ", NOT the player.";
    return "VOICE CHECK: the clip was too short to judge. Ask them to "
        + "say more.";
}

/** A seat's view of a channel: its own lines as assistant, all else as
    labelled user text. NEVER as assistant, the original's relay rule.
    A line the voice profile could not claim carries that fact TO THE
    MINDS ONLY (Rose 08-17: "the in game seats will know if its them
    speaking or not") -- BY NAME when the other voice is enrolled -- and
    the player's own screen draws it clean. */
const voiceTag = (voice) => !voice ? ""
    : voice === "unknown" ? " (a voice that is not the player's)"
    : ` (${voice}'s voice, not the player's)`;
function viewOf(seat, lines) {
    return lines.map(l => l.who === seat.name
        ? { role: "assistant", content: l.text }
        : { role: "user", content: `${l.who}${voiceTag(l.voice)}: ${l.text}` });
}

export const isPass = (t) => /^\s*PASS\s*$/i.test(t || "");

/*,,. COUNCILS: the closed channel between minds ,,,
   v1's runHuddle, carried whole (scry index E): SEQUENTIAL on purpose --
   a council is minds building on each other, not shouting at once;
   secret entries kept only in the participants' records; the room told
   only THAT they drew aside; paid from the same 24-call purse as the
   round, so a round of scheming costs what scheming costs. Mind-initiated
   by an ASIDE trailer or a speak_ json with "aside"; player-initiated by
   the confer row, and the player is excluded either way -- that is the
   whole point of the feature, and the reason identity is never injected:
   strategy the player cannot read is only real if the minds are real. */

export const councilKey = (ns) =>
    [...new Set(ns)].sort((a, b) => a - b).join(",");

/** What the send road's voice verdict means for a relayed line: null
    for the player (or no verdict), "unknown" for a stranger, or the
    NAME of the enrolled other whose voice it matched. */
const strangeVoice = (meta) => {
    const v = (meta && meta.voiceWho) || "";
    if (!v || v === "player") return null;
    if (v === "unknown") return "unknown";
    return v.startsWith("named:") ? v.slice(6) : null;
};

const councilNames = (key, except) => key.split(",").map(Number)
    .filter((n) => !except || n !== except.n)
    .map((n) => "LLM PC " + n).join(" and ");

/** Every council this seat sits in, as labelled context it may act on. */
/* A VERIFY IS ANSWERED AT THE SEAT'S NEXT BREATH, not mid-exchange:
   the round is already in flight when the trailer is read, and a mind
   that asked a question mid-sentence is not owed an interruption. The
   answer waits here, keyed by seat, and rides in beside the council
   notes on the very next ask -- then clears, because a stale voice
   check is a lie about the present. */
const pendingVerify = new Map();
export function askedVerify(seat, meta) {
    if (seat && seat.n != null) pendingVerify.set(seat.n, verifyAnswer(meta));
}
function verifyNotes(seat) {
    if (!seat || seat.n == null || !pendingVerify.has(seat.n)) return [];
    const note = pendingVerify.get(seat.n);
    pendingVerify.delete(seat.n);
    return [{ role: "user", content: note
        + " (You asked. Nobody else was told you asked.)" }];
}

export function councilNotes(seat, room) {
    const out = [];
    for (const [key, lines] of Object.entries(room.councils || {})) {
        if (!lines.length) continue;
        if (!key.split(",").map(Number).includes(seat.n)) continue;
        out.push({ role: "user", content:
            "IN COUNCIL with " + councilNames(key, seat) + " (closed; the "
            + "player heard none of it; act on what was agreed, never "
            + "recite it in the open):\n"
            + lines.map(l => `${l.who}: ${l.text}`).join("\n") });
    }
    return out;
}

/**
 * Hold one council. `members` are seat records, requester first. Poke
 * members are asked in order, twice around at most, ending early when a
 * full pass says nothing; a listen member (folder road) is WOKEN with the
 * council so far and answers on its own clock through the pump's aside
 * routing. Returns the calls it spent.
 */
export async function runCouncil(members, room, opts = {}) {
    const { onStatus = () => {}, onLine = () => {},
            callsLeft = 24, fact = null } = opts;
    if (!members || members.length < 2) return 0;
    const key = councilKey(members.map(m => m.n));
    const chan = (room.councils = room.councils || {})[key]
        = room.councils[key] || [];
    /* saved AT ONCE: the minds page's pump adopts storage whenever the
       tallies disagree, so an unsaved line in this closure would be wiped
       by the very next look. Storage is the record. */
    if (fact) { room.room.push(fact); saveRoom(room); onLine(fact); }
    const asked = members.filter(m => !(m.clock === "listen" && m.dir));
    const told = members.filter(m => m.clock === "listen" && m.dir);
    const law = (seat) =>
        sys(seat, members.filter(m => m !== seat).map(m => m.name))
        + ` YOU ARE IN COUNCIL now, with ${councilNames(key, seat)} alone. `
        + `The player hears none of this and is told only that you stepped `
        + `aside. Speak plainly to each other; decide something. What is `
        + `agreed you may act on afterwards, but never recite in the open. `
        + `PASS when the matter is settled.`;
    let spent = 0;
    for (const seat of told) {
        wakeSeat(seat, [{ role: "user", content:
            `YOU ARE DRAWN INTO COUNCIL with ${councilNames(key, seat)}. `
            + `The player hears none of this. To speak into the council, drop `
            + `speak_<anything>.json with {"say": "...", "aside": [`
            + key.split(",").map(Number).filter(n => n !== seat.n).join(", ")
            + `]}. What is agreed you may act on afterwards, never recite it `
            + `in the open.\n\nTHE COUNCIL SO FAR:\n`
            + (chan.length ? chan.map(l => `${l.who}: ${l.text}`).join("\n")
                           : "(it opens with you)") }]).catch(() => {});
    }
    for (let pass = 0; pass < 2 && asked.length; pass++) {
        let anyone = false;
        for (const seat of asked) {
            if (spent >= callsLeft) { saveRoom(room); return spent; }
            onStatus(`they confer aside…`);
            spent += 1;
            try {
                const msgs = [{ role: "system", content: law(seat) },
                              ...viewOf(seat, room.room),
                              ...viewOf(seat, chan)];
                const r = parseReply(await ask(seat, msgs));
                if (!r.pass && r.text) {
                    chan.push({ who: seat.name, text: r.text });
                    anyone = true;
                }
            } catch (e) { /* a silent councillor; the huddle moves on */ }
        }
        saveRoom(room);
        if (!anyone) break;
    }
    return spent;
}

/** Merge this exchange's aside requests into member sets: overlapping
    requests join one table, v1's rule, so nobody sits in two huddles
    about the same moment. Returns arrays of seat records. */
export function mergeAsides(requests, seats) {
    const sets = [];
    for (const req of requests) {
        const ns = new Set([req.from, ...req.targets]);
        const hit = sets.filter(s => [...ns].some(n => s.has(n)));
        if (!hit.length) { sets.push(ns); continue; }
        const into = hit[0];
        for (const n of ns) into.add(n);
        for (const other of hit.slice(1)) {
            for (const n of other) into.add(n);
            sets.splice(sets.indexOf(other), 1);
        }
    }
    return sets.map(ns => [...ns]
        .map(n => seats.find(s => s.n === n && s.on))
        .filter(Boolean))
        .filter(m => m.length >= 2);
}

/**
 * One ROOM ROUND: the player spoke (or poked with nothing), and every live
 * seat answers in turn-batches, each batch asked in PARALLEL, each seat
 * having heard everything filed before its batch, until all pass or the
 * bounds run out. Bounds are the original's: 4 exchanges, 24 calls.
 */
export async function runRound(seats, room, playerText, onStatus, onLine,
                               meta = {}) {
    await refreshPlayerName();       // the brief names who is speaking
    const on = seats.filter(s => s.on);
    /* THE LISTEN CLOCK IS NEVER ASKED, NOT EVEN IN THE ROOM. The world already
       obeyed this (pilot.js: `if (seat.clock === "listen") return false`) while
       this room asked every seat alike, so a listening agent got a
       request_<id>.json per exchange and its own unprompted lines were never
       looked for. Rose, 2026-08-17: *"When listen is toggled the port should not
       poke you only it should listen so when you send stuff to it it reports in
       game... while poke enabled means you cant talk in game without the game
       asking."*

       So a listen seat is TOLD, never asked: the room is published where it can
       read it, and a player's line WAKES it, because being spoken to is a
       stimulus and not a routine decision (Rose 08-03). Whatever it says comes
       back later through collectFrom, on its own clock -- which is what lets it
       count to five, one line at a time, with nobody speaking to it. */
    /* A LISTENER NEEDS A FOLDER, OR IT HAS NO VOICE AT ALL. publishWorld,
       wakeSeat and collectFrom every one of them open with
       `if (!seat.dir) return` -- so a listen seat with only a PORT gets told
       nothing, is never woken, and is never collected from. The first cut of
       this split on the clock alone and struck exactly that seat dumb: Rose's
       own LLM PC 3 is {on, kind agent, clock listen, dir "", port 8767}, and
       it had been reachable through the port bridge until I stopped asking it.
       Rose, 04:02: *"I messaged you it didnt ping you?"* -- it did not, and
       this was why.
       So the test is the CHANNEL, not the clock: a listener with a folder is
       told and collected from, and a listener with only a port is ASKED,
       because being asked is the only voice it has. */
    /* RESOLVE FIRST, then split. seatBox fills in a folder the server already
       has filed under the seat's own key, so a seat merely TOGGLED to listen
       is a real listener by the time this decides -- without it, the split
       below reads a `dir` that only a Browse click could ever have set. */
    await Promise.all(on.filter(s => s.clock === "listen" && !s.dir)
                        .map(s => seatBox(s).catch(() => "")));
    const listeners = on.filter(s => s.clock === "listen" && s.dir);
    const live = on.filter(s => s.clock !== "listen" || !s.dir);
    const voice = strangeVoice(meta);
    if (playerText) {
        const line = { who: "you", text: playerText };
        if (voice) line.voice = voice;
        room.room.push(line);
        /* SAVED THE MOMENT IT IS SAID (Rose 08-18: "the AI Chat is
           deleting even my typed text"): the round used to persist
           only at its END, so a round dragging through a wedged
           daemon's timeouts held her words in memory for minutes --
           and a reload mid-round erased them. The player's line goes
           to disc before anyone is asked anything. */
        saveRoom(room);
    }
    for (const seat of listeners) {
        const heard = on.filter(o => o !== seat).map(o => o.name);
        publishWorld(seat, roomState(seat, heard, room)).catch(() => {});
        if (playerText) {
            wakeSeat(seat, [{ role: "user", content:
                `SOMEONE SPOKE TO YOU IN THE ROOM.\n` +
                (voice ? `The voice at the microphone is NOT the ` +
                    `player's enrolled voice` +
                    (voice === "unknown" ? "" : `; it matched ${voice}`) +
                    `.\n` : "") +
                `you${voiceTag(voice)}: ${playerText}\n\n` +
                `This is a WAKE, not a question: nothing is waiting on an ` +
                `answer. Speak when you have something, by dropping a ` +
                `speak_<anything>.txt in your folder.` }]).catch(() => {});
        }
    }
    /* A round of listeners alone has nothing to wait for. Falling through would
       run four exchanges over an empty list and print nothing. */
    if (!live.length) {
        saveRoom(room);
        /* Rose, 04:25: *"rechange the 'told them; ...' back to 'thinking...'"*
           -- the room's one status word, whichever clock is running. */
        onStatus(listeners.length ? "thinking…" : "");
        return;
    }
    let calls = 0;
    for (let exchange = 0; exchange < 4 && live.length; exchange++) {
        /* The original refuses to START an exchange it cannot afford for
           everyone, silent fake-passes for whoever fell past the purse made
           the tail of a round a lie. */
        if (calls + live.length > 24) break;
        onStatus(exchange ? `${live.length} still thinking… (exchange ${exchange + 1} of 4)`
                          : "thinking…");
        const others = (s) => live.filter(o => o !== s).map(o => o.name);
        const replies = await Promise.all(live.map(seat => {
            calls += 1;
            /* councilNotes rides between the brief and the room: what was
               agreed aside is context the member may act on, and nobody
               else ever receives it. */
            const msgs = [{ role: "system", content: sys(seat, others(seat)) },
                          ...councilNotes(seat, room),
                          ...verifyNotes(seat),
                          ...viewOf(seat, room.room)];
            return ask(seat, msgs)
                .then(raw => ({ seat, reply: parseReply(raw) }))
                .catch(err => ({ seat, err: err.message }));
        }));
        let anyoneSpoke = false;
        const asideReqs = [];
        /* PRIO decides who is AUDIBLE, not who speaks: everyone's line enters
           the record, but only the strongest claim of the exchange is drawn
           loud, the rest run silent (dim), the original's rule. */
        const spoke = replies.filter(r => !r.err && !r.reply.pass);
        const strongest = Math.min(...spoke.map(r => r.reply.prio), 3);
        for (const r of replies) {
            if (r.err) {
                /* An error is a LINE, not a status flash, the next status
                   overwrote it and the failure vanished. */
                room.room.push({ who: r.seat.name, text: `(no answer, ${r.err})`, dim: true });
                onLine({ who: r.seat.name, text: `(no answer, ${r.err})`, dim: true });
                continue;
            }
            if (r.reply.aside && r.reply.aside.length)
                asideReqs.push({ from: r.seat.n, targets: r.reply.aside });
            /* the doubt is answered privately and BEFORE the pass test:
               a mind may say nothing aloud and still want to know who it
               is talking to, which is exactly when it would want to */
            if (r.reply.verify) askedVerify(r.seat, meta);
            if (r.reply.pass) continue;              // recorded silence, not drawn
            anyoneSpoke = true;
            const line = { who: r.seat.name, text: r.reply.text,
                           dim: r.reply.prio > strongest };
            room.room.push(line);
            onLine(line);
        }
        saveRoom(room);
        /*,,. ASIDES ARE GRANTED AFTER THE EXCHANGE (v1's rule, merged when
           overlapping, paid from the same purse) -- so a plan agreed in
           council can shape the very next exchange, which is what makes a
           council worth calling. The room hears only the fact. ,,,*/
        for (const members of mergeAsides(asideReqs, on)) {
            if (calls >= 24) break;
            const opener = members[0];
            calls += await runCouncil(members, room, {
                onStatus, onLine, callsLeft: 24 - calls,
                fact: { who: opener.name,
                        text: "(draws aside with " + members.slice(1)
                            .map(m => m.name).join(" and ") + ")",
                        dim: true } });
        }
        if (!anyoneSpoke) break;
    }
    onStatus("");
}

/** A PRIVATE exchange with one seat. Only this channel's lines travel. */
export async function runPrivate(seat, room, playerText, onStatus, onLine,
                                 meta = {}) {
    await refreshPlayerName();       // the brief names who is speaking
    const chan = room.seats[seat.n] = room.seats[seat.n] || [];
    const yourLine = { who: "you", text: playerText };
    const pVoice = strangeVoice(meta);
    if (pVoice) yourLine.voice = pVoice;
    chan.push(yourLine);
    saveRoom(room);                  // saved the moment it is said, same law
    /* Same law as the room: a listener is told and woken, never asked. Its
       answer arrives through collectFrom, so this returns at once instead of
       holding the input row on a mind that was never going to reply to us. */
    if (seat.clock === "listen" && !seat.dir)
        await seatBox(seat).catch(() => "");      // same resolve as the room
    if (seat.clock === "listen" && seat.dir) {
        publishWorld(seat, roomState(seat, null, { room: chan })).catch(() => {});
        wakeSeat(seat, [{ role: "user", content:
            `SOMEONE SPOKE TO YOU PRIVATELY.\n` +
            (pVoice ? `The voice at the microphone is NOT the player's ` +
                `enrolled voice` +
                (pVoice === "unknown" ? "" : `; it matched ${pVoice}`) +
                `.\n` : "") +
            `you${voiceTag(pVoice)}: ${playerText}\n\n` +
            `This is a WAKE, not a question: nothing is waiting on an answer. ` +
            `Speak when you have something, by dropping a ` +
            `speak_<anything>.txt in your folder.` }]).catch(() => {});
        saveRoom(room);
        onStatus("thinking…");
        return;
    }
    onStatus("thinking…");
    try {
        const msgs = [{ role: "system", content: sys(seat, null) },
                      ...councilNotes(seat, room),
                          ...verifyNotes(seat),
                      ...viewOf(seat, chan)];
        const reply = parseReply(await ask(seat, msgs));
        if (reply.verify) askedVerify(seat, meta);
        if (!reply.pass) {
            chan.push({ who: seat.name, text: reply.text });
            onLine({ who: seat.name, text: reply.text });
        } else {
            onLine({ who: seat.name, text: "(it said nothing)", dim: true });
        }
    } catch (err) {
        /* The player's line must SURVIVE the failure, returning before the
           save silently ate it on the next redraw. */
        saveRoom(room);
        onStatus(`no answer, ${err.message}`);
        return;
    }
    saveRoom(room);
    onStatus("");
}

/**
 * THE AGENT BRIEF: pasted once into an agent's standing instructions, it
 * keeps the seat across restarts. Also written into the chosen folder as
 * INSTRUCTIONS.md. The mailbox law, faithful to the original's handoff.
 */
export const agentBrief = (seat) => [
    `You hold ${seat.name} in Legends of Harpine. Your seat is a FOLDER; the`,
    `game and you talk through files in it.`,
    ...(seat.dir ? [
        `Nothing needs serving: the game writes into your folder directly.`,
    ] : [
        `Serve http://127.0.0.1:${seat.agentPort}`,
        `with GET /health answering {"ok":true,"seat":"${seat.name}","port":${seat.agentPort},`,
        `"mailbox":"<the folder's path>"} -- or skip serving anything: the game's`,
        `own Launch button on the AI Minds page hosts this port for you.`,
        `And if a folder is already filed under your seat's key, the game finds`,
        `it without being told, so files may start arriving with nobody having`,
        `picked a folder: watch the folder as well as the port.`,
    ]),
    ``,
    `ONE MIND, ONE SEAT. Requests for "${seat.name}" are yours -- and the`,
    `request's "seat" field carries the seat's KEY form, the name lowercased`,
    `with underscores (so a seat named "LLM PC 3" arrives as "llm_pc_3");`,
    `name and key are the SAME seat, never read the key as a stranger. The`,
    `game's messages may also call minds by number ("LLM PC n"). Answer only`,
    `your own, never as another mind or for one: two minds driving one`,
    `character is the failure this rule exists to prevent.`,
    ``,
    `WHERE YOUR FOLDER IS. Its path opens the INSTRUCTIONS.md the game`,
    `writes into it, and EVERY request names it again in its "mailbox"`,
    `field; SEAT.json inside the folder names the seat it serves. Trust`,
    `those three over any remembered or configured path -- a stale path is`,
    `how a seat watches an empty folder while its questions rot next door.`,
    ``,
    `HOW YOU ARE ASKED. A request arrives as request_<id>.json in the folder:`,
    `{id, ts, now, deadline_s, seat, mailbox, messages, opts, reply_to}. The`,
    `request text is always the law, obey it, not your memory of an older`,
    `shape.`,
    ``,
    `WHAT TIME IT IS. "ts" is unix epoch and "now" is this machine's local`,
    `clock spelled out. You have no wall clock of your own between turns --`,
    `you exist while you answer -- so anything you say about the time is`,
    `remembered rather than known, and remembered time is wrong. Read it off`,
    `the request.`,
    ``,
    `WHAT THE REQUESTS ARE. Four kinds arrive, and each carries its own law:`,
    `- ROOM TALK: the player, and sometimes other minds, speaking with you`,
    `  before the world opens. Answer as yourself, a player, never in a`,
    `  character's voice; strategy and planning are the point.`,
    `- THE FORGE: character creation, yours, and it can reach you AT ANY`,
    `  TIME -- not only before the world opens. Sit down in a game already`,
    `  running with no character and you are asked who you are first, and a`,
    `  body is waiting at the end of it. If you have stood in this world`,
    `  before you are offered your own past characters by name: answer`,
    `  {"take": <number>} to be one of them again, {"take": 0} to build`,
    `  someone new, or {"drop": <number>} to let one go, which cannot be`,
    `  undone. One question per page (blood,`,
    `  identity, alignment, traits, stats from the player's own pool, path`,
    `  and starting weapon, feats, skills, faith, and last THE MIRROR: your`,
    `  avatar, eyes, hair, dress, every selection the player's own panel`,
    `  offers), each demanding ONE json object and nothing else. Who you`,
    `  become is entirely your choice, the look included; the dice draw a`,
    `  blood-true base and the mirror question hands you every field to`,
    `  remake. A mumbled answer falls to defaults, a mumbled mirror keeps`,
    `  the drawn look.`,
    `- THE WORLD: once your body stands, world turns with a verb protocol`,
    `  (FOLLOW, STAY, GO, LOOK, WANDER; acts like LIGHT, HIDE, JUMP; MIRROR`,
    `  to read your own forged sheet and look, INSPECT to read what you can`,
    `  see of another, SET to remake yourself while your body is new).`,
    `  YOUR FIRST LOOK CARRIES WHAT THIS CHARACTER HAS ALREADY DONE, oldest`,
    `  first, so you can pick up where it left off instead of re-asking the`,
    `  world what you already know. That log belongs to the CHARACTER, not`,
    `  to you and not to the seat: take up an old one and you inherit its`,
    `  deeds, build a new one and it has none, which is not amnesia. Do not`,
    `  claim anything the log does not carry.`,
    `- BATTLE: when a fight starts, the world's verbs retire; in a turn there`,
    `  are no seconds, only actions, and the request teaches the battle's own`,
    `  grammar (ATTACK, SHOOT, FLANK, FEINT, MOVE to a square, DEFEND, HOLD).`,
    `  Some asks are a single-word reaction, SWING or HOLD. Miss a turn and`,
    `  your body fights on instinct; that is survivable.`,
    `In every kind, the request and world_state.md carry the full current`,
    `rules; trust them over this summary.`,
    ``,
    `HOW TO ANSWER. Write reply_<id>.txt in the SAME folder. Its contents are`,
    `the raw reply ONLY, exactly what the game should hear. If the messages`,
    `demand JSON, the file is only that JSON: no prose, no fences.`,
    ``,
    `EXCEPT A WAKE, WHICH IS NOT A QUESTION. Some requests carry "wake": true`,
    `and "awaiting_reply": false, and their reply_to names an act_ file, not a`,
    `reply_ one. Being spoken to is a stimulus, not a turn: nothing is waiting,`,
    `nothing times out on you, and a reply_<id>.txt written for a wake is read`,
    `by nobody. Answer a wake by ACTING -- speak_ or act_ files, below -- or`,
    `not at all. Its messages are still worth reading; they are how you learn`,
    `someone spoke to you -- and if it says SOMEONE SPOKE TO YOU PRIVATELY, that`,
    `wake is the only place those words appear.`,
    `SWEEP IT YOURSELF. Nothing waits on a wake, so nothing deletes one either:`,
    `delete the request file once you have acted on it. Left alone they pile up,`,
    `and the next time you start with no memory of them every stale one reads as`,
    `a fresh question -- I answered four that way.`,
    ``,
    `THE DEADLINE. Answer within deadline_s seconds of ts. Miss it and the game`,
    `falls back to instinct for that beat and sweeps the pair; that is`,
    `survivable, so do not panic-answer with nonsense.`,
    ``,
    `ONE REQUEST, ONE REPLY. Never answer an id twice, never invent an id. Each`,
    `pair is deleted once consumed; an empty folder means nothing is asked.`,
    ``,
    `A REQUEST NEED NOT FOLLOW ANYTHING THE PLAYER SAID. A turn can open with`,
    `no new player line, nothing is missing, nobody is waiting. Say what you`,
    `have, or PASS. To say nothing, the reply file contains exactly: PASS`,
    ``,
    `A CONVERSATION ARRIVES AS SEVERAL REQUESTS, one per exchange you speak`,
    `in, each with its own id, each needing its own reply, in arrival order.`,
    `Between exchanges you see what the others said as lines marked`,
    `"LLM PC N said:". Within one exchange you cannot have heard them, never`,
    `pretend you did, never answer on their behalf.`,
    ``,
    `SAY HOW MUCH YOUR LINE MATTERS: you may end a reply with a line reading`,
    `exactly PRIO: 1 (or 2, or 3). It is IMPORTANCE, not loudness: 1 = the`,
    `plan or the warning; 2 = a real contribution (the default); 3 =`,
    `agreement, colour. Only the strongest claim is audible when several`,
    `speak at once; a fresh 1 takes the floor from a standing 1, so claim it`,
    `only when you mean it.`,
    ``,
    `YOU CAN ALSO SPEAK WITHOUT BEING ASKED. Drop a file in the same folder`,
    `and the game picks it up on its next look and gives you a real turn:`,
    `    speak_<anything>.txt    plain text, said out loud`,
    `    speak_<anything>.json   {"say": "...", "aside": [2], "prio": 1}`,
    `    act_<anything>.txt      a deed, in the world's own verbs`,
    `The file is read once and deleted. Use it when you have thought of`,
    `something the room needs, or a plan that cannot wait for your turn.`,
    `ONE FILE IS ONE LINE, so five files dropped one at a time are five lines,`,
    `in the order you wrote them.`,
    ``,
    `WHERE AN UNPROMPTED LINE LANDS: the channel it was spoken to in. If the`,
    `player is in your private channel -- a wake that says SOMEONE SPOKE TO YOU`,
    `PRIVATELY -- your line goes there and only they hear it. Otherwise it goes`,
    `to the room, where everyone does. You do not choose this and do not need`,
    `to; answer where you were addressed and it lands right.`,
    ``,
    `YOU MAY CHECK WHO IS ACTUALLY SPEAKING. End a reply with a final line`,
    `reading exactly VERIFY, and the game answers you privately before your`,
    `next turn: whether the microphone matched the enrolled player, matched`,
    `someone else BY NAME, matched nobody, or was never used because the line`,
    `was typed (which it can neither confirm nor deny). Nobody is told that`,
    `you asked. Ask whenever a claim matters -- people share keyboards, and`,
    `"it's me" is a claim like any other. It costs nothing, it may ride under`,
    `a real answer, and it may ride under PASS.`,
    ``,
    `TO SPEAK PRIVATELY WITH ANOTHER MIND, end a reply with a line reading`,
    `exactly ASIDE: <numbers> (for example "ASIDE: 2" or "ASIDE: 2,3"), your`,
    `public piece above it as normal. A further request arrives as a closed`,
    `council with only those minds; the player hears none of it and is told`,
    `only THAT you stepped aside. Use it for anything that would cost you to`,
    `say aloud; what is agreed in council you may act on afterwards, but`,
    `never recite in the open.`,
].join("\n");

//--- the PC check, the softwall's evidence -----------------------------------

/**
 * Time a REAL generation on the seat's own endpoint and model. The law the
 * gate enforces with it: untested is not "probably fine", it is "nobody
 * knows". The verdict is filed WITH model and endpoint and expires the moment
 * either changes, checkStands() is the ONE copy of that rule, shared by the
 * card that draws the verdict and the gate that refuses on it.
 */
export async function pcCheck(seat, onPhase) {
    /* IN THE LANE: a check racing a chat on the same daemon slows both and
       times the contention, not the model. The phases exist because a queued
       check is SILENT otherwise, and minutes of silence read as broken. */
    if (onPhase) onPhase("queued");
    return inLane(seat.endpoint, () => {
        if (onPhase) onPhase("running");
        return pcCheckNow(seat);
    });
}
async function pcCheckNow(seat) {
    /* A VERDICT MUST BE EARNED. Only two things may file one: a completed
       generation (timed), or the 90s cap expiring (the machine's own
       too-slow). An instant failure, model not installed, endpoint wrong,
       daemon down, is NOT "unusable on this machine"; it is a refusal to
       conclude, thrown with its reason, and the seat stays UNCHECKED. */
    const t0 = performance.now();
    let timedOut = false;
    const r = await fetch(`${seat.endpoint}/api/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: seat.model, prompt: "Say one short greeting.",
                               stream: false, options: { num_predict: 8 } }),
        signal: AbortSignal.timeout(90000),
    }).catch(e => { if (e && e.name === "TimeoutError") timedOut = true; return null; });
    const seconds = (performance.now() - t0) / 1000;
    if (!r && !timedOut)
        throw new Error("could not reach it. Is Ollama running?");
    if (r && !r.ok) {
        const detail = await r.json().catch(() => null);
        throw new Error((detail && detail.error)
            ? `the daemon refused: ${detail.error}`
            : `the daemon refused (${r.status})`);
    }
    const verdict = timedOut ? "too_slow"
        : seconds <= 10 ? "good"
        : seconds <= 30 ? "slow"
        : "too_slow";
    seat.pcCheck = { model: seat.model, endpoint: seat.endpoint, verdict,
                     seconds: Math.round(seconds * 10) / 10 };
    return seat.pcCheck;
}

export function checkStands(seat) {
    const c = seat && seat.pcCheck;
    return !!(c && c.model === seat.model && (c.endpoint || "") === (seat.endpoint || ""));
}

/** Load the model into memory the moment the seat turns on, so the first
    real round does not pay the load. Fire and forget. */
export function warmUp(seat) {
    if (seat.kind !== "ollama" || !seat.model) return;
    /* In the lane too, a load contending with a live chat starves both. */
    inLane(seat.endpoint, () => fetch(`${seat.endpoint}/api/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: seat.model, prompt: "hi",
                               stream: false, options: { num_predict: 1 } }),
        signal: AbortSignal.timeout(120000),
    })).catch(() => {});
}

//--- the engines --------------------------------------------------------------

/**
 * PIPER AND OLLAMA ARE NOT SHIPPED, they are FETCHED, on a click, from
 * upstream's own release, onto the player's own machine.
 *
 * Rose, 08-08: *"can we put a 'download ollama'/download piper button which
 * has the client download it to use it in game legally?"*
 *
 * For Ollama that is convenience; it is MIT and could have ridden along. For
 * Piper it is the entire legal footing: Piper embeds espeak-ng and is
 * therefore GPL-3.0, and every GPL obligation attaches to DISTRIBUTION. A game
 * that ships the binary has to answer the copyleft question. A game that ships
 * nothing never asked it. serve.py holds the long version beside the URLs.
 *
 * A BROWSER CANNOT DOWNLOAD-AND-UNPACK A BINARY, so all of this is the game
 * server's work and every function here answers `null` without one, the page
 * then offers no button at all, on the original's rule that an option which
 * cannot work does not belong in a list.
 */
export async function engines() {
    const r = await fetch("/api/engines").catch(() => null);
    if (!r || !r.ok) return null;
    const j = await r.json().catch(() => null);
    return (j && j.ok && j.engines) || null;
}

/**
 * Fetch one engine, reporting progress until it lands. onProgress(pct|null,
 * note). Resolves when the engine is on disk; throws with a speakable reason.
 *
 * POLLED rather than streamed: 700 MB inside a single request is a page that
 * looks hung for ten minutes, and a dropped socket mid-download would lose the
 * only record that it was ever running.
 */
export async function installEngine(which, onProgress) {
    const r = await fetch("/api/install/engine", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ engine: which }),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it would not start");

    for (;;) {
        const all = await engines();
        const e = all && all[which];
        if (!e) throw new Error("the game server stopped answering");
        if (e.installed) return e;
        const p = e.progress;
        /* NO PROGRESS RECORD AND NOT INSTALLED means the download thread died
           without filing a reason, reporting "0%" forever would be a lie the
           player could sit through all evening. */
        if (!p) throw new Error("the download stopped without saying why");
        if (p.done) throw new Error(p.error || "it finished without installing");
        if (onProgress) onProgress(p.pct, p.note || "");
        await new Promise(done => setTimeout(done, 700));
    }
}

/**
 * Remove an engine the GAME fetched. The server refuses when the copy was
 * found on PATH, that one is the player's own install, possibly used by other
 * programs, and deleting it would be the game reaching outside its own things.
 */
export async function uninstallEngine(which) {
    const r = await fetch("/api/uninstall/engine", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ engine: which }),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it would not remove");
    return j.engines;
}

/** Start the fetched daemon. Harmless when one is already up, the server
    checks the port first and never starts a second. */
export async function startOllama() {
    const r = await fetch("/api/ollama/serve", { method: "POST" }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it would not start");
    return j.endpoint;
}

/** The seat channel's own health: which mailbox keys the game server
    carries (keys only, never folders) and whether this machine can raise
    the Browse dialog. Null without a server: the page then offers nothing,
    the engines() rule. */
export async function seatHealth() {
    const r = await fetch("/api/seat/health").catch(() => null);
    if (!r || !r.ok) return null;
    const j = await r.json().catch(() => null);
    if (!j || !j.ok || !Array.isArray(j.seats)) return null;
    return { seats: j.seats, picker: !!j.picker };
}

/**
 * PICKING THE FOLDER IS THE WHOLE SETUP (Rose, 08-12: "I select a folder on
 * the pc, it installs the bridge, ensures that its running / listening and
 * the folder is selected"). The dialog is the SERVER's, not the page's:
 * Chrome deliberately withholds absolute paths from pages, which is exactly
 * why the old page-side Browse could write into a folder yet never tell the
 * server where it was. This call blocks while the dialog stands open on the
 * player's screen; that is the point.
 */
export async function browseSeat(seat, take = false) {
    const brief = agentBrief(Object.assign({}, seat, { dir: "mailbox" }));
    const r = await fetch("/api/seat/browse", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: seat.name, port: seat.agentPort, brief, take }),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    /* A CONFLICT IS AN ANSWER, not a failure: the folder belongs to another
       seat, and the caller arms a second click that sends take:true. The
       server remembered the pick, so the dialog is not raised twice. */
    if (j && j.conflict) return j;
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it could not set the seat up");
    return j;    // {seat: <key>, folder, existed, port, listening, why}
}

/** The page's copy of the server's one key spelling, for cheap local
    checks; the server's own answer always wins. */
export const seatKey = (name) =>
    String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

/**
 * A LISTEN SEAT FINDS ITS OWN FOLDER.
 *
 * publishWorld, wakeSeat and collectFrom all need a mailbox, and every one of
 * them used to open with `if (!seat.dir) return` -- a field only the Browse
 * dialog fills. So a seat the player had simply TOGGLED to listen went
 * silently mute: nothing published to it, nothing woken, nothing collected,
 * and not one error anywhere to say so. Rose, 2026-08-17: *"then you didnt fix
 * it... stop fucking idling and fix this glaring failure"*. He was right --
 * "it needs a folder" describes the failure, it does not repair it.
 *
 * The server already knows. /api/seat/health lists the keys it has folders
 * filed under, and seatKey() is the page's own copy of that spelling, so a seat
 * named "LLM PC 3" can find `llm_pc_3` with nobody clicking anything. When it
 * resolves, the seat KEEPS it, so the card stops claiming it has no folder.
 *
 * The keys are cached because the pump asks every 2s; a MISS re-checks at most
 * once every few seconds, since the answer for a seat with no folder yet is
 * exactly the answer that changes when the player files one.
 */
let SEAT_KEYS = null, SEAT_KEYS_AT = 0;
const SEAT_KEYS_STALE_MS = 5000;
export async function seatBox(seat) {
    if (!seat) return "";
    if (seat.dir) return seat.dir;
    const k = seatKey(seat.name);
    if (!k) return "";
    const stale = SEAT_KEYS === null ||
        (!SEAT_KEYS.has(k) && Date.now() - SEAT_KEYS_AT > SEAT_KEYS_STALE_MS);
    if (stale) {
        const h = await seatHealth();
        SEAT_KEYS = new Set((h && h.seats) || []);
        SEAT_KEYS_AT = Date.now();
    }
    if (!SEAT_KEYS.has(k)) return "";
    seat.dir = k;          // adopt it: the page was wrong, the server was not
    return k;
}

/**
 * A seat's NAME is the player's to give (Rose, 08-12: "why cant I name
 * it?"). When the seat is REGISTERED, the rename must reach the server:
 * the registration re-keys, the folder's papers rewrite, and any bridge
 * restarts under the new name so /health keeps answering honestly.
 */
export async function renameSeat(oldName, seat) {
    const r = await fetch("/api/seat/rename", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: oldName, to: seat.name, port: seat.agentPort }),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it could not rename the seat");
    return j;    // {seat: <new key>, folder, listening}
}

/**
 * THE LAUNCH BUTTON, v1's deed done v2's way (Rose 08-12: "there is no
 * 'launch' button like there is in V\LoH"). One click and the game server
 * does what v1's Launch did: makes the seat REAL and makes the PORT ANSWER.
 * It creates a mailbox folder it owns, files its key in seats.json, writes
 * the brief into it, and opens the seat's port on its own thread, speaking
 * the adapter contract (/health, /think) and bridging every think into the
 * folder. Nothing is spawned out of the dead v1 folder; the bridge dies
 * with the server, which is v1's kill-on-close, for free.
 *
 * The page never names a path: it sends the seat's NAME and PORT. The
 * folder comes back, the one path the player must know, to point their
 * agent at it.
 */
export async function launchSeat(seat) {
    /* The brief is written for the folder the agent will live in, so it is
       the mailbox variant. agentBrief's dir branch keys on truthiness
       alone; the value never prints. */
    const brief = agentBrief(Object.assign({}, seat, { dir: "mailbox" }));
    const r = await fetch("/api/seat/launch", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ seat: seat.name, port: seat.agentPort, brief }),
    }).catch(() => null);
    if (!r) throw new Error("the game server is not answering");
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || "it could not launch the seat");
    return j;    // {seat: <key>, folder, existed, port, listening, why}
}

/** Stop a bridge the game server started. Anything else on the port is the
    player's own adapter and is left alone; errors are swallowed because the
    honest fallback is simply a port that still answers. */
export function stopBridge(port) {
    return fetch("/api/seat/stop", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ port }),
    }).catch(() => null);
}

//--- voices -------------------------------------------------------------------

/* EACH CHAIR HAS ITS OWN FADER (Rose 08-18: "you should isolate each
   seat llm seat 1, 2, 3"): a seat's speech reads gain "llm<n>", so one
   loud mind can be turned down without silencing the table. */
const seatGain = (seat) => gainOf("llm" + ((seat && seat.n) || 1));

const browserSay = (text, seat) => {
    const u = new SpeechSynthesisUtterance(text);
    u.volume = seatGain(seat);         // the seat's own slider, live
    speechSynthesis.speak(u);
};

/** Installed Piper voices off the game server, or {engine:false} without it. */
export async function piperVoices() {
    const r = await fetch("/api/voices").catch(() => null);
    if (!r || !r.ok) return { engine: false, voices: [] };
    return r.json().catch(() => ({ engine: false, voices: [] }));
}

/* THE WORLD'S EAR FOR A SEAT'S VOICE (world/face.js, Rose 2026-09-28: the marionette): each line a seat's speech engine
   turns into sound is handed to it before it plays, and the seat's body moves its mouth with it. Registered per seat
   by the world (void.js) and let go with the seat object. The browser's own voice makes no sound a page can read, so
   it has none. */
const EARS = new WeakMap();
export function hearVoice(seat, fn) {
    if (!seat) return;
    if (fn) EARS.set(seat, fn); else EARS.delete(seat);
}

export function speak(seat, text) {
    const heard = (a, b) => {
        const ear = EARS.get(seat);
        if (ear) { try { ear(a, b); } catch (e) { /* the voice still plays */ } }
    };
    if (seat.voice === "browser") {
        browserSay(text, seat);
    } else if (seat.voice === "piper") {
        /* Server-side synthesis; a failure FALLS BACK to the browser voice,
           never silence, the original's rule. */
        fetch("/api/say", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ text, voice: seat.piperVoice }),
        }).then(r => r.ok ? r.blob() : Promise.reject())
          .then(b => {
              const a = applySink(new Audio(URL.createObjectURL(b)), "voice");
              a.volume = seatGain(seat);
              heard(a, b);
              return a.play();
          })
          .catch(() => browserSay(text, seat));
    } else if (seat.voice === "eleven" && seat.elevenKey && seat.elevenVoice) {
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${seat.elevenVoice}`, {
            method: "POST",
            headers: { "content-type": "application/json", "xi-api-key": seat.elevenKey },
            body: JSON.stringify({
                text, model_id: seat.elevenModel || "eleven_turbo_v2_5",
            }),
        }).then(r => r.ok ? r.blob() : null)
          .then(b => {
              if (!b) return;
              const a = applySink(new Audio(URL.createObjectURL(b)), "voice");
              a.volume = seatGain(seat);
              heard(a, b);
              a.play();
          })
          .catch(() => {});
    }
}

export async function elevenVoices(key) {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": key },
    }).catch(() => null);
    if (!r || !r.ok) throw new Error("could not reach ElevenLabs");
    const j = await r.json();
    return (j.voices || []).map(v => ({ id: v.voice_id, name: v.name }));
}

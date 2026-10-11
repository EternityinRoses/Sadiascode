/* ONE INSTANCE PER CHARACTER, THE NEWEST WINS (Rose 2026-09-16: "Dark souls
 * has a thing that if someone logs into from anywhere your character it
 * boots you - so that only one instance period can ever run").
 *
 * THE FIRST CUT of this file was a lock in localStorage that REFUSED a
 * second tab. Rose: "no thats not good enough". Two things were wrong with
 * it: local storage is one browser on one machine, so a second browser, an
 * incognito window or another machine on the LAN never saw it; and it
 * refused the newcomer, where the rule is the other way round, the newcomer
 * takes the character and the old instance is thrown out.
 *
 * SO THE LEASE LIVES ON THE SERVER, the one place every instance talks to
 * (_serve_nocache.py, /api/session/*): standing a world CLAIMS the book's
 * character, and a claim always wins. The holder heartbeats once a second;
 * the beat that comes back "booted" is the old instance learning it lost
 * her, and it throws itself out: it leaves the page for booted.html, which
 * fires pagehide (seats let go, the lesson beacon flushed) and kills every
 * loop and autosave with the page. Every sheet the world writes carries the
 * session, and the server refuses a write from an instance that no longer
 * holds the character, so even a wedged old tab cannot write the book.
 * The same browser gets the news faster than a heartbeat: the claim is
 * mirrored in localStorage per character, and the storage event boots the
 * old tab at once.
 *
 * A server that does not answer never boots anyone: only a definite
 * "booted" from the server, or another tab's mirror, throws an instance
 * out. Pure pieces are exported for the tests, which run in node. */
export const KEY_PREFIX = "loh.session.";
export const BEAT_MS = 1000;
export const keyFor = (char) => KEY_PREFIX + String(char || "her");

/** the one verdict a beat can carry: only a definite no from the server */
export const bootedFrom = (json) => !!(json && json.ok === false && json.booted);

/** the id this page speaks as, one per page load */
export const instanceId = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

let held = null;          // { char, id, timer }
let thrown = false;       // once out, never twice
const listeners = new Set();

/** the session a sheet write should carry, or null when no world stands */
export function sessionFor() {
    return held ? { char: held.char, id: held.id } : null;
}

/** what to do besides leaving the page (the world registers its own) */
export function onBooted(fn) { if (typeof fn === "function") listeners.add(fn); return () => listeners.delete(fn); }

async function post(path, body) {
    try {
        const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" },
                                      body: JSON.stringify(body) });
        return await r.json().catch(() => null);
    } catch (e) { return null; }
}

function mirror(char, id) {
    try { localStorage.setItem(keyFor(char), id); } catch (e) { /* a private window, no mirror */ }
}
function unmirror(char, id) {
    try { if (localStorage.getItem(keyFor(char)) === id) localStorage.removeItem(keyFor(char)); } catch (e) { /* ditto */ }
}

function onStorage(e) {
    if (!held || e.key !== keyFor(held.char)) return;
    if (e.newValue && e.newValue !== held.id) booted("taken up in another tab");
}

/** Stand as the instance of `char`. Succeeds from this side whenever there is
    a character to stand for; the server's answer names who was thrown out, if
    anyone. A blank name claims NOTHING, on purpose: see below. */
export async function claim(char) {
    /*,,. A LEASE ON AN UNNAMED THING IS A LEASE ON EVERYTHING (Rose 2026-09-20, item 7) ,,,
       This read `String(char || "her")`, and app.js handed it that same
       literal whenever a book had no id. So every instance without a
       character claimed THE SAME NAME, and two of them fought over it:
       whichever stood a world last threw the other out of a character neither
       was playing.
       AND THE SERVER IS NOT THE FAST HALF OF THAT. `mirror()` writes the claim
       into localStorage under the character's name and `onStorage` boots the
       holder the instant another TAB writes the same key. Two tabs in one
       Chrome profile therefore boot each other with no server involved at all,
       which is the likeliest mechanism of what happened to him on 09-20.
       THE LEASE EXISTS TO STOP TWO INSTANCES WRITING ONE BOOK. With no book
       there is nothing to protect, so the honest answer is to hold nothing:
       sessionFor() then returns null, the server sees no session to check
       (tools/serve.py only 409s when one is sent), and a bookless world was
       never going to write anything anyway -- save.js writeHer refuses such a
       book with "nobody in the book". */
    const c = String(char || "").trim();
    if (!c) {
        if (held) release();
        console.info("[owner] no character to stand for; playing without a lease");
        return { ok: false, char: null, id: instanceId, why: "no character" };
    }
    if (held && held.char === c) return { ok: true, char: c, id: held.id };
    if (held) release();
    held = { char: c, id: instanceId, timer: null };
    thrown = false;
    const j = await post("/api/session/claim", { char: c, id: instanceId });
    if (!j || !j.ok) console.warn("[owner] the server did not take the claim; playing without a lease");
    else if (j.booted) console.info("[owner] took " + c + " from another instance");
    mirror(c, instanceId);
    held.timer = setInterval(beat, BEAT_MS);
    addEventListener("storage", onStorage);
    addEventListener("pagehide", release);
    return { ok: true, char: c, id: instanceId };
}

async function beat() {
    if (!held || thrown) return;
    const j = await post("/api/session/beat", { char: held.char, id: held.id });
    if (bootedFrom(j)) booted("taken up elsewhere");
}

/** Let go: the world came down on purpose (a return to the title). */
export function release() {
    if (!held) return;
    const { char, id, timer } = held;
    if (timer) clearInterval(timer);
    removeEventListener("storage", onStorage);
    removeEventListener("pagehide", release);
    unmirror(char, id);
    try {
        const body = JSON.stringify({ char, id });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/session/release", new Blob([body], { type: "application/json" }));
        else fetch("/api/session/release", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    } catch (e) { /* the page is going anyway */ }
    held = null;
}

/** Thrown out: another instance holds her now. */
export function booted(why) {
    if (thrown) return;
    thrown = true;
    const who = held ? held.char : "";
    if (held && held.timer) clearInterval(held.timer);
    removeEventListener("storage", onStorage);
    held = null;                                    // no release: she is not ours to let go of
    for (const fn of listeners) { try { fn(why); } catch (e) { /* on the way out */ } }
    console.warn("[owner] booted: " + why);
    try { location.replace("/booted.html?who=" + encodeURIComponent(who) + "&why=" + encodeURIComponent(why || "")); }
    catch (e) { /* nothing left to do */ }
}

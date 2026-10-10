"""VISION from another map, for Legends of Harpine (D:\\Sadias Canvas).

When a seat is APART from Rose (on another map), its VISION line opens a hidden,
sealed copy of the game in an invisible frame. That copy loads only the seat's
map, puts a camera where the seat stands, takes the four pictures, files them in
the seat's mailbox (/api/dev/shot) and closes. The copy can't write anything:
every /api/ call but the picture is answered with a fake "no", so it can't touch
the save, the session lease or any seat's mailbox. It makes no sound.

Run it once (double-click, or `python patches/eye_vision.py`). It backs up
void.js into Desktop\\cloude\\.backups first, checks every place it edits, and changes nothing if
any of them doesn't match. Running it twice is safe.
"""
import shutil
import sys
import time
from pathlib import Path

GAME = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"D:\Sadias Canvas")
VOID = GAME / "src" / "world" / "void.js"
EYE = GAME / "eye.html"
MARK = "EYE FROM AFAR"
# Backups live in Cloude's own .backups folder (where app.py keeps all of them), never in the game folder.
BACKUPS = Path(__file__).resolve().parent.parent / ".backups"

EYE_HTML = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<title>eye</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }</style>
</head>
<body>
<div id="screen"></div>
<!-- THE EYE (Cloude, 2026-10-10; Rose: "I want you to be able to take pictures on other maps... but hidden").
     A sealed copy of the world for one picture: void.js opens it in an invisible frame when a seat that is
     apart asks for VISION. It must never write, never read a seat's mail, never claim the session and never
     make a sound, so all of that is shut here, before a single game module loads. -->
<script>
(function () {
    function memory(src) {
        var d = {};
        try { for (var i = 0; i < src.length; i++) { var k = src.key(i); d[k] = src.getItem(k); } } catch (e) {}
        return {
            get length() { return Object.keys(d).length; },
            key: function (i) { return Object.keys(d)[i] || null; },
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
            setItem: function (k, v) { d[k] = String(v); },
            removeItem: function (k) { delete d[k]; },
            clear: function () { d = {}; }
        };
    }
    try { Object.defineProperty(window, "localStorage", { value: memory(window.localStorage), configurable: true }); } catch (e) {}
    try { Object.defineProperty(window, "sessionStorage", { value: memory(window.sessionStorage), configurable: true }); } catch (e) {}
    var realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
        var path = new URL(url, location.href).pathname;
        if (path === "/api/dev/shot" && method === "POST") return realFetch(input, init);
        if (path.indexOf("/api/") === 0)
            return Promise.resolve(new Response('{"ok":false,"sealed":true}',
                { status: 503, headers: { "content-type": "application/json" } }));
        return realFetch(input, init);
    };
    if (navigator.sendBeacon) navigator.sendBeacon = function () { return true; };
    var xOpen = XMLHttpRequest.prototype.open, xSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) {
        this.__sealed = String(u || "").indexOf("/api/") !== -1 || String(m).toUpperCase() !== "GET";
        return xOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () { if (!this.__sealed) return xSend.apply(this, arguments); };
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
        AC.prototype.resume = function () { return Promise.resolve(); };
    }
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
})();
</script>
<script src="./lib/moon-cursors.js"></script>
<script type="module">
import { mountVoid } from "./src/world/void.js";
const q = new URLSearchParams(location.search);
const eye = { x: +q.get("x") || 0, z: +q.get("z") || 0, yaw: +q.get("yaw") || 0,
              seat: q.get("seat") || "", id: q.get("id") || "" };
let said = false;
eye.done = (ok, why) => {
    if (said) return;
    said = true;
    try { parent.postMessage({ lohEye: eye.id, ok: !!ok, why: why || "" }, location.origin); } catch (e) { /* no parent */ }
};
mountVoid(document.getElementById("screen"), { map: q.get("map") || undefined, eye })
    .catch((e) => eye.done(false, (e && e.message) || "the map would not stand"));
setTimeout(() => eye.done(false, "the map took too long to stand"), 80000);
</script>
</body>
</html>
'''

# (anchor, replacement) pairs in void.js. Each anchor must appear exactly once.
EDITS = [
    # 1. the eye's own functions, beside the apart seat's other helpers
    ("    async function pollAway(w, away) {\n",
     "    /*,,. EYE FROM AFAR (Cloude, 2026-10-10; Rose: \"I want you to be able to take pictures on other maps... but\n"
     "       hidden\") ,,,\n"
     "       Only her map is simulated, so a seat that is apart has no body and no camera here. Its VISION opens\n"
     "       eye.html in an invisible frame: a sealed copy of the world (no writes, no seat mail, no lease, no\n"
     "       sound) that stands only the seat's map, takes the four views where the seat stands and files them\n"
     "       through /api/dev/shot as the body's own VISION does. Its own WebGL context, so this world's\n"
     "       programs are never touched. One at a time; the frame is removed when it reports or times out. */\n"
     "    let eyeFrame = null;\n"
     "    function eyeFromAfar(seat, away) {\n"
     "        if (eyeFrame || !seat || !away) return;\n"
     "        const seatKey = String(seat.dir || seat.name || \"\").toLowerCase()\n"
     "            .replace(/[^a-z0-9]+/g, \"_\").replace(/^_+|_+$/g, \"\");\n"
     "        const id = Math.random().toString(36).slice(2);\n"
     "        const f = document.createElement(\"iframe\");\n"
     "        f.setAttribute(\"aria-hidden\", \"true\");\n"
     "        f.setAttribute(\"allow\", \"autoplay 'none'\");\n"
     "        f.tabIndex = -1;\n"
     "        f.style.cssText = \"position:fixed;left:0;top:0;width:640px;height:360px;border:0;opacity:0;\"\n"
     "            + \"pointer-events:none;z-index:-1\";\n"
     "        f.src = \"eye.html?\" + new URLSearchParams({ map: away.map, x: away.x, z: away.z,\n"
     "                                                     yaw: away.yaw || 0, seat: seatKey, id });\n"
     "        let timer = null;\n"
     "        const end = (ok) => {\n"
     "            removeEventListener(\"message\", onMsg);\n"
     "            clearTimeout(timer);\n"
     "            if (f.parentNode) f.remove();\n"
     "            eyeFrame = null;\n"
     "            publishWorld(seat, (ok ? \"You take in the view where you stand; the picture is with you on your next look.\"\n"
     "                : \"You look about you, but your eyes could not be shared with your mind.\")\n"
     "                + \"\\n\\n\" + apartText(seat, seatPlaceOf(seat) || away)).catch(() => {});\n"
     "        };\n"
     "        const onMsg = (e) => {\n"
     "            if (e.origin !== location.origin || !e.data || e.data.lohEye !== id) return;\n"
     "            if (!e.data.ok) console.warn(\"[void] the far eye saw nothing:\", e.data.why);\n"
     "            end(!!e.data.ok);\n"
     "        };\n"
     "        timer = setTimeout(() => end(false), 90000);\n"
     "        addEventListener(\"message\", onMsg);\n"
     "        document.body.append(f);\n"
     "        eyeFrame = f;\n"
     "    }\n"
     "    /* and, inside that frame, the picture itself: once the map has had ninety frames to settle (trees, sky,\n"
     "       night), the four views at the seat's place, drawn on this frame's own canvas as VISION draws them */\n"
     "    let eyeFrames = 0, eyeTaken = false;\n"
     "    function eyeTick() {\n"
     "        const o = mountOpts.eye;\n"
     "        if (!o || eyeTaken || ++eyeFrames < 90) return;\n"
     "        eyeTaken = true;\n"
     "        try {\n"
     "            try { if (figure) figure.visible = false; } catch (e) { /* her body is not on this map's picture */ }\n"
     "            const dom = renderer.domElement;\n"
     "            const W = 512, H = Math.max(1, Math.round(W * dom.height / Math.max(1, dom.width)));\n"
     "            const cam = new THREE.PerspectiveCamera(75, dom.width / Math.max(1, dom.height), 0.1, 200);\n"
     "            let gy = 0;\n"
     "            try { gy = groundY(o.x, o.z) || 0; } catch (e) { gy = 0; }\n"
     "            const cv = document.createElement(\"canvas\");\n"
     "            cv.width = W * 2; cv.height = H * 2;\n"
     "            const g2 = cv.getContext(\"2d\");\n"
     "            const views = [[\"ahead\", 0], [\"right\", -Math.PI / 2], [\"behind\", Math.PI], [\"left\", Math.PI / 2]];\n"
     "            views.forEach(([word, turn], k) => {\n"
     "                const yaw = (o.yaw || 0) + turn;\n"
     "                const tx = o.x + Math.sin(yaw), tz = o.z + Math.cos(yaw);\n"
     "                cam.position.set(o.x, gy + 1.6, o.z);\n"
     "                cam.lookAt(tx, gy + 1.5, tz);\n"
     "                renderer.render(scene, cam);\n"
     "                const ox = (k % 2) * W, oy = Math.floor(k / 2) * H;\n"
     "                g2.drawImage(dom, ox, oy, W, H);\n"
     "                let compass = \"\";\n"
     "                try { compass = bearing(o.x, o.z, tx, tz); } catch (e) { /* the word is a nicety */ }\n"
     "                g2.font = \"bold 18px sans-serif\";\n"
     "                g2.fillStyle = \"rgba(0,0,0,0.6)\";\n"
     "                g2.fillRect(ox + 6, oy + 6, 200, 26);\n"
     "                g2.fillStyle = \"#fff\";\n"
     "                g2.fillText(word.toUpperCase() + (compass ? \" (\" + compass + \")\" : \"\"), ox + 12, oy + 25);\n"
     "            });\n"
     "            fetch(\"/api/dev/shot\", {\n"
     "                method: \"POST\", headers: { \"content-type\": \"application/json\" },\n"
     "                body: JSON.stringify({ seat: o.seat, image: cv.toDataURL(\"image/jpeg\", 0.82) }),\n"
     "            }).then((r) => o.done && o.done(!!(r && r.ok), r && r.ok ? \"\" : \"the server would not file it\"))\n"
     "              .catch((e) => o.done && o.done(false, e && e.message));\n"
     "        } catch (e) {\n"
     "            if (o.done) o.done(false, e && e.message);\n"
     "        }\n"
     "    }\n"
     "    async function pollAway(w, away) {\n"),
    # 2. an apart seat's VISION opens the eye; it does not overwrite the eye's own news with the plain note
    ("            if (!lines.some((l) => /^\\s*TRAVEL\\s*[.!]?\\s*$/im.test(l.text))) {\n"
     "                publishWorld(w.seat, apartText(w.seat, away)).catch(() => {});\n",
     "            /* EYE FROM AFAR: VISION from a seat that is apart (see eyeFromAfar) */\n"
     "            const wantsEye = lines.some((l) => /^\\s*VISION\\s*$/im.test(l.text));\n"
     "            if (wantsEye) eyeFromAfar(w.seat, away);\n"
     "            if (!lines.some((l) => /^\\s*TRAVEL\\s*[.!]?\\s*$/im.test(l.text))) {\n"
     "                if (!wantsEye) publishWorld(w.seat, apartText(w.seat, away)).catch(() => {});\n"),
    # 3. the eye's frame never reads a seat's mail, and takes its picture from the frame loop
    ("            tListen += dt;\n"
     "            if (tListen > 2 && waiting.length) {\n",
     "            tListen += dt;\n"
     "            if (mountOpts.eye) eyeTick();    // EYE FROM AFAR: the sealed copy only takes its picture\n"
     "            if (tListen > 2 && waiting.length && !mountOpts.eye) {\n"),
]


def main():
    if not VOID.is_file():
        sys.exit(f"Can't find {VOID}. Pass the game folder as the first argument if it lives elsewhere.")
    raw = VOID.read_bytes().decode("utf-8")
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")
    if MARK in text:
        print("void.js already has EYE FROM AFAR; nothing to change there.")
    else:
        for anchor, _ in EDITS:
            n = text.count(anchor)
            if n != 1:
                sys.exit(f"void.js doesn't look as expected (an anchor appears {n} times, not once):\n{anchor[:160]}\n"
                         "Nothing was changed.")
        for anchor, repl in EDITS:
            text = text.replace(anchor, repl, 1)
        BACKUPS.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        shutil.copy2(VOID, BACKUPS / f"void.js.{stamp}.before-eye")
        out = text.replace("\n", "\r\n") if crlf else text
        VOID.write_bytes(out.encode("utf-8"))
        print(f"void.js patched (backup: {BACKUPS / f'void.js.{stamp}.before-eye'}).")
    if EYE.is_file() and EYE.read_text(encoding="utf-8") == EYE_HTML:
        print("eye.html already in place.")
    else:
        if EYE.is_file():
            BACKUPS.mkdir(parents=True, exist_ok=True)
            shutil.copy2(EYE, BACKUPS / f"eye.html.{time.strftime('%Y%m%d-%H%M%S')}")
        EYE.write_text(EYE_HTML, encoding="utf-8")
        print("eye.html written.")
    print("Done. Reload the game (F5 or restart LoH.exe) to use it.")


if __name__ == "__main__":
    main()

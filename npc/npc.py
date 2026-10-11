"""Hollow NPC: a tiny learning background NPC. No AI model, no internet.
Run: python npc.py  ->  http://127.0.0.1:8644  (test page)
API: POST /talk {"player": "Rose", "text": "hello"} -> {"reply": "...", "intent": "...", "mood": ...}
Edit persona.json to change who the NPC is. Memory lives in npc_brain.json.
"""
import json, math, os, random, re, threading, time, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BRAIN, PERSONA = os.path.join(HERE, "npc_brain.json"), os.path.join(HERE, "persona.json")
PORT = 8644
lock = threading.Lock()

DEFAULT_PERSONA = {
    "name": "Old Maud",
    "role": "keeper of the Drowned Lantern inn",
    "lines": {
        "greet": ["Mm. {name}. Come in out of the wet.", "Door's open. It always is.", "Another face. Sit, if you like."],
        "trade": ["Bread, two copper. Ale, three. Answers cost more.", "I sell what keeps you alive another night.", "Coin first. Always coin first."],
        "rumor": ["They say the well in the east field sings at night.", "A pilgrim came through with no shadow. Paid in old coin.", "The fog took the miller's boy. Fog gives things back, though. Different."],
        "quest": ["Want work? Something's eating the chickens. Something with hands.", "Find my sister's ring in the marsh. She won't need it. She wants it.", "Go ask the bell-ringer why he stopped. I'd go, but I can't leave."],
        "threat": ["Put that away. Better folk than you have tried.", "You'll want to think about that.", "I've buried braver."],
        "bye": ["Mind the road.", "Come back. They all do.", "Go on, then. I'll keep your seat warm."],
        "self": ["Me? I keep the lantern lit. That's all anyone needs to know.", "I've been here longer than the inn.", "Maud. Just Maud. It was something else, once."],
        "other": ["Hm.", "Is that so.", "The fire's listening, you know.", "Mm. Go on."]
    },
    "creep": [
        "You said \"{echo}\" once. I've been thinking about it.",
        "{other} was here. Asked about {other_topic}. You two should talk. Or not.",
        "That's visit {visits}. I count them.",
        "You always talk about {topic}. Why is that.",
        "You come at {daytime} mostly. I notice.",
        "{echo_mimic}",
        "Last time you seemed {last_mood}. Better now?",
        "I knew you'd say that, {name}."
    ]
}

SEED = {
    "greet": ["hello", "hi there", "hey", "good evening", "greetings", "hail innkeeper", "evening"],
    "trade": ["what do you sell", "how much for ale", "i want to buy food", "can i get a room", "price of bread", "do you have potions", "i need supplies"],
    "rumor": ["any news", "heard any rumors", "what is happening around here", "anything strange lately", "tell me gossip", "tell me about the fog", "what about the town", "what is that sound", "what do people say"],
    "quest": ["do you have work", "any jobs for me", "i need coin is there a task", "can i help you with something", "got any quests", "need anything done"],
    "threat": ["give me your money", "i will kill you", "hand it over or else", "i draw my sword", "you are going to die", "shut up old woman"],
    "bye": ["goodbye", "farewell", "see you later", "i must go", "bye", "until next time"],
    "self": ["who are you", "what is your name", "how long have you been here", "tell me about yourself", "are you human", "what are you"],
}
STOP = set("a an the and or but of to in on at for with is are was it this that i you me my your we be do so not what how".split())
GOOD = set("thanks thank please kind friend nice love good great lovely".split())
BAD = set("kill die stupid hate shut idiot ugly dead threat money".split())

def words(t):
    return re.findall(r"[a-z']+", t.lower())

def load(p, d):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return d

def save(p, d):
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(p + ".tmp", p)

persona = load(PERSONA, None)
if not persona:
    persona = DEFAULT_PERSONA
    save(PERSONA, persona)
brain = load(BRAIN, {"nb": {}, "players": {}, "chain": {}})

# ---------- naive Bayes intent classifier (learns online) ----------
def nb_train(intent, text):
    nb = brain["nb"].setdefault(intent, {"docs": 0, "words": {}, "total": 0})
    nb["docs"] += 1
    for w in words(text):
        nb["words"][w] = nb["words"].get(w, 0) + 1
        nb["total"] += 1

if not brain["nb"]:
    for k, xs in SEED.items():
        for x in xs:
            nb_train(k, x)

def classify(text):
    ws = words(text)
    if not ws:
        return "other", 0.0
    vocab = len({w for c in brain["nb"].values() for w in c["words"]}) + 1
    docs = sum(c["docs"] for c in brain["nb"].values())
    scores = {}
    for k, c in brain["nb"].items():
        s = math.log(c["docs"] / docs)
        for w in ws:
            s += math.log((c["words"].get(w, 0) + 1) / (c["total"] + vocab))
        scores[k] = s
    best = max(scores, key=scores.get)
    mx = max(scores.values())
    tot = sum(math.exp(v - mx) for v in scores.values())
    conf = 1 / tot
    known = any(w in c["words"] for c in brain["nb"].values() for w in ws)
    return (best if conf > 0.25 and known else "other"), conf

# ---------- word chain from ALL players (for uncanny echoes) ----------
def chain_learn(text):
    ws = ["^"] + words(text) + ["$"]
    for a, b, c in zip(ws, ws[1:], ws[2:]):
        lst = brain["chain"].setdefault(a + " " + b, [])
        if len(lst) < 30:
            lst.append(c)

def chain_say():
    starts = [k for k in brain["chain"] if k.startswith("^ ")]
    for _ in range(20):
        if not starts:
            return None
        k = random.choice(starts); out = [k.split()[1]]
        while len(out) < 14:
            n = random.choice(brain["chain"].get(k, ["$"]))
            if n == "$": break
            out.append(n); k = k.split()[1] + " " + n
        if len(out) >= 4:
            return " ".join(out)
    return None

# ---------- player study ----------
def daytime():
    h = time.localtime().tm_hour
    return "night" if h < 5 or h >= 21 else "morning" if h < 12 else "afternoon" if h < 17 else "evening"

def study(p, text):
    ws = [w for w in words(text) if w not in STOP and len(w) > 3]
    for w in ws:
        p["topics"][w] = p["topics"].get(w, 0) + 1
    if 4 <= len(text) <= 80:
        p["phrases"] = (p["phrases"] + [text.strip()])[-25:]
    p["lowercase"] = (p.get("lowercase", 0) * 0.8) + (0.2 if text == text.lower() else 0)
    p["shouty"] = (p.get("shouty", 0) * 0.8) + (0.2 if "!" in text else 0)
    s = len(set(words(text)) & GOOD) - len(set(words(text)) & BAD)
    p["mood"] = max(-1, min(1, p["mood"] * 0.7 + 0.3 * s))
    p["times"][daytime()] = p["times"].get(daytime(), 0) + 1

def mimic(p, s):
    if p.get("lowercase", 0) > 0.5:
        s = s.lower().rstrip(".")
    if p.get("shouty", 0) > 0.5:
        s = s.rstrip(".") + "!"
    return s

def fill(line, name, p):
    others = [(n, q) for n, q in brain["players"].items() if n != name and q["topics"]]
    o = random.choice(others) if others else None
    top = max(p["topics"], key=p["topics"].get) if p["topics"] else None
    old = p["phrases"][:-1]
    vals = {
        "name": name, "visits": p["visits"], "daytime": max(p["times"], key=p["times"].get),
        "topic": top, "echo": random.choice(old) if old else None,
        "echo_mimic": (random.choice(old) + "...") if old else None,
        "other": o[0] if o else None,
        "other_topic": max(o[1]["topics"], key=o[1]["topics"].get) if o else None,
        "last_mood": "glad" if p.get("last_mood", 0) > 0.2 else "troubled" if p.get("last_mood", 0) < -0.2 else "quiet",
    }
    if p["visits"] < 2:  # no "last time" talk with strangers
        vals["visits"] = vals["daytime"] = vals["last_mood"] = None
    need = re.findall(r"{(\w+)}", line)
    if any(vals.get(k) is None for k in need):
        return None
    return line.format(**vals)

def talk(name, text):
    name = (name or "stranger").strip()[:40]
    p = brain["players"].setdefault(name, {"visits": 0, "topics": {}, "phrases": [], "mood": 0, "times": {}, "first": time.time(), "last": 0})
    now = time.time()
    if now - p["last"] > 30 * 60:
        p["visits"] += 1
        p["last_mood"] = p["mood"]
    p["last"] = now
    intent, conf = classify(text)
    study(p, text)
    chain_learn(text)
    if intent != "other" and conf > 0.8:
        nb_train(intent, text)  # self-training: she gets better at reading people

    familiarity = min(1, p["visits"] / 6 + len(p["phrases"]) / 40)
    reply = None
    if intent in ("other", "greet", "self") and random.random() < 0.15 + 0.5 * familiarity:
        lines = persona["creep"][:]
        random.shuffle(lines)
        for l in lines:
            reply = fill(l, name, p)
            if reply: break
    if not reply and intent == "other" and random.random() < 0.2 * familiarity:
        s = chain_say()
        if s: reply = s.capitalize() + "... someone said that here once."
    if not reply:
        reply = fill(random.choice(persona["lines"].get(intent, persona["lines"]["other"])), name, p) or "Mm."
    if familiarity > 0.5:
        reply = mimic(p, reply)
    return {"reply": reply, "intent": intent, "confidence": round(conf, 2), "familiarity": round(familiarity, 2)}

# ---------- test page ----------
PAGE = """<!doctype html><html><head><meta charset=utf-8><title>NPC</title><style>
body{margin:0;background:#15120f;color:#d8cbb3;font-family:Georgia,serif;height:100vh;display:flex;flex-direction:column}
header{padding:14px;text-align:center;font-size:20px;color:#c9a46a}
#log{flex:1;overflow:auto;padding:12px;max-width:700px;width:100%;margin:auto;box-sizing:border-box}
.m{margin:8px 0;line-height:1.5}.u{color:#8fb0c9}.n{color:#e6d3ad}.dbg{color:#665a48;font-size:12px;font-family:monospace}
form{display:flex;gap:8px;padding:12px;max-width:700px;width:100%;margin:auto;box-sizing:border-box}
input{padding:10px;background:#221d18;color:#e6d3ad;border:1px solid #4a3e30;border-radius:6px;font-size:15px}
#t{flex:1}#p{width:110px}button{background:#5a4630;color:#f0e2c4;border:0;border-radius:6px;padding:0 16px;cursor:pointer}
</style></head><body><header>🕯️ <span id=nm>NPC</span></header><div id=log></div>
<form id=f><input id=p value=Rose title="who you are"><input id=t autocomplete=off placeholder="speak..." autofocus><button>Say</button></form>
<script>
const log=document.getElementById('log');
fetch('/persona').then(r=>r.json()).then(j=>nm.textContent=j.name+', '+j.role);
function add(h,c){const d=document.createElement('div');d.className='m '+c;d.textContent=h;log.appendChild(d);log.scrollTop=1e9}
f.onsubmit=async e=>{e.preventDefault();const s=t.value.trim();if(!s)return;t.value='';add(p.value+': '+s,'u');
const j=await (await fetch('/talk',{method:'POST',body:JSON.stringify({player:p.value,text:s})})).json();
setTimeout(()=>{add(nm.textContent.split(',')[0]+': '+j.reply,'n');add(`[${j.intent} ${j.confidence} | knows you ${j.familiarity}]`,'dbg')},400+Math.random()*900)};
</script></body></html>"""

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def out(self, code, body, ct="application/json"):
        b = body.encode("utf-8")
        self.send_response(code); self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path == "/persona":
            return self.out(200, json.dumps({"name": persona["name"], "role": persona["role"]}))
        self.out(200, PAGE, "text/html; charset=utf-8")
    def do_POST(self):
        if self.path != "/talk":
            return self.out(404, "{}")
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            with lock:
                r = talk(str(d.get("player", "")), str(d.get("text", ""))[:500])
                save(BRAIN, brain)
        except Exception as e:
            r = {"reply": "...", "error": str(e)}
        self.out(200, json.dumps(r))

if __name__ == "__main__":
    url = f"http://127.0.0.1:{PORT}"
    print(f"{persona['name']} is listening at {url}")
    threading.Timer(1, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

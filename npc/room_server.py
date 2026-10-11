"""Hollow Room: brain server for the 3D NPC room.
Run: python room_server.py  ->  http://127.0.0.1:8645
NPCs speak from their own original lines, learn phrases they overhear, remix words,
and can be BOOSTED by Ollama or the Anthropic API. Boosted lines are kept forever.
Memory: room_brain.json. API keys are kept in memory only, never saved.
"""
import json, math, os, random, re, threading, time, urllib.request, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BRAIN = os.path.join(HERE, "room_brain.json")
PORT = 8645
lock = threading.Lock()

CAST = {
    "bram": {"name": "Bram", "role": "town guard", "faction": "guard", "kind": "human",
             "temper": {"aggression": 0.6, "fear": 0.15, "social": 0.4, "mood": 0.5, "openness": 0.3},
             "lines": {
                 "greet": ["Evening, {to}.", "Keep your nose clean, {to}.", "{to}. All quiet?"],
                 "chat": ["Long shift. Longer night.", "The captain wants the door watched. So I watch it.", "My knees hate this floor.", "Seen anyone odd tonight?"],
                 "gossip": ["{other} has been jumpy lately.", "Don't trust anyone who pays in old coin.", "Heard {other} talking to the fog again."],
                 "reply": ["Hm. Could be.", "That right?", "I'll keep that in mind.", "Not my business. Unless it is."],
                 "alarm": ["Hey! You there! Stop!", "Thief! Stay where you are!", "Everyone back! Now!"],
                 "warn": ["Out. Now. Before I change my mind.", "Show your face here again and you'll lose a hand.", "Walk away. Slowly."],
                 "calm": ["It's over. Back to your drinks.", "Gone. For now.", "All clear. Breathe."],
                 "pet": ["Easy, {to}. Good beast.", "Off my boots, {to}."],
                 "bye": ["Stay safe.", "Back to the door, then.", "Mind yourself."]}},
    "edda": {"name": "Edda", "role": "baker", "faction": "civilian", "kind": "human",
             "temper": {"aggression": 0.15, "fear": 0.4, "social": 0.75, "mood": 0.6, "openness": 0.6},
             "lines": {
                 "greet": ["Oh! {to}, there you are.", "Hello, love.", "{to}! Bread's still warm."],
                 "chat": ["The flour's gone damp again.", "I dreamt of the well last night.", "My hands smell of yeast and smoke, always.", "Did you hear the bells stop?"],
                 "gossip": ["{other} owes me three loaves.", "Between us, {other} sleeps in the stable.", "I saw {other} staring at the fire for an hour."],
                 "reply": ["Oh, I know!", "Really? Fancy that.", "Don't say that, you'll curse us.", "Mm, true enough."],
                 "alarm": ["Help! Guard!", "Someone stop him!", "He's got a knife!"],
                 "flee": ["Get away from me!", "No, no, no..."],
                 "calm": ["Thank the Dawn.", "My heart's still racing."],
                 "pet": ["Who's a good boy, {to}?", "Come here, {to}.", "Shoo, {to}, not now."],
                 "bye": ["I'd best get back.", "Take care, love.", "Off I go."]}},
    "tobin": {"name": "Tobin", "role": "farmhand", "faction": "civilian", "kind": "human",
              "temper": {"aggression": 0.35, "fear": 0.3, "social": 0.5, "mood": 0.45, "openness": 0.5},
              "lines": {
                  "greet": ["Aye, {to}.", "Oi, {to}.", "Mornin'. Or night. Can't tell anymore."],
                  "chat": ["Lost two sheep to the marsh.", "Ale's thin tonight.", "My da said the fog has teeth.", "Rain's coming. Always is."],
                  "gossip": ["{other}'s been sneaking extra bread.", "Reckon {other} knows more than they say.", "{other} snores like a bear."],
                  "reply": ["Aye.", "Reckon so.", "Get away with ye.", "Huh. Didn't know that."],
                  "alarm": ["Oi! Thief!", "Guard! Over here!"],
                  "flee": ["Not today!", "Back off!"],
                  "calm": ["Good riddance.", "Ha, run, ye rat!"],
                  "pet": ["Here, {to}! Here!", "Daft animal."],
                  "bye": ["Right then.", "Off to the field.", "See ye."]}},
    "sly": {"name": "Sly", "role": "cutpurse", "faction": "enemy", "kind": "human",
            "temper": {"aggression": 0.7, "fear": 0.35, "social": 0.3, "mood": 0.4, "openness": 0.4},
            "lines": {
                "greet": ["Well, well. {to}.", "Don't mind me."],
                "chat": ["Nice purse you've got.", "Just passing through.", "Quiet night. Too quiet."],
                "gossip": ["{other} keeps their coin in their boot.", "The guard sleeps standing up."],
                "reply": ["Sure, sure.", "Whatever you say."],
                "threat": ["Your coin. Now.", "Not a sound, {to}.", "Hand it over, quiet-like."],
                "flee": ["Easy! I'm going!", "You'll never catch me!", "Another night, then."],
                "warn": ["Back off, {to}."],
                "pet": ["Get lost, mutt."],
                "bye": ["Be seeing you.", "Mind your purse."]}},
    "nanny": {"name": "Nanny", "role": "goat", "faction": "neutral", "kind": "animal",
              "temper": {"aggression": 0.3, "fear": 0.5, "social": 0.2, "mood": 0.5, "openness": 0.0},
              "lines": {"greet": ["Meh-eh-eh."], "chat": ["*chews*", "Mehhh.", "*stares at nothing*"], "reply": ["Meh.", "*chews louder*"],
                        "alarm": ["MEHHH!"], "flee": ["*scrambles*"], "threat": ["*headbutt*"], "pet": ["*nibbles your sleeve*"], "bye": ["*wanders off*"]}},
    "soot": {"name": "Soot", "role": "cat", "faction": "pet", "kind": "pet",
             "temper": {"aggression": 0.3, "fear": 0.45, "social": 0.35, "mood": 0.6, "openness": 0.0},
             "lines": {"greet": ["Mrrp."], "chat": ["*purrs*", "Mrrrow.", "*slow blink*"], "reply": ["Mew.", "*tail flick*"],
                       "alarm": ["*hides*"], "threat": ["Hsssss!"], "flee": ["*bolts*"], "pet": ["*rubs against your leg*", "Prrrrr."], "bye": ["*leaves*"]}},
    "pip": {"name": "Pip", "role": "dog", "faction": "pet", "kind": "pet", "owner": "edda",
            "temper": {"aggression": 0.55, "fear": 0.25, "social": 0.8, "mood": 0.8, "openness": 0.0},
            "lines": {"greet": ["Woof!", "*wags*"], "chat": ["*pant pant*", "Boof.", "*sniffs everything*"], "reply": ["*head tilt*", "Wuff?"],
                      "alarm": ["WOOF! WOOF!", "Grrrrr... WOOF!"], "threat": ["Grrrrr!"], "flee": ["*yelp*"], "pet": ["*licks your hand*", "*rolls over*"], "bye": ["*trots off*"]}},
}

# Lines about deeds. Slots: {to} {other} {subject} {victim} {crime}
MORE = {
    "bram": {"report": ["{subject} {crime} {victim}. I'm on it.", "Word is {subject} {crime} {victim}. Not on my watch."],
             "attack": ["Hold still!", "By the law!", "You picked the wrong room."], "hurt": ["Agh!", "You'll pay for that."],
             "wary": ["I've got my eye on you, {to}.", "One wrong move, {to}."]},
    "edda": {"report": ["{subject} {crime} {victim}! I saw it with my own eyes!", "Stay away from {subject}. They {crime} {victim}.", "Did you hear? {subject} {crime} {victim}."],
             "attack": ["Get off!", "Leave me be!"], "hurt": ["Ow! Stop!", "Please, no!"],
             "wary": ["Don't come any closer, {to}.", "I know what you did."]},
    "tobin": {"report": ["Oi. {subject} {crime} {victim}. Saw it meself.", "Watch {subject}. They {crime} {victim}, they did."],
              "attack": ["Come on then!", "Have some of this!"], "hurt": ["Ow, ye rat!", "Agh!"],
              "wary": ["Keep yer distance, {to}.", "I'm watchin' ye."]},
    "sly": {"report": ["{subject} hits hard. Keep clear."], "attack": ["Should've paid up.", "Down you go."], "hurt": ["Ach!", "Cheap shot."],
            "wary": ["Easy now, {to}. No trouble.", "You're the dangerous one, aren't you."]},
    "nanny": {"attack": ["*headbutt*"], "hurt": ["MEHHH!"], "wary": ["*stamps*"]},
    "soot": {"attack": ["*swipe*"], "hurt": ["*yowl*"], "wary": ["*flattens ears*"]},
    "pip": {"attack": ["*bites*", "GRRRAAH!"], "hurt": ["*yelp*"], "wary": ["Grrr..."]},
}
for _k, _v in MORE.items():
    CAST[_k]["lines"].update(_v)
CAST["ssith"] = {"name": "Ssith", "role": "marsh viper", "faction": "neutral", "kind": "beast",
                 "temper": {"aggression": 0.5, "fear": 0.3, "social": 0.0, "mood": 0.5, "openness": 0.0},
                 "lines": {"chat": ["*tongue flick*", "*coils*"], "warn": ["*hsssss... rattle*", "*rears up*"], "attack": ["*strikes*"],
                           "hurt": ["*hisses*"], "alarm": ["*rattle rattle*"], "reply": ["*stares*"]}}
CAST["grizzle"] = {"name": "Grizzle", "role": "cave bear", "faction": "hostile", "kind": "beast",
                   "temper": {"aggression": 0.9, "fear": 0.1, "social": 0.0, "mood": 0.2, "openness": 0.0},
                   "lines": {"chat": ["*sniffs the air*", "*low growl*"], "alarm": ["RRRAAAWR!"], "attack": ["*mauls*", "*swipes*", "RAAWR!"],
                             "hurt": ["*roars*"], "flee": ["*lumbers off*"], "reply": ["*growls*"]}}

# How hearing a line changes the listener's temperament
EFFECT = {"threat": {"fear": 0.15, "mood": -0.1}, "alarm": {"fear": 0.1}, "warn": {"fear": 0.05},
          "greet": {"mood": 0.03}, "chat": {"mood": 0.02}, "pet": {"mood": 0.05}, "calm": {"fear": -0.15, "mood": 0.05},
          "flee": {"aggression": 0.03}, "gossip": {"social": 0.01},
          "report": {"fear": 0.08, "mood": -0.03}, "attack": {"fear": 0.12}, "hurt": {"fear": 0.06}, "wary": {"mood": -0.03}}
AFFINITY = {"greet": 0.05, "chat": 0.03, "pet": 0.08, "gossip": 0.02, "threat": -0.3, "warn": -0.1, "calm": 0.03}

def words(t):
    return re.findall(r"[a-z']+", t.lower())

def load():
    try:
        with open(BRAIN, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"agents": {}, "nb": {}}

def save():
    with open(BRAIN + ".tmp", "w", encoding="utf-8") as f:
        json.dump(brain, f, ensure_ascii=False)
    os.replace(BRAIN + ".tmp", BRAIN)

brain = load()
for k, c in CAST.items():
    a = brain["agents"].setdefault(k, {})
    a.setdefault("learned", {}); a.setdefault("chain", {}); a.setdefault("affinity", {})
    a.setdefault("temper", dict(c["temper"])); a.setdefault("heard", 0); a.setdefault("said", 0)
    a.setdefault("boosted", 0); a.setdefault("names", {}); a.setdefault("beliefs", {})
    if c.get("owner"): a["names"][c["name"]] = max(3, a["names"].get(c["name"], 0))  # an owned pet already knows its name

boost = {"mode": "off", "model": "", "rate": 0.3, "key": os.environ.get("ANTHROPIC_API_KEY", ""), "last_error": ""}

# ---------- tiny naive Bayes (reads the player's intent) ----------
SEED = {"greet": ["hello", "hi", "hey there", "good evening", "greetings"],
        "threat": ["give me your money", "i will hurt you", "die", "hand it over", "i draw my sword"],
        "bye": ["goodbye", "farewell", "see you", "i must go"],
        "pet": ["good boy", "good kitty", "here boy", "who's a good dog", "pspsps"],
        "gossip": ["what do you think of", "any news", "heard anything", "tell me about"],
        "calm": ["it's okay", "relax", "you're safe", "calm down"]}

def nb_train(intent, text):
    c = brain["nb"].setdefault(intent, {"docs": 0, "w": {}, "n": 0})
    c["docs"] += 1
    for w in words(text):
        c["w"][w] = c["w"].get(w, 0) + 1; c["n"] += 1

if not brain["nb"]:
    for k, xs in SEED.items():
        for x in xs: nb_train(k, x)
    for c in CAST.values():
        if c["kind"] == "human":
            for k, xs in c["lines"].items():
                for x in xs: nb_train(k, re.sub(r"{\w+}", "", x))

def classify(text):
    ws = words(text)
    vocab = len({w for c in brain["nb"].values() for w in c["w"]}) + 1
    docs = sum(c["docs"] for c in brain["nb"].values())
    sc = {}
    for k, c in brain["nb"].items():
        s = math.log(c["docs"] / docs)
        for w in ws: s += math.log((c["w"].get(w, 0) + 1) / (c["n"] + vocab))
        sc[k] = s
    if not ws or not sc: return "chat"
    best = max(sc, key=sc.get)
    known = any(w in c["w"] for c in brain["nb"].values() for w in ws)
    return best if known else "chat"

# ---------- word chains ----------
def chain_learn(a, text):
    ws = ["^"] + words(text) + ["$"]
    for x, y, z in zip(ws, ws[1:], ws[2:]):
        l = a["chain"].setdefault(x + " " + y, [])
        if len(l) < 20: l.append(z)

def chain_say(a):
    st = [k for k in a["chain"] if k.startswith("^ ")]
    for _ in range(15):
        if not st: return None
        k = random.choice(st); out = [k.split()[1]]
        while len(out) < 12:
            n = random.choice(a["chain"].get(k, ["$"]))
            if n == "$": break
            out.append(n); k = k.split()[1] + " " + n
        if len(out) >= 3:
            s = " ".join(out)
            return s[0].upper() + s[1:] + random.choice([".", "...", "?"])
    return None

# ---------- boost (optional bigger brain) ----------
def boost_line(sid, to_name, intent, heard, state, about=None):
    c, a = CAST[sid], brain["agents"][sid]
    t = a["temper"]
    ex = random.sample(c["lines"].get(intent, c["lines"]["chat"]), k=min(2, len(c["lines"].get(intent, c["lines"]["chat"]))))
    prompt = (f"You are {c['name']}, a {c['role']} in a small grim-fantasy tavern room. "
              f"Temperament (0-1): aggression {t['aggression']:.1f}, fear {t['fear']:.1f}, sociability {t['social']:.1f}, mood {t['mood']:.1f}. "
              f"Current state: {state}. Intent: {intent}. "
              + (f"You are speaking to {to_name}. " if to_name else "You are speaking to the room. ")
              + (f"They just said: \"{heard}\". " if heard else "")
              + (f"You are talking about this: {about['subject']} {about['crime']} {about['victim']}. Mention those names. " if about else "")
              + f"Examples of how you talk: {' / '.join(ex)}. "
              "Reply with ONE short line of spoken dialogue, at most 15 words. No quotes, no narration, no emojis.")
    if boost["mode"] == "ollama":
        req = urllib.request.Request("http://127.0.0.1:11434/api/generate", method="POST",
              data=json.dumps({"model": boost["model"] or "llama3.2", "prompt": prompt, "stream": False,
                               "options": {"num_predict": 60, "temperature": 0.9}}).encode(),
              headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            out = json.loads(r.read())["response"]
    elif boost["mode"] == "anthropic":
        if not boost["key"]: raise RuntimeError("no API key pasted")
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", method="POST",
              data=json.dumps({"model": boost["model"] or "claude-haiku-4-5-20251001", "max_tokens": 80,
                               "messages": [{"role": "user", "content": prompt}]}).encode(),
              headers={"Content-Type": "application/json", "x-api-key": boost["key"], "anthropic-version": "2023-06-01"})
        with urllib.request.urlopen(req, timeout=20) as r:
            out = "".join(b.get("text", "") for b in json.loads(r.read())["content"])
    else:
        return None
    out = out.strip().split("\n")[0].strip(" \"'")[:140]
    return out or None

# ---------- speaking & hearing ----------
def fill(line, sid, to, to_name=None, about=None):
    others = [CAST[k]["name"] for k in CAST if k not in (sid, to) and CAST[k]["kind"] == "human"]
    to_name = CAST[to]["name"] if to in CAST else (to_name or to or "friend")
    line = line.replace("{to}", to_name).replace("{other}", random.choice(others) if others else "someone")
    ab = dict(about or {})
    me = CAST[sid]["name"] if sid in CAST else None
    if ab.get("victim") and ab["victim"] == me: ab["victim"] = "me"          # "Sly robbed me!", not "Sly robbed Edda!"
    elif ab.get("victim") and ab["victim"] == to_name: ab["victim"] = "you"  # telling Bram that Sly hit Bram
    return (line.replace("{subject}", ab.get("subject", "someone")).replace("{victim}", ab.get("victim", "someone"))
                .replace("{crime}", ab.get("crime", "hurt")))

def slotify(text, about, to_name=None):
    """Turn names back into slots so a learned line can be reused about anyone."""
    if about:
        for k in ("subject", "victim"):
            if about.get(k): text = text.replace(about[k], "{" + k + "}")
        if about.get("crime"): text = text.replace(" " + about["crime"] + " ", " {crime} ")
    if to_name: text = text.replace(to_name, "{to}")
    return text

def speak(sid, to, intent, heard, state, to_name=None, about=None):
    c, a = CAST[sid], brain["agents"][sid]
    base = c["lines"].get(intent) or c["lines"].get("reply") or c["lines"]["chat"]
    src, frm = "base", None
    text = None
    if c["kind"] == "human" and boost["mode"] != "off" and random.random() < boost["rate"]:
        try:
            to_name = CAST[to]["name"] if to in CAST else to_name
            text = boost_line(sid, to_name, intent, heard, state, about)
            if text:
                src = "boost"; a["boosted"] += 1
                keep = slotify(text, about, to_name)
                a["learned"].setdefault(intent, []).append({"t": keep, "from": "boost", "n": 2})
                a["learned"][intent] = a["learned"][intent][-40:]
                chain_learn(a, text)
                boost["last_error"] = ""
        except Exception as e:
            boost["last_error"] = str(e)[:200]
    if not text:
        op = a["temper"]["openness"]
        learned = a["learned"].get(intent, [])
        if c["kind"] == "human" and not about and len(a["chain"]) > 30 and random.random() < min(0.2, len(a["chain"]) / 500) * op * 2:
            text = chain_say(a); src = "remix"
        if not text:
            pool = [(l, 1.0, None) for l in base] + [(x["t"], 0.5 * x["n"] * op * 2, x["from"]) for x in learned]
            r = random.random() * sum(w for _, w, _ in pool)
            for l, w, f in pool:
                r -= w
                if r <= 0:
                    text, frm = l, f
                    src = "base" if f is None else ("boost" if f == "boost" else "learned")
                    break
            text = fill(text or random.choice(base), sid, to, to_name, about)
    a["said"] += 1
    return text, src, frm

def hear(lid, sid, text, intent, about=None, to_name=None):
    """Listener lid overhears speaker sid. Returns temperament changes."""
    if lid not in CAST: return {}
    c, a = CAST[lid], brain["agents"][lid]
    a["heard"] += 1
    if sid:
        a["affinity"][sid] = max(-1, min(1, a["affinity"].get(sid, 0) + AFFINITY.get(intent, 0)))
    d = dict(EFFECT.get(intent, {}))
    if c["faction"] == "guard" and intent == "threat":
        d["aggression"] = 0.1
    if c["kind"] != "human":
        if c["name"].lower() in text.lower():  # pets/animals slowly learn their name
            a["names"][c["name"]] = a["names"].get(c["name"], 0) + 1
        return d
    chain_learn(a, text) if random.random() < 0.3 + a["temper"]["openness"] else None
    aff = a["affinity"].get(sid, 0)
    if sid in CAST and CAST[sid]["kind"] == "human" and random.random() < a["temper"]["openness"] * (0.6 + aff):
        keep = slotify(slotify(text, None, to_name) if to_name else text, about, c["name"])  # whoever was addressed becomes {to}
        lst = a["learned"].setdefault(intent, [])
        for x in lst:
            if x["t"] == keep:
                x["n"] += 1; break
        else:
            if keep not in CAST[lid]["lines"].get(intent, []):
                lst.append({"t": keep, "from": CAST[sid]["name"], "n": 1})
                a["learned"][intent] = lst[-40:]
    return d

def stats(k):
    a = brain["agents"][k]
    return {"learned": sum(len(v) for v in a["learned"].values()), "heard": a["heard"], "said": a["said"],
            "boosted": a["boosted"], "words": len(a["chain"]),
            "knows_name": a["names"].get(CAST[k]["name"], 0) >= 3,
            "affinity": {CAST[o]["name"]: round(v, 2) for o, v in a["affinity"].items() if o in CAST}}

# ---------- http ----------
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def out(self, code, body, ct="application/json"):
        b = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code); self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self):
        return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
    def do_GET(self):
        p = self.path.split("?")[0]
        if p in ("/", "/room.html"):
            with open(os.path.join(HERE, "room.html"), "rb") as f: return self.out(200, f.read(), "text/html; charset=utf-8")
        if p == "/room.js":
            with open(os.path.join(HERE, "room.js"), "rb") as f: return self.out(200, f.read(), "text/javascript; charset=utf-8")
        if p == "/cast":
            with lock:
                return self.out(200, json.dumps({k: {"name": c["name"], "role": c["role"], "faction": c["faction"], "kind": c["kind"],
                    "owner": c.get("owner"), "temper": brain["agents"][k]["temper"], "base": c["temper"], "stats": stats(k),
                    "beliefs": brain["agents"][k]["beliefs"]} for k, c in CAST.items()}))
        if p == "/boost":
            return self.out(200, json.dumps({k: (bool(v) if k == "key" else v) for k, v in boost.items()}))
        self.out(404, "{}")
    def do_POST(self):
        try:
            d = self.body()
            if self.path == "/talk":
                sid, to = d["speaker"], d.get("to")
                intent = d.get("intent", "chat")
                about = d.get("about") or None
                text, src, frm = speak(sid, to, intent, d.get("heard"), d.get("state", ""), d.get("to_name"), about)
                with lock:
                    to_nm = CAST[to]["name"] if to in CAST else d.get("to_name")
                    deltas = {l: hear(l, sid, text, intent, about, to_nm) for l in d.get("listeners", []) if l != sid and l in CAST}
                    save()
                    st = {k: stats(k) for k in [sid] + list(deltas)}
                return self.out(200, json.dumps({"text": text, "src": src, "from": frm, "intent": intent, "deltas": deltas, "stats": st}))
            if self.path == "/player":
                text = str(d.get("text", ""))[:300]
                with lock:
                    intent = classify(text)
                    deltas = {l: hear(l, "player", text, intent) for l in d.get("listeners", []) if l in CAST}
                    to = d.get("to")
                    if to in CAST and CAST[to]["kind"] == "human" and random.random() < CAST[to]["temper"]["openness"]:
                        keep = text.replace(CAST[to]["name"], "{to}")
                        brain["agents"][to]["learned"].setdefault(intent, []).append({"t": keep, "from": d.get("name", "player"), "n": 1})
                    save()
                    st = {k: stats(k) for k in deltas}
                return self.out(200, json.dumps({"intent": intent, "deltas": deltas, "stats": st}))
            if self.path == "/save":
                with lock:
                    for k, t in d.get("tempers", {}).items():
                        if k in CAST: brain["agents"][k]["temper"] = {x: round(max(0, min(1, float(v))), 3) for x, v in t.items()}
                    for k, b in d.get("beliefs", {}).items():
                        if k in CAST and isinstance(b, dict): brain["agents"][k]["beliefs"] = b
                    save()
                return self.out(200, "{}")
            if self.path == "/boost":
                for k in ("mode", "model"):
                    if k in d: boost[k] = str(d[k])
                if "rate" in d: boost["rate"] = max(0, min(1, float(d["rate"])))
                if d.get("key"): boost["key"] = str(d["key"]).strip()
                return self.out(200, json.dumps({"ok": True, "mode": boost["mode"]}))
            if self.path == "/forget":
                with lock:
                    for k, c in CAST.items():
                        brain["agents"][k] = {"learned": {}, "chain": {}, "affinity": {}, "temper": dict(c["temper"]),
                                              "heard": 0, "said": 0, "boosted": 0, "beliefs": {},
                                              "names": {c["name"]: 3} if c.get("owner") else {}}
                    save()
                return self.out(200, json.dumps({"ok": True}))
            self.out(404, "{}")
        except Exception as e:
            self.out(500, json.dumps({"error": str(e)}))

if __name__ == "__main__":
    url = f"http://127.0.0.1:{PORT}"
    print(f"Hollow Room is open at {url}  (Ctrl+C to stop)")
    threading.Timer(1, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

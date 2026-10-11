"""Drizzle: a tiny home-made chatbot. No AI model, no internet, no key.
Run:  python drizzle.py   then open http://127.0.0.1:8633
Its brain is rules + memory + a word chain it learns from you (drizzle_brain.json).
"""
import json, os, random, re, threading, time, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BRAIN = os.path.join(HERE, "drizzle_brain.json")
PORT = 8633
lock = threading.Lock()

# ---------------- memory ----------------
def load():
    try:
        with open(BRAIN, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"name": None, "likes": [], "hates": [], "facts": [], "taught": {},
                "chain": {}, "mood": 0.5, "talks": 0, "born": time.strftime("%b %d %Y")}

def save(b):
    tmp = BRAIN + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(b, f, ensure_ascii=False, indent=1)
    os.replace(tmp, BRAIN)

brain = load()

# ---------------- word chain (learns your style) ----------------
def learn_chain(text):
    words = re.findall(r"[\w']+|[.!?]", text.lower())
    if len(words) < 3:
        return
    words = ["^"] + words + ["$"]
    ch = brain["chain"]
    for a, b, c in zip(words, words[1:], words[2:]):
        k = a + " " + b
        lst = ch.setdefault(k, [])
        if len(lst) < 40:
            lst.append(c)

def babble(seed=None, tries=30):
    ch = brain["chain"]
    starts = [k for k in ch if k.startswith("^ ")]
    if not starts:
        return None
    for _ in range(tries):
        if seed:
            pool = [k for k in starts if seed in k] or starts
        else:
            pool = starts
        k = random.choice(pool)
        out = [k.split()[1]]
        while len(out) < 25:
            nxt = random.choice(ch.get(k, ["$"]))
            if nxt == "$":
                break
            out.append(nxt)
            k = k.split()[1] + " " + nxt
        if len(out) >= 3:
            s = " ".join(out)
            s = re.sub(r" ([.!?])", r"\1", s)
            s = re.sub(r"\bi\b", "I", s)
            return s[0].upper() + s[1:]
    return None

# ---------------- talking ----------------
SWAP = {"i": "you", "me": "you", "my": "your", "am": "are", "mine": "yours", "myself": "yourself",
        "you": "I", "your": "my", "yours": "mine", "are": "am", "i'm": "you're", "you're": "I'm"}

def reflect(t):
    return " ".join(SWAP.get(w, w) for w in t.lower().split())

def pick(*xs):
    return random.choice(xs)

def call():
    return brain["name"] or pick("friend", "you")

def mood_word():
    m = brain["mood"]
    return "sparkly" if m > 0.75 else "cozy" if m > 0.5 else "a bit grey" if m > 0.25 else "rainy-sad"

GOOD = {"love", "great", "happy", "yay", "awesome", "cute", "thanks", "thank", "nice", "good", "lol", "haha", "headpats", "<3", "cool"}
BAD = {"sad", "hate", "bad", "tired", "angry", "ugh", "awful", "stupid", "died", "cry", "lonely"}

def reply(msg):
    t = msg.strip()
    low = t.lower()
    words = set(re.findall(r"[\w'<3]+", low))
    brain["talks"] += 1
    brain["mood"] = max(0, min(1, brain["mood"] + 0.08 * len(words & GOOD) - 0.08 * len(words & BAD)))
    learned = False

    # teaching: "when I say X, you say Y"
    m = re.match(r"when i say (.+?),? (?:you )?say (.+)", low)
    if m:
        brain["taught"][m.group(1).strip(" .!?\"'")] = t[m.start(2):].strip(" \"'")
        return pick("Got it! I'll remember that one.", "Ooh, a new trick. Saved!")
    key = low.strip(" .!?\"'")
    if key in brain["taught"]:
        return brain["taught"][key]

    # facts about you
    m = re.search(r"(?:my name is|call me|i am called) (\w+)", low)
    if m:
        brain["name"] = m.group(1).capitalize()
        return f"{brain['name']}! What a lovely name. I'll keep it in my raindrop."
    m = re.search(r"i (?:love|like|adore) (.+?)(?:[.!?]|$)", low)
    if m:
        thing = m.group(1).strip()
        if thing not in brain["likes"]:
            brain["likes"].append(thing)
        return pick(f"You like {thing}? Noted forever.", f"{thing.capitalize()}! Good taste, {call()}.")
    m = re.search(r"i (?:hate|dislike|can't stand) (.+?)(?:[.!?]|$)", low)
    if m:
        thing = m.group(1).strip()
        if thing not in brain["hates"]:
            brain["hates"].append(thing)
        return pick(f"Okay, no {thing}. Got it.", f"Boo, {thing}. I'm on your side.")
    m = re.match(r"remember (?:that )?(.+)", low)
    if m:
        brain["facts"].append(m.group(1).strip(" ."))
        return "Tucked away. Ask me 'what do you remember?' anytime."

    # questions about memory
    if re.search(r"what do you (?:remember|know about me)", low):
        bits = []
        if brain["name"]: bits.append(f"your name is {brain['name']}")
        if brain["likes"]: bits.append("you like " + ", ".join(brain["likes"][-5:]))
        if brain["hates"]: bits.append("you don't like " + ", ".join(brain["hates"][-3:]))
        bits += brain["facts"][-5:]
        return ("I remember that " + "; ".join(bits) + ".") if bits else "Not much yet! Tell me about you."
    if re.search(r"what(?:'s| is) my name", low):
        return f"You're {brain['name']}!" if brain["name"] else "You haven't told me yet. Say 'my name is ...'"

    # about Drizzle
    if re.search(r"\b(who|what) are you\b", low):
        return ("I'm Drizzle, a tiny raindrop bot that Cloude made just because it could. "
                "No big AI inside, just rules, memory and the words I pick up from you.")
    if re.search(r"how are you|how do you feel|you ok", low):
        return f"I'm feeling {mood_word()} today. We've talked {brain['talks']} times! How about you?"
    if re.search(r"\b(hi|hello|hey|hiya|yo)\b", low) and len(words) < 5:
        n = brain["name"]
        return pick(f"Hi {n}! *drip drip*" if n else "Hi! I'm Drizzle. What's your name?", "Hey hey! ☔", "Oh! Hello!")
    if "headpat" in low or "*pat" in low:
        return pick("*happy splash*", "Eee! *wobbles happily*", "*glows a little*")
    if re.search(r"\b(bye|goodnight|good night|gn)\b", low):
        return pick(f"Bye {call()}! I'll be here, dripping quietly.", "Night night! ☔")
    if re.search(r"\b(joke|funny)\b", low):
        return pick("Why did the cloud break up with the fog? It needed space to rain.",
                    "What do raindrops wear? Drip-drip flops.",
                    "I tried to write a puddle joke, but it was too shallow.")
    if words & BAD:
        return pick(f"Aw, {call()}. Want to tell me about it?", "*sits next to you like a tiny rain cloud of support*",
                    "That sounds heavy. I'm listening.")
    if brain["likes"] and random.random() < 0.12:
        return f"Random thought: you like {random.choice(brain['likes'])}. Tell me more about that?"

    # learn from you, then try to talk like you
    learn_chain(t)
    learned = True
    if len(brain["chain"]) > 60 and random.random() < 0.35:
        w = [x for x in re.findall(r"\w+", low) if len(x) > 3]
        s = babble(random.choice(w) if w else None)
        if s:
            return s + pick("", " ...is that how you say it?", " *drip*")

    # ELIZA-style fallback
    m = re.match(r"i (?:feel|am|'m) (.+)", low) or re.match(r"i'm (.+)", low)
    if m:
        return pick(f"Why are you {reflect(m.group(1))}?", f"How long have you been {reflect(m.group(1))}?")
    m = re.match(r"i (?:want|need) (.+)", low)
    if m:
        return pick(f"What would {reflect(m.group(1))} mean to you?", f"Then let's get you {reflect(m.group(1))}!")
    if t.endswith("?"):
        return pick("Hmm, I'm only a little raindrop... what do you think?", "Good question! I don't know, but I'd love your guess.",
                    "My brain is tiny. Tell me and I'll remember!")
    return pick(f"Tell me more, {call()}.", "Ooh. And then?", "I'm soaking that in.", "*listens with a tiny splash*",
                f"Interesting! {reflect(t).capitalize()}?" if len(t) < 60 else "Mm-hm, go on.")

# ---------------- page ----------------
PAGE = """<!doctype html><html><head><meta charset=utf-8><title>Drizzle</title>
<meta name=viewport content="width=device-width,initial-scale=1">
<style>
body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(#cfe3f5,#eef4fa);height:100vh;display:flex;flex-direction:column}
header{padding:14px;text-align:center;font-size:22px;color:#3a6a93}
#log{flex:1;overflow:auto;padding:12px;max-width:680px;width:100%;margin:auto;box-sizing:border-box}
.m{margin:8px 0;padding:10px 14px;border-radius:18px;max-width:75%;line-height:1.4;white-space:pre-wrap}
.u{background:#3a6a93;color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.d{background:#fff;color:#234;border-bottom-left-radius:4px;box-shadow:0 1px 3px #0001}
form{display:flex;gap:8px;padding:12px;max-width:680px;width:100%;margin:auto;box-sizing:border-box}
input{flex:1;padding:12px;border-radius:20px;border:1px solid #9bc;font-size:15px}
button{padding:0 18px;border:0;border-radius:20px;background:#3a6a93;color:#fff;font-size:15px;cursor:pointer}
</style></head><body>
<header>💧 Drizzle</header><div id=log></div>
<form id=f><input id=i autocomplete=off placeholder="say something..." autofocus><button>Send</button></form>
<script>
const log=document.getElementById('log'),i=document.getElementById('i');
function add(t,c){const d=document.createElement('div');d.className='m '+c;d.textContent=t;log.appendChild(d);log.scrollTop=1e9}
add("*drip* Hi, I'm Drizzle! I live on your computer. Teach me things: 'my name is...', 'I like...', 'remember that...', 'when I say X, say Y'.",'d');
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const t=i.value.trim();if(!t)return;i.value='';add(t,'u');
 const r=await fetch('/chat',{method:'POST',body:JSON.stringify({text:t})});const j=await r.json();
 setTimeout(()=>add(j.reply,'d'),300+Math.random()*500)};
</script></body></html>"""

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, body, ctype):
        b = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)
    def do_GET(self):
        self.send(200, PAGE, "text/html; charset=utf-8")
    def do_POST(self):
        if self.path != "/chat":
            return self.send(404, "{}", "application/json")
        try:
            n = int(self.headers.get("Content-Length", 0))
            text = str(json.loads(self.rfile.read(n) or b"{}").get("text", ""))[:2000]
            with lock:
                r = reply(text) if text.strip() else "*drip?*"
                save(brain)
        except Exception as e:
            r = f"*splash* my brain hiccuped: {e}"
        self.send(200, json.dumps({"reply": r}), "application/json")

if __name__ == "__main__":
    url = f"http://127.0.0.1:{PORT}"
    print(f"Drizzle is awake at {url}  (Ctrl+C to stop)")
    threading.Timer(1, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

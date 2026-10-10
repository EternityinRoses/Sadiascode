"""Hollow Town on the PC: serves the town and gives its people cloud brains.

Run Town.bat (or: python server.py), then open http://127.0.0.1:8650
Nothing heavy runs on this computer: every brain is a cloud model.

  - The mayor and the townsfolk each get a model from town_brains.json (made on first run).
  - Providers: "anthropic" (uses Cloude's API key from ..\\config.json or ANTHROPIC_API_KEY)
    and "ollama" (Ollama's cloud models: either the Ollama app signed in, host
    http://localhost:11434 and a model ending in -cloud, or host https://ollama.com with
    OLLAMA_API_KEY set). Set a group's provider to "off" for plain brains only.
  - Each person has their own notebook in brains/<town>/<person>.json. A person's prompt
    only ever contains their own notebook: nobody reads anyone else's mind.
  - A daily dollar cap stops paid calls; the town keeps running on its plain brains.
    Townsfolk re-plan at most every folk_every_minutes real minutes each.
  - The town's learned mind (the lore) is kept in lore.json.
Keys are read, never written or printed.
"""
import json, os, re, threading, time, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8650
SETTINGS = os.path.join(HERE, "town_brains.json")
LORE = os.path.join(HERE, "lore.json")
BRAINS = os.path.join(HERE, "brains")
DEFAULTS = {
    "mayor": {"provider": "anthropic", "model": "claude-sonnet-5-5"},
    "folk": {"provider": "anthropic", "model": "claude-haiku-5-5"},
    "ollama_example": {"provider": "ollama", "model": "gpt-oss:20b-cloud", "host": "http://localhost:11434"},
    "daily_dollar_cap": 2.0,
    "parallel": 3,
    "folk_every_minutes": 10,
}
# rough $ per million tokens (input, output), for the cap; Ollama cloud is a flat subscription
PRICES = {"haiku": (1, 5), "sonnet": (3, 15), "opus": (5, 25)}

def settings():
    if not os.path.exists(SETTINGS):
        with open(SETTINGS, "w", encoding="utf-8") as f:
            json.dump(DEFAULTS, f, indent=2)
    try:
        with open(SETTINGS, encoding="utf-8") as f:
            return {**DEFAULTS, **json.load(f)}
    except Exception:
        return DEFAULTS

def anthropic_key():
    try:
        with open(os.path.join(HERE, "..", "config.json"), encoding="utf-8") as f:
            k = json.load(f).get("api_key")
            if k:
                return k
    except Exception:
        pass
    return os.environ.get("ANTHROPIC_API_KEY", "")

def ollama_key():
    try:
        with open(os.path.join(HERE, "..", "config.json"), encoding="utf-8") as f:
            k = json.load(f).get("ollama_key")
            if k:
                return k
    except Exception:
        pass
    return os.environ.get("OLLAMA_API_KEY", "")

# ---------------------------------------------------------------- spending --
usage = {"day": time.strftime("%Y-%m-%d"), "calls": 0, "cost": 0.0, "errors": 0}
ulock = threading.Lock()

def spend(model, tin, tout):
    with ulock:
        if usage["day"] != time.strftime("%Y-%m-%d"):
            usage.update(day=time.strftime("%Y-%m-%d"), calls=0, cost=0.0, errors=0)
        usage["calls"] += 1
        price = next((v for k, v in PRICES.items() if k in model), (0, 0))
        usage["cost"] += (tin * price[0] + tout * price[1]) / 1e6

def capped():
    return usage["cost"] >= float(settings().get("daily_dollar_cap", 2.0))

# ------------------------------------------------------------------ models --
def post(url, body, headers, timeout=60):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def ask_model(cfg, prompt):
    prov, model = cfg.get("provider", "off"), cfg.get("model", "")
    if prov == "anthropic":
        key = anthropic_key()
        if not key:
            raise RuntimeError("no Anthropic key (Cloude's config.json api_key, or ANTHROPIC_API_KEY)")
        j = post("https://api.anthropic.com/v1/messages", {"model": model, "max_tokens": 1200, "messages": [{"role": "user", "content": prompt}]},
                 {"x-api-key": key, "anthropic-version": "2023-06-01"})
        u = j.get("usage", {})
        spend(model, u.get("input_tokens", 0), u.get("output_tokens", 0))
        return "".join(b.get("text", "") for b in j.get("content", []) if b.get("type") == "text")
    if prov == "ollama":
        host = cfg.get("host", "http://localhost:11434").rstrip("/")
        key = ollama_key()
        j = post(host + "/api/chat", {"model": model, "stream": False, "format": "json", "messages": [{"role": "user", "content": prompt}]},
                 {"Authorization": "Bearer " + key} if key else {}, timeout=90)
        spend(model, j.get("prompt_eval_count", 0), j.get("eval_count", 0))
        return (j.get("message") or {}).get("content", "")
    return None

def parse(text):
    if not text:
        return None
    m = re.search(r"\{.*\}", text, re.S)
    try:
        return json.loads(m.group(0)) if m else None
    except Exception:
        return None

# ------------------------------------------------------- private notebooks --
def safe(s):
    return re.sub(r"[^\w-]", "_", str(s))[:60]

def book_path(town, person):
    d = os.path.join(BRAINS, safe(town))
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, safe(person) + ".json")

def read_book(town, person):
    try:
        with open(book_path(town, person), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"notes": [], "said": []}

def write_book(town, person, book):
    p = book_path(town, person)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=1)
    os.replace(p + ".tmp", p)

gate = threading.BoundedSemaphore(max(1, int(settings().get("parallel", 3))))

def think(req):
    st = settings()
    cfg = st["mayor"] if req.get("brain") == "mayor-ai" else st["folk"]
    if cfg.get("provider", "off") == "off" or capped():
        return None
    town, person = req.get("town", "town"), req.get("person", "x")
    book = read_book(town, person)
    # townsfolk re-plan at most every few real minutes (at high speed most days run on yesterday's plan)
    if req.get("brain") != "mayor-ai" and time.time() - book.get("asked", 0) < 60 * float(st.get("folk_every_minutes", 10)):
        return None
    book["asked"] = time.time()
    write_book(town, person, book)
    prompt = str(req.get("prompt", ""))[:12000]
    if book["notes"]:
        prompt += "\nYour own notebook (only you can see it): " + " | ".join(book["notes"][-12:])
    with gate:
        try:
            dec = parse(ask_model(cfg, prompt))
        except Exception as e:
            with ulock:
                usage["errors"] += 1
            print(f"[brain] {req.get('name', person)}: {type(e).__name__}: {str(e)[:160]}")
            return None
    if isinstance(dec, dict):
        note = dec.get("note") or dec.get("statement")
        if note:
            book["notes"] = (book["notes"] + [f"day {req.get('day', '?')}: {str(note)[:200]}"])[-30:]
        if dec.get("say"):
            book["said"] = (book["said"] + [str(dec["say"])[:200]])[-20:]
        book["name"] = req.get("name", person)
        write_book(town, person, book)
        print(f"[brain] {req.get('name', person)} ({cfg.get('model')}): {json.dumps(dec)[:160]}")
        return dec
    return None

# ------------------------------------------------------------------ server --
TYPES = {".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png"}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def body(self):
        n = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(n) if n else b""

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/brain/ping":
            st = settings()
            lab = lambda c: "plain brains" if c.get("provider", "off") == "off" else f"{c.get('model')} ({c.get('provider')})"
            return self.send(200, json.dumps({"ok": True, "mayor": lab(st["mayor"]), "folk": "off" if st["folk"].get("provider", "off") == "off" else lab(st["folk"]),
                                              "calls": usage["calls"], "cost": usage["cost"], "capped": capped(), "errors": usage["errors"]}))
        if path == "/lore":
            if not os.path.exists(LORE):
                return self.send(200, "{}")
            with open(LORE, "rb") as f:
                return self.send(200, f.read())
        name = "index.html" if path in ("/", "") else path.lstrip("/")
        full = os.path.normpath(os.path.join(HERE, name))
        # only the town's own page files; never settings, notebooks or keys
        if os.path.dirname(full) != HERE or os.path.splitext(full)[1] not in (".html", ".js", ".css", ".png") or not os.path.isfile(full):
            return self.send(404, "{}")
        with open(full, "rb") as f:
            self.send(200, f.read(), TYPES.get(os.path.splitext(full)[1], "application/octet-stream"))

    def do_POST(self):
        if self.path == "/brain":
            try:
                req = json.loads(self.body() or b"{}")
            except Exception:
                return self.send(400, "{}")
            return self.send(200, json.dumps({"decision": think(req)}))
        if self.path == "/lore":
            raw = self.body()
            try:
                json.loads(raw)
            except Exception:
                return self.send(400, "{}")
            with open(LORE + ".tmp", "wb") as f:
                f.write(raw)
            os.replace(LORE + ".tmp", LORE)
            return self.send(200, "{}")
        self.send(404, "{}")

if __name__ == "__main__":
    st = settings()
    print(f"Hollow Town: http://127.0.0.1:{PORT}")
    print(f"  mayor: {st['mayor']}\n  folk:  {st['folk']}\n  daily cap: ${st.get('daily_dollar_cap')}  (edit town_brains.json to change)")
    if not anthropic_key() and "anthropic" in (st["mayor"].get("provider"), st["folk"].get("provider")):
        print("  ! no Anthropic key found: those brains fall back to plain brains")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

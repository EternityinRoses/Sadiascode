"""Hollow Town on the PC: serves the town and gives its people cloud brains.

Run Town.bat (or: python server.py), then open http://127.0.0.1:8650
Nothing heavy runs on this computer: every brain is a cloud model.

  - The mayor and the townsfolk each get a model from town_brains.json (made on first run).
  - Providers: "anthropic" (uses Cloude's API key from ..\\config.json or ANTHROPIC_API_KEY)
    and "ollama" (Ollama's cloud models: either the Ollama app signed in, host
    http://localhost:11434 and a model ending in -cloud, or host https://ollama.com with
    OLLAMA_API_KEY set). Set a group's provider to "off" for plain brains only.
  - Each person is their own AI instance: a fixed identity (cached), their own running thread of
    turns and their own notes, all in brains/<town>/<person>.json. Nobody reads anyone else's mind.
  - A daily dollar cap stops paid calls; the town keeps running on its plain brains.
    Townsfolk re-plan at most every folk_every_minutes real minutes each.
  - The town's learned mind (the lore) is kept in lore.json. It stays when the AI is unplugged.
  - chronicle.md: a summary per game day, for Claude to read and suggest fixes.
    dataset.jsonl: what was chosen and how it paid off, and what was said to what.
Keys are read, never written or printed.
"""
import json, os, re, threading, time, urllib.request, urllib.error, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8650
SETTINGS = os.path.join(HERE, "town_brains.json")
LORE = os.path.join(HERE, "lore.json")
CHRONICLE = os.path.join(HERE, "chronicle.md")
DATASET = os.path.join(HERE, "dataset.jsonl")
BRAINS = os.path.join(HERE, "brains")
CHATLOGS = os.path.join(HERE, "chatlogs")   # one plain-text log of talk per person per town (local only)
DEFAULTS = {
    "mayor": {"provider": "anthropic", "model": "claude-sonnet-5-5"},
    "folk": {"provider": "anthropic", "model": "claude-haiku-5-5"},
    "ollama_example": {"provider": "ollama", "model": "gpt-oss:20b-cloud", "host": "http://localhost:11434"},
    "daily_dollar_cap": 2.0,
    "parallel": 3,
    "folk_every_minutes": 10,
    "chat_every_minutes": 3,
    "chatlog_mayor": False,   # Cloude as mayor already keeps its own chat, so its chat log is skipped unless this is true
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
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:   # say what the far side said, not just the number
        try:
            said = e.read().decode("utf-8", "replace")[:200]
        except Exception:
            said = ""
        hint = ""
        if e.code == 401 and "ollama.com" in url:
            hint = " (ollama.com needs an API key from ollama.com/settings/keys as ollama_key in config.json; the app's sign-in doesn't count there)"
        elif e.code == 401 and "11434" in url:
            hint = " (the Ollama app on this PC isn't signed in for cloud models: open a terminal, run `ollama signin`, then restart the Ollama app)"
        raise RuntimeError(f"HTTP {e.code} from {url.split('/api')[0]}: {said}{hint}") from None

NO_EFFORT = {}   # models that refused an effort setting

def ask_model(cfg, prompt, system=None, history=None, kind=None):
    """One turn for one person's instance: their fixed identity (system), their own past turns, and now."""
    prov, model = cfg.get("provider", "off"), cfg.get("model", "")
    msgs = list(history or []) + [{"role": "user", "content": prompt}]
    if prov == "anthropic":
        key = anthropic_key()
        if not key:
            raise RuntimeError("no Anthropic key (Cloude's config.json api_key, or ANTHROPIC_API_KEY)")
        body = {"model": model, "max_tokens": 1200, "messages": msgs}
        if system:   # the identity never changes, so it is cached between this person's turns
            body["system"] = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
        eff = cfg.get("effort")
        if eff and not NO_EFFORT.get(model):
            body["output_config"] = {"effort": eff}
        try:
            j = post("https://api.anthropic.com/v1/messages", body,
                     {"x-api-key": key, "anthropic-version": "2023-06-01"})
        except Exception as e:
            if "output_config" not in body or "400" not in str(e):
                raise
            NO_EFFORT[model] = True   # this model doesn't take an effort setting: go on without it
            print(f"[brain] {model} doesn't take effort={eff}; asking without it from now on")
            body.pop("output_config", None)
            j = post("https://api.anthropic.com/v1/messages", body,
                     {"x-api-key": key, "anthropic-version": "2023-06-01"})
        u = j.get("usage", {})
        spend(model, u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) * 1.25 + u.get("cache_read_input_tokens", 0) * 0.1, u.get("output_tokens", 0))
        return "".join(b.get("text", "") for b in j.get("content", []) if b.get("type") == "text")
    if prov == "ollama":
        host = cfg.get("host", "http://localhost:11434").rstrip("/")
        cloud = host == "https://ollama.com"
        key = ollama_key() if cloud else ""   # the local app signs in by itself; a key is only for ollama.com
        if cloud and model.endswith("-cloud"):   # ollama.com names the same model without "-cloud"
            model = model[:-len("-cloud")]
        j = post(host + "/api/chat", {"model": model, "stream": False, "format": "json", "messages": ([{"role": "system", "content": system}] if system else []) + msgs},
                 {"Authorization": "Bearer " + key} if key else {}, timeout=90)
        spend(model, j.get("prompt_eval_count", 0), j.get("eval_count", 0))
        return (j.get("message") or {}).get("content", "")
    if prov == "cloude":
        # Cloude may be busy in its chat: the turn queues until it is free (Rose). A plan can wait half an hour;
        # a line of talk is only worth 5 minutes.
        return ask_cloude(model or "mayor", msgs, system, wait=300 if kind == "chat" else 1800)
    return None

# The "cloude" provider: the person is played by Cloude itself, through a mailbox folder, the
# same road Legends of Harpine's LLM seat uses. A request_<id>.json goes into
# ..\seats\town_<seat>\, Cloude's seat runner answers it in its game chat (with its memory),
# and writes reply_<id>.txt back. Nothing here talks to any model directly.
CLOUDE_SEATS = os.path.join(HERE, "..", "seats")

def ask_cloude(seat, msgs, system, wait=150):
    seat = safe(seat)
    box = os.path.join(CLOUDE_SEATS, "town_" + seat)
    os.makedirs(box, exist_ok=True)
    meta = os.path.join(box, "SEAT.json")
    if not os.path.exists(meta):
        with open(meta, "w", encoding="utf-8") as f:
            json.dump({"seat": seat, "game": "Hollow Town"}, f)
    rid = "town%d" % int(time.time() * 1000)
    req = os.path.join(box, f"request_{rid}.json")
    rep = os.path.join(box, f"reply_{rid}.txt")
    body = {"seat": seat, "wake": False, "awaiting_reply": True, "reply_to": f"reply_{rid}.txt",
            "ts": int(time.time() * 1000), "deadline_s": wait, "queue": True,
            "messages": ([{"role": "system", "content": system}] if system else []) + msgs}
    with open(req + ".part", "w", encoding="utf-8") as f:
        json.dump(body, f, ensure_ascii=False)
    os.replace(req + ".part", req)
    try:
        end = time.time() + wait + 5
        while time.time() < end:
            if os.path.exists(rep):
                time.sleep(0.5)      # let the write settle
                with open(rep, encoding="utf-8", errors="replace") as f:
                    text = f.read().strip()
                return "" if text == "PASS" else text
            time.sleep(1)
        raise RuntimeError("Cloude didn't answer in time (is Cloude running, with seats on?)")
    finally:
        for p in (req, rep):
            try:
                os.remove(p)
            except OSError:
                pass

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

def add_note(book, day, text):
    """Keep a note only if it says something new: not a repeat (or near-repeat) of one of the last few."""
    import difflib
    t = str(text).strip()[:200]
    if not t:
        return
    for old in book["notes"][-6:]:
        prev = old.split(": ", 1)[-1]
        if prev == t or difflib.SequenceMatcher(None, prev.lower(), t.lower()).ratio() > 0.8:
            return
    book["notes"] = (book["notes"] + [f"day {day}: {t}"])[-30:]


THREAD = 16   # how many past messages of their own thread each person keeps in mind (older ones live on as their notes)
gate = threading.BoundedSemaphore(max(1, int(settings().get("parallel", 3))))

# ------------------------------------------------------------- settings --
# The page's settings menu reads and writes town_brains.json. Keys are never sent to the page:
# it only learns whether one was found. Ollama hosts are limited to this computer or ollama.com,
# so a changed setting can never send the Ollama key anywhere else.
PROVIDERS = ("anthropic", "ollama", "cloude", "off")

def ok_host(h):
    return bool(re.fullmatch(r"(http://(localhost|127\.0\.0\.1)(:\d+)?|https://ollama\.com)", h or ""))

def clean_brain(b, old):
    b = b if isinstance(b, dict) else {}
    out = {"provider": b.get("provider") if b.get("provider") in PROVIDERS else old.get("provider", "off"),
           "model": re.sub(r"[^\w.:/-]", "", str(b.get("model", old.get("model", ""))))[:80]}
    eff = b.get("effort", old.get("effort", ""))
    if eff in ("low", "medium", "high"):
        out["effort"] = eff   # Claude API reasoning effort (Rose: "haiku low")
    if out["provider"] == "ollama":
        out["host"] = b.get("host") if ok_host(b.get("host")) else old.get("host", "http://localhost:11434")
        if not ok_host(out["host"]):
            out["host"] = "http://localhost:11434"
    return out

def save_settings(new):
    st = settings()
    st["mayor"] = clean_brain(new.get("mayor"), st["mayor"])
    st["folk"] = clean_brain(new.get("folk"), st["folk"])
    for k, lo, hi in (("daily_dollar_cap", 0, 100), ("folk_every_minutes", 1, 1440), ("chat_every_minutes", 0.5, 1440), ("parallel", 1, 8)):
        try:
            st[k] = max(lo, min(hi, float(new.get(k, st[k]))))
        except Exception:
            pass
    st["parallel"] = int(st["parallel"])
    with open(SETTINGS + ".tmp", "w", encoding="utf-8") as f:
        json.dump(st, f, indent=2)
    os.replace(SETTINGS + ".tmp", SETTINGS)
    return st

def list_models(provider, host):
    try:
        if provider == "anthropic":
            key = anthropic_key()
            if not key:
                return []
            req = urllib.request.Request("https://api.anthropic.com/v1/models?limit=100", headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return [m["id"] for m in json.loads(r.read()).get("data", [])]
        if provider == "ollama" and ok_host(host):
            key = ollama_key() if host.rstrip("/") == "https://ollama.com" else ""
            req = urllib.request.Request(host.rstrip("/") + "/api/tags", headers={"Authorization": "Bearer " + key} if key else {})
            with urllib.request.urlopen(req, timeout=15) as r:
                return [m.get("name") or m.get("model") for m in json.loads(r.read()).get("models", [])]
    except Exception as e:
        print(f"[settings] couldn't list {provider} models: {type(e).__name__}: {str(e)[:120]}")
    return []

def think(req):
    st = settings()
    cfg = st["mayor"] if req.get("brain") == "mayor-ai" else st["folk"]
    if cfg.get("provider", "off") == "off" or capped():
        return None
    town, person = req.get("town", "town"), req.get("person", "x")
    book = read_book(town, person)
    # townsfolk re-plan at most every few real minutes (at high speed most days run on yesterday's plan)
    if req.get("kind") == "chat":
        # a conversation line: each person STARTS a talk at most every few real minutes (answering anyone is always allowed)
        if not req.get("player") and not req.get("reply") and time.time() - book.get("chatted", 0) < 60 * float(st.get("chat_every_minutes", 3)):
            return None
        book["chatted"] = time.time()
    elif req.get("brain") != "mayor-ai" and time.time() - book.get("asked", 0) < (20 if req.get("waiting") else 60 * float(st.get("folk_every_minutes", 10))):
        return None
    elif cfg.get("provider") == "cloude" and not req.get("must") and time.time() - book.get("asked", 0) < 60 * float(st.get("cloude_every_minutes", 5)):
        return None       # Cloude plays in its own chat: a plan every few minutes, not every tick
    else:
        book["asked"] = time.time()
    write_book(town, person, book)
    prompt = str(req.get("prompt", ""))[:12000]
    turn = prompt     # what goes into their thread (the notebook is re-attached fresh each time)
    if book["notes"]:
        prompt += "\nYour own notebook (only you can see it): " + " | ".join(book["notes"][-12:])
    system = str(req.get("system") or "")[:12000] or None
    # this person's own thread: their past turns, and only theirs
    hist = [m for m in book.get("history", []) if m.get("role") in ("user", "assistant")][-THREAD:]
    while hist and hist[0]["role"] != "user":
        hist.pop(0)
    slot = gate if cfg.get("provider") != "cloude" else threading.Lock()   # a queued Cloude turn doesn't block the townsfolk
    with slot:
        try:
            raw = ask_model(cfg, prompt, system, hist, kind=req.get("kind"))
            dec = parse(raw)
        except Exception as e:
            with ulock:
                usage["errors"] += 1
            print(f"[brain] {req.get('name', person)}: {type(e).__name__}: {str(e)[:160]}")
            return None
    if isinstance(dec, dict):
        book["history"] = (hist + [{"role": "user", "content": turn}, {"role": "assistant", "content": json.dumps(dec, ensure_ascii=False)}])[-THREAD:]
        if req.get("kind") == "chat" and dec.get("say"):
            book["said"] = (book["said"] + [str(dec["say"])[:200]])[-20:]
            if dec.get("note"):
                add_note(book, req.get('day', '?'), dec["note"])
            write_book(town, person, book)
            print(f"[talk] {req.get('name', person)}: {str(dec['say'])[:150]}")
            return dec
        if dec.get("note"):
            add_note(book, req.get('day', '?'), dec["note"])
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

    def same_page(self):
        # only our own page may change settings (a custom header forces a browser preflight we never allow)
        o = self.headers.get("Origin", "")
        return self.headers.get("X-Town") == "1" and (not o or o in (f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"))

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/settings":
            st = settings()
            return self.send(200, json.dumps({**{k: st[k] for k in ("mayor", "folk", "daily_dollar_cap", "folk_every_minutes", "chat_every_minutes", "parallel")}, "keys": {"anthropic": bool(anthropic_key()), "ollama": bool(ollama_key())}}))
        if path == "/settings/models":
            q = dict(p.split("=", 1) for p in (self.path.split("?", 1) + [""])[1].split("&") if "=" in p)
            return self.send(200, json.dumps({"models": list_models(q.get("provider"), urllib.parse.unquote(q.get("host", "")))}))
        if path == "/brain/ping":
            st = settings()
            lab = lambda c: "plain brains" if c.get("provider", "off") == "off" else f"{c.get('model')} ({c.get('provider')})"
            return self.send(200, json.dumps({"ok": True, "mayor": lab(st["mayor"]), "folk": "off" if st["folk"].get("provider", "off") == "off" else lab(st["folk"]),
                                              "calls": usage["calls"], "cost": usage["cost"], "capped": capped(), "errors": usage["errors"]}))
        if path == "/chatlog":
            q = dict(p.split("=", 1) for p in (self.path.split("?", 1) + [""])[1].split("&") if "=" in p)
            f = os.path.join(CHATLOGS, safe(urllib.parse.unquote(q.get("town", ""))), safe(urllib.parse.unquote(q.get("person", ""))) + ".md")
            if not os.path.isfile(f):
                return self.send(200, "Nothing said yet.".encode("utf-8"), "text/plain; charset=utf-8")
            with open(f, "rb") as fh:
                return self.send(200, fh.read(), "text/plain; charset=utf-8")
        if path == "/fightnet":
            f = os.path.join(HERE, "fightnet.json")
            if not os.path.exists(f):
                return self.send(404, "{}")
            with open(f, "rb") as fh:
                return self.send(200, fh.read())
        if path == "/npcbrain":
            f = os.path.join(HERE, "npcbrain.json")
            if not os.path.exists(f):
                return self.send(404, "{}")
            with open(f, "rb") as fh:
                return self.send(200, fh.read())
        if path == "/lore":
            if not os.path.exists(LORE):
                return self.send(200, "{}")
            with open(LORE, "rb") as f:
                return self.send(200, f.read())
        name = "index.html" if path in ("/", "") else path.lstrip("/")
        full = os.path.normpath(os.path.join(HERE, name))
        # only the town's own page files; never settings, notebooks or keys
        # ...and the SRD rules brought from Legends of Harpine (town/srd), which the page imports as modules
        in_srd = full.startswith(os.path.join(HERE, "srd") + os.sep)
        if (os.path.dirname(full) != HERE and not in_srd) or os.path.splitext(full)[1] not in (".html", ".js", ".css", ".png") or not os.path.isfile(full):
            return self.send(404, "{}")
        with open(full, "rb") as f:
            self.send(200, f.read(), TYPES.get(os.path.splitext(full)[1], "application/octet-stream"))

    def do_POST(self):
        if self.path == "/settings":
            if not self.same_page():
                return self.send(403, "{}")
            try:
                st = save_settings(json.loads(self.body() or b"{}"))
            except Exception:
                return self.send(400, "{}")
            print(f"[settings] mayor {st['mayor']} | folk {st['folk']} | cap ${st['daily_dollar_cap']} | every {st['folk_every_minutes']} min")
            return self.send(200, json.dumps({"ok": True}))
        if self.path == "/brain":
            try:
                req = json.loads(self.body() or b"{}")
            except Exception:
                return self.send(400, "{}")
            return self.send(200, json.dumps({"decision": think(req)}))
        if self.path == "/chronicle":
            # a day's summary (for Claude to read and tune the sim) and the day's training rows
            try:
                j = json.loads(self.body() or b"{}")
            except Exception:
                return self.send(400, "{}")
            with open(CHRONICLE, "a", encoding="utf-8") as f:
                f.write(str(j.get("text", ""))[:20000] + "\n\n")
            if os.path.exists(DATASET) and os.path.getsize(DATASET) > 20_000_000:
                os.replace(DATASET, DATASET + ".old")
            with open(DATASET, "a", encoding="utf-8") as f:
                for r in (j.get("rows") or [])[:5000]:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
            return self.send(200, "{}")
        if self.path == "/chatlog":
            try:
                j = json.loads(self.body() or b"{}")
            except Exception:
                return self.send(400, "{}")
            st = settings()
            skip_mayor = st["mayor"].get("provider") == "cloude" and not st.get("chatlog_mayor", False)
            line = str(j.get("line", "")).replace("\n", " ")[:1000]
            d = os.path.join(CHATLOGS, safe(j.get("town", "town")))
            os.makedirs(d, exist_ok=True)
            for p in (j.get("people") or [])[:4]:
                if not isinstance(p, dict) or (p.get("mayor") and skip_mayor):
                    continue
                with open(os.path.join(d, safe(p.get("id", "x")) + ".md"), "a", encoding="utf-8") as f:
                    if f.tell() == 0:
                        f.write(f"# {str(p.get('name', p.get('id')))[:80]} ({safe(p.get('id', 'x'))}), town {safe(j.get('town', 'town'))}\n\n")
                    f.write(line + "\n")
            return self.send(200, "{}")
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

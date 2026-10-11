import os, sys, json, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import room_server as rs
# keep the real brain untouched
rs.BRAIN = os.path.join(tempfile.gettempdir(), "room_brain_selftest.json")
if os.path.exists(rs.BRAIN): os.remove(rs.BRAIN)
rs.load()
ok = True
def check(name, cond, extra=""):
    global ok
    print(("PASS " if cond else "FAIL ") + name, extra)
    ok = ok and bool(cond)

AB = {"subject": "Sly", "victim": "Edda", "crime": "robbed"}
for intent in ("report", "attack", "hurt", "wary", "greet"):
    try:
        r = rs.speak("edda", "bram", intent, "", "idle", to_name="Bram", about=AB if intent != "greet" else None)
        txt = r if isinstance(r, str) else json.dumps(r)[:140]
        check("speak " + intent, r, txt)
        check("no raw slots " + intent, "{" not in txt, txt)
    except Exception as e:
        check("speak " + intent, False, repr(e))

try:
    for _ in range(30):
        rs.hear("tobin", "edda", "Sly robbed Edda, Tobin! Watch your purse.", "report", about=AB)
    lr = rs.brain["agents"]["tobin"]["learned"].get("report", [])
    check("hear with about", True, json.dumps(lr)[:160])
    check("learned line is slotted", any("{subject}" in x["t"] for x in lr) if lr else True, "(none learned yet)" if not lr else "")
except Exception as e:
    check("hear with about", False, repr(e))

try:
    s = rs.slotify("Sly robbed Edda, Bram!", AB, "Bram")
    check("slotify", s == "{subject} {crime} {victim}, {to}!" , s)
    f = rs.fill(s, "tobin", "bram", "Bram", {"subject": "Grizzle", "victim": "Pip", "crime": "mauled"})
    check("fill reuses about anyone", f == "Grizzle mauled Pip, Bram!", f)
    f = rs.fill(s, "edda", "bram", "Bram", AB); check("victim speaking says me", f == "Sly robbed me, Bram!", f)
    f = rs.fill(s, "tobin", "edda", "Edda", AB); check("victim listening hears you", f == "Sly robbed you, Edda!", f)
except Exception as e:
    check("slotify", False, repr(e))

for k in ("ssith", "grizzle"):
    try:
        st = rs.stats(k); check("stats " + k, st is not None, str(st)[:100])
    except Exception as e:
        check("stats " + k, False, repr(e))

import threading, urllib.request
srv = rs.ThreadingHTTPServer(("127.0.0.1", 8699), rs.H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
def req(path, data=None):
    r = urllib.request.Request("http://127.0.0.1:8699" + path, data=json.dumps(data).encode() if data is not None else None)
    with urllib.request.urlopen(r, timeout=10) as f: return f.status, f.read()
try:
    s, b = req("/"); check("GET / html", s == 200 and b"bearbtn" in b and b'id="hp"' in b and b'id="forget"' in b)
    s, b = req("/room.js"); check("GET /room.js", s == 200 and len(b) > 1000, f"{len(b)} bytes")
    s, b = req("/cast"); c = json.loads(b); check("GET /cast has ssith+grizzle+beliefs", "ssith" in c and "grizzle" in c and "beliefs" in c["bram"])
    s, b = req("/talk", {"speaker": "edda", "to": "bram", "to_name": "Bram", "intent": "report", "about": AB, "state": "report", "listeners": ["bram", "tobin"]})
    t = json.loads(b); check("POST /talk report", "text" in t and "{" not in t["text"], t.get("text") or t.get("error"))
    s, b = req("/save", {"tempers": {}, "beliefs": {"bram": {"sly": {"danger": 0.8, "wanted": True, "notes": []}}}})
    s, b = req("/cast"); check("beliefs persist", json.loads(b)["bram"]["beliefs"].get("sly", {}).get("wanted") is True)
    s, b = req("/player", {"text": "hello Bram", "to": "bram", "name": "Rose", "listeners": ["bram", "pip"]})
    check("POST /player", "intent" in json.loads(b), json.loads(b).get("intent"))
    s, b = req("/forget", {}); s, b = req("/cast"); check("forget wipes beliefs", json.loads(b)["bram"]["beliefs"] == {})
except Exception as e:
    check("http", False, repr(e))
finally:
    srv.shutdown()

try:
    rs.save(); check("save", os.path.exists(rs.BRAIN))
finally:
    if os.path.exists(rs.BRAIN): os.remove(rs.BRAIN)
print("ALL OK" if ok else "SOME FAILED")

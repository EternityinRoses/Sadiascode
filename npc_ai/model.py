"""The trained NPC brain.

Three learned parts, all small enough to train on a laptop CPU in seconds:

* Action chooser - a conditional-logit model: each verb (work, eat, forage,
  court, ...) has a weight vector over the NPC's state, and the NPC picks
  among the actions the game says are available right now.
* Lean (policy) - ridge regression from state to the game's 0-3 "policy"
  weights (work, crime, violence, ...).
* Voice - a retrieval bank of lines the LLM NPCs actually said, with names
  replaced by slots ({me}, {them}, {mayor}) so they can be reused in any
  town. The closest lines to the current situation are picked and filled.

Votes, deals and fighting stances are simple rules on the parsed state.
reply(prompt) returns the same JSON the game expects from its LLM.
"""
import json
import math
import random
import re
from collections import Counter, defaultdict

import numpy as np

from .dataset import clean_response
from .parse import first_name, parse_offer, parse_prompt

POLICY_KEYS = ["work", "crime", "violence", "romance", "politics",
               "gang", "tavern", "socialize", "hunt", "forage"]
ALWAYS_ALLOWED = ["sleep", "eat", "work"]
JOB_GROUPS = [
    ("guard", ("guard", "captain", "jailer", "sergeant", "watch")),
    ("farm", ("farm", "ranch")),
    ("food", ("baker", "server", "innkeeper", "tavern", "cook")),
    ("trade", ("clerk", "shop", "smith", "store")),
    ("care", ("cleric", "doctor", "undertaker", "teacher", "priest")),
    ("sellsword", ("sellsword",)),
    ("mayor", ("mayor",)),
    ("none", ("no work",)),
]
STOPWORDS = set("""a an the and or but if of to in on at for with by from is are was
were be been i i'm im me my you your we our it its this that these those so
just not no do don't can i'll ill i've ive will would there here what who""".split())

FEATURES = [
    "bias", "purse", "savings", "broke", "hungry", "thirsty", "has_food",
    "hp_frac", "hurt", "hour_sin", "hour_cos", "night", "morning", "evening",
    "underworld", "gang_boss", "election_today", "election_soon", "people",
    "alone", "beasts", "body", "failed_any", "failed_eat", "failed_work",
    "spoken_to", "at_home", "outdoors", "day",
] + ["job_" + g for g, _ in JOB_GROUPS] + ["job_other"]


def job_group(job):
    for group, words in JOB_GROUPS:
        if any(w in job for w in words):
            return group
    return "other"


def state_features(s):
    h = s["hour"]
    loc = s["location"].lower()
    f = {
        "bias": 1.0,
        "purse": math.log1p(s["purse"]),
        "savings": math.log1p(s["savings"]),
        "broke": float(s["purse"] == 0),
        "hungry": float(s["hungry"]),
        "thirsty": float(s["thirsty"]),
        "has_food": float(s["has_food"]),
        "hp_frac": s["hp"] / max(1, s["hp_max"]),
        "hurt": float(s["hp"] < 0.5 * s["hp_max"]),
        "hour_sin": math.sin(2 * math.pi * h / 24),
        "hour_cos": math.cos(2 * math.pi * h / 24),
        "night": float(h >= 22 or h < 5),
        "morning": float(5 <= h < 12),
        "evening": float(17 <= h < 22),
        "underworld": float(s["underworld"]),
        "gang_boss": float(s["gang_boss"]),
        "election_today": float(s["election_in"] == 0),
        "election_soon": float(s["election_in"] == 1),
        "people": min(len(s["people_seen"]), 6) / 6.0,
        "alone": float(not s["people_seen"]),
        "beasts": float(s["beasts_seen"] > 0),
        "body": float(s["body_nearby"]),
        "failed_any": float(bool(s["failed"])),
        "failed_eat": float(any(x.startswith("eat") for x in s["failed"])),
        "failed_work": float(any(x.startswith("work") for x in s["failed"])),
        "spoken_to": float(bool(s["just_happened"])),
        "at_home": float(loc.startswith("house") or loc == "home"),
        "outdoors": float(any(w in loc for w in ("wildwood", "fields", "lane", "square", "river"))),
        "day": min(s["day"], 10) / 10.0,
    }
    g = job_group(s["job"])
    for group, _ in JOB_GROUPS:
        f["job_" + group] = float(g == group)
    f["job_other"] = float(g == "other")
    return np.array([f[k] for k in FEATURES], dtype=float)


def verb_of(action):
    return action.split()[0].lower() if action else ""


def candidates(s):
    cands = list(s["available"])
    verbs = {verb_of(c) for c in cands}
    for a in ALWAYS_ALLOWED:
        if a not in verbs and not (a == "work" and s["job"] in ("no work", "")):
            cands.append(a)
    return cands


def tokens(text):
    return [w for w in re.findall(r"[a-z']+", text.lower()) if w not in STOPWORDS and len(w) > 2]


# ---------------------------------------------------------------- dialogue

def _name_parts(full):
    return [p for p in full.split() if p[:1].isupper()]


def make_template(say, s, roster, addressee=""):
    """Replace names with slots; return None if the line names someone we can't map."""
    if not say:
        return None
    t = say
    slots = []
    if s["name"]:
        slots.append((s["name"], "{me}"))
    if addressee:
        slots.append((addressee, "{them}"))
    if s["mayor"] and s["mayor"] != first_name(addressee):
        slots.append((s["mayor"], "{mayor}"))
    for full, slot in slots:
        t = re.sub(r"\b%s\b" % re.escape(full), slot, t)
        t = re.sub(r"\b%s\b" % re.escape(first_name(full)), slot, t)
    known = set()
    for full in roster:
        known.update(_name_parts(full))
    known.update(["Rose"])
    for b in s["ballot"]:
        known.update(_name_parts(b["name"]))
    known.update(n for n, _, _ in s["people_seen"])
    for word in re.findall(r"\b[A-Z][a-z]+\b", t):
        if word in known:
            return None
    return t


TITLES = {"Mayor": "mayor", "Captain": "guard", "Sergeant": "guard"}


def fill_template(t, s, addressee=""):
    role = job_group(s["partner_job"]) if s["kind"] == "talk" else ""
    for title, group in TITLES.items():
        if role != group:  # don't call a baker "Mayor"
            t = t.replace(title + " {them}", "{them}")
    return (t.replace("{me}", first_name(s["name"]))
             .replace("{them}", first_name(addressee) or "friend")
             .replace("{mayor}", s["mayor"] or "the mayor"))


def context_tokens(s, kind, lead_action="", accept=None):
    toks = ["K:" + kind, "J:" + job_group(s["job"])]
    if kind == "talk":
        heard = tokens(s["heard"])
        toks += (heard * 2) or ["T:opening"] * 2  # what they said matters most
        toks.append("PJ:" + job_group(s["partner_job"] or "no work"))
        if s["offer"]:
            toks.append("T:offer")
            if accept is not None:
                toks += ["T:accept" if accept else "T:refuse"] * 2
        if s["partner_pid"] == "player":
            toks.append("T:player")
    else:
        toks.append("A:" + verb_of(lead_action))
        toks += ["A:" + verb_of(lead_action)] * 2  # what you're doing matters most
        toks += tokens(s["just_happened"])
    if s["hungry"]:
        toks.append("T:hungry")
    if s["purse"] == 0:
        toks.append("T:broke")
    h = s["hour"]
    toks.append("T:night" if (h >= 22 or h < 5) else "T:morning" if h < 12 else "T:afternoon" if h < 17 else "T:evening")
    if s["election_in"] == 0:
        toks.append("T:election")
    if s["underworld"]:
        toks.append("T:underworld")
    return toks


class NPCBrain:
    def __init__(self):
        self.verbs = []
        self.W = None
        self.policy_coef = None
        self.bank = []
        self.idf = {}
        self.memory = defaultdict(lambda: {"said": [], "last_note_key": None, "talks": Counter()})

    # ------------------------------------------------------------ training
    @staticmethod
    def action_target(ex):
        s = ex["state"]
        cands = candidates(s)
        cand_verbs = [verb_of(c) for c in cands]
        for item in clean_response(ex).get("agenda", []) or []:
            if not isinstance(item, str):
                continue
            if item in cands:
                return cands, cands.index(item)
            v = verb_of(item)
            if v in cand_verbs:
                return cands, cand_verbs.index(v)
        return cands, None

    def fit(self, examples, roster, epochs=60, lr=0.1, l2=1e-3, seed=0):
        plans = [e for e in examples if e["state"]["kind"] == "plan"]
        verb_counts = Counter()
        rows = []
        for ex in plans:
            cands, target = self.action_target(ex)
            if target is None or len(cands) < 2:
                continue
            verb_counts.update(verb_of(c) for c in cands)
            rows.append((state_features(ex["state"]), [verb_of(c) for c in cands], target))
        self.verbs = sorted(v for v, n in verb_counts.items() if n >= 3)
        vidx = {v: i for i, v in enumerate(self.verbs)}
        W = np.zeros((len(self.verbs), len(FEATURES)))
        rng = random.Random(seed)
        for _ in range(epochs):
            rng.shuffle(rows)
            for x, cverbs, t in rows:
                ids = [vidx.get(v, -1) for v in cverbs]
                scores = np.array([W[i] @ x if i >= 0 else 0.0 for i in ids])
                p = np.exp(scores - scores.max())
                p /= p.sum()
                for j, i in enumerate(ids):
                    if i >= 0:
                        W[i] -= lr * ((p[j] - (j == t)) * x + l2 * W[i])
            lr *= 0.95
        self.W = W

        # lean: ridge regression state -> policy weights
        X, Y = [], []
        for ex in plans:
            pol = ex["response"].get("policy")
            if isinstance(pol, dict) and all(isinstance(pol.get(k, 0), (int, float)) for k in POLICY_KEYS):
                X.append(state_features(ex["state"]))
                Y.append([float(pol.get(k, 0)) for k in POLICY_KEYS])
        X, Y = np.array(X), np.array(Y)
        self.policy_coef = np.linalg.solve(X.T @ X + 1.0 * np.eye(X.shape[1]), X.T @ Y)

        # voice: retrieval bank
        self.bank = []
        for ex in examples:
            s, r = ex["state"], ex["response"]
            say = r.get("say")
            if not isinstance(say, str) or not say.strip():
                continue
            if s["kind"] == "talk":
                addressee = s["partner"] if s["partner_pid"] != "player" else ""
                lead = ""
            else:
                addressee = s["people_seen"][0][0] if s["people_seen"] else ""
                agenda = clean_response(ex).get("agenda") or [""]
                lead = agenda[0] if isinstance(agenda[0], str) else ""
            t = make_template(say, s, roster.get(ex["run"], set()), addressee)
            if t is None:
                continue
            feeling = r.get("feeling", 0.0)
            self.bank.append({
                "kind": s["kind"], "text": t,
                "ctx": context_tokens(s, s["kind"], lead,
                                      r.get("accept") if isinstance(r.get("accept"), bool) else None),
                "role": job_group(s["partner_job"]) if s["kind"] == "talk" else "",
                "feeling": float(feeling) if isinstance(feeling, (int, float)) else 0.0,
                "end": bool(r.get("end", False)),
            })
        self._index_bank()
        return self

    def _index_bank(self):
        df = Counter()
        for b in self.bank:
            df.update(set(b["ctx"]))
        n = max(1, len(self.bank))
        self.idf = {w: math.log((1 + n) / (1 + c)) + 1 for w, c in df.items()}
        for b in self.bank:
            b["vec"] = self._vec(b["ctx"])

    def _vec(self, toks):
        v = Counter(toks)
        v = {w: c * self.idf.get(w, 0.0) for w, c in v.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {w: x / norm for w, x in v.items()}

    # ---------------------------------------------------------- inference
    def action_probs(self, s):
        cands = candidates(s)
        if not cands:
            return []
        x = state_features(s)
        vidx = {v: i for i, v in enumerate(self.verbs)}
        scores = np.array([self.W[vidx[verb_of(c)]] @ x if verb_of(c) in vidx else -1.0 for c in cands])
        p = np.exp(scores - scores.max())
        p /= p.sum()
        return sorted(zip(cands, p.tolist()), key=lambda cp: -cp[1])

    def choose_agenda(self, s, max_steps=3, min_prob=0.12):
        ranked = self.action_probs(s)
        agenda, used = [], set()
        for cand, p in ranked:
            v = verb_of(cand)
            if v in used or (agenda and p < min_prob):
                continue
            if v == "buy":
                cand = self._pick_purchase(s, cand)
            agenda.append(cand)
            used.add(v)
            if len(agenda) == max_steps:
                break
        return agenda

    @staticmethod
    def _pick_purchase(s, default):
        buys = [a for a in s["available"] if a.startswith("buy ")]
        wants = ("bread", "turnip", "meal", "eggs") if s["hungry"] else ("ale",) if s["thirsty"] else ()
        for w in wants:
            for a in buys:
                if w in a:
                    return a
        return default

    def lean(self, s):
        raw = state_features(s) @ self.policy_coef
        return {k: int(min(3, max(0, round(v)))) for k, v in zip(POLICY_KEYS, raw)}

    def voice(self, s, kind, lead="", addressee="", accept=None, k=5):
        if not self.bank:
            return "", 0.0, False
        q = self._vec(context_tokens(s, kind, lead, accept))
        said = set(self.memory[s["pid"]]["said"])
        scored = []
        for b in self.bank:
            if b["kind"] != kind or ("{them}" in b["text"] and not addressee):
                continue
            sim = sum(q.get(w, 0.0) * x for w, x in b["vec"].items())
            if re.search(r"\d", b["text"]):
                sim *= 0.9
            scored.append((sim, b))
        scored.sort(key=lambda sb: -sb[0])
        top = [b for _, b in scored[:k * 3] if fill_template(b["text"], s, addressee) not in said][:k] or [b for _, b in scored[:k]]
        if not top:
            return "", 0.0, False
        rng = random.Random("%s|%s|%.2f|%s" % (s["pid"], s["day"], s["hour"], s["heard"]))
        pick = rng.choice(top)
        line = fill_template(pick["text"], s, addressee)
        feeling = sum(b["feeling"] for b in top) / len(top)
        end = sum(b["end"] for b in top) > len(top) / 2
        mem = self.memory[s["pid"]]["said"]
        mem.append(line)
        del mem[:-8]
        return line, round(feeling, 2), end

    # ------------------------------------------------------------- replies
    def reply(self, prompt):
        s = parse_prompt(prompt)
        if s["kind"] == "talk":
            return self._talk(s)
        return self._plan(s)

    def _plan(self, s):
        agenda = self.choose_agenda(s) or ["socialize"]
        policy = self.lean(s)
        addressee = s["people_seen"][0][0] if s["people_seen"] else ""
        say, _, _ = self.voice(s, "plan", agenda[0], addressee)
        out = {"agenda": agenda, "policy": policy}
        if say:
            out["say"] = say
        note = self._plan_note(s, agenda)
        if note:
            out["note"] = note
        if s["asks_vote"]:
            vote = self._vote(s)
            if vote:
                out["vote_for"] = vote
        if s["asks_captain_vote"] and s["guards"]:
            out["captain_vote"] = self._pick_leader(s["guards"], s["captain"], s["pid"], s["job"] == "guard captain")
        if s["asks_boss_vote"] and s["crew"]:
            out["boss_vote"] = self._pick_leader(s["crew"], s["boss"], s["pid"], s["gang_boss"])
        violent = policy["violence"] >= 2 or job_group(s["job"]) == "guard"
        out["fighting"] = {"blows": "lethal" if policy["violence"] >= 2 else "nonlethal",
                           "flee_below": 0.3 if violent else 0.5,
                           "surrender": not violent}
        return out

    def _plan_note(self, s, agenda):
        mem = self.memory[s["pid"]]
        key = (s["day"], s["location"], s["purse"], s["hungry"], s["thirsty"], tuple(agenda), s["mayor"])
        if key == mem["last_note_key"]:
            return ""  # nothing new; don't fill the diary with copies
        mem["last_note_key"] = key
        needs = [w for w, on in (("hungry", s["hungry"]), ("thirsty", s["thirsty"]), ("hurt", s["hp"] < 0.5 * s["hp_max"])) if on]
        note = "day %d, %02d:%02d at %s. Purse %dc%s. Plan: %s." % (
            s["day"], int(s["hour"]), int(round((s["hour"] % 1) * 60)) % 60, s["location"] or "somewhere",
            s["purse"], (", " + ", ".join(needs)) if needs else "", ", ".join(agenda))
        if s["failed"]:
            note += " Couldn't: %s." % ", ".join(s["failed"])
        if s["election_in"] in (0, 1) and s["ballot"]:
            v = self._vote(s)
            name = next((b["name"] for b in s["ballot"] if b["pid"] == v), "")
            if name:
                note += " Voting %s." % first_name(name)
        return note

    @staticmethod
    def _vote(s):
        if not s["ballot"]:
            return ""
        if s["means_vote"]:
            for b in s["ballot"]:
                if first_name(b["name"]) == s["means_vote"]:
                    return b["pid"]
        for b in s["ballot"]:
            if b["pid"] == s["pid"]:
                return b["pid"]
        for b in s["ballot"]:
            if b["sitting"]:
                return b["pid"]
        return s["ballot"][0]["pid"]

    @staticmethod
    def _pick_leader(members, current, own_pid, i_lead):
        if i_lead:
            return own_pid
        for name, pid in members:
            if name == current:
                return pid
        return own_pid

    def _talk(self, s):
        addressee = s["partner"] if s["partner_pid"] != "player" else s["partner"].split(" of ")[0]
        mem = self.memory[s["pid"]]
        mem["talks"][s["partner_pid"]] += 1
        accept = self._judge_offer(s) if s["offer"] else None
        say, feeling, end = self.voice(s, "talk", addressee=addressee, accept=accept)
        out = {"say": say or "Good day to you, %s." % first_name(addressee),
               "feeling": feeling,
               "end": end or mem["talks"][s["partner_pid"]] >= 4}
        if accept is not None:
            out["accept"] = accept
        if s["heard"]:
            out["note"] = "day %d: %s at %s said \"%s\"" % (
                s["day"], first_name(addressee), s["location"] or "town", s["heard"][:90])
        return out

    @staticmethod
    def _judge_offer(s):
        o = parse_offer(s["offer"])
        if o["threat"]:
            return job_group(s["job"]) != "guard" and s["hp"] < 0.5 * s["hp_max"]
        if o["wants_nothing"]:
            return o["gives_something"]
        if o["want_coin"]:
            return o["want_coin"] <= s["purse"] and o["give_coin"] >= o["want_coin"]
        if "keep quiet" in s["offer"]:
            return job_group(s["job"]) != "guard" and o["gives_something"]
        return o["give_coin"] >= 1

    # ------------------------------------------------------------ storage
    def to_dict(self):
        return {
            "version": 1, "features": FEATURES, "policy_keys": POLICY_KEYS,
            "verbs": self.verbs, "W": np.round(self.W, 5).tolist(),
            "policy_coef": np.round(self.policy_coef, 5).tolist(),
            "bank": [{k: b[k] for k in ("kind", "text", "ctx", "feeling", "end", "role")} for b in self.bank],
        }

    def save(self, path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, separators=(",", ":"))

    @classmethod
    def load(cls, path):
        with open(path, encoding="utf-8") as f:
            return cls.load_from_dict(json.load(f))

    @classmethod
    def load_from_dict(cls, d):
        if d["features"] != FEATURES:
            raise ValueError("model was trained with different features; retrain it")
        brain = cls()
        brain.verbs = d["verbs"]
        brain.W = np.array(d["W"])
        brain.policy_coef = np.array(d["policy_coef"])
        brain.bank = d["bank"]
        brain._index_bank()
        return brain

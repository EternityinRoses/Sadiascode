"""Turn the game's PLAN / TALK prompt text into a structured state dict.

The game sends each NPC a plain-text prompt (see data/brains.tar.gz for
thousands of examples). Everything the NPC knows is in that text, so the
parser is the bridge between the game and the trained model.
"""
import re

FOODS = ("apple", "berries", "bread", "turnip", "fish", "eggs", "meat", "meal")


def _num(pattern, text, default=0, cast=int):
    m = re.search(pattern, text)
    return cast(m.group(1)) if m else default


def _split_list(s):
    return [x.strip() for x in s.split(";") if x.strip()]


def first_name(full):
    return full.split()[0] if full else ""


def parse_prompt(text):
    s = {"raw": text}

    if "TALK. You are face to face" in text:
        s["kind"] = "talk"
    elif "PLAN. Here is what is available" in text:
        s["kind"] = "plan"
    else:
        s["kind"] = "other"

    m = re.search(r"These steps couldn't be done: (.*?)\.\n", text)
    s["failed"] = _split_list(m.group(1)) if m else []

    m = re.search(r"WHAT JUST HAPPENED: (.*?)\n(?:PLAN|TALK)\.", text, re.S)
    s["just_happened"] = m.group(1).strip() if m else ""

    m = re.search(r"available to you right now: (.*?) \(more becomes", text)
    s["available"] = _split_list(m.group(1)) if m else []

    m = re.search(r"You: (.+?) \(id (\w+)\), (\d+), (\w+)\.", text)
    s["name"], s["pid"], s["age"], s["gender"] = (
        (m.group(1), m.group(2), int(m.group(3)), m.group(4)) if m else ("", "", 0, "")
    )

    m = re.search(r"Health (-?\d+)/(\d+)", text)
    s["hp"], s["hp_max"] = (int(m.group(1)), int(m.group(2))) if m else (1, 1)
    you_line = re.search(r"You: .*", text)
    you_line = you_line.group(0) if you_line else ""
    s["hungry"] = "Hungry" in you_line or "Starving" in you_line
    s["thirsty"] = "Thirsty" in you_line
    s["purse"] = _num(r"Purse (\d+)c", text)
    s["savings"] = _num(r"savings at home (\d+)c", text)
    m = re.search(r"pack: (.*?)\.(?:\n|$)", text, re.M)
    s["pack"] = m.group(1) if m else "empty"
    s["has_food"] = any(f in s["pack"] for f in FOODS)
    m = re.search(r"\(AC (\d+)\)", text)
    s["ac"] = int(m.group(1)) if m else 10

    m = re.search(r"What you're good at: (.*?)\n", text)
    skills = {}
    if m:
        for part in m.group(1).replace(";", ",").split(","):
            mm = re.match(r"\s*(\w+) \+?(-?\+?\d+)", part.replace("+-", "-"))
            if mm:
                skills[mm.group(1)] = int(mm.group(2).replace("+", ""))
    s["skills"] = skills

    m = re.search(r"Job: (.*?)\n", text)
    job_line = m.group(1) if m else ""
    s["job_line"] = job_line
    s["job"] = re.sub(r"\s*\(.*?\)", "", re.split(r"[.,]", job_line)[0]).strip().lower()
    s["underworld"] = "underworld" in job_line
    s["gang_boss"] = "underworld (boss)" in job_line
    m = re.search(r"Married to (\w+)", job_line)
    s["spouse"] = m.group(1) if m else ""

    m = re.search(r"Now: day (\d+), (\d+):(\d+)(?: \(\w+\))?, at (.*?)\.", text)
    if m:
        s["day"], s["hour"], s["location"] = (
            int(m.group(1)), int(m.group(2)) + int(m.group(3)) / 60.0, m.group(4))
    else:
        s["day"], s["hour"], s["location"] = 1, 12.0, ""
    m = re.search(r"You can see: (.*?)\.\n", text)
    seen = m.group(1) if m else ""
    s["people_seen"] = re.findall(r"([A-Z]\w+) \((\w+), ~(\d+)m\)", seen)
    s["beasts_seen"] = len(re.findall(r"\b(?:wolf|wolves|boar|bear|beast)\b", seen))
    s["body_nearby"] = "a body on the ground" in seen

    m = re.search(r"Town: mayor (\w+), captain (\w+), sales tax (\d+)%, rent (\d+)c", text)
    if m:
        s["mayor"], s["captain"] = m.group(1), m.group(2)
        s["sales_tax"], s["rent"] = int(m.group(3)), int(m.group(4))
    else:
        s["mayor"], s["captain"], s["sales_tax"], s["rent"] = "", "", 0, 1

    if "ELECTION for mayor TODAY" in text:
        s["election_in"] = 0
    else:
        s["election_in"] = _num(r"ELECTION for mayor in (\d+) day", text, default=-1)
    m = re.search(r"On the ballot: (.*?)\. (?:Anyone may stand|Everyone votes)", text)
    s["ballot"] = []
    if m:
        for name, pid, rest in re.findall(r"([A-Z][\w ]+?) \((\w+)(,[^)]*)?\)", m.group(1)):
            s["ballot"].append({"name": name.strip(), "pid": pid,
                                "sitting": "sitting mayor" in (rest or "")})
    m = re.search(r"You mean to vote for (\w+)", text)
    s["means_vote"] = m.group(1) if m else ""
    s["asks_vote"] = '"vote_for"' in text and bool(s["ballot"])
    s["asks_captain_vote"] = "captain_vote\": \"<id>\" (guards" in text
    m = re.search(r"\(guards: (.*?)\)", text)
    s["guards"] = re.findall(r"(\w+) (p\d+|player)", m.group(1)) if m else []
    s["asks_boss_vote"] = "\"boss_vote\": \"<id>\" (members" in text
    m = re.search(r"Boss: (\w+)\.", text)
    s["boss"] = m.group(1) if m else ""
    m = re.search(r"\(members: (.*?)\)", text)
    s["crew"] = re.findall(r"(\w+) (p\d+|player)", m.group(1)) if m else []

    m = re.search(r"What has happened to you lately: (.*?)\n", text)
    s["recent"] = m.group(1) if m else ""

    # TALK-only fields
    m = re.search(r"face to face with (.+?) \(id (\w+)(?:, (.*?))?\)\.", text)
    s["partner"], s["partner_pid"], s["partner_job"] = (
        (m.group(1), m.group(2), m.group(3) or "") if m else ("", "", ""))
    m = re.search(r'They just said to you: "(.*?)"\n', text)
    s["heard"] = m.group(1) if m else ""
    m = re.search(r"They offered you a deal: offer: (.*?)\. Answer", text)
    s["offer"] = m.group(1) if m else ""
    return s


def parse_offer(offer_text):
    """'they give 1c, they want nothing' -> (give_coin, give_item, want_coin, want_other)."""
    give = re.search(r"they give (.*?)(?:,|$)", offer_text)
    want = re.search(r"they want (.*?)(?:,|$)", offer_text)
    give = give.group(1) if give else "nothing"
    want = want.group(1) if want else "nothing"
    gc = _num(r"(\d+)c", give)
    wc = _num(r"(\d+)c", want)
    return {
        "give_coin": gc,
        "gives_something": give != "nothing",
        "want_coin": wc,
        "wants_nothing": want == "nothing",
        "wants_favor": want != "nothing" and wc == 0,
        "threat": "threat" in offer_text,
    }

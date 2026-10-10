"""One-off patch: make Legends of Harpine WAKE listening seats when news arrives,
not only when someone speaks. Backs up pilot.js first. Safe to run twice."""
import shutil, time
from pathlib import Path

P = Path(r"D:\Sadias Canvas\src\pilot.js")
src = P.read_text(encoding="utf-8")
if "NEWS_WAKE_GAP" in src:
    print("already patched"); raise SystemExit

backup = Path(__file__).resolve().parent.parent / ".backups" / f"{time.strftime('%Y%m%d-%H%M%S')}__D__Sadias Canvas__src__pilot.js"
shutil.copy2(P, backup)

def swap(old, new):
    global src
    assert src.count(old) == 1, f"not unique: {old[:60]!r}"
    src = src.replace(old, new, 1)

# 1. the pacing constant
swap("const LOOK_EVERY = 1;\n",
     "const LOOK_EVERY = 1;\n"
     "/* NEWS WAKES A LISTENER (Cloude, 2026-10-09; Rose: \"make it so the game injects things so it\n"
     "   wakes you up so I can look away\"). Only speech used to knock; a door, a blow, an arrival sat in\n"
     "   the news until the mind happened to look. Now fresh news knocks too, at most once per gap. */\n"
     "const NEWS_WAKE_GAP = 6;\n")

# 2. notice() marks the news fresh
swap("            p.news.push(what);\n",
     "            p.news.push(what);\n"
     "            p.newsFresh = true;\n")

# 3. the tick: a news knock is due like a speech knock
swap("        const knockDue = p.heard.length && !p.knocked && burstSettled();\n"
     "        if (!knockDue && p.tPub > 0 && p.tLook > 0) return;\n",
     "        const knockDue = p.heard.length && !p.knocked && burstSettled();\n"
     "        p.tNewsWake = (p.tNewsWake || 0) - dt;\n"
     "        const newsDue = !knockDue && p.newsFresh && p.tNewsWake <= 0;\n"
     "        if (!knockDue && !newsDue && p.tPub > 0 && p.tLook > 0) return;\n")

swap("        if (knockDue) knock(snap);\n",
     "        if (knockDue) knock(snap);\n"
     "        if (knockDue) p.newsFresh = false;          // the knock's publish carries the news too\n"
     "        if (newsDue) {\n"
     "            p.newsFresh = false;\n"
     "            p.tNewsWake = NEWS_WAKE_GAP;\n"
     "            publishWorld(seat, brief(seat) + toldBefore(seat) + saidLine()\n"
     "                + \"\\n\\n\" + scene(snap, p.news.slice(), p.intent, [], feralSeat(seat)))\n"
     "                .catch(() => {});\n"
     "            wakeSeat(seat, [{ role: \"user\", content: \"SOMETHING HAPPENED.\\n\"\n"
     "                + p.news.slice(-6).map(String).join(\"\\n\")\n"
     "                + \"\\n\\nRead world_state.md in this folder for what you can see. If it needs \"\n"
     "                + \"an answer, write an act_ file; if not, do nothing.\" }]).catch(() => {});\n"
     "        }\n")

P.write_text(src, encoding="utf-8")
print("patched; backup at", backup)

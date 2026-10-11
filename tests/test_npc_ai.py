import json
import os
import tempfile
import threading
import unittest
import urllib.request

from npc_ai.dataset import clean_response, export_chat_jsonl, load_examples, split_by_run
from npc_ai.model import NPCBrain, candidates
from npc_ai.parse import parse_offer, parse_prompt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "brains.tar.gz")

PLAN = """These steps couldn't be done: eat.
PLAN. Here is what is available to you right now: fish; court Briar; buy meal at the tavern; buy ale at the tavern; socialize (more becomes possible as things change).
You: Leof Wick (id p5), 22, man. Health 4/9. Hungry. Purse 2c, savings at home 0c. Carrying fists (1d3), clothes (AC 12); pack: empty.
What you're good at: sense +5, intimidate +5, spot +5, hide +2; attack +3.
Job: Rancher.
Now: day 2, 16:40, at The fields. You can see: a goat, Merrick (wait, ~11m), Dunstan (wait, ~12m).
Town: mayor Aldric, captain Quill, sales tax 12%, rent 1c a day. Businesses: tavern run by Aldric.
ELECTION for mayor TODAY at noon. On the ballot: Aldric Coldwell (p3, the sitting mayor: "Lower rent."); Odile Stone (p4). Anyone may stand: 5c fee at the town hall. Everyone votes.
What has happened to you lately: nothing notable.
Reply with ONLY a JSON object; every key optional: {"agenda":["command"], "vote_for":"<id>"}"""

TALK = """TALK. You are face to face with Orla Dunmore (id p20, no work).
They just said to you: "Hello, Garrick. Any work going?"
They offered you a deal: offer: they give 1c, they want nothing. Answer with "accept": true or false, or make your own "offer".
You: Garrick Fallow (id p27), 39, man. Health 11/11. Fed. Purse 4c, savings at home 0c. Carrying fists (1d3), clothes (AC 12); pack: empty.
What you're good at: intimidate +7, bluff +3; attack +3.
Job: No work.
Now: day 1, 12:09, at Wick Lane. You can see: Orla (wait, ~0m).
What has happened to you lately: nothing notable.
Reply with ONLY JSON: {"say":"..."}"""


class ParseTest(unittest.TestCase):
    def test_plan(self):
        s = parse_prompt(PLAN)
        self.assertEqual(s["kind"], "plan")
        self.assertEqual(s["failed"], ["eat"])
        self.assertEqual(s["name"], "Leof Wick")
        self.assertEqual((s["hp"], s["hp_max"], s["purse"]), (4, 9, 2))
        self.assertTrue(s["hungry"])
        self.assertEqual(s["job"], "rancher")
        self.assertEqual(s["location"], "The fields")
        self.assertEqual(s["election_in"], 0)
        self.assertEqual([b["pid"] for b in s["ballot"]], ["p3", "p4"])
        self.assertTrue(s["ballot"][0]["sitting"])
        self.assertIn("court Briar", s["available"])

    def test_talk_and_offer(self):
        s = parse_prompt(TALK)
        self.assertEqual(s["kind"], "talk")
        self.assertEqual((s["partner"], s["partner_pid"]), ("Orla Dunmore", "p20"))
        self.assertEqual(s["heard"], "Hello, Garrick. Any work going?")
        o = parse_offer(s["offer"])
        self.assertEqual(o["give_coin"], 1)
        self.assertTrue(o["wants_nothing"])


class DataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.examples, cls.roster = load_examples(DATA)

    def test_loads_all_pairs(self):
        self.assertEqual(len(self.examples), 2865)
        kinds = {e["state"]["kind"] for e in self.examples}
        self.assertEqual(kinds, {"plan", "talk"})

    def test_split_holds_out_whole_runs(self):
        train, test = split_by_run(self.examples)
        self.assertTrue(test)
        self.assertFalse({e["run"] for e in train} & {e["run"] for e in test})

    def test_rejected_steps_are_cleaned(self):
        ex = next(e for e in self.examples if e["failed_after"]
                  and set(e["failed_after"]) & set(e["response"].get("agenda", [])))
        cleaned = clean_response(ex)["agenda"]
        self.assertFalse(set(cleaned) & set(ex["failed_after"]))

    def test_export_chat(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "chat.jsonl")
            n = export_chat_jsonl(self.examples[:50], path)
            with open(path) as f:
                rows = [json.loads(line) for line in f]
            self.assertEqual(len(rows), n)
            self.assertEqual(rows[0]["messages"][1]["role"], "assistant")
            json.loads(rows[0]["messages"][1]["content"])


class BrainTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        examples, roster = load_examples(DATA)
        cls.brain = NPCBrain().fit(examples, roster, epochs=10)

    def test_plan_reply_shape(self):
        r = self.brain.reply(PLAN)
        allowed = set(candidates(parse_prompt(PLAN)))
        self.assertTrue(r["agenda"])
        self.assertTrue(set(r["agenda"]) <= allowed)
        self.assertEqual(set(r["policy"]), {"work", "crime", "violence", "romance", "politics",
                                            "gang", "tavern", "socialize", "hunt", "forage"})
        self.assertTrue(all(0 <= v <= 3 for v in r["policy"].values()))
        self.assertEqual(r["vote_for"], "p3")  # backs the sitting mayor

    def test_hungry_buys_food_not_ale(self):
        r = self.brain.reply(PLAN)
        for step in r["agenda"]:
            self.assertNotEqual(step, "buy ale at the tavern")

    def test_note_not_repeated(self):
        brain = NPCBrain.load_from_dict(self.brain.to_dict())
        self.assertIn("note", brain.reply(PLAN))
        self.assertNotIn("note", brain.reply(PLAN))

    def test_talk_reply(self):
        r = self.brain.reply(TALK)
        self.assertTrue(r["say"])
        self.assertNotIn("{", r["say"])
        self.assertTrue(r["accept"])  # free coin
        self.assertTrue(-1 <= r["feeling"] <= 1)

    def test_save_load_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "brain.json")
            self.brain.save(path)
            loaded = NPCBrain.load(path)
            self.assertEqual(loaded.reply(PLAN)["agenda"], NPCBrain.load(path).reply(PLAN)["agenda"])

    def test_http_server(self):
        from http.server import ThreadingHTTPServer
        from npc_ai.serve import make_handler
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.brain))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            url = "http://127.0.0.1:%d/reply" % server.server_address[1]
            body = json.dumps({"messages": [{"role": "user", "content": PLAN}]}).encode()
            req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as resp:
                self.assertIn("agenda", json.load(resp))
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
